import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap } from 'lucide-react';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { useTranslation } from 'react-i18next';

interface ChecklistModalProps {
    habit: Habit;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (habitId: string, data: Partial<Habit>) => void;
    onComplete: (e: React.MouseEvent, h: Habit) => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({ habit, isOpen, onClose, onUpdate, onComplete }) => {
    const { t } = useTranslation();
    
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const today = new Date().getDay();
    const visibleItems = React.useMemo(() => {
        return habit.checklist?.filter(item => !item.days || item.days.length === 0 || item.days.includes(today)) || [];
    }, [habit.checklist, today]);

    const rewards = React.useMemo(() => {
        if (habit.completedToday && typeof habit.rewardedXp === 'number') {
            return { xp: habit.rewardedXp };
        }
        const prediction = calculateTaskRewards(habit.estimatedTime, habit.impact, habit.streak, 'HABIT');
        return { xp: prediction.xp };
    }, [habit.estimatedTime, habit.impact, habit.streak, habit.completedToday, habit.rewardedXp]);

    const handleChecklistToggle = (itemId: string, currentStatus: boolean) => {
        if (!onUpdate || !habit.checklist) return;
        const newChecklist = habit.checklist.map(item => 
            item.id === itemId ? { ...item, completed: !currentStatus } : item
        );
        
        // Check if ALL VISIBLE items are completed
        const newVisibleItems = newChecklist.filter(item => !item.days || item.days.length === 0 || item.days.includes(today));
        const allVisibleCompleted = newVisibleItems.length > 0 && newVisibleItems.every(item => item.completed);
        
        onUpdate(habit.id, { checklist: newChecklist });
        
        const updatedHabit = { ...habit, checklist: newChecklist };

        if (allVisibleCompleted && !habit.completedToday) {
            onComplete({ stopPropagation: () => {} } as React.MouseEvent, updatedHabit);
        } 
        else if (!allVisibleCompleted && habit.completedToday) {
             onComplete({ stopPropagation: () => {} } as React.MouseEvent, updatedHabit);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
                     <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "linear" }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#000]/90"
                        style={{ willChange: 'opacity' }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="relative w-full max-w-sm bg-[#0b0b0d] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl z-10"
                        style={{ willChange: 'transform, opacity' }}
                        onClick={e => e.stopPropagation()}
                    >
                         {/* Header */}
                         <div className="p-6 pb-2 flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl font-bold text-white leading-tight pr-4">
                                    {habit.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Rewards</span>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-[10px] font-black">
                                        <Zap size={10} fill="currentColor" />
                                        +{rewards.xp} XP
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                         </div>

                         {/* List */}
                         <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            {visibleItems.map(item => (
                                <div 
                                    key={item.id} 
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                                    onClick={() => handleChecklistToggle(item.id, item.completed)}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                        item.completed 
                                            ? "border-transparent text-white" 
                                            : "border-white/20 group-hover:border-white/40 bg-transparent"
                                    )}
                                    style={{
                                        backgroundColor: item.completed ? (item.color || '#6366f1') : 'transparent',
                                        borderColor: item.completed ? (item.color || '#6366f1') : undefined,
                                        boxShadow: item.completed ? `0 0 10px ${item.color || '#6366f1'}80` : undefined
                                    }}
                                    >
                                        {item.completed && <Check size={14} strokeWidth={3} />}
                                    </div>
                                    <span className={cn(
                                        "text-base font-medium transition-all duration-300",
                                        item.completed ? "text-white/30 line-through" : "text-white/90"
                                    )}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                            {visibleItems.length === 0 && (
                                <div className="text-center py-8 text-white/30 text-sm italic">
                                    {t('dashboard.noTasksForToday')}
                                </div>
                            )}
                         </div>

                         {/* Footer Progress */}
                         <div className="p-4 bg-white/5 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Progress</span>
                            <span className="text-sm font-bold text-indigo-400">
                                {visibleItems.filter(i => i.completed).length}/{visibleItems.length}
                            </span>
                         </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
