import { useState, useEffect, lazy, Suspense } from 'react';
import { ArrowUp, Target, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toLocalISOString } from './utils/dateUtils';
import { PlayerHUD } from './modules/dashboard/PlayerHUD';
import { TaskList } from './modules/tasks/TaskList';
import { AchievementToast } from './components/AchievementToast';
import { AuroraBackground } from './components/AuroraBackground';
import { StatsHeader } from './modules/dashboard/components/StatsHeader';
import { Dock } from './modules/dashboard/components/Dock';
import { QuestModal } from './modules/dashboard/components/QuestModal';
import { HabitWizard } from './modules/dashboard/components/HabitWizard';
import { ProjectModal } from './modules/dashboard/components/ProjectModal';
import { ValidationModal } from './modules/dashboard/components/ValidationModal';
import { GlobalStyles } from './styles/GlobalStyles';
import { useDashboardLogic } from './modules/dashboard/hooks/useDashboardLogic';
import { Quest, Habit } from './types';
import { persistenceService } from './services/persistenceService';
import { StrategicNode } from './types/SmartGoal';
import { FREE_LIMITS } from './config/limits';

// Lazy Load Heavy Views
const HabitVisualView = lazy(() => import('./modules/dashboard/HabitVisualView').then(m => ({ default: m.HabitVisualView })));
const FocusView = lazy(() => import('./modules/focus/FocusView').then(m => ({ default: m.FocusView })));
const NotesView = lazy(() => import('./modules/notes/NotesView').then(m => ({ default: m.NotesView })));
const AchievementsScreen = lazy(() => import('./modules/achievements/AchievementsScreen').then(m => ({ default: m.AchievementsScreen })));
const StoreScreen = lazy(() => import('./modules/store/StoreScreen').then(m => ({ default: m.StoreScreen })));
const InventoryScreen = lazy(() => import('./modules/inventory/InventoryScreen').then(m => ({ default: m.InventoryScreen })));
const NexusView = lazy(() => import('./modules/nexus').then(m => ({ default: m.NexusView })));
const SmartTaskWizard = lazy(() => import('./modules/smart-tasks/SmartTaskWizard').then(m => ({ default: m.SmartTaskWizard })));
const StrategicMapView = lazy(() => import('./modules/smart-tasks/components/StrategicMapView').then(m => ({ default: m.StrategicMapView })));
const SettingsView = lazy(() => import('./modules/dashboard/SettingsView').then(m => ({ default: m.SettingsView })));
const ProUpgradeModal = lazy(() => import('./modules/monetization/ProUpgradeModal').then(m => ({ default: m.ProUpgradeModal })));

const SuspenseFallback = () => (
    <div className="flex items-center justify-center h-full w-full min-h-[200px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

// Helper to convert SmartProject nodes to Real Quests
const ViewContainer = ({ isActive, children, className = "" }: { isActive: boolean, children: React.ReactNode, className?: string }) => {
    return (
        <div 
            className={`${className} ${isActive ? 'z-10 relative opacity-100' : 'z-0 absolute inset-0 opacity-0 pointer-events-none overflow-hidden'}`}
            style={{ 
                visibility: isActive ? 'visible' : 'hidden',
                display: isActive ? 'block' : 'none' // Use display:none to completely remove from layout calculation when hidden, for perf
            }}
        >
            {children}
        </div>
    );
};

const convertNodeToQuests = (node: StrategicNode, traitId: string): Quest[] => {
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
    // 3. Skip intermediate levels for the daily task list to avoid clutter
    
    const isRoot = node.level === 'YEAR';
    const isDay = node.level === 'DAY';
    
    let shouldInclude = false;
    
    if (isRoot) {
        shouldInclude = true;
    } else if (isDay) {
        if (node.dueDate) {
            const date = node.dueDate.toDate();
            // Check if it's in the current week
            if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
                shouldInclude = true;
            }
        }
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
            isSmartQuest: true
        };
        quests.push(quest);
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            quests.push(...convertNodeToQuests(child, traitId));
        });
    }

    return quests;
};

