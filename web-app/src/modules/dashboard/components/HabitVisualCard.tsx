import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Flame, Trash2, Edit2 } from 'lucide-react';
import { Habit, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { HabitHeatmap } from './HabitHeatmap';
import { HabitWeekView } from './HabitWeekView';

interface HabitVisualCardProps {
    habit: Habit;
    viewMode?: 'GRID' | 'WEEK';
    attribute?: Attribute;
    onComplete: (e: React.MouseEvent, h: Habit) => void;
    onToggleDay: (h: Habit, date: string) => void;
    onDelete?: (id: string) => void;
    onEdit?: (habit: Habit) => void;
}

export const HabitVisualCard: React.FC<HabitVisualCardProps> = ({ habit, viewMode = 'GRID', attribute, onComplete, onToggleDay, onDelete, onEdit }) => {
    const isCompleted = habit.completedToday;
    
    // Apple/HabitKit Neon Palette - Refined for "Glass" look
    const NEON_COLORS = ['#d946ef', '#facc15', '#3b82f6', '#4ade80', '#f472b6', '#60a5fa'];
    
    const color = useMemo(() => {
        if (habit.customColor) return habit.customColor;
        if (attribute?.color) return attribute.color;
        let hash = 0;
        const safeId = habit.id || 'default';
        for (let i = 0; i < safeId.length; i++) {
            hash = safeId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
    }, [habit.id, attribute, habit.customColor]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-white/30 transition-all duration-300 backdrop-blur-xl shadow-2xl shadow-black/40"
            style={{
                borderColor: habit.customColor ? `${habit.customColor}60` : undefined,
                boxShadow: habit.customColor ? `0 0 40px -10px ${habit.customColor}20, inset 0 0 20px -10px ${habit.customColor}10` : undefined
            }}
        >
            {/* Custom Gradient Background - Stronger */}
            {habit.customColor && (
                <div 
                    className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                    style={{ 
                        background: `linear-gradient(135deg, ${habit.customColor}20, transparent 80%)`,
                        opacity: 0.6
                    }}
                />
            )}

            {/* Subtle Ambient Glow - Reduced opacity */}
            <div 
                className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none transition-colors duration-500"
                style={{ backgroundColor: color }} 
            />

            {/* Action Buttons (Visible on Hover) */}
            <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(habit);
                        }}
                        className="p-1.5 rounded-full bg-black/40 text-white/50 hover:text-white hover:bg-black/60 transition-all duration-200 backdrop-blur-md border border-white/10"
                        title="Edit Habit"
                    >
                        <Edit2 size={12} />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this habit?')) {
                                onDelete(habit.id);
                            }
                        }}
                        className="p-1.5 rounded-full bg-black/40 text-white/50 hover:text-red-400 hover:bg-black/60 transition-all duration-200 backdrop-blur-md border border-white/10"
                        title="Delete Habit"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <div className="relative p-5 flex flex-col gap-4">
                
                {/* Header: Clean & Apple-like */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/10 border border-white/10 text-white/90 shadow-sm shrink-0 backdrop-blur-sm"
                        >
                            {attribute?.icon ? <attribute.icon size={18} /> : <Flame size={18} />}
                        </div>
                        <div className="flex flex-col min-w-0 gap-0.5">
                            <h3 className="text-base font-medium text-white tracking-tight leading-none truncate">
                                {habit.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-medium whitespace-nowrap">
                                    <Flame size={11} className={cn("transition-colors", habit.streak > 0 ? "text-orange-400" : "text-white/30")} />
                                    <span className={habit.streak > 0 ? "text-white/80" : ""}>{habit.streak} streak</span>
                                </div>
                                <div className="w-0.5 h-2 rounded-full bg-white/10" />
                                <span className="text-[11px] text-white/50 whitespace-nowrap">{habit.totalCompletions} done</span>
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'GRID' ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-4"
                        >
                            {/* Check Button - Apple Style (Larger, Cleaner) */}
                            <div className="flex justify-center py-1">
                                <button
                                    onClick={(e) => onComplete(e, habit)}
                                    className={cn(
                                        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border relative overflow-hidden shrink-0 group/btn",
                                        isCompleted 
                                            ? "text-white border-transparent" 
                                            : "bg-white/5 border-white/10 text-white/20 hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95"
                                    )}
                                    style={{
                                        backgroundColor: isCompleted ? color : undefined,
                                        boxShadow: isCompleted ? `0 0 40px -10px ${color}80` : undefined
                                    }}
                                >
                                    <Check size={24} strokeWidth={3} className={cn("relative z-10 transition-all duration-300", isCompleted ? "scale-100" : "scale-75 opacity-40 group-hover/btn:opacity-60")} />
                                    {isCompleted && (
                                        <motion.div 
                                            layoutId={`glow-${habit.id}`}
                                            className="absolute inset-0 bg-white blur-xl opacity-30"
                                        />
                                    )}
                                </button>
                            </div>

                            {/* Heatmap Grid - Full Width, reduced dead space */}
                            <div className="w-full">
                                <HabitHeatmap 
                                    habit={habit}
                                    color={color} 
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="week"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="py-2"
                        >
                            <HabitWeekView 
                                history={habit.history || []}
                                activeColor={color}
                                onToggleDay={(date) => onToggleDay(habit, date)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
