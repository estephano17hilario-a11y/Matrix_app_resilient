import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Skull, Sparkles, Target, Calendar, MoreVertical } from 'lucide-react';
import { BadHabit, Attribute } from '../../../types';

const STREAK_TARGETS = [1, 3, 7, 14, 30, 60, 90, 130, 180, 240, 310, 365];

interface BadHabitItemProps {
    habit: BadHabit;
    attribute?: Attribute;
    onRelapse: (habit: BadHabit) => void;
    onShowActions?: (habit: BadHabit) => void;
}

export const BadHabitItem: React.FC<BadHabitItemProps> = ({
    habit,
    attribute,
    onRelapse,
    onShowActions
}) => {
    const isRelapsed = habit.relapsedToday;
    const color = attribute?.color || '#10b981';
    const isIntelligent = habit.intelligentStreak;
    const currentTarget = habit.currentTarget || 3;
    const reachedDays = habit.reachedDays || 0;

    const targetIndex = STREAK_TARGETS.indexOf(currentTarget);
    const isOpportunityDay = isIntelligent && reachedDays === currentTarget;
    const progress = isIntelligent ? Math.min((reachedDays / currentTarget) * 100, 100) : Math.min(habit.streak, 100);

    const wrapperStyle = {
        backgroundColor: isRelapsed ? undefined : `${color}08`,
        borderColor: isRelapsed ? undefined : `${color}25`,
        contentVisibility: 'auto' as const,
        containIntrinsicSize: '140px'
    };

    const wrapperProps = {
        className: `group relative border rounded-[1.5rem] p-1 transition-all duration-200 overflow-hidden ${
            isRelapsed
                ? 'bg-rose-950/40 border-rose-500/20 opacity-80'
                : isIntelligent
                    ? 'bg-gradient-to-br from-violet-900/20 via-indigo-900/10 to-fuchsia-900/10 border-violet-500/20 hover:border-violet-500/40'
                    : 'bg-[#0b0b0d]/80 hover:bg-[#15151a]/80 border-white/5'
        }`,
        style: wrapperStyle
    };

    return (
        <div {...wrapperProps}>
            {isIntelligent && !isRelapsed && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[1.5rem]">
                    <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.08)_0%,_transparent_60%)]" />
                    <div className="absolute bottom-[-50%] right-[-20%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,_rgba(232,121,249,0.05)_0%,_transparent_60%)]" />
                </div>
            )}
            <div className="relative flex items-center p-3 gap-4 z-10">
                <div
                    style={{
                        backgroundColor: isRelapsed ? undefined : `${color}18`,
                        borderColor: isRelapsed ? undefined : `${color}28`,
                    }}
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center border transition-transform flex-shrink-0 ${
                        isRelapsed
                            ? 'bg-rose-500/10 border-rose-500/20'
                            : isIntelligent
                                ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-violet-400/30'
                                : ''
                    }`}
                >
                    {isRelapsed ? (
                        <Skull size={24} className="text-rose-500" />
                    ) : isIntelligent ? (
                        <div className="relative">
                            <Sparkles size={22} className="text-violet-400" />
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
                        </div>
                    ) : (
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color, color: color }}
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h4 className={`font-bold text-[14px] tracking-tight truncate ${isRelapsed ? 'text-rose-400 line-through' : isIntelligent ? 'text-violet-200' : 'text-white'}`}>
                            {habit.title}
                        </h4>
                        {isIntelligent && !isRelapsed && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/20 border border-violet-400/30 rounded-full">
                                <Sparkles size={9} className="text-violet-300" />
                                <span className="text-[8px] font-bold text-violet-200 uppercase tracking-wider">AI</span>
                            </div>
                        )}
                    </div>

                    {isIntelligent && !isRelapsed ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <Target size={12} className="text-violet-400" />
                                    <span className="text-[11px] font-bold text-violet-300">
                                        {currentTarget} días
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} className="text-emerald-400" />
                                    <span className="text-[11px] font-semibold text-emerald-300">
                                        {reachedDays}/{currentTarget}
                                    </span>
                                </div>
                            </div>

                            <div className="relative h-2 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-md">
                                <motion.div
                                    
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(217,70,239,0.6)]"
                                />
                                {isOpportunityDay && (
                                    <div className="absolute inset-0 bg-amber-400/30 animate-pulse" />
                                )}
                            </div>

                            <div className="flex items-center gap-1 overflow-hidden">
                                {STREAK_TARGETS.slice(0, 6).map((target, i) => {
                                    const isCurrentTarget = target === currentTarget;
                                    const isPastTarget = targetIndex > i;
                                    return (
                                        <div
                                            key={target}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                isPastTarget
                                                    ? 'w-4 bg-emerald-500/60'
                                                    : isCurrentTarget
                                                        ? 'w-6 bg-violet-500'
                                                        : 'w-2 bg-white/10'
                                            }`}
                                        />
                                    );
                                })}
                                {STREAK_TARGETS.length > 6 && (
                                    <span className="text-[8px] text-white/30 ml-0.5">...</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <div
                                style={{
                                    borderColor: isRelapsed ? undefined : `${color}18`,
                                    backgroundColor: isRelapsed ? undefined : `${color}08`,
                                    color: isRelapsed ? undefined : '#94a3b8'
                                }}
                                className="flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md border border-white/5 bg-white/5 text-slate-500"
                            >
                                {attribute?.label?.replace('traits.', '').toUpperCase() || 'HABIT'}
                            </div>
                            <div
                                style={{
                                    color: isRelapsed ? undefined : color,
                                    backgroundColor: isRelapsed ? undefined : `${color}12`
                                }}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isRelapsed
                                        ? 'text-rose-500 bg-rose-500/10'
                                        : isIntelligent
                                            ? 'text-violet-400 bg-violet-500/10'
                                            : ''
                                }`}
                            >
                                {isOpportunityDay
                                    ? '¡DÍA DE OPORTUNIDAD!'
                                    : isRelapsed
                                        ? 'RELAPSED'
                                        : `${habit.streak} DAY STREAK`}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 z-10">
                    {!isRelapsed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRelapse(habit);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95 ${
                                isIntelligent
                                    ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-400/40 text-violet-300 hover:from-violet-500 hover:to-fuchsia-500 hover:text-white hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]'
                                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-rose-500/30'
                            }`}
                            title={isIntelligent ? "Usar día de oportunidad (no rompe racha)" : "Cortar racha (Relapso)"}
                        >
                            <Scissors size={18} className="group-hover/cut:rotate-90 transition-transform duration-300" />
                        </button>
                    )}
                    {onShowActions && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShowActions(habit);
                            }}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <MoreVertical size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
