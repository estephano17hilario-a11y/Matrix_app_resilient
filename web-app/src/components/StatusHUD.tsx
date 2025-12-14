import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Crown, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
interface StatusHUDProps {
  level: number;
  xp: number;
  nextXp: number;
  health: number; // 0-100
  streak?: number;
  className?: string;
}

// --- COMPONENTS ---

const StatBar = ({ 
  value, 
  max, 
  color, 
  icon: Icon, 
  label,
  delay = 0 
}: { 
  value: number; 
  max: number; 
  color: 'red' | 'cyan' | 'purple' | 'gold'; 
  icon: React.ElementType; 
  label: string;
  delay?: number;
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Colors configuration
  const colors = {
    red: {
      bg: 'bg-rose-500',
      gradient: 'from-rose-500 via-red-500 to-orange-500',
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]',
      text: 'text-rose-400'
    },
    cyan: {
      bg: 'bg-cyan-500',
      gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.4)]',
      text: 'text-cyan-400'
    },
    purple: {
      bg: 'bg-purple-500',
      gradient: 'from-fuchsia-500 via-purple-600 to-violet-600',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]',
      text: 'text-purple-400'
    },
    gold: {
      bg: 'bg-amber-400',
      gradient: 'from-amber-300 via-yellow-400 to-orange-400',
      glow: 'shadow-[0_0_15px_rgba(251,191,36,0.4)]',
      text: 'text-amber-400'
    }
  };

  const theme = colors[color];

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-end px-1">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className={theme.text} />
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{label}</span>
        </div>
        <span className={cn("text-[10px] font-black tracking-tighter", theme.text)}>
          {Math.floor(value)} <span className="text-slate-600">/ {max}</span>
        </span>
      </div>
      
      {/* Bar Container */}
      <div className="h-2.5 w-full bg-slate-900/50 rounded-full border border-white/5 relative overflow-hidden backdrop-blur-sm">
        {/* Background Pulse (Low Health Warning) */}
        {color === 'red' && percentage < 30 && (
            <motion.div 
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-red-500/20"
            />
        )}

        {/* The Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 15, delay }}
          className={cn(
            "h-full absolute top-0 left-0 rounded-full bg-gradient-to-r",
            theme.gradient,
            theme.glow
          )}
        >
          {/* Shine Effect */}
          <div className="absolute top-0 right-0 bottom-0 w-[20px] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] translate-x-full animate-shine" />
        </motion.div>
      </div>
    </div>
  );
};

export default function StatusHUD({ level, xp, nextXp, health, streak = 0, className }: StatusHUDProps) {
  
  return (
    <div className={cn("w-full flex flex-col gap-4 p-1", className)}>
      
      {/* 💎 GLASS CARD CONTAINER */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl p-5">
        
        {/* Decorative Light Leaks */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />

        {/* HEADER: AVATAR & LEVEL */}
        <div className="flex items-center gap-4 mb-6 relative z-10">
            {/* Level Badge */}
            <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden group">
                    <span className="text-2xl font-black text-white z-10">{level}</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent opacity-50" />
                    
                    {/* Ring Spinner */}
                    <div className="absolute inset-0 border-2 border-transparent border-t-blue-500/50 rounded-2xl animate-spin-slow" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-0.5 text-[9px] font-bold text-slate-300 uppercase tracking-wider shadow-sm">
                    Lvl
                </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
                <h2 className="text-lg font-bold text-white tracking-tight leading-none mb-1">Operative</h2>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <Crown size={10} className="text-yellow-400" /> Elite
                    </span>
                    {streak > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 flex items-center gap-1">
                            <Zap size={10} /> {streak} Day Streak
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* STATUS BARS */}
        <div className="space-y-4 relative z-10">
            {/* Health Bar (Vitality) */}
            <StatBar 
                label="Vitality" 
                value={health} 
                max={100} 
                color="red" 
                icon={Activity} 
                delay={0.1}
            />

            {/* XP Bar (Sync/Evolution) */}
            <StatBar 
                label="Evolution" 
                value={xp} 
                max={nextXp} 
                color="cyan" 
                icon={Zap} 
                delay={0.2}
            />
        </div>

      </div>

    </div>
  );
}
