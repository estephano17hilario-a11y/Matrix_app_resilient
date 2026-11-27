import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlignLeft, BellRing, CalendarClock, CalendarDays, Check, ChevronLeft, ChevronRight, ChevronUp, Flame, Lock, PenLine, Plus, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { toLocalISOString } from '../../../utils/dateUtils';
import { useReminderItems } from '../../routine/useReminderItems';
import { ReminderSheet } from '../../routine/ReminderSheet';
import { remindersOn } from '../../../services/journalReminderItems';
import { formatClock } from '../../../utils/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Journal calendar — the month as an immersive, glass surface. Each day is a little card that shows how you felt,
// how much you wrote and what is pinned on it; tapping a day opens a panel with a preview of the page, its
// reminders (tick them off, add more) and the way into the editor. Swipe to change month. Fullscreen by default
// (the dashboard hides behind a little arrow), like the Routine calendar.
// ─────────────────────────────────────────────────────────────────────────────

export interface JournalDayMeta {
  day: number;
  date: Date;
  dateStr: string;
  entry?: { theme?: string; customEmoji?: string; blocks?: { type: string; content: string }[] } | undefined;
  mood?: { color: string; icon: string; id?: string } | undefined;
  specialEvent?: { type: string; title: string } | undefined;
  dayQuests?: { id?: string; title: string; journalIconColor?: string }[];
  isToday: boolean;
  isFuture: boolean;
  title: string;
}

interface Props {
  userId?: string;
  es: boolean;
  reduce?: boolean;
  /** Fullscreen overlay (true) or flowing inside the page. */
  immersive: boolean;
  /** Only draw the fullscreen overlay while this section is on screen. */
  visible: boolean;
  onToggleImmersive: () => void;
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
  monthMeta: JournalDayMeta[];
  leadingBlanks: number;
  weekdayInitials: string[];
  themeColorMap: Map<string, string>;
  cellOpacity: number;
  showFuture: boolean;
  onShowFuture: (v: boolean) => void;
  streak: number;
  use24h?: boolean;
  onOpenDay: (date: Date) => void;
  onListView: () => void;
  onDailyReminderTimes: () => void;
  /** Which journal view fills the surface: the month grid or the notebook list. */
  view?: 'CALENDAR' | 'LIST';
  onViewChange?: (v: 'CALENDAR' | 'LIST') => void;
  /** Fullscreen only: leave the journal (back to Notes). */
  onExit?: () => void;
  /** The notebook list, drawn in place of the grid when view === 'LIST'. */
  notebook?: React.ReactNode;
}

const plainText = (blocks?: { type: string; content: string }[]) =>
  (blocks || []).filter(b => b.type === 'text').map(b => (b.content || '').replace(/<[^>]*>/g, '')).join(' ').replace(/\s+/g, ' ').trim();

