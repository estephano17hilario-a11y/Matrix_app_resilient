import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, ArrowUpRight, BellRing, CalendarClock, Check, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flame, ListTodo, Moon,
  Palette, Pencil, Plus, Settings2, SlidersHorizontal, Sparkles, Sun, Sunset, Undo2,
} from 'lucide-react';
import type { Quest } from '../../types';
import { addDays, formatClock, startOfWeek, toLocalISOString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { buildCalendarLayout, minutesToTime, snapMinutes, type CalendarEvent } from './calendarLayout';
import { buildEditPatch, buildPostponePatch, buildResetPatch, isEditable, type EditPatch, type EditRequest } from './routineEdits';
import { RoutineEventSheet, type EventDraft } from './RoutineEventSheet';
import {
  clampDuration, colorForMode, formatHourRange, hideCompleted, IMPORTANCE_COLORS, IMPORTANCE_LABELS, MIN_DURATION,
  type CalendarColorMode, type DayPart, type RoutineConfig, type RoutineItem,
} from './routineEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Calendar view of the Routine: a glass, blurred, Google-Calendar-style time scale where every block is as tall
// as it lasts (day / 3 days / week). Everything starts minimised and unfolds on demand: the toolbar, the strip of
// items without an hour, and each block (a tap unfolds a card with its info; "Editar" opens the full sheet).
// Hold + drag moves a block, its bottom edge resizes it. Layout lives in calendarLayout.ts, data changes in
// routineEdits.ts; this file draws and handles the gestures.
// ─────────────────────────────────────────────────────────────────────────────

const PART_STYLE: Record<DayPart, { es: string; en: string; icon: React.ElementType; tint: string }> = {
  MORNING: { es: 'Mañana', en: 'Morning', icon: Sun, tint: '#fbbf24' },
  AFTERNOON: { es: 'Tarde', en: 'Afternoon', icon: Sunset, tint: '#fb923c' },
  NIGHT: { es: 'Noche', en: 'Night', icon: Moon, tint: '#818cf8' },
};

const PX_PER_HOUR = 64;
const HOLD_MS = 360;
const MOVE_SLOP = 9;
const pad = (n: number) => String(n).padStart(2, '0');

/** Dark or white text, whichever reads on this block colour. */
const textOn = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.66 ? '#10131a' : '#ffffff';
};

/** "7:30 – 9 AM" (the suffix is only written once when both ends share it). */
const rangeText = (start: number, end: number, use24h: boolean): string => {
  if (use24h) return `${minutesToTime(start)} – ${minutesToTime(end % 1440)}`;
  const part = (m: number) => { const h = Math.floor((m % 1440) / 60); const mm = m % 60; return { t: `${h % 12 || 12}${mm ? `:${pad(mm)}` : ''}`, s: h >= 12 ? 'PM' : 'AM' }; };
  const a = part(start); const b = part(end);
  return a.s === b.s ? `${a.t} – ${b.t} ${b.s}` : `${a.t} ${a.s} – ${b.t} ${b.s}`;
};

interface Props {
  date: Date;
  onDateChange: (d: Date) => void;
  config: RoutineConfig;
  onConfig: (patch: Partial<RoutineConfig>) => void;
  now: Date;
  es: boolean;
  reduce: boolean;
  /** Every item of a day, done or not (the calendar hides completed ones itself when asked to). */
  itemsFor: (d: Date) => RoutineItem[];
  iconFor: (item: RoutineItem) => React.ElementType;
  nextId: string | null;
  burstId: string | null;
  onToggle: (e: React.MouseEvent, item: RoutineItem, dayKey?: string) => void;
  /** Go to where the item lives (Habits / Tasks section, or the project / journal). */
  onOpen: (item: RoutineItem) => void;
  /** Applies a change built by routineEdits (habit, task or reminder). */
  onApplyEdit: (patch: EditPatch) => void;
  /** Full screen (dashboard hidden) or embedded in the Routine page. */
  immersive: boolean;
  onToggleImmersive: () => void;
  onOpenSettings: () => void;
  onAddQuest?: () => void;
  onAddHabit?: (e?: React.MouseEvent) => void;
  onAddReminder?: (dateKey: string) => void;
  onEditReminder?: (reminderId: string) => void;
}

interface DragState {
  ev: CalendarEvent;
  mode: 'move' | 'resize';
  start: number;
  duration: number;
  day: number;
  grab: number;
  moved: boolean;
}

interface SheetState { item: RoutineItem; dayKey: string; draft: EventDraft; confirm: boolean }

const SPANS: { id: 1 | 3 | 7; es: string; en: string }[] = [{ id: 1, es: 'Día', en: 'Day' }, { id: 3, es: '3 días', en: '3 days' }, { id: 7, es: 'Semana', en: 'Week' }];
const COLOR_MODES: { id: CalendarColorMode; es: string; en: string }[] = [{ id: 'OWN', es: 'Mi color', en: 'My color' }, { id: 'TRAIT', es: 'Rasgo', en: 'Trait' }, { id: 'IMPORTANCE', es: 'Importancia', en: 'Priority' }];

// ── One block (memoised: a clock tick or a drag elsewhere never redraws the others) ──────────────────────────────

interface BlockProps {
  ev: CalendarEvent;
  color: string;
  left: number;
  width: number;
  top: number;
  height: number;
  start: number;
  duration: number;
  dragging: boolean;
  selected: boolean;
  isNext: boolean;
  editable: boolean;
  showCheck: boolean;
  compact: boolean;
  span: number;
  use24h: boolean;
  bursting: boolean;
  reduce: boolean;
  icon: React.ElementType;
  showIcon: boolean;
  label: string;
  onDown: (e: React.PointerEvent, ev: CalendarEvent) => void;
  onMove: (e: React.PointerEvent) => void;
  onUp: (ev: CalendarEvent) => void;
  onCancel: () => void;
  onKey: (ev: CalendarEvent) => void;
  onCheck: (e: React.MouseEvent, ev: CalendarEvent) => void;
  onResizeStart: (e: React.PointerEvent, ev: CalendarEvent) => void;
}

