import { doc, runTransaction, db } from "./firebase";
import { GamificationEngine, TaskType } from "./gamificationEngine";
import { UserStats, DailyLimits } from "../types/User";

/**
 * SERVICE: Gamification (DB + Logic Integration)
 * Orchestrates the GamificationEngine with Firebase Firestore.
 */

export const GamificationService = {
  
  /**
   * Complete a Task
   * Applies XP, Coins, and Trait Points based on task difficulty.
   * Enforces daily caps and calculates critical hits.
   */
  async completeTask(userId: string, taskType: TaskType) {
    const userRef = doc(db, "users", userId);

    try {
      return await runTransaction(db, async (transaction: any) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");

        const userData = userDoc.data();
        const stats: UserStats = userData.stats || { xp: 0, gold: 0, level: 1, hp: 100, streak: 0 };
        let dailyLimits: DailyLimits = userData.dailyLimits || { 
          date: new Date().toISOString().split('T')[0], 
          taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
          habitsCompleted: 0, focusSeconds: 0 
        };

        // Reset Logic
        dailyLimits = GamificationEngine.checkAndResetDailyLimits(dailyLimits);

        // Execute Engine Logic
        const result = GamificationEngine.processTaskCompletion(stats, dailyLimits, taskType);

        // Commit Updates
        transaction.update(userRef, {
          "stats": result.newStats,
          "dailyLimits": result.newDailyLimits
        });

        return result.reward;
      });
    } catch (error) {
      console.error("GamificationService: completeTask failed", error);
      throw error;
    }
  },

  /**
   * Complete a Habit
   * Applies rewards based on cognitive load (Top 12 rule).
   */
  async completeHabit(userId: string, habitIndex: number) {
    const userRef = doc(db, "users", userId);

    try {
      return await runTransaction(db, async (transaction: any) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");

        const userData = userDoc.data();
        const stats: UserStats = userData.stats || { xp: 0, gold: 0, level: 1, hp: 100, streak: 0 };
        let dailyLimits: DailyLimits = userData.dailyLimits || { 
          date: new Date().toISOString().split('T')[0], 
          taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
          habitsCompleted: 0, focusSeconds: 0 
        };

        // Reset Logic
        dailyLimits = GamificationEngine.checkAndResetDailyLimits(dailyLimits);

        // Execute Engine Logic
        const result = GamificationEngine.processHabitCompletion(stats, dailyLimits, habitIndex);

        // Commit Updates
        transaction.update(userRef, {
          "stats": result.newStats,
          "dailyLimits": result.newDailyLimits
        });

        return result.reward;
      });
    } catch (error) {
      console.error("GamificationService: completeHabit failed", error);
      throw error;
    }
  },

  /**
   * Process Focus Session
   * Awards points for deep work, handling biological limits and immersion bonuses.
   */
  async processFocusSession(userId: string, durationMinutes: number, currentSessionDurationMinutes: number = 0) {
    const userRef = doc(db, "users", userId);

    try {
      return await runTransaction(db, async (transaction: any) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");

        const userData = userDoc.data();
        const stats: UserStats = userData.stats || { xp: 0, gold: 0, level: 1, hp: 100, streak: 0 };
        let dailyLimits: DailyLimits = userData.dailyLimits || { 
          date: new Date().toISOString().split('T')[0], 
          taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
          habitsCompleted: 0, focusSeconds: 0 
        };

        // Reset Logic
        dailyLimits = GamificationEngine.checkAndResetDailyLimits(dailyLimits);

        // Execute Engine Logic
        const result = GamificationEngine.processFocusSession(stats, dailyLimits, durationMinutes, currentSessionDurationMinutes);

        // Commit Updates
        transaction.update(userRef, {
          "stats": result.newStats,
          "dailyLimits": result.newDailyLimits
        });

        return result.reward;
      });
    } catch (error) {
      console.error("GamificationService: processFocusSession failed", error);
      throw error;
    }
  }
};