export default function Dashboard() {
    const { t, i18n } = useTranslation();
    // ⚡ PERFORMANCE: Track loaded views to keep them alive (Cache)
    const [loadedViews, setLoadedViews] = useState<Set<string>>(new Set(['TASKS']));

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
        const prefetchTimer = setTimeout(() => {
            const prefetch = async () => {
                try {
                    await Promise.all([
                        import('./modules/dashboard/HabitVisualView'),
                        import('./modules/focus/FocusView'),
                        import('./modules/notes/NotesView'),
                        import('./modules/achievements/AchievementsScreen'),
                        import('./modules/store/StoreScreen'),
                        import('./modules/inventory/InventoryScreen'),
                        import('./modules/nexus'),
                        import('./modules/smart-tasks/components/StrategicMapView'),
                        import('./modules/dashboard/SettingsView')
                    ]);
                    // console.log("⚡ All views pre-fetched and cached in memory");
                } catch (e) {
                    console.warn("Prefetch failed", e);
                }
            };
            prefetch();
        }, 3000); // Wait 3s so initial load is prioritized

        return () => clearTimeout(prefetchTimer);
    }, []);

    const {
        user,
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
        overrideBgColor,
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
        validateHabitProgress,
        handleQuestConfirm,
        handleDeleteQuest,
        handleDeleteHabit,
        handleHabitConfirm,
        handleProjectConfirm,
        handleUpdateProject,
        defaultChartMode,
        setDefaultChartMode,
        updateAttributeMetadata,
        addAttribute,
        removeAttribute,
        dashboardStyle,
        updateDashboardStyle
    } = useDashboardLogic();

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

    const smartProject = smartProjects.length > 0 ? smartProjects[0] : null;
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const isProModalOpen = activeModal === 'PRO';
    const setIsProModalOpen = (open: boolean) => open ? setActiveModal('PRO') : setActiveModal(null);
    const [taskViewMode, setTaskViewMode] = useState<'LIST' | 'STRATEGY'>('LIST');
    const [smartTaskProps, setSmartTaskProps] = useState<{ lockedDate?: string, lockedAttributeId?: string } | null>(null);
    const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [focusTargetProjectId, setFocusTargetProjectId] = useState<string | null>(null);

    const handleFocusProject = (projectId: string) => {
        setFocusTargetProjectId(projectId);
        setCurrentView('FOCUS');
    };

    const handleOpenSmartTaskCreator = (date: Date) => {
        if (!smartProject) return;
        setEditingQuest(null);
        setSmartTaskProps({
            lockedDate: toLocalISOString(date),
            lockedAttributeId: smartProject.traitId
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

    const handleDeleteSmartProject = async () => {
        if (!smartProject || !user?.uid) return;
        try {
            // 1. Delete the Project itself
            await persistenceService.smartProjects.delete(user.uid, smartProject.id);
            
            // Update Local State
            setSmartProjects(prev => prev.filter(p => p.id !== smartProject.id));
            
            // 2. Collect all Node IDs to delete associated Quests
            const idsToDelete: string[] = [];
            const collectIds = (node: StrategicNode) => {
                idsToDelete.push(node.id);
                if (node.children) {
                    node.children.forEach(collectIds);
                }
            };
            collectIds(smartProject.rootNode);

            // 3. Delete all associated quests from Persistence
            // We run these in parallel for speed, but catching errors individually to ensure best effort
            await Promise.all(idsToDelete.map(id => 
        persistenceService.quests.delete(user.uid, id).catch((e: any) => console.warn(`Failed to delete quest ${id}`, e))
      ));

      // 4. Update State
      setSmartProjects([]);
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
        if (view === 'STRATEGY') {
            setCurrentView('TASKS');
            setTaskViewMode('STRATEGY');
        } else {
            setCurrentView(view);
            // Optional: If clicking "TASKS" explicitly, maybe we want to ensure we see the list?
            if (view === 'TASKS') {
                setTaskViewMode('LIST');
            }
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full text-slate-200 selection:bg-cyan-500/30 overflow-hidden">
            <GlobalStyles />
            <AuroraBackground overrideColor={overrideBgColor} currentTheme={currentTheme} />
            
            <Suspense fallback={null}>
                <ProUpgradeModal 
                    isOpen={isProModalOpen}
                    onClose={() => setIsProModalOpen(false)}
                />
            </Suspense>

            {/* SCROLLABLE CONTENT LAYER */}
            <div className="absolute inset-0 z-10 w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth">
                <AchievementToast 
                    achievement={lastAchievement} 
                    onClose={() => setLastAchievement(null)} 
                />

                {/* FX LAYER */}
                <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
                    {particles.map(p => {
                        const Icon = p.icon;
                        const tx = p.tx !== undefined ? p.tx - p.x : 0;
                        const ty = p.ty !== undefined ? p.ty - p.y : 0;
                        const isTargeted = p.tx !== undefined;
                        
                        return (
                            <div key={p.id} className="absolute flex items-center justify-center will-change-transform" style={{ left: p.x, top: p.y, color: p.color, animation: isTargeted ? `flyToProfile 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` : `jumpAndFall 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards` }}>
                                <Icon size={p.type === 'fire' ? 24 : 16} fill={p.type === 'fire' ? p.color : "currentColor"} className="drop-shadow-lg" />
                                <style>{`
                                    @keyframes jumpAndFall { 
                                        0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 1; } 
                                        15% { transform: translate3d(${p.vx * 0.5}px, ${p.vy}px, 0) scale(1.2); opacity: 1; } 
                                        100% { transform: translate3d(${p.vx * 1.5}px, 100vh, 0) scale(0.8); opacity: 0; } 
                                    }
                                    @keyframes flyToProfile {
                                        0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 1; }
                                        20% { transform: translate3d(0, -20px, 0) scale(1.5); opacity: 1; }
                                        100% { transform: translate3d(${tx}px, ${ty}px, 0) scale(0.5); opacity: 0; }
                                    }
                                `}</style>
                            </div>
                        )
                    })}
                </div>

                {/* NOTIFICATIONS */}
                <div className="fixed top-4 left-0 right-0 z-[120] flex flex-col items-center gap-2 pointer-events-none px-4">
                    <AnimatePresence>
                        {notifications.map(n => {
                            const NotifIcon = n.icon;
                            return (
                                <motion.div 
                                    key={n.id}
                                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    className="backdrop-blur-md border border-yellow-500/50 bg-yellow-950/40 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5" style={{ color: n.color }}><NotifIcon size={16} /></div>
                                    <div className="flex-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{n.label} LEVEL UP</p><div className="flex items-center gap-2 text-sm font-black text-white"><span>{n.fromLevel}</span><ArrowUp size={12} className="text-green-400" /><span style={{ color: n.color }}>{n.toLevel}</span></div></div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>

                <main className={`relative z-10 max-w-md mx-auto min-h-screen pt-safe pb-40 flex flex-col ${currentView === 'FOCUS' ? 'px-0 gap-0' : `px-4 sm:px-6 ${showProfile ? 'gap-6' : 'gap-2'}`}`}>
                    {currentView !== 'FOCUS' && !isWizardOpen && (
                        <StatsHeader 
                            level={player.level} 
                            xp={player.xp} 
                            nextXp={player.nextXp} 
                            health={health}
                            streak={habits.reduce((acc, h) => acc + h.streak, 0)}
                            isHidden={false}
                            showProfile={showProfile}
                            onShowStore={() => setCurrentView(prev => prev === 'STORE' ? 'TASKS' : 'STORE')}
                            onShowPro={() => setIsProModalOpen(true)}
                            onShowSettings={() => setCurrentView(prev => prev === 'SETTINGS' ? 'TASKS' : 'SETTINGS')}
                            onToggleProfile={() => setCurrentView(prev => prev === 'SETTINGS' ? 'TASKS' : 'SETTINGS')}
                            displayName={user?.displayName}
                            email={user?.email}
                        />
                    )}

                    <div className="h-full flex-1 w-full relative z-0">
                        {/* ⚡ TASKS VIEW (Always loaded initially) */}
                        <ViewContainer isActive={currentView === 'TASKS'} className="h-full">
                            <div className="flex flex-col gap-6 h-full">
                                {/* VIEW TOGGLE */}
                                <div className="flex items-center justify-center gap-4 mb-1 -mt-2">
                                     <div className="flex p-1 rounded-full backdrop-blur-2xl bg-white/5 border border-white/10 shadow-lg">
                                         <button 
                                            onClick={() => setTaskViewMode('LIST')}
                                            className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${taskViewMode === 'LIST' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <ListTodo size={14} />
                                            {t('dashboard.tasks')}
                                        </button>
                                        <button 
                                            onClick={() => setTaskViewMode('STRATEGY')}
                                            className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${taskViewMode === 'STRATEGY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Target size={14} />
                                            {t('dashboard.strategy')}
                                        </button>
                                     </div>
                                </div>

                                {taskViewMode === 'LIST' ? (
                                    <>
                                        {/* 💎 STATUS HUD - THE MIRROR */}
                                        {showProfile && (
                                            <div className="relative z-20 -mx-2">
                                                <PlayerHUD 
                                                    attributes={attributes}
                                                    defaultChartMode={defaultChartMode}
                                                />
                                            </div>
                                        )}

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
                                                />
                                            </Suspense>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                                <div className="w-20 h-20 rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/50 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]">
                                                    <ArrowUp className="w-10 h-10 text-indigo-400 rotate-45" />
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
                                                    className="px-8 py-3 bg-indigo-600 rounded-full font-bold text-white shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)] hover:scale-105 transition-transform"
                                                >
                                                    Initialize Protocol
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ViewContainer>

                        {/* SETTINGS */}
                        {(loadedViews.has('SETTINGS') || currentView === 'SETTINGS') && (
                            <ViewContainer isActive={currentView === 'SETTINGS'} className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <SettingsView 
                                        currentTheme={currentTheme}
                                        onThemeToggle={(id) => setCurrentTheme(id as any)}
                                        showProfile={showProfile}
                                        onToggleProfile={setShowProfile}
                                        onClose={() => setCurrentView('TASKS')}
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
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* HABITS */}
                        {(loadedViews.has('HABITS') || currentView === 'HABITS') && (
                            <ViewContainer isActive={currentView === 'HABITS'}>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <HabitVisualView 
                            habits={habits} 
                            attributes={attributes} 
                            onCompleteHabit={handleHabitClick}
                            onCreateHabit={() => setActiveModal('HABIT')}
                            onDeleteHabit={handleDeleteHabit}
                            onEditHabit={handleEditHabit}
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
                                        onBack={() => {
                                            setFocusTargetProjectId(null);
                                            setCurrentView('TASKS');
                                        }}
                                        userStats={{
                                            ...(user?.stats || {}),
                                            streak: habits.reduce((acc, h) => acc + h.streak, 0),
                                            displayName: user?.displayName,
                                            email: user?.email
                                        }}
                                        onToggleProfile={() => setCurrentView(prev => prev === 'SETTINGS' ? 'TASKS' : 'SETTINGS')}
                                        onShowSettings={() => setCurrentView(prev => prev === 'SETTINGS' ? 'TASKS' : 'SETTINGS')}
                                        onShowStore={() => setCurrentView(prev => prev === 'STORE' ? 'TASKS' : 'STORE')}
                                        onShowPro={() => setActiveModal('PRO')}
                                        isPro={user?.plan === 'PRO'}
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* NOTES */}
                        {(loadedViews.has('NOTES') || currentView === 'NOTES') && (
                            <ViewContainer isActive={currentView === 'NOTES'} className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <NotesView 
                                        onInteractionStart={() => setIsNoteTaking(true)}
                                        onInteractionEnd={() => setIsNoteTaking(false)}
                                        projects={projects}
                                        onShowPro={() => setActiveModal('PRO')}
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* ACHIEVEMENTS */}
                        {(loadedViews.has('ACHIEVEMENTS') || currentView === 'ACHIEVEMENTS') && (
                            <ViewContainer isActive={currentView === 'ACHIEVEMENTS'} className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <AchievementsScreen />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* STORE */}
                        {(loadedViews.has('STORE') || currentView === 'STORE') && (
                            <ViewContainer isActive={currentView === 'STORE'} className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <StoreScreen onNavigate={(view) => setCurrentView(view)} />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* INVENTORY */}
                        {(loadedViews.has('INVENTORY') || currentView === 'INVENTORY') && (
                            <ViewContainer isActive={currentView === 'INVENTORY'} className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <InventoryScreen />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* NEXUS */}
                        {(loadedViews.has('NEXUS') || currentView === 'NEXUS') && (
                            <ViewContainer isActive={currentView === 'NEXUS'} className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <NexusView />
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
                                            let newQuests = convertNodeToQuests(project.rootNode, project.traitId || '');
                                            
                                            // LIMIT CHECK: Enforce max active tasks
                                            if (user?.plan !== 'PRO') {
                                                const currentActive = quests.filter(q => !q.completed).length;
                                                const remainingSlots = Math.max(0, FREE_LIMITS.ACTIVE_TASKS - currentActive);
                                                
                                                if (newQuests.length > remainingSlots) {
                                                newQuests = newQuests.slice(0, remainingSlots);
                                                setActiveModal('PRO'); // Show upgrade prompt
                                            }
                                        }

                                        setSmartProjects([project]);
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
                        isHidden={isFocusMode || isNoteTaking || isWizardOpen}
                        dashboardStyle={dashboardStyle}
                    />
                    
                    {/* --- GLOBAL BLUR BACKDROP (APPLE INTELLIGENCE MODE) --- */}
                    <AnimatePresence>
                        {(activeModal || validationHabit || isDockOpen) && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-2xl saturate-150"
                                onClick={() => { setActiveModal(null); setValidationHabit(null); setIsDockOpen(false); }} 
                            />
                        )}
                    </AnimatePresence>

                    {/* MODALS */}
                    <QuestModal 
                        isOpen={activeModal === 'QUEST'} 
                        onClose={handleQuestModalClose} 
                        attributes={attributes} 
                        projects={projects}
                        onConfirm={handleQuestConfirm}
                        lockedAttributeId={smartTaskProps?.lockedAttributeId}
                        lockedDate={smartTaskProps?.lockedDate}
                        isSmartTask={!!smartTaskProps}
                        initialValues={editingQuest || undefined}
                    />
                    <HabitWizard 
                        isOpen={activeModal === 'HABIT'} 
                        onClose={() => { setActiveModal(null); setEditingHabit(null); }} 
                        attributes={attributes} 
                        smartProjects={smartProjects}
                        onConfirm={handleHabitConfirm}
                        initialData={editingHabit || undefined}
                    />
                    <ProjectModal 
                        isOpen={activeModal === 'PROJECT'} 
                        onClose={() => setActiveModal(null)} 
                        attributes={attributes} 
                        smartProjects={smartProjects}
                        onConfirm={handleProjectConfirm} 
                    />
                    
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

                </main>
            </div>
        </div>
    );
}
