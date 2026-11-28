import { supabase } from './supabase';
import { Preferences } from '@capacitor/preferences';
import { mergeUserSettings } from './settingsSync';

export interface OfflineAction {
  id: string; // Unique ID for the action
  type: 'SAVE' | 'UPDATE' | 'DELETE' | 'SETTINGS_SAVE' | 'STATS_SYNC';
  collectionName: string;
  userId: string;
  itemId: string;
  data?: any;
  timestamp: number;
  /** Failed attempts so far, and when the next one may run (backoff). */
  attempts?: number;
  nextAt?: number;
}

const OFFLINE_QUEUE_KEY = 'MATRIX_OFFLINE_SYNC_QUEUE';
/** Actions that kept failing for days; never deleted automatically (support can replay them). */
const DEAD_LETTER_KEY = 'MATRIX_OFFLINE_SYNC_DEADLETTER';
/** A permanently failing action is retried with backoff this many times before it is parked. */
const MAX_ATTEMPTS = 25;
const backoffMs = (attempts: number) => Math.min(6 * 60 * 60_000, 15_000 * 2 ** Math.max(0, attempts - 1));

/**
 * `uq_user_collections_item` allows one live row per (user, collection, item id). A legacy row with
 * another primary key makes the upsert fail with 23505 (HTTP 409) forever. Retire those rows
 * (soft delete) so the namespaced row can be written.
 */
export const retireConflictingRows = async (userId: string, collectionName: string, itemId: string, keepId: string) => {
  await supabase
    .from('user_collections')
    .update({ deleted: true })
    .eq('user_id', userId)
    .eq('collection_name', collectionName)
    .eq('data->>id', itemId)
    .neq('id', keepId)
    .eq('deleted', false);
};
export const isUniqueViolation = (e: any) => e?.code === '23505' || Number(e?.status) === 409;

/**
 * Writes that left the device but may not be visible to a concurrent read yet. A bulk sync that
 * started before the write committed would otherwise bring back the OLD row and overwrite the
 * user's change (e.g. a habit check "undoing itself"). Entries stay a short while after success
 * to cover reads already in flight.
 */
type InFlight = { type: 'SAVE' | 'UPDATE' | 'DELETE'; userId: string; collectionName: string; itemId: string; data?: any; seq: number };
const inFlight = new Map<string, InFlight>();
let inFlightSeq = 0;
const INFLIGHT_GRACE_MS = 20_000;
const inFlightKey = (userId: string, collectionName: string, itemId: string) => `${userId}|${collectionName}|${itemId}`;

// 🧠 MEMORY CORE: Synchronous in-memory queue cache loaded instantly from localStorage
let cachedQueue: OfflineAction[] = [];
try {
  if (typeof localStorage !== 'undefined') {
    const q = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (q) {
      cachedQueue = JSON.parse(q);
    }
  }
} catch (e) {
  console.warn("Failed to initialize offline queue memory cache", e);
}

