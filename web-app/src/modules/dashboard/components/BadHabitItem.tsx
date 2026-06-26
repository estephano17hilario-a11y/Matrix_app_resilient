import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Scissors, Skull, Sparkles, Target, Calendar, MoreVertical, Scale } from 'lucide-react';
import { BadHabit, Attribute } from '../../../types';

const STREAK_TARGETS = [1, 3, 7, 14, 30, 60, 90, 130, 180, 240, 310, 365];

const getImpactLevel = (bh: BadHabit): number => {
    const match = bh.negativeImpact?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 3;
};

const getDifficultyDelta = (bh: BadHabit): number => {
    const level = getImpactLevel(bh);
    const deltas = [2, 3, 4, 5, 6];
    return deltas[level - 1] ?? 4;
};

interface BadHabitItemProps {
    habit: BadHabit;
    attributes?: Attribute[];
    attribute?: Attribute;
    onRelapse: (habit: BadHabit) => void;
    onShowActions?: (habit: BadHabit) => void;
    onUpdateDynamicBalance?: (habit: BadHabit, newBalance: number) => void;
}

export const BadHabitItem: React.FC<BadHabitItemProps> = ({
    habit,
    attributes,
    attribute,
    onRelapse,
    onShowActions,
    onUpdateDynamicBalance
}) => {
    const isRelapsed = habit.relapsedToday;
    const resolvedAttributes = React.useMemo(() => {
        if (!habit.attribute) return attribute ? [attribute] : [];
        const ids = habit.attribute.split(',').map(s => s.trim()).filter(Boolean);
        const list = ids.map(id => attributes?.find(a => a.id === id)).filter(Boolean) as Attribute[];
        if (list.length === 0 && attribute) return [attribute];
        return list;
    }, [habit.attribute, attributes, attribute]);

    const color = habit.customColor || resolvedAttributes[0]?.color || attribute?.color || '#f43f5e';
    const CustomIcon = React.useMemo(() => {
        if (!habit.iconName) return null;
        return (LucideIcons as any)[habit.iconName] || null;
    }, [habit.iconName]);
    const isIntelligent = habit.intelligentStreak;
    const currentTarget = habit.currentTarget || 3;
    const reachedDays = habit.reachedDays || 0;
    const subTrait = resolvedAttributes[0]?.subTraits?.find(st => st.id === habit.subAttribute);

    const traitName = React.useMemo(() => {
        const rawId = habit.attribute || 'TP';
        const cleanId = rawId.replace('traits.', '').toUpperCase();
        const dict: Record<string, string> = {
            'RESILIENCIA': 'Resiliencia',
            'DISCIPLINA': 'Disciplina',
            'FZA_VOLUNTAD': 'Fuerza de Voluntad',
            'VOLUNTAD': 'Fuerza de Voluntad',
            'FUERZA_VOLUNTAD': 'Fuerza de Voluntad',
            'FUERZA_DE_VOLUNTAD': 'Fuerza de Voluntad',
            'ENERGIA': 'Energía',
            'INTELIGENCIA': 'Inteligencia',
            'SALUD': 'Salud',
            'SALUD_FISICA': 'Salud Física',
            'ENFOQUE': 'Enfoque',
            'PRODUCTIVIDAD': 'Productividad'
        };
        return dict[cleanId] || cleanId;
    }, [habit.attribute]);

    const potentialEndOfDayTp = React.useMemo(() => {
        const balance = habit.dynamicBalance ?? 0;
        const exceedAmount = balance > 0 ? balance : 0;
        const delta = getDifficultyDelta(habit);
        return exceedAmount * delta;
    }, [habit]);

    const targetIndex = STREAK_TARGETS.indexOf(currentTarget);
    const isOpportunityDay = isIntelligent && reachedDays === currentTarget;
    const progress = isIntelligent ? Math.min((reachedDays / currentTarget) * 100, 100) : Math.min(habit.streak, 100);

    // Compute dynamic border and background styles based on status
    let isBadHabitGood = false;
    if (habit.isDynamic) {
        const balance = habit.dynamicBalance ?? 0;
        if (habit.dynamicTargetType === 'positive') {
            isBadHabitGood = balance > 0;
        } else {
            // neutral
            isBadHabitGood = balance >= 0;
        }
    } else {
        isBadHabitGood = !isRelapsed;
    }

    const dynamicBorderColor = isBadHabitGood 
        ? 'rgba(16, 185, 129, 0.45)' // green (emerald-500/45)
        : 'rgba(244, 63, 94, 0.5)';  // red (rose-500/50)

    const dynamicBgColor = isBadHabitGood
        ? 'rgba(16, 185, 129, 0.05)'  // subtle green
        : 'rgba(244, 63, 94, 0.08)';   // subtle red

    const wrapperStyle = {
        backgroundColor: dynamicBgColor,
        borderColor: dynamicBorderColor,
        contentVisibility: 'auto' as const,
        containIntrinsicSize: '140px'
    };

    const wrapperProps = {
        className: `group relative border rounded-[1.5rem] p-1 transition-all duration-200 overflow-hidden ${
            isBadHabitGood
                ? 'shadow-[0_0_15px_rgba(16,185,129,0.03)]'
                : 'shadow-[0_0_15px_rgba(244,63,94,0.05)]'
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
            <div className={`relative flex z-10 p-3 ${
                habit.isDynamic && !isRelapsed 
                    ? 'flex-col md:flex-row md:items-center gap-3 md:gap-4' 
                    : 'flex-row items-center gap-4'
            }`}>
                {/* Left part: Icon and text container */}
                <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <div
                        style={{
                            backgroundColor: isRelapsed ? undefined : `${color}18`,
                            borderColor: isRelapsed ? undefined : `${color}28`,
                        }}
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center border transition-transform flex-shrink-0 ${
                            isRelapsed
                                ? 'bg-rose-500/10 border-rose-500/20'
                                : habit.isDynamic
                                    ? 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-cyan-400/30'
                                    : isIntelligent
                                        ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-violet-400/30'
                                        : ''
                        }`}
                    >
                        {isRelapsed ? (
                            <Skull size={24} className="text-rose-500" />
                        ) : CustomIcon ? (
                            <div className="relative">
                                <CustomIcon size={22} style={{ color: color }} />
                                {isIntelligent && (
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
                                )}
                                {habit.isDynamic && (
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                )}
                            </div>
                        ) : habit.isDynamic ? (
                            <Scale size={22} className="text-cyan-400 animate-pulse" />
                        ) : isIntelligent ? (
                            <div className="relative">
                                <Sparkles size={22} className="text-violet-400" />
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
                            </div>
                        ) : (
                            <Skull size={20} style={{ color: color }} />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h4 className={`font-bold text-[14px] tracking-tight truncate ${isRelapsed ? 'text-rose-400 line-through' : habit.isDynamic ? 'text-cyan-200' : isIntelligent ? 'text-violet-200' : 'text-white'}`}>
                                {habit.title}
                            </h4>
                            {isIntelligent && !isRelapsed && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/20 border border-violet-400/30 rounded-full">
                                    <Sparkles size={9} className="text-violet-300" />
                                    <span className="text-[8px] font-bold text-violet-200 uppercase tracking-wider">AI</span>
                                </div>
                            )}
                            {habit.isDynamic && !isRelapsed && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-400/30 rounded-full">
                                    <Scale size={9} className="text-cyan-300 animate-pulse" />
                                    <span className="text-[8px] font-bold text-cyan-200 uppercase tracking-wider">DINÁMICO</span>
                                </div>
                            )}
                        </div>

                        {habit.isDynamic && !isRelapsed ? (
                            <div className="space-y-1">
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <Target size={12} className="text-cyan-400" />
                                        <span className="text-[11px] font-semibold text-cyan-300/80">
                                            Meta: {habit.dynamicTargetType === 'neutral' ? '>= 0' : '> 0'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-white/35 font-medium">
                                        {habit.streak} día{habit.streak !== 1 ? 's' : ''} de racha
                                    </div>
                                </div>
                                <div className="text-[10px] text-cyan-300/80 font-semibold flex items-center gap-1 mt-0.5">
                                    <span className="opacity-60">Al final del día:</span>
                                    <span className={potentialEndOfDayTp > 0 ? "text-emerald-400 font-extrabold" : "text-white/30"}>
                                        +{potentialEndOfDayTp} TP ({traitName})
                                    </span>
                                </div>
                            </div>
                        ) : isIntelligent && !isRelapsed ? (
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
                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
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
                                                className={`h-1.5 rounded-full transition-all duration-200 ${
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
                                {resolvedAttributes.map(attr => {
                                    const attrColor = attr.color || '#f43f5e';
                                    return (
                                        <div
                                            key={attr.id}
                                            style={{
                                                borderColor: isRelapsed ? undefined : `${attrColor}18`,
                                                backgroundColor: isRelapsed ? undefined : `${attrColor}08`,
                                                color: isRelapsed ? undefined : '#94a3b8'
                                            }}
                                            className="flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md border border-white/5 bg-white/5 text-slate-500"
                                        >
                                            {attr.label?.replace('traits.', '').toUpperCase()}
                                            {resolvedAttributes.length === 1 && subTrait && ` › ${subTrait.name.toUpperCase()}`}
                                        </div>
                                    );
                                })}
                                {resolvedAttributes.length === 0 && (
                                    <div
                                        className="flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md border border-white/5 bg-white/5 text-slate-500"
                                    >
                                        HABIT
                                    </div>
                                )}
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
                </div>

                {/* Right part: Action buttons */}
                <div className={`flex items-center gap-2.5 z-10 flex-shrink-0 ${
                    habit.isDynamic && !isRelapsed 
                        ? 'w-full justify-between md:w-auto md:justify-end border-t border-white/5 pt-2 md:border-t-0 md:pt-0' 
                        : ''
                }`}>
                    {habit.isDynamic && !isRelapsed && (
                        <div className="flex items-center gap-2 mr-1">
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onUpdateDynamicBalance) {
                                        const current = habit.dynamicBalance ?? 0;
                                        const newBalance = current - 1;
                                        onUpdateDynamicBalance(habit, newBalance);
                                    }
                                }}
                                className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all hover:shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                                title="Desliz"
                            >
                                <LucideIcons.Minus size={24} />
                            </motion.button>

                            <div className={`px-4 py-2.5 rounded-2xl text-base font-black tracking-wider border transition-all duration-300 min-w-[58px] text-center shadow-inner ${
                                (habit.dynamicBalance ?? 0) < 0
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                                    : (habit.dynamicBalance ?? 0) === 0
                                        ? 'bg-[#0d0d0f]/60 border-white/[0.08] text-slate-300'
                                        : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse'
                            }`}>
                                {(habit.dynamicBalance ?? 0) > 0 ? `+${habit.dynamicBalance}` : habit.dynamicBalance ?? 0}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onUpdateDynamicBalance) {
                                        const current = habit.dynamicBalance ?? 0;
                                        const newBalance = current + 1;
                                        onUpdateDynamicBalance(habit, newBalance);
                                    }
                                }}
                                className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                title="Victoria Moral"
                            >
                                <LucideIcons.Plus size={24} />
                            </motion.button>
                        </div>
                    )}
                    {!isRelapsed && !habit.isDynamic && (
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
                            <Scissors size={18} className="group-hover/cut:rotate-90 transition-transform duration-200" />
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
