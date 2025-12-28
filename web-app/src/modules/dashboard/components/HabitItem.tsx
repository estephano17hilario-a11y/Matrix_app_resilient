import React from 'react';
import { motion } from 'framer-motion';
import { Check, Flame } from 'lucide-react';
import { Habit, Attribute } from '../../../types';
import { cn } from '../../../utils/cn';

interface HabitItemProps {
  habit: Habit;
  attribute?: Attribute;
  onComplete: (e: React.MouseEvent, h: Habit) => void;
}

export const HabitItem = React.memo(({ habit, attribute, onComplete }: HabitItemProps) => {
  const Icon = attribute?.icon;
  const activeColor = habit.customColor || attribute?.color;

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      className="group relative backdrop-blur-md border border-white/10 shadow-lg rounded-[1.5rem] p-1 transition-all duration-300"
      style={{
        background: activeColor 
            ? `linear-gradient(165deg, ${activeColor}15 0%, rgba(26, 26, 32, 0.6) 100%)` 
            : 'rgba(255, 255, 255, 0.05)'
      }}
    >
      <div className="relative flex items-center p-3 gap-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-transform group-hover:scale-105"
          style={{ backgroundColor: activeColor ? `${activeColor}15` : 'rgba(255,255,255,0.05)' }}
        >
          {attribute && Icon && (
            <Icon size={22} style={{ color: activeColor }} strokeWidth={2} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-bold text-[15px] mb-1 tracking-tight truncate">
            {habit.title}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md border transition-colors",
              habit.completedToday 
                ? "text-orange-400 border-orange-500/20 bg-orange-500/10" 
                : "text-slate-500 border-white/5 bg-white/5"
            )}>
              <Flame size={10} className={habit.completedToday ? 'fill-orange-400' : ''} />
              {habit.streak}
            </div>
            {habit.type === 'QUANTITY' && (
               <span className="text-[10px] text-slate-500 font-mono">
                 {habit.currentValue || 0} / {habit.targetValue} {habit.unit}
               </span>
            )}
          </div>
        </div>

        <button 
          onClick={(e) => onComplete(e, habit)}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 relative overflow-hidden active:scale-90",
            habit.completedToday 
              ? (activeColor ? "text-white border-transparent" : "bg-gradient-to-br from-emerald-500 to-green-600 border-transparent shadow-[0_0_20px_rgba(16,185,129,0.4)]")
              : "bg-[#0a0a0c] border-white/10 hover:border-white/30"
          )}
          style={habit.completedToday && activeColor ? {
              background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
              boxShadow: `0 0 20px ${activeColor}60`
          } : undefined}
        >
          {habit.completedToday ? (
            <Check size={24} className="text-white drop-shadow-md" strokeWidth={3.5} />
          ) : (
            <div className="w-4 h-4 rounded-full border-[2.5px] border-white/20 group-hover:border-white/50 transition-colors" />
          )}
        </button>
      </div>
    </motion.div>
  );
});