export const OfflineSyncService = {
  getQueueSync: (): OfflineAction[] => {
    return cachedQueue;
  },

  getQueue: async (): Promise<OfflineAction[]> => {
    try {
      const { value } = await Preferences.get({ key: OFFLINE_QUEUE_KEY });
      if (!value) {
        // Fallback to localStorage just in case
        const q = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (q) {
            await Preferences.set({ key: OFFLINE_QUEUE_KEY, value: q });
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            cachedQueue = JSON.parse(q);
            return cachedQueue;
        }
        return cachedQueue || [];
      }
      cachedQueue = JSON.parse(value);
      return cachedQueue;
    } catch {
      return cachedQueue || [];
    }
  },

  saveQueue: async (queue: OfflineAction[]) => {
    try {
      cachedQueue = queue;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
      await Preferences.set({ key: OFFLINE_QUEUE_KEY, value: JSON.stringify(queue) });
    } catch (e) {
      console.error("Failed to save offline queue", e);
    }
  },

  addAction: async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const queue = [...(await OfflineSyncService.getQueue())];
    
    // Deduplication for UPDATE, SAVE and STATS_SYNC on same item/user
    const existingIdx = queue.findIndex(a => 
      a.itemId === action.itemId && 
      a.collectionName === action.collectionName && 
      a.userId === action.userId &&
      (a.type === action.type || (a.type === 'SAVE' && action.type === 'UPDATE'))
    );
    
    const newAction: OfflineAction = {
      ...action,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now()
    };

    if (existingIdx >= 0) {
      const existing = queue[existingIdx];
      if (action.type === 'DELETE') {
        // Remove all previous saves/updates for this item and just queue delete
        const filtered = queue.filter(a => !(a.itemId === action.itemId && a.collectionName === action.collectionName && a.userId === action.userId));
        filtered.push(newAction);
        await OfflineSyncService.saveQueue(filtered);
      } else if (existing.type === 'SETTINGS_SAVE' && action.type === 'SETTINGS_SAVE') {
        const prevPrefs = existing.data?.local_prefs;
        existing.data = { ...existing.data, ...action.data };
        if (prevPrefs || action.data?.local_prefs) {
          existing.data.local_prefs = { ...(prevPrefs || {}), ...(action.data?.local_prefs || {}) };
        }
        existing.timestamp = Date.now();
        await OfflineSyncService.saveQueue(queue);
      } else if (existing.type === 'SAVE' && action.type === 'UPDATE') {
        existing.data = { ...existing.data, ...action.data };
        existing.timestamp = Date.now();
        await OfflineSyncService.saveQueue(queue);
      } else if (existing.type === 'UPDATE' && action.type === 'UPDATE') {
        existing.data = { ...existing.data, ...action.data };
        existing.timestamp = Date.now();
        await OfflineSyncService.saveQueue(queue);
      } else if (existing.type === 'STATS_SYNC') {
        // Overwrite pending stats with the newer stats data
        existing.data = action.data;
        existing.timestamp = Date.now();
        await OfflineSyncService.saveQueue(queue);
      } else {
        queue.push(newAction);
        await OfflineSyncService.saveQueue(queue);
      }
    } else {
      // For STATS_SYNC, if there's any pending stats sync, replace it completely (we only need the latest stats)
      if (action.type === 'STATS_SYNC') {
        const filtered = queue.filter(a => !(a.type === 'STATS_SYNC' && a.userId === action.userId));
        filtered.push(newAction);
        await OfflineSyncService.saveQueue(filtered);
      } else {
        queue.push(newAction);
        await OfflineSyncService.saveQueue(queue);
      }
    }

    console.log(`[Offline Sync] Action ${action.type} queued for ${action.collectionName}/${action.itemId}`);
    
    if (navigator.onLine) {
      OfflineSyncService.processQueue();
    }
  },

  removeAction: async (id: string) => {
    const queue = await OfflineSyncService.getQueue();
    await OfflineSyncService.saveQueue(queue.filter(a => a.id !== id));
  },

  hasPendingSave: (userId: string, collectionName: string, itemId: string): boolean => {
    return cachedQueue.some(a => a.userId === userId && a.collectionName === collectionName && a.itemId === itemId && a.type === 'SAVE');
  },

  hasPendingStatsSync: (userId: string): boolean => {
    return cachedQueue.some(a => a.userId === userId && a.type === 'STATS_SYNC');
  },

  getPendingStats: (userId: string): any | null => {
    const action = cachedQueue.find(a => a.userId === userId && a.type === 'STATS_SYNC');
    return action?.data?.stats || null;
  },

  removePendingStatsSync: async (userId: string) => {
    const queue = await OfflineSyncService.getQueue();
    const filtered = queue.filter(a => !(a.userId === userId && a.type === 'STATS_SYNC'));
    if (filtered.length !== queue.length) {
      await OfflineSyncService.saveQueue(filtered);
      console.log(`[Offline Sync] Cleaned up pending STATS_SYNC for user ${userId}`);
    }
  },

  /** Registers a write in progress; call the returned function when it finished (ok or queued). */
  trackWrite: (w: Omit<InFlight, 'seq'>) => {
    const key = inFlightKey(w.userId, w.collectionName, w.itemId);
    const prev = inFlight.get(key);
    // Successive UPDATEs on the same item accumulate (a later patch must not hide an earlier one).
    const data = prev && prev.type === 'UPDATE' && w.type === 'UPDATE' ? { ...prev.data, ...w.data } : w.data;
    const entry: InFlight = { ...w, data, seq: ++inFlightSeq };
    inFlight.set(key, entry);
    return () => {
      setTimeout(() => { if (inFlight.get(key)?.seq === entry.seq) inFlight.delete(key); }, INFLIGHT_GRACE_MS);
    };
  },

  applyPendingActionsToCollection: <T extends { id: string }>(userId: string, collectionName: string, serverItems: T[]): T[] => {
    const queued = cachedQueue.filter(a => a.userId === userId && a.collectionName === collectionName);
    const flying = Array.from(inFlight.values()).filter(a => a.userId === userId && a.collectionName === collectionName);
    const pendingActions = [...queued, ...flying] as { type: string; itemId: string; data?: any }[];
    if (pendingActions.length === 0) return serverItems;

    let result = [...serverItems];
    for (const action of pendingActions) {
      if (action.type === 'SAVE') {
        const idx = result.findIndex(item => item.id === action.itemId);
        if (idx >= 0) {
          result[idx] = action.data;
        } else {
          result.push(action.data);
        }
      } else if (action.type === 'UPDATE') {
        const idx = result.findIndex(item => item.id === action.itemId);
        if (idx >= 0) {
          result[idx] = { ...result[idx], ...action.data };
        }
      } else if (action.type === 'DELETE') {
        result = result.filter(item => item.id !== action.itemId);
      }
    }
    return result;
  },

  processQueue: async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    // One runner at a time: two overlapping runs used to send the same writes twice.
    if (processing) { rerun = true; return processing; }
    processing = (async () => {
      do {
        rerun = false;
        await runQueueOnce();
      } while (rerun);
    })().finally(() => { processing = null; });
    return processing;
  }
};

