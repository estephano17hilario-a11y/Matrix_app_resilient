import { PROGRESSION_CONFIG } from '@/modules/progression/engine/config';
import { progressionStore } from '@/modules/progression/progressionStore';
import { frameItemId } from '@/modules/progression/frames';
import { SOCIAL_CONFIG, chestItemId } from '@/modules/social/engine';
import { supabase } from '@/services/supabase';
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { anchorRestoredStreak, dayRange, shiftDayKey } from '@/utils/streakRules';
import { toLocalISOString } from '@/utils/dateUtils';
import { purchaseItem, consumeItem, StoreItem, InventoryItem, ItemEffectFn } from '@/services/economyService';
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

// Every consumable here has a real effect in `applyItemEffect` below.
export const STORE_ITEMS: StoreItem[] = [
  // ── Protección de racha ──
  {
    id: 'freeze_streak',
    name: 'store.items.freeze_streak.name',
    description: 'store.items.freeze_streak.desc',
    price: 1500,
    category: 'power_up',
    subCategory: 'protection',
    iconName: 'Snowflake',
    effect: { type: 'freeze_streak', value: 1 },
  },
  {
    id: 'glacier_streak',
    name: 'store.items.glacier_streak.name',
    description: 'store.items.glacier_streak.desc',
    price: 3800,
    category: 'power_up',
    subCategory: 'protection',
    iconName: 'Mountain',
    effect: { type: 'freeze_streak', value: 3 },
  },
  {
    id: 'phoenix_feather',
    name: 'store.items.phoenix_feather.name',
    description: 'store.items.phoenix_feather.desc',
    price: 4500,
    category: 'power_up',
    subCategory: 'protection',
    iconName: 'Feather',
    effect: { type: 'auto_protect', value: 3 },
  },
  {
    id: PROGRESSION_CONFIG.SHIELD_ITEM_ID,
    name: 'store.items.rest_shield.name',
    description: 'store.items.rest_shield.desc',
    price: PROGRESSION_CONFIG.SHIELD_PRICE_GOLD,
    category: 'power_up',
    subCategory: 'protection',
    iconName: 'ShieldCheck',
    effect: { type: 'rest_shield', value: 1 }
  },
  // ── Restablecimientos (se compran y aplican al instante) ──
  {
    id: 'redemption_token',
    name: 'store.items.redemption_token.name',
    description: 'store.items.redemption_token.desc',
    price: 2500,
    category: 'power_up',
    subCategory: 'restore',
    iconName: 'RotateCcw',
    effect: { type: 'restore_streak', value: 1 }
  },
  // ── Vitalidad ──
  {
    id: 'potion_hp_small',
    name: 'store.items.potion_hp_small.name',
    description: 'store.items.potion_hp_small.desc',
    price: 1500,
    category: 'power_up',
    subCategory: 'vitality',
    iconName: 'Heart',
    effect: { type: 'heal', value: 10 }
  },
  {
    id: 'potion_hp_full',
    name: 'store.items.potion_hp_full.name',
    description: 'store.items.potion_hp_full.desc',
    price: 3500,
    category: 'power_up',
    subCategory: 'vitality',
    iconName: 'HeartPulse',
    effect: { type: 'heal_full', value: 100 }
  },
  // ── Crecimiento ──
  {
    id: 'potion_xp_restore',
    name: 'store.items.potion_xp_restore.name',
    description: 'store.items.potion_xp_restore.desc',
    price: 2000,
    category: 'power_up',
    subCategory: 'growth',
    iconName: 'ScrollText',
    effect: { type: 'xp_boost', value: 250 }
  },
  // ── Misterio ──
  {
    id: 'mystery_chest',
    name: 'store.items.mystery_chest.name',
    description: 'store.items.mystery_chest.desc',
    price: 2500,
    category: 'power_up',
    subCategory: 'mystery',
    iconName: 'Gift',
    effect: { type: 'mystery', value: 1 }
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

// Streak fields are read from the auth profile; item effects write them back there.
export const STREAK_STAT_KEYS = ['streak', 'lastStreakDate', 'previousStreak', 'streakFrozenUntil', 'streakFrozenDays', 'streakLostAt', 'longestStreak'] as const;

export type MysteryPrize = { kind: 'item'; itemId: string } | { kind: 'gold'; amount: number };

/** The chest's odds, shown in the store. */
export const MYSTERY_TABLE: { prize: MysteryPrize; weight: number; label: string }[] = [
  { prize: { kind: 'item', itemId: 'freeze_streak' }, weight: 28, label: 'Congelador de racha' },
  { prize: { kind: 'item', itemId: 'potion_hp_small' }, weight: 20, label: 'Poción de vida' },
  { prize: { kind: 'item', itemId: 'potion_xp_restore' }, weight: 17, label: 'Pergamino de sabiduría' },
  { prize: { kind: 'gold', amount: 1500 }, weight: 13, label: '1,500 de oro' },
  { prize: { kind: 'item', itemId: 'glacier_streak' }, weight: 8, label: 'Glaciar eterno' },
  { prize: { kind: 'item', itemId: 'phoenix_feather' }, weight: 8, label: 'Pluma de fénix' },
  { prize: { kind: 'gold', amount: 4000 }, weight: 6, label: '4,000 de oro' },
];

const rollMysteryChest = (): MysteryPrize => {
  const total = MYSTERY_TABLE.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const row of MYSTERY_TABLE) {
    roll -= row.weight;
    if (roll <= 0) return row.prize;
  }
  return MYSTERY_TABLE[0].prize;
};

const addToInventory = (inv: InventoryItem[], itemId: string, qty = 1) => {
  const next = [...inv];
  const i = next.findIndex(x => x.itemId === itemId);
  if (i >= 0) next[i] = { ...next[i], quantity: next[i].quantity + qty };
  else next.push({ itemId, quantity: qty, acquiredAt: Date.now() });
  return next;
};

const protectDays = (stats: any, count: number) => {
  const today = toLocalISOString(new Date());
  const days = dayRange(today, shiftDayKey(today, count - 1));
  const existing: string[] = Array.isArray(stats.streakFrozenDays) ? stats.streakFrozenDays : [];
  const fresh = days.filter(d => !existing.includes(d));
  if (!fresh.length) throw new Error(count === 1 ? 'Hoy ya está protegido.' : 'Esos días ya están protegidos.');
  stats.streakFrozenDays = [...existing, ...fresh].sort().slice(-120);
};

/**
 * The effect of using one item, applied to (stats, inventory-after-use). Pure
 * apart from the date, so the server copy reaches the same result.
 */
export const applyItemEffect = (itemId: string, statsIn: any, inventory: InventoryItem[], prize: MysteryPrize | null) => {
  const stats = { ...statsIn };
  let inv = inventory;
  switch (itemId) {
    case 'potion_hp_small': {
      const maxHp = stats.maxHp || 100;
      if ((stats.hp || 0) >= maxHp) throw new Error("HP is already full.");
      stats.hp = Math.min(maxHp, (stats.hp || 0) + 10);
      stats.maxHp = maxHp;
      break;
    }
    case 'potion_hp_full': {
      const maxHp = stats.maxHp || 100;
      if ((stats.hp || 0) >= maxHp) throw new Error("HP is already full.");
      stats.hp = maxHp;
      stats.maxHp = maxHp;
      break;
    }
    case 'potion_xp_restore': {
      stats.xp = (stats.xp || 0) + 250;
      stats.level = calculateLevelFromXp(stats.xp);
      stats.nextXp = calculateNextLevelXp(stats.level);
      break;
    }
    case 'freeze_streak':
      protectDays(stats, 1);
      break;
    case 'glacier_streak':
      protectDays(stats, 3);
      break;
    case PROGRESSION_CONFIG.SHIELD_ITEM_ID: {
      // The ELO side is recorded by the progression store; streaks are kept too.
      const today = toLocalISOString(new Date());
      const existing: string[] = Array.isArray(stats.streakFrozenDays) ? stats.streakFrozenDays : [];
      if (!existing.includes(today)) stats.streakFrozenDays = [...existing, today].sort().slice(-120);
      break;
    }
    case 'redemption_token': {
      // Legacy token: brings back the last lost daily streak.
      const previous = stats.previousStreak || 0;
      if (previous <= 0) throw new Error('No tienes una racha diaria perdida que restaurar.');
      stats.streak = previous + (stats.streak || 0);
      stats.previousStreak = 0;
      stats.streakLostAt = null;
      anchorRestoredStreak(stats);
      break;
    }
    case 'mystery_chest': {
      if (!prize) throw new Error('Cofre vacío');
      if (prize.kind === 'gold') stats.gold = (stats.gold || 0) + prize.amount;
      else inv = addToInventory(inv, prize.itemId);
      break;
    }
    default:
      if (itemId.startsWith('chest_')) {
        // Duel chests: opening one pays its value in gold.
        stats.gold = (stats.gold || 0) + (Number(itemId.slice(6)) || 0);
        break;
      }
      throw new Error(`Efecto para el ítem '${itemId}' no configurado.`);
  }
  return { stats, inventory: inv };
};

const itemUsedMessage = (itemId: string, prize: MysteryPrize | null) => {
  switch (itemId) {
    case 'potion_hp_small': return 'Poción usada: +10 HP';
    case 'potion_hp_full': return 'Elixir mayor: vida al máximo';
    case 'potion_xp_restore': return 'Pergamino leído: +250 XP';
    case 'freeze_streak': return '❄️ Racha congelada: hoy está protegido';
    case 'glacier_streak': return '🏔️ Glaciar activo: hoy y los 2 días siguientes protegidos';
    case PROGRESSION_CONFIG.SHIELD_ITEM_ID: return 'Escudo activado: hoy es día de descanso';
    case 'redemption_token': return '🔥 Racha restaurada';
    case 'mystery_chest': {
      if (!prize) return 'Cofre abierto';
      if (prize.kind === 'gold') return `🎁 Cofre del destino: +${prize.amount.toLocaleString()} de oro`;
      const row = MYSTERY_TABLE.find(r => r.prize.kind === 'item' && r.prize.itemId === prize.itemId);
      return `🎁 Cofre del destino: ${row?.label || 'un poder'}`;
    }
    default:
      return itemId.startsWith('chest_') ? `Cofre abierto: +${Number(itemId.slice(6)) || 0} de oro` : 'Objeto utilizado correctamente';
  }
};

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
          // Settings → Visuals and the store read unlocks from the auth profile.
          const profileUnlocked = ((profile as any)?.unlocked_store_items || (profile as any)?.unlockedStoreItems || []) as string[];
          if (!profileUnlocked.includes(item.id)) {
            const next = [...profileUnlocked, item.id];
            updateProfileLocally({ unlocked_store_items: next, unlockedStoreItems: next } as any);
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
  }, [user, updateLuxLocally, profile, updateProfileLocally]);

  const useItem = useCallback(async (itemId: string): Promise<boolean> => {
      if (!user?.id) {
        console.warn("🎒 [Store Consume] Cannot consume, user id is missing.");
        return false;
      }

      setIsTransactionPending(true);

      try {
        const inventory = (user.inventory || []) as InventoryItem[];
        const itemIndex = inventory.findIndex(i => i.itemId === itemId);

        if (itemIndex === -1 || inventory[itemIndex].quantity < 1) {
          throw new Error("No tienes este ítem en tu inventario");
        }
        if (itemId === 'phoenix_feather') {
          throw new Error("La pluma de fénix se activa sola el día que tu racha se rompa.");
        }

        // Streak fields live in the auth profile (see useDashboardLogic), so
        // effects start from them.
        const authStats: any = profile?.stats || {};
        const baseStats = { ...(user.stats || {}) } as any;
        STREAK_STAT_KEYS.forEach(k => { if (authStats[k] !== undefined) baseStats[k] = authStats[k]; });

        // The chest is rolled once, here, so the server copy gets the same prize.
        const prize = itemId === 'mystery_chest' ? rollMysteryChest() : null;
        const apply: ItemEffectFn = (stats, inv) => applyItemEffect(itemId, stats, inv, prize);

        const afterUse = inventory
          .map((invItem, idx) => (idx === itemIndex ? { ...invItem, quantity: invItem.quantity - 1 } : invItem))
          .filter(invItem => invItem.quantity > 0);
        const { stats: newStats, inventory: newInventory } = apply(baseStats, afterUse);

        if (itemId === PROGRESSION_CONFIG.SHIELD_ITEM_ID) {
          // One rest day: no ELO losses and every streak is kept.
          const r = progressionStore.activateShield('PURCHASED');
          if (!r.ok) {
            throw new Error(r.reason === 'ALREADY_ACTIVE' ? 'Ya tienes un escudo activo hoy' : 'No se pudo activar el escudo');
          }
        }

        updateLuxLocally({ inventory: newInventory, stats: newStats });
        const streakPatch: any = {};
        STREAK_STAT_KEYS.forEach(k => { if (newStats[k] !== authStats[k]) streakPatch[k] = newStats[k]; });
        if (Object.keys(streakPatch).length) {
          updateProfileLocally({ stats: { ...(profile?.stats || {}), ...streakPatch } as any });
        }

        if (navigator.vibrate) navigator.vibrate(30);

        try {
          const result = await consumeItem(user.id, itemId, apply);
          if (!result.success) throw new Error(result.error || 'Database update failed');
        } catch (dbError: any) {
          console.warn("🎒 [Store Consume] Supabase update failed, queuing for offline sync:", dbError);
          await OfflineSyncService.addAction({
            type: 'STATS_SYNC',
            collectionName: 'users',
            userId: user.id,
            itemId: 'stats',
            data: { stats: newStats, inventory: newInventory }
          });
        }

        toast.success(itemUsedMessage(itemId, prize));
        if (prize) window.dispatchEvent(new CustomEvent('lux:mystery-prize', { detail: prize }));
        return true;
      } catch (error: any) {
        console.error('[Inventory] Error consumiendo ítem:', error);
        let errorMsg = error.message || 'Error al usar el objeto';
        if (errorMsg === 'HP is already full.') errorMsg = 'Los puntos de vida (HP) ya están llenos.';
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
