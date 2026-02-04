import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { getStartOfWeek, toLocalISOString, addDays } from '../../../utils/dateUtils';

interface HabitWeekViewProps {
  history: string[];
  activeColor?: string;
  onToggleDay: (date: string) => void;
}

export const HabitWeekView: React.FC<HabitWeekViewProps> = ({ history, activeColor, onToggleDay }) => {
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek, i);
    const dateStr = toLocalISOString(date);
    const isCompleted = history.some(d => d.startsWith(dateStr));
    const isToday = dateStr === toLocalISOString(today);
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase();
    
    return {
      dateStr,
      isCompleted,
      isToday,
      dayName,
    };
  });

    return (
        <div className="flex justify-between items-center px-1 py-2 mt-2">
            {weekDays.map((day) => (
                <div key={day.dateStr} className="flex flex-col items-center gap-2">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.1 }}
                        onClick={() => onToggleDay(day.dateStr)}
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 relative group",
                            day.isCompleted
                                ? "border-transparent shadow-lg"
                                : "bg-white/10 border-white/10 hover:border-white/20 hover:bg-white/20",
                            day.isToday && !day.isCompleted && "ring-1 ring-white/30"
                        )}
                        style={day.isCompleted ? {
                            backgroundColor: activeColor || '#10b981',
                            boxShadow: `0 0 15px ${activeColor || '#10b981'}50`
                        } : undefined}
                    >
                        {day.isCompleted ? (
                            <Check size={18} className="text-white drop-shadow-sm" strokeWidth={3} />
                        ) : (
                            day.isToday && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_white]" />
                            )
                        )}
                    </motion.button>
                    <span className={cn(
                        "text-[10px] font-bold tracking-tight",
                        day.isToday ? "text-white" : "text-white/30"
                    )}>
                        {day.dayName}
                    </span>
                </div>
            ))}
        </div>
    );
};
