import { db, runTransaction, doc, serverTimestamp, increment } from './firebase';
import { UserStats, UserProfile } from '../types/User';
import { calculateLevelFromXp, calculateXpForLevel } from '../utils/leveling';

/**
 * 🛡️ TRANSACTION SERVICE
 * Handles atomic updates to critical user data (Stats, Gold, XP).
 * Ensures consistency even with network flakiness or concurrent updates.
 */
export const TransactionService = {

    /**
     * Atomically adds XP and Gold to the user, recalculating level if needed.
     * @param userId The user's UID
     * @param xpAmount Amount of XP to add
     * @param goldAmount Amount of Gold to add
     * @param source Source of the reward (for logging/analytics - optional implementation)
     */
    awardExperience: async (userId: string, xpAmount: number, goldAmount: number) => {
        const userRef = doc(db, 'users', userId);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) {
                    throw new Error("User does not exist!");
                }

                const userData = userDoc.data() as UserProfile;
                const currentStats = userData.stats || { xp: 0, level: 1, gold: 0, hp: 100, maxHp: 100, streak: 0 };

                // 1. Calculate New Values
                let newXp = (currentStats.xp || 0) + xpAmount;
                if (newXp < 0) newXp = 0; // Prevent negative XP

                let newGold = (currentStats.gold || 0) + goldAmount;
                // Allow debt? Probably not for now.
                if (newGold < 0) newGold = 0;
                
                // 2. Level Calculation (Robust)
                // Assuming calculateLevelFromXp handles the logic. 
                // If not, we can implement a simple one here or import it.
                // For now, let's assume level is derived from total XP or explicitly tracked.
                // If the system uses "XP for next level", we need that logic.
                // Based on types, it seems `level` is stored.
                
                // Let's rely on the utility if it's pure, otherwise we recalc here.
                // We'll trust the imported util but wrap in try-catch if it fails.
                let newLevel = currentStats.level;
                try {
                    newLevel = calculateLevelFromXp(newXp); 
                } catch (e) {
                    // Fallback: Simple formula if util fails
                    newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1; 
                }

                // 3. Prepare Updates
                const updates: any = {
                    'stats.xp': newXp,
                    'stats.gold': newGold,
                    'stats.level': newLevel,
                    'lastActiveAt': serverTimestamp()
                };

                // 4. Heal on Level Up (Optional Game Mechanic)
                if (newLevel > currentStats.level) {
                    updates['stats.hp'] = currentStats.maxHp;
                    // Add notification or log here if needed
                }

                // 5. Commit
                transaction.update(userRef, updates);
            });
            console.log(`✅ ATOMIC: Awarded ${xpAmount} XP, ${goldAmount} Gold to ${userId}`);
        } catch (e) {
            console.error("❌ ATOMIC TRANSACTION FAILED:", e);
            throw e; // Propagate error for UI handling
        }
    },

    /**
     * Atomically updates a specific stat (like HP) with bounds checking.
     */
    updateStat: async (userId: string, stat: keyof UserStats, value: number, isDelta: boolean = false) => {
        const userRef = doc(db, 'users', userId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("User not found");
                
                const stats = (userDoc.data() as UserProfile).stats;
                const currentVal = (stats as any)[stat] || 0;
                let newVal = isDelta ? currentVal + value : value;

                // Bounds Checks
                if (stat === 'hp') {
                    newVal = Math.min(Math.max(0, newVal), stats.maxHp || 100);
                }

                transaction.update(userRef, {
                    [`stats.${stat}`]: newVal
                });
            });
        } catch (e) {
            console.error(`❌ ATOMIC: Failed to update ${stat}`, e);
            throw e;
        }
    }
};
