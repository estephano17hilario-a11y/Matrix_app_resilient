import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Target, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toLocalISOString } from './utils/dateUtils';
import { PlayerHUD } from './modules/dashboard/PlayerHUD';
import { TaskList } from './modules/tasks/TaskList';
import { AchievementToast } from './components/AchievementToast';
import { StatsHeader } from './modules/dashboard/components/StatsHeader';
import { Dock } from './modules/dashboard/components/Dock';
import { QuestModal } from './modules/dashboard/components/QuestModal';
import { HabitModal } from './modules/dashboard/components/HabitModal';
import { ProjectModal } from './modules/dashboard/components/ProjectModal';
import { ValidationModal } from './modules/dashboard/components/ValidationModal';
import { BadHabitWizard } from './modules/dashboard/components/BadHabitWizard';
import { RelapseModal } from './modules/dashboard/components/RelapseModal';
import { GlobalStyles } from './styles/GlobalStyles';
import { useDashboardLogic } from './modules/dashboard/hooks/useDashboardLogic';
import { Quest, Habit, BadHabit } from './types';
import { persistenceService } from './services/persistenceService';
import { StrategicNode } from './types/SmartGoal';
import { FREE_LIMITS } from './config/limits';

import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { HabitActionsModal } from './modules/dashboard/components/HabitActionsModal';

import { ViewContainer } from './modules/dashboard/components/ViewContainer';
import { ParticleLayer } from './modules/dashboard/components/ParticleLayer';
import { cn } from './utils/cn';

// Lazy Load Heavy Views
const HabitVisualView = lazy(() => import('./modules/dashboard/HabitVisualView').then(m => ({ default: m.HabitVisualView })));
const FocusView = lazy(() => import('./modules/focus/FocusView').then(m => ({ default: m.FocusView })));
const NotesView = lazy(() => import('./modules/notes/NotesView').then(m => ({ default: m.NotesView })));
const AchievementsScreen = lazy(() => import('./modules/achievements/AchievementsScreen').then(m => ({ default: m.AchievementsScreen })));
const StoreScreen = lazy(() => import('./modules/store/StoreScreen').then(m => ({ default: m.StoreScreen })));
const NexusView = lazy(() => import('./modules/nexus').then(m => ({ default: m.NexusView })));
const SmartTaskWizard = lazy(() => import('./modules/smart-tasks/SmartTaskWizard').then(m => ({ default: m.SmartTaskWizard })));
const StrategicMapView = lazy(() => import('./modules/smart-tasks/components/StrategicMapView').then(m => ({ default: m.StrategicMapView })));
const SettingsView = lazy(() => import('./modules/dashboard/settings/SettingsHub').then(m => ({ default: m.SettingsHub })));
const ProUpgradeModal = lazy(() => import('./modules/monetization/ProUpgradeModal').then(m => ({ default: m.ProUpgradeModal })));
const StreakRoadmapView = lazy(() => import('./modules/dashboard/StreakRoadmapView').then(m => ({ default: m.StreakRoadmapView })));

const SuspenseFallback = () => (
    <div className="flex items-center justify-center h-full w-full min-h-[200px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

// Helper to convert SmartProject nodes to Real Quests
const ARCHETYPE_THEMES = {
    NEO: {
        bg: 'bg-indigo-600',
        ring: 'ring-indigo-500/50',
        bgLight: 'bg-indigo-500/20',
        text: 'text-indigo-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)]'
    },
    SPARTAN: {
        bg: 'bg-rose-600',
        ring: 'ring-rose-500/50',
        bgLight: 'bg-rose-500/20',
        text: 'text-rose-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(244,63,94,0.5)]'
    },
    HACKER: {
        bg: 'bg-emerald-600',
        ring: 'ring-emerald-500/50',
        bgLight: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]'
    },
    MONK: {
        bg: 'bg-cyan-600',
        ring: 'ring-cyan-500/50',
        bgLight: 'bg-cyan-500/20',
        text: 'text-cyan-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)]'
    }
};

