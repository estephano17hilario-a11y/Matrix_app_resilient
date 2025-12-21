import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Trash2, Edit2 } from 'lucide-react';
import { Habit, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { HabitHeatmap } from './HabitHeatmap';

interface HabitVisualCardProps {
    habit: Habit;
    attribute?: Attribute;
    onComplete: (e: React.MouseEvent, h: Habit) => void;
    onDelete?: (id: string) => void;
    onEdit?: (habit: Habit) => void;
}

export const HabitVisualCard: React.FC<HabitVisualCardProps> = ({ habit, attribute, onComplete, onDelete, onEdit }) => {
    const isCompleted = habit.completedToday;
    
    // Apple/HabitKit Neon Palette - Refined for "Glass" look
    const NEON_COLORS = ['#d946ef', '#facc15', '#3b82f6', '#4ade80', '#f472b6', '#60a5fa'];
    
    const color = useMemo(() => {
        if (attribute?.color) return attribute.color;
        let hash = 0;
        for (let i = 0; i < habit.id.length; i++) {
            hash = habit.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
    }, [habit.id, attribute]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all duration-300 backdrop-blur-md"
        >
            {/* Subtle Ambient Glow - Reduced opacity */}
            <div 
                className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none transition-colors duration-500"
                style={{ backgroundColor: color }} 
            />

            {/* Action Buttons (Visible on Hover) */}
            <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(habit);
                        }}
                        className="p-2 rounded-full bg-black/20 text-white/20 hover:text-white hover:bg-black/40 transition-all duration-200"
                        title="Edit Habit"
                    >
                        <Edit2 size={16} />
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
                        className="p-2 rounded-full bg-black/20 text-white/20 hover:text-red-400 hover:bg-black/40 transition-all duration-200"
                        title="Delete Habit"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="relative p-6 flex flex-col gap-6">
                
                {/* Header: Icon, Title, Check */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 text-white/90 shadow-inner"
                        >
                            {attribute?.icon ? <attribute.icon size={20} /> : <Flame size={20} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white tracking-tight leading-snug">
                                {habit.title}
                            </h3>
                            <div className="text-sm text-slate-400 font-medium">
                                {habit.description || habit.frequency}
                            </div>
                        </div>
                    </div>
                    
                    {/* Check Button - iOS Style Toggle */}
                    <button
                        onClick={(e) => onComplete(e, habit)}
                        className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border relative overflow-hidden",
                            isCompleted 
                                ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
                                : "bg-white/5 border-white/10 text-white/20 hover:bg-white/10 hover:border-white/20"
                        )}
                    >
                        <Check size={20} strokeWidth={4} className={cn("relative z-10 transition-transform duration-300", isCompleted ? "scale-100" : "scale-75 opacity-50")} />
                        {isCompleted && (
                            <motion.div 
                                layoutId={`glow-${habit.id}`}
                                className="absolute inset-0 bg-white blur-md opacity-50"
                            />
                        )}
                    </button>
                </div>

                {/* Heatmap Grid - Cleaner container */}
                <div className="w-full">
                    <HabitHeatmap 
                        history={habit.history || []} 
                        days={105} 
                        color={color} 
                    />
                </div>
                
                {/* Footer Stats - Minimalist */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500/80 px-1 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                        <Flame size={12} className={cn("transition-colors", habit.streak > 0 ? "text-orange-400" : "text-slate-600")} />
                        <span className={habit.streak > 0 ? "text-slate-300" : ""}>{habit.streak} day streak</span>
                    </div>
                    <div className="w-0.5 h-3 rounded-full bg-white/10" />
                    <div>{habit.totalCompletions} completions</div>
                </div>
            </div>
        </motion.div>
    );
};
