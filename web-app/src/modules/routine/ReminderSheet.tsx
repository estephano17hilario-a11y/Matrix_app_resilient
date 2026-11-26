import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { BellRing, CalendarDays, Clock, Repeat, Trash2, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { makeReminder } from '../../services/journalReminderItems';
import type { JournalReminderItem, ReminderRepeat } from './reminderItems';

// ─────────────────────────────────────────────────────────────────────────────
// Sheet to create / edit a reminder pinned on the Journal calendar. Used by the Journal calendar and by the
// Routine calendar, so a reminder is the same thing everywhere.
// ─────────────────────────────────────────────────────────────────────────────

const SWATCHES = ['#818cf8', '#38bdf8', '#34d399', '#fbbf24', '#fb923c', '#fb7185', '#c084fc', '#f472b6'];

interface Props {
  /** Editing this reminder, or creating a new one when absent. */
  reminder?: JournalReminderItem | null;
  /** Day the new reminder starts on ("YYYY-MM-DD"). */
  defaultDate: string;
  defaultTime?: string | null;
  es: boolean;
  onSave: (r: JournalReminderItem) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const ReminderSheet: React.FC<Props> = ({ reminder, defaultDate, defaultTime = null, es, onSave, onDelete, onClose }) => {
  const tr = (a: string, b: string) => (es ? a : b);
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [date, setDate] = useState(reminder?.date ?? defaultDate);
  const [hasTime, setHasTime] = useState(reminder ? !!reminder.time : !!defaultTime);
  const [time, setTime] = useState(reminder?.time || defaultTime || '09:00');
  const [repeat, setRepeat] = useState<ReminderRepeat>(reminder?.repeat ?? 'NONE');
  const [color, setColor] = useState(reminder?.color ?? SWATCHES[0]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const repeats: { id: ReminderRepeat; label: string }[] = [
    { id: 'NONE', label: tr('Una vez', 'Once') }, { id: 'DAILY', label: tr('Cada día', 'Daily') }, { id: 'WEEKLY', label: tr('Cada semana', 'Weekly') },
    { id: 'MONTHLY', label: tr('Cada mes', 'Monthly') }, { id: 'YEARLY', label: tr('Cada año', 'Yearly') },
  ];

  const valid = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const save = () => {
    if (!valid) return;
    const base = reminder ?? makeReminder({ title, date, repeat });
    onSave({ ...base, title: title.trim(), date, time: hasTime ? time : null, repeat, color });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[2100] flex items-end justify-center" role="dialog" aria-modal="true">
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="relative w-full max-w-[520px] rounded-t-[30px] border border-white/10 bg-[#0e0e17]/95 backdrop-blur-2xl px-5 pt-3 pb-[max(22px,env(safe-area-inset-bottom))]"
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-white/15 mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${color}2e`, color }}><BellRing size={18} /></span>
          <p className="flex-1 text-[17px] font-black text-white">{reminder ? tr('Editar recordatorio', 'Edit reminder') : tr('Nuevo recordatorio', 'New reminder')}</p>
          <button type="button" onClick={onClose} aria-label={tr('Cerrar', 'Close')} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 active:scale-90 transition-transform"><X size={16} /></button>
        </div>

        <input
          autoFocus value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
          placeholder={tr('¿Qué quieres recordar?', 'What do you want to remember?')}
          className="w-full rounded-2xl bg-white/[0.05] border border-white/10 px-4 py-3.5 text-[16px] font-bold text-white placeholder:text-white/25 outline-none focus:border-white/30"
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
        />

        <div className="grid grid-cols-2 gap-2 mt-3">
          <label className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-white/35 mb-1"><CalendarDays size={11} /> {tr('Día', 'Day')}</span>
            <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="w-full bg-transparent text-[14px] font-black text-white outline-none [color-scheme:dark]" />
          </label>
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
            <button type="button" onClick={() => setHasTime(v => !v)} className="flex w-full items-center justify-between text-[9px] font-black uppercase tracking-wider text-white/35 mb-1">
              <span className="flex items-center gap-1.5"><Clock size={11} /> {tr('Hora', 'Time')}</span>
              <span className={cn('w-8 h-[18px] rounded-full relative transition-colors', hasTime ? 'bg-emerald-500' : 'bg-white/10')}><span className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform" style={{ transform: `translateX(${hasTime ? 14 : 0}px)` }} /></span>
            </button>
            {hasTime ? <input type="time" value={time} onChange={e => e.target.value && setTime(e.target.value)} className="w-full bg-transparent text-[14px] font-black text-white outline-none [color-scheme:dark]" /> : <p className="text-[14px] font-black text-white/30">{tr('Todo el día', 'All day')}</p>}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-white/35 mt-4 mb-2"><Repeat size={11} /> {tr('Repetir', 'Repeat')}</p>
        <div className="flex flex-wrap gap-1.5">
          {repeats.map(r => (
            <button key={r.id} type="button" onClick={() => setRepeat(r.id)} className={cn('rounded-full px-3.5 py-2 text-[12px] font-black active:scale-95 transition-all', repeat === r.id ? 'text-black' : 'bg-white/[0.06] text-white/55')} style={repeat === r.id ? { background: color } : undefined}>{r.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          {SWATCHES.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className="w-7 h-7 rounded-full active:scale-90 transition-transform" style={{ background: c, boxShadow: color === c ? `0 0 0 2px #0e0e17, 0 0 0 4px ${c}` : 'none' }} />
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          {reminder && onDelete && (
            <button type="button" onClick={() => { onDelete(reminder.id); onClose(); }} className="flex items-center gap-1.5 rounded-2xl bg-rose-500/15 px-4 py-3.5 text-[13px] font-black text-rose-300 active:scale-95 transition-transform"><Trash2 size={15} /> {tr('Borrar', 'Delete')}</button>
          )}
          <button type="button" onClick={save} disabled={!valid} className="flex-1 rounded-2xl py-3.5 text-[14px] font-black text-black active:scale-[0.98] transition-all disabled:opacity-30" style={{ background: 'linear-gradient(135deg,#ffffff,#dbeafe)' }}>{tr('Guardar', 'Save')}</button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default ReminderSheet;