const convertNodeToQuests = (node: StrategicNode, traitId: string, smartProjectId: string): Quest[] => {
    const quests: Quest[] = [];
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Map level to difficulty
    const difficultyMap: Record<string, 'S'|'A'|'B'|'C'> = {
        'YEAR': 'S',
        'SEMESTER': 'A',
        'QUARTER': 'B',
        'MONTH': 'C',
        'WEEK': 'C',
        'DAY': 'C'
    };

    // Filter Logic:
    // 1. Always include Root (YEAR) - The Main Goal
    // 2. Include DAY nodes only if within current week
    // 3. Include intermediate levels (SEMESTER, QUARTER, MONTH, WEEK) to ensure visibility
    
    const isRoot = node.level === 'YEAR';
    const isDay = node.level === 'DAY';
    // const isIntermediate = ['SEMESTER', 'QUARTER', 'MONTH', 'WEEK'].includes(node.level);
    
    let shouldInclude = false;
    
    if (isRoot) {
        shouldInclude = true;
    } else if (isDay) {
        if (node.dueDate) {
            const date = node.dueDate.toDate();
            // Check if it's in the current week OR if it's today/overdue (if we want to show past due)
            // User requirement: "tareas pasadas que aun se ven" -> Maybe they WANT to see them if not done?
            // "quiero que este todo actualizado... coherencia de datos"
            // Let's stick to current week window for now, but maybe expand if not completed?
            if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
                shouldInclude = true;
            }
        }
    } else {
        // Intermediate nodes: Always include them if they have a title, so we can see the hierarchy/progress
        shouldInclude = true;
    }

    // Create quest for current node (skip if it's a placeholder)
    if (shouldInclude && node.title && !node.placeholder) {
        const quest: Quest = {
            id: node.id, // Use the same ID to link them
            title: node.title,
            description: `Smart Goal: ${node.level}`, 
            attribute: traitId || 'intelligence', // Default fallback
            difficulty: difficultyMap[node.level] || 'C',
            completed: node.isCompleted,
            xpReward: node.reward?.xp || 100,
            gold: node.reward?.coins || 0,
            deadline: node.dueDate ? node.dueDate.toDate().toISOString().split('T')[0] : undefined,
            subtasks: [],
            isSmartQuest: true,
            smartProjectId: smartProjectId
        };
        quests.push(quest);
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            quests.push(...convertNodeToQuests(child, traitId, smartProjectId));
        });
    }

    return quests;
};

