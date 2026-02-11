import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, subMonths, format, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { toLocalISOString } from '../../../utils/dateUtils';
import { TrendingUp, TrendingDown, Zap, Activity, X } from 'lucide-react';

interface HabitConsistencyChartProps {
    habits: Habit[];
}

type TimeFrame = 'WEEK' | 'MONTH' | 'YEAR';

export const HabitConsistencyChart: React.FC<HabitConsistencyChartProps> = ({ habits }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [timeframe, setTimeframe] = useState<TimeFrame>('WEEK');
    const [showStreakInfo, setShowStreakInfo] = useState(false);

    // --- 1. DATA CALCULATION ---
    const { chartData, stats, trend, todayStats } = useMemo(() => {
        const activeHabits = habits.filter(h => !h.archived);
        const totalHabits = activeHabits.length;
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        let data: any[] = [];
        let prevPeriodAvg = 0;
        
        const normalizeHistoryDate = (value: string) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) return toLocalISOString(parsed);
            return value.split('T')[0];
        };

        const getCompletionCount = (dateStr: string) => {
            return activeHabits.filter(h => 
                h.history?.some(hDate => normalizeHistoryDate(hDate) === dateStr)
            ).length;
        };

        // Today's Stats
        const todayCount = getCompletionCount(todayStr);
        const todayPercent = totalHabits > 0 ? Math.round((todayCount / totalHabits) * 100) : 0;
        const minForStreak = Math.ceil(totalHabits * 0.75); // 75% rule

        if (timeframe === 'WEEK') {
            // Last 7 days including today
            data = Array.from({ length: 7 }, (_, i) => {
                const date = subDays(now, 6 - i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getCompletionCount(dateStr);
                const percent = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0;
                
                return {
                    date,
                    dateStr,
                    count,
                    total: totalHabits,
                    percent,
                    label: format(date, 'EEE', { locale: es }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'EEEE d', { locale: es }),
                    isCurrent: isSameDay(date, now)
                };
            });

            // Calculate previous week average for trend
            let prevSum = 0;
            for(let i=1; i<=7; i++) {
                const d = subDays(now, 6 + 7 - i); // Shifted back 7 days
                const c = getCompletionCount(format(d, 'yyyy-MM-dd'));
                prevSum += totalHabits > 0 ? (c / totalHabits) : 0;
            }
            prevPeriodAvg = (prevSum / 7) * 100;

        } else if (timeframe === 'MONTH') {
            // Last 30 days
            data = Array.from({ length: 30 }, (_, i) => {
                const date = subDays(now, 29 - i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getCompletionCount(dateStr);
                const percent = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0;

                return {
                    date,
                    dateStr,
                    count,
                    total: totalHabits,
                    percent,
                    label: i % 5 === 0 ? format(date, 'd') : '',
                    fullLabel: format(date, 'd MMM', { locale: es }),
                    isCurrent: isSameDay(date, now)
                };
            });

             // Previous 30 days for trend
             let prevSum = 0;
             for(let i=1; i<=30; i++) {
                 const d = subDays(now, 29 + 30 - i);
                 const c = getCompletionCount(format(d, 'yyyy-MM-dd'));
                 prevSum += totalHabits > 0 ? (c / totalHabits) : 0;
             }
             prevPeriodAvg = (prevSum / 30) * 100;

        } else {
            // YEAR (Last 12 months)
            data = Array.from({ length: 12 }, (_, i) => {
                const date = subMonths(now, 11 - i);
                const monthStr = format(date, 'yyyy-MM');
                const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                const totalPossible = totalHabits * daysInMonth;
                
                let totalCompletedInMonth = 0;
                activeHabits.forEach(h => {
                    h.history?.forEach(hDate => {
                        if (normalizeHistoryDate(hDate).startsWith(monthStr)) totalCompletedInMonth++;
                    });
                });

                const percent = totalPossible > 0 ? Math.round((totalCompletedInMonth / totalPossible) * 100) : 0;

                return {
                    date,
                    dateStr: monthStr,
                    count: totalCompletedInMonth,
                    total: totalPossible,
                    percent,
                    label: format(date, 'MMM', { locale: es }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'MMMM yyyy', { locale: es }),
                    isCurrent: isSameMonth(date, now)
                };
            });
             // Previous year average (approx) -> just setting 0 for now as simple comp
             prevPeriodAvg = 0; 
        }

        // Stats Calculation
        const currentAvg = Math.round(data.reduce((acc, curr) => acc + curr.percent, 0) / data.length) || 0;
        const bestDay = Math.max(...data.map(d => d.percent));
        
        // Streak calculation: Consecutive days with >= 75% completion
        // Iterate backwards from yesterday (since today might not be over)
        // OR: Include today if completed? Usually streak includes today if done, or yesterday if today pending.
        // Let's count backwards from TODAY. If today < 75%, we check if yesterday was valid.
        // If today >= 75%, streak includes today.
        
        let currentStreak = 0;
        // We need a longer history for accurate streak if it goes beyond the chart. 
        // For now, we calculate based on the chart data window (which might be limited) or activeHabits history.
        // To be accurate, we should probably check day by day backwards from today using getCompletionCount.
        
        let streakCheckDate = now;
        while (true) {
            const dateStr = format(streakCheckDate, 'yyyy-MM-dd');
            const count = getCompletionCount(dateStr);
            const percent = totalHabits > 0 ? (count / totalHabits) * 100 : 0;
            
            // If it's today and not yet completed, don't break streak, just don't count it yet?
            // User requirement: "complete 75% ... to count the streak".
            // So if today is 40%, streak is effectively paused or potentially broken if not done by end of day.
            // Usually apps show "Current Streak" as the number of consecutive days COMPLETED.
            // So if today is not done, streak is from yesterday.
            
            if (percent >= 75) {
                currentStreak++;
                streakCheckDate = subDays(streakCheckDate, 1);
            } else {
                if (isSameDay(streakCheckDate, now)) {
                    // Today not done yet, check yesterday
                    streakCheckDate = subDays(streakCheckDate, 1);
                    continue;
                }
                break; // Break on first non-75% day (that isn't today)
            }
            
            // Safety break for loop
            if (currentStreak > 365) break; 
        }

        const trendValue = currentAvg - Math.round(prevPeriodAvg);

        return {
            chartData: data,
            stats: {
                average: currentAvg,
                best: bestDay,
                streak: currentStreak,
                totalHabits
            },
            trend: trendValue,
            todayStats: {
                count: todayCount,
                total: totalHabits,
                percent: todayPercent,
                minForStreak
            }
        };
    }, [habits, timeframe]);

    // Color logic for the progress bar
    const getProgressColor = (percent: number) => {
        if (percent >= 80) return 'bg-emerald-500'; // Green
        if (percent >= 30) return 'bg-yellow-500';  // Yellow
        return 'bg-rose-500';                       // Red
    };

    const getProgressColorText = (percent: number) => {
        if (percent >= 80) return 'text-emerald-400';
        if (percent >= 30) return 'text-yellow-400';
        return 'text-rose-400';
    };

    return (
        <div className="w-full bg-[#0a0a0a]/60 backdrop-blur-md rounded-[32px] p-4 border border-white/5 shadow-2xl overflow-hidden relative group">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -z-10 pointer-events-none" />

            {/* --- HEADER --- */}
            <div className="flex flex-col gap-2 mb-2">
                {/* Row 1: Title & Controls */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-emerald-400" />
                        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Rendimiento</h3>
                    </div>

                    {/* Controls - Compact */}
                    <div className="flex p-0.5 rounded-full bg-zinc-900/80 border border-white/10 relative scale-95 origin-right">
                        {(['WEEK', 'MONTH', 'YEAR'] as TimeFrame[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={cn(
                                    "relative px-3 py-1 rounded-full text-[9px] font-bold transition-all duration-300 z-10",
                                    timeframe === tf ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {timeframe === tf && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white/10 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-white/5"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                {tf === 'WEEK' ? 'SEMANA' : tf === 'MONTH' ? 'MES' : 'AÑO'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Stats */}
                <div className="flex items-center gap-6">
                    {/* Average Percent */}
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-mono font-bold text-white tracking-tighter">
                            {stats.average}%
                        </span>
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border",
                            trend >= 0 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}>
                            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(trend)}%
                        </div>
                    </div>

                    {/* Current Streak */}
                    <div 
                        onClick={() => setShowStreakInfo(true)}
                        className="cursor-pointer group/streak flex flex-col items-start"
                    >
                        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mb-0.5 group-hover/streak:text-amber-400 transition-colors">
                            Racha Actual
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap size={18} className="text-amber-400 fill-amber-400/20" />
                            <span className="text-xl font-bold text-white group-hover/streak:text-amber-100 transition-colors">
                                {stats.streak} <span className="text-sm font-normal text-zinc-500">días</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- COMPACT CHART AREA --- */}
            <div className="h-32 flex items-end justify-between gap-1 relative mb-2">
                {/* Horizontal Guidelines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[100, 50, 0].map((val) => (
                        <div key={val} className="w-full border-t border-white/5 relative h-0">
                            <span className="absolute -top-2 -left-0 text-[9px] text-zinc-700 font-mono">{val}%</span>
                        </div>
                    ))}
                </div>

                {chartData.map((data, i) => (
                    <div 
                        key={data.dateStr} 
                        className="flex-1 h-full flex flex-col justify-end items-center group/bar relative z-10"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {/* Tooltip */}
                        <AnimatePresence>
                            {hoveredIndex === i && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-2xl z-50 min-w-[100px]"
                                >
                                    <div className="text-[10px] text-zinc-400 font-medium mb-1 uppercase tracking-wider">{data.fullLabel}</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-lg font-bold text-white">{data.percent}%</div>
                                        <div className="text-[10px] text-zinc-500">
                                            ({data.count}/{data.total})
                                        </div>
                                    </div>
                                    {/* Mini indicator */}
                                    <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full" 
                                            style={{ width: `${data.percent}%` }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* The Bar */}
                        <div className="w-full px-[2px] h-full flex items-end relative overflow-hidden">
                             {/* Hover Highlight */}
                             <motion.div 
                                className="absolute inset-x-0 bottom-0 bg-white/5 rounded-t-lg origin-bottom"
                                style={{ height: '100%' }}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: hoveredIndex === i ? 1 : 0 }}
                                transition={{ duration: 0.2 }}
                            />

                            <motion.div
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: Math.max(data.percent, 4) / 100 }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 180, 
                                    damping: 24, 
                                    delay: i * 0.03 
                                }}
                                style={{ height: '100%' }}
                                className={cn(
                                    "w-full rounded-t-sm relative overflow-hidden transition-all duration-300 origin-bottom",
                                    data.isCurrent 
                                        ? "bg-gradient-to-t from-emerald-500 to-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                                        : "bg-gradient-to-t from-zinc-700 to-zinc-600 opacity-60 hover:opacity-100"
                                )}
                            >
                                {/* Glass Reflection */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                            </motion.div>
                        </div>

                        {/* Label */}
                        <div className="h-6 flex items-center justify-center mt-2">
                            <span className={cn(
                                "text-[9px] font-bold transition-colors duration-300",
                                data.isCurrent ? "text-emerald-400" : "text-zinc-600 group-hover/bar:text-zinc-400"
                            )}>
                                {data.label}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- NEW FOOTER: DAILY GOAL & PROGRESS --- */}
            <div className="pt-2 border-t border-white/5 mt-1">
                <div className="flex justify-between items-end mb-1">
                     <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wide">Objetivo Diario</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-base font-bold", getProgressColorText(todayStats.percent))}>
                                {todayStats.count}/{todayStats.total}
                            </span>
                            <span className="text-[10px] text-zinc-600">completados</span>
                        </div>
                    </div>
                    <div className="text-right">
                         <span className="text-[9px] text-zinc-500">
                            {todayStats.percent >= 75 ? '¡Racha asegurada!' : `Faltan ${Math.max(0, todayStats.minForStreak - todayStats.count)} para racha`}
                        </span>
                    </div>
                </div>

                {/* Progress Bar with 75% Marker */}
                <div className="relative h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                    {/* 75% Marker Line */}
                        <div className="absolute top-0 bottom-0 w-[2px] bg-white/20 z-10" style={{ left: '75%' }} />
                        
                        {/* Progress */}
                        <motion.div 
                            className={cn("h-full rounded-full transition-colors duration-500 origin-left", getProgressColor(todayStats.percent))}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: todayStats.percent / 100 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            style={{ width: '100%' }}
                        />
                    </div>
            </div>

            {/* --- STREAK INFO MODAL --- */}
            <AnimatePresence>
                {showStreakInfo && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowStreakInfo(false)}
                            className="absolute inset-0 bg-black/80"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative z-10"
                        >
                            <button 
                                onClick={() => setShowStreakInfo(false)}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                            
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                    <Zap size={32} className="text-amber-400" />
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Sistema de Racha</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Para mantener tu racha, debes completar al menos el <span className="text-emerald-400 font-bold">75%</span> de tus hábitos activos cada día.
                                    </p>
                                </div>

                                <div className="w-full bg-zinc-900 rounded-xl p-4 border border-white/5">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-zinc-500">Mínimo hoy:</span>
                                        <span className="text-white font-bold">{todayStats.minForStreak} hábitos</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Tu progreso:</span>
                                        <span className={cn("font-bold", getProgressColorText(todayStats.percent))}>
                                            {todayStats.count}/{todayStats.total} ({todayStats.percent}%)
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setShowStreakInfo(false)}
                                    className="w-full py-2.5 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                                >
                                    Entendido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
