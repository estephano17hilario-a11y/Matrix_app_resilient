import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, ArrowUpRight, BellRing, CalendarClock, Check, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flame, Layers, ListTodo,
  Maximize2, Minus, Moon, Palette, Pencil, Plus, Settings2, SlidersHorizontal, Sparkles, Sun, Sunset, Undo2, X, ZoomIn,
} from 'lucide-react';
import type { Quest } from '../../types';
import { addDays, formatClock, startOfWeek, toLocalISOString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { buildCalendarLayout, minutesToTime, snapMinutes, type CalendarEvent } from './calendarLayout';
import { buildEditPatch, buildPostponePatch, buildResetPatch, isEditable, type EditPatch, type EditRequest } from './routineEdits';
import { RoutineEventSheet, type EventDraft } from './RoutineEventSheet';
import { applyTrims, buildTrimPatches, canTrimForGood, scanBunches, trimKey } from './unbunch';
import {
  clampDuration, colorForMode, formatHourRange, hideCompleted, IMPORTANCE_COLORS, IMPORTANCE_LABELS, MIN_DURATION,
  type CalendarColorMode, type DayPart, type RoutineConfig, type RoutineItem,
} from './routineEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Calendar view of the Routine, Google-Calendar style: solid blocks as tall as they last, titles always readable
// (blocks that start together go side by side, later overlapping ones nest on top shifted right), day / 3 days /
// week, pinch to zoom. Full screen covers the whole app (HUD included) but leaves the dock on top. The options
// panel starts minimised. When blocks really overlap by the clock a small "Tareas abultadas" chip appears: it can
// shorten them for this view only, or for good (start times never move). Layout: calendarLayout.ts; data changes:
// routineEdits.ts / unbunch.ts; this file draws and handles the gestures.
// ─────────────────────────────────────────────────────────────────────────────

const PART_STYLE: Record<DayPart, { es: string; en: string; icon: React.ElementType; tint: string }> = {
  MORNING: { es: 'Mañana', en: 'Morning', icon: Sun, tint: '#fbbf24' },
  AFTERNOON: { es: 'Tarde', en: 'Afternoon', icon: Sunset, tint: '#fb923c' },
  NIGHT: { es: 'Noche', en: 'Night', icon: Moon, tint: '#818cf8' },
};

const ZOOM_KEY = 'routine_calendar_zoom_v1';
const ZOOM_MIN = 36;
const ZOOM_MAX = 220;
const ZOOM_DEFAULT = 76;
const HOLD_MS = 360;
const MOVE_SLOP = 9;
/** Space left under the grid in full screen so the last hours can scroll above the floating dock. */
const DOCK_RESERVE = 128;
/** Colour of the gap between overlapping blocks (the grid background). */
const SEP = '#0a0a12';
const pad = (n: number) => String(n).padStart(2, '0');
const clampZoom = (n: number) => Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, n)));

const readZoom = (): number => {
  try { const v = Number(localStorage.getItem(ZOOM_KEY)); return v ? clampZoom(v) : ZOOM_DEFAULT; } catch { return ZOOM_DEFAULT; }
};

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

const shortTime = (m: number, use24h: boolean) => {
  const h = Math.floor(m / 60); const mm = m % 60;
  return use24h ? `${pad(h)}:${pad(mm)}` : `${h % 12 || 12}${mm ? `:${pad(mm)}` : ''}${h >= 12 ? 'pm' : 'am'}`;
};

