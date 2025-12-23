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
        for (let i = 0; i < habit.id.length; i++) {
            hash = habit.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
    }, [habit.id, attribute, habit.customColor]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all duration-300 backdrop-blur-md"
            style={{
                borderColor: habit.customColor ? `${habit.customColor}40` : undefined,
                boxShadow: habit.customColor ? `0 0 30px -10px ${habit.customColor}15, inset 0 0 20px -10px ${habit.customColor}10` : undefined
            }}
        >
            {/* Custom Gradient Background */}
            {habit.customColor && (
                <div 
                    className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                    style={{ 
                        background: `radial-gradient(circle at top right, ${habit.customColor}20, transparent 70%)`,
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

            <div className="relative p-4 flex flex-col gap-3">
                
                {/* Header: Compact */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/5 text-white/90 shadow-inner shrink-0"
                        >
                            {attribute?.icon ? <attribute.icon size={14} /> : <Flame size={14} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-sm font-semibold text-white tracking-tight leading-none truncate">
                                {habit.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                    <Flame size={10} className={cn("transition-colors", habit.streak > 0 ? "text-orange-400" : "text-slate-600")} />
                                    <span className={habit.streak > 0 ? "text-slate-300" : ""}>{habit.streak} streak</span>
                                </div>
                                <div className="w-0.5 h-2 rounded-full bg-white/10" />
                                <span className="text-[10px] text-slate-500 whitespace-nowrap">{habit.totalCompletions} done</span>
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
                            className="flex flex-col gap-3"
                        >
                            {/* Check Button - Compact */}
                            <div className="flex justify-center py-2">
                                <button
                                    onClick={(e) => onComplete(e, habit)}
                                    className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border relative overflow-hidden shrink-0",
                                        isCompleted 
                                            ? "text-white" 
                                            : "bg-white/5 border-white/10 text-white/20 hover:bg-white/10 hover:border-white/20"
                                    )}
                                    style={{
                                        backgroundColor: isCompleted ? color : undefined,
                                        borderColor: isCompleted ? color : undefined,
                                        boxShadow: isCompleted ? `0 0 20px ${color}60` : undefined
                                    }}
                                >
                                    <Check size={20} strokeWidth={4} className={cn("relative z-10 transition-transform duration-300", isCompleted ? "scale-100" : "scale-75 opacity-50")} />
                                    {isCompleted && (
                                        <motion.div 
                                            layoutId={`glow-${habit.id}`}
                                            className="absolute inset-0 bg-white blur-md opacity-20"
                                        />
                                    )}
                                </button>
                            </div>

                            {/* Heatmap Grid - Full Width, reduced dead space */}
                            <div className="w-full">
                                <HabitHeatmap 
                                    history={habit.history || []} 
                                    days={105} 
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
