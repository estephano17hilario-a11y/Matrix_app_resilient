import React from 'react';
import { Zap, Hexagon, Coins, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { DAILY_LIMITS } from '../constants';
import { DailyLimits as DailyLimitsType } from '../../../types/User';
import { cn } from '../../../utils/cn';

interface DailyLimitsHUDProps {
  limits: DailyLimitsType;
}

export const DailyLimitsHUD: React.FC<DailyLimitsHUDProps> = ({ limits }) => {
  const focusHours = (limits.focusSeconds || 0) / 3600;
  
  const stats = [
    {
      label: 'XP Tareas',
      icon: Zap,
      current: limits.taskXp || 0,
      max: DAILY_LIMITS.TASKS.XP,
      color: 'emerald',
      unit: 'XP'
    },
    {
      label: 'Focus',
      icon: Clock,
      current: focusHours,
      max: DAILY_LIMITS.FOCUS.MAX_HOURS,
      color: 'cyan',
      unit: 'h'
    },
    {
      label: 'Monedas',
      icon: Coins,
      current: limits.taskGold || 0,
      max: DAILY_LIMITS.TASKS.GOLD, // Soft limit or just for scale
      color: 'amber',
      unit: ''
    }
  ];

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-gray-900/40 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 px-1 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
        <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Límites Diarios</span>
      </div>
      
      {stats.map((stat, index) => {
        const percentage = Math.min(100, (stat.current / stat.max) * 100);
        const isMaxed = stat.current >= stat.max;
        
        return (
        <motion.div 
          key={index} 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "relative overflow-hidden flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors duration-300",
            isMaxed 
              ? `bg-${stat.color}-500/10 border-${stat.color}-500/30` 
              : "bg-white/5 border-white/5"
          )}
        >
          {/* Progress Bar Background */}
          <div 
            className={cn("absolute left-0 top-0 bottom-0 opacity-10 transition-all duration-500", `bg-${stat.color}-500`)}
            style={{ width: `${percentage}%` }}
          />

          <div className="flex items-center gap-2.5 relative z-10">
            <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center bg-black/20 backdrop-blur-sm",
                `text-${stat.color}-400`
            )}>
                <stat.icon size={12} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold text-white/80 tracking-tight">{stat.label}</span>
          </div>
          
          <div className="flex items-baseline gap-1 font-mono relative z-10">
            <span className={cn(
              "text-[11px] font-bold transition-colors", 
              isMaxed ? `text-${stat.color}-300` : `text-${stat.color}-400`
            )}>
              {stat.unit === 'h' ? stat.current.toFixed(1) : Math.floor(stat.current)}
            </span>
            <span className="text-[9px] text-white/20">/</span>
            <span className="text-[10px] text-white/40">
              {stat.max}{stat.unit}
            </span>
          </div>
        </motion.div>
      )})}
    </div>
  );
};
