import { motion } from 'framer-motion';
import { GAMIFICATION_CONFIG } from '../../config/gamification';
import { DailyLimits } from '../../types/User';
import { Zap, Coins, Dna } from 'lucide-react';

interface FocusLimitsProps {
  dailyLimits: DailyLimits;
}

export const FocusLimits: React.FC<FocusLimitsProps> = ({ dailyLimits }) => {
  // Use Explicit Limits for Synergy
  const maxXP = GAMIFICATION_CONFIG.MAX_DAILY_FOCUS_XP;
  const maxTP = GAMIFICATION_CONFIG.MAX_DAILY_FOCUS_TP;
  const maxCoins = GAMIFICATION_CONFIG.MAX_DAILY_FOCUS_GOLD;

  const currentXP = dailyLimits?.focusXp || 0;
  const currentTP = dailyLimits?.focusTraitPoints || 0;
  const currentCoins = dailyLimits?.focusGold || 0;
  
  // Progress Percentages (Capped at 100% for visual bar)
  const xpPercent = maxXP > 0 ? Math.min(100, (currentXP / maxXP) * 100) : 0;
  const tpPercent = maxTP > 0 ? Math.min(100, (currentTP / maxTP) * 100) : 0;
  const coinsPercent = maxCoins > 0 ? Math.min(100, (currentCoins / maxCoins) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-2 w-full px-2 pt-2 pb-2">
      {/* XP Bar */}
      <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-[9px] font-bold text-fuchsia-400 uppercase tracking-wider">
            <Zap size={10} />
            XP
          </div>
          <span className="text-[9px] font-mono text-white/60 tabular-nums">
            {Math.floor(currentXP)}/{maxXP}
          </span>
        </div>
        <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPercent}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500"
          />
        </div>
      </div>

      {/* Trait Points Bar */}
      <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
            <Dna size={10} />
            TP
          </div>
          <span className="text-[9px] font-mono text-white/60 tabular-nums">
            {Math.floor(currentTP)}/{maxTP}
          </span>
        </div>
        <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${tpPercent}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
          />
        </div>
      </div>

      {/* Coins Bar */}
      <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
            <Coins size={10} />
            Gold
          </div>
          <span className="text-[9px] font-mono text-white/60 tabular-nums">
            {Math.floor(currentCoins)}/{maxCoins}
          </span>
        </div>
        <div className="mt-1 h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${coinsPercent}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500"
          />
        </div>
      </div>
    </div>
  );
};
