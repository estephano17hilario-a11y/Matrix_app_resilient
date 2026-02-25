import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLux } from '@/context/LuxContext';
import { useAuth } from '@/context/AuthContext';
import { checkAchievements } from '@/services/achievementListener';
import { Achievement } from '@/config/achievements';
import { Trophy, Flame, Clock, Star, Infinity as InfinityIcon, Skull, Target, Trash2, AlertTriangle, Check } from 'lucide-react';
import { 
  Attribute, Quest, Habit, Project, BadHabit,
  NotificationItem, Particle, Session 
} from '@/types';
import { DailyLimits } from '@/types/User';
import { TRAITS_LIST, DAILY_LIMITS } from '../constants';
import { GAMIFICATION_CONFIG } from '@/config/gamification';
import { FREE_LIMITS } from '@/config/limits';
import { projectService } from '@/services/projectService';
import { persistenceService } from '@/services/persistenceService';
import { PersistenceService } from '@/services/persistence';
import { doc, setDoc, db, writeBatch, updateDoc, collection, getDocs } from '@/services/firebase';
import { calculateTaskRewards } from '@/utils/rewardCalculator';

import { toLocalISOString, getHistoryDateKey } from '../../../utils/dateUtils';
import { calculateNextLevelXp, calculateLevelFromXp, calculateXpForLevel } from '../../../utils/leveling';

import { useTheme } from '@/context/ThemeContext';
import { useReward } from '@/modules/rewards/context/RewardContext';

import { SmartProject } from '@/types/SmartGoal';

