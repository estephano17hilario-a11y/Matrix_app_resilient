import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { Activity, TrendingUp } from 'lucide-react';

interface HabitConsistencyChartProps {
    habits: Habit[];
}

export const HabitConsistencyChart: React.FC<HabitConsistencyChartProps> = ({ habits }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // 1. Calculate data for the last 7 days
    const chartData = useMemo(() => {
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i); // Order: 6 days ago -> Today
            const dateStr = format(date, 'yyyy-MM-dd');
            
            // Filter habits that were active on this date (simple logic: created before date)
            // Ideally we check creationDate, but for now assume active habits apply
            const activeHabits = habits.filter(h => !h.archived);
            const total = activeHabits.length;
            
            if (total === 0) return { date, dateStr, count: 0, total: 0, percent: 0, dayName: '' };

            const completed = activeHabits.filter(h => 
                h.history?.some(hDate => hDate.startsWith(dateStr))
            ).length;

            return {
                date,
                dateStr,
                count: completed,
                total,
                percent: Math.round((completed / total) * 100),
                dayName: format(date, 'EEE', { locale: es }).toUpperCase().slice(0, 1) // L, M, X...
            };
        });
        return days;
    }, [habits]);

    // 2. Calculate average consistency
    const averageConsistency = useMemo(() => {
        if (chartData.length === 0) return 0;
        const sum = chartData.reduce((acc, curr) => acc + curr.percent, 0);
        return Math.round(sum / chartData.length);
    }, [chartData]);

    // 3. Determine Chart Color based on average (Health Style)
    const chartColor = averageConsistency >= 80 ? 'text-emerald-400' : 
                       averageConsistency >= 50 ? 'text-cyan-400' : 'text-rose-400';
    
    const barGradient = averageConsistency >= 80 ? 'from-emerald-500 to-emerald-300' :
                        averageConsistency >= 50 ? 'from-cyan-500 to-blue-400' : 'from-rose-500 to-orange-400';

    return (
        <div className="w-full p-5 rounded-3xl bg-[#121214]/90 border border-white/5 mb-6 relative overflow-hidden group shadow-lg ring-1 ring-white/5">
            {/* Optimized Fake Glass Background - No GPU Blur Cost */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} />
                        Consistencia Semanal
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={cn("text-3xl font-bold font-mono tracking-tighter", chartColor)}>
                            {averageConsistency}%
                        </span>
                        <span className="text-xs text-white/40">promedio</span>
                    </div>
                </div>
                
                {/* Mini Indicator */}
                <div className={cn("p-2 rounded-full bg-white/5 border border-white/5", chartColor)}>
                    <TrendingUp size={16} />
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex justify-between items-end h-32 gap-2 relative z-10">
                {chartData.map((data, i) => (
                    <div 
                        key={data.dateStr} 
                        className="flex-1 flex flex-col items-center gap-2 relative group/bar"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {/* Tooltip (Apple Style: appearing above) */}
                        <AnimatePresence>
                            {hoveredIndex === i && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                    className="absolute -top-10 bg-zinc-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg border border-white/10 shadow-xl whitespace-nowrap z-20 pointer-events-none"
                                >
                                    {data.count}/{data.total} ({data.percent}%)
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Bar Container */}
                        <div className="w-full h-full bg-white/5 rounded-full relative overflow-hidden flex items-end">
                            {/* Fill Bar */}
                            <motion.div
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: Math.max(data.percent, 4) / 100 }} // Scale 0-1
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 200, 
                                    damping: 20, 
                                    delay: i * 0.05 
                                }}
                                style={{ originY: 1 }}
                                className={cn(
                                    "w-full h-full rounded-full bg-gradient-to-t opacity-90 relative",
                                    barGradient
                                )}
                            >
                                {/* Glow Effect at top of bar */}
                                <div className="absolute top-0 left-0 right-0 h-4 bg-white/30 blur-[2px]" />
                            </motion.div>
                        </div>

                        {/* Day Label */}
                        <span className={cn(
                            "text-[10px] font-bold transition-colors duration-300",
                            isSameDay(data.date, new Date()) ? "text-white" : "text-white/30"
                        )}>
                            {data.dayName}
                        </span>

                        {/* Active Day Indicator (Dot) */}
                        {isSameDay(data.date, new Date()) && (
                            <motion.div 
                                layoutId="activeDayDot"
                                className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-white shadow-[0_0_5px_white]"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
