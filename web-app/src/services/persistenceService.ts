import { supabase } from './supabase';
import { Quest, Habit, Note, NoteFolder, JournalEntry, Attribute, Project, BadHabit, ViceLedgerEntry } from '../types';
import { SmartProject } from '../types/SmartGoal';
import { DailyFeedEntry } from '../types/DailyFeedEntry';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';
import { AuditLogger } from './auditService';
import { OfflineSyncService, isUniqueViolation, retireConflictingRows } from './offlineSync';
import { isTransientError, mergeUserSettings } from './settingsSync';
import { extractCollection, syncUserRows } from './rowMirror';

const isAuthError = (e: any) => {
  const status = Number(e?.status ?? e?.statusCode ?? 0);
  const msg = String(e?.message || e?.code || '').toLowerCase();
  return status === 401 || e?.code === 'PGRST301' || /jwt|token|not authenticated|unauthorized/.test(msg);
};

/** Runs a write; on an expired session refreshes it once and retries. */
const withSessionRetry = async <R extends { error: any }>(run: () => PromiseLike<R>): Promise<R> => {
  const first = await run();
  if (!first.error || !isAuthError(first.error)) return first;
  try { await supabase.auth.refreshSession(); } catch { /* keep the original error */ }
  return run();
};

/** Errors after which the change must be kept and retried later instead of being dropped. */
const isRetryable = (e: any) => isTransientError(e) || isAuthError(e);


/** Upsert of one item row; resolves a legacy-row conflict once. */
const upsertItemRow = async (userId: string, collectionName: string, itemId: string, data: any) => {
  const id = `${userId}_${collectionName}_${itemId}`;
  const run = () => withSessionRetry(() => supabase
    .from('user_collections')
    .upsert({ id, user_id: userId, collection_name: collectionName, data, deleted: false }, { onConflict: 'id' }));
  let { error } = await run();
  if (error && isUniqueViolation(error)) {
    await retireConflictingRows(userId, collectionName, itemId, id);
    ({ error } = await run());
  }
  if (error) throw error;
};

// In-memory query cache for 0ms DB reads
const collectionMemoryCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL_MS = 8000;

export const clearPersistenceCache = (collectionName?: string) => {
  if (collectionName) {
    for (const key of collectionMemoryCache.keys()) {
      if (key.includes(`_${collectionName}`)) collectionMemoryCache.delete(key);
    }
  } else {
    collectionMemoryCache.clear();
  }
};

