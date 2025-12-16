import { db } from "./firebase";
import { doc, runTransaction, Transaction } from "firebase/firestore";

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'power_up' | 'theme' | 'cosmetic' | 'bad_habit';
  icon?: React.ReactNode; // We might handle icons in the UI component mapping
  iconName?: string; // For serializable icon reference
}

/**
 * Executes a secure transaction to purchase an item.
 * Atomic: Deducts gold and adds item to inventory simultaneously.
 */
export const purchaseItem = async (userId: string, item: StoreItem) => {
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction: Transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("User does not exist!");
      }

      const userData = userDoc.data();
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
      transaction.update(userRef, {
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
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("User does not exist!");
        }
        
        const userData = userDoc.data();
        const currentGold = userData.stats?.gold || 0;
        
        transaction.update(userRef, {
            "stats.gold": currentGold + amount
        });
    });
    return { success: true };
  } catch (error: any) {
    console.error("Add Gold failed:", error);
    return { success: false, error: error.message };
  }
};
