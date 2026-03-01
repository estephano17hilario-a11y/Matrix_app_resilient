import { db, doc, runTransaction, Transaction } from "./firebase";
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
 * Executes a secure transaction to purchase an item.
 * Atomic: Deducts gold and applies effects immediately.
 */
export const purchaseItem = async (userId: string, item: StoreItem) => {
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction: Transaction) => {
      const userDoc = await transaction.get(userRef as any);
      if (!userDoc.exists()) {
        throw new Error("User does not exist!");
      }

      const userData = userDoc.data() as any;
      const currentGold = userData.stats?.gold || 0;

      if (currentGold < item.price) {
        throw new Error("Insufficient funds");
      }

      // Calculate new state
      const newGold = currentGold - item.price;
      const updates: any = {
        "stats.gold": newGold
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
          const currentUnlocked = userData.unlockedStoreItems || [];
          if (!currentUnlocked.includes(item.id)) {
              updates.unlockedStoreItems = [...currentUnlocked, item.id];
          }
      }

      // Commit updates
      transaction.update(userRef as any, updates);
    });

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
    const userRef = doc(db, "users", userId);
    
    try {
        await runTransaction(db, async (transaction: Transaction) => {
            const userDoc = await transaction.get(userRef as any);
            if (!userDoc.exists()) throw new Error("User not found");
            
            const userData = userDoc.data() as any;
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
            
            const updates: any = { inventory: newInventory };
            
            // 2. Apply Effect
            if (effect) {
                const stats = userData.stats || {};
                switch (effect.type) {
                    case 'heal':
                        const currentHp = stats.hp || 0;
                        // 🛡️ RECOVERED LOGIC: Force Max HP to 100 as per user request
                        const maxHp = 100; 
                        updates["stats.hp"] = Math.min(maxHp, currentHp + effect.value);
                        updates["stats.maxHp"] = maxHp; // Sync DB to new rule
                        break;
                    case 'xp_boost':
                        const newXp = (stats.xp || 0) + effect.value;
                        updates["stats.xp"] = newXp;
                        // Recalculate level
                        const newLevel = calculateLevelFromXp(newXp);
                        updates["stats.level"] = newLevel;
                        updates["stats.nextXp"] = calculateNextLevelXp(newLevel);
                        break;
                    case 'restore_streak':
                        const currentStreak = stats.streak || 0;
                        updates["stats.streak"] = currentStreak + (effect.value || 1);
                        break;
                    case 'freeze_streak':
                        const now = new Date();
                        const durationHours = effect.duration || 24;
                        const freezeUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
                        updates["stats.streakFrozenUntil"] = freezeUntil.toISOString();
                        break;
                }
            }
            
            transaction.update(userRef as any, updates);
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * Adds gold to the user's account (e.g. from watching ads).
 */
export const addGold = async (userId: string, amount: number) => {
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction: Transaction) => {
        const userDoc = await transaction.get(userRef as any);
        if (!userDoc.exists()) {
             throw new Error("User does not exist!");
        }
        
        const userData = userDoc.data() as any;
        const currentGold = userData.stats?.gold || 0;
        
        transaction.update(userRef as any, {
            "stats.gold": currentGold + amount
        });
    });
    
    return { success: true };
  } catch (error) {
      console.error("Error adding gold:", error);
      return { success: false, error };
  }
};
