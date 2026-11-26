import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, Check, CheckSquare, ChevronDown, Clock, Flame, Minus, Plus, RotateCcw, SkipForward, X } from 'lucide-react';
import { formatClock } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { clampDuration, type RoutineItem } from './routineEngine';
import { minutesToTime, snapMinutes } from './calendarLayout';
import { needsScope, type EditRequest, type EditScope } from './routineEdits';

// ─────────────────────────────────────────────────────────────────────────────
// Bottom sheet of one calendar block: complete it, change its hour / length / day, and — for habits —
// choose whether the change is for every day, for this one day only, or (sub-habits) for the whole habit.
// ─────────────────────────────────────────────────────────────────────────────

export interface EventDraft {
  start: number;
  duration: number;
  dayKey: string;
}

interface Props {
  item: RoutineItem;
  /** The day the block lives on (date key) and a printable version of it. */
  dayKey: string;
  dayLabel: string;
  initial: EventDraft;
  /** The sheet opened because the block was dragged / resized: the question is how to apply the change. */
  confirmMode: boolean;
  /** Colour of the block under the current colour mode (own / trait / importance). */
  color: string;
  use24h: boolean;
  es: boolean;
  onClose: () => void;
  onSave: (req: EditRequest) => void;
  onReset: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onLocate: () => void;
  onPostpone: (days: number) => void;
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

const durationText = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

export const RoutineEventSheet: React.FC<Props> = ({
  item, dayKey, dayLabel, initial, confirmMode, color, use24h, es, onClose, onSave, onReset, onToggle, onLocate, onPostpone,
}) => {
  const tr = (a: string, b: string) => (es ? a : b);
  const [start, setStart] = useState(initial.start);
  const [duration, setDuration] = useState(initial.duration);
  const [taskDay, setTaskDay] = useState(initial.dayKey);
  const [scope, setScope] = useState<EditScope>('DAY');
  // Everything starts minimised; a drag / resize opens the parts that need an answer.
  const [timeOpen, setTimeOpen] = useState(confirmMode);
  const [scopeOpen, setScopeOpen] = useState(confirmMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isTask = item.kind === 'TASK';
  const isSub = item.kind === 'SUBHABIT';
  const isSlot = !!item.slotId;
  const scoped = needsScope(item);
  const c = color;
  const end = Math.min(24 * 60, start + duration);
  const changed = start !== (item.minutes ?? start) || duration !== item.durationMin || (isTask && taskDay !== dayKey);
  const fmt = (m: number) => formatClock(minutesToTime(m % (24 * 60)), !use24h);
  const baseText = item.baseTime ? formatClock(item.baseTime, !use24h) : tr('sin hora', 'no time');

  const scopes = useMemo((): { id: EditScope; title: string; hint: string }[] => {
    const habitTitle = item.habit?.title ?? '';
    if (isSub) {
      return [
        { id: 'DAY', title: tr('Solo esta subtarea, solo hoy', 'This sub-habit, this day only'), hint: tr(`El ${dayLabel}. Los demás días sigue a las ${baseText}.`, `On ${dayLabel}. Other days stay at ${baseText}.`) },
        { id: 'ALWAYS', title: tr('Esta subtarea, siempre', 'This sub-habit, always'), hint: tr('Cambia el horario de la subtarea para todos sus días.', "Changes the sub-habit's time for all its days.") },
        { id: 'HABIT', title: tr(`Todo el hábito «${habitTitle}»`, `The whole habit “${habitTitle}”`), hint: tr('Mueve el horario del hábito; las subtareas sin hora propia lo siguen.', 'Moves the habit time; sub-habits without their own time follow it.') },
      ];
    }
    const what = isSlot ? tr('esta toma', 'this dose') : tr('el hábito', 'the habit');
    const whatOf = isSlot ? tr('de esta toma', 'of this dose') : tr('del hábito', 'of the habit');
    return [
      { id: 'DAY', title: tr('Solo este día', 'This day only'), hint: tr(`El ${dayLabel}. Los demás días ${what} sigue a las ${baseText}.`, `On ${dayLabel}. Other days ${what} stays at ${baseText}.`) },
      { id: 'ALWAYS', title: tr('Todos los días', 'Every day'), hint: tr(`Cambia el horario ${whatOf} para siempre (y su recordatorio).`, `Changes the time ${whatOf} for good (and its reminder).`) },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSub, isSlot, dayLabel, baseText, item.habit?.title, es]);

  const save = () => onSave({ item, dayKey, startMin: start, duration, scope: scoped ? scope : 'ALWAYS', newDayKey: isTask ? taskDay : undefined });

  const KindIcon = isTask ? CheckSquare : Flame;
  const kindLabel = isTask ? tr('Tarea', 'Task') : isSub ? tr('Subtarea de hábito', 'Habit sub-task') : tr('Hábito', 'Habit');

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end justify-center" role="dialog" aria-modal="true">
      <motion.div className="absolute inset-0 bg-black/65" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="relative w-full max-w-[520px] max-h-[90dvh] overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#0e0e15] pb-[max(20px,env(safe-area-inset-bottom))]"
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="sticky top-0 z-10 bg-[#0e0e15]/95 backdrop-blur pt-2.5 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-4 flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${c}2e`, color: c }}><KindIcon size={20} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: c }}>{kindLabel}{item.subtitle && isSub ? ` · ${item.subtitle}` : ''}</p>
            <p className={cn('text-[18px] font-black leading-tight mt-0.5', item.done ? 'text-white/40 line-through' : 'text-white')}>{item.title}</p>
            <p className="text-[11px] font-semibold text-white/40 mt-1 first-letter:uppercase">
              {dayLabel} · {item.time ? `${formatClock(item.time, !use24h)} – ${fmt((item.minutes ?? 0) + item.durationMin)}` : tr('Sin hora', 'No time')}
              {item.overridden && <span className="ml-1.5 text-amber-300">· {tr('movido solo este día', 'moved for this day')}</span>}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr('Cerrar', 'Close')} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 active:scale-90 transition-transform shrink-0"><X size={16} /></button>
        </div>

        {confirmMode && (
          <div className="mx-5 mb-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-3.5 py-2.5 text-[12px] font-semibold text-amber-100/90 leading-snug">
            {scoped
              ? tr('Cambiaste el bloque. Elige cómo aplicarlo:', 'You changed the block. Choose how to apply it:')
              : tr('Confirma el nuevo horario de la tarea:', 'Confirm the new time of the task:')}
          </div>
        )}

        {/* Quick actions */}
        <div className="px-5 grid grid-cols-2 gap-2 mb-4">
          <button type="button" onClick={e => { onToggle(e); onClose(); }} className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-black active:scale-[0.97] transition-transform" style={{ background: item.done ? 'rgba(255,255,255,0.06)' : c, color: item.done ? '#fff' : '#fff' }}>
            <Check size={16} strokeWidth={3} /> {item.done ? tr('Desmarcar', 'Undo done') : tr('Completar', 'Complete')}
          </button>
          <button type="button" onClick={() => { onLocate(); onClose(); }} className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] py-3 text-[13px] font-black text-white/85 active:scale-[0.97] transition-transform">
            <ArrowUpRight size={16} /> {isTask ? tr('Ir a la tarea', 'Open task') : tr('Ir al hábito', 'Open habit')}
          </button>
        </div>

        {/* Time */}
        <div className="px-5 mb-4">
          <button type="button" onClick={() => setTimeOpen(v => !v)} aria-expanded={timeOpen} className="w-full flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-3 text-left active:scale-[0.985] transition-transform">
            <Clock size={14} className="text-white/45" />
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{tr('Cambiar horario', 'Change schedule')}</span>
              <span className="block text-[13px] font-black text-white tabular-nums truncate">{fmt(start)} – {fmt(end)} · {durationText(duration)}</span>
            </span>
            <ChevronDown size={16} className={cn('text-white/40 transition-transform duration-200', timeOpen && 'rotate-180')} />
          </button>
          {timeOpen && <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.06] p-3.5 mt-2">
            <div className="flex items-center gap-3">
              <label className="flex-1 min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">{tr('Empieza', 'Starts')}</span>
                <input
                  type="time" value={minutesToTime(start)} step={300}
                  onChange={e => { const [h, m] = e.target.value.split(':').map(Number); if (!Number.isNaN(h)) setStart(Math.min(24 * 60 - 5, h * 60 + (m || 0))); }}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-2.5 py-2.5 text-[14px] font-black text-white tabular-nums outline-none focus:border-white/30 [color-scheme:dark]"
                />
              </label>
              <div className="pt-4 text-white/25 font-black">→</div>
              <div className="flex-1 min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">{tr('Termina', 'Ends')}</span>
                <div className="rounded-xl bg-black/20 border border-white/[0.06] px-3 py-2.5 text-[16px] font-black text-white/70 tabular-nums">{fmt(end)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3.5 mb-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-white/30">{tr('Duración', 'Length')}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setDuration(d => clampDuration(snapMinutes(d - 5)))} aria-label="-5" className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-white/70 active:scale-90 transition-transform"><Minus size={14} /></button>
                <span className="min-w-[68px] text-center text-[13px] font-black text-white tabular-nums">{durationText(duration)}</span>
                <button type="button" onClick={() => setDuration(d => clampDuration(snapMinutes(d + 5)))} aria-label="+5" className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-white/70 active:scale-90 transition-transform"><Plus size={14} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map(d => (
                <button key={d} type="button" onClick={() => setDuration(d)} className={cn('rounded-full px-3 py-1.5 text-[11px] font-black active:scale-95 transition-all', duration === d ? 'text-black' : 'bg-white/[0.06] text-white/55')} style={duration === d ? { background: c } : undefined}>
                  {durationText(d)}
                </button>
              ))}
            </div>
          </div>}
        </div>

        {/* Task: day */}
        {isTask && (
          <div className="px-5 mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35 mb-2 flex items-center gap-1.5"><CalendarDays size={11} /> {tr('Día', 'Day')}</p>
            <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.06] p-3.5 flex items-center gap-2">
              <input type="date" value={taskDay} onChange={e => e.target.value && setTaskDay(e.target.value)} className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-[14px] font-black text-white outline-none focus:border-white/30 [color-scheme:dark]" />
              <button type="button" onClick={() => onPostpone(1)} className="flex items-center gap-1.5 rounded-xl bg-white/[0.07] px-3 py-2.5 text-[12px] font-black text-white/80 active:scale-95 transition-transform"><SkipForward size={14} /> {tr('Mañana', 'Tomorrow')}</button>
            </div>
          </div>
        )}

        {/* Habit: how to apply */}
        {scoped && (
          <div className="px-5 mb-4">
            <button type="button" onClick={() => setScopeOpen(v => !v)} aria-expanded={scopeOpen} className="w-full flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-3 text-left active:scale-[0.985] transition-transform">
              <span className="flex-1 min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{tr('¿Cómo aplicar el cambio?', 'How to apply the change?')}</span>
                <span className="block text-[13px] font-black text-white truncate">{scopes.find(x => x.id === scope)?.title}</span>
              </span>
              <ChevronDown size={16} className={cn('text-white/40 transition-transform duration-200', scopeOpen && 'rotate-180')} />
            </button>
            {scopeOpen && <div className="flex flex-col gap-2 mt-2">
              {scopes.map(s => {
                const on = scope === s.id;
                return (
                  <button key={s.id} type="button" onClick={() => setScope(s.id)} className="flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left active:scale-[0.985] transition-all" style={{ background: on ? `${c}1f` : 'rgba(255,255,255,0.035)', borderColor: on ? `${c}80` : 'rgba(255,255,255,0.06)' }}>
                    <span className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: on ? c : 'rgba(255,255,255,0.25)' }}>
                      {on && <span className="w-[8px] h-[8px] rounded-full" style={{ background: c }} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-black text-white leading-tight">{s.title}</span>
                      <span className="block text-[11px] font-medium text-white/40 leading-snug mt-0.5">{s.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 flex gap-2">
          {item.overridden && (
            <button type="button" onClick={() => { onReset(); onClose(); }} className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] px-4 py-3.5 text-[12px] font-black text-amber-200 active:scale-95 transition-transform">
              <RotateCcw size={14} /> {tr('Restablecer', 'Reset')}
            </button>
          )}
          <button type="button" onClick={save} disabled={!changed && !confirmMode} className="flex-1 rounded-2xl py-3.5 text-[14px] font-black text-black active:scale-[0.98] transition-all disabled:opacity-30" style={{ background: 'linear-gradient(135deg,#ffffff,#dbeafe)' }}>
            {tr('Guardar cambios', 'Save changes')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default RoutineEventSheet;
