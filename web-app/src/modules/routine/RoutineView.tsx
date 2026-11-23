import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, CalendarClock, Check, CheckSquare, ChevronLeft, ChevronRight, Flame, Moon, PenLine,
  Play, Plus, Settings2, Sparkles, Sun, Sunset, Target, X,
} from 'lucide-react';
import type { Attribute, Habit, Project, Quest } from '../../types';
import { JournalRemindersModal } from '../notes/components/JournalRemindersModal';
import { getJournalReminders, saveJournalReminders } from '../../services/journalReminders';
import { notificationService } from '../../services/notificationService';
import { QuantityUpdateModal } from '../dashboard/components/QuantityUpdateModal';
import { addDays, formatClock, getHistoryDateKey, toLocalISOString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import {
  buildRoutineItems, countByPart, dayPartOf, loadRoutineConfig, saveRoutineConfig, sectionize,
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

const PART_META: Record<DayPart | 'OVERDUE' | 'ANYTIME', { es: string; en: string; icon: React.ElementType; tint: string }> = {
  OVERDUE: { es: 'Atrasadas', en: 'Overdue', icon: CalendarClock, tint: 'text-rose-300' },
  MORNING: { es: 'Mañana', en: 'Morning', icon: Sun, tint: 'text-amber-300' },
  AFTERNOON: { es: 'Tarde', en: 'Afternoon', icon: Sunset, tint: 'text-orange-300' },
  NIGHT: { es: 'Noche', en: 'Night', icon: Moon, tint: 'text-indigo-300' },
  ANYTIME: { es: 'Sin hora', en: 'Anytime', icon: Sparkles, tint: 'text-white/50' },
};

const KIND_ICON: Record<RoutineItem['kind'], React.ElementType> = {
  HABIT: Flame, SUBHABIT: Flame, TASK: CheckSquare, PROJECT: Target, JOURNAL: BookOpen,
};

const Toggle: React.FC<{ on: boolean; label: string; hint?: string; onChange: (v: boolean) => void }> = ({ on, label, hint, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!on)}
    className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 text-left active:scale-[0.99] transition-transform"
  >
    <span className="min-w-0">
      <span className="block text-[13px] font-bold text-white">{label}</span>
      {hint && <span className="block text-[11px] text-white/40 font-medium leading-snug">{hint}</span>}
    </span>
    <span className={cn('w-10 h-6 rounded-full relative shrink-0 transition-colors border border-white/10', on ? 'bg-emerald-500' : 'bg-white/10')}>
      <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </span>
  </button>
);

export const RoutineView: React.FC<RoutineViewProps> = ({
  userId, habits, quests, projects, attributes, isActive = true, journalEntries = [],
  onCompleteHabit, onUpdateHabit, onEditHabit, onCompleteQuest, onEditQuest, onAddQuest, onAddHabit, onFocusProject, onOpenJournal,
}) => {
  const { i18n } = useTranslation();
  const es = !!i18n.language?.startsWith('es');
  const tr = (a: string, b: string) => (es ? a : b);

  const [config, setConfig] = useState<RoutineConfig>(() => loadRoutineConfig(userId));
  const [date, setDate] = useState(() => new Date());
  const [filter, setFilter] = useState<DayPartFilter>('ALL');
  const [now, setNow] = useState(() => new Date());
  const [configOpen, setConfigOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [quantityHabit, setQuantityHabit] = useState<Habit | null>(null);
  const [journalTimes, setJournalTimes] = useState<string[]>(() => getJournalReminders(userId).times);
  const [journalModalOpen, setJournalModalOpen] = useState(false);

  useEffect(() => { setConfig(loadRoutineConfig(userId)); setJournalTimes(getJournalReminders(userId).times); }, [userId]);

  // Keep "now" fresh (marker + overdue split) and snap back to today when the day rolls over.
  useEffect(() => {
    if (!isActive) return;
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
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
    return (id: string) => map.get(id) || '#6366f1';
  }, [attributes]);

  const journalDone = useMemo(
    () => (journalEntries || []).some(e => e.date && getHistoryDateKey(e.date) === dayKey && (e.blocks?.length ?? 0) > 0),
    [journalEntries, dayKey],
  );

  const allItems = useMemo(() => buildRoutineItems({
    date, habits, quests, projects, journalTimes, journalDone, config,
    colorForAttribute: attrColor,
    labels: {
      journal: tr('Escribir en el journal', 'Write in your journal'),
      journalSub: tr('Recordatorio', 'Reminder'),
      overdue: tr('Atrasada', 'Overdue'),
      project: tr('Sesión de enfoque', 'Focus session'),
    },
  // `now` is intentionally not a dependency: items only change with data, not the clock.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [date, habits, quests, projects, journalTimes, journalDone, config, attrColor, es]);

  const counts = useMemo(() => countByPart(allItems), [allItems]);
  const visible = useMemo(
    () => (filter === 'ALL' ? allItems : allItems.filter(it => it.minutes !== null && !it.overdue && dayPartOf(it.minutes) === filter)),
    [allItems, filter],
  );
  const sections: RoutineSection[] = useMemo(
    () => (filter === 'ALL' && config.groupByPart ? sectionize(visible) : [{ part: 'ANYTIME' as const, items: visible }]),
    [visible, filter, config.groupByPart],
  );

  const doneCount = allItems.filter(i => i.done).length;
  const pct = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dateLabel = useMemo(() => {
    const diff = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
    if (diff === 0) return tr('Hoy', 'Today');
    if (diff === -1) return tr('Ayer', 'Yesterday');
    if (diff === 1) return tr('Mañana', 'Tomorrow');
    return date.toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, now, es]);
  const fullDate = date.toLocaleDateString(es ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  const fmt = (t: string) => formatClock(t, !config.use24h);

  const toggleItem = (e: React.MouseEvent, item: RoutineItem) => {
    e.stopPropagation();
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
  };

  const openItem = (item: RoutineItem) => {
    if (item.kind === 'TASK' && item.quest) onEditQuest?.(item.quest);
    else if ((item.kind === 'HABIT' || item.kind === 'SUBHABIT') && item.habit) {
      onEditHabit?.({ ...item.habit, _initialTab: item.kind === 'SUBHABIT' ? 'checklist' : 'alarm', _targetSubtaskId: item.subtaskId });
    } else if (item.kind === 'PROJECT' && item.project) onFocusProject?.(item.project.id);
    else if (item.kind === 'JOURNAL') onOpenJournal?.(dayKey);
  };

  const renderItem = (item: RoutineItem) => {
    const Icon = KIND_ICON[item.kind];
    const ActionIcon = item.kind === 'PROJECT' ? Play : item.kind === 'JOURNAL' ? PenLine : Check;
    return (
      <div key={item.id} className="flex items-stretch gap-3">
        <div className="w-[58px] shrink-0 pt-3.5 text-right">
          {item.time ? (
            <span className={cn('text-[11px] font-black tabular-nums tracking-tight', item.done ? 'text-white/25' : 'text-white/70')}>{fmt(item.time)}</span>
          ) : (
            <span className="text-[10px] font-bold text-white/20">—</span>
          )}
        </div>
        <div className="relative flex flex-col items-center shrink-0 w-3">
          <span className="w-px flex-1 bg-white/[0.07]" />
          <span className="absolute top-[18px] w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: item.color, backgroundColor: item.done ? item.color : '#08080c' }} />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => openItem(item)}
          onKeyDown={e => { if (e.key === 'Enter') openItem(item); }}
          className={cn(
            'flex-1 min-w-0 my-1 flex items-center gap-3 rounded-2xl border px-3 py-2.5 relative overflow-hidden cursor-pointer transition-colors active:scale-[0.99]',
            item.done ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-[#07070a]/90 hover:bg-[#0b0b10]',
          )}
          style={{ borderColor: item.done ? undefined : `${item.color}40` }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: item.color, opacity: item.done ? 0.03 : 0.09 }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/5 relative z-10" style={{ backgroundColor: `${item.color}1f` }}>
            <Icon size={17} style={{ color: item.color }} />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <p className={cn('text-[14px] font-semibold truncate', item.done ? 'text-white/30 line-through' : 'text-white/85')}>{item.title}</p>
            {item.subtitle && (
              <p className={cn('text-[10px] font-bold uppercase tracking-wider truncate mt-0.5', item.overdue ? 'text-rose-300/80' : 'text-white/30')}>{item.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={e => toggleItem(e, item)}
            aria-label={item.done ? tr('Hecho', 'Done') : tr('Marcar', 'Mark')}
            className={cn('w-[38px] h-[38px] rounded-full border flex items-center justify-center shrink-0 relative z-10 transition-all active:scale-90', item.done ? 'text-white border-transparent' : 'bg-black/30 text-white/40')}
            style={{ backgroundColor: item.done ? item.color : undefined, borderColor: item.done ? item.color : `${item.color}78` }}
          >
            {(item.done || item.kind === 'PROJECT' || item.kind === 'JOURNAL') && <ActionIcon size={item.kind === 'PROJECT' ? 15 : 17} strokeWidth={item.kind === 'PROJECT' ? 2.5 : 3} />}
          </button>
        </div>
      </div>
    );
  };

  // The "now" line sits before the first timed item that is still ahead of the clock.
  const nowLineBefore = isToday && filter === 'ALL'
    ? allItems.find(it => !it.overdue && it.minutes !== null && it.minutes > nowMinutes)?.id ?? null
    : null;
  const nowLine = (
    <div key="now-line" className="flex items-center gap-3 pl-[70px] py-1">
      <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
      <span className="text-[10px] font-black tabular-nums text-rose-300">{fmt(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)}</span>
      <span className="flex-1 h-px bg-gradient-to-r from-rose-400/60 to-transparent" />
    </div>
  );

  const filters: { id: DayPartFilter; label: string; icon: React.ElementType }[] = [
    { id: 'ALL', label: tr('Todo', 'All'), icon: CalendarClock },
    { id: 'MORNING', label: tr('Mañana', 'Morning'), icon: Sun },
    { id: 'AFTERNOON', label: tr('Tarde', 'Afternoon'), icon: Sunset },
    { id: 'NIGHT', label: tr('Noche', 'Night'), icon: Moon },
  ];

  const onSaveJournalTimes = (times: string[]) => {
    if (userId) {
      const saved = saveJournalReminders(userId, { times, prompted: true });
      notificationService.scheduleJournalReminders(saved.times);
    }
    setJournalModalOpen(false);
  };

  const totalShown = sections.reduce((a, s) => a + s.items.length, 0);

  return (
    <div className="pb-32 pt-2 h-full overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
            <CalendarClock size={20} className="text-sky-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">{tr('Rutina', 'Routine')}</h1>
            <p className="text-[11px] font-medium text-white/40 first-letter:uppercase truncate mt-1">{fullDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 relative">
          <button type="button" onClick={() => setAddOpen(v => !v)} aria-label={tr('Añadir', 'Add')} className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center active:scale-95">
            <Plus size={17} strokeWidth={3} />
          </button>
          <button type="button" onClick={() => setConfigOpen(true)} aria-label={tr('Personalizar', 'Customize')} className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/60 active:scale-95">
            <Settings2 size={16} />
          </button>
          <AnimatePresence>
            {addOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-[#14141c] border border-white/10 shadow-2xl p-1.5"
                >
                  <button type="button" onClick={() => { setAddOpen(false); onAddQuest?.(); }} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white hover:bg-white/5">
                    <CheckSquare size={15} className="text-cyan-300" /> {tr('Nueva tarea', 'New task')}
                  </button>
                  <button type="button" onClick={e => { setAddOpen(false); onAddHabit?.(e); }} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white hover:bg-white/5">
                    <Flame size={15} className="text-orange-300" /> {tr('Nuevo hábito', 'New habit')}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Day navigation + progress */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/[0.07] p-3.5 mb-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setDate(d => addDays(d, -1))} aria-label={tr('Día anterior', 'Previous day')} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 active:scale-90"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => setDate(new Date())} className="text-center px-3">
            <span className="block text-base font-black text-white capitalize">{dateLabel}</span>
            {!isToday && <span className="block text-[10px] font-bold text-sky-300 uppercase tracking-wider">{tr('Volver a hoy', 'Back to today')}</span>}
          </button>
          <button type="button" onClick={() => setDate(d => addDays(d, 1))} aria-label={tr('Día siguiente', 'Next day')} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 active:scale-90"><ChevronRight size={17} /></button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-black text-white/70 tabular-nums">{doneCount}/{allItems.length}</span>
        </div>
      </div>

      {/* Mañana / Tarde / Noche */}
      <div className="flex gap-1.5 mb-5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
        {filters.map(f => {
          const active = filter === f.id;
          const FIcon = f.icon;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-black transition-all', active ? 'bg-white text-black' : 'text-white/45 hover:text-white/75')}
            >
              <FIcon size={13} />
              <span>{f.label}</span>
              <span className={cn('text-[9px] tabular-nums', active ? 'text-black/50' : 'text-white/25')}>{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {totalShown === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center">
          <CalendarClock size={28} className="mx-auto text-white/20 mb-3" />
          <p className="text-sm font-bold text-white/60">{tr('Nada programado', 'Nothing scheduled')}</p>
          <p className="text-[12px] text-white/35 mt-1 leading-snug">
            {tr('Ponle hora a tus hábitos y tareas, o activa más cosas en el engranaje.', 'Give your habits and tasks a time, or turn more things on with the gear.')}
          </p>
        </div>
      ) : (
        <div>
          {sections.map(section => {
            const meta = PART_META[section.part];
            const SIcon = meta.icon;
            const showHeader = filter === 'ALL' && config.groupByPart;
            return (
              <div key={section.part} className="mb-2">
                {showHeader && (
                  <div className="flex items-center gap-2 pl-[70px] pt-3 pb-1.5">
                    <SIcon size={13} className={meta.tint} />
                    <span className={cn('text-[10px] font-black uppercase tracking-[0.18em]', meta.tint)}>{es ? meta.es : meta.en}</span>
                    <span className="text-[10px] font-bold text-white/20 tabular-nums">{section.items.length}</span>
                  </div>
                )}
                {section.items.map(item => (
                  <React.Fragment key={item.id}>
                    {nowLineBefore === item.id && nowLine}
                    {renderItem(item)}
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Customize sheet */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {configOpen && (
            <motion.div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfigOpen(false)}>
              <motion.div
                className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#0b0b10] border border-white/10 p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]"
                initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">{tr('Personalizar rutina', 'Customize routine')}</h2>
                    <p className="text-[11px] text-white/40 font-medium">{tr('Elige qué aparece en tu línea del día', 'Choose what shows on your day line')}</p>
                  </div>
                  <button type="button" onClick={() => setConfigOpen(false)} aria-label="Close" className="w-8 h-8 rounded-xl bg-white/5 text-white/50 flex items-center justify-center"><X size={15} /></button>
                </div>
                <div className="space-y-2">
                  <Toggle on={config.showHabits} label={tr('Hábitos', 'Habits')} hint={tr('Con su hora de alarma y subtareas', 'With their alarm time and subtasks')} onChange={v => updateConfig({ showHabits: v })} />
                  <Toggle on={config.showTasks} label={tr('Tareas', 'Tasks')} hint={tr('Con hora límite si la tienen', 'With a due time when they have one')} onChange={v => updateConfig({ showTasks: v })} />
                  <Toggle on={config.showProjects} label={tr('Proyectos', 'Projects')} hint={tr('Los que tienen un aviso programado', 'Those with a scheduled reminder')} onChange={v => updateConfig({ showProjects: v })} />
                  <Toggle on={config.showJournal} label={tr('Journaling', 'Journaling')} hint={tr('Tus horarios de recordatorio', 'Your reminder times')} onChange={v => updateConfig({ showJournal: v })} />
                  <button type="button" onClick={() => setJournalModalOpen(true)} className="w-full flex items-center justify-between rounded-2xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 text-left active:scale-[0.99]">
                    <span className="text-[13px] font-bold text-indigo-200">{tr('Horarios de journaling', 'Journaling times')}</span>
                    <span className="text-[11px] font-black text-indigo-300 tabular-nums">{journalTimes.join(' · ') || tr('Configurar', 'Set up')}</span>
                  </button>
                  <div className="h-px bg-white/[0.06] my-3" />
                  <Toggle on={config.groupByPart} label={tr('Separar mañana / tarde / noche', 'Split morning / afternoon / night')} hint={tr('Sigue siendo cronológico', 'Still chronological')} onChange={v => updateConfig({ groupByPart: v })} />
                  <Toggle on={config.showCompleted} label={tr('Mostrar completados', 'Show completed')} onChange={v => updateConfig({ showCompleted: v })} />
                  <Toggle on={config.showUntimed} label={tr('Mostrar elementos sin hora', 'Show items without a time')} onChange={v => updateConfig({ showUntimed: v })} />
                  <Toggle on={config.showOverdue} label={tr('Mostrar tareas atrasadas', 'Show overdue tasks')} onChange={v => updateConfig({ showOverdue: v })} />
                  <Toggle on={config.use24h} label={tr('Reloj de 24 horas', '24-hour clock')} onChange={v => updateConfig({ use24h: v })} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

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
