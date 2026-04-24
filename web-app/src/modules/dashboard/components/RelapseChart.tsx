import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, subMonths, format, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, startOfYear, addMonths, addDays, isWithinInterval, differenceInDays } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { BadHabit } from '../../../types';
import { cn } from '../../../utils/cn';
import { toLocalISOString, startOfWeek } from '../../../utils/dateUtils';
import { TrendingUp, TrendingDown, Calendar, Lock, Skull } from 'lucide-react';
import { DateSelectionModal, DateSelectionMode } from './DateSelectionModal';
import { useTranslation } from 'react-i18next';

interface RelapseChartProps {
    badHabits: BadHabit[];
    isActive?: boolean;
    isPro?: boolean;
    onOpenPro?: () => void;
    weekStartDay?: 0 | 1;
}

type TimeFrame = 'WEEK' | 'MONTH' | 'YEAR';

export const RelapseChart: React.FC<RelapseChartProps> = ({ 
    badHabits, 
    isActive = true, 
    isPro, 
    onOpenPro, 
    weekStartDay = 1 
}) => {
    const { t, i18n } = useTranslation();
    
    // For bad habits, the theme is usually rose/red, but we can respect user's theme or stick to rose
    const themeColor = '#f43f5e'; // Rose 500
    
    const dateLocale = i18n.language === 'es' ? es : enUS;

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
        if (!isPro && (tf === 'MONTH' || tf === 'YEAR')) {
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

    const { chartData, stats, trend, dateRangeLabel, maxDaily } = useMemo(() => {
        const today = new Date();
        const viewDate = currentDate;

        let data: any[] = [];
        let prevPeriodAvg = 0;

        const normalizeHistoryDate = (value: string) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) return toLocalISOString(parsed);
            return value.split('T')[0];
        };

        const relapseByDate = new Map<string, number>();
        const relapseByMonth = new Map<string, number>();
        const allRelapses: Date[] = [];
        let earliestCreation = new Date();

        badHabits.forEach(h => {
            if (h.createdAt) {
                const cDate = new Date(h.createdAt);
                if (cDate < earliestCreation) earliestCreation = cDate;
            }
            h.history?.forEach(hDate => {
                const normalized = normalizeHistoryDate(hDate);
                relapseByDate.set(normalized, (relapseByDate.get(normalized) || 0) + 1);
                const monthKey = normalized.slice(0, 7);
                relapseByMonth.set(monthKey, (relapseByMonth.get(monthKey) || 0) + 1);
                allRelapses.push(new Date(normalized));
            });
        });

        // Calculate Streaks
        allRelapses.sort((a, b) => a.getTime() - b.getTime());
        
        let longestStreak = 0;
        let currentStreak = 0;

        if (allRelapses.length === 0) {
            longestStreak = differenceInDays(today, earliestCreation);
            currentStreak = longestStreak;
        } else {
            let previousDate = earliestCreation;
            allRelapses.forEach(relapseDate => {
                const diff = differenceInDays(relapseDate, previousDate);
                if (diff > longestStreak) {
                    longestStreak = diff;
                }
                previousDate = relapseDate;
            });
            
            const lastRelapseDate = allRelapses[allRelapses.length - 1];
            const currentDiff = differenceInDays(today, lastRelapseDate);
            if (currentDiff > longestStreak) {
                longestStreak = currentDiff;
            }
            currentStreak = currentDiff;
        }

        const getRelapseCount = (dateStr: string) => relapseByDate.get(dateStr) || 0;

        if (timeframe === 'WEEK') {
            const start = startOfWeek(viewDate);
            data = Array.from({ length: 7 }, (_, i) => {
                const date = addDays(start, i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getRelapseCount(dateStr);
                const isFutureDate = isFuture(date) && !isSameDay(date, today);
                
                return {
                    date,
                    dateStr,
                    count,
                    label: format(date, 'EEE', { locale: dateLocale }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'EEEE d', { locale: dateLocale }),
                    isCurrent: isSameDay(date, today),
                    isFuture: isFutureDate
                };
            });

            let prevSum = 0;
            for (let i = 1; i <= 7; i += 1) {
                const d = subDays(start, i);
                prevSum += getRelapseCount(format(d, 'yyyy-MM-dd'));
            }
            prevPeriodAvg = prevSum / 7;

        } else if (timeframe === 'MONTH') {
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            const days = eachDayOfInterval({ start, end });
            
            data = days.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = getRelapseCount(dateStr);
                const dayNum = date.getDate();
                const isFutureDate = isFuture(date) && !isSameDay(date, today);

                return {
                    date,
                    dateStr,
                    count,
                    label: [1, 7, 14, 21, 28].includes(dayNum) ? dayNum.toString() : '',
                    fullLabel: format(date, 'd MMM', { locale: dateLocale }),
                    isCurrent: isSameDay(date, today),
                    isFuture: isFutureDate
                };
            });

             const startPrev = startOfMonth(subMonths(viewDate, 1));
             const endPrev = endOfMonth(subMonths(viewDate, 1));
             const daysPrev = eachDayOfInterval({ start: startPrev, end: endPrev });
             
             let prevSum = 0;
             daysPrev.forEach(d => {
                 prevSum += getRelapseCount(format(d, 'yyyy-MM-dd'));
             });
             prevPeriodAvg = prevSum / daysPrev.length;

        } else {
            const start = startOfYear(viewDate);
            data = Array.from({ length: 12 }, (_, i) => {
                const date = addMonths(start, i);
                const monthStr = format(date, 'yyyy-MM');
                const totalCompletedInMonth = relapseByMonth.get(monthStr) || 0;

                return {
                    date,
                    dateStr: monthStr,
                    count: totalCompletedInMonth,
                    label: format(date, 'MMM', { locale: dateLocale }).charAt(0).toUpperCase(),
                    fullLabel: format(date, 'MMMM yyyy', { locale: dateLocale }),
                    isCurrent: isSameMonth(date, today),
                    isFuture: false
                };
            });
             prevPeriodAvg = 0; 
        }

        const validData = data.filter(d => !d.isFuture);
        const maxCount = Math.max(...validData.map(d => d.count), 1); // Avoid div by 0
        const currentAvg = validData.reduce((acc, curr) => acc + curr.count, 0) / (validData.length || 1);
        
        const trendValue = currentAvg - prevPeriodAvg;

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
            maxDaily: maxCount,
            stats: {
                average: Number(currentAvg.toFixed(1)),
                streak: currentStreak,
                longestStreak: longestStreak,
                totalHabits: badHabits.length
            },
            trend: Number(trendValue.toFixed(1)),
            dateRangeLabel: rangeLabel,
        };
    }, [badHabits, timeframe, currentDate, dateLocale, weekStartDay]);

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

    if (badHabits.length === 0) return null;

    return (
        <div data-tour="badhabit-chart" className="w-full max-w-[440px] mx-auto bg-[#0a0a0a]/70 rounded-[32px] p-4 border border-white/5 shadow-md overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-70 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(244,63,94,0.15)_0%,_transparent_60%)]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(244,63,94,0.1)_0%,_transparent_60%)]" />

            {/* --- HEADER --- */}
            <div className="flex flex-col gap-2 mb-2">
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
                                    ? "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20"
                                    : "bg-zinc-800/50 border-white/10 hover:bg-white/5"
                            )}
                        >
                            <Calendar size={10} className={cn(isCurrentRange ? "text-rose-300" : "text-zinc-400")} />
                            <span className={cn(
                                "text-[10px] font-bold tracking-wide whitespace-nowrap font-mono",
                                isCurrentRange ? "text-rose-200/90" : "text-zinc-300"
                            )}>
                                {dateRangeLabel}
                            </span>
                        </button>
                    </motion.div>

                    <div className="flex p-0.5 rounded-full bg-zinc-900/80 border border-white/10 relative scale-95 origin-right">
                         {(['WEEK', 'MONTH', 'YEAR'] as TimeFrame[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => handleTabClick(tf)}
                                className={cn(
                                    "relative px-3 py-1 rounded-full text-[9px] font-bold transition-all duration-200 z-10 flex items-center gap-1",
                                    timeframe === tf ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {timeframe === tf && (
                                    <motion.div
                                        layoutId="activeRelapseTab"
                                        className="absolute inset-0 bg-white/10 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-white/5"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.2 }}
                                    />
                                )}
                                <span>{tf === 'WEEK' ? t('dashboard.week') : tf === 'MONTH' ? t('dashboard.month') : t('dashboard.year')}</span>
                                {!isPro && (tf === 'MONTH' || tf === 'YEAR') && <Lock size={10} className="text-yellow-400/80" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
                    <div className="flex items-baseline gap-3 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{t('badHabits.avgRelapses', 'AVG RELAPSES')}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-4xl font-mono font-bold text-white tracking-tighter">
                                    {stats.average}
                                </span>
                                <div className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border",
                                    trend <= 0 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                )}>
                                    {trend <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                    {Math.abs(trend)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-start text-left relative pl-2 shrink-0 border-l border-white/5">
                        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide mb-0.5">
                            {t('badHabits.globalStreak', 'GLOBAL STREAK')}
                        </div>
                        <div className="flex items-center gap-2 relative z-10">
                            <div className="relative">
                                <Skull 
                                    size={16} 
                                    className="text-emerald-500/80"
                                />
                            </div>
                            <span className="text-xl font-bold text-emerald-400">
                                {stats.streak} <span className="text-sm font-normal text-zinc-500">{t('dashboard.days')}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- COMPACT CHART AREA --- */}
            <div className="h-32 flex items-end justify-between gap-1 relative mb-0 pt-3">
                {/* Horizontal Guidelines */}
                <div className="absolute inset-x-0 top-3 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[maxDaily, Math.floor(maxDaily / 2), 0].map((val, idx) => (
                        <div key={`guide-${val}-${idx}`} className="w-full h-px bg-white/5 relative">
                            <span className="absolute top-1/2 -translate-y-1/2 -left-3 text-[9px] text-zinc-700 font-mono">{val}</span>
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
                                        <div className="text-lg font-bold text-rose-400">{data.count}</div>
                                        <div className="text-[10px] text-zinc-500">
                                            {t('badHabits.relapses', 'Relapses')}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* The Bar */}
                        <div className="w-full px-[2px] h-full flex items-end relative overflow-hidden">
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
                                    scaleY: maxDaily > 0 ? Math.max(data.count / maxDaily, 0.04) : 0,
                                    opacity: data.isCurrent ? 1 : 0.6
                                }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 450, 
                                    damping: 25,
                                    delay: i * 0.02
                                }}
                                style={{ 
                                    height: '100%',
                                    backgroundColor: data.count > 0 ? themeColor : '#27272a',
                                    boxShadow: data.isCurrent && data.count > 0 ? `0 0 10px ${themeColor}40` : 'none',
                                    borderTop: data.isCurrent && data.count > 0 ? '1px solid rgba(255,255,255,0.4)' : 'none',
                                    willChange: 'transform'
                                }}
                            />
                        </div>

                        {/* Label & Ticks */}
                        <div className="flex flex-col items-center mt-2">
                            {showTicks && (
                                <div className={cn(
                                    "w-[1px] mb-1 transition-all duration-200",
                                    data.label 
                                        ? "h-2 bg-zinc-600" 
                                        : "h-1 bg-zinc-800 group-hover/bar:bg-zinc-600"
                                )} />
                            )}
                            
                            <div className="h-4 flex items-end justify-center">
                                <span 
                                    className={cn(
                                        "text-[9px] font-bold transition-colors duration-200",
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
