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
export const consumeItem = async (userId: string, itemId: string, effect: StoreItem['effect']) => {
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
      throw new Error("Item not in inventory");
    }
    
    // 1. Remove from inventory
    const newInventory = [...inventory];
    const item = newInventory[itemIndex];
    
    if (item.quantity > 1) {
      newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
    } else {
      newInventory.splice(itemIndex, 1);
    }
    
    const stats = { ...(userData.stats || {}) };
    const updates: any = { 
      inventory: newInventory,
      stats: stats
    };
    
    // 2. Apply Effect
    if (effect) {
      switch (effect.type) {
        case 'heal': {
          const currentHp = stats.hp || 0;
          const maxHp = 100; 
          if (currentHp >= maxHp) {
            throw new Error("HP is already full.");
          }
          stats.hp = Math.min(maxHp, currentHp + effect.value);
          stats.maxHp = maxHp; // Sync DB to new rule
          break;
        }
        case 'xp_boost': {
          const newXp = (stats.xp || 0) + effect.value;
          stats.xp = newXp;
          // Recalculate level
          const newLevel = calculateLevelFromXp(newXp);
          stats.level = newLevel;
          stats.nextXp = calculateNextLevelXp(newLevel);
          break;
        }
        case 'restore_streak': {
          const currentStreak = stats.streak || 0;
          const previousStreak = stats.previousStreak || 0;
          // If they have a previous streak saved (they lost it), restore it.
          // Otherwise, just give +1.
          if (previousStreak > currentStreak) {
            stats.streak = previousStreak;
            stats.previousStreak = 0; // consumed
          } else {
            stats.streak = currentStreak + (effect.value || 1);
          }
          break;
        }
        case 'freeze_streak': {
          const now = new Date();
          const durationHours = effect.duration || 24;
          const freezeUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
          stats.streakFrozenUntil = freezeUntil.toISOString();
          break;
        }
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
    console.error("Consume failed:", error);
    return { success: false, error: error.message };
  }
};
