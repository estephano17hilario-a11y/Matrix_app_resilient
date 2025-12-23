import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatrix } from '../../../context/MatrixContext';
import { checkAchievements } from '../../../services/achievementListener';
import { Achievement } from '../../../config/achievements';
import { Trophy, Flame, Clock, Star, Infinity as InfinityIcon } from 'lucide-react';
import { 
  Attribute, Quest, Habit, Project, Note,
  NotificationItem, Particle, Session 
} from '../../../types';
import { DailyLimits } from '../../../types/User';
import { TRAITS_LIST, DAILY_LIMITS } from '../constants';
import { FREE_LIMITS } from '../../../config/limits';
import { completeTaskTransaction } from '../../../services/gameService';
import { projectService } from '../../../services/projectService';
import { persistenceService } from '../../../services/persistenceService';
import { RewardPrediction } from '../../../utils/rewardCalculator';
import { doc, setDoc, db, writeBatch } from '../../../services/firebase';

import { useTheme } from '../../../context/ThemeContext';

import { SmartProject, StrategicNode } from '../../../types/SmartGoal';
import { calculateStreak, toLocalISOString } from '../../../utils/dateUtils';

export const useDashboardLogic = () => {
    const { user, loading: matrixLoading } = useMatrix();
    const { theme: currentTheme, setTheme: setCurrentTheme } = useTheme(); // Use ThemeContext instead of local state
    const [lastAchievement, setLastAchievement] = useState<Achievement | null>(null);

    const [currentView, setCurrentView] = useState('TASKS');
    const [isDockOpen, setIsDockOpen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false); 
    const [isNoteTaking, setIsNoteTaking] = useState(false); 
    const [overrideBgColor, setOverrideBgColor] = useState<string | undefined>(undefined);
    const [showProfile, setShowProfile] = useState(true);
    const [defaultChartMode, setDefaultChartMode] = useState<'RADAR' | 'BAR'>('RADAR');
    const [dashboardStyle, setDashboardStyle] = useState<'BORDER' | 'LIQUID'>('BORDER');

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

    // Sync Dashboard Style from User Profile
    useEffect(() => {
        if (user?.dashboardStyle) {
            setDashboardStyle(user.dashboardStyle);
        }
    }, [user?.dashboardStyle]);

    const [player, setPlayer] = useState({ level: 1, xp: 0, nextXp: 500, gold: 0, availableTraitPoints: 0 });
    const prevPlayerLevel = useRef(player.level);
    const [health, setHealth] = useState(100);
    const [dailyLimits, setDailyLimits] = useState<DailyLimits>({
        date: new Date().toISOString().split('T')[0],
        taskXp: 0,
        taskGold: 0,
        taskTraitPoints: 0,
        habitsCompleted: 0,
        focusSeconds: 0
    });
    
    // Data States
    const [quests, setQuests] = useState<Quest[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [areHabitsLoaded, setAreHabitsLoaded] = useState(false);
    const [isDailyCheckDone, setIsDailyCheckDone] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [smartProjects, setSmartProjects] = useState<SmartProject[]>([]);

    // --- SYNC WITH MATRIX CORE (Optimized for Optimistic UI) ---
    // We track the last known server stats to distinguish between:
    // 1. Our own optimistic updates (Local changes, Server stale) -> IGNORE Server
    // 2. External updates (Server changes) -> SYNC Local
    const lastServerStats = useRef<{xp: number, level: number, gold: number, hp: number} | null>(null);

    // Helper for XP Curve (Quadratic Matrix Growth Algorithm)
    const calculateNextXp = useCallback((level: number) => {
        // Formula: 2500 + (level * 120) + (level^2 * 4)
        // Precisely tuned for: L5: 2 days, L10: 5 days, L100: 13 months
        return Math.floor(2500 + (level * 120) + (Math.pow(level, 2) * 4));
    }, []);

    useEffect(() => {
        if (user && user.stats) {
            const serverStats = user.stats;
            const currentLast = lastServerStats.current;

            // Check if Server has NEW information compared to what we last saw from it
            const hasServerChanged = !currentLast || 
                serverStats.xp !== currentLast.xp ||
                serverStats.level !== currentLast.level ||
                serverStats.gold !== currentLast.gold ||
                serverStats.hp !== currentLast.hp;

            if (hasServerChanged) {
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

                    // Sync Trait Points
                    if (!currentLast || (serverStats as any).availableTraitPoints !== (currentLast as any).availableTraitPoints) {
                        newPlayer.availableTraitPoints = (serverStats as any).availableTraitPoints || 0;
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
                        setDailyLimits(user.dailyLimits);
                    } else {
                        // Reset if server date is old (or just keep default today if we already reset)
                        // Actually, if server has old date, we should probably update server? 
                        // But we do that lazily on first action.
                        // Here we just ensure local state is correct for TODAY.
                         setDailyLimits(prev => prev.date === today ? prev : { 
                            date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0
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
                    batch.update(userRef, { 
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
                         batch.update(habitRef, { completedToday: false });
                    }
                });

                // 5. Update Daily Limits Date
                const newLimits: DailyLimits = {
                    date: today,
                    taskXp: 0,
                    taskGold: 0,
                    taskTraitPoints: 0,
                    habitsCompleted: 0,
                    focusSeconds: 0
                };
                batch.update(userRef, { dailyLimits: newLimits });

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
            if (user && player.xp > 0) {
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
            persistenceService.notes.getAll(user.uid).then(setNotes);
            persistenceService.habits.getAll(user.uid).then(h => {
                setHabits(h);
                setAreHabitsLoaded(true);
            });
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
                let newItem = { ...habit };
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
    const addPlayerReward = useCallback((reward: { xp: number; gold: number; traitPoints?: number; attributeId?: string }) => {
        // 1. Account XP & Gold
        setPlayer(prev => {
            let newXp = prev.xp + Math.floor(reward.xp);
            let newGold = prev.gold + Math.floor(reward.gold);
            
            let newLevel = prev.level;
            let newNextXp = prev.nextXp;
            
            if (reward.xp > 0) {
                while (newXp >= newNextXp) {
                    newXp -= newNextXp;
                    newLevel += 1;
                    newNextXp = calculateNextXp(newLevel);
                }
            } else if (reward.xp < 0) {
                // Support for undoing rewards, but don't let XP drop below 0
                newXp = Math.max(0, newXp + reward.xp); 
            }
            
            const newStats = { 
                level: newLevel, 
                xp: newXp, 
                nextXp: newNextXp, 
                gold: newGold,
                availableTraitPoints: prev.availableTraitPoints
            };

            // PERSISTENCE: Save new stats to Firestore immediately
            if (user?.uid) {
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

        // 2. Trait XP (Direct to Attribute)
        if (reward.attributeId && reward.traitPoints && reward.traitPoints > 0) {
            setAttributes(prevAttrs => {
                const updatedAttrs = prevAttrs.map(attr => {
                    if (attr.id === reward.attributeId) {
                        let newXp = attr.xp + (reward.traitPoints || 0);
                        let newLevel = attr.level;
                        let maxXp = attr.maxXp;

                        // Level Up Logic for Trait
                        // Formula: 100 * (1.2 ^ (level - 1))
                        while (newXp >= maxXp) {
                            newXp -= maxXp;
                            newLevel += 1;
                            maxXp = Math.floor(100 * Math.pow(1.2, newLevel - 1));
                            addNotification({ 
                                type: 'ATTRIBUTE', 
                                label: attr.label, 
                                fromLevel: newLevel - 1, 
                                toLevel: newLevel, 
                                icon: attr.icon, 
                                color: attr.color 
                            });
                        }

                        // Persist Attribute Change
                        if (user?.uid) {
                             persistenceService.attributes.save(user.uid, {
                                ...attr, level: newLevel, xp: newXp, maxXp 
                             }).catch(console.error);
                        }
                        
                        return { ...attr, level: newLevel, xp: newXp, maxXp };
                    }
                    return attr;
                });
                return updatedAttrs;
            });
        }
    }, [calculateNextXp, user, addNotification]);

    const addPlayerXp = useCallback((amount: number) => addPlayerReward({ xp: amount, gold: 0 }), [addPlayerReward]);
    const addPlayerGold = useCallback((amount: number) => addPlayerReward({ xp: 0, gold: amount }), [addPlayerReward]);

    const spendTraitPoints = useCallback((attrId: string, amount: number) => {
        if (player.availableTraitPoints < amount) return;

        // 1. Deduct Point
        setPlayer(prev => {
             const newStats = { ...prev, availableTraitPoints: prev.availableTraitPoints - amount };
             // Persist
             if (user?.uid && user.stats) {
                setDoc(doc(db, 'users', user.uid), {
                    stats: {
                        ...user.stats, // Merge with existing stats
                        availableTraitPoints: newStats.availableTraitPoints
                    }
                }, { merge: true });
             }
             return newStats;
        });

        // 2. Add Attribute XP (e.g. 500 XP per point)
        addPlayerReward({ xp: 0, gold: 0, traitPoints: 500 * amount, attributeId: attrId });
    }, [player.availableTraitPoints, user, addPlayerReward]);

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

    const handleCompleteSession = useCallback((projectId: string | null, durationSeconds: number, type: 'POMO' | 'STOPWATCH' = 'POMO') => {
        // LIMIT CHECK
        const today = new Date().toISOString().split('T')[0];
        let currentLimits = dailyLimits;
        if (currentLimits.date !== today) {
             currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
        }

        const availableSeconds = Math.max(0, DAILY_LIMITS.FOCUS.MAX_SECONDS - currentLimits.focusSeconds);
        const rewardableSeconds = Math.min(durationSeconds, availableSeconds);
        
        // Only give rewards for rewardable seconds
        const baseReward = Math.floor(rewardableSeconds / 60);

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
        const totalReward = Math.floor(baseReward * multiplier);
        
        // XP de Rasgos (Independiente)
        // Focus reward: 1 XP de cuenta por minuto base.
        // XP de rasgos será el mismo totalReward pero contra su propio límite diario.
        
        // Update Limits
        const newLimits = {
            ...currentLimits,
            focusSeconds: currentLimits.focusSeconds + durationSeconds,
            taskTraitPoints: currentLimits.taskTraitPoints + totalReward // Usamos el mismo contador para simplicidad o uno nuevo?
            // User says: "xp de cuenta, razgo y monedas"
        };

        setDailyLimits(newLimits);
        if (user?.uid) {
            setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
        }

        const totalGold = Math.floor(totalReward / 5);
        addPlayerReward({ xp: totalReward, gold: totalGold, traitPoints: totalReward, attributeId: attrId });
        
        const attr = attributes.find(a => a.id === attrId);
        const AttrIcon = attr?.icon || Star;
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, attr?.color || '#fff', AttrIcon);
        addNotification({ type: 'SESSION', label: 'FOCUS COMPLETE', fromLevel: Math.floor(durationSeconds/60) + 'm', toLevel: '+' + totalReward + ' Matrix Coins', icon: Clock, color: '#fbbf24' });
    }, [projects, attributes, addNotification, spawnParticles, addPlayerReward, user, dailyLimits]);

    const completeQuest = useCallback((e: React.MouseEvent, quest: Quest) => { 
        e.stopPropagation();

        // --- SMART QUEST SYNC (CRITICAL) ---
        if (quest.isSmartQuest) {
             // If it's a Smart Quest, we must update the Smart Project, NOT the 'quests' array.
             // The 'quests' array in this hook tracks MANUAL quests.
             // Smart Quests are derived from SmartProjects in Dashboard.tsx.
             // So we update SmartProject state.
             
             setSmartProjects(prev => prev.map(proj => {
                 // Find if this project contains the node
                 // Recursive search & update
                 const updateNode = (node: StrategicNode): StrategicNode => {
                     if (node.id === quest.id) {
                         const newCompleted = !node.isCompleted; // Toggle
                         return { ...node, isCompleted: newCompleted };
                     }
                     if (node.children) {
                         return { ...node, children: node.children.map(updateNode) };
                     }
                     return node;
                 };

                 // Check if root or children have it. We just run updateNode on root.
                 // Efficiency: We could check IDs, but recursive map is safe.
                 const newRoot = updateNode(proj.rootNode);
                 
                 // If changed, return new project
                 if (newRoot !== proj.rootNode) {
                     const updatedProj = { ...proj, rootNode: newRoot };
                     // Persistence
                     if (user?.uid) {
                         persistenceService.smartProjects.update(user.uid, proj.id, updatedProj);
                     }
                     return updatedProj;
                 }
                 return proj;
             }));

             // We ALSO need to handle rewards.
            // Logic below handles rewards. 
            
            // SYNC with 'quests' state so the Tasks view updates immediately
            setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: !q.completed } : q));
            
            // Persistence for the quest itself (optional if SmartProject update is enough, 
            // but necessary if Tasks view reads from quests collection)
            if (user?.uid) {
                persistenceService.quests.update(user.uid, quest.id, { completed: !quest.completed });
            }
        }

        if (quest.completed) {
            if(navigator.vibrate) navigator.vibrate(5);
            
            // Reversal
            const xp = quest.xpReward;
            const coins = quest.gold || 0;
            // Approximating Trait XP (needs to match calculation below)
            const traitXp = Math.floor(xp * 0.4); 
            
            // Update Daily Limits (Allow "Refund" of limit)
            setDailyLimits(prev => {
                const today = new Date().toISOString().split('T')[0];
                if (prev.date !== today) return prev; // Don't mess with limits if dates mismatch

                const newLimits = {
                    ...prev,
                    taskXp: Math.max(0, prev.taskXp - xp),
                    taskGold: Math.max(0, prev.taskGold - coins),
                    taskTraitPoints: Math.max(0, prev.taskTraitPoints - traitXp)
                };
                
                if (user?.uid) {
                    setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
                }
                return newLimits;
            });

            addPlayerReward({ xp: -xp, gold: -coins, traitPoints: -traitXp, attributeId: quest.attribute });
            
            if (!quest.isSmartQuest) {
                setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: false } : q));
                if (user?.uid) {
                    persistenceService.quests.update(user.uid, quest.id, { completed: false });
                }
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

            addPlayerReward({ xp: xpToAward, gold: goldToAward, traitPoints: traitXpToAward, attributeId: quest.attribute });
            
            // ONLY update quests state and persistence for NON-SMART quests
            if (!quest.isSmartQuest) {
                setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: true } : q));

                if (user?.uid) {
                    persistenceService.quests.update(user.uid, quest.id, { completed: true });

                    // Normalize Reward Object for Transaction
                    const fullReward: RewardPrediction = { 
                        xp: xpToAward, 
                        coins: goldToAward, 
                        traitXp: traitXpToAward, 
                        baseXp: rawXp, 
                        bonusApplied: false 
                    };
                    completeTaskTransaction(user.uid, quest.id, fullReward, quest.attribute);
                }
            }
        }
    }, [attributes, spawnParticles, addPlayerReward, user, dailyLimits]);

    const handleToggleHabitDay = useCallback(async (habit: Habit, dateStr: string) => {
        if (!user?.uid) return;
        
        const todayStr = toLocalISOString(new Date());
        const isToday = dateStr === todayStr;
        
        const isAlreadyCompleted = (habit.history || []).some(d => d.startsWith(dateStr));
        
        let newHistory: string[];
        if (isAlreadyCompleted) {
            newHistory = (habit.history || []).filter(d => !d.startsWith(dateStr));
        } else {
            const dateObj = new Date(dateStr);
            dateObj.setHours(12, 0, 0, 0);
            newHistory = [...(habit.history || []), dateObj.toISOString()];
        }

        // Calculate new streak accurately using the helper
        const entries = newHistory.map(h => ({ date: h }));
        const newStreak = calculateStreak(entries);
        const newTotalCompletions = newHistory.length;

        // Optimistic Update
        setHabits(prev => prev.map(h => {
            if (h.id === habit.id) {
                return {
                    ...h,
                    history: newHistory,
                    totalCompletions: newTotalCompletions,
                    streak: newStreak,
                    completedToday: isToday ? !isAlreadyCompleted : h.completedToday
                };
            }
            return h;
        }));

        // Persist
        try {
            await persistenceService.habits.update(user.uid, habit.id, {
                history: newHistory,
                totalCompletions: newTotalCompletions,
                streak: newStreak,
                completedToday: isToday ? !isAlreadyCompleted : habit.completedToday
            });
        } catch (error) {
            console.error("Failed to toggle habit day", error);
        }
    }, [user?.uid]);

    const handleHabitClick = useCallback((e: React.MouseEvent, habit: Habit) => {
        e.stopPropagation();
        if (habit.completedToday) {
            if(navigator.vibrate) navigator.vibrate(5);
            
            // LOGIC FIX: Only remove rewards if we are dropping below the cap.
            // If the user has > 10 completions, unchecking one removes a "non-rewarded" completion.
            const currentCount = dailyLimits.habitsCompleted || 0;
            const maxCount = DAILY_LIMITS.HABITS.MAX_COUNT;
            const shouldRemoveReward = currentCount <= maxCount;

            const rewardXp = 20 + ((habit.streak - 1) * 2); 
            const rewardGold = Math.floor(rewardXp / 4);
            
            if (shouldRemoveReward) {
                addPlayerReward({ xp: -rewardXp, gold: -rewardGold, traitPoints: -rewardXp, attributeId: habit.attribute });
            }
            
            // Update Limits (Decrement count)
            const newLimits = { 
                ...dailyLimits, 
                habitsCompleted: Math.max(0, currentCount - 1) 
            };
            setDailyLimits(newLimits);
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
            }
            
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
            
            const traitXpReward = rewardXp; // Independiente
            const rewardGold = Math.floor(rewardXp / 4);
            
            if (isRewardable) {
                addPlayerReward({ xp: rewardXp, gold: rewardGold, traitPoints: traitXpReward, attributeId: habit.attribute }); 
            } else {
                addNotification({ type: 'SYSTEM', label: 'LIMIT REACHED', fromLevel: '10/10', toLevel: 'No XP', icon: InfinityIcon, color: '#ef4444' });
            }

            // Always increment count (even if no reward)
            const newLimits = { ...currentLimits, habitsCompleted: habitsDone + 1, taskTraitPoints: currentLimits.taskTraitPoints + traitXpReward };
            setDailyLimits(newLimits);
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
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
    }, [spawnParticles, addPlayerReward, user, dailyLimits]);

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

        if (isComplete && !validationHabit.completedToday) {
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
            
            const rewardGold = Math.floor(rewardXp / 4);

            if (isRewardable) {
                spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#fff', Trophy, 'fire');
                addPlayerReward({ xp: rewardXp, gold: rewardGold, traitPoints: rewardXp, attributeId: validationHabit.attribute });
            } else {
                 addNotification({ type: 'SYSTEM', label: 'LIMIT REACHED', fromLevel: '10/10', toLevel: 'No XP', icon: InfinityIcon, color: '#ef4444' });
            }

            // ALWAYS Update Limits
            const newLimits = { ...currentLimits, habitsCompleted: habitsDone + 1 };
            setDailyLimits(newLimits);
            if (user?.uid) {
                setDoc(doc(db, 'users', user.uid), { dailyLimits: newLimits }, { merge: true }).catch(console.error);
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

    const handleUpdateSmartProject = useCallback(async (updatedProject: SmartProject) => {
        setSmartProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        
        // --- SYNC QUESTS ---
        // Find all nodes in the project and sync their completion status to the quests state
        const nodeStatusMap: Record<string, boolean> = {};
        const traverse = (node: StrategicNode) => {
            nodeStatusMap[node.id] = node.isCompleted;
            if (node.children) node.children.forEach(traverse);
        };
        traverse(updatedProject.rootNode);

        setQuests(prev => prev.map(q => {
            if (q.id in nodeStatusMap) {
                return { ...q, completed: nodeStatusMap[q.id] };
            }
            return q;
        }));

        if (user?.uid) {
            await persistenceService.smartProjects.save(user.uid, updatedProject);
            
            // Persist quest status changes for any affected smart quests
            // We only update the ones that are actually in the map
            const affectedQuests = quests.filter(q => q.id in nodeStatusMap && q.completed !== nodeStatusMap[q.id]);
            for (const q of affectedQuests) {
                persistenceService.quests.update(user.uid, q.id, { completed: nodeStatusMap[q.id] });
            }
        }
    }, [user, quests]);

    const handleAddNote = useCallback(async (content: string, projectId: string) => {
        if (!user?.uid) return;
        
        const tempId = Date.now().toString();
        const newNote: Note = {
            id: tempId,
            title: 'Mission Log', // Title will be handled by UI or default
            blocks: [{ id: '1', type: 'text', content }],
            updatedAt: new Date().toISOString(),
            projectId: projectId
        };

        // Optimistic Update
        setNotes(prev => [newNote, ...prev]);
        
        // Persist
        try {
            const savedNote = { ...newNote };
            delete (savedNote as any).id; // Let firestore gen ID or use setDoc with tempId? 
            // Actually persistenceService.notes.save uses setDoc with id.
            // But NexusView logic was using addDoc to generate ID.
            // Let's stick to persistenceService.
            
            await persistenceService.notes.save(user.uid, newNote);
        } catch (e) {
            console.error("Failed to log note", e);
            setNotes(prev => prev.filter(n => n.id !== tempId));
        }
    }, [user]);

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
        notes,
        setNotes,
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
        spendTraitPoints,
        spawnParticles,
        handleCompleteSession,
        completeQuest,
        handleHabitClick,
        handleToggleHabitDay,
        validateHabitProgress,
        handleQuestConfirm,
        handleDeleteQuest,
        handleHabitConfirm,
        handleDeleteHabit,
        handleProjectConfirm,
        handleDeleteProject,
        handleUpdateProject,
        handleUpdateSmartProject,
        handleAddNote,
        updateAttributeMetadata,
        addAttribute,
        removeAttribute,
        dashboardStyle,
        updateDashboardStyle
    };
};