const Block = memo<BlockProps>(({
  ev, color, left, width, top, height, start, duration, dragging, selected, isNext, editable, showCheck, compact, span, use24h, bursting, reduce, icon: Icon, showIcon, label,
  onDown, onMove, onUp, onCancel, onKey, onCheck, onResizeStart,
}) => {
  const it = ev.item;
  const ink = textOn(color);
  const done = it.done;
  const tall = height >= 40;
  const roomy = width >= 96;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={e => onDown(e, ev)}
      onPointerMove={onMove}
      onPointerUp={() => onUp(ev)}
      onPointerCancel={onCancel}
      onContextMenu={e => e.preventDefault()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKey(ev); } }}
      className={cn('absolute select-none cursor-pointer overflow-hidden rounded-[11px] outline-none focus-visible:ring-2 focus-visible:ring-white/80', dragging ? 'z-40' : selected ? 'z-30' : 'z-10')}
      style={{
        top, height, left: left + 1, width: width - 2,
        background: done
          ? `linear-gradient(160deg, ${color}38, ${color}22)`
          : `linear-gradient(160deg, ${color}f5 0%, ${color}c2 100%)`,
        border: `1px solid ${done ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.30)'}`,
        color: done ? 'rgba(255,255,255,0.62)' : ink,
        boxShadow: dragging
          ? '0 22px 40px -12px rgba(0,0,0,0.8), 0 0 0 2px #fff'
          : selected || isNext
            ? `0 0 0 2px rgba(255,255,255,0.95), 0 10px 24px -10px ${color}`
            : done ? 'none' : `inset 0 1px 0 rgba(255,255,255,0.38), 0 8px 18px -10px ${color}aa`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        touchAction: 'pan-y',
        transition: dragging ? 'none' : 'box-shadow 160ms ease, opacity 160ms ease',
        contain: 'layout paint',
      }}
    >
      <span className="absolute inset-x-0 top-0 h-[40%] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.16), transparent)' }} />
      <div className="relative h-full flex flex-col px-[6px] py-[3px] min-w-0" style={{ paddingRight: showCheck ? 28 : 6 }}>
        {tall && roomy ? (
          <>
            <p className={cn('text-[11.5px] font-black leading-[1.15] truncate', done && 'line-through decoration-white/30')}>{it.title}</p>
            <p className="text-[10px] font-semibold leading-tight truncate opacity-85 tabular-nums">{rangeText(start, start + duration, use24h)}{it.subtitle && it.kind !== 'SUBHABIT' ? ` · ${it.subtitle}` : ''}</p>
            {height >= 76 && it.kind === 'SUBHABIT' && it.subtitle && <p className="text-[9.5px] font-bold leading-tight truncate opacity-70 mt-0.5">{it.subtitle}</p>}
            {height >= 76 && showIcon && <Icon size={14} className="absolute right-1.5 bottom-1.5 opacity-40" style={{ color: ink }} />}
          </>
        ) : tall ? (
          <p className={cn('font-black leading-[1.12] break-words', span === 7 ? 'text-[9px]' : 'text-[10.5px]', done && 'line-through decoration-white/30')} style={{ display: '-webkit-box', WebkitLineClamp: Math.max(1, Math.floor((height - 6) / (span === 7 ? 10 : 12))), WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</p>
        ) : (
          <p className={cn('font-black leading-none truncate', span === 7 ? 'text-[8.5px]' : 'text-[10px]', done && 'line-through decoration-white/30')} style={{ marginTop: height < 30 ? 1 : 3 }}>{roomy ? `${it.title}, ${formatClock(minutesToTime(start), !use24h)}` : it.title}</p>
        )}
        {it.overridden && !dragging && <span className="absolute left-1 bottom-1 w-1.5 h-1.5 rounded-full bg-white/90" />}
        {it.progress !== undefined && !done && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-black/25"><span className="block h-full bg-white/85" style={{ width: `${it.progress * 100}%` }} /></span>}
      </div>

      {showCheck && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCheck(e, ev); }}
          aria-label={done ? 'Done' : 'Mark'}
          className="absolute right-0 top-0 w-[30px] h-[30px] flex items-center justify-center touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="w-[17px] h-[17px] rounded-full flex items-center justify-center" style={{ background: done ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.18)', border: `1.5px solid ${done ? 'rgba(255,255,255,0.9)' : `${ink}aa`}` }}>
            {done && <Check size={10} strokeWidth={4} className="text-white" />}
          </span>
          {bursting && !reduce && <motion.span className="absolute w-[17px] h-[17px] rounded-full pointer-events-none" style={{ border: `2px solid ${ink}` }} initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.6 }} />}
        </button>
      )}

      {/* Resize handle: drag the bottom edge to change how long it lasts */}
      {editable && height >= 30 && !compact && (
        <span onPointerDown={e => onResizeStart(e, ev)} className="absolute left-0 right-0 bottom-0 h-[14px] flex items-end justify-center pb-[2px]" style={{ touchAction: 'none', cursor: 'ns-resize' }}>
          <span className="w-6 h-[3px] rounded-full" style={{ background: done ? 'rgba(255,255,255,0.4)' : `${ink}66` }} />
        </span>
      )}

      {dragging && (
        <span className="absolute -top-[22px] left-0 rounded-md bg-white px-1.5 py-[2px] text-[10px] font-black text-black tabular-nums shadow-lg whitespace-nowrap">{rangeText(start, start + duration, use24h)}</span>
      )}
    </div>
  );
});
Block.displayName = 'CalendarBlock';

// ── Main component ──────────────────────────────────────────────────────────────────────────────────────────────