let processing: Promise<void> | null = null;
let rerun = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const isAuthFailure = (e: any) => {
  const msg = String(e?.message || e?.code || '').toLowerCase();
  return Number(e?.status) === 401 || /jwt|token|pgrst301/.test(msg);
};
const isNetworkFailure = (e: any) => {
  const msg = String(e?.message || e || '').toLowerCase();
  const status = Number(e?.status ?? 0);
  return status >= 500 || status === 408 || status === 429 || /failed to fetch|network|timeout|offline|abort|load failed/.test(msg);
};

const runAction = async (action: OfflineAction) => {
  if (action.type === 'SAVE' || action.type === 'UPDATE') {
    const uniqueRecordId = `${action.userId}_${action.collectionName}_${action.itemId}`;
    let mergedData = action.data;

    if (action.type === 'UPDATE') {
      const { data: existingData, error: readError } = await supabase
        .from('user_collections')
        .select('data, deleted')
        .eq('id', uniqueRecordId)
        .eq('user_id', action.userId)
        .limit(1);
      if (readError) throw readError;
      const row = existingData?.[0];
      // Deleted meanwhile: the edit must not bring it back.
      if (row && (row.deleted || row.data?.deleted)) return;
      mergedData = { ...(row?.data || {}), ...action.data, id: action.itemId };
    }
    if (mergedData && typeof mergedData === 'object') {
      mergedData = { ...mergedData };
      delete mergedData.deleted;
    }

    const write = () => supabase
      .from('user_collections')
      .upsert({
        id: uniqueRecordId,
        user_id: action.userId,
        collection_name: action.collectionName,
        data: mergedData,
        deleted: false
      }, { onConflict: 'id' });
    let { error } = await write();
    if (error && isUniqueViolation(error)) {
      await retireConflictingRows(action.userId, action.collectionName, action.itemId, uniqueRecordId);
      ({ error } = await write());
    }
    if (error) throw error;
  } else if (action.type === 'DELETE') {
    const uniqueRecordId = `${action.userId}_${action.collectionName}_${action.itemId}`;
    // Soft delete, matching the persistence service.
    const { error } = await supabase
      .from('user_collections')
      .update({ deleted: true, data: { id: action.itemId, deleted: true } })
      .eq('user_id', action.userId)
      .eq('collection_name', action.collectionName)
      .or(`id.eq.${uniqueRecordId},id.eq.${action.itemId}`);
    if (error) throw error;

    const { error: upsertError } = await supabase
      .from('user_collections')
      .upsert({
        id: uniqueRecordId,
        user_id: action.userId,
        collection_name: action.collectionName,
        data: { id: action.itemId, deleted: true },
        deleted: true
      }, { onConflict: 'id' });
    if (upsertError) throw upsertError;
  } else if (action.type === 'SETTINGS_SAVE') {
    // Merge (never replace): a queued save only carries the keys that changed.
    await mergeUserSettings(action.userId, action.data || {});
  } else if (action.type === 'STATS_SYNC') {
    const updatePayload: any = {
      stats: action.data.stats,
      last_login_at: new Date().toISOString()
    };
    if (action.data.inventory) updatePayload.inventory = action.data.inventory;
    const { error } = await supabase.from('users').update(updatePayload).eq('id', action.userId);
    if (error) throw error;
  }
};

