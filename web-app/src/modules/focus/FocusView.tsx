import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Lock, Pause, Play, StopCircle, Volume2, Plus, Target, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Attribute } from '../../types';
import { FocusStats } from './components/FocusStats';
import { SessionHistoryModal } from './components/SessionHistoryModal';

export const FocusView = React.memo(({ projects, attributes, onCompleteSession, onOpenProjectModal, setFocusMode, onUpdateProject, addNotification }: { 
    projects: Project[], 
    attributes: Attribute[], 
    onCompleteSession: (id: string | null, duration: number, type: 'POMO' | 'STOPWATCH') => void, 
    onOpenProjectModal: () => void, 
    setFocusMode: (attrId: string | null) => void, 
    onUpdateProject: (p: Project) => void,
    addNotification: (n: any) => void
}) => {
    const [viewState, setViewState] = useState<'LIST' | 'TIMER'>('LIST');
    const [mode, setMode] = useState<'POMO' | 'STOPWATCH'>('POMO');
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [shakeMode, setShakeMode] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);
    const activeAttr = useMemo(() => attributes.find((a) => a.id === selectedProject?.attribute), [selectedProject, attributes]);
    const themeColor = activeAttr?.color || '#3b82f6';
    const ActiveIcon = activeAttr?.icon || Target;

    const [timeLeft, setTimeLeft] = useState(25 * 60); 
    const [totalDuration, setTotalDuration] = useState(25 * 60);

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
        await new Promise(resolve => setTimeout(resolve, 1200));

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
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (mode === 'POMO') {
                        if (prev <= 1) {
                            clearInterval(interval);
                            handleFinishSession();
                            return 0;
                        }
                        return prev - 1;
                    } else { return prev + 1; }
                });
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
        <div className="grid grid-cols-1 grid-rows-1 w-full h-full relative overflow-hidden bg-transparent min-h-0">
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
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", damping: 15, stiffness: 200 }}
                            className="relative flex flex-col items-center gap-4"
                        >
                            <ActiveIcon size={80} style={{ color: themeColor }} className="filter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- LIST VIEW --- */}
            <div className={`col-start-1 row-start-1 w-full h-full overflow-y-auto no-scrollbar flex flex-col transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${viewState === 'LIST' ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 scale-95 pointer-events-none -translate-y-4'}`}>
                
                {/* Header */}
            <div className="flex justify-center items-center px-6 pt-0 pb-4 flex-shrink-0 z-20">
                <h2 className="text-[20px] font-black text-white tracking-widest uppercase drop-shadow-lg font-sf-display">FOCUS ESTUDIO</h2>
            </div>

            {/* Stats & List */}
            <div className="px-4 flex-shrink-0 relative z-10">
                <FocusStats projects={projects} attributes={attributes} />
            </div>

                <div className="grid grid-cols-2 gap-3 px-4 pb-32 content-start mt-4 relative z-10">
                    {projects.map((project) => {
                        const attr = attributes.find((a) => a.id === project.attribute);
                        const progressVal = Math.min(100, (project.totalTime / (project.goalTarget * 60)) * 100);
                        const Icon = attr?.icon || Star;
                        return (
                            <div key={project.id} className="relative group rounded-[2rem] p-5 bg-[#121212]/60 backdrop-blur-md border border-white/5 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-95 flex flex-col justify-between h-52 shadow-2xl hover:shadow-white/5">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="z-10 flex justify-between items-start">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner bg-black/20"><Icon size={18} style={{ color: attr?.color }} /></div>
                                    <div className="bg-black/40 px-2 py-1 rounded-full border border-white/5 backdrop-blur-md"><span className="text-[10px] font-mono text-slate-300 font-bold">{project.pomoDuration}m</span></div>
                                </div>
                                <div className="z-10 mt-2">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-3 tracking-tight line-clamp-2">{project.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progressVal}%`, backgroundColor: attr?.color, boxShadow: `0 0 10px ${attr?.color}40` }} />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => startSession(project.id)} className="z-10 w-full py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors mt-auto flex items-center justify-center gap-2 shadow-lg active:scale-95 transform">Start</button>
                            </div>
                        )
                    })}
                    <button onClick={onOpenProjectModal} className="rounded-[2rem] p-5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all h-52 group active:scale-95">
                        <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors"><Plus size={24} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">New Flow</span>
                    </button>
                </div>
            </div>

            {/* --- TIMER VIEW --- */}
            <div className={`col-start-1 row-start-1 w-full h-full flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${viewState === 'TIMER' ? 'opacity-100 z-20 delay-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
                
                {/* Timer Header */}
                <div className="w-full flex justify-between items-center px-6 pt-8 z-30">
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
                <div className="flex items-center gap-8 pb-24">
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
