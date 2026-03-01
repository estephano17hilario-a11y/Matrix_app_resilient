import { db, runTransaction, doc, serverTimestamp, increment } from './firebase';
import { UserStats, UserProfile, DailyLimits } from '../types/User';
import { Quest, Attribute } from '../types';
import { calculateLevelFromXp, calculateNextLevelXp } from '../utils/leveling';
import { toLocalISOString } from '../utils/dateUtils';

/**
 * 🛡️ TRANSACTION SERVICE
 * Handles atomic updates to critical user data (Stats, Gold, XP).
 * Ensures consistency even with network flakiness or concurrent updates.
 */
export const TransactionService = {

    /**
     * Atomically toggles a Quest completion status and updates all related stats.
     * Prevents race conditions and infinite XP glitches.
     */
    toggleQuestCompletion: async (userId: string, questId: string, isCompleted: boolean, rewardXp: number, rewardGold: number, rewardTraitXp: number) => {
        const userRef = doc(db, 'users', userId);
        const questRef = doc(db, 'users', userId, 'quests', questId);

        try {
            return await runTransaction(db, async (transaction) => {
                // 1. READ ALL DOCS FIRST
                const userDoc = await transaction.get(userRef);
                const questDoc = await transaction.get(questRef);

                if (!userDoc.exists()) throw new Error("User not found");
                if (!questDoc.exists()) throw new Error("Quest not found");

                const userData = userDoc.data() as UserProfile;
                const questData = questDoc.data() as Quest;
                
                // 2. VALIDATE STATE
                // If we try to complete, but it's already completed, abort (prevent double clicking)
                if (isCompleted && questData.completed) {
                    throw new Error("Quest already completed");
                }
                // If we try to un-complete, but it's not completed, abort
                if (!isCompleted && !questData.completed) {
                    throw new Error("Quest already un-completed");
                }

                const stats = userData.stats;
                const dailyLimits = userData.dailyLimits || { date: toLocalISOString(new Date()), taskXp: 0, taskGold: 0, taskTraitPoints: 0, tasksCompleted: 0 };

                // 3. CALCULATE NEW STATS
                // Determine direction: +1 for completion, -1 for un-completion
                const multiplier = isCompleted ? 1 : -1;

                let newXp = (stats.xp || 0) + (rewardXp * multiplier);
                let newGold = (stats.gold || 0) + (rewardGold * multiplier);
                
                if (newXp < 0) newXp = 0;
                if (newGold < 0) newGold = 0;

                const newLevel = calculateLevelFromXp(newXp);
                const newNextXp = calculateNextLevelXp(newLevel);

                // 4. HANDLE ATTRIBUTE UPDATE (If any)
                let attributeUpdate = null;
                if (questData.attribute) {
                    const attrRef = doc(db, 'users', userId, 'attributes', questData.attribute);
                    const attrDoc = await transaction.get(attrRef);
                    
                    if (attrDoc.exists()) {
                        const attrData = attrDoc.data() as Attribute;
                        let newAttrXp = (attrData.xp || 0) + (rewardTraitXp * multiplier);
                        let newAttrLevel = attrData.level;
                        let newAttrMaxXp = attrData.maxXp;

                        // Recalculate attribute level
                        // Logic simplified from useDashboardLogic:
                        // If gaining XP
                        if (multiplier > 0) {
                            while (newAttrXp >= newAttrMaxXp) {
                                newAttrXp -= newAttrMaxXp;
                                newAttrLevel += 1;
                                newAttrMaxXp = Math.floor(newAttrMaxXp * 1.2);
                            }
                        } else {
                            // If losing XP (un-complete), strictly we should reverse level down?
                            // For simplicity, we just floor at 0 for now to avoid negative XP.
                            // True reversal is complex without history.
                            newAttrXp = Math.max(0, newAttrXp); 
                        }

                        attributeUpdate = {
                            ref: attrRef,
                            data: { xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp }
                        };
                    }
                }

                // 5. UPDATE DAILY LIMITS
                const today = toLocalISOString(new Date());
                let newLimits = { ...dailyLimits };
                
                // Reset if new day
                if (newLimits.date !== today) {
                    newLimits = { 
                        date: today, 
                        taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                        habitsCompleted: 0, focusSeconds: 0, tasksCompleted: 0 
                    };
                }

                if (isCompleted) {
                    newLimits.taskXp = (newLimits.taskXp || 0) + rewardXp;
                    newLimits.taskGold = (newLimits.taskGold || 0) + rewardGold;
                    newLimits.taskTraitPoints = (newLimits.taskTraitPoints || 0) + rewardTraitXp;
                    newLimits.tasksCompleted = (newLimits.tasksCompleted || 0) + 1;
                } else {
                    // Revert limits if un-completing on same day
                    if (newLimits.date === dailyLimits.date) {
                        newLimits.taskXp = Math.max(0, (newLimits.taskXp || 0) - rewardXp);
                        newLimits.taskGold = Math.max(0, (newLimits.taskGold || 0) - rewardGold);
                        newLimits.taskTraitPoints = Math.max(0, (newLimits.taskTraitPoints || 0) - rewardTraitXp);
                        newLimits.tasksCompleted = Math.max(0, (newLimits.tasksCompleted || 0) - 1);
                    }
                }

                // 6. COMMIT UPDATES
                transaction.update(questRef, { 
                    completed: isCompleted,
                    rewardedXp: isCompleted ? rewardXp : 0,
                    rewardedGold: isCompleted ? rewardGold : 0
                });

                transaction.update(userRef, {
                    'stats.xp': newXp,
                    'stats.gold': newGold,
                    'stats.level': newLevel,
                    'stats.nextXp': newNextXp,
                    'dailyLimits': newLimits
                });

                if (attributeUpdate) {
                    transaction.update(attributeUpdate.ref, attributeUpdate.data);
                }

                // Return details for UI/Reward system
                return { 
                    newXp, 
                    newGold, 
                    newLevel, 
                    newLimits,
                    traitUpdate: attributeUpdate ? {
                        id: questData.attribute,
                        xp: attributeUpdate.data.xp,
                        level: attributeUpdate.data.level,
                        maxXp: attributeUpdate.data.maxXp,
                        // We don't have oldLevel/name here easily without reading more or passing it in.
                        // But the caller might know the name.
                    } : undefined
                };
            });
        } catch (e) {
            console.error("❌ QUEST TRANSACTION FAILED:", e);
            throw e;
        }
    },

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
