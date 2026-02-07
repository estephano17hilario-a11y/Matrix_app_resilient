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
import { doc, setDoc, db, writeBatch } from '@/services/firebase';

import { useTheme } from '@/context/ThemeContext';

import { SmartProject } from '@/types/SmartGoal';

export const useDashboardLogic = () => {
    const { user: matrixUser, loading: matrixLoading } = useMatrix();
    const { profile: authProfile } = useAuth();

    // 🛡️ HYBRID SYNC: Combine Realtime Stream (Matrix) with Instant Updates (Auth)
    // This ensures Avatar changes are reflected immediately via refreshProfile()
    // while keeping stats synced via Firestore listeners.
    const user = useMemo(() => {
        if (!matrixUser) return null;
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

    // Sync Dashboard Style from User Profile
    useEffect(() => {
        if (user?.dashboardStyle) {
            setDashboardStyle(user.dashboardStyle);
        }
        if (user?.avatarShape) {
            setAvatarShape(user.avatarShape);
        }
    }, [user?.dashboardStyle, user?.avatarShape]);

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
                     const target = Math.ceil(totalHabits * 0.8);
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

        if (!user?.uid) return;
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
            const todayStr = today.toISOString().split('T')[0];
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

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
                    ? habit.history[habit.history.length - 1].split('T')[0] 
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
        setPlayer(prev => {
            let newXp = prev.xp + Math.floor(reward.xp);
            const newGold = prev.gold + Math.floor(reward.gold);
            let newLevel = prev.level;
            let newNextXp = prev.nextXp;
            
            if (reward.xp > 0) {
                while (newXp >= newNextXp) {
                    newXp -= newNextXp;
                    newLevel += 1;
                    newNextXp = calculateNextXp(newLevel);
                }
            } else {
                newXp = Math.max(0, newXp);
            }
            
            const newStats = { level: newLevel, xp: newXp, nextXp: newNextXp, gold: newGold };

            // PERSISTENCE: Save new stats to Firestore immediately
            // 🛡️ SKELETON PROTECTION: Don't save if we are in skeleton mode
            if (user?.uid && !user.isSkeleton) {
                setDoc(doc(db, 'users', user.uid), {
                    stats: {
                        level: newStats.level,
                        xp: newStats.xp,
                        gold: newStats.gold
                    }
                }, { merge: true }).catch(err => console.error("Error saving player stats:", err));
            }

            return newStats;
        });
    }, [calculateNextXp, user]);

    const addPlayerXp = useCallback((amount: number) => addPlayerReward({ xp: amount, gold: 0 }), [addPlayerReward]);
    const addPlayerGold = useCallback((amount: number) => addPlayerReward({ xp: 0, gold: amount }), [addPlayerReward]);

    const updateAttributeXp = useCallback((attrId: string, amount: number) => {
        setAttributes(prev => {
            const newAttributes = prev.map(attr => {
                if (attr.id === attrId) {
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
                    
                    // SAVE TO FIRESTORE
                    if (user?.uid && !user.isSkeleton) {
                        persistenceService.attributes.save(user.uid, updatedAttr);
                    }

                    return updatedAttr;
                }
                return attr;
            });
            return newAttributes;
        });
    }, [user?.uid]);

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
        
        const availableSeconds = Math.max(0, DAILY_LIMITS.FOCUS.MAX_SECONDS - currentLimits.focusSeconds);
        
        // If we want to be precise, we only reward the overlapping part.
        // But for simplicity, if they start within limit, we reward? 
        // Or we cap the reward to availableSeconds.
        const rewardableSeconds = Math.min(durationSeconds, availableSeconds);
        const rewardableMinutes = rewardableSeconds / 60;
        
        // Use Math.round to be more generous with short sessions/testing
        const xpReward = Math.round(rewardableMinutes * 10); 
        const goldReward = Math.round(rewardableMinutes * 2);

        let attrId = 'MENTAL';
        let multiplier = 1;
        if (projectId) {
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
                attrId = proj.attribute;
                multiplier = proj.impact;
                const newSession: Session = { id: Date.now().toString(), type, duration: durationSeconds, date: new Date().toISOString() };
                
                const updatedProject = { 
                    ...proj, 
                    totalTime: proj.totalTime + durationSeconds,
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
            focusSeconds: Number(currentLimits.focusSeconds || 0) + durationSeconds
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
        }
    }, [projects, attributes, updateAttributeXp, addNotification, spawnParticles, addPlayerReward, user, dailyLimits]);

    const completeQuest = useCallback((e: React.MouseEvent, quest: Quest) => { 
        e.stopPropagation();
        
        // LOCKING: Prevent double-execution from rapid clicks (Race Condition Fix)
        if (processingQuests.current.has(quest.id)) return;
        processingQuests.current.add(quest.id);
        setTimeout(() => {
            processingQuests.current.delete(quest.id);
        }, 500);

        if (quest.completed) {
            if(navigator.vibrate) navigator.vibrate(5);
            
            // Reversal: Use stored rewarded values if available, else fallback to potential reward (legacy)
            // INTEGRITY FIX: Always subtract what was actually given.
            const xpToRevert = quest.rewardedXp !== undefined ? quest.rewardedXp : quest.xpReward;
            const goldToRevert = quest.rewardedGold !== undefined ? quest.rewardedGold : (quest.gold || 0);
            
            // For Trait XP, we don't store it explicitly in Quest yet, but it's derived from XP. 
            // If rewardedXp was 0, traitXp should be 0.
            // Assumption: Trait XP is proportional to XP awarded.
            const traitXpToRevert = Math.floor(xpToRevert * 0.4); 
            
            // Update Daily Limits (Allow "Refund" of limit)
            setDailyLimits(prev => {
                const today = new Date().toISOString().split('T')[0];
                if (prev.date !== today) return prev; // Don't mess with limits if dates mismatch

                const newLimits = {
                    ...prev,
                    taskXp: Math.max(0, prev.taskXp - xpToRevert),
                    taskGold: Math.max(0, prev.taskGold - goldToRevert),
                    taskTraitPoints: Math.max(0, prev.taskTraitPoints - traitXpToRevert)
                };
                
                if (user?.uid) {
                    setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
                }
                return newLimits;
            });

            addPlayerReward({ xp: -xpToRevert, gold: -goldToRevert });
            updateAttributeXp(quest.attribute, -traitXpToRevert);
            
            // Clear rewarded fields on uncomplete
            const updatedQuest = { 
                ...quest, 
                completed: false, 
                rewardedXp: undefined, // undefined to remove field locally
                rewardedGold: undefined 
            };

            setQuests(prev => prev.map(q => q.id === quest.id ? updatedQuest : q));
            if (user?.uid) {
                // We set to 0 in DB to ensure we don't use old values if something goes wrong
                persistenceService.quests.update(user.uid, quest.id, { completed: false, rewardedXp: 0, rewardedGold: 0 });
            }
        } else {
            const attr = attributes.find(a => a.id === quest.attribute);
            const AttrIcon = attr?.icon || Star;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top, attr?.color || '#fff', AttrIcon, 'icon', 'profile-avatar-target');
            if(navigator.vibrate) navigator.vibrate(10); 
            
            // Rewards Calculation
            const rawXp = quest.xpReward;
            const rawGold = quest.gold || 0;
            const rawTraitXp = Math.floor(rawXp * 0.4);

            // CHECK LIMITS
            const today = new Date().toISOString().split('T')[0];
            let currentLimits = dailyLimits;
            
            // Reset if needed (failsafe)
            if (currentLimits.date !== today) {
                currentLimits = { 
                    date: today, 
                    taskXp: 0, 
                    taskGold: 0, 
                    taskTraitPoints: 0,
                    habitsCompleted: 0,
                    focusSeconds: 0 
                };
            }

            const availableXp = Math.max(0, DAILY_LIMITS.TASKS.XP - currentLimits.taskXp);
            const availableGold = Math.max(0, DAILY_LIMITS.TASKS.GOLD - currentLimits.taskGold);
            const availableTraitXp = Math.max(0, DAILY_LIMITS.TASKS.TRAIT_POINTS - currentLimits.taskTraitPoints);

            const xpToAward = Math.min(rawXp, availableXp);
            const goldToAward = Math.min(rawGold, availableGold);
            const traitXpToAward = Math.min(rawTraitXp, availableTraitXp);

            // Update Limits State & Persistence
            const newLimits = {
                ...currentLimits,
                taskXp: currentLimits.taskXp + xpToAward,
                taskGold: currentLimits.taskGold + goldToAward,
                taskTraitPoints: currentLimits.taskTraitPoints + traitXpToAward
            };
            setDailyLimits(newLimits);
            if (user?.uid) {
                 setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
            }

            addPlayerReward({ xp: xpToAward, gold: goldToAward });
            updateAttributeXp(quest.attribute, traitXpToAward); 

            // INTEGRITY: Store what was actually awarded
            const updatedQuest = { 
                ...quest, 
                completed: true,
                rewardedXp: xpToAward,
                rewardedGold: goldToAward
            };

            setQuests(prev => prev.map(q => q.id === quest.id ? updatedQuest : q));

            if (user?.uid) {
                persistenceService.quests.update(user.uid, quest.id, { 
                    completed: true,
                    rewardedXp: xpToAward,
                    rewardedGold: goldToAward
                });
            }
        }
    }, [attributes, spawnParticles, updateAttributeXp, addPlayerReward, user, dailyLimits]);

    const handleHabitClick = useCallback((e: React.MouseEvent, habit: Habit) => {
        e.stopPropagation();
        if (habit.completedToday) {
            if(navigator.vibrate) navigator.vibrate(5);
            
            const rewardXp = 20 + ((habit.streak - 1) * 2); 
            addPlayerReward({ xp: -rewardXp, gold: 0 });
            updateAttributeXp(habit.attribute, -rewardXp);
            
            setHabits(prev => prev.map(h => { 
                if (h.id === habit.id) { 
                    // Remove today from history if exists
                    const todayStr = new Date().toISOString().split('T')[0];
                    const newHistory = (h.history || []).filter(d => !d.startsWith(todayStr));
                    
                    return { 
                        ...h, 
                        completedToday: false, 
                        streak: Math.max(0, h.streak - 1), 
                        totalCompletions: Math.max(0, h.totalCompletions - 1),
                        history: newHistory
                    }; 
                } 
                return h; 
            }));
            
            if (user?.uid) {
                // We can't easily update array via partial update in this mock service structure 
                // without sending the whole array, assuming .update handles merge.
                // ideally we fetch the fresh history but here we just send the new state.
                const todayStr = new Date().toISOString().split('T')[0];
                const newHistory = (habit.history || []).filter(d => !d.startsWith(todayStr));

                persistenceService.habits.update(user.uid, habit.id, { 
                    completedToday: false, 
                    streak: Math.max(0, habit.streak - 1), 
                    totalCompletions: Math.max(0, habit.totalCompletions - 1),
                    history: newHistory
                });
            }
            return;
        }
        if (habit.type === 'SIMPLE' || habit.type === 'BOOLEAN') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fff', Flame, 'fire');
            if(navigator.vibrate) navigator.vibrate([5, 20, 5]); 
            
            // CHECK LIMITS
            const today = new Date().toISOString().split('T')[0];
            let currentLimits = dailyLimits;
            if (currentLimits.date !== today) {
                currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
            }

            const habitsDone = currentLimits.habitsCompleted || 0;
            const isRewardable = habitsDone < DAILY_LIMITS.HABITS.MAX_COUNT;
            
            let rewardXp = 20 + (habit.streak * 2);
            if (habit.estimatedTime && habit.estimatedTime > 0) {
                const timeMultiplier = Math.min(0.5, (habit.estimatedTime / 30) * 0.1);
                rewardXp = Math.floor(rewardXp * (1 + timeMultiplier));
            }
            
            if (!isRewardable) rewardXp = 0;

            if (isRewardable) {
                addPlayerReward({ xp: rewardXp, gold: 0 }); 
                updateAttributeXp(habit.attribute, rewardXp);
                
                // Update Limits
                const newLimits = { ...currentLimits, habitsCompleted: habitsDone + 1 };
                setDailyLimits(newLimits);
                if (user?.uid) {
                    setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
                }
            } else {
                addNotification({ type: 'SYSTEM', label: 'LIMIT REACHED', fromLevel: '10/10', toLevel: 'No XP', icon: InfinityIcon, color: '#ef4444' });
            }
            
            const todayISO = new Date().toISOString();

            setHabits(prev => prev.map(h => { 
                if (h.id === habit.id) { 
                    return { 
                        ...h, 
                        completedToday: true, 
                        streak: h.streak + 1, 
                        totalCompletions: h.totalCompletions + 1,
                        history: [...(h.history || []), todayISO]
                    }; 
                } 
                return h; 
            }));

            if (user?.uid) {
                persistenceService.habits.update(user.uid, habit.id, { 
                    completedToday: true, 
                    streak: habit.streak + 1, 
                    totalCompletions: habit.totalCompletions + 1,
                    history: [...(habit.history || []), todayISO]
                });
            }
        } else {
            setValidationHabit(habit); setValTempValue('0');
        }
    }, [spawnParticles, updateAttributeXp, addPlayerReward, user, dailyLimits]);

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

        const todayISO = new Date().toISOString();

        setHabits(prev => prev.map(h => {
            if (h.id === validationHabit.id) {
                if (isComplete) {
                    return { 
                        ...h, 
                        completedToday: true, 
                        streak: h.streak + 1, 
                        totalCompletions: h.totalCompletions + 1, 
                        currentValue: newCurrentValue,
                        history: [...(h.history || []), todayISO]
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
                    history: [...(validationHabit.history || []), todayISO]
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
                gold: 0,
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
        setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...data } as Habit : h));
        if (user?.uid) {
            persistenceService.habits.update(user.uid, habitId, data as Habit).catch((error) => {
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
        const isCompleted = history.some(d => d.startsWith(date));
        
        let newHistory;
        if (isCompleted) {
            newHistory = history.filter(d => !d.startsWith(date));
        } else {
            const d = new Date(date);
            const iso = !isNaN(d.getTime()) ? d.toISOString() : date;
            newHistory = [...history, iso];
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
