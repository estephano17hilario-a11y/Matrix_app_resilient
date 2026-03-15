import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';

interface ChecklistModalProps {
    habit: Habit;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (habitId: string, data: Partial<Habit>) => void;
    onComplete: (e: React.MouseEvent, h: Habit) => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({ habit, isOpen, onClose, onUpdate, onComplete }) => {
    
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

    const handleChecklistToggle = (itemId: string, currentStatus: boolean) => {
        if (!onUpdate || !habit.checklist) return;
        const newChecklist = habit.checklist.map(item => 
            item.id === itemId ? { ...item, completed: !currentStatus } : item
        );
        
        const allCompleted = newChecklist.every(item => item.completed);
        
        onUpdate(habit.id, { checklist: newChecklist });
        
        const updatedHabit = { ...habit, checklist: newChecklist };

        if (allCompleted && !habit.completedToday) {
            onComplete({ stopPropagation: () => {} } as React.MouseEvent, updatedHabit);
        } 
        else if (!allCompleted && habit.completedToday) {
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
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="relative w-full max-w-sm bg-[#0b0b0d] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl z-10"
                        onClick={e => e.stopPropagation()}
                    >
                         {/* Header */}
                         <div className="p-6 pb-2 flex items-start justify-between">
                            <h3 className="text-xl font-bold text-white leading-tight pr-4">
                                {habit.title}
                            </h3>
                            <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                         </div>

                         {/* List */}
                         <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            {habit.checklist?.map(item => (
                                <div 
                                    key={item.id} 
                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                                    onClick={() => handleChecklistToggle(item.id, item.completed)}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                        item.completed 
                                            ? "bg-indigo-500 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                            : "border-white/20 group-hover:border-white/40 bg-transparent"
                                    )}>
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
                         </div>

                         {/* Footer Progress */}
                         <div className="p-4 bg-white/5 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Progress</span>
                            <span className="text-sm font-bold text-indigo-400">
                                {habit.checklist?.filter(i => i.completed).length}/{habit.checklist?.length}
                            </span>
                         </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
