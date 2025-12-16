import { useState, useEffect } from 'react';
import { ArrowUp, Target, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { PlayerHUD } from './modules/dashboard/PlayerHUD';
import { TaskList } from './modules/tasks/TaskList';
import { HabitList } from './modules/dashboard/HabitList';
import { FocusView } from './modules/focus/FocusView';
import { NotesView } from './modules/notes/NotesView';
import { AchievementsScreen } from './modules/achievements/AchievementsScreen';
import { StoreScreen } from './modules/store/StoreScreen';
import { InventoryScreen } from './modules/inventory/InventoryScreen';
import { SmartTaskWizard } from './modules/smart-tasks/SmartTaskWizard';
import { StrategicMapView } from './modules/smart-tasks/components/StrategicMapView';
import { SmartProject, StrategicNode } from './types/SmartGoal';
import { AchievementToast } from './components/AchievementToast';
import { AuroraBackground } from './components/AuroraBackground';
import { StatsHeader } from './modules/dashboard/components/StatsHeader';
import { Dock } from './modules/dashboard/components/Dock';
import { QuestModal } from './modules/dashboard/components/QuestModal';
import { HabitModal } from './modules/dashboard/components/HabitModal';
import { ProjectModal } from './modules/dashboard/components/ProjectModal';
import { ValidationModal } from './modules/dashboard/components/ValidationModal';
import { GlobalStyles } from './styles/GlobalStyles';
import { useDashboardLogic } from './modules/dashboard/hooks/useDashboardLogic';
import { SettingsView } from './modules/dashboard/SettingsView';
import { TutorialManager } from './components/Tutorial/TutorialManager';
import { Quest } from './types';
import { persistenceService } from './services/persistenceService';

import { ProUpgradeModal } from './modules/monetization/ProUpgradeModal';

// Helper to convert SmartProject nodes to Real Quests
const convertNodeToQuests = (node: StrategicNode, traitId: string): Quest[] => {
    const quests: Quest[] = [];
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Map level to difficulty
    const difficultyMap: Record<string, 'S'|'A'|'B'|'C'|'D'|'E'> = {
        'YEAR': 'S',
        'SEMESTER': 'A',
        'QUARTER': 'B',
        'MONTH': 'C',
        'WEEK': 'D',
        'DAY': 'E'
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

const pageTransition = {
    initial: { opacity: 0, y: 10, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, transition: { duration: 0 } }, // Salida INSTANTÁNEA (0ms)
    transition: { type: "spring" as const, stiffness: 1000, damping: 50, mass: 0.2 } // Entrada FLASH (Ultra rápida)
};

export default function Dashboard() {
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
        notes,
        journalEntries,
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
        handleHabitConfirm,
        handleProjectConfirm,
        handleUpdateProject,
        handleUpdateNote,
        handleDeleteNote,
        handleUpdateJournal,
        defaultChartMode,
        setDefaultChartMode,
        updateAttributeMetadata
    } = useDashboardLogic();

    const [smartProject, setSmartProject] = useState<SmartProject | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isProModalOpen, setIsProModalOpen] = useState(false);
    const [taskViewMode, setTaskViewMode] = useState<'LIST' | 'STRATEGY'>('LIST');

    // Load Active Strategy
    useEffect(() => {
        if (user?.uid) {
            persistenceService.smartProjects.getAll(user.uid).then(projects => {
                if (projects && projects.length > 0) {
                    // Load the most recent active project
                    // For now, just taking the first one found
                    setSmartProject(projects[0]);
                }
            }).catch(console.error);
        }
    }, [user?.uid]);

    const handleDeleteSmartProject = async () => {
        if (!smartProject || !user?.uid) return;
        try {
            // 1. Delete the Project itself
            await persistenceService.smartProjects.delete(user.uid, smartProject.id);
            
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
                persistenceService.quests.delete(user.uid, id).catch(e => console.warn(`Failed to delete quest ${id}`, e))
            ));

            // 4. Update State
            setSmartProject(null);
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
                     persistenceService.quests.delete(user.uid, id).catch(e => console.warn(`Failed to delete quest ${id}`, e))
                 ));
             }

             // 4. Update State
             setSmartProject(newProject);
             setQuests(prev => prev.filter(q => !deletedIds.includes(q.id)));

        } catch (error) {
            console.error("Failed to delete smart task node:", error);
            alert("Error al eliminar la tarea. Revisa la consola.");
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full text-slate-200 selection:bg-cyan-500/30 overflow-hidden">
            <GlobalStyles />
            <AuroraBackground overrideColor={overrideBgColor} />
            
            <ProUpgradeModal 
                isOpen={isProModalOpen}
                onClose={() => setIsProModalOpen(false)}
            />

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
                        return (
                            <div key={p.id} className="absolute flex items-center justify-center will-change-transform" style={{ left: p.x, top: p.y, color: p.color, animation: `jumpAndFall 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards` }}>
                                <Icon size={p.type === 'fire' ? 24 : 16} fill={p.type === 'fire' ? p.color : "currentColor"} className="drop-shadow-lg" />
                                <style>{`@keyframes jumpAndFall { 0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 1; } 15% { transform: translate3d(${p.vx * 0.5}px, ${p.vy}px, 0) scale(1.2); opacity: 1; } 100% { transform: translate3d(${p.vx * 1.5}px, 100vh, 0) scale(0.8); opacity: 0; } }`}</style>
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

                <main className={`relative z-10 max-w-md mx-auto min-h-screen p-6 pt-safe pb-40 flex flex-col ${showProfile ? 'gap-6' : 'gap-2'}`}>
                    <TutorialManager 
                        currentView={currentView} 
                        setCurrentView={setCurrentView}
                        activeModal={activeModal}
                        setActiveModal={setActiveModal}
                        isDockOpen={isDockOpen}
                        setIsDockOpen={setIsDockOpen}
                    />
                    <StatsHeader 
                        level={player.level} 
                        xp={player.xp} 
                        nextXp={player.nextXp} 
                        health={health}
                        streak={habits.reduce((acc, h) => acc + h.streak, 0)}
                        isHidden={isFocusMode || isNoteTaking}
                        showProfile={showProfile}
                        onShowStore={() => setCurrentView('STORE')}
                        onShowPro={() => setIsProModalOpen(true)}
                        onShowSettings={() => setCurrentView('SETTINGS')}
                        displayName={user?.displayName}
                        email={user?.email}
                    />

                    <div className="h-full flex-1 w-full relative">
                        <AnimatePresence mode="wait">
                            {currentView === 'TASKS' && (
                                <motion.div 
                                    key="TASKS"
                                    {...pageTransition}
                                    className="flex flex-col gap-6 h-full"
                                >
                                    {/* VIEW TOGGLE */}
                                    <div className="flex items-center justify-center gap-4 mb-2">
                                         <div className="flex p-1 rounded-full backdrop-blur-2xl bg-white/5 border border-white/10 shadow-lg">
                                             <button 
                                                 onClick={() => setTaskViewMode('LIST')}
                                                 className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${taskViewMode === 'LIST' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                             >
                                                 <ListTodo size={14} />
                                                 Tasks
                                             </button>
                                             <button 
                                                 onClick={() => setTaskViewMode('STRATEGY')}
                                                 data-tour="view-toggle-strategy"
                                                 className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${taskViewMode === 'STRATEGY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                             >
                                                 <Target size={14} />
                                                 Strategy
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
                                            />
                                        </>
                                    ) : (
                                        <div className="h-full flex-1 min-h-[500px] rounded-3xl overflow-hidden border border-white/5 relative">
                                             {smartProject ? (
                                                <StrategicMapView 
                                                    project={smartProject} 
                                                    onUpdateProject={(updated) => setSmartProject(updated)}
                                                    onDeleteProject={handleDeleteSmartProject}
                                                    onDeleteNode={handleDeleteSmartTaskNode}
                                                    onCreateNew={() => setIsWizardOpen(true)}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                                    <div className="w-20 h-20 rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/50 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]">
                                                        <ArrowUp className="w-10 h-10 text-indigo-400 rotate-45" />
                                                    </div>
                                                    <h2 className="text-3xl font-bold mb-4">No Active Strategy</h2>
                                                    <p className="text-white/60 mb-8 max-w-md">You haven't defined your Grand Strategy yet. Break down your ultimate goal into actionable steps.</p>
                                                    <button 
                                                        onClick={() => setIsWizardOpen(true)}
                                                        className="px-8 py-3 bg-indigo-600 rounded-full font-bold text-white shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)] hover:scale-105 transition-transform"
                                                    >
                                                        Initialize Protocol
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {currentView === 'SETTINGS' && (
                                <motion.div 
                                    key="SETTINGS"
                                    {...pageTransition}
                                    className="h-full pt-0 relative flex-1"
                                >
                                    <SettingsView 
                                        currentTheme={currentTheme}
                                        onThemeToggle={setCurrentTheme}
                                        showProfile={showProfile}
                                        onToggleProfile={setShowProfile}
                                        onClose={() => setCurrentView('TASKS')}
                                        defaultChartMode={defaultChartMode}
                                        onSetDefaultChartMode={setDefaultChartMode}
                                        attributes={attributes}
                                        onUpdateAttribute={updateAttributeMetadata}
                                    />
                                </motion.div>
                            )}

                            {currentView === 'HABITS' && (
                                <motion.div 
                                    key="HABITS"
                                    {...pageTransition}
                                >
                                    <HabitList 
                                        habits={habits} 
                                        attributes={attributes} 
                                        onCompleteHabit={handleHabitClick} 
                                    />
                                </motion.div>
                            )}

                            {currentView === 'FOCUS' && (
                                <motion.div 
                                    key="FOCUS"
                                    {...pageTransition}
                                    className="h-[calc(100vh-140px)] pt-4 relative flex-1"
                                >
                                    <FocusView 
                                        projects={projects} 
                                        attributes={attributes} 
                                        onCompleteSession={handleCompleteSession} 
                                        onOpenProjectModal={() => setActiveModal('PROJECT')} 
                                        setFocusMode={handleFocusModeChange} 
                                        onUpdateProject={handleUpdateProject}
                                        addNotification={addNotification}
                                    />
                                </motion.div>
                            )}

                            {/* --- NOTES SECTION --- */}
                            {currentView === 'NOTES' && (
                                <motion.div 
                                    key="NOTES"
                                    {...pageTransition}
                                    className="h-full pt-0 relative flex-1"
                                >
                                    <NotesView 
                                        notes={notes} 
                                        onUpdateNote={handleUpdateNote} 
                                        onDeleteNote={handleDeleteNote}
                                        journalEntries={journalEntries}
                                        onUpdateJournal={handleUpdateJournal}
                                        onInteractionStart={() => setIsNoteTaking(true)}
                                        onInteractionEnd={() => setIsNoteTaking(false)}
                                        projects={projects}
                                    />
                                </motion.div>
                            )}

                            {/* --- ACHIEVEMENTS SECTION --- */}
                            {currentView === 'ACHIEVEMENTS' && (
                                <motion.div 
                                    key="ACHIEVEMENTS"
                                    {...pageTransition}
                                    className="h-full pt-0 relative flex-1"
                                >
                                    <AchievementsScreen />
                                </motion.div>
                            )}

                            {/* --- STORE SECTION --- */}
                            {currentView === 'STORE' && (
                                <motion.div 
                                    key="STORE"
                                    {...pageTransition}
                                    className="h-full pt-0 relative flex-1"
                                >
                                    <StoreScreen />
                                </motion.div>
                            )}

                            {/* --- INVENTORY SECTION --- */}
                            {currentView === 'INVENTORY' && (
                                <motion.div 
                                    key="INVENTORY"
                                    {...pageTransition}
                                    className="h-full pt-0 relative flex-1"
                                >
                                    <InventoryScreen />
                                </motion.div>
                            )}
                        </AnimatePresence>

                            {/* --- STRATEGY SECTION --- */}
                        <AnimatePresence>
                            {isWizardOpen && (
                                <SmartTaskWizard 
                                    availableTraits={attributes}
                                    onComplete={(project) => {
                                        setSmartProject(project);
                                        const newQuests = convertNodeToQuests(project.rootNode, project.traitId || '');
                                        setQuests(prev => [...newQuests, ...prev]);
                                        
                                        // Save to Reality (Persistence)
                                        if (user?.uid) {
                                            // Save Quests
                                            newQuests.forEach(q => {
                                                persistenceService.quests.save(user.uid, q).catch(err => 
                                                    console.error("Failed to save smart quest:", err)
                                                );
                                            });
                                            
                                            // Save Strategic Map
                                            persistenceService.smartProjects.save(user.uid, project).catch(err => 
                                                console.error("Failed to save smart project:", err)
                                            );
                                        }

                                        setIsWizardOpen(false);
                                    }}
                                    onCancel={() => setIsWizardOpen(false)}
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <Dock currentView={currentView} onChangeView={setCurrentView} onOpenModal={setActiveModal} isOpen={isDockOpen} onToggle={setIsDockOpen} isHidden={isFocusMode || isNoteTaking} />
                    
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
                    <QuestModal isOpen={activeModal === 'QUEST'} onClose={() => setActiveModal(null)} attributes={attributes} onConfirm={handleQuestConfirm} />
                    <HabitModal isOpen={activeModal === 'HABIT'} onClose={() => setActiveModal(null)} attributes={attributes} onConfirm={handleHabitConfirm} />
                    <ProjectModal isOpen={activeModal === 'PROJECT'} onClose={() => setActiveModal(null)} attributes={attributes} onConfirm={handleProjectConfirm} />
                    
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
