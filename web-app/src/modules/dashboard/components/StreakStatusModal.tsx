import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, CheckCircle2, Circle, Target, Activity, Clock, BookOpen } from 'lucide-react';
import { DailyLimits } from '@/types/User';
import { GlassCard } from '@/components/ui/GlassCard';

interface StreakStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    dailyLimits: DailyLimits;
    streak: number;
}

export const StreakStatusModal: React.FC<StreakStatusModalProps> = ({ isOpen, onClose, dailyLimits, streak }) => {
    // 1. Define Requirements
    const REQUIREMENTS = [
        {
            id: 'tasks',
            label: 'Complete 2 Tasks',
            icon: Target,
            current: dailyLimits.tasksCompleted || 0,
            target: 2,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-400/20'
        },
        {
            id: 'habits',
            label: 'Complete 1 Habit',
            icon: Activity,
            current: dailyLimits.habitsCompleted || 0,
            target: 1,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            border: 'border-emerald-400/20'
        },
        {
            id: 'focus',
            label: '1 Hour Focus',
            icon: Clock,
            current: Math.floor((dailyLimits.focusSeconds || 0) / 60), // In minutes
            target: 60,
            unit: 'm',
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            border: 'border-amber-400/20'
        },
        {
            id: 'notes',
            label: '1 Note or Journal',
            icon: BookOpen,
            current: dailyLimits.notesCompleted || 0,
            target: 1,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
            border: 'border-purple-400/20'
        }
    ];

    // 2. Calculate Overall Status
    const completedCount = REQUIREMENTS.filter(r => r.current >= r.target).length;
    const allCompleted = completedCount === REQUIREMENTS.length;
    const progressPercent = (completedCount / REQUIREMENTS.length) * 100;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* BACKDROP */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
                    />

                    {/* MODAL */}
                    <div className="fixed inset-0 flex items-center justify-center z-[160] pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full max-w-md pointer-events-auto"
                        >
                            <GlassCard className="p-6 relative overflow-hidden">
                                {/* Close Button */}
                                <button 
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {/* Header */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${
                                        allCompleted 
                                            ? "bg-orange-500/20 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.4)]" 
                                            : "bg-white/5 border-white/10"
                                    } border`}>
                                        <Flame 
                                            size={32} 
                                            className={`${
                                                allCompleted 
                                                    ? "text-orange-500 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" 
                                                    : "text-white/20"
                                            }`} 
                                        />
                                    </div>
                                    <h2 className="text-xl font-bold text-white tracking-tight mb-1">
                                        Streak Protocol
                                    </h2>
                                    <p className="text-sm text-white/40 text-center max-w-[80%]">
                                        Complete all 4 daily directives to maintain your momentum.
                                    </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-white/5 rounded-full mb-8 overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        className={`h-full rounded-full ${
                                            allCompleted ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-white/20'
                                        }`}
                                    />
                                </div>

                                {/* Requirements List */}
                                <div className="space-y-3">
                                    {REQUIREMENTS.map((req) => {
                                        const isDone = req.current >= req.target;
                                        
                                        return (
                                            <div 
                                                key={req.id}
                                                className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                                                    isDone 
                                                        ? "bg-white/5 border-white/10" 
                                                        : "bg-black/20 border-white/5 opacity-80"
                                                }`}
                                            >
                                                {/* Icon Box */}
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                                                    isDone ? `${req.bg} ${req.border} ${req.color}` : "bg-white/5 border-white/5 text-white/20"
                                                }`}>
                                                    <req.icon size={18} />
                                                </div>

                                                {/* Text Info */}
                                                <div className="flex-1">
                                                    <div className={`text-sm font-medium ${isDone ? "text-white" : "text-white/60"}`}>
                                                        {req.label}
                                                    </div>
                                                    <div className="text-xs text-white/30 font-mono mt-0.5">
                                                        {req.current} / {req.target} {req.unit || ''}
                                                    </div>
                                                </div>

                                                {/* Check Status */}
                                                <div className={`transition-all duration-500 ${
                                                    isDone ? req.color : "text-white/10"
                                                }`}>
                                                    {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer Status */}
                                <div className="mt-6 pt-6 border-t border-white/5 text-center">
                                    {allCompleted ? (
                                        <div className="text-orange-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                                            🔥 Streak Active
                                        </div>
                                    ) : (
                                        <div className="text-white/20 text-xs font-bold uppercase tracking-widest">
                                            {REQUIREMENTS.length - completedCount} pending actions
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
