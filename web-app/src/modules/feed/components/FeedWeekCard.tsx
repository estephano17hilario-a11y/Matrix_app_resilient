import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Flame, ListChecks, ArrowUpRight, ArrowDownRight, Zap, Coins, Calendar, Star, TrendingUp } from 'lucide-react';
import { FeedScoreBreakdownChart } from './FeedScoreBreakdownChart';
import { calculateFallbackProductivityScore, getDetailedScoreBreakdown } from '../../../utils/productivityScore';
import { getWeekStartDay, parseLocalDate } from '../../../utils/dateUtils';

export interface WeeklyFeedEntry {
  id: string;
  startDate: string;
  endDate: string;
  tasksCompleted: number;
  focusMinutes: number;
  habitsCompleted: number;
  subHabitsCompleted: number;
  xpEarned: number;
  goldEarned: number;
  tpEarned: number;
  activeDays: number;
  days: {
    date: string;
    tasksCompleted: number;
    tasksTotal: number;
    focusMinutes: number;
    habitsCompleted: number;
    habitsTotal: number;
    subHabitsCompleted: number;
    subHabitsTotal: number;
    score?: number;
    tpEarned?: number;
  }[];
}

interface FeedWeekCardProps {
  entry: WeeklyFeedEntry;
  prevEntry?: WeeklyFeedEntry;
  index: number;
}

const formatDateRange = (startStr: string, endStr: string) => {
  const parseDate = (str: string) => {
    const parts = str.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };
  
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
};

