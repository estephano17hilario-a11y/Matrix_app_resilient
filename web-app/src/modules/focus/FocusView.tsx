import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, Lock, Pause, Play, StopCircle, Volume2, Plus, Target, Star, MoreVertical, Archive, Trash2, AlertTriangle, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Attribute } from '../../types';
import { FocusStats } from './components/FocusStats';
import { StatsHeader } from '../dashboard/components/StatsHeader';
import { SessionHistoryModal } from './components/SessionHistoryModal';

export const FocusView = React.memo(({ projects, attributes, onCompleteSession, onOpenProjectModal, setFocusMode, onUpdateProject, addNotification, initialProjectId, onBack, userStats, onToggleProfile, onShowSettings, onShowStore, onShowPro }: { 
    projects: Project[], 
    attributes: Attribute[], 
    onCompleteSession: (id: string | null, duration: number, type: 'POMO' | 'STOPWATCH') => void, 
    onOpenProjectModal: () => void, 
    setFocusMode: (attrId: string | null) => void, 
    onUpdateProject: (p: Project) => void,
    addNotification: (n: any) => void,
    initialProjectId?: string | null,
    onBack?: () => void,
    userStats?: any,
    onToggleProfile?: () => void,
    onShowSettings?: () => void,
    onShowStore?: () => void,
    onShowPro?: () => void
}) => {
    const [viewState, setViewState] = useState<'LIST' | 'TIMER'>('LIST');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [mode, setMode] = useState<'POMO' | 'STOPWATCH'>('POMO');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [totalDuration, setTotalDuration] = useState(25 * 60);
    const [shakeMode, setShakeMode] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    
    // Robust Timer Ref
    const lastTickRef = React.useRef<number>(Date.now());

    const selectedProject = useMemo(() => 
        projects.find(p => p.id === selectedProjectId), 
    [projects, selectedProjectId]);
    const activeAttr = useMemo(() => attributes.find((a) => a.id === selectedProject?.attribute), [selectedProject, attributes]);
    const themeColor = activeAttr?.color || '#3b82f6';
    const ActiveIcon = activeAttr?.icon || Target;

    const handleArchiveProject = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        onUpdateProject({ ...project, archived: true });
        setActiveMenuId(null);
        addNotification({ type: 'SYSTEM', label: 'PROJECT ARCHIVED', icon: Archive, color: '#f59e0b' });
    };

    const handleUnarchive = (project: Project) => {
        onUpdateProject({ ...project, archived: false });
        addNotification({ type: 'SYSTEM', label: 'PROJECT RESTORED', icon: RotateCcw, color: '#10b981' });
    };

    const confirmDelete = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setProjectToDelete(project);
        setActiveMenuId(null);
    };

    const handleDeleteProject = () => {
        if (projectToDelete) {
            onUpdateProject({ ...projectToDelete, deleted: true });
            setProjectToDelete(null);
            addNotification({ type: 'SYSTEM', label: 'PROJECT DELETED', icon: Trash2, color: '#ef4444' });
        }
    };

    const startSession = (projectId: string) => {
        const project = projects.find((p) => p.id === projectId);
        setSelectedProjectId(projectId);
        const duration = project ? project.pomoDuration * 60 : 25 * 60;
        setTimeLeft(duration);
        setTotalDuration(duration);
        setFocusMode(project?.attribute || null);
        setViewState('TIMER');
        setTimeout(() => { setIsActive(true); setIsPaused(false); }, 500);
    };

    useEffect(() => {
        if (initialProjectId) {
            // startSession(initialProjectId); // Don't auto-start
            const project = projects.find((p) => p.id === initialProjectId);
            if(project) {
                 setSelectedProjectId(initialProjectId);
                 const duration = project.pomoDuration * 60;
                 setTimeLeft(duration);
                 setTotalDuration(duration);
                 // setFocusMode(project.attribute); // Don't switch mode immediately? User might just want to see it selected
                 // Actually, if they clicked "Focus" on a specific project, maybe they DO want to start?
                 // User said: "CUANDO ENTRO A LA SECCION ME PONE DE FRENTE ADENTRO DE UN POMODORO. ARREGLA ESO"
                 // So we should probably just select it but stay in LIST view, or maybe not even select it?
                 // Let's just NOT start the session.
            }
        }
    }, [initialProjectId, projects]);

    const stopSession = () => {
        setIsActive(false); setIsPaused(false); setViewState('LIST');
        setFocusMode(null); setSelectedProjectId(null);
    };

    const handleFinishSession = async () => {
        setIsActive(false);
        setIsPaused(false);
        setIsCompleting(true);

        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

        // Animation delay (Faster)
        await new Promise(resolve => setTimeout(resolve, 600));

        let finalDuration = 0;
        if (mode === 'POMO') {
            // Elapsed time for Pomo
            finalDuration = totalDuration - timeLeft;
        } else {
            // Elapsed time for Stopwatch
            finalDuration = timeLeft; 
        }

        // Only save if meaningful duration (> 10 seconds? or just save all as requested)
        // User asked for "exact progress", so we save it.
        onCompleteSession(selectedProjectId, finalDuration, mode);
        setIsCompleting(false);
        setShowHistory(true);
        
        // Reset Timer
        const duration = selectedProject ? selectedProject.pomoDuration * 60 : 25 * 60;
        setTimeLeft(mode === 'POMO' ? duration : 0);
        if(mode === 'POMO') setTotalDuration(duration);
        else setTotalDuration(0);
    };

    const resetTimer = () => {
        // Now acts as Stop & Save
        if (isActive || isPaused || (mode === 'STOPWATCH' && timeLeft > 0) || (mode === 'POMO' && timeLeft < totalDuration)) {
            handleFinishSession();
        } else {
            // If nothing happened, just reset visually
            setIsActive(false); setIsPaused(false);
            const duration = selectedProject ? selectedProject.pomoDuration * 60 : 25 * 60;
            setTimeLeft(mode === 'POMO' ? duration : 0);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleModeSwitch = (newMode: 'POMO' | 'STOPWATCH') => {
        if (isActive) {
            if (navigator.vibrate) navigator.vibrate(50);
            setShakeMode(true);
            setTimeout(() => setShakeMode(false), 500);
            addNotification({ type: 'SYSTEM', label: 'ACTIVE SESSION', fromLevel: 'Finish', toLevel: 'First', icon: Lock, color: '#ef4444' });
            return;
        }
        if (newMode === mode) return;
        setMode(newMode);
        if (newMode === 'POMO') {
            const duration = selectedProject ? selectedProject.pomoDuration * 60 : 25 * 60;
            setTimeLeft(duration);
            setTotalDuration(duration);
        } else {
            setTimeLeft(0);
            setTotalDuration(0);
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isActive && !isPaused && !isCompleting) {
            lastTickRef.current = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                const delta = Math.floor((now - lastTickRef.current) / 1000);
                
                if (delta >= 1) {
                    setTimeLeft((prev) => {
                        if (mode === 'POMO') {
                            const newValue = prev - delta;
                            if (newValue <= 0) {
                                clearInterval(interval);
                                // Defer state update to avoid conflicts in render cycle
                                setTimeout(() => handleFinishSession(), 0);
                                return 0;
                            }
                            return newValue;
                        } else { 
                            // Stopwatch
                            return prev + delta; 
                        }
                    });
                    lastTickRef.current = now;
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused, mode, selectedProjectId, totalDuration, onCompleteSession, isCompleting]);

    const toggleTimer = () => {
        if (!isActive) { setIsActive(true); setIsPaused(false); if(navigator.vibrate) navigator.vibrate(20); }
        else { setIsPaused(!isPaused); if(navigator.vibrate) navigator.vibrate(10); }
    };

    const radius = 130; 
    const circumference = 2 * Math.PI * radius;
    const progress = mode === 'POMO' ? (timeLeft / totalDuration) : 1; 
    const dashOffset = circumference * (1 - progress);

    return (
        <div className="relative w-full h-full font-sans flex flex-col">
            <style>{`
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
            
            {/* Ambient Noise */}
            {/* <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} /> */}

            <AnimatePresence>
                {isCompleting && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", damping: 15, stiffness: 400 }}
                            className="relative flex flex-col items-center gap-4"
                        >
                            <ActiveIcon size={50} style={{ color: themeColor }} className="filter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" />
                        </motion.div>
                    </motion.div>
                )}
                {projectToDelete && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setProjectToDelete(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-[#121212] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setProjectToDelete(null)}><X size={20} className="text-white" /></div>
                            
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                                    <AlertTriangle size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Delete Project?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Are you sure you want to delete <span className="text-white font-bold">"{projectToDelete.title}"</span>? 
                                    <br/><br/>
                                    <span className="text-xs text-slate-500">Stats will be preserved in general view, but you won't be able to filter by this project anymore.</span>
                                </p>
                                
                                <div className="flex gap-3 w-full mt-2">
                                    <button onClick={() => setProjectToDelete(null)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-colors">Cancel</button>
                                    <button onClick={handleDeleteProject} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-red-500/20">Delete</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                
                {/* Archived Projects Modal - Portal to escape parent transforms */}
                {createPortal(
                    <AnimatePresence>
                        {showArchived && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col font-sans"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 pt-16 pb-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-20 shadow-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                            <Archive size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white tracking-wide uppercase">Archived</h2>
                                            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Restorable Projects</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowArchived(false)} 
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 border border-white/5"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* List */}
                                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3 content-start pb-32 bg-gradient-to-b from-[#050505] to-[#0a0a0a]">
                                    {projects.filter(p => p.archived && !p.deleted).map(p => {
                                        const attr = attributes.find(a => a.id === p.attribute);
                                        const Icon = attr?.icon || Target;
                                        return (
                                            <motion.div 
                                                layoutId={p.id}
                                                key={p.id} 
                                                className="bg-[#121212]/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center text-slate-400 border border-white/5 group-hover:text-white transition-colors">
                                                        <Icon size={20} style={{ color: attr?.color }} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-bold text-lg leading-tight">{p.title}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 uppercase tracking-wider">{attr?.label || 'General'}</span>
                                                            <span className="text-slate-500 text-xs font-mono">{Math.floor(p.totalTime / 60)}h {p.totalTime % 60}m</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleUnarchive(p)} 
                                                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                                >
                                                    <RotateCcw size={14} /> Restore
                                                </button>
                                            </motion.div>
                                        )
                                    })}
                                    {projects.filter(p => p.archived && !p.deleted).length === 0 && (
                                        <div className="flex flex-col items-center justify-center pt-32 text-slate-500 gap-4 opacity-50">
                                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                                <Archive size={40} strokeWidth={1.5} />
                                            </div>
                                            <p className="text-sm font-medium uppercase tracking-widest">No archived projects</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </AnimatePresence>

            {/* --- LIST VIEW --- */}
            <div className={`flex flex-col w-full h-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${viewState === 'LIST' ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 scale-95 pointer-events-none -translate-y-4'}`}>
                
                {/* Scrollable Content */}
                <div className="w-full flex-1 overflow-y-auto pb-32">
                    
                    {/* Integrated Stats Header that scrolls with content */}
                    {userStats && (
                        <div className="mb-4">
                             <StatsHeader 
                                level={userStats.level}
                                xp={userStats.xp}
                                nextXp={userStats.nextXp}
                                health={userStats.health}
                                streak={userStats.streak}
                                isHidden={false}
                                showProfile={true}
                                onShowStore={onShowStore || (() => {})}
                                onShowPro={onShowPro}
                                onShowSettings={onShowSettings}
                                onToggleProfile={onToggleProfile}
                                displayName={userStats.displayName}
                                email={userStats.email}
                            />
                        </div>
                    )}

                    {/* Header - Now Scrollable */}
                    <div className="flex justify-between items-center pt-2 pb-6 flex-shrink-0 z-20">
                        <button 
                            onClick={onBack} 
                            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors active:scale-95"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-[20px] font-black text-white tracking-widest uppercase drop-shadow-lg font-sf-display">FOCUS ESTUDIO</h2>
                        <button onClick={() => setShowArchived(true)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5">
                            <Archive size={16} />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="relative z-10 mb-4">
                        <FocusStats projects={projects} attributes={attributes} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 px-4 content-start relative z-10">
                    {projects.filter(p => !p.deleted && !p.archived).map((project) => {
                        const attr = attributes.find((a) => a.id === project.attribute);
                        
                        // Calculate Progress (Daily vs Lifetime)
                        const isDaily = project.goalFrequency === 'DAILY';
                        let relevantTime = project.totalTime;
                        if (isDaily && project.sessions) {
                            relevantTime = project.sessions.filter(s => {
                                const sessionDate = new Date(s.date);
                                const today = new Date();
                                return sessionDate.getDate() === today.getDate() && 
                                       sessionDate.getMonth() === today.getMonth() && 
                                       sessionDate.getFullYear() === today.getFullYear();
                            }).reduce((acc, s) => acc + s.duration, 0);
                        }
                        
                        const progressVal = Math.min(100, (relevantTime / (project.goalTarget * 60)) * 100);
                        const Icon = attr?.icon || Star;
                        return (
                            <div key={project.id} style={{ zIndex: activeMenuId === project.id ? 50 : 0 }} className="relative group rounded-[2rem] p-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 overflow-visible transition-all duration-300 hover:scale-[1.02] active:scale-95 flex flex-col justify-between h-52 shadow-2xl hover:shadow-white/5" onClick={() => setActiveMenuId(null)}>
                                <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                                <div className="z-10 flex justify-between items-start relative">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner bg-black/20"><Icon size={18} style={{ color: attr?.color }} /></div>
                                    <div className="flex items-center gap-1">
                                        <div className="bg-black/40 px-2 py-1 rounded-full border border-white/5 backdrop-blur-md"><span className="text-[10px] font-mono text-slate-300 font-bold">{project.pomoDuration}m</span></div>
                                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === project.id ? null : project.id); }} className="w-8 h-8 rounded-full bg-black/20 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5 cursor-pointer z-50"><MoreVertical size={14} /></button>
                                    </div>
                                    
                                    <AnimatePresence>
                                        {activeMenuId === project.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                                className="absolute top-10 right-0 z-[100] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[120px]"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <button onClick={(e) => handleArchiveProject(e, project)} className="w-full text-left px-4 py-3 hover:bg-white/5 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-colors cursor-pointer relative z-[101]">
                                                    <Archive size={14} /> Archive
                                                </button>
                                                <button onClick={(e) => confirmDelete(e, project)} className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors border-t border-white/5 cursor-pointer relative z-[101]">
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="z-10 mt-2">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-3 tracking-tight line-clamp-2">{project.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progressVal}%`, backgroundColor: attr?.color, boxShadow: `0 0 10px ${attr?.color}40` }} />
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => startSession(project.id)} 
                                    className="z-10 w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all mt-auto flex items-center justify-center gap-2 shadow-lg active:scale-95 transform backdrop-blur-md border border-white/10 hover:border-white/30"
                                    style={{ 
                                        backgroundColor: `${attr?.color}20`, 
                                        color: 'white',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                        boxShadow: `0 4px 15px ${attr?.color}20`
                                    }}
                                >
                                    Start Flow
                                </button>
                            </div>
                        )
                    })}
                    <button onClick={onOpenProjectModal} className="rounded-[2rem] p-5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all h-52 group active:scale-95">
                        <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors"><Plus size={24} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">New Flow</span>
                    </button>
                </div>
            </div>
            </div>

            {/* --- TIMER VIEW --- */}
            <div className={`fixed inset-0 flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${viewState === 'TIMER' ? `opacity-100 z-[100] delay-100 scale-100 ${isActive ? 'bg-[#0a0a0a]' : 'bg-[#0a0a0a]/20 backdrop-blur-xl'}` : 'opacity-0 scale-110 pointer-events-none'}`}>
                
                {/* Header Actions (Minimize/Close) */}
                <div className="w-full flex justify-between items-center px-6 pt-12 z-30">
                    <button onClick={stopSession} className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white/70 hover:text-white border border-white/10 transition-all active:scale-90 shadow-lg"><ChevronDown size={22} /></button>
                    
                    {/* Mode Switcher (Timer) */}
                    <div className={`flex flex-col items-center gap-2 ${shakeMode ? 'animate-shake' : ''}`}>
                        <div className="bg-black/30 backdrop-blur-2xl p-1 rounded-full border border-white/10 flex gap-1 shadow-2xl relative">
                            {/* Blocker */}
                            {isActive && <div className="absolute inset-0 z-50 cursor-not-allowed" onClick={() => { if(navigator.vibrate) navigator.vibrate(50); setShakeMode(true); setTimeout(()=>setShakeMode(false), 500); }} />}
                            
                            <button onClick={() => handleModeSwitch('POMO')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${mode === 'POMO' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Pomo</button>
                            <button onClick={() => handleModeSwitch('STOPWATCH')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${mode === 'STOPWATCH' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Stopwatch</button>
                        </div>
                    </div>
                    
                    <div className="w-11" /> {/* Spacer */}
                </div>

                {/* Timer Display */}
                <div className="flex-1 flex items-center justify-center w-full relative -mt-10">
                     <div className="relative w-[320px] h-[320px] flex items-center justify-center">
                        {/* Ambient Glow */}
                        <div className={`absolute inset-0 rounded-full blur-[90px] transition-opacity duration-1000 ${isActive ? 'opacity-30' : 'opacity-0'}`} style={{ backgroundColor: themeColor }} />
                        
                        <svg className="absolute w-full h-full rotate-[-90deg] overflow-visible">
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={themeColor} stopOpacity="1" />
                                    <stop offset="100%" stopColor={themeColor} stopOpacity="0.5" />
                                </linearGradient>
                            </defs>
                            {/* Track */}
                            <circle cx="160" cy="160" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
                            {/* Progress */}
                            <circle 
                                cx="160" cy="160" r={radius} fill="none" 
                                stroke="url(#gradient)" 
                                strokeWidth="6" 
                                strokeLinecap="round" 
                                strokeDasharray={circumference} 
                                strokeDashoffset={dashOffset} 
                                className="transition-all duration-1000 ease-linear"
                                style={{ filter: `drop-shadow(0 0 15px ${themeColor}50)` }}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <span className="text-[86px] font-black text-white tabular-nums tracking-[-0.05em] leading-none filter drop-shadow-2xl select-none font-sf-display scale-y-105">
                                {formatTime(timeLeft)}
                            </span>
                            <button onClick={() => selectedProject && setShowHistory(true)} className="flex items-center gap-2 mt-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all">
                                <ActiveIcon size={12} style={{ color: themeColor }} className={isActive ? "animate-pulse" : ""} />
                                <span className="text-[10px] font-bold text-white tracking-widest uppercase">{selectedProject?.title || (mode === 'STOPWATCH' ? 'Free Flow' : 'Focus')}</span>
                                {selectedProject && selectedProject.sessions && selectedProject.sessions.length > 0 && (
                                    <div className="ml-2 flex items-center gap-1 animate-in fade-in zoom-in">
                                        <div className="w-[1px] h-3 bg-white/20" />
                                        <span className="text-[10px] font-mono font-bold text-slate-300 ml-1">{selectedProject.sessions.length}</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-8 pb-32">
                    <button onClick={resetTimer} className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 flex items-center justify-center transition-all active:scale-90 backdrop-blur-md group shadow-lg">
                        <StopCircle size={24} className="group-hover:text-red-400 transition-colors" />
                    </button>
                    
                    <button onClick={toggleTimer} className="w-24 h-24 rounded-[3rem] bg-white text-black flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all z-20">
                        {isActive && !isPaused ? <Pause size={38} fill="currentColor" /> : <Play size={38} fill="currentColor" className="ml-2" />}
                    </button>
                    
                    <button className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 flex items-center justify-center transition-all active:scale-90 backdrop-blur-md shadow-lg">
                        <Volume2 size={24} />
                    </button>
                </div>
            </div>

            {/* Session History Modal */}
            {selectedProject && (
                <SessionHistoryModal 
                    isOpen={showHistory} 
                    onClose={() => setShowHistory(false)} 
                    project={selectedProject} 
                    onUpdateProject={onUpdateProject} 
                />
            )}
        </div>
    );
});
