import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, subMonths, format, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, startOfYear, addMonths, addDays, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { toLocalISOString } from '../../../utils/dateUtils';
import { TrendingUp, TrendingDown, Zap, Calendar } from 'lucide-react';
import { DateSelectionModal, DateSelectionMode } from './DateSelectionModal';
import { useLux } from '@/context/LuxContext';
import { getAvatarConfig } from '@/config/avatars';

interface HabitConsistencyChartProps {
    habits: Habit[];
    onOpenStreak?: () => void;
    isActive?: boolean;
}

type TimeFrame = 'WEEK' | 'MONTH' | 'YEAR';

const getRequiredPercentForDay = (day: number) => {
    if (day <= 7) return 50;
    if (day <= 14) return 53;
    if (day <= 21) return 57;
    if (day <= 30) return 67;
    if (day <= 45) return 80;
    if (day <= 60) return 85;
    return 85;
};

export const HabitConsistencyChart: React.FC<HabitConsistencyChartProps> = ({ habits, onOpenStreak, isActive = true }) => {
    const { user } = useLux();
    const avatarConfig = getAvatarConfig(user?.avatarId);
    const themeColor = useMemo(() => {
        return avatarConfig?.themeColor || '#10b981';
    }, [avatarConfig?.themeColor]);

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [timeframe, setTimeframe] = useState<TimeFrame>('WEEK');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);

    useEffect(() => {
        if (isActive) {
            setTimeframe('WEEK');
            setCurrentDate(new Date());
        }
    }, [isActive]);

    const handleTabClick = (tf: TimeFrame) => {
        if (timeframe === tf) {
            setIsDateModalOpen(true);
        } else {
            setTimeframe(tf);
            setCurrentDate(new Date());
        }
    };

    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
    };

    // --- 1. DATA CALCULATION ---
    const { chartData, stats, trend, todayStats, dateRangeLabel } = useMemo(() => {
        const activeHabits = habits.filter(h => !h.archived);
        const totalHabits = activeHabits.length;
        const today = new Date();
        const viewDate = currentDate;
        const todayStr = format(today, 'yyyy-MM-dd');

        let data: any[] = [];
        let prevPeriodAvg = 0;

        const normalizeHistoryDate = (value: string) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) return toLocalISOString(parsed);
            return value.split('T')[0];
        };

        const completionByDate = new Map<string, number>();
        const completionByMonth = new Map<string, number>();

        activeHabits.forEach(h => {
            h.history?.forEach(hDate => {
                const normalized = normalizeHistoryDate(hDate);
                completionByDate.set(normalized, (completionByDate.get(normalized) || 0) + 1);
                const monthKey = normalized.slice(0, 7);
                completionByMonth.set(monthKey, (completionByMonth.get(monthKey) || 0) + 1);
            });
        });

        const getCompletionCount = (dateStr: string) => completionByDate.get(dateStr) || 0;

        // Today's Stats
        const todayCount = getCompletionCount(todayStr);
        const todayPercent = totalHabits > 0 ? Math.round((todayCount / totalHabits) * 100) : 0;

        if (timeframe === 'WEEK') {
            const start = viewDate;
            data = Array.from({ length: 7 }, (_, i) => {
                const date = addDays(start, i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getCompletionCount(dateStr);
                const percent = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0;
                const isFutureDate = isFuture(date) && !isSameDay(date, today);
                
                return {
                    date,
                    dateStr,
                    count,
                    total: totalHabits,
                    percent,
                    label: format(date, 'EEE', { locale: es }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'EEEE d', { locale: es }),
                    isCurrent: isSameDay(date, today),
                    isFuture: isFutureDate
                };
            });

            let prevSum = 0;
            for (let i = 1; i <= 7; i += 1) {
                const d = subDays(start, i);
                const c = getCompletionCount(format(d, 'yyyy-MM-dd'));
                prevSum += totalHabits > 0 ? (c / totalHabits) : 0;
            }
            prevPeriodAvg = (prevSum / 7) * 100;

        } else if (timeframe === 'MONTH') {
            // ViewDate Month Calendar View
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            const days = eachDayOfInterval({ start, end });
            
            data = days.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getCompletionCount(dateStr);
                const percent = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0;
                const dayNum = date.getDate();
                const isFutureDate = isFuture(date) && !isSameDay(date, today);

                return {
                    date,
                    dateStr,
                    count,
                    total: totalHabits,
                    percent,
                    label: [1, 7, 14, 21, 28].includes(dayNum) ? dayNum.toString() : '',
                    fullLabel: format(date, 'd MMM', { locale: es }),
                    isCurrent: isSameDay(date, today),
                    isFuture: isFutureDate
                };
            });

             // Previous month for trend
             const startPrev = startOfMonth(subMonths(viewDate, 1));
             const endPrev = endOfMonth(subMonths(viewDate, 1));
             const daysPrev = eachDayOfInterval({ start: startPrev, end: endPrev });
             
             let prevSum = 0;
             daysPrev.forEach(d => {
                 const c = getCompletionCount(format(d, 'yyyy-MM-dd'));
                 prevSum += totalHabits > 0 ? (c / totalHabits) : 0;
             });
             prevPeriodAvg = (prevSum / daysPrev.length) * 100;

        } else {
            // YEAR (Jan - Dec of viewDate year)
            const start = startOfYear(viewDate);
            data = Array.from({ length: 12 }, (_, i) => {
                const date = addMonths(start, i);
                const monthStr = format(date, 'yyyy-MM');
                const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                const totalPossible = totalHabits * daysInMonth;
                const totalCompletedInMonth = completionByMonth.get(monthStr) || 0;

                const percent = totalPossible > 0 ? Math.round((totalCompletedInMonth / totalPossible) * 100) : 0;

                return {
                    date,
                    dateStr: monthStr,
                    count: totalCompletedInMonth,
                    total: totalPossible,
                    percent,
                    label: format(date, 'MMM', { locale: es }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'MMMM yyyy', { locale: es }),
                    isCurrent: isSameMonth(date, today),
                    isFuture: false
                };
            });
             prevPeriodAvg = 0; 
        }

        // Stats Calculation
        const validData = data.filter(d => !d.isFuture);
        const currentAvg = Math.round(validData.reduce((acc, curr) => acc + curr.percent, 0) / validData.length) || 0;
        const bestDay = Math.max(...validData.map(d => d.percent));
        
        // Streak calculation: Consecutive days with >= 75% completion
        // Iterate backwards from yesterday (since today might not be over)
        // OR: Include today if completed? Usually streak includes today if done, or yesterday if today pending.
        // Let's count backwards from TODAY. If today < 75%, we check if yesterday was valid.
        // If today >= 75%, streak includes today.
        
        let currentStreak = 0;
        for (let i = 365; i >= 1; i -= 1) {
            const dateStr = format(subDays(today, i), 'yyyy-MM-dd');
            const count = getCompletionCount(dateStr);
            const percent = totalHabits > 0 ? Math.round((count / totalHabits) * 100) : 0;
            const required = getRequiredPercentForDay(currentStreak + 1);
            if (percent >= required) {
                currentStreak += 1;
            } else {
                currentStreak = 0;
            }
        }

        const requiredToday = getRequiredPercentForDay(currentStreak + 1);
        if (todayPercent >= requiredToday) {
            currentStreak += 1;
        }

        const minForStreak = Math.ceil((totalHabits * requiredToday) / 100);

        const trendValue = currentAvg - Math.round(prevPeriodAvg);

        // Date Range Label Logic
        let rangeLabel = '';
        if (data.length > 0) {
            const startD = data[0].date;
            const endD = data[data.length - 1].date;
            
            if (timeframe === 'WEEK') {
                rangeLabel = `${format(startD, 'd MMM').toUpperCase()} - ${format(endD, 'd MMM', { locale: es }).toUpperCase()}`;
            } else if (timeframe === 'MONTH') {
                const monthName = format(startD, 'MMMM', { locale: es });
                rangeLabel = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${format(startD, 'yyyy')}`;
            } else {
                rangeLabel = format(startD, 'yyyy');
            }
        }

        return {
            chartData: data,
            stats: {
                average: currentAvg,
                best: bestDay,
                streak: currentStreak,
                totalHabits
            },
            trend: trendValue,
            dateRangeLabel: rangeLabel,
            todayStats: {
                count: todayCount,
                total: totalHabits,
                percent: todayPercent,
                minForStreak,
                requiredToday
            }
        };
    }, [habits, timeframe, currentDate]);

    // Color logic for the progress bar
    const getProgressColor = (percent: number, required: number) => {
        if (percent >= required) return '#10b981'; // Emerald-500 for success
        if (percent >= required * 0.6) return `${themeColor}CC`; // 80% opacity
        return '#f43f5e';
    };

    const getProgressColorStyle = (percent: number, required: number) => {
        if (percent >= required) return { color: '#10b981' };
        if (percent >= required * 0.6) return { color: `${themeColor}CC` };
        return { color: '#fb7185' }; // rose-400
    };

    const isCurrentRange = useMemo(() => {
        const today = new Date();
        if (timeframe === 'WEEK') {
            const start = currentDate;
            const end = addDays(currentDate, 6);
            return isWithinInterval(today, { start, end });
        }
        if (timeframe === 'MONTH') {
            return isSameMonth(currentDate, today);
        }
        return currentDate.getFullYear() === today.getFullYear();
    }, [currentDate, timeframe]);

    const showTicks = timeframe === 'MONTH';

    return (
        <div className="w-full bg-[#0a0a0a]/70 rounded-[32px] p-4 border border-white/5 shadow-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-70 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(99,102,241,0.18)_0%,_transparent_60%)]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(16,185,129,0.12)_0%,_transparent_60%)]" />

            {/* --- HEADER --- */}
            <div className="flex flex-col gap-2 mb-2">
                {/* Row 1: Title & Controls */}
                <div className="flex justify-between items-center">
                    <motion.div 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={dateRangeLabel}
                        className="flex items-center"
                    >
                        <button 
                            onClick={() => setIsDateModalOpen(true)}
                            className={cn(
                                "px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer border active:scale-95",
                                isCurrentRange
                                    ? "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                                    : "bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20"
                            )}
                        >
                            <Calendar size={10} className={cn(isCurrentRange ? "text-blue-300" : "text-amber-300")} />
                            <span className={cn(
                                "text-[10px] font-bold tracking-wide whitespace-nowrap font-mono",
                                isCurrentRange ? "text-blue-200/90" : "text-amber-200/90"
                            )}>
                                {dateRangeLabel}
                            </span>
                        </button>
                    </motion.div>

                    {/* Controls - Compact */}
                    <div className="flex p-0.5 rounded-full bg-zinc-900/80 border border-white/10 relative scale-95 origin-right">
                         {(['WEEK', 'MONTH', 'YEAR'] as TimeFrame[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => handleTabClick(tf)}
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
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
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
                    <button 
                        onClick={() => onOpenStreak?.()}
                        className="cursor-pointer group/streak flex flex-col items-start text-left"
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
                    </button>

                </div>
            </div>

            {/* --- COMPACT CHART AREA --- */}
            <div className="h-32 flex items-end justify-between gap-1 relative mb-0 pt-3">
                {/* Horizontal Guidelines */}
                <div className="absolute inset-x-0 top-3 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[100, 50, 0].map((val) => (
                        <div key={val} className="w-full border-t border-white/5 relative h-0">
                            <span className="absolute top-1/2 -translate-y-1/2 -left-0 text-[9px] text-zinc-700 font-mono">{val}%</span>
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
                                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-md z-50 min-w-[100px]"
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
                                            className="h-full rounded-full" 
                                            style={{ width: `${data.percent}%`, backgroundColor: themeColor }}
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
                                style={{ 
                                    height: '100%',
                                    background: data.isCurrent 
                                        ? `linear-gradient(to top, ${themeColor}, ${themeColor})` 
                                        : `linear-gradient(to top, #3f3f46, #52525b)`, // zinc-700 to zinc-600
                                    boxShadow: data.isCurrent ? `0 0 20px ${themeColor}4d` : 'none', // 30% opacity
                                    opacity: data.isCurrent ? 1 : 0.6
                                }}
                                className={cn(
                                    "w-full rounded-t-sm relative overflow-hidden transition-all duration-300 origin-bottom",
                                    !data.isCurrent && "hover:opacity-100"
                                )}
                            >
                                {/* Glass Reflection */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                            </motion.div>
                        </div>

                        {/* Label & Ticks */}
                        <div className="flex flex-col items-center mt-2">
                            {showTicks && (
                                <div className={cn(
                                    "w-[1px] mb-1 transition-all duration-300",
                                    data.label 
                                        ? "h-2 bg-zinc-600" 
                                        : "h-1 bg-zinc-800 group-hover/bar:bg-zinc-600"
                                )} />
                            )}
                            
                            {/* Date Label */}
                            <div className="h-4 flex items-end justify-center">
                                <span 
                                    className={cn(
                                        "text-[9px] font-bold transition-colors duration-300",
                                        !data.isCurrent && "text-zinc-600 group-hover/bar:text-zinc-400"
                                    )}
                                    style={data.isCurrent ? { color: themeColor } : {}}
                                >
                                    {data.label}
                                </span>
                            </div>
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
                            <span className="text-base font-bold" style={getProgressColorStyle(todayStats.percent, todayStats.requiredToday)}>
                                {todayStats.count}/{todayStats.total}
                            </span>
                            <span className="text-[10px] text-zinc-600">completados</span>
                        </div>
                    </div>
                    <div className="text-right">
                         <span className="text-[9px] text-zinc-500">
                            {todayStats.percent >= todayStats.requiredToday ? '¡Racha asegurada!' : `Faltan ${Math.max(0, todayStats.minForStreak - todayStats.count)} para racha`}
                        </span>
                    </div>
                </div>

                {/* Progress Bar with Goal Marker */}
                    <div className="relative h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div className="absolute top-0 bottom-0 w-[2px] bg-white/10 z-10" style={{ left: `${todayStats.requiredToday}%` }} />
                        
                    {/* Progress */}
                        <motion.div 
                            className={cn("h-full rounded-full transition-colors duration-500 origin-left")}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: todayStats.percent / 100 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            style={{ width: '100%', backgroundColor: getProgressColor(todayStats.percent, todayStats.requiredToday) }}
                        />
                    </div>
            </div>

            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={handleDateSelect}
                mode={timeframe as DateSelectionMode}
                currentDate={currentDate}
            />
        </div>
    );
};
