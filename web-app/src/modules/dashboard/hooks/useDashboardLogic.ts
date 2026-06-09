import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLux } from '@/context/LuxContext';
import { useAuth } from '@/context/AuthContext';
import { Trophy } from 'lucide-react';
import { checkAchievements } from '@/services/achievementListener';
import { Achievement } from '@/config/achievements';
import { Flame, Star, Skull, Trash2, AlertTriangle, Check, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { 
  Attribute, Quest, Habit, Project, BadHabit,
  NotificationItem, Particle, Session 
} from '@/types';
import { DailyLimits } from '@/types/User';
import { TRAITS_LIST } from '../constants';
import { GAMIFICATION_CONFIG } from '@/config/gamification';
import { FREE_LIMITS } from '@/config/limits';
import { projectService } from '@/services/projectService';
import { persistenceService } from '@/services/persistenceService';
import { PersistenceService } from '@/services/persistence';
import { TransactionService } from '@/services/transactionService';
import { BackupService } from '@/services/backupService';
import { OfflineSyncService } from '@/services/offlineSync';

import { supabase } from '@/services/supabase';
import { calculateTaskRewards } from '@/utils/rewardCalculator';

import { notificationService } from '@/services/notificationService';
import { toLocalISOString, getHistoryDateKey, parseLocalDate } from '../../../utils/dateUtils';
import { calculateNextLevelXp, calculateLevelFromXp, calculateXpForLevel, calculateSubTraitMaxXp, calculateAttributeMaxXp } from '../../../utils/leveling';
import { calculateLiveProductivityScore, isHabitActive } from '../../../utils/productivityScore';
import { playLightSound, playHabitCompleteSound, playQuestCompleteSound } from '../../../utils/soundEffects';
import confetti from 'canvas-confetti';

import { useTheme } from '@/context/ThemeContext';
import { useReward } from '@/modules/rewards/context/RewardContext';

import { SmartProject } from '@/types/SmartGoal';
import { DockConfig, DEFAULT_DOCK_CONFIG } from '@/components/ui/DockConfigModal';

import { Target, Dumbbell, Brain, Users, Ghost, Wallet, Palette, Anchor, Crown, Shield, Zap, Feather, Rocket, Heart, Leaf, Hexagon } from 'lucide-react';

const ICONS_MAP: Record<string, any> = {
  Hexagon, Target, Dumbbell, Brain, Users, Ghost, Wallet, Palette, Anchor, Crown, Shield, Zap, Feather, Rocket, Star, Heart, Flame, Leaf
};

const recalculateHabitStreak = (history: string[]): number => {
    if (!history || history.length === 0) return 0;
    const uniqueDates = Array.from(new Set(history.map(d => getHistoryDateKey(d)))).sort();
    
    const todayStr = getHistoryDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getHistoryDateKey(yesterdayDate);
    
    if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
        return 0;
    }
    
    let streak = 0;
    let current = uniqueDates.includes(todayStr) ? new Date() : yesterdayDate;
    
    while (true) {
        const currentStr = getHistoryDateKey(current);
        if (uniqueDates.includes(currentStr)) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
};

const backupHabitStateForDate = (habit: Habit, dateKey: string): Habit => {
    const updated = { ...habit };
    if (habit.type === 'QUANTITY') {
        updated.valueHistory = {
            ...(habit.valueHistory || {}),
            [dateKey]: habit.currentValue || 0
        };
    }
    if (habit.type === 'CHECKLIST' && habit.checklist) {
        updated.checklist = habit.checklist.map(item => {
            const itemHistory = item.history ? [...item.history] : [];
            if (item.completed && !itemHistory.includes(dateKey)) {
                itemHistory.push(dateKey);
            }
            return {
                ...item,
                history: itemHistory
            };
        });
    }
    return updated;
};

export const useDashboardLogic = () => {
    const { addReward } = useReward();
    const { user: luxUser, loading: luxLoading } = useLux();
    const { profile: authProfile, updateProfileLocally } = useAuth();

    const triggerReward = useCallback((
        source: string, 
        xpGained: number, 
        goldGained: number, 
        newPlayerStats: { xp: number, level: number, gold: number }, 
        oldPlayerStats: { level: number },
        traitUpdate?: { id: string, name: string, xp: number, maxXp: number, level: number, oldLevel: number, gained?: number }
    ) => {
        const currentLevelBaseXp = calculateXpForLevel(newPlayerStats.level);
        const nextLevelTotalXp = calculateNextLevelXp(newPlayerStats.level);
        
        const oldCumulativeXp = newPlayerStats.xp - xpGained;
        const calculatedOldLevel = calculateLevelFromXp(oldCumulativeXp); 
        
        const oldLevelBase = calculateXpForLevel(calculatedOldLevel);
        const oldRelXp = Math.max(0, oldCumulativeXp - oldLevelBase);

        addReward({
            source,
            xpGained,
            currentXp: Math.max(0, newPlayerStats.xp - currentLevelBaseXp),
            maxXp: nextLevelTotalXp - currentLevelBaseXp,
            level: newPlayerStats.level,
            initialLevel: calculatedOldLevel,
            initialXp: oldRelXp,
            isLevelUp: newPlayerStats.level > oldPlayerStats.level,
            goldGained,
            currentGold: newPlayerStats.gold,
            ...(traitUpdate ? {
                traitId: traitUpdate.id,
                traitName: traitUpdate.name,
                traitXpGained: traitUpdate.gained !== undefined ? traitUpdate.gained : xpGained,
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
        if (luxUser.id === authProfile.uid || luxUser.id === authProfile.id) {
            return {
                ...luxUser,
                // 🔐 PLAN PERSISTENCE: ALWAYS prefer authProfile for plan/es_pro.
                // luxUser (LuxContext) does NOT fetch plan from Supabase, so it defaults to undefined.
                // authProfile is the source of truth for subscription status.
                plan: authProfile.plan || luxUser.plan || 'FREE',
                es_pro: authProfile.es_pro ?? luxUser.es_pro ?? false,
                // Prefer Auth Profile for Identity fields ONLY if valid, otherwise trust Lux (which has realtime sync)
                avatarId: authProfile.avatarId || luxUser.avatarId,
                displayName: luxUser.displayName || authProfile.displayName,
                // Merge preferences from authProfile first (since it updates locally), fallback to luxUser
                preferences: { ...(luxUser.preferences || {}), ...(authProfile.preferences || {}) },
                defaultChartViews: authProfile.defaultChartViews || luxUser.defaultChartViews,
                defaultProjectView: authProfile.defaultProjectView || luxUser.defaultProjectView,
                defaultTaskFilters: authProfile.defaultTaskFilters || luxUser.defaultTaskFilters,
                dashboardStyle: authProfile.dashboardStyle || luxUser.dashboardStyle,
                avatarShape: authProfile.avatarShape || luxUser.avatarShape,
                habitSectionControl: authProfile.habitSectionControl || luxUser.habitSectionControl,
                defaultHabitView: authProfile.defaultHabitView || luxUser.defaultHabitView,
                allowDockSectionSwitch: authProfile.allowDockSectionSwitch || luxUser.allowDockSectionSwitch,
                weekStartDay: authProfile.weekStartDay !== undefined ? authProfile.weekStartDay : luxUser.weekStartDay,
                archivedTraits: authProfile.archivedTraits || (luxUser.preferences as any)?.archivedTraits || {},
                // Prefer Lux for Game Stats (updated via Game Loop), merging streak fields from local cache/profile
                stats: {
                    ...luxUser.stats,
                    streak: authProfile.stats?.streak !== undefined ? authProfile.stats.streak : (luxUser.stats?.streak || 0),
                    lastStreakDate: authProfile.stats?.lastStreakDate !== undefined ? authProfile.stats.lastStreakDate : luxUser.stats?.lastStreakDate,
                    streakFrozenUntil: authProfile.stats?.streakFrozenUntil !== undefined ? authProfile.stats.streakFrozenUntil : luxUser.stats?.streakFrozenUntil
                }
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
    const [isPomodoroActive, setIsPomodoroActive] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('matrix_pomodoro_active') === 'true';
        }
        return false;
    });

    useEffect(() => {
        if (isPomodoroActive) {
            localStorage.setItem('matrix_pomodoro_active', 'true');
        } else {
            localStorage.removeItem('matrix_pomodoro_active');
        }
    }, [isPomodoroActive]);

    const [isNoteTaking, setIsNoteTaking] = useState(false); 
    const [overrideBgColor, setOverrideBgColor] = useState<string | undefined>(undefined);
    const [showProfile, _setShowProfile] = useState(() => user?.preferences?.showProfile ?? user?.showProfile ?? true);
    
    const setShowProfile = useCallback(async (show: boolean) => {
        _setShowProfile(show);
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), showProfile: show };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save show profile preference", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);
    const [defaultChartMode, _setDefaultChartMode] = useState<'RADAR' | 'BAR'>(() => user?.preferences?.defaultChartMode || user?.defaultChartMode || 'RADAR');
    
    const setDefaultChartMode = useCallback(async (mode: 'RADAR' | 'BAR') => {
        _setDefaultChartMode(mode);
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), defaultChartMode: mode };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save default chart mode", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);
    const [dashboardStyle, setDashboardStyle] = useState<'BORDER' | 'LIQUID' | 'GLASS' | 'AURA'>(() => user?.preferences?.dashboardStyle || user?.dashboardStyle || 'BORDER');
    const [avatarShape, setAvatarShape] = useState<'CIRCLE' | 'SQUARE'>(() => user?.preferences?.avatarShape || user?.avatarShape || 'CIRCLE');
    const [habitSectionControl, setHabitSectionControl] = useState<'VISIBLE' | 'HIDDEN'>(() => user?.preferences?.habitSectionControl || user?.habitSectionControl || 'VISIBLE');
    const [defaultHabitView, setDefaultHabitView] = useState<'DEFAULT' | 'CHRONOLOGICAL'>(() => user?.preferences?.defaultHabitView || user?.defaultHabitView || 'DEFAULT');
    const [allowDockSectionSwitch, setAllowDockSectionSwitch] = useState<boolean>(() => user?.preferences?.allowDockSectionSwitch ?? user?.allowDockSectionSwitch ?? true);
    const [dockConfig, setDockConfig] = useState<DockConfig>(() => user?.preferences?.dockConfig || user?.dockConfig || DEFAULT_DOCK_CONFIG);
    const [weekStartDay, setWeekStartDay] = useState<0 | 1>(() => {
        const saved = localStorage.getItem('weekStartDay');
        if (saved) return parseInt(saved) as 0 | 1;
        return user?.preferences?.weekStartDay ?? user?.weekStartDay ?? 1;
    });
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

    const updateDashboardStyle = useCallback(async (style: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA') => {
        setDashboardStyle(style);
        if (user?.id) {
            try {
                const currentPrefs = (user as any).preferences || {};
                const newPrefs = { ...currentPrefs, dashboardStyle: style };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save dashboard style", e);
            }
        }
    }, [user, updateProfileLocally]);

    const updateAvatarShape = useCallback(async (shape: 'CIRCLE' | 'SQUARE') => {
        setAvatarShape(shape);
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), avatarShape: shape };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save avatar shape", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);

    const updateHabitSectionControl = useCallback(async (control: 'VISIBLE' | 'HIDDEN') => {
        setHabitSectionControl(control);
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), habitSectionControl: control };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save habit section control", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);

    const updateDefaultHabitView = useCallback(async (view: 'DEFAULT' | 'CHRONOLOGICAL') => {
        setDefaultHabitView(view);
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), defaultHabitView: view };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save default habit view", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);

    const updateAllowDockSectionSwitch = useCallback(async (allow: boolean) => {
        setAllowDockSectionSwitch(allow);
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), allowDockSectionSwitch: allow };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save allow dock section switch", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);

    const updateDockConfig = useCallback(async (config: DockConfig) => {
        setDockConfig(config);
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), dockConfig: config };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save dock config", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);

    const updateWeekStartDay = useCallback(async (day: 0 | 1) => {
        setWeekStartDay(day);
        localStorage.setItem('weekStartDay', day.toString());
        if (user?.id) {
            try {
                const newPrefs = { ...(user.preferences || {}), weekStartDay: day };
                updateProfileLocally({ preferences: newPrefs });
                await supabase.from('users').update({ preferences: newPrefs }).eq('id', user.id);
            } catch (e: any) {
                console.error("Failed to save week start day", e);
            }
        }
    }, [user?.id, user?.preferences, updateProfileLocally]);

    // Sticky HUD updater removed

    useEffect(() => {
        // Remove hardcoded BORDER enforcement to allow AURA and others
        if (user?.preferences?.dashboardStyle || user?.dashboardStyle) {
            setDashboardStyle(user.preferences?.dashboardStyle || user.dashboardStyle || 'BORDER');
        }
        
        if (user?.preferences?.avatarShape || user?.avatarShape) {
            setAvatarShape(user.preferences?.avatarShape || user.avatarShape || 'CIRCLE');
        }
        if (user?.preferences?.habitSectionControl || user?.habitSectionControl) {
            setHabitSectionControl(user.preferences?.habitSectionControl || user.habitSectionControl || 'VISIBLE');
        }
        if (user?.preferences?.defaultHabitView || user?.defaultHabitView) {
            setDefaultHabitView(user.preferences?.defaultHabitView || user.defaultHabitView || 'DEFAULT');
        }
        if (user?.preferences?.allowDockSectionSwitch !== undefined || user?.allowDockSectionSwitch !== undefined) {
            setAllowDockSectionSwitch(user.preferences?.allowDockSectionSwitch ?? user.allowDockSectionSwitch ?? false);
        }
        if (user?.preferences?.dockConfig || user?.dockConfig) {
            setDockConfig(user.preferences?.dockConfig || user.dockConfig || DEFAULT_DOCK_CONFIG);
        }
        if (user?.preferences?.weekStartDay !== undefined || user?.weekStartDay !== undefined) {
            setWeekStartDay(user.preferences?.weekStartDay ?? user.weekStartDay ?? 1);
        }
        if (user?.preferences?.defaultChartMode || user?.defaultChartMode) {
            _setDefaultChartMode(user.preferences?.defaultChartMode || user.defaultChartMode || 'RADAR');
        }
        if (user?.preferences?.showProfile !== undefined || user?.showProfile !== undefined) {
            _setShowProfile(user.preferences?.showProfile ?? user.showProfile ?? true);
        }
        // Sticky HUD sync removed
    }, [user?.dashboardStyle, user?.avatarShape, user?.habitSectionControl, user?.defaultHabitView, user?.allowDockSectionSwitch, user?.dockConfig, user?.weekStartDay, user?.preferences, user?.defaultChartMode, user?.showProfile]);

    const [player, setPlayer] = useState({ level: 1, xp: 0, nextXp: calculateNextLevelXp(1), gold: 0 });
    const playerRef = useRef(player);
    playerRef.current = player;
    const prevPlayerLevel = useRef(player.level);
    const [health, setHealth] = useState(() => {
        // 🛡️ MEMORY CORE: Boot HP directly from Persistence
        const cached = PersistenceService.getProfile();
        return cached?.stats?.hp ?? 100;
    });
    const [dailyLimits, setDailyLimits] = useState<DailyLimits>(() => {
        const cached = PersistenceService.getProfile();
        return cached?.dailyLimits || {
            date: toLocalISOString(new Date()),
            taskXp: 0,
            taskGold: 0,
            taskTraitPoints: 0,
            habitsCompleted: 0,
            focusSeconds: 0,
            totalXp: 0,
            totalGold: 0,
            totalTraitPoints: 0
        };
    });

    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [yesterdayUpdateTrigger, setYesterdayUpdateTrigger] = useState(0);

    const displayedDailyLimits = useMemo(() => {
        const dateStr = toLocalISOString(currentDate);
        if (dateStr === toLocalISOString(new Date())) {
            return dailyLimits;
        }
        
        // Find in dailyFeed
        if (user?.id) {
            const currentFeed = PersistenceService.getCollection<any>(user.id, 'dailyFeed') || [];
            const entry = currentFeed.find((e: any) => e.date === dateStr);
            if (entry) {
                return {
                    date: dateStr,
                    tasksCompleted: entry.tasksCompleted || 0,
                    tasksTotal: entry.tasksTotal || 0,
                    habitsCompleted: entry.habitsCompleted || 0,
                    focusSeconds: (entry.focusMinutes || 0) * 60,
                    taskXp: entry.taskXp || 0,
                    taskGold: entry.taskGold || 0,
                    taskTraitPoints: entry.taskTraitPoints || 0,
                    habitXp: entry.habitXp || 0,
                    habitGold: entry.habitGold || 0,
                    habitTraitPoints: entry.habitTraitPoints || 0,
                    totalXp: (entry.taskXp || 0) + (entry.habitXp || 0),
                    totalGold: (entry.taskGold || 0) + (entry.habitGold || 0),
                    totalTraitPoints: (entry.taskTraitPoints || 0) + (entry.habitTraitPoints || 0)
                };
            }
        }
        
        return {
            date: dateStr,
            taskXp: 0,
            taskGold: 0,
            taskTraitPoints: 0,
            habitsCompleted: 0,
            focusSeconds: 0,
            totalXp: 0,
            totalGold: 0,
            totalTraitPoints: 0
        };
    }, [currentDate, dailyLimits, user?.id, yesterdayUpdateTrigger]);
    
    // Data States
    const [syncTrigger, setSyncTrigger] = useState(0);
    const lastSyncTrigger = useRef(0);
    const [quests, setQuests] = useState<Quest[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [badHabits, setBadHabits] = useState<BadHabit[]>([]);
    const [areHabitsLoaded, setAreHabitsLoaded] = useState(false);
    const [isDailyCheckDone, setIsDailyCheckDone] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);

    const STREAK_TARGETS = [3, 7, 14, 30, 60, 90, 130, 180, 240, 310, 365];
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
    const lastServerLimits = useRef<string>("");

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

            // 🛡️ SYNC GUARD: If we have pending offline stats synchronization, 
            // DO NOT let the server stats overwrite our local stats!
            const hasPending = user?.id ? OfflineSyncService.hasPendingStatsSync(user.id) : false;

            if (hasServerChanged && !hasPending) {
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
                
                let cleanXp = serverStats.xp || 0;
                let cleanLevel = serverStats.level || 1;
                const baseForLevel = calculateXpForLevel(cleanLevel);
                if (cleanXp < baseForLevel) {
                    cleanXp = baseForLevel + cleanXp;
                }
                const correctLevel = calculateLevelFromXp(cleanXp);
                if (correctLevel > cleanLevel) {
                    cleanLevel = correctLevel;
                }

                setPlayer(prev => {
                    const newPlayer = { ...prev };
                    let changed = false;

                    // Sync XP/Level if Server moved
                    if (!currentLast || serverStats.xp !== currentLast.xp || serverStats.level !== currentLast.level) {
                        newPlayer.xp = cleanXp;
                        newPlayer.level = cleanLevel;
                        newPlayer.nextXp = calculateNextLevelXp(cleanLevel);
                        changed = true;

                        // Save corrected stats back to DB if they changed
                        if (cleanXp !== serverStats.xp || cleanLevel !== serverStats.level) {
                            console.log(`🩹 Auto-correcting player stats: XP ${serverStats.xp} -> ${cleanXp}, Level ${serverStats.level} -> ${cleanLevel}`);
                            TransactionService.awardExperience(user.id, cleanXp - serverStats.xp, 0, cleanLevel).catch(console.error);
                            updateProfileLocally({
                                stats: {
                                    ...serverStats,
                                    xp: cleanXp,
                                    level: cleanLevel
                                }
                            });
                        }
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

                // Update last known server stats
                lastServerStats.current = {
                    xp: cleanXp,
                    level: cleanLevel,
                    gold: serverStats.gold,
                    hp: serverStats.hp
                };
            }

            // Sync Daily Limits independently of stats
            const serverLimitsStr = JSON.stringify(user.dailyLimits || {});
            if (lastServerLimits.current !== serverLimitsStr) {
                lastServerLimits.current = serverLimitsStr;
                
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
                            taskTraitPoints: Number(user.dailyLimits.taskTraitPoints || 0),
                            notesCompleted: Number(user.dailyLimits.notesCompleted || 0),
                            tasksCompleted: Number(user.dailyLimits.tasksCompleted || 0),
                            focusXp: Number(user.dailyLimits.focusXp || 0),
                            focusGold: Number(user.dailyLimits.focusGold || 0),
                            focusTraitPoints: Number(user.dailyLimits.focusTraitPoints || 0)
                        });
                    } else {
                        // Server date is old. Sync it with its old date so that processDailyReset can handle the transition.
                        setDailyLimits({
                            ...user.dailyLimits,
                            focusSeconds: Number(user.dailyLimits.focusSeconds || 0),
                            habitsCompleted: Number(user.dailyLimits.habitsCompleted || 0),
                            taskXp: Number(user.dailyLimits.taskXp || 0),
                            taskGold: Number(user.dailyLimits.taskGold || 0),
                            taskTraitPoints: Number(user.dailyLimits.taskTraitPoints || 0),
                            notesCompleted: Number(user.dailyLimits.notesCompleted || 0),
                            tasksCompleted: Number(user.dailyLimits.tasksCompleted || 0),
                            focusXp: Number(user.dailyLimits.focusXp || 0),
                            focusGold: Number(user.dailyLimits.focusGold || 0),
                            focusTraitPoints: Number(user.dailyLimits.focusTraitPoints || 0)
                        });
                    }
                }
            }
        }
    }, [user, calculateNextXp]);

    useEffect(() => {
        if (!user?.id) return;

        const cached = PersistenceService.getProfile(user.id);
        if (!cached || cached.uid !== user.id) return;

        const updatedProfile = {
            ...cached,
            dailyLimits,
            stats: {
                ...cached.stats,
                xp: player.xp,
                gold: player.gold,
                level: player.level,
                hp: health
            }
        };

        PersistenceService.saveProfile(updatedProfile);

        // SYNC WITH SUPABASE DEBOUNCED
        const timer = setTimeout(async () => {
            try {
                const { supabase } = await import('@/services/supabase');
                
                // Fetch current user stats to merge and prevent overwrite race conditions
                const { data: userDoc } = await supabase
                    .from('users')
                    .select('stats')
                    .eq('id', user.id)
                    .maybeSingle();

                const dbStats = userDoc?.stats || {};
                const mergedStats = {
                    ...dbStats,
                    xp: Math.max(dbStats.xp || 0, player.xp),
                    gold: Math.max(dbStats.gold || 0, player.gold),
                    level: Math.max(dbStats.level || 0, player.level),
                    hp: health,
                    streak: updatedProfile.stats?.streak ?? dbStats.streak ?? 0,
                    lastStreakDate: updatedProfile.stats?.lastStreakDate ?? dbStats.lastStreakDate,
                    streakFrozenUntil: updatedProfile.stats?.streakFrozenUntil ?? dbStats.streakFrozenUntil,
                    dailyLimits: {
                        ...(dbStats.dailyLimits || {}),
                        ...dailyLimits
                    }
                };

                const { error } = await supabase
                    .from('users')
                    .update({
                        stats: mergedStats,
                        last_login_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
                
                if (error) throw error;
                
                console.log("✅ MATRIX: Stats & Limits synced to Supabase (XP:", player.xp, "Level:", player.level, ")");
                // Clear any pending STATS_SYNC since it succeeded
                if (user?.id) {
                    OfflineSyncService.removePendingStatsSync(user.id);
                }
            } catch(e: any) {
                console.error("Failed to sync stats to Supabase:", e);
                // Queue for offline sync if it's a network error or offline
                const isNetwork = !navigator.onLine || e.message?.includes('fetch') || e.message?.includes('network');
                if (isNetwork && user?.id) {
                    OfflineSyncService.addAction({
                        type: 'STATS_SYNC',
                        collectionName: 'users',
                        userId: user.id,
                        itemId: 'stats',
                        data: {
                            stats: {
                                ...updatedProfile.stats,
                                dailyLimits: updatedProfile.dailyLimits
                            }
                        }
                    });
                }
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [player.xp, player.gold, player.level, player.nextXp, health, dailyLimits, user?.id, user?.isSkeleton, user?.stats?.streak, user?.stats?.lastStreakDate]);




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
        if (!user?.id || isDailyCheckDone) return;
        if (user.isSkeleton) return; // 🛡️ SKELETON PROTECTION

        const processDailyReset = async () => {
            const today = toLocalISOString(new Date());
            const lastDate = dailyLimits.date || today;

            if (lastDate !== today) {
                console.log(`[DAILY RESET] Processing transition from ${lastDate} to ${today}`);
                
                // 1. Calculate Penalty based on CURRENT habits (previous day's state)
                const canProcessHabits = areHabitsLoaded && habits.length > 0;
                


                let damage = 0; // Health penalty for incomplete habits is disabled per user request

                // 2. Prepare Batch
                
                

                // 1.5 CHECK STREAK CONTINUITY (Global Streak)
                const yesterday = parseLocalDate(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = toLocalISOString(yesterday);
                
                const streakFrozenUntil = user.stats?.streakFrozenUntil ? new Date(user.stats.streakFrozenUntil) : null;
                const isFrozen = streakFrozenUntil && streakFrozenUntil > parseLocalDate(today);
                const lastStreakDate = user.stats?.lastStreakDate;
                
                // If last streak date is older than yesterday (and not frozen), reset streak.
                if (user.stats?.streak && user.stats.streak > 0 && !isFrozen) {
                    if (!lastStreakDate || lastStreakDate < yesterdayStr) {
                         console.log(`[DAILY RESET] Streak Broken. Last active: ${lastStreakDate}, Yesterday: ${yesterdayStr}`);
                         // Reset streak to 0 but save previous streak for redemption
                         updateProfileLocally({
                             stats: {
                                 ...(user.stats || {}),
                                 streak: 0,
                                 previousStreak: user.stats.streak
                             }
                         });
                    }
                }

                // 2.2 Calculate daily streak health penalty: 2 HP for each day not active
                if (!isFrozen) {
                    const missedDaysCount = Math.max(1, Math.round((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000));
                    for (let i = 0; i < missedDaysCount; i++) {
                        const checkDateObj = new Date(lastDate + 'T12:00:00');
                        checkDateObj.setDate(checkDateObj.getDate() + i);
                        const checkDateStr = toLocalISOString(checkDateObj);
                        
                        if (lastStreakDate !== checkDateStr) {
                            damage += 2;
                        }
                    }
                    if (damage > 0) {
                        console.log(`[DAILY RESET] Streak not active. Deducting ${damage} HP.`);
                    }
                }

                // 3. Apply Damage
                let newHealth = health;
                if (damage > 0) {
                    console.log(`[DAILY RESET] Applying ${damage} damage.`);
                    newHealth = Math.max(0, health - damage);
                    
                }

                // 4. Reset Habits and Individual Streaks
                let resetHabits = habits;
                if (canProcessHabits) {
                    resetHabits = habits.map(h => {
                        let needsReset = false;
                        
                        // Backup state to lastDate first
                        let updatedHabit = backupHabitStateForDate(h, lastDate);

                        if (h.completedToday) {
                            updatedHabit.completedToday = false;
                            needsReset = true;
                        }

                        if (h.type === 'QUANTITY' && h.currentValue && h.currentValue > 0) {
                            updatedHabit.currentValue = 0;
                            needsReset = true;
                        }

                        if (h.type === 'CHECKLIST' && h.checklist && h.checklist.some(item => item.completed)) {
                            updatedHabit.checklist = updatedHabit.checklist!.map(item => ({ ...item, completed: false }));
                            needsReset = true;
                        }

                        // Check for broken streak (STRICT MODE)
                        const lastCompletion = h.history && h.history.length > 0 
                            ? getHistoryDateKey(h.history[h.history.length - 1])
                            : null;
                        const isStreakBroken = h.streak > 0 && (!lastCompletion || lastCompletion < yesterdayStr);
                        if (isStreakBroken && !isFrozen) {
                            updatedHabit.streak = 0;
                            needsReset = true;
                            console.log(`❌ [Streak] LOST: ${h.title}. Last: ${lastCompletion}, Yesterday: ${yesterdayStr}`);
                        }

                        return needsReset ? updatedHabit : h;
                    });
                    
                    resetHabits.forEach(h => {
                        // Check if the original habit differs from the updated one
                        const original = habits.find(orig => orig.id === h.id);
                        if (original && original !== h) {
                             const updates: any = {
                                 // 🛡️ FIX: Always stamp lastUpdatedDate=today so individual
                                 // checkDailyReset won't try to double-reset this habit
                                 lastUpdatedDate: today
                             };
                             if (original.completedToday !== h.completedToday) updates.completedToday = h.completedToday;
                             if (original.currentValue !== h.currentValue) updates.currentValue = h.currentValue;
                             if (original.checklist !== h.checklist) updates.checklist = h.checklist;
                             if (original.streak !== h.streak) updates.streak = h.streak;
                             if (h.valueHistory !== original.valueHistory) updates.valueHistory = h.valueHistory;
                             
                             persistenceService.habits.update(user.id, h.id, updates).catch(console.error);
                        }
                    });
                    // Ensure in-memory habits also have lastUpdatedDate updated
                    resetHabits = resetHabits.map(h => {
                        const original = habits.find(orig => orig.id === h.id);
                        return (original && original !== h) ? { ...h, lastUpdatedDate: today } : h;
                    });

                    // 4.5 Apply TP penalties for incomplete habits on active days
                    const getHabitDeficitPenalty = (level: number): number => {
                        if (level >= 1 && level <= 10) return 20;
                        if (level > 10 && level <= 20) return 30;
                        if (level > 20 && level <= 40) return 40;
                        if (level > 40 && level <= 60) return 60;
                        if (level > 60 && level <= 80) return 80;
                        return 100;
                    };

                    const missedDaysCount = Math.max(1, Math.round((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000));
                    for (let i = 0; i < missedDaysCount; i++) {
                        const checkDateObj = new Date(lastDate + 'T12:00:00');
                        checkDateObj.setDate(checkDateObj.getDate() + i);
                        const checkDateStr = toLocalISOString(checkDateObj);
                        
                        habits.forEach(h => {
                            if (h.archived) return;
                            const isActive = isHabitActive(h, checkDateObj);
                            if (isActive) {
                                const isCompleted = (i === missedDaysCount - 1) ? h.completedToday : false;
                                if (!isCompleted) {
                                    const attr = attributes.find(a => a.id === h.attribute);
                                    const lvl = attr ? attr.level : 1;
                                    const penalty = getHabitDeficitPenalty(lvl);
                                    
                                    console.log(`[DAILY RESET] Day ${checkDateStr}: Habit "${h.title}" not completed. Deducting ${penalty} TP from ${h.attribute}.`);
                                    updateAttributeXp(h.attribute, -penalty, h.subAttribute);
                                }
                            }
                        });
                    }
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
                

                // OPTIMISTIC UPDATE: Update UI immediately
                if (damage > 0) setHealth(newHealth);
                if (canProcessHabits) {
                    setHabits(resetHabits);
                    PersistenceService.saveCollection(user.id, 'habits', resetHabits);
                }

                // 📊 FEED DE MEJORA: Save yesterday's feed entry before resetting dailyLimits
                try {
                    const yesterdayDate = new Date(lastDate + 'T12:00:00');
                    const yesterdayDayOfWeek = yesterdayDate.getDay();
                    
                    // Compute sub-habits from yesterday's state (before reset)
                    let subHabitsCompleted = 0;
                    let subHabitsTotal = 0;
                    habits.forEach(h => {
                        if (h.archived) return;
                        if (h.type === 'CHECKLIST' && h.checklist) {
                            const isActive = isHabitActive(h, yesterdayDate);
                            if (isActive) {
                                const activeChecklist = h.checklist.filter(sub => !sub.days || sub.days.length === 0 || sub.days.includes(yesterdayDayOfWeek));
                                subHabitsTotal += activeChecklist.length;
                                subHabitsCompleted += activeChecklist.filter(item => item.completed).length;
                            }
                        }
                    });

                    // Compute top projects and focus seconds from sessions on lastDate
                    let focusSecondsOnDay = 0;
                    const topProjects: { name: string; minutes: number; color?: string }[] = [];
                    const projectMap = new Map<string, { name: string; minutes: number; color?: string }>();
                    projects.forEach(p => {
                        if (p.sessions) {
                            const daySessions = p.sessions.filter(s => {
                                if (!s.date) return false;
                                try {
                                    return toLocalISOString(new Date(s.date)) === lastDate;
                                } catch (e) {
                                    return false;
                                }
                            });
                            if (daySessions.length > 0) {
                                const mins = Math.round(daySessions.reduce((a, s) => a + (s.duration || 0), 0) / 60);
                                focusSecondsOnDay += daySessions.reduce((a, s) => a + (s.duration || 0), 0);
                                if (mins > 0) projectMap.set(p.id, { name: p.title, minutes: mins, color: p.color });
                            }
                        }
                    });
                    topProjects.push(...Array.from(projectMap.values()).sort((a, b) => b.minutes - a.minutes).slice(0, 5));

                    // Tasks Completed on lastDate
                    const tasksCompletedOnDay = quests.filter(q => {
                        if (!q.completed || !q.completedAt) return false;
                        try {
                            return toLocalISOString(new Date(q.completedAt)) === lastDate;
                        } catch (e) {
                            return false;
                        }
                    }).length;

                    // Habits Completed on lastDate
                    const habitsCompletedOnDay = habits.filter(h => {
                        if (h.archived) return false;
                        const history = h.history || [];
                        return history.some(d => {
                            try {
                                return toLocalISOString(new Date(d)) === lastDate || d.startsWith(lastDate);
                            } catch (e) {
                                return d.startsWith(lastDate);
                            }
                        });
                    }).length;

                    const yesterdayScore = calculateLiveProductivityScore(quests, habits, projects, dailyLimits, yesterdayDate);

                    const feedEntry = {
                        id: `feed_${lastDate}`,
                        date: lastDate,
                        tasksCompleted: tasksCompletedOnDay,
                        tasksTotal: quests.filter(q => !q.completed).length + tasksCompletedOnDay,
                        focusMinutes: Math.round(Math.max(Number(dailyLimits.focusSeconds || 0), focusSecondsOnDay) / 60),
                        focusSessions: topProjects.length,
                        habitsCompleted: habitsCompletedOnDay,
                        habitsTotal: habits.filter(h => isHabitActive(h, yesterdayDate)).length,
                        subHabitsCompleted,
                        subHabitsTotal,
                        xpEarned: Number(dailyLimits.totalXp || 0) || (Number(dailyLimits.taskXp || 0) + Number(dailyLimits.focusXp || 0) + Number(dailyLimits.habitXp || 0)),
                        goldEarned: Number(dailyLimits.totalGold || 0) || (Number(dailyLimits.taskGold || 0) + Number(dailyLimits.focusGold || 0) + Number(dailyLimits.habitGold || 0)),
                        tpEarned: Number(dailyLimits.totalTraitPoints || 0) || (Number(dailyLimits.taskTraitPoints || 0) + Number(dailyLimits.focusTraitPoints || 0) + Number(dailyLimits.habitTraitPoints || 0)),
                        streak: user.stats?.streak || 0,
                        topProjects,
                        completedTaskTitles: quests.filter(q => {
                            if (!q.completed || !q.completedAt) return false;
                            try {
                                return toLocalISOString(new Date(q.completedAt)) === lastDate;
                            } catch (e) {
                                return false;
                            }
                        }).map(q => q.title).slice(0, 5),
                        completedHabitTitles: habits.filter(h => {
                            if (h.archived || !h.completedToday) return false;
                            return true;
                        }).map(h => h.title).slice(0, 5),
                        createdAt: Date.now(),
                        score: yesterdayScore
                    };

                    // Update local cache optimistically
                    const currentFeed = PersistenceService.getCollection<any>(user.id, 'dailyFeed') || [];
                    const updatedFeed = [feedEntry, ...currentFeed.filter((e: any) => e.date !== lastDate)].sort((a, b) => b.date.localeCompare(a.date));
                    PersistenceService.saveCollection(user.id, 'dailyFeed', updatedFeed);

                    // 🛡️ USE OFFLINE QUEUE FOR RELIABILITY
                    OfflineSyncService.addAction({
                        type: 'SAVE',
                        collectionName: 'dailyFeed',
                        userId: user.id,
                        itemId: `feed_${lastDate}`,
                        data: feedEntry
                    });
                    
                    console.log(`[DAILY FEED] ✅ Saved feed entry for ${lastDate} to offline queue and local cache`);
                    
                    // 🔄 FIX: Notify useDailyFeed hook to reload from cache
                    try {
                        window.dispatchEvent(new CustomEvent('matrix:feed-updated', { detail: { date: lastDate } }));
                    } catch (e) { /* ignore */ }
                } catch (feedError) {
                    console.warn('[DAILY FEED] Failed to save feed entry (non-critical):', feedError);
                }

                setDailyLimits(newLimits);

                try {
                    // SAVE STATS AND LIMITS TO SUPABASE (RESILIENT)
                    const isBroken = user.stats?.streak > 0 && !isFrozen && (!lastStreakDate || lastStreakDate < yesterdayStr);
                    const updatedStats = {
                        ...(user.stats || {}),
                        streak: isBroken ? 0 : (user.stats?.streak || 0),
                        previousStreak: isBroken ? user.stats?.streak : (user.stats?.previousStreak || 0),
                        lastStreakDate: !isBroken ? lastStreakDate : user.stats?.lastStreakDate
                    };

                    updateProfileLocally({ 
                        stats: updatedStats,
                        dailyLimits: newLimits 
                    });

                    // 🛡️ Queue stats update to Supabase
                    OfflineSyncService.addAction({
                        type: 'STATS_SYNC',
                        collectionName: 'users',
                        userId: user.id,
                        itemId: user.id,
                        data: { stats: updatedStats, dailyLimits: newLimits }
                    });
                    
                    console.log('[DAILY RESET] ✅ Queued dailyLimits and stats sync');
                } catch (error) {
                    console.error('[DAILY RESET] Failed to queue daily limits update:', error);
                }
            }
            
            setIsDailyCheckDone(true);
        };

        processDailyReset();
    }, [user ? user.id : null, areHabitsLoaded, isDailyCheckDone, dailyLimits.date]);

    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const attributesRef = useRef(attributes);
    attributesRef.current = attributes;
    const prevAttributes = useRef(attributes);
    const [areAttributesLoaded, setAreAttributesLoaded] = useState(false);
    const projectsHydratedRef = useRef(false);
    const allowEmptyProjectsSaveRef = useRef(false);
    const lastNonEmptyProjectsRef = useRef<Project[]>([]);
    const questsHydratedRef = useRef(false);
    const badHabitsHydratedRef = useRef(false);
    const smartProjectsHydratedRef = useRef(false);
    const hasSyncedCollectionsRef = useRef(false);
    // 💸 AHORRO MÁXIMO: Incrementamos el tiempo de caché de 5 minutos a 1 HORA (3600000 ms)
    // PERO ignoramos este TTL durante la primera carga para asegurar sincronización entre dispositivos.
    const COLLECTION_SYNC_TTL = 60 * 60 * 1000;
    const hydrateAttributes = (fetchedAttrs: Attribute[]) => {
        let mergedAttrs = [...fetchedAttrs];
        const missingTraitIds = ['DISCIPLINA', 'RESILIENCIA'].filter(
            id => !mergedAttrs.some(a => a.id === id)
        );
        
        const currentUserId = user?.id || authProfile?.uid || authProfile?.id;
        
        if (missingTraitIds.length > 0 && currentUserId) {
            console.log("🩹 Auto-healing missing transversal traits in hydrateAttributes:", missingTraitIds);
            missingTraitIds.forEach(id => {
                const def = TRAITS_LIST.find(t => t.id === id);
                if (def) {
                    const archived = (user || authProfile)?.archivedTraits?.[id];
                    const newAttr: Attribute = {
                        id: def.id,
                        label: def.label,
                        level: archived?.level || 1,
                        xp: archived?.xp || 0,
                        maxXp: calculateAttributeMaxXp(archived?.level || 1),
                        color: def.color,
                        icon: def.icon,
                        iconName: archived?.iconName || (def.icon as any)?.name || 'Hexagon'
                    };
                    mergedAttrs.push(newAttr);
                    persistenceService.attributes.save(currentUserId, newAttr).catch(console.error);
                }
            });
        }

        if (mergedAttrs.length > 0) {
            const enriched = mergedAttrs.map(attr => {
                const def = TRAITS_LIST.find(t => t.id === attr.id);
                let mappedIcon = def?.icon;
                if (!mappedIcon && attr.iconName && ICONS_MAP[attr.iconName]) {
                    mappedIcon = ICONS_MAP[attr.iconName];
                }
                if (!mappedIcon) {
                    mappedIcon = ICONS_MAP['Hexagon'];
                }
                
                let attrXp = attr.xp || 0;
                let attrLevel = attr.level || 1;
                let attrMaxXp = calculateAttributeMaxXp(attrLevel);
                let attrChanged = false;
                while (attrXp >= attrMaxXp) {
                    attrXp -= attrMaxXp;
                    attrLevel += 1;
                    attrMaxXp = calculateAttributeMaxXp(attrLevel);
                    attrChanged = true;
                }

                const updatedSubTraits = attr.subTraits?.map(st => {
                    let subXp = st.xp || 0;
                    let subLevel = st.level || 1;
                    let subMaxXp = calculateSubTraitMaxXp(subLevel);
                    while (subXp >= subMaxXp) {
                        subXp -= subMaxXp;
                        subLevel += 1;
                        subMaxXp = calculateSubTraitMaxXp(subLevel);
                    }
                    return {
                        ...st,
                        level: subLevel,
                        xp: subXp,
                        maxXp: subMaxXp
                    };
                }) || [];

                const enrichedAttr = { 
                    ...attr, 
                    icon: mappedIcon, 
                    color: def?.color || attr.color, 
                    label: def?.label || attr.label,
                    level: attrLevel,
                    xp: attrXp,
                    maxXp: attrMaxXp,
                    subTraits: updatedSubTraits
                };

                const subtraitsChanged = updatedSubTraits.some((st, idx) => {
                    const originalSt = attr.subTraits?.[idx];
                    return !originalSt || st.level !== originalSt.level || st.xp !== originalSt.xp;
                });

                if (attrChanged || subtraitsChanged) {
                    if (currentUserId) {
                        const cleanAttr = { ...enrichedAttr };
                        delete (cleanAttr as any).icon;
                        console.log(`🩹 Auto-correcting trait stats for ${attr.id}: XP ${attr.xp}/${attr.maxXp} (Lvl ${attr.level}) -> XP ${attrXp}/${attrMaxXp} (Lvl ${attrLevel})`);
                        persistenceService.attributes.save(currentUserId, cleanAttr).catch(console.error);
                        TransactionService.updateAttributeXpAtomic(currentUserId, cleanAttr).catch(console.error);
                    }
                }

                return enrichedAttr;
            });
            setAttributes(enriched);
            
            // Save healed attributes back to cache and local database
            if (currentUserId) {
                const attrsForCache = enriched.map(({ icon, ...rest }) => rest);
                PersistenceService.saveCollection(currentUserId, 'attributes', attrsForCache);
                enriched.forEach(a => {
                    persistenceService.attributes.save(currentUserId, a).catch(console.error);
                });
            }
        } else {
            setAttributes([]);
        }
        setAreAttributesLoaded(true);
    };

    // Auto-heal transversal traits for logged-in users at any time
    useEffect(() => {
        if (!areAttributesLoaded || !user?.id || user.isSkeleton) return;
        
        const missingTraitIds = ['DISCIPLINA', 'RESILIENCIA'].filter(
            id => !attributes.some(a => a.id === id)
        );
        
        if (missingTraitIds.length > 0) {
            console.log("🩹 Auto-healing missing transversal traits (useEffect):", missingTraitIds);
            
            const newAttributes = [...attributes];
            let hasAdded = false;
            
            missingTraitIds.forEach(id => {
                const def = TRAITS_LIST.find(t => t.id === id);
                if (def) {
                    const archived = user.archivedTraits?.[id];
                    const newAttr: Attribute = {
                        id: def.id,
                        label: def.label,
                        level: archived?.level || 1,
                        xp: archived?.xp || 0,
                        maxXp: archived?.maxXp || calculateAttributeMaxXp(archived?.level || 1),
                        color: def.color,
                        icon: def.icon || ICONS_MAP['Hexagon'],
                        iconName: archived?.iconName || (def.icon as any)?.name || 'Hexagon'
                    };
                    
                    let mappedIcon = def.icon;
                    if (!mappedIcon && newAttr.iconName && ICONS_MAP[newAttr.iconName]) {
                        mappedIcon = ICONS_MAP[newAttr.iconName];
                    }
                    newAttr.icon = mappedIcon || ICONS_MAP['Hexagon'];
                    
                    newAttributes.push(newAttr);
                    hasAdded = true;
                    persistenceService.attributes.save(user.id, newAttr).catch(console.error);
                }
            });
            
            if (hasAdded) {
                setAttributes(newAttributes);
                const attrsForCache = newAttributes.map(({ icon, ...rest }) => rest);
                PersistenceService.saveCollection(user.id, 'attributes', attrsForCache);
            }
        }
    }, [areAttributesLoaded, attributes, user?.id, user?.isSkeleton]);

    // --- ACHIEVEMENT LISTENER ---
    const processingAchievements = useRef(false);
    useEffect(() => {
        const verifyAchievements = async () => {
            if (processingAchievements.current) return;
            
            if (user && player.xp > 0 && !user.isSkeleton) {
                processingAchievements.current = true;
                try {
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
                        // Si hay muchos logros de golpe, probablemente sea una sincronización 
                        // de cuenta antigua en un nuevo dispositivo. Los guardamos pero no spameamos.
                        if (newAchievements.length > 3) {
                            console.log("⚡ MATRIX: Catch-up de logros detectado. Silenciando notificaciones.");
                            // Podríamos mostrar un solo toast consolidado
                            setTimeout(() => {
                                setLastAchievement({
                                    id: 'catchup_sync',
                                     title: 'Sincronización de Logros',
                                     description: `Se han restaurado ${newAchievements.length} logros de tu perfil.`,
                                     icon: Trophy,
                                     xpReward: 0,
                                     category: 'SYSTEM' as any,
                                     condition: () => true
                                });
                            }, 1000);
                        } else {
                            // Queue achievements normally
                            newAchievements.forEach((ach, index) => {
                                setTimeout(() => {
                                    setLastAchievement(ach);
                                }, index * 4500); // 4s toast + 0.5s gap
                            });
                        }
                    }
                } finally {
                    processingAchievements.current = false;
                }
            }
        };
        
        verifyAchievements();
    }, [player.xp, player.level, user, health, attributes]);

    // --- LOAD PROJECTS, QUESTS, HABITS, NOTES, JOURNAL ---
    useEffect(() => {
        if (!user?.id) return;
        const uid = user.id;
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

        // Hydrate dailyFeed cache
        const cachedDailyFeed = PersistenceService.getCollection<any>(uid, 'dailyFeed');
        if (cachedDailyFeed !== null) {
            setYesterdayUpdateTrigger(prev => prev + 1);
        }

        if (!isOnline) return;

        const hasSynced = hasSyncedCollectionsRef.current;
        const bypassTTL = syncTrigger > 0 && syncTrigger !== lastSyncTrigger.current;
        lastSyncTrigger.current = syncTrigger;
        const currentTTL = (hasSynced && !bypassTTL) ? COLLECTION_SYNC_TTL : 0;

        // 🚀 PERFORMANCE: Delay the initial sync on cold boot to let the UI breathe
        const performSync = () => {
            // Process any pending offline actions before fetching to ensure updates are pushed
            OfflineSyncService.processQueue();

            // Auto Backup Check
            if (!hasSynced) {
                persistenceService.settings.get(uid).then(async settings => {
                    if (settings?.autoBackupEnabled) {
                        try {
                            const { supabase } = await import('../../../services/supabase');
                            const { data } = await supabase.from('user_collections').select('data').eq('id', `backup_${uid}`).limit(1);
                            const lastBackup = data?.[0]?.data?.timestamp || 0;
                            const DAY_MS = 24 * 60 * 60 * 1000;
                            if (Date.now() - lastBackup > DAY_MS) {
                                await BackupService.createCloudBackup(uid);
                                console.log("☁️ MATRIX: Auto Cloud Backup performed.");
                            }
                        } catch (e: any) {
                            console.error("Auto Backup failed", e);
                        }
                    }
                });
            }

            if (!projectsLoaded || PersistenceService.shouldSyncCollection(uid, 'projects', currentTTL)) {
                projectService.getUserProjects(uid).then(projects => {
                    if (!projects) return;
                    const resolvedProjects = OfflineSyncService.applyPendingActionsToCollection(uid, 'projects', projects);
                    const cached = PersistenceService.getCollection<Project>(uid, 'projects');
                    if (resolvedProjects.length === 0 && cached && cached.length > 0) {
                        cached.forEach(p => persistenceService.projects.save(uid, p));
                        return;
                    }
                    let merged: Project[] = [];
                    let canSave = false;
                    setProjects(prev => {
                        merged = mergeProjects(prev, resolvedProjects);
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

            if (!questsLoaded || PersistenceService.shouldSyncCollection(uid, 'quests', currentTTL)) {
                persistenceService.quests.getAll(uid).then(quests => {
                    if (!quests) return;
                    const resolvedQuests = OfflineSyncService.applyPendingActionsToCollection(uid, 'quests', quests);
                    // Supabase is the source of truth. If it returns an empty array,
                    // the user has no quests (respect deletions). Do NOT re-upload from cache.
                    setQuests(resolvedQuests);
                    PersistenceService.saveCollection(uid, 'quests', resolvedQuests);
                    questsHydratedRef.current = true;
                });
            }

            if (!habitsLoaded || PersistenceService.shouldSyncCollection(uid, 'habits', currentTTL)) {
                persistenceService.habits.getAll(uid).then(h => {
                    if (!h) return;
                    
                    const resolvedHabits = OfflineSyncService.applyPendingActionsToCollection(uid, 'habits', h);
                    const cached = PersistenceService.getCollection<Habit>(uid, 'habits');
                    if (resolvedHabits.length === 0 && cached && cached.length > 0) {
                        cached.forEach(habit => persistenceService.habits.save(uid, habit));
                        return;
                    }

                    // 🛡️ SANITIZATION: Fix Legacy Habits without createdAt
                    const now = Date.now();
                    let hasFixes = false;
                    const sanitizedHabits = resolvedHabits.map(habit => {
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

            if (!badHabitsLoaded || PersistenceService.shouldSyncCollection(uid, 'badHabits', currentTTL)) {
                persistenceService.badHabits.getAll(uid).then(items => {
                    if (!items) return;
                    const resolvedItems = OfflineSyncService.applyPendingActionsToCollection(uid, 'badHabits', items);
                    const cached = PersistenceService.getCollection<BadHabit>(uid, 'badHabits');
                    if (resolvedItems.length === 0 && cached && cached.length > 0) {
                        cached.forEach(bh => persistenceService.badHabits.save(uid, bh));
                        return;
                    }
                    setBadHabits(resolvedItems);
                    PersistenceService.saveCollection(uid, 'badHabits', resolvedItems);
                    badHabitsHydratedRef.current = true;
                });
            }

            if (!smartProjectsLoaded || PersistenceService.shouldSyncCollection(uid, 'smartProjects', currentTTL)) {
                persistenceService.smartProjects.getAll(uid).then(items => {
                    if (!items) return;
                    const resolvedItems = OfflineSyncService.applyPendingActionsToCollection(uid, 'smartProjects', items);
                    const cached = PersistenceService.getCollection<SmartProject>(uid, 'smartProjects');
                    if (resolvedItems.length === 0 && cached && cached.length > 0) {
                        cached.forEach(sp => persistenceService.smartProjects.save(uid, sp));
                        return;
                    }
                    setSmartProjects(resolvedItems);
                    PersistenceService.saveCollection(uid, 'smartProjects', resolvedItems);
                    smartProjectsHydratedRef.current = true;
                });
            }

            if (!attributesLoaded || PersistenceService.shouldSyncCollection(uid, 'attributes', currentTTL)) {
                persistenceService.attributes.getAll(uid).then(async (fetchedAttrs) => {
                    if (!fetchedAttrs) return;
                    
                    const cached = PersistenceService.getCollection<Attribute>(uid, 'attributes');
                    if (fetchedAttrs.length === 0 && cached && cached.length > 0) {
                        cached.forEach(a => persistenceService.attributes.save(uid, a));
                        return;
                    }
                    
                    // 🛡️ SPLIT BRAIN FIX: Fetch Firebase attributes as fallback/merge
                    try {
                        const fbAttrs = await persistenceService.attributes.getAll(uid) || [];
                        
                        // Merge Firebase and Supabase attributes (Supabase takes precedence for metadata, 
                        // but Firebase takes precedence for XP/Level if it's higher)
                        const mergedMap = new Map<string, Attribute>();
                        fbAttrs.forEach((a: Attribute) => mergedMap.set(a.id, a));
                        fetchedAttrs.forEach(a => {
                            const existing = mergedMap.get(a.id);
                            if (!existing) {
                                mergedMap.set(a.id, a);
                            } else {
                                // Supabase has it, Firebase has it.
                                // Keep Supabase metadata, but take the highest XP/Level
                                const fbTotalXp = existing.xp + (existing.level * 1000);
                                const supaTotalXp = a.xp + (a.level * 1000);
                                
                                if (fbTotalXp > supaTotalXp) {
                                    mergedMap.set(a.id, { ...a, xp: existing.xp, level: existing.level, maxXp: existing.maxXp });
                                } else {
                                    mergedMap.set(a.id, a);
                                }
                            }
                        });
                        
                        const merged = Array.from(mergedMap.values());
                        hydrateAttributes(merged);
                        const attrsForCache = merged.map(({ icon, ...rest }) => rest);
                        PersistenceService.saveCollection(uid, 'attributes', attrsForCache);
                        
                        // Auto-migrate to Supabase to heal the split brain permanently
                        fbAttrs.forEach((fbAttr: Attribute) => {
                            const supaAttr = fetchedAttrs.find(sa => sa.id === fbAttr.id);
                            if (!supaAttr || (fbAttr.xp + (fbAttr.level * 1000)) > (supaAttr.xp + (supaAttr.level * 1000))) {
                                persistenceService.attributes.save(uid, fbAttr);
                            }
                        });
                    } catch (e: any) {
                        console.error("Failed to fetch Firebase attributes fallback", e);
                        hydrateAttributes(fetchedAttrs);
                        const attrsForCache = fetchedAttrs.map(({ icon, ...rest }) => rest);
                        PersistenceService.saveCollection(uid, 'attributes', attrsForCache);
                    }
                });
            }

            // Sync dailyFeed from Supabase
            if (PersistenceService.shouldSyncCollection(uid, 'dailyFeed', currentTTL)) {
                persistenceService.dailyFeed.getAll(uid).then(feed => {
                    if (!feed) return;
                    PersistenceService.saveCollection(uid, 'dailyFeed', feed);
                    setYesterdayUpdateTrigger(prev => prev + 1);
                });
            }
            
            hasSyncedCollectionsRef.current = true;
        };

        if (hasSynced) {
            performSync();
        } else {
            // First load: delay network sync by 2.5s so the UI can finish mounting and animating
            setTimeout(performSync, 2500);
        }
    }, [user?.id, syncTrigger]);

    useEffect(() => {
        if (!user?.id || !areHabitsLoaded) return;
        PersistenceService.saveCollection(user.id, 'habits', habits);
    }, [habits, user?.id, areHabitsLoaded]);

    useEffect(() => {
        if (!user?.id) return;
        if (!questsHydratedRef.current) return;
        PersistenceService.saveCollection(user.id, 'quests', quests);
    }, [quests, user?.id]);

    useEffect(() => {
        if (user?.id && areHabitsLoaded && projectsHydratedRef.current && questsHydratedRef.current) {
            notificationService.syncAllNotifications(user.id);
        }
    }, [user?.id, areHabitsLoaded, projectsHydratedRef.current, questsHydratedRef.current]);

    useEffect(() => {
        const handleQuestUpdated = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail || !detail.questId) return;
            const { questId, subtasks } = detail;
            setQuests(prev => {
                const index = prev.findIndex(q => q.id === questId);
                if (index === -1) return prev;
                const next = [...prev];
                next[index] = { ...next[index], subtasks };
                if (user?.id) {
                    PersistenceService.saveCollection(user.id, 'quests', next);
                }
                return next;
            });
        };

        window.addEventListener('matrix-quest-updated', handleQuestUpdated);
        return () => window.removeEventListener('matrix-quest-updated', handleQuestUpdated);
    }, [user?.id]);



    useEffect(() => {
        if (!user?.id) return;
        if (!badHabitsHydratedRef.current) return;
        PersistenceService.saveCollection(user.id, 'badHabits', badHabits);
    }, [badHabits, user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        if (!smartProjectsHydratedRef.current) return;
        PersistenceService.saveCollection(user.id, 'smartProjects', smartProjects);
    }, [smartProjects, user?.id]);

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
                if (user?.id) {
                    saveProjectsCache(user.id, cleanProjects);
                }
            }
        }
    }, [projects.length, user?.id, saveProjectsCache]); // Run when count changes or user changes

    useEffect(() => {
        if (projects.length > 0) {
            lastNonEmptyProjectsRef.current = projects;
        }
    }, [projects]);

    useEffect(() => {
        if (!user?.id) return;
        if (!projectsHydratedRef.current) return;
        const shouldAllowEmpty = allowEmptyProjectsSaveRef.current;
        if (projects.length === 0 && !shouldAllowEmpty) {
            const cached = PersistenceService.getCollection<Project>(user.id, 'projects');
            if ((cached?.length ?? 0) > 0 || lastNonEmptyProjectsRef.current.length > 0) {
                return;
            }
        }
        if (projects.length === 0 && shouldAllowEmpty) {
            allowEmptyProjectsSaveRef.current = false;
        }
        saveProjectsCache(user.id, projects);
    }, [projects, user?.id, saveProjectsCache]);

    useEffect(() => {
        if (!user?.id || !areAttributesLoaded) return;
        const attrsForCache = attributes.map(({ icon, ...rest }) => rest);
        PersistenceService.saveCollection(user.id, 'attributes', attrsForCache);
    }, [attributes, user?.id, areAttributesLoaded]);

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
            const changes = user?.preferences?.traitChanges || user?.traitChanges || { count: 0, weekStart: now };
            
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
            if (user?.id) {
                const newPrefs = {
                    ...(user.preferences || {}),
                    traitChanges: { count: newCount + 1, weekStart: newStart }
                };
                updateProfileLocally({ preferences: newPrefs });
                supabase.from('users')
                    .update({ preferences: newPrefs })
                    .eq('id', user.id)
                    .then(({ error }) => {
                        if (error) console.error("Error updating trait changes in preferences:", error);
                    });
            }
        }

        let def = TRAITS_LIST.find(t => t.id === traitId);
        
        // RESTORE FROM ARCHIVE IF EXISTS
        const archived = user?.archivedTraits?.[traitId];

        if (!def && archived) {
            // It's a custom trait being restored
            def = {
                id: traitId,
                label: archived.label || traitId,
                color: archived.color || '#3b82f6',
                icon: ICONS_MAP[archived.iconName || 'Hexagon'] || ICONS_MAP['Hexagon'],
                desc: ''
            };
        }

        if (!def) return;

        const newAttr: Attribute = {
            id: def.id,
            label: def.label,
            level: archived?.level || 1,
            xp: archived?.xp || 0,
            maxXp: archived?.maxXp || calculateAttributeMaxXp(archived?.level || 1),
            color: def.color,
            icon: def.icon,
            iconName: archived?.iconName || def.icon?.name || 'Hexagon'
        };

        // Optimistic update
        setAttributes(prev => [...prev, newAttr]);

        // Save to DB
        if (!user?.id) return;
        await persistenceService.attributes.save(user.id, newAttr);
    };

    const addCustomAttribute = async (attrData: Omit<Attribute, 'id' | 'level' | 'xp' | 'maxXp'>) => {
        if (!user?.id || user?.plan !== 'PRO') return;

        const newId = 'CUSTOM_' + Date.now().toString(36);
        const newAttr: Attribute = {
            id: newId,
            label: attrData.label,
            color: attrData.color,
            icon: attrData.icon,
            iconName: attrData.iconName,
            level: 1,
            xp: 0,
            maxXp: calculateAttributeMaxXp(1)
        };

        setAttributes(prev => {
            const next = [...prev, newAttr];
            PersistenceService.saveCollection(user.id, 'attributes', next.map(({ icon, ...rest }) => rest));
            return next;
        });
        await persistenceService.attributes.save(user.id, newAttr);
    };

    const removeAttribute = async (traitId: string) => {
        // LIMIT CHECK: Rate Limit (Changes per week)
        if (user?.plan !== 'PRO') {
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const changes = user?.preferences?.traitChanges || user?.traitChanges || { count: 0, weekStart: now };
            
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
            if (user?.id) {
                const newPrefs = {
                    ...(user.preferences || {}),
                    traitChanges: { count: newCount + 1, weekStart: newStart }
                };
                updateProfileLocally({ preferences: newPrefs });
                supabase.from('users')
                    .update({ preferences: newPrefs })
                    .eq('id', user.id)
                    .then(({ error }) => {
                        if (error) console.error("Error updating trait changes in preferences:", error);
                    });
            }
        }

        if (!user?.id) return;
        
        // Find trait to archive
        const attrToArchive = attributes.find(a => a.id === traitId);

        // Optimistic update
        setAttributes(prev => prev.filter(a => a.id !== traitId));

        // Dissociate from Habits, Projects, Bad Habits, Quests
        setHabits(prev => prev.map(h => h.attribute === traitId ? { ...h, attribute: '' } : h));
        setBadHabits(prev => prev.map(h => h.attribute === traitId ? { ...h, attribute: '' } : h));
        setProjects(prev => prev.map(p => p.attribute === traitId ? { ...p, attribute: '' } : p));
        setQuests(prev => prev.map(q => q.attribute === traitId ? { ...q, attribute: '' } : q));

        try {
            
            
            // 1. Delete Attribute Doc (Firebase)
            
            

            // 1.5. Delete Attribute Doc (Supabase)
            persistenceService.attributes.delete(user.id, traitId).catch(e => console.error("Failed to delete trait from Supabase", e));

            // 2. Archive Stats in User Doc
            if (attrToArchive) {
                
                const archivedData = {
                    level: attrToArchive.level,
                    xp: attrToArchive.xp,
                    maxXp: attrToArchive.maxXp,
                    label: attrToArchive.label,
                    color: attrToArchive.color,
                    iconName: attrToArchive.iconName
                };
                
                // Update Supabase directly since batch.update is mocked
                const newArchivedTraits = {
                    ...(authProfile?.archivedTraits || {}),
                    [traitId]: archivedData
                };
                
                if (user?.id) {
                    supabase.from('users').update({ 
                        preferences: { 
                            ...(authProfile?.preferences || {}), 
                            archivedTraits: newArchivedTraits 
                        } 
                    }).eq('id', user.id).then(({ error }) => {
                        if (error) console.error("[TRAIT] Failed to update Supabase", error);
                    });
                }

                // Optimistic local update
                if (authProfile) {
                    updateProfileLocally({
                        archivedTraits: newArchivedTraits
                    });
                }
            }

            // 3. Update Associated Items in Firestore
            habits.forEach(h => {
                if (h.attribute === traitId) {
                    persistenceService.habits.update(user.id, h.id, { attribute: '' }).catch(console.error);
                }
            });
            
            badHabits.forEach(h => {
                if (h.attribute === traitId) {
                    persistenceService.badHabits.update(user.id, h.id, { attribute: '' }).catch(console.error);
                }
            });
            
            projects.forEach(p => {
                if (p.attribute === traitId) {
                    persistenceService.projects.update(user.id, p.id, { attribute: '' }).catch(console.error);
                }
            });
            
            quests.forEach(q => {
                if (q.attribute === traitId) {
                    persistenceService.quests.update(user.id, q.id, { attribute: '' }).catch(console.error);
                }
            });

            
        } catch (e: any) {
            console.error("[TRAIT] Failed to remove/archive trait", e);
        }
    };

    // --- AUTO-SAVE SETTINGS ---
    useEffect(() => {
        if (user?.id) {
             persistenceService.settings.save(user.id, { theme: currentTheme, showProfile, defaultChartMode });
        }
    }, [currentTheme, showProfile, defaultChartMode, user?.id]);

    // --- DAILY RESET TRIGGER (Visibility + Midnight Timer) ---
    const [dailyResetTrigger, setDailyResetTrigger] = useState(0);
    
    // Visibility Check
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("👁️ APP VISIBLE: Triggering Daily Check & Sync");
                setDailyResetTrigger(prev => prev + 1);
                setSyncTrigger(prev => prev + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Midnight Check (Every Minute)
    // 🛡️ FIX: Track last known date to detect ANY day change (handles app staying open across midnight)
    const lastKnownDateRef = useRef(toLocalISOString(new Date()));
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentDate = toLocalISOString(now);
            if (currentDate !== lastKnownDateRef.current) {
                console.log(`🕛 DAY CHANGE DETECTED: ${lastKnownDateRef.current} → ${currentDate}. Triggering Daily Reset.`);
                lastKnownDateRef.current = currentDate;
                setDailyResetTrigger(prev => prev + 1);
                setSyncTrigger(prev => prev + 1);
            }
        }, 30000); // Check every 30 seconds for reliability
        return () => clearInterval(interval);
    }, []);

    // --- DAILY RESET & STREAK LOGIC ---
    useEffect(() => {
        if (!habits.length || !user?.id) return;

        const checkDailyReset = async () => {
            const today = new Date();
            const todayStr = toLocalISOString(today);

            // 🛡️ RACE CONDITION PREVENTION: If global daily reset is pending (date is old),
            // do not reset individual habits yet. Let processDailyReset handle it first.
            if (dailyLimits.date && dailyLimits.date !== todayStr) {
                console.log("[Daily Reset] Delaying individual habit reset until global reset completes");
                return;
            }

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

                const wasUpdatedToday = habit.lastUpdatedDate === todayStr;

                // Reset partial or full progress if it was made on a previous day
                const hasPartialProgress = habit.currentValue !== undefined && habit.currentValue > 0 || 
                                           (habit.type === 'CHECKLIST' && habit.checklist?.some(i => i.completed));

                if (!wasUpdatedToday && (habit.completedToday || hasPartialProgress)) {
                    // Backup state to yesterdayStr first
                    const backedUpItem = backupHabitStateForDate(habit, yesterdayStr);
                    newItem.valueHistory = backedUpItem.valueHistory;
                    newItem.checklist = backedUpItem.checklist;
                    
                    newItem.completedToday = false;
                    
                    // Reset checklist if it exists
                    if (habit.type === 'CHECKLIST' && newItem.checklist) {
                        newItem.checklist = newItem.checklist.map(i => ({ ...i, completed: false }));
                    }
                    
                    // Reset quantity
                    if (habit.type === 'QUANTITY') {
                        newItem.currentValue = 0;
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
                    if (newItem.currentValue !== undefined) {
                        updates.currentValue = newItem.currentValue;
                    }
                    persistenceService.habits.update(user.id, habit.id, updates);
                }
                return newItem;
            });

            if (hasChanges) {
                setHabits(updatedHabits);
            }
        };

        // Run check
        checkDailyReset();

        const checkBadHabitsDaily = async () => {
            if (!user?.id) return;
            const today = new Date();
            const todayStr = toLocalISOString(today);

            let hasChanges = false;
            let disciplineRewards: { habitId: string; habitTitle: string; traitId: string; bonusTp: number }[] = [];

            const updatedBadHabits = badHabits.map(habit => {
                const newItem = { ...habit };

                // 1. Skip if already checked today (prevents +1 day on every app restart)
                if (habit.lastCheckedDate === todayStr) {
                    return newItem;
                }

                // 2. If lastCheckedDate is not set, initialize to today Str (newly created habit tracking starts today)
                if (!habit.lastCheckedDate) {
                    newItem.lastCheckedDate = todayStr;
                    hasChanges = true;
                    return newItem;
                }

                if (!habit.intelligentStreak) {
                    // Logic for normal bad habit streaks
                    const lastChecked = parseLocalDate(habit.lastCheckedDate);
                    const todayDate = parseLocalDate(todayStr);
                    const diffTime = Math.abs(todayDate.getTime() - lastChecked.getTime());
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 0) {
                        const increment = diffDays;
                        newItem.streak = (habit.streak || 0) + increment;

                        // RESILIENCIA Trigger: restart normal bad habit streak after a relapse
                        if (newItem.streak === 1 && habit.streak === 0 && habit.history && habit.history.length > 0) {
                            const resReward = Math.floor(Math.random() * 31) + 20; // 20 - 50 TP
                            updateAttributeXp('RESILIENCIA', resReward);
                            disciplineRewards.push({
                                habitId: habit.id,
                                habitTitle: habit.title,
                                traitId: 'RESILIENCIA',
                                bonusTp: resReward
                            });
                        }

                        newItem.relapsedToday = false;
                        newItem.lastCheckedDate = todayStr;
                        hasChanges = true;
                    }
                    return newItem;
                }

                // Logic for intelligent bad habit streaks (Simulated day-by-day progression)
                const lastChecked = parseLocalDate(habit.lastCheckedDate);
                const todayDate = parseLocalDate(todayStr);
                const diffTime = Math.abs(todayDate.getTime() - lastChecked.getTime());
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 0) {
                    let currentDays = habit.reachedDays || 0;
                    let currentTgt = habit.currentTarget || 1;
                    let tgtIdx = STREAK_TARGETS.indexOf(currentTgt);

                    const cleanDaysCount = diffDays;
                    let didRestartStreak = habit.reachedDays === 0 && cleanDaysCount > 0 && habit.history && habit.history.length > 0;

                    for (let day = 0; day < cleanDaysCount; day++) {
                        currentDays++;
                        if (currentDays === currentTgt) {
                            // Milestone reached!
                            const bonusTp = currentTgt * 3;
                            disciplineRewards.push({
                                habitId: habit.id,
                                habitTitle: habit.title,
                                traitId: habit.attribute,
                                bonusTp
                            });

                            if (tgtIdx < STREAK_TARGETS.length - 1) {
                                tgtIdx++;
                                currentTgt = STREAK_TARGETS[tgtIdx];
                                currentDays = 0;
                            }
                        } else if (currentDays > currentTgt) {
                            if (tgtIdx < STREAK_TARGETS.length - 1) {
                                tgtIdx++;
                                currentTgt = STREAK_TARGETS[tgtIdx];
                                currentDays = 0;
                            }
                        }
                    }

                    newItem.reachedDays = currentDays;
                    newItem.currentTarget = currentTgt;

                    // RESILIENCIA Trigger: restart intelligent bad habit streak after a relapse
                    if (didRestartStreak && newItem.reachedDays > 0) {
                        const resReward = Math.floor(Math.random() * 31) + 20; // 20 - 50 TP
                        updateAttributeXp('RESILIENCIA', resReward);
                        disciplineRewards.push({
                            habitId: habit.id,
                            habitTitle: habit.title,
                            traitId: 'RESILIENCIA',
                            bonusTp: resReward
                        });
                    }

                    newItem.relapsedToday = false;
                    newItem.lastCheckedDate = todayStr;
                    hasChanges = true;
                }
                return newItem;
            });

            if (hasChanges) {
                setBadHabits(updatedBadHabits);
                PersistenceService.saveCollection(user.id, 'badHabits', updatedBadHabits);

                for (const habit of updatedBadHabits) {
                    if (habit.intelligentStreak) {
                        await persistenceService.badHabits.update(user.id, habit.id, {
                            reachedDays: habit.reachedDays,
                            currentTarget: habit.currentTarget,
                            relapsedToday: habit.relapsedToday,
                            lastCheckedDate: habit.lastCheckedDate
                        });
                    } else {
                        await persistenceService.badHabits.update(user.id, habit.id, {
                            streak: habit.streak,
                            relapsedToday: habit.relapsedToday,
                            lastCheckedDate: habit.lastCheckedDate
                        });
                    }
                }

                for (const reward of disciplineRewards) {
                    const attr = attributes.find(a => a.id === reward.traitId);
                    if (attr) {
                        updateAttributeXp(reward.traitId, reward.bonusTp);
                        console.log(`🏆 [DISCIPLINE BONUS] +${reward.bonusTp} TP awarded for skipping "${reward.habitTitle}" opportunity day`);
                    }
                }

                if (disciplineRewards.length > 0) {
                    addNotification({
                        type: 'ACHIEVEMENT',
                        label: 'DISCIPLINA BRILLANTE',
                        fromLevel: 'Iron Will',
                        toLevel: 'Titanium Resolve',
                        icon: Sparkles,
                        color: '#a855f7'
                    });
                }
            }
        };

        checkBadHabitsDaily();
        // We only want to run this when habits are first loaded or user changes (login)
        // Adding habits to dependency array might cause loops if we update habits inside.
        // So we need a ref or strict dependency management.
        // Actually, if we update habits, 'habits' changes, effect runs again.
        // But if 'hasChanges' is false, it won't loop.
        // To be safe, let's use a flag or rely on the stability.
    }, [habits.length, user?.id, user?.stats?.streakFrozenUntil, dailyResetTrigger]); // Only run when count changes, user changes, or app becomes visible

        
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
    const processingHabits = useRef<Set<string>>(new Set());

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
            // User requested to remove this notification as the RewardOverlay handles it
            // addNotification({ type: 'GLOBAL', label: 'HERO', fromLevel: prevPlayerLevel.current, toLevel: player.level, icon: Trophy, color: '#fbbf24' });
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
                // User requested to remove this notification
                // addNotification({ type: 'ATTRIBUTE', label: attr.label, fromLevel: prev.level, toLevel: attr.level, icon: attr.icon, color: attr.color });
            }
        });
        prevAttributes.current = attributes;
    }, [attributes, addNotification, areAttributesLoaded]);


    // --- STREAK ACTIVATION ---
    const [showStreakCelebration, setShowStreakCelebration] = useState(false);
    const isActivatingStreak = useRef(false);

    useEffect(() => {
        if (!user?.id || !user.stats) return;

        const checkStreak = async () => {
            const today = toLocalISOString(new Date());
            const lastStreakDate = user.stats.lastStreakDate;
            const currentStreak = user.stats.streak || 0;
            
            // Already active today? (and not 0)
            if (lastStreakDate === today && currentStreak > 0) return;
            if (isActivatingStreak.current) return;

            const { 
                tasksCompleted = 0, 
                habitsCompleted = 0, 
                focusSeconds = 0 
            } = dailyLimits;

            if (tasksCompleted >= 2 && habitsCompleted >= 1 && focusSeconds >= 3600) {
                console.log("🔥 STREAK ACTIVATED!");
                isActivatingStreak.current = true;
                
                try {
                    const newStreak = lastStreakDate === today ? 1 : currentStreak + 1;
                    
                    // Update locally immediately!
                    updateProfileLocally({
                        stats: {
                            ...(user.stats || {}),
                            streak: newStreak,
                            lastStreakDate: today
                        }
                    });

                    // DISCIPLINA Trigger: Award Discipline XP based on streak length
                    const disciplineReward = Math.round(20 + (newStreak - 1) * 3.33333);
                    updateAttributeXp('DISCIPLINA', disciplineReward);

                    // RESILIENCIA Trigger: restart daily streak after breaking it
                    if (currentStreak === 0 && (user.stats as any)?.previousStreak && (user.stats as any).previousStreak > 0) {
                        const resilienceReward = Math.floor(Math.random() * 31) + 20; // 20 - 50 TP
                        updateAttributeXp('RESILIENCIA', resilienceReward);
                        setTimeout(() => {
                            addNotification({
                                type: 'GLOBAL',
                                label: `RESILIENCIA (RECUPERACIÓN): +${resilienceReward} TP`,
                                icon: Shield,
                                color: '#f97316'
                            });
                        }, 1000);
                    }
                    
                    setShowStreakCelebration(true); // DISPARAR OVERLAY AQUI

                    addNotification({ 
                        type: 'GLOBAL', 
                        label: `STREAK DAY ${newStreak}`, 
                        icon: Flame, 
                        color: '#f97316' // Orange-500
                    });
                } catch (e: any) {
                    console.error("Failed to activate streak:", e);
                } finally {
                    isActivatingStreak.current = false;
                }
            }
        };

        checkStreak();
    }, [dailyLimits, user?.id, user?.stats?.streak, user?.stats?.lastStreakDate, addNotification]);

    // Enforce streak reset if it's broken (even if daily reset date has already updated)
    useEffect(() => {
        if (!user?.id || !user.stats) return;
        if (user.isSkeleton) return;

        const currentStreak = user.stats.streak || 0;
        const lastStreakDate = user.stats.lastStreakDate;
        
        if (currentStreak > 0) {
            const today = toLocalISOString(new Date());
            const streakFrozenUntil = user.stats.streakFrozenUntil ? new Date(user.stats.streakFrozenUntil) : null;
            const isFrozen = streakFrozenUntil && streakFrozenUntil > new Date();
            
            if (!isFrozen) {
                const yesterday = parseLocalDate(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = toLocalISOString(yesterday);
                
                if (!lastStreakDate || lastStreakDate < yesterdayStr) {
                    console.log(`[STREAK RESET GUARD] Streak is broken. lastStreakDate: ${lastStreakDate}, yesterdayStr: ${yesterdayStr}. Resetting streak to 0.`);
                    
                    const updatedStats = {
                        ...(user.stats || {}),
                        streak: 0,
                        previousStreak: currentStreak
                    };

                    updateProfileLocally({
                        stats: updatedStats
                    });

                    // Persist to server
                    (async () => {
                        try {
                            await supabase.from('users').update({ stats: updatedStats }).eq('id', user.id);
                            console.log("[STREAK RESET GUARD] Successfully persisted streak reset to Supabase.");
                        } catch (err) {
                            console.error("[STREAK RESET GUARD] Failed to persist streak reset:", err);
                        }
                    })();
                }
            }
        }
    }, [user?.id, user?.stats?.streak, user?.stats?.lastStreakDate, user?.stats?.streakFrozenUntil, updateProfileLocally]);


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
        if (user?.id && !user.isSkeleton) {
            console.log(`[REWARD] Saving stats: Level ${newStats.level}, XP ${newStats.xp}, Gold ${newStats.gold}`);
            TransactionService.awardExperience(user.id, Math.floor(reward.xp), Math.floor(reward.gold), newLevel)
                .catch(err => console.error("Error saving player stats:", err));
        }
    }, [calculateNextXp, user, player]); // Added player dependency

    const addPlayerXp = useCallback((amount: number) => addPlayerReward({ xp: amount, gold: 0 }), [addPlayerReward]);
    const addPlayerGold = useCallback((amount: number) => addPlayerReward({ xp: 0, gold: amount }), [addPlayerReward]);

    const updateAttributeXp = useCallback((attrId: string, amount: number, subAttrId?: string) => {
        if (!user?.id || user.isSkeleton) return;
        
        if (attrId && attrId.includes(',')) {
            const attrIds = attrId.split(',').map(s => s.trim()).filter(Boolean);
            if (attrIds.length > 0) {
                const dividedAmount = Math.round(amount / attrIds.length);
                attrIds.forEach(id => {
                    updateAttributeXp(id, dividedAmount, subAttrId);
                });
            }
            return;
        }
        
        const currentAttrs = attributesRef.current;
        const attrIndex = currentAttrs.findIndex(a => a.id === attrId);
        if (attrIndex === -1) return;
        
        const attr = currentAttrs[attrIndex];
        let newXp = attr.xp + Math.floor(amount);
        let newLevel = attr.level;
        let newMaxXp = attr.maxXp;

        if (amount > 0) {
            while (newXp >= newMaxXp) {
                newXp -= newMaxXp;
                newLevel += 1;
                newMaxXp = calculateAttributeMaxXp(newLevel);
            }
        } else {
            while (newXp < 0 && newLevel > 1) {
                newLevel -= 1;
                newMaxXp = calculateAttributeMaxXp(newLevel); 
                newXp += newMaxXp;
            }
            if (newLevel === 1 && newXp < 0) newXp = 0;
        }
        
        let updatedSubTraits = attr.subTraits ? [...attr.subTraits] : [];
        if (subAttrId && updatedSubTraits.length > 0) {
            const subIndex = updatedSubTraits.findIndex(st => st.id === subAttrId);
            if (subIndex !== -1) {
                const sub = updatedSubTraits[subIndex];
                let newSubXp = sub.xp + Math.floor(amount);
                let newSubLevel = sub.level;
                let newSubMaxXp = sub.maxXp;

                if (amount > 0) {
                    while (newSubXp >= newSubMaxXp) {
                        newSubXp -= newSubMaxXp;
                        newSubLevel += 1;
                        newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                    }
                } else {
                    while (newSubXp < 0 && newSubLevel > 1) {
                        newSubLevel -= 1;
                        newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                        newSubXp += newSubMaxXp;
                    }
                    if (newSubLevel === 1 && newSubXp < 0) newSubXp = 0;
                }
                updatedSubTraits[subIndex] = { ...sub, xp: newSubXp, level: newSubLevel, maxXp: newSubMaxXp };
            }
        }
        
        const todayStr = toLocalISOString(new Date());
        const updatedHistory = attr.history ? [...attr.history] : [];
        const lastEntryIdx = updatedHistory.findIndex(h => h.date === todayStr);
        if (lastEntryIdx !== -1) {
            updatedHistory[lastEntryIdx] = { date: todayStr, xp: newXp, level: newLevel };
        } else {
            updatedHistory.push({ date: todayStr, xp: newXp, level: newLevel });
            if (updatedHistory.length > 90) updatedHistory.shift();
        }

        const updatedAttrData = { 
            id: attr.id, 
            xp: newXp, 
            level: newLevel, 
            maxXp: newMaxXp,
            history: updatedHistory,
            ...(subAttrId ? { subTraits: updatedSubTraits } : {})
        };

        // 1. Synchronously update the ref so any immediate subsequent calls see the new values
        const nextAttrs = [...currentAttrs];
        nextAttrs[attrIndex] = { ...attr, xp: newXp, level: newLevel, maxXp: newMaxXp, subTraits: updatedSubTraits, history: updatedHistory };
        attributesRef.current = nextAttrs;

        // 2. Set the state for UI update
        setAttributes(nextAttrs);
        
        // 3. Save to database atomically
        TransactionService.updateAttributeXpAtomic(user.id, updatedAttrData)
            .catch(err => console.error("Error updating attribute XP in DB:", err));
    }, [user?.id, user?.isSkeleton]);

    const updateAttributeMetadata = useCallback((attrId: string, updates: Partial<Attribute>) => {
        setAttributes(prev => {
            const newAttributes = prev.map(attr => {
                if (attr.id === attrId) {
                    const updatedAttr = { ...attr, ...updates };
                    // SAVE TO FIRESTORE
                    if (user?.id) {
                        persistenceService.attributes.save(user.id, updatedAttr);
                    }
                    return updatedAttr;
                }
                return attr;
            });
            return newAttributes;
        });
    }, [user?.id]);

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
        const nextXp = calculateNextXp(newLevel);
        setPlayer(prev => ({ ...prev, level: newLevel, nextXp }));
        if (user?.id) {
            try {
                const { data, error } = await supabase.from('users').select('stats').eq('id', user.id).single();
                if (error) throw error;
                const currentStats = data?.stats || {};
                const updatedStats = {
                    ...currentStats,
                    level: newLevel,
                    nextXp: nextXp
                };
                const { error: updateErr } = await supabase.from('users')
                    .update({ stats: updatedStats })
                    .eq('id', user.id);
                if (updateErr) throw updateErr;
            } catch (err) {
                console.error("Error updating player level in Supabase:", err);
            }
        }
    }, [user?.id, calculateNextXp]);

    const updateAttributeLevel = useCallback(async (attrId: string, newLevel: number) => {
        setAttributes(prev => {
            const newAttributes = prev.map(attr => {
                if (attr.id === attrId) {
                    const updatedAttr = { ...attr, level: newLevel, maxXp: calculateAttributeMaxXp(newLevel) };
                    if (user?.id) {
                        persistenceService.attributes.save(user.id, updatedAttr);
                    }
                    return updatedAttr;
                }
                return attr;
            });
            return newAttributes;
        });
    }, [user?.id]);

    const addSubTrait = useCallback(async (parentAttrId: string, name: string, iconName: string) => {
        console.log("useDashboardLogic: addSubTrait called with:", { parentAttrId, name, iconName, userId: user?.id });
        if (!user?.id) {
            console.warn("useDashboardLogic: No user.id found, skipping addSubTrait");
            return;
        }
        setAttributes(prev => {
            console.log("useDashboardLogic: setAttributes updating, current list length:", prev.length);
            const next = prev.map(attr => {
                if (attr.id === parentAttrId) {
                    const subTraits = attr.subTraits ? [...attr.subTraits] : [];
                    const newSub = {
                        id: 'SUB_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                        name,
                        level: 1,
                        xp: 0,
                        maxXp: calculateSubTraitMaxXp(1), // Starting level 1 max xp
                        iconName: iconName || 'Hexagon'
                    };
                    const updatedAttr = {
                        ...attr,
                        subTraits: [...subTraits, newSub]
                    };
                    console.log("useDashboardLogic: Saving updated attribute to Local DB & Supabase:", updatedAttr);
                    persistenceService.attributes.save(user.id, updatedAttr);
                    return updatedAttr;
                }
                return attr;
            });
            console.log("useDashboardLogic: Saving updated attributes list to user preferences");
            PersistenceService.saveCollection(user.id, 'attributes', next.map(({ icon, ...rest }) => rest));
            return next;
        });
    }, [user?.id]);

    const updateSubTrait = useCallback(async (parentAttrId: string, subTraitId: string, updates: any) => {
        if (!user?.id) return;
        setAttributes(prev => {
            const next = prev.map(attr => {
                if (attr.id === parentAttrId) {
                    const subTraits = attr.subTraits ? attr.subTraits.map(st => {
                        if (st.id === subTraitId) {
                            return { ...st, ...updates };
                        }
                        return st;
                    }) : [];
                    const updatedAttr = { ...attr, subTraits };
                    persistenceService.attributes.save(user.id, updatedAttr);
                    return updatedAttr;
                }
                return attr;
            });
            PersistenceService.saveCollection(user.id, 'attributes', next.map(({ icon, ...rest }) => rest));
            return next;
        });
    }, [user?.id]);

    const deleteSubTrait = useCallback(async (parentAttrId: string, subTraitId: string) => {
        if (!user?.id) return;
        setAttributes(prev => {
            const next = prev.map(attr => {
                if (attr.id === parentAttrId) {
                    const subTraits = attr.subTraits ? attr.subTraits.filter(st => st.id !== subTraitId) : [];
                    const updatedAttr = { ...attr, subTraits };
                    persistenceService.attributes.save(user.id, updatedAttr);
                    return updatedAttr;
                }
                return attr;
            });
            PersistenceService.saveCollection(user.id, 'attributes', next.map(({ icon, ...rest }) => rest));
            return next;
        });
    }, [user?.id]);

    const handleCompleteSession = useCallback((projectId: string | null, durationSeconds: number, type: 'POMO' | 'STOPWATCH' = 'POMO', subTraitId?: string) => {
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
        const hourlyTP = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.TP;
        
        const safeDurationSeconds = Number.isFinite(durationSeconds) ? Math.max(0, Math.floor(durationSeconds)) : 0;
        if (safeDurationSeconds < 5) return;

        // 4-Hour Rewards Safety Cap (14,400 seconds) to prevent run-away background times / corruptions from ballooning rewards
        const MAX_SESSION_SECONDS = 4 * 60 * 60;
        const cappedSessionSeconds = Math.min(safeDurationSeconds, MAX_SESSION_SECONDS);
        
        const rewardableMinutes = cappedSessionSeconds / 60;
        
        // 1. Calculate RAW Rewards (Uncapped)
        let xpReward = (rewardableMinutes * hourlyXp) / 60;
        let goldReward = (rewardableMinutes * hourlyGold) / 60;
        let tpReward = (rewardableMinutes * hourlyTP) / 60;

        // Apply Immersion Bonus (Non-linear scaling)
        // DISABLED PER USER REQUEST: "SIEMPRE, PERO SIEMPRE, LAS RECOMPENSAS POR HORA SERAN LAS SIGUIENTES"
        // if (rewardableMinutes >= 50) {
        //     xpReward *= 1.25;
        //     goldReward *= 1.25;
        //     tpReward *= 1.25;
        // } else if (rewardableMinutes >= 25) {
        //     xpReward *= 1.1;
        //     goldReward *= 1.1;
        //     tpReward *= 1.1;
        // }

        // Apply Project Impact Multiplier
        let attrId = 'MENTAL';
        let multiplier = 1;
        
        let proj: Project | undefined;
        if (projectId) {
            proj = projects.find(p => p.id === projectId);
            if (proj) {
                attrId = proj.attribute;
                multiplier = 1; // User requested NO impact multiplier. STRICTLY ENFORCED.
            } else {
                console.warn(`⚠️ Project ${projectId} not found, using defaults`);
            }
        }

        xpReward *= multiplier;
        goldReward *= multiplier;
        tpReward *= multiplier;

        // 2. Calculate Daily Limits & Caps (TIME ONLY - 24h Hard Limit)
        const todayDate = toLocalISOString(new Date());
        let effectiveDailySeconds = currentLimits.focusSeconds || 0;
        
        // RESET LIMITS IF STALE (Fix for "First session of the day gives no rewards")
        if (currentLimits.date !== todayDate) {
            effectiveDailySeconds = 0;
            console.log("🔄 New day detected in session complete - resetting effective limits");
        }

        const maxDailySeconds = 24 * 60 * 60;
        const remainingSeconds = Math.max(0, maxDailySeconds - effectiveDailySeconds);
        
        // Cap the DURATION strictly
        let finalDurationSeconds = Math.min(cappedSessionSeconds, remainingSeconds);
        finalDurationSeconds = Math.max(0, finalDurationSeconds);

        // Notify if capped
        if (finalDurationSeconds < cappedSessionSeconds && remainingSeconds === 0) {
             addNotification({ type: 'SYSTEM', label: 'DAILY LIMIT', fromLevel: '24h Max', toLevel: 'Reached', icon: InfinityIcon, color: '#ef4444' });
        }

        // Recalculate rewards based on capped duration
        const finalRewardableMinutes = finalDurationSeconds / 60;
        let finalXp = Math.round((finalRewardableMinutes * hourlyXp) / 60);
        let finalGold = Math.round((finalRewardableMinutes * hourlyGold) / 60);
        let finalTP = Math.round((finalRewardableMinutes * hourlyTP) / 60);
        
        // Apply multiplier
        finalXp = Math.floor(finalXp * multiplier);
        finalGold = Math.floor(finalGold * multiplier);
        finalTP = Math.floor(finalTP * multiplier);

        // Ensure non-negative
        finalXp = Math.max(0, finalXp);
        finalGold = Math.max(0, finalGold);
        finalTP = Math.max(0, finalTP);

        // Minimum Reward for any valid session > 0.1 min (6 seconds)
        if (finalRewardableMinutes >= 0.1) {
            if (finalXp < 1) finalXp = 1;
            // The issue is gold and TP might not be given for short sessions if hourly rates are low.
            // Ensure minimums if duration is at least 1 minute or manually set.
            if (finalGold < 1) finalGold = 1;
            if (finalTP < 1) finalTP = 1;
        }

        console.log(`[REWARD CALC] Duration: ${safeDurationSeconds}s -> Capped: ${finalDurationSeconds}s | Final: ${finalXp}/${finalTP}/${finalGold}`);
        
        // --- DAILY GOAL COMPLETION BONUS ---
        let bonusXp = 0;
        let bonusGold = 0;
        let bonusTP = 0;

        if (proj && proj.goalTarget > 0) {
            // Calculate previous daily progress
            const now = new Date();
            const todayStr = now.toDateString();
            
            const sessionsToday = (proj.sessions || []).filter(s => {
                 const d = new Date(s.date);
                 return d.toDateString() === todayStr;
            });
            
            const previousDurationSeconds = sessionsToday.reduce((acc, s) => acc + (s.duration || 0), 0);
            const newDurationSeconds = previousDurationSeconds + finalDurationSeconds;
            
            // To ensure we use the dynamic target if available, but fallback to goalTarget
            let dailyGoalMinutes = proj.goalTarget;
            // A simple approximation of the dynamic target without importing:
            if (proj.uiFrequency === 'WEEKLY' || proj.uiFrequency === 'MONTHLY') {
                // If it's weekly/monthly, it might have a dynamic target. We'll stick to goalTarget (which is saved as daily equivalent) 
                // for simplicity and consistency with the predicted rewards shown in modal.
            }
            
            const goalSeconds = dailyGoalMinutes * 60;
            
            // Trigger bonus only if we crossed the line just now
            if (previousDurationSeconds < goalSeconds && newDurationSeconds >= goalSeconds) {
                const prediction = calculateTaskRewards(proj.goalTarget, proj.impact || 1, 0, 'PROJECT');
                
                // PER USER REQUEST: "se de su recompensa (la que sale al terminar de crear su proyect)"
                // We give the FULL predicted amount as the completion bonus, 
                // instead of subtracting the base time part.
                bonusXp = Math.max(0, prediction.xp);
                bonusGold = Math.max(0, prediction.coins);
                bonusTP = Math.max(0, prediction.traitXp);
                
                console.log(`🎉 [DAILY GOAL MET] Awarding Completion Bonus: +${bonusXp} XP / +${bonusGold} G / +${bonusTP} TP`);
            }
        }

        const totalXp = finalXp + bonusXp;
        const totalGold = finalGold + bonusGold;
        const totalTP = finalTP + bonusTP; // Use bonusTP here

        
        // 1. Prepare the new session object
        // Use a unique ID based on timestamp and randomness
        const newSession: Session = { 
            id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7), 
            type, 
            duration: finalDurationSeconds, 
            date: new Date().toISOString(),
            xpEarned: totalXp,
            goldEarned: totalGold,
            traitPointsEarned: totalTP,
            subTraitId: subTraitId
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
                    totalTime: (targetProj.totalTime || 0) + finalDurationSeconds,
                    sessions: [newSession, ...(targetProj.sessions || [])]
                };

                const nextProjects = [...prev];
                nextProjects[targetIndex] = updatedProject;

                // Save to Cache immediately
                if (user?.id) {
                    saveProjectsCache(user.id, nextProjects);
                }

                // 4. Save to Firestore (Side Effect inside setState is not ideal, but acceptable for optimistic UI here if we don't await)
                if (user?.id) {
                    projectService.saveProject(user.id, updatedProject)
                        .then(() => {
                            console.log("✅ Project saved to Firestore with new session");
                            // Notify success for manual entry or stopwatch
                            if (type === 'POMO' || type === 'STOPWATCH') {
                                // For manual entries (often via History Modal), provide feedback if no rewards were given
                                if (totalXp === 0 && finalDurationSeconds > 0) {
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
        
        // Update Limits, Stats and Attributes via TransactionService
        if (user?.id && (totalXp > 0 || totalGold > 0 || finalDurationSeconds > 0)) {
            const today = toLocalISOString(new Date());
            const isNewDay = dailyLimits.date !== today;
            let newXp = player.xp + totalXp;
            if (newXp < 0) newXp = 0;
            const newLevel = calculateLevelFromXp(newXp);
            const newNextXp = calculateNextLevelXp(newLevel);

            // Optimistic Update
            let newLimits = { ...dailyLimits };
            if (isNewDay) {
                newLimits = { 
                    date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: 0, tasksCompleted: 0, notesCompleted: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0,
                    focusSeconds: finalDurationSeconds,
                    focusXp: totalXp, 
                    focusGold: totalGold, 
                    focusTraitPoints: totalTP
                };
            } else {
                newLimits.focusSeconds = (newLimits.focusSeconds || 0) + finalDurationSeconds;
                newLimits.focusXp = (newLimits.focusXp || 0) + totalXp;
                newLimits.focusGold = (newLimits.focusGold || 0) + totalGold;
                newLimits.focusTraitPoints = (newLimits.focusTraitPoints || 0) + totalTP;
            }
            setDailyLimits(newLimits);

            const newPlayerStats = { ...player, xp: newXp, gold: player.gold + totalGold, level: newLevel, nextXp: newNextXp };
            setPlayer(newPlayerStats);

            let traitUpdate: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[] } | undefined = undefined;
            if (attrId) {
                const attrIndex = attributes.findIndex(a => a.id === attrId);
                if (attrIndex !== -1) {
                    const attr = attributes[attrIndex];
                    let newAttrXp = attr.xp + totalTP;
                    let newAttrLevel = attr.level;
                    let newAttrMaxXp = attr.maxXp;

                    if (totalTP > 0) {
                        while (newAttrXp >= newAttrMaxXp) {
                            newAttrXp -= newAttrMaxXp;
                            newAttrLevel += 1;
                            newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                        }
                    }
                    let newSubTraits = attr.subTraits;
                    if (subTraitId && attr.subTraits) {
                        newSubTraits = attr.subTraits.map(st => {
                            if (st.id !== subTraitId) return st;
                            let newStXp = st.xp + totalTP;
                            let newStLevel = st.level;
                            let newStMaxXp = st.maxXp;
                            if (totalTP > 0) {
                                while (newStXp >= newStMaxXp) {
                                    newStXp -= newStMaxXp;
                                    newStLevel += 1;
                                    newStMaxXp = Math.round(newStMaxXp * 1.3);
                                }
                            }
                            return { ...st, xp: newStXp, level: newStLevel, maxXp: newStMaxXp };
                        });
                    }

                    setAttributes(prev => prev.map(a => 
                        a.id === attrId ? {
                            ...a,
                            xp: newAttrXp,
                            level: newAttrLevel,
                            maxXp: newAttrMaxXp,
                            subTraits: newSubTraits
                        } : a
                    ));
                    traitUpdate = { id: attr.id, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, subTraits: newSubTraits };
                    const rewardTraitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level, gained: totalTP };
                    triggerReward('Focus Session', totalXp, totalGold, newPlayerStats, { level: player.level }, rewardTraitUpdate);
                }
            }

            if (!attrId || attributes.findIndex(a => a.id === attrId) === -1) {
                if (totalXp > 0 || totalGold > 0 || totalTP > 0) {
                    triggerReward('Focus Session', totalXp, totalGold, newPlayerStats, { level: player.level }, undefined);
                }
            }

            TransactionService.logFocusSession(
                user.id, 
                finalDurationSeconds, 
                totalXp, 
                totalGold, 
                totalTP, 
                traitUpdate || null,
                isNewDay,
                newLevel,
                newNextXp
            );
        } else if (finalDurationSeconds > 0) {
             console.log("ℹ️ Short session saved, no XP awarded");
             addNotification({ type: 'SYSTEM', label: 'SESSION SAVED', fromLevel: Math.floor(finalDurationSeconds) + 's', toLevel: 'Short Session', icon: Check, color: '#10b981' });
        }
    }, [projects, attributes, updateAttributeXp, addNotification, spawnParticles, addPlayerReward, user, dailyLimits, saveProjectsCache, player, triggerReward]);

    const handleAddManualSession = useCallback((projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH' = 'POMO', sessionId?: string, sessionDate?: string, subTraitId?: string) => {
        // 1. Validation & Safety Checks
        const safeMinutes = Number.isFinite(durationMinutes) ? Math.max(0, durationMinutes) : 0;
        if (!projectId || safeMinutes <= 0) return;

        const targetProj = projects.find(p => p.id === projectId);
        if (!targetProj) {
            addNotification({ type: 'SYSTEM', label: 'ERROR', fromLevel: 'Project', toLevel: 'Not Found', icon: AlertTriangle, color: '#ef4444' });
            return;
        }

        // 2. REWARD CALCULATION
        const hourlyXp = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.XP;
        const hourlyGold = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.COINS;
        const hourlyTP = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.TP;

        // Ensure we have valid current limits
        const today = toLocalISOString(new Date());
        let currentLimits = dailyLimits;
        if (currentLimits.date !== today) {
            currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0, focusXp: 0, focusGold: 0, focusTraitPoints: 0 };
        }

        // 2. Calculate Daily Limits (TIME ONLY - 24h Hard Limit)
        const maxDailySeconds = 24 * 60 * 60;
        const currentDailySeconds = currentLimits.focusSeconds || 0;
        const remainingSeconds = Math.max(0, maxDailySeconds - currentDailySeconds);

        // Initial Duration
        let durationSeconds = Math.round(safeMinutes * 60);
        
        // Cap Duration
        durationSeconds = Math.min(durationSeconds, remainingSeconds);
        durationSeconds = Math.max(0, durationSeconds);
        
        const rewardableMinutes = durationSeconds / 60;

        // 1. Calculate Rewards based on Capped Duration
        let xpReward = (rewardableMinutes * hourlyXp) / 60;
        let goldReward = (rewardableMinutes * hourlyGold) / 60;
        let tpReward = (rewardableMinutes * hourlyTP) / 60;

        // PER USER REQUEST: Strictly 20/25/17. No impact multipliers. No completion bonuses.
        
        let finalXp = Math.round(xpReward);
        let finalGold = Math.round(goldReward);
        let finalTP = Math.round(tpReward);

        // Ensure non-negative
        finalXp = Math.max(0, finalXp);
        finalGold = Math.max(0, finalGold);
        finalTP = Math.max(0, finalTP);

        // Minimum Reward for any valid manual session >= 1 min
        if (rewardableMinutes >= 1) {
            if (finalXp < 1) finalXp = 1;
            if (finalGold < 1) finalGold = 1;
            if (finalTP < 1) finalTP = 1;
        }

        const totalXp = finalXp;
        const totalGold = finalGold;
        const totalTP = finalTP;

        const rawMinutes = safeMinutes;
        const rawXp = Math.round((rawMinutes * hourlyXp) / 60);
        const rawGold = Math.round((rawMinutes * hourlyGold) / 60);
        const rawTP = Math.round((rawMinutes * hourlyTP) / 60);

        console.log(`💎 [MANUAL ENTRY] Project: ${targetProj.title}, Duration: ${safeMinutes}m | Raw: ${rawXp}/${rawTP}/${rawGold} | Capped: ${totalXp}/${totalTP}/${totalGold}`);

        // 3. CREATE SESSION OBJECT
        const nextSessionId = sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `manual-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
        const nextSessionDate = sessionDate || new Date().toISOString();
        
        const newSession: Session = {
            id: nextSessionId,
            type,
            duration: durationSeconds,
            date: nextSessionDate,
            xpEarned: totalXp,
            goldEarned: totalGold,
            traitPointsEarned: totalTP
        };

        // 4. UPDATE PROJECT STATE
        const updatedProject = {
            ...targetProj,
            totalTime: (Number.isFinite(targetProj.totalTime) ? targetProj.totalTime : 0) + durationSeconds,
            sessions: [newSession, ...(targetProj.sessions || [])]
        };

        setProjects(prev => {
            const next = prev.map(p => p.id === projectId ? updatedProject : p);
            if (user?.id) {
                saveProjectsCache(user.id, next);
            }
            return next;
        });

        // 5. UPDATE ATTRIBUTES, 6. UPDATE PLAYER STATS, 8. UPDATE DAILY LIMITS
        if (user?.id) {
            const today = toLocalISOString(new Date());
            const isNewDay = dailyLimits.date !== today;
            let newXp = player.xp + totalXp;
            if (newXp < 0) newXp = 0;
            const newLevel = calculateLevelFromXp(newXp);
            const newNextXp = calculateNextLevelXp(newLevel);

            let newLimits = { ...dailyLimits };
            if (isNewDay) {
                newLimits = { 
                    date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: 0, tasksCompleted: 0, notesCompleted: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0,
                    focusSeconds: durationSeconds,
                    focusXp: totalXp, 
                    focusGold: totalGold, 
                    focusTraitPoints: totalTP
                };
            } else {
                newLimits.focusSeconds = (newLimits.focusSeconds || 0) + durationSeconds;
                newLimits.focusXp = (newLimits.focusXp || 0) + totalXp;
                newLimits.focusGold = (newLimits.focusGold || 0) + totalGold;
                newLimits.focusTraitPoints = (newLimits.focusTraitPoints || 0) + totalTP;
            }
            setDailyLimits(newLimits);

            const newPlayerStats = { ...player, xp: newXp, gold: player.gold + totalGold, level: newLevel, nextXp: newNextXp };
            setPlayer(newPlayerStats);

            let traitUpdate: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[] } | undefined = undefined;
            if (targetProj.attribute) {
                const attrIndex = attributes.findIndex(a => a.id === targetProj.attribute);
                if (attrIndex !== -1) {
                    const attr = attributes[attrIndex];
                    let newAttrXp = attr.xp + totalTP;
                    let newAttrLevel = attr.level;
                    let newAttrMaxXp = attr.maxXp;

                    if (totalTP > 0) {
                        while (newAttrXp >= newAttrMaxXp) {
                            newAttrXp -= newAttrMaxXp;
                            newAttrLevel += 1;
                            newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                        }
                    }
                    let newSubTraits = attr.subTraits;
                    if (subTraitId && attr.subTraits) {
                        newSubTraits = attr.subTraits.map(st => {
                            if (st.id !== subTraitId) return st;
                            let newStXp = st.xp + totalTP;
                            let newStLevel = st.level;
                            let newStMaxXp = st.maxXp;
                            if (totalTP > 0) {
                                while (newStXp >= newStMaxXp) {
                                    newStXp -= newStMaxXp;
                                    newStLevel += 1;
                                    newStMaxXp = Math.round(newStMaxXp * 1.3);
                                }
                            }
                            return { ...st, xp: newStXp, level: newStLevel, maxXp: newStMaxXp };
                        });
                    }

                    setAttributes(prev => prev.map(a => 
                        a.id === targetProj.attribute ? {
                            ...a,
                            xp: newAttrXp,
                            level: newAttrLevel,
                            maxXp: newAttrMaxXp,
                            subTraits: newSubTraits
                        } : a
                    ));
                    traitUpdate = { id: attr.id, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, subTraits: newSubTraits };
                    const rewardTraitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level, gained: totalTP };
                    triggerReward('Manual Session', totalXp, totalGold, newPlayerStats, { level: player.level }, rewardTraitUpdate);
                }
            }

            if (!targetProj.attribute || attributes.findIndex(a => a.id === targetProj.attribute) === -1) {
                if (totalXp > 0 || totalGold > 0 || totalTP > 0) {
                    triggerReward('Manual Session', totalXp, totalGold, newPlayerStats, { level: player.level }, undefined);
                } else if (durationSeconds > 0) {
                     addNotification({ type: 'SYSTEM', label: 'SESSION SAVED', fromLevel: Math.floor(durationSeconds/60) + 'm', toLevel: 'No XP', icon: Check, color: '#10b981' });
                }
            } else if (totalXp === 0 && totalGold === 0 && totalTP === 0 && durationSeconds > 0) {
                addNotification({ type: 'SYSTEM', label: 'SESSION SAVED', fromLevel: Math.floor(durationSeconds/60) + 'm', toLevel: 'No XP', icon: Check, color: '#10b981' });
            }

            TransactionService.logFocusSession(
                user.id,
                durationSeconds,
                totalXp,
                totalGold,
                totalTP,
                traitUpdate || null,
                isNewDay,
                newLevel,
                newNextXp
            );
        }

        // 7. PERSIST PROJECT
        if (user?.id) {
            projectService.saveProject(user.id, updatedProject)
                .catch(e => {
                    console.error("❌ Failed to save project:", e);
                    addNotification({ type: 'SYSTEM', label: 'SAVE ERROR', fromLevel: 'Retry', toLevel: 'Failed', icon: AlertTriangle, color: '#ef4444' });
                });
        }
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
        let tpToRevert = session.traitPointsEarned;

        if (xpToRevert === undefined || goldToRevert === undefined || tpToRevert === undefined) {
             const safeDurationSeconds = Math.max(0, Math.floor(durationSeconds));
             const rewardableMinutes = safeDurationSeconds / 60;
             
             // CORRECTION: Use Config instead of hardcoded values to prevent "borra MAS" issues
             const hourlyXp = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.XP;
             const hourlyGold = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.COINS;
             const hourlyTP = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.TP;

             let calcXp = (rewardableMinutes * hourlyXp) / 60;
             let calcGold = (rewardableMinutes * hourlyGold) / 60;
             let calcTP = (rewardableMinutes * hourlyTP) / 60;
             
             calcXp = Math.round(calcXp);
             calcGold = Math.round(calcGold);
             calcTP = Math.round(calcTP);
             
             // Min 1 if duration > 1m (Consistent with Creation)
            if (rewardableMinutes >= 1) {
                calcXp = Math.max(1, calcXp);
                calcGold = Math.max(1, calcGold);
                calcTP = Math.max(1, calcTP);
            }

             xpToRevert = xpToRevert ?? calcXp;
             goldToRevert = goldToRevert ?? calcGold;
            tpToRevert = tpToRevert ?? calcTP;
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
            if (user?.id) {
                projectService.saveProject(user.id, updatedProject)
                    .then(() => console.log("✅ Session deleted and project saved"))
                    .catch(e => console.error("❌ Failed to save project after delete:", e));
            }
            
            return prevProjects.map(p => p.id === projectId ? updatedProject : p);
        });

        // 3. Reverse Rewards & Limits using TransactionService
        if (user?.id) {
            const today = toLocalISOString(new Date());
            const isNewDay = dailyLimits.date !== today;
            
            const rXp = -(xpToRevert || 0);
            const rGold = -(goldToRevert || 0);
            const rTP = -(tpToRevert || 0);
            const rSec = -durationSeconds;

            const currentPlayer = playerRef.current;
            let newXp = currentPlayer.xp + rXp;
            if (newXp < 0) newXp = 0;
            const newLevel = calculateLevelFromXp(newXp);
            const newNextXp = calculateNextLevelXp(newLevel);

            let newLimits = { ...dailyLimits };
            if (isNewDay) {
                newLimits = { 
                    date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: 0, tasksCompleted: 0, notesCompleted: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0,
                    focusSeconds: 0, focusXp: 0, focusGold: 0, focusTraitPoints: 0
                };
            } else {
                newLimits.focusSeconds = Math.max(0, (newLimits.focusSeconds || 0) + rSec);
                newLimits.focusXp = Math.max(0, (newLimits.focusXp || 0) + rXp);
                newLimits.focusGold = Math.max(0, (newLimits.focusGold || 0) + rGold);
                newLimits.focusTraitPoints = Math.max(0, (newLimits.focusTraitPoints || 0) + rTP);
            }
            setDailyLimits(newLimits);

            let traitUpdate = undefined;
            if (project.attribute) {
                const currentAttrs = attributesRef.current;
                const attrIndex = currentAttrs.findIndex(a => a.id === project.attribute);
                if (attrIndex !== -1) {
                    const attr = currentAttrs[attrIndex];
                    let newAttrXp = attr.xp + rTP;
                    let newAttrLevel = attr.level;
                    let newAttrMaxXp = attr.maxXp;

                    while (newAttrXp < 0 && newAttrLevel > 1) {
                        newAttrLevel -= 1;
                        newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel); 
                        newAttrXp += newAttrMaxXp;
                    }
                    if (newAttrLevel === 1 && newAttrXp < 0) newAttrXp = 0;

                    let newSubTraits = attr.subTraits;
                    if (session.subTraitId && attr.subTraits) {
                        newSubTraits = attr.subTraits.map(st => {
                            if (st.id !== session.subTraitId) return st;
                            let newStXp = st.xp + rTP;
                            let newStLevel = st.level;
                            let newStMaxXp = st.maxXp;
                            while (newStXp < 0 && newStLevel > 1) {
                                newStLevel -= 1;
                                newStMaxXp = calculateSubTraitMaxXp(newStLevel);
                                newStXp += newStMaxXp;
                            }
                            if (newStLevel === 1 && newStXp < 0) newStXp = 0;
                            return { ...st, xp: newStXp, level: newStLevel, maxXp: newStMaxXp };
                        });
                    }

                    const newAttributes = currentAttrs.map(a => 
                        a.id === project.attribute ? { ...a, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: newSubTraits } : a
                    );
                    attributesRef.current = newAttributes;
                    setAttributes(newAttributes);
                    traitUpdate = { id: attr.id, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: newSubTraits };
                }
            }

            const nextPlayer = { ...currentPlayer, xp: newXp, gold: Math.max(0, currentPlayer.gold + rGold), level: newLevel, nextXp: newNextXp };
            playerRef.current = nextPlayer;
            setPlayer(nextPlayer);

            TransactionService.logFocusSession(
                user.id, 
                rSec, 
                rXp, 
                rGold, 
                rTP, 
                traitUpdate || null,
                isNewDay,
                newLevel,
                newNextXp
            );
        }

        addNotification({ type: 'SYSTEM', label: 'SESSION DELETED', fromLevel: Math.floor(durationSeconds / 60) + 'm', toLevel: 'Reversed', icon: Trash2, color: '#ef4444' });

    }, [projects, dailyLimits, user, addNotification]);

    const handleEditSession = useCallback((projectId: string, sessionId: string, newDurationMinutes: number, newDateStr: string) => {
        // 1. Find Project and Session
        const projectIndex = projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) return;
        
        const project = projects[projectIndex];
        const session = project.sessions?.find(s => s.id === sessionId);
        if (!session) return;

        // 2. Calculate Diffs & Cap Duration (Time Only - 24h Limit)
        const oldDurationSeconds = session.duration || 0;
        let newDurationSeconds = Math.round(newDurationMinutes * 60);

        const sessionDateObj = new Date(newDateStr);
        const isToday = new Date().toDateString() === sessionDateObj.toDateString();
        
        if (isToday) {
             const maxDailySeconds = 24 * 60 * 60;
             const currentDailySeconds = dailyLimits.focusSeconds || 0;
             const usageWithoutSessionSeconds = Math.max(0, currentDailySeconds - oldDurationSeconds);
             const remainingSeconds = Math.max(0, maxDailySeconds - usageWithoutSessionSeconds);
             
             newDurationSeconds = Math.min(newDurationSeconds, remainingSeconds);
             newDurationSeconds = Math.max(0, newDurationSeconds);
        }

        const durationDiff = newDurationSeconds - oldDurationSeconds;

        if (durationDiff === 0 && session.date === newDateStr) return; // No change

        // 3. Calculate New Rewards (Based on Capped Duration)
        const hourlyXp = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.XP;
        const hourlyGold = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.COINS;
        const hourlyTP = GAMIFICATION_CONFIG.FOCUS.BASE_HOURLY.TP;

        const rewardableMinutes = newDurationSeconds / 60;
        
        // Calculate Raw New Rewards
        let rawXp = (rewardableMinutes * hourlyXp) / 60;
        let rawGold = (rewardableMinutes * hourlyGold) / 60;
        let rawTP = (rewardableMinutes * hourlyTP) / 60;

        let finalXp = Math.round(rawXp);
        let finalGold = Math.round(rawGold);
        let finalTP = Math.round(rawTP);

        // Min 1 if duration > 1m
        if (rewardableMinutes >= 1) {
            finalXp = Math.max(1, finalXp);
            finalGold = Math.max(1, finalGold);
            finalTP = Math.max(1, finalTP);
        }

        // Time is capped, so rewards are implicitly capped by time.

        // 4. Calculate Deltas
        const oldXp = session.xpEarned || 0;
        const oldGold = session.goldEarned || 0;
        const oldTP = session.traitPointsEarned || 0;

        const xpDiff = finalXp - oldXp;
        const goldDiff = finalGold - oldGold;
        const tpDiff = finalTP - oldTP;

        console.log(`✏️ [EDIT SESSION] Diff: ${xpDiff}XP / ${goldDiff}G / ${tpDiff}TP`);

        // 5. Update Project State
        const updatedSession: Session = {
            ...session,
            duration: newDurationSeconds,
            date: newDateStr,
            xpEarned: finalXp,
            goldEarned: finalGold,
            traitPointsEarned: finalTP
        };

        const updatedProject = {
            ...project,
            totalTime: (project.totalTime || 0) + durationDiff,
            sessions: project.sessions?.map(s => s.id === sessionId ? updatedSession : s) || []
        };

        // Optimistic Update
        const nextProjects = projects.map(p => p.id === projectId ? updatedProject : p);
        setProjects(nextProjects);
        
        // Save Project
        if (user?.id) {
            projectService.saveProject(user.id, updatedProject);
        }

        // 6. Update User Stats, Limits and Attributes via TransactionService
        // 6. Update User Stats, Limits and Attributes via TransactionService
        if (user?.id) {
            const today = toLocalISOString(new Date());
            const isNewDay = dailyLimits.date !== today;
            const currentPlayer = playerRef.current;

            let newXp = currentPlayer.xp + xpDiff;
            if (newXp < 0) newXp = 0;
            const newLevel = calculateLevelFromXp(newXp);
            const newNextXp = calculateNextLevelXp(newLevel);

            let newLimits = { ...dailyLimits };
            if (isNewDay) {
                newLimits = { 
                    date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, 
                    habitsCompleted: 0, tasksCompleted: 0, notesCompleted: 0,
                    habitXp: 0, habitGold: 0, habitTraitPoints: 0,
                    focusSeconds: Math.max(0, durationDiff),
                    focusXp: Math.max(0, xpDiff), 
                    focusGold: Math.max(0, goldDiff), 
                    focusTraitPoints: Math.max(0, tpDiff)
                };
            } else {
                newLimits.focusSeconds = Math.max(0, (newLimits.focusSeconds || 0) + durationDiff);
                newLimits.focusXp = Math.max(0, (newLimits.focusXp || 0) + xpDiff);
                newLimits.focusGold = Math.max(0, (newLimits.focusGold || 0) + goldDiff);
                newLimits.focusTraitPoints = Math.max(0, (newLimits.focusTraitPoints || 0) + tpDiff);
            }
            setDailyLimits(newLimits);

            let traitUpdate = undefined;
            const currentAttrs = attributesRef.current;
            if (project.attribute) {
                const attrIndex = currentAttrs.findIndex(a => a.id === project.attribute);
                if (attrIndex !== -1) {
                    const attr = currentAttrs[attrIndex];
                    let newAttrXp = attr.xp + tpDiff;
                    let newAttrLevel = attr.level;
                    let newAttrMaxXp = attr.maxXp;

                    if (tpDiff > 0) {
                        while (newAttrXp >= newAttrMaxXp) {
                            newAttrXp -= newAttrMaxXp;
                            newAttrLevel += 1;
                            newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                        }
                    } else {
                        while (newAttrXp < 0 && newAttrLevel > 1) {
                            newAttrLevel -= 1;
                            newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel); 
                            newAttrXp += newAttrMaxXp;
                        }
                        if (newAttrLevel === 1 && newAttrXp < 0) newAttrXp = 0;
                    }

                    let newSubTraits = attr.subTraits;
                    if (session.subTraitId && attr.subTraits) {
                        newSubTraits = attr.subTraits.map(st => {
                            if (st.id !== session.subTraitId) return st;
                            let newStXp = st.xp + tpDiff;
                            let newStLevel = st.level;
                            let newStMaxXp = st.maxXp;
                            
                            if (tpDiff > 0) {
                                while (newStXp >= newStMaxXp) {
                                    newStXp -= newStMaxXp;
                                    newStLevel += 1;
                                    newStMaxXp = Math.round(newStMaxXp * 1.3);
                                }
                            } else {
                                while (newStXp < 0 && newStLevel > 1) {
                                    newStLevel -= 1;
                                    newStMaxXp = calculateSubTraitMaxXp(newStLevel);
                                    newStXp += newStMaxXp;
                                }
                                if (newStLevel === 1 && newStXp < 0) newStXp = 0;
                            }
                            return { ...st, xp: newStXp, level: newStLevel, maxXp: newStMaxXp };
                        });
                    }

                    const newAttributes = currentAttrs.map(a => 
                        a.id === project.attribute ? { ...a, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: newSubTraits } : a
                    );
                    attributesRef.current = newAttributes;
                    setAttributes(newAttributes);
                    traitUpdate = { id: attr.id, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: newSubTraits };
                }
            }

            const nextPlayer = { ...currentPlayer, xp: newXp, gold: Math.max(0, currentPlayer.gold + goldDiff), level: newLevel, nextXp: newNextXp };
            playerRef.current = nextPlayer;
            setPlayer(nextPlayer);

            if (xpDiff !== 0 || goldDiff !== 0 || tpDiff !== 0) {
                 const attr = currentAttrs.find(a => a.id === project.attribute);
                 triggerReward(
                    'Session Adjusted', 
                    xpDiff, 
                    goldDiff, 
                    { xp: newXp, level: newLevel, gold: Math.max(0, currentPlayer.gold + goldDiff) }, 
                    { level: currentPlayer.level },
                    traitUpdate ? { ...traitUpdate, name: attr?.label || '', oldLevel: attr?.level || 1, gained: tpDiff } : undefined
                 );
            }

            TransactionService.logFocusSession(
                user.id,
                durationDiff,
                xpDiff,
                goldDiff,
                tpDiff,
                traitUpdate || null,
                isNewDay,
                newLevel,
                newNextXp
            );
        }

    }, [projects, dailyLimits, user, addNotification, triggerReward]);

    const completeQuest = useCallback(async (e: React.MouseEvent, quest: Quest) => { 
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }

        
        // LOCKING: Prevent double-execution
        if (processingQuests.current.has(quest.id)) return;
        processingQuests.current.add(quest.id);
        setTimeout(() => {
            processingQuests.current.delete(quest.id);
        }, 500);

        const userId = user?.id;

        let rewardXp = 0;
        let rewardGold = 0;
        let rewardTraitXp = 0;
        let newQuest = { ...quest };
        let isReversal = false;
        const multipliers: Record<string, number> = { 'C': 1, 'B': 2, 'A': 3, 'S': 4 };
        const impact = multipliers[quest.difficulty] || 1;
        const calculatedReward = calculateTaskRewards(quest.estimatedTime, impact, 0, 'TASK');
        const baseXp = Number.isFinite(quest.xpReward) ? quest.xpReward : calculatedReward.xp;
        const baseGold = Number.isFinite(quest.gold) ? quest.gold : calculatedReward.coins;

        // --- LOGIC ---
        if (quest.completed) {
            // UN-COMPLETE
            if(navigator.vibrate) navigator.vibrate(5);
            isReversal = true;
            
            const xpToRevert = typeof quest.rewardedXp === 'number' ? quest.rewardedXp : baseXp;
            const goldToRevert = typeof quest.rewardedGold === 'number' ? quest.rewardedGold : baseGold;
            // SYNC FIX: Revert exact amount of TP (1:1 ratio with XP as implemented in completion)
            const traitXpToRevert = typeof quest.rewardedXp === 'number' ? quest.rewardedXp : baseXp;

            rewardXp = -xpToRevert;
            rewardGold = -goldToRevert;
            rewardTraitXp = -traitXpToRevert;

            newQuest = { 
                ...quest, 
                completed: false, 
                completedAt: undefined,
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
            playQuestCompleteSound();
            
            // Calc Rewards without Limits to ensure exact rewards are given
            
            const rawXp = baseXp;
            const rawGold = baseGold;
            // SYNC FIX: Use 1:1 ratio for TP to match RewardCalculator and allow reaching the 350 TP limit
            const rawTraitXp = rawXp; 

            rewardXp = rawXp;
            rewardGold = rawGold;
            rewardTraitXp = rawTraitXp;
            
            console.log(`[QUEST] Awarding EXACT: XP=${rewardXp}, Gold=${rewardGold}`);

            if (quest.rescheduledFromOverdue) {
                const resilienceReward = Math.floor(Math.random() * 31) + 20; // 20 - 50 TP
                updateAttributeXp('RESILIENCIA', resilienceReward);
                setTimeout(() => {
                    addNotification({
                        type: 'GLOBAL',
                        label: `RESILIENCIA (TAREA RECUPERADA): +${resilienceReward} TP`,
                        icon: Shield,
                        color: '#f97316'
                    });
                }, 1200);
            }

            newQuest = { 
                ...quest, 
                completed: true,
                completedAt: new Date().toISOString(),
                rewardedXp: rewardXp,
                rewardedGold: rewardGold,
                rescheduledFromOverdue: false // Clear the flag
            };
        }

        questsHydratedRef.current = true;
        
        // Handle Recurrence on Completion
        let spawnedQuest: Quest | null = null;
        if (!quest.completed && quest.recurrence && quest.recurrence.type !== 'NONE') {
            // FIX: Overdue recurring tasks should spawn their next occurrence in the future, not in the past.
            const baseDate = new Date(quest.deadline || new Date());
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // If the deadline is in the past, we calculate the next occurrence starting from today
            // to prevent the user from getting stuck in an infinite loop of completing past occurrences.
            const nextDate = baseDate < today ? new Date(today) : new Date(baseDate);
            
            let shouldSpawn = true;
            
            if (quest.recurrence.type === 'INTERVAL') {
                nextDate.setDate(nextDate.getDate() + (quest.recurrence.interval || 1));
            } else if (quest.recurrence.type === 'WEEKLY' && quest.recurrence.days && quest.recurrence.days.length > 0) {
                // Find next day of week
                const currentDay = nextDate.getDay();
                const days = [...quest.recurrence.days].sort();
                const nextDay = days.find(d => d > currentDay);
                if (nextDay !== undefined) {
                    nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
                } else {
                    nextDate.setDate(nextDate.getDate() + (7 - currentDay + days[0]));
                }
            } else if (quest.recurrence.type === 'MONTHLY') {
                const days = [...(quest.recurrence.days || [])].sort((a, b) => a - b);
                const hasLastDay = quest.recurrence.monthlyType === 'LAST_DAY';
                const validMonths = quest.recurrence.months && quest.recurrence.months.length > 0 
                    ? quest.recurrence.months 
                    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

                if (days.length === 0 && !hasLastDay) {
                    shouldSpawn = false;
                } else {
                    let found = false;
                    let currentSearchDate = new Date(nextDate);
                    
                    // First, try remaining days in the current month
                    const currentMonth = currentSearchDate.getMonth();
                    if (validMonths.includes(currentMonth)) {
                        const currentDate = currentSearchDate.getDate();
                        const lastDayOfCurrentMonth = new Date(currentSearchDate.getFullYear(), currentMonth + 1, 0).getDate();
                        
                        let validDaysInMonth = [...days].filter(d => d <= lastDayOfCurrentMonth);
                        if (hasLastDay && !validDaysInMonth.includes(lastDayOfCurrentMonth)) {
                            validDaysInMonth.push(lastDayOfCurrentMonth);
                        }
                        validDaysInMonth.sort((a, b) => a - b);
                        
                        const nextDay = validDaysInMonth.find(d => d > currentDate);
                        if (nextDay !== undefined) {
                            currentSearchDate.setDate(nextDay);
                            found = true;
                        }
                    }

                    // If not found in current month, search subsequent months
                    if (!found) {
                        for (let i = 1; i <= 12; i++) {
                            // Reset to the 1st of the target month to avoid overflow bugs (e.g. Feb 31 -> March 3)
                            currentSearchDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + i, 1);
                            const searchMonth = currentSearchDate.getMonth();
                            
                            if (validMonths.includes(searchMonth)) {
                                const lastDayOfSearchMonth = new Date(currentSearchDate.getFullYear(), searchMonth + 1, 0).getDate();
                                let validDaysInSearchMonth = [...days].filter(d => d <= lastDayOfSearchMonth);
                                if (hasLastDay && !validDaysInSearchMonth.includes(lastDayOfSearchMonth)) {
                                    validDaysInSearchMonth.push(lastDayOfSearchMonth);
                                }
                                validDaysInSearchMonth.sort((a, b) => a - b);
                                
                                if (validDaysInSearchMonth.length > 0) {
                                    currentSearchDate.setDate(validDaysInSearchMonth[0]);
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (found) {
                        nextDate.setFullYear(currentSearchDate.getFullYear());
                        nextDate.setMonth(currentSearchDate.getMonth());
                        nextDate.setDate(currentSearchDate.getDate());
                    } else {
                        shouldSpawn = false;
                    }
                }
            } else {
                shouldSpawn = false;
            }

            if (shouldSpawn) {
                spawnedQuest = {
                    ...quest,
                    id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
                    completed: false,
                    deadline: toLocalISOString(nextDate),
                    rewardedXp: undefined,
                    rewardedGold: undefined,
                    subtasks: quest.subtasks?.map(st => ({ ...st, isCompleted: false })) || []
                };
            }
        }

        // OPTIMISTIC UI
        setQuests(prev => {
            let nextQuests = prev.map(q => q.id === quest.id ? newQuest : q);
            if (spawnedQuest) {
                nextQuests = [...nextQuests, spawnedQuest];
            }
            if (userId) {
                PersistenceService.saveCollection(userId, 'quests', nextQuests);
            }
            return nextQuests;
        });

        // Sync local notification reminders for task completion
        try {
            if (newQuest.completed) {
                notificationService.cancelTaskReminder(quest.id);
            } else if (newQuest.deadline) {
                const deadlineDate = parseLocalDate(newQuest.deadline);
                if (!isNaN(deadlineDate.getTime())) {
                    notificationService.scheduleTaskReminder(newQuest.id, newQuest.title, deadlineDate, newQuest.color || undefined);
                }
            }

            if (spawnedQuest && spawnedQuest.deadline) {
                const spawnedDeadlineDate = parseLocalDate(spawnedQuest.deadline);
                if (!isNaN(spawnedDeadlineDate.getTime())) {
                    notificationService.scheduleTaskReminder(spawnedQuest.id, spawnedQuest.title, spawnedDeadlineDate, spawnedQuest.color || undefined);
                }
            }
        } catch (err) {
            console.warn("Failed to sync task notifications in completeQuest:", err);
        }

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
                            newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
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


        // ATOMIC TRANSACTION (Reinforced Logic)
        try {
            // 1. Optimistic UI Updates
            // We keep the local state updates for "0ms delay" feel
            if (rewardXp !== 0 || rewardGold !== 0) {
                 let newXp = player.xp + rewardXp;
                 let newGold = player.gold + rewardGold;
                 if (newXp < 0) newXp = 0;
                 let newLevel = calculateLevelFromXp(newXp);
                 const newNextXp = calculateNextLevelXp(newLevel);
                
                setPlayer(prev => ({ ...prev, xp: newXp, gold: newGold, level: newLevel, nextXp: newNextXp }));
            }

            let traitUpdate: any = undefined;
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
                    
                    let updatedSubTraits = attr.subTraits ? [...attr.subTraits] : [];
                    if (quest.subAttribute && updatedSubTraits.length > 0) {
                        const subIndex = updatedSubTraits.findIndex(st => st.id === quest.subAttribute);
                        if (subIndex !== -1) {
                            const sub = updatedSubTraits[subIndex];
                            let newSubXp = sub.xp + rewardTraitXp;
                            let newSubLevel = sub.level;
                            let newSubMaxXp = sub.maxXp;

                            if (rewardTraitXp > 0) {
                                while (newSubXp >= newSubMaxXp) {
                                    newSubXp -= newSubMaxXp;
                                    newSubLevel += 1;
                                    newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                                    
                                    if (newSubLevel % 5 === 0) {
                                        setTimeout(() => {
                                            addNotification({
                                                type: 'ACHIEVEMENT',
                                                label: `Rango: ${sub.name.toUpperCase()} LVL ${newSubLevel}`,
                                                fromLevel: `${sub.name}`,
                                                toLevel: `Título Especial Desbloqueado`,
                                                icon: Trophy,
                                                color: attr.color
                                            });
                                        }, 1500);
                                    }
                                }
                            } else {
                                while (newSubXp < 0 && newSubLevel > 1) {
                                    newSubLevel -= 1;
                                    newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                                    newSubXp += newSubMaxXp;
                                }
                                if (newSubLevel === 1 && newSubXp < 0) newSubXp = 0;
                            }
                            updatedSubTraits[subIndex] = { ...sub, xp: newSubXp, level: newSubLevel, maxXp: newSubMaxXp };
                        }
                    }
                    
                    const newAttributes = [...attributes];
                    newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: updatedSubTraits };
                    setAttributes(newAttributes);
                    
                    traitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level, subTraits: updatedSubTraits };
                 }
            }

            // Update Limits locally
            if (!isReversal) {
                 const today = toLocalISOString(new Date());
                 let currentLimits = dailyLimits;
                 if (currentLimits.date !== today) {
                    currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0, focusXp: 0, focusGold: 0, focusTraitPoints: 0 };
                }
                const newLimits = {
                    ...currentLimits,
                    taskXp: currentLimits.taskXp + Math.max(0, rewardXp),
                    taskGold: currentLimits.taskGold + Math.max(0, rewardGold),
                    taskTraitPoints: currentLimits.taskTraitPoints + Math.max(0, rewardTraitXp),
                    tasksCompleted: (currentLimits.tasksCompleted || 0) + 1
                };
                setDailyLimits(newLimits);
                
                if (rewardXp > 0 || rewardGold > 0) {
                    // Trigger reward UI
                     triggerReward(`Quest: ${quest.title}`, rewardXp, rewardGold, { xp: player.xp + rewardXp, gold: player.gold + rewardGold, level: calculateLevelFromXp(player.xp + rewardXp) }, { level: player.level }, traitUpdate);
                }
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

            // 2. Secure Persistence (TransactionService)
            const today = toLocalISOString(new Date());
            const isNewDay = dailyLimits.date !== today;
            let newXp = player.xp + rewardXp;
            if (newXp < 0) newXp = 0;
            const newLevel = calculateLevelFromXp(newXp);
            const newNextXp = calculateNextLevelXp(newLevel);

            TransactionService.toggleQuestCompletion(
                userId, 
                quest.id, 
                newQuest.completed, 
                rewardXp, 
                rewardGold, 
                rewardTraitXp,
                isNewDay,
                newLevel,
                newNextXp,
                traitUpdate,
                spawnedQuest
            ).catch(e => {
                console.error("Failed to sync quest (Transaction)", e);
            });

        } catch (e: any) {
            console.error("Failed to process quest", e);
        }

    }, [attributes, spawnParticles, calculateNextXp, user, dailyLimits, player]);

    const handleYesterdayHabitUpdate = useCallback(async (targetDate: Date, updatedHabitsList: Habit[]) => {
        if (!user?.id) return;
        const targetDateStr = toLocalISOString(targetDate);
        
        // 1. Recalculate yesterday's completions using the updated list of habits
        const habitsCompletedOnDay = updatedHabitsList.filter(h => {
            if (h.archived) return false;
            return h.history?.some(d => getHistoryDateKey(d) === targetDateStr);
        }).length;
        
        const habitsTotalOnDay = updatedHabitsList.filter(h => isHabitActive(h, targetDate)).length;
        
        // 2. Fetch/update the daily feed entry for targetDate
        try {
            const { persistenceService: ps } = await import('@/services/persistenceService');
            
            const currentFeed = PersistenceService.getCollection<any>(user.id, 'dailyFeed') || [];
            const feedIndex = currentFeed.findIndex((e: any) => e.date === targetDateStr);
            
            let yesterdayEntry: any;
            if (feedIndex !== -1) {
                yesterdayEntry = { ...currentFeed[feedIndex] };
            } else {
                yesterdayEntry = {
                    id: `feed_${targetDateStr}`,
                    date: targetDateStr,
                    tasksCompleted: 0,
                    tasksTotal: 0,
                    focusMinutes: 0,
                    focusSessions: 0,
                    habitsCompleted: habitsCompletedOnDay,
                    habitsTotal: habitsTotalOnDay,
                    subHabitsCompleted: 0,
                    subHabitsTotal: 0,
                    xpEarned: 0,
                    goldEarned: 0,
                    tpEarned: 0,
                    streak: user.stats?.streak || 0,
                    topProjects: [],
                    completedTaskTitles: [],
                    completedHabitTitles: [],
                    createdAt: Date.now(),
                    score: 0
                };
            }
            yesterdayEntry.habitsCompleted = habitsCompletedOnDay;
            yesterdayEntry.habitsTotal = habitsTotalOnDay;
            
            // Recalculate score
            const yesterdayLimits = {
                date: targetDateStr,
                tasksCompleted: yesterdayEntry.tasksCompleted || 0,
                tasksTotal: yesterdayEntry.tasksTotal || 0,
                focusMinutes: yesterdayEntry.focusMinutes || 0,
                focusSeconds: (yesterdayEntry.focusMinutes || 0) * 60,
                habitsCompleted: habitsCompletedOnDay,
                habitsTotal: habitsTotalOnDay,
                subHabitsCompleted: yesterdayEntry.subHabitsCompleted || 0,
                subHabitsTotal: yesterdayEntry.subHabitsTotal || 0,
                taskXp: yesterdayEntry.taskXp || 0,
                taskGold: yesterdayEntry.taskGold || 0,
                taskTraitPoints: yesterdayEntry.taskTraitPoints || 0
            };
            
            const yesterdayScore = calculateLiveProductivityScore(quests, updatedHabitsList, projects, yesterdayLimits, targetDate);
            yesterdayEntry.score = yesterdayScore;
            
            // Update title lists
            yesterdayEntry.completedHabitTitles = updatedHabitsList.filter(h => {
                if (h.archived) return false;
                return h.history?.some(d => getHistoryDateKey(d) === targetDateStr);
            }).map(h => h.title).slice(0, 5);
            
            // Save to local cache
            if (feedIndex !== -1) {
                currentFeed[feedIndex] = yesterdayEntry;
            } else {
                currentFeed.push(yesterdayEntry);
            }
            PersistenceService.saveCollection(user.id, 'dailyFeed', currentFeed);
            
            // Save to Firestore/Supabase
            await ps.dailyFeed.save(user.id, yesterdayEntry);
            console.log(`[YESTERDAY UPDATE] Saved updated/new feed entry for ${targetDateStr}`);
            setYesterdayUpdateTrigger(prev => prev + 1);
        } catch (err) {
            console.error("Failed to update yesterday daily feed entry:", err);
        }
        
        // 3. STREAK RESTORATION LOGIC!
        const currentStreak = user.stats?.streak || 0;
        const previousStreak = user.stats?.previousStreak || 0;
        
        if (currentStreak === 0 && previousStreak > 0) {
            // Restore streak if yesterday's completions is >= 1
            if (habitsCompletedOnDay >= 1) {
                console.log(`🔥 [STREAK RESTORED] Streak restored to ${previousStreak} from previousStreak!`);
                
                const updatedStats = {
                    ...(user.stats || {}),
                    streak: previousStreak,
                    previousStreak: 0,
                    lastStreakDate: targetDateStr
                };
                
                updateProfileLocally({
                    stats: updatedStats
                });
                
                try {
                    await supabase.from('users').update({ stats: updatedStats }).eq('id', user.id);
                } catch (e) {
                    console.error("Failed to restore player streak in DB:", e);
                }
                
                addNotification({
                    type: 'GLOBAL',
                    label: 'RACHA RESTAURADA',
                    fromLevel: 0,
                    toLevel: previousStreak,
                    icon: Flame,
                    color: '#f97316'
                });
            }
        } else if (currentStreak > 0 && habitsCompletedOnDay === 0) {
            console.log(`❌ [STREAK LOST] Streak lost because yesterday's completions became 0.`);
            const updatedStats = {
                ...(user.stats || {}),
                streak: 0,
                previousStreak: currentStreak
            };
            
            updateProfileLocally({
                stats: updatedStats
            });
            
            try {
                await supabase.from('users').update({ stats: updatedStats }).eq('id', user.id);
            } catch (e) {
                console.error("Failed to update broken streak in DB:", e);
            }
            
            addNotification({
                type: 'GLOBAL',
                label: 'RACHA PERDIDA',
                fromLevel: currentStreak,
                toLevel: 0,
                icon: Skull,
                color: '#ef4444'
            });
        }
    }, [user, quests, projects, updateProfileLocally, addNotification]);

    // --- HELPER: APPLY HABIT REWARDS ---
    const applyHabitRewards = useCallback(async (habit: Habit, isReversal: boolean, isQuantityCompletion: boolean = false) => {
        // Removido el filtro de "Solo proyectos" a petición del usuario.
        // Ahora TODOS los hábitos de la zona de hábitos dan recompensa.
        const today = toLocalISOString(new Date());
        let rewardXp = 0;
        let rewardGold = 0;
        let rewardTraitXp = 0;

        if (isReversal) {
            // REVERSAL LOGIC: Use stored rewards if available (Farming Fix), otherwise calculate
            if (typeof habit.rewardedXp === 'number' && typeof habit.rewardedGold === 'number') {
                rewardXp = -habit.rewardedXp;
                rewardGold = -habit.rewardedGold;
                // Approximate trait XP if not stored (usually 40-50% of XP)
                const originalStreak = Math.max(0, (habit.streak || 0) - (isQuantityCompletion ? 0 : 1));
                const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, originalStreak, 'HABIT');
                rewardTraitXp = -prediction.traitXp;
            } else {
                // Fallback (Legacy behavior)
                const originalStreak = Math.max(0, (habit.streak || 0) - (isQuantityCompletion ? 0 : 1)); 
                const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, originalStreak, 'HABIT');
                
                rewardXp = -prediction.xp;
                rewardGold = -prediction.coins;
                rewardTraitXp = -prediction.traitXp;
            }
        } else {
            // COMPLETION LOGIC
            let currentLimits = dailyLimits;
            if (currentLimits.date !== today) {
                currentLimits = { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
            }
            
            // REMOVED MAX_COUNT LIMIT to ensure exact rewards are always given
            const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, habit.streak, 'HABIT');
            rewardXp = prediction.xp;
            rewardGold = prediction.coins;
            rewardTraitXp = prediction.traitXp;

            // RESILIENCIA Trigger: restart normal habit streak after a relapse/break
            if (habit.streak === 0 && habit.totalCompletions > 0) {
                const resilienceReward = Math.floor(Math.random() * 31) + 20; // 20 - 50 TP
                updateAttributeXp('RESILIENCIA', resilienceReward);
                setTimeout(() => {
                    addNotification({
                        type: 'GLOBAL',
                        label: `RESILIENCIA (RUTINA COMPLEMENTADA): +${resilienceReward} TP`,
                        icon: Shield,
                        color: '#f97316'
                    });
                }, 1000);
            }
        }

        if (rewardXp === 0 && rewardGold === 0 && rewardTraitXp === 0) {
            return { rewardXp: 0, rewardGold: 0, rewardTraitXp: 0, traitUpdate: undefined };
        }

        // Apply Player Stats
        const currentPlayer = playerRef.current;
        let newXp = currentPlayer.xp + rewardXp;
        let newGold = currentPlayer.gold + rewardGold;
        if (newXp < 0) newXp = 0;
        newGold = Math.max(0, newGold);
        
        const newLevel = calculateLevelFromXp(newXp);
        const newNextXp = calculateNextLevelXp(newLevel);
        
        const nextPlayer = { ...currentPlayer, xp: newXp, gold: newGold, level: newLevel, nextXp: newNextXp };
        playerRef.current = nextPlayer;
        setPlayer(nextPlayer);

        // Apply Attribute Stats
        let traitUpdate: any = undefined;
        if (rewardTraitXp !== 0 && habit.attribute) {
            const currentAttrs = attributesRef.current;
            const attrIndex = currentAttrs.findIndex(a => a.id === habit.attribute);
            if (attrIndex !== -1) {
                const attr = currentAttrs[attrIndex];
                let newAttrXp = attr.xp + rewardTraitXp;
                let newAttrLevel = attr.level;
                let newAttrMaxXp = attr.maxXp;

                if (rewardTraitXp > 0) {
                    while (newAttrXp >= newAttrMaxXp) {
                        newAttrXp -= newAttrMaxXp;
                        newAttrLevel += 1;
                        newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                    }
                } else {
                    newAttrXp = Math.max(0, newAttrXp);
                }

                const newAttributes = [...currentAttrs];
                newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                attributesRef.current = newAttributes;
                setAttributes(newAttributes);
                traitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level };
            }
        }

        // Apply Daily Limits
        if (!isReversal) {
            const newLimits = { 
                ...(dailyLimits.date === today ? dailyLimits : { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0, focusXp: 0, focusGold: 0, focusTraitPoints: 0, habitXp: 0, habitGold: 0, habitTraitPoints: 0 }), 
                habitsCompleted: (dailyLimits.habitsCompleted || 0) + 1,
                habitXp: (dailyLimits.habitXp || 0) + rewardXp,
                habitGold: (dailyLimits.habitGold || 0) + rewardGold,
                habitTraitPoints: (dailyLimits.habitTraitPoints || 0) + rewardTraitXp
            };
            setDailyLimits(newLimits);
            
            // Trigger UI Feedback
            if (rewardXp > 0 || rewardGold > 0) {
                triggerReward(`Habit: ${habit.title}`, rewardXp, rewardGold, { xp: newXp, gold: newGold, level: newLevel }, { level: currentPlayer.level }, traitUpdate);
            }
        } else {
            const newLimits = { 
                ...dailyLimits, 
                habitsCompleted: Math.max(0, (dailyLimits.habitsCompleted || 0) - 1),
                habitXp: Math.max(0, (dailyLimits.habitXp || 0) + rewardXp), // rewardXp is negative
                habitGold: Math.max(0, (dailyLimits.habitGold || 0) + rewardGold),
                habitTraitPoints: Math.max(0, (dailyLimits.habitTraitPoints || 0) + rewardTraitXp)
            };
            setDailyLimits(newLimits);
        }

        return { rewardXp, rewardGold, rewardTraitXp, traitUpdate };
    }, [dailyLimits, user, addNotification, calculateLevelFromXp, calculateNextLevelXp, triggerReward]);

    const handleHabitClick = useCallback(async (e: React.MouseEvent, habit: Habit, targetDate?: Date) => {
        e.stopPropagation();
        
        // LOCKING: Prevent double-execution
        if (processingHabits.current.has(habit.id)) return;
        processingHabits.current.add(habit.id);
        setTimeout(() => {
            processingHabits.current.delete(habit.id);
        }, 500);

        const isTargetToday = !targetDate || toLocalISOString(targetDate) === toLocalISOString(new Date());
        const todayHistory = toLocalISOString(targetDate || new Date());
        const todayKey = getHistoryDateKey(todayHistory);
        
        let isReversal = false;
        if (targetDate) {
            isReversal = habit.history?.some(d => getHistoryDateKey(d) === todayKey) ?? false;
        } else {
            isReversal = habit.completedToday;
        }

        // 1. FEEDBACK
        if(navigator.vibrate) navigator.vibrate(isReversal ? 5 : [5, 20, 5]);
        
        if (!isReversal && (habit.type === 'SIMPLE' || habit.type === 'BOOLEAN')) {
             const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
             spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fff', Flame, 'fire');
             playHabitCompleteSound();
             
             // Localized beautiful double-burst confetti
             const x = (rect.left + rect.width / 2) / window.innerWidth;
             const y = (rect.top + rect.height / 2) / window.innerHeight;
             confetti({
                 particleCount: 50,
                 spread: 60,
                 origin: { x, y },
                 colors: ['#8b5cf6', '#d946ef', '#3b82f6', '#10b981', '#fbbf24', '#f43f5e']
             });
             setTimeout(() => {
                 confetti({
                     particleCount: 30,
                     spread: 90,
                     origin: { x, y },
                     colors: ['#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24']
                 });
             }, 150);
        }

        // 3. APPLY REWARDS (Before state update to get the values)
        const rewards = await applyHabitRewards(habit, isReversal);
        
        let newHabit = { ...habit };
        let newHistory = [];

        if (isReversal) {
            newHistory = (habit.history || []).filter(d => getHistoryDateKey(d) !== todayKey);
            const newStreak = recalculateHabitStreak(newHistory);
            newHabit = {
                ...habit,
                completedToday: isTargetToday ? false : habit.completedToday,
                streak: newStreak,
                totalCompletions: Math.max(0, (habit.totalCompletions || 0) - 1),
                history: newHistory,
                rewardedXp: 0, // Reset to 0 instead of undefined for Firestore safety
                rewardedGold: 0,
                lastUpdatedDate: todayKey
            };
        } else {
            newHistory = [...(habit.history || []), todayHistory];
            const newStreak = recalculateHabitStreak(newHistory);
            newHabit = {
                ...habit,
                completedToday: isTargetToday ? true : habit.completedToday,
                streak: newStreak,
                totalCompletions: (habit.totalCompletions || 0) + 1,
                history: newHistory,
                rewardedXp: rewards.rewardXp,
                rewardedGold: rewards.rewardGold,
                lastUpdatedDate: todayKey
            };
        }

        // 4. OPTIMISTIC UI UPDATES
        let nextHabitsList: Habit[] = [];
        setHabits(prev => {
            nextHabitsList = prev.map(h => h.id === habit.id ? newHabit : h);
            if (user?.id) PersistenceService.saveCollection(user.id, 'habits', nextHabitsList);
            return nextHabitsList;
        });

        // 5. ATOMIC PERSISTENCE
        try {
            if (user?.id) {
                const isNewDay = dailyLimits.date !== todayHistory;
                const currentPlayer = playerRef.current;
                let newXp = currentPlayer.xp + rewards.rewardXp;
                if (newXp < 0) newXp = 0;
                const newLevel = calculateLevelFromXp(newXp);
                const newNextXp = calculateNextLevelXp(newLevel);

                let traitUpdate: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[] } | undefined = undefined;
                if (habit.attribute) {
                    const currentAttrs = attributesRef.current;
                    const attrIndex = currentAttrs.findIndex(a => a.id === habit.attribute);
                    if (attrIndex !== -1) {
                        const attr = currentAttrs[attrIndex];
                        let newAttrXp = attr.xp + rewards.rewardTraitXp;
                        let newAttrLevel = attr.level;
                        let newAttrMaxXp = attr.maxXp;
    
                        if (rewards.rewardTraitXp > 0) {
                            while (newAttrXp >= newAttrMaxXp) {
                                newAttrXp -= newAttrMaxXp;
                                newAttrLevel += 1;
                                newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                            }
                        } else {
                            newAttrXp = Math.max(0, newAttrXp);
                        }
                        
                        let updatedSubTraits = attr.subTraits ? [...attr.subTraits] : [];
                        if (habit.subAttribute && updatedSubTraits.length > 0) {
                            const subIndex = updatedSubTraits.findIndex(st => st.id === habit.subAttribute);
                            if (subIndex !== -1) {
                                const sub = updatedSubTraits[subIndex];
                                let newSubXp = sub.xp + rewards.rewardTraitXp;
                                let newSubLevel = sub.level;
                                let newSubMaxXp = sub.maxXp;

                                if (rewards.rewardTraitXp > 0) {
                                    while (newSubXp >= newSubMaxXp) {
                                        newSubXp -= newSubMaxXp;
                                        newSubLevel += 1;
                                        newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                                        
                                        if (newSubLevel % 5 === 0) {
                                            setTimeout(() => {
                                                addNotification({
                                                    type: 'ACHIEVEMENT',
                                                    label: `Rango: ${sub.name.toUpperCase()} LVL ${newSubLevel}`,
                                                    fromLevel: `${sub.name}`,
                                                    toLevel: `Título Especial Desbloqueado`,
                                                    icon: Trophy,
                                                    color: attr.color
                                                });
                                            }, 1500);
                                        }
                                    }
                                } else {
                                    while (newSubXp < 0 && newSubLevel > 1) {
                                        newSubLevel -= 1;
                                        newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                                        newSubXp += newSubMaxXp;
                                    }
                                    if (newSubLevel === 1 && newSubXp < 0) newSubXp = 0;
                                }
                                updatedSubTraits[subIndex] = { ...sub, xp: newSubXp, level: newSubLevel, maxXp: newSubMaxXp };
                            }
                        }

                        const newAttributes = [...currentAttrs];
                        newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: updatedSubTraits };
                        setAttributes(newAttributes);

                        traitUpdate = { id: attr.id, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: updatedSubTraits };
                    }
                }

                await TransactionService.toggleHabitCompletion(
                    user.id,
                    habit.id,
                    !isReversal,
                    rewards.rewardXp, 
                    rewards.rewardGold, 
                    rewards.rewardTraitXp,
                    {
                        completedToday: newHabit.completedToday,
                        streak: newHabit.streak,
                        totalCompletions: newHabit.totalCompletions,
                        history: newHabit.history,
                        rewardedXp: newHabit.rewardedXp,
                        rewardedGold: newHabit.rewardedGold,
                        lastUpdatedDate: newHabit.lastUpdatedDate
                    },
                    isNewDay,
                    newLevel,
                    newNextXp,
                    traitUpdate,
                    !isTargetToday // skipDailyLimitsUpdate
                );

                if (!isTargetToday && targetDate) {
                    setTimeout(() => {
                        handleYesterdayHabitUpdate(targetDate, nextHabitsList);
                    }, 500);
                }
            }
        } catch (err: any) {
            console.error("❌ HABIT ATOMIC SYNC FAILED:", err);
        }
    }, [user, habits, applyHabitRewards, spawnParticles, dailyLimits.date, handleYesterdayHabitUpdate]);

    const validateHabitProgress = async () => {
        if (!validationHabit) return;
        let isComplete = false; 
        let newCurrentValue = validationHabit.currentValue || 0; 

        if (validationHabit.type === 'QUANTITY') {
            const added = parseFloat(valTempValue);
            if (isNaN(added) || added < 0) return;
            newCurrentValue += added;
            if (newCurrentValue >= (validationHabit.targetValue || 0)) isComplete = true;
        } else if (validationHabit.type === 'CHECKLIST') {
            if (validationHabit.checklist?.every(i => i.completed)) isComplete = true;
        }

        const todayHistory = toLocalISOString(new Date());
        let rewards = { rewardXp: 0, rewardGold: 0, rewardTraitXp: 0 };

        if (isComplete) {
            rewards = await applyHabitRewards(validationHabit, false, true);
        }

        setHabits(prev => {
            const newHabits = prev.map(h => {
                if (h.id === validationHabit.id) {
                    if (isComplete) {
                        return { 
                            ...h, 
                            completedToday: true, 
                            streak: h.streak + 1, 
                            totalCompletions: h.totalCompletions + 1, 
                            currentValue: newCurrentValue,
                            history: [...(h.history || []), todayHistory],
                            rewardedXp: rewards.rewardXp,
                            rewardedGold: rewards.rewardGold,
                            lastUpdatedDate: getHistoryDateKey(todayHistory)
                        };
                    }
                    return { ...h, currentValue: newCurrentValue, lastUpdatedDate: getHistoryDateKey(todayHistory) }; 
                }
                return h;
            });
            if (user?.id) PersistenceService.saveCollection(user.id, 'habits', newHabits);
            return newHabits;
        });

        if (user?.id) {
            if (isComplete) {
                const isNewDay = dailyLimits.date !== todayHistory;
                let newXp = player.xp + rewards.rewardXp;
                if (newXp < 0) newXp = 0;
                const newLevel = calculateLevelFromXp(newXp);
                const newNextXp = calculateNextLevelXp(newLevel);

                let traitUpdate: { id: string, xp: number, level: number, maxXp: number, subTraits?: any[] } | undefined = undefined;
                if (validationHabit.attribute) {
                    const currentAttrs = attributesRef.current;
                    const attrIndex = currentAttrs.findIndex(a => a.id === validationHabit.attribute);
                    if (attrIndex !== -1) {
                        const attr = currentAttrs[attrIndex];
                        let newAttrXp = attr.xp + rewards.rewardTraitXp;
                        let newAttrLevel = attr.level;
                        let newAttrMaxXp = attr.maxXp;
    
                        if (rewards.rewardTraitXp > 0) {
                            while (newAttrXp >= newAttrMaxXp) {
                                newAttrXp -= newAttrMaxXp;
                                newAttrLevel += 1;
                                newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                            }
                        } else {
                            newAttrXp = Math.max(0, newAttrXp);
                        }
                        
                        let updatedSubTraits = attr.subTraits ? [...attr.subTraits] : [];
                        if (validationHabit.subAttribute && updatedSubTraits.length > 0) {
                            const subIndex = updatedSubTraits.findIndex(st => st.id === validationHabit.subAttribute);
                            if (subIndex !== -1) {
                                const sub = updatedSubTraits[subIndex];
                                let newSubXp = sub.xp + rewards.rewardTraitXp;
                                let newSubLevel = sub.level;
                                let newSubMaxXp = sub.maxXp;

                                if (rewards.rewardTraitXp > 0) {
                                    while (newSubXp >= newSubMaxXp) {
                                        newSubXp -= newSubMaxXp;
                                        newSubLevel += 1;
                                        newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                                        
                                        if (newSubLevel % 5 === 0) {
                                            setTimeout(() => {
                                                addNotification({
                                                    type: 'ACHIEVEMENT',
                                                    label: `Rango: ${sub.name.toUpperCase()} LVL ${newSubLevel}`,
                                                    fromLevel: `${sub.name}`,
                                                    toLevel: `Título Especial Desbloqueado`,
                                                    icon: Trophy,
                                                    color: attr.color
                                                });
                                            }, 1500);
                                        }
                                    }
                                } else {
                                    while (newSubXp < 0 && newSubLevel > 1) {
                                        newSubLevel -= 1;
                                        newSubMaxXp = calculateSubTraitMaxXp(newSubLevel);
                                        newSubXp += newSubMaxXp;
                                    }
                                    if (newSubLevel === 1 && newSubXp < 0) newSubXp = 0;
                                }
                                updatedSubTraits[subIndex] = { ...sub, xp: newSubXp, level: newSubLevel, maxXp: newSubMaxXp };
                            }
                        }

                        const newAttributes = [...currentAttrs];
                        newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: updatedSubTraits };
                        setAttributes(newAttributes);

                        traitUpdate = { id: attr.id, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp, subTraits: updatedSubTraits };
                    }
                }

                // Use Atomic Transaction for consistency
                TransactionService.toggleHabitCompletion(
                    user.id,
                    validationHabit.id,
                    true,
                    rewards.rewardXp,
                    rewards.rewardGold,
                    rewards.rewardTraitXp,
                    { 
                        completedToday: true, 
                        streak: validationHabit.streak + 1, 
                        totalCompletions: validationHabit.totalCompletions + 1, 
                        currentValue: newCurrentValue,
                        history: [...(validationHabit.history || []), todayHistory],
                        rewardedXp: rewards.rewardXp,
                        rewardedGold: rewards.rewardGold,
                        lastUpdatedDate: getHistoryDateKey(todayHistory)
                    },
                    isNewDay,
                    newLevel,
                    newNextXp,
                    traitUpdate
                );
            } else {
                persistenceService.habits.update(user.id, validationHabit.id, { 
                    currentValue: newCurrentValue,
                    lastUpdatedDate: getHistoryDateKey(todayHistory)
                });
            }
        }

        setValidationHabit(null);
    };

    const handleQuestConfirm = useCallback((questData: Partial<Quest>) => {
        // If ID exists, it's an update. If not, it's a create.
        const existingQuest = questData.id ? quests.find(q => q.id === questData.id) : null;
        let isRescheduledFromOverdue = false;
        
        if (existingQuest && !existingQuest.completed) {
            const todayStr = toLocalISOString(new Date());
            const oldDeadline = existingQuest.deadline;
            const newDeadline = questData.deadline;
            
            if (oldDeadline && oldDeadline < todayStr && newDeadline && newDeadline >= todayStr) {
                isRescheduledFromOverdue = true;
                console.log(`[RESILIENCIA] Task "${existingQuest.title}" rescheduled from overdue (${oldDeadline}) to active (${newDeadline})`);
            }
        }

        const quest: Quest = questData.id 
            ? { ...existingQuest, ...questData, rescheduledFromOverdue: isRescheduledFromOverdue || existingQuest?.rescheduledFromOverdue } as Quest 
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
            const newQuests = exists ? prev.map(q => q.id === quest.id ? quest : q) : [...prev, quest];
            if (user?.id) {
                PersistenceService.saveCollection(user.id, 'quests', newQuests);
            }
            return newQuests;
        });

        // Schedule/Cancel Notification Reminder for Task
        if (quest.id) {
            try {
                if (quest.completed || !quest.deadline) {
                    notificationService.cancelTaskReminder(quest.id);
                } else {
                    const deadlineDate = parseLocalDate(quest.deadline);
                    if (!isNaN(deadlineDate.getTime())) {
                        notificationService.scheduleTaskReminder(quest.id, quest.title, deadlineDate, quest.color || undefined);
                    }
                }
            } catch (e: any) {
                console.warn("Failed to sync task notification in handleQuestConfirm:", e);
            }
        }

        if (user?.id) {
            persistenceService.quests.save(user.id, quest);
        }
        setActiveModal(null);
    }, [user, quests]);

    const handleDeleteQuest = useCallback(async (questId: string) => {
        if (!user) return;
        questsHydratedRef.current = true;
        setQuests(prev => {
            const newQuests = prev.filter(q => q.id !== questId);
            PersistenceService.saveCollection(user.id, 'quests', newQuests);
            return newQuests;
        });

        try {
            notificationService.cancelTaskReminder(questId);
        } catch (e) {
            console.warn("Failed to cancel task notification:", e);
        }

        try {
            await persistenceService.quests.delete(user.id, questId);
        } catch (error) {
            console.error("Error deleting quest:", error);
        }
    }, [user]);

    const handleHabitConfirm = useCallback((data: Partial<Habit>) => {
        // LIMIT CHECK: Habits
        if (user?.plan !== 'PRO') {
            const activeHabitsCount = habits.filter(h => !h.archived && !h.completedToday).length;
            if (!data.id && activeHabitsCount >= FREE_LIMITS.HABITS) {
                setActiveModal('PRO');
                return;
            }
        }

        if (data.id) {
            // Edit mode
            const exists = habits.find(h => h.id === data.id);
            if (exists) {
                const updated = { ...exists, ...data } as Habit;
                
                setHabits(prev => {
                    const newHabits = prev.map(h => h.id === data.id ? updated : h);
                    if (user?.id) PersistenceService.saveCollection(user.id, 'habits', newHabits);
                    return newHabits;
                });

                // Async DB Save & Notification Sync (OUTSIDE setHabits)
                if (user?.id) {
                    persistenceService.habits.save(user.id, updated).catch(err => console.error("Failed to save edited habit:", err));
                }

                try {
                    const days = updated.frequencyDays && updated.frequencyDays.length > 0 ? updated.frequencyDays : [0,1,2,3,4,5,6];
                    if (updated.reminderTime) {
                        notificationService.scheduleHabitReminder(updated.id, updated.title, updated.reminderTime, days, updated.color || undefined);
                    } else if (exists.reminderTime && !updated.reminderTime) {
                        notificationService.cancelHabitReminder(updated.id);
                    }

                    if (updated.type === 'CHECKLIST' && updated.checklist) {
                        updated.checklist.forEach(sub => {
                            if (sub.reminderTime) {
                                const subDays = sub.days && sub.days.length > 0 ? sub.days : days;
                                notificationService.scheduleHabitReminder(sub.id, `Subtask: ${sub.text}`, sub.reminderTime, subDays, updated.color || undefined);
                            } else {
                                notificationService.cancelHabitReminder(sub.id);
                            }
                        });
                    }
                } catch (e) {
                    console.warn("Failed to sync notifications for edited habit:", e);
                }
            }
        } else {
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

            setHabits(prev => {
                const newHabits = [newHabit, ...prev];
                if (user?.id) PersistenceService.saveCollection(user.id, 'habits', newHabits);
                return newHabits;
            });

            // Async DB Save & Notification Sync (OUTSIDE setHabits)
            if (user?.id) {
                persistenceService.habits.save(user.id, newHabit).catch(err => console.error("Failed to save new habit:", err));
            }

            try {
                const days = newHabit.frequencyDays && newHabit.frequencyDays.length > 0 ? newHabit.frequencyDays : [0,1,2,3,4,5,6];
                if (newHabit.reminderTime) {
                    notificationService.scheduleHabitReminder(newHabit.id, newHabit.title, newHabit.reminderTime, days, newHabit.color || undefined);
                }
                if (newHabit.type === 'CHECKLIST' && newHabit.checklist) {
                    newHabit.checklist.forEach(sub => {
                        if (sub.reminderTime) {
                            const subDays = sub.days && sub.days.length > 0 ? sub.days : days;
                            notificationService.scheduleHabitReminder(sub.id, `Subtask: ${sub.text}`, sub.reminderTime, subDays, newHabit.color || undefined);
                        }
                    });
                }
            } catch (e) {
                console.warn("Failed to sync notifications for new habit:", e);
            }
        }
        
        setActiveModal(null);
    }, [user, habits]);

    const handleHabitUpdate = useCallback(async (habitId: string, data: Partial<Habit>, targetDate?: Date) => {
        if (!habitId) return;
        const isTargetToday = !targetDate || toLocalISOString(targetDate) === toLocalISOString(new Date());
        const todayHistory = toLocalISOString(targetDate || new Date());
        const todayKey = getHistoryDateKey(todayHistory);
        
        // Track the last time progress was made to avoid wiping out same-day partial progress
        if (data.currentValue !== undefined || data.checklist !== undefined || data.completedToday !== undefined) {
            data.lastUpdatedDate = todayKey;
        }

        // ARCHIVE LOGIC: Update Daily Limits if archiving/unarchiving a completed habit
        if (data.archived !== undefined && user?.id) {
            // Anti-cheat limit check for unarchiving
            if (data.archived === false && user?.plan !== 'PRO') {
                const activeHabitsCount = habits.filter(h => !h.archived && !h.completedToday).length;
                if (activeHabitsCount >= FREE_LIMITS.HABITS) {
                    setActiveModal('PRO');
                    return;
                }
            }

            const habit = habits.find(h => h.id === habitId);
            if (habit?.completedToday) {
                const isArchiving = data.archived;
                const change = isArchiving ? -1 : 1;
                
                // Update Local State
                setDailyLimits(prev => ({
                    ...prev,
                    habitsCompleted: Math.max(0, (prev.habitsCompleted || 0) + change)
                }));

                // Update Firestore
                try {
                    const { data: userData, error: fetchErr } = await supabase.from('users').select('stats').eq('id', user.id).single();
                    if (fetchErr) throw fetchErr;
                    const currentStats = userData?.stats || {};
                    const dailyLim = currentStats.dailyLimits || {};
                    const updatedStats = {
                        ...currentStats,
                        dailyLimits: {
                            ...dailyLim,
                            habitsCompleted: Math.max(0, (dailyLim.habitsCompleted || 0) + change)
                        }
                    };
                    const { error: updateErr } = await supabase.from('users')
                        .update({ stats: updatedStats })
                        .eq('id', user.id);
                    if (updateErr) throw updateErr;
                } catch (e: any) {
                    console.error("Failed to update daily limits on archive", e);
                }
            }
        }

        let habitToReward: Habit | null = null;
        let isReversal = false;

        const updatedHabitIndex = habits.findIndex(h => h.id === habitId);
        if (updatedHabitIndex === -1) return;
        
        const h = habits[updatedHabitIndex];
        let next = { ...h, ...data } as Habit;

        if (h.type === 'QUANTITY' && typeof data.currentValue === 'number') {
            const target = h.targetValue || 0;
            const newValue = data.currentValue;
            
            let valueHistory = { ...(h.valueHistory || {}) };
            valueHistory[todayKey] = newValue;
            next.valueHistory = valueHistory;
            next.currentValue = isTargetToday ? newValue : h.currentValue;

            const wasComplete = isTargetToday ? h.completedToday : (h.history?.some(d => getHistoryDateKey(d) === todayKey) ?? false);
            const isNowComplete = target > 0 && newValue >= target;

            if (isNowComplete && !wasComplete) {
                const nextHistory = [...(h.history || []), todayHistory];
                const nextStreak = recalculateHabitStreak(nextHistory);
                const nextTotal = (h.totalCompletions || 0) + 1;
                next = { ...next, completedToday: isTargetToday ? true : h.completedToday, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                habitToReward = h;
                isReversal = false;
            } else if (!isNowComplete && wasComplete) {
                const nextHistory = (h.history || []).filter(d => getHistoryDateKey(d) !== todayKey);
                const nextStreak = recalculateHabitStreak(nextHistory);
                const nextTotal = Math.max(0, (h.totalCompletions || 0) - 1);
                next = { ...next, completedToday: isTargetToday ? false : h.completedToday, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                habitToReward = next; // Use the decremented state for reversal calculation if needed
                isReversal = true;
            }
        }
        
        if (h.type === 'CHECKLIST' && data.checklist && h.checklist) {
            next.checklist = h.checklist.map(oldItem => {
                const updatedItem = data.checklist!.find(i => i.id === oldItem.id);
                if (!updatedItem) return oldItem;

                let itemHistory = oldItem.history || [];
                const isCompletedInRequest = updatedItem.completed;

                if (isCompletedInRequest) {
                    if (!itemHistory.includes(todayKey)) itemHistory.push(todayKey);
                } else {
                    itemHistory = itemHistory.filter(d => d !== todayKey);
                }

                return {
                    ...oldItem,
                    completed: isTargetToday ? isCompletedInRequest : oldItem.completed,
                    history: itemHistory
                };
            });
            data.checklist = next.checklist;

            const wasComplete = isTargetToday ? h.completedToday : (h.history?.some(d => getHistoryDateKey(d) === todayKey) ?? false);
            const currentDay = targetDate ? targetDate.getDay() : new Date().getDay();
            
            // To evaluate if the whole checklist is complete for the targetDate:
            const visibleItems = next.checklist.filter(i => !i.days || i.days.length === 0 || i.days.includes(currentDay));
            const isNowComplete = visibleItems.length > 0 && visibleItems.every(item => isTargetToday ? item.completed : item.history?.includes(todayKey));
            
            if (isNowComplete && !wasComplete) {
                const nextHistory = [...(h.history || []), todayHistory];
                const nextStreak = recalculateHabitStreak(nextHistory);
                const nextTotal = (h.totalCompletions || 0) + 1;
                next = { ...next, completedToday: isTargetToday ? true : h.completedToday, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                habitToReward = h;
                isReversal = false;
            } else if (!isNowComplete && wasComplete) {
                const nextHistory = (h.history || []).filter(d => getHistoryDateKey(d) !== todayKey);
                const nextStreak = recalculateHabitStreak(nextHistory);
                const nextTotal = Math.max(0, (h.totalCompletions || 0) - 1);
                next = { ...next, completedToday: isTargetToday ? false : h.completedToday, streak: nextStreak, totalCompletions: nextTotal, history: nextHistory };
                habitToReward = next;
                isReversal = true;
            }
        }

        // Play sounds based on progress type
        if (habitToReward && !isReversal) {
            playHabitCompleteSound();
        } else if (!habitToReward && (data.checklist || data.currentValue !== undefined)) {
            playLightSound();
        }

        let nextHabitsList: Habit[] = [];
        setHabits(prev => {
            nextHabitsList = prev.map(item => item.id === habitId ? next : item);
            if (user?.id) PersistenceService.saveCollection(user.id, 'habits', nextHabitsList);
            return nextHabitsList;
        });

        // Handle Rewards and Persistence Atomically
        if (habitToReward && user?.id) {
            const currentHabit = habitToReward as Habit;
            const isNowCompleted = !isReversal;
            // First get the rewards calculation locally to apply to TransactionService
            const today = toLocalISOString(new Date());
            let rewardXp = 0;
            let rewardGold = 0;
            let rewardTraitXp = 0;

            if (isReversal) {
                if (typeof currentHabit.rewardedXp === 'number' && typeof currentHabit.rewardedGold === 'number') {
                    rewardXp = -currentHabit.rewardedXp;
                    rewardGold = -currentHabit.rewardedGold;
                    const originalStreak = Math.max(0, (currentHabit.streak || 0) - (currentHabit.type === 'QUANTITY' || currentHabit.type === 'CHECKLIST' ? 0 : 1));
                    const prediction = calculateTaskRewards(currentHabit.estimatedTime, currentHabit.impact, originalStreak, 'HABIT');
                    rewardTraitXp = -prediction.traitXp;
                } else {
                    const originalStreak = Math.max(0, (currentHabit.streak || 0) - (currentHabit.type === 'QUANTITY' || currentHabit.type === 'CHECKLIST' ? 0 : 1)); 
                    const prediction = calculateTaskRewards(currentHabit.estimatedTime, currentHabit.impact, originalStreak, 'HABIT');
                    rewardXp = -prediction.xp;
                    rewardGold = -prediction.coins;
                    rewardTraitXp = -prediction.traitXp;
                }
            } else {
                const prediction = calculateTaskRewards(currentHabit.estimatedTime, currentHabit.impact, currentHabit.streak, 'HABIT');
                rewardXp = prediction.xp;
                rewardGold = prediction.coins;
                rewardTraitXp = prediction.traitXp;
            }

            const updatedHabit = next; // Use 'next' which already contains the computed streak, history, and completions
            if (updatedHabit) {
                const finalData = { 
                    ...updatedHabit, 
                    rewardedXp: isNowCompleted ? rewardXp : 0,
                    rewardedGold: isNowCompleted ? rewardGold : 0
                };
                
                // Save habit state first to be safe, though toggleHabitCompletion will update it
                persistenceService.habits.save(user.id, finalData as Habit);

                const isNewDay = dailyLimits.date !== today;
                let newXp = player.xp + rewardXp;
                if (newXp < 0) newXp = 0;
                const newLevel = calculateLevelFromXp(newXp);
                const newNextXp = calculateNextLevelXp(newLevel);

                // Optimistic UI updates
                setPlayer(prev => ({ ...prev, xp: newXp, gold: Math.max(0, prev.gold + rewardGold), level: newLevel, nextXp: newNextXp }));
                
                let traitUpdate: { id: string, xp: number, level: number, maxXp: number } | undefined = undefined;
                let rewardTraitUpdate: any = undefined;
                if (rewardTraitXp !== 0 && currentHabit.attribute) {
                    const attrIndex = attributes.findIndex(a => a.id === currentHabit.attribute);
                    if (attrIndex !== -1) {
                        const attr = attributes[attrIndex];
                        let newAttrXp = attr.xp + rewardTraitXp;
                        let newAttrLevel = attr.level;
                        let newAttrMaxXp = attr.maxXp;

                        if (rewardTraitXp > 0) {
                            while (newAttrXp >= newAttrMaxXp) {
                                newAttrXp -= newAttrMaxXp;
                                newAttrLevel += 1;
                                newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                            }
                        } else {
                            newAttrXp = Math.max(0, newAttrXp);
                        }

                        const newAttributes = [...attributes];
                        newAttributes[attrIndex] = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                        setAttributes(newAttributes);
                        traitUpdate = { id: attr.id, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                        rewardTraitUpdate = { id: attr.id, name: attr.label, xp: newAttrXp, maxXp: newAttrMaxXp, level: newAttrLevel, oldLevel: attr.level };
                    }
                }

                // Apply Daily Limits
                if (isTargetToday) {
                    if (isNowCompleted) {
                        setDailyLimits(prev => ({
                            ...(prev.date === today ? prev : { date: today, taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0, focusXp: 0, focusGold: 0, focusTraitPoints: 0, habitXp: 0, habitGold: 0, habitTraitPoints: 0 }), 
                            habitsCompleted: (prev.habitsCompleted || 0) + 1,
                            habitXp: (prev.habitXp || 0) + rewardXp,
                            habitGold: (prev.habitGold || 0) + rewardGold,
                            habitTraitPoints: (prev.habitTraitPoints || 0) + rewardTraitXp
                        }));
                    } else {
                        setDailyLimits(prev => ({
                            ...prev,
                            habitsCompleted: Math.max(0, (prev.habitsCompleted || 0) - 1),
                            habitXp: Math.max(0, (prev.habitXp || 0) + rewardXp), // rewardXp is negative
                            habitGold: Math.max(0, (prev.habitGold || 0) + rewardGold),
                            habitTraitPoints: Math.max(0, (prev.habitTraitPoints || 0) + rewardTraitXp)
                        }));
                    }
                }

                if (rewardXp > 0 || rewardGold > 0) {
                    triggerReward(`Habit: ${currentHabit.title}`, rewardXp, rewardGold, { xp: newXp, gold: player.gold + rewardGold, level: newLevel }, { level: player.level }, rewardTraitUpdate);
                }

                TransactionService.toggleHabitCompletion(
                    user.id,
                    habitId,
                    isNowCompleted,
                    rewardXp,
                    rewardGold,
                    rewardTraitXp,
                    finalData,
                    isNewDay,
                    newLevel,
                    newNextXp,
                    traitUpdate,
                    !isTargetToday // skipDailyLimitsUpdate
                );
            }
        } else if (user?.id) {
            // Save partial or checklist progress immediately to prevent data loss on page reload
            persistenceService.habits.save(user.id, next);
        }

        if (!isTargetToday && targetDate) {
            setTimeout(() => {
                handleYesterdayHabitUpdate(targetDate, nextHabitsList);
            }, 500);
        }
    }, [user?.id, habits, dailyLimits, applyHabitRewards, triggerReward, player.xp, player.gold, attributes, handleYesterdayHabitUpdate]);

    const handleDeleteHabit = useCallback(async (habitId: string) => {
        if (!user) return;
        
        notificationService.cancelHabitReminder(habitId);

        // Find habit before deleting to check completion status
        const habitToDelete = habits.find(h => h.id === habitId);
        
        // Optimistic Update
        setHabits(prev => {
            const newHabits = prev.filter(h => h.id !== habitId);
            if (user?.id) PersistenceService.saveCollection(user.id, 'habits', newHabits);
            return newHabits;
        });

        // If completed today, we must decrement the daily count!
        if (habitToDelete?.completedToday) {
            setDailyLimits(prev => ({
                ...prev,
                habitsCompleted: Math.max(0, (prev.habitsCompleted || 0) - 1)
            }));
            
            // Sync with Firestore
            try {
                const { data, error } = await supabase.from('users').select('stats').eq('id', user.id).single();
                if (error) throw error;
                const currentStats = data?.stats || {};
                const dailyLim = currentStats.dailyLimits || {};
                const updatedStats = {
                    ...currentStats,
                    dailyLimits: {
                        ...dailyLim,
                        habitsCompleted: Math.max(0, (dailyLim.habitsCompleted || 0) - 1)
                    }
                };
                const { error: updateErr } = await supabase.from('users')
                    .update({ stats: updatedStats })
                    .eq('id', user.id);
                if (updateErr) throw updateErr;
            } catch (e: any) {
                console.error("Failed to update daily limits after habit deletion", e);
            }
        }

        try {
            await persistenceService.habits.delete(user.id, habitId);
        } catch (error) {
            console.error("Error deleting habit:", error);
        }
    }, [user, habits, dailyLimits]);

    const handleProjectConfirm = useCallback(async (projectData: Partial<Project>) => {
        console.log("💎 [DashboardLogic] Handling Project Confirm:", projectData);
        
        // 1. Generate ID (Stable)
        const nextId = projectData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
        
        if (!user?.id) return;

        let blockedByLimit = false;
        let resolvedProject: Project | null = null;

        projectsHydratedRef.current = true;

        // Construct project OUTSIDE of setProjects so we can save it to Supabase immediately!
        const existing = projects.find(p => p.id === nextId);
        const isUpdate = !!existing;

        if (user?.plan !== 'PRO' && !isUpdate) {
            const activeCount = projects.filter(p => !p.deleted && !p.archived).length;
            const maxProjects = FREE_LIMITS.PROJECTS || 3; 
            if (activeCount >= maxProjects) {
                blockedByLimit = true;
            }
        }

        if (user?.plan !== 'PRO' && isUpdate && existing?.archived && projectData.archived === false) {
            const activeCount = projects.filter(p => !p.deleted && !p.archived).length;
            const maxProjects = FREE_LIMITS.PROJECTS || 3; 
            if (activeCount >= maxProjects) {
                blockedByLimit = true;
            }
        }

        if (blockedByLimit) {
            console.warn("⚠️ Project creation blocked by plan limits");
            setActiveModal('PRO');
            return;
        }

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

        resolvedProject = existing
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
                id: nextId
            };

        setProjects(prev => {
            const nextProjects = existing
                ? prev.map(p => p.id === resolvedProject!.id ? resolvedProject! : p)
                : [...prev, resolvedProject!];

            if (user?.id) {
                saveProjectsCache(user.id, nextProjects);
            }
            return nextProjects;
        });

        // Schedule/Cancel Notification Reminder for Project
        if (resolvedProject?.id) {
            try {
                if (resolvedProject.completed || resolvedProject.archived || resolvedProject.deleted || !resolvedProject.reminder) {
                    notificationService.cancelProjectReminder(resolvedProject.id);
                } else {
                    const days = resolvedProject.workingDays && resolvedProject.workingDays.length > 0
                        ? resolvedProject.workingDays
                        : [0, 1, 2, 3, 4, 5, 6];
                    notificationService.scheduleProjectReminder(resolvedProject.id, resolvedProject.title, resolvedProject.reminder, days, resolvedProject.color || undefined);
                }
            } catch (e) {
                console.warn("Failed to sync project notification reminder:", e);
            }
        }

        // Async Save (Outside State Update)
        console.log("💾 [DashboardLogic] Saving Project to Firestore:", resolvedProject);
        projectService.saveProject(user.id, resolvedProject).catch(err => {
            console.error("Failed to save project:", err);
            addNotification({ type: 'SYSTEM', label: 'SAVE ERROR', fromLevel: 'Retry', toLevel: 'Failed', icon: AlertTriangle, color: '#ef4444' });
        });

        setActiveModal(null);
    }, [user, projects, saveProjectsCache, addNotification]);

    const handleDeleteProject = useCallback(async (projectId: string) => {
        console.log("🗑️ handleDeleteProject CALLED for:", projectId);
        if (!user?.id) {
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
                PersistenceService.clearCollectionSafe(user.id, 'projects');
            }
            
            // Update cache
            saveProjectsCache(user.id, nextProjects);
            return nextProjects;
        });

        // 2. FIRESTORE & CLEANUP (Hard Delete + Subcollections)
        try {
            notificationService.cancelProjectReminder(projectId);
        } catch (e) {
            console.warn("Failed to cancel project reminder:", e);
        }

        try {
            console.log("☁️ Deleting from Firestore (HARD DELETE)...");
            
            // A. Delete the project document itself
            await projectService.deleteProject(user.id, projectId);
            
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
    }, [user?.id, saveProjectsCache, addNotification]);

    const handleResetAllProjects = useCallback(async () => {
        if (!user?.id) return;
        console.log("🚨 RESETTING ALL PROJECTS");
        
        // 1. Clear Local State
        setProjects([]);
        PersistenceService.clearCollectionSafe(user.id, 'projects');
        allowEmptyProjectsSaveRef.current = true;
        
        // 2. Clear Firestore
        try {
             const projects = await persistenceService.projects.getAll(user.id) || []; for (const project of projects) { await persistenceService.projects.delete(user.id, project.id); }
             
             console.log("✅ All projects deleted from Firestore");
             // Use a simple alert or console log if addNotification is not available in scope here, 
             // but it should be available since it is used elsewhere in this hook.
             // Looking at the file, addNotification is used in handleBadHabitConfirm.
             // Wait, addNotification is NOT in the dependency array of handleResetAllProjects in my previous attempt.
             // I should check if addNotification is available in scope.
        } catch (error) {
            console.error("Failed to reset projects", error);
        }
    }, [user?.id]);

    const handleUpdateProject = useCallback((updatedProject: Project) => {
        let blockedByLimit = false;

        setProjects(prev => {
            const existing = prev.find(p => p.id === updatedProject.id);
            
            // LIMIT CHECK FOR UNARCHIVING
            if (user?.plan !== 'PRO' && existing?.archived && updatedProject.archived === false) {
                const activeCount = prev.filter(p => !p.deleted && !p.archived).length;
                const maxProjects = FREE_LIMITS.PROJECTS || 3; 
                if (activeCount >= maxProjects) {
                    blockedByLimit = true;
                    return prev;
                }
            }

            const nextProjects = prev.map(p => p.id === updatedProject.id ? updatedProject : p);
            if (user?.id) {
                saveProjectsCache(user.id, nextProjects);
            }
            return nextProjects;
        });

        if (blockedByLimit) {
            console.warn("⚠️ Project unarchive blocked by plan limits");
            setActiveModal('PRO');
            return;
        }

        projectsHydratedRef.current = true;

        // Update Notification Schedule
        if (updatedProject.reminder && updatedProject.id) {
            const days = updatedProject.workingDays && updatedProject.workingDays.length > 0
                ? updatedProject.workingDays
                : [0, 1, 2, 3, 4, 5, 6];
            notificationService.scheduleProjectReminder(updatedProject.id, updatedProject.title, updatedProject.reminder, days, updatedProject.color || undefined);
        } else {
            notificationService.cancelProjectReminder(updatedProject.id);
        }

        if (user?.id) {
            projectService.saveProject(user.id, updatedProject);
        }
    }, [user?.id, saveProjectsCache]);

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

        if (user?.id) {
            try {
                const habits = await persistenceService.habits.getAll(user.id); const habit = habits?.find(h => h.id === habitId); if (habit) await persistenceService.habits.save(user.id, { ...habit, history: newHistory });
            } catch (e: any) {
                console.error("Failed to toggle habit day", e);
            }
        }
    }, [habits, user?.id]);

    // --- NOTE & SMART PROJECT STUBS (To Fix Dashboard Types) ---
    // These are required by Dashboard but might not be fully implemented in this hook yet.
    // We add basic implementations or state holders.

    const handleUpdateSmartProject = useCallback(async (project: SmartProject) => {
        const oldProject = smartProjects.find(p => p.id === project.id);
        let projectToSave = project;
        let rewardToTrigger: { xp: number, gold: number } | null = null;

        // CHECK COMPLETION (100%)
        // If transitioning from Not Completed -> Completed
        if (oldProject && !oldProject.rootNode.isCompleted && project.rootNode.isCompleted) {
            console.log("🎉 PROJECT COMPLETED:", project.mainGoal);
            
            // Use the reward defined in the root node (Project Reward)
            const reward = project.rootNode.reward || { xp: 1000, coins: 500 };
            rewardToTrigger = { xp: reward.xp, gold: reward.coins };
            
            // Update status to COMPLETED
            projectToSave = { ...project, status: 'COMPLETED' };
        }

        setSmartProjects(prev => {
            const newProjects = prev.map(p => p.id === projectToSave.id ? projectToSave : p);
            if (user?.id) {
                PersistenceService.saveCollection(user.id, 'smartProjects', newProjects);
            }
            return newProjects;
        });
        
        if (user?.id) {
             await persistenceService.smartProjects.save(user.id, projectToSave);
        }

        // TRIGGER REWARD
        if (rewardToTrigger && user?.id) {
             const { xp, gold } = rewardToTrigger;
             
             // 1. Calculate New Player Stats
             const newXp = player.xp + xp;
             const newGold = player.gold + gold;
             const newLevel = calculateLevelFromXp(newXp);
             const nextXp = calculateNextLevelXp(newLevel);
             
             // 2. Update Player State
             const newPlayerStats = { xp: newXp, gold: newGold, level: newLevel, nextXp };
             setPlayer(prev => ({ ...prev, ...newPlayerStats }));
             
             // 3. Update Trait (if project has one)
             let traitUpdateData = undefined;
             if (projectToSave.traitId) {
                 const attrIndex = attributes.findIndex(a => a.id === projectToSave.traitId);
                 if (attrIndex !== -1) {
                     const attr = attributes[attrIndex];
                     const traitXpGained = Math.floor(xp * 1.0); 
                     let newAttrXp = attr.xp + traitXpGained;
                     let newAttrLevel = attr.level;
                     let newAttrMaxXp = attr.maxXp;
                     
                     while (newAttrXp >= newAttrMaxXp) {
                        newAttrXp -= newAttrMaxXp;
                        newAttrLevel += 1;
                        newAttrMaxXp = calculateAttributeMaxXp(newAttrLevel);
                     }
                     
                     const updatedAttr = { ...attr, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp };
                     setAttributes(prev => {
                         const next = [...prev];
                         next[attrIndex] = updatedAttr;
                         return next;
                     });
                     
                     // Persist Trait Atomically
                     TransactionService.updateAttributeXpAtomic(user.id, { id: attr.id, xp: newAttrXp, level: newAttrLevel, maxXp: newAttrMaxXp });

                     traitUpdateData = { 
                         id: attr.id, 
                         name: attr.label, 
                         xp: newAttrXp, 
                         maxXp: newAttrMaxXp, 
                         level: newAttrLevel, 
                         oldLevel: attr.level, 
                         gained: traitXpGained 
                     };
                 }
             }
             
             // 4. Persist Player Stats Atomically
             TransactionService.awardExperience(user.id, xp, gold, newLevel);
             
             // 5. Trigger Visual Reward
             triggerReward(
                 `Project Completed: ${projectToSave.mainGoal}`,
                 xp,
                 gold,
                 { xp: newXp, level: newLevel, gold: newGold },
                 { level: player.level },
                 traitUpdateData
             );
        }
    }, [user?.id, smartProjects, player, attributes, triggerReward]);

    const handleBadHabitConfirm = useCallback(async (data: Partial<BadHabit>) => {
        if (!user?.id) return;

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
            lastCheckedDate: toLocalISOString(new Date()),
            ...data
        } as BadHabit;

        setBadHabits(prev => {
            const exists = prev.some(h => h.id === badHabit.id);
            const newBadHabits = exists 
                ? prev.map(h => h.id === badHabit.id ? badHabit : h)
                : [...prev, badHabit];
            
            // It's safe to update cache here because it's synchronous and has the latest prev
            PersistenceService.saveCollection(user.id, 'badHabits', newBadHabits);
            return newBadHabits;
        });

        await persistenceService.badHabits.save(user.id, badHabit);
        setActiveModal(null);
    }, [user?.id, addNotification, spawnParticles]);

    const handleBadHabitRelapse = useCallback(async (habit: BadHabit, paymentMethod: 'GOLD' | 'HP') => {
        if (!user?.id) return;

        const today = new Date().toISOString();
        const isIntelligent = habit.intelligentStreak;
        let updatedHabit: BadHabit;

        if (isIntelligent) {
            const currentTarget = habit.currentTarget || 1;
            const reachedDays = habit.reachedDays || 0;
            const targetIndex = STREAK_TARGETS.indexOf(currentTarget);

            if (reachedDays === currentTarget) {
                const nextTargetIndex = Math.min(targetIndex + 1, STREAK_TARGETS.length - 1);
                updatedHabit = {
                    ...habit,
                    reachedDays: 0,
                    currentTarget: STREAK_TARGETS[nextTargetIndex],
                    relapsedToday: true,
                    lastCheckedDate: toLocalISOString(new Date()),
                    history: [...habit.history, today]
                };
            } else {
                const previousTargetIndex = Math.max(targetIndex - 1, 0);
                const previousTarget = STREAK_TARGETS[previousTargetIndex];

                const penalty = habit.penalties;
                const hpPenalty = Math.max(5, Math.floor(penalty.hp * 0.5));
                const newHealth = Math.max(1, health - hpPenalty);
                setHealth(newHealth);

                if (user?.id) {
                    const cached = PersistenceService.getProfile(user.id);
                    if (cached) {
                        PersistenceService.saveProfile({
                            ...cached,
                            stats: { ...cached.stats, hp: newHealth }
                        });
                    }
                    TransactionService.updateStat(user.id, 'hp', -hpPenalty, true);
                }

                addPlayerReward({
                    xp: -penalty.xp,
                    gold: 0
                });
                updateAttributeXp(habit.attribute, -penalty.xp, habit.subAttribute);

                updatedHabit = {
                    ...habit,
                    reachedDays: 0,
                    currentTarget: previousTarget,
                    relapsedToday: true,
                    lastCheckedDate: toLocalISOString(new Date()),
                    history: [...habit.history, today]
                };
            }
        } else {
            const penalty = habit.penalties;
            if (paymentMethod === 'GOLD') {
                addPlayerGold(-penalty.gold);
            } else {
                const newHealth = Math.max(0, health - penalty.hp);
            setHealth(newHealth);

            if (newHealth <= 0 && user?.id) {
                // HALF LEVEL AND ATTRIBUTES!
                addNotification({
                    type: 'SYSTEM',
                    label: 'SYSTEM FAILURE',
                    fromLevel: 'Critical',
                    toLevel: 'Terminal',
                    icon: Skull,
                    color: '#ef4444'
                });

                TransactionService.halveStats(user.id, attributes, player.level).then((result: any) => {
                    if (!result) return;
                    const { newLevel, newXp } = result;
                    setPlayer(prev => ({
                        ...prev,
                        level: newLevel,
                        xp: newXp,
                        nextXp: calculateNextLevelXp(newLevel)
                    }));
                    setHealth(100);
                    
                    setAttributes(prev => prev.map(attr => {
                        const newAttrLevel = Math.max(1, Math.floor(attr.level / 2));
                        return {
                            ...attr,
                            level: newAttrLevel,
                            xp: newAttrLevel > 1 ? 20 * Math.pow(newAttrLevel, 2) : 0,
                            maxXp: calculateAttributeMaxXp(newAttrLevel)
                        };
                    }));
                });

            } else {
                if (user?.id) {
                    const cached = PersistenceService.getProfile(user.id);
                    if (cached) {
                        PersistenceService.saveProfile({
                            ...cached,
                            stats: { ...cached.stats, hp: newHealth }
                        });
                    }
                    TransactionService.updateStat(user.id, 'hp', -penalty.hp, true);
                }

                addPlayerReward({
                    xp: -penalty.xp,
                    gold: 0
                });
                updateAttributeXp(habit.attribute, -penalty.xp, habit.subAttribute);
            }
            }

            updatedHabit = {
                ...habit,
                streak: 0,
                relapsedToday: true,
                lastCheckedDate: toLocalISOString(new Date()),
                history: [...habit.history, today]
            };
        }

        setBadHabits(prev => {
            const newBadHabits = prev.map(h => h.id === habit.id ? updatedHabit : h);
            PersistenceService.saveCollection(user.id, 'badHabits', newBadHabits);
            return newBadHabits;
        });

        await persistenceService.badHabits.save(user.id, updatedHabit);

    }, [user?.id, health, addPlayerGold, addPlayerReward, updateAttributeXp, player.level, attributes]);

    const handleDeleteBadHabit = useCallback(async (id: string) => {
        if (!user?.id) return;
        
        setBadHabits(prev => {
            const newBadHabits = prev.filter(h => h.id !== id);
            PersistenceService.saveCollection(user.id, 'badHabits', newBadHabits);
            return newBadHabits;
        });

        // Also remove from Supabase
        await persistenceService.badHabits.delete(user.id, id);
    }, [user?.id]);

    const handleReorderHabits = useCallback(async (newOrder: Habit[]) => {
        setHabits(prev => {
            const updated = prev.map(h => {
                const index = newOrder.findIndex(nh => nh.id === h.id);
                if (index !== -1) {
                    return { ...h, order: index };
                }
                return h;
            });
            if (user?.id) {
                PersistenceService.saveCollection(user.id, 'habits', updated);
            }
            return updated;
        });
        
        if (!user?.id) return;
        
        try {
            await Promise.all(newOrder.map((habit, index) => 
                persistenceService.habits.update(user!.id, habit.id, { order: index })
            ));
        } catch (error) {
            console.error("Failed to reorder habits:", error);
        }
    }, [user?.id]);

    const handleReorderProjects = useCallback(async (newOrder: Project[]) => {
        setProjects(prev => {
            const updated = prev.map(p => {
                const index = newOrder.findIndex(np => np.id === p.id);
                if (index !== -1) {
                    return { ...p, order: index };
                }
                return p;
            });
            if (user?.id) {
                PersistenceService.saveCollection(user.id, 'projects', updated);
            }
            return updated;
        });
        
        if (!user?.id) return;
        
        try {
            await Promise.all(newOrder.map((project, index) => 
                persistenceService.projects.update(user!.id, project.id, { order: index })
            ));
        } catch (error) {
            console.error("Failed to reorder projects:", error);
        }
    }, [user?.id]);

    const handleReorderBadHabits = useCallback(async (newOrder: BadHabit[]) => {
        setBadHabits(prev => {
            const updated = prev.map(bh => {
                const index = newOrder.findIndex(nbh => nbh.id === bh.id);
                if (index !== -1) {
                    return { ...bh, order: index };
                }
                return bh;
            });
            if (user?.id) {
                PersistenceService.saveCollection(user.id, 'badHabits', updated);
            }
            return updated;
        });
        
        if (!user?.id) return;
        
        try {
            await Promise.all(newOrder.map((habit, index) => 
                persistenceService.badHabits.update(user!.id, habit.id, { order: index })
            ));
        } catch (error) {
            console.error("Failed to reorder bad habits:", error);
        }
    }, [user?.id]);

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
        isPomodoroActive,
        setIsPomodoroActive,
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
        addCustomAttribute,
        removeAttribute,
        dashboardStyle,
        updateDashboardStyle,
        avatarShape,
        updateAvatarShape,
        habitSectionControl,
        updateHabitSectionControl,
        defaultHabitView,
        updateDefaultHabitView,
        allowDockSectionSwitch,
        updateAllowDockSectionSwitch,
        dockConfig,
        updateDockConfig,
        // updateStickyHud removed
        // New exports
        handleUpdateSmartProject,
        badHabits,
        handleBadHabitConfirm,
        handleBadHabitRelapse,
        handleDeleteBadHabit,
        vividMode,
        setVividMode,
        updatePlayerLevel,
        updateAttributeLevel,
        handleEditSession,
        handleReorderHabits,
        handleReorderProjects,
        handleReorderBadHabits,
        showStreakCelebration,
        setShowStreakCelebration,
        weekStartDay,
        updateWeekStartDay,
        addSubTrait,
        updateSubTrait,
        deleteSubTrait,
        currentDate,
        setCurrentDate,
        displayedDailyLimits
    };
};
