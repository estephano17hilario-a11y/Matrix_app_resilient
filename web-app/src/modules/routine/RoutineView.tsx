import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import * as LucideIcons from '@/utils/lucideRegistry';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, CalendarClock, Check, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Clock, Flame, Moon, PenLine,
  Play, Plus, Settings2, SlidersHorizontal, Sparkles, Sun, Sunset, Target, AlertCircle, PartyPopper,
} from 'lucide-react';
import type { Attribute, Habit, Project, Quest } from '../../types';
import { JournalRemindersModal } from '../notes/components/JournalRemindersModal';
import { getJournalReminders, saveJournalReminders } from '../../services/journalReminders';
import { notificationService } from '../../services/notificationService';
import { QuantityUpdateModal } from '../dashboard/components/QuantityUpdateModal';
import { addDays, formatClock, getHistoryDateKey, startOfWeek, toLocalISOString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { RoutineConfigSheet } from './RoutineConfigSheet';
import {
  buildRoutineItems, countByPart, dayPartOf, formatHourRange, hourBlockOf, loadRoutineConfig, saveRoutineConfig, sectionize,
  type DayPart, type DayPartFilter, type RoutineConfig, type RoutineItem, type RoutineSection,
} from './routineEngine';

interface RoutineViewProps {
  userId?: string;
  habits: Habit[];
  quests: Quest[];
  projects: Project[];
  attributes: Attribute[];
  isActive?: boolean;
  /** Journal entries (only their date and content matter: a day with text counts as written). */
  journalEntries?: { date: string; blocks?: unknown[] }[];
  onCompleteHabit: (e: React.MouseEvent, habit: Habit, date?: Date) => void;
  onUpdateHabit?: (habitId: string, data: Partial<Habit>, date?: Date) => void;
  onEditHabit?: (habit: Habit & { _initialTab?: 'alarm' | 'checklist'; _targetSubtaskId?: string }) => void;
  onCompleteQuest: (e: React.MouseEvent, quest: Quest) => void;
  onEditQuest?: (quest: Quest) => void;
  onAddQuest?: () => void;
  onAddHabit?: (e?: React.MouseEvent) => void;
  onFocusProject?: (projectId: string) => void;
  onOpenJournal?: (dateStr: string) => void;
}

// One spring for everything interactive, so the whole screen moves with the same feel.
const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;

const PART_STYLE: Record<DayPart, { es: string; en: string; icon: React.ElementType; tint: string }> = {
  MORNING: { es: 'Mañana', en: 'Morning', icon: Sun, tint: '#fbbf24' },
  AFTERNOON: { es: 'Tarde', en: 'Afternoon', icon: Sunset, tint: '#fb923c' },
  NIGHT: { es: 'Noche', en: 'Night', icon: Moon, tint: '#818cf8' },
};

const KIND_ICON: Record<RoutineItem['kind'], React.ElementType> = {
  HABIT: Flame, SUBHABIT: Flame, TASK: CheckSquare, PROJECT: Target, JOURNAL: BookOpen,
};

// Width of the optional time column beside the timeline rail (kept tight: no dead space left of the hours).
const TIME_COL = 34;

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// ── Progress ring ───────────────────────────────────────────────────────────

const ProgressRing: React.FC<{ pct: number; reduce: boolean }> = ({ pct, reduce }) => {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-[64px] h-[64px] shrink-0">
      <svg viewBox="0 0 92 92" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="routine-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="46" cy="46" r={r} fill="none" stroke="url(#routine-ring)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={reduce ? { duration: 0 } : { duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-black text-white leading-none tabular-nums">{pct}<span className="text-[9px] text-white/50">%</span></span>
      </div>
    </div>
  );
};

// ── Timeline card ───────────────────────────────────────────────────────────

interface CardProps {
  item: RoutineItem;
  Icon: React.ElementType;
  index: number;
  exactTime: boolean;
  timeLeft: boolean;
  use24h: boolean;
  isNext: boolean;
  burst: boolean;
  reduce: boolean;
  es: boolean;
  onToggle: (e: React.MouseEvent, item: RoutineItem) => void;
  onOpen: (item: RoutineItem) => void;
}

const RoutineCard: React.FC<CardProps> = React.memo(({ item, Icon, index, exactTime, timeLeft, use24h, isNext, burst, reduce, es, onToggle, onOpen }) => {
  const ActionIcon = item.kind === 'PROJECT' ? Play : item.kind === 'JOURNAL' ? PenLine : Check;
  const showCheck = item.done || item.kind === 'PROJECT' || item.kind === 'JOURNAL';
  const c = item.color;

  return (
    <motion.div
      className="relative flex items-stretch"
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0 } : { ...SPRING, delay: Math.min(index * 0.04, 0.4) }}
    >
      {/* Time column (optional): the time of each item, beside the timeline */}
      {timeLeft && (
        <div className="shrink-0 pt-[22px] pr-1 text-right" style={{ width: TIME_COL }}>
          {item.time ? (() => {
            const [main, suffix] = formatClock(item.time, !use24h).split(' ');
            return (
              <>
                <span className={cn('block text-[11px] font-black tabular-nums leading-none tracking-tight', item.done ? 'text-white/25' : 'text-white/80')}>{main}</span>
                {suffix && <span className={cn('block text-[8px] font-black tracking-wider mt-0.5', item.done ? 'text-white/15' : 'text-white/35')}>{suffix}</span>}
              </>
            );
          })() : <span className="block text-[12px] font-black text-white/20">—</span>}
        </div>
      )}

      {/* Rail: the dot sits on the shared line drawn by the section */}
      <div className="relative w-4 shrink-0">
        <span
          className="absolute left-1/2 top-[26px] -translate-x-1/2 w-[12px] h-[12px] rounded-full border-[2.5px] transition-colors duration-300"
          style={{ borderColor: c, backgroundColor: item.done ? c : '#07070b', boxShadow: item.done ? `0 0 12px ${c}99` : 'none' }}
        />
        {isNext && !item.done && (
          <span className="absolute left-1/2 top-[26px] -translate-x-1/2 w-[12px] h-[12px] rounded-full animate-ping" style={{ backgroundColor: c, opacity: 0.5 }} />
        )}
      </div>

      <motion.div
        role="button"
        tabIndex={0}
        whileTap={reduce ? undefined : { scale: 0.982 }}
        transition={SPRING}
        onClick={() => onOpen(item)}
        onKeyDown={e => { if (e.key === 'Enter') onOpen(item); }}
        className="relative flex-1 min-w-0 my-1.5 ml-1 rounded-[22px] overflow-hidden cursor-pointer select-none"
        style={{
          background: item.done
            ? 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))'
            : `linear-gradient(135deg, ${c}26 0%, rgba(11,11,17,0.94) 58%)`,
          border: `1px solid ${item.done ? 'rgba(255,255,255,0.05)' : `${c}38`}`,
          boxShadow: item.done ? 'none' : `0 8px 24px -14px ${c}80`,
          willChange: 'transform',
        }}
      >
        {/* Accent bar */}
        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: `linear-gradient(180deg, ${c}, ${c}33)`, opacity: item.done ? 0.35 : 1 }} />

        <div className="flex items-center gap-3 pl-4 pr-3 py-3">
          <div
            className="w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(145deg, ${c}38, ${c}12)`, boxShadow: item.done ? 'none' : `inset 0 0 0 1px ${c}30` }}
          >
            <Icon size={19} style={{ color: c, opacity: item.done ? 0.5 : 1 }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn('text-[15px] font-bold truncate leading-tight transition-colors duration-300', item.done ? 'text-white/30 line-through decoration-white/20' : 'text-white')}>
              {item.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
              {exactTime && item.time && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-black tabular-nums shrink-0"
                  style={{ background: item.done ? 'rgba(255,255,255,0.05)' : `${c}26`, color: item.done ? 'rgba(255,255,255,0.3)' : c }}
                >
                  <Clock size={10} strokeWidth={3} /> {formatClock(item.time, !use24h)}
                </span>
              )}
              {item.subtitle && (
                <span className={cn('text-[10px] font-bold uppercase tracking-wider truncate', item.overdue ? 'text-rose-300' : 'text-white/35')}>
                  {item.subtitle}
                </span>
              )}
              {!exactTime && !timeLeft && !item.subtitle && item.time && <span className="text-[10px] font-bold text-white/30 tabular-nums">{formatClock(item.time, !use24h)}</span>}
            </div>
          </div>

          <motion.button
            type="button"
            onClick={e => onToggle(e, item)}
            whileTap={reduce ? undefined : { scale: 0.82 }}
            transition={SPRING}
            aria-label={item.done ? (es ? 'Hecho' : 'Done') : (es ? 'Marcar' : 'Mark')}
            className="relative w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: item.done ? c : 'rgba(0,0,0,0.35)',
              border: `2px solid ${item.done ? c : `${c}80`}`,
              boxShadow: item.done ? `0 0 18px ${c}66` : 'none',
              transition: 'background-color .25s, border-color .25s, box-shadow .25s',
            }}
          >
            <AnimatePresence initial={false}>
              {showCheck && (
                <motion.span
                  key="icon"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={reduce ? false : { scale: 0, rotate: -50 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 560, damping: 22 }}
                  style={{ color: item.done ? '#fff' : c }}
                >
                  <ActionIcon size={item.kind === 'PROJECT' ? 16 : 19} strokeWidth={item.kind === 'PROJECT' ? 2.5 : 3.2} />
                </motion.span>
              )}
            </AnimatePresence>
            {burst && !reduce && (
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: `2px solid ${c}` }}
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.3, opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )}
          </motion.button>
        </div>

        {item.progress !== undefined && !item.done && (
          <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/[0.05]">
            <motion.div
              className="h-full origin-left"
              style={{ background: `linear-gradient(90deg, ${c}, ${c}aa)`, width: '100%' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: item.progress }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
});
RoutineCard.displayName = 'RoutineCard';

// ── Main view ───────────────────────────────────────────────────────────────

export const RoutineView: React.FC<RoutineViewProps> = ({
  userId, habits, quests, projects, attributes, isActive = true, journalEntries = [],
  onCompleteHabit, onUpdateHabit, onEditHabit, onCompleteQuest, onEditQuest, onAddQuest, onAddHabit, onFocusProject, onOpenJournal,
}) => {
  const { i18n } = useTranslation();
  const es = !!i18n.language?.startsWith('es');
  const tr = (a: string, b: string) => (es ? a : b);
  const reduce = !!useReducedMotion();

  const [config, setConfig] = useState<RoutineConfig>(() => loadRoutineConfig(userId));
  const [date, setDate] = useState(() => new Date());
  const [filter, setFilter] = useState<string>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [configOpen, setConfigOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [quantityHabit, setQuantityHabit] = useState<Habit | null>(null);
  const [journalTimes, setJournalTimes] = useState<string[]>(() => getJournalReminders(userId).times);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [burstId, setBurstId] = useState<string | null>(null);

  useEffect(() => { setConfig(loadRoutineConfig(userId)); setJournalTimes(getJournalReminders(userId).times); }, [userId]);

  // The clock only matters while the section is on screen.
  useEffect(() => {
    if (!isActive) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [isActive]);

  useEffect(() => {
    const onUpdate = (e: Event) => setJournalTimes((e as CustomEvent<{ times: string[] }>).detail?.times ?? getJournalReminders(userId).times);
    window.addEventListener('journal-reminders-updated', onUpdate);
    return () => window.removeEventListener('journal-reminders-updated', onUpdate);
  }, [userId]);

  const updateConfig = useCallback((patch: Partial<RoutineConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      saveRoutineConfig(userId, next);
      return next;
    });
  }, [userId]);

  const dayKey = toLocalISOString(date);
  const todayKey = toLocalISOString(now);
  const isToday = dayKey === todayKey;

  const attrColor = useMemo(() => {
    const map = new Map(attributes.map(a => [a.id, a.color]));
    return (id: string) => map.get(id) || '';
  }, [attributes]);

  const attrMap = useMemo(() => new Map(attributes.map(a => [a.id, a])), [attributes]);

  // Habits: their own icon (or their trait's) like the chronological habits view. Everything else: its kind icon.
  const iconFor = useCallback((item: RoutineItem): React.ElementType => {
    if (config.habitIcons && (item.kind === 'HABIT' || item.kind === 'SUBHABIT') && item.habit) {
      const named = item.habit.iconName ? (LucideIcons as unknown as Record<string, React.ElementType>)[item.habit.iconName] : undefined;
      if (named) return named;
      const fromAttribute = attrMap.get(item.habit.attribute)?.icon as React.ElementType | undefined;
      if (fromAttribute) return fromAttribute;
    }
    return KIND_ICON[item.kind];
  }, [config.habitIcons, attrMap]);

  const writtenDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of journalEntries) if (e.date && (e.blocks?.length ?? 0) > 0) set.add(getHistoryDateKey(e.date));
    return set;
  }, [journalEntries]);

  const labels = useMemo(() => ({
    journal: tr('Escribir en el journal', 'Write in your journal'),
    journalSub: tr('Recordatorio', 'Reminder'),
    overdue: tr('Atrasada', 'Overdue'),
    project: tr('Sesión de enfoque', 'Focus session'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [es]);

  const itemsFor = useCallback((d: Date) => buildRoutineItems({
    date: d, habits, quests, projects, journalTimes, journalDone: writtenDays.has(toLocalISOString(d)), config,
    colorForAttribute: attrColor, labels,
  }), [habits, quests, projects, journalTimes, writtenDays, config, attrColor, labels]);

  const allItems = useMemo(() => itemsFor(date), [itemsFor, date]);

  // Week strip: the 7 days around the selected date, with a pending/done hint each.
  const weekDays = useMemo(() => {
    const start = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const items = itemsFor(d);
      const pending = items.filter(x => !x.done).length;
      return { date: d, key: toLocalISOString(d), pending, total: items.length };
    });
  }, [date, itemsFor]);

  const counts = useMemo(() => countByPart(allItems), [allItems]);
  // Hour blocks present in the day (only used when dividing by hours): the chips above the list.
  const hourBlocks = useMemo(() => {
    if (!config.divideByHour) return [];
    const byStart = new Map<number, { startHour: number; endHour: number; count: number }>();
    for (const it of allItems) {
      if (it.overdue || it.minutes === null) continue;
      const b = hourBlockOf(it.minutes, config.hourBlock);
      const cur = byStart.get(b.startHour);
      if (cur) cur.count += 1; else byStart.set(b.startHour, { ...b, count: 1 });
    }
    return Array.from(byStart.values()).sort((a, b) => a.startHour - b.startHour);
  }, [allItems, config.divideByHour, config.hourBlock]);

  // A filter that no longer exists (block size changed, mode switched) falls back to "Todo".
  useEffect(() => {
    if (filter.startsWith('H') && !hourBlocks.some(b => `H${b.startHour}` === filter)) setFilter('ALL');
  }, [filter, hourBlocks]);

  const visible = useMemo(() => {
    if (filter === 'ALL') return allItems;
    if (filter.startsWith('H')) {
      const start = Number(filter.slice(1));
      return allItems.filter(it => it.minutes !== null && !it.overdue && hourBlockOf(it.minutes, config.hourBlock).startHour === start);
    }
    return allItems.filter(it => it.minutes !== null && !it.overdue && dayPartOf(it.minutes) === filter);
  }, [allItems, filter, config.hourBlock]);
  const sections: RoutineSection[] = useMemo(() => sectionize(visible, config), [visible, config]);

  const doneCount = allItems.filter(i => i.done).length;
  const overdueCount = allItems.filter(i => i.overdue && !i.done).length;
  const pendingCount = allItems.length - doneCount;
  const pct = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // What to do next: the first pending timed item still ahead (or just passed), else any pending.
  const next = useMemo(() => {
    const pending = allItems.filter(i => !i.done);
    if (!pending.length) return null;
    if (isToday) {
      const upcoming = pending.find(i => !i.overdue && i.minutes !== null && i.minutes >= nowMinutes - 30);
      return upcoming || pending.find(i => i.overdue) || pending[0];
    }
    return pending[0];
  }, [allItems, isToday, nowMinutes]);

  const nextWhen = useMemo(() => {
    if (!next) return '';
    if (next.overdue) return tr('Atrasada', 'Overdue');
    if (!isToday || next.minutes === null) return next.time ? formatClock(next.time, !config.use24h) : tr('Sin hora', 'Anytime');
    const diff = next.minutes - nowMinutes;
    if (Math.abs(diff) <= 1) return tr('Ahora', 'Now');
    const abs = Math.abs(diff);
    const txt = abs >= 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ''}` : `${abs} min`;
    return diff > 0 ? tr(`en ${txt}`, `in ${txt}`) : tr(`hace ${txt}`, `${txt} ago`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, isToday, nowMinutes, config.use24h, es]);

  const fullDate = date.toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = date.toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const fmt = (t: string) => formatClock(t, !config.use24h);

  const toggleItem = useCallback((e: React.MouseEvent, item: RoutineItem) => {
    e.stopPropagation();
    if (!item.done && item.kind !== 'PROJECT' && item.kind !== 'JOURNAL') {
      setBurstId(item.id);
      window.setTimeout(() => setBurstId(cur => (cur === item.id ? null : cur)), 700);
    }
    switch (item.kind) {
      case 'HABIT':
        if (item.isQuantity && item.habit && onUpdateHabit) setQuantityHabit(item.habit);
        else if (item.habit) onCompleteHabit(e, item.habit, date);
        break;
      case 'SUBHABIT':
        if (item.habit && onUpdateHabit) {
          const checklist = (item.habit.checklist || []).map(s => (s.id === item.subtaskId ? { ...s, completed: !s.completed } : s));
          onUpdateHabit(item.habit.id, { checklist }, date);
        }
        break;
      case 'TASK':
        if (item.quest) onCompleteQuest(e, item.quest);
        break;
      case 'PROJECT':
        if (item.project) onFocusProject?.(item.project.id);
        break;
      case 'JOURNAL':
        onOpenJournal?.(dayKey);
        break;
    }
  }, [date, dayKey, onCompleteHabit, onUpdateHabit, onCompleteQuest, onFocusProject, onOpenJournal]);

  const openItem = useCallback((item: RoutineItem) => {
    if (item.kind === 'TASK' && item.quest) onEditQuest?.(item.quest);
    else if ((item.kind === 'HABIT' || item.kind === 'SUBHABIT') && item.habit) {
      onEditHabit?.({ ...item.habit, _initialTab: item.kind === 'SUBHABIT' ? 'checklist' : 'alarm', _targetSubtaskId: item.subtaskId });
    } else if (item.kind === 'PROJECT' && item.project) onFocusProject?.(item.project.id);
    else if (item.kind === 'JOURNAL') onOpenJournal?.(dayKey);
  }, [dayKey, onEditQuest, onEditHabit, onFocusProject, onOpenJournal]);

  const onSaveJournalTimes = (times: string[]) => {
    if (userId) {
      const saved = saveJournalReminders(userId, { times, prompted: true });
      notificationService.scheduleJournalReminders(saved.times);
    }
    setJournalModalOpen(false);
  };

  const filters: { id: DayPartFilter; label: string; icon: React.ElementType }[] = [
    { id: 'ALL', label: tr('Todo', 'All'), icon: CalendarClock },
    { id: 'MORNING', label: tr('Mañana', 'Morning'), icon: Sun },
    { id: 'AFTERNOON', label: tr('Tarde', 'Afternoon'), icon: Sunset },
    { id: 'NIGHT', label: tr('Noche', 'Night'), icon: Moon },
  ];

  const filterLabel = (() => {
    if (filter.startsWith('H')) {
      const b = hourBlocks.find(x => `H${x.startHour}` === filter);
      return b ? formatHourRange(b.startHour, b.endHour, config.use24h) : tr('Todo', 'All');
    }
    return filters.find(f => f.id === filter)?.label ?? tr('Todo', 'All');
  })();

  const sectionMeta = (s: RoutineSection): { label: string; icon: React.ElementType; tint: string } => {
    switch (s.kind) {
      case 'OVERDUE': return { label: tr('Atrasadas', 'Overdue'), icon: AlertCircle, tint: '#fb7185' };
      case 'ANYTIME': return { label: tr('Sin hora', 'Anytime'), icon: Sparkles, tint: '#94a3b8' };
      case 'HOUR': {
        const p = PART_STYLE[s.part || 'MORNING'];
        return { label: formatHourRange(s.startHour!, s.endHour!, config.use24h), icon: p.icon, tint: p.tint };
      }
      case 'PART': {
        const p = PART_STYLE[s.part!];
        return { label: es ? p.es : p.en, icon: p.icon, tint: p.tint };
      }
      default: return { label: '', icon: CalendarClock, tint: '#94a3b8' };
    }
  };

  // Where the "now" marker goes: right before the first timed item still ahead of the clock.
  const nowBeforeId = isToday && filter === 'ALL'
    ? visible.find(it => !it.overdue && it.minutes !== null && it.minutes > nowMinutes)?.id ?? null
    : null;

  const listKey = `${dayKey}|${filter}|${config.divideByHour}|${config.hourBlock}|${config.groupByPart}`;
  let runningIndex = 0;

  return (
    <div className="pb-36 pt-2 w-full">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-4 px-1"
        initial={reduce ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <div className="min-w-0">
          <h1 className="text-[28px] font-black text-white tracking-tight leading-none">{tr('Rutina', 'Routine')}</h1>
          <p className="text-[12px] font-semibold text-white/40 first-letter:uppercase truncate mt-1.5">{fullDate}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 relative">
          <motion.button
            type="button" whileTap={{ scale: 0.88 }} transition={SPRING}
            onClick={() => setAddOpen(v => !v)} aria-label={tr('Añadir', 'Add')}
            className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_6px_20px_-6px_rgba(255,255,255,0.5)]"
          >
            <motion.span animate={{ rotate: addOpen ? 45 : 0 }} transition={SPRING} className="flex"><Plus size={19} strokeWidth={3} /></motion.span>
          </motion.button>
          <motion.button
            type="button" whileTap={{ scale: 0.88 }} transition={SPRING}
            onClick={() => setConfigOpen(true)} aria-label={tr('Personalizar', 'Customize')}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70"
          >
            <Settings2 size={17} />
          </motion.button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
              <div
                className="absolute right-0 top-12 z-50 w-52 rounded-[20px] bg-[#14141d] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-1.5 animate-in fade-in zoom-in-95 duration-150"
                style={{ transformOrigin: 'top right' }}
              >
                <button type="button" onClick={() => { setAddOpen(false); onAddQuest?.(); }} className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-[13px] font-bold text-white active:bg-white/10">
                  <span className="w-8 h-8 rounded-xl bg-cyan-400/15 text-cyan-300 flex items-center justify-center"><CheckSquare size={16} /></span> {tr('Nueva tarea', 'New task')}
                </button>
                <button type="button" onClick={e => { setAddOpen(false); onAddHabit?.(e); }} className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-[13px] font-bold text-white active:bg-white/10">
                  <span className="w-8 h-8 rounded-xl bg-orange-400/15 text-orange-300 flex items-center justify-center"><Flame size={16} /></span> {tr('Nuevo hábito', 'New habit')}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Hero */}
      <motion.section
        className="relative overflow-hidden rounded-[24px] p-3 mb-3 border border-white/10"
        style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.16) 0%, rgba(99,102,241,0.14) 48%, rgba(168,85,247,0.12) 100%)' }}
        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING, delay: 0.05 }}
      >
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.22), transparent 68%)' }} />
        <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.18), transparent 68%)' }} />
        <div className="relative flex items-center gap-3">
          <ProgressRing pct={pct} reduce={reduce} />
          <div className="flex-1 min-w-0">
            {next ? (
              <>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-200/70">{tr('Siguiente', 'Up next')}</p>
                <div className="flex items-center gap-2 mt-0.5 min-w-0">
                  <p className="text-[15px] font-black text-white leading-tight truncate min-w-0">{next.title}</p>
                  <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/85 tabular-nums">
                    <Clock size={10} strokeWidth={3} /> {nextWhen}
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/70">{allItems.length ? tr('Todo listo', 'All done') : tr('Día libre', 'Free day')}</p>
                <p className="flex items-center gap-1.5 text-[15px] font-black text-white leading-tight mt-0.5">
                  <span className="truncate">{allItems.length ? tr('Cumpliste tu rutina', 'You nailed your routine') : tr('Nada programado', 'Nothing scheduled')}</span>
                  <PartyPopper size={15} className="text-emerald-300 shrink-0" />
                </p>
              </>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
              {[
                { label: tr('Hechas', 'Done'), value: doneCount, tint: '#34d399' },
                { label: tr('Pend.', 'Pending'), value: pendingCount, tint: '#38bdf8' },
                { label: tr('Atras.', 'Overdue'), value: overdueCount, tint: '#fb7185' },
              ].map(s => (
                <span key={s.label} className="flex items-baseline gap-1">
                  <span className="text-[13px] font-black tabular-nums" style={{ color: s.tint }}>{s.value}</span>{s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Date + day-part + hour filters: folded into one button so the routine gets the screen */}
      <div className="mb-4">
        <motion.button
          type="button"
          onClick={() => setFiltersOpen(v => !v)}
          aria-expanded={filtersOpen}
          whileTap={reduce ? undefined : { scale: 0.98 }}
          transition={SPRING}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center gap-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] pl-3 pr-3 py-2.5 text-left"
        >
          <span className="w-7 h-7 rounded-xl bg-sky-400/10 text-sky-300 flex items-center justify-center shrink-0"><SlidersHorizontal size={14} /></span>
          <span className="flex-1 min-w-0 flex items-center gap-1.5 text-[12px] font-black">
            <span className="text-white/85 truncate first-letter:uppercase">{shortDate}</span>
            <span className="text-white/20">·</span>
            <span className={cn('truncate', filter === 'ALL' ? 'text-white/40' : 'text-sky-300')}>{filterLabel}</span>
          </span>
          <motion.span animate={{ rotate: filtersOpen ? 180 : 0 }} transition={SPRING} className="flex text-white/40 shrink-0"><ChevronDown size={16} /></motion.span>
        </motion.button>
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              key="filters-panel"
              className="overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pt-3">
      {/* Week strip */}
      <div className="flex items-center gap-1 mb-3"
      >
        <button type="button" onClick={() => setDate(d => addDays(d, -7))} aria-label={tr('Semana anterior', 'Previous week')} className="w-5 h-12 flex items-center justify-center text-white/35 active:text-white active:scale-90 transition-transform"><ChevronLeft size={18} /></button>
        <div className="relative flex-1 grid grid-cols-7">
          <span
            className="absolute inset-y-0 left-0 w-[calc(100%/7)] p-0.5 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `translateX(${Math.max(0, weekDays.findIndex(d => d.key === dayKey)) * 100}%)` }}
          >
            <span className="block w-full h-full rounded-2xl" style={{ background: 'linear-gradient(160deg,#ffffff,#dbeafe)', boxShadow: '0 8px 22px -8px rgba(125,211,252,0.7)' }} />
          </span>
          {weekDays.map(d => {
            const selected = d.key === dayKey;
            const today = d.key === todayKey;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => { setDate(d.date); setFilter('ALL'); }}
                className="relative h-[58px] rounded-2xl flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-150"
              >
                <span className={cn('relative text-[9px] font-black uppercase tracking-wider transition-colors', selected ? 'text-black/55' : 'text-white/35')}>
                  {d.date.toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'short' }).replace('.', '').slice(0, 3)}
                </span>
                <span className={cn('relative text-[17px] font-black leading-none tabular-nums transition-colors', selected ? 'text-black' : today ? 'text-sky-300' : 'text-white/80')}>{d.date.getDate()}</span>
                <span
                  className="relative w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{ backgroundColor: d.total === 0 ? 'transparent' : d.pending === 0 ? '#34d399' : selected ? '#0ea5e9' : '#38bdf8', opacity: d.total === 0 ? 0 : d.pending === 0 ? 1 : 0.85 }}
                />
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setDate(d => addDays(d, 7))} aria-label={tr('Semana siguiente', 'Next week')} className="w-5 h-12 flex items-center justify-center text-white/35 active:text-white active:scale-90 transition-transform"><ChevronRight size={18} /></button>
      </div>
      {!isToday && (
        <button type="button" onClick={() => setDate(new Date())} className="mx-auto mb-3 flex items-center gap-1.5 rounded-full bg-sky-400/10 border border-sky-400/20 px-3 py-1.5 text-[11px] font-black text-sky-300 active:scale-95 transition-transform">
          <CalendarClock size={12} /> {tr('Volver a hoy', 'Back to today')}
        </button>
      )}

      {/* Mañana / Tarde / Noche */}
      <div
        className={cn('relative flex p-1 rounded-[20px] bg-white/[0.04] border border-white/[0.07]', hourBlocks.length ? 'mb-3' : '')}
      >
        <span
          className="absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/4)] rounded-2xl bg-white pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transform: `translateX(${Math.max(0, filters.findIndex(f => f.id === filter)) * 100}%)`,
            opacity: filters.some(f => f.id === filter) ? 1 : 0,
            boxShadow: '0 6px 18px -8px rgba(255,255,255,0.6)',
          }}
        />
        {filters.map(f => {
          const active = filter === f.id;
          const FIcon = f.icon;
          return (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[11px] font-black active:scale-95 transition-transform duration-150">
              <span className={cn('flex items-center gap-1.5 transition-colors duration-200', active ? 'text-black' : 'text-white/45')}>
                <FIcon size={13} />
                <span>{f.label}</span>
                <span className={cn('text-[9px] tabular-nums', active ? 'text-black/45' : 'text-white/25')}>{counts[f.id as DayPartFilter]}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Hour blocks: same idea as Mañana / Tarde / Noche, but by the block size chosen in settings */}
      {hourBlocks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={cn('shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black border active:scale-95 transition-all duration-200', filter === 'ALL' ? 'text-white border-transparent' : 'text-white/45 bg-white/[0.04] border-white/[0.07]')}
            style={filter === 'ALL' ? { background: 'linear-gradient(135deg,#38bdf8,#818cf8)' } : undefined}
          >
            {tr('Todo', 'All')}
          </button>
          {hourBlocks.map(b => {
            const id = `H${b.startHour}`;
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn('shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black border tabular-nums active:scale-95 transition-all duration-200', active ? 'text-white border-transparent' : 'text-white/45 bg-white/[0.04] border-white/[0.07]')}
                style={active ? { background: 'linear-gradient(135deg,#38bdf8,#818cf8)' } : undefined}
              >
                <Clock size={11} strokeWidth={3} /> {formatHourRange(b.startHour, b.endHour, config.use24h)}
                <span className={cn('text-[9px]', active ? 'text-white/70' : 'text-white/25')}>{b.count}</span>
              </button>
            );
          })}
        </div>
      )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline */}
      {sections.length === 0 ? (
        <motion.div
          key={`empty-${listKey}`}
          className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-9 text-center"
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
        >
          <motion.div animate={reduce ? undefined : { y: [0, -7, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} className="mx-auto w-14 h-14 rounded-3xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center mb-4">
            <CalendarClock size={26} className="text-sky-300" />
          </motion.div>
          <p className="text-[15px] font-black text-white/80">{tr('Nada programado', 'Nothing scheduled')}</p>
          <p className="text-[12px] text-white/35 mt-1.5 leading-relaxed">
            {tr('Ponle hora a tus hábitos y tareas, o activa más cosas en el engranaje.', 'Give your habits and tasks a time, or turn more things on with the gear.')}
          </p>
        </motion.div>
      ) : (
        <div key={listKey} className={config.timeLeft ? '-ml-1' : undefined}>
          {sections.map(section => {
            const meta = sectionMeta(section);
            const SIcon = meta.icon;
            const showHeader = section.kind !== 'ALL';
            const sectionDone = section.items.filter(i => i.done).length;
            return (
              <section key={section.id} className="mb-3">
                {showHeader && (
                  <motion.div
                    className="sticky top-0 z-20 flex items-center gap-2.5 py-2 pl-0.5"
                    style={{ background: 'linear-gradient(180deg, #05050a 70%, rgba(5,5,10,0))' }}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...SPRING, delay: Math.min(runningIndex * 0.04, 0.4) }}
                  >
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${meta.tint}1f`, color: meta.tint }}>
                      <SIcon size={14} />
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] tabular-nums" style={{ color: meta.tint }}>{meta.label}</span>
                    <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${meta.tint}40, transparent)` }} />
                    <span className="text-[10px] font-black text-white/30 tabular-nums">{sectionDone}/{section.items.length}</span>
                  </motion.div>
                )}
                <div className="relative">
                  {/* Shared rail line for the whole section */}
                  <span className="absolute top-2 bottom-2 w-px bg-gradient-to-b from-white/[0.14] via-white/[0.07] to-white/[0.02]" style={{ left: (config.timeLeft ? TIME_COL : 0) + 7.5 }} />
                  {section.items.map(item => {
                    const i = runningIndex++;
                    return (
                      <React.Fragment key={item.id}>
                        {nowBeforeId === item.id && (
                          <div className="relative flex items-center gap-2 py-1.5" style={{ paddingLeft: (config.timeLeft ? TIME_COL : 0) + 3 }}>
                            <span className="relative flex w-[18px] h-[18px] items-center justify-center">
                              <span className="absolute w-full h-full rounded-full bg-rose-400/40 animate-ping" />
                              <span className="relative w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)]" />
                            </span>
                            <span className="text-[10px] font-black tabular-nums text-rose-300">{fmt(hhmm(now))}</span>
                            <span className="flex-1 h-px bg-gradient-to-r from-rose-400/60 to-transparent" />
                          </div>
                        )}
                        <RoutineCard
                          item={item}
                          Icon={iconFor(item)}
                          index={i}
                          exactTime={config.exactTime}
                          timeLeft={config.timeLeft}
                          use24h={config.use24h}
                          isNext={next?.id === item.id && isToday}
                          burst={burstId === item.id}
                          reduce={reduce}
                          es={es}
                          onToggle={toggleItem}
                          onOpen={openItem}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <RoutineConfigSheet
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        config={config}
        onChange={updateConfig}
        journalTimes={journalTimes}
        onEditJournalTimes={() => setJournalModalOpen(true)}
        es={es}
      />

      <JournalRemindersModal
        isOpen={journalModalOpen}
        initialTimes={journalTimes}
        onSave={onSaveJournalTimes}
        onSkip={() => setJournalModalOpen(false)}
      />

      {quantityHabit && onUpdateHabit && (
        <QuantityUpdateModal
          habit={quantityHabit}
          isOpen={!!quantityHabit}
          onClose={() => setQuantityHabit(null)}
          onUpdate={onUpdateHabit}
          currentDate={date}
        />
      )}
    </div>
  );
};

export default RoutineView;
