import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, Sparkles, CheckCircle2, Clock, Flame, ListChecks, TrendingUp, Coins, Star, Info, X } from 'lucide-react';
import { useDailyFeed } from '../../hooks/useDailyFeed';
import { FeedDayCard } from './components/FeedDayCard';
import { FeedWeekSummary } from './components/FeedWeekSummary';
import { FeedWeekCard, WeeklyFeedEntry } from './components/FeedWeekCard';
import { FeedScoreBreakdownChart } from './components/FeedScoreBreakdownChart';
import { FeedCalendarModal } from './components/FeedCalendarModal';
import { Quest, Habit, Project } from '../../types';
import { DailyLimits } from '../../types/User';
import { toLocalISOString, startOfWeek as utilsStartOfWeek, endOfWeek as utilsEndOfWeek, parseLocalDate } from '../../utils/dateUtils';
import { isHabitActive, isProjectActive, getDetailedScoreBreakdown } from '../../utils/productivityScore';
import { useTranslation } from 'react-i18next';


interface ImprovementFeedViewProps {
  userId?: string;
  user?: any;
  quests: Quest[];
  habits: Habit[];
  projects: Project[];
  dailyLimits: DailyLimits;
  player: { level: number; xp: number; gold: number };
  streak: number;
}

export const ImprovementFeedView: React.FC<ImprovementFeedViewProps> = ({
  userId, user, quests, habits, projects, dailyLimits, player, streak
}) => {
  const { t, i18n } = useTranslation();
  const { feedEntries, todayEntry, isLoading, saveFeedEntry } = useDailyFeed({
    userId, quests, habits, projects, dailyLimits, player, streak
  });

  const [feedViewMode, setFeedViewMode] = useState<'daily' | 'weekly'>('daily');
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSelectDate = (dateStr: string) => {
    if (feedViewMode !== 'daily') setFeedViewMode('daily');
    
    setTimeout(() => {
      const element = document.getElementById(`feed-card-${dateStr}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-indigo-500', 'rounded-2xl', 'transition-all', 'duration-500');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-indigo-500', 'rounded-2xl');
        }, 2000);
      }
    }, 150);
  };

  const handlePrevWeek = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const isCurrentWeek = useMemo(() => {
    const startOfCurrent = utilsStartOfWeek(new Date());
    const startOfSelected = utilsStartOfWeek(selectedDate);
    return toLocalISOString(startOfCurrent) === toLocalISOString(startOfSelected);
  }, [selectedDate]);

  const weekRangeText = useMemo(() => {
    const start = utilsStartOfWeek(selectedDate);
    const end = utilsEndOfWeek(selectedDate);
    const format = (d: Date) => {
      const day = d.getDate();
      const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const months = i18n.language === 'es' ? monthsEs : monthsEn;
      const month = months[d.getMonth()];
      return `${day} ${month}`;
    };
    return `${format(start)} - ${format(end)}`;
  }, [selectedDate, i18n.language]);

  // Dynamic values for real-time formula visualization
  const todayDate = useMemo(() => new Date(), []);
  const todayTasksCompleted = Number(dailyLimits?.tasksCompleted || 0);
  const activeUncompletedQuests = useMemo(() => (quests || []).filter(q => !q.completed), [quests]);
  const todayTasksTotal = activeUncompletedQuests.length + todayTasksCompleted;
  const hasTasksToday = todayTasksTotal > 0;

  const activeHabitsToday = useMemo(() => (habits || []).filter(h => isHabitActive(h, todayDate)), [habits, todayDate]);
  const habitsCount = activeHabitsToday.length;

  const activeProjectsToday = useMemo(() => (projects || []).filter(p => isProjectActive(p, todayDate)), [projects, todayDate]);
  const totalTargetMinutes = useMemo(() => {
    let target = 0;
    activeProjectsToday.forEach(p => {
      if (p.goalTarget > 0) target += p.goalTarget;
    });
    return target === 0 ? 60 : target;
  }, [activeProjectsToday]);

  // Aligned current week's 7 days based on the user's start day setting
  const currentWeekDays = useMemo(() => {
    const start = utilsStartOfWeek(selectedDate);
    const days: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = toLocalISOString(d);
      
      const existing = feedEntries.find(e => e.date === dateStr);
      if (existing) {
        days.push(existing);
      } else {
        days.push({
          id: `feed_${dateStr}`,
          date: dateStr,
          tasksCompleted: 0,
          tasksTotal: 0,
          focusMinutes: 0,
          focusSessions: 0,
          habitsCompleted: 0,
          habitsTotal: 0,
          subHabitsCompleted: 0,
          subHabitsTotal: 0,
          xpEarned: 0,
          goldEarned: 0,
          tpEarned: 0,
          streak: 0,
          topProjects: [],
          completedTaskTitles: [],
          completedHabitTitles: [],
          createdAt: 0,
          score: 0
        });
      }
    }
    return days;
  }, [feedEntries, selectedDate]);

  // Score breakdown data for weekly chart (scored per category per day)
  const scoreBreakdownData = useMemo(() => {
    const dayNames = i18n.language === 'es'
      ? ['D', 'L', 'M', 'M', 'J', 'V', 'S']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // getDay() mapping
    const todayStr = toLocalISOString(new Date());
    
    return currentWeekDays.map((d) => {
      const localDate = parseLocalDate(d.date);
      const dayLabel = dayNames[localDate.getDay()];
      const isToday = d.date === todayStr;
      
      const breakdown = getDetailedScoreBreakdown(d, isToday, quests, habits, projects);
      
      return {
        date: d.date,
        label: dayLabel,
        tasks: breakdown.tasks,
        habits: breakdown.habits,
        focus: breakdown.focus,
        subHabits: breakdown.subHabits,
        total: breakdown.total,
      };
    });
  }, [currentWeekDays, quests, habits, projects, i18n.language]);

  // Consistency Assistant Logic (Inteligencia de Compensación de Rendimiento)
  const consistencyAssistant = useMemo(() => {
    const now = new Date();
    const currentWeekStart = utilsStartOfWeek(now);
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const prevWeekDates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(prevWeekStart);
      d.setDate(d.getDate() + i);
      return toLocalISOString(d);
    });

    const currentWeekDates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return toLocalISOString(d);
    });

    // Retrieve previous week scores
    const prevWeekScores = prevWeekDates.map(dateStr => {
      const entry = feedEntries.find(e => e.date === dateStr);
      return entry ? (entry.score ?? 0) : 0;
    });

    // Retrieve current week scores
    const currentWeekScores = currentWeekDates.map(dateStr => {
      const todayStr = toLocalISOString(now);
      if (dateStr === todayStr) {
        return todayEntry.score ?? 0;
      }
      const entry = feedEntries.find(e => e.date === dateStr);
      return entry ? (entry.score ?? 0) : 0;
    });

    const todayStr = toLocalISOString(now);
    const todayIdx = currentWeekDates.indexOf(todayStr);

    if (todayIdx === -1) return null;

    const prevWeekTotal = prevWeekScores.reduce((a, b) => a + b, 0);
    if (feedEntries.length < 7 || prevWeekTotal === 0) return null; // No baseline data to compare with or first week

    // Sum scores up to yesterday (index 0 to todayIdx - 1)
    const currentWeekAccumulatedBeforeToday = currentWeekScores
      .slice(0, todayIdx)
      .reduce((a, b) => a + b, 0);

    const prevWeekAccumulatedBeforeToday = prevWeekScores
      .slice(0, todayIdx)
      .reduce((a, b) => a + b, 0);

    // Deficit of this week compared to last week up to yesterday
    const accumulatedDeficit = prevWeekAccumulatedBeforeToday - currentWeekAccumulatedBeforeToday;

    // Remaining days in this week (including today)
    const remainingDays = 7 - todayIdx;

    // Deficit shared evenly among the remaining days
    const deficitShare = remainingDays > 0 ? Math.max(accumulatedDeficit, 0) / remainingDays : 0;

    // Today's meta is last week's today score + deficit share (capped at 100)
    const prevWeekTodayScore = prevWeekScores[todayIdx] || 0;
    const todayTargetScore = Math.min(prevWeekTodayScore + deficitShare, 100);

    return {
      prevWeekTotal,
      accumulatedDeficit: Math.max(accumulatedDeficit, 0),
      remainingDays,
      deficitShare,
      prevWeekTodayScore,
      todayTargetScore,
      todayIdx,
      hasDrop: accumulatedDeficit > 0
    };
  }, [feedEntries, todayEntry.score]);

  // Overall productivity score (0-100)
  const productivityScore = Math.round(todayEntry.score ?? 0);

  const liveCardStyle = useMemo(() => {
    if (productivityScore >= 75) {
      return {
        bgClass: 'bg-gradient-to-br from-[#0e2a1e] via-[#090b0e] to-[#0a151b] border-emerald-500/25 shadow-[0_4px_30px_rgba(16,185,129,0.1)]',
        barClass: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
      };
    }
    if (productivityScore >= 50) {
      return {
        bgClass: 'bg-gradient-to-br from-[#141846] via-[#090b0e] to-[#120f2b] border-indigo-500/20 shadow-[0_4px_30px_rgba(99,102,241,0.1)]',
        barClass: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500'
      };
    }
    return {
      bgClass: 'bg-gradient-to-br from-[#24180e] via-[#090b0e] to-[#121217] border-amber-500/15 shadow-[0_4px_30px_rgba(245,158,11,0.06)]',
      barClass: 'bg-gradient-to-r from-amber-500 via-orange-400 to-red-500'
    };
  }, [productivityScore]);

  // Group historical entries by week
  const weeklyEntries = useMemo(() => {
    const weekMap = new Map<string, {
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
    }>();

    // Include all entries (both live today and history)
    feedEntries.forEach(entry => {
      const entryDate = parseLocalDate(entry.date);
      const start = utilsStartOfWeek(entryDate);
      const end = utilsEndOfWeek(entryDate);
      const startStr = toLocalISOString(start);
      const endStr = toLocalISOString(end);
      const key = startStr;

      let group = weekMap.get(key);
      if (!group) {
        group = {
          startDate: startStr,
          endDate: endStr,
          tasksCompleted: 0,
          focusMinutes: 0,
          habitsCompleted: 0,
          subHabitsCompleted: 0,
          xpEarned: 0,
          goldEarned: 0,
          tpEarned: 0,
          activeDays: 0,
          days: []
        };
        weekMap.set(key, group);
      }

      group.tasksCompleted += entry.tasksCompleted;
      group.focusMinutes += entry.focusMinutes;
      group.habitsCompleted += entry.habitsCompleted;
      group.subHabitsCompleted += entry.subHabitsCompleted;
      group.xpEarned += entry.xpEarned;
      group.goldEarned += entry.goldEarned;
      group.tpEarned += entry.tpEarned || 0;
      
      const hasActivity = entry.tasksCompleted > 0 || entry.habitsCompleted > 0 || entry.focusMinutes > 0;
      if (hasActivity) {
        group.activeDays += 1;
      }
      
      group.days.push({
        date: entry.date,
        tasksCompleted: entry.tasksCompleted,
        tasksTotal: entry.tasksTotal,
        focusMinutes: entry.focusMinutes,
        habitsCompleted: entry.habitsCompleted,
        habitsTotal: entry.habitsTotal,
        subHabitsCompleted: entry.subHabitsCompleted,
        subHabitsTotal: entry.subHabitsTotal,
        score: entry.score,
        tpEarned: entry.tpEarned
      });
    });

    const currentWeekStart = toLocalISOString(utilsStartOfWeek(new Date()));

    // Convert to array, filter out current week, and sort descending by start date
    return Array.from(weekMap.entries())
      .map(([key, value]) => ({
        id: `week_${key}`,
        ...value
      }))
      .filter(w => w.startDate !== currentWeekStart)
      .sort((a, b) => b.startDate.localeCompare(a.startDate)) as WeeklyFeedEntry[];
  }, [feedEntries]);

  const today = toLocalISOString(new Date());
  const historicalEntries = feedEntries.filter(e => e.date !== today);

  return (
    <div className="pb-32 pt-2">
      {/* ═══════════════════════════════════════ */}
      {/* PREMIUM HEADER */}
      {/* ═══════════════════════════════════════ */}
      <motion.div 
        className="mb-6 relative"
        style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <motion.div 
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-indigo-500/15 border border-emerald-500/20 flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Activity size={20} className="text-emerald-400" />
              </motion.div>
              <motion.div 
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a0a0a]"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {feedViewMode === 'daily' ? (
                  <>
                    <span className="text-white/60">{t('feed.feed', 'Feed')}</span> {t('feed.titleDaily')}
                  </>
                ) : (
                  `Feed ${t('feed.titleWeekly')}`
                )}
              </h1>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowFormulaModal(true);
            }}
            className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)] clickable active:scale-95 transition-transform"
            title={t('feed.viewFormulaTooltip')}
          >
            <Info size={16} />
          </button>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════ */}
      {/* VIEW SEGMENT CONTROL (DIARIO VS SEMANAL) */}
      {/* ═══════════════════════════════════════ */}
      <motion.div 
        className="flex justify-center mb-6"
        style={{ willChange: 'transform, opacity' }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
      >
        <div className="relative flex p-[3px] bg-white/[0.03] rounded-2xl border border-white/[0.06] w-full max-w-[280px] backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
          {/* Animated indicator background */}
          <motion.div
            className="absolute top-[3px] bottom-[3px] rounded-xl bg-white shadow-[0_2px_8px_rgba(255,255,255,0.1)]"
            style={{ width: 'calc(50% - 3px)' }}
            animate={{ left: feedViewMode === 'daily' ? '3px' : 'calc(50%)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button
            onClick={() => setFeedViewMode('daily')}
            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors duration-300 ${
              feedViewMode === 'daily'
                ? 'text-black'
                : 'text-white/40 hover:text-white/65'
            }`}
          >
            {t('feed.labelDaily')}
          </button>
          <button
            onClick={() => setFeedViewMode('weekly')}
            className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors duration-300 ${
              feedViewMode === 'weekly'
                ? 'text-black'
                : 'text-white/40 hover:text-white/65'
            }`}
          >
            {t('feed.labelWeekly')}
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {feedViewMode === 'daily' ? (
          <motion.div
            key="daily-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
          >
            {/* ═══════════════════════════════════════ */}
            {/* PRODUCTIVITY SCORE (Today live score) */}
            {/* ═══════════════════════════════════════ */}
            <motion.div
              className={`relative overflow-hidden rounded-2xl border mb-6 ${liveCardStyle.bgClass}`}
              style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Dynamic top accent bar with shimmer */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${liveCardStyle.barClass}`}>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                />
              </div>

              {/* Ambient glows - GPU accelerated */}
              <div 
                className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" 
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
              />
              <div 
                className="absolute bottom-0 left-0 w-28 h-28 rounded-full pointer-events-none" 
                style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
              />

              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  {/* Enhanced Score circle with double ring */}
                  <div className="relative shrink-0">
                    <svg width="80" height="80" className="transform -rotate-90" style={{ filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.25))' }}>
                      <defs>
                        <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                        <linearGradient id="score-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
                        </linearGradient>
                      </defs>
                      {/* Outer glow ring */}
                      <circle cx="40" cy="40" r="36" fill="none" stroke="url(#score-glow)" strokeWidth="2" />
                      {/* Background track */}
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
                      {/* Progress arc */}
                      <motion.circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke="url(#score-gradient)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 32}
                        initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - productivityScore / 100) }}
                        transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span 
                        className="text-xl font-black text-white leading-none tabular-nums"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {productivityScore}
                      </motion.span>
                      <span className="text-[7px] font-bold text-white/25 uppercase tracking-wider">{t('feed.score')}</span>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-orange-400 shrink-0" />
                      <span className="text-xs text-white/50 font-medium">{t('feed.tasks')}</span>
                      <span className="text-xs font-black text-white ml-auto tabular-nums">{todayEntry.tasksCompleted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-indigo-400 shrink-0" />
                      <span className="text-xs text-white/50 font-medium">{t('feed.focus')}</span>
                      <span className="text-xs font-black text-white ml-auto tabular-nums">
                        {todayEntry.focusMinutes < 60 
                          ? `${todayEntry.focusMinutes}m` 
                          : `${Math.floor(todayEntry.focusMinutes / 60)}h ${todayEntry.focusMinutes % 60}m`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flame size={12} className="text-emerald-400 shrink-0" />
                      <span className="text-xs text-white/50 font-medium">{t('feed.habits')}</span>
                      <span className="text-xs font-black text-white ml-auto tabular-nums">{todayEntry.habitsCompleted}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ListChecks size={12} className="text-cyan-400 shrink-0" />
                      <span className="text-xs text-white/50 font-medium">{t('feed.subHab')}</span>
                      <span className="text-xs font-black text-white ml-auto tabular-nums">{todayEntry.subHabitsCompleted}</span>
                    </div>
                  </div>
                </div>

                {/* Rewards / Gains Section - with micro-animations */}
                <motion.div 
                  className="border-t border-white/[0.06] pt-2.5 flex items-center justify-around gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <motion.div 
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Sparkles size={13} className="text-yellow-400" />
                    <span className="text-[10px] font-bold text-white/35 uppercase tracking-wider">{t('feed.xp')}</span>
                    <span className="text-xs font-black text-yellow-400 tabular-nums">+{todayEntry.xpEarned}</span>
                  </motion.div>
                  <div className="w-px h-3 bg-white/[0.08]" />
                  <motion.div 
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Coins size={13} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-white/35 uppercase tracking-wider">{t('feed.gold')}</span>
                    <span className="text-xs font-black text-amber-400 tabular-nums">+{todayEntry.goldEarned}</span>
                  </motion.div>
                  <div className="w-px h-3 bg-white/[0.08]" />
                  <motion.div 
                    className="flex items-center gap-1.5"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Star size={13} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-white/35 uppercase tracking-wider">{t('feed.tp')}</span>
                    <span className="text-xs font-black text-purple-400 tabular-nums">+{todayEntry.tpEarned || 0}</span>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Consistency Assistant Widget (Inteligencia de Compensación) */}
            {consistencyAssistant && (
              <motion.div
                className={`relative overflow-hidden rounded-2xl border p-3 py-2.5 mb-4 backdrop-blur-sm shadow-md transition-all duration-300 ${
                  consistencyAssistant.hasDrop
                    ? 'bg-gradient-to-br from-[#2a1711] via-[#090b0e] to-[#160e0a] border-amber-500/20 shadow-[0_4px_24px_rgba(245,158,11,0.05)]'
                    : 'bg-gradient-to-br from-[#0c2419] via-[#090b0e] to-[#071318] border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.05)]'
                }`}
                style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Ambient glow */}
                <div 
                  className="absolute -top-8 -right-8 w-20 h-20 rounded-full pointer-events-none"
                  style={{ 
                    background: consistencyAssistant.hasDrop 
                      ? 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
                    transform: 'translateZ(0)'
                  }}
                />

                <div className="flex items-start gap-3 relative z-10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    consistencyAssistant.hasDrop
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {consistencyAssistant.hasDrop ? <TrendingUp size={15} className="rotate-180 text-amber-400" /> : <TrendingUp size={15} className="text-emerald-400" />}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">
                        {consistencyAssistant.hasDrop ? t('feed.consistencyAssistant') : t('feed.optimalPerformance')}
                      </span>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                        consistencyAssistant.hasDrop
                          ? 'text-amber-400 bg-amber-500/5 border-amber-500/10'
                          : 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
                      }`}>
                        {consistencyAssistant.hasDrop ? t('feed.activeCompensation') : t('feed.excellentPace')}
                      </span>
                    </div>

                    {consistencyAssistant.hasDrop ? (
                      <p className="text-[11px] text-white/70 leading-normal">
                        {i18n.language === 'es' ? (
                          <>
                            {t('feed.accumulatedScoreDown', 'Tu score acumulado esta semana ha bajado en')} <strong className="text-amber-400">{consistencyAssistant.accumulatedDeficit.toFixed(0)} pts</strong> respecto a la semana pasada. Para compensarlo de forma equilibrada en los <strong className="text-white">{consistencyAssistant.remainingDays} días</strong> {t('feed.remainingTargetScore', 'restantes, hoy deberías alcanzar un score meta de:')}
                          </>
                        ) : (
                          <>
                            Your accumulated score this week has dropped by <strong className="text-amber-400">{consistencyAssistant.accumulatedDeficit.toFixed(0)} pts</strong> compared to last week. To compensate for it evenly over the remaining <strong className="text-white">{consistencyAssistant.remainingDays} days</strong>, today you should reach a target score of:
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-white/70 leading-normal">
                        {i18n.language === 'es' ? (
                          <>
                            {t('feed.doingGreatSupering', '¡Vas excelente! Estás superando tu rendimiento acumulado de la semana pasada por')} <strong className="text-emerald-400">{Math.abs(consistencyAssistant.accumulatedDeficit).toFixed(0)} pts</strong>. Para mantener esta constancia, tu score meta recomendado de hoy es:
                          </>
                        ) : (
                          <>
                            You are doing excellent! You are exceeding last week's accumulated performance by <strong className="text-emerald-400">{Math.abs(consistencyAssistant.accumulatedDeficit).toFixed(0)} pts</strong>. To maintain this consistency, your recommended target score today is:
                          </>
                        )}
                      </p>
                    )}

                    {/* Meta representation */}
                    <div className="flex items-center justify-between bg-black/20 p-2 py-1 rounded-xl border border-white/[0.04]">
                      <div>
                        <div className="text-[9px] text-white/30 uppercase font-black tracking-wider">{t('feed.todayTargetScore')}</div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-base font-black text-white">{consistencyAssistant.todayTargetScore.toFixed(0)}%</span>
                          {consistencyAssistant.hasDrop && (
                            <span className="text-[8px] text-white/40">
                              ({consistencyAssistant.prevWeekTodayScore.toFixed(0)}% base + {consistencyAssistant.deficitShare.toFixed(0)}% comp.)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[9px] text-white/30 uppercase font-black tracking-wider">{t('feed.todayScore')}</div>
                        <div className="text-base font-black mt-0.5" style={{ color: productivityScore >= consistencyAssistant.todayTargetScore ? '#10b981' : '#f59e0b' }}>
                          {productivityScore.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Progress feedback bar */}
                    {productivityScore < consistencyAssistant.todayTargetScore ? (
                      <div className="text-[10px] text-white/50 flex items-center justify-between pt-0.5">
                        <span>
                          {i18n.language === 'es' ? (
                            <>
                              {t('feed.missing', 'Faltan')} <strong className="text-amber-400">{(consistencyAssistant.todayTargetScore - productivityScore).toFixed(0)}%</strong> {t('feed.toReachDailyTarget', 'para alcanzar la meta diaria')}
                            </>
                          ) : (
                            <>
                              Need <strong className="text-amber-400">{(consistencyAssistant.todayTargetScore - productivityScore).toFixed(0)}%</strong> more to reach daily goal
                            </>
                          )}
                        </span>
                        <div className="w-24 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 rounded-full" 
                            style={{ width: `${Math.min((productivityScore / consistencyAssistant.todayTargetScore) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 pt-0.5">
                        <span>
                          {t('feed.goalExceeded', { 
                            extra: (productivityScore - consistencyAssistant.todayTargetScore).toFixed(0) 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* TIMELINE HEADER */}
            {/* ═══════════════════════════════════════ */}
            <motion.div 
              className="flex items-center justify-between gap-2 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 flex-grow">
                <Calendar size={14} className="text-white/30" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">{t('feed.dailyHistory')}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </div>
              
              <motion.button
                onClick={() => setIsCalendarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-black text-white/50 hover:text-white hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-sm shadow-md"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Calendar size={12} className="text-indigo-400" />
                <span>{t('feed.searchDate')}</span>
              </motion.button>
            </motion.div>


            {/* ═══════════════════════════════════════ */}
            {/* HISTORICAL CARDS */}
            {/* ═══════════════════════════════════════ */}
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-xl bg-white/[0.04]" />
                      <div className="flex-1">
                        <div className="w-20 h-3 rounded bg-white/[0.06] mb-2" />
                        <div className="w-32 h-2 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                    <div className="flex justify-around mt-4">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="w-14 h-14 rounded-full bg-white/[0.03]" />
                      ))}
                    </div>
                  </motion.div>
                ))
              ) : historicalEntries.length > 0 ? (
                historicalEntries.map((entry, i) => (
                  <div key={entry.id} id={`feed-card-${entry.date}`}>
                    <FeedDayCard 
                      entry={entry} 
                      prevEntry={feedEntries[i + 2]} // i+2 because index i starts at historicalEntries[0], which corresponds to feedEntries[1]
                      index={i + 1} 
                      user={user}
                      onSaveEntry={saveFeedEntry}
                    />
                  </div>
                ))
              ) : (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={24} className="text-white/20" />
                  </div>
                  <p className="text-sm text-white/30 font-medium">{t('feed.emptyHistory')}</p>
                  <p className="text-[11px] text-white/15 mt-1">{t('feed.savedAutomatically')}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="weekly-view"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* ═══════════════════════════════════════ */}
            {/* SCORE BREAKDOWN CHART (replaces old sparklines) */}
            {/* ═══════════════════════════════════════ */}
            <FeedScoreBreakdownChart 
              days={scoreBreakdownData} 
              delay={0.15} 
              weekRangeText={weekRangeText}
              isCurrentWeek={isCurrentWeek}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              consistencyAssistant={consistencyAssistant}
            />

            {/* ═══════════════════════════════════════ */}
            {/* WEEK SUMMARY */}
            {/* ═══════════════════════════════════════ */}
            <div className="mb-2">
              <FeedWeekSummary entries={currentWeekDays} delay={0.25} consistencyAssistant={consistencyAssistant} />
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* WEEK TIMELINE */}
            {/* ═══════════════════════════════════════ */}
            <div className="space-y-4">
              <motion.div 
                className="flex items-center gap-2 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Calendar size={14} className="text-white/30" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">{t('feed.weeklyHistory')}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
              </motion.div>

              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={`wk-sk-${i}`} className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                ))
              ) : weeklyEntries.length > 0 ? (
                weeklyEntries.map((week, i) => (
                  <FeedWeekCard 
                    key={week.id} 
                    entry={week} 
                    prevEntry={weeklyEntries[i + 1]} // index i + 1 is the previous week in sorted descending order
                    index={i} 
                  />
                ))
              ) : (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <Calendar size={24} className="text-white/20" />
                  </div>
                  <p className="text-sm text-white/30 font-medium">{t('feed.insufficientData')}</p>
                  <p className="text-[11px] text-white/15 mt-1">{t('feed.logActivitiesToConsolidate')}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFormulaModal && typeof window !== 'undefined' && createPortal(
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c0d12] via-[#090b0e] to-[#0a111b] shadow-2xl text-left overflow-hidden"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              {/* Top gradient glow bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-500 z-10" />

              {/* Sticky Header inside modal */}
              <div className="p-5 pb-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Activity size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{t('feed.productivityFormula')}</h3>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{t('feed.dynamicRecalibration')}</p>
                  </div>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setShowFormulaModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 pt-3.5 space-y-5 text-xs leading-relaxed text-white/70 scrollbar-thin scrollbar-thumb-white/10">
                <p className="text-[11px] text-white/50">
                  {i18n.language === 'es' ? (
                    <>
                      {t('feed.el', 'El')} <strong>{t('feed.productivityScoreText', 'Score de Productividad')}</strong> {t('feed.recalibratesAutoBased', 'se recalibra automáticamente según la disponibilidad de tus tareas asignadas para el día de hoy:')}
                    </>
                  ) : (
                    <>
                      The <strong>Productivity Score</strong> is automatically recalibrated based on the availability of your assigned tasks for today:
                    </>
                  )}
                </p>

                {/* Real-time configuration badge */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/[0.01] rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-yellow-400" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('feed.todayMetrics')}</span>
                  </div>
                  
                  <p className="text-[10px] text-white/50">
                    {t('feed.currentlyRecalculatedBasedOn')}
                  </p>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {/* Habits real-time status */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] border border-white/[0.03] text-[10px]">
                      <div className="flex items-center gap-2">
                        <Flame size={14} className="text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">{t('feed.activeHabitsToday')}</div>
                          <div className="text-white/40 text-[9px]">{habitsCount} {t('feed.scheduledForToday')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-emerald-400 font-bold">
                          {habitsCount > 0 ? `${((hasTasksToday ? 40 : 45) / habitsCount).toFixed(0)}% ${t('feed.each')}` : '0%'}
                        </span>
                        <div className="text-white/30 text-[8px] uppercase tracking-wider">{t('feed.individualWeight')}</div>
                      </div>
                    </div>

                    {/* Focus real-time status */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] border border-white/[0.03] text-[10px]">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">{t('feed.scheduledDailyFocus')}</div>
                          <div className="text-white/40 text-[9px]">{totalTargetMinutes} {t('feed.minutesGoal')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-indigo-400 font-bold">
                          {hasTasksToday ? '40%' : '55%'} {t('feed.max')}
                        </span>
                        <div className="text-white/30 text-[8px] uppercase tracking-wider">{t('feed.globalContribution')}</div>
                      </div>
                    </div>

                    {/* Tasks real-time status */}
                    {hasTasksToday && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] border border-white/[0.03] text-[10px]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-orange-400 shrink-0" />
                          <div>
                            <div className="font-bold text-white">
                              {i18n.language === 'es' ? 'Misiones Asignadas' : 'Assigned Missions'}
                            </div>
                            <div className="text-white/40 text-[9px]">
                              {i18n.language === 'es' 
                                ? `${todayTasksTotal} tareas hoy (${todayTasksCompleted} completadas)` 
                                : `${todayTasksTotal} tasks today (${todayTasksCompleted} completed)`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-orange-400 font-bold">
                            {(20 / todayTasksTotal).toFixed(0)}% {i18n.language === 'es' ? 'c/u' : 'each'}
                          </span>
                          <div className="text-white/30 text-[8px] uppercase tracking-wider">
                            {i18n.language === 'es' ? 'Peso individual' : 'Individual weight'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mathematical Fraction Explanations */}
                <div className="space-y-3.5">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t('feed.scoreEquations')}</div>
                  
                  {/* Hábitos Equation */}
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                      <span>{t('feed.habitsSubhabits')}</span>
                      <span className="text-[9px] text-white/30 uppercase">{t('feed.contribution')} {hasTasksToday ? '40%' : '45%'}</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 py-2 bg-black/20 rounded-lg">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-emerald-300">{t('feed.individualProgressSum')}</span>
                        <div className="w-40 h-px bg-white/20 my-1" />
                        <span className="text-[8px] font-bold text-white/40">{t('feed.activeHabitsToday')}</span>
                      </div>
                      <span className="text-white/30 font-black text-sm">×</span>
                      <span className="text-[10px] font-black text-white bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {hasTasksToday ? '40%' : '45%'}
                      </span>
                    </div>

                    <div className="space-y-2 text-[10px] text-white/40 pl-2.5 border-l border-white/[0.06] pt-1">
                      {/* Checklist tree visualization */}
                      <div>
                        {i18n.language === 'es' ? (
                          <>
                            <span className="font-bold text-white/70">{t('feed.subhabitsListType', 'Sub-hábitos (Hábitos tipo Lista):')}</span>
                            <p className="text-[9px] mt-0.5 mb-2">{t('feed.subtasksDividedEqually', 'Se dividen equitativamente entre las sub-tareas asignadas para hoy.')}</p>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-white/70">Sub-habits (List-type Habits):</span>
                            <p className="text-[9px] mt-0.5 mb-2">Divided equally among the sub-tasks assigned for today.</p>
                          </>
                        )}
                        
                        <div className="bg-[#0b0c10] border border-white/[0.04] p-3 rounded-lg flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-white">
                              <ListChecks size={12} className="text-cyan-400" />
                              <span>{t('feed.habitChecklistExample')}</span>
                            </div>
                            <div className="pl-4 text-[8px] text-white/40 font-mono space-y-0.5 border-l border-white/10 ml-1.5">
                              {i18n.language === 'es' ? (
                                <>
                                  <div>{t('feed.subtaskExample1', '├── Sub-tarea 1 ➔ 33.3% del hábito')}</div>
                                  <div>{t('feed.subtaskExample2', '├── Sub-tarea 2 ➔ 33.3% del hábito')}</div>
                                  <div>{t('feed.subtaskExample3', '└── Sub-tarea 3 ➔ 33.3% del hábito')}</div>
                                </>
                              ) : (
                                <>
                                  <div>├── Sub-task 1 ➔ 33.3% of the habit</div>
                                  <div>├── Sub-task 2 ➔ 33.3% of the habit</div>
                                  <div>└── Sub-task 3 ➔ 33.3% of the habit</div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-[8px] text-white/50 font-bold uppercase tracking-wider text-right max-w-[120px] bg-white/5 p-1.5 rounded border border-white/5">
                            {t('feed.weightAutoadjustment')}
                          </div>
                        </div>
                      </div>

                      {/* Quantity habits */}
                      <div className="pt-1.5">
                        {i18n.language === 'es' ? (
                          <>
                            <span className="font-bold text-white/70">{t('feed.quantitativeHabits', 'Hábitos Cuantitativos:')}</span>
                            <p className="text-[9px] mt-0.5">
                              {t('feed.calculateFractionalProgressAs', 'Calculan su progreso fraccional como')} <code className="text-amber-400 font-mono bg-amber-500/5 px-1 py-0.5 rounded">{t('feed.progressOverTarget', 'progreso / meta')}</code> {t('feed.max10Contribution', '(máx 1.0), aportando proporcionalmente al valor del hábito.')}
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-white/70">Quantitative Habits:</span>
                            <p className="text-[9px] mt-0.5">
                              Calculate their fractional progress as <code className="text-amber-400 font-mono bg-amber-500/5 px-1 py-0.5 rounded">progress / target</code> (max 1.0), contributing proportionally to the habit's value.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Focus Equation */}
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
                      <span>{t('feed.focusTime')}</span>
                      <span className="text-[9px] text-white/30 uppercase">{t('feed.contribution')} {hasTasksToday ? '40%' : '55%'}</span>
                    </div>

                    <div className="flex items-center justify-center gap-3 py-2 bg-black/20 rounded-lg">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-indigo-300">{t('feed.realFocusMinutes')}</span>
                        <div className="w-36 h-px bg-white/20 my-1" />
                        <span className="text-[8px] font-bold text-white/40">{t('feed.projectsGoalSum')}</span>
                      </div>
                      <span className="text-white/30 font-black text-sm">×</span>
                      <span className="text-[10px] font-black text-white bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        {hasTasksToday ? '40%' : '55%'}
                      </span>
                    </div>
                    
                    <p className="text-[9px] text-white/40 pl-2.5 border-l border-white/[0.06]">
                      {t('feed.focusTimeDescription')}
                    </p>
                  </div>

                  {/* Tareas Equation */}
                  {hasTasksToday && (
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-orange-400">
                        <span>{t('feed.dailyQuests')}</span>
                        <span className="text-[9px] text-white/30 uppercase">{t('feed.questsFormulaDescription')}</span>
                      </div>

                      <div className="flex items-center justify-center gap-3 py-2 bg-black/20 rounded-lg">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black text-orange-300">{t('feed.completedQuests')}</span>
                          <div className="w-36 h-px bg-white/20 my-1" />
                          <span className="text-[8px] font-bold text-white/40">{t('feed.totalTodayQuests')}</span>
                        </div>
                        <span className="text-white/30 font-black text-sm">×</span>
                        <span className="text-[10px] font-black text-white bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                          20%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer inside modal */}
              <div className="p-4 border-t border-white/[0.04] flex justify-end shrink-0">
                <button
                  onClick={() => setShowFormulaModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-black uppercase text-[10px] tracking-wider hover:bg-white/90 transition-all shadow-md active:scale-95"
                >
                  {t('feed.understood')}
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      <FeedCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        feedEntries={feedEntries}
        onSelectDate={handleSelectDate}
      />
    </div>
  );
};
