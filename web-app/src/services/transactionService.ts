import { db, runTransaction, doc, serverTimestamp, writeBatch, increment } from './firebase';
import { UserStats, UserProfile } from '../types/User';
import { toLocalISOString } from '../utils/dateUtils';

/**
 * 🛡️ OPTIMIZED TRANSACTION SERVICE (Bank-Level Economy)
 * Uses writeBatch + increment to guarantee atomic consistency with 0 reads.
 * Radically reduces Firebase costs while maintaining mathematical integrity.
 */
export const TransactionService = {

    /**
     * Atomically toggles a Quest completion status and updates all related stats.
     */
    toggleQuestCompletion: async (
        userId: string, 
        questId: string, 
        isCompleted: boolean, 
        rewardXp: number, 
        rewardGold: number, 
        rewardTraitXp: number,
        isNewDay: boolean,
        newLevel: number,
        newNextXp: number,
        attributeId?: string
    ) => {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        const questRef = doc(db, 'users', userId, 'quests', questId);

        try {
            const userUpdates: any = {
                'stats.xp': increment(rewardXp),
                'stats.gold': increment(rewardGold),
                'stats.level': newLevel,
                'stats.nextXp': newNextXp
            };

            if (isNewDay) {
                userUpdates['dailyLimits'] = { 
                    date: toLocalISOString(new Date()), 
                    taskXp: Math.max(0, rewardXp), 
                    taskGold: Math.max(0, rewardGold), 
                    taskTraitPoints: Math.max(0, rewardTraitXp), 
                    habitsCompleted: 0, focusSeconds: 0, 
                    tasksCompleted: isCompleted ? 1 : 0,
                    notesCompleted: 0, focusXp: 0, focusGold: 0, focusTraitPoints: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0
                };
            } else {
                userUpdates['dailyLimits.taskXp'] = increment(rewardXp);
                userUpdates['dailyLimits.taskGold'] = increment(rewardGold);
                userUpdates['dailyLimits.taskTraitPoints'] = increment(rewardTraitXp);
                userUpdates['dailyLimits.tasksCompleted'] = increment(isCompleted ? 1 : -1);
            }

            batch.update(userRef, userUpdates);
            batch.update(questRef, { 
                completed: isCompleted,
                rewardedXp: isCompleted ? rewardXp : 0,
                rewardedGold: isCompleted ? rewardGold : 0
            });

            if (attributeId) {
                const attrRef = doc(db, 'users', userId, 'attributes', attributeId);
                batch.update(attrRef, { xp: increment(rewardTraitXp) });
            }

            await batch.commit();
            return true;
        } catch (e) {
            console.error("❌ BATCH FAILED (Quest):", e);
            throw e;
        }
    },

    /**
     * Atomically toggles a Habit completion status.
     */
    toggleHabitCompletion: async (
        userId: string, 
        habitId: string, 
        isCompleted: boolean, 
        rewardXp: number, 
        rewardGold: number, 
        rewardTraitXp: number, 
        habitUpdates: any,
        isNewDay: boolean,
        newLevel: number,
        newNextXp: number,
        attributeId?: string
    ) => {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        const habitRef = doc(db, 'users', userId, 'habits', habitId);

        try {
            const userUpdates: any = {
                'stats.xp': increment(rewardXp),
                'stats.gold': increment(rewardGold),
                'stats.level': newLevel,
                'stats.nextXp': newNextXp
            };

            if (isNewDay) {
                userUpdates['dailyLimits'] = { 
                    date: toLocalISOString(new Date()), 
                    taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: isCompleted ? 1 : 0, 
                    focusSeconds: 0, tasksCompleted: 0, notesCompleted: 0,
                    focusXp: 0, focusGold: 0, focusTraitPoints: 0,
                    habitXp: Math.max(0, rewardXp), 
                    habitGold: Math.max(0, rewardGold), 
                    habitTraitPoints: Math.max(0, rewardTraitXp)
                };
            } else {
                userUpdates['dailyLimits.habitsCompleted'] = increment(isCompleted ? 1 : -1);
                userUpdates['dailyLimits.habitXp'] = increment(rewardXp);
                userUpdates['dailyLimits.habitGold'] = increment(rewardGold);
                userUpdates['dailyLimits.habitTraitPoints'] = increment(rewardTraitXp);
            }

            batch.update(userRef, userUpdates);
            batch.update(habitRef, habitUpdates);

            if (attributeId) {
                const attrRef = doc(db, 'users', userId, 'attributes', attributeId);
                batch.update(attrRef, { xp: increment(rewardTraitXp) });
            }

            await batch.commit();
            return true;
        } catch (e) {
            console.error("❌ BATCH FAILED (Habit):", e);
            throw e;
        }
    },

    /**
     * Atomically adds XP and Gold to the user (Optimized with Batch).
     */
    awardExperience: async (userId: string, xpAmount: number, goldAmount: number, calculatedLevel?: number) => {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);

        try {
            const updates: any = {
                'stats.xp': increment(xpAmount),
                'stats.gold': increment(goldAmount),
                'lastActiveAt': serverTimestamp()
            };

            if (calculatedLevel) {
                updates['stats.level'] = calculatedLevel;
                updates['stats.nextXp'] = calculatedLevel * 1000; // Mock or replace with actual logic
            }

            batch.update(userRef, updates);
            await batch.commit();
            console.log(`✅ ATOMIC BATCH: Awarded ${xpAmount} XP, ${goldAmount} Gold`);
            return true;
        } catch (e) {
            console.error("❌ BATCH FAILED (Experience):", e);
            throw e;
        }
    },

    /**
     * Atomically updates a specific stat (like HP) with bounds checking.
     * We KEEP runTransaction here because we strictly cannot allow HP below 0 or above max.
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
            return true;
        } catch (e) {
            console.error(`❌ TRANSACTION FAILED (updateStat ${stat}):`, e);
            throw e;
        }
    },

    /**
     * Atomically logs a focus session and updates limits and stats.
     */
    logFocusSession: async (
        userId: string, 
        durationSeconds: number, 
        rewardXp: number, 
        rewardGold: number, 
        rewardTraitXp: number, 
        attrId: string | null,
        isNewDay: boolean,
        newLevel: number,
        newNextXp: number
    ) => {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);

        try {
            const userUpdates: any = {
                'stats.xp': increment(rewardXp),
                'stats.gold': increment(rewardGold),
                'stats.level': newLevel,
                'stats.nextXp': newNextXp
            };

            if (isNewDay) {
                userUpdates['dailyLimits'] = { 
                    date: toLocalISOString(new Date()), 
                    taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: 0, tasksCompleted: 0, notesCompleted: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0,
                    focusSeconds: durationSeconds,
                    focusXp: rewardXp, 
                    focusGold: rewardGold, 
                    focusTraitPoints: rewardTraitXp
                };
            } else {
                userUpdates['dailyLimits.focusSeconds'] = increment(durationSeconds);
                userUpdates['dailyLimits.focusXp'] = increment(rewardXp);
                userUpdates['dailyLimits.focusGold'] = increment(rewardGold);
                userUpdates['dailyLimits.focusTraitPoints'] = increment(rewardTraitXp);
            }

            batch.update(userRef, userUpdates);

            if (attrId) {
                const attrRef = doc(db, 'users', userId, 'attributes', attrId);
                batch.update(attrRef, { xp: increment(rewardTraitXp) });
            }

            await batch.commit();
            return true;
        } catch (e) {
            console.error("❌ BATCH FAILED (Focus Session):", e);
            throw e;
        }
    },

    /**
     * Atomically logs a note completion and updates limits and stats.
     */
    logNoteCompletion: async (userId: string, isDeleted: boolean = false, isNewDay: boolean = false) => {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);

        try {
            const userUpdates: any = {};
            if (isNewDay) {
                userUpdates['dailyLimits'] = { 
                    date: toLocalISOString(new Date()), 
                    taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: 0, focusSeconds: 0, tasksCompleted: 0,
                    focusXp: 0, focusGold: 0, focusTraitPoints: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0,
                    notesCompleted: isDeleted ? 0 : 1
                };
            } else {
                userUpdates['dailyLimits.notesCompleted'] = increment(isDeleted ? -1 : 1);
            }

            batch.update(userRef, userUpdates);
            await batch.commit();
            return true;
        } catch (e) {
            console.error("❌ BATCH FAILED (Note Completion):", e);
            throw e;
        }
    },

    /**
     * Atomically awards or deducts experience from an attribute.
     */
    updateAttributeXpAtomic: async (userId: string, attrId: string, amount: number) => {
        const batch = writeBatch(db);
        const attrRef = doc(db, 'users', userId, 'attributes', attrId);
        
        try {
            batch.update(attrRef, { xp: increment(Math.floor(amount)) });
            await batch.commit();
            return true;
        } catch (e) {
            console.error(`❌ BATCH FAILED (Attribute XP):`, e);
            throw e;
        }
    },

    /**
     * Atomically halves user level and all attributes when HP reaches 0
     */
    halveStats: async (userId: string, currentAttributes: any[], currentLevel: number, currentXp: number) => {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);

        try {
            const newLevel = Math.max(1, Math.floor(currentLevel / 2));
            const newXp = newLevel > 1 ? 20 * Math.pow(newLevel, 2) : 0; // Rough XP calc based on GAMIFICATION_CONFIG.LEVEL_CONSTANT = 20

            batch.update(userRef, {
                'stats.level': newLevel,
                'stats.xp': newXp,
                'stats.nextXp': 20 * Math.pow(newLevel + 1, 2),
                'stats.hp': 100 // Reset HP
            });

            // Halve all attributes
            currentAttributes.forEach(attr => {
                const attrRef = doc(db, 'users', userId, 'attributes', attr.id);
                const newAttrLevel = Math.max(1, Math.floor(attr.level / 2));
                const newAttrXp = newAttrLevel > 1 ? 20 * Math.pow(newAttrLevel, 2) : 0;
                const newMaxXp = 20 * Math.pow(newAttrLevel + 1, 2);
                
                batch.update(attrRef, {
                    level: newAttrLevel,
                    xp: newAttrXp,
                    maxXp: newMaxXp
                });
            });

            await batch.commit();
            return { newLevel, newXp };
        } catch (e) {
            console.error("❌ BATCH FAILED (Halve Stats):", e);
            throw e;
        }
    },
};
