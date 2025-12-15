import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Crown, Flame, Sparkles } from 'lucide-react';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { cn } from '../../utils/cn';

interface Attribute {
  id: string;
  label: string;
  level: number;
  xp: number;
  maxXp: number;
  color: string;
  icon: React.ElementType;
}

interface PlayerHUDProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number;
  streak: number;
  attributes?: Attribute[];
  className?: string;
}

const LiquidBar = ({ 
  value, 
  max, 
  color,
  label,
  icon: Icon
}: { 
  value: number; 
  max: number; 
  color: 'health' | 'xp' | 'streak';
  label: string;
  icon: React.ElementType;
}) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  
  const themes = {
    health: {
      gradient: 'from-rose-500 via-red-500 to-rose-400',
      shadow: 'shadow-rose-500/50',
      iconColor: 'text-rose-400',
    },
    xp: {
      gradient: 'from-emerald-400 to-teal-500',
      shadow: 'shadow-emerald-500/50',
      iconColor: 'text-emerald-400',
    },
    streak: {
      gradient: 'from-orange-400 to-amber-500',
      shadow: 'shadow-orange-500/50',
      iconColor: 'text-orange-400',
    }
  };

  const theme = themes[color];

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className={theme.iconColor} />
          <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">{label}</span>
        </div>
        <span className="font-mono text-[10px] text-white/80">
          <span className={cn("font-bold text-lg", theme.iconColor)}>{Math.floor(value)}</span>
          <span className="opacity-40 text-xs"> / {max}</span>
        </span>
      </div>

      <div className="h-3 w-full bg-gray-800/50 rounded-full shadow-inner relative overflow-hidden ring-1 ring-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
          className={cn("h-full absolute left-0 top-0 rounded-full bg-gradient-to-r", theme.gradient)}
        >
          {/* Head Glow */}
          <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full blur-[1px] shadow-lg", theme.shadow)} />
        </motion.div>
      </div>
    </div>
  );
};

const TraitBar = ({ attribute, mini = false }: { attribute: Attribute, mini?: boolean }) => {
    const percent = Math.min(100, Math.max(0, (attribute.xp / attribute.maxXp) * 100));
    const Icon = attribute.icon;
    
    return (
        <div className={cn("flex flex-col gap-1", mini ? "w-full" : "w-full")}>
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-white/5" style={{ color: attribute.color }}>
                        <Icon size={12} />
                    </div>
                    {!mini && <span className="font-medium text-white/80">{attribute.label}</span>}
                </div>
                <span className="font-mono text-[10px] opacity-60">Lvl {attribute.level}</span>
            </div>
            {!mini && (
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: attribute.color }}
                    />
                </div>
            )}
        </div>
    );
};

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  level,
  xp,
  nextXp,
  health,
  streak,
  attributes = [],
  className
}) => {
  // Sort attributes by XP/Level to find "Most Used"
  const sortedAttributes = [...attributes].sort((a, b) => b.xp - a.xp).slice(0, 3);

  return (
    <GlassPanel className={cn("p-5 flex flex-col gap-6", className)}>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg ring-1 ring-white/20">
            <Crown size={24} className="text-white drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white leading-none tracking-tight">Level {level}</h2>
            <p className="text-xs text-indigo-300 font-medium mt-1">Matrix Architect</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
             <Flame size={14} className="text-orange-400 fill-orange-400 animate-pulse" />
             <span className="text-sm font-bold text-orange-100">{streak} Day Streak</span>
           </div>
        </div>
      </div>

      {/* CORE STATS (HP/XP) - "EL ACTUAL" */}
      <div className="space-y-4">
        <LiquidBar 
          value={health} 
          max={100} 
          color="health" 
          label="Vitality (HP)" 
          icon={Activity} 
        />
        <LiquidBar 
          value={xp} 
          max={nextXp} 
          color="xp" 
          label="Experience (XP)" 
          icon={Zap} 
        />
      </div>

      {/* MOST USED TRAITS - "GRAFICO QUE RAZGOS HAGO MAS" (Simplified) */}
      {sortedAttributes.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles size={12} className="text-yellow-400" /> Top Attributes
            </h3>
            <div className="grid grid-cols-3 gap-2">
                {sortedAttributes.map(attr => (
                    <div key={attr.id} className="bg-white/5 rounded-xl p-2 flex flex-col items-center gap-1 border border-white/5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 mb-1" style={{ color: attr.color }}>
                            <attr.icon size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-white/90">{attr.label}</span>
                        <span className="text-[9px] font-mono text-white/50">Lvl {attr.level}</span>
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* ALL TRAITS - "GRAFICO ANTIGUO" (Restored & Simplified) */}
      {attributes.length > 0 && (
          <div className="pt-2 border-t border-white/5">
             <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
                Trait Matrix
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {attributes.map(attr => (
                    <TraitBar key={attr.id} attribute={attr} />
                ))}
            </div>
          </div>
      )}
    </GlassPanel>
  );
};
