import { supabase } from './supabase';
import { Preferences } from '@capacitor/preferences';

export interface OfflineAction {
  id: string; // Unique ID for the action
  type: 'SAVE' | 'UPDATE' | 'DELETE' | 'SETTINGS_SAVE' | 'STATS_SYNC';
  collectionName: string;
  userId: string;
  itemId: string;
  data?: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'MATRIX_OFFLINE_SYNC_QUEUE';

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
      a.type === action.type
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

  applyPendingActionsToCollection: <T extends { id: string }>(userId: string, collectionName: string, serverItems: T[]): T[] => {
    const pendingActions = cachedQueue.filter(a => a.userId === userId && a.collectionName === collectionName);
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
    if (!navigator.onLine) return;
    
    const queue = await OfflineSyncService.getQueue();
    if (queue.length === 0) return;

    console.log(`[Offline Sync] Processing ${queue.length} pending actions...`);
    
    // We create a copy to iterate, since removeAction modifies the queue
    const actionsToProcess = [...queue];
    
    for (const action of actionsToProcess) {
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
        } else if (action.type === 'STATS_SYNC') {
           const { error } = await supabase
              .from('users')
              .update({
                stats: action.data.stats,
                last_login_at: new Date().toISOString()
              })
              .eq('id', action.userId);
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
  
  // Also try to process queue on startup (faster 1s delay)
  setTimeout(() => OfflineSyncService.processQueue(), 1000);
}
