import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, subMonths, format, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, startOfYear, addMonths, addDays, isSameWeek } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { toLocalISOString, startOfWeek } from '../../../utils/dateUtils';
import { TrendingUp, TrendingDown, Flame, Calendar, Lock } from 'lucide-react';
import { DateSelectionModal, DateSelectionMode } from './DateSelectionModal';
import { useLux } from '@/context/LuxContext';
import { getAvatarConfig } from '@/config/avatars';
import { useTranslation } from 'react-i18next';
import { TourLightbulb } from '../../../components/TourLightbulb';

interface HabitConsistencyChartProps {
    habits: Habit[];
    onOpenStreak?: () => void;
    isActive?: boolean;
    isPro?: boolean;
    onOpenPro?: () => void;
    weekStartDay?: 0 | 1;
    initialTimeframe?: TimeFrame;
}

type TimeFrame = 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';

const getRequiredPercentForDay = (day: number) => {
    if (day <= 7) return 50;
    if (day <= 14) return 60;
    if (day <= 30) return 67;
    if (day <= 60) return 75;
    if (day <= 90) return 80;
    return 85;
};

export const HabitConsistencyChart: React.FC<HabitConsistencyChartProps> = ({ habits, onOpenStreak, isActive = true, isPro, onOpenPro, weekStartDay = 1, initialTimeframe = 'WEEK' }) => {
    const { t, i18n } = useTranslation();
    const { user } = useLux();
    const avatarConfig = getAvatarConfig(user?.avatarId);
    const themeColor = useMemo(() => {
        return avatarConfig?.themeColor || '#10b981';
    }, [avatarConfig?.themeColor]);

    const dateLocale = i18n.language === 'es' ? es : enUS;

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [timeframe, setTimeframe] = useState<TimeFrame>(initialTimeframe);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);

    useEffect(() => {
        if (isActive) {
            setTimeframe('WEEK');
            setCurrentDate(new Date());
        }
    }, [isActive]);

    const handleTabClick = (tf: TimeFrame) => {
        if (!isPro && (tf === '3_MONTHS' || tf === 'YEAR' || tf === 'TOTAL')) {
            if (onOpenPro) onOpenPro();
            return;
        }

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
        const today = new Date();
        const viewDate = currentDate;
        const todayStr = format(today, 'yyyy-MM-dd');

        // Helper to get active habits count for a specific date
        const getDailyTotal = (date: Date) => {
            // Normalize compare date to start of day timestamp for strict comparison
            const compareTime = new Date(date).setHours(0, 0, 0, 0);
            const dayOfWeek = new Date(date).getDay();

             return activeHabits.filter(h => {
                let habitStartTime: number;

                if (h.createdAt) {
                    habitStartTime = new Date(h.createdAt).setHours(0, 0, 0, 0);
                } else {
                    // 🛡️ LEGACY FIX: If no createdAt, infer from history
                    if (h.history && h.history.length > 0) {
                        // Sort history to find the first completion
                        const dates = h.history.map(d => new Date(d).getTime());
                        const firstCompletion = new Date(Math.min(...dates));
                        habitStartTime = firstCompletion.setHours(0, 0, 0, 0);
                    } else {
                        // If no history and no createdAt, assume it's brand new (today)
                        // This prevents empty new habits from polluting past stats
                        // We use Date.now() but normalized to start of day
                        habitStartTime = new Date().setHours(0, 0, 0, 0);
                    }
                }
                
                // STRICT COMPARISON:
                // If habit was created TODAY (habitStartTime), and we compare to YESTERDAY (compareTime)
                // Today <= Yesterday is FALSE. Correct.
                if (habitStartTime > compareTime) return false;

                // Frequency Check
                if (h.frequency === 'DAILY') return true;
                if (h.frequency === 'WEEKLY') {
                    if (h.weeklyType === 'FLEXIBLE_COUNT') return true;
                    if (!h.frequencyDays || h.frequencyDays.length === 0) return true;
                    return h.frequencyDays.includes(dayOfWeek);
                }
                if (h.frequency === 'MONTHLY') {
                    if (h.monthlyType === 'FLEXIBLE_COUNT') return true; // Flexible means it could be done any day
                    
                    const dateOfMonth = new Date(date).getDate();
                    const isLastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() === dateOfMonth;
                    
                    if (h.monthlyType === 'SPECIFIC_DATES' || !h.monthlyType) {
                        if (h.frequencyDays && h.frequencyDays.includes(dateOfMonth)) return true;
                        if (h.monthlyLastDay && isLastDay) return true;
                        return false;
                    }
                    return true;
                }
                
                return true;
            }).length;
        };

        const anyHabitExisted = (date: Date) => {
            const compareTime = new Date(date).setHours(0, 0, 0, 0);
            return activeHabits.some(h => {
                let habitStartTime: number;
                if (h.createdAt) {
                    habitStartTime = new Date(h.createdAt).setHours(0, 0, 0, 0);
                } else {
                    if (h.history && h.history.length > 0) {
                        const dates = h.history.map(d => new Date(d).getTime());
                        const firstCompletion = new Date(Math.min(...dates));
                        habitStartTime = firstCompletion.setHours(0, 0, 0, 0);
                    } else {
                        habitStartTime = new Date().setHours(0, 0, 0, 0);
                    }
                }
                return habitStartTime <= compareTime;
            });
        };

        const currentTotalHabits = activeHabits.length;

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
        const todayTotal = getDailyTotal(today);
        // FIX: If no habits due (total=0), percent is 0. Don't give free 100%.
        const todayPercent = todayTotal > 0 ? Math.round((todayCount / todayTotal) * 100) : 0;

        if (timeframe === 'WEEK') {
            const start = startOfWeek(viewDate);
            data = Array.from({ length: 7 }, (_, i) => {
                const date = addDays(start, i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getCompletionCount(dateStr);
                const dailyTotal = getDailyTotal(date);
                const existed = anyHabitExisted(date);
                // FIX: If no habits due, percent is 0.
                const percent = dailyTotal > 0 ? Math.round((count / dailyTotal) * 100) : 0;
                const isFutureDate = isFuture(date) && !isSameDay(date, today);
                
                return {
                    date,
                    dateStr,
                    count,
                    total: dailyTotal,
                    percent,
                    existed, // Pass this to render
                    label: format(date, 'EEE', { locale: dateLocale }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'EEEE d', { locale: dateLocale }),
                    isCurrent: isSameDay(date, today),
                    isFuture: isFutureDate
                };
            });

            let prevSum = 0;
            let prevCount = 0;
            for (let i = 1; i <= 7; i += 1) {
                const d = subDays(start, i);
                const dt = getDailyTotal(d);
                if (dt > 0) {
                    const c = getCompletionCount(format(d, 'yyyy-MM-dd'));
                    prevSum += (c / dt);
                    prevCount++;
                }
            }
            prevPeriodAvg = prevCount > 0 ? (prevSum / prevCount) * 100 : 0;

        } else if (timeframe === 'MONTH') {
            // ViewDate Month Calendar View
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            const days = eachDayOfInterval({ start, end });
            
            data = days.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getCompletionCount(dateStr);
                const dailyTotal = getDailyTotal(date);
                const existed = anyHabitExisted(date);
                const percent = dailyTotal > 0 ? Math.round((count / dailyTotal) * 100) : 0;
                const dayNum = date.getDate();
                const isFutureDate = isFuture(date) && !isSameDay(date, today);

                return {
                    date,
                    dateStr,
                    count,
                    total: dailyTotal,
                    percent,
                    existed,
                    label: [1, 7, 14, 21, 28].includes(dayNum) ? dayNum.toString() : '',
                    fullLabel: format(date, 'd MMM', { locale: dateLocale }),
                    isCurrent: isSameDay(date, today),
                    isFuture: isFutureDate
                };
            });

             // Previous month for trend
             const startPrev = startOfMonth(subMonths(viewDate, 1));
             const endPrev = endOfMonth(subMonths(viewDate, 1));
             const daysPrev = eachDayOfInterval({ start: startPrev, end: endPrev });
             
             let prevSum = 0;
             let prevCount = 0;
             daysPrev.forEach(d => {
                 const dt = getDailyTotal(d);
                 if (dt > 0) {
                     const c = getCompletionCount(format(d, 'yyyy-MM-dd'));
                     prevSum += (c / dt);
                     prevCount++;
                 }
             });
             prevPeriodAvg = prevCount > 0 ? (prevSum / prevCount) * 100 : 0;

        } else {
            // YEAR (Jan - Dec of viewDate year)
            const start = startOfYear(viewDate);
            data = Array.from({ length: 12 }, (_, i) => {
                const date = addMonths(start, i);
                const monthStr = format(date, 'yyyy-MM');
                const daysInMonth = eachDayOfInterval({
                    start: startOfMonth(date),
                    end: endOfMonth(date)
                });
                
                let totalPossible = 0;
                daysInMonth.forEach(d => {
                    totalPossible += getDailyTotal(d);
                });

                const totalCompletedInMonth = completionByMonth.get(monthStr) || 0;

                const percent = totalPossible > 0 ? Math.round((totalCompletedInMonth / totalPossible) * 100) : 0;

                return {
                    date,
                    dateStr: monthStr,
                    count: totalCompletedInMonth,
                    total: totalPossible,
                    percent,
                    label: format(date, 'MMM', { locale: dateLocale }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'MMMM yyyy', { locale: dateLocale }),
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
            const d = subDays(today, i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const dailyTotal = getDailyTotal(d);
            
            if (dailyTotal > 0) {
                const count = getCompletionCount(dateStr);
                const percent = Math.round((count / dailyTotal) * 100);
                const required = getRequiredPercentForDay(currentStreak + 1);
                
                if (percent >= required) {
                    currentStreak += 1;
                } else {
                    currentStreak = 0;
                }
            } else {
                // If habit existed but not due (Rest Day): SKIP (Maintain streak)
                // If no habit existed (Before account creation): Reset?
                // Actually, if we are iterating Past -> Present (which this loop does), 
                // we should only start counting when habits exist.
                // But currentStreak resets to 0 on failure. 
                // So if we are in "Before Creation" era, dailyTotal=0.
                // If we SKIP, currentStreak remains 0. Correct.
                // If we encounter a failure, currentStreak becomes 0. Correct.
                // If we encounter a success, currentStreak increments. Correct.
                // If we encounter a Rest Day (dailyTotal=0), currentStreak remains X. Correct.
            }
        }

        const requiredToday = getRequiredPercentForDay(currentStreak + 1);
        if (todayTotal > 0) {
            if (todayPercent >= requiredToday) {
                currentStreak += 1;
            }
        }
        // If todayTotal == 0 (Rest Day), we don't increment streak for today, but we don't break it.
        // So currentStreak remains what it was yesterday. Correct.

        const minForStreak = todayTotal > 0 ? Math.ceil((todayTotal * requiredToday) / 100) : 0;

        const trendValue = currentAvg - Math.round(prevPeriodAvg);

        // Date Range Label Logic
        let rangeLabel = '';
        if (data.length > 0) {
            const startD = data[0].date;
            const endD = data[data.length - 1].date;
            
            if (timeframe === 'WEEK') {
                rangeLabel = `${format(startD, 'd MMM').toUpperCase()} - ${format(endD, 'd MMM', { locale: dateLocale }).toUpperCase()}`;
            } else if (timeframe === 'MONTH') {
                const monthName = format(startD, 'MMMM', { locale: dateLocale });
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
                totalHabits: currentTotalHabits
            },
            trend: trendValue,
            dateRangeLabel: rangeLabel,
            todayStats: {
                count: todayCount,
                total: todayTotal,
                percent: todayPercent,
                minForStreak,
                requiredToday
            }
        };
    }, [habits, timeframe, currentDate, dateLocale, weekStartDay]);

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
            return isSameWeek(currentDate, today, { weekStartsOn: weekStartDay });
        } else if (timeframe === 'MONTH') {
            return isSameMonth(currentDate, today);
        } else {
            return currentDate.getFullYear() === today.getFullYear();
        }
    }, [currentDate, timeframe]);

    const showTicks = timeframe === 'MONTH';

    return (
        <div data-tour="habit-chart" className="w-full max-w-[440px] mx-auto bg-[#0a0a0a]/70 rounded-[32px] p-4 border border-white/5 shadow-md overflow-hidden relative group">
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
                                    "relative px-3 py-1 rounded-full text-[9px] font-bold transition-all duration-300 z-10 flex items-center gap-1",
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
                                <span>{tf === 'WEEK' ? t('dashboard.week') : tf === 'MONTH' ? t('dashboard.month') : t('dashboard.year')}</span>
                                {!isPro && (tf === 'MONTH' || tf === 'YEAR') && <Lock size={10} className="text-yellow-400/80" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Stats */}
                <div className="relative">
                    <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar pr-12">
                        {/* Average Percent */}
                        <div className="flex items-baseline gap-3 shrink-0 ml-2">
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

                        {/* Current Streak - FLAME PATH RESTORED */}
                        <button 
                            data-tour="habit-streak"
                            onClick={() => onOpenStreak?.()}
                            className="cursor-pointer group/streak flex flex-col items-start text-left relative pl-2 shrink-0"
                        >
                            {/* Glow effect on hover - Optimized */}
                            <div className="absolute inset-0 bg-orange-500/0 group-hover/streak:bg-orange-500/10 rounded-lg transition-all duration-500" />
                            
                            <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mb-0.5 group-hover/streak:text-orange-400 transition-colors relative z-10">
                                {t('dashboard.streakPath')}
                            </div>
                            <div className="flex items-center gap-2 relative z-10">
                                <div className="relative">
                                    <Flame 
                                        size={20} 
                                        className={cn(
                                            "transition-all duration-500 group-hover/streak:scale-110",
                                            todayStats.percent >= todayStats.requiredToday 
                                                ? "text-orange-500 fill-orange-500/20 group-hover/streak:fill-orange-500" 
                                                : "text-zinc-600 fill-zinc-800/50 group-hover/streak:text-orange-500/50"
                                        )} 
                                    />
                                    {todayStats.percent >= todayStats.requiredToday && (
                                        <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-pulse-slow opacity-0 group-hover/streak:opacity-100 transition-opacity" />
                                    )}
                                </div>
                                <span className="text-xl font-bold text-white group-hover/streak:text-orange-100 transition-colors">
                                    {stats.streak} <span className="text-sm font-normal text-zinc-500">{t('dashboard.days')}</span>
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Fixed position lightbulb, independent of scroll */}
                    <div className="absolute -right-2 top-1/2 -translate-y-[40%] z-20">
                        <TourLightbulb tourId="habits" />
                    </div>
                </div>
            </div>

            {/* --- COMPACT CHART AREA --- */}
            <div className="h-32 flex items-end justify-between gap-1 relative mb-0 pt-3">
                {/* Horizontal Guidelines */}
                <div className="absolute inset-x-0 top-3 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[100, 50, 0].map((val) => (
                        <div key={val} className="w-full h-px bg-white/5 relative">
                            <span className="absolute top-1/2 -translate-y-1/2 -left-3 text-[9px] text-zinc-700 font-mono">{val}%</span>
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
                                className="w-full rounded-t-lg origin-bottom"
                                initial={{ scaleY: 0, opacity: 0 }}
                                animate={{ 
                                    scaleY: data.total > 0 ? Math.max(data.percent / 100, 0.04) : 0,
                                    opacity: data.isCurrent ? 1 : 0.6
                                }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 300, 
                                    damping: 30,
                                    delay: i * 0.02 // Faster stagger
                                }}
                                style={{ 
                                    height: '100%',
                                    backgroundColor: data.percent >= 80 ? '#10b981' : `${themeColor}CC`,
                                    boxShadow: data.isCurrent && data.total > 0 ? `0 0 10px ${themeColor}20` : 'none', // Reduced shadow
                                    borderTop: data.isCurrent && data.total > 0 ? '1px solid rgba(255,255,255,0.4)' : 'none',
                                    willChange: 'transform'
                                }}
                            />
                            {/* Rest Day Indicator */}
                            {data.total === 0 && data.existed && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20" />
                            )}
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
            <div className="pt-1.5 border-t border-white/5 mt-0.5">
                {todayStats.total > 0 ? (
                    <>
                    <div className="flex justify-between items-end mb-1">
                         <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wide">{t('dashboard.dailyGoal')}</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-base font-bold" style={getProgressColorStyle(todayStats.percent, todayStats.requiredToday)}>
                                    {todayStats.count}/{todayStats.total}
                                </span>
                                <span className="text-[10px] text-zinc-600">{t('dashboard.completed')}</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <span className="text-[9px] text-zinc-500">
                                {todayStats.percent >= todayStats.requiredToday ? t('dashboard.streakAssured') : t('dashboard.streakNeed', { count: Math.max(0, todayStats.minForStreak - todayStats.count) })}
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
                    </>
                ) : (
                    <div className="flex items-center justify-center py-2 text-[10px] text-zinc-500 italic">
                        {t('dashboard.noHabitsForToday')}
                    </div>
                )}
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
