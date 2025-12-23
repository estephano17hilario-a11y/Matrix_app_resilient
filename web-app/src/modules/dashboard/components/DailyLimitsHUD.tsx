import React from 'react';
import { Zap, Hexagon, Coins } from 'lucide-react';
import { DAILY_LIMITS } from '../constants';
import { DailyLimits as DailyLimitsType } from '../../../types/User';

interface DailyLimitsHUDProps {
  limits: DailyLimitsType;
}

export const DailyLimitsHUD: React.FC<DailyLimitsHUDProps> = ({ limits }) => {
  // Account XP limit: DAILY_LIMITS.TASKS.XP (1500)
  // Trait XP limit: DAILY_LIMITS.TASKS.TRAIT_POINTS (600)
  // Gold limit: DAILY_LIMITS.TASKS.GOLD (300)

  const stats = [
    {
      label: 'XP Cuenta',
      icon: Zap,
      current: limits.taskXp || 0,
      max: DAILY_LIMITS.TASKS.XP,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'XP Rasgo',
      icon: Hexagon,
      current: limits.taskTraitPoints || 0,
      max: DAILY_LIMITS.TASKS.TRAIT_POINTS,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10'
    },
    {
      label: 'Monedas',
      icon: Coins,
      current: limits.taskGold || 0,
      max: DAILY_LIMITS.TASKS.GOLD,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="flex flex-col gap-1 mb-2">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg border border-white/5 backdrop-blur-md ${stat.bgColor}`}
        >
          <div className="flex items-center gap-1.5">
            <stat.icon size={10} className={stat.color} />
            <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">{stat.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-mono font-bold ${stat.color}`}>
              {Math.floor(stat.current)}
            </span>
            <span className="text-[8px] font-mono text-white/30">/</span>
            <span className="text-[10px] font-mono text-white/50">
              {stat.max}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
