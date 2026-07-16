import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Award, Target, Flame, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScoreWidgetProps {
  score: number;
  size?: '1x1' | '2x1' | '1x2' | '2x2' | '3x3';
  className?: string;
}

export const ScoreWidget: React.FC<ScoreWidgetProps> = React.memo(({ score, size = '2x2', className }) => {
  const { t } = useTranslation();
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  
  // Choose color based on score value
  let scoreColor = 'from-emerald-400 to-teal-500';
  let glowColor = 'rgba(16,185,129,0.3)';
  let textClass = 'text-emerald-400';
  let shadowClass = 'shadow-emerald-500/20 border-emerald-500/20';

  if (clampedScore < 30) {
    scoreColor = 'from-rose-500 to-red-600';
    glowColor = 'rgba(239,68,68,0.3)';
    textClass = 'text-rose-400';
    shadowClass = 'shadow-rose-500/20 border-rose-500/20';
  } else if (clampedScore < 70) {
    scoreColor = 'from-amber-400 to-orange-500';
    glowColor = 'rgba(245,158,11,0.3)';
    textClass = 'text-amber-400';
    shadowClass = 'shadow-amber-500/20 border-amber-500/20';
  } else if (clampedScore < 90) {
    scoreColor = 'from-cyan-400 to-blue-500';
    glowColor = 'rgba(34,211,238,0.3)';
    textClass = 'text-cyan-400';
    shadowClass = 'shadow-cyan-500/20 border-cyan-500/20';
  }

  // Render variations based on size:
  if (size === '1x1') {
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`glass-panel p-2 flex flex-col items-center justify-center aspect-square rounded-2xl border border-white/10 bg-black/40 text-center relative overflow-hidden group shadow-md ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="24" cy="24" r="20" className="stroke-white/5 fill-transparent" strokeWidth="3" />
            <motion.circle 
              cx="24" cy="24" r="20" 
              className="fill-transparent" 
              stroke={`url(#grad-1x1-${clampedScore})`}
              strokeWidth="3.5" 
              strokeDasharray={2 * Math.PI * 20}
              initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 20 - (clampedScore / 100) * (2 * Math.PI * 20) }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id={`grad-1x1-${clampedScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: scoreColor.includes('emerald') ? '#34d399' : (scoreColor.includes('rose') ? '#fb7185' : (scoreColor.includes('amber') ? '#fbbf24' : '#22d3ee')) }} />
                <stop offset="100%" style={{ stopColor: scoreColor.includes('emerald') ? '#14b8a6' : (scoreColor.includes('rose') ? '#dc2626' : (scoreColor.includes('amber') ? '#f97316' : '#3b82f6')) }} />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-[10px] font-black text-white">{clampedScore}%</span>
        </div>
        <span className="text-[8px] font-bold text-white/40 tracking-wider uppercase mt-1 truncate max-w-full">{t('dashboard.scoreShort', 'SCORE')}</span>
      </motion.div>
    );
  }

  if (size === '2x1') {
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`glass-panel p-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 relative overflow-hidden group shadow-md ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="28" cy="28" r="22" className="stroke-white/5 fill-transparent" strokeWidth="4" />
            <motion.circle 
              cx="28" cy="28" r="22" 
              className="fill-transparent" 
              stroke={`url(#grad-2x1-${clampedScore})`}
              strokeWidth="4.5" 
              strokeDasharray={2 * Math.PI * 22}
              initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 22 - (clampedScore / 100) * (2 * Math.PI * 22) }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id={`grad-2x1-${clampedScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: scoreColor.includes('emerald') ? '#34d399' : (scoreColor.includes('rose') ? '#fb7185' : (scoreColor.includes('amber') ? '#fbbf24' : '#22d3ee')) }} />
                <stop offset="100%" style={{ stopColor: scoreColor.includes('emerald') ? '#14b8a6' : (scoreColor.includes('rose') ? '#dc2626' : (scoreColor.includes('amber') ? '#f97316' : '#3b82f6')) }} />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-xs font-black text-white">{clampedScore}%</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-bold text-white/30 tracking-widest uppercase mb-0.5">{t('dashboard.productivityScore', 'Productivity')}</span>
          <span className={`text-sm font-black uppercase tracking-wide truncate ${textClass}`}>
            {clampedScore >= 90 ? t('dashboard.scoreRank.elite', 'ELITE') :
             clampedScore >= 70 ? t('dashboard.scoreRank.optimal', 'OPTIMAL') :
             clampedScore >= 30 ? t('dashboard.scoreRank.steady', 'STEADY') :
             t('dashboard.scoreRank.relapse', 'WARNING')}
          </span>
          <span className="text-[9px] font-medium text-white/50 mt-0.5 truncate">{t('dashboard.liveScoreUpdated', 'Live score updated')}</span>
        </div>
      </motion.div>
    );
  }

  if (size === '1x2') {
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`glass-panel p-3 flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/40 text-center relative overflow-hidden group shadow-md ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <span className="text-[9px] font-bold text-white/30 tracking-widest uppercase mt-1">{t('dashboard.scoreShort', 'SCORE')}</span>
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0 my-3">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="26" className="stroke-white/5 fill-transparent" strokeWidth="4.5" />
            <motion.circle 
              cx="32" cy="32" r="26" 
              className="fill-transparent" 
              stroke={`url(#grad-1x2-${clampedScore})`}
              strokeWidth="5" 
              strokeDasharray={2 * Math.PI * 26}
              initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 26 - (clampedScore / 100) * (2 * Math.PI * 26) }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id={`grad-1x2-${clampedScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: scoreColor.includes('emerald') ? '#34d399' : (scoreColor.includes('rose') ? '#fb7185' : (scoreColor.includes('amber') ? '#fbbf24' : '#22d3ee')) }} />
                <stop offset="100%" style={{ stopColor: scoreColor.includes('emerald') ? '#14b8a6' : (scoreColor.includes('rose') ? '#dc2626' : (scoreColor.includes('amber') ? '#f97316' : '#3b82f6')) }} />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-sm font-black text-white">{clampedScore}%</span>
        </div>
        <div className="flex flex-col items-center mb-1">
          <span className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
            {clampedScore >= 70 ? t('dashboard.scoreRank.optimalShort', 'OPTIMAL') : t('dashboard.scoreRank.steadyShort', 'STEADY')}
          </span>
        </div>
      </motion.div>
    );
  }

  if (size === '3x3') {
    return (
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className={`glass-panel p-6 flex flex-col justify-between rounded-[32px] border border-white/10 bg-black/40 relative overflow-hidden group shadow-lg ${className}`}
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] pointer-events-none transition-colors duration-500" style={{ backgroundColor: glowColor }} />
        
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <Award size={16} className={textClass} />
            </div>
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">{t('dashboard.matrixProductivity', 'MATRIX PRODUCTIVITY')}</span>
          </div>
          <span className="text-[10px] font-mono text-white/30">{t('dashboard.analytica', 'ANALYTICA V1')}</span>
        </div>

        <div className="flex items-center gap-6 my-4">
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" className="stroke-white/5 fill-transparent" strokeWidth="8" />
              <motion.circle 
                cx="56" cy="56" r="48" 
                className="fill-transparent" 
                stroke={`url(#grad-3x3-${clampedScore})`}
                strokeWidth="8.5" 
                strokeDasharray={2 * Math.PI * 48}
                initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 48 - (clampedScore / 100) * (2 * Math.PI * 48) }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id={`grad-3x3-${clampedScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: scoreColor.includes('emerald') ? '#34d399' : (scoreColor.includes('rose') ? '#fb7185' : (scoreColor.includes('amber') ? '#fbbf24' : '#22d3ee')) }} />
                  <stop offset="100%" style={{ stopColor: scoreColor.includes('emerald') ? '#14b8a6' : (scoreColor.includes('rose') ? '#dc2626' : (scoreColor.includes('amber') ? '#f97316' : '#3b82f6')) }} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white leading-none">{clampedScore}</span>
              <span className="text-[9px] font-bold text-white/30 uppercase mt-0.5">%</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('dashboard.status', 'Status')}</span>
              <h3 className={`text-lg font-black uppercase tracking-wide ${textClass}`}>
                {clampedScore >= 90 ? t('dashboard.scoreRank.elite', 'ELITE LEVEL') :
                 clampedScore >= 70 ? t('dashboard.scoreRank.optimal', 'OPTIMAL OPERATION') :
                 clampedScore >= 30 ? t('dashboard.scoreRank.steady', 'STEADY PATH') :
                 t('dashboard.scoreRank.relapse', 'CRITICAL NOTICE')}
              </h3>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              {clampedScore >= 90 ? t('dashboard.scoreDesc.elite', 'Your cognitive and actionable metrics are at maximum efficiency. Output is optimal.') :
               clampedScore >= 70 ? t('dashboard.scoreDesc.optimal', 'You are performing with steady drive. Keep consistency to level up.') :
               clampedScore >= 30 ? t('dashboard.scoreDesc.steady', 'A modest degree of actions completed. Push slightly more to build momentum.') :
               t('dashboard.scoreDesc.relapse', 'Action gap detected. Re-engage with your habits immediately to secure your attributes.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4 w-full text-center">
          <div>
            <span className="text-[9px] font-bold text-white/30 uppercase block">{t('dashboard.efficiency', 'Efficiency')}</span>
            <span className="text-xs font-mono text-white/80 font-bold block mt-0.5">{clampedScore}%</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-white/30 uppercase block">{t('dashboard.momentum', 'Momentum')}</span>
            <span className="text-xs font-mono text-cyan-400 font-bold block mt-0.5">
              {clampedScore >= 70 ? 'HIGH' : clampedScore >= 30 ? 'MID' : 'LOW'}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-white/30 uppercase block">{t('dashboard.stability', 'Stability')}</span>
            <span className="text-xs font-mono text-teal-400 font-bold block mt-0.5">94.2%</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // DEFAULT: 2x2 Widget
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`glass-panel p-4 flex flex-col items-center justify-between aspect-square rounded-[28px] border border-white/10 bg-black/40 relative overflow-hidden group shadow-md ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[30px] pointer-events-none transition-colors duration-500" style={{ backgroundColor: glowColor }} />

      <div className="flex items-center justify-between w-full z-10 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
            <Target size={9} className={textClass} />
          </div>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{t('dashboard.productivityScore', 'Productivity')}</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      <div className="relative w-24 h-24 flex items-center justify-center shrink-0 my-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r="40" className="stroke-white/5 fill-transparent" strokeWidth="6" />
          <motion.circle 
            cx="48" cy="48" r="40" 
            className="fill-transparent" 
            stroke={`url(#grad-2x2-${clampedScore})`}
            strokeWidth="6.5" 
            strokeDasharray={2 * Math.PI * 40}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 40 - (clampedScore / 100) * (2 * Math.PI * 40) }}
            transition={{ duration: 1, ease: "easeOut" }}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id={`grad-2x2-${clampedScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: scoreColor.includes('emerald') ? '#34d399' : (scoreColor.includes('rose') ? '#fb7185' : (scoreColor.includes('amber') ? '#fbbf24' : '#22d3ee')) }} />
              <stop offset="100%" style={{ stopColor: scoreColor.includes('emerald') ? '#14b8a6' : (scoreColor.includes('rose') ? '#dc2626' : (scoreColor.includes('amber') ? '#f97316' : '#3b82f6')) }} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white leading-none">{clampedScore}</span>
          <span className="text-[8px] font-bold text-white/30 uppercase mt-0.5">%</span>
        </div>
      </div>

      <div className="flex flex-col items-center w-full z-10 shrink-0 text-center">
        <span className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
          {clampedScore >= 90 ? t('dashboard.scoreRank.elite', 'ELITE') :
           clampedScore >= 70 ? t('dashboard.scoreRank.optimal', 'OPTIMAL') :
           clampedScore >= 30 ? t('dashboard.scoreRank.steady', 'STEADY') :
           t('dashboard.scoreRank.relapse', 'WARNING')}
        </span>
        <span className="text-[8px] font-semibold text-white/30 mt-0.5 uppercase tracking-wider">{t('dashboard.matrixStandard', 'MATRIX STANDARD')}</span>
      </div>
    </motion.div>
  );
});
