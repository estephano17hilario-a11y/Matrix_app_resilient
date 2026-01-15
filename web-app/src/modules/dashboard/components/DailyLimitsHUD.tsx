import React from 'react';
import { Zap, Hexagon, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { DAILY_LIMITS } from '../constants';
import { DailyLimits as DailyLimitsType } from '../../../types/User';
import { cn } from '../../../utils/cn';

interface DailyLimitsHUDProps {
  limits: DailyLimitsType;
}

export const DailyLimitsHUD: React.FC<DailyLimitsHUDProps> = ({ limits }) => {
  const stats = [
    {
      label: 'XP Cuenta',
      icon: Zap,
      current: limits.taskXp || 0,
      max: DAILY_LIMITS.TASKS.XP,
      color: 'emerald',
    },
    {
      label: 'XP Rasgo',
      icon: Hexagon,
      current: limits.taskTraitPoints || 0,
      max: DAILY_LIMITS.TASKS.TRAIT_POINTS,
      color: 'indigo',
    },
    {
      label: 'Monedas',
      icon: Coins,
      current: limits.taskGold || 0,
      max: DAILY_LIMITS.TASKS.GOLD,
      color: 'amber',
    }
  ];

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-gray-900/40 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-1.5 px-1 mb-0.5">
        <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Límites Diarios</span>
      </div>
      
      {stats.map((stat, index) => (
        <motion.div 
          key={index} 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "flex items-center justify-between gap-4 px-2 py-1.5 rounded-lg border border-white/5",
            `bg-${stat.color}-500/5`
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
                "w-4 h-4 rounded-md flex items-center justify-center bg-white/5",
                `text-${stat.color}-400`
            )}>
                <stat.icon size={10} />
            </div>
            <span className="text-[9px] font-bold text-white/70 tracking-tight">{stat.label}</span>
          </div>
          
          <div className="flex items-center gap-1 font-mono">
            <span className={cn("text-[10px] font-bold", `text-${stat.color}-400`)}>
              {Math.floor(stat.current)}
            </span>
            <span className="text-[8px] text-white/20">/</span>
            <span className="text-[10px] text-white/40">
              {stat.max}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