const fmtDuration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`);

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
  /** Full screen (HUD hidden, dock kept) or embedded in the Routine page. */
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
  z: number;
  dragging: boolean;
  selected: boolean;
  isNext: boolean;
  editable: boolean;
  showCheck: boolean;
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
  ev, color, left, width, top, height, start, duration, z, dragging, selected, isNext, editable, showCheck, span, use24h, bursting, reduce, icon: Icon, showIcon, label,
  onDown, onMove, onUp, onCancel, onKey, onCheck, onResizeStart,
}) => {
  const it = ev.item;
  const done = it.done;
  const ink = done ? 'rgba(255,255,255,0.6)' : textOn(color);
  const week = span === 7;
  const titleSize = week ? 8.5 : span === 3 ? 10.5 : 12;
  const lineH = week ? 10 : span === 3 ? 13 : 14.5;
  const padX = week ? 2.5 : 6;
  const padY = week ? 2 : 3;
  const checkRoom = showCheck ? 26 : 0;
  const oneLine = height < lineH * 2 + padY * 2 - 2;
  const showTime = !oneLine && height >= lineH * 2 + 12 && width >= 52;
  const titleLines = Math.max(1, Math.floor((height - padY * 2 - (showTime ? 12 : 0)) / lineH));
  const timeTxt = week ? shortTime(start, use24h) : rangeText(start, start + duration, use24h);
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
      className="absolute select-none cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      style={{
        top, height, left, width, zIndex: z,
        borderRadius: week ? 4 : 7,
        background: done ? `linear-gradient(${color}4d, ${color}4d), #15151f` : color,
        color: ink,
        boxShadow: dragging
          ? `0 22px 40px -12px rgba(0,0,0,0.85), 0 0 0 2px #fff`
          : selected || isNext
            ? `0 0 0 1px ${SEP}, 0 0 0 2.5px rgba(255,255,255,0.95)`
            : `0 0 0 1px ${SEP}`,
        opacity: dragging ? 0.94 : 1,
        touchAction: 'pan-y',
        transition: dragging ? 'none' : 'box-shadow 160ms ease',
        contain: 'layout paint',
      }}
    >
      <div className="relative h-full min-w-0" style={{ padding: `${padY}px ${padX + checkRoom}px ${padY}px ${padX}px` }}>
        {oneLine ? (
          <p className={cn('font-bold truncate', done && 'line-through')} style={{ fontSize: titleSize, lineHeight: `${Math.max(8, height - padY * 2)}px` }}>
            {it.title}{!week && width >= 110 && <span className="font-semibold opacity-80">{`, ${shortTime(start, use24h)}`}</span>}
          </p>
        ) : (
          <>
            <p
              className={cn('font-bold', done && 'line-through')}
              style={{ fontSize: titleSize, lineHeight: `${lineH}px`, letterSpacing: week ? '-0.2px' : undefined, display: '-webkit-box', WebkitLineClamp: titleLines, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'break-word' }}
            >
              {it.title}
            </p>
            {showTime && <p className="font-semibold opacity-80 tabular-nums truncate" style={{ fontSize: week ? 8 : 10, lineHeight: '12px' }}>{timeTxt}</p>}
            {height >= 64 && width >= 90 && showIcon && <Icon size={13} className="absolute right-1.5 bottom-1.5 opacity-50" />}
          </>
        )}
        {it.overridden && !dragging && <span className="absolute right-1 bottom-1 w-1.5 h-1.5 rounded-full" style={{ background: ink }} />}
      </div>
      {it.progress !== undefined && !done && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-black/25"><span className="block h-full bg-white/85" style={{ width: `${it.progress * 100}%` }} /></span>}

      {showCheck && (
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCheck(e, ev); }}
          aria-label={done ? 'Done' : 'Mark'}
          className="absolute right-0 top-0 w-[28px] h-[26px] flex items-center justify-center touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="w-[16px] h-[16px] rounded-full flex items-center justify-center" style={{ background: done ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)', border: `1.5px solid ${done ? 'rgba(255,255,255,0.8)' : ink}` }}>
            {done && <Check size={10} strokeWidth={4} className="text-white" />}
          </span>
          {bursting && !reduce && <motion.span className="absolute w-[16px] h-[16px] rounded-full pointer-events-none" style={{ border: `2px solid ${ink}` }} initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.6 }} />}
        </button>
      )}

      {/* Resize handle: drag the bottom edge to change how long it lasts */}
      {editable && height >= 30 && !week && (
        <span onPointerDown={e => onResizeStart(e, ev)} className="absolute left-0 right-0 bottom-0 h-[12px] flex items-end justify-center pb-[2px]" style={{ touchAction: 'none', cursor: 'ns-resize' }}>
          <span className="w-5 h-[3px] rounded-full opacity-40" style={{ background: ink }} />
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

  const [pxPerHour, setPxPerHour] = useState(readZoom);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [peek, setPeek] = useState<CalendarEvent | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const [width, setWidth] = useState(360);
  // "Tareas abultadas": views unbunched for the moment (span + first day), and the dialog step.
  const [looseViews, setLooseViews] = useState<Set<string>>(() => new Set());
  const [bunchStep, setBunchStep] = useState<'closed' | 'choose' | 'confirm'>('closed');

  const scrollerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragCleanup = useRef<(() => void) | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const press = useRef<{ timer: number; x: number; y: number; ev: CalendarEvent } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const zoomRef = useRef(pxPerHour);
  zoomRef.current = pxPerHour;

  useEffect(() => { try { localStorage.setItem(ZOOM_KEY, String(pxPerHour)); } catch { /* storage unavailable */ } }, [pxPerHour]);

  const todayKey = toLocalISOString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // The days on screen: 1 = the selected day, 3 = it and the next two, 7 = the week it belongs to.
  const dayDates = useMemo(() => {
    const start = span === 7 ? startOfWeek(date) : date;
    return Array.from({ length: span }, (_, i) => addDays(start, i));
  }, [date, span]);

  const rawDays = useMemo(() => dayDates.map(d => {
    const key = toLocalISOString(d);
    return { date: d, key, isToday: key === todayKey, items: hideCompleted(itemsFor(d), config) };
  }), [dayDates, itemsFor, config, todayKey]);

  // Overlaps by the clock in the days on screen, and the trims that would undo them.
  const viewKey = `${span}|${rawDays[0].key}`;
  const loose = looseViews.has(viewKey);
  const scan = useMemo(() => scanBunches(rawDays), [rawDays]);
  const trimMap = useMemo(() => new Map(scan.trims.map(t => [trimKey(t.dayKey, t.item.id), t.to])), [scan]);
  const days = useMemo(
    () => (loose ? rawDays.map(d => ({ ...d, items: applyTrims(d.items, d.key, trimMap) })) : rawDays),
    [loose, rawDays, trimMap],
  );
  const bunchedNow = loose ? scan.stuck : scan.bunched;
  const permanentTrims = useMemo(() => scan.trims.filter(t => canTrimForGood(t.item)), [scan]);

  const todayVisible = days.some(d => d.isToday);
  const week = span === 7;
  // The clock is NOT part of the layout: a tick only moves the marker, it never rebuilds the blocks.
  const layout = useMemo(() => buildCalendarLayout({
    days: days.map(d => ({ key: d.key, isToday: d.isToday, items: d.items })),
    config, nowMinutes: null, pxPerHour,
    minBlockPx: week ? 15 : 20,
    titlePx: week ? 15 : 20,
  }), [days, config, pxPerHour, week]);
  const nowY = todayVisible ? nowMinutes * layout.pxPerMin : null;

  const gutter = span === 1 ? 46 : 38;
  const rail = layout.bands.length ? 14 : 0;
  const gridLeft = gutter + rail;
  const colW = Math.max(20, (width - gridLeft) / span);
  const indentStep = week ? Math.max(3, colW * 0.1) : Math.min(16, colW * 0.08);
  const colGap = week ? 1 : 3;
  const reserve = immersive ? DOCK_RESERVE : 16;

  // Going in / out of full screen mounts a NEW scroller (portal): measure that one, not the old one (a stale
  // width is what squeezed every column into slivers).
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => { if (el.clientWidth > 0) setWidth(el.clientWidth); };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [immersive]);

  // Opening a day / changing the span: scroll to where the action is (the clock, else the first block).
  const firstStart = useMemo(() => (layout.events.length ? Math.min(...layout.events.map(e => e.start)) : 7 * 60), [layout.events]);
  const scrollKey = `${days[0].key}|${span}|${immersive}`;
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const anchor = todayVisible ? nowMinutes - 60 : firstStart;
    el.scrollTo({ top: Math.max(0, (anchor - 30) * layout.pxPerMin), behavior: 'auto' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey]);

  // ── Zoom (pinch on the grid, or the buttons in the panel) keeping the same minute under the fingers ────────
  const zoomAround = useCallback((next: number, anchorY?: number) => {
    const el = scrollerRef.current;
    const cur = zoomRef.current;
    const target = clampZoom(next);
    if (!el || target === cur) return;
    const rect = el.getBoundingClientRect();
    const y = anchorY ?? rect.top + rect.height / 2;
    const offset = y - rect.top;
    const minute = (el.scrollTop + offset - 8) / (cur / 60);
    zoomRef.current = target;
    setPxPerHour(target);
    requestAnimationFrame(() => { el.scrollTop = Math.max(0, minute * (target / 60) + 8 - offset); });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let pinch: { dist: number; base: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && !dragRef.current) {
        pinch = { dist: dist(e.touches), base: zoomRef.current };
        if (press.current) { window.clearTimeout(press.current.timer); press.current = null; }
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomAround(pinch.base * (dist(e.touches) / pinch.dist), midY);
    };
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) pinch = null; };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [zoomAround, immersive]);

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
  const spanLabel = (() => { const s = SPANS.find(x => x.id === span)!; return es ? s.es : s.en; })();
  const viewScope = span === 1 ? tr('este día', 'this day') : span === 3 ? tr('estos 3 días', 'these 3 days') : tr('esta semana', 'this week');

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

  // ── Tareas abultadas ─────────────────────────────────────────────────────
  const unbunchForNow = () => {
    setLooseViews(prev => new Set(prev).add(viewKey));
    setBunchStep('closed');
    showToast(tr(`Desagrupadas solo en ${viewScope}`, `Unbunched for ${viewScope} only`), () => setLooseViews(prev => { const n = new Set(prev); n.delete(viewKey); return n; }));
  };
  const rebunch = () => {
    setLooseViews(prev => { const n = new Set(prev); n.delete(viewKey); return n; });
    setBunchStep('closed');
  };
  const unbunchForGood = () => {
    const patches = buildTrimPatches(permanentTrims);
    patches.forEach(onApplyEdit);
    setBunchStep('closed');
    showToast(tr(`${permanentTrims.length} duraciones ajustadas`, `${permanentTrims.length} lengths adjusted`));
  };

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
        const bottomEdge = r.bottom - (immersive ? DOCK_RESERVE - 20 : 0);
        const speed = y2 < r.top + 56 ? -9 : y2 > bottomEdge - 56 ? 9 : 0;
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
  }, [commitDrag, computeDrag, layout.pxPerMin, immersive]);

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
        className={cn('flex items-center gap-1 rounded-md max-w-full cursor-pointer active:scale-95 transition-transform', small ? 'px-1 py-[2px]' : 'pl-2 pr-1 py-1')}
        style={{ background: it.done ? 'rgba(255,255,255,0.05)' : it.overdue ? 'rgba(251,113,133,0.22)' : c, boxShadow: `0 0 0 1px ${SEP}` }}
      >
        {!small && it.overdue && <AlertCircle size={11} className="text-rose-300 shrink-0" />}
        <span className={cn('font-bold truncate', small ? 'text-[8.5px]' : 'text-[11px]', it.done && 'line-through')} style={{ color: it.done ? 'rgba(255,255,255,0.35)' : it.overdue ? '#fecdd3' : textOn(c) }}>{it.title}</span>
        {!small && (
          <button type="button" onClick={e => { e.stopPropagation(); onToggle(e, it, dayKey); }} aria-label={tr('Marcar', 'Mark')} className="w-6 h-6 -my-1 flex items-center justify-center shrink-0 touch-manipulation">
            <span className="w-[15px] h-[15px] rounded-full flex items-center justify-center" style={{ border: `1.5px solid ${it.done || it.overdue ? 'rgba(255,255,255,0.6)' : textOn(c)}` }}>
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
    const dayKey = days[peek.day]?.key ?? days[0].key;
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
    const trimmed = loose && trimMap.has(trimKey(dayKey, it.id));
    return (
      <motion.div
        ref={peekRef}
        key={`peek-${peek.day}-${it.id}`}
        initial={reduce ? false : { opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }}
        className="absolute z-[600] rounded-[22px] border border-white/15 bg-[#10101a]/90 backdrop-blur-2xl p-3.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
        style={{ top, left, width: cardW }}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${c}2e`, color: c }}><Icon size={16} /></span>
          <div className="flex-1 min-w-0">
            <p className={cn('text-[14px] font-black leading-tight', it.done ? 'text-white/45 line-through' : 'text-white')}>{it.title}</p>
            <p className="text-[11px] font-semibold text-white/45 mt-0.5 tabular-nums">{rangeText(peek.start, peek.end, use24h)} · {fmtDuration(peek.end - peek.start)}</p>
          </div>
          <button type="button" onClick={() => setPeek(null)} aria-label={tr('Cerrar', 'Close')} className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-white/60 active:scale-90 transition-transform"><ChevronUp size={14} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="rounded-full px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider" style={{ background: `${c}26`, color: c }}>{kind}</span>
          {imp && <span className="rounded-full px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider" style={{ background: `${IMPORTANCE_COLORS[it.importance - 1]}26`, color: IMPORTANCE_COLORS[it.importance - 1] }}>{imp}</span>}
          {it.subtitle && <span className="rounded-full bg-white/[0.07] px-2 py-[3px] text-[9.5px] font-bold text-white/60 truncate max-w-[180px]">{it.subtitle}</span>}
          {it.overridden && <span className="rounded-full bg-amber-300/15 px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider text-amber-200">{tr('Movido hoy', 'Moved today')}</span>}
          {trimmed && <span className="rounded-full bg-amber-300/15 px-2 py-[3px] text-[9.5px] font-black uppercase tracking-wider text-amber-200">{tr('Acortado en esta vista', 'Shortened in this view')}</span>}
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

  // ── "Tareas abultadas" dialog ────────────────────────────────────────────
  const renderBunchDialog = () => {
    if (bunchStep === 'closed') return null;
    const canFix = scan.trims.length > 0;
    const preview = permanentTrims.slice(0, 6);
    return createPortal(
      <div className="fixed inset-0 z-[2050] flex items-end justify-center" role="dialog" aria-modal="true">
        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setBunchStep('closed')} />
        <motion.div
          className="relative w-full max-w-md mx-2 mb-[max(10px,env(safe-area-inset-bottom))] rounded-[28px] border border-white/12 bg-[#11111a]/95 backdrop-blur-2xl p-4 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
          initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-300/15 text-amber-300 flex items-center justify-center shrink-0"><Layers size={18} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-black text-white leading-tight">{bunchStep === 'confirm' ? tr('¿Estás seguro?', 'Are you sure?') : tr('Tareas abultadas', 'Bunched tasks')}</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">
                {bunchStep === 'confirm'
                  ? tr('Cambiarás de forma permanente la duración de tus hábitos y sub-tareas, y de tus tareas. Ninguna hora de inicio se mueve.', 'You will permanently change how long your habits, sub-tasks and tasks last. No start time moves.')
                  : loose
                    ? tr(`Ya están desagrupadas en ${viewScope}.`, `Already unbunched for ${viewScope}.`)
                    : tr(`${scan.bunched} bloques se pisan en ${viewScope}. ¿Quieres desagruparlos? Solo se acortan las duraciones; ningún horario se mueve.`, `${scan.bunched} blocks overlap in ${viewScope}. Unbunch them? Only lengths get shorter; no time moves.`)}
              </p>
            </div>
            <button type="button" onClick={() => setBunchStep('closed')} aria-label={tr('Cerrar', 'Close')} className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-white/60 active:scale-90 transition-transform"><X size={15} /></button>
          </div>

          {scan.stuck > 0 && bunchStep === 'choose' && (
            <p className="mt-3 rounded-2xl bg-rose-400/10 border border-rose-400/20 px-3 py-2 text-[11.5px] font-semibold text-rose-200 leading-snug">
              {tr(`${scan.stuck} empiezan a la misma hora (o casi): esas no se pueden desagrupar sin mover su horario, así que se quedan igual.`, `${scan.stuck} start at (almost) the same time: those cannot be unbunched without moving them, so they stay as they are.`)}
            </p>
          )}

          {bunchStep === 'confirm' ? (
            <>
              <div className="mt-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] divide-y divide-white/[0.06]">
                {preview.map(t => (
                  <div key={trimKey(t.dayKey, t.item.id)} className="flex items-center gap-2 px-3 py-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: blockColor(t.item) }} />
                    <span className="flex-1 min-w-0 truncate text-[12px] font-bold text-white/85">{t.item.title}</span>
                    <span className="text-[11px] font-black tabular-nums text-white/45 line-through">{t.from}</span>
                    <span className="text-[11px] font-black tabular-nums text-amber-200">{fmtDuration(t.to)}</span>
                  </div>
                ))}
                {permanentTrims.length > preview.length && <p className="px-3 py-2 text-[11px] font-bold text-white/40">{tr(`y ${permanentTrims.length - preview.length} más`, `and ${permanentTrims.length - preview.length} more`)}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button type="button" onClick={() => setBunchStep('choose')} className="h-12 rounded-2xl bg-white/[0.08] text-[13px] font-black text-white active:scale-95 transition-transform">{tr('Cancelar', 'Cancel')}</button>
                <button type="button" onClick={unbunchForGood} className="h-12 rounded-2xl bg-amber-300 text-[13px] font-black text-black active:scale-95 transition-transform">{tr('Sí, cambiar', 'Yes, change')}</button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 mt-4">
              {loose ? (
                <button type="button" onClick={rebunch} className="w-full rounded-2xl bg-white/[0.08] px-4 py-3 text-left active:scale-[0.98] transition-transform">
                  <p className="text-[13.5px] font-black text-white flex items-center gap-2"><Undo2 size={15} /> {tr('Volver a como estaba', 'Put them back')}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">{tr(`Vuelve a mostrar las duraciones reales en ${viewScope}`, `Show the real lengths again in ${viewScope}`)}</p>
                </button>
              ) : (
                <button type="button" disabled={!canFix} onClick={unbunchForNow} className="w-full rounded-2xl bg-white px-4 py-3 text-left active:scale-[0.98] transition-transform disabled:opacity-40">
                  <p className="text-[13.5px] font-black text-black">{tr('De forma temporal', 'For now')}</p>
                  <p className="text-[11px] text-black/55 mt-0.5">{tr(`Solo para ${viewScope}; tus hábitos y tareas no cambian`, `Only for ${viewScope}; your habits and tasks do not change`)}</p>
                </button>
              )}
              <button type="button" disabled={!permanentTrims.length} onClick={() => setBunchStep('confirm')} className="w-full rounded-2xl bg-amber-300/12 border border-amber-300/30 px-4 py-3 text-left active:scale-[0.98] transition-transform disabled:opacity-40">
                <p className="text-[13.5px] font-black text-amber-200">{tr('De forma permanente', 'For good')}</p>
                <p className="text-[11px] text-amber-100/55 mt-0.5">{tr(`Acorta ${permanentTrims.length} duraciones para que terminen donde empieza la siguiente`, `Shortens ${permanentTrims.length} lengths so each ends where the next starts`)}</p>
              </button>
            </div>
          )}
        </motion.div>
      </div>,
      document.body,
    );
  };

  // ── The calendar ─────────────────────────────────────────────────────────
  const body = (
    <div
      className={cn('flex flex-col min-h-0 overflow-hidden', immersive ? 'fixed inset-0 z-[340] bg-[#08080f]' : 'relative rounded-[28px] border border-white/10 bg-[#08080f]/85 backdrop-blur-2xl')}
      style={immersive ? undefined : { height: 'calc(100dvh - 210px)', minHeight: 460 }}
    >
      {/* ambient light */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: 'radial-gradient(60% 30% at 15% 0%, rgba(56,189,248,0.10), transparent 70%), radial-gradient(55% 28% at 100% 4%, rgba(168,85,247,0.09), transparent 70%)' }} />

      {/* Top bar: one compact row; the options panel unfolds below it */}
      <div className={cn('relative shrink-0 px-3 pb-1.5 border-b border-white/[0.07]', immersive ? 'pt-[max(10px,env(safe-area-inset-top))]' : 'pt-2.5')}>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setPanelOpen(v => !v)} className="flex-1 min-w-0 flex items-baseline gap-1.5 text-left active:opacity-70 transition-opacity">
            <span className="text-[21px] font-black leading-none tracking-tight truncate first-letter:uppercase text-white">{title}</span>
            {dayDates[dayDates.length - 1].getFullYear() !== now.getFullYear() && <span className="text-[11px] font-bold text-white/30 tabular-nums shrink-0">{dayDates[dayDates.length - 1].getFullYear()}</span>}
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-300/80 flex items-center gap-0.5 shrink-0">· {spanLabel}<ChevronDown size={11} className={cn('transition-transform duration-200', panelOpen && 'rotate-180')} /></span>
          </button>
          {!todayVisible && (
            <button type="button" onClick={() => { setPeek(null); onDateChange(new Date()); }} className="rounded-full bg-sky-400/15 border border-sky-400/30 px-2.5 h-8 text-[11px] font-black text-sky-300 active:scale-95 transition-transform">
              {tr('Hoy', 'Today')}
            </button>
          )}
          <div className="flex items-center rounded-full bg-white/[0.07] border border-white/[0.1]">
            <button type="button" onClick={() => shift(-1)} aria-label={tr('Anterior', 'Previous')} className="w-8 h-8 flex items-center justify-center text-white/75 active:scale-90 transition-transform"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => shift(1)} aria-label={tr('Siguiente', 'Next')} className="w-8 h-8 flex items-center justify-center text-white/75 active:scale-90 transition-transform"><ChevronRight size={17} /></button>
          </div>
          <button
            type="button" onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen} aria-label={tr('Opciones', 'Options')}
            className={cn('w-8 h-8 rounded-full border flex items-center justify-center active:scale-90 transition-all', panelOpen ? 'bg-white text-black border-white' : 'bg-white/[0.07] border-white/[0.1] text-white/70')}
          >
            <SlidersHorizontal size={14} />
          </button>
          {immersive ? (
            // Exit = leave the calendar for the chronological list of this same Routine section.
            <button
              type="button" onClick={() => { setPeek(null); setPanelOpen(false); onConfig({ view: 'LIST' }); }}
              aria-label={tr('Salir del calendario', 'Exit calendar')}
              className="w-9 h-9 rounded-full bg-white/[0.1] border border-white/[0.14] flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <X size={17} strokeWidth={2.6} />
            </button>
          ) : (
            <button
              type="button" onClick={onToggleImmersive}
              aria-label={tr('Pantalla completa', 'Full screen')}
              className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-2.5 pb-1 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 flex p-[3px] rounded-full bg-white/[0.06] border border-white/[0.08]">
                    <span className="absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full bg-white pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `translateX(${SPANS.findIndex(s => s.id === span) * 100}%)` }} />
                    {SPANS.map(s => (
                      <button key={s.id} type="button" onClick={() => { setPeek(null); onConfig({ calendarSpan: s.id }); setPanelOpen(false); }} className="relative z-10 flex-1 h-7 text-[11.5px] font-black active:scale-95 transition-transform">
                        <span className={cn('transition-colors', span === s.id ? 'text-black' : 'text-white/55')}>{es ? s.es : s.en}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] h-[34px]">
                    <button type="button" onClick={() => zoomAround(zoomRef.current / 1.25)} aria-label={tr('Alejar', 'Zoom out')} className="w-8 h-full flex items-center justify-center text-white/70 active:scale-90 transition-transform"><Minus size={14} /></button>
                    <ZoomIn size={12} className="text-white/35" />
                    <button type="button" onClick={() => zoomAround(zoomRef.current * 1.25)} aria-label={tr('Acercar', 'Zoom in')} className="w-8 h-full flex items-center justify-center text-white/70 active:scale-90 transition-transform"><Plus size={14} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Palette size={12} className="text-white/35 shrink-0" />
                  <div className="relative flex-1 flex p-[3px] rounded-full bg-white/[0.06] border border-white/[0.08]">
                    <span className="absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full bg-gradient-to-r from-sky-300 to-indigo-300 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ transform: `translateX(${COLOR_MODES.findIndex(s => s.id === colorMode) * 100}%)` }} />
                    {COLOR_MODES.map(m => (
                      <button key={m.id} type="button" onClick={() => onConfig({ calendarColor: m.id })} className="relative z-10 flex-1 h-7 text-[11px] font-black active:scale-95 transition-transform">
                        <span className={cn('transition-colors', colorMode === m.id ? 'text-black' : 'text-white/55')}>{es ? m.es : m.en}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {colorMode === 'IMPORTANCE' && (
                  <div className="flex items-center justify-between px-1">
                    {IMPORTANCE_COLORS.map((c, i) => (
                      <span key={c} className="flex items-center gap-1.5 text-[10px] font-bold text-white/55"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{(es ? IMPORTANCE_LABELS.es : IMPORTANCE_LABELS.en)[i]}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 relative">
                  <button type="button" onClick={() => onConfig({ view: 'LIST' })} className="flex-1 h-8 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center gap-1.5 text-[11.5px] font-black text-white/75 active:scale-95 transition-transform"><ListTodo size={13} /> {tr('Lista', 'List')}</button>
                  <button type="button" onClick={onOpenSettings} className="flex-1 h-8 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center gap-1.5 text-[11.5px] font-black text-white/75 active:scale-95 transition-transform"><Settings2 size={13} /> {tr('Ajustes', 'Settings')}</button>
                  <button type="button" onClick={() => setAddOpen(v => !v)} className="flex-1 h-8 rounded-full bg-white text-black flex items-center justify-center gap-1.5 text-[11.5px] font-black active:scale-95 transition-transform"><Plus size={14} strokeWidth={3} /> {tr('Añadir', 'Add')}</button>
                  {addOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
                      <div className="absolute right-0 top-10 z-50 w-52 rounded-[20px] bg-[#14141d]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-1.5">
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
      <div className="relative shrink-0 flex border-b border-white/[0.07] py-1" style={{ paddingLeft: gridLeft }}>
        {days.map(d => (
          <button key={d.key} type="button" onClick={() => { setPeek(null); onDateChange(d.date); if (span > 1) onConfig({ calendarSpan: 1 }); }} className={cn('flex-1 min-w-0 flex items-center justify-center active:scale-95 transition-transform', span === 1 ? 'flex-row gap-2' : 'flex-col gap-0.5')}>
            <span className={cn('font-black uppercase tracking-wider', week ? 'text-[9px]' : 'text-[10px]', d.isToday ? 'text-sky-300' : 'text-white/45')}>
              {span === 1 ? d.date.toLocaleDateString(locale, { weekday: 'long' }) : d.date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 3)}
            </span>
            <span className={cn('rounded-full flex items-center justify-center font-black tabular-nums', week ? 'w-[26px] h-[26px] text-[13px]' : 'w-[30px] h-[30px] text-[15px]', d.isToday ? 'bg-sky-400 text-[#06121f]' : 'text-white/85')}>{d.date.getDate()}</span>
          </button>
        ))}
      </div>

      {/* Items with no hour / overdue tasks: one small pill, unfolds on demand */}
      {stripTotal > 0 && (
        <div className="relative shrink-0 border-b border-white/[0.07]">
          <button type="button" onClick={() => setStripOpen(v => !v)} aria-expanded={stripOpen} className="w-full flex items-center gap-2 py-1 active:bg-white/[0.04] transition-colors" style={{ paddingLeft: 12 }}>
            <Sparkles size={11} className="text-white/40" />
            <span className="text-[10.5px] font-black text-white/55">{stripTotal} {tr('sin hora', 'untimed')}</span>
            {stripOverdue > 0 && <span className="rounded-full bg-rose-400/20 px-2 py-[1px] text-[9.5px] font-black text-rose-300">{stripOverdue} {tr('atrasadas', 'overdue')}</span>}
            <span className="flex-1" />
            <ChevronDown size={13} className={cn('text-white/40 mr-3 transition-transform duration-200', stripOpen && 'rotate-180')} />
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
      <div className="relative flex-1 min-h-0">
        {/* "Tareas abultadas": a small chip top-left whenever blocks really overlap by the clock */}
        <AnimatePresence>
          {(bunchedNow > 0 || loose) && (
            <motion.button
              key="bunch"
              type="button"
              onClick={() => { setPeek(null); setBunchStep('choose'); }}
              initial={reduce ? false : { opacity: 0, y: -6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className={cn('absolute left-2 top-2 z-[700] flex items-center gap-1.5 rounded-full pl-2 pr-2.5 h-7 text-[11px] font-black backdrop-blur-xl shadow-[0_8px_22px_-8px_rgba(0,0,0,0.8)] active:scale-95 transition-transform', bunchedNow > 0 ? 'bg-amber-300/20 border border-amber-300/45 text-amber-200' : 'bg-white/10 border border-white/15 text-white/70')}
            >
              <Layers size={12} />
              {bunchedNow > 0 ? tr('Tareas abultadas', 'Bunched tasks') : tr('Desagrupadas', 'Unbunched')}
              {bunchedNow > 0 && <span className="rounded-full bg-amber-300 text-black px-1.5 text-[9.5px] leading-[15px] tabular-nums">{bunchedNow}</span>}
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={scrollerRef}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          onPointerDown={() => { if (peek) setPeek(null); }}
          onTouchStart={() => { if (panelOpen) setPanelOpen(false); }}
          onWheel={() => { if (panelOpen) setPanelOpen(false); }}
        >
          <div ref={innerRef} className="relative" style={{ height: layout.height + 16 + reserve, marginTop: 8 }}>
            {/* Bands: the way the day was divided in the routine settings */}
            {layout.bands.map((b, i) => {
              const p = PART_STYLE[b.band.part];
              const label = b.band.kind === 'BLOCK' ? formatHourRange(b.band.startHour, b.band.endHour, use24h) : (es ? p.es : p.en);
              return (
                <React.Fragment key={b.band.id}>
                  <div className="absolute pointer-events-none" style={{ top: b.top, height: b.height, left: gutter, right: 0, background: i % 2 === 0 ? `${p.tint}0a` : 'transparent', borderTop: `1px solid ${p.tint}33` }} />
                  <div className="absolute flex items-center justify-center pointer-events-none" style={{ top: b.top + 2, height: b.height - 4, left: gutter + 1, width: rail - 3 }}>
                    <div className="h-full w-full rounded-full flex items-center justify-center overflow-hidden" style={{ background: `${p.tint}1c` }}>
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
                  {h > 0 && !(nowY !== null && Math.abs(nowY - h * pxPerHour) < 9) && <span className="absolute text-right text-[9.5px] font-bold text-white/40 tabular-nums leading-none pr-1.5 whitespace-nowrap" style={{ left: 0, width: gutter, top: h * pxPerHour - 5 }}>{hourLabel(h)}</span>}
                  <div className="absolute right-0 border-t border-white/[0.08]" style={{ left: gutter, top: h * pxPerHour }} />
                  {pxPerHour >= 60 && <div className="absolute right-0 border-t border-dashed border-white/[0.035]" style={{ left: gridLeft, top: h * pxPerHour + pxPerHour / 2 }} />}
                </React.Fragment>
              ))}
              {Array.from({ length: span }, (_, i) => <div key={i} className="absolute top-0 border-l border-white/[0.07]" style={{ left: gridLeft + i * colW, height: layout.height }} />)}
            </div>

            {/* Blocks */}
            <div className="absolute top-0 bottom-0 right-0" style={{ left: gridLeft }}>
              {layout.events.map(ev => {
                const d = drag && drag.ev === ev ? drag : null;
                const start = d ? d.start : ev.start;
                const duration = d ? d.duration : ev.end - ev.start;
                const top = d ? start * layout.pxPerMin : ev.top;
                const height = d ? Math.max(duration * layout.pxPerMin, 20) : ev.height;
                const day = d ? d.day : ev.day;
                const usable = colW - colGap;
                const offset = d ? 0 : Math.min(ev.indent * indentStep, usable * 0.5);
                const rowW = usable - offset;
                const w = d ? usable : rowW / ev.lanes;
                const left = day * colW + offset + (d ? 0 : ev.lane * w);
                const it = ev.item;
                const selected = !!peek && peek.item.id === it.id && peek.day === ev.day;
                return (
                  <Block
                    key={`${ev.day}-${it.id}`}
                    ev={ev} color={blockColor(it)} left={left} width={Math.max(3, w)} top={top} height={height} start={start} duration={duration}
                    z={d ? 500 : selected ? 400 : 10 + ev.order}
                    dragging={!!d} selected={selected}
                    isNext={nextId === it.id && !!days[ev.day]?.isToday}
                    editable={isEditable(it)} showCheck={!week && w >= 88 && height >= 30 && it.kind !== 'PROJECT' && !d && !(it.kind === 'JOURNAL' && !it.reminderId)}
                    span={span} use24h={use24h} bursting={burstId === it.id} reduce={reduce}
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
              <div className="absolute left-0 right-0 pointer-events-none flex items-center z-[450]" style={{ top: nowY - 5, height: 10 }}>
                <span className="shrink-0 text-right pr-1 text-[8.5px] font-black tabular-nums text-rose-300 leading-none whitespace-nowrap" style={{ width: gutter - 2 }}>{formatClock(`${pad(now.getHours())}:${pad(now.getMinutes())}`, !use24h)}</span>
                <span className="relative -ml-[1px] flex w-[10px] h-[10px] items-center justify-center shrink-0">
                  <span className="relative w-[9px] h-[9px] rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)]" />
                </span>
                <span className="flex-1 h-[2px] bg-rose-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute left-3 right-3 z-[800] flex items-center gap-3 rounded-2xl bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
            style={{ bottom: immersive ? `calc(${DOCK_RESERVE - 14}px + env(safe-area-inset-bottom))` : 14 }}
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
          >
            <span className="flex-1 text-[12.5px] font-bold text-white truncate">{toast.text}</span>
            {toast.undo && <button type="button" onClick={() => { toast.undo?.(); setToast(null); }} className="flex items-center gap-1.5 text-[12px] font-black text-sky-300 active:scale-95 transition-transform"><Undo2 size={13} /> {tr('Deshacer', 'Undo')}</button>}
          </motion.div>
        )}
      </AnimatePresence>

      {renderBunchDialog()}

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
