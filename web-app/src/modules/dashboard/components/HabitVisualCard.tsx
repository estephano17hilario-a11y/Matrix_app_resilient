import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Edit2, Trash2, Check, Flame, Minus } from 'lucide-react';
import { Habit, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { ICON_CATEGORIES as SHARED_CATEGORIES } from '../constants/iconCategories';

interface HabitVisualCardProps {
    habit: Habit;
    viewMode?: 'GRID' | 'WEEK';
    attribute?: Attribute;
    onComplete: (e: React.MouseEvent, h: Habit) => void;
    onToggleDay: (h: Habit, date: string) => void;
    onDelete?: (id: string) => void;
    onEdit?: (habit: Habit) => void;
    onUpdateHabit?: (habitId: string, data: Partial<Habit>) => void;
    onClick?: (habit: Habit) => void;
}

const ICON_CATEGORIES = Object.entries(SHARED_CATEGORIES).map(([label, icons]) => ({
    id: label,
    label,
    icons
}));

export const HabitVisualCard: React.FC<HabitVisualCardProps> = ({ habit, viewMode = 'GRID', attribute, onComplete, onToggleDay: _onToggleDay, onDelete, onEdit, onUpdateHabit, onClick }) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    void _onToggleDay;

    const accentColor = useMemo(() => {
        if (habit.customColor) return habit.customColor;
        if (attribute?.color) return attribute.color;
        return '#3b82f6';
    }, [habit.customColor, attribute?.color]);

    const SelectedIcon = useMemo(() => {
        if (habit.iconName && (LucideIcons as any)[habit.iconName]) {
            return (LucideIcons as any)[habit.iconName];
        }
        return attribute?.icon || Flame;
    }, [habit.iconName, attribute?.icon]);

    const progress = useMemo(() => {
        if (habit.type === 'CHECKLIST') {
            const total = habit.checklist?.length || 0;
            const completed = habit.checklist?.filter(i => i.completed).length || 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            return {
                percent,
                detail: `${percent}% · ${completed}/${total}`,
                state: percent === 100 ? 'complete' : percent > 0 ? 'partial' : 'empty'
            };
        }
        if (habit.type === 'QUANTITY') {
            const total = habit.targetValue || 0;
            const current = habit.currentValue || 0;
            const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
            const detail = total > 0
                ? `${percent}% · ${Math.min(current, total)}/${total} ${habit.unit || ''}`.trim()
                : `${percent}% · ${current} ${habit.unit || ''}`.trim();
            return {
                percent,
                detail,
                state: percent === 100 ? 'complete' : percent > 0 ? 'partial' : 'empty'
            };
        }
        const percent = habit.completedToday ? 100 : 0;
        return {
            percent,
            detail: `${percent}%`,
            state: percent === 100 ? 'complete' : 'empty'
        };
    }, [habit.type, habit.checklist, habit.targetValue, habit.currentValue, habit.unit, habit.completedToday]);

    const checkboxClass = progress.state === 'complete'
        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
        : progress.state === 'partial'
            ? 'bg-yellow-500/15 border-yellow-400/40 text-yellow-300'
            : 'bg-white/5 border-white/10 text-white/40';

    const isWeek = viewMode === 'WEEK';

    return (
        <div
            className="group relative rounded-[28px] border border-white/[0.05] bg-[#050505]/80 hover:bg-[#0a0a0a]/85 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),inset_0_-1px_1px_rgba(0,0,0,0.3),0_10px_15px_-3px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04),inset_0_-1px_1px_rgba(0,0,0,0.4),0_5px_20px_rgba(0,0,0,0.4)] cursor-pointer hover:border-white/[0.1] active:scale-[0.98] transition-all duration-300 gpu-accelerated overflow-hidden"
            onClick={() => onClick?.(habit)}
        >
            {/* Radial Gradient Blur Background */}
            <div 
                className="absolute top-0 right-0 w-48 h-48 opacity-[0.30] pointer-events-none group-hover:opacity-[0.40] transition-opacity duration-500" 
                style={{ 
                    background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                    transform: 'translateZ(0)'
                }} 
            />

            {/* Streak Badge */}
            {habit.streak > 0 && (
                <div className={cn(
                    "absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors",
                    habit.completedToday
                        ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                        : "bg-[#0b0b0d] border-white/10 text-zinc-400"
                )}>
                    <Flame size={12} className={cn(
                        "transition-colors",
                        habit.completedToday ? "fill-orange-400" : "fill-zinc-500 text-zinc-500"
                    )} />
                    <span className="text-[11px] font-bold font-mono tracking-tight">{habit.streak}</span>
                </div>
            )}

            <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(habit);
                        }}
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors flex items-center justify-center"
                    >
                        <Edit2 size={14} />
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
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-red-300 transition-colors flex items-center justify-center"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <div className="relative flex items-center gap-4">
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsPickerOpen(true);
                        }}
                        className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 active:scale-95 transition-transform"
                        style={{ color: accentColor }}
                    >
                        <SelectedIcon size={25} strokeWidth={1.8} />
                    </button>
                    {isPickerOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-30"
                                onClick={(e) => { e.stopPropagation(); setIsPickerOpen(false); }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute left-0 top-full mt-3 z-40 w-[320px] rounded-[20px] bg-[#0b0b10] border border-white/10 shadow-2xl p-3"
                            >
                                <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1">
                                    {ICON_CATEGORIES.map(category => (
                                        <div key={category.id} className="space-y-2">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
                                                {category.label}
                                            </div>
                                            <div className="grid grid-cols-6 gap-2">
                                                {category.icons.map((iconName) => {
                                                    const Icon = (LucideIcons as any)[iconName];
                                                    const isActive = habit.iconName === iconName;
                                                    if (!Icon) return null;
                                                    return (
                                                        <button
                                                            key={iconName}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsPickerOpen(false);
                                                                onUpdateHabit?.(habit.id, { iconName });
                                                            }}
                                                            className={cn(
                                                                'w-9 h-9 rounded-xl border flex items-center justify-center transition-colors',
                                                                isActive ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                                            )}
                                                        >
                                                            <Icon size={16} strokeWidth={1.8} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </div>

                <div className="flex-1 text-center min-w-0">
                    <h3 className="text-[17px] font-semibold text-white tracking-tight truncate">
                        {habit.title}
                    </h3>
                    <div className="text-xs text-white/50 font-medium mt-1">
                        {attribute?.label || 'Rasgo'}
                    </div>
                </div>

                <button
                    onClick={(e) => onComplete(e, habit)}
                    className={cn(
                        'w-14 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-95',
                        checkboxClass
                    )}
                >
                    {progress.state === 'complete' ? (
                        <Check size={20} strokeWidth={3} />
                    ) : progress.state === 'partial' ? (
                        <Minus size={20} strokeWidth={2.5} />
                    ) : (
                        <div className="w-5 h-1 rounded-full bg-white/30" />
                    )}
                </button>
            </div>

            <div className={cn('relative mt-4 flex flex-col gap-2', isWeek ? 'opacity-90' : '')}>
                <div className="text-[11px] text-white/55 font-medium tracking-tight text-center">
                    <span className="font-mono text-white/75">{progress.detail}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                        className="h-full rounded-full origin-left transition-transform duration-300 ease-out"
                        style={{ 
                            backgroundColor: accentColor,
                            transform: `scaleX(${progress.percent / 100})`
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
