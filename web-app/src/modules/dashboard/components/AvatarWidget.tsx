import React from 'react';
import { Heart, Zap, Flame, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { DailyLimitsHUD } from './DailyLimitsHUD';
import { DailyLimits } from '@/types/User';
import { GoldCounter } from '@/modules/store/components/GoldCounter';
import { getAvatarPath, getAvatarConfig } from '@/config/avatars';

interface AvatarWidgetProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  maxHealth?: number;
  streak: number;
  gold?: number;
  dailyLimits?: DailyLimits;
  displayName?: string | null;
  email?: string | null;
  isPro?: boolean;
  avatarId?: string;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onUpdateLevel?: (newLevel: number) => void;
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
      gradient: 'from-rose-500 via-red-500 to-rose-600',
      shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      iconColor: 'text-rose-400',
      bg: 'bg-rose-950/20',
      track: 'bg-rose-950/40'
    },
    xp: {
      gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
      shadow: 'shadow-[0_0_10px_rgba(34,211,238,0.4)]',
      iconColor: 'text-cyan-400',
      bg: 'bg-cyan-950/20',
      track: 'bg-cyan-950/40'
    }
  };

  const theme = themes[color];

  return (
    <div className="flex items-center gap-3 w-40 sm:w-48 transition-all group/bar">
        <div className={`flex items-center justify-center w-5 h-5 rounded-md ${theme.bg} backdrop-blur-sm border border-white/5`}>
            <Icon size={12} className={theme.iconColor} />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
            <div className="flex items-center justify-between px-0.5">
                 <span className={`text-[9px] font-bold tracking-wider uppercase ${theme.iconColor} opacity-80`}>{color}</span>
                 <span className="text-[9px] font-mono text-white/50 tabular-nums">{safeValue}/{safeMax}</span>
            </div>
            <div className={`h-1.5 w-full ${theme.track} rounded-full overflow-hidden relative border border-white/5`}>
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className={`h-full absolute left-0 top-0 rounded-full bg-gradient-to-r ${theme.gradient} ${theme.shadow}`}
                 />
            </div>
        </div>
    </div>
  );
};

export const AvatarWidget = React.memo(({ level, xp, nextXp, health, maxHealth, streak, gold = 0, dailyLimits, displayName, avatarId, avatarShape = 'CIRCLE', onUpdateLevel }: AvatarWidgetProps) => {
    const avatarPath = getAvatarPath(avatarId);
    const avatarConfig = getAvatarConfig(avatarId);
    const themeColor = avatarConfig?.themeColor;
    const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80";

    const shapeClass = avatarShape === 'SQUARE' ? 'rounded-2xl' : 'rounded-full';

    // Dynamic styles for Aura
    const auraStyle = themeColor ? {
        boxShadow: `0 0 25px -5px ${themeColor}`,
    } : {};

    return (
    <div className="flex items-center gap-4 opacity-100 translate-x-0 w-auto pl-1">
        {/* AVATAR - RESTORED & CENTERED */}
        <div className="relative group active:scale-95 transition-transform shrink-0">
            <div 
                className={`w-14 h-14 ${shapeClass} overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/50`}
                style={auraStyle}
            >
                <img 
                    src={avatarPath || defaultAvatar} 
                    alt="Avatar" 
                    className={`w-full h-full object-cover object-[50%_20%] transform transition-transform duration-700 group-hover:scale-110`} 
                />
                
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
            
            {/* Level Badge - Minimalist Corner Circle */}
            <div 
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center z-10 cursor-pointer hover:bg-white/20 transition-all shadow-lg group-hover:scale-110"
                onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateLevel) {
                        const input = prompt("Enter new level:", level.toString());
                        if (input !== null) {
                            const newLevel = parseInt(input, 10);
                            if (!isNaN(newLevel) && newLevel > 0) {
                                onUpdateLevel(newLevel);
                            }
                        }
                    }
                }}
            >
                 <span className="text-[9px] font-bold text-white font-mono">{level}</span>
            </div>
        </div>

        {/* STATS COLUMN - PREMIUM APPLE STYLE */}
        <div className="flex flex-col gap-2 relative">
             {/* DAILY LIMITS HUD - POSITIONED ABOVE (Adjusted Z-Index & Position) */}
             {dailyLimits && (
                <div className="absolute -top-32 -right-4 w-40 z-[100] pointer-events-none">
                    <DailyLimitsHUD limits={dailyLimits} />
                </div>
             )}

            {/* HEADER: NAME + STREAK */}
            <div className="flex items-center justify-between min-w-[180px]">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white tracking-tight drop-shadow-md">
                        {displayName || 'Neo'}
                    </span>
                    {streak > 0 && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                            <Flame size={10} className="text-orange-400 fill-orange-400 animate-pulse" />
                            <span className="text-[9px] font-mono font-bold text-orange-400">{streak}</span>
                        </div>
                    )}
                </div>
                
                {/* Gold Pill - Premium Look */}
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]">
                    <Coins size={12} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-xs font-mono font-bold text-amber-300">
                        <GoldCounter value={gold} />
                    </span>
                </div>
            </div>

            {/* BARS - REFINED (Restored Numbers) */}
            <div className="flex flex-col gap-1.5">
                 <MiniLiquidBar value={health} max={maxHealth || 100} color="health" icon={Heart} />
                 <MiniLiquidBar value={xp} max={nextXp} color="xp" icon={Zap} />
            </div>
        </div>
    </div>
  );
});
