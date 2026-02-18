import { doc, runTransaction, db } from "./firebase";
import { RewardPrediction } from "../utils/rewardCalculator";

/**
 * SERVICE: Game Logic & Transactions
 * Handles the "Lux" core mechanics: Rewards, Leveling, Stats.
 */

export const completeTaskTransaction = async (
  userId: string, 
  _taskId: string, 
  reward: RewardPrediction,
  _attributeId: string
) => {
  const userRef = doc(db, "users", userId);
  // Assuming tasks are in a subcollection, but user instructions were vague.
  // If tasks are local-only for now, we just update user stats.
  // If we need to mark task as completed in DB:
  // const taskRef = doc(db, "users", userId, "tasks", taskId);

  try {
    await runTransaction(db, async (transaction: any) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User does not exist!");

      const userData = userDoc.data();
      const stats = userData.stats || { xp: 0, gold: 0, level: 1 };
      
      // Calculate new stats
      const newXp = (stats.xp || 0) + reward.xp;
      const newGold = (stats.gold || 0) + reward.coins;
      
      // Level Up Logic (Simplified for DB, client handles animation)
      // Assuming 1000 XP per level for now, or fetch from config
      // Let's just update XP and Gold. 
      
      // Update Traits if they exist in DB
      // We assume userData.attributes is a map or array.
      // Since schema wasn't fully defined for traits, we will try to update if structure exists.
      // If not, we just update main stats.

      transaction.update(userRef, {
        "stats.xp": newXp,
        "stats.gold": newGold
      });

      // If we had task ref:
      // transaction.update(taskRef, { completed: true, completedAt: new Date() });
    });
    console.log("Transaction success: Rewards applied.");
    return { success: true };
  } catch (error) {
    console.error("Transaction failed:", error);
    return { success: false, error };
  }
};

export const revertTaskTransaction = async (userId: string, taskId: string, reward: RewardPrediction) => {
    // Placeholder for revert logic
    console.log("Reverting task transaction...", userId, taskId, reward);
    return { success: true };
};
