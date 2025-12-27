import React, { useMemo } from 'react';
import { Habit } from '../../../types';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, subMonths } from 'date-fns';

interface HabitHeatmapProps {
    habit: Habit;
    color?: string;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habit, color = '#10b981' }) => {
    // Generate last 3 months + current
    const months = useMemo(() => {
        const result = [];
        const today = new Date();
        for (let i = 2; i >= 0; i--) {
            result.push(subMonths(today, i));
        }
        return result;
    }, []);

    const historySet = useMemo(() => new Set(habit.history || []), [habit.history]);

    return (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide mask-linear-fade">
            {months.map((monthDate, mIndex) => {
                const days = eachDayOfInterval({
                    start: startOfMonth(monthDate),
                    end: endOfMonth(monthDate)
                });

                return (
                    <div key={mIndex} className="flex flex-col gap-1 min-w-[100px]">
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">
                            {format(monthDate, 'MMMM')}
                        </div>
                        <div className="grid grid-rows-7 grid-flow-col gap-1">
                            {days.map((day, dIndex) => {
                                const dateStr = day.toISOString();
                                const isCompleted = historySet.has(dateStr) || Array.from(historySet).some(h => h.startsWith(format(day, 'yyyy-MM-dd')));
                                
                                return (
                                    <div
                                        key={dIndex}
                                        className={`w-2 h-2 rounded-sm transition-all duration-300 ${
                                            isCompleted 
                                            ? 'opacity-100 shadow-[0_0_8px_-2px_currentColor]' 
                                            : 'bg-white/5 opacity-100'
                                        }`}
                                        style={{ 
                                            backgroundColor: isCompleted ? color : undefined 
                                        }}
                                        title={format(day, 'yyyy-MM-dd')}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