export const RoutineCalendar: React.FC<Props> = ({
  date, onDateChange, config, onConfig, now, es, reduce, itemsFor, iconFor, nextId, burstId, onToggle, onOpen, onApplyEdit,
  immersive, onToggleImmersive, onOpenSettings, onAddQuest, onAddHabit, onAddReminder, onEditReminder,
}) => {
  const tr = (a: string, b: string) => (es ? a : b);
  const locale = es ? 'es-ES' : 'en-US';
  const span = config.calendarSpan;
  const use24h = config.use24h;
  const colorMode = config.calendarColor;
  const pxPerHour = PX_PER_HOUR;

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [peek, setPeek] = useState<CalendarEvent | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const [width, setWidth] = useState(360);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const press = useRef<{ timer: number; x: number; y: number; ev: CalendarEvent } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const todayKey = toLocalISOString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // The days on screen: 1 = the selected day, 3 = it and the next two, 7 = the week it belongs to.
  const dayDates = useMemo(() => {
    const start = span === 7 ? startOfWeek(date) : date;
    return Array.from({ length: span }, (_, i) => addDays(start, i));
  }, [date, span]);

  const days = useMemo(() => dayDates.map(d => {
    const key = toLocalISOString(d);
    return { date: d, key, isToday: key === todayKey, items: hideCompleted(itemsFor(d), config) };
  }), [dayDates, itemsFor, config, todayKey]);

  const todayVisible = days.some(d => d.isToday);
  // The clock is NOT part of the layout: a tick only moves the marker, it never rebuilds the blocks.
  const layout = useMemo(() => buildCalendarLayout({
    days: days.map(d => ({ key: d.key, isToday: d.isToday, items: d.items })),
    config, nowMinutes: null, pxPerHour,
  }), [days, config, pxPerHour]);
  const nowY = todayVisible ? nowMinutes * layout.pxPerMin : null;

  const gutter = span === 1 ? 44 : 36;
  const rail = layout.bands.length ? 15 : 0;
  const gridLeft = gutter + rail;
  const colW = Math.max(20, (width - gridLeft) / span);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Opening a day / changing the span: scroll to where the action is (the clock, else the first block).
  const firstStart = useMemo(() => (layout.events.length ? Math.min(...layout.events.map(e => e.start)) : 7 * 60), [layout.events]);
  const scrollKey = `${days[0].key}|${span}|${immersive}`;
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const anchor = todayVisible ? nowMinutes - 60 : firstStart;
    el.scrollTo({ top: Math.max(0, (anchor - 40) * layout.pxPerMin), behavior: 'auto' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey]);

  const showToast = useCallback((text: string, undo?: () => void) => {
    setToast({ text, undo });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5200);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (press.current) window.clearTimeout(press.current.timer);
    dragCleanup.current?.();
  }, []);

  const shift = (dir: 1 | -1) => { setPeek(null); onDateChange(addDays(date, dir * span)); };
  const fmtDay = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
  const hourLabel = (h: number) => (use24h ? `${pad(h)}:00` : `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`);
  const blockColor = useCallback((it: RoutineItem) => colorForMode(it, colorMode), [colorMode]);

  const title = (() => {
    const first = dayDates[0]; const last = dayDates[dayDates.length - 1];
    if (first.getMonth() === last.getMonth()) return first.toLocaleDateString(locale, { month: 'long' });
    return `${first.toLocaleDateString(locale, { month: 'short' }).replace('.', '')} – ${last.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}`;
  })();

  // ── Applying edits ───────────────────────────────────────────────────────
  const applyRequest = useCallback((req: EditRequest) => {
    const patch = buildEditPatch(req, todayKey);
    if (!patch) return;
    onApplyEdit(patch);
    const when = formatClock(minutesToTime(req.startMin), !use24h);
    if (req.item.kind === 'TASK' && req.item.quest) {
      const q: Quest = req.item.quest;
      const back: EditPatch = { kind: 'quest', questId: q.id, data: { id: q.id, deadline: q.deadline, deadlineTime: q.deadlineTime, calendarDuration: q.calendarDuration } };
      showToast(tr(`Tarea movida · ${when}`, `Task moved · ${when}`), () => onApplyEdit(back));
    } else {
      showToast(req.scope === 'DAY' ? tr(`Cambiado solo este día · ${when}`, `Changed for this day only · ${when}`) : tr(`Horario actualizado · ${when}`, `Schedule updated · ${when}`));
    }
  }, [onApplyEdit, showToast, todayKey, use24h, es]);

  const openSheet = useCallback((item: RoutineItem, dayKey: string, draft?: Partial<EventDraft>, confirm = false) => {
    setPeek(null);
    setSheet({ item, dayKey, confirm, draft: { start: draft?.start ?? item.minutes ?? 9 * 60, duration: draft?.duration ?? item.durationMin, dayKey: draft?.dayKey ?? dayKey } });
  }, []);

  // A tap unfolds the block's card; the card leads to the full editor.
  const tap = useCallback((ev: CalendarEvent) => {
    setPeek(cur => (cur && cur.item.id === ev.item.id && cur.day === ev.day ? null : ev));
  }, []);

  // ── Gestures: hold + drag = move, bottom edge = resize ───────────────────
  const stopTouchScroll = useRef((e: TouchEvent) => { if (dragRef.current) e.preventDefault(); });

  const commitDrag = useCallback((d: DragState) => {
    const item = d.ev.item;
    const dayKey = days[d.ev.day].key;
    if (!d.moved) return;
    setPeek(null);
    if (item.kind === 'TASK' || item.kind === 'JOURNAL') {
      applyRequest({ item, dayKey, startMin: d.start, duration: d.duration, scope: 'ALWAYS', newDayKey: days[d.day].key });
    } else {
      openSheet(item, dayKey, { start: d.start, duration: d.duration }, true);
    }
  }, [applyRequest, days, openSheet]);

  const computeDrag = useCallback((d: DragState, x: number, y: number): DragState => {
    const inner = innerRef.current;
    if (!inner) return d;
    const rect = inner.getBoundingClientRect();
    const minutesAt = (py: number) => (py - rect.top) / layout.pxPerMin;
    if (d.mode === 'resize') {
      const end = snapMinutes(minutesAt(y));
      const duration = clampDuration(Math.min(end - d.start, 1440 - d.start));
      return { ...d, duration, moved: d.moved || duration !== d.ev.item.durationMin };
    }
    const start = Math.max(0, Math.min(1440 - d.duration, snapMinutes(minutesAt(y) - d.grab)));
    let day = d.ev.day;
    const movesDay = d.ev.item.kind === 'TASK' || (d.ev.item.kind === 'JOURNAL' && !!d.ev.item.reminderId);
    if (movesDay) day = Math.max(0, Math.min(span - 1, Math.floor((x - rect.left - gridLeft) / colW)));
    return { ...d, start, day, moved: d.moved || start !== d.ev.start || day !== d.ev.day };
  }, [colW, gridLeft, layout.pxPerMin, span]);

  const beginDrag = useCallback((ev: CalendarEvent, mode: 'move' | 'resize', x: number, y: number) => {
    const inner = innerRef.current;
    if (!inner) return;
    dragCleanup.current?.();
    const rect = inner.getBoundingClientRect();
    const grab = (y - rect.top) / layout.pxPerMin - ev.start;
    const state: DragState = { ev, mode, start: ev.start, duration: Math.max(MIN_DURATION, ev.end - ev.start), day: ev.day, grab, moved: false };
    dragRef.current = state;
    pointer.current = { x, y };
    setDrag(state);
    setPeek(null);
    try { navigator.vibrate?.(12); } catch { /* not supported */ }

    const move = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      if (!dragRef.current) return;
      const next = computeDrag(dragRef.current, e.clientX, e.clientY);
      dragRef.current = next;
      setDrag(next);
    };
    let raf = 0;
    // Near the top / bottom edge of the scroller the grid scrolls by itself so a block can travel the whole day.
    const auto = () => {
      const sc = scrollerRef.current;
      if (sc && dragRef.current) {
        const r = sc.getBoundingClientRect();
        const y2 = pointer.current.y;
        const speed = y2 < r.top + 56 ? -9 : y2 > r.bottom - 56 ? 9 : 0;
        if (speed) {
          sc.scrollTop += speed;
          const next = computeDrag(dragRef.current, pointer.current.x, y2);
          dragRef.current = next;
          setDrag(next);
        }
        raf = requestAnimationFrame(auto);
      }
    };
    raf = requestAnimationFrame(auto);
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('touchmove', stopTouchScroll.current);
      cancelAnimationFrame(raf);
      dragCleanup.current = null;
    };
    const end = () => {
      cleanup();
      const done = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (done) commitDrag(done);
    };
    dragCleanup.current = () => { cleanup(); dragRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('touchmove', stopTouchScroll.current, { passive: false });
  }, [commitDrag, computeDrag, layout.pxPerMin]);

  // Handlers handed to the memoised blocks stay the same function for the whole life of the component.
  const latest = useRef({ beginDrag, tap, onToggle, days });
  latest.current = { beginDrag, tap, onToggle, days };

  const stable = useMemo(() => ({
    down: (e: React.PointerEvent, ev: CalendarEvent) => {
      if (e.button !== undefined && e.button > 0) return;
      const x = e.clientX; const y = e.clientY;
      if (press.current) window.clearTimeout(press.current.timer);
      pointer.current = { x, y };
      press.current = {
        x, y, ev,
        timer: isEditable(ev.item) ? window.setTimeout(() => { const p = press.current; if (p) { press.current = null; latest.current.beginDrag(p.ev, 'move', pointer.current.x || p.x, pointer.current.y || p.y); } }, HOLD_MS) : 0,
      };
    },
    move: (e: React.PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_SLOP) { window.clearTimeout(p.timer); press.current = null; }
    },
    up: (ev: CalendarEvent) => {
      const p = press.current;
      if (!p) return;
      window.clearTimeout(p.timer);
      press.current = null;
      latest.current.tap(ev);
    },
    cancel: () => { if (press.current) { window.clearTimeout(press.current.timer); press.current = null; } },
    key: (ev: CalendarEvent) => latest.current.tap(ev),
    check: (e: React.MouseEvent, ev: CalendarEvent) => latest.current.onToggle(e, ev.item, latest.current.days[ev.day]?.key),
    resize: (e: React.PointerEvent, ev: CalendarEvent) => {
      e.stopPropagation();
      if (press.current) { window.clearTimeout(press.current.timer); press.current = null; }
      latest.current.beginDrag(ev, 'resize', e.clientX, e.clientY);
    },
  }), []);

  // Keep the unfolded card in view.
  useEffect(() => { if (peek) peekRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }, [peek, reduce]);

  const stripLists = layout.allDay;
  const stripTotal = stripLists.reduce((n, l) => n + l.length, 0);
  const stripOverdue = stripLists.reduce((n, l) => n + l.filter(i => i.overdue).length, 0);

  const chip = (it: RoutineItem, dayKey: string, small: boolean) => {
    const c = blockColor(it);
    return (
      <div
        key={it.id}
        role="button"
        tabIndex={0}
        onClick={() => (it.reminderId && onEditReminder ? onEditReminder(it.reminderId) : isEditable(it) ? openSheet(it, dayKey) : onOpen(it))}
        className={cn('flex items-center gap-1 rounded-full max-w-full cursor-pointer active:scale-95 transition-transform backdrop-blur-md', small ? 'px-1.5 py-[2px]' : 'pl-2.5 pr-1.5 py-1')}
        style={{ background: it.done ? 'rgba(255,255,255,0.05)' : it.overdue ? 'rgba(251,113,133,0.2)' : `${c}30`, border: `1px solid ${it.done ? 'rgba(255,255,255,0.06)' : it.overdue ? 'rgba(251,113,133,0.45)' : `${c}66`}` }}
      >
        {!small && it.overdue && <AlertCircle size={11} className="text-rose-300 shrink-0" />}
        <span className={cn('font-bold truncate', small ? 'text-[8.5px]' : 'text-[11px]', it.done ? 'text-white/30 line-through' : it.overdue ? 'text-rose-200' : 'text-white')}>{it.title}</span>
        {!small && (
          <button type="button" onClick={e => { e.stopPropagation(); onToggle(e, it, dayKey); }} aria-label={tr('Marcar', 'Mark')} className="w-6 h-6 -my-1 flex items-center justify-center shrink-0 touch-manipulation">
            <span className="w-[15px] h-[15px] rounded-full flex items-center justify-center" style={{ background: it.done ? c : 'transparent', border: `1.5px solid ${it.done ? c : `${c}99`}` }}>
              {it.done && <Check size={9} strokeWidth={4} className="text-white" />}
            </span>
          </button>
        )}
      </div>
    );
  };

  // ── The unfolded card of a block ─────────────────────────────────────────
  const renderPeek = () => {
    if (!peek) return null;
    const it = peek.item;
    const c = blockColor(it);
    const dayKey = days[peek.day].key;
    const Icon = iconFor(it);
    const cardW = Math.min(304, width - 16);
    const colLeft = peek.day * colW;
    const left = Math.max(4, Math.min(width - gridLeft - cardW - 4, colLeft + 4));
    const below = peek.top + peek.height + 8;
    const cardH = 196;
    const top = below + cardH > layout.height ? Math.max(4, peek.top - cardH - 8) : below;
    const editable = isEditable(it);
    const kind = it.kind === 'TASK' ? tr('Tarea', 'Task') : it.kind === 'SUBHABIT' ? tr('Subtarea', 'Sub-habit') : it.kind === 'HABIT' ? tr('Hábito', 'Habit') : it.kind === 'PROJECT' ? tr('Proyecto', 'Project') : it.reminderId ? tr('Recordatorio', 'Reminder') : tr('Journal', 'Journal');
    const imp = it.importance >= 1 ? (es ? IMPORTANCE_LABELS.es : IMPORTANCE_LABELS.en)[Math.min(4, it.importance) - 1] : null;
    const dur = it.durationMin >= 60 ? `${Math.floor(it.durationMin / 60)} h${it.durationMin % 60 ? ` ${it.durationMin % 60} min` : ''}` : `${it.durationMin} min`;
    return (
      <motion.div
        ref={peekRef}
        key={`peek-${peek.day}-${it.id}`}
        initial={reduce ? false : { opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }}
        className="absolute z-50 rounded-[22px] border border-white/15 bg-[#10101a]/85 backdrop-blur-2xl p-3.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
        style={{ top, left, width: cardW }}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${c}2e`, color: c }}><Icon size={16} /></span>
          <div className="flex-1 min-w-0">
            <p className={cn('text-[14px] font-black leading-tight', it.done ? 'text-white/45 line-through' : 'text-white')}>{it.title}</p>
            <p className="text-[11px] font-semibold text-white/45 mt-0.5 tabular-nums">{rangeText(peek.start, peek.end, use24h)} · {dur}</p>
          </div>
          <button type="button" onClick={() => setPeek(null)} aria-label={tr('Cerrar', 'Close')} className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/60 active:scale-90 transition-transform"><ChevronUp size={14} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="rounded-full px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider" style={{ background: `${c}26`, color: c }}>{kind}</span>
          {imp && <span className="rounded-full px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider" style={{ background: `${IMPORTANCE_COLORS[it.importance - 1]}26`, color: IMPORTANCE_COLORS[it.importance - 1] }}>{imp}</span>}
          {it.subtitle && <span className="rounded-full bg-white/[0.07] px-2 py-[3px] text-[9.5px] font-bold text-white/60 truncate max-w-[180px]">{it.subtitle}</span>}
          {it.overridden && <span className="rounded-full bg-amber-300/15 px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider text-amber-200">{tr('Movido hoy', 'Moved today')}</span>}
          {it.done && <span className="rounded-full bg-emerald-400/15 px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider text-emerald-300">{tr('Hecho', 'Done')}</span>}
        </div>
        {it.progress !== undefined && (
          <div className="mt-2.5 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round(it.progress * 100)}%`, background: c }} /></div>
        )}
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <button type="button" onClick={e => { onToggle(e, it, dayKey); setPeek(null); }} className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-[11.5px] font-black active:scale-95 transition-transform" style={{ background: it.done ? 'rgba(255,255,255,0.08)' : c, color: it.done ? '#fff' : textOn(c) }}>
            <Check size={13} strokeWidth={3} /> {it.done ? tr('Deshacer', 'Undo') : tr('Hecho', 'Done')}
          </button>
          <button type="button" onClick={() => { if (it.reminderId && onEditReminder) { onEditReminder(it.reminderId); setPeek(null); } else if (editable) openSheet(it, dayKey); else onOpen(it); }} className="flex items-center justify-center gap-1 rounded-xl bg-white/[0.08] py-2.5 text-[11.5px] font-black text-white active:scale-95 transition-transform">
            <Pencil size={12} /> {tr('Editar', 'Edit')}
          </button>
          <button type="button" onClick={() => { onOpen(it); setPeek(null); }} className="flex items-center justify-center gap-1 rounded-xl bg-white/[0.08] py-2.5 text-[11.5px] font-black text-white active:scale-95 transition-transform">
            <ArrowUpRight size={13} /> {tr('Abrir', 'Open')}
          </button>
        </div>
      </motion.div>
    );
  };

  // ── The calendar ─────────────────────────────────────────────────────────
  const body = (
    <div
      className={cn('flex flex-col min-h-0 overflow-hidden', immersive ? 'fixed inset-0 z-[1000] bg-[#06060d]/95 backdrop-blur-[30px] backdrop-saturate-150' : 'relative rounded-[28px] border border-white/10 bg-[#06060d]/60 backdrop-blur-2xl')}
      style={immersive ? undefined : { height: 'calc(100dvh - 230px)', minHeight: 440 }}
    >
      {/* ambient light */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: 'radial-gradient(60% 40% at 15% 0%, rgba(56,189,248,0.16), transparent 70%), radial-gradient(55% 38% at 100% 8%, rgba(168,85,247,0.14), transparent 70%), radial-gradient(70% 40% at 50% 100%, rgba(244,114,182,0.08), transparent 70%)' }} />

      {/* Top bar: minimised by default */}
      <div className={cn('relative shrink-0 px-3 pb-2 border-b border-white/[0.08] bg-white/[0.025]', immersive ? 'pt-[max(6px,env(safe-area-inset-top))]' : 'pt-2')}>
        <div className="flex justify-center -mt-1 mb-1">
          <button
            type="button"
            onClick={onToggleImmersive}
            aria-label={immersive ? tr('Mostrar el tablero', 'Show the dashboard') : tr('Pantalla completa', 'Full screen')}
            className="w-14 h-[18px] rounded-b-[10px] rounded-t-sm bg-white/[0.1] border border-white/[0.1] flex items-center justify-center text-white/65 active:scale-90 active:bg-white/20 transition-all"
          >
            {immersive ? <ChevronDown size={14} strokeWidth={2.6} /> : <ChevronUp size={14} strokeWidth={2.6} />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <p className="text-[24px] font-black leading-none tracking-tight truncate first-letter:uppercase bg-gradient-to-r from-white via-white to-sky-200 bg-clip-text text-transparent">{title}</p>
            <p className="text-[12px] font-bold text-white/30 tabular-nums">{dayDates[dayDates.length - 1].getFullYear()}</p>
          </div>
          {!todayVisible && (
            <button type="button" onClick={() => { setPeek(null); onDateChange(new Date()); }} className="rounded-full bg-sky-400/15 border border-sky-400/30 px-3 h-8 text-[11px] font-black text-sky-300 active:scale-95 transition-transform flex items-center gap-1">
              <CalendarClock size={12} /> {tr('Hoy', 'Today')}
            </button>
          )}
          <div className="flex items-center rounded-full bg-white/[0.07] border border-white/[0.1]">
            <button type="button" onClick={() => shift(-1)} aria-label={tr('Anterior', 'Previous')} className="w-8 h-8 flex items-center justify-center text-white/75 active:scale-90 transition-transform"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => shift(1)} aria-label={tr('Siguiente', 'Next')} className="w-8 h-8 flex items-center justify-center text-white/75 active:scale-90 transition-transform"><ChevronRight size={17} /></button>
          </div>
          <button
            type="button" onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen} aria-label={tr('Opciones', 'Options')}
            className={cn('w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition-all', panelOpen ? 'bg-white text-black border-white' : 'bg-white/[0.07] border-white/[0.1] text-white/70')}
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-3 flex flex-col gap-2.5">
                <div className="relative flex p-[3px] rounded-full bg-white/[0.06] border border-white/[0.08]">
                  <span className="absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full bg-white pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `translateX(${SPANS.findIndex(s => s.id === span) * 100}%)` }} />
                  {SPANS.map(s => (
                    <button key={s.id} type="button" onClick={() => { setPeek(null); onConfig({ calendarSpan: s.id }); }} className="relative z-10 flex-1 h-8 text-[12px] font-black active:scale-95 transition-transform">
                      <span className={cn('transition-colors', span === s.id ? 'text-black' : 'text-white/55')}>{es ? s.es : s.en}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/35 mb-1.5"><Palette size={11} /> {tr('Colores según', 'Colours by')}</p>
                  <div className="relative flex p-[3px] rounded-full bg-white/[0.06] border border-white/[0.08]">
                    <span className="absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full bg-gradient-to-r from-sky-300 to-indigo-300 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `translateX(${COLOR_MODES.findIndex(s => s.id === colorMode) * 100}%)` }} />
                    {COLOR_MODES.map(m => (
                      <button key={m.id} type="button" onClick={() => onConfig({ calendarColor: m.id })} className="relative z-10 flex-1 h-8 text-[11.5px] font-black active:scale-95 transition-transform">
                        <span className={cn('transition-colors', colorMode === m.id ? 'text-black' : 'text-white/55')}>{es ? m.es : m.en}</span>
                      </button>
                    ))}
                  </div>
                  {colorMode === 'IMPORTANCE' && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      {IMPORTANCE_COLORS.map((c, i) => (
                        <span key={c} className="flex items-center gap-1.5 text-[10px] font-bold text-white/55"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{(es ? IMPORTANCE_LABELS.es : IMPORTANCE_LABELS.en)[i]}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 relative">
                  <button type="button" onClick={() => onConfig({ view: 'LIST' })} className="flex-1 h-9 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center gap-1.5 text-[11.5px] font-black text-white/75 active:scale-95 transition-transform"><ListTodo size={14} /> {tr('Lista', 'List')}</button>
                  <button type="button" onClick={onOpenSettings} className="flex-1 h-9 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center gap-1.5 text-[11.5px] font-black text-white/75 active:scale-95 transition-transform"><Settings2 size={14} /> {tr('Ajustes', 'Settings')}</button>
                  <button type="button" onClick={() => setAddOpen(v => !v)} className="flex-1 h-9 rounded-full bg-white text-black flex items-center justify-center gap-1.5 text-[11.5px] font-black active:scale-95 transition-transform shadow-[0_6px_18px_-6px_rgba(255,255,255,0.5)]"><Plus size={15} strokeWidth={3} /> {tr('Añadir', 'Add')}</button>
                  {addOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
                      <div className="absolute right-0 top-11 z-50 w-52 rounded-[20px] bg-[#14141d]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-1.5">
                        <button type="button" onClick={() => { setAddOpen(false); onAddQuest?.(); }} className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-bold text-white active:bg-white/10"><span className="w-7 h-7 rounded-xl bg-cyan-400/15 text-cyan-300 flex items-center justify-center"><CheckSquare size={15} /></span>{tr('Nueva tarea', 'New task')}</button>
                        <button type="button" onClick={e => { setAddOpen(false); onAddHabit?.(e); }} className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-bold text-white active:bg-white/10"><span className="w-7 h-7 rounded-xl bg-orange-400/15 text-orange-300 flex items-center justify-center"><Flame size={15} /></span>{tr('Nuevo hábito', 'New habit')}</button>
                        <button type="button" onClick={() => { setAddOpen(false); onAddReminder?.(days[0].key); }} className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-bold text-white active:bg-white/10"><span className="w-7 h-7 rounded-xl bg-indigo-400/15 text-indigo-300 flex items-center justify-center"><BellRing size={15} /></span>{tr('Nuevo recordatorio', 'New reminder')}</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Day headers */}
      <div className="relative shrink-0 flex border-b border-white/[0.07] pb-1" style={{ paddingLeft: gridLeft }}>
        {days.map(d => (
          <button key={d.key} type="button" onClick={() => { setPeek(null); onDateChange(d.date); if (span > 1) onConfig({ calendarSpan: 1 }); }} className="flex-1 min-w-0 flex flex-col items-center gap-0 py-0.5 active:scale-95 transition-transform">
            <span className={cn('text-[9.5px] font-black uppercase tracking-wider', d.isToday ? 'text-sky-300' : 'text-white/40')}>{d.date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 3)}</span>
            <span className={cn('w-[32px] h-[32px] rounded-full flex items-center justify-center text-[16px] font-black tabular-nums', d.isToday ? 'bg-sky-400 text-[#06121f] shadow-[0_6px_18px_-6px_rgba(56,189,248,0.9)]' : 'text-white/85')}>{d.date.getDate()}</span>
          </button>
        ))}
      </div>

      {/* Items with no hour / overdue tasks: one small pill, unfolds on demand */}
      {stripTotal > 0 && (
        <div className="relative shrink-0 border-b border-white/[0.07]">
          <button type="button" onClick={() => setStripOpen(v => !v)} aria-expanded={stripOpen} className="w-full flex items-center gap-2 py-1.5 active:bg-white/[0.04] transition-colors" style={{ paddingLeft: Math.max(8, gridLeft - 30) }}>
            <Sparkles size={12} className="text-white/40" />
            <span className="text-[11px] font-black text-white/60">{stripTotal} {tr('sin hora', 'untimed')}</span>
            {stripOverdue > 0 && <span className="rounded-full bg-rose-400/20 px-2 py-[1px] text-[9.5px] font-black text-rose-300">{stripOverdue} {tr('atrasadas', 'overdue')}</span>}
            <span className="flex-1" />
            <ChevronDown size={14} className={cn('text-white/40 mr-3 transition-transform duration-200', stripOpen && 'rotate-180')} />
          </button>
          <AnimatePresence initial={false}>
            {stripOpen && (
              <motion.div key="strip" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden' }}>
                <div className="flex pb-2 pr-1.5 max-h-[120px] overflow-y-auto" style={{ paddingLeft: gridLeft }}>
                  {days.map((d, i) => (
                    <div key={d.key} className={cn('flex-1 min-w-0 px-0.5', span > 1 ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1.5')}>
                      {(stripLists[i] ?? []).map(it => chip(it, d.key, span > 1))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* The grid */}
      <div ref={scrollerRef} className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }} onPointerDown={() => { if (peek) setPeek(null); }}>
        <div ref={innerRef} className="relative" style={{ height: layout.height + 28, marginTop: 8 }}>
          {/* Bands: the way the day was divided in the routine settings */}
          {layout.bands.map((b, i) => {
            const p = PART_STYLE[b.band.part];
            const label = b.band.kind === 'BLOCK' ? formatHourRange(b.band.startHour, b.band.endHour, use24h) : (es ? p.es : p.en);
            return (
              <React.Fragment key={b.band.id}>
                <div className="absolute pointer-events-none" style={{ top: b.top, height: b.height, left: gutter, right: 0, background: i % 2 === 0 ? `${p.tint}10` : `${p.tint}06`, borderTop: `1px solid ${p.tint}40` }} />
                <div className="absolute flex items-center justify-center pointer-events-none" style={{ top: b.top + 2, height: b.height - 4, left: gutter + 1, width: rail - 2 }}>
                  <div className="h-full w-full rounded-full flex items-center justify-center overflow-hidden" style={{ background: `${p.tint}22` }}>
                    <span className="text-[8px] font-black uppercase tracking-wider whitespace-nowrap tabular-nums" style={{ color: p.tint, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{label}{b.total ? ` · ${b.done}/${b.total}` : ''}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Hour lines + labels (each one positioned directly: a zero-height wrapper gets clipped) */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 24 }, (_, h) => (
              <React.Fragment key={h}>
                {h > 0 && !(nowY !== null && span === 1 && Math.abs(nowY - h * pxPerHour) < 9) && <span className="absolute text-right text-[9.5px] font-bold text-white/40 tabular-nums leading-none pr-1.5 whitespace-nowrap" style={{ left: 0, width: gutter, top: h * pxPerHour - 5 }}>{hourLabel(h)}</span>}
                <div className="absolute right-0 border-t border-white/[0.09]" style={{ left: gutter, top: h * pxPerHour }} />
                <div className="absolute right-0 border-t border-dashed border-white/[0.035]" style={{ left: gridLeft, top: h * pxPerHour + pxPerHour / 2 }} />
              </React.Fragment>
            ))}
            {span > 1 && Array.from({ length: span }, (_, i) => <div key={i} className="absolute top-0 bottom-0 border-l border-white/[0.06]" style={{ left: gridLeft + i * colW }} />)}
            {span === 1 && <div className="absolute top-0 bottom-0 border-l border-white/[0.06]" style={{ left: gutter }} />}
          </div>

          {/* Blocks */}
          <div className="absolute top-0 bottom-0 right-0" style={{ left: gridLeft }}>
            {layout.events.map(ev => {
              const d = drag && drag.ev === ev ? drag : null;
              const start = d ? d.start : ev.start;
              const duration = d ? d.duration : ev.end - ev.start;
              const top = d ? start * layout.pxPerMin : ev.top;
              const height = d ? Math.max(duration * layout.pxPerMin, 22) : ev.height;
              const day = d ? d.day : ev.day;
              const laneW = d ? colW : colW / ev.lanes;
              const left = day * colW + (d ? 0 : ev.lane * laneW);
              const it = ev.item;
              return (
                <Block
                  key={`${ev.day}-${it.id}`}
                  ev={ev} color={blockColor(it)} left={left} width={laneW} top={top} height={height} start={start} duration={duration}
                  dragging={!!d} selected={!!peek && peek.item.id === it.id && peek.day === ev.day}
                  isNext={nextId === it.id && !!days[ev.day]?.isToday}
                  editable={isEditable(it)} showCheck={laneW >= 96 && height >= 28 && it.kind !== 'PROJECT' && !d && !(it.kind === 'JOURNAL' && !it.reminderId)}
                  compact={span > 1} span={span} use24h={use24h} bursting={burstId === it.id} reduce={reduce}
                  icon={iconFor(it)} showIcon={config.habitIcons}
                  label={`${it.title}, ${rangeText(start, start + duration, use24h)}`}
                  onDown={stable.down} onMove={stable.move} onUp={stable.up} onCancel={stable.cancel} onKey={stable.key} onCheck={stable.check} onResizeStart={stable.resize}
                />
              );
            })}
            {layout.empty && (
              <div className="absolute inset-x-0 mx-auto w-[230px] text-center pointer-events-none" style={{ top: 8 * pxPerHour + 20 }}>
                <CalendarClock size={28} className="mx-auto text-sky-300/60 mb-2" />
                <p className="text-[14px] font-black text-white/70">{tr('Nada con hora', 'Nothing scheduled')}</p>
                <p className="text-[11px] text-white/35 mt-1 leading-snug">{tr('Ponle hora a tus hábitos y tareas, o añade un recordatorio.', 'Give your habits and tasks a time, or add a reminder.')}</p>
              </div>
            )}
            <AnimatePresence>{renderPeek()}</AnimatePresence>
          </div>

          {/* "Now" marker */}
          {nowY !== null && (
            <div className="absolute left-0 right-0 pointer-events-none flex items-center z-20" style={{ top: nowY - 5, height: 10 }}>
              <span className="shrink-0 text-right pr-1 text-[8.5px] font-black tabular-nums text-rose-300 leading-none whitespace-nowrap" style={{ width: gutter - 2 }}>{span === 1 ? formatClock(`${pad(now.getHours())}:${pad(now.getMinutes())}`, !use24h) : ''}</span>
              <span className="relative -ml-[1px] flex w-[10px] h-[10px] items-center justify-center shrink-0">
                <span className="absolute w-full h-full rounded-full bg-rose-400/40 animate-ping" />
                <span className="relative w-[8px] h-[8px] rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)]" />
              </span>
              <span className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-400 via-rose-400/80 to-rose-400/10" />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute left-3 right-3 bottom-[max(14px,env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-2xl bg-[#1a1a24]/90 backdrop-blur-xl border border-white/10 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
          >
            <span className="flex-1 text-[12.5px] font-bold text-white truncate">{toast.text}</span>
            {toast.undo && <button type="button" onClick={() => { toast.undo?.(); setToast(null); }} className="flex items-center gap-1.5 text-[12px] font-black text-sky-300 active:scale-95 transition-transform"><Undo2 size={13} /> {tr('Deshacer', 'Undo')}</button>}
          </motion.div>
        )}
      </AnimatePresence>

      {sheet && (
        <RoutineEventSheet
          key={`${sheet.item.id}-${sheet.dayKey}-${sheet.draft.start}-${sheet.draft.duration}`}
          item={sheet.item}
          dayKey={sheet.dayKey}
          dayLabel={fmtDay(sheet.dayKey)}
          initial={sheet.draft}
          confirmMode={sheet.confirm}
          use24h={use24h}
          es={es}
          color={blockColor(sheet.item)}
          onClose={() => setSheet(null)}
          onSave={req => { setSheet(null); applyRequest(req); }}
          onReset={() => { const p = buildResetPatch(sheet.item, sheet.dayKey); if (p) { onApplyEdit(p); showToast(tr('Horario restablecido', 'Schedule reset')); } }}
          onToggle={e => onToggle(e, sheet.item, sheet.dayKey)}
          onLocate={() => onOpen(sheet.item)}
          onPostpone={n => { if (sheet.item.quest) { onApplyEdit(buildPostponePatch(sheet.item.quest, sheet.dayKey, n)); setSheet(null); showToast(tr('Tarea pasada a mañana', 'Task moved to tomorrow')); } }}
        />
      )}
    </div>
  );

  return immersive ? createPortal(body, document.body) : body;
};

export default RoutineCalendar;
