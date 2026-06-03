import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, CheckCircle2, Circle, Target, Activity, Clock, Info, ArrowRight } from 'lucide-react';
import { DailyLimits } from '@/types/User';
import { useTranslation } from 'react-i18next';

import { addDays, isSameDay, format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek, parseLocalDate } from '../../../utils/dateUtils';

interface StreakStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    dailyLimits: DailyLimits;
    streak?: number;
    lastStreakDate?: string;
    onNavigate?: (view: string) => void;
}

export const StreakStatusModal: React.FC<StreakStatusModalProps> = ({ isOpen, onClose, dailyLimits, streak = 0, lastStreakDate, onNavigate }) => {
    const { t } = useTranslation();

    // 1. Define Requirements
    const REQUIREMENTS = [
        {
            id: 'tasks',
            label: t('streak.req.tasks', 'Complete 2 Tasks'),
            icon: Target,
            current: dailyLimits.tasksCompleted || 0,
            target: 2,
            unit: '',
            view: 'TASKS',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]'
        },
        {
            id: 'habits',
            label: t('streak.req.habits', 'Complete 1 Habit'),
            icon: Activity,
            current: dailyLimits.habitsCompleted || 0,
            target: 1,
            unit: '',
            view: 'HABITS',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]'
        },
        {
            id: 'focus',
            label: t('streak.req.focus', '1 Hour Focus'),
            icon: Clock,
            current: Math.floor((dailyLimits.focusSeconds || 0) / 60),
            target: 60,
            unit: 'm',
            view: 'FOCUS',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]'
        }
    ];

    // 2. Calculate Overall Status
    const completedCount = REQUIREMENTS.filter(r => r.current >= r.target).length;
    const allCompleted = completedCount === REQUIREMENTS.length;
    const progressPercent = (completedCount / REQUIREMENTS.length) * 100;

    // 3. Calculate Weekly View Data
    const weekData = React.useMemo(() => {
        const today = new Date();
        const start = startOfWeek(today); // Start on Monday
        
        // Generate array of active dates based on streak and lastStreakDate
        const activeDates: string[] = [];
        if (lastStreakDate && streak > 0) {
            const lastDate = parseLocalDate(lastStreakDate);
            // Add the lastDate and (streak - 1) days before it
            for (let i = 0; i < streak; i++) {
                activeDates.push(format(subDays(lastDate, i), 'yyyy-MM-dd'));
            }
        }
        // If allCompleted is true today, ensure today is in activeDates
        if (allCompleted) {
            const todayStr = format(today, 'yyyy-MM-dd');
            if (!activeDates.includes(todayStr)) {
                activeDates.push(todayStr);
            }
        }

        return Array.from({ length: 7 }).map((_, i) => {
            const date = addDays(start, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const isActive = activeDates.includes(dateStr);
            const isToday = isSameDay(date, today);
            const isFuture = date > today;
            
            return {
                date,
                label: format(date, 'EE', { locale: es }).substring(0, 1).toUpperCase(),
                isActive,
                isToday,
                isFuture
            };
        });
    }, [streak, lastStreakDate, allCompleted]);

    const handleNavigate = (view: string) => {
        if (onNavigate) {
            onNavigate(view);
            onClose();
        }
    };

    // Use Portal to render outside the current DOM hierarchy (avoids overflow issues)
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* BACKDROP - Optimized (No blur) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#020204]/90 z-[9998]"
                    />

                    {/* MODAL CONTAINER */}
                    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="w-full max-w-[340px] pointer-events-auto"
                        >
                            <div className="relative overflow-hidden rounded-[28px] bg-[#0A0A0A]/95 border border-white/10 shadow-md">
                                
                                {/* Background Ambient Glow - Optimized (No blur, using radial gradient) */}
                                <div 
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 pointer-events-none opacity-50"
                                    style={{ background: 'radial-gradient(circle at top, rgba(249,115,22,0.15) 0%, transparent 70%)' }}
                                />

                                {/* Close Button */}
                                <button 
                                    onClick={onClose}
                                    className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full z-20 border border-white/5"
                                >
                                    <X size={16} />
                                </button>

                                <div className="p-5 flex flex-col items-center relative z-10">
                                    
                                    {/* SUPER DUOLINGO ANIMATION FOR COMPLETED STREAK */}
                                    {allCompleted ? (
                                        <div className="w-full flex flex-col items-center mb-6 relative">
                                            {/* Particles Explosion */}
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center top-[-20px]">
                                                {Array.from({ length: 16 }).map((_, i) => {
                                                    const angle = (i * 360) / 16;
                                                    const dist = 60 + Math.random() * 40;
                                                    return (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                                                            animate={{
                                                                opacity: 0,
                                                                scale: Math.random() * 0.8 + 0.4,
                                                                x: Math.cos(angle * Math.PI / 180) * dist,
                                                                y: Math.sin(angle * Math.PI / 180) * dist,
                                                            }}
                                                            transition={{ duration: 0.25, ease: "easeOut" }}
                                                            className="absolute w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                                                        />
                                                    );
                                                })}
                                            </div>

                                            {/* Main Big Flame */}
                                            <motion.div 
                                                initial={{ scale: 0, rotate: -20, y: 20 }}
                                                animate={{ scale: [0, 1.3, 1], rotate: [ -20, 10, 0 ], y: 0 }}
                                                transition={{ type: "spring", stiffness: 450, damping: 15 }}
                                                className="relative z-10 w-24 h-24 flex items-center justify-center"
                                            >
                                                <div 
                                                    className="absolute inset-0 pointer-events-none"
                                                    style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)' }}
                                                />
                                                <Flame 
                                                    size={80} 
                                                    className="text-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.8)] relative z-10" 
                                                    fill="currentColor"
                                                />
                                            </motion.div>

                                            {/* Streak Number */}
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: 0.3, type: "spring" }}
                                                className="mt-2 text-center"
                                            >
                                                <div className="flex items-baseline justify-center gap-1">
                                                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-300 to-red-500 drop-shadow-lg tracking-tighter">
                                                        {streak}
                                                    </span>
                                                    <span className="text-lg font-bold text-orange-400">DÍAS</span>
                                                </div>
                                                <h2 className="text-sm font-bold text-white tracking-tight mt-1 drop-shadow-md uppercase">
                                                    {t('streak.secured', '¡Racha Asegurada!')}
                                                </h2>
                                            </motion.div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* HEADER: Normal Flame Icon for Pending */}
                                            <motion.div 
                                                className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-white/5 border border-white/10"
                                            >
                                                <Flame 
                                                    size={28} 
                                                    className="text-white/20" 
                                                    fill="none"
                                                />
                                            </motion.div>

                                            {/* Title & Subtitle */}
                                            <div className="text-center mb-4">
                                                <h2 className="text-xl font-bold text-white tracking-tight mb-1 drop-shadow-md">
                                                    {t('streak.title', 'Protocolo Diario')}
                                                </h2>
                                                <p className="text-xs text-white/40 max-w-[220px] mx-auto leading-relaxed">
                                                    {t('common.streakDesc')}
                                                </p>
                                            </div>

                                            {/* WHY Section */}
                                            <div className="w-full mb-5 bg-blue-500/5 border border-blue-500/10 rounded-xl p-2.5 flex gap-2.5">
                                                <Info className="text-blue-400 shrink-0" size={14} />
                                                <p className="text-[10px] text-blue-200/70 leading-relaxed">
                                                    {t('common.streakWhy')}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {/* WEEKLY VIEW */}
                                    <div className="w-full bg-white/10 rounded-2xl p-3 mb-5 border border-white/10">
                                        <div className="flex justify-between items-center w-full px-1">
                                            {weekData.map((day, i) => (
                                                <div key={i} className="flex flex-col items-center gap-1.5 relative">
                                                    <span className={`text-[9px] font-bold ${day.isToday ? 'text-white' : 'text-white/40'}`}>
                                                        {day.label}
                                                    </span>
                                                    <div className="relative">
                                                        {day.isActive ? (
                                                            <motion.div
                                                                initial={day.isToday && allCompleted ? { scale: 0, rotate: -180 } : { scale: 1 }}
                                                                animate={day.isToday && allCompleted ? { scale: [0, 1.2, 1], rotate: 0 } : { scale: 1 }}
                                                                transition={{ type: "spring", delay: day.isToday && allCompleted ? 0.6 : 0, duration: 0.2 }}
                                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                                                            >
                                                                <Flame size={14} className="text-white drop-shadow-md" fill="currentColor" />
                                                            </motion.div>
                                                        ) : (
                                                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all ${day.isFuture ? 'bg-transparent border-white/5' : 'bg-white/5 border-white/10'}`}>
                                                                {!day.isFuture && <Circle size={8} className="text-white/20" />}
                                                            </div>
                                                        )}
                                                        {day.isToday && (
                                                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Progress Bar & Requirements List - Only show if not all completed or to show proof of work */}
                                    {!allCompleted && (
                                        <>
                                            {/* Progress Bar */}
                                            <div className="w-full h-1.5 bg-white/5 rounded-full mb-5 overflow-hidden border border-white/5 relative">
                                                <motion.div 
                                                    
                                                    animate={{ width: `${progressPercent}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full rounded-full relative overflow-hidden bg-white/20"
                                                />
                                            </div>

                                            {/* Requirements List */}
                                            <div className="w-full space-y-2">
                                                {REQUIREMENTS.map((req, i) => {
                                                    const isDone = req.current >= req.target;
                                                    
                                                    return (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.1 }}
                                                            key={req.id}
                                                            onClick={() => !isDone && handleNavigate(req.view)}
                                                            className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 overflow-hidden ${
                                                                isDone 
                                                                    ? `bg-white/5 border-white/10 ${req.glow}` 
                                                                    : "bg-black/20 border-white/5 opacity-80 hover:opacity-100 hover:bg-white/5 cursor-pointer active:scale-95"
                                                            }`}
                                                        >
                                                            {/* Glow Effect for Done Items */}
                                                            {isDone && (
                                                                <div className={`absolute inset-0 opacity-10 ${req.bg}`} />
                                                            )}

                                                            {/* Icon Box */}
                                                            <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-200 ${
                                                                isDone ? `${req.bg} ${req.border} ${req.color}` : "bg-white/5 border-white/5 text-white/20"
                                                            }`}>
                                                                <req.icon size={16} strokeWidth={isDone ? 2.5 : 2} />
                                                            </div>

                                                            {/* Text Info */}
                                                            <div className="flex-1 relative z-10">
                                                                <div className={`text-xs font-semibold transition-colors flex items-center gap-2 ${isDone ? "text-white" : "text-white/60 group-hover:text-white"}`}>
                                                                    {req.label}
                                                                    {!isDone && <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1 text-white/40" />}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden max-w-[60px]">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-200 ${isDone ? "bg-white" : "bg-white/30"}`}
                                                                            style={{ width: `${Math.min(100, (req.current / req.target) * 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[9px] text-white/40 font-mono">
                                                                        {req.current}/{req.target} {req.unit}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Check Status */}
                                                            <div className={`relative z-10 transition-all duration-200 ${
                                                                isDone ? req.color : "text-white/10"
                                                            }`}>
                                                                {isDone ? (
                                                                    <motion.div
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        transition={{ type: "spring" }}
                                                                    >
                                                                        <CheckCircle2 size={18} strokeWidth={2.5} />
                                                                    </motion.div>
                                                                ) : (
                                                                    <Circle size={18} strokeWidth={1.5} />
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {/* Footer Status */}
                                    <div className="mt-5 pt-4 border-t border-white/5 text-center w-full">
                                        {allCompleted ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2 text-orange-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
                                                    <Flame size={10} fill="currentColor" />
                                                    {t('streak.active', 'Streak Active')}
                                                </div>
                                                <div className="text-[9px] text-white/30">
                                                    {t('streak.tomorrow', 'Come back tomorrow to continue')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 text-white/30">
                                                <Activity size={10} />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">
                                                    {REQUIREMENTS.length - completedCount} {t('streak.pending', 'pending actions')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
