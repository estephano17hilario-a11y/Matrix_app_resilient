import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { purchaseItem, consumeItem, StoreItem, InventoryItem } from '@/services/economyService';
import { useLux } from '@/context/LuxContext';
import { toast } from 'react-hot-toast';
import { calculateLevelFromXp, calculateNextLevelXp } from '@/utils/leveling';
import { UserData } from '@/types/User';
import { OfflineSyncService } from '@/services/offlineSync';

export interface EconomyContextType {
  purchase: (item: StoreItem) => Promise<boolean>;
  useItem: (itemId: string) => Promise<boolean>;
  consume: (itemId: string) => Promise<boolean>; // Alias for backward compatibility
  isTransactionPending: boolean;
  storeItems: StoreItem[];
  inventory: InventoryItem[];
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

const STORE_ITEMS: StoreItem[] = [
  // --- POWER UPS (MEJORAS) ---
  {
    id: 'potion_hp_small',
    name: 'store.items.potion_hp_small.name',
    description: 'store.items.potion_hp_small.desc',
    price: 500,
    category: 'power_up',
    iconName: 'Zap',
    effect: { type: 'heal', value: 10 }
  },
  {
    id: 'potion_xp_restore',
    name: 'store.items.potion_xp_restore.name',
    description: 'store.items.potion_xp_restore.desc',
    price: 400,
    category: 'power_up',
    iconName: 'Brain',
    effect: { type: 'xp_boost', value: 100 }
  },
  {
    id: 'redemption_token',
    name: 'store.items.redemption_token.name',
    description: 'store.items.redemption_token.desc',
    price: 5000,
    category: 'power_up',
    iconName: 'ShieldAlert',
    effect: { type: 'restore_streak', value: 1 }
  },
  {
    id: 'freeze_streak',
    name: 'store.items.freeze_streak.name',
    description: 'store.items.freeze_streak.desc',
    price: 1000,
    category: 'power_up',
    iconName: 'Clock',
    effect: { type: 'freeze_streak', value: 1, duration: 24 }
  },

  // --- THEMES (TEMAS) REMOVED ---
];

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, updateLuxLocally } = useLux();
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  const purchase = useCallback(async (item: StoreItem): Promise<boolean> => {
    if (!user?.id) {
      console.warn("🛒 [Store Purchase] Cannot purchase, user id is missing.");
      return false;
    }
    
    setIsTransactionPending(true);
    console.log(`🛒 [Store Purchase] Initiating transaction. User: ${user.id}, Item: ${item.id}, Price: ${item.price}`);

    // Haptic feedback start
    if (navigator.vibrate) navigator.vibrate(20);

    try {
      const result = await purchaseItem(user.id, item);
      console.log("🛒 [Store Purchase] Database response:", result);

      if (result.success) {
        // Success Haptic
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

        // Calculate and update local stats/inventory to reflect changes immediately in UI
        const currentGold = user.stats?.gold || 0;
        const newGold = Math.max(0, currentGold - item.price);
        const newStats = {
          ...(user.stats || {}),
          gold: newGold
        };

        const updates: Partial<UserData> = {
          stats: newStats
        };

        if (item.category === 'power_up') {
          const currentInventory = (user.inventory || []) as InventoryItem[];
          const existingItemIndex = currentInventory.findIndex((i: InventoryItem) => i.itemId === item.id);
          let newInventory = [...currentInventory];
          if (existingItemIndex >= 0) {
            newInventory[existingItemIndex] = {
              ...newInventory[existingItemIndex],
              quantity: newInventory[existingItemIndex].quantity + 1
            };
          } else {
            newInventory.push({
              itemId: item.id,
              quantity: 1,
              acquiredAt: Date.now()
            });
          }
          updates.inventory = newInventory;
        } else {
          // Permanent unlocks
          const currentUnlocked = (user.unlocked_store_items || []) as string[];
          const currentUnlockedCamel = (user.unlockedStoreItems || []) as string[];
          if (!currentUnlocked.includes(item.id)) {
            updates.unlocked_store_items = [...currentUnlocked, item.id];
          }
          if (!currentUnlockedCamel.includes(item.id)) {
            updates.unlockedStoreItems = [...currentUnlockedCamel, item.id];
          }
        }

        updateLuxLocally(updates);
        console.log("🛒 [Store Purchase] Local state updated successfully (Optimistic).");
        return true;
      } else {
        const errorMsg = result.error || 'Error al realizar la compra';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error("❌ [Store Purchase] Error processing purchase:", error);
      
      // Error Haptic
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      let errorMsg = error.message || 'Error al realizar la compra';
      if (errorMsg === 'Insufficient funds') {
        errorMsg = 'Fondos insuficientes (Oro)';
      } else if (errorMsg === 'User not found') {
        errorMsg = 'Usuario no encontrado';
      }
      toast.error(errorMsg);
      return false;
    } finally {
      setIsTransactionPending(false);
    }
  }, [user, updateLuxLocally]);

  const useItem = useCallback(async (itemId: string): Promise<boolean> => {
      if (!user?.id) {
        console.warn("🎒 [Store Consume] Cannot consume, user id is missing.");
        return false;
      }
      
      setIsTransactionPending(true);
      const storeItem = STORE_ITEMS.find(i => i.id === itemId);
      console.log(`🎒 [Store Consume] Initiating consumption. User: ${user.id}, Item: ${itemId}`);

      try {
        const inventory = (user.inventory || []) as InventoryItem[];
        const itemIndex = inventory.findIndex(i => i.itemId === itemId);
        
        if (itemIndex === -1 || inventory[itemIndex].quantity < 1) {
          throw new Error("No tienes este ítem en tu inventario");
        }

        const newStats = { ...(user.stats || {}) };
        
        // Apply effect locally to stats
        switch (itemId) {
          case 'potion_hp_small': {
            const currentHp = newStats.hp || 0;
            const maxHp = newStats.maxHp || 100;
            if (currentHp >= maxHp) {
              throw new Error("HP is already full.");
            }
            newStats.hp = Math.min(maxHp, currentHp + 10);
            newStats.maxHp = maxHp;
            break;
          }
          case 'potion_xp_restore': {
            const newXp = (newStats.xp || 0) + 100;
            newStats.xp = newXp;
            const newLevel = calculateLevelFromXp(newXp);
            newStats.level = newLevel;
            newStats.nextXp = calculateNextLevelXp(newLevel);
            break;
          }
          case 'redemption_token': {
            const currentStreak = newStats.streak || 0;
            const previousStreak = newStats.previousStreak || 0;
            if (previousStreak > currentStreak) {
              newStats.streak = previousStreak;
              newStats.previousStreak = 0;
            } else {
              newStats.streak = currentStreak + 1;
            }
            break;
          }
          case 'freeze_streak': {
            const now = new Date();
            const freezeUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            newStats.streakFrozenUntil = freezeUntil.toISOString();
            break;
          }
          default:
            throw new Error(`Efecto para el ítem '${itemId}' no configurado.`);
        }

        // Deduct quantity and filter out if quantity is 0
        const updatedInventory = inventory.map((invItem, idx) => {
          if (idx === itemIndex) {
            return { ...invItem, quantity: invItem.quantity - 1 };
          }
          return invItem;
        });
        const newInventory = updatedInventory.filter(invItem => invItem.quantity > 0);

        const updates: Partial<UserData> = {
          inventory: newInventory,
          stats: newStats
        };

        // Update local state (Optimistic updates to React state & Capacitor Preferences cache)
        updateLuxLocally(updates);
        console.log("🎒 [Store Consume] Local state updated successfully (Optimistic).");

        // Success Haptic
        if (navigator.vibrate) navigator.vibrate(30);

        // Try syncing to Supabase
        try {
          const result = await consumeItem(user.id, itemId, storeItem?.effect);
          if (!result.success) {
            throw new Error(result.error || 'Database update failed');
          }
          console.log("🎒 [Store Consume] Database response success:", result);
        } catch (dbError: any) {
          console.warn("🎒 [Store Consume] Supabase update failed, queuing for offline sync:", dbError);
          // Add to offline sync queue
          await OfflineSyncService.addAction({
            type: 'STATS_SYNC',
            collectionName: 'users',
            userId: user.id,
            itemId: 'stats',
            data: {
              stats: newStats,
              inventory: newInventory
            }
          });
        }

        // Show toast success message
        if (itemId === 'potion_hp_small') {
          toast.success("Poción usada, recuperaste HP");
        } else {
          toast.success("Objeto utilizado correctamente");
        }
        return true;
      } catch (error: any) {
        console.error('[Inventory] Error consumiendo ítem:', error);
        
        let errorMsg = error.message || 'Error al usar el objeto';
        if (errorMsg === 'HP is already full.') {
          errorMsg = 'Los puntos de vida (HP) ya están llenos.';
        }
        toast.error(errorMsg);
        return false;
      } finally {
        setIsTransactionPending(false);
      }
  }, [user, updateLuxLocally]);

  const consume = useItem;
  const inventory = useMemo(() => (user?.inventory || []) as InventoryItem[], [user?.inventory]);
  const value = useMemo(() => ({ 
    purchase, 
    useItem, 
    consume,
    isTransactionPending, 
    storeItems: STORE_ITEMS,
    inventory
  }), [purchase, useItem, consume, isTransactionPending, inventory]);

  return (
    <EconomyContext.Provider value={value}>
      {children}
    </EconomyContext.Provider>
  );
};

export const useEconomy = () => {
  const context = useContext(EconomyContext);
  if (context === undefined) {
    throw new Error('useEconomy must be used within an EconomyProvider');
  }
  return context;
};