export const useDashboardLogic = () => {
    const { addReward } = useReward();
    const { user: luxUser, loading: luxLoading } = useLux();
    const { profile: authProfile } = useAuth();

    const triggerReward = useCallback((
        source: string, 
        xpGained: number, 
        goldGained: number, 
        newPlayerStats: { xp: number, level: number, gold: number }, 
        oldPlayerStats: { level: number },
        traitUpdate?: { id: string, name: string, xp: number, maxXp: number, level: number, oldLevel: number }
    ) => {
        const currentLevelBaseXp = calculateXpForLevel(newPlayerStats.level);
        const nextLevelTotalXp = calculateNextLevelXp(newPlayerStats.level);
        
        addReward({
            source,
            xpGained,
            currentXp: Math.max(0, newPlayerStats.xp - currentLevelBaseXp),
            maxXp: nextLevelTotalXp - currentLevelBaseXp,
            level: newPlayerStats.level,
            isLevelUp: newPlayerStats.level > oldPlayerStats.level,
            goldGained,
            currentGold: newPlayerStats.gold,
            ...(traitUpdate ? {
                traitId: traitUpdate.id,
                traitName: traitUpdate.name,
                traitXpGained: xpGained,
                traitCurrentXp: traitUpdate.xp,
                traitMaxXp: traitUpdate.maxXp,
                traitLevel: traitUpdate.level,
                isTraitLevelUp: traitUpdate.level > traitUpdate.oldLevel
            } : {})
        });
    }, [addReward]);

    // 🛡️ HYBRID SYNC: Combine Realtime Stream (Lux) with Instant Updates (Auth)
    // This ensures Avatar changes are reflected immediately via refreshProfile()
    // while keeping stats synced via Firestore listeners.
    const user = useMemo(() => {
        if (!luxUser) return authProfile || null;
        if (!authProfile) return luxUser;
        
        // If UIDs match, merge carefully
        if (luxUser.uid === authProfile.uid) {
            return {
                ...luxUser,
                // Prefer Auth Profile for Identity fields (updated via Settings)
                avatarId: authProfile.avatarId || luxUser.avatarId,
                displayName: authProfile.displayName || luxUser.displayName,
                // Prefer Lux for Game Stats (updated via Game Loop)
                stats: luxUser.stats
            };
        }
        return luxUser;
    }, [luxUser, authProfile]);

    const { theme: currentTheme, setTheme: setCurrentTheme, vividMode, setVividMode } = useTheme(); // Use ThemeContext instead of local state
    const [lastAchievement, setLastAchievement] = useState<Achievement | null>(null);

    const [currentView, setCurrentView] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('lux_last_view') || localStorage.getItem('matrix_last_view') || 'TASKS';
        }
        return 'TASKS';
    });

    // Persist View
    useEffect(() => {
        if (currentView) {
            localStorage.setItem('lux_last_view', currentView);
        }
    }, [currentView]);

    const [isDockOpen, setIsDockOpen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false); 
    const [isNoteTaking, setIsNoteTaking] = useState(false); 
    const [overrideBgColor, setOverrideBgColor] = useState<string | undefined>(undefined);
    const [showProfile, setShowProfile] = useState(true);
    const [defaultChartMode, setDefaultChartMode] = useState<'RADAR' | 'BAR'>('RADAR');
    const [dashboardStyle, setDashboardStyle] = useState<'BORDER' | 'LIQUID' | 'GLASS'>('BORDER');
    const [avatarShape, setAvatarShape] = useState<'CIRCLE' | 'SQUARE'>('CIRCLE');
    const [habitSectionControl, setHabitSectionControl] = useState<'VISIBLE' | 'HIDDEN'>('VISIBLE');
    const [allowDockSectionSwitch, setAllowDockSectionSwitch] = useState<boolean>(true);
    // Sticky HUD disabled by default and removed from settings

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (overrideBgColor) {
            root.style.setProperty('--color-override-glow', overrideBgColor);
        } else {
            root.style.removeProperty('--color-override-glow');
        }
    }, [overrideBgColor]);

    const updateDashboardStyle = useCallback(async (style: 'BORDER' | 'LIQUID' | 'GLASS') => {
        setDashboardStyle(style);
        if (user?.uid) {
            try {
                await setDoc(doc(db, 'users', user.uid), { dashboardStyle: style }, { merge: true });
            } catch (e) {
                console.error("Failed to save dashboard style", e);
            }
        }
    }, [user?.uid]);

    const updateAvatarShape = useCallback(async (shape: 'CIRCLE' | 'SQUARE') => {
        setAvatarShape(shape);
        if (user?.uid) {
            try {
                await setDoc(doc(db, 'users', user.uid), { avatarShape: shape }, { merge: true });
            } catch (e) {
                console.error("Failed to save avatar shape", e);
            }
        }
    }, [user?.uid]);

    const updateHabitSectionControl = useCallback(async (control: 'VISIBLE' | 'HIDDEN') => {
        setHabitSectionControl(control);
        if (user?.uid) {
            try {
                await setDoc(doc(db, 'users', user.uid), { habitSectionControl: control }, { merge: true });
            } catch (e) {
                console.error("Failed to save habit section control", e);
            }
        }
    }, [user?.uid]);

    const updateAllowDockSectionSwitch = useCallback(async (allow: boolean) => {
        setAllowDockSectionSwitch(allow);
        if (user?.uid) {
            try {
                await setDoc(doc(db, 'users', user.uid), { allowDockSectionSwitch: allow }, { merge: true });
            } catch (e) {
                console.error("Failed to save allow dock section switch", e);
            }
        }
    }, [user?.uid]);

    // Sticky HUD updater removed

    // Sync Dashboard Style from User Profile
    useEffect(() => {
        if (user?.dashboardStyle) {
            setDashboardStyle(user.dashboardStyle);
        }
        if (user?.avatarShape) {
            setAvatarShape(user.avatarShape);
        }
        if (user?.habitSectionControl) {
            setHabitSectionControl(user.habitSectionControl);
        }
        if (user?.allowDockSectionSwitch !== undefined) {
            setAllowDockSectionSwitch(user.allowDockSectionSwitch);
        }
        // Sticky HUD sync removed
    }, [user?.dashboardStyle, user?.avatarShape, user?.habitSectionControl, user?.allowDockSectionSwitch]);

    const [player, setPlayer] = useState({ level: 1, xp: 0, nextXp: calculateNextLevelXp(1), gold: 0 });
    const prevPlayerLevel = useRef(player.level);
    const [health, setHealth] = useState(() => {
        // 🛡️ MEMORY CORE: Boot HP directly from Persistence
        const cached = PersistenceService.getProfile();
        return cached?.stats?.hp ?? 100;
    });
    const [dailyLimits, setDailyLimits] = useState<DailyLimits>({
        date: toLocalISOString(new Date()),
        taskXp: 0,
        taskGold: 0,
        taskTraitPoints: 0,
        habitsCompleted: 0,
        focusSeconds: 0,
        totalXp: 0,
        totalGold: 0,
        totalTraitPoints: 0
    });
    
    // Data States
    const [quests, setQuests] = useState<Quest[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [badHabits, setBadHabits] = useState<BadHabit[]>([]);
    const [areHabitsLoaded, setAreHabitsLoaded] = useState(false);
    const [isDailyCheckDone, setIsDailyCheckDone] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [smartProjects, setSmartProjects] = useState<SmartProject[]>([]);
    const deletedProjectIdsRef = useRef<Set<string>>(new Set());
    const mergeProjects = useCallback((base: Project[], incoming: Project[]) => {
        const deletedIds = deletedProjectIdsRef.current;
        const map = new Map<string, Project>();
        base
            .filter(p => !p.deleted && !deletedIds.has(p.id))
            .forEach(p => map.set(p.id, p));
        incoming
            .filter(p => !p.deleted && !deletedIds.has(p.id))
            .forEach(p => {
            const existing = map.get(p.id);
            if (!existing) {
                map.set(p.id, p);
                return;
            }
            const existingSessions = existing.sessions || [];
            const incomingSessions = p.sessions || [];
            const preferIncomingSessions = incomingSessions.length >= existingSessions.length;
            const mergedSessions = preferIncomingSessions ? incomingSessions : existingSessions;
            const mergedTotalTime = Math.max(
                Number.isFinite(p.totalTime) ? p.totalTime : 0,
                Number.isFinite(existing.totalTime) ? existing.totalTime : 0
            );
            map.set(p.id, {
                ...existing,
                ...p,
                sessions: mergedSessions,
                totalTime: mergedTotalTime
            });
        });
        return Array.from(map.values());
    }, []);
    const applyProjectsSafely = useCallback((next: Project[]) => {
        if (!next || !Array.isArray(next)) return;
        const deletedIds = deletedProjectIdsRef.current;
        
        // 🛡️ DEDUPLICATION & FILTERING
        const uniqueMap = new Map<string, Project>();
        next.forEach(p => {
            if (!p.deleted && !deletedIds.has(p.id)) {
                // If duplicate ID exists, keep the one with more totalTime or sessions
                const existing = uniqueMap.get(p.id);
                if (existing) {
                    const existingWeight = (existing.totalTime || 0) + (existing.sessions?.length || 0);
                    const newWeight = (p.totalTime || 0) + (p.sessions?.length || 0);
                    if (newWeight > existingWeight) {
                        uniqueMap.set(p.id, p);
                    }
                } else {
                    uniqueMap.set(p.id, p);
                }
            }
        });
        
        const filteredNext = Array.from(uniqueMap.values());

        setProjects(prev => {
            // Check if effectively different
            if (prev.length === filteredNext.length) {
                const prevIds = new Set(prev.map(p => p.id));
                const allMatch = filteredNext.every(p => prevIds.has(p.id));
                // Simple shallow check for performance, deeper check might be needed but this prevents loops
                if (allMatch) return prev;
            }
            return filteredNext;
        });
    }, []);
    const saveProjectsCache = useCallback((uid: string, items: Project[]) => {
        PersistenceService.saveCollection(uid, 'projects', items);
        if (items.length > 0) {
            PersistenceService.saveCollectionSafe(uid, 'projects', items);
        }
    }, []);

    // --- SYNC WITH MATRIX CORE (Optimized for Optimistic UI) ---
    // We track the last known server stats to distinguish between:
    // 1. Our own optimistic updates (Local changes, Server stale) -> IGNORE Server
    // 2. External updates (Server changes) -> SYNC Local
    const lastServerStats = useRef<{xp: number, level: number, gold: number, hp: number} | null>(null);

    // Helper for XP Curve
    const calculateNextXp = useCallback((level: number) => {
        return calculateNextLevelXp(level);
    }, []);

    useEffect(() => {
        if (user && user.stats) {
            // 🛡️ SKELETON PROTECTION: Do not sync stats from a skeleton profile
            // This prevents overwriting local state with defaults while real data loads
            if (user.isSkeleton) return;

            const serverStats = user.stats;
            const currentLast = lastServerStats.current;

            // Check if Server has NEW information compared to what we last saw from it
            const hasServerChanged = !currentLast || 
                serverStats.xp !== currentLast.xp ||
                serverStats.level !== currentLast.level ||
                serverStats.gold !== currentLast.gold ||
                serverStats.hp !== currentLast.hp;

            if (hasServerChanged) {
                // Server has updated. We should trust it, UNLESS we have very recent local changes?
                // Actually, if Server updates, it usually means a write confirmed.
                // If we have pending local changes, they might be overwritten.
                // But with Firestore latency, usually:
                // 1. Local Update -> 2. Firestore Write -> 3. Listener fires (Server Update).
                // The Server Update matches Local Update.
                // So syncing to Server Update is safe (it's the same value).
                
                // The DANGER is:
                // 1. Local Update (XP 100->150).
                // 2. Other unrelated Server Update (e.g. Theme change) arrives BEFORE XP write confirms.
                // Server says XP=100. Local says XP=150.
                // In this case, Server Stats (XP=100) is SAME as currentLast (XP=100).
                // So hasServerChanged is FALSE (for XP).
                // But wait, if Theme changed, `user` object changed.
                // But `serverStats` object might be new ref, but values same.
                // We check VALUES above.
                
                // So if XP didn't change on server, we don't sync XP.
                // But we might need to sync Gold if that changed?
                
                // We should sync fields individually or just check if ANY changed?
                // If ANY changed, we might overwrite others?
                // No. If XP didn't change on Server, but Local is ahead...
                // If we setPlayer({ xp: serverStats.xp ... }), we revert Local.
                
                // SOLUTION: Only update Local fields if the Server field differs from LAST KNOWN Server field.
                // i.e. "Server has moved forward".
                
                setPlayer(prev => {
                    const newPlayer = { ...prev };
                    let changed = false;

                    // Sync XP/Level if Server moved
                    if (!currentLast || serverStats.xp !== currentLast.xp || serverStats.level !== currentLast.level) {
                        newPlayer.xp = serverStats.xp;
                        newPlayer.level = serverStats.level;
                        newPlayer.nextXp = calculateNextXp(serverStats.level);
                        changed = true;
                    }

                    // Sync Gold if Server moved
                    if (!currentLast || serverStats.gold !== currentLast.gold) {
                        newPlayer.gold = serverStats.gold;
                        changed = true;
                    }

                    return changed ? newPlayer : prev;
                });

                // Sync HP if Server moved
                if (!currentLast || serverStats.hp !== currentLast.hp) {
                    setHealth(serverStats.hp);
                }

                // Sync Daily Limits
                if (user.dailyLimits) {
                    const today = toLocalISOString(new Date());
                    if (user.dailyLimits.date === today) {
                    // Sanitize to ensure all fields exist AND are numbers (prevent string concatenation bugs)
                    setDailyLimits({
                        ...user.dailyLimits,
                        focusSeconds: Number(user.dailyLimits.focusSeconds || 0),
                        habitsCompleted: Number(user.dailyLimits.habitsCompleted || 0),
                        taskXp: Number(user.dailyLimits.taskXp || 0),
                        taskGold: Number(user.dailyLimits.taskGold || 0),
                        taskTraitPoints: Number(user.dailyLimits.taskTraitPoints || 0)
                    });
                } else {
                        // Reset if server date is old (or just keep default today if we already reset)
                        // Actually, if server has old date, we should probably update server? 
                        // But we do that lazily on first action.
                        // Here we just ensure local state is correct for TODAY.
                         setDailyLimits(prev => prev.date === today ? prev : { 
                            date: today,
                            taskXp: 0,
                            taskGold: 0,
                            taskTraitPoints: 0,
                            habitsCompleted: 0,
                            focusSeconds: 0,
                            totalXp: 0,
                            totalGold: 0,
                            totalTraitPoints: 0,
                            tasksCompleted: 0,
                            notesCompleted: 0,
                            focusMinutes: 0,
                            focusXp: 0,
                            focusGold: 0,
                            focusTraitPoints: 0,
                            habitXp: 0,
                            habitGold: 0,
                            habitTraitPoints: 0
                        });
                    }
                }

                // Update last known server stats
                lastServerStats.current = {
                    xp: serverStats.xp,
                    level: serverStats.level,
                    gold: serverStats.gold,
                    hp: serverStats.hp
                };
            }
        }
    }, [user, calculateNextXp]);

    useEffect(() => {
        if (!user?.uid) return;

        const cached = PersistenceService.getProfile(user.uid);
        if (!cached || cached.uid !== user.uid) return;

        const updatedProfile = {
            ...cached,
            stats: {
                ...cached.stats,
                xp: player.xp,
                gold: player.gold,
                level: player.level,
                hp: health
            }
        };

        PersistenceService.saveProfile(updatedProfile);
    }, [player.xp, player.gold, player.level, player.nextXp, health, user?.uid, user?.isSkeleton]);




    // --- DAILY RESET TRIGGER ---
    // Watches for date changes (midnight cross or app open after sleep)
    useEffect(() => {
        const checkDate = () => {
            const today = toLocalISOString(new Date());
            if (dailyLimits.date && dailyLimits.date !== today) {
                console.log("[DATE CHECK] New day detected:", today);
                setIsDailyCheckDone(false);
            }
        };

        checkDate();
        const interval = setInterval(checkDate, 60000); // Check every minute
        
        // Calculate time to next midnight for precise trigger
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const msToMidnight = tomorrow.getTime() - now.getTime();
        
        console.log(`[DATE CHECK] Next reset scheduled in ${Math.round(msToMidnight / 1000 / 60)} minutes`);
        
        const midnightTimeout = setTimeout(() => {
            console.log("[DATE CHECK] Midnight trigger fired");
            checkDate();
        }, msToMidnight + 1000); // +1s buffer

        const handleVisibility = () => {
            if (!document.hidden) checkDate();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        
        return () => {
            clearInterval(interval);
            clearTimeout(midnightTimeout);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [dailyLimits.date]);

    // --- DAILY RESET & PENALTY LOGIC ---
    useEffect(() => {
        if (!user?.uid || isDailyCheckDone) return;
        if (user.isSkeleton) return; // 🛡️ SKELETON PROTECTION

        const processDailyReset = async () => {
            const today = toLocalISOString(new Date());
            const lastDate = dailyLimits.date || today;

            if (lastDate !== today) {
                console.log(`[DAILY RESET] Processing transition from ${lastDate} to ${today}`);
                
                // 1. Calculate Penalty based on CURRENT habits (previous day's state)
                const canProcessHabits = areHabitsLoaded;
                
                // 🛡️ TIME MACHINE FIX: Only count habits that existed YESTERDAY
                // If a habit was created TODAY (after yesterday), it shouldn't count towards yesterday's target
                let relevantHabits = habits;
                if (canProcessHabits) {
                    const yesterdayEndOfDay = new Date(lastDate);
                    yesterdayEndOfDay.setHours(23, 59, 59, 999);
                    
                    relevantHabits = habits.filter(h => {
                        let createdAt = h.createdAt ? new Date(h.createdAt) : null;
                        
                        // If no createdAt, infer from history (Legacy Fix)
                        if (!createdAt) {
                            if (h.history && h.history.length > 0) {
                                const dates = h.history.map(d => new Date(d).getTime());
                                createdAt = new Date(Math.min(...dates));
                            } else {
                                // Assume today if no history/created
                                createdAt = new Date();
                            }
                        }
                        
                        return createdAt <= yesterdayEndOfDay;
                    });
                }

                const totalHabits = canProcessHabits ? relevantHabits.length : 0;
                let damage = 0;
                
                if (totalHabits > 0) {
                     const target = Math.ceil(totalHabits * 0.75);
                     // Check completion from history for YESTERDAY, not completedToday (which might be reset or for today)
                     // Actually, 'completedToday' is the state BEFORE reset, so it refers to "the day that just ended" (lastDate)
                     // So we can use h.completedToday if lastDate was indeed yesterday relative to now.
                     // But to be safe, let's check history for lastDate
                     
                     const completed = relevantHabits.filter(h => {
                         // Check if completed on lastDate
                         const history = h.history || [];
                         return history.some(d => d.startsWith(lastDate));
                     }).length;
                     
                     if (completed < target) {
                         // Formula: (Target - Completed) * 3
                         const deficit = target - completed;
                         damage = deficit * 3;
                     }
                }

                // 2. Prepare Batch
                const batch = writeBatch(db);
                const userRef = doc(db, 'users', user.uid);

                // 1.5 CHECK STREAK CONTINUITY (Global Streak)
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = toLocalISOString(yesterday);
                
                const streakFrozenUntil = user.stats?.streakFrozenUntil ? new Date(user.stats.streakFrozenUntil) : null;
                const isFrozen = streakFrozenUntil && streakFrozenUntil > new Date(today);
                const lastStreakDate = user.stats?.lastStreakDate;
                
                // If last streak date is older than yesterday (and not frozen), reset streak.
                if (user.stats?.streak && user.stats.streak > 0 && !isFrozen) {
                    if (lastStreakDate && lastStreakDate < yesterdayStr) {
                         console.log(`[DAILY RESET] Streak Broken. Last active: ${lastStreakDate}, Yesterday: ${yesterdayStr}`);
                         // Reset streak to 0
                         batch.update(userRef as any, { 'stats.streak': 0 });
                    } else if (!lastStreakDate) {
                        console.log("[DAILY RESET] No lastStreakDate found. Preserving legacy streak.");
                    }
                }

                // 3. Apply Damage
                let newHealth = health;
                if (damage > 0) {
                    console.log(`[DAILY RESET] Applying ${damage} damage.`);
                    newHealth = Math.max(0, health - damage);
                    batch.update(userRef as any, { 
                        'stats.hp': newHealth 
                    });
                }

                // 4. Reset Habits
                let resetHabits = habits;
                if (canProcessHabits) {
                    resetHabits = habits.map(h => {
                        if (!h.completedToday) return h; 
                        return { ...h, completedToday: false };
                    });
                    
                    habits.forEach(h => {
                        if (h.completedToday) {
                             const habitRef = doc(db, 'users', user.uid, 'habits', h.id);
                             batch.update(habitRef as any, { completedToday: false });
                        }
                    });
                }

                // 5. Update Daily Limits Date
                const newLimits: DailyLimits = {
                    date: today,
                    taskXp: 0,
                    taskGold: 0,
                    taskTraitPoints: 0,
                    habitsCompleted: 0,
                    focusSeconds: 0,
                    totalXp: 0,
                    totalGold: 0,
                    totalTraitPoints: 0,
                    tasksCompleted: 0,
                    notesCompleted: 0,
                    focusMinutes: 0,
                    focusXp: 0,
                    focusGold: 0,
                    focusTraitPoints: 0,
                    habitXp: 0,
                    habitGold: 0,
                    habitTraitPoints: 0
                };
                batch.update(userRef as any, { dailyLimits: newLimits });

                // OPTIMISTIC UPDATE: Update UI immediately
                if (damage > 0) setHealth(newHealth);
                if (canProcessHabits) setHabits(resetHabits);
                setDailyLimits(newLimits);

                try {
                    await batch.commit();
                    console.log("[DAILY RESET] Batch committed successfully.");
                } catch (e) {
                    console.error("[DAILY RESET] Failed (Background Sync will handle it):", e);
                }
            }
            
            setIsDailyCheckDone(true);
        };

        processDailyReset();
    }, [user?.uid, areHabitsLoaded, isDailyCheckDone, dailyLimits.date]);

    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const prevAttributes = useRef(attributes);
    const [areAttributesLoaded, setAreAttributesLoaded] = useState(false);
    const projectsHydratedRef = useRef(false);
    const allowEmptyProjectsSaveRef = useRef(false);
    const lastNonEmptyProjectsRef = useRef<Project[]>([]);
    const questsHydratedRef = useRef(false);
    const badHabitsHydratedRef = useRef(false);
    const smartProjectsHydratedRef = useRef(false);
    const COLLECTION_SYNC_TTL = 5 * 60 * 1000;
    const hydrateAttributes = (fetchedAttrs: Attribute[]) => {
        if (fetchedAttrs.length > 0) {
            const enriched = fetchedAttrs.map(attr => {
                const def = TRAITS_LIST.find(t => t.id === attr.id);
                return { ...attr, icon: def?.icon, color: def?.color || attr.color, label: def?.label || attr.label };
            });
            setAttributes(enriched);
        }
        setAreAttributesLoaded(true);
    };

    // --- ACHIEVEMENT LISTENER ---
    useEffect(() => {
        const verifyAchievements = async () => {
            if (user && player.xp > 0 && !user.isSkeleton) {
                const hybridUser = { 
                    ...user, 
                    stats: { 
                        ...user.stats, 
                        xp: player.xp, 
                        level: player.level,
                        hp: health 
                    } 
                };
                
                const newAchievements = await checkAchievements(hybridUser, attributes);
                if (newAchievements.length > 0) {
                    setLastAchievement(newAchievements[0]);
                }
            }
        };
        
        verifyAchievements();
    }, [player.xp, player.level, user, health, attributes]);

    // --- LOAD PROJECTS, QUESTS, HABITS, NOTES, JOURNAL ---
    useEffect(() => {
        if (!user?.uid) return;
        const uid = user.uid;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        // TRACK LOADING STATE
        let projectsLoaded = false;
        let questsLoaded = false;
        let habitsLoaded = false;
        let badHabitsLoaded = false;
        let smartProjectsLoaded = false;
        let attributesLoaded = false;

        const hasProjectsCache = PersistenceService.hasCollectionCache(uid, 'projects');
        const primaryProjectsCache = PersistenceService.getCollection<Project>(uid, 'projects');
        const cachedProjects = (primaryProjectsCache && primaryProjectsCache.length > 0)
            ? primaryProjectsCache
            : PersistenceService.getCollectionSafe<Project>(uid, 'projects');
        const hasCachedProjects = (cachedProjects?.length ?? 0) > 0;
        if (cachedProjects !== null) {
            applyProjectsSafely(cachedProjects);
            projectsHydratedRef.current = true;
            projectsLoaded = hasCachedProjects;
        } else if (!hasProjectsCache) {
            projectsHydratedRef.current = true;
        }

        const hasQuestsCache = PersistenceService.hasCollectionCache(uid, 'quests');
        const cachedQuests = PersistenceService.getCollection<Quest>(uid, 'quests');
        if (cachedQuests !== null) {
            setQuests(cachedQuests);
            questsHydratedRef.current = true;
            questsLoaded = true;
        } else if (!hasQuestsCache) {
            questsHydratedRef.current = true;
        }

        const hasHabitsCache = PersistenceService.hasCollectionCache(uid, 'habits');
        const cachedHabits = PersistenceService.getCollection<Habit>(uid, 'habits');
        if (cachedHabits !== null) {
            setHabits(cachedHabits);
            setAreHabitsLoaded(true);
            habitsLoaded = true;
        } else if (!hasHabitsCache) {
            setAreHabitsLoaded(true);
        }

        const hasBadHabitsCache = PersistenceService.hasCollectionCache(uid, 'badHabits');
        const cachedBadHabits = PersistenceService.getCollection<BadHabit>(uid, 'badHabits');
        if (cachedBadHabits !== null) {
            setBadHabits(cachedBadHabits);
            badHabitsHydratedRef.current = true;
            badHabitsLoaded = true;
        } else if (!hasBadHabitsCache) {
            badHabitsHydratedRef.current = true;
        }

        const hasSmartProjectsCache = PersistenceService.hasCollectionCache(uid, 'smartProjects');
        const cachedSmartProjects = PersistenceService.getCollection<SmartProject>(uid, 'smartProjects');
        if (cachedSmartProjects !== null) {
            setSmartProjects(cachedSmartProjects);
            smartProjectsHydratedRef.current = true;
            smartProjectsLoaded = true;
        } else if (!hasSmartProjectsCache) {
            smartProjectsHydratedRef.current = true;
        }

        const hasAttributesCache = PersistenceService.hasCollectionCache(uid, 'attributes');
        const cachedAttributes = PersistenceService.getCollection<Attribute>(uid, 'attributes');
        if (cachedAttributes !== null) {
            hydrateAttributes(cachedAttributes);
            attributesLoaded = true;
        } else if (!hasAttributesCache) {
            setAreAttributesLoaded(true);
        }

        if (!isOnline) return;

        if (!projectsLoaded || PersistenceService.shouldSyncCollection(uid, 'projects', COLLECTION_SYNC_TTL)) {
            projectService.getUserProjects(uid).then(projects => {
                if (!projects) return;
                if (projects.length === 0 && hasCachedProjects) return;
                let merged: Project[] = [];
                let canSave = false;
                setProjects(prev => {
                    merged = mergeProjects(prev, projects);
                    if (merged.length < prev.length) {
                        canSave = false;
                        return prev;
                    }
                    canSave = true;
                    return merged;
                });
                if (canSave) {
                    saveProjectsCache(uid, merged);
                }
                projectsHydratedRef.current = true;
            });
        }

        if (!questsLoaded || PersistenceService.shouldSyncCollection(uid, 'quests', COLLECTION_SYNC_TTL)) {
            persistenceService.quests.getAll(uid).then(quests => {
                if (!quests) return;
                setQuests(quests);
                PersistenceService.saveCollection(uid, 'quests', quests);
                questsHydratedRef.current = true;
            });
        }

        if (!habitsLoaded || PersistenceService.shouldSyncCollection(uid, 'habits', COLLECTION_SYNC_TTL)) {
            persistenceService.habits.getAll(uid).then(h => {
                if (!h) return;
                
                // 🛡️ SANITIZATION: Fix Legacy Habits without createdAt
                const now = Date.now();
                let hasFixes = false;
                const sanitizedHabits = h.map(habit => {
                    if (!habit.createdAt) {
                        hasFixes = true;
                        // Infer creation date:
                        // 1. First history entry (if exists)
                        // 2. NOW (if no history) -> This fixes the "New Habit breaks Yesterday Stats" bug
                        let inferredTime = now;
                        if (habit.history && habit.history.length > 0) {
                             const dates = habit.history.map(d => new Date(d).getTime());
                             const minDate = Math.min(...dates);
                             if (!isNaN(minDate)) inferredTime = minDate;
                        }
                        
                        // Update in Firestore immediately to persist the fix
                        persistenceService.habits.update(uid, habit.id, { createdAt: inferredTime });
                        
                        return { ...habit, createdAt: inferredTime };
                    }
                    return habit;
                });

                if (hasFixes) {
                    // Force a cache refresh if we fixed anything
                    PersistenceService.saveCollection(uid, 'habits', sanitizedHabits);
                }

                setHabits(sanitizedHabits);
                setAreHabitsLoaded(true);
                PersistenceService.saveCollection(uid, 'habits', sanitizedHabits);
            });
        }

        if (!badHabitsLoaded || PersistenceService.shouldSyncCollection(uid, 'badHabits', COLLECTION_SYNC_TTL)) {
            persistenceService.badHabits.getAll(uid).then(items => {
                if (!items) return;
                setBadHabits(items);
                PersistenceService.saveCollection(uid, 'badHabits', items);
                badHabitsHydratedRef.current = true;
            });
        }

        if (!smartProjectsLoaded || PersistenceService.shouldSyncCollection(uid, 'smartProjects', COLLECTION_SYNC_TTL)) {
            persistenceService.smartProjects.getAll(uid).then(items => {
                if (!items) return;
                setSmartProjects(items);
                PersistenceService.saveCollection(uid, 'smartProjects', items);
                smartProjectsHydratedRef.current = true;
            });
        }

        if (!attributesLoaded || PersistenceService.shouldSyncCollection(uid, 'attributes', COLLECTION_SYNC_TTL)) {
            persistenceService.attributes.getAll(uid).then(fetchedAttrs => {
                if (!fetchedAttrs) return;
                hydrateAttributes(fetchedAttrs);
                const attrsForCache = fetchedAttrs.map(({ icon, ...rest }) => rest);
                PersistenceService.saveCollection(uid, 'attributes', attrsForCache);
            });
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid || !areHabitsLoaded) return;
        PersistenceService.saveCollection(user.uid, 'habits', habits);
    }, [habits, user?.uid, areHabitsLoaded]);

    useEffect(() => {
        if (!user?.uid) return;
        if (!questsHydratedRef.current) return;
        PersistenceService.saveCollection(user.uid, 'quests', quests);
    }, [quests, user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;
        if (!badHabitsHydratedRef.current) return;
        PersistenceService.saveCollection(user.uid, 'badHabits', badHabits);
    }, [badHabits, user?.uid]);

    useEffect(() => {
        if (!user?.uid) return;
        if (!smartProjectsHydratedRef.current) return;
        PersistenceService.saveCollection(user.uid, 'smartProjects', smartProjects);
    }, [smartProjects, user?.uid]);

    // DEDUPLICATION: Auto-clean duplicate projects on load/update
    useEffect(() => {
        if (projects.length > 0) {
            const uniqueMap = new Map<string, Project>();
            let hasDuplicates = false;
            
            projects.forEach(p => {
                if (uniqueMap.has(p.id)) {
                    hasDuplicates = true;
                    // Keep the one with more data/sessions
                    const existing = uniqueMap.get(p.id)!;
                    const existingWeight = (existing.totalTime || 0) + (existing.sessions?.length || 0);
                    const newWeight = (p.totalTime || 0) + (p.sessions?.length || 0);
                    
                    if (newWeight > existingWeight) {
                        uniqueMap.set(p.id, p);
                    }
                } else {
                    uniqueMap.set(p.id, p);
                }
            });

            if (hasDuplicates) {
                console.log("🧹 Auto-cleaning duplicate projects from state...");
                const cleanProjects = Array.from(uniqueMap.values());
                setProjects(cleanProjects);
                if (user?.uid) {
                    saveProjectsCache(user.uid, cleanProjects);
                }
            }
        }
    }, [projects.length, user?.uid, saveProjectsCache]); // Run when count changes or user changes

    useEffect(() => {
        if (projects.length > 0) {
            lastNonEmptyProjectsRef.current = projects;
        }
    }, [projects]);

    useEffect(() => {
        if (!user?.uid) return;
        if (!projectsHydratedRef.current) return;
        const shouldAllowEmpty = allowEmptyProjectsSaveRef.current;
        if (projects.length === 0 && !shouldAllowEmpty) {
            const cached = PersistenceService.getCollection<Project>(user.uid, 'projects');
            if ((cached?.length ?? 0) > 0 || lastNonEmptyProjectsRef.current.length > 0) {
                return;
            }
        }
        if (projects.length === 0 && shouldAllowEmpty) {
            allowEmptyProjectsSaveRef.current = false;
        }
        saveProjectsCache(user.uid, projects);
    }, [projects, user?.uid, saveProjectsCache]);

    useEffect(() => {
        if (!user?.uid || !areAttributesLoaded) return;
        const attrsForCache = attributes.map(({ icon, ...rest }) => rest);
        PersistenceService.saveCollection(user.uid, 'attributes', attrsForCache);
    }, [attributes, user?.uid, areAttributesLoaded]);

    const addAttribute = async (traitId: string) => {
        // LIMIT CHECK: Active Traits
        if (user?.plan !== 'PRO' && attributes.length >= FREE_LIMITS.ACTIVE_TRAITS) {
             setActiveModal('PRO');
             return;
        }

        // LIMIT CHECK: Rate Limit (Changes per week)
        if (user?.plan !== 'PRO') {
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const changes = user?.traitChanges || { count: 0, weekStart: now };
            
            // Reset if week passed (logic handling)
            let newCount = changes.count;
            let newStart = changes.weekStart;

            if (now - changes.weekStart > oneWeek) {
                newCount = 0;
                newStart = now;
            }

            if (newCount >= FREE_LIMITS.TRAIT_CHANGES_PER_WEEK) {
                setActiveModal('PRO');
                return;
            }

            // Update Counter
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), {
                    traitChanges: { count: newCount + 1, weekStart: newStart }
                }, { merge: true });
            }
        }

        const def = TRAITS_LIST.find(t => t.id === traitId);
        if (!def) return;

        // RESTORE FROM ARCHIVE IF EXISTS
        const archived = user?.archivedTraits?.[traitId];

        const newAttr: Attribute = {
            id: def.id,
            label: def.label,
            level: archived?.level || 1,
            xp: archived?.xp || 0,
            maxXp: archived?.maxXp || 100,
            color: def.color,
            icon: def.icon
        };

        // Optimistic update
        setAttributes(prev => [...prev, newAttr]);

        // Save to DB
        if (!user?.uid) return;
        await persistenceService.attributes.save(user.uid, newAttr);
    };

    const removeAttribute = async (traitId: string) => {
        // LIMIT CHECK: Rate Limit (Changes per week)
        if (user?.plan !== 'PRO') {
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const changes = user?.traitChanges || { count: 0, weekStart: now };
            
            let newCount = changes.count;
            let newStart = changes.weekStart;

            if (now - changes.weekStart > oneWeek) {
                newCount = 0;
                newStart = now;
            }

            if (newCount >= FREE_LIMITS.TRAIT_CHANGES_PER_WEEK) {
                setActiveModal('PRO');
                return;
            }

             // Update Counter
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), {
                    traitChanges: { count: newCount + 1, weekStart: newStart }
                }, { merge: true });
            }
        }

        if (!user?.uid) return;
        
        // Find trait to archive
        const attrToArchive = attributes.find(a => a.id === traitId);

        // Optimistic update
        setAttributes(prev => prev.filter(a => a.id !== traitId));

        try {
            const batch = writeBatch(db);
            
            // 1. Delete Attribute Doc
            const attrRef = doc(db, 'users', user.uid, 'attributes', traitId);
            batch.delete(attrRef);

            // 2. Archive Stats in User Doc
            if (attrToArchive) {
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    [`archivedTraits.${traitId}`]: {
                        level: attrToArchive.level,
                        xp: attrToArchive.xp,
                        maxXp: attrToArchive.maxXp
                    }
                });
            }

            await batch.commit();
        } catch (e) {
            console.error("[TRAIT] Failed to remove/archive trait", e);
        }
    };

    // --- AUTO-SAVE SETTINGS ---
    useEffect(() => {
        if (user?.uid) {
             persistenceService.settings.save(user.uid, { theme: currentTheme, showProfile, defaultChartMode });
        }
    }, [currentTheme, showProfile, defaultChartMode, user?.uid]);

    // --- DAILY RESET TRIGGER (Visibility + Midnight Timer) ---
    const [dailyResetTrigger, setDailyResetTrigger] = useState(0);
    
    // Visibility Check
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("👁️ APP VISIBLE: Triggering Daily Check");
                setDailyResetTrigger(prev => prev + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Midnight Check (Every Minute)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                console.log("🕛 MIDNIGHT: Triggering Daily Reset");
                setDailyResetTrigger(prev => prev + 1);
            }
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // --- DAILY RESET & STREAK LOGIC ---
    useEffect(() => {
        if (!habits.length || !user?.uid) return;

        const checkDailyReset = async () => {
            const today = new Date();
            const todayStr = toLocalISOString(today);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = toLocalISOString(yesterday);

            let hasChanges = false;
            
            // Check if streak is frozen
            const streakFrozenUntil = user.stats?.streakFrozenUntil ? new Date(user.stats.streakFrozenUntil) : null;
            const isFrozen = streakFrozenUntil && streakFrozenUntil > today;

            const updatedHabits = habits.map(habit => {
                const newItem = { ...habit };
                let changed = false;

                // 1. Reset completedToday if it's a new day
                // We check history to see if the last completion was actually today
                const lastCompletion = habit.history && habit.history.length > 0 
                    ? getHistoryDateKey(habit.history[habit.history.length - 1])
                    : null;

                const isCompletedTodayInHistory = lastCompletion === todayStr;

                if (habit.completedToday && !isCompletedTodayInHistory) {
                    newItem.completedToday = false;
                    
                    // Reset checklist if it exists
                    if (habit.type === 'CHECKLIST' && habit.checklist) {
                        newItem.checklist = habit.checklist.map(i => ({ ...i, completed: false }));
                    }
                    
                    changed = true;
                }

                // 2. Check for broken streak (STRICT MODE)
                // Rule: If not completed YESTERDAY (and not TODAY), the streak is lost.
                // Logic: lastCompletion < yesterdayStr means the last time it was done was BEFORE yesterday.
                // e.g. Today=3, Yesterday=2. Last=1. 1 < 2 -> TRUE -> Reset.
                // e.g. Today=3, Yesterday=2. Last=2. 2 < 2 -> FALSE -> Keep.
                // e.g. Today=3, Yesterday=2. Last=3. 3 < 2 -> FALSE -> Keep.
                
                const isStreakBroken = habit.streak > 0 && (!lastCompletion || lastCompletion < yesterdayStr);

                if (isStreakBroken) {
                    if (!isFrozen) {
                        newItem.streak = 0;
                        changed = true;
                        console.log(`❌ [Streak] LOST: ${habit.title}. Last: ${lastCompletion}, Yesterday: ${yesterdayStr}`);
                    } else {
                        console.log(`🧊 [Streak] FROZEN: ${habit.title}`);
                    }
                }

                if (changed) {
                    hasChanges = true;
                    // Persist individual updates
                    const updates: any = { 
                        completedToday: newItem.completedToday,
                        streak: newItem.streak
                    };
                    if (newItem.checklist) {
                        updates.checklist = newItem.checklist;
                    }
                    persistenceService.habits.update(user.uid, habit.id, updates);
                }
                return newItem;
            });

            if (hasChanges) {
                setHabits(updatedHabits);
            }
        };

        // Run check
        checkDailyReset();
        // We only want to run this when habits are first loaded or user changes (login)
        // Adding habits to dependency array might cause loops if we update habits inside.
        // So we need a ref or strict dependency management.
        // Actually, if we update habits, 'habits' changes, effect runs again.
        // But if 'hasChanges' is false, it won't loop.
        // To be safe, let's use a flag or rely on the stability.
    }, [habits.length, user?.uid, user?.stats?.streakFrozenUntil, dailyResetTrigger]); // Only run when count changes, user changes, or app becomes visible

        
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [validationHabit, setValidationHabit] = useState<Habit | null>(null);
    const [valTempValue, setValTempValue] = useState('');

    const handleFocusModeChange = useCallback((attrId: string | null) => {
        if (attrId) {
            const attr = attributes.find(a => a.id === attrId);
            setOverrideBgColor(attr?.color);
            setIsFocusMode(true);
        } else {
            setOverrideBgColor(undefined);
            setIsFocusMode(false);
        }
    }, [attributes]);

    const addNotification = useCallback((notif: Omit<NotificationItem, 'id'>) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { ...notif, id }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
    }, []);

    // --- NOTIFICATION EFFECTS (Safe from Render Cycle) ---
    const isFirstLoad = useRef(true);
    const isAttributesSync = useRef(true);
    const processingQuests = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Skip notification on first load or if level hasn't increased
        // We also wait for luxLoading to be false to ensure we have the real level from DB
        if (isFirstLoad.current || luxLoading) {
            if (!luxLoading && user?.stats) {
                // Ensure player state has synced with user state before enabling notifications
                if (player.level === user.stats.level) {
                    isFirstLoad.current = false;
                    prevPlayerLevel.current = player.level;
                }
            }
            return;
        }

        if (player.level > prevPlayerLevel.current) {
            addNotification({ type: 'GLOBAL', label: 'HERO', fromLevel: prevPlayerLevel.current, toLevel: player.level, icon: Trophy, color: '#fbbf24' });
        }
        prevPlayerLevel.current = player.level;
    }, [player.level, addNotification, luxLoading, user]);

    useEffect(() => {
        if (!areAttributesLoaded) return;

        if (isAttributesSync.current) {
            isAttributesSync.current = false;
            prevAttributes.current = attributes;
            return;
        }

        attributes.forEach(attr => {
            const prev = prevAttributes.current.find(p => p.id === attr.id);
            if (prev && attr.level > prev.level) {
                addNotification({ type: 'ATTRIBUTE', label: attr.label, fromLevel: prev.level, toLevel: attr.level, icon: attr.icon, color: attr.color });
            }
        });
        prevAttributes.current = attributes;
    }, [attributes, addNotification, areAttributesLoaded]);


    // --- STREAK ACTIVATION ---
    const isActivatingStreak = useRef(false);

    useEffect(() => {
        if (!user?.uid || !user.stats) return;

        const checkStreak = async () => {
            const today = toLocalISOString(new Date());
            const lastStreakDate = user.stats.lastStreakDate;
            
            // Already active today?
            if (lastStreakDate === today) return;
            if (isActivatingStreak.current) return;

            const { 
                tasksCompleted = 0, 
                habitsCompleted = 0, 
                focusSeconds = 0, 
                notesCompleted = 0 
            } = dailyLimits;

            if (tasksCompleted >= 2 && habitsCompleted >= 1 && focusSeconds >= 3600 && notesCompleted >= 1) {
                console.log("🔥 STREAK ACTIVATED!");
                isActivatingStreak.current = true;
                
                try {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        'stats.streak': (user.stats.streak || 0) + 1,
                        'stats.lastStreakDate': today
                    });
                    
                    addNotification({ 
                        type: 'GLOBAL', 
                        label: 'STREAK ACTIVE', 
                        icon: Flame, 
                        color: '#f97316' // Orange-500
                    });
                } catch (e) {
                    console.error("Failed to activate streak:", e);
                } finally {
                    isActivatingStreak.current = false;
                }
            }
        };

        checkStreak();
    }, [dailyLimits, user?.uid, user?.stats?.streak, user?.stats?.lastStreakDate, addNotification]);


    // --- UNIFIED REWARD SYSTEM ---
    const addPlayerReward = useCallback((reward: { xp: number; gold: number }) => {
        // Use current player state from scope (dependency) to allow side effects outside updater
        const newGold = player.gold + Math.floor(reward.gold);
        
        let newXp = player.xp + Math.floor(reward.xp);
        // Reversal logic
        if (newXp < 0) newXp = 0;
        
        // Calculate new level based on CUMULATIVE XP
        const newLevel = calculateLevelFromXp(newXp);
        const newNextXp = calculateNextLevelXp(newLevel);
        
        const newStats = { level: newLevel, xp: newXp, nextXp: newNextXp, gold: newGold };
        
        // Optimistic Update
        setPlayer(newStats);

        // PERSISTENCE: Save new stats to Firestore immediately
        // 🛡️ SKELETON PROTECTION: Don't save if we are in skeleton mode
        if (user?.uid && !user.isSkeleton) {
            console.log(`[REWARD] Saving stats: Level ${newStats.level}, XP ${newStats.xp}, Gold ${newStats.gold}`);
            setDoc(doc(db, 'users', user.uid), {
                'stats.level': newStats.level,
                'stats.xp': newStats.xp,
                'stats.gold': newStats.gold,
                'stats.nextXp': newStats.nextXp
            }, { merge: true }).catch(err => console.error("Error saving player stats:", err));
        }
    }, [calculateNextXp, user, player]); // Added player dependency

    const addPlayerXp = useCallback((amount: number) => addPlayerReward({ xp: amount, gold: 0 }), [addPlayerReward]);
    const addPlayerGold = useCallback((amount: number) => addPlayerReward({ xp: 0, gold: amount }), [addPlayerReward]);

    const updateAttributeXp = useCallback((attrId: string, amount: number) => {
        // Find attribute in current state
        const attrIndex = attributes.findIndex(a => a.id === attrId);
        if (attrIndex === -1) return;
        
        const attr = attributes[attrIndex];
        let newXp = attr.xp + Math.floor(amount);
        let newLevel = attr.level;
        let newMaxXp = attr.maxXp;

        if (amount > 0) {
            while (newXp >= newMaxXp) {
                newXp -= newMaxXp;
                newLevel += 1;
                newMaxXp = Math.floor(newMaxXp * 1.2);
            }
        } else {
            while (newXp < 0 && newLevel > 1) {
                newLevel -= 1;
                newMaxXp = Math.floor(newMaxXp / 1.2); 
                newXp += newMaxXp;
            }
            if (newLevel === 1 && newXp < 0) newXp = 0;
        }
        
        const updatedAttr = { ...attr, xp: newXp, level: newLevel, maxXp: newMaxXp };
        
        // Optimistic Update
        const newAttributes = [...attributes];
        newAttributes[attrIndex] = updatedAttr;
        setAttributes(newAttributes);
        
        // SAVE TO FIRESTORE
        if (user?.uid && !user.isSkeleton) {
            console.log(`[ATTRIBUTE] Saving ${attr.label}: Level ${updatedAttr.level}, XP ${updatedAttr.xp}`);
            persistenceService.attributes.save(user.uid, updatedAttr);
        }
    }, [user?.uid, user?.isSkeleton, attributes]);

    const updateAttributeMetadata = useCallback((attrId: string, updates: Partial<Attribute>) => {
        setAttributes(prev => {
            const newAttributes = prev.map(attr => {
                if (attr.id === attrId) {
                    const updatedAttr = { ...attr, ...updates };
                    // SAVE TO FIRESTORE
                    if (user?.uid) {
                        persistenceService.attributes.save(user.uid, updatedAttr);
                    }
                    return updatedAttr;
                }
                return attr;
            });
            return newAttributes;
        });
    }, [user?.uid]);

    const spawnParticles = useCallback((x: number, y: number, color: string, Icon: React.ElementType, type = 'icon', targetId?: string) => {
        let tx: number | undefined, ty: number | undefined;
        if (targetId) {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                tx = rect.left + rect.width / 2;
                ty = rect.top + rect.height / 2;
            }
        }

        const count = targetId ? 1 : (type === 'fire' ? 12 : 8); 
        const newParticles = Array.from({ length: count }).map((_, i) => ({ 
            id: Date.now() + i, 
            x, 
            y, 
            vx: (Math.random() - 0.5) * 150, 
            vy: -100 - Math.random() * 150, 
            rotation: Math.random() * 360, 
            icon: Icon, 
            color: type === 'fire' ? (i % 2 === 0 ? '#f97316' : '#ef4444') : color, 
            type,
            tx,
            ty
        }));
        setParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => { setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))); }, targetId ? 1000 : 2000); 
    }, []);

    const updatePlayerLevel = useCallback(async (newLevel: number) => {
        setPlayer(prev => {
            const newStats = { ...prev, level: newLevel, nextXp: calculateNextXp(newLevel) };
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), {
                    'stats.level': newLevel,
                    'stats.nextXp': newStats.nextXp
                }, { merge: true }).catch(console.error);
            }
            return newStats;
        });
    }, [user?.uid, calculateNextXp]);

    const updateAttributeLevel = useCallback(async (attrId: string, newLevel: number) => {
        setAttributes(prev => {
            const newAttributes = prev.map(attr => {
                if (attr.id === attrId) {
                    const updatedAttr = { ...attr, level: newLevel, maxXp: Math.floor(100 * Math.pow(1.2, newLevel - 1)) };
                    if (user?.uid) {
                        persistenceService.attributes.save(user.uid, updatedAttr);
                    }
                    return updatedAttr;
                }
                return attr;
            });
            return newAttributes;
        });
    }, [user?.uid]);

    const handleCompleteSession = useCallback((projectId: string | null, durationSeconds: number, type: 'POMO' | 'STOPWATCH' = 'POMO') => {
        console.log("🏁 [SESSION COMPLETE] Triggered", { projectId, durationSeconds, type });

        // LIMIT CHECK
        const today = toLocalISOString(new Date());
        let currentLimits = dailyLimits;
        
        // Safety check for dailyLimits
        if (!currentLimits || typeof currentLimits !== 'object') {
             console.warn("⚠️ DailyLimits invalid, resetting to default");
             currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
        }

        if (currentLimits.date !== today) {
             currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
        }

        const hourlyXp = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.XP;
        const hourlyGold = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.COINS;
        
        const safeDurationSeconds = Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0;
        if (safeDurationSeconds < 5) return;
        
        // Strategy: We ALWAYS reward sessions, regardless of daily limit, to encourage usage.
        // We will just cap the XP/Gold if it exceeds "reasonable" amounts per session (e.g. 24h) to prevent exploits.
        const rewardableMinutes = safeDurationSeconds / 60;
        
        // INTELLIGENT REWARD CALCULATION
        // Formula: (Base Hourly Rate / 60) * Duration in Minutes
        // Multipliers:
        // - NONE (User Request: "solo quiero que las recompensas que se muestra en el creador de proyects, sea cuando logres cumplir con el objetivo del dia")

        let xpReward = (rewardableMinutes * hourlyXp) / 60;
        let goldReward = (rewardableMinutes * hourlyGold) / 60;

        // Apply Immersion Bonus (Non-linear scaling)
        if (rewardableMinutes >= 50) {
            xpReward *= 1.25;
            goldReward *= 1.25;
        } else if (rewardableMinutes >= 25) {
            xpReward *= 1.1;
            goldReward *= 1.1;
        }

        // Apply Project Impact Multiplier
        let attrId = 'MENTAL';
        let multiplier = 1;
        
        let proj: Project | undefined;
        if (projectId) {
            proj = projects.find(p => p.id === projectId);
            if (proj) {
                attrId = proj.attribute;
                multiplier = 1; // User requested NO impact multiplier
            } else {
                console.warn(`⚠️ Project ${projectId} not found, using defaults`);
            }
        }

        // Apply Streak Bonus (Subtle boost)
        // User requested NO streak bonus
        // const streakBonus = Math.min(1.2, 1 + ((dailyLimits.tasksCompleted || 0) * 0.01));

        xpReward *= multiplier;
        goldReward *= multiplier;

        // Rounding
        let finalXp = Math.round(xpReward);
        let finalGold = Math.round(goldReward);

        // Minimum Reward for any valid session > 1 min
        if (rewardableMinutes >= 1 && finalXp < 1) finalXp = 1;
        if (rewardableMinutes >= 1 && finalGold < 1) finalGold = 1;

        if (!Number.isFinite(finalXp)) finalXp = 0;
        if (!Number.isFinite(finalGold)) finalGold = 0;

        console.log(`[REWARD CALC] Duration: ${safeDurationSeconds}s (${rewardableMinutes.toFixed(2)}m) | BaseXP: ${hourlyXp}/h | Multiplier: ${multiplier}x | FinalXP: ${finalXp} | FinalGold: ${finalGold}`);
        
        // --- DAILY GOAL COMPLETION BONUS ---
        let bonusXp = 0;
        let bonusGold = 0;

        if (proj && proj.goalFrequency === 'DAILY' && proj.goalTarget > 0) {
            // Calculate previous daily progress
            const now = new Date();
            const todayStr = now.toDateString();
            
            const sessionsToday = (proj.sessions || []).filter(s => {
                 const d = new Date(s.date);
                 return d.toDateString() === todayStr;
            });
            
            const previousDuration = sessionsToday.reduce((acc, s) => acc + s.duration, 0);
            const newDuration = previousDuration + safeDurationSeconds;
            const goalSeconds = proj.goalTarget * 60;
            
            // Trigger bonus only if we crossed the line just now
            if (previousDuration < goalSeconds && newDuration >= goalSeconds) {
                // BONUS CALCULATION
                // "mientras mas tiempo sea diariamente que tengo que hacer, mayor sera la recompensa al completarlo"
                
                // Base bonus for completing any daily goal
                const baseBonus = 100; 
                
                // Scaling: More hours = Exponentially bigger bonus
                // 1h -> 1.0x
                // 4h -> 1.6x
                // 8h -> 2.4x
                const goalHours = proj.goalTarget / 60;
                const timeScale = 1 + (goalHours * 0.2); 
                
                // Difficulty multiplier (Impact)
                // Impact ranges from 1 (C) to 1.5 (S) typically, or logic-defined
                const difficultyMult = proj.impact || 1; 
                
                bonusXp = Math.floor(baseBonus * timeScale * difficultyMult);
                bonusGold = Math.floor(bonusXp * 0.5);
                
                console.log(`[BONUS] Daily Goal Met! Target: ${goalHours}h. Bonus: ${bonusXp} XP`);

                // Add notification for bonus
                setTimeout(() => {
                    addNotification({ 
                        type: 'ACHIEVEMENT', 
                        label: 'DAILY GOAL MET', 
                        fromLevel: 'Bonus', 
                        toLevel: `+${bonusXp} XP`, 
                        icon: Target, 
                        color: '#f472b6' // Pink-400
                    });
                }, 2000); // Delay to appear after session summary
            }
        }

        const totalXp = finalXp + bonusXp;
        const totalGold = finalGold + bonusGold;
        
        // 1. Prepare the new session object
        // Use a unique ID based on timestamp and randomness
        const newSession: Session = { 
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5), 
            type, 
            duration: safeDurationSeconds, 
            date: new Date().toISOString(),
            xpEarned: totalXp,
            goldEarned: totalGold
        };
        
        // Log for debugging
        console.log("📝 Creating Session Object:", newSession);

        if (projectId) {
            // 2. Find and update the project immediately using FUNCTIONAL UPDATE to avoid stale state
            setProjects(prev => {
                const targetIndex = prev.findIndex(p => p.id === projectId);
                if (targetIndex === -1) {
                    console.error("❌ CRITICAL: Project not found for ID:", projectId);
                    return prev;
                }

                const targetProj = prev[targetIndex];
                const updatedProject = { 
                    ...targetProj, 
                    totalTime: (targetProj.totalTime || 0) + safeDurationSeconds,
                    sessions: [newSession, ...(targetProj.sessions || [])]
                };

                const nextProjects = [...prev];
                nextProjects[targetIndex] = updatedProject;

                // Save to Cache immediately
                if (user?.uid) {
                    saveProjectsCache(user.uid, nextProjects);
                }

                // 4. Save to Firestore (Side Effect inside setState is not ideal, but acceptable for optimistic UI here if we don't await)
                if (user?.uid) {
                    projectService.saveProject(user.uid, updatedProject)
                        .then(() => {
                            console.log("✅ Project saved to Firestore with new session");
                            // Notify success for manual entry or stopwatch
                            if (type === 'POMO' || type === 'STOPWATCH') {
                                // For manual entries (often via History Modal), provide feedback if no rewards were given
                                if (totalXp === 0 && safeDurationSeconds > 0) {
                                     addNotification({ type: 'SYSTEM', label: 'SESSION RECORDED', fromLevel: 'Manual', toLevel: 'Saved', icon: Check, color: '#10b981' });
                                }
                            }
                        })
                        .catch(e => {
                            console.error("❌ Failed to save project:", e);
                            addNotification({ type: 'SYSTEM', label: 'SAVE ERROR', fromLevel: 'Retry', toLevel: 'Failed', icon: AlertTriangle, color: '#ef4444' });
                        });
                }

                return nextProjects;
            });
        }
        
        // Update Limits (Functional Update)
        setDailyLimits(prevLimits => {
            // Use currentLimits logic for safety if prevLimits is null (though it shouldn't be if initialized correctly)
            const baseLimits = prevLimits || currentLimits;
            
            // Ensure date matches today, otherwise reset
            const today = toLocalISOString(new Date());
            let validLimits = baseLimits;
            if (validLimits.date !== today) {
                validLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
            }

            const currentSafeFocusSeconds = validLimits.focusSeconds || 0;
            const newLimits = {
                ...validLimits,
                focusSeconds: currentSafeFocusSeconds + safeDurationSeconds
            };

            // Side effect: Save to Firestore
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
            }
            
            return newLimits;
        });

        if (totalXp > 0 || totalGold > 0) {
            // 1. Calculate Player Stats
            setPlayer(prevPlayer => {
                let newPlayerXp = prevPlayer.xp + totalXp;
                let newPlayerGold = prevPlayer.gold + totalGold;
                
                if (newPlayerXp < 0) newPlayerXp = 0;

                const newPlayerLevel = calculateLevelFromXp(newPlayerXp);
                const newPlayerNextXp = calculateNextLevelXp(newPlayerLevel);
                
                const newPlayerStats = { ...prevPlayer, xp: newPlayerXp, gold: newPlayerGold, level: newPlayerLevel, nextXp: newPlayerNextXp };
                
                console.log("🆙 Updating Player Stats:", newPlayerStats);
                
                // Save Player to Firestore
                if (user?.uid) {
                     const userRef = doc(db, 'users', user.uid);
                     updateDoc(userRef, {
                        'stats.xp': newPlayerXp,
                        'stats.gold': newPlayerGold,
                        'stats.level': newPlayerLevel,
                        'stats.nextXp': newPlayerNextXp
                    }).catch(console.error);
                }

                // Trigger Reward Overlay using the NEW stats
                // Note: We need to pass traitUpdate as well, which requires attributes state.
                // Attributes are also updated via setState below. 
                // To avoid complex callback chains, we'll calculate traitUpdate outside based on current 'attributes' state
                // (Accepting a small risk if attributes changed in the last millisecond, but much safer than projects)
                
                return newPlayerStats;
            });

            // 2. Calculate Attribute Stats
            // Note: We use the current 'attributes' state. 
            let traitUpdate = undefined;
            const attrIndex = attributes.findIndex(a => a.id === attrId);
            
            if (attrIndex !== -1) {
                const attr = attributes[attrIndex];
                let newAttrXp = attr.xp + totalXp;
                let newAttrLevel = attr.level;
                let newAttrMaxXp = attr.maxXp;

                while (newAttrXp >= newAttrMaxXp) {
                    newAttrXp -= newAttrMaxXp;
                    newAttrLevel += 1;
                    newAttrMaxXp = Math.floor(newAttrMaxXp * 1.2);
                }

                // Update Attributes State
                const newAttributes = [...attributes];
                const updatedAttr = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                newAttributes[attrIndex] = updatedAttr;
                setAttributes(newAttributes);

                // Prepare Trait Update for Trigger
                traitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level };

                // Save Attribute to Firestore
                 if (user?.uid) {
                    const attrRef = doc(db, 'users', user.uid, 'attributes', attr.id);
                    setDoc(attrRef, { xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp }, { merge: true }).catch(console.error);
                }
            }
            
            // 5. Trigger Reward Overlay
            // We need to pass the *predicted* new player stats because setPlayer is async.
            // Re-calculating for the trigger call:
            let pXp = player.xp + totalXp;
            let pGold = player.gold + totalGold;
            const pLevel = calculateLevelFromXp(pXp);
            const pNextXp = calculateNextLevelXp(pLevel);
            const predictedPlayerStats = { xp: pXp, gold: pGold, level: pLevel, nextXp: pNextXp };

            console.log("🏆 TRIGGERING REWARD OVERLAY", { type, totalXp, totalGold });
            triggerReward('Focus Session', totalXp, totalGold, predictedPlayerStats, { level: player.level }, traitUpdate);

            // 6. Legacy Visuals (Particles & Notification)
            const attr = attributes.find(a => a.id === attrId);
            const AttrIcon = attr?.icon || Star;
            spawnParticles(window.innerWidth / 2, window.innerHeight / 2, attr?.color || '#fff', AttrIcon);
            addNotification({ type: 'SESSION', label: type === 'POMO' ? 'POMODORO COMPLETE' : 'SESSION COMPLETE', fromLevel: Math.floor(safeDurationSeconds / 60) + 'm', toLevel: '+' + finalXp + ' XP', icon: Clock, color: '#fbbf24' });
        } else if (safeDurationSeconds > 0) {
             console.log("ℹ️ Short session saved, no XP awarded");
             addNotification({ type: 'SYSTEM', label: 'SESSION SAVED', fromLevel: Math.floor(safeDurationSeconds) + 's', toLevel: 'Short Session', icon: Check, color: '#10b981' });
        }
    }, [projects, attributes, updateAttributeXp, addNotification, spawnParticles, addPlayerReward, user, dailyLimits, saveProjectsCache, player, triggerReward]);

    const handleAddManualSession = useCallback((projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH' = 'POMO', sessionId?: string, sessionDate?: string) => {
        // 1. Validation & Safety Checks
        const safeMinutes = Number.isFinite(durationMinutes) ? Math.max(0, durationMinutes) : 0;
        if (!projectId || safeMinutes <= 0) return;

        const targetProj = projects.find(p => p.id === projectId);
        if (!targetProj) {
            addNotification({ type: 'SYSTEM', label: 'ERROR', fromLevel: 'Project', toLevel: 'Not Found', icon: AlertTriangle, color: '#ef4444' });
            return;
        }

        // 2. REWARD CALCULATION (SIMPLIFIED & GUARANTEED)
        // User Request: "RECONSTRUIR TODA LA MECANICA... QUE FUNCIONE SI O SI"
        // Strategy: Grant rewards directly based on time, ignoring strict daily caps for manual entries to ensure feedback.
        
        const durationSeconds = Math.round(safeMinutes * 60);
        const multiplier = targetProj.impact || 1;
        
        // Base Rates: 1 min = 1 XP, 1 min = 0.5 Gold
        let rawXp = safeMinutes * 1.0;
        let rawGold = safeMinutes * 0.5;

        // Apply Multiplier
        rawXp *= multiplier;
        rawGold *= multiplier;

        // Guaranteed Minimums (If session > 1 min)
        if (safeMinutes >= 1) {
            rawXp = Math.max(rawXp, 5); // Minimum 5 XP
            rawGold = Math.max(rawGold, 1); // Minimum 1 Gold
        }

        const finalXp = Math.round(rawXp);
        const finalGold = Math.round(rawGold);

        console.log(`💎 [MANUAL ENTRY] Project: ${targetProj.title}, Duration: ${safeMinutes}m, XP: ${finalXp}, Gold: ${finalGold}`);

        // 3. CREATE SESSION OBJECT
        const nextSessionId = sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        const nextSessionDate = sessionDate || new Date().toISOString();
        
        const newSession: Session = {
            id: nextSessionId,
            type,
            duration: durationSeconds,
            date: nextSessionDate,
            xpEarned: finalXp,
            goldEarned: finalGold
        };

        // 4. UPDATE PROJECT STATE
        const updatedProject = {
            ...targetProj,
            totalTime: (Number.isFinite(targetProj.totalTime) ? targetProj.totalTime : 0) + durationSeconds,
            sessions: [newSession, ...(targetProj.sessions || [])]
        };

        setProjects(prev => {
            const next = prev.map(p => p.id === projectId ? updatedProject : p);
            if (user?.uid) {
                saveProjectsCache(user.uid, next);
            }
            return next;
        });

        // 5. UPDATE ATTRIBUTES (CRITICAL)
        let traitUpdate = undefined;
        let attrId = targetProj.attribute || 'MENTAL';
        let attrIndex = attributes.findIndex(a => a.id === attrId);
        
        // Safety Fallback: Use first attribute if mapped one is missing
        if (attrIndex === -1 && attributes.length > 0) {
            console.warn(`⚠️ Attribute ${attrId} not found, using fallback.`);
            attrIndex = 0;
            attrId = attributes[0].id;
        }

        if (attrIndex !== -1) {
            const attr = attributes[attrIndex];
            let newAttrXp = attr.xp + finalXp;
            let newAttrLevel = attr.level;
            let newAttrMaxXp = attr.maxXp;

            // Level Up Logic
            while (newAttrXp >= newAttrMaxXp) {
                newAttrXp -= newAttrMaxXp;
                newAttrLevel += 1;
                newAttrMaxXp = Math.floor(newAttrMaxXp * 1.2);
            }

            const updatedAttr = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
            
            // State Update
            setAttributes(prev => {
                const next = [...prev];
                next[attrIndex] = updatedAttr;
                return next;
            });

            traitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level };

            // Persistence
            if (user?.uid) {
                const attrRef = doc(db, 'users', user.uid, 'attributes', attr.id);
                setDoc(attrRef, { xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp }, { merge: true }).catch(console.error);
            }
        }

        // 6. UPDATE PLAYER STATS
        let newPlayerStats = { ...player };
        if (finalXp > 0 || finalGold > 0) {
            const newPlayerXp = player.xp + finalXp;
            const newPlayerGold = player.gold + finalGold;
            
            const newPlayerLevel = calculateLevelFromXp(newPlayerXp);
            const newPlayerNextXp = calculateNextLevelXp(newPlayerLevel);
            
            newPlayerStats = { xp: newPlayerXp, gold: newPlayerGold, level: newPlayerLevel, nextXp: newPlayerNextXp };

            setPlayer(prev => ({ ...prev, ...newPlayerStats }));

            if (user?.uid) {
                const userRef = doc(db, 'users', user.uid);
                updateDoc(userRef, {
                    'stats.xp': newPlayerXp,
                    'stats.gold': newPlayerGold,
                    'stats.level': newPlayerLevel,
                    'stats.nextXp': newPlayerNextXp
                }).catch(console.error);
            }
        }

        // 7. PERSIST PROJECT
        if (user?.uid) {
            projectService.saveProject(user.uid, updatedProject)
                .catch(e => {
                    console.error("❌ Failed to save project:", e);
                    addNotification({ type: 'SYSTEM', label: 'SAVE ERROR', fromLevel: 'Retry', toLevel: 'Failed', icon: AlertTriangle, color: '#ef4444' });
                });
        }

        // 8. UPDATE DAILY LIMITS (TRACKING ONLY)
        const today = toLocalISOString(new Date());
        let newLimits = { ...dailyLimits };
        if (newLimits.date !== today) {
            newLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
        }
        newLimits = { ...newLimits, focusSeconds: (newLimits.focusSeconds || 0) + durationSeconds };
        setDailyLimits(newLimits);
        
        if (user?.uid) {
            setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
        }

        // 9. FINAL FEEDBACK
        // User requested removal of manual entry notification as it is redundant
        /*
        addNotification({ 
            type: 'SESSION', 
            label: 'MANUAL ENTRY', 
            fromLevel: `+${Math.floor(safeMinutes)}m`, 
            toLevel: `+${finalXp} XP / +${finalGold} G`, 
            icon: Clock, 
            color: '#10b981' 
        });
        */
            
        triggerReward('Manual Entry', finalXp, finalGold, newPlayerStats, { level: player.level }, traitUpdate);

    }, [projects, dailyLimits, user, addNotification, saveProjectsCache, player, attributes, triggerReward]);

    const handleDeleteSession = useCallback(async (projectId: string, sessionId: string) => {
        // 1. Read from closure to determine rewards to revert
        const project = projects.find(p => p.id === projectId);
        if (!project || !project.sessions) return;

        const session = project.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const durationSeconds = Number.isFinite(session.duration) ? session.duration : 0;
        
        // Use stored rewards if available, otherwise calculate fallback
        let xpToRevert = session.xpEarned;
        let goldToRevert = session.goldEarned;

        if (xpToRevert === undefined || goldToRevert === undefined) {
             const safeDurationSeconds = Math.max(0, Math.floor(durationSeconds));
             const rewardableMinutes = safeDurationSeconds / 60;
             let calcXp = Math.round(rewardableMinutes * 10);
             let calcGold = Math.round(rewardableMinutes * 2);
             
             const multiplier = project.impact || 1;
             calcXp = Math.floor(calcXp * multiplier);
             calcGold = Math.floor(calcGold * multiplier);
             
             xpToRevert = xpToRevert ?? calcXp;
             goldToRevert = goldToRevert ?? calcGold;
        }

        // 2. Update Project State (Robust Functional Update)
        setProjects(prevProjects => {
            const target = prevProjects.find(p => p.id === projectId);
            if (!target) return prevProjects;
            
            const newSessions = (target.sessions || []).filter(s => s.id !== sessionId);
            const currentTotalTime = Number.isFinite(target.totalTime) ? target.totalTime : 0;
            const newTotalTime = Math.max(0, currentTotalTime - durationSeconds);
            
            const updatedProject = { ...target, sessions: newSessions, totalTime: newTotalTime };
            
            // Side effect: Save to Firestore
            if (user?.uid) {
                projectService.saveProject(user.uid, updatedProject)
                    .then(() => console.log("✅ Session deleted and project saved"))
                    .catch(e => console.error("❌ Failed to save project after delete:", e));
            }
            
            return prevProjects.map(p => p.id === projectId ? updatedProject : p);
        });

        // 3. Reverse Rewards & Limits
        if (xpToRevert > 0 || goldToRevert > 0) {
            addPlayerReward({ xp: -xpToRevert, gold: -goldToRevert });
            updateAttributeXp(project.attribute, -xpToRevert);
        }

        // Update Daily Limits (Subtract Focus Time)
        const sessionDate = new Date(session.date);
        const today = new Date();
        const isToday = sessionDate.toDateString() === today.toDateString();
        
        if (isToday) {
            // Need to fetch latest limits or use currentLimits from state
            const safeFocusSeconds = Number.isFinite(dailyLimits.focusSeconds) ? Number(dailyLimits.focusSeconds) : 0;
            const newLimits = {
                ...dailyLimits,
                focusSeconds: Math.max(0, safeFocusSeconds - durationSeconds)
            };
            setDailyLimits(newLimits);
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
            }
        }

        addNotification({ type: 'SYSTEM', label: 'SESSION DELETED', fromLevel: Math.floor(durationSeconds / 60) + 'm', toLevel: 'Reversed', icon: Trash2, color: '#ef4444' });

    }, [projects, dailyLimits, user, addPlayerReward, updateAttributeXp, addNotification]);

    const completeQuest = useCallback(async (e: React.MouseEvent, quest: Quest) => { 
        e.stopPropagation();
        
        // LOCKING: Prevent double-execution
        if (processingQuests.current.has(quest.id)) return;
        processingQuests.current.add(quest.id);
        setTimeout(() => {
            processingQuests.current.delete(quest.id);
        }, 500);

        const userId = user?.uid;

        let rewardXp = 0;
        let rewardGold = 0;
        let rewardTraitXp = 0;
        let newQuest = { ...quest };
        let isReversal = false;
        const calculatedReward = calculateTaskRewards(quest.estimatedTime);
        const baseXp = Number.isFinite(quest.xpReward) ? quest.xpReward : calculatedReward.xp;
        const baseGold = Number.isFinite(quest.gold) ? quest.gold : calculatedReward.coins;

        // --- LOGIC ---
        if (quest.completed) {
            // UN-COMPLETE
            if(navigator.vibrate) navigator.vibrate(5);
            isReversal = true;
            
            const xpToRevert = typeof quest.rewardedXp === 'number' ? quest.rewardedXp : baseXp;
            const goldToRevert = typeof quest.rewardedGold === 'number' ? quest.rewardedGold : baseGold;
            const traitXpToRevert = Math.floor(xpToRevert * 0.4);

            rewardXp = -xpToRevert;
            rewardGold = -goldToRevert;
            rewardTraitXp = -traitXpToRevert;

            newQuest = { 
                ...quest, 
                completed: false, 
                rewardedXp: undefined, 
                rewardedGold: undefined 
            };
        } else {
            // COMPLETE
            const attr = attributes.find(a => a.id === quest.attribute);
            const AttrIcon = attr?.icon || Star;
            const target = e?.currentTarget as HTMLElement | null;
            const rect = target?.getBoundingClientRect ? target.getBoundingClientRect() : null;
            const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
            const originY = rect ? rect.top : window.innerHeight / 2;
            spawnParticles(originX, originY, attr?.color || '#fff', AttrIcon, 'icon', 'profile-avatar-target');
            if(navigator.vibrate) navigator.vibrate(10); 
            
            // Calc Rewards with Limits
            const today = toLocalISOString(new Date());
            let currentLimits = dailyLimits;
            if (currentLimits.date !== today) {
                currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
            }

            const availableXp = Math.max(0, DAILY_LIMITS.TASKS.XP - currentLimits.taskXp);
            const availableGold = Math.max(0, DAILY_LIMITS.TASKS.GOLD - currentLimits.taskGold);
            const availableTraitXp = Math.max(0, DAILY_LIMITS.TASKS.TRAIT_POINTS - currentLimits.taskTraitPoints);
            
            const rawXp = baseXp;
            const rawGold = baseGold;
            const rawTraitXp = Math.floor(rawXp * 0.4);

            rewardXp = Math.min(rawXp, availableXp);
            rewardGold = Math.min(rawGold, availableGold);
            rewardTraitXp = Math.min(rawTraitXp, availableTraitXp);
            
            console.log(`[QUEST] Awarding: XP=${rewardXp}, Gold=${rewardGold}`);

            newQuest = { 
                ...quest, 
                completed: true,
                rewardedXp: rewardXp,
                rewardedGold: rewardGold
            };
        }

        questsHydratedRef.current = true;
        // OPTIMISTIC UI
        setQuests(prev => prev.map(q => q.id === quest.id ? newQuest : q));

        if (!userId) {
            if (rewardXp !== 0 || rewardGold !== 0) {
                let newXp = player.xp + rewardXp;
                let newGold = player.gold + rewardGold;
                let newLevel = player.level;
                let newNextXp = player.nextXp;

                // Reversal logic
                if (newXp < 0) newXp = 0;
                
                newLevel = calculateLevelFromXp(newXp);
                newNextXp = calculateNextLevelXp(newLevel);

                setPlayer(prev => ({ ...prev, xp: newXp, gold: newGold, level: newLevel, nextXp: newNextXp }));
            }

            if (rewardTraitXp !== 0 && quest.attribute) {
                const attrIndex = attributes.findIndex(a => a.id === quest.attribute);
                if (attrIndex !== -1) {
                    const attr = attributes[attrIndex];
                    let newAttrXp = attr.xp + rewardTraitXp;
                    let newAttrLevel = attr.level;
                    let newAttrMaxXp = attr.maxXp;

                    if (rewardTraitXp > 0) {
                        while (newAttrXp >= newAttrMaxXp) {
                            newAttrXp -= newAttrMaxXp;
                            newAttrLevel += 1;
                            newAttrMaxXp = Math.floor(newAttrMaxXp * 1.2);
                        }
                    } else {
                        newAttrXp = Math.max(0, newAttrXp);
                    }

                    const newAttributes = [...attributes];
                    newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                    setAttributes(newAttributes);
                }
            }

            if (!isReversal) {
                const today = toLocalISOString(new Date());
                let currentLimits = dailyLimits;
                if (currentLimits.date !== today) {
                    currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
                }
                const newLimits = {
                    ...currentLimits,
                    taskXp: currentLimits.taskXp + Math.max(0, rewardXp),
                    taskGold: currentLimits.taskGold + Math.max(0, rewardGold),
                    taskTraitPoints: currentLimits.taskTraitPoints + Math.max(0, rewardTraitXp),
                    tasksCompleted: (currentLimits.tasksCompleted || 0) + 1
                };
                setDailyLimits(newLimits);
            } else {
                const today = toLocalISOString(new Date());
                if (dailyLimits.date === today) {
                    const newLimits = {
                        ...dailyLimits,
                        taskXp: Math.max(0, dailyLimits.taskXp + rewardXp),
                        taskGold: Math.max(0, dailyLimits.taskGold + rewardGold),
                        taskTraitPoints: Math.max(0, dailyLimits.taskTraitPoints + rewardTraitXp),
                        tasksCompleted: Math.max(0, (dailyLimits.tasksCompleted || 0) - 1)
                    };
                    setDailyLimits(newLimits);
                }
            }

            return;
        }

        // ATOMIC BATCH
        try {
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', userId);
            const questRef = doc(db, 'users', userId, 'quests', quest.id);

            // New Vars for Reward Overlay
            let finalXp = player.xp;
            let finalLevel = player.level;
            let finalGold = player.gold;
            let traitUpdate = undefined;

            // A. Update Quest
            batch.set(questRef, {
                completed: newQuest.completed,
                rewardedXp: newQuest.rewardedXp || 0,
                rewardedGold: newQuest.rewardedGold || 0
            }, { merge: true });

            // B. Update Player Stats
            if (rewardXp !== 0 || rewardGold !== 0) {
                 let newXp = player.xp + rewardXp;
                 let newGold = player.gold + rewardGold;
                 
                 // Reversal logic
                 if (newXp < 0) newXp = 0;
                 
                 let newLevel = calculateLevelFromXp(newXp);
                 const newNextXp = calculateNextLevelXp(newLevel);
                
                setPlayer(prev => ({ ...prev, xp: newXp, gold: newGold, level: newLevel, nextXp: newNextXp }));
                batch.update(userRef, { 'stats.xp': newXp, 'stats.gold': newGold, 'stats.level': newLevel, 'stats.nextXp': newNextXp });
                
                finalXp = newXp;
                finalLevel = newLevel;
                finalGold = newGold;
            }

            // C. Update Attribute
             if (rewardTraitXp !== 0 && quest.attribute) {
                 const attrIndex = attributes.findIndex(a => a.id === quest.attribute);
                 if (attrIndex !== -1) {
                     const attr = attributes[attrIndex];
                     let newAttrXp = attr.xp + rewardTraitXp;
                     let newAttrLevel = attr.level;
                     let newAttrMaxXp = attr.maxXp;

                     if (rewardTraitXp > 0) {
                        while (newAttrXp >= newAttrMaxXp) {
                            newAttrXp -= newAttrMaxXp;
                            newAttrLevel += 1;
                            newAttrMaxXp = Math.floor(newAttrMaxXp * 1.2);
                        }
                    } else {
                        newAttrXp = Math.max(0, newAttrXp);
                    }
                    
                    const newAttributes = [...attributes];
                    newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                    setAttributes(newAttributes);

                    const attrRef = doc(db, 'users', userId, 'attributes', attr.id);
                    batch.set(attrRef, { xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp }, { merge: true });
                    
                    traitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level };
                 }
            }

            // D. Update Limits
            if (!isReversal) {
                 const today = toLocalISOString(new Date());
                 let currentLimits = dailyLimits;
                 if (currentLimits.date !== today) {
                    currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
                }
                const newLimits = {
                    ...currentLimits,
                    taskXp: currentLimits.taskXp + Math.max(0, rewardXp),
                    taskGold: currentLimits.taskGold + Math.max(0, rewardGold),
                    taskTraitPoints: currentLimits.taskTraitPoints + Math.max(0, rewardTraitXp),
                    tasksCompleted: (currentLimits.tasksCompleted || 0) + 1
                };
                setDailyLimits(newLimits);
                batch.update(userRef, { dailyLimits: newLimits });
                
                if (rewardXp > 0 || rewardGold > 0) {
                     triggerReward(`Quest: ${quest.title}`, rewardXp, rewardGold, { xp: finalXp, gold: finalGold, level: finalLevel }, { level: player.level }, traitUpdate);
                }
            } else {
                 // Revert Limits
                 const today = toLocalISOString(new Date());
                 if (dailyLimits.date === today) {
                      const newLimits = {
                        ...dailyLimits,
                        taskXp: Math.max(0, dailyLimits.taskXp + rewardXp), // rewardXp is negative
                        taskGold: Math.max(0, dailyLimits.taskGold + rewardGold),
                        taskTraitPoints: Math.max(0, dailyLimits.taskTraitPoints + rewardTraitXp),
                        tasksCompleted: Math.max(0, (dailyLimits.tasksCompleted || 0) - 1)
                    };
                    setDailyLimits(newLimits);
                    batch.update(userRef, { dailyLimits: newLimits });
                 }
            }
            
            await batch.commit();

        } catch (e) {
            console.error("Failed to sync quest", e);
        }

    }, [attributes, spawnParticles, calculateNextXp, user, dailyLimits, player]);

    const handleHabitClick = useCallback(async (e: React.MouseEvent, habit: Habit) => {
        e.stopPropagation();
        
        // 1. FEEDBACK
        if(navigator.vibrate) navigator.vibrate(habit.completedToday ? 5 : [5, 20, 5]);
        
        if (!habit.completedToday && (habit.type === 'SIMPLE' || habit.type === 'BOOLEAN')) {
             const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
             spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fff', Flame, 'fire');
        }

        const userId = user?.uid;

        // 2. CALCULATE NEW STATE
        const today = toLocalISOString(new Date());
        const todayHistory = toLocalISOString(new Date());
        let newHabit = { ...habit };
        let rewardXp = 0;
        let rewardGold = 0;
        let isReversal = false;
        
        // --- LOGIC: TOGGLE ---
        if (habit.completedToday) {
            // UN-COMPLETE (Reversal)
            isReversal = true;
            
            // FIX: Apply same multiplier logic for reversal to prevent XP farming
            let baseRevert = 20 + ((habit.streak - 1) * 2);
            let goldRevert = 2;
            if (habit.estimatedTime && habit.estimatedTime > 0) {
                const hours = habit.estimatedTime / 60;
                const timeMultiplier = Math.min(2.0, hours * 0.15);
                baseRevert = Math.floor(baseRevert * (1 + timeMultiplier));
                goldRevert = Math.floor(goldRevert * (1 + timeMultiplier));
            }

            rewardXp = -baseRevert; // Subtract EXACTLY what was given
            rewardGold = -goldRevert; // Revert Gold
            
            const newHistory = (habit.history || []).filter(d => getHistoryDateKey(d) !== todayHistory);
            newHabit = {
                ...habit,
                completedToday: false,
                streak: Math.max(0, habit.streak - 1),
                totalCompletions: Math.max(0, habit.totalCompletions - 1),
                history: newHistory
            };
        } else {
            // COMPLETE
            // Handle Limits
            let currentLimits = dailyLimits;
             if (currentLimits.date !== today) {
                currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
            }
            const habitsDone = currentLimits.habitsCompleted || 0;
            const isRewardable = habitsDone < DAILY_LIMITS.HABITS.MAX_COUNT;

            if (isRewardable) {
                let baseReward = 20 + (habit.streak * 2);
                let baseGold = 2;
                if (habit.estimatedTime && habit.estimatedTime > 0) {
                    const hours = habit.estimatedTime / 60;
                    const timeMultiplier = Math.min(2.0, hours * 0.15);
                    baseReward = Math.floor(baseReward * (1 + timeMultiplier));
                    baseGold = Math.floor(baseGold * (1 + timeMultiplier));
                }
                rewardXp = baseReward;
                rewardGold = baseGold; // Scaled Gold Reward
            } else {
                 addNotification({ type: 'SYSTEM', label: 'LIMIT REACHED', fromLevel: '10/10', toLevel: 'No XP', icon: InfinityIcon, color: '#ef4444' });
            }

            newHabit = {
                ...habit,
                completedToday: true,
                streak: habit.streak + 1,
                totalCompletions: habit.totalCompletions + 1,
                history: [...(habit.history || []), todayHistory]
            };
        }

        // 3. OPTIMISTIC UI UPDATES
        setHabits(prev => prev.map(h => h.id === habit.id ? newHabit : h));

        if (!userId) {
            let newXp = player.xp;
            let newLevel = player.level;
            let newGold = player.gold;
            let traitUpdate = undefined;

            if (rewardXp !== 0 || rewardGold !== 0) {
                newXp = player.xp + rewardXp;
                newGold = player.gold + rewardGold;
                
                // Reversal logic
                if (newXp < 0) newXp = 0;
                
                newLevel = calculateLevelFromXp(newXp);
                const newNextXp = calculateNextLevelXp(newLevel);

                newGold = Math.max(0, newGold);
                setPlayer(prev => ({ ...prev, xp: newXp, gold: newGold, level: newLevel, nextXp: newNextXp }));
            }

            if (rewardXp !== 0 && habit.attribute) {
                const attrIndex = attributes.findIndex(a => a.id === habit.attribute);
                if (attrIndex !== -1) {
                    const attr = attributes[attrIndex];
                    let newAttrXp = attr.xp + rewardXp;
                    let newAttrLevel = attr.level;
                    let newAttrMaxXp = attr.maxXp;

                    if (rewardXp > 0) {
                        while (newAttrXp >= newAttrMaxXp) {
                            newAttrXp -= newAttrMaxXp;
                            newAttrLevel += 1;
                            newAttrMaxXp = Math.floor(newAttrMaxXp * 1.2);
                        }
                    } else {
                        newAttrXp = Math.max(0, newAttrXp);
                    }

                    const newAttributes = [...attributes];
                    newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                    setAttributes(newAttributes);
                    
                    traitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level };
                }
            }

            if (!isReversal && rewardXp > 0) {
                let currentLimits = dailyLimits;
                if (currentLimits.date !== today) {
                    currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
                }
                const newLimits = { 
                    ...currentLimits, 
                    habitsCompleted: (currentLimits.habitsCompleted || 0) + 1 
                };
                setDailyLimits(newLimits);
                
                if (rewardXp > 0 || rewardGold > 0) {
                    triggerReward(`Habit: ${habit.title}`, rewardXp, rewardGold, { xp: newXp, gold: newGold, level: newLevel }, { level: player.level }, traitUpdate);
                }
            }

            return;
        }

        // 4. ATOMIC BATCH WRITE
        try {
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', userId);
            const habitRef = doc(db, 'users', userId, 'habits', habit.id);
            
            // New Vars for Reward Overlay
            let finalXp = player.xp;
            let finalLevel = player.level;
            let finalGold = player.gold;
            let traitUpdate = undefined;

            // A. Update Habit
            batch.update(habitRef, {
                completedToday: newHabit.completedToday,
                streak: newHabit.streak,
                totalCompletions: newHabit.totalCompletions,
                history: newHabit.history
            });

            // B. Update Player Stats (XP & Gold)
            if (rewardXp !== 0 || rewardGold !== 0) {
                let newXp = player.xp + rewardXp;
                let newGold = player.gold + rewardGold;
                
                // Reversal logic
                if (newXp < 0) newXp = 0;
                
                let newLevel = calculateLevelFromXp(newXp);
                const newNextXp = calculateNextLevelXp(newLevel);

                newGold = Math.max(0, newGold);
                
                // Update Local Player
                setPlayer(prev => ({ ...prev, xp: newXp, gold: newGold, level: newLevel, nextXp: newNextXp }));
                
                // Add to Batch
                batch.update(userRef, {
                    'stats.xp': newXp,
                    'stats.gold': newGold,
                    'stats.level': newLevel,
                    'stats.nextXp': newNextXp
                });
                
                finalXp = newXp;
                finalLevel = newLevel;
                finalGold = newGold;
            }

            // C. Update Attribute
            if (rewardXp !== 0 && habit.attribute) {
                 const attrIndex = attributes.findIndex(a => a.id === habit.attribute);
                 if (attrIndex !== -1) {
                     const attr = attributes[attrIndex];
                     let newAttrXp = attr.xp + rewardXp;
                     let newAttrLevel = attr.level;
                     let newAttrMaxXp = attr.maxXp;

                     if (rewardXp > 0) {
                        while (newAttrXp >= newAttrMaxXp) {
                            newAttrXp -= newAttrMaxXp;
                            newAttrLevel += 1;
                            newAttrMaxXp = Math.floor(newAttrMaxXp * 1.2);
                        }
                    } else {
                         newAttrXp = Math.max(0, newAttrXp);
                    }
                    
                    // Update Local Attribute
                    const newAttributes = [...attributes];
                    newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                    setAttributes(newAttributes);

                    // Add to Batch
                    const attrRef = doc(db, 'users', userId, 'attributes', attr.id);
                    batch.set(attrRef, { 
                        xp: newAttrXp, 
                        level: newAttrLevel, 
                        maxXp: newAttrMaxXp 
                    }, { merge: true });
                    
                    traitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level };
                 }
            }

            // D. Update Daily Limits
            if (!isReversal && rewardXp > 0) {
                let currentLimits = dailyLimits;
                if (currentLimits.date !== today) {
                    currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
                }
                const newLimits = { 
                    ...currentLimits, 
                    habitsCompleted: (currentLimits.habitsCompleted || 0) + 1 
                };
                
                // Update Local Limits
                setDailyLimits(newLimits);
                
                // Add to Batch
                batch.update(userRef, { dailyLimits: newLimits });
                
                // Trigger Reward Overlay (Only for gains)
                if (rewardXp > 0 || rewardGold > 0) {
                     triggerReward(`Habit: ${habit.title}`, rewardXp, rewardGold, { xp: finalXp, gold: finalGold, level: finalLevel }, { level: player.level }, traitUpdate);
                }
            } else if (isReversal) {
                let currentLimits = dailyLimits;
                if (currentLimits.date === today) {
                     const newLimits = { 
                        ...currentLimits, 
                        habitsCompleted: Math.max(0, (currentLimits.habitsCompleted || 0) - 1) 
                    };
                    
                    // Update Local Limits
                    setDailyLimits(newLimits);
                    
                    // Add to Batch
                    batch.update(userRef, { dailyLimits: newLimits });
                }
            }

            // COMMIT
            await batch.commit();
            console.log("✅ HABIT ATOMIC SYNC SUCCESS");

        } catch (err) {
            console.error("❌ HABIT ATOMIC SYNC FAILED:", err);
            // Optional: Revert UI here if critical
        }
    }, [user, habits, dailyLimits, player, attributes, calculateNextXp, spawnParticles, addNotification]);

    const validateHabitProgress = () => {
        if (!validationHabit) return;
        let isComplete = false; let newCurrentValue = validationHabit.currentValue || 0; 
        if (validationHabit.type === 'QUANTITY') {
            const added = parseFloat(valTempValue);
            if (isNaN(added) || added < 0) return;
            newCurrentValue += added;
            if (newCurrentValue >= (validationHabit.targetValue || 0)) isComplete = true;
        } else if (validationHabit.type === 'CHECKLIST') {
            if (validationHabit.checklist?.every(i => i.completed)) isComplete = true;
        }

        if (isComplete) {
            // CHECK LIMITS
            const today = toLocalISOString(new Date());
            let currentLimits = dailyLimits;
            if (currentLimits.date !== today) {
                currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
            }

            const habitsDone = currentLimits.habitsCompleted || 0;
            const isRewardable = habitsDone < DAILY_LIMITS.HABITS.MAX_COUNT;

            let rewardXp = 20 + (validationHabit.streak * 2);
            // Time Multiplier
            if (validationHabit.estimatedTime && validationHabit.estimatedTime > 0) {
                const timeMultiplier = Math.min(0.5, (validationHabit.estimatedTime / 30) * 0.1);
                rewardXp = Math.floor(rewardXp * (1 + timeMultiplier));
            }

            if (!isRewardable) rewardXp = 0;

            if (isRewardable) {
                spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#fff', Trophy, 'fire');
                addPlayerReward({ xp: rewardXp, gold: 0 });
                updateAttributeXp(validationHabit.attribute, rewardXp);

                 // Update Limits
                const newLimits = { ...currentLimits, habitsCompleted: habitsDone + 1 };
                setDailyLimits(newLimits);
                if (user?.uid) {
                    setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
                }
            } else {
                 addNotification({ type: 'SYSTEM', label: 'LIMIT REACHED', fromLevel: '10/10', toLevel: 'No XP', icon: InfinityIcon, color: '#ef4444' });
            }
        }

        const todayHistory = toLocalISOString(new Date());

        setHabits(prev => prev.map(h => {
            if (h.id === validationHabit.id) {
                if (isComplete) {
                    return { 
                        ...h, 
                        completedToday: true, 
                        streak: h.streak + 1, 
                        totalCompletions: h.totalCompletions + 1, 
                        currentValue: newCurrentValue,
                        history: [...(h.history || []), todayHistory]
                    };
                }
                return { ...h, currentValue: newCurrentValue }; 
            }
            return h;
        }));

        if (user?.uid && validationHabit) {
            if (isComplete) {
                persistenceService.habits.update(user.uid, validationHabit.id, { 
                    completedToday: true, 
                    streak: validationHabit.streak + 1, 
                    totalCompletions: validationHabit.totalCompletions + 1, 
                    currentValue: newCurrentValue,
                    history: [...(validationHabit.history || []), todayHistory]
                });
            } else {
                persistenceService.habits.update(user.uid, validationHabit.id, { 
                    currentValue: newCurrentValue 
                });
            }
        }

        setValidationHabit(null);
    };

    const handleQuestConfirm = useCallback((questData: Partial<Quest>) => {
        // LIMIT CHECK: Tasks
        if (user?.plan !== 'PRO') {
            const activeQuests = quests.filter(q => !q.completed);
            if (!questData.id && activeQuests.length >= FREE_LIMITS.ACTIVE_TASKS) {
                setActiveModal('PRO');
                return;
            }
        }

        // If ID exists, it's an update. If not, it's a create.
        const quest: Quest = questData.id 
            ? questData as Quest 
            : { 
                id: Date.now().toString(), 
                completed: false, 
                subtasks: [], 
                difficulty: 'C',
                xpReward: 10,
                gold: 5,
                attribute: 'DISCIPLINA',
                title: 'New Quest',
                ...questData 
            } as Quest;

        questsHydratedRef.current = true;
        setQuests(prev => {
            const exists = prev.find(q => q.id === quest.id);
            if (exists) return prev.map(q => q.id === quest.id ? quest : q);
            return [...prev, quest];
        });
        if (user?.uid) {
            persistenceService.quests.save(user.uid, quest);
        }
        setActiveModal(null);
    }, [user, quests]);

    const handleDeleteQuest = useCallback(async (questId: string) => {
        if (!user) return;
        questsHydratedRef.current = true;
        setQuests(prev => prev.filter(q => q.id !== questId));
        try {
            await persistenceService.quests.delete(user.uid, questId);
        } catch (error) {
            console.error("Error deleting quest:", error);
        }
    }, [user]);

    const handleHabitConfirm = useCallback((data: Partial<Habit>) => {
        // LIMIT CHECK: Habits
        if (user?.plan !== 'PRO') {
            if (!data.id && habits.length >= FREE_LIMITS.HABITS) {
                setActiveModal('PRO');
                return;
            }
        }

        setHabits(prev => {
            if (data.id) {
                // Edit mode
                const exists = prev.find(h => h.id === data.id);
                if (exists) {
                    const updated = { ...exists, ...data } as Habit;
                    if (user?.uid) persistenceService.habits.save(user.uid, updated);
                    return prev.map(h => h.id === data.id ? updated : h);
                }
            }
            
            // Create mode
            const newHabit: Habit = { 
                id: Date.now().toString(), 
                streak: 0, 
                completedToday: false, 
                totalCompletions: 0, 
                checklist: data.checklist || [], 
                createdAt: Date.now(),
                ...data 
            } as Habit;
            
            if (user?.uid) persistenceService.habits.save(user.uid, newHabit);
            return [newHabit, ...prev];
        });
        
        setActiveModal(null);
    }, [user, habits]);

    const handleHabitUpdate = useCallback((habitId: string, data: Partial<Habit>) => {
        if (!habitId) return;
        let updatedFields: Partial<Habit> = data;
        const todayHistory = toLocalISOString(new Date());
        const todayKey = getHistoryDateKey(todayHistory);

        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            let next = { ...h, ...data } as Habit;

            if (h.type === 'QUANTITY' && typeof data.currentValue === 'number') {
                const target = h.targetValue || 0;
                const newValue = data.currentValue;
                const wasComplete = h.completedToday;
                const isNowComplete = target > 0 && newValue >= target;

                if (isNowComplete && !wasComplete) {
                    const nextHistory = [...(h.history || []), todayHistory];
                    const nextStreak = (h.streak || 0) + 1;
                    const nextTotal = (h.totalCompletions || 0) + 1;
                    next = { ...next, completedToday: true, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                    updatedFields = { ...updatedFields, completedToday: true, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                } else if (!isNowComplete && wasComplete) {
                    const nextHistory = (h.history || []).filter(d => getHistoryDateKey(d) !== todayKey);
                    const nextStreak = Math.max(0, (h.streak || 0) - 1);
                    const nextTotal = Math.max(0, (h.totalCompletions || 0) - 1);
                    next = { ...next, completedToday: false, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                    updatedFields = { ...updatedFields, completedToday: false, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                }
            }

            return next;
        }));

        if (user?.uid) {
            persistenceService.habits.update(user.uid, habitId, updatedFields as Habit).catch((error) => {
                console.error("Error updating habit:", error);
            });
        }
    }, [user?.uid]);

    const handleDeleteHabit = useCallback(async (habitId: string) => {
        if (!user) return;
        
        // Find habit before deleting to check completion status
        const habitToDelete = habits.find(h => h.id === habitId);
        
        // Optimistic Update
        setHabits(prev => prev.filter(h => h.id !== habitId));

        // If completed today, we must decrement the daily count!
        if (habitToDelete?.completedToday) {
            setDailyLimits(prev => ({
                ...prev,
                habitsCompleted: Math.max(0, (prev.habitsCompleted || 0) - 1)
            }));
            
            // Sync with Firestore
            try {
                const userRef = doc(db, 'users', user.uid);
                // We need to decrement habitsCompleted atomically
                // But since we don't have 'increment' imported, we can just use the value we know locally
                // or use updateDoc with the calculated value.
                // Ideally use increment(-1) but let's stick to what we have imported or add it.
                // We have 'doc', 'setDoc', 'db', 'writeBatch', 'updateDoc'.
                // Let's assume we can just update the object.
                await updateDoc(userRef, {
                    'dailyLimits.habitsCompleted': Math.max(0, (dailyLimits.habitsCompleted || 0) - 1)
                });
            } catch (e) {
                console.error("Failed to update daily limits after habit deletion", e);
            }
        }

        try {
            await persistenceService.habits.delete(user.uid, habitId);
        } catch (error) {
            console.error("Error deleting habit:", error);
        }
    }, [user, habits, dailyLimits]);

    // --- THE GREAT RESET (CANVAS WIPE) ---
    useEffect(() => {
        const hasReset = localStorage.getItem('MATRIX_RESET_V3'); // Increment version to force wipe
        if (!hasReset && user?.uid) {
            console.log("🚨 PERFORMING GREAT RESET (CANVAS WIPE) 🚨");
            
            // 1. Clear Local State
            setProjects([]);
            setQuests([]);
            setHabits([]);
            setBadHabits([]);
            setSmartProjects([]);
            
            // 2. Clear Persistence Cache
            PersistenceService.clearCollectionSafe(user.uid, 'projects');
            PersistenceService.clearCollectionSafe(user.uid, 'quests');
            PersistenceService.clearCollectionSafe(user.uid, 'habits');
            PersistenceService.clearCollectionSafe(user.uid, 'badHabits');
            PersistenceService.clearCollectionSafe(user.uid, 'smartProjects');
            
            // 3. Mark as done
            localStorage.setItem('MATRIX_RESET_V3', 'true');
            
            // 4. Force reload window to ensure clean slate? No, state update should be enough.
            // But let's add a notification
            setTimeout(() => {
                 addNotification({ 
                    type: 'SYSTEM', 
                    label: 'SYSTEM RESET', 
                    fromLevel: 'Canvas', 
                    toLevel: 'Clean', 
                    icon: Trash2, 
                    color: '#ef4444' 
                });
            }, 1000);
        }
    }, [user?.uid, addNotification]);

    const handleProjectConfirm = useCallback(async (projectData: Partial<Project>) => {
        console.log("💎 [DashboardLogic] Handling Project Confirm:", projectData);
        
        // 1. Generate ID (Stable)
        const nextId = projectData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        
        let resolvedProject: Project | null = null;
        let blockedByLimit = false;

        projectsHydratedRef.current = true;

        setProjects(prev => {
            // Check if it's an update to an existing project
            const isUpdate = prev.some(p => p.id === nextId);

            // LIMIT CHECK (Only for NEW projects)
            if (user?.plan !== 'PRO' && !isUpdate) {
                const activeCount = prev.filter(p => !p.deleted).length;
                // Use a safer default if FREE_LIMITS.PROJECTS is undefined
                const maxProjects = FREE_LIMITS.PROJECTS || 3; 
                if (activeCount >= maxProjects) {
                    blockedByLimit = true;
                    return prev; // Return previous state unchanged
                }
            }

            const existing = prev.find(p => p.id === nextId);
            
            const baseProject: Project = {
                id: nextId,
                totalTime: 0,
                sessions: [],
                goalTarget: 0,
                goalFrequency: 'WEEKLY',
                pomoDuration: 25,
                breakDuration: 5,
                impact: 1,
                title: 'New Project',
                description: '',
                attribute: 'MENTAL',
                createdAt: Date.now()
            };

            const nextProject = existing
                ? {
                    ...baseProject,
                    ...existing,
                    ...projectData,
                    sessions: existing.sessions || [],
                    totalTime: existing.totalTime || 0,
                    deleted: projectData.deleted !== undefined ? projectData.deleted : existing.deleted,
                    archived: projectData.archived !== undefined ? projectData.archived : existing.archived
                }
                : {
                    ...baseProject,
                    ...projectData,
                    id: nextId // Ensure ID is set
                };

            resolvedProject = nextProject;

            // Optimistic Update
            const nextProjects = existing
                ? prev.map(p => p.id === nextProject.id ? nextProject : p)
                : [...prev, nextProject];

            if (user?.uid) {
                saveProjectsCache(user.uid, nextProjects);
            }
            return nextProjects;
        });

        if (blockedByLimit) {
            console.warn("⚠️ Project creation blocked by plan limits");
            setActiveModal('PRO');
            return;
        }

        // Async Save (Outside State Update)
        if (user?.uid && resolvedProject) {
            console.log("💾 [DashboardLogic] Saving Project to Firestore:", resolvedProject);
            projectService.saveProject(user.uid, resolvedProject).catch(err => {
                console.error("Failed to save project:", err);
                addNotification({ type: 'SYSTEM', label: 'SAVE ERROR', fromLevel: 'Retry', toLevel: 'Failed', icon: AlertTriangle, color: '#ef4444' });
            });
        }

        setActiveModal(null);
    }, [user, saveProjectsCache, addNotification]);

    const handleDeleteProject = useCallback(async (projectId: string) => {
        console.log("🗑️ handleDeleteProject CALLED for:", projectId);
        if (!user?.uid) {
            console.error("❌ No user ID found for delete");
            return;
        }

        projectsHydratedRef.current = true;
        deletedProjectIdsRef.current.add(projectId);
        
        // 1. OPTIMISTIC UI UPDATE - INSTANT REMOVAL
        setProjects(prev => {
            console.log("🔥 Removing from state:", projectId);
            const nextProjects = prev.filter(p => p.id !== projectId);
            
            // Handle edge case: Empty list
            if (nextProjects.length === 0) {
                allowEmptyProjectsSaveRef.current = true;
                // Force clear cache immediately
                PersistenceService.clearCollectionSafe(user.uid, 'projects');
            }
            
            // Update cache
            saveProjectsCache(user.uid, nextProjects);
            return nextProjects;
        });

        // 2. FIRESTORE & CLEANUP (Hard Delete + Subcollections)
        try {
            console.log("☁️ Deleting from Firestore (HARD DELETE)...");
            
            // A. Delete the project document itself
            await projectService.deleteProject(user.uid, projectId);
            
            // B. Optional: Delete associated sessions (if stored separately or in subcollection)
            // If sessions are inside the project object (which they seem to be based on types), 
            // deleting the project deletes the sessions automatically.
            // But if there's a separate 'sessions' collection, we should query and delete.
            // For now, assuming embedded sessions or handled by backend triggers.

            console.log("✅ Project deleted successfully from DB");
            
            addNotification({ 
                type: 'SYSTEM', 
                label: 'PROJECT ELIMINATED', 
                fromLevel: 'Active', 
                toLevel: 'Void', 
                icon: Trash2, 
                color: '#ef4444' 
            });
        } catch (error) {
            console.error("❌ Error deleting project:", error);
            // Revert state if needed, but for delete usually better to just warn
             addNotification({ 
                type: 'SYSTEM', 
                label: 'DELETE FAILED', 
                fromLevel: 'Error', 
                toLevel: 'Retry', 
                icon: AlertTriangle, 
                color: '#ef4444' 
            });
        }
    }, [user?.uid, saveProjectsCache, addNotification]);

    const handleResetAllProjects = useCallback(async () => {
        if (!user?.uid) return;
        console.log("🚨 RESETTING ALL PROJECTS");
        
        // 1. Clear Local State
        setProjects([]);
        PersistenceService.clearCollectionSafe(user.uid, 'projects');
        allowEmptyProjectsSaveRef.current = true;
        
        // 2. Clear Firestore
        try {
             const projectsRef = collection(db, 'users', user.uid, 'projects');
             const snapshot = await getDocs(projectsRef);
             const batch = writeBatch(db);
             snapshot.docs.forEach(doc => {
                 batch.delete(doc.ref);
             });
             await batch.commit();
             console.log("✅ All projects deleted from Firestore");
             // Use a simple alert or console log if addNotification is not available in scope here, 
             // but it should be available since it is used elsewhere in this hook.
             // Looking at the file, addNotification is used in handleBadHabitConfirm.
             // Wait, addNotification is NOT in the dependency array of handleResetAllProjects in my previous attempt.
             // I should check if addNotification is available in scope.
        } catch (error) {
            console.error("Failed to reset projects", error);
        }
    }, [user?.uid]);

    const handleUpdateProject = useCallback((updatedProject: Project) => {
        projectsHydratedRef.current = true;
        
        setProjects(prev => {
            const nextProjects = prev.map(p => p.id === updatedProject.id ? updatedProject : p);
            if (user?.uid) {
                saveProjectsCache(user.uid, nextProjects);
            }
            return nextProjects;
        });
        
        if (user?.uid) {
            projectService.saveProject(user.uid, updatedProject).catch(console.error);
        }
    }, [user?.uid, saveProjectsCache]);

    const handleToggleHabitDay = useCallback(async (habitId: string, date: string) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        const history = habit.history || [];
        const isCompleted = history.some(d => getHistoryDateKey(d) === date);
        
        let newHistory;
        if (isCompleted) {
            newHistory = history.filter(d => getHistoryDateKey(d) !== date);
        } else {
            newHistory = [...history, date];
        }

        setHabits(prev => prev.map(h => h.id === habitId ? { ...h, history: newHistory } : h));

        if (user?.uid) {
            try {
                const habitRef = doc(db, 'users', user.uid, 'habits', habitId);
                await setDoc(habitRef, { history: newHistory }, { merge: true });
            } catch (e) {
                console.error("Failed to toggle habit day", e);
            }
        }
    }, [habits, user?.uid]);

    // --- NOTE & SMART PROJECT STUBS (To Fix Dashboard Types) ---
    // These are required by Dashboard but might not be fully implemented in this hook yet.
    // We add basic implementations or state holders.

    const [notes, setNotes] = useState<any[]>([]); // Replace 'any' with Note type if available

    const handleAddNote = useCallback(async (note: any) => {
        // Basic stub
        setNotes(prev => [...prev, { ...note, id: Date.now().toString() }]);
    }, []);

    const handleUpdateSmartProject = useCallback(async (project: SmartProject) => {
        const newProjects = smartProjects.map(p => p.id === project.id ? project : p);
        setSmartProjects(newProjects);
        if (user?.uid) {
             PersistenceService.saveCollection(user.uid, 'smartProjects', newProjects);
             await persistenceService.smartProjects.save(user.uid, project);
        }
    }, [user?.uid, smartProjects]);

    const handleBadHabitConfirm = useCallback(async (data: Partial<BadHabit>) => {
        if (!user?.uid) return;

        // ⚡ DOPAMINE TRIGGER: Visual Confirmation
        addNotification({ 
            type: 'ACHIEVEMENT', 
            label: 'PROTOCOL INITIATED', 
            fromLevel: 'Anomaly', 
            toLevel: 'Targeted', 
            icon: Skull, 
            color: '#f43f5e' 
        });
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#f43f5e', Skull);

        const badHabit: BadHabit = {
            id: data.id || Date.now().toString(),
            streak: 0,
            relapsedToday: false,
            history: [],
            createdAt: Date.now(),
            title: data.title || 'Bad Habit',
            attribute: data.attribute || 'DISCIPLINA',
            reason: data.reason || '',
            negativeImpact: data.negativeImpact || '',
            timeConsumed: data.timeConsumed || 0,
            penalties: data.penalties || { hp: 0, xp: 0, gold: 0 },
            ...data
        } as BadHabit;

        let newBadHabits: BadHabit[];
        const exists = badHabits.some(h => h.id === badHabit.id);
        
        if (exists) {
            newBadHabits = badHabits.map(h => h.id === badHabit.id ? badHabit : h);
        } else {
            newBadHabits = [...badHabits, badHabit];
        }

        setBadHabits(newBadHabits);
        PersistenceService.saveCollection(user.uid, 'badHabits', newBadHabits);

        await persistenceService.badHabits.save(user.uid, badHabit);
        setActiveModal(null);
    }, [user?.uid, addNotification, spawnParticles, badHabits]);

    const handleBadHabitRelapse = useCallback(async (habit: BadHabit, paymentMethod: 'GOLD' | 'HP') => {
        if (!user?.uid) return;

        const penalty = habit.penalties;
        const today = new Date().toISOString();

        if (paymentMethod === 'GOLD') {
             addPlayerGold(-penalty.gold);
        } else {
            const newHealth = Math.max(0, health - penalty.hp);
            setHealth(newHealth);

            // 🛡️ IMMEDIATE PERSISTENCE: Save HP instantly to prevent refresh loss
            if (user?.uid) {
                const cached = PersistenceService.getProfile(user.uid);
                if (cached) {
                    PersistenceService.saveProfile({
                        ...cached,
                        stats: { ...cached.stats, hp: newHealth }
                    });
                }
            }
            
            addPlayerReward({ 
                xp: -penalty.xp, 
                gold: 0
            });
            updateAttributeXp(habit.attribute, -penalty.xp);

             setDoc(doc(db, 'users', user.uid), { 'stats.hp': newHealth }, { merge: true });
        }

        const updatedHabit: BadHabit = {
            ...habit,
            streak: 0,
            relapsedToday: true,
            history: [...habit.history, today]
        };

        const newBadHabits = badHabits.map(h => h.id === habit.id ? updatedHabit : h);
        setBadHabits(newBadHabits);
        PersistenceService.saveCollection(user.uid, 'badHabits', newBadHabits);

        await persistenceService.badHabits.save(user.uid, updatedHabit);

    }, [user?.uid, health, addPlayerGold, addPlayerReward, badHabits]);

    const handleDeleteBadHabit = useCallback(async (id: string) => {
        if (!user?.uid) return;
        
        const newBadHabits = badHabits.filter(h => h.id !== id);
        setBadHabits(newBadHabits);
        PersistenceService.saveCollection(user.uid, 'badHabits', newBadHabits);

        await persistenceService.badHabits.delete(user.uid, id);
    }, [user?.uid, badHabits]);

    return {
        user,
        luxLoading,
        matrixLoading: luxLoading,
        lastAchievement,
        setLastAchievement,
        currentTheme,
        setCurrentTheme,
        currentView,
        setCurrentView,
        isDockOpen,
        setIsDockOpen,
        isFocusMode,
        setIsFocusMode,
        isNoteTaking,
        setIsNoteTaking,
        overrideBgColor,
        setOverrideBgColor,
        showProfile,
        setShowProfile,
        defaultChartMode,
        setDefaultChartMode,
        player,
        setPlayer,
        health,
        setHealth,
        dailyLimits,
        setDailyLimits,
        attributes,
        setAttributes,
        areAttributesLoaded,
        quests,
        setQuests,
        habits,
        setHabits,
        projects,
        setProjects,
        smartProjects,
        setSmartProjects,
        notifications,
        particles,
        activeModal,
        setActiveModal,
        validationHabit,
        setValidationHabit,
        valTempValue,
        setValTempValue,
        handleFocusModeChange,
        addNotification,
        addPlayerXp,
        addPlayerGold,
        addPlayerReward,
        updateAttributeXp,
        spawnParticles,
        handleCompleteSession,
        handleAddManualSession,
        handleDeleteSession,
        completeQuest,
        handleHabitClick,
        validateHabitProgress,
        handleQuestConfirm,
        handleDeleteQuest,
        handleHabitConfirm,
        handleHabitUpdate,
        handleDeleteHabit,
        handleProjectConfirm,
        handleDeleteProject,
        handleResetAllProjects,
        handleUpdateProject,
        handleToggleHabitDay,
        updateAttributeMetadata,
        addAttribute,
        removeAttribute,
        dashboardStyle,
        updateDashboardStyle,
        avatarShape,
        updateAvatarShape,
        habitSectionControl,
        updateHabitSectionControl,
        allowDockSectionSwitch,
        updateAllowDockSectionSwitch,
        // updateStickyHud removed
        // New exports
        notes,
        handleAddNote,
        handleUpdateSmartProject,
        badHabits,
        handleBadHabitConfirm,
        handleBadHabitRelapse,
        handleDeleteBadHabit,
        vividMode,
        setVividMode,
        updatePlayerLevel,
        updateAttributeLevel
    };
};
