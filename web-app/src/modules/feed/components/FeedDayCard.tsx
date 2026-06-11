import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Flame, ListChecks, Zap, Coins, ArrowUpRight, ArrowDownRight, Star, Edit2 } from 'lucide-react';
import { DailyFeedEntry } from '../../../types/DailyFeedEntry';
import { calculateFallbackProductivityScore } from '../../../utils/productivityScore';
import { useTranslation } from 'react-i18next';

interface FeedDayCardProps {
  entry: DailyFeedEntry;
  prevEntry?: DailyFeedEntry;
  index: number;
  isToday?: boolean;
  user?: any;
  onSaveEntry?: (entry: DailyFeedEntry) => Promise<void>;
}

const formatDate = (dateStr: string, isSpanish: boolean) => {
  const parts = dateStr.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const dayNames = isSpanish 
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = isSpanish
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  return { dayName, day, month, fullDate: date };
};

const formatFocusTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const FeedDayCard: React.FC<FeedDayCardProps> = ({ entry, prevEntry, index, isToday = false, user, onSaveEntry }) => {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const { dayName, day, month } = formatDate(entry.date, isSpanish);
  const delay = Math.min(index * 0.06, 0.5); // Cap delay for performance
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(entry.title || '');

  React.useEffect(() => {
    setEditedTitle(entry.title || '');
  }, [entry.title]);

  const hasActivity = entry.tasksCompleted > 0 || entry.habitsCompleted > 0 || entry.focusMinutes > 0;
  const displayName = user?.displayName || (isSpanish ? 'Tú' : 'You');

  // Compute a daily score
  const score = React.useMemo(() => {
    return calculateFallbackProductivityScore(entry);
  }, [entry]);

  const defaultTitle = React.useMemo(() => {
    if (isSpanish) {
      return score >= 75 ? '🔥 Superación Absoluta' : score >= 50 ? '⚡ Día de Progreso Activo' : '🌱 Pequeños Pasos Diarios';
    } else {
      return score >= 75 ? '🔥 Absolute Mastery' : score >= 50 ? '⚡ Active Progress Day' : '🌱 Small Daily Steps';
    }
  }, [score, isSpanish]);

  const handleSaveTitle = async () => {
    setIsEditing(false);
    const trimmed = editedTitle.trim();
    if (trimmed === (entry.title || '')) return;
    
    if (onSaveEntry) {
      try {
        await onSaveEntry({
          ...entry,
          title: trimmed || undefined
        });
      } catch (e) {
        console.error('Failed to save custom title', e);
      }
    }
  };

  const cardStyle = React.useMemo(() => {
    if (isToday) {
      return {
        bgClass: 'bg-gradient-to-br from-[#141b46] via-[#090b0e] to-[#0f2430] border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]',
        barClass: 'bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400'
      };
    }
    if (!hasActivity) {
      return {
        bgClass: 'bg-[#0a0a0f]/80 border-white/[0.03] opacity-50',
        barClass: 'bg-white/10'
      };
    }
    if (score >= 75) {
      return {
        bgClass: 'bg-gradient-to-br from-[#0c2419] via-[#090b0e] to-[#071318] border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.06)]',
        barClass: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
      };
    }
    if (score >= 50) {
      return {
        bgClass: 'bg-gradient-to-br from-[#12163b] via-[#090b0e] to-[#160f29] border-indigo-500/20 shadow-[0_4px_24px_rgba(99,102,241,0.06)]',
        barClass: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500'
      };
    }
    return {
      bgClass: 'bg-gradient-to-br from-[#22160d] via-[#090b0e] to-[#121217] border-amber-500/15 shadow-[0_4px_24px_rgba(245,158,11,0.04)]',
      barClass: 'bg-gradient-to-r from-amber-500 via-orange-400 to-red-500'
    };
  }, [hasActivity, score, isToday]);

  // Delta helpers
  const renderDelta = (current: number, prev: number | undefined, isMinutes: boolean = false) => {
    if (prev === undefined) return null;
    const diff = current - prev;
    if (diff === 0) return null;
    const isPos = diff > 0;
    const Icon = isPos ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPos ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    
    const formattedDiff = isMinutes
      ? diff < 60 && diff > -60 ? `${Math.abs(diff)}m` : `${Math.round(Math.abs(diff)/60 * 10)/10}h`
      : Math.abs(diff);
    
    return (
      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-bold tracking-tight shrink-0 ${colorClass}`}>
        <Icon size={10} />
        <span>{formattedDiff}</span>
      </div>
    );
  };

  return (
    <motion.div
      className="relative group"
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay, 
        duration: 0.55, 
        ease: [0.16, 1, 0.3, 1] 
      }}
    >
      {/* Card with premium hover */}
      <div className={`
        relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out
        hover:-translate-y-1 hover:scale-[1.008]
        ${cardStyle.bgClass}
      `}>
        {/* Dynamic top accent bar with subtle shimmer */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] z-10 ${cardStyle.barClass}`}>
          {isToday && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
            />
          )}
        </div>

        {/* Live indicator for today */}
        {isToday && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
            <motion.div 
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.15em]">{t('feed.card.live')}</span>
          </div>
        )}

        {/* Ambient glow for today - GPU accelerated */}
        {isToday && (
          <div 
            className="absolute -top-16 -right-16 w-36 h-36 rounded-full pointer-events-none" 
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
          />
        )}

        <div className="relative p-3.5 sm:p-4">
          {/* Header: Strava-style User + Date + Score */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              {/* User Avatar Initials */}
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={displayName} 
                  className="w-8 h-8 rounded-full border border-white/10 shadow-sm shrink-0 object-cover" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs border border-white/10 shadow-sm shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                  {displayName}
                </h3>
                <span className="text-[9px] text-white/35 font-semibold">
                  {isToday ? t('feed.card.today') : (isSpanish ? `${dayName} ${day} de ${month}` : `${dayName}, ${month} ${day}`)}
                </span>
              </div>
            </div>

            {/* Score Badge - enhanced */}
            {hasActivity && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider mb-0.5">{t('feed.card.productivity')}</span>
                  <motion.span 
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                      score >= 75 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.08)]' :
                      score >= 50 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                      score >= 25 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                      'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    }`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: delay + 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {score}%
                  </motion.span>
                </div>
              </div>
            )}
          </div>

          {/* Activity Description */}
          {hasActivity && (
            <div className="mb-2.5">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full mt-1">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setEditedTitle(entry.title || '');
                        setIsEditing(false);
                      }
                    }}
                    autoFocus
                    className="bg-white/5 border border-indigo-500/50 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full font-bold"
                    placeholder={defaultTitle}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title mt-1 cursor-pointer" onClick={() => setIsEditing(true)}>
                  <h4 className="text-sm font-black text-white tracking-tight hover:text-indigo-300 transition-colors">
                    {entry.title || defaultTitle}
                  </h4>
                  <Edit2 size={10} className="text-white/20 group-hover/title:text-indigo-400 opacity-0 group-hover/title:opacity-100 transition-all shrink-0" />
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {entry.xpEarned > 0 && (
                  <motion.div 
                    className="flex items-center gap-0.5"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.2 }}
                  >
                    <Zap size={10} className="text-yellow-400" />
                    <span className="text-[9px] font-bold text-yellow-400/80 tabular-nums">{entry.xpEarned} XP</span>
                  </motion.div>
                )}
                {entry.goldEarned > 0 && (
                  <motion.div 
                    className="flex items-center gap-0.5"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.25 }}
                  >
                    <Coins size={10} className="text-amber-400" />
                    <span className="text-[9px] font-bold text-amber-400/80 tabular-nums">{entry.goldEarned}</span>
                  </motion.div>
                )}
                {entry.tpEarned > 0 && (
                  <motion.div 
                    className="flex items-center gap-0.5"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.3 }}
                  >
                    <Star size={10} className="text-purple-400" />
                    <span className="text-[9px] font-bold text-purple-400/80 tabular-nums">{entry.tpEarned} TP</span>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Grid Metrics - Premium depth effect */}
          {hasActivity ? (
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              {/* Focus */}
              <motion.div 
                className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 flex flex-col justify-between hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.15, duration: 0.4 }}
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={10} className="text-indigo-400" /> {t('feed.focus')}
                  </span>
                  {renderDelta(entry.focusMinutes, prevEntry?.focusMinutes, true)}
                </div>
                <span className="text-sm sm:text-base font-black text-white mt-0.5 tabular-nums">
                  {formatFocusTime(entry.focusMinutes)}
                </span>
              </motion.div>

              {/* Tasks */}
              <motion.div 
                className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 flex flex-col justify-between hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.2, duration: 0.4 }}
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-orange-400" /> {t('feed.tasks')}
                  </span>
                  {renderDelta(entry.tasksCompleted, prevEntry?.tasksCompleted)}
                </div>
                <span className="text-sm sm:text-base font-black text-white mt-0.5 tabular-nums">
                  {entry.tasksCompleted} <span className="text-[8px] text-white/30 font-medium">{t('feed.card.done')}</span>
                </span>
              </motion.div>

              {/* Habits */}
              <motion.div 
                className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 flex flex-col justify-between hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.25, duration: 0.4 }}
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                    <Flame size={10} className="text-emerald-400" /> {t('feed.habits')}
                  </span>
                  {renderDelta(entry.habitsCompleted, prevEntry?.habitsCompleted)}
                </div>
                <span className="text-sm sm:text-base font-black text-white mt-0.5 tabular-nums">
                  {entry.habitsCompleted} <span className="text-[8px] text-white/30 font-medium">{t('feed.card.completed')}</span>
                </span>
              </motion.div>

              {/* Sub-habits */}
              <motion.div 
                className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-2.5 flex flex-col justify-between hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-200"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.3, duration: 0.4 }}
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
                    <ListChecks size={10} className="text-cyan-400" /> {t('feed.subHab')}
                  </span>
                  {renderDelta(entry.subHabitsCompleted, prevEntry?.subHabitsCompleted)}
                </div>
                <span className="text-sm sm:text-base font-black text-white mt-0.5 tabular-nums">
                  {entry.subHabitsCompleted} <span className="text-[8px] text-white/30 font-medium">{t('feed.card.doneSub')}</span>
                </span>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-4 bg-white/[0.01] border border-white/[0.03] rounded-xl text-white/20 text-xs font-semibold">
              {t('feed.card.noActivity')}
            </div>
          )}

          {/* Detailed achievements list */}
          {entry.completedTaskTitles.length > 0 && (
            <motion.div
              className="mt-2 pt-2 border-t border-white/[0.04] space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.35 }}
            >
              <div className="text-[8px] font-black text-white/25 uppercase tracking-[0.12em] mb-1">{t('feed.card.completedMissions')}</div>
              <div className="space-y-1">
                {entry.completedTaskTitles.map((title, i) => (
                  <motion.div 
                    key={i} 
                    className="flex items-center gap-1.5 text-[11px] text-white/70 bg-white/[0.01] border border-white/[0.03] px-2 py-1 rounded-lg hover:bg-white/[0.03] transition-colors duration-200"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.35 + i * 0.04 }}
                  >
                    <CheckCircle2 size={10} className="text-orange-400 shrink-0" />
                    <span className="font-semibold text-white/75 truncate">{title}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
