import React from 'react';
import { Heart, Zap, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface AvatarWidgetProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  streak: number;
  displayName?: string | null;
  email?: string | null;
}

const MiniLiquidBar = ({ 
  value, 
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
  const safeValue = typeof value === 'number' ? value : 0;
  const safeMax = (typeof max === 'number' && max > 0) ? max : 1;
  
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
    <div className="flex items-center gap-2 w-28">
        <Icon size={10} className={theme.iconColor} />
        <div className={`h-1.5 flex-1 ${theme.bg} rounded-full overflow-hidden relative shadow-inner`}>
             <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                className={`h-full absolute left-0 top-0 rounded-full bg-gradient-to-r ${theme.gradient}`}
             />
        </div>
    </div>
  );
};

export const AvatarWidget = React.memo(({ level, xp, nextXp, health, streak, displayName, email }: AvatarWidgetProps) => (
    <div className="flex items-center gap-3 overflow-hidden opacity-100 translate-x-0 w-auto pl-1">
        {/* AVATAR */}
        <div className="relative group active:scale-95 transition-transform shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 p-[1px] border border-white/10 shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)]">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Avatar" className="w-full h-full rounded-full object-cover opacity-90" />
            </div>
            {/* Level Badge */}
            <div className="absolute -bottom-1 -right-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-full w-5 h-5 flex items-center justify-center">
                 <span className="text-[10px] font-bold text-white">{level}</span>
            </div>
        </div>

        {/* STATS COLUMN */}
        <div className="flex flex-col gap-1">
            {/* HEADER: NAME + STREAK */}
            <div className="flex items-center gap-3">
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold text-white tracking-tight">
                        {displayName || 'Neo'}
                    </span>
                    {email && (
                        <span className="text-[10px] text-slate-400 font-mono tracking-tight truncate max-w-[120px]">
                            {email}
                        </span>
                    )}
                </div>
                {streak > 0 && (
                     <div className="flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/20">
                        <Flame size={10} className="text-orange-400 fill-orange-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-orange-400">{streak}</span>
                     </div>
                )}
            </div>

            {/* BARS */}
            <div className="flex flex-col gap-1">
                 <MiniLiquidBar value={health} max={100} color="health" icon={Heart} />
                 <MiniLiquidBar value={xp} max={nextXp} color="xp" icon={Zap} />
            </div>
        </div>
    </div>
));
