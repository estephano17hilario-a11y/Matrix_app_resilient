import { db, doc, runTransaction, Transaction } from "./firebase";

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'power_up' | 'theme' | 'bad_habit';
  subCategory?: string; // For grouping bad habits or other items
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
 * Atomic: Deducts gold and adds item to inventory simultaneously.
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
      const currentInventory = userData.inventory || {};

      if (currentGold < item.price) {
        throw new Error("Insufficient funds");
      }

      // Calculate new state
      const newGold = currentGold - item.price;
      const newInventory = {
        ...currentInventory,
        [item.id]: (currentInventory[item.id] || 0) + 1
      };

      // Commit updates
      transaction.update(userRef as any, {
        "stats.gold": newGold,
        inventory: newInventory
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Purchase failed:", error);
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
  } catch (error: any) {
    console.error("Add Gold failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Consumes an item from the user's inventory and applies its effects.
 */
export const consumeItem = async (userId: string, item: StoreItem) => {
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction: Transaction) => {
      const userDoc = await transaction.get(userRef as any);
      if (!userDoc.exists()) {
        throw new Error("User does not exist!");
      }

      const userData = userDoc.data() as any;
      const currentInventory = userData.inventory || {};
      const itemCount = currentInventory[item.id] || 0;

      if (itemCount <= 0) {
        throw new Error("Item not in inventory");
      }

      const newInventory = {
        ...currentInventory,
        [item.id]: itemCount - 1
      };

      if (newInventory[item.id] === 0) {
          delete newInventory[item.id];
      }

      const updates: any = {
        inventory: newInventory
      };

      // APPLY EFFECTS
      if (item.effect) {
          const stats = userData.stats || {};
          
          switch (item.effect.type) {
              case 'heal':
                  const currentHp = stats.hp || 0;
                  const maxHp = stats.maxHp || 100;
                  updates["stats.hp"] = Math.min(maxHp, currentHp + item.effect.value);
                  break;
              
              case 'xp_boost':
                  updates["stats.xp"] = (stats.xp || 0) + item.effect.value;
                  break;
              
              case 'restore_streak':
                  // Assuming logic: If streak was lost recently, restore it?
                  // For simplicity, let's just add to current streak.
                  updates["stats.currentStreak"] = (stats.currentStreak || 0) + item.effect.value;
                  break;

              case 'freeze_streak':
                  // Set a timestamp for when the freeze expires
                  const now = new Date();
                  const durationHours = item.effect.duration || 24;
                  const freezeUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
                  updates["stats.streakFrozenUntil"] = freezeUntil.toISOString();
                  break;
          }
      }

      transaction.update(userRef as any, updates);
    });

    return { success: true };
  } catch (error: any) {
    console.error("Consume Item failed:", error);
    return { success: false, error: error.message };
  }
};
