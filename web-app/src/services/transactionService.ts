import { supabase } from './supabase';
import { UserStats } from '../types/User';
import { toLocalISOString } from '../utils/dateUtils';
import { persistenceService } from './persistenceService';
import { TRAITS_LIST } from '../modules/dashboard/constants';
import { calculateSubTraitMaxXp, calculateAttributeMaxXp } from '../utils/leveling';

const TRAIT_ICON_NAMES: Record<string, string> = {
    DISCIPLINA: 'Target',
    FISICO: 'Dumbbell',
    MENTAL: 'Brain',
    SOCIAL: 'Users',
    ESPIRITU: 'Ghost',
    FINANZAS: 'Wallet',
    CREATIVIDAD: 'Palette',
    ORDEN: 'Anchor',
    LIDERAZGO: 'Crown',
    RESILIENCIA: 'Shield',
    VITALIDAD: 'Zap',
    ESTILO: 'Feather'
};

/**
 * 🛡️ SUPABASE TRANSACTION SERVICE
 * Migrated from Firebase to native Supabase logic.
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
        attributeUpdates?: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[] },
        spawnedQuest?: any
    ) => {
        try {
            // 1. Fetch current user
            const { data: userDoc, error: userError } = await supabase
                .from('users')
                .select('stats')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userDoc) {
                console.warn(`User ${userId} not found in Supabase. Returning false.`);
                return false;
            }

            const stats = userDoc.stats || {};
            const dailyLimits = stats.dailyLimits || {};

            // 2. Prepare user updates
            stats.xp = Math.max(0, (stats.xp || 0) + rewardXp);
            stats.gold = Math.max(0, (stats.gold || 0) + rewardGold);
            stats.level = newLevel;
            stats.nextXp = newNextXp;

            let newDailyLimits: any = { ...dailyLimits };

            if (isNewDay) {
                newDailyLimits = { 
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
                newDailyLimits.taskXp = (newDailyLimits.taskXp || 0) + rewardXp;
                newDailyLimits.taskGold = (newDailyLimits.taskGold || 0) + rewardGold;
                newDailyLimits.taskTraitPoints = (newDailyLimits.taskTraitPoints || 0) + rewardTraitXp;
                newDailyLimits.tasksCompleted = (newDailyLimits.tasksCompleted || 0) + (isCompleted ? 1 : -1);
            }

            stats.dailyLimits = newDailyLimits;

            // 3. Update User
            const { error: updateError } = await supabase.from('users').update({
                stats
            }).eq('id', userId);
            
            if (updateError) {
                console.error("❌ SUPABASE TRANSACTION FAILED (Update User):", updateError);
                throw updateError;
            }

            // 4. Update Quest via direct update (avoids race condition from getAll)
            // Using update() which does a direct UPSERT by ID without needing to fetch first
            await persistenceService.quests.update(userId, questId, {
                completed: isCompleted,
                completedAt: isCompleted ? new Date().toISOString() : null,
                rewardedXp: isCompleted ? rewardXp : 0,
                rewardedGold: isCompleted ? rewardGold : 0
            });

            // 5. Spawn Quest if any
            if (spawnedQuest) {
                await persistenceService.quests.save(userId, spawnedQuest);
            }

            // 6. Update Attribute
            if (attributeUpdates) {
                const attrs = await persistenceService.attributes.getAll(userId);
                const attr = attrs?.find(a => a.id === attributeUpdates.id);
                if (attr) {
                    await persistenceService.attributes.save(userId, {
                        ...attr,
                        xp: attributeUpdates.xp,
                        level: attributeUpdates.level,
                        maxXp: attributeUpdates.maxXp,
                        subTraits: attributeUpdates.subTraits || attr.subTraits
                    });
                } else {
                    const traitDef = TRAITS_LIST.find(t => t.id === attributeUpdates.id);
                    await persistenceService.attributes.save(userId, {
                        id: attributeUpdates.id,
                        label: traitDef ? traitDef.label : `traits.${attributeUpdates.id}`,
                        level: attributeUpdates.level,
                        xp: attributeUpdates.xp,
                        maxXp: attributeUpdates.maxXp,
                        color: traitDef ? traitDef.color : '#3b82f6',
                        iconName: traitDef ? (TRAIT_ICON_NAMES[traitDef.id] || 'Hexagon') : 'Hexagon',
                        subTraits: attributeUpdates.subTraits || []
                    });
                }
            }

            return true;
        } catch (e) {
            console.error("❌ SUPABASE TRANSACTION FAILED (Quest):", e);
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
        attributeUpdates?: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[] }
     ) => {
        try {
            // 1. Fetch current user
            const { data: userDoc, error: userError } = await supabase
                .from('users')
                .select('stats')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userDoc) {
                console.warn(`User ${userId} not found in Supabase. Returning false.`);
                return false;
            }

            const stats = userDoc.stats || {};
            const dailyLimits = stats.dailyLimits || {};

            // 2. Prepare user updates
            stats.xp = Math.max(0, (stats.xp || 0) + rewardXp);
            stats.gold = Math.max(0, (stats.gold || 0) + rewardGold);
            stats.level = newLevel;
            stats.nextXp = newNextXp;

            let newDailyLimits: any = { ...dailyLimits };

            if (isNewDay) {
                newDailyLimits = { 
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
                newDailyLimits.habitsCompleted = (newDailyLimits.habitsCompleted || 0) + (isCompleted ? 1 : -1);
                newDailyLimits.habitXp = (newDailyLimits.habitXp || 0) + rewardXp;
                newDailyLimits.habitGold = (newDailyLimits.habitGold || 0) + rewardGold;
                newDailyLimits.habitTraitPoints = (newDailyLimits.habitTraitPoints || 0) + rewardTraitXp;
            }

            stats.dailyLimits = newDailyLimits;

            // 3. Update User
            const { error: updateError } = await supabase.from('users').update({
                stats
            }).eq('id', userId);

            if (updateError) {
                console.error("❌ SUPABASE TRANSACTION FAILED (Update User):", updateError);
                throw updateError;
            }

            // 4. Update Habit
            const habits = await persistenceService.habits.getAll(userId);
            const habit = habits?.find(h => h.id === habitId);
            if (habit) {
                await persistenceService.habits.save(userId, {
                    ...habit,
                    ...habitUpdates
                });
            }

            // 5. Update Attribute
            if (attributeUpdates) {
                const attrs = await persistenceService.attributes.getAll(userId);
                const attr = attrs?.find(a => a.id === attributeUpdates.id);
                if (attr) {
                    await persistenceService.attributes.save(userId, {
                        ...attr,
                        xp: attributeUpdates.xp,
                        level: attributeUpdates.level,
                        maxXp: attributeUpdates.maxXp,
                        subTraits: attributeUpdates.subTraits || attr.subTraits
                    });
                } else {
                    const traitDef = TRAITS_LIST.find(t => t.id === attributeUpdates.id);
                    await persistenceService.attributes.save(userId, {
                        id: attributeUpdates.id,
                        label: traitDef ? traitDef.label : `traits.${attributeUpdates.id}`,
                        level: attributeUpdates.level,
                        xp: attributeUpdates.xp,
                        maxXp: attributeUpdates.maxXp,
                        color: traitDef ? traitDef.color : '#3b82f6',
                        iconName: traitDef ? (TRAIT_ICON_NAMES[traitDef.id] || 'Hexagon') : 'Hexagon',
                        subTraits: attributeUpdates.subTraits || []
                    });
                }
            }

            return true;
        } catch (e) {
            console.error("❌ SUPABASE TRANSACTION FAILED (Habit):", e);
            throw e;
        }
    },

    /**
     * Atomically adds XP and Gold to the user.
     */
    awardExperience: async (userId: string, xpAmount: number, goldAmount: number, calculatedLevel?: number) => {
        try {
            const { data: userDoc, error: userError } = await supabase
                .from('users')
                .select('stats')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userDoc) {
                console.warn(`User ${userId} not found in Supabase. Returning false.`);
                return false;
            }

            const stats = userDoc.stats || {};
            stats.xp = Math.max(0, (stats.xp || 0) + xpAmount);
            stats.gold = Math.max(0, (stats.gold || 0) + goldAmount);

            if (calculatedLevel) {
                stats.level = calculatedLevel;
                stats.nextXp = calculatedLevel * 1000; // Mock or replace with actual logic
            }

            const { error: updateError } = await supabase.from('users').update({
                stats,
                last_login_at: new Date().toISOString()
            }).eq('id', userId);

            if (updateError) {
                console.error("❌ SUPABASE TRANSACTION FAILED (Update User):", updateError);
                throw updateError;
            }

            console.log(`✅ SUPABASE TRANSACTION: Awarded ${xpAmount} XP, ${goldAmount} Gold`);
            return true;
        } catch (e) {
            console.error("❌ SUPABASE TRANSACTION FAILED (Experience):", e);
            throw e;
        }
    },

    /**
     * Atomically updates a specific stat (like HP) with bounds checking.
     */
    updateStat: async (userId: string, stat: keyof UserStats, value: number, isDelta: boolean = false) => {
        try {
            const { data: userDoc, error: userError } = await supabase
                .from('users')
                .select('stats')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userDoc) {
                console.warn(`User ${userId} not found in Supabase. Returning false.`);
                return false;
            }

            const stats = userDoc.stats || {};
            const currentVal = (stats as any)[stat] || 0;
            let newVal = isDelta ? currentVal + value : value;

            // Bounds Checks
            if (stat === 'hp') {
                newVal = Math.min(Math.max(0, newVal), stats.maxHp || 100);
            }

            stats[stat] = newVal;

            const { error: updateError } = await supabase.from('users').update({ stats }).eq('id', userId);
            if (updateError) {
                console.error(`❌ SUPABASE TRANSACTION FAILED (updateStat ${stat}):`, updateError);
                throw updateError;
            }
            return true;
        } catch (e) {
            console.error(`❌ SUPABASE TRANSACTION FAILED (updateStat ${stat}):`, e);
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
        attributeUpdates: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[] } | null,
        isNewDay: boolean,
        newLevel: number,
        newNextXp: number
    ) => {
        try {
            const { data: userDoc, error: userError } = await supabase
                .from('users')
                .select('stats')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userDoc) {
                console.warn(`User ${userId} not found in Supabase. Returning false.`);
                return false;
            }

            const stats = userDoc.stats || {};
            const dailyLimits = stats.dailyLimits || {};

            stats.xp = Math.max(0, (stats.xp || 0) + rewardXp);
            stats.gold = Math.max(0, (stats.gold || 0) + rewardGold);
            stats.level = newLevel;
            stats.nextXp = newNextXp;

            let newDailyLimits: any = { ...dailyLimits };

            if (isNewDay) {
                newDailyLimits = { 
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
                newDailyLimits.focusSeconds = (newDailyLimits.focusSeconds || 0) + durationSeconds;
                newDailyLimits.focusXp = (newDailyLimits.focusXp || 0) + rewardXp;
                newDailyLimits.focusGold = (newDailyLimits.focusGold || 0) + rewardGold;
                newDailyLimits.focusTraitPoints = (newDailyLimits.focusTraitPoints || 0) + rewardTraitXp;
            }

            stats.dailyLimits = newDailyLimits;

            const { error: updateError } = await supabase.from('users').update({
                stats
            }).eq('id', userId);
            
            if (updateError) {
                console.error("❌ SUPABASE TRANSACTION FAILED (logFocusSession):", updateError);
                throw updateError;
            }

            if (attributeUpdates) {
                const attrs = await persistenceService.attributes.getAll(userId);
                const attr = attrs?.find(a => a.id === attributeUpdates.id);
                if (attr) {
                    await persistenceService.attributes.save(userId, {
                        ...attr,
                        xp: attributeUpdates.xp,
                        level: attributeUpdates.level,
                        maxXp: attributeUpdates.maxXp,
                        subTraits: attributeUpdates.subTraits || attr.subTraits
                    });
                } else {
                    const traitDef = TRAITS_LIST.find(t => t.id === attributeUpdates.id);
                    await persistenceService.attributes.save(userId, {
                        id: attributeUpdates.id,
                        label: traitDef ? traitDef.label : `traits.${attributeUpdates.id}`,
                        level: attributeUpdates.level,
                        xp: attributeUpdates.xp,
                        maxXp: attributeUpdates.maxXp,
                        color: traitDef ? traitDef.color : '#3b82f6',
                        iconName: traitDef ? (TRAIT_ICON_NAMES[traitDef.id] || 'Hexagon') : 'Hexagon',
                        subTraits: attributeUpdates.subTraits || []
                    });
                }
            }

            return true;
        } catch (e) {
            console.error("❌ SUPABASE TRANSACTION FAILED (Focus Session):", e);
            throw e;
        }
    },

    /**
     * Atomically logs a note completion and updates limits and stats.
     */
    logNoteCompletion: async (userId: string, isDeleted: boolean = false, isNewDay: boolean = false) => {
        try {
            const { data: userDoc, error: userError } = await supabase
                .from('users')
                .select('stats')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userDoc) {
                console.warn(`User ${userId} not found in Supabase. Returning false.`);
                return false;
            }

            const stats = userDoc.stats || {};
            const dailyLimits = stats.dailyLimits || {};

            let newDailyLimits: any = { ...dailyLimits };

            if (isNewDay) {
                newDailyLimits = { 
                    date: toLocalISOString(new Date()), 
                    taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: 0, focusSeconds: 0, tasksCompleted: 0,
                    focusXp: 0, focusGold: 0, focusTraitPoints: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0,
                    notesCompleted: isDeleted ? 0 : 1
                };
            } else {
                newDailyLimits.notesCompleted = (newDailyLimits.notesCompleted || 0) + (isDeleted ? -1 : 1);
            }

            stats.dailyLimits = newDailyLimits;

            await supabase.from('users').update({ stats }).eq('id', userId);
            return true;
        } catch (e) {
            console.error("❌ SUPABASE TRANSACTION FAILED (Note Completion):", e);
            throw e;
        }
    },

    /**
     * Atomically awards or deducts experience from an attribute.
     */
    updateAttributeXpAtomic: async (userId: string, attributeUpdates: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[], history?: any[] }) => {
        try {
            const attrs = await persistenceService.attributes.getAll(userId);
            const attr = attrs?.find(a => a.id === attributeUpdates.id);
            if (attr) {
                await persistenceService.attributes.save(userId, {
                    ...attr,
                    xp: attributeUpdates.xp,
                    level: attributeUpdates.level,
                    maxXp: attributeUpdates.maxXp,
                    subTraits: attributeUpdates.subTraits || attr.subTraits,
                    history: attributeUpdates.history || attr.history
                });
            } else {
                const traitDef = TRAITS_LIST.find(t => t.id === attributeUpdates.id);
                await persistenceService.attributes.save(userId, {
                    id: attributeUpdates.id,
                    label: traitDef ? traitDef.label : `traits.${attributeUpdates.id}`,
                    level: attributeUpdates.level,
                    xp: attributeUpdates.xp,
                    maxXp: attributeUpdates.maxXp,
                    color: traitDef ? traitDef.color : '#3b82f6',
                    iconName: traitDef ? (TRAIT_ICON_NAMES[traitDef.id] || 'Hexagon') : 'Hexagon',
                    subTraits: attributeUpdates.subTraits || [],
                    history: attributeUpdates.history || []
                });
            }
            return true;
        } catch (e) {
            console.error(`❌ SUPABASE TRANSACTION FAILED (Attribute XP):`, e);
            throw e;
        }
    },

    halveStats: async (userId: string, currentAttributes: any[], currentLevel: number) => {
        try {
            const newLevel = Math.max(1, Math.floor(currentLevel / 2));
            const newXp = newLevel > 1 ? 20 * Math.pow(newLevel, 2) : 0; 

            const { data: userDoc, error: userError } = await supabase
                .from('users')
                .select('stats')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userDoc) {
                console.warn(`User ${userId} not found in Supabase. Returning false.`);
                return false;
            }

            const stats = userDoc.stats || {};
            stats.level = newLevel;
            stats.xp = newXp;
            stats.nextXp = 20 * Math.pow(newLevel + 1, 2);
            stats.hp = 100; // Reset HP

            await supabase.from('users').update({ stats }).eq('id', userId);

            // Halve all attributes
            for (const attr of currentAttributes) {
                const newAttrLevel = Math.max(1, Math.floor(attr.level / 2));
                const newAttrXp = newAttrLevel > 1 ? 20 * Math.pow(newAttrLevel, 2) : 0;
                const newMaxXp = calculateAttributeMaxXp(newAttrLevel);
                
                const updatedSubTraits = attr.subTraits?.map((st: any) => {
                    const halvedLevel = Math.max(1, Math.floor(st.level / 2));
                    const halvedMaxXp = calculateSubTraitMaxXp(halvedLevel);
                    return {
                        ...st,
                        level: halvedLevel,
                        xp: Math.max(0, Math.floor(st.xp / 2)),
                        maxXp: halvedMaxXp
                    };
                });
                
                await persistenceService.attributes.save(userId, {
                    ...attr,
                    level: newAttrLevel,
                    xp: newAttrXp,
                    maxXp: newMaxXp,
                    subTraits: updatedSubTraits
                });
            }

            return { newLevel, newXp };
        } catch (e) {
            console.error("❌ SUPABASE TRANSACTION FAILED (Halve Stats):", e);
            throw e;
        }
    }
};
