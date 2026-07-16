import { supabase } from '@/services/supabase';
import { calculateLevelFromXp, calculateNextLevelXp } from '../utils/leveling';

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
  category: 'power_up' | 'theme';
  subCategory?: string; // For grouping items
  icon?: React.ReactNode; // We might handle icons in the UI component mapping
  iconName?: string; // For serializable icon reference
  effect?: {
    type: 'heal' | 'restore_streak' | 'xp_boost' | 'freeze_streak' | 'none';
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

/**
 * Consumes an item from the inventory.
 */
export const consumeItem = async (userId: string, itemId: string, _effect: StoreItem['effect']) => {
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
    
    const stats = { ...(userData.stats || {}) };
    
    // Apply effect using switch (itemId)
    switch (itemId) {
      case 'potion_hp_small': {
        const currentHp = stats.hp || 0;
        const maxHp = stats.maxHp || 100;
        if (currentHp >= maxHp) {
          throw new Error("HP is already full.");
        }
        stats.hp = Math.min(maxHp, currentHp + 10);
        stats.maxHp = maxHp;
        break;
      }
      case 'potion_xp_restore': {
        const newXp = (stats.xp || 0) + 100;
        stats.xp = newXp;
        // Recalculate level
        const newLevel = calculateLevelFromXp(newXp);
        stats.level = newLevel;
        stats.nextXp = calculateNextLevelXp(newLevel);
        break;
      }
      case 'redemption_token': {
        const currentStreak = stats.streak || 0;
        const previousStreak = stats.previousStreak || 0;
        if (previousStreak > currentStreak) {
          stats.streak = previousStreak;
          stats.previousStreak = 0;
        } else {
          stats.streak = currentStreak + 1;
        }
        break;
      }
      case 'freeze_streak': {
        const now = new Date();
        const freezeUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        stats.streakFrozenUntil = freezeUntil.toISOString();
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

    const updates: any = { 
      inventory: newInventory,
      stats: stats
    };
    
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
