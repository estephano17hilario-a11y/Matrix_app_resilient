import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatrix } from '../../../context/MatrixContext';
import { checkAchievements } from '../../../services/achievementListener';
import { Achievement } from '../../../config/achievements';
import { Trophy, Flame, Clock, Star } from 'lucide-react';
import { 
  Attribute, Quest, Habit, Project, Note, JournalEntry, 
  NotificationItem, Particle, Session 
} from '../../../types';
import { TRAITS_LIST } from '../constants';
import { completeTaskTransaction } from '../../../services/gameService';
import { RewardPrediction } from '../../../utils/rewardCalculator';

export const useDashboardLogic = () => {
    const { user, loading: matrixLoading } = useMatrix();
    const [lastAchievement, setLastAchievement] = useState<Achievement | null>(null);

    const [currentTheme, setCurrentTheme] = useState('SPOTLIGHT');
    const [currentView, setCurrentView] = useState('TASKS');
    const [isDockOpen, setIsDockOpen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false); 
    const [isNoteTaking, setIsNoteTaking] = useState(false); 
    const [overrideBgColor, setOverrideBgColor] = useState<string | undefined>(undefined);
    const [showProfile, setShowProfile] = useState(true);

    const [player, setPlayer] = useState({ level: 1, xp: 0, nextXp: 500, gold: 0 });
    const prevPlayerLevel = useRef(player.level);
    const [health, setHealth] = useState(100);

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
                
                const newAchievements = await checkAchievements(hybridUser);
                if (newAchievements.length > 0) {
                    setLastAchievement(newAchievements[0]);
                }
            }
        };
        
        verifyAchievements();
    }, [player.xp, player.level, user, health]);

    const [attributes, setAttributes] = useState<Attribute[]>(() => 
        TRAITS_LIST.map(t => ({
            id: t.id, label: t.label, level: 1, xp: 0, maxXp: 100, color: t.color, icon: t.icon
        }))
    ); 
    const prevAttributes = useRef(attributes);
        
    const [quests, setQuests] = useState<Quest[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
        
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
    useEffect(() => {
        if (player.level > prevPlayerLevel.current) {
            addNotification({ type: 'GLOBAL', label: 'HERO', fromLevel: prevPlayerLevel.current, toLevel: player.level, icon: Trophy, color: '#fbbf24' });
        }
        prevPlayerLevel.current = player.level;
    }, [player.level, addNotification]);

    useEffect(() => {
        attributes.forEach(attr => {
            const prev = prevAttributes.current.find(p => p.id === attr.id);
            if (prev && attr.level > prev.level) {
                addNotification({ type: 'ATTRIBUTE', label: attr.label, fromLevel: prev.level, toLevel: attr.level, icon: attr.icon, color: attr.color });
            }
        });
        prevAttributes.current = attributes;
    }, [attributes, addNotification]);


    // --- UNIFIED REWARD SYSTEM ---
    const addPlayerReward = useCallback((reward: { xp: number; gold: number }) => {
        setPlayer(prev => {
            let newXp = prev.xp + reward.xp;
            let newGold = prev.gold + reward.gold;
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
            
            return { level: newLevel, xp: newXp, nextXp: newNextXp, gold: newGold };
        });
    }, [calculateNextXp]);

    const addPlayerXp = useCallback((amount: number) => addPlayerReward({ xp: amount, gold: 0 }), [addPlayerReward]);
    const addPlayerGold = useCallback((amount: number) => addPlayerReward({ xp: 0, gold: amount }), [addPlayerReward]);

    const updateAttributeXp = useCallback((attrId: string, amount: number) => {
        setAttributes(prev => prev.map(attr => {
            if (attr.id === attrId) {
                let newXp = attr.xp + amount;
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
                return { ...attr, xp: newXp, level: newLevel, maxXp: newMaxXp };
            }
            return attr;
        }));
    }, []);

    const spawnParticles = useCallback((x: number, y: number, color: string, Icon: React.ElementType, type = 'icon') => {
        const count = type === 'fire' ? 12 : 8; 
        const newParticles = Array.from({ length: count }).map((_, i) => ({ id: Date.now() + i, x, y, vx: (Math.random() - 0.5) * 150, vy: -100 - Math.random() * 150, rotation: Math.random() * 360, icon: Icon, color: type === 'fire' ? (i % 2 === 0 ? '#f97316' : '#ef4444') : color, type }));
        setParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => { setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))); }, 2000); 
    }, []);

    const handleCompleteSession = useCallback((projectId: string | null, durationSeconds: number, type: 'POMO' | 'STOPWATCH' = 'POMO') => {
        const baseReward = Math.floor(durationSeconds / 60);
        let attrId = 'MENTAL';
        let multiplier = 1;
        if (projectId) {
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
                attrId = proj.attribute;
                multiplier = proj.impact;
                const newSession: Session = { id: Date.now().toString(), type, duration: durationSeconds, date: new Date().toISOString() };
                setProjects(prev => prev.map(p => p.id === projectId ? { 
                    ...p, 
                    totalTime: p.totalTime + durationSeconds,
                    sessions: [newSession, ...(p.sessions || [])]
                } : p));
            }
        }
        const totalReward = Math.floor(baseReward * multiplier);
        addPlayerReward({ xp: totalReward, gold: 0 });
        updateAttributeXp(attrId, totalReward);
        const attr = attributes.find(a => a.id === attrId);
        const AttrIcon = attr?.icon || Star;
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, attr?.color || '#fff', AttrIcon);
        addNotification({ type: 'SESSION', label: 'FOCUS COMPLETE', fromLevel: Math.floor(durationSeconds/60) + 'm', toLevel: '+' + totalReward + ' XP', icon: Clock, color: '#fbbf24' });
    }, [projects, attributes, updateAttributeXp, addNotification, spawnParticles, addPlayerReward]);

    const completeQuest = useCallback((e: React.MouseEvent, quest: Quest) => { 
        e.stopPropagation();
        if (quest.completed) {
            if(navigator.vibrate) navigator.vibrate(5);
            
            // Reversal
            const xp = quest.reward ? quest.reward.xp : quest.xpReward;
            const coins = quest.reward ? quest.reward.coins : 0;
            
            addPlayerReward({ xp: -xp, gold: -coins });
            updateAttributeXp(quest.attribute, -xp);
            
            setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: false } : q));
        } else {
            const attr = attributes.find(a => a.id === quest.attribute);
            const AttrIcon = attr?.icon || Star;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top, attr?.color || '#fff', AttrIcon);
            if(navigator.vibrate) navigator.vibrate(10); 
            
            // Rewards
            const xp = quest.reward ? quest.reward.xp : quest.xpReward;
            const coins = quest.reward ? quest.reward.coins : 0;

            addPlayerReward({ xp, gold: coins });
            updateAttributeXp(quest.attribute, xp); 

            setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: true } : q));

            if (user?.uid) {
                // Normalize Reward Object for Transaction
                const fullReward: RewardPrediction = { 
                    xp, 
                    coins, 
                    traitXp: quest.reward?.traitXp ?? Math.floor(xp * 0.4), 
                    baseXp: xp, // Approximation if missing
                    bonusApplied: false 
                };
                completeTaskTransaction(user.uid, quest.id, fullReward, quest.attribute);
            }
        }
    }, [attributes, spawnParticles, updateAttributeXp, addPlayerReward, user]);

    const handleHabitClick = useCallback((e: React.MouseEvent, habit: Habit) => {
        e.stopPropagation();
        if (habit.completedToday) {
            if(navigator.vibrate) navigator.vibrate(5);
            
            const rewardXp = 20 + ((habit.streak - 1) * 2); 
            addPlayerReward({ xp: -rewardXp, gold: 0 });
            updateAttributeXp(habit.attribute, -rewardXp);
            
            setHabits(prev => prev.map(h => { 
                if (h.id === habit.id) { 
                    return { ...h, completedToday: false, streak: Math.max(0, h.streak - 1), totalCompletions: Math.max(0, h.totalCompletions - 1) }; 
                } 
                return h; 
            }));
            return;
        }
        if (habit.type === 'SIMPLE') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fff', Flame, 'fire');
            if(navigator.vibrate) navigator.vibrate([5, 20, 5]); 
            
            const rewardXp = 20 + (habit.streak * 2); 
            addPlayerReward({ xp: rewardXp, gold: 0 }); // Habits currently only give XP, maybe add gold later?
            updateAttributeXp(habit.attribute, rewardXp);
            
            setHabits(prev => prev.map(h => { 
                if (h.id === habit.id) { 
                    return { ...h, completedToday: true, streak: h.streak + 1, totalCompletions: h.totalCompletions + 1 }; 
                } 
                return h; 
            }));
        } else {
            setValidationHabit(habit); setValTempValue('');
        }
    }, [spawnParticles, updateAttributeXp, addPlayerReward]);

    const validateHabitProgress = () => {
        if (!validationHabit) return;
        let isComplete = false; let newCurrentValue = validationHabit.currentValue || 0; 
        if (validationHabit.type === 'QUANTITY') {
            const added = parseFloat(valTempValue);
            if (isNaN(added) || added <= 0) return;
            newCurrentValue += added;
            if (newCurrentValue >= (validationHabit.targetValue || 0)) isComplete = true;
        } else if (validationHabit.type === 'CHECKLIST') {
            if (validationHabit.checklist?.every(i => i.completed)) isComplete = true;
        }

        if (isComplete) {
            spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#fff', Trophy, 'fire');
            const rewardXp = 20 + (validationHabit.streak * 2); 
            addPlayerReward({ xp: rewardXp, gold: 0 });
            updateAttributeXp(validationHabit.attribute, rewardXp);
        }

        setHabits(prev => prev.map(h => {
            if (h.id === validationHabit.id) {
                if (isComplete) {
                    return { ...h, completedToday: true, streak: h.streak + 1, totalCompletions: h.totalCompletions + 1, currentValue: newCurrentValue };
                }
                return { ...h, currentValue: newCurrentValue }; 
            }
            return h;
        }));
        setValidationHabit(null);
    };

    const handleQuestConfirm = useCallback((data: Partial<Quest>) => {
        setQuests(prev => [{ id: Date.now().toString(), completed: false, ...data } as Quest, ...prev]);
        setActiveModal(null);
    }, []);

    const handleHabitConfirm = useCallback((data: Partial<Habit>) => {
        const newHabit: Habit = { id: Date.now().toString(), streak: 0, completedToday: false, totalCompletions: 0, checklist: data.checklist || [], ...data } as Habit; 
        setHabits(prev => [newHabit, ...prev]);
        setActiveModal(null);
    }, []);

    const handleProjectConfirm = useCallback((data: Partial<Project>) => {
        setProjects(prev => [{ id: Date.now().toString(), totalTime: 0, sessions: [], ...data } as Project, ...prev]);
        setActiveModal(null);
    }, []);

    const handleUpdateProject = useCallback((updatedProject: Project) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    }, []);

    const handleUpdateNote = useCallback((note: Note) => {
        setNotes(prev => {
            const exists = prev.find(n => n.id === note.id);
            if (exists) return prev.map(n => n.id === note.id ? note : n);
            return [note, ...prev];
        });
    }, []);

    const handleDeleteNote = useCallback((id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
        setActiveModal(null);
    }, []);

    const handleUpdateJournal = useCallback((entry: JournalEntry) => {
        setJournalEntries(prev => {
            const exists = prev.find(e => e.id === entry.id);
            if (exists) return prev.map(e => e.id === entry.id ? entry : e);
            return [...prev, entry];
        });
    }, []);

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
        player,
        health,
        attributes,
        setAttributes,
        quests,
        setQuests,
        habits,
        setHabits,
        projects,
        setProjects,
        notes,
        setNotes,
        journalEntries,
        setJournalEntries,
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
        addPlayerReward, // New export
        updateAttributeXp,
        spawnParticles,
        handleCompleteSession,
        completeQuest,
        handleHabitClick,
        validateHabitProgress,
        handleQuestConfirm,
        handleHabitConfirm,
        handleProjectConfirm,
        handleUpdateProject,
        handleUpdateNote,
        handleDeleteNote,
        handleUpdateJournal
    };
};
