import { supabase } from '@/services/supabase';

export interface InventoryItem {
  itemId: string;
  quantity: number;
  acquiredAt: number;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'power_up' | 'theme' | 'radar_color' | 'chest' | 'frame';
  subCategory?: 'protection' | 'restore' | 'vitality' | 'growth' | 'mystery'; // For grouping items
  icon?: React.ReactNode; // We might handle icons in the UI component mapping
  iconName?: string; // For serializable icon reference
  effect?: {
    type: 'heal' | 'heal_full' | 'restore_streak' | 'xp_boost' | 'freeze_streak' | 'auto_protect' | 'rest_shield' | 'chest' | 'mystery' | 'frame' | 'none';
    value: number;
    duration?: number; // hours
  };
}

/**
 * Executes a secure database update to purchase an item using Supabase.
 */
export const purchaseItem = async (userId: string, item: StoreItem) => {
  try {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('stats, inventory, unlocked_store_items')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !userData) {
      throw new Error(fetchError?.message || "User not found");
    }

    const currentGold = userData.stats?.gold || 0;

    if (currentGold < item.price) {
      throw new Error("Insufficient funds");
    }

    // Calculate new state
    const newGold = currentGold - item.price;
    const newStats = {
      ...(userData.stats || {}),
      gold: newGold
    };

    const updates: any = {
      stats: newStats
    };

    // APPLY EFFECTS IMMEDIATELY OR UNLOCK ITEM
    if (item.category === 'power_up') {
      // PowerUps go to Inventory
      const currentInventory = (userData.inventory || []) as InventoryItem[];
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
      // PERMANENT UNLOCK (Themes, etc.)
      const currentUnlocked = (userData.unlocked_store_items || []) as string[];
      if (!currentUnlocked.includes(item.id)) {
        updates.unlocked_store_items = [...currentUnlocked, item.id];
      }
    }

    // Commit updates to Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Purchase failed:", error);
    return { success: false, error: error.message };
  }
};

export type ItemEffectFn = (stats: any, inventory: InventoryItem[]) => { stats: any; inventory: InventoryItem[] };

/**
 * Consumes an item from the inventory. `apply` is the same effect function the
 * client already applied optimistically (see EconomyContext), so the server
 * copy gets exactly the same result, on top of the latest stored stats.
 */
export const consumeItem = async (userId: string, itemId: string, apply: ItemEffectFn) => {
  try {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('stats, inventory')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !userData) {
      throw new Error(fetchError?.message || "User not found");
    }

    const inventory = (userData.inventory || []) as InventoryItem[];
    const itemIndex = inventory.findIndex(i => i.itemId === itemId);

    if (itemIndex === -1 || inventory[itemIndex].quantity < 1) {
      throw new Error("No tienes este ítem en tu inventario");
    }

    const afterUse = inventory
      .map((invItem, idx) => (idx === itemIndex ? { ...invItem, quantity: invItem.quantity - 1 } : invItem))
      .filter(invItem => invItem.quantity > 0);

    const result = apply({ ...(userData.stats || {}) }, afterUse);

    const { error: updateError } = await supabase
      .from('users')
      .update({ inventory: result.inventory, stats: result.stats })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Consume failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Deducts gold for changing the profile avatar (costs 1500 gold).
 */
export const deductGoldForAvatarChange = async (userId: string) => {
  try {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('stats')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !userData) {
      throw new Error(fetchError?.message || "User not found");
    }

    const currentGold = userData.stats?.gold || 0;
    const price = 1500;

    if (currentGold < price) {
      throw new Error(`Necesitas ${price} de oro para cambiar tu avatar.`);
    }

    const newGold = currentGold - price;
    const newStats = {
      ...(userData.stats || {}),
      gold: newGold
    };

    const { error: updateError } = await supabase
      .from('users')
      .update({ stats: newStats })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return { success: true, newGold };
  } catch (error: any) {
    console.error("Avatar gold deduction failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Checks name change cost and deducts gold if it's not the first change (first is free, subsequent cost 2000 gold).
 */
export const deductGoldForNameChange = async (userId: string) => {
  try {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('stats, preferences')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !userData) {
      throw new Error(fetchError?.message || "User not found");
    }

    const preferences = userData.preferences || {};
    const nameChangesCount = preferences.nameChangesCount || 0;

    if (nameChangesCount === 0) {
      // First time is free, just increment count
      const newPreferences = {
        ...preferences,
        nameChangesCount: 1
      };

      const { error: updateError } = await supabase
        .from('users')
        .update({ preferences: newPreferences })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return { success: true, cost: 0, newGold: userData.stats?.gold || 0, nameChangesCount: 1 };
    } else {
      // Costs 2000 gold
      const currentGold = userData.stats?.gold || 0;
      const price = 2000;

      if (currentGold < price) {
        throw new Error(`Necesitas ${price} de oro para cambiar tu nombre.`);
      }

      const newGold = currentGold - price;
      const newStats = {
        ...(userData.stats || {}),
        gold: newGold
      };
      const newPreferences = {
        ...preferences,
        nameChangesCount: nameChangesCount + 1
      };

      const { error: updateError } = await supabase
        .from('users')
        .update({ stats: newStats, preferences: newPreferences })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return { success: true, cost: price, newGold, nameChangesCount: nameChangesCount + 1 };
    }
  } catch (error: any) {
    console.error("Name change gold deduction failed:", error);
    return { success: false, error: error.message };
  }
};
