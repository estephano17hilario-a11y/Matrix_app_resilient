import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { eachDayOfInterval, subDays, format, isSameDay } from 'date-fns';
import { cn } from '../../../utils/cn';

interface HabitHeatmapProps {
    history: string[]; // ISO date strings
    days?: number;
    color?: string;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ 
    history, 
    days = 105, // Default to ~15 weeks
    color = '#3b82f6'
}) => {
    // Generate dates for the heatmap (End date is today)
    const dates = useMemo(() => {
        const today = new Date();
        const start = subDays(today, days - 1);
        return eachDayOfInterval({ start, end: today });
    }, [days]);

    // Normalize history to local YYYY-MM-DD for accurate comparison
    const completedDates = useMemo(() => {
        const set = new Set<string>();
        history.forEach(h => {
            try {
                // Handle both full ISO strings and YYYY-MM-DD strings
                const date = new Date(h);
                if (!isNaN(date.getTime())) {
                    set.add(format(date, 'yyyy-MM-dd'));
                }
            } catch (e) {
                console.warn("Invalid date in history:", h);
            }
        });
        return set;
    }, [history]);

    return (
        <div className="flex flex-wrap gap-[3px] content-start">
            {dates.map((date, i) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isCompleted = completedDates.has(dateStr);
                const isToday = isSameDay(date, new Date());
                
                return (
                    <motion.div
                        key={dateStr}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.005, duration: 0.2 }}
                        className={cn(
                            "rounded-[2px] transition-all duration-500",
                            isToday && !isCompleted ? "ring-1 ring-white/30 animate-pulse" : "",
                            isCompleted ? "scale-110 z-10" : "scale-100"
                        )}
                        style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: isCompleted ? color : 'rgba(255,255,255,0.06)',
                            opacity: isCompleted ? 1 : 1, 
                            boxShadow: isCompleted ? `0 0 8px ${color}, 0 0 12px ${color}` : 'none'
                        }}
                        title={`${dateStr}: ${isCompleted ? 'Done' : 'Missed'}`}
                    />
                );
            })}
        </div>
    );
};
