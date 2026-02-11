import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMatrix } from '@/context/MatrixContext';
import { useAuth } from '@/context/AuthContext';
import { checkAchievements } from '@/services/achievementListener';
import { Achievement } from '@/config/achievements';
import { Trophy, Flame, Clock, Star, Infinity as InfinityIcon, Skull } from 'lucide-react';
import { 
  Attribute, Quest, Habit, Project, BadHabit,
  NotificationItem, Particle, Session 
} from '@/types';
import { DailyLimits } from '@/types/User';
import { TRAITS_LIST, DAILY_LIMITS } from '../constants';
import { FREE_LIMITS } from '@/config/limits';
import { projectService } from '@/services/projectService';
import { persistenceService } from '@/services/persistenceService';
import { PersistenceService } from '@/services/persistence';
import { doc, setDoc, db, writeBatch } from '@/services/firebase';
import { calculateTaskRewards } from '@/utils/rewardCalculator';

import { toLocalISOString, getHistoryDateKey } from '../../../utils/dateUtils';

import { useTheme } from '@/context/ThemeContext';

import { SmartProject } from '@/types/SmartGoal';

export const useDashboardLogic = () => {
    const { user: matrixUser, loading: matrixLoading } = useMatrix();
    const { profile: authProfile } = useAuth();

    // 🛡️ HYBRID SYNC: Combine Realtime Stream (Matrix) with Instant Updates (Auth)
    // This ensures Avatar changes are reflected immediately via refreshProfile()
    // while keeping stats synced via Firestore listeners.
    const user = useMemo(() => {
        if (!matrixUser) return authProfile || null;
        if (!authProfile) return matrixUser;
        
        // If UIDs match, merge carefully
        if (matrixUser.uid === authProfile.uid) {
            return {
                ...matrixUser,
                // Prefer Auth Profile for Identity fields (updated via Settings)
                avatarId: authProfile.avatarId || matrixUser.avatarId,
                displayName: authProfile.displayName || matrixUser.displayName,
                // Prefer Matrix for Game Stats (updated via Game Loop)
                stats: matrixUser.stats
            };
        }
        return matrixUser;
    }, [matrixUser, authProfile]);

    const { theme: currentTheme, setTheme: setCurrentTheme, vividMode, setVividMode } = useTheme(); // Use ThemeContext instead of local state
    const [lastAchievement, setLastAchievement] = useState<Achievement | null>(null);

    const [currentView, setCurrentView] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('matrix_last_view') || 'TASKS';
        }
        return 'TASKS';
    });

    // Persist View
    useEffect(() => {
        if (currentView) {
            localStorage.setItem('matrix_last_view', currentView);
        }
    }, [currentView]);

    const [isDockOpen, setIsDockOpen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false); 
    const [isNoteTaking, setIsNoteTaking] = useState(false); 
    const [overrideBgColor, setOverrideBgColor] = useState<string | undefined>(undefined);
    const [showProfile, setShowProfile] = useState(true);
    const [defaultChartMode, setDefaultChartMode] = useState<'RADAR' | 'BAR'>('RADAR');
    const [dashboardStyle, setDashboardStyle] = useState<'BORDER' | 'LIQUID'>('BORDER');
    const [avatarShape, setAvatarShape] = useState<'CIRCLE' | 'SQUARE'>('CIRCLE');
    const [habitSectionControl, setHabitSectionControl] = useState<'VISIBLE' | 'HIDDEN'>('VISIBLE');
    const [allowDockSectionSwitch, setAllowDockSectionSwitch] = useState<boolean>(true);

    const updateDashboardStyle = useCallback(async (style: 'BORDER' | 'LIQUID') => {
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
    }, [user?.dashboardStyle, user?.avatarShape, user?.habitSectionControl, user?.allowDockSectionSwitch]);

    const [player, setPlayer] = useState({ level: 1, xp: 0, nextXp: 500, gold: 0 });
    const prevPlayerLevel = useRef(player.level);
    const [health, setHealth] = useState(100);
    const [dailyLimits, setDailyLimits] = useState<DailyLimits>({
        date: new Date().toISOString().split('T')[0],
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

    // --- SYNC WITH MATRIX CORE (Optimized for Optimistic UI) ---
    // We track the last known server stats to distinguish between:
    // 1. Our own optimistic updates (Local changes, Server stale) -> IGNORE Server
    // 2. External updates (Server changes) -> SYNC Local
    const lastServerStats = useRef<{xp: number, level: number, gold: number, hp: number} | null>(null);

    // Helper for XP Curve
    const calculateNextXp = useCallback((level: number) => {
        return Math.floor(500 * Math.pow(1.2, level - 1));
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
                    const today = new Date().toISOString().split('T')[0];
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
                            date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0, totalXp: 0, totalGold: 0, totalTraitPoints: 0
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

        const cached = PersistenceService.getProfile();
        if (!cached || cached.uid !== user.uid) return;

        const updatedProfile = {
            ...cached,
            stats: {
                ...cached.stats,
                xp: player.xp,
                gold: player.gold,
                level: player.level
            }
        };

        PersistenceService.saveProfile(updatedProfile);
    }, [player.xp, player.gold, player.level, player.nextXp, user?.uid, user?.isSkeleton]);




    // --- DAILY RESET & PENALTY LOGIC ---
    useEffect(() => {
        if (!user?.uid || !areHabitsLoaded || isDailyCheckDone) return;
        if (user.isSkeleton) return; // 🛡️ SKELETON PROTECTION

        const processDailyReset = async () => {
            const today = new Date().toISOString().split('T')[0];
            const lastDate = dailyLimits.date || today;

            if (lastDate !== today) {
                console.log(`[DAILY RESET] Processing transition from ${lastDate} to ${today}`);
                
                // 1. Calculate Penalty based on CURRENT habits (previous day's state)
                const totalHabits = habits.length;
                let damage = 0;
                
                if (totalHabits > 0) {
                     const target = Math.ceil(totalHabits * 0.75);
                     const completed = habits.filter(h => h.completedToday).length;
                     
                     if (completed < target) {
                         // Formula: (Target - Completed) * 3
                         const deficit = target - completed;
                         damage = deficit * 3;
                     }
                }

                // 2. Prepare Batch
                const batch = writeBatch(db);
                const userRef = doc(db, 'users', user.uid);

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
                const resetHabits = habits.map(h => {
                    if (!h.completedToday) return h; 
                    return { ...h, completedToday: false };
                });
                
                habits.forEach(h => {
                    if (h.completedToday) {
                         const habitRef = doc(db, 'users', user.uid, 'habits', h.id);
                         batch.update(habitRef as any, { completedToday: false });
                    }
                });

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
                    totalTraitPoints: 0
                };
                batch.update(userRef as any, { dailyLimits: newLimits });

                try {
                    await batch.commit();
                    console.log("[DAILY RESET] Batch committed successfully.");
                    
                    if (damage > 0) setHealth(newHealth);
                    setHabits(resetHabits);
                    setDailyLimits(newLimits);
                    
                } catch (e) {
                    console.error("[DAILY RESET] Failed:", e);
                }
            }
            
            setIsDailyCheckDone(true);
        };

        processDailyReset();
    }, [user?.uid, areHabitsLoaded, isDailyCheckDone, dailyLimits.date]);

    const [attributes, setAttributes] = useState<Attribute[]>(() => 
        // Start with empty or loading state ideally, but for now defaults to prevent hydration mismatch if needed.
        // Actually, let's start with defaults to be safe, but we will overwrite.
        TRAITS_LIST.map(t => ({
            id: t.id, label: t.label, level: 1, xp: 0, maxXp: 100, color: t.color, icon: t.icon
        }))
    ); 
    const prevAttributes = useRef(attributes);
    const [areAttributesLoaded, setAreAttributesLoaded] = useState(false);

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
        if (user?.uid) {
            projectService.getUserProjects(user.uid).then(setProjects);
            // Load other data
            persistenceService.quests.getAll(user.uid).then(setQuests);
            persistenceService.habits.getAll(user.uid).then(h => {
                setHabits(h);
                setAreHabitsLoaded(true);
            });
            persistenceService.badHabits.getAll(user.uid).then(setBadHabits);
            persistenceService.smartProjects.getAll(user.uid).then(setSmartProjects);
            persistenceService.attributes.getAll(user.uid).then(fetchedAttrs => {
                if (fetchedAttrs.length > 0) {
                     // If we have saved attributes, use ONLY those.
                     const enriched = fetchedAttrs.map(attr => {
                        const def = TRAITS_LIST.find(t => t.id === attr.id);
                        return { ...attr, icon: def?.icon, color: def?.color || attr.color, label: def?.label || attr.label };
                     });
                     setAttributes(enriched);
                } else {
                    // Fallback: If no attributes saved (legacy user), keep showing all defaults
                    // This ensures we don't break existing users.
                    // New users coming from Onboarding will have 5 saved, so they will hit the 'if' block.
                    console.log("No attributes found in DB, using defaults.");
                }
                setAreAttributesLoaded(true);
            });
        }
    }, [user?.uid]);

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

        const newAttr: Attribute = {
            id: def.id,
            label: def.label,
            level: 1,
            xp: 0,
            maxXp: 100,
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
        
        // Optimistic update
        setAttributes(prev => prev.filter(a => a.id !== traitId));

        // Delete from DB
        await persistenceService.attributes.delete(user.uid, traitId);
    };

    // --- AUTO-SAVE SETTINGS ---
    useEffect(() => {
        if (user?.uid) {
             persistenceService.settings.save(user.uid, { theme: currentTheme, showProfile, defaultChartMode });
        }
    }, [currentTheme, showProfile, defaultChartMode, user?.uid]);

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
                    changed = true;
                }

                // 2. Check for broken streak
                // If not completed today AND not completed yesterday AND not frozen -> Reset Streak
                // We trust 'streak' value, but we must verify it matches history continuity?
                // For simplicity: If we missed yesterday, streak breaks.
                
                // If last completion was BEFORE yesterday (e.g. 2 days ago), streak should be 0.
                if (habit.streak > 0 && lastCompletion && lastCompletion < yesterdayStr) {
                    if (!isFrozen) {
                        newItem.streak = 0;
                        changed = true;
                        console.log(`[Streak] Broken for ${habit.title}. Last: ${lastCompletion}`);
                    } else {
                        console.log(`[Streak] Protected by Freeze for ${habit.title}`);
                    }
                }

                if (changed) {
                    hasChanges = true;
                    // Persist individual updates
                    persistenceService.habits.update(user.uid, habit.id, { 
                        completedToday: newItem.completedToday,
                        streak: newItem.streak
                    });
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
    }, [habits.length, user?.uid, user?.stats?.streakFrozenUntil]); // Only run when count changes or user changes

        
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [validationHabit, setValidationHabit] = useState<Habit | null>(null);
    const [valTempValue, setValTempValue] = useState('');

    const handleFocusModeChange = useCallback((attrId: string | null) => {
        if (attrId) {
            const attr = attributes.find(a => a.id === attrId);
            if (attr) {
                setOverrideBgColor(attr.color);
                setIsFocusMode(true);
            }
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
        // We also wait for matrixLoading to be false to ensure we have the real level from DB
        if (isFirstLoad.current || matrixLoading) {
            if (!matrixLoading && user?.stats) {
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
    }, [player.level, addNotification, matrixLoading, user]);

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


    // --- UNIFIED REWARD SYSTEM ---
    const addPlayerReward = useCallback((reward: { xp: number; gold: number }) => {
        // Use current player state from scope (dependency) to allow side effects outside updater
        let newXp = player.xp + Math.floor(reward.xp);
        const newGold = player.gold + Math.floor(reward.gold);
        let newLevel = player.level;
        let newNextXp = player.nextXp;
        
        if (reward.xp > 0) {
            while (newXp >= newNextXp) {
                newXp -= newNextXp;
                newLevel += 1;
                newNextXp = calculateNextXp(newLevel);
            }
        } else {
             // Reversal logic
             newXp = Math.max(0, newXp);
        }
        
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
        // LIMIT CHECK
        const today = new Date().toISOString().split('T')[0];
        let currentLimits = dailyLimits;
        if (currentLimits.date !== today) {
             currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
        }

        // REWARD CALCULATION FIX
        // Base: 10 XP per minute, 2 Gold per minute (Matches FocusView simulation)
        
        // Apply Limits (Max 12 hours per day)
        // We track total focus time, but we don't strictly cap rewards if the user is being productive, 
        // OR we enforce the 12h limit as requested.
        // User said: "solo las primeras 12 horas al dia se veran recompensados" (from context or previous knowledge, implicit in code)
        // existing code had: Math.max(0, DAILY_LIMITS.FOCUS.MAX_SECONDS - currentLimits.focusSeconds);
        
        const safeDurationSeconds = Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0;
        const safeFocusSeconds = Number.isFinite(currentLimits.focusSeconds) ? Number(currentLimits.focusSeconds) : 0;
        const availableSeconds = Math.max(0, DAILY_LIMITS.FOCUS.MAX_SECONDS - safeFocusSeconds);
        
        // If we want to be precise, we only reward the overlapping part.
        // But for simplicity, if they start within limit, we reward? 
        // Or we cap the reward to availableSeconds.
        const rewardableSeconds = Math.min(safeDurationSeconds, availableSeconds);
        const rewardableMinutes = rewardableSeconds / 60;
        
        // Use Math.round to be more generous with short sessions/testing
        let xpReward = Math.round(rewardableMinutes * 10); 
        let goldReward = Math.round(rewardableMinutes * 2);
        if (!Number.isFinite(xpReward)) xpReward = 0;
        if (!Number.isFinite(goldReward)) goldReward = 0;

        let attrId = 'MENTAL';
        let multiplier = 1;
        if (projectId) {
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
                attrId = proj.attribute;
                multiplier = proj.impact;
                const newSession: Session = { id: Date.now().toString(), type, duration: safeDurationSeconds, date: new Date().toISOString() };
                
                const updatedProject = { 
                    ...proj, 
                    totalTime: proj.totalTime + safeDurationSeconds,
                    sessions: [newSession, ...(proj.sessions || [])]
                };

                setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));

                if (user?.uid) {
                    projectService.saveProject(user.uid, updatedProject);
                }
            }
        }
        
        const finalXp = Math.floor(xpReward * multiplier);
        const finalGold = Math.floor(goldReward * multiplier); // Multiplier usually applies to XP? Let's apply to both or just XP. 
        // Usually impact is for XP. Gold might be constant. Let's keep gold constant to avoid inflation?
        // Code had: const totalReward = Math.floor(baseReward * multiplier);
        // Let's apply to XP.
        
        // Update Limits
        const newLimits = {
            ...currentLimits,
            focusSeconds: safeFocusSeconds + safeDurationSeconds
        };

        setDailyLimits(newLimits);
        if (user?.uid) {
            setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
        }

        if (finalXp > 0 || finalGold > 0) {
            addPlayerReward({ xp: finalXp, gold: finalGold });
            updateAttributeXp(attrId, finalXp);
            const attr = attributes.find(a => a.id === attrId);
            const AttrIcon = attr?.icon || Star;
            spawnParticles(window.innerWidth / 2, window.innerHeight / 2, attr?.color || '#fff', AttrIcon);
            addNotification({ type: 'SESSION', label: 'FOCUS COMPLETE', fromLevel: Math.floor(durationSeconds / 60) + 'm', toLevel: '+' + finalXp + ' XP', icon: Clock, color: '#fbbf24' });
        } else if (safeDurationSeconds > 0) {
            addNotification({ type: 'SYSTEM', label: 'LIMIT REACHED', fromLevel: Math.floor(safeDurationSeconds / 60) + 'm', toLevel: 'No XP', icon: InfinityIcon, color: '#ef4444' });
        }
    }, [projects, attributes, updateAttributeXp, addNotification, spawnParticles, addPlayerReward, user, dailyLimits]);

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
        const calculatedReward = calculateTaskRewards(quest.difficulty, quest.deadline, quest.estimatedTime);
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
            const today = new Date().toISOString().split('T')[0];
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

        // OPTIMISTIC UI
        setQuests(prev => prev.map(q => q.id === quest.id ? newQuest : q));

        if (!userId) {
            if (rewardXp !== 0 || rewardGold !== 0) {
                let newXp = player.xp + rewardXp;
                let newGold = player.gold + rewardGold;
                let newLevel = player.level;
                let newNextXp = player.nextXp;

                if (rewardXp > 0) {
                    while (newXp >= newNextXp) {
                        newXp -= newNextXp;
                        newLevel += 1;
                        newNextXp = calculateNextXp(newLevel);
                    }
                } else {
                    newXp = Math.max(0, newXp);
                }

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
                const today = new Date().toISOString().split('T')[0];
                let currentLimits = dailyLimits;
                if (currentLimits.date !== today) {
                    currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
                }
                const newLimits = {
                    ...currentLimits,
                    taskXp: currentLimits.taskXp + Math.max(0, rewardXp),
                    taskGold: currentLimits.taskGold + Math.max(0, rewardGold),
                    taskTraitPoints: currentLimits.taskTraitPoints + Math.max(0, rewardTraitXp)
                };
                setDailyLimits(newLimits);
            } else {
                const today = new Date().toISOString().split('T')[0];
                if (dailyLimits.date === today) {
                    const newLimits = {
                        ...dailyLimits,
                        taskXp: Math.max(0, dailyLimits.taskXp + rewardXp),
                        taskGold: Math.max(0, dailyLimits.taskGold + rewardGold),
                        taskTraitPoints: Math.max(0, dailyLimits.taskTraitPoints + rewardTraitXp)
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
                 let newLevel = player.level;
                 let newNextXp = player.nextXp;

                 if (rewardXp > 0) {
                    while (newXp >= newNextXp) {
                        newXp -= newNextXp;
                        newLevel += 1;
                        newNextXp = calculateNextXp(newLevel);
                    }
                } else {
                     newXp = Math.max(0, newXp);
                }
                
                setPlayer(prev => ({ ...prev, xp: newXp, gold: newGold, level: newLevel, nextXp: newNextXp }));
                batch.update(userRef, { 'stats.xp': newXp, 'stats.gold': newGold, 'stats.level': newLevel, 'stats.nextXp': newNextXp });
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
                 }
            }

            // D. Update Limits
            if (!isReversal) {
                 const today = new Date().toISOString().split('T')[0];
                 let currentLimits = dailyLimits;
                 if (currentLimits.date !== today) {
                    currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
                }
                const newLimits = {
                    ...currentLimits,
                    taskXp: currentLimits.taskXp + Math.max(0, rewardXp),
                    taskGold: currentLimits.taskGold + Math.max(0, rewardGold),
                    taskTraitPoints: currentLimits.taskTraitPoints + Math.max(0, rewardTraitXp)
                };
                setDailyLimits(newLimits);
                batch.update(userRef, { dailyLimits: newLimits });
            } else {
                 // Revert Limits
                 const today = new Date().toISOString().split('T')[0];
                 if (dailyLimits.date === today) {
                      const newLimits = {
                        ...dailyLimits,
                        taskXp: Math.max(0, dailyLimits.taskXp + rewardXp), // rewardXp is negative
                        taskGold: Math.max(0, dailyLimits.taskGold + rewardGold),
                        taskTraitPoints: Math.max(0, dailyLimits.taskTraitPoints + rewardTraitXp)
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
        const today = new Date().toISOString().split('T')[0];
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
            if (habit.estimatedTime && habit.estimatedTime > 0) {
                const timeMultiplier = Math.min(0.5, (habit.estimatedTime / 30) * 0.1);
                baseRevert = Math.floor(baseRevert * (1 + timeMultiplier));
            }

            rewardXp = -baseRevert; // Subtract EXACTLY what was given
            rewardGold = -2; // Revert Gold
            
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
                if (habit.estimatedTime && habit.estimatedTime > 0) {
                    const timeMultiplier = Math.min(0.5, (habit.estimatedTime / 30) * 0.1);
                    baseReward = Math.floor(baseReward * (1 + timeMultiplier));
                }
                rewardXp = baseReward;
                rewardGold = 2; // Base Gold Reward
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
            if (rewardXp !== 0 || rewardGold !== 0) {
                let newXp = player.xp + rewardXp;
                let newGold = player.gold + rewardGold;
                let newLevel = player.level;
                let newNextXp = player.nextXp;
                
                if (rewardXp > 0) {
                    while (newXp >= newNextXp) {
                        newXp -= newNextXp;
                        newLevel += 1;
                        newNextXp = calculateNextXp(newLevel);
                    }
                } else {
                    newXp = Math.max(0, newXp);
                }

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
            }

            return;
        }

        // 4. ATOMIC BATCH WRITE
        try {
            const batch = writeBatch(db);
            const userRef = doc(db, 'users', userId);
            const habitRef = doc(db, 'users', userId, 'habits', habit.id);

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
                let newLevel = player.level;
                let newNextXp = player.nextXp;
                
                if (rewardXp > 0) {
                     while (newXp >= newNextXp) {
                        newXp -= newNextXp;
                        newLevel += 1;
                        newNextXp = calculateNextXp(newLevel);
                    }
                } else {
                     newXp = Math.max(0, newXp);
                }

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
                        // Simple Reversal Logic for Attributes (Approximate)
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
            const today = new Date().toISOString().split('T')[0];
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
        setHabits(prev => prev.filter(h => h.id !== habitId));
        try {
            await persistenceService.habits.delete(user.uid, habitId);
        } catch (error) {
            console.error("Error deleting habit:", error);
        }
    }, [user]);

    const handleProjectConfirm = useCallback(async (projectData: Partial<Project>) => {
        // LIMIT CHECK: Projects
        if (user?.plan !== 'PRO') {
            // Filter out deleted projects for the limit check
            const activeProjects = projects.filter(p => !p.deleted);
            if (!projectData.id && activeProjects.length >= FREE_LIMITS.PROJECTS) {
                setActiveModal('PRO');
                return;
            }
        }

        const project: Project = projectData.id
            ? projectData as Project
            : {
                id: Date.now().toString(),
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
                ...projectData
            } as Project;

        setProjects(prev => {
            const exists = prev.find(p => p.id === project.id);
            if (exists) return prev.map(p => p.id === project.id ? project : p);
            return [...prev, project];
        });
        
        if (user) {
            await projectService.saveProject(user.uid, project);
        }
        setActiveModal(null);
    }, [user, projects]);

    const handleDeleteProject = useCallback(async (projectId: string) => {
        if (!user) return;
        setProjects(prev => prev.filter(p => p.id !== projectId));
        try {
            await projectService.deleteProject(user.uid, projectId);
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    }, [user]);

    const handleUpdateProject = useCallback((updatedProject: Project) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        if (user?.uid) {
            projectService.saveProject(user.uid, updatedProject);
        }
    }, [user]);

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
        setSmartProjects(prev => prev.map(p => p.id === project.id ? project : p));
        if (user?.uid) {
             await persistenceService.smartProjects.save(user.uid, project);
        }
    }, [user?.uid]);

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

        setBadHabits(prev => {
            const exists = prev.find(h => h.id === badHabit.id);
            if (exists) return prev.map(h => h.id === badHabit.id ? badHabit : h);
            return [...prev, badHabit];
        });

        await persistenceService.badHabits.save(user.uid, badHabit);
        setActiveModal(null);
    }, [user?.uid, addNotification, spawnParticles]);

    const handleBadHabitRelapse = useCallback(async (habit: BadHabit, paymentMethod: 'GOLD' | 'HP') => {
        if (!user?.uid) return;

        const penalty = habit.penalties;
        const today = new Date().toISOString();

        if (paymentMethod === 'GOLD') {
             addPlayerGold(-penalty.gold);
        } else {
            const newHealth = Math.max(0, health - penalty.hp);
            setHealth(newHealth);
            
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

        setBadHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit : h));
        await persistenceService.badHabits.save(user.uid, updatedHabit);

    }, [user?.uid, health, addPlayerGold, addPlayerReward]);

    const handleDeleteBadHabit = useCallback(async (id: string) => {
        if (!user?.uid) return;
        setBadHabits(prev => prev.filter(h => h.id !== id));
        await persistenceService.badHabits.delete(user.uid, id);
    }, [user?.uid]);

    return {
        user,
        matrixLoading,
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
