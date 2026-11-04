import { PROGRESSION_CONFIG } from '@/modules/progression/engine/config';
import { progressionStore } from '@/modules/progression/progressionStore';
import { frameItemId } from '@/modules/progression/frames';
import { SOCIAL_CONFIG, chestItemId } from '@/modules/social/engine';
import { supabase } from '@/services/supabase';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { anchorRestoredStreak } from '@/utils/streakRules';
import { purchaseItem, consumeItem, StoreItem, InventoryItem } from '@/services/economyService';
import { useLux } from '@/context/LuxContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { calculateLevelFromXp, calculateNextLevelXp } from '@/utils/leveling';
import { UserData } from '@/types/User';
import { OfflineSyncService } from '@/services/offlineSync';

export interface EconomyContextType {
  purchase: (item: StoreItem) => Promise<boolean>;
  /** Adds items to the inventory without charging (duel chests, rewards). */
  grantItem: (itemId: string, quantity?: number) => Promise<boolean>;
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
    price: 1500,
    category: 'power_up',
    iconName: 'Zap',
    effect: { type: 'heal', value: 5 }
  },
  {
    id: 'redemption_token',
    name: 'store.items.redemption_token.name',
    description: 'store.items.redemption_token.desc',
    price: 1800,
    category: 'power_up',
    iconName: 'ShieldAlert',
    effect: { type: 'restore_streak', value: 1 }
  },
  {
    id: PROGRESSION_CONFIG.SHIELD_ITEM_ID,
    name: 'store.items.rest_shield.name',
    description: 'store.items.rest_shield.desc',
    price: PROGRESSION_CONFIG.SHIELD_PRICE_GOLD,
    category: 'power_up',
    iconName: 'ShieldAlert',
    effect: { type: 'rest_shield', value: 1 }
  },
  // Duel chests: never sold, only won. Opening one pays its value in gold.
  ...SOCIAL_CONFIG.CHEST_TIERS.map((value): StoreItem => ({
    id: chestItemId(value),
    name: `Cofre de ${value} de oro`,
    description: 'Premio de duelo: ábrelo para recibir su oro',
    price: value,
    category: 'chest',
    iconName: 'Gift',
    effect: { type: 'chest', value },
  })),
  // Rank frames: never sold, granted when the rank is reached. Equipping one is optional.
  ...PROGRESSION_CONFIG.RANKS.map((rank, i): StoreItem => ({
    id: frameItemId(i),
    name: `Marco ${rank.name}`,
    description: `Marco de perfil del rango ${rank.name}. Equípalo o quítalo cuando quieras.`,
    price: [300, 600, 1000, 1500, 2500, 4000, 6000, 10000][i] ?? 300,
    category: 'frame',
    iconName: 'Gem',
    effect: { type: 'frame', value: i },
  })),
];

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, updateLuxLocally } = useLux();
  // The daily streak (count, date, freeze) is read from the auth profile, so
  // streak items must start from it and write back to it.
  const { profile, updateProfileLocally } = useAuth();
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

        const authStats: any = profile?.stats || {};
        const newStats = {
          ...(user.stats || {}),
          ...(authStats.streak !== undefined ? { streak: authStats.streak } : {}),
          ...(authStats.lastStreakDate !== undefined ? { lastStreakDate: authStats.lastStreakDate } : {}),
          ...(authStats.previousStreak !== undefined ? { previousStreak: authStats.previousStreak } : {}),
          ...(authStats.streakFrozenUntil !== undefined ? { streakFrozenUntil: authStats.streakFrozenUntil } : {}),
        } as any;
        
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
            // Continue the restored streak today (see anchorRestoredStreak).
            anchorRestoredStreak(newStats);
            break;
          }
          case 'freeze_streak': {
            const now = new Date();
            const freezeUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            newStats.streakFrozenUntil = freezeUntil.toISOString();
            break;
          }
          case itemId.startsWith('chest_') ? itemId : '': {
            newStats.gold = (newStats.gold || 0) + (Number(itemId.slice(6)) || 0);
            break;
          }
          case PROGRESSION_CONFIG.SHIELD_ITEM_ID: {
            // One rest day: no ELO losses and the habit streak is kept.
            const r = progressionStore.activateShield('PURCHASED');
            if (!r.ok) {
              throw new Error(r.reason === 'ALREADY_ACTIVE' ? 'Ya tienes un escudo activo hoy' : 'No se pudo activar el escudo');
            }
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
        if (itemId === 'redemption_token' || itemId === 'freeze_streak') {
          updateProfileLocally({
            stats: {
              ...(profile?.stats || {}),
              streak: newStats.streak,
              lastStreakDate: newStats.lastStreakDate,
              previousStreak: newStats.previousStreak,
              streakFrozenUntil: newStats.streakFrozenUntil,
            } as any,
          });
        }
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
        } else if (itemId.startsWith('chest_')) {
          toast.success(`Cofre abierto: +${Number(itemId.slice(6)) || 0} de oro`);
        } else if (itemId === PROGRESSION_CONFIG.SHIELD_ITEM_ID) {
          toast.success("Escudo activado: hoy es día de descanso");
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
  }, [user, updateLuxLocally, profile, updateProfileLocally]);

  const grantItem = useCallback(async (itemId: string, quantity = 1): Promise<boolean> => {
    if (!user?.id || quantity <= 0) return false;
    const add = (inv: InventoryItem[]) => {
      const next = [...inv];
      const i = next.findIndex(x => x.itemId === itemId);
      if (i >= 0) next[i] = { ...next[i], quantity: next[i].quantity + quantity };
      else next.push({ itemId, quantity, acquiredAt: Date.now() });
      return next;
    };
    updateLuxLocally({ inventory: add((user.inventory || []) as InventoryItem[]) });
    try {
      const { data, error } = await supabase.from('users').select('inventory').eq('id', user.id).maybeSingle();
      if (error) throw error;
      const { error: upErr } = await supabase.from('users').update({ inventory: add((data?.inventory || []) as InventoryItem[]) }).eq('id', user.id);
      if (upErr) throw upErr;
      return true;
    } catch (e) {
      console.warn('[Economy] grantItem sync failed', e);
      return false;
    }
  }, [user, updateLuxLocally]);

  const consume = useItem;
  const inventory = useMemo(() => (user?.inventory || []) as InventoryItem[], [user?.inventory]);
  const value = useMemo(() => ({ 
    purchase, 
    grantItem,
    useItem, 
    consume,
    isTransactionPending, 
    storeItems: STORE_ITEMS,
    inventory
  }), [purchase, grantItem, useItem, consume, isTransactionPending, inventory]);

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