export default function Dashboard() {
    useEffect(() => {
        console.log("💎 MATRIX: Dashboard Mounted Successfully");
    }, []);

    const { t, i18n } = useTranslation();
    // ⚡ PERFORMANCE: Track loaded views to keep them alive (Cache)
    const [loadedViews, setLoadedViews] = useState<Set<string>>(new Set(['TASKS']));
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Force re-render on language change
    useEffect(() => {
        const handleLanguageChanged = () => {
            // This is a bit of a hack to force re-render if deep components are memoized too aggressively
            setLoadedViews(prev => new Set(prev)); 
        };
        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n]);

    // ⚡ PERFORMANCE: Pre-load all heavy views after initial render for "Flash" switching
    useEffect(() => {
        let idleId: number | null = null;
        let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;
        const prefetch = async () => {
            try {
                await Promise.all([
                    import('./modules/dashboard/HabitVisualView'),
                    import('./modules/focus/FocusView'),
                    import('./modules/notes/NotesView'),
                    import('./modules/achievements/AchievementsScreen'),
                    import('./modules/store/StoreScreen'),
                    import('./modules/nexus'),
                    import('./modules/smart-tasks/components/StrategicMapView'),
                    import('./modules/dashboard/settings/SettingsHub')
                ]);
            } catch (e) {
                console.warn("Prefetch failed", e);
            }
        };

        const schedule = () => {
            const idleCallback = (globalThis as any).requestIdleCallback;
            if (typeof idleCallback === 'function') {
                idleId = idleCallback(() => prefetch());
            } else {
                prefetchTimeout = setTimeout(() => prefetch(), 0);
            }
        };

        const delayId = setTimeout(schedule, 3000);

        return () => {
            clearTimeout(delayId);
            const cancelIdle = (globalThis as any).cancelIdleCallback;
            if (idleId && typeof cancelIdle === 'function') {
                cancelIdle(idleId);
            }
            if (prefetchTimeout) {
                clearTimeout(prefetchTimeout);
            }
        };
    }, []);

    const {
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
        isNoteTaking,
        setIsNoteTaking,
        showProfile,
        setShowProfile,
        player,
        health,
        attributes,
        quests,
        setQuests,
        habits,
        projects,
        smartProjects,
        setSmartProjects,
        notes,
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
        handleCompleteSession,
        completeQuest,
        handleHabitClick,
        handleToggleHabitDay,
        validateHabitProgress,
        handleQuestConfirm,
        handleDeleteQuest,
        handleDeleteHabit,
        handleHabitConfirm,
        handleHabitUpdate,
        handleProjectConfirm,
        handleUpdateProject,
        handleUpdateSmartProject,
        handleAddNote,
        defaultChartMode,
        setDefaultChartMode,
        updateAttributeMetadata,
        addAttribute,
        removeAttribute,
        dashboardStyle,
        updateDashboardStyle,
        avatarShape,
        updateAvatarShape,
        badHabits,
        handleBadHabitConfirm,
        handleBadHabitRelapse,
        vividMode,
        setVividMode,
        updatePlayerLevel,
        updateAttributeLevel,
        habitSectionControl,
        updateHabitSectionControl,
        allowDockSectionSwitch,
        updateAllowDockSectionSwitch,
        stickyHud,
        updateStickyHud
    } = useDashboardLogic();

    const archetypeTheme = user?.archetype ? ARCHETYPE_THEMES[user.archetype] || ARCHETYPE_THEMES['NEO'] : ARCHETYPE_THEMES['NEO'];

    // 🛡️ RECOVERED LOGIC: Calculate Max Health locally to avoid hook return type issues
    const maxHealth = 100 + (player.level - 1) * 10;

    const [isNexusImmersive, setIsNexusImmersive] = useState(false);
    const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
    const [modalInitialContext, setModalInitialContext] = useState<any>(null);
    const [activeSmartProjectId, setActiveSmartProjectId] = useState<string | null>(null); // Added state for active project
    const [relapsingHabit, setRelapsingHabit] = useState<BadHabit | null>(null);

    const isOverlayActive = activeModal || validationHabit || isDockOpen;

    const handleToggleImmersive = (immersive: boolean) => {
        setIsNexusImmersive(immersive);
    };

    const handleOpenProjectModalFromNexus = (smartProjectId: string) => {
        setModalInitialContext({ smartProjectId });
        setActiveModal('PROJECT');
    };

    const handleOpenHabitModalFromNexus = (smartProjectId: string) => {
        setModalInitialContext({ projectId: smartProjectId });
        setActiveModal('HABIT');
    };

    // ⚡ PERFORMANCE: Add current view to loaded set
    useEffect(() => {
        if (currentView) {
            setLoadedViews(prev => {
                const newSet = new Set(prev);
                newSet.add(currentView);
                return newSet;
            });
        }
    }, [currentView]);

    const smartProject = smartProjects.find(p => p.id === activeSmartProjectId) || (smartProjects.length > 0 ? smartProjects[0] : null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const isProModalOpen = activeModal === 'PRO';
    const setIsProModalOpen = (open: boolean) => open ? setActiveModal('PRO') : setActiveModal(null);
    const [taskViewMode, setTaskViewMode] = useState<'LIST' | 'STRATEGY'>('LIST');
    const [habitViewMode, setHabitViewMode] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');
    const [noteViewMode, setNoteViewMode] = useState<'NOTES' | 'JOURNAL'>('NOTES');
    const [smartTaskProps, setSmartTaskProps] = useState<{ lockedDate?: string, lockedAttributeId?: string, lockedSmartProjectId?: string } | null>(null);
    const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [focusTargetProjectId, setFocusTargetProjectId] = useState<string | null>(null);

    const handleFocusProject = (projectId: string) => {
        setFocusTargetProjectId(projectId);
        setCurrentView('FOCUS');
    };

    const handleOpenNexus = (smartProjectId: string) => {
        setActiveSmartProjectId(smartProjectId);
        setCurrentView('NEXUS');
    };

    // --- HABIT ACTIONS & CONFIRMATION ---
    const [habitActionsHabit, setHabitActionsHabit] = useState<Habit | null>(null);
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const handleShowHabitActions = (habit: Habit) => {
        setHabitActionsHabit(habit);
    };

    const handleArchiveHabit = (habit: Habit) => {
        handleHabitUpdate(habit.id, { archived: !habit.archived });
    };

    const handleDeleteHabitRequest = (habit: Habit) => {
        setConfirmationModal({
            isOpen: true,
            title: t('habits.deleteTitle', '¿Eliminar Hábito?'),
            message: t('habits.deleteConfirm', `Estás a punto de eliminar "${habit.title}". Esta acción no se puede deshacer.`),
            confirmText: t('common.delete', 'Eliminar'),
            variant: 'danger',
            onConfirm: () => handleDeleteHabit(habit.id),
        });
    };

    useEffect(() => {
        if (currentView !== 'FOCUS') {
            handleFocusModeChange(null);
        }
    }, [currentView, handleFocusModeChange]);

    const handleOpenSmartTaskCreator = (date: Date, smartProjectId?: string) => {
        const targetProject = smartProjectId ? smartProjects.find(p => p.id === smartProjectId) : smartProject;
        if (!targetProject) return;
        setEditingQuest(null);
        setSmartTaskProps({
            lockedDate: toLocalISOString(date),
            lockedAttributeId: targetProject.traitId,
            lockedSmartProjectId: targetProject.id
        });
        setActiveModal('QUEST');
    };

    const handleEditQuest = (quest: Quest) => {
        setSmartTaskProps(null);
        setEditingQuest(quest);
        setActiveModal('QUEST');
    };

    const handleEditHabit = (habit: Habit) => {
        setEditingHabit(habit);
        setActiveModal('HABIT');
    };

    const handleQuestModalClose = () => {
        setActiveModal(null);
        setEditingQuest(null);
        setSmartTaskProps(null);
    };

    const handleDeleteSmartProject = async (projectId?: string) => {
        const targetId = projectId || smartProject?.id;
        const targetProject = projectId ? smartProjects.find(p => p.id === projectId) : smartProject;

        if (!targetId || !targetProject || !user?.uid) return;

        try {
            // 1. Delete the Project itself
            await persistenceService.smartProjects.delete(user.uid, targetId);
            
            // Update Local State
            setSmartProjects(prev => prev.filter(p => p.id !== targetId));
            
            // 2. Collect all Node IDs to delete associated Quests
            const idsToDelete: string[] = [];
            const collectIds = (node: StrategicNode) => {
                idsToDelete.push(node.id);
                if (node.children) {
                    node.children.forEach(collectIds);
                }
            };
            collectIds(targetProject.rootNode);

            // 3. Delete all associated quests from Persistence
            // We run these in parallel for speed, but catching errors individually to ensure best effort
            await Promise.all(idsToDelete.map(id => 
                persistenceService.quests.delete(user.uid, id).catch((e: any) => console.warn(`Failed to delete quest ${id}`, e))
            ));

            // 4. Update State
            if (activeSmartProjectId === targetId) {
                setActiveSmartProjectId(null);
            }
            setQuests(prev => prev.filter(q => !idsToDelete.includes(q.id)));
            
        } catch (error) {
            console.error("Failed to delete smart project:", error);
            alert("Error al eliminar el proyecto. Revisa la consola.");
        }
    };

    const handleDeleteSmartTaskNode = async (nodeId: string) => {
        if (!smartProject || !user?.uid) return;

        try {
             // 1. Logic to find and remove node, collecting all deleted IDs (including children)
             const deletedIds: string[] = [];
             
             const collectIds = (node: StrategicNode) => {
                 deletedIds.push(node.id);
                 if (node.children) {
                     node.children.forEach(collectIds);
                 }
             };

             const removeNode = (node: StrategicNode): StrategicNode | null => {
                 // If this is the node to delete
                 if (node.id === nodeId) {
                     collectIds(node);
                     return null; // Remove it
                 }

                 // If it has children, filter them
                 if (node.children) {
                     const newChildren = node.children
                        .map(removeNode)
                        .filter((n): n is StrategicNode => n !== null);
                     
                     // If children changed, return new node
                     if (newChildren.length !== node.children.length) {
                         return { ...node, children: newChildren };
                     }
                 }

                 return node;
             };

             // Execute removal on root
             const newRoot = removeNode(smartProject.rootNode);

             // If root itself was deleted (should be handled by deleteProject, but safe to handle here)
             if (!newRoot) {
                 handleDeleteSmartProject();
                 return;
             }

             // 2. Update Project in Persistence
             const newProject = { ...smartProject, rootNode: newRoot };
             if (smartProject.id) {
                await persistenceService.smartProjects.update(user.uid, smartProject.id, newProject);
             } else {
                console.error("Smart Project ID is missing");
             }

             // 3. Delete associated quests from Persistence
      if (deletedIds.length > 0) {
          await Promise.all(deletedIds.map(id => 
              persistenceService.quests.delete(user.uid, id).catch((e: any) => console.warn(`Failed to delete quest ${id}`, e))
          ));
      }

      // 4. Update State
      setSmartProjects([newProject]);
      setQuests(prev => prev.filter(q => !deletedIds.includes(q.id)));

        } catch (error) {
            console.error("Failed to delete smart task node:", error);
            alert("Error al eliminar la tarea. Revisa la consola.");
        }
    };

    const handleDockViewChange = (view: string) => {
        setIsNexusImmersive(false);

        if (view === 'STRATEGY') {
            setCurrentView('TASKS');
            setTaskViewMode('STRATEGY');
            return;
        }

        if (view === currentView) {
            // Toggle logic for active view
            if (view === 'TASKS') {
                if (allowDockSectionSwitch) {
                    setTaskViewMode(prev => prev === 'LIST' ? 'STRATEGY' : 'LIST');
                }
            } else if (view === 'HABITS') {
                if (allowDockSectionSwitch) {
                    setHabitViewMode(prev => prev === 'PROTOCOLS' ? 'VICES' : 'PROTOCOLS');
                }
            } else if (view === 'NOTES') {
                if (allowDockSectionSwitch) {
                    setNoteViewMode(prev => prev === 'NOTES' ? 'JOURNAL' : 'NOTES');
                }
            }
        } else {
            // Switching to new view - Reset sub-views to default
            setCurrentView(view);
            if (view === 'TASKS') setTaskViewMode('LIST');
            if (view === 'HABITS') setHabitViewMode('PROTOCOLS');
            if (view === 'NOTES') setNoteViewMode('NOTES');
        }
    };

    // Scroll Reset on View Change
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentView, taskViewMode]);

    // Calculate if all active habits are completed today
    const activeHabits = habits.filter(h => !h.archived);
    const isHabitsCompleted = activeHabits.length > 0 && activeHabits.every(h => h.completedToday);

    return (
        <div className="fixed inset-0 w-full h-full text-slate-200 selection:bg-cyan-500/30 overflow-hidden">
            <GlobalStyles />
            
            <Suspense fallback={null}>
                <ProUpgradeModal 
                    isOpen={isProModalOpen}
                    onClose={() => setIsProModalOpen(false)}
                />
            </Suspense>

            {createPortal(
                <div className="fixed top-4 left-0 right-0 z-[10000] flex flex-col items-center gap-2 pointer-events-none px-4">
                    <AnimatePresence>
                        {notifications.map(n => {
                            const NotifIcon = n.icon;
                            return (
                                <motion.div 
                                    key={n.id}
                                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    className="backdrop-blur-md border border-yellow-500/50 bg-yellow-950/85 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5" style={{ color: n.color }}><NotifIcon size={16} /></div>
                                    <div className="flex-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{n.label} LEVEL UP</p><div className="flex items-center gap-2 text-sm font-black text-white"><span>{n.fromLevel}</span><ArrowUp size={12} className="text-green-400" /><span style={{ color: n.color }}>{n.toLevel}</span></div></div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>,
                document.body
            )}

            {/* SCROLLABLE CONTENT LAYER */}
            <div ref={scrollContainerRef} className="absolute inset-0 z-10 w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth">
                <AchievementToast 
                    achievement={lastAchievement} 
                    onClose={() => setLastAchievement(null)} 
                />

                {/* FX LAYER */}
                <ParticleLayer particles={particles} />

                {/* PERSISTENT HUD - OUTSIDE MAIN TO PREVENT RE-LAYOUT JUMPS */}
                {!isNexusImmersive && !isWizardOpen && !isFocusMode && !isFullScreenFocus && currentView !== 'STREAK' && (
                    <>
                        <div className="relative z-[300] w-full bg-transparent transition-all duration-300 pt-safe">
                            <div className="max-w-md mx-auto px-4 sm:px-6">
                                <StatsHeader 
                                    level={player.level} 
                                    xp={player.xp} 
                                    gold={player.gold}
                                    nextXp={player.nextXp} 
                                    health={health}
                                    maxHealth={maxHealth}
                                    streak={habits.reduce((acc, h) => acc + h.streak, 0)}
                                    isHidden={false} // Always visible in Dashboard
                                    showProfile={showProfile}
                                    onShowStore={() => setCurrentView(prev => prev === 'STORE' ? 'TASKS' : 'STORE')}
                                    onShowPro={() => setIsProModalOpen(true)}
                                    onShowSettings={() => setIsSettingsOpen(true)}
                                    onToggleProfile={() => setIsSettingsOpen(true)}
                                    displayName={user?.displayName}
                                    email={user?.email}
                                    currentView={currentView}
                                    isPro={user?.plan === 'PRO'}
                                    avatarId={user?.avatarId}
                                    avatarShape={avatarShape}
                                    onUpdateLevel={updatePlayerLevel}
                                    isHabitsCompleted={isHabitsCompleted}
                                />
                            </div>
                        </div>

                        {/* 💎 STATUS HUD - THE MIRROR (GLOBAL POSITION) */}
                        {showProfile && (currentView === 'TASKS' && taskViewMode !== 'STRATEGY') && (
                             <div className={cn(
                                "px-4 sm:px-6 max-w-md mx-auto mt-6 mb-4",
                                stickyHud ? "sticky top-4 z-[300]" : "relative z-[290]"
                             )}>
                                <PlayerHUD 
                                    attributes={attributes}
                                    defaultChartMode={defaultChartMode}
                                    onUpdateAttributeLevel={updateAttributeLevel}
                                />
                            </div>
                        )}
                    </>
                )}

                
                <main className={`relative ${isOverlayActive ? 'z-[400]' : (currentView === 'FOCUS' ? 'z-[200]' : 'z-10')} ${currentView === 'ACHIEVEMENTS' ? 'max-w-none' : 'max-w-md'} mx-auto min-h-screen pt-4 ${isNexusImmersive || currentView === 'FOCUS' ? 'pb-0' : 'pb-40'} flex flex-col ${currentView === 'FOCUS' || isNexusImmersive || currentView === 'ACHIEVEMENTS' ? 'px-0 gap-0' : `px-4 sm:px-6 ${showProfile ? 'gap-6' : 'gap-2'}`}`}>

                    <div className={`h-full flex-1 w-full relative ${currentView === 'FOCUS' ? 'z-10' : 'z-0'}`}>
                        {/* ⚡ TASKS VIEW (Always loaded initially) */}
                        <ViewContainer isActive={currentView === 'TASKS'} className="h-full">
                            <div className="flex flex-col gap-6 h-full">
                                {/* VIEW TOGGLE */}
                                {(!isNexusImmersive && habitSectionControl === 'VISIBLE') && (
                                    <div className="flex items-center justify-center gap-4 mb-1 -mt-2">
                                        <div className="flex p-1 rounded-full backdrop-blur-md bg-white/5 border border-white/10 shadow-lg">
                                            <button 
                                                onClick={() => setTaskViewMode('LIST')}
                                                className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${taskViewMode === 'LIST' ? 'bg-theme-avatar text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <ListTodo size={14} />
                                                {t('dashboard.tasks')}
                                            </button>
                                            <button 
                                                onClick={() => setTaskViewMode('STRATEGY')}
                                                className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${taskViewMode === 'STRATEGY' ? 'bg-theme-avatar text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <Target size={14} />
                                                {t('dashboard.strategy')}
                                            </button>
                                        </div>
                                    </div>
                                )}



                                {taskViewMode === 'LIST' ? (
                                    <>
                                        {/* ACTIVE MISSIONS */}
                                        <TaskList 
                                            quests={quests} 
                                            attributes={attributes} 
                                            onCompleteQuest={completeQuest} 
                                            onDeleteQuest={handleDeleteQuest} 
                                            onEditQuest={handleEditQuest}
                                            onAddQuest={() => setActiveModal('QUEST')}
                                            onFocusProject={handleFocusProject}
                                            projects={projects}
                                            onOpenNexus={handleOpenNexus}
                                        />
                                    </>
                                ) : (
                                    <div className="h-full flex-1 min-h-[500px] rounded-3xl overflow-hidden border border-white/5 relative">
                                         {smartProject ? (
                                            <Suspense fallback={<SuspenseFallback />}>
                                                <StrategicMapView 
                                                    project={smartProject} 
                                                    quests={quests}
                                                    attributes={attributes}
                                                    onUpdateProject={(updated) => setSmartProjects([updated])}
                                                    onDeleteProject={handleDeleteSmartProject}
                                                    onDeleteNode={handleDeleteSmartTaskNode}
                                                    onCreateNew={() => setIsWizardOpen(true)}
                                                    onAddSmartTask={handleOpenSmartTaskCreator}
                                                    onCompleteQuest={completeQuest}
                                                    onDeleteQuest={handleDeleteQuest}
                                                    onEditQuest={handleEditQuest}
                                                    onOpenNexus={handleOpenNexus}
                                                />
                                            </Suspense>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                                <div className={`w-20 h-20 rounded-full ${archetypeTheme.bgLight} ring-1 ${archetypeTheme.ring} flex items-center justify-center mb-6 ${archetypeTheme.shadow}`}>
                                                    <ArrowUp className={`w-10 h-10 ${archetypeTheme.text} rotate-45`} />
                                                </div>
                                                <h2 className="text-3xl font-bold mb-4">{t('dashboard.noStrategy')}</h2>
                                                <p className="text-white/60 mb-8 max-w-md">{t('dashboard.noStrategyDesc')}</p>
                                                <button 
                                                    onClick={() => {
                                                        const activeQuests = quests.filter(q => !q.completed);
                                                        if (user?.plan !== 'PRO' && activeQuests.length >= FREE_LIMITS.ACTIVE_TASKS) {
                                                            setActiveModal('PRO');
                                                            return;
                                                        }
                                                        setIsWizardOpen(true);
                                                    }}
                                                    className={`px-8 py-3 ${archetypeTheme.bg} rounded-full font-bold text-white ${archetypeTheme.btnShadow} hover:scale-105 transition-transform`}
                                                >
                                                    Initialize Protocol
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ViewContainer>

                        {/* SETTINGS - MOVED TO MODAL LAYER */}

                        {/* HABITS */}
                        {(loadedViews.has('HABITS') || currentView === 'HABITS') && (
                            <ViewContainer isActive={currentView === 'HABITS'}>
                                {/* SECTION SWITCHER (RESTORED) */}
                                {habitSectionControl === 'VISIBLE' && (
                                    <div className="flex justify-center pt-6 pb-2 z-10 relative">
                                        <div className="flex p-1 bg-white/5 rounded-full border border-white/10 shadow-sm">
                                            <button
                                                onClick={() => setHabitViewMode('PROTOCOLS')}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${habitViewMode === 'PROTOCOLS' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                                            >
                                                PROTOCOLS
                                            </button>
                                            <button
                                                onClick={() => setHabitViewMode('VICES')}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${habitViewMode === 'VICES' ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' : 'text-white/60 hover:text-white'}`}
                                            >
                                                VICES
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <Suspense fallback={<SuspenseFallback />}>
                                    <HabitVisualView 
                            habits={habits} 
                            badHabits={badHabits}
                            attributes={attributes} 
                            onCompleteHabit={handleHabitClick}
                            onToggleHabitDay={handleToggleHabitDay as any}
                            onCreateHabit={() => setActiveModal('HABIT')}
                            onCreateBadHabit={() => setActiveModal('BAD_HABIT')}
                            onDeleteHabit={handleDeleteHabit}
                            onEditHabit={handleEditHabit}
                            onUpdateHabit={handleHabitUpdate}
                            onShowActions={handleShowHabitActions}
                            onRelapseBadHabit={(habit) => {
                                setRelapsingHabit(habit);
                                setActiveModal('RELAPSE');
                            }}
                            currentSection={habitViewMode}
                            isActive={currentView === 'HABITS'}
                            onOpenStreak={() => setCurrentView('STREAK')}
                        />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {(loadedViews.has('STREAK') || currentView === 'STREAK') && (
                            <ViewContainer isActive={currentView === 'STREAK'} id="STREAK" className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <StreakRoadmapView
                                        habits={habits}
                                        onClose={() => setCurrentView('HABITS')}
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* FOCUS */}
                        {(loadedViews.has('FOCUS') || currentView === 'FOCUS') && (
                            <ViewContainer isActive={currentView === 'FOCUS'} className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <FocusView 
                                        projects={projects} 
                                        attributes={attributes} 
                                        onCompleteSession={handleCompleteSession} 
                                        onOpenProjectModal={() => setActiveModal('PROJECT')} 
                                        setFocusMode={handleFocusModeChange} 
                                        onUpdateProject={handleUpdateProject}
                                        addNotification={addNotification}
                                        initialProjectId={focusTargetProjectId}
                                        onShowPro={() => setActiveModal('PRO')}
                                        isPro={user?.plan === 'PRO'}
                                        onToggleFullScreen={setIsFullScreenFocus}
                                        isActive={currentView === 'FOCUS'}
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* NOTES */}
                        {(loadedViews.has('NOTES') || currentView === 'NOTES') && (
                            <ViewContainer isActive={currentView === 'NOTES'} id="NOTES" className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <NotesView 
                                        onInteractionStart={() => setIsNoteTaking(true)}
                                        onInteractionEnd={() => setIsNoteTaking(false)}
                                        projects={projects}
                                        onShowPro={() => setActiveModal('PRO')}
                                        currentSubView={noteViewMode}
                                        sectionControl={habitSectionControl}
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* ACHIEVEMENTS */}
                        {(loadedViews.has('ACHIEVEMENTS') || currentView === 'ACHIEVEMENTS') && (
                            <ViewContainer isActive={currentView === 'ACHIEVEMENTS'} id="ACHIEVEMENTS" className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <AchievementsScreen />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* STORE */}
                        {(loadedViews.has('STORE') || currentView === 'STORE') && (
                            <ViewContainer isActive={currentView === 'STORE'} id="STORE" className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <StoreScreen onNavigate={(view) => setCurrentView(view)} />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* NEXUS */}
                        {(loadedViews.has('NEXUS') || currentView === 'NEXUS') && (
                            <ViewContainer isActive={currentView === 'NEXUS'} id="NEXUS" className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <NexusView 
                                        onToggleImmersive={handleToggleImmersive}
                                        onOpenProjectModal={handleOpenProjectModalFromNexus}
                                        onOpenHabitModal={handleOpenHabitModalFromNexus}
                                        smartProjects={smartProjects}
                                        habits={habits}
                                        notes={notes}
                                        projects={projects}
                                        quests={quests}
                                        onToggleHabit={handleHabitClick}
                                        onCompleteQuest={completeQuest}
                                        onUpdateSmartProject={handleUpdateSmartProject}
                                        onAddNote={handleAddNote}
                                        loading={matrixLoading}
                                        targetSmartProjectId={activeSmartProjectId}
                                        onOpenWizard={() => setIsWizardOpen(true)}
                                        onDeleteSmartProject={handleDeleteSmartProject}
                                        onClose={() => {
                                            setTaskViewMode('STRATEGY');
                                            setCurrentView('TASKS');
                                            setIsNexusImmersive(false);
                                            setActiveSmartProjectId(null);
                                        }}
                                        onSelectProject={(id) => setActiveSmartProjectId(id)}
                                        onAddQuest={handleOpenSmartTaskCreator}
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                            {/* --- STRATEGY SECTION --- */}
                        <AnimatePresence>
                            {isWizardOpen && (
                                <Suspense fallback={null}>
                                    <SmartTaskWizard 
                                        availableTraits={attributes}
                                        activeSmartTasksCount={quests.filter(q => !q.completed).length}
                                        isPro={user?.plan === 'PRO'}
                                        onComplete={(project) => {
                                            let newQuests = convertNodeToQuests(project.rootNode, project.traitId || '', project.id);
                                            
                                            // LIMIT CHECK: Enforce max active tasks
                                            if (user?.plan !== 'PRO') {
                                                const currentActive = quests.filter(q => !q.completed).length;
                                                const remainingSlots = Math.max(0, FREE_LIMITS.ACTIVE_TASKS - currentActive);
                                                
                                                if (newQuests.length > remainingSlots) {
                                                newQuests = newQuests.slice(0, remainingSlots);
                                                setActiveModal('PRO'); // Show upgrade prompt
                                            }
                                        }

                                        setSmartProjects(prev => [...prev, project]);
                                        setActiveSmartProjectId(project.id);
                                        setTaskViewMode('STRATEGY');
                                        setQuests(prev => [...newQuests, ...prev]);
                                        
                                        // Save to Reality (Persistence)
                                        if (user?.uid) {
                                            // Save Quests
                                            newQuests.forEach(q => {
                                                persistenceService.quests.save(user.uid, q).catch((err: any) => 
                                                    console.error("Failed to save smart quest:", err)
                                                );
                                            });
                                            
                                            // Save Strategic Map
                                            persistenceService.smartProjects.save(user.uid, project).catch((err: any) => 
                                                    console.error("Failed to save smart project:", err)
                                                );
                                            }

                                            setIsWizardOpen(false);
                                        }}
                                        onCancel={() => setIsWizardOpen(false)}
                                    />
                                </Suspense>
                            )}
                        </AnimatePresence>
                    </div>

                    <Dock 
                        currentView={currentView} 
                        onChangeView={handleDockViewChange} 
                        onOpenModal={setActiveModal} 
                        isOpen={isDockOpen} 
                        onToggle={setIsDockOpen} 
                        isHidden={isFocusMode || isNoteTaking || isWizardOpen || isNexusImmersive || isFullScreenFocus}
                        dashboardStyle={dashboardStyle}
                    />
                    
                    {/* --- GLOBAL BLUR BACKDROP (APPLE INTELLIGENCE MODE) --- */}
                    <AnimatePresence>
                        {((activeModal && activeModal !== 'BAD_HABIT') || validationHabit || isDockOpen) && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[350] bg-black/60 backdrop-blur-sm"
                                onClick={() => { setActiveModal(null); setValidationHabit(null); setIsDockOpen(false); setModalInitialContext(null); }} 
                            />
                        )}
                    </AnimatePresence>

                    {/* MODALS */}
                    <QuestModal 
                        isOpen={activeModal === 'QUEST'} 
                        onClose={handleQuestModalClose} 
                        attributes={attributes} 
                        projects={projects} 
                        smartProjects={smartProjects}
                        onConfirm={handleQuestConfirm}
                        lockedAttributeId={smartTaskProps?.lockedAttributeId}
                        lockedDate={smartTaskProps?.lockedDate}
                        lockedSmartProjectId={smartTaskProps?.lockedSmartProjectId}
                        isSmartTask={!!smartTaskProps}
                        initialValues={editingQuest || undefined}
                    />
                    <HabitModal 
                        isOpen={activeModal === 'HABIT'} 
                        onClose={() => { setActiveModal(null); setEditingHabit(null); setModalInitialContext(null); }} 
                        attributes={attributes} 
                        smartProjects={smartProjects}
                        projects={projects}
                        onConfirm={handleHabitConfirm}
                        initialData={editingHabit || modalInitialContext || undefined}
                    />
                    <ProjectModal 
                        isOpen={activeModal === 'PROJECT'} 
                        onClose={() => { setActiveModal(null); setModalInitialContext(null); }} 
                        attributes={attributes} 
                        smartProjects={smartProjects} 
                        onConfirm={handleProjectConfirm} 
                        initialData={modalInitialContext || undefined}
                    />

                    {activeModal === 'BAD_HABIT' && (
                        <BadHabitWizard 
                            isOpen={true}
                            onClose={() => setActiveModal(null)}
                            onConfirm={handleBadHabitConfirm}
                            attributes={attributes}
                        />
                    )}

                    {activeModal === 'RELAPSE' && relapsingHabit && (
                        <RelapseModal 
                            isOpen={true}
                            onClose={() => { setActiveModal(null); setRelapsingHabit(null); }}
                            habit={relapsingHabit}
                            onConfirm={(method) => {
                                handleBadHabitRelapse(relapsingHabit, method);
                                setActiveModal(null);
                                setRelapsingHabit(null);
                            }}
                            userGold={player.gold}
                        />
                    )}
                    
                    {/* Validation Modal */}
                    <ValidationModal 
                        habit={validationHabit} 
                        onClose={() => setValidationHabit(null)} 
                        attributes={attributes} 
                        valTempValue={valTempValue} 
                        setValTempValue={setValTempValue} 
                        setValidationHabit={setValidationHabit} 
                        onValidate={validateHabitProgress} 
                    />

                    {/* --- HABIT ACTIONS & CONFIRMATION --- */}
                    <HabitActionsModal 
                        habit={habitActionsHabit}
                        onClose={() => setHabitActionsHabit(null)}
                        onEdit={(h) => handleEditHabit(h)}
                        onArchive={handleArchiveHabit}
                        onDelete={handleDeleteHabitRequest}
                    />

                    <ConfirmationModal
                        isOpen={confirmationModal.isOpen}
                        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                        onConfirm={confirmationModal.onConfirm}
                        title={confirmationModal.title}
                        message={confirmationModal.message}
                        confirmText={confirmationModal.confirmText}
                        variant={confirmationModal.variant}
                    />

                </main>

                {/* --- SETTINGS OVERLAY --- */}
                <AnimatePresence>
                    {isSettingsOpen && (
                        <Suspense fallback={null}>
                            <SettingsView 
                                currentTheme={currentTheme}
                                onThemeToggle={(id) => setCurrentTheme(id as any)}
                                showProfile={showProfile}
                                onToggleProfile={setShowProfile}
                                onClose={() => setIsSettingsOpen(false)}
                                defaultChartMode={defaultChartMode}
                                onSetDefaultChartMode={setDefaultChartMode}
                                attributes={attributes}
                                onUpdateAttribute={updateAttributeMetadata}
                                onAddAttribute={addAttribute}
                                onRemoveAttribute={removeAttribute}
                                onShowPro={() => setActiveModal('PRO')}
                                isPro={user?.plan === 'PRO'}
                                dashboardStyle={dashboardStyle}
                                onDashboardStyleChange={updateDashboardStyle}
                                avatarShape={avatarShape}
                                onAvatarShapeChange={updateAvatarShape}
                                vividMode={vividMode}
                                onToggleVividMode={setVividMode}
                                habitSectionControl={habitSectionControl}
                                onUpdateHabitSectionControl={updateHabitSectionControl}
                                allowDockSectionSwitch={allowDockSectionSwitch}
                                onUpdateAllowDockSectionSwitch={updateAllowDockSectionSwitch}
                                stickyHud={stickyHud}
                                onUpdateStickyHud={updateStickyHud}
                            />
                        </Suspense>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