const formatFocusHours = (minutes: number) => {
  if (minutes === 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const FeedWeekCard: React.FC<FeedWeekCardProps> = ({ entry, prevEntry, index }) => {
  const delay = Math.min(index * 0.06, 0.4);
  const labelRange = formatDateRange(entry.startDate, entry.endDate);

  // Build score breakdown data for the inline chart
  const weekScoreBreakdown = React.useMemo(() => {
    const weekStartDay = getWeekStartDay();
    const dayNames = weekStartDay === 0 ? ['D', 'L', 'M', 'M', 'J', 'V', 'S'] : ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const weekDays = Array.from({ length: 7 }, (_, i) => ({
      date: '',
      label: dayNames[i],
      tasks: 0,
      habits: 0,
      focus: 0,
      subHabits: 0,
      total: 0,
    }));

    entry.days.forEach(day => {
      const d = parseLocalDate(day.date);
      const dayIdx = weekStartDay === 0 ? d.getDay() : (d.getDay() + 6) % 7;
      if (dayIdx >= 0 && dayIdx < 7) {
        const breakdown = getDetailedScoreBreakdown(day, false);
        
        weekDays[dayIdx] = {
          date: day.date,
          label: dayNames[dayIdx],
          tasks: breakdown.tasks,
          habits: breakdown.habits,
          focus: breakdown.focus,
          subHabits: breakdown.subHabits,
          total: breakdown.total,
        };
      }
    });

    return weekDays;
  }, [entry.days]);

  const avgScore = React.useMemo(() => {
    if (entry.days.length === 0) return 0;
    const totalScore = entry.days.reduce((acc, day) => {
      const dayScore = day.score !== undefined ? day.score : calculateFallbackProductivityScore({
        tasksCompleted: day.tasksCompleted,
        tasksTotal: day.tasksTotal || 0,
        focusMinutes: day.focusMinutes,
        habitsCompleted: day.habitsCompleted,
        habitsTotal: day.habitsTotal || 0,
        subHabitsCompleted: day.subHabitsCompleted,
        subHabitsTotal: day.subHabitsTotal || 0
      });
      return acc + dayScore;
    }, 0);
    return Math.round(totalScore / entry.days.length);
  }, [entry.days]);

  const totalWeeklyScore = React.useMemo(() => {
    return Math.round(weekScoreBreakdown.reduce((acc, d) => acc + d.total, 0));
  }, [weekScoreBreakdown]);

  const cardStyle = React.useMemo(() => {
    if (avgScore === 0) {
      return {
        bgClass: 'bg-[#0a0a0f]/80 border-white/[0.03] opacity-50',
        barClass: 'bg-white/10'
      };
    }
    if (avgScore >= 75) {
      return {
        bgClass: 'bg-gradient-to-br from-[#0c2419] via-[#090b0e] to-[#071318] border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.06)]',
        barClass: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
      };
    }
    if (avgScore >= 50) {
      return {
        bgClass: 'bg-gradient-to-br from-[#12163b] via-[#090b0e] to-[#160f29] border-indigo-500/20 shadow-[0_4px_24px_rgba(99,102,241,0.06)]',
        barClass: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500'
      };
    }
    return {
      bgClass: 'bg-gradient-to-br from-[#22160d] via-[#090b0e] to-[#121217] border-amber-500/15 shadow-[0_4px_24px_rgba(245,158,11,0.04)]',
      barClass: 'bg-gradient-to-r from-amber-500 via-orange-400 to-red-500'
    };
  }, [avgScore]);

  // Delta helpers
  const renderWeekDelta = (current: number, prev: number | undefined) => {
    if (prev === undefined || prev === 0) return null;
    const diff = current - prev;
    if (diff === 0) return null;
    
    const pct = Math.round((diff / prev) * 100);
    const isPos = diff > 0;
    const Icon = isPos ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPos ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    
    return (
      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-bold tracking-tight shrink-0 ${colorClass}`}>
        <Icon size={10} />
        <span>{isPos ? '+' : ''}{pct}%</span>
      </div>
    );
  };

  return (
    <motion.div
      className="relative group"
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.008] ${cardStyle.bgClass}`}>
        {/* Dynamic top accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${cardStyle.barClass}`} />
        
        <div className="relative p-5">
          {/* Header with prominent weekly score */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"
                whileHover={{ scale: 1.08, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Calendar size={18} />
              </motion.div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">Semana {labelRange}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-white/35 font-medium">{entry.activeDays} de 7 días activos</span>
                </div>
              </div>
            </div>

            {/* Prominent Weekly Score Badge */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={11} className="text-indigo-400" />
                <span className="text-[8px] font-black text-white/30 uppercase tracking-wider">Score Semanal</span>
              </div>
              <motion.div 
                className={`px-3 py-1 rounded-lg text-sm font-black border ${
                  avgScore >= 75 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.08)]' :
                  avgScore >= 50 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                  avgScore >= 25 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-rose-400 bg-rose-500/10 border-rose-500/20'
                }`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: delay + 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {totalWeeklyScore} / 700
              </motion.div>
            </div>
          </div>

          {/* Currency rewards row */}
          {(entry.xpEarned > 0 || entry.goldEarned > 0 || entry.tpEarned > 0) && (
            <motion.div 
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
            >
              {entry.xpEarned > 0 && (
                <div className="flex items-center gap-1">
                  <Zap size={11} className="text-yellow-400" />
                  <span className="text-xs font-black text-yellow-400/90 tabular-nums">{entry.xpEarned.toLocaleString()} XP</span>
                </div>
              )}
              {entry.goldEarned > 0 && (
                <div className="flex items-center gap-1">
                  <Coins size={11} className="text-amber-400" />
                  <span className="text-xs font-black text-amber-400/90 tabular-nums">{entry.goldEarned.toLocaleString()}</span>
                </div>
              )}
              {entry.tpEarned > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-purple-400" />
                  <span className="text-xs font-black text-purple-400/90 tabular-nums">{entry.tpEarned.toLocaleString()} TP</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Grid Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Focus */}
            <motion.div 
              className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.15 }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} className="text-indigo-400" /> Focus Total
                </span>
                {renderWeekDelta(entry.focusMinutes, prevEntry?.focusMinutes)}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-base font-black text-white tabular-nums">{formatFocusHours(entry.focusMinutes)}</span>
                {entry.focusMinutes > 0 && (
                  <span className="text-[9px] text-white/20 font-bold tabular-nums">
                    Prom: {Math.round(entry.focusMinutes / entry.days.length)}m/día
                  </span>
                )}
              </div>
            </motion.div>

            {/* Tasks */}
            <motion.div 
              className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.2 }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-orange-400" /> Tareas
                </span>
                {renderWeekDelta(entry.tasksCompleted, prevEntry?.tasksCompleted)}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-base font-black text-white tabular-nums">{entry.tasksCompleted}</span>
                <span className="text-[9px] text-white/25 font-bold">completadas</span>
              </div>
            </motion.div>

            {/* Habits */}
            <motion.div 
              className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.25 }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                  <Flame size={12} className="text-emerald-400" /> Hábitos
                </span>
                {renderWeekDelta(entry.habitsCompleted, prevEntry?.habitsCompleted)}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-base font-black text-white tabular-nums">{entry.habitsCompleted}</span>
                <span className="text-[9px] text-white/25 font-bold">completados</span>
              </div>
            </motion.div>

            {/* Sub-habits */}
            <motion.div 
              className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.3 }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                  <ListChecks size={12} className="text-cyan-400" /> Sub-hab
                </span>
                {renderWeekDelta(entry.subHabitsCompleted, prevEntry?.subHabitsCompleted)}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-base font-black text-white tabular-nums">{entry.subHabitsCompleted}</span>
                <span className="text-[9px] text-white/25 font-bold">sub-hábitos</span>
              </div>
            </motion.div>
          </div>

          {/* Score Breakdown Chart for this week */}
          <div className="pt-2 border-t border-white/[0.04]">
            <FeedScoreBreakdownChart days={weekScoreBreakdown} delay={delay + 0.3} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
