import { useState, useEffect, useCallback } from 'react';
import { useMatrix } from '../../../context/MatrixContext';
import { checkAchievements } from '../../../services/achievementListener';
import { Achievement } from '../../../config/achievements';
import { Trophy, Flame, Clock, Star } from 'lucide-react';
import { 
  Attribute, Quest, Habit, Project, Note, JournalEntry, 
  NotificationItem, Particle, Session 
} from '../../../types';
import { TRAITS_LIST } from '../constants';

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

    const [player, setPlayer] = useState({ level: 1, xp: 0, nextXp: 500 });
    const [health] = useState(100);

    // --- SYNC WITH MATRIX CORE ---
    useEffect(() => {
        if (user && user.stats) {
            setPlayer(prev => {
                if (Math.abs(prev.xp - user.stats.xp) > 10 || prev.level !== user.stats.level) {
                    return {
                        level: user.stats.level,
                        xp: user.stats.xp,
                        nextXp: prev.nextXp
                    };
                }
                return prev;
            });
        }
    }, [user]);

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

    const addPlayerXp = useCallback((amount: number) => {
        setPlayer(prev => {
            let newXp = prev.xp + amount;
            let newLevel = prev.level;
            let newNextXp = prev.nextXp;
            let leveledUp = false;
            
            if (amount > 0) {
                while (newXp >= newNextXp) {
                    newXp -= newNextXp;
                    newLevel += 1;
                    newNextXp = Math.floor(newNextXp * 1.2);
                    leveledUp = true;
                }
            } else {
                newXp = Math.max(0, newXp);
            }
            
            if (leveledUp) {
                addNotification({ type: 'GLOBAL', label: 'HERO', fromLevel: prev.level, toLevel: newLevel, icon: Trophy, color: '#fbbf24' });
            }

            return { level: newLevel, xp: newXp, nextXp: newNextXp };
        });
    }, [addNotification]);

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
                        addNotification({ type: 'ATTRIBUTE', label: attr.label, fromLevel: attr.level, toLevel: newLevel, icon: attr.icon, color: attr.color });
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
    }, [addNotification]);

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
        addPlayerXp(totalReward);
        updateAttributeXp(attrId, totalReward);
        const attr = attributes.find(a => a.id === attrId);
        const AttrIcon = attr?.icon || Star;
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, attr?.color || '#fff', AttrIcon);
        addNotification({ type: 'SESSION', label: 'FOCUS COMPLETE', fromLevel: Math.floor(durationSeconds/60) + 'm', toLevel: '+' + totalReward + ' XP', icon: Clock, color: '#fbbf24' });
    }, [projects, attributes, updateAttributeXp, addNotification, spawnParticles, addPlayerXp]);

    const completeQuest = useCallback((e: React.MouseEvent, quest: Quest) => { 
        e.stopPropagation();
        if (quest.completed) {
            if(navigator.vibrate) navigator.vibrate(5);
            setQuests(prev => prev.map(q => { if (q.id === quest.id) { 
                addPlayerXp(-q.xpReward); 
                updateAttributeXp(q.attribute, -q.xpReward);
                return { ...q, completed: false }; 
            } return q; }));
        } else {
            const attr = attributes.find(a => a.id === quest.attribute);
            const AttrIcon = attr?.icon || Star;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top, attr?.color || '#fff', AttrIcon);
            if(navigator.vibrate) navigator.vibrate(10); 
            setQuests(prev => prev.map(q => { if (q.id === quest.id) { 
                addPlayerXp(q.xpReward); 
                updateAttributeXp(q.attribute, q.xpReward); 
                return { ...q, completed: true }; 
            } return q; }));
        }
    }, [attributes, spawnParticles, updateAttributeXp, addPlayerXp]);

    const handleHabitClick = useCallback((e: React.MouseEvent, habit: Habit) => {
        e.stopPropagation();
        if (habit.completedToday) {
            if(navigator.vibrate) navigator.vibrate(5);
            setHabits(prev => prev.map(h => { if (h.id === habit.id) { 
                const reward = 20 + ((h.streak - 1) * 2); 
                addPlayerXp(-reward); 
                updateAttributeXp(h.attribute, -reward);
                return { ...h, completedToday: false, streak: Math.max(0, h.streak - 1), totalCompletions: Math.max(0, h.totalCompletions - 1) }; 
            } return h; }));
            return;
        }
        if (habit.type === 'SIMPLE') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fff', Flame, 'fire');
            if(navigator.vibrate) navigator.vibrate([5, 20, 5]); 
            setHabits(prev => prev.map(h => { if (h.id === habit.id) { const reward = 20 + (h.streak * 2); addPlayerXp(reward); updateAttributeXp(h.attribute, reward); return { ...h, completedToday: true, streak: h.streak + 1, totalCompletions: h.totalCompletions + 1 }; } return h; }));
        } else {
            setValidationHabit(habit); setValTempValue('');
        }
    }, [spawnParticles, updateAttributeXp, addPlayerXp]);

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
        setHabits(prev => prev.map(h => {
            if (h.id === validationHabit.id) {
                if (isComplete) {
                    spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#fff', Trophy, 'fire');
                    const reward = 20 + (h.streak * 2); addPlayerXp(reward); updateAttributeXp(h.attribute, reward);
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
