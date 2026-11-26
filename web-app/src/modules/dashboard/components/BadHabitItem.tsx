import React from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from '@/utils/lucideRegistry';
import { Scissors, Skull, Sparkles, Target, MoreVertical, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BadHabit, Attribute } from '../../../types';

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

// ─────────────────────────────────────────────────────────────────────────────
// A THIN, ONE-ROW CARD (same weight as a habit row). Why it is built this way:
//
//   [tile] [title / one meta line]            [actions] [⋮]
//
// The previous card put badges, a streak pill and three 48px buttons in the same
// row, so on a phone the title collapsed to 0px, the pill wrapped to three lines
// and overlapped the "−" button, and the tile had no size at all (`w-13` is not a
// Tailwind v3 class). The rules that keep this one from breaking again:
//   • only ONE flexible column (`flex-1 min-w-0`), everything else is `shrink-0`
//     with a fixed size written as an arbitrary value (`w-[34px]`);
//   • text is always `truncate` and the meta line is `whitespace-nowrap`,
//     so nothing wraps into extra lines or grows the card;
//   • extra info never adds a row: progress is a 2px line on the card's edge.
// ─────────────────────────────────────────────────────────────────────────────

export const BadHabitItem: React.FC<BadHabitItemProps> = ({
    habit,
    attributes,
    attribute,
    onRelapse,
    onShowActions,
    onUpdateDynamicBalance
}) => {
    const { t } = useTranslation();
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
    const isIntelligent = !!habit.intelligentStreak;
    const isDynamic = !!habit.isDynamic;
    const currentTarget = habit.currentTarget || 3;
    const reachedDays = habit.reachedDays || 0;
    const balance = habit.dynamicBalance ?? 0;
    const isOpportunityDay = isIntelligent && reachedDays === currentTarget;

    const traitLabel = React.useMemo(() => {
        const first = resolvedAttributes[0];
        const raw = first?.label || habit.attribute || '';
        return raw.replace('traits.', '').toUpperCase();
    }, [resolvedAttributes, habit.attribute]);

    const potentialEndOfDayTp = React.useMemo(() => {
        const exceedAmount = balance > 0 ? balance : 0;
        return exceedAmount * getDifficultyDelta(habit);
    }, [habit, balance]);

    // Green when the habit is under control, red when it is not.
    let isGood: boolean;
    if (isDynamic) isGood = habit.dynamicTargetType === 'positive' ? balance > 0 : balance >= 0;
    else isGood = !isRelapsed;

    const showDynamicControls = isDynamic && !isRelapsed;
    const showRelapseButton = !isRelapsed && !isDynamic;
    const progress = isIntelligent && !isRelapsed ? Math.min((reachedDays / currentTarget) * 100, 100) : 0;

    const adjustBalance = (delta: number) => (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateDynamicBalance?.(habit, balance + delta);
    };

    const streakText = t('habits.shortDays', '{{count}} d', { count: habit.streak });

    return (
        <div
            className="group relative overflow-hidden rounded-2xl border transition-colors duration-200"
            style={{
                backgroundColor: isGood ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.08)',
                borderColor: isGood ? 'rgba(16, 185, 129, 0.40)' : 'rgba(244, 63, 94, 0.5)',
                contentVisibility: 'auto',
                containIntrinsicSize: 'auto 52px',
            }}
        >
            {isIntelligent && !isRelapsed && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,_rgba(139,92,246,0.10)_0%,_transparent_55%)]" />
            )}

            <div className="relative flex items-center gap-2.5 px-2.5 py-2">
                {/* tile */}
                <div
                    style={{
                        backgroundColor: isRelapsed ? undefined : `${color}18`,
                        borderColor: isRelapsed ? undefined : `${color}30`,
                    }}
                    className={`relative flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl border ${
                        isRelapsed ? 'border-rose-500/25 bg-rose-500/10'
                            : isDynamic ? 'border-cyan-400/30 bg-cyan-500/10'
                                : isIntelligent ? 'border-violet-400/30 bg-violet-500/10'
                                    : ''
                    }`}
                >
                    {isRelapsed ? (
                        <Skull size={18} className="text-rose-500" />
                    ) : CustomIcon ? (
                        <CustomIcon size={18} style={{ color }} />
                    ) : isDynamic ? (
                        <Scale size={18} className="text-cyan-400" />
                    ) : isIntelligent ? (
                        <Sparkles size={18} className="text-violet-400" />
                    ) : (
                        <Skull size={17} style={{ color }} />
                    )}
                    {/* kind marker: a dot on the corner instead of a badge that needs a row */}
                    {!isRelapsed && (isDynamic || isIntelligent) && (
                        <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-black/40 ${isDynamic ? 'bg-cyan-400' : 'bg-violet-400'}`} />
                    )}
                </div>

                {/* title + ONE meta line */}
                <div className="min-w-0 flex-1">
                    <h4 className={`truncate text-[14px] font-bold leading-tight tracking-tight ${
                        isRelapsed ? 'text-rose-400 line-through' : isDynamic ? 'text-cyan-100' : isIntelligent ? 'text-violet-100' : 'text-white'
                    }`}>
                        {habit.title}
                    </h4>
                    <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold leading-none">
                        {isRelapsed ? (
                            <span className="text-rose-500 uppercase tracking-wider">{t('badHabits.relapsed', 'RECAÍDA')}</span>
                        ) : (
                            <>
                                <span className="inline-flex shrink-0 items-center gap-0.5 text-orange-400">
                                    <LucideIcons.Flame size={10} /> {streakText}
                                </span>
                                {isDynamic && (
                                    <span className={`shrink-0 tabular-nums ${potentialEndOfDayTp > 0 ? 'text-emerald-400' : 'text-white/35'}`}>
                                        · +{potentialEndOfDayTp} TP
                                    </span>
                                )}
                                {isIntelligent && !isDynamic && (
                                    <span className={`inline-flex shrink-0 items-center gap-0.5 tabular-nums ${isOpportunityDay ? 'text-amber-300' : 'text-violet-300'}`}>
                                        · <Target size={9} /> {reachedDays}/{currentTarget}
                                    </span>
                                )}
                                {!isDynamic && !isIntelligent && traitLabel && (
                                    <span className="min-w-0 truncate font-black tracking-wider text-white/35">· {traitLabel}</span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* actions: fixed boxes, never squeeze the title */}
                <div className="flex shrink-0 items-center gap-1">
                    {showDynamicControls && (
                        <>
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={adjustBalance(-1)}
                                className="flex h-[32px] w-[32px] items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 transition-colors active:bg-rose-500 active:text-white"
                                title={t('badHabits.slip', 'Desliz')}
                                aria-label={t('badHabits.slip', 'Desliz')}
                            >
                                <LucideIcons.Minus size={16} />
                            </motion.button>
                            <div className={`inline-flex h-[32px] min-w-[34px] items-center justify-center rounded-xl border px-1.5 text-[14px] font-black tabular-nums ${
                                balance < 0
                                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                    : balance === 0
                                        ? 'border-white/[0.08] bg-black/30 text-slate-300'
                                        : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                            }`}>
                                {balance > 0 ? `+${balance}` : balance}
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={adjustBalance(1)}
                                className="flex h-[32px] w-[32px] items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-colors active:bg-emerald-500 active:text-white"
                                title={t('badHabits.moralVictory', 'Victoria Moral')}
                                aria-label={t('badHabits.moralVictory', 'Victoria Moral')}
                            >
                                <LucideIcons.Plus size={16} />
                            </motion.button>
                        </>
                    )}
                    {showRelapseButton && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRelapse(habit);
                            }}
                            className={`flex h-[32px] w-[32px] items-center justify-center rounded-xl border transition-colors active:scale-95 ${
                                isIntelligent
                                    ? 'border-violet-400/40 bg-violet-500/15 text-violet-300 active:bg-violet-500 active:text-white'
                                    : 'border-rose-500/25 bg-rose-500/10 text-rose-500 active:bg-rose-500 active:text-white'
                            }`}
                            title={isIntelligent ? t('badHabits.useOpportunityDay', "Usar día de oportunidad (no rompe racha)") : t('badHabits.cutStreak', "Cortar racha (Relapso)")}
                            aria-label={isIntelligent ? t('badHabits.useOpportunityDay', "Usar día de oportunidad (no rompe racha)") : t('badHabits.cutStreak', "Cortar racha (Relapso)")}
                        >
                            <Scissors size={15} />
                        </button>
                    )}
                    {onShowActions && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShowActions(habit);
                            }}
                            className="relative flex h-[32px] w-[22px] items-center justify-center text-white/35 transition-colors active:text-white before:absolute before:-inset-x-1 before:inset-y-0 before:content-['']"
                            aria-label={t('common.more', 'Más')}
                        >
                            <MoreVertical size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* intelligent-streak progress: a 2px line on the edge (no extra row) */}
            {progress > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]">
                    <motion.div
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className={`h-full rounded-r-full ${isOpportunityDay ? 'bg-amber-400' : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400'}`}
                    />
                </div>
            )}
        </div>
    );
};
