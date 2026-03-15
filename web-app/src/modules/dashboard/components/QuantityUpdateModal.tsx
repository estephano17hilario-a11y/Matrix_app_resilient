import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, X } from 'lucide-react';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';

interface QuantityUpdateModalProps {
    habit: Habit;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (habitId: string, data: Partial<Habit>) => void;
}

export const QuantityUpdateModal: React.FC<QuantityUpdateModalProps> = ({ habit, isOpen, onClose, onUpdate }) => {
    // Local state for immediate feedback
    const [value, setValue] = useState(habit.currentValue || 0);
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        if (isOpen) {
            setValue(habit.currentValue || 0);
        }
    }, [isOpen, habit.currentValue]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const target = habit.targetValue || 1;
    const isComplete = value >= target;

    const handleIncrement = () => {
        const newValue = value + 1;
        setValue(newValue);
        onUpdate(habit.id, { currentValue: newValue });
    };

    const handleDecrement = () => {
        const newValue = Math.max(0, value - 1);
        setValue(newValue);
        onUpdate(habit.id, { currentValue: newValue });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value) || 0;
        setValue(newValue);
    };

    const handleInputBlur = () => {
        setIsEditing(false);
        onUpdate(habit.id, { currentValue: value });
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
            onUpdate(habit.id, { currentValue: value });
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
                    {/* Darker, blurrier backdrop - NOW FULL SCREEN */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Window */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 40 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className={cn(
                            "relative w-full max-w-[340px] rounded-[2.5rem] p-8 overflow-hidden transition-all duration-500",
                            // Glassmorphism base
                            "bg-gray-900/90 border border-white/10",
                            // Conditional Styles when Complete
                            isComplete 
                                ? "shadow-[0_0_80px_-20px_rgba(16,185,129,0.3)] border-emerald-500/50" 
                                : "shadow-2xl shadow-black/50"
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                         {/* Subtle Background Glow */}
                         <div className={cn(
                             "absolute inset-0 opacity-20 transition-all duration-700 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10",
                             isComplete && "from-emerald-500/20 via-emerald-500/5 to-transparent opacity-100"
                         )} />

                         {/* Close Button - Minimalist */}
                         <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors z-20"
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>

                        <div className="relative z-10 flex flex-col items-center justify-center pt-2">
                            {/* Title - Small & Elegant */}
                            <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-center px-4 truncate w-full">
                                {habit.title}
                            </h3>

                            {/* Main Display - MASSIVE */}
                            <div className="flex items-end justify-center gap-2 mb-10 relative">
                                {isEditing ? (
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        value={value}
                                        onChange={handleInputChange}
                                        onBlur={handleInputBlur}
                                        onKeyDown={handleInputKeyDown}
                                        className={cn(
                                            "w-48 bg-transparent text-center outline-none border-b border-white/20 pb-2",
                                            "text-8xl font-thin tracking-tighter leading-none tabular-nums",
                                            isComplete ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "text-white"
                                        )}
                                    />
                                ) : (
                                    <motion.span 
                                        key={value}
                                        onClick={() => setIsEditing(true)}
                                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className={cn(
                                            "text-8xl font-thin tracking-tighter leading-none tabular-nums cursor-pointer hover:opacity-80 transition-opacity",
                                            isComplete ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "text-white"
                                        )}
                                    >
                                        {value}
                                    </motion.span>
                                )}
                                <span className="text-xl text-white/20 font-medium mb-2">
                                    / {target}
                                </span>
                            </div>

                            {/* Controls - iOS Style */}
                            <div className="flex items-center gap-8 w-full justify-center">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDecrement}
                                    className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center border border-white/5 group"
                                >
                                    <Minus size={32} className="text-white/40 group-hover:text-white transition-colors" strokeWidth={1.5} />
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleIncrement}
                                    className={cn(
                                        "w-20 h-20 rounded-full flex items-center justify-center border transition-all shadow-lg group",
                                        isComplete 
                                            ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/40 hover:bg-emerald-400" 
                                            : "bg-white text-black border-white/50 hover:bg-gray-200"
                                    )}
                                >
                                    {/* Fixed: Only render ONE Plus icon, and NO Check icon */}
                                    <Plus size={36} strokeWidth={isComplete ? 3 : 2} />
                                </motion.button>
                            </div>
                            
                            {/* Unit Label */}
                            {habit.unit && (
                                <div className="mt-8 text-white/20 text-xs font-medium uppercase tracking-widest">
                                    {habit.unit}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
