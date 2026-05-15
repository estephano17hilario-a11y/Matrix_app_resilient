import { supabase } from './supabase';
import { Preferences } from '@capacitor/preferences';

export interface OfflineAction {
  id: string; // Unique ID for the action
  type: 'SAVE' | 'UPDATE' | 'DELETE' | 'SETTINGS_SAVE';
  collectionName: string;
  userId: string;
  itemId: string;
  data?: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'MATRIX_OFFLINE_SYNC_QUEUE';

export const OfflineSyncService = {
  getQueue: async (): Promise<OfflineAction[]> => {
    try {
      const { value } = await Preferences.get({ key: OFFLINE_QUEUE_KEY });
      if (!value) {
        // Fallback to localStorage just in case
        const q = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (q) {
            await Preferences.set({ key: OFFLINE_QUEUE_KEY, value: q });
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            return JSON.parse(q);
        }
        return [];
      }
      return JSON.parse(value);
    } catch {
      return [];
    }
  },

  saveQueue: async (queue: OfflineAction[]) => {
    try {
      await Preferences.set({ key: OFFLINE_QUEUE_KEY, value: JSON.stringify(queue) });
    } catch (e) {
      console.error("Failed to save offline queue", e);
    }
  },

  addAction: async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const queue = await OfflineSyncService.getQueue();
    
    // Simplistic deduplication for UPDATE and SAVE on same item
    const existingIdx = queue.findIndex(a => a.itemId === action.itemId && a.collectionName === action.collectionName);
    
    const newAction: OfflineAction = {
      ...action,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now()
    };

    if (existingIdx >= 0) {
      const existing = queue[existingIdx];
      if (action.type === 'DELETE') {
        // If deleting, remove all previous saves/updates for this item and just queue delete
        queue.splice(existingIdx, 1);
        queue.push(newAction);
      } else if (existing.type === 'SAVE' && action.type === 'UPDATE') {
        // Merge update into save
        existing.data = { ...existing.data, ...action.data };
        existing.timestamp = Date.now();
      } else if (existing.type === 'UPDATE' && action.type === 'UPDATE') {
        // Merge updates
        existing.data = { ...existing.data, ...action.data };
        existing.timestamp = Date.now();
      } else {
        queue.push(newAction);
      }
    } else {
      queue.push(newAction);
    }

    await OfflineSyncService.saveQueue(queue);
    console.log(`[Offline Sync] Action ${action.type} queued for ${action.collectionName}/${action.itemId}`);
  },

  removeAction: async (id: string) => {
    const queue = await OfflineSyncService.getQueue();
    await OfflineSyncService.saveQueue(queue.filter(a => a.id !== id));
  },

  processQueue: async () => {
    if (!navigator.onLine) return;
    
    const queue = await OfflineSyncService.getQueue();
    if (queue.length === 0) return;

    console.log(`[Offline Sync] Processing ${queue.length} pending actions...`);
    
    for (const action of queue) {
      try {
        if (action.type === 'SAVE' || action.type === 'UPDATE') {
          const uniqueRecordId = `${action.userId}_${action.collectionName}_${action.itemId}`;
          
          let mergedData = action.data;
          
          if (action.type === 'UPDATE') {
            // For updates, try to get existing data first to merge
            const { data: existingData } = await supabase
              .from('user_collections')
              .select('data')
              .in('id', [uniqueRecordId, action.itemId])
              .eq('user_id', action.userId)
              .eq('collection_name', action.collectionName)
              .limit(1);
              
            const currentData = (existingData && existingData.length > 0) ? existingData[0].data || {} : {};
            mergedData = { ...currentData, ...action.data, id: action.itemId };
          }

          const { error } = await supabase
            .from('user_collections')
            .upsert({
              id: uniqueRecordId,
              user_id: action.userId,
              collection_name: action.collectionName,
              data: mergedData,
              deleted: false
            }, { onConflict: 'id' });

          if (error) throw error;
        } else if (action.type === 'DELETE') {
          const uniqueRecordId = `${action.userId}_${action.collectionName}_${action.itemId}`;
          const { error } = await supabase
            .from('user_collections')
            .delete()
            .in('id', [uniqueRecordId, action.itemId])
            .eq('user_id', action.userId)
            .eq('collection_name', action.collectionName);

          if (error) throw error;
        } else if (action.type === 'SETTINGS_SAVE') {
           const { error } = await supabase
              .from('user_collections')
              .upsert({
                id: `config_${action.userId}`,
                user_id: action.userId,
                collection_name: 'settings',
                data: action.data,
                deleted: false
              }, { onConflict: 'id' });
            if (error) throw error;
        }

        // Success! Remove from queue
        await OfflineSyncService.removeAction(action.id);
        console.log(`[Offline Sync] Processed ${action.type} for ${action.collectionName}/${action.itemId}`);
      } catch (e) {
        console.error(`[Offline Sync] Failed to process action ${action.id}`, e);
        // Break early to preserve order and retry later
        break;
      }
    }
  }
};

// Hook up listener to process queue when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline Sync] Back online! Processing queue...');
    OfflineSyncService.processQueue();
  });
  
  // Also try to process queue on startup
  setTimeout(() => OfflineSyncService.processQueue(), 5000);
}
