import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerHUD } from './modules/dashboard/PlayerHUD';
import { TaskList } from './modules/tasks/TaskList';
import { HabitList } from './modules/dashboard/HabitList';
import { FocusView } from './modules/focus/FocusView';
import { NotesView } from './modules/notes/NotesView';
import { AchievementsScreen } from './modules/achievements/AchievementsScreen';
import { StoreScreen } from './modules/store/StoreScreen';
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

const pageTransition = {
    initial: { opacity: 0, y: 10, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, transition: { duration: 0 } }, // Salida INSTANTÁNEA (0ms)
    transition: { type: "spring" as const, stiffness: 1000, damping: 50, mass: 0.2 } // Entrada FLASH (Ultra rápida)
};

export default function Dashboard() {
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
        overrideBgColor,
        showProfile,
        setShowProfile,
        player,
        health,
        attributes,
        quests,
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
        handleHabitConfirm,
        handleProjectConfirm,
        handleUpdateProject,
        handleUpdateNote,
        handleDeleteNote,
        handleUpdateJournal
    } = useDashboardLogic();

    console.log('DASHBOARD: Matrix User:', user ? user.uid : 'null', 'Loading:', matrixLoading);

    return (
        <div className="fixed inset-0 w-full h-full text-slate-200 selection:bg-cyan-500/30 overflow-hidden">
            <GlobalStyles />
            <AuroraBackground overrideColor={overrideBgColor} />

            {/* SCROLLABLE CONTENT LAYER */}
            <div className="absolute inset-0 z-10 w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth">
                <AchievementToast 
                    achievement={lastAchievement} 
                    onClose={() => setLastAchievement(null)} 
                />

                {/* FX LAYER - Moved inside scroll container but fixed? No, FX should be static. 
                    If we put particles here with position:fixed/absolute relative to this container?
                    Actually, particles use fixed position in the code below.
                */}
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
                    <StatsHeader 
                        level={player.level} 
                        xp={player.xp} 
                        nextXp={player.nextXp} 
                        health={health}
                        streak={habits.reduce((acc, h) => acc + h.streak, 0)}
                        theme={currentTheme} 
                        onThemeToggle={setCurrentTheme} 
                        isHidden={isFocusMode || isNoteTaking}
                        showProfile={showProfile}
                        onToggleProfile={setShowProfile}
                        onShowStore={() => setCurrentView('STORE')}
                    />

                    <div className="h-full flex-1 w-full relative">
                        <AnimatePresence mode="wait">
                            {currentView === 'TASKS' && (
                                <motion.div 
                                    key="TASKS"
                                    {...pageTransition}
                                    className="flex flex-col gap-6"
                                >
                                    {/* 💎 STATUS HUD - THE MIRROR */}
                                    {showProfile && (
                                        <div className="relative z-20 -mx-2">
                                            <PlayerHUD 
                                                attributes={attributes}
                                            />
                                        </div>
                                    )}

                                    {/* ACTIVE MISSIONS */}
                                    <TaskList 
                                        quests={quests} 
                                        attributes={attributes} 
                                        onCompleteQuest={completeQuest} 
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