export const JournalCalendar: React.FC<Props> = ({
  userId, es, reduce = false, immersive, visible, onToggleImmersive, currentMonth, onMonthChange, monthMeta, leadingBlanks, weekdayInitials, themeColorMap,
  cellOpacity, showFuture, onShowFuture, streak, use24h = false, onOpenDay, onListView, onDailyReminderTimes,
  view = 'CALENDAR', onViewChange, onExit, notebook,
}) => {
  const tr = (a: string, b: string) => (es ? a : b);
  const locale = es ? 'es-ES' : 'en-US';
  const reminders = useReminderItems(userId);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheet, setSheet] = useState<{ id?: string; date: string } | null>(null);
  const [dir, setDir] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const todayKey = toLocalISOString(new Date());
  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

  const written = useMemo(() => monthMeta.filter(d => !!d.entry && plainText(d.entry.blocks).length > 0).length, [monthMeta]);
  const passed = useMemo(() => monthMeta.filter(d => !d.isFuture).length || 1, [monthMeta]);
  const dominant = useMemo(() => {
    const count = new Map<string, { icon: string; color: string; n: number }>();
    for (const d of monthMeta) if (d.mood) { const c = count.get(d.mood.icon); if (c) c.n += 1; else count.set(d.mood.icon, { icon: d.mood.icon, color: d.mood.color, n: 1 }); }
    return [...count.values()].sort((a, b) => b.n - a.n)[0];
  }, [monthMeta]);

  const glow = dominant?.color || '#38bdf8';
  const pct = Math.round((written / passed) * 100);

  const isList = view === 'LIST' && !!notebook;
  const setView = (v: 'CALENDAR' | 'LIST') => { setSelected(null); setPanelOpen(false); if (onViewChange) onViewChange(v); else if (v === 'LIST') onListView(); };
  const change = (delta: number) => { setDir(delta); setSelected(null); onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1)); };
  const selectedMeta = isList ? null : monthMeta.find(d => d.dateStr === selected) || null;
  const selectedReminders = selectedMeta ? remindersOn(reminders.items, selectedMeta.dateStr) : [];

  const cell = (m: JournalDayMeta) => {
    const themeColor = m.entry?.theme ? themeColorMap.get(m.entry.theme) : undefined;
    const color = themeColor || m.mood?.color || '#94a3b8';
    const text = plainText(m.entry?.blocks);
    const hasEntry = text.length > 0;
    const ink = Math.min(1, text.length / 900);
    const dayReminders = remindersOn(reminders.items, m.dateStr);
    const pending = dayReminders.filter(r => !r.doneDates.includes(m.dateStr));
    const isSel = selected === m.dateStr;
    if (m.isFuture && !showFuture) return <div key={m.day} className="aspect-[4/5]" />;
    return (
      <motion.button
        key={m.day}
        type="button"
        onClick={() => setSelected(cur => (cur === m.dateStr ? null : m.dateStr))}
        onDoubleClick={() => onOpenDay(m.date)}
        whileTap={reduce ? undefined : { scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        data-tour={m.isToday ? 'journal-today-btn' : undefined}
        aria-label={`${m.day}${hasEntry ? ', ' + tr('con entrada', 'with entry') : ''}${pending.length ? ', ' + pending.length + ' ' + tr('recordatorios', 'reminders') : ''}`}
        className="relative aspect-[4/5] rounded-[20px] overflow-hidden flex flex-col items-center justify-center text-left"
        style={{
          opacity: m.isToday || isSel ? 1 : m.isFuture ? 0.4 * cellOpacity + 0.1 : cellOpacity,
          background: hasEntry
            ? `linear-gradient(160deg, ${color}38 0%, ${color}14 60%, rgba(255,255,255,0.03) 100%)`
            : 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
          border: `1px solid ${isSel ? '#ffffff' : m.isToday ? '#38bdf8' : hasEntry ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isSel ? '0 0 0 2px rgba(255,255,255,0.9), 0 14px 30px -12px rgba(0,0,0,0.7)' : m.isToday ? '0 0 22px -4px rgba(56,189,248,0.6)' : hasEntry ? `0 10px 22px -14px ${color}` : 'none',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <span className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent)' }} />
        <span className={cn('absolute top-1.5 left-2 text-[10px] font-black tabular-nums', m.isToday ? 'text-sky-300' : 'text-white/45')}>{m.day}</span>

        {m.entry?.customEmoji ? <span className="text-[26px] drop-shadow-md">{m.entry.customEmoji}</span>
          : m.mood ? <span className="text-[26px] drop-shadow-md">{m.mood.icon}</span>
            : m.isFuture ? <Lock size={13} className="text-white/20" />
              : hasEntry ? <PenLine size={16} className="text-white/55" /> : null}

        {pending.length > 0 && (
          <span className="absolute bottom-3 right-1.5 flex items-center gap-[2px] rounded-full bg-black/40 px-1.5 py-[2px]">
            <BellRing size={8} className="text-indigo-300" /><span className="text-[8.5px] font-black text-white/85 tabular-nums">{pending.length}</span>
          </span>
        )}
        {(m.specialEvent || (m.dayQuests && m.dayQuests.length > 0)) && (
          <span className="absolute bottom-3 left-2 flex items-center gap-[3px]">
            {m.specialEvent && <span className="text-[10px]">{m.specialEvent.type === 'BIRTHDAY' ? '🎂' : m.specialEvent.type === 'ANNIVERSARY' ? '❤️' : '⭐'}</span>}
            {(m.dayQuests || []).slice(0, 3).map((q, i) => <span key={q.id || i} className="w-1.5 h-1.5 rounded-full" style={{ background: q.journalIconColor || '#3b82f6' }} />)}
          </span>
        )}
        {/* Ink: how much was written */}
        <span className="absolute left-2 right-2 bottom-1.5 h-[3px] rounded-full bg-white/10 overflow-hidden">
          <span className="block h-full rounded-full" style={{ width: `${Math.max(hasEntry ? 12 : 0, ink * 100)}%`, background: color }} />
        </span>
      </motion.button>
    );
  };

  const body = (
    <div
      className={cn('flex flex-col min-h-0 overflow-hidden', immersive ? 'fixed inset-0 z-[1000] bg-[#06060d]/95 backdrop-blur-[30px] backdrop-saturate-150' : 'relative rounded-[28px] border border-white/10 bg-[#06060d]/55 backdrop-blur-2xl')}
      style={immersive ? undefined : { minHeight: 520 }}
    >
      <div className="absolute inset-0 pointer-events-none transition-[background] duration-700" aria-hidden style={{ background: `radial-gradient(60% 40% at 12% 0%, ${glow}30, transparent 70%), radial-gradient(55% 38% at 100% 6%, rgba(168,85,247,0.16), transparent 70%), radial-gradient(70% 40% at 50% 100%, rgba(244,114,182,0.08), transparent 70%)` }} />

      {/* Top */}
      <div className={cn('relative shrink-0 px-3 pb-2 border-b border-white/[0.08] bg-white/[0.025]', immersive ? 'pt-[max(6px,env(safe-area-inset-top))]' : 'pt-2')}>
        {immersive ? (
          // Calendar ↔ Notebook switch (big, easy to hit) and the way out of the fullscreen journal.
          <div className="flex items-center gap-2 mb-2.5">
            <div className="relative flex-1 flex p-1 rounded-full bg-white/[0.07] border border-white/[0.1]" role="tablist" aria-label={tr('Vista del diario', 'Journal view')}>
              <span
                className="absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/2)] rounded-full bg-white pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `translateX(${view === 'LIST' ? 100 : 0}%)`, boxShadow: '0 4px 14px -6px rgba(255,255,255,0.6)' }}
              />
              {([['CALENDAR', CalendarDays, tr('Calendario', 'Calendar')], ['LIST', AlignLeft, tr('Cuaderno', 'Notebook')]] as const).map(([id, VIcon, label]) => (
                <button
                  key={id} type="button" role="tab" aria-selected={view === id}
                  onClick={() => view !== id && setView(id)}
                  className="relative z-10 flex-1 h-9 flex items-center justify-center gap-1.5 text-[12.5px] font-black active:scale-95 transition-transform"
                >
                  <VIcon size={15} className={cn('transition-colors duration-200', view === id ? 'text-black' : 'text-white/55')} />
                  <span className={cn('transition-colors duration-200', view === id ? 'text-black' : 'text-white/60')}>{label}</span>
                </button>
              ))}
            </div>
            {onExit && (
              <button type="button" onClick={onExit} aria-label={tr('Salir del diario', 'Exit journal')} className="w-11 h-11 shrink-0 rounded-full bg-white/[0.1] border border-white/[0.14] flex items-center justify-center text-white active:scale-90 transition-transform">
                <X size={19} strokeWidth={2.6} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center -mt-1 mb-1">
            <button type="button" onClick={onToggleImmersive} aria-label={tr('Pantalla completa', 'Full screen')} className="w-14 h-[18px] rounded-b-[10px] rounded-t-sm bg-white/[0.1] border border-white/[0.1] flex items-center justify-center text-white/65 active:scale-90 active:bg-white/20 transition-all">
              <ChevronUp size={14} strokeWidth={2.6} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-[26px] font-black leading-none tracking-tight truncate first-letter:uppercase bg-gradient-to-r from-white via-white to-fuchsia-200 bg-clip-text text-transparent">{currentMonth.toLocaleDateString(locale, { month: 'long' })}</p>
              <p className="text-[12px] font-bold text-white/30 tabular-nums">{currentMonth.getFullYear()}</p>
            </div>
          </div>
          <div className="flex items-center rounded-full bg-white/[0.07] border border-white/[0.1]">
            <button type="button" onClick={() => change(-1)} aria-label={tr('Mes anterior', 'Previous month')} className="w-8 h-8 flex items-center justify-center text-white/75 active:scale-90 transition-transform"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => change(1)} aria-label={tr('Mes siguiente', 'Next month')} className="w-8 h-8 flex items-center justify-center text-white/75 active:scale-90 transition-transform"><ChevronRight size={17} /></button>
          </div>
          <button type="button" onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen} aria-label={tr('Opciones', 'Options')} className={cn('w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition-all', panelOpen ? 'bg-white text-black border-white' : 'bg-white/[0.07] border-white/[0.1] text-white/70')}><SlidersHorizontal size={15} /></button>
        </div>

        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduce ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden' }}>
              <div className="pt-3 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => { const t = new Date(); setDir(t > currentMonth ? 1 : -1); onMonthChange(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(todayKey); }} className="flex-1 h-9 rounded-full bg-sky-400/15 border border-sky-400/30 flex items-center justify-center gap-1.5 text-[11.5px] font-black text-sky-300 active:scale-95 transition-transform"><CalendarClock size={13} /> {tr('Hoy', 'Today')}</button>
                  {!immersive && <button type="button" onClick={() => setView('LIST')} className="flex-1 h-9 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center gap-1.5 text-[11.5px] font-black text-white/75 active:scale-95 transition-transform"><AlignLeft size={14} /> {tr('Cuaderno', 'Notebook')}</button>}
                  <button type="button" onClick={onDailyReminderTimes} className="flex-1 h-9 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center gap-1.5 text-[11.5px] font-black text-white/75 active:scale-95 transition-transform"><BellRing size={13} /> {tr('Avisos', 'Alerts')}</button>
                </div>
                <button type="button" onClick={() => onShowFuture(!showFuture)} className="flex items-center justify-between rounded-2xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 active:scale-[0.985] transition-transform">
                  <span className="text-[12px] font-bold text-white/80">{tr('Mostrar los días que vienen', 'Show upcoming days')}</span>
                  <span className={cn('w-10 h-[22px] rounded-full relative transition-colors', showFuture ? 'bg-emerald-500' : 'bg-white/10')}><span className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: `translateX(${showFuture ? 18 : 0}px)` }} /></span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Month at a glance */}
        <div className="flex items-center gap-3 mt-2.5">
          <div className="relative w-11 h-11 shrink-0">
            <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
              <circle cx="22" cy="22" r="18" fill="none" stroke={glow} strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 18} strokeDashoffset={2 * Math.PI * 18 * (1 - Math.min(1, written / passed))} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white tabular-nums">{pct}%</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white leading-tight">{written} {tr(written === 1 ? 'día escrito' : 'días escritos', written === 1 ? 'day written' : 'days written')}</p>
            <p className="text-[11px] font-semibold text-white/40 mt-0.5 truncate">{tr('de', 'of')} {passed} {tr('que van del mes', 'so far this month')}{dominant ? ` · ${tr('ánimo', 'mood')} ${dominant.icon}` : ''}</p>
          </div>
          {streak > 0 && <span className="flex items-center gap-1 rounded-full bg-orange-400/15 border border-orange-400/25 px-2.5 py-1 text-[11px] font-black text-orange-300"><Flame size={12} fill="currentColor" /> {streak}</span>}
        </div>
      </div>

      {/* Grid */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-3 pb-6"
        style={{ scrollbarWidth: 'none' }}
        onTouchStart={e => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={e => {
          const s = touch.current; touch.current = null;
          if (!s) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s.x; const dy = t.clientY - s.y;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) change(dx < 0 ? 1 : -1);
        }}
      >
        {isList ? notebook : (<>
        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {weekdayInitials.map((d, i) => <span key={i} className="text-[10px] font-black text-white/35">{d}</span>)}
        </div>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={monthKey}
            initial={reduce ? false : { opacity: 0, x: dir * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: dir * -36 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-7 gap-2"
          >
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b${i}`} />)}
            {monthMeta.map(cell)}
          </motion.div>
        </AnimatePresence>
        <p className="text-center text-[10px] font-semibold text-white/25 mt-4">{tr('Toca un día · doble toque para escribir · desliza para cambiar de mes', 'Tap a day · double tap to write · swipe to change month')}</p>
        </>)}
      </div>

      {/* Day panel */}
      <AnimatePresence>
        {selectedMeta && (
          <motion.div
            key={selectedMeta.dateStr}
            initial={reduce ? false : { y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute inset-x-0 bottom-0 z-30 max-h-[62%] overflow-y-auto rounded-t-[30px] border-t border-white/15 bg-[#0e0e17]/90 backdrop-blur-2xl px-5 pt-3 pb-[max(18px,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)]"
          >
            <button type="button" onClick={() => setSelected(null)} aria-label={tr('Cerrar', 'Close')} className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-white/20" />
            <div className="flex items-center gap-3">
              <span className="text-[34px] leading-none">{selectedMeta.entry?.customEmoji || selectedMeta.mood?.icon || '📓'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[18px] font-black text-white leading-tight first-letter:uppercase">{selectedMeta.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p className="text-[11px] font-semibold text-white/40 mt-0.5">{selectedMeta.isFuture ? tr('Aún no llega', 'Not yet') : selectedMeta.isToday ? tr('Hoy', 'Today') : tr('Día pasado', 'Past day')}</p>
              </div>
            </div>

            {plainText(selectedMeta.entry?.blocks) ? (
              <button type="button" onClick={() => onOpenDay(selectedMeta.date)} className="mt-3 w-full text-left rounded-2xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 active:scale-[0.985] transition-transform">
                <p className="text-[15px] font-serif italic text-white/90 line-clamp-1">{selectedMeta.title || tr('Entrada sin título', 'Untitled entry')}</p>
                <p className="text-[12px] text-white/45 leading-snug mt-1 line-clamp-3">{plainText(selectedMeta.entry?.blocks).slice(0, 220)}</p>
              </button>
            ) : (
              <p className="mt-3 text-[13px] font-serif italic text-white/30">{tr('Página en blanco…', 'Blank page…')}</p>
            )}

            {(selectedMeta.specialEvent || (selectedMeta.dayQuests && selectedMeta.dayQuests.length > 0)) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedMeta.specialEvent && <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-[11px] font-bold text-amber-200">{selectedMeta.specialEvent.type === 'BIRTHDAY' ? '🎂' : '⭐'} {selectedMeta.specialEvent.title}</span>}
                {(selectedMeta.dayQuests || []).map((q, i) => <span key={q.id || i} className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white/80" style={{ background: `${q.journalIconColor || '#3b82f6'}26` }}>{q.title}</span>)}
              </div>
            )}

            {/* Reminders pinned on this day */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/35"><BellRing size={11} /> {tr('Recordatorios', 'Reminders')}</p>
                <button type="button" onClick={() => setSheet({ date: selectedMeta.dateStr })} className="flex items-center gap-1 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-black text-white active:scale-95 transition-transform"><Plus size={12} strokeWidth={3} /> {tr('Añadir', 'Add')}</button>
              </div>
              {selectedReminders.length === 0 ? (
                <p className="text-[12px] text-white/30">{tr('Nada pendiente este día. Añade uno y también saldrá en tu calendario de Rutina.', 'Nothing pinned. Add one and it also shows in your Routine calendar.')}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {selectedReminders.map(r => {
                    const done = r.doneDates.includes(selectedMeta.dateStr);
                    const c = r.color || '#818cf8';
                    return (
                      <div key={r.id} className="flex items-center gap-2.5 rounded-2xl border px-3 py-2.5" style={{ background: `${c}14`, borderColor: `${c}40` }}>
                        <button type="button" onClick={() => reminders.toggleDone(r.id, selectedMeta.dateStr)} aria-label={tr('Marcar', 'Mark')} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform" style={{ background: done ? c : 'transparent', border: `2px solid ${done ? c : `${c}99`}` }}>{done && <Check size={12} strokeWidth={4} className="text-white" />}</button>
                        <button type="button" onClick={() => setSheet({ id: r.id, date: selectedMeta.dateStr })} className="flex-1 min-w-0 text-left">
                          <p className={cn('text-[13px] font-bold truncate', done ? 'text-white/35 line-through' : 'text-white')}>{r.title}</p>
                          <p className="text-[10.5px] font-semibold text-white/40 tabular-nums">{r.time ? formatClock(r.time, !use24h) : tr('Todo el día', 'All day')}{r.repeat !== 'NONE' ? ` · ${{ DAILY: tr('cada día', 'daily'), WEEKLY: tr('cada semana', 'weekly'), MONTHLY: tr('cada mes', 'monthly'), YEARLY: tr('cada año', 'yearly'), NONE: '' }[r.repeat]}` : ''}</p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="button" onClick={() => onOpenDay(selectedMeta.date)} className="mt-5 w-full rounded-2xl py-3.5 text-[14px] font-black text-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: 'linear-gradient(135deg,#ffffff,#fbcfe8)' }}>
              {selectedMeta.isFuture ? <Sparkles size={15} /> : <PenLine size={15} />} {selectedMeta.entry ? tr('Abrir mi página', 'Open my page') : selectedMeta.isFuture ? tr('Ver el día', 'View the day') : tr('Escribir', 'Write')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {sheet && (
        <ReminderSheet
          key={sheet.id ?? 'new'}
          reminder={sheet.id ? reminders.items.find(r => r.id === sheet.id) ?? null : null}
          defaultDate={sheet.date}
          es={es}
          onSave={reminders.upsert}
          onDelete={reminders.remove}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );

  if (!immersive) return body;
  return visible ? createPortal(body, document.body) : null;
};

export default JournalCalendar;
