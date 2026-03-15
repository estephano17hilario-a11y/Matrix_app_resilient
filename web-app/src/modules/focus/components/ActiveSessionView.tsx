import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pause, Play, StopCircle, Volume2, ChevronDown, History, BellOff, Battery, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Attribute } from '../../../types';
import { useFocusSession } from '../hooks/useFocusSession';
import FocusSession from '../../../plugins/FocusPlugin'; // Direct Plugin Access
import { SessionHistoryModal } from './SessionHistoryModal';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { cn } from '../../../utils/cn';
// import { LocalNotifications } from '@capacitor/local-notifications';

interface ActiveSessionViewProps {
    project: Project;
    attribute?: Attribute;
    onExit: () => void;
    onCompleteSession: (duration: number, type: 'POMO' | 'STOPWATCH') => void;
    onUpdateProject: (p: Project) => void;
    onDeleteSession?: (projectId: string, sessionId: string) => void;
    onAddManualSession?: (projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string) => void;
    onEditSession?: (projectId: string, sessionId: string, newDurationMinutes: number, newDateStr: string) => void;
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
    onEditSession,
    autoStart,
    onAutoStartConsumed,
    customHeaderTitle
}) => {
    const [showHistory, setShowHistory] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [editTimeValue, setEditTimeValue] = useState('25');
    const [showFocusProtectionModal, setShowFocusProtectionModal] = useState(false);
    
    // SMART PERMISSIONS STATE
    const [permissions, setPermissions] = useState({
        notifications: true,
        battery: true,
        overlay: true
    });
    
    const hasAutoStarted = useRef(false);
    const sessionRecordedRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Check Advanced Permissions on Mount
    const checkAllPermissions = useCallback(async () => {
        try {
            // Use our new native method
            const perms = await FocusSession.checkPermissions();
            console.log("🛡️ Focus Permissions Check:", perms);
            setPermissions(perms);
        } catch (e) {
            console.warn("Failed to check advanced permissions", e);
        }
    }, []);

    useEffect(() => {
        checkAllPermissions();
        
        // Re-check when app resumes
        const handleResume = () => checkAllPermissions();
        document.addEventListener('resume', handleResume);
        return () => document.removeEventListener('resume', handleResume);
    }, [checkAllPermissions]);

    // Handlers for Smart Buttons
    const handleEnableNotifications = async () => {
        await FocusSession.openNotificationSettings();
    };

    const handleDisableBatteryOpt = async () => {
        await FocusSession.requestBatteryPermission();
    };

    const handleEnableOverlay = async () => {
        await FocusSession.requestOverlayPermission();
    };

    const handleExitAttempt = () => {
        if (isActive) {
            setShowFocusProtectionModal(true);
        } else {
            onExit();
        }
    };

    const handleSessionEnd = useCallback((duration: number, mode: 'POMO' | 'STOPWATCH') => {
        const safeDuration = Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0;
        if (safeDuration < 5) return;
        if (sessionRecordedRef.current) return;
        sessionRecordedRef.current = true;
        onCompleteSession(safeDuration, mode);
    }, [onCompleteSession]);

    // Helper to get emoji for attribute
    const getTraitEmoji = (id: string) => {
        switch(id) {
            case 'DISCIPLINA': return '🎯';
            case 'FISICO': return '🏋️';
            case 'MENTAL': return '🧠';
            case 'SOCIAL': return '👥';
            case 'ESPIRITU': return '👻';
            case 'FINANZAS': return '💰';
            case 'CREATIVIDAD': return '🎨';
            case 'ORDEN': return '⚓';
            case 'LIDERAZGO': return '👑';
            case 'RESILIENCIA': return '🛡️';
            case 'VITALIDAD': return '⚡';
            case 'ESTILO': return '🪶';
            default: return '⚡';
        }
    };

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
    } = useFocusSession(project, handleSessionEnd, getTraitEmoji(project.attribute));

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
        // onExit(); // Removed to keep the user in the Focus Session view
    };

    return (
        <motion.div
            className="flex flex-col w-full h-full relative overflow-hidden bg-transparent font-sans touch-none select-none overscroll-none" // Added overscroll-none for extra safety
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
             {/* Dynamic Background Aura - Ultra Optimized & Visual */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <motion.div 
                    className="absolute top-1/2 left-1/2 w-[1000px] h-[1000px] rounded-full"
                    initial={false}
                    animate={{ 
                        scale: isActive && !isPaused ? [1.02, 1.12, 1.02] : 1, // Even more subtle scale
                        opacity: isActive && !isPaused ? 0.25 : 0.15,
                        x: '-50%',
                        y: '-50%'
                    }}
                    transition={{ 
                        scale: {
                            repeat: Infinity,
                            duration: 6, // Even slower pulse
                            ease: "easeInOut"
                        },
                        opacity: { duration: 1.5 },
                        x: { duration: 0 },
                        y: { duration: 0 }
                    }}
                    style={{ 
                        backgroundImage: `radial-gradient(circle at center, ${themeColor} 0%, ${themeColor}10 40%, rgba(0,0,0,0) 70%)`,
                        willChange: 'transform, opacity'
                    }} 
                />
            </div>

            {/* Top Bar */}
            <div className="w-full px-6 pt-12 pb-6 flex justify-between items-center z-50 shrink-0 relative">
                <button 
                    onClick={handleExitAttempt}
                    className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors"
                >
                    <ChevronDown size={24} />
                </button>

                {customHeaderTitle ? (
                    <div className="flex-1 flex justify-center px-4">
                        {customHeaderTitle}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                         <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 border border-white/10 shadow-md">
                            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                            <span className="text-xs font-black text-white uppercase tracking-widest">{project.title}</span>
                        </div>
                        
                        {/* SMART NOTIFICATION PROMPT */}
                        <AnimatePresence>
                            {!permissions.notifications && (
                                <motion.button
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    onClick={handleEnableNotifications}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30 transition-colors"
                                >
                                    <BellOff size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Enable Notifications</span>
                                </motion.button>
                            )}
                            
                            {/* SMART BATTERY PROMPT (Only shows if Notifs are enabled but Battery is restricted) */}
                            {permissions.notifications && !permissions.battery && (
                                <motion.button
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    onClick={handleDisableBatteryOpt}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 transition-colors"
                                >
                                    <Battery size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Unrestrict Battery</span>
                                </motion.button>
                            )}

                            {/* SMART OVERLAY PROMPT (Only shows if others are OK) */}
                            {permissions.notifications && permissions.battery && !permissions.overlay && (
                                <motion.button
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    onClick={handleEnableOverlay}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/30 transition-colors"
                                >
                                    <Layers size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Enable Live View</span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <button 
                    onClick={() => setShowHistory(true)}
                    className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors relative"
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
                                className="flex bg-black/50 border border-white/10 rounded-full p-1 shadow-md"
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
                            <filter id={`glow-${project.id}`} x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        
                        {/* Background Track */}
                        <circle cx="160" cy="160" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                        
                        {/* Progress Glow (Secondary layer for better visual without heavy filters) */}
                        <motion.circle 
                            cx="160" cy="160" r={radius} fill="none" 
                            stroke={themeColor}
                            strokeWidth="20"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            initial={false}
                            animate={{ 
                                opacity: isActive && !isPaused ? 0.15 : 0,
                                strokeWidth: isActive && !isPaused ? 24 : 20
                            }}
                            style={{ transition: 'stroke-dashoffset 1s linear, opacity 0.5s ease' }}
                        />

                        {/* Main Progress */}
                        <circle 
                            cx="160" cy="160" r={radius} fill="none" 
                            stroke={`url(#gradient-${project.id})`}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />


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
                                style={{ textShadow: `0 0 30px ${themeColor}40` }}
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
            <div className="w-full px-8 pt-8 pb-20 flex items-center justify-center gap-10 relative z-20 shrink-0">
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleStop} 
                    className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 hover:text-red-400 border border-white/10 flex items-center justify-center transition-colors group shadow-md"
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
                            ? `0 0 40px ${themeColor}40` 
                            : `0 0 15px rgba(255,255,255,0.05)`
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
                    className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors shadow-md"
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
                        onEditSession={onEditSession}
                        isActive={isActive}
                        onShowWarning={() => setShowFocusProtectionModal(true)}
                    />
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={showFocusProtectionModal}
                onClose={() => setShowFocusProtectionModal(false)}
                onConfirm={() => setShowFocusProtectionModal(false)}
                title="Focus Mode Active"
                message="You must finish or stop the current focus session before performing this action."
                confirmText="Understood"
                cancelText={null}
                variant="warning"
            />
        </motion.div>
    );
};