// Generic helper for subcollection CRUD using Supabase
const createSubCollectionService = <T extends { id: string, deleted?: boolean }>(collectionName: string) => ({
  getAll: async (userId: string): Promise<T[] | null> => {
    const cacheKey = `${userId}_${collectionName}`;
    const cached = collectionMemoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data as T[];
    }

    try {
      // One shared, incremental, paginated sync of all the user's rows (see rowMirror.ts).
      const rows = await syncUserRows(userId);
      const result = extractCollection<T>(userId, rows, collectionName);
      collectionMemoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return null;
    }
  },

  // Optimized Fetch with Query Constraints
  getFiltered: async (userId: string, _constraints: any[]): Promise<T[] | null> => {
    return await createSubCollectionService<T>(collectionName).getAll(userId);
  },
  
  // SAVE = UPSERT (Create or Merge)
  save: async (userId: string, item: T): Promise<void> => {
    try {
      let targetId = item.id;
      if (!targetId) {
          console.warn(`[Persistence] Attempted to save ${collectionName} without ID. Generating one.`);
          targetId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }

      const cleanItem = sanitizeFirestoreData({ ...item, id: targetId });
      if (cleanItem.deleted) delete cleanItem.deleted; 

      // FIX: Ensure the primary key 'id' in user_collections is globally unique
      // by combining userId, collectionName, and the item's targetId.
      const done = OfflineSyncService.trackWrite({ type: 'SAVE', userId, collectionName, itemId: targetId, data: cleanItem });
      try {
        await upsertItemRow(userId, collectionName, targetId, cleanItem);
      } catch (writeError: any) {
        // Never drop a change: whatever failed (network, expired session, a DB error), it waits in the
        // persistent queue, which retries it with backoff and keeps it in the UI meanwhile.
        console.warn(`[Offline Sync] Queued SAVE for ${collectionName}/${targetId}`, writeError?.message || writeError);
        await OfflineSyncService.addAction({
          type: 'SAVE',
          collectionName,
          userId,
          itemId: targetId,
          data: cleanItem
        });
        if (!isRetryable(writeError)) AuditLogger.log('ERROR', collectionName, targetId, { error: String(writeError?.message || writeError) });
      } finally {
        done();
      }

      // AUDIT LOG
      AuditLogger.log(item.id ? 'UPDATE' : 'CREATE', collectionName, targetId, { userId });
      clearPersistenceCache(collectionName);
      
    } catch (error: any) {
      console.error(`Error saving ${collectionName}:`, error?.message || error);
      AuditLogger.log('ERROR', collectionName, item.id || 'unknown', { error: String(error) });
      throw error;
    }
  },

  // UPDATE = UPSERT (Create or Merge)
  update: async (userId: string, itemId: string, dataToUpdate: Partial<T>): Promise<void> => {
    try {
      if (!itemId) {
          throw new Error(`[Persistence] Cannot update ${collectionName}: ID is undefined.`);
      }
      
      const uniqueRecordId = `${userId}_${collectionName}_${itemId}`;
      const done = OfflineSyncService.trackWrite({ type: 'UPDATE', userId, collectionName, itemId, data: sanitizeFirestoreData(dataToUpdate) });

      try {
        // Fetch the current row first to merge into it.
        const { data: existingRecords, error: fetchError } = await supabase
          .from('user_collections')
          .select('id, data, deleted')
          .eq('id', uniqueRecordId)
          .eq('user_id', userId);

        if (fetchError) throw fetchError;

        const preferred = existingRecords?.[0];
        const cleanData = sanitizeFirestoreData(dataToUpdate);
        if (preferred && (preferred.data?.deleted || (preferred as any).deleted)) {
          // Deleted (maybe on another device): an edit must not bring it back.
          return;
        }
        if (!preferred) {
          if (OfflineSyncService.hasPendingSave(userId, collectionName, itemId)) {
            // Its first save is still waiting in the queue: fold the edit into it.
            await OfflineSyncService.addAction({ type: 'UPDATE', collectionName, userId, itemId, data: dataToUpdate });
            return;
          }
          if (Object.keys(cleanData).length < 4) {
            console.warn(`[Persistence] Record not found for update: ${collectionName}/${itemId}. Partial patch skipped.`);
            return;
          }
          // A whole item whose row is missing (its first save failed): write it instead of losing the edit.
          console.warn(`[Persistence] ${collectionName}/${itemId} was not on the server; writing it now.`);
        }
        const currentData = preferred?.data || {};
        const mergedData = { ...currentData, ...cleanData, id: itemId };
        delete (mergedData as any).deleted;

        await upsertItemRow(userId, collectionName, itemId, mergedData);
      } catch (writeError: any) {
        console.warn(`[Offline Sync] Queued UPDATE for ${collectionName}/${itemId}`, writeError?.message || writeError);
        await OfflineSyncService.addAction({
          type: 'UPDATE',
          collectionName,
          userId,
          itemId,
          data: dataToUpdate
        });
      } finally {
        done();
      }

      // AUDIT LOG
      AuditLogger.log('UPDATE', collectionName, itemId, { changes: Object.keys(dataToUpdate) });
      clearPersistenceCache(collectionName);

    } catch (error: any) {
      console.error(`Error updating ${collectionName}:`, error?.message || error);
      AuditLogger.log('ERROR', collectionName, itemId, { error: String(error) });
      throw error;
    }
  },

  // SOFT DELETE IMPLEMENTATION TO BYPASS POTENTIAL RLS DELETE RESTRICTIONS
  delete: async (userId: string, itemId: string): Promise<void> => {
    try {
      const uniqueRecordId = `${userId}_${collectionName}_${itemId}`;

      try {
        // Mark both legacy row (id = itemId) and new row (id = uniqueRecordId) as deleted
        // This is 100% robust since we target the string primary key columns directly
        const { error: deleteError } = await supabase
            .from('user_collections')
            .update({ deleted: true, data: { id: itemId, deleted: true } })
            .eq('user_id', userId)
            .eq('collection_name', collectionName)
            .or(`id.eq.${uniqueRecordId},id.eq.${itemId}`);

        if (deleteError) throw deleteError;

        // Fallback/Safety: Explicitly upsert the uniqueRecordId as deleted
        const { error: upsertError } = await supabase
          .from('user_collections')
          .upsert({
            id: uniqueRecordId,
            user_id: userId,
            collection_name: collectionName,
            data: { id: itemId, deleted: true },
            deleted: true
          }, { onConflict: 'id' });

        if (upsertError) throw upsertError;

      } catch (networkError: any) {
        const isNetwork = isTransientError(networkError);
        if (isNetwork) {
          console.log(`[Offline Sync] Queued DELETE for ${collectionName}/${itemId}`);
          await OfflineSyncService.addAction({
            type: 'DELETE',
            collectionName,
            userId,
            itemId
          });
        } else {
          throw networkError;
        }
      }

      // AUDIT LOG
      AuditLogger.log('DELETE', collectionName, itemId, { userId });
      clearPersistenceCache(collectionName);

    } catch (error: any) {
      console.error(`Error deleting ${collectionName}:`, error?.message || error);
      AuditLogger.log('ERROR', collectionName, itemId, { error: String(error) });
      throw error;
    }
  }
});