const parkAction = (action: OfflineAction, error: unknown) => {
  try {
    const parked = JSON.parse(localStorage.getItem(DEAD_LETTER_KEY) || '[]');
    parked.push({ ...action, error: String((error as any)?.message || error), parkedAt: Date.now() });
    localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(parked.slice(-200)));
    return true;
  } catch {
    return false; // storage full: the action stays in the queue instead
  }
};

const runQueueOnce = async () => {
  const queue = await OfflineSyncService.getQueue();
  if (queue.length === 0) return;
  console.log(`[Offline Sync] Processing ${queue.length} pending actions...`);

  const now = Date.now();
  // Items whose earlier action failed: later actions on the same item wait, so order per item holds.
  const blocked = new Set<string>();
  let earliestRetry = Infinity;

  for (const action of [...queue]) {
    const itemKey = action.type === 'STATS_SYNC' ? `${action.userId}|stats` : `${action.userId}|${action.collectionName}|${action.itemId}`;
    if (blocked.has(itemKey)) continue;
    if (action.nextAt && action.nextAt > now) {
      blocked.add(itemKey);
      earliestRetry = Math.min(earliestRetry, action.nextAt);
      continue;
    }
    try {
      await runAction(action);
      await OfflineSyncService.removeAction(action.id);
      console.log(`[Offline Sync] Processed ${action.type} for ${action.collectionName}/${action.itemId}`);
    } catch (e) {
      console.error(`[Offline Sync] Failed to process action ${action.id}`, e);
      if (isAuthFailure(e)) {
        // An expired session: refresh it and stop this round (every write would fail the same way).
        try { await supabase.auth.refreshSession(); } catch { /* next round */ }
        earliestRetry = Math.min(earliestRetry, Date.now() + 15_000);
        break;
      }
      if (isNetworkFailure(e)) {
        // Offline / server down: nothing else will get through either.
        earliestRetry = Math.min(earliestRetry, Date.now() + 30_000);
        break;
      }
      // A failure specific to this action: back off, but let every other item sync.
      const attempts = (action.attempts || 0) + 1;
      const current = await OfflineSyncService.getQueue();
      if (attempts >= MAX_ATTEMPTS && parkAction(action, e)) {
        await OfflineSyncService.saveQueue(current.filter(a => a.id !== action.id));
      } else {
        const nextAt = Date.now() + backoffMs(attempts);
        await OfflineSyncService.saveQueue(current.map(a => (a.id === action.id ? { ...a, attempts, nextAt } : a)));
        earliestRetry = Math.min(earliestRetry, nextAt);
      }
      blocked.add(itemKey);
    }
  }

  if (earliestRetry !== Infinity && typeof window !== 'undefined') {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { retryTimer = null; OfflineSyncService.processQueue(); }, Math.max(5_000, earliestRetry - Date.now()));
  }
};

// Hook up listener to process queue when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline Sync] Back online! Processing queue...');
    OfflineSyncService.processQueue();
  });
  
  // Also try to process queue on startup (faster 1s delay)
  setTimeout(() => OfflineSyncService.processQueue(), 1000);
}
