import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Habit } from '../../../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfQuarter, endOfQuarter, subQuarters, addQuarters, startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, endOfYear, subYears, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Lock, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface HabitHeatmapProps {
    habit: Habit;
    color?: string;
    isPro?: boolean;
    onOpenPro?: () => void;
}

type TimeFrame = 'MONTH' | 'QUARTER' | 'YEAR';

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habit, color = '#10b981', isPro, onOpenPro }) => {
    const { t } = useTranslation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [timeframe, setTimeframe] = useState<TimeFrame>('QUARTER');
    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

    const handleTabClick = (tf: TimeFrame) => {
        if (!isPro && (tf === 'YEAR' || tf === 'QUARTER')) {
            if (onOpenPro) onOpenPro();
            return;
        }
        setTimeframe(tf);
        setCurrentDate(new Date());
    };

    const navigateDate = (dir: -1 | 1) => {
        setCurrentDate(prev => {
            if (timeframe === 'MONTH') return dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1);
            if (timeframe === 'QUARTER') return dir === -1 ? subQuarters(prev, 1) : addQuarters(prev, 1);
            return dir === -1 ? subYears(prev, 1) : addYears(prev, 1);
        });
    };

    const currentLocale = t('locale') === 'es' ? es : undefined;
    const weekdaysInitialsResult = t('weekdays.initials', { returnObjects: true, defaultValue: ['L', 'M', 'X', 'J', 'V', 'S', 'D'] });
    const weekdaysInitials = Array.isArray(weekdaysInitialsResult) ? weekdaysInitialsResult : ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    // Generate the grid for the current timeframe
    const { days, monthsMap, dateRangeLabel, startDate, endDate } = useMemo(() => {
        let startPeriod: Date;
        let endPeriod: Date;

        if (timeframe === 'MONTH') {
            startPeriod = startOfMonth(currentDate);
            endPeriod = endOfMonth(currentDate);
        } else if (timeframe === 'QUARTER') {
            startPeriod = startOfQuarter(currentDate);
            endPeriod = endOfQuarter(currentDate);
        } else {
            startPeriod = startOfYear(currentDate);
            endPeriod = endOfYear(currentDate);
        }

        // Align to the week that contains the start and end of the period
        const start = startOfWeek(startPeriod, { weekStartsOn: 1 }); // Monday is 1
        const end = endOfWeek(endPeriod, { weekStartsOn: 1 });
        
        const daysArray = eachDayOfInterval({ start, end });
        
        const months = new Map<number, string>();
        daysArray.forEach((day, index) => {
            if (day.getDate() === 1 && day.getTime() >= startPeriod.getTime() && day.getTime() <= endPeriod.getTime()) {
                const colIndex = Math.floor(index / 7);
                months.set(colIndex, format(day, 'MMM', { locale: currentLocale }));
            }
        });

        let label = '';
        if (timeframe === 'MONTH') {
            const monthName = format(startPeriod, 'MMMM yyyy', { locale: currentLocale });
            label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        } else if (timeframe === 'QUARTER') {
            const startMonthName = format(startPeriod, 'MMMM', { locale: currentLocale });
            const endMonthName = format(endPeriod, 'MMMM', { locale: currentLocale });
            const year = format(startPeriod, 'yyyy');
            label = `${startMonthName.charAt(0).toUpperCase() + startMonthName.slice(1)} - ${endMonthName.charAt(0).toUpperCase() + endMonthName.slice(1)} ${year}`;
        } else {
            label = format(startPeriod, 'yyyy');
        }

        return { days: daysArray, monthsMap: months, dateRangeLabel: label, startDate: startPeriod, endDate: endPeriod };
    }, [currentDate, timeframe, currentLocale]);

    // Extract YYYY-MM-DD from history robustly
    const historySet = useMemo(() => {
        const set = new Set<string>();
        if (!habit.history) return set;
        habit.history.forEach(h => {
            const datePart = h.includes('T') ? h.split('T')[0] : h.substring(0, 10);
            set.add(datePart);
        });
        return set;
    }, [habit.history]);

    // Group into columns of 7
    const columns = [];
    for (let i = 0; i < days.length; i += 7) {
        columns.push(days.slice(i, i + 7));
    }

    return (
        <div className="w-full flex flex-col gap-2">
            {/* Header and Controls */}
            <div className="flex items-center justify-between">
                {/* Time Controls (Compact with Dropdown) */}
                <div className="flex items-center p-1 rounded-full bg-black/40 border border-white/5 relative shadow-sm">
                    <button
                        className="relative px-3 py-1 rounded-full text-[9px] font-bold text-white z-10 flex items-center justify-center gap-1"
                    >
                        <div className="absolute inset-0 bg-white/10 rounded-full border border-white/5" />
                        <span>{timeframe === 'MONTH' ? t('dashboard.month', 'MES') : timeframe === 'QUARTER' ? '3 ' + t('dashboard.month', 'MESES') : t('dashboard.year', 'AÑO')}</span>
                    </button>
                    
                    <button
                        onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 ml-0.5"
                    >
                        <Plus size={14} className={cn("transition-transform duration-200", isTimeDropdownOpen && "rotate-45")} />
                    </button>

                    <AnimatePresence>
                        {isTimeDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-md overflow-hidden z-[100] min-w-[110px] p-1.5"
                            >
                                {(['MONTH', 'QUARTER', 'YEAR'] as TimeFrame[]).map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => {
                                            handleTabClick(tf);
                                            setIsTimeDropdownOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-between group",
                                            timeframe === tf ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                        )}
                                    >
                                        <span>{tf === 'MONTH' ? t('dashboard.month', 'MES') : tf === 'QUARTER' ? '3 ' + t('dashboard.month', 'MESES') : t('dashboard.year', 'AÑO')}</span>
                                        {!isPro && (tf === 'YEAR' || tf === 'QUARTER') && <Lock size={10} className="text-yellow-400/80 group-hover:text-yellow-400 transition-colors" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Date Navigation Controls */}
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                    <button onClick={() => navigateDate(-1)} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors">
                        <ChevronLeft size={12} />
                    </button>
                    <div className="px-2 h-6 flex items-center justify-center text-[9px] font-bold text-white whitespace-nowrap">
                        {dateRangeLabel}
                    </div>
                    <button onClick={() => navigateDate(1)} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors">
                        <ChevronRight size={12} />
                    </button>
                </div>
            </div>

            {/* Heatmap Grid Container */}
            <div className="w-full flex flex-col overflow-x-auto scrollbar-hide pb-2">
                <div className={`flex flex-col w-max mx-auto ${timeframe === 'MONTH' ? 'gap-3' : 'gap-2'}`}>
                    {/* Month labels */}
                    {timeframe !== 'MONTH' && (
                        <div className="flex h-4 relative text-[10px] font-bold text-white/30 uppercase tracking-widest w-full">
                            {Array.from(monthsMap.entries()).map(([colIndex, monthName]) => (
                                <span 
                                    key={colIndex} 
                                    className="absolute"
                                    style={{ left: `${colIndex * 20}px` }} // 12px box + 8px gap = 20px
                                >
                                    {monthName}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    {/* Heatmap Grid */}
                    {timeframe === 'MONTH' ? (
                        <div className="w-max mx-auto mt-2">
                            <div className="grid grid-cols-7 gap-2 mb-1">
                                {weekdaysInitials.slice(1).concat(weekdaysInitials[0]).map((d: string, i: number) => (
                                    <div key={i} className="text-center text-[10px] font-bold text-white/30 w-[30px]">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {days.map((day, index) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const isCompleted = historySet.has(dateStr);
                                    const isFuture = day > new Date();
                                    const isOutsidePeriod = day < startDate || day > endDate;
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`w-[30px] h-[30px] rounded-md transition-all duration-200 ${
                                                isOutsidePeriod
                                                ? 'bg-transparent opacity-0'
                                                : isCompleted 
                                                    ? 'shadow-[0_0_10px_-2px_currentColor] z-10 opacity-100' 
                                                    : isFuture ? 'bg-white/5 opacity-20' : 'bg-white/5 hover:bg-white/10 opacity-100'
                                            }`}
                                            style={{ 
                                                backgroundColor: (isCompleted && !isOutsidePeriod) ? color : undefined
                                            }}
                                            title={!isOutsidePeriod ? format(day, 'd MMM, yyyy', { locale: currentLocale }) : undefined}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex relative gap-2">
                            {columns.map((col, colIndex) => {
                                return (
                                <div key={colIndex} className="relative flex flex-col gap-2">
                                    {/* isNewMonth logic removed to delete divider lines */}
                                    {col.map((day, dayIndex) => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const isCompleted = historySet.has(dateStr);
                                        const isFuture = day > new Date();
                                        const isFirstOfMonth = day.getDate() === 1;
                                        
                                        const isOutsidePeriod = day < startDate || day > endDate;
                                        
                                        return (
                                            <div
                                                key={dayIndex}
                                                className={`w-[12px] h-[12px] rounded-[4px] transition-all duration-200 ${
                                                    isOutsidePeriod
                                                    ? 'bg-transparent opacity-0'
                                                    : isCompleted 
                                                        ? 'shadow-[0_0_10px_-2px_currentColor] z-10 opacity-100' 
                                                        : isFirstOfMonth
                                                            ? 'bg-zinc-400/50 border border-zinc-300/30 opacity-100' // Lighter lead color
                                                            : isFuture ? 'bg-white/5 opacity-20' : 'bg-white/5 hover:bg-white/10 opacity-100'
                                                }`}
                                                style={{ 
                                                    backgroundColor: (isCompleted && !isOutsidePeriod) ? color : undefined
                                                }}
                                                title={!isOutsidePeriod ? format(day, 'd MMM, yyyy', { locale: currentLocale }) : undefined}
                                            />
                                        );
                                    })}
                                </div>
                            );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
