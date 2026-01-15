import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, subMonths, format, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';

interface HabitConsistencyChartProps {
    habits: Habit[];
}

type TimeFrame = 'WEEK' | 'MONTH' | 'YEAR';

export const HabitConsistencyChart: React.FC<HabitConsistencyChartProps> = ({ habits }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [timeframe, setTimeframe] = useState<TimeFrame>('WEEK');

    // 1. Calculate data based on timeframe
    const chartData = useMemo(() => {
        const activeHabits = habits.filter(h => !h.archived);
        const totalHabits = activeHabits.length;

        if (timeframe === 'WEEK') {
            return Array.from({ length: 7 }, (_, i) => {
                const date = subDays(new Date(), 6 - i);
                const dateStr = format(date, 'yyyy-MM-dd');
                
                if (totalHabits === 0) return { date, dateStr, count: 0, total: 0, percent: 0, label: '' };

                const completed = activeHabits.filter(h => 
                    h.history?.some(hDate => hDate.startsWith(dateStr))
                ).length;

                return {
                    date,
                    dateStr,
                    count: completed,
                    total: totalHabits,
                    percent: Math.round((completed / totalHabits) * 100),
                    label: format(date, 'EEE', { locale: es }).toUpperCase().slice(0, 1),
                    isCurrent: isSameDay(date, new Date())
                };
            });
        } 
        
        if (timeframe === 'MONTH') {
            return Array.from({ length: 30 }, (_, i) => {
                const date = subDays(new Date(), 29 - i);
                const dateStr = format(date, 'yyyy-MM-dd');

                if (totalHabits === 0) return { date, dateStr, count: 0, total: 0, percent: 0, label: '' };

                const completed = activeHabits.filter(h => 
                    h.history?.some(hDate => hDate.startsWith(dateStr))
                ).length;

                return {
                    date,
                    dateStr,
                    count: completed,
                    total: totalHabits,
                    percent: Math.round((completed / totalHabits) * 100),
                    label: i % 5 === 0 ? format(date, 'd') : '', // Show label every 5 days
                    isCurrent: isSameDay(date, new Date())
                };
            });
        }

        // YEAR
        return Array.from({ length: 12 }, (_, i) => {
            const date = subMonths(new Date(), 11 - i);
            const monthStr = format(date, 'yyyy-MM');
            
            if (totalHabits === 0) return { date, dateStr: monthStr, count: 0, total: 0, percent: 0, label: '' };

            // Count total completions in this month across all habits
            // And total possible completions (Habits * Days in Month)
            // This is an approximation as habits might not have existed
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            const totalPossible = totalHabits * daysInMonth;
            
            let totalCompletedInMonth = 0;
            activeHabits.forEach(h => {
                h.history?.forEach(hDate => {
                    if (hDate.startsWith(monthStr)) {
                        totalCompletedInMonth++;
                    }
                });
            });

            return {
                date,
                dateStr: monthStr,
                count: totalCompletedInMonth,
                total: totalPossible,
                percent: Math.round((totalCompletedInMonth / totalPossible) * 100),
                label: format(date, 'MMM', { locale: es }).toUpperCase().slice(0, 3),
                isCurrent: isSameMonth(date, new Date())
            };
        });

    }, [habits, timeframe]);

    // 2. Calculate average consistency
    const averageConsistency = useMemo(() => {
        if (chartData.length === 0) return 0;
        const sum = chartData.reduce((acc, curr) => acc + curr.percent, 0);
        return Math.round(sum / chartData.length);
    }, [chartData]);

    // 3. FORCE GREEN THEME (Emerald)
    const chartColor = 'text-emerald-400';
    const chartBg = 'bg-emerald-500';
    const barGradient = 'from-emerald-500 to-emerald-300';

    return (
        <div className="w-full h-64 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md mb-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Consistencia</h3>
                    <div className="flex items-center gap-2">
                         <span className={cn("text-2xl font-bold font-mono tracking-tighter", chartColor)}>
                            {averageConsistency}%
                        </span>
                        <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_10px_currentColor]", chartBg, "shadow-current/50")} />
                    </div>
                </div>

                {/* Timeframe Selector */}
                <div className="flex p-0.5 rounded-lg bg-white/5 border border-white/10">
                    {(['WEEK', 'MONTH', 'YEAR'] as TimeFrame[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={cn(
                                "px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all duration-300",
                                timeframe === tf 
                                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/20" 
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {tf === 'WEEK' ? 'Sem' : tf === 'MONTH' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 flex justify-between items-end gap-1 relative z-10 w-full">
                {chartData.map((data, i) => (
                    <div 
                        key={data.dateStr} 
                        className="flex-1 flex flex-col items-center gap-2 relative group/bar h-full justify-end"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {/* Tooltip */}
                        <AnimatePresence>
                            {hoveredIndex === i && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                    className="absolute -top-10 bg-zinc-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg border border-white/10 shadow-xl whitespace-nowrap z-20 pointer-events-none"
                                >
                                    {timeframe === 'YEAR' ? '' : `${data.count}/${data.total}`} ({data.percent}%)
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Bar Container */}
                        <div className="w-full h-[80%] bg-white/5 rounded-full relative overflow-hidden flex items-end">
                            {/* Fill Bar */}
                            <motion.div
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: Math.max(data.percent, 4) / 100 }} // Scale 0-1
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 200, 
                                    damping: 20, 
                                    delay: i * 0.02 
                                }}
                                style={{ originY: 1 }}
                                className={cn(
                                    "w-full h-full rounded-full bg-gradient-to-t opacity-90 relative",
                                    barGradient
                                )}
                            >
                                {/* Glow Effect */}
                                <div className="absolute top-0 left-0 right-0 h-4 bg-white/30 blur-[2px]" />
                            </motion.div>
                        </div>

                        {/* Label */}
                        <span className={cn(
                            "text-[9px] font-bold transition-colors duration-300 h-3 flex items-center",
                            data.isCurrent ? "text-emerald-400" : "text-white/20"
                        )}>
                            {data.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

