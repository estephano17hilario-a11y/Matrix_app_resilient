import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DailyFeedEntry } from '../../../types/DailyFeedEntry';
import { CheckCircle2, Clock, Flame, Calendar } from 'lucide-react';

interface FeedWeekSummaryProps {
  entries: DailyFeedEntry[];
  delay?: number;
  consistencyAssistant?: {
    prevWeekTotal: number;
    accumulatedDeficit: number;
    remainingDays: number;
    deficitShare: number;
    prevWeekTodayScore: number;
    todayTargetScore: number;
    todayIdx: number;
    hasDrop: boolean;
  } | null;
}

export const FeedWeekSummary: React.FC<FeedWeekSummaryProps> = ({ entries, delay = 0, consistencyAssistant }) => {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    // Current week = last 7 entries (already padded or filled)
    const current = entries.slice(-7);
    
    const avgTasks = current.reduce((a, e) => a + e.tasksCompleted, 0) / Math.max(current.length, 1);
    const avgFocus = current.reduce((a, e) => a + e.focusMinutes, 0) / Math.max(current.length, 1);
    const avgHabits = current.reduce((a, e) => a + e.habitsCompleted, 0) / Math.max(current.length, 1);
    const totalXp = current.reduce((a, e) => a + e.xpEarned, 0);
    const totalGold = current.reduce((a, e) => a + e.goldEarned, 0);
    const totalTp = current.reduce((a, e) => a + (e.tpEarned || 0), 0);

    // Totals
    const totalTasks = current.reduce((a, e) => a + e.tasksCompleted, 0);
    const totalFocus = current.reduce((a, e) => a + e.focusMinutes, 0);
    const totalHabits = current.reduce((a, e) => a + e.habitsCompleted, 0);

    // Weekly scored - compute sum of daily scores
    const dailyScores = current.map(e => e.score || 0);
    const totalWeeklyScore = dailyScores.reduce((a, s) => a + s, 0);
    const avgScore = totalWeeklyScore / Math.max(current.length, 1);

    return {
      avgTasks: Math.round(avgTasks * 10) / 10,
      avgFocus: Math.round(avgFocus),
      avgHabits: Math.round(avgHabits * 10) / 10,
      totalXp,
      totalGold,
      totalTp,
      totalTasks,
      totalFocus,
      totalHabits,
      avgScore: Math.round(avgScore),
      totalWeeklyScore: Math.round(totalWeeklyScore),
      activeDays: current.filter(e => e.tasksCompleted > 0 || e.habitsCompleted > 0 || e.focusMinutes > 0).length
    };
  }, [entries]);

  const scoreColor = stats.avgScore >= 75 ? '#22c55e' : stats.avgScore >= 50 ? '#6366f1' : stats.avgScore >= 25 ? '#f59e0b' : '#f43f5e';
  
  // Weekly card style matching productivity range colors
  const cardStyle = useMemo(() => {
    if (stats.avgScore >= 75) {
      return {
        bgClass: 'bg-gradient-to-br from-[#0c2419] via-[#090b0e] to-[#071318] border-emerald-500/20 shadow-[0_4px_30px_rgba(16,185,129,0.06)]',
        barClass: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
      };
    }
    if (stats.avgScore >= 50) {
      return {
        bgClass: 'bg-gradient-to-br from-[#12163b] via-[#090b0e] to-[#160f29] border-indigo-500/20 shadow-[0_4px_30px_rgba(99,102,241,0.06)]',
        barClass: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500'
      };
    }
    if (stats.avgScore >= 25) {
      return {
        bgClass: 'bg-gradient-to-br from-[#22160d] via-[#090b0e] to-[#121217] border-amber-500/15 shadow-[0_4px_30px_rgba(245,158,11,0.04)]',
        barClass: 'bg-gradient-to-r from-amber-500 via-orange-400 to-red-500'
      };
    }
    return {
      bgClass: 'bg-gradient-to-br from-[#241115] via-[#090b0e] to-[#120a0c] border-rose-500/15 shadow-[0_4px_30px_rgba(244,63,94,0.04)]',
      barClass: 'bg-gradient-to-r from-rose-500 to-red-600'
    };
  }, [stats.avgScore]);

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border ${cardStyle.bgClass}`}
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Dynamic top accent bar with shimmer */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${cardStyle.barClass}`}>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        />
      </div>

      {/* Ambient glows */}
      <div 
        className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" 
        style={{ 
          background: `radial-gradient(circle, ${scoreColor}0b 0%, transparent 70%)`,
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      />

      <div className="relative p-4 flex flex-col gap-3">
        {/* Header Title */}
        <div className="flex items-center gap-1.5 relative z-10 shrink-0">
          <motion.div 
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: scoreColor }}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[9px] font-black text-white/45 uppercase tracking-[0.15em]">
            {t('feed.weekly.summaryTitle')}
          </span>
        </div>

        {/* Content row: Circle on left, Grid on right */}
        <div className="flex items-center gap-5 relative z-10">
          {/* Prominent Weekly Score Numeric Display (No circle) */}
          <div 
            className="shrink-0 flex flex-col items-center justify-center bg-white/[0.015] border border-white/[0.08] rounded-2xl w-24 h-24 shadow-inner relative"
            style={{ 
              boxShadow: `inset 0 0 16px ${scoreColor}20`,
              borderColor: `${scoreColor}30`
            }}
          >
            <div className="flex flex-col items-center justify-center pt-0.5">
              <motion.span 
                className="text-4xl font-black text-white tracking-tight tabular-nums"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: delay + 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {stats.totalWeeklyScore}
              </motion.span>
              <div className="w-12 h-px bg-white/[0.08] my-1.5" />
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                / 700
              </span>
            </div>
          </div>

          {/* 2x2 grid of metrics on the right */}
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {/* Tareas */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                <CheckCircle2 size={11} />
              </div>
              <div>
                <div className="text-[7px] text-white/35 font-bold uppercase tracking-wider leading-none">{t('feed.weekly.completedTasks')}</div>
                <div className="text-xs font-black text-white mt-0.5 tabular-nums">{stats.totalTasks}</div>
              </div>
            </div>

            {/* Focus */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Clock size={11} />
              </div>
              <div>
                <div className="text-[7px] text-white/35 font-bold uppercase tracking-wider leading-none">{t('feed.weekly.focusTime')}</div>
                <div className="text-xs font-black text-white mt-0.5 tabular-nums">
                  {stats.totalFocus < 60 ? `${stats.totalFocus}m` : `${Math.floor(stats.totalFocus / 60)}h ${stats.totalFocus % 60}m`}
                </div>
              </div>
            </div>

            {/* Hábitos */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Flame size={11} />
              </div>
              <div>
                <div className="text-[7px] text-white/35 font-bold uppercase tracking-wider leading-none">{t('feed.weekly.habitsDone')}</div>
                <div className="text-xs font-black text-white mt-0.5 tabular-nums">{stats.totalHabits}</div>
              </div>
            </div>

            {/* Días Activos */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Calendar size={11} />
              </div>
              <div>
                <div className="text-[7px] text-white/35 font-bold uppercase tracking-wider leading-none">{t('feed.weekly.activeDays')}</div>
                <div className="text-xs font-black text-white mt-0.5 tabular-nums">{stats.activeDays} / 7</div>
              </div>
            </div>
          </div>
        </div>

        {/* Consistency Compensation Banner */}
        {consistencyAssistant && consistencyAssistant.hasDrop && (
          <div className="border-t border-white/[0.05] pt-3 mt-1.5">
            <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-3 flex items-start gap-2.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/[0.01] rounded-full blur-md pointer-events-none" />
              <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <span className="text-[10px]">⚠️</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
                    {t('feed.weekly.performanceAdjustment')}
                  </span>
                  <span className="text-[8px] font-bold text-white/40">
                    {t('feed.weekly.weeklyConsistency')}
                  </span>
                </div>
                <p className="text-[10px] text-white/60 leading-normal">
                  {t('feed.weekly.scoreIs')} <strong className="text-amber-400 font-black">-{consistencyAssistant.accumulatedDeficit.toFixed(0)} pts</strong> {t('feed.weekly.belowLastWeek', { days: consistencyAssistant.remainingDays })}
                </p>
                <div className="flex items-baseline gap-1 mt-1.5 bg-black/15 p-1.5 rounded-lg border border-white/[0.02] w-fit">
                  <span className="text-xs font-black text-white">{consistencyAssistant.todayTargetScore.toFixed(0)}%</span>
                  <span className="text-[7.5px] text-white/30">
                    ({consistencyAssistant.prevWeekTodayScore.toFixed(0)}% base + {consistencyAssistant.deficitShare.toFixed(1)}% comp.)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom rewards section */}
        <motion.div 
          className="border-t border-white/[0.05] pt-2.5 mt-1.5 flex items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.4 }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">⚡</span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{t('feed.weekly.xpEarned')}</span>
            <span className="text-xs font-black text-yellow-400 tabular-nums">+{stats.totalXp.toLocaleString()}</span>
          </div>
          <div className="w-px h-3.5 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🪙</span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{t('feed.weekly.goldEarned')}</span>
            <span className="text-xs font-black text-amber-400 tabular-nums">+{stats.totalGold.toLocaleString()}</span>
          </div>
          <div className="w-px h-3.5 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs">⭐</span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{t('feed.weekly.tpEarned')}</span>
            <span className="text-xs font-black text-purple-400 tabular-nums">+{stats.totalTp.toLocaleString()}</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
