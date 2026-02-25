import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pause, Play, StopCircle, Volume2, ChevronDown, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Attribute } from '../../../types';
import { useFocusSession } from '../hooks/useFocusSession';
import { SessionHistoryModal } from './SessionHistoryModal';
import { cn } from '../../../utils/cn';

interface ActiveSessionViewProps {
    project: Project;
    attribute?: Attribute;
    onExit: () => void;
    onCompleteSession: (duration: number, type: 'POMO' | 'STOPWATCH') => void;
    onUpdateProject: (p: Project) => void;
    onDeleteSession?: (projectId: string, sessionId: string) => void;
    onAddManualSession?: (projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string) => void;
    autoStart?: boolean;
    onAutoStartConsumed?: () => void;
    customHeaderTitle?: React.ReactNode;
}

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
    project,
    attribute,
    onExit,
    onCompleteSession,
    onUpdateProject,
    onDeleteSession,
    onAddManualSession,
    autoStart,
    onAutoStartConsumed,
    customHeaderTitle
}) => {
    const [showHistory, setShowHistory] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [editTimeValue, setEditTimeValue] = useState('25');
    const hasAutoStarted = useRef(false);
    const sessionRecordedRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSessionEnd = useCallback((duration: number, mode: 'POMO' | 'STOPWATCH') => {
        const safeDuration = Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0;
        if (safeDuration < 5) return;
        if (sessionRecordedRef.current) return;
        sessionRecordedRef.current = true;
        onCompleteSession(safeDuration, mode);
    }, [onCompleteSession]);

    const {
        mode,
        setMode,
        timeLeft,
        setTimeLeft,
        totalDuration,
        setTotalDuration,
        isActive,
        isPaused,
        toggleTimer,
        stopSession
    } = useFocusSession(project, handleSessionEnd);

    useEffect(() => {
        if (isEditingTime && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditingTime]);

    const handleAddManualSessionWrapper = useCallback((projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string) => {
        console.log("💎 [ActiveSessionView] Adding manual session...", { projectId, durationMinutes, type });
        if (onAddManualSession) {
            onAddManualSession(projectId, durationMinutes, type, sessionId, sessionDate);
        } else {
            console.error("❌ [ActiveSessionView] onAddManualSession prop is MISSING!");
        }
        
        // Removed forced exit to allow user to see the success state in the modal or continue working
        // if (!isActive) {
        //    onExit();
        // }
    }, [onAddManualSession, isActive, onExit]);

    const handleTimeSubmit = () => {
        const minutes = parseInt(editTimeValue);
        if (!isNaN(minutes) && minutes > 0) {
            const newSeconds = minutes * 60;
            setTimeLeft(newSeconds);
            setTotalDuration(newSeconds);
            sessionRecordedRef.current = false;
        }
        setIsEditingTime(false);
    };

    const handleTimeKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTimeSubmit();
        } else if (e.key === 'Escape') {
            setIsEditingTime(false);
            setEditTimeValue(Math.floor(timeLeft / 60).toString());
        }
    };

    useEffect(() => {
        if (autoStart && !hasAutoStarted.current && !isActive) {
            hasAutoStarted.current = true;
            toggleTimer();
            onAutoStartConsumed?.();
        }
    }, [autoStart, isActive, toggleTimer, onAutoStartConsumed]);

    useEffect(() => {
        sessionRecordedRef.current = false;
    }, [project.id]);

    useEffect(() => {
        if (!isActive && !isPaused) {
            if (mode === 'POMO') {
                const initial = project.pomoDuration * 60;
                if (timeLeft === initial) sessionRecordedRef.current = false;
            } else {
                if (timeLeft === 0) sessionRecordedRef.current = false;
            }
        }
    }, [isActive, isPaused, mode, timeLeft, project.pomoDuration]);

    const themeColor = attribute?.color || '#3b82f6';
    
    // Timer Circle Logic
    const radius = 140; 
    const circumference = 2 * Math.PI * radius;
    const progress = mode === 'POMO' ? (timeLeft / totalDuration) : 1; 
    const dashOffset = circumference * (1 - progress);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getElapsedSeconds = useCallback((currentMode: 'POMO' | 'STOPWATCH') => {
        if (currentMode === 'POMO') {
            const elapsed = totalDuration - timeLeft;
            return Math.max(0, Math.min(totalDuration, elapsed));
        }
        return Math.max(0, timeLeft);
    }, [timeLeft, totalDuration]);

    const handleStop = () => {
        if (mode === 'STOPWATCH' && timeLeft > 0) {
            handleSessionEnd(getElapsedSeconds('STOPWATCH'), 'STOPWATCH');
        }
        if (mode === 'POMO') {
            handleSessionEnd(getElapsedSeconds('POMO'), 'POMO');
        }
        stopSession();
        onExit();
    };

    return (
        <motion.div
            className="flex flex-col w-full h-full relative overflow-hidden bg-transparent font-sans" // Changed bg-[#030303] to bg-transparent
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
             {/* Dynamic Background */}
             <div className="absolute inset-0 pointer-events-none z-0">
                {/* Central Orb/Glow */}
                <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 transition-all duration-1000 will-change-transform"
                    style={{ backgroundColor: themeColor, transform: isActive && !isPaused ? 'translate(-50%, -50%) scale(1.2)' : 'translate(-50%, -50%) scale(1)' }} 
                />
                
                {/* Extra Ambient Orbs (if needed for non-orb themes, but user asked for orbs to change color) */}
                {/* Assuming ParticleLayer handles the main background orbs, this local orb adds depth */}
             </div>

            {/* Top Bar */}
            <div className="w-full p-6 flex justify-between items-center z-50 shrink-0">
                <button 
                    onClick={onExit}
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
                >
                    <ChevronDown size={24} />
                </button>

                {customHeaderTitle ? (
                    <div className="flex-1 flex justify-center px-4">
                        {customHeaderTitle}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                        <span className="text-xs font-black text-white uppercase tracking-widest">{project.title}</span>
                    </div>
                )}

                <button 
                    onClick={() => setShowHistory(true)}
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md relative"
                >
                    <History size={20} />
                    {project.sessions && project.sessions.length > 0 && (
                        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-[#1c1c1e]" />
                    )}
                </button>
            </div>

            {/* Main Content (Flex Column Centered) */}
            <div className="flex-1 flex flex-col items-center justify-center gap-10 relative z-10 w-full min-h-0">
                
                {/* Mode Toggles (Placed ABOVE timer to avoid overlap) */}
                <div className="h-10 flex items-center justify-center">
                    <AnimatePresence mode='wait'>
                        {!isActive && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex bg-black/40 backdrop-blur-lg border border-white/10 rounded-full p-1 shadow-2xl"
                            >
                                <button 
                                    onClick={() => {
                                        setMode('POMO');
                                        setTimeLeft(project.pomoDuration * 60);
                                        setTotalDuration(project.pomoDuration * 60);
                                    }}
                                    className={cn(
                                        "px-6 py-2 rounded-full text-[10px] font-black tracking-[0.2em] transition-all duration-300",
                                        mode === 'POMO' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/70"
                                    )}
                                >
                                    FOCUS
                                </button>
                                <button 
                                    onClick={() => {
                                        setMode('STOPWATCH');
                                        setTimeLeft(0);
                                        setTotalDuration(0);
                                    }}
                                    className={cn(
                                        "px-6 py-2 rounded-full text-[10px] font-black tracking-[0.2em] transition-all duration-300",
                                        mode === 'STOPWATCH' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/70"
                                    )}
                                >
                                    FLOW
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Timer Ring */}
                <div className="relative w-[320px] h-[320px] flex items-center justify-center shrink-0">
                    {/* SVG Ring Container */}
                    <svg className="absolute w-full h-full rotate-[-90deg] overflow-visible" viewBox="0 0 320 320">
                        <defs>
                            <linearGradient id={`gradient-${project.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={themeColor} stopOpacity="1" />
                                <stop offset="100%" stopColor={themeColor} stopOpacity="0.2" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        
                        {/* Background Track */}
                        <circle cx="160" cy="160" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                        
                        {/* Progress */}
                        <circle 
                            cx="160" cy="160" r={radius} fill="none" 
                            stroke={`url(#gradient-${project.id})`}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            filter="url(#glow)"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />

                        {/* PULSING GLOW WHEN ACTIVE */}
                        {isActive && !isPaused && (
                            <circle 
                                cx="160" cy="160" r={radius} fill="none" 
                                stroke={themeColor}
                                strokeWidth="4"
                                strokeOpacity="0.5"
                                className="animate-ping-slow" // Requires custom animation or use framer motion
                                style={{ animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.3 }}
                            />
                        )}
                    </svg>

                    {/* Time Display */}
                    <div className="relative z-10 flex flex-col items-center">
                        {isEditingTime ? (
                            <div className="flex items-center justify-center relative">
                                <input
                                    ref={inputRef}
                                    type="number"
                                    value={editTimeValue}
                                    onChange={(e) => setEditTimeValue(e.target.value)}
                                    onBlur={handleTimeSubmit}
                                    onKeyDown={handleTimeKeyDown}
                                    className="w-48 text-[5rem] font-mono font-bold text-white bg-transparent text-center outline-none border-b-2 border-white/20 leading-none tracking-tighter tabular-nums drop-shadow-2xl selection:bg-white/20"
                                />
                                <span className="absolute -right-8 bottom-4 text-sm font-bold text-white/40 uppercase tracking-widest">MIN</span>
                            </div>
                        ) : (
                            <div 
                                onClick={() => {
                                    if (!isActive) {
                                        setEditTimeValue(Math.floor(timeLeft / 60).toString());
                                        setIsEditingTime(true);
                                    }
                                }}
                                className={cn(
                                    "text-[5rem] font-mono font-bold text-white leading-none tracking-tighter tabular-nums drop-shadow-2xl select-none scale-y-110 transition-all",
                                    !isActive && "cursor-pointer hover:scale-110 hover:text-indigo-200"
                                )}
                                style={{ textShadow: `0 0 50px ${themeColor}50` }}
                            >
                                {formatTime(timeLeft)}
                            </div>
                        )}
                        <div className="mt-4 text-xs font-bold text-white/30 uppercase tracking-[0.3em] animate-pulse">
                            {isActive ? (isPaused ? 'Paused' : 'Running') : (isEditingTime ? 'Set Duration' : 'Ready')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="w-full p-8 pb-12 flex items-center justify-center gap-10 relative z-20 shrink-0">
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleStop} 
                    className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 border border-white/5 flex items-center justify-center transition-colors backdrop-blur-md group shadow-lg"
                >
                    <StopCircle size={24} className="group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)] transition-all" />
                </motion.button>
                
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleTimer} 
                    className="w-24 h-24 rounded-[3rem] flex items-center justify-center z-20 relative group overflow-hidden border border-white/10"
                    style={{ 
                        backgroundColor: isActive && !isPaused ? themeColor : 'rgba(255,255,255,0.1)',
                        boxShadow: isActive && !isPaused 
                            ? `0 0 80px ${themeColor}60` 
                            : `0 0 20px rgba(255,255,255,0.1)`
                    }}
                >
                    {isActive && !isPaused ? (
                        <Pause size={36} fill="currentColor" className="text-white drop-shadow-lg" />
                    ) : (
                        <Play size={36} fill="currentColor" className="ml-2 text-white drop-shadow-lg" />
                    )}
                </motion.button>
                
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 flex items-center justify-center transition-colors backdrop-blur-md shadow-lg"
                >
                    <Volume2 size={24} />
                </motion.button>
            </div>

             {/* Session History Modal */}
             <AnimatePresence>
                {showHistory && (
                    <SessionHistoryModal 
                        isOpen={showHistory} 
                        onClose={() => setShowHistory(false)} 
                        project={project} 
                        onUpdateProject={onUpdateProject} 
                        onDeleteSession={onDeleteSession}
                        onAddSession={(durationMinutes, type, sessionId, sessionDate) => {
                            handleAddManualSessionWrapper(project.id, durationMinutes, type, sessionId, sessionDate);
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};