// SETTINGS SERVICE (Single Doc)
const settingsService = {
    get: async (userId: string) => {
        try {
            const { data, error } = await supabase
              .from('user_collections')
              .select('data')
              .eq('id', `config_${userId}`)
              .eq('user_id', userId)
              .eq('collection_name', 'settings')
              .limit(1);

            if (error) return null;
            return data && data.length > 0 ? data[0].data : null;
        } catch (error: any) {
            console.error("Error fetching settings:", error?.message || error);
            return null;
        }
    },
    save: async (userId: string, dataToSave: any) => {
        try {
            // Server-side merge: concurrent writers can no longer drop each other's keys.
            await mergeUserSettings(userId, dataToSave);
        } catch (networkError: any) {
            if (isTransientError(networkError)) {
              console.log(`[Offline Sync] Queued SETTINGS_SAVE for settings/config_${userId}`);
              await OfflineSyncService.addAction({
                type: 'SETTINGS_SAVE',
                collectionName: 'settings',
                userId,
                itemId: `config_${userId}`,
                data: dataToSave
              });
            } else {
              console.error("Error saving settings:", networkError?.message || networkError);
            }
        }
    }
}

export const questService = createSubCollectionService<Quest>('quests');
export const habitService = createSubCollectionService<Habit>('habits');
export const noteService = createSubCollectionService<Note>('notes');
export const noteFolderService = createSubCollectionService<NoteFolder>('noteFolders');
export const journalService = createSubCollectionService<JournalEntry>('journal');
export const attributeService = createSubCollectionService<Attribute>('attributes');
export const smartProjectService = createSubCollectionService<SmartProject>('smartProjects');
export const projectService = createSubCollectionService<Project>('projects');
export const badHabitService = createSubCollectionService<BadHabit>('badHabits');
export const specialEventsService = createSubCollectionService<any>('specialEvents');
export const secureNotesService = createSubCollectionService<any>('secureNotes');
export const dailyFeedService = createSubCollectionService<DailyFeedEntry>('dailyFeed');
export const viceLedgerService = createSubCollectionService<ViceLedgerEntry>('viceLedger');
// Progression (ELO / ranks): one doc per day, one meta doc, one log per completion.
export const progressionDayService = createSubCollectionService<{ id: string } & Record<string, any>>('progressionDays');
export const progressionMetaService = createSubCollectionService<{ id: string } & Record<string, any>>('progressionMeta');
export const completionLogService = createSubCollectionService<{ id: string } & Record<string, any>>('completionLogs');

export const persistenceService = {
  quests: questService,
  habits: habitService,
  badHabits: badHabitService,
  notes: noteService,
  noteFolders: noteFolderService,
  journal: journalService,
  attributes: attributeService,
  smartProjects: smartProjectService,
  projects: projectService,
  viceLedger: viceLedgerService,
  settings: settingsService,
  specialEvents: specialEventsService,
  secureNotes: secureNotesService,
  dailyFeed: dailyFeedService
};
