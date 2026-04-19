import { supabase } from './supabase';
import { Quest, Habit, Note, JournalEntry, Attribute, Project, BadHabit } from '../types';
import { SmartProject } from '../types/SmartGoal';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';
import { AuditLogger } from './auditService';

// Generic helper for subcollection CRUD using Supabase
const createSubCollectionService = <T extends { id: string, deleted?: boolean }>(collectionName: string) => ({
  getAll: async (userId: string): Promise<T[] | null> => {
    try {
      const { data, error } = await supabase
        .from('user_collections')
        .select('data, id')
        .eq('user_id', userId)
        .eq('collection_name', collectionName)
        .eq('deleted', false);

      if (error) throw error;
      
      // Deduplicate by item.id (preferring the new uniqueRecordId format if duplicates exist)
      const map = new Map<string, T>();
      data.forEach(row => {
        const item = row.data as T;
        if (!item || !item.id) return;
        
        // If we already have an entry, prefer the one whose row ID matches the new format
        const expectedId = `${userId}_${collectionName}_${item.id}`;
        if (!map.has(item.id) || row.id === expectedId) {
          map.set(item.id, item);
        }
      });
      
      return Array.from(map.values());
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      return null;
    }
  },

  // Optimized Fetch with Query Constraints (Not fully implemented for Supabase JSONB yet, falls back to getAll and client filter if needed)
  getFiltered: async (userId: string, _constraints: any[]): Promise<T[] | null> => {
    // For now, fetch all and let client filter, or implement specific JSONB queries later
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
      const uniqueRecordId = `${userId}_${collectionName}_${targetId}`;

      const { error } = await supabase
        .from('user_collections')
        .upsert({
          id: uniqueRecordId,
          user_id: userId,
          collection_name: collectionName,
          data: cleanItem,
          deleted: false
        }, { onConflict: 'id' });

      if (error) throw error;
      
      // AUDIT LOG
      AuditLogger.log(item.id ? 'UPDATE' : 'CREATE', collectionName, targetId, { userId });
      
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

      // Fetch existing data first to merge
      const { data: existingData, error: fetchError } = await supabase
        .from('user_collections')
        .select('data')
        .in('id', [uniqueRecordId, itemId])
        .eq('user_id', userId)
        .eq('collection_name', collectionName)
        .limit(1)
        .single();

      const currentData = fetchError ? {} : (existingData?.data || {});
      const cleanData = sanitizeFirestoreData(dataToUpdate);
      const mergedData = { ...currentData, ...cleanData, id: itemId };

      const { error } = await supabase
        .from('user_collections')
        .upsert({
          id: uniqueRecordId,
          user_id: userId,
          collection_name: collectionName,
          data: mergedData,
          deleted: false
        }, { onConflict: 'id' });

      if (error) throw error;

      // AUDIT LOG
      AuditLogger.log('UPDATE', collectionName, itemId, { changes: Object.keys(dataToUpdate) });

    } catch (error: any) {
      console.error(`Error updating ${collectionName}:`, error?.message || error);
      AuditLogger.log('ERROR', collectionName, itemId, { error: String(error) });
      throw error;
    }
  },

  // HARD DELETE IMPLEMENTATION (Optimizado para AHORRO DE COSTES de Almacenamiento en Supabase)
  delete: async (userId: string, itemId: string): Promise<void> => {
    try {
      const uniqueRecordId = `${userId}_${collectionName}_${itemId}`;

      const { error } = await supabase
        .from('user_collections')
        .delete()
        .in('id', [uniqueRecordId, itemId])
        .eq('user_id', userId)
        .eq('collection_name', collectionName);

      if (error) throw error;

      // AUDIT LOG
      AuditLogger.log('DELETE', collectionName, itemId, { userId });

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
              .single();

            if (error) return null;
            return data?.data || null;
        } catch (error: any) {
            console.error("Error fetching settings:", error?.message || error);
            return null;
        }
    },
    save: async (userId: string, dataToSave: any) => {
        try {
            const { error } = await supabase
              .from('user_collections')
              .upsert({
                id: `config_${userId}`,
                user_id: userId,
                collection_name: 'settings',
                data: dataToSave,
                deleted: false
              }, { onConflict: 'id' });
            
            if (error) throw error;
        } catch (error: any) {
            console.error("Error saving settings:", error?.message || error);
        }
    }
}

export const questService = createSubCollectionService<Quest>('quests');
export const habitService = createSubCollectionService<Habit>('habits');
export const noteService = createSubCollectionService<Note>('notes');
export const journalService = createSubCollectionService<JournalEntry>('journal');
export const attributeService = createSubCollectionService<Attribute>('attributes');
export const smartProjectService = createSubCollectionService<SmartProject>('smartProjects');
export const projectService = createSubCollectionService<Project>('projects');
export const badHabitService = createSubCollectionService<BadHabit>('badHabits');

export const persistenceService = {
  quests: questService,
  habits: habitService,
  badHabits: badHabitService,
  notes: noteService,
  journal: journalService,
  attributes: attributeService,
  smartProjects: smartProjectService,
  projects: projectService,
  settings: settingsService
};
