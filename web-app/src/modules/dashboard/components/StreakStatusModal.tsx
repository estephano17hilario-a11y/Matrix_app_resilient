import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, CheckCircle2, Circle, Target, Activity, Clock, BookOpen, Info, ArrowRight } from 'lucide-react';
import { DailyLimits } from '@/types/User';
import { useTranslation } from 'react-i18next';

interface StreakStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    dailyLimits: DailyLimits;
    onNavigate?: (view: string) => void;
}

export const StreakStatusModal: React.FC<StreakStatusModalProps> = ({ isOpen, onClose, dailyLimits, onNavigate }) => {
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
            current: Math.floor((dailyLimits.focusSeconds || 0) / 60), // In minutes
            target: 60,
            unit: 'm',
            view: 'FOCUS',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]'
        },
        {
            id: 'notes',
            label: t('streak.req.notes', '1 Note or Journal'),
            icon: BookOpen,
            current: dailyLimits.notesCompleted || 0,
            target: 1,
            unit: '',
            view: 'NOTES',
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]'
        }
    ];

    // 2. Calculate Overall Status
    const completedCount = REQUIREMENTS.filter(r => r.current >= r.target).length;
    const allCompleted = completedCount === REQUIREMENTS.length;
    const progressPercent = (completedCount / REQUIREMENTS.length) * 100;

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
                    {/* BACKDROP - Dark & Blurry */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#020204]/60 backdrop-blur-md z-[9998]"
                    />

                    {/* MODAL CONTAINER */}
                    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="w-full max-w-[340px] pointer-events-auto"
                        >
                            <div className="relative overflow-hidden rounded-[28px] bg-[#0A0A0A]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-lg">
                                
                                {/* Background Ambient Glow */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-orange-500/10 blur-[60px] pointer-events-none" />

                                {/* Close Button */}
                                <button 
                                    onClick={onClose}
                                    className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full z-20 backdrop-blur-md border border-white/5"
                                >
                                    <X size={16} />
                                </button>

                                <div className="p-5 flex flex-col items-center relative z-10">
                                    
                                    {/* HEADER: Flame Icon */}
                                    <motion.div 
                                        animate={allCompleted ? { 
                                            scale: [1, 1.1, 1],
                                            filter: ["drop-shadow(0 0 10px rgba(249,115,22,0.5))", "drop-shadow(0 0 25px rgba(249,115,22,0.8))", "drop-shadow(0 0 10px rgba(249,115,22,0.5))"]
                                        } : {}}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
                                            allCompleted 
                                                ? "bg-gradient-to-br from-orange-500/20 to-red-600/20 border-orange-500/50 shadow-[0_0_40px_-10px_rgba(249,115,22,0.5)]" 
                                                : "bg-white/5 border-white/10"
                                        } border`}
                                    >
                                        <Flame 
                                            size={28} 
                                            className={`transition-all duration-500 ${
                                                allCompleted 
                                                    ? "text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" 
                                                    : "text-white/20"
                                            }`} 
                                            fill={allCompleted ? "currentColor" : "none"}
                                        />
                                    </motion.div>

                                    {/* Title & Subtitle */}
                                    <div className="text-center mb-4">
                                        <h2 className="text-xl font-bold text-white tracking-tight mb-1 drop-shadow-md">
                                            {allCompleted ? t('streak.secured', 'Streak Secured') : t('streak.title', 'Daily Protocol')}
                                        </h2>
                                        <p className="text-xs text-white/40 max-w-[220px] mx-auto leading-relaxed">
                                            {allCompleted 
                                                ? t('streak.securedDesc', 'All systems operational. Momentum preserved.')
                                                : t('streak.desc', 'Complete all directives to maintain your streak.')}
                                        </p>
                                    </div>

                                    {/* WHY Section (New) */}
                                    {!allCompleted && (
                                        <div className="w-full mb-5 bg-blue-500/5 border border-blue-500/10 rounded-xl p-2.5 flex gap-2.5">
                                            <Info className="text-blue-400 shrink-0" size={14} />
                                            <p className="text-[10px] text-blue-200/70 leading-relaxed">
                                                {t('streak.why', 'Maintaining the streak boosts your Discipline attribute and grants a +20% XP multiplier on all actions.')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    <div className="w-full h-1.5 bg-white/5 rounded-full mb-5 overflow-hidden border border-white/5 relative">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercent}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={`h-full rounded-full relative overflow-hidden ${
                                                allCompleted ? 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-500' : 'bg-white/20'
                                            }`}
                                        >
                                            {allCompleted && (
                                                <motion.div 
                                                    animate={{ x: ["-100%", "100%"] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2 blur-sm"
                                                />
                                            )}
                                        </motion.div>
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
                                                    className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 overflow-hidden ${
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
                                                    <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-300 ${
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
                                                                    className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-white" : "bg-white/30"}`}
                                                                    style={{ width: `${Math.min(100, (req.current / req.target) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[9px] text-white/40 font-mono">
                                                                {req.current}/{req.target} {req.unit}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Check Status */}
                                                    <div className={`relative z-10 transition-all duration-500 ${
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
