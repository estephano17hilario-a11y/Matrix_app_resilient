import React from 'react';
import { Heart, Zap, Flame, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { DailyLimitsHUD } from './DailyLimitsHUD';
import { DailyLimits } from '../../../types/User';
import { GoldCounter } from '../../store/components/GoldCounter';
import { getAvatarPath } from '../../../config/avatars';

interface AvatarWidgetProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  streak: number;
  gold?: number;
  dailyLimits?: DailyLimits;
  displayName?: string | null;
  email?: string | null;
  isPro?: boolean;
  avatarId?: string;
}

const MiniLiquidBar = ({  value, 
  max, 
  color, 
  icon: Icon 
}: { 
  value: number; 
  max: number; 
  color: 'health' | 'xp';
  icon: React.ElementType;
}) => {
  // 🛡️ CÓDIGO BLINDADO (SAFE CALCULATION)
  const safeValue = typeof value === 'number' ? Math.round(value) : 0;
  const safeMax = (typeof max === 'number' && max > 0) ? Math.round(max) : 1;
  
  const rawPercent = (safeValue / safeMax) * 100;
  const percent = Number.isFinite(rawPercent) 
    ? Math.min(100, Math.max(0, rawPercent)) 
    : 0;
  
  const themes = {
    health: {
      gradient: 'from-rose-500 to-red-600',
      shadow: 'shadow-rose-500/50',
      iconColor: 'text-rose-400',
      bg: 'bg-rose-950/30'
    },
    xp: {
      gradient: 'from-emerald-400 to-teal-500',
      shadow: 'shadow-emerald-500/50',
      iconColor: 'text-emerald-400',
      bg: 'bg-emerald-950/30'
    }
  };

  const theme = themes[color];

  return (
    <div className="flex items-center gap-2 w-20 sm:w-28 md:w-40 transition-all">
        <Icon size={10} className={theme.iconColor} />
        <div className={`h-1.5 flex-1 ${theme.bg} rounded-full overflow-hidden relative shadow-inner`}>
             <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                className={`h-full absolute left-0 top-0 rounded-full bg-gradient-to-r ${theme.gradient}`}
             />
        </div>
        <span className="hidden sm:inline-block text-[9px] font-mono text-white/50 w-[45px] text-right tabular-nums">{safeValue}/{safeMax}</span>
    </div>
  );
};

export const AvatarWidget = React.memo(({ level, xp, nextXp, health, streak, gold = 0, dailyLimits, displayName, email, isPro, avatarId }: AvatarWidgetProps) => {
    const avatarPath = getAvatarPath(avatarId);
    const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80";

    return (
    <div className="flex items-center gap-3 overflow-hidden opacity-100 translate-x-0 w-auto pl-1">
        {/* AVATAR */}
        <div className="relative group active:scale-95 transition-transform shrink-0">
            <div className={`w-12 h-12 rounded-full p-[1px] border border-white/10 shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)] ${isPro ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500' : 'bg-gradient-to-tr from-slate-800 to-slate-900'}`}>
                <img src={avatarPath || defaultAvatar} alt="Avatar" className="w-full h-full rounded-full object-cover opacity-90" />
            </div>
            {/* Level Badge */}
            <div className="absolute -bottom-1 -right-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-full w-5 h-5 flex items-center justify-center z-10">
                 <span className="text-[10px] font-bold text-white">{level}</span>
            </div>
        </div>

        {/* STATS COLUMN */}
        <div className="flex flex-col gap-1">
            {/* HEADER: NAME + STREAK + GOLD */}
            <div className="flex items-center gap-3">
                <div className="flex flex-col leading-none">
                    <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[80px] sm:max-w-none">
                        {displayName || 'Neo'}
                    </span>
                    {email && (
                        <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono tracking-tight truncate max-w-[120px]">
                            {email}
                        </span>
                    )}
                </div>
                
                <div className="flex flex-col gap-1 items-end relative">
                    {/* DAILY LIMITS HUD - POSITIONED ABOVE STREAK/GOLD */}
                    {dailyLimits && (
                        <div className="absolute -top-32 -right-4 w-40 z-30">
                            <DailyLimitsHUD limits={dailyLimits} />
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        {streak > 0 && (
                            <div className="flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/20">
                                <Flame size={10} className="text-orange-400 fill-orange-400 animate-pulse" />
                                <span className="text-[10px] font-mono font-bold text-orange-400">{streak}</span>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                            <Coins size={10} className="text-amber-400" />
                            <span className="text-[10px] font-mono font-bold text-amber-400">
                                <GoldCounter value={gold} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BARS */}
            <div className="flex flex-col gap-1">
                 <MiniLiquidBar value={health} max={100} color="health" icon={Heart} />
                 <MiniLiquidBar value={xp} max={nextXp} color="xp" icon={Zap} />
            </div>
        </div>
    </div>
  );
});
