import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, CalendarCheck, ChevronLeft, ChevronRight, Flame, Hexagon, Layers, LineChart, Minus, Plus,
  Target, TrendingUp, Trophy, X, Zap, AreaChart as AreaIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Attribute } from '@/types';
import { DynamicIcon } from '@/components/DynamicIcon';
import { TRAITS_LIST } from '../constants';
import {
  activeStreak, buildTimeline, daysBetween, etaToNextLevel, firstEntryKey, fromKey, heatLevel, keyOf, periodStats, shiftKey, totalXp,
  trendPct, weekdayTotals, type DayPoint,
} from './traitStats';

// ─────────────────────────────────────────────────────────────────────────────
// "VER PROGRESO" — every active trait, in numbers. Pick a trait, a time window and
// a metric; scrub the chart with a finger; set a daily XP goal per trait; see the
// heatmap of the last 13 weeks, your best weekdays and how each trait compares.
// ─────────────────────────────────────────────────────────────────────────────

type Range = '7' | '30' | '90' | 'all';
type Metric = 'total' | 'daily' | 'level';
type ChartStyle = 'area' | 'bars' | 'line';

interface Prefs { range: Range; metric: Metric; style: ChartStyle; avg: boolean; goals: Record<string, number>; trait?: string }

const PREFS_KEY = 'lux_progress_prefs_v1';
const DEFAULT_PREFS: Prefs = { range: '30', metric: 'daily', style: 'area', avg: true, goals: {} };

const loadPrefs = (): Prefs => {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return DEFAULT_PREFS;
    return {
      range: (['7', '30', '90', 'all'] as const).includes(raw.range) ? raw.range : DEFAULT_PREFS.range,
      metric: (['total', 'daily', 'level'] as const).includes(raw.metric) ? raw.metric : DEFAULT_PREFS.metric,
      style: (['area', 'bars', 'line'] as const).includes(raw.style) ? raw.style : DEFAULT_PREFS.style,
      avg: raw.avg !== false,
      goals: raw.goals && typeof raw.goals === 'object' ? raw.goals : {},
      trait: typeof raw.trait === 'string' ? raw.trait : undefined,
    };
  } catch { return DEFAULT_PREFS; }
};

const hexA = (hex: string, a: number) => {
  const h = (hex || '#6366f1').replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  return `rgba(${parseInt(f.slice(0, 2), 16)},${parseInt(f.slice(2, 4), 16)},${parseInt(f.slice(4, 6), 16)},${a})`;
};

const compact = (n: number) => (Math.abs(n) >= 10000 ? `${(n / 1000).toFixed(0)}k` : Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);
const fmt = (n: number, digits = 0) => n.toLocaleString(undefined, { maximumFractionDigits: digits });

interface ViewProps {
  attributes: Attribute[];
  onClose: () => void;
}

export const TraitProgressView: React.FC<ViewProps> = ({ attributes, onClose }) => {
  const { t, i18n } = useTranslation();
  const es = !(i18n.language || 'es').toLowerCase().startsWith('en');
  const T = useCallback((a: string, b: string) => (es ? a : b), [es]);
  const locale = es ? 'es' : 'en';
  const scroller = useRef<HTMLDivElement>(null);

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [offset, setOffset] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs(p => {
      const next = { ...p, ...patch };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const ordered = useMemo(() => {
    const rank = (a: Attribute) => (a.id === 'DISCIPLINA' ? -2 : a.id === 'RESILIENCIA' ? -1 : 0);
    return [...attributes].sort((a, b) => rank(a) - rank(b) || b.level - a.level || (b.xp / (b.maxXp || 1)) - (a.xp / (a.maxXp || 1)));
  }, [attributes]);

  const traitId = ordered.find(a => a.id === prefs.trait)?.id ?? ordered[0]?.id;
  const attr = ordered.find(a => a.id === traitId);

  const meta = useCallback((a: Attribute) => {
    const known = TRAITS_LIST.find(x => x.id === a.id);
    return { color: a.color || known?.color || '#6366f1', Icon: known?.icon as React.ElementType | undefined, label: t(a.label, a.label) };
  }, [t]);

  const today = useMemo(() => keyOf(new Date()), []);
  const rangeDays = prefs.range === 'all' ? 0 : Number(prefs.range);

  // The window shown: `offset` windows back from today (always today's for "all").
  const windowOf = useCallback((a: Attribute, off: number) => {
    if (prefs.range === 'all') {
      const first = firstEntryKey(a);
      const start = first && daysBetween(first, today) < 365 ? first : shiftKey(today, -364);
      return { start: daysBetween(start, today) < 6 ? shiftKey(today, -6) : start, end: today };
    }
    const end = shiftKey(today, -off * rangeDays);
    return { start: shiftKey(end, -(rangeDays - 1)), end };
  }, [prefs.range, rangeDays, today]);

  const data = useMemo(() => {
    if (!attr) return null;
    const w = windowOf(attr, offset);
    const points = buildTimeline(attr, w.start, w.end);
    const prev = prefs.range === 'all' ? null : buildTimeline(attr, shiftKey(w.start, -rangeDays), shiftKey(w.start, -1));
    const goal = prefs.goals[attr.id] || 0;
    const stats = periodStats(points, goal);
    const prevStats = prev ? periodStats(prev) : null;
    const first = firstEntryKey(attr);
    const canGoBack = prefs.range !== 'all' && !!first && w.start > first;
    return { w, points, stats, prevStats, goal, streak: activeStreak(attr, today), eta: etaToNextLevel(attr, today), canGoBack };
  }, [attr, offset, prefs.range, prefs.goals, rangeDays, today, windowOf]);

  // 13 weeks of daily XP for the heatmap (independent of the window).
  const heat = useMemo(() => {
    if (!attr) return null;
    const todayDate = fromKey(today);
    const mondayIdx = (todayDate.getDay() + 6) % 7;
    const start = shiftKey(today, -(mondayIdx + 12 * 7));
    const pts = buildTimeline(attr, start, today);
    const max = pts.reduce((m, p) => Math.max(m, p.gain), 0);
    return { start, pts, max, total: pts.filter(p => p.active).length };
  }, [attr, today]);

  // How every trait did in the same window.
  const compare = useMemo(() => {
    const rows = ordered.map(a => {
      const w = windowOf(a, offset);
      const pts = buildTimeline(a, w.start, w.end);
      const s = periodStats(pts);
      const prev = prefs.range === 'all' ? null : periodStats(buildTimeline(a, shiftKey(w.start, -rangeDays), shiftKey(w.start, -1)));
      return { a, gained: s.gained, trend: prev ? trendPct(s.gained, prev.gained) : null };
    }).sort((x, y) => y.gained - x.gained);
    return { rows, max: rows.reduce((m, r) => Math.max(m, r.gained), 0) };
  }, [ordered, offset, prefs.range, rangeDays, windowOf]);

  useEffect(() => { setScrub(null); }, [traitId, prefs.range, prefs.metric, offset]);
  useEffect(() => { setOffset(0); }, [prefs.range]);

  if (!attr || !data) {
    return (
      <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-4 bg-[#08080c] px-8 text-center">
        <Hexagon className="text-white/20" size={42} />
        <p className="text-sm font-bold text-white/50">{T('Aún no tienes rasgos activos.', 'You have no active traits yet.')}</p>
        <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white/70">{T('Cerrar', 'Close')}</button>
      </div>
    );
  }

  const { color, Icon, label } = meta(attr);
  const { points, stats, prevStats, goal, streak, eta, w } = data;
  const pct = attr.maxXp > 0 ? Math.min(1, attr.xp / attr.maxXp) : 0;
  const lifetime = totalXp(attr.level, attr.xp);
  const dateLabel = (k: string, long = false) => fromKey(k).toLocaleDateString(locale, long ? { weekday: 'long', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
  const periodLabel = prefs.range === 'all' ? T('Todo el historial', 'All history') : `${dateLabel(w.start)} – ${dateLabel(w.end)}`;
  const trend = prevStats ? trendPct(stats.gained, prevStats.gained) : null;
  const suggested = Math.max(5, Math.round((stats.avgPerActiveDay || 10) / 5) * 5);
  const weekdays = weekdayTotals(points);
  const weekdayMax = Math.max(...weekdays);
  const dayNames = es ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayLong = es ? ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'] : ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
  const bestWeekday = weekdayMax > 0 ? weekdays.indexOf(weekdayMax) : -1;

  const pickTrait = (id: string) => { update({ trait: id }); scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <motion.div
      key="progress-view"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', stiffness: 360, damping: 34 }}
      className="fixed inset-0 z-[500] flex flex-col overflow-hidden bg-[#08080c]"
      role="dialog" aria-modal="true" aria-label={T('Progreso de rasgos', 'Trait progress')}
    >
      {/* Ambient glow in the colour of the trait */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px]" style={{ background: `radial-gradient(120% 90% at 50% -10%, ${hexA(color, 0.28)}, transparent 70%)`, transition: 'background 400ms' }} />

      {/* Header */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-5 pb-2" style={{ paddingTop: 'calc(var(--sat, 0px) + 14px)' }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{T('Estadísticas', 'Statistics')}</p>
          <h1 className="text-[24px] font-black leading-tight tracking-tight text-white">{T('Tu progreso', 'Your progress')}</h1>
        </div>
        <button onClick={onClose} aria-label={T('Cerrar', 'Close')} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60 active:scale-95 transition-transform">
          <X size={19} />
        </button>
      </div>

      <div ref={scroller} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar" style={{ paddingBottom: 'calc(var(--sab, 0px) + 28px)' }}>
        {/* Trait selector: every active trait */}
        <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-5 py-2" role="tablist" aria-label={T('Rasgos', 'Traits')}>
          {ordered.map(a => {
            const m = meta(a);
            const on = a.id === attr.id;
            return (
              <button
                key={a.id} role="tab" aria-selected={on} onClick={() => pickTrait(a.id)}
                className="flex shrink-0 snap-start items-center gap-2 rounded-2xl border py-1.5 pl-1.5 pr-3 text-left transition-colors active:scale-95"
                style={on ? { background: hexA(m.color, 0.2), borderColor: hexA(m.color, 0.65) } : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: on ? m.color : hexA(m.color, 0.18), color: on ? '#fff' : m.color }}>
                  {m.Icon ? <m.Icon size={16} strokeWidth={2.4} /> : <DynamicIcon icon={a.iconName} size={16} fallback="◆" />}
                </span>
                <span className="leading-tight">
                  <span className={`block text-[12.5px] font-extrabold ${on ? 'text-white' : 'text-white/60'}`}>{m.label}</span>
                  <span className="block text-[10px] font-bold tabular-nums" style={{ color: on ? m.color : 'rgba(255,255,255,0.35)' }}>{T('Nv', 'Lv')} {a.level}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Hero: level ring, XP, pace */}
        <section className="mx-5 mt-2 flex items-center gap-4 rounded-[28px] border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="relative h-[96px] w-[96px] shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
              <motion.circle key={attr.id} cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.015, pct) }} transition={{ duration: 0.9, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 6px ${hexA(color, 0.7)})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{T('Nivel', 'Level')}</span>
              <span className="text-[30px] font-black leading-none tabular-nums text-white">{attr.level}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: hexA(color, 0.2), color }}>
                {Icon ? <Icon size={14} strokeWidth={2.5} /> : <DynamicIcon icon={attr.iconName} size={14} fallback="◆" />}
              </span>
              <h2 className="truncate text-[17px] font-black text-white">{label}</h2>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-[11px] font-bold tabular-nums">
              <span className="text-white/80">{fmt(attr.xp)} <span className="text-white/35">/ {fmt(attr.maxXp)} XP</span></span>
              <span style={{ color }}>{Math.round(pct * 100)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div key={attr.id} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${hexA(color, 0.7)}, ${color})` }}
                initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Chip icon={<Zap size={10} />} text={`${fmt(Math.max(0, attr.maxXp - attr.xp))} ${T('XP para subir', 'XP to level up')}`} />
              {eta !== null && <Chip icon={<TrendingUp size={10} />} text={eta === 1 ? T('≈ 1 día', '≈ 1 day') : T(`≈ ${eta} días`, `≈ ${eta} days`)} accent={color} />}
              <Chip icon={<Flame size={10} />} text={streak > 0 ? T(`${streak} d seguidos`, `${streak} d in a row`) : T('Sin racha', 'No streak')} accent={streak > 0 ? '#f97316' : undefined} />
            </div>
          </div>
        </section>
        <p className="mx-6 mt-1.5 text-[10.5px] font-semibold text-white/30">{T('XP total acumulada', 'Lifetime XP')}: <span className="tabular-nums text-white/55">{fmt(lifetime)}</span></p>

        {/* Time controls */}
        <section className="mx-5 mt-4">
          <div className="flex gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1" role="tablist" aria-label={T('Rango', 'Range')}>
            {([['7', T('7 días', '7 days')], ['30', T('30 días', '30 days')], ['90', T('90 días', '90 days')], ['all', T('Todo', 'All')]] as [Range, string][]).map(([r, l]) => (
              <button key={r} role="tab" aria-selected={prefs.range === r} onClick={() => update({ range: r })}
                className={`h-9 flex-1 rounded-xl text-[12px] font-extrabold transition-colors ${prefs.range === r ? 'text-black' : 'text-white/45'}`}
                style={prefs.range === r ? { background: color } : undefined}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button onClick={() => setOffset(o => o + 1)} disabled={!data.canGoBack} aria-label={T('Periodo anterior', 'Previous period')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 disabled:opacity-25 active:scale-95 transition-transform">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-[13px] font-extrabold text-white">{periodLabel}</p>
              {offset > 0 && prefs.range !== 'all' && (
                <button onClick={() => setOffset(0)} className="text-[10.5px] font-bold" style={{ color }}>{T('Volver a hoy', 'Back to today')}</button>
              )}
            </div>
            <button onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0 || prefs.range === 'all'} aria-label={T('Periodo siguiente', 'Next period')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 disabled:opacity-25 active:scale-95 transition-transform">
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        {/* KPIs */}
        <section className="mx-5 mt-3 grid grid-cols-3 gap-2">
          <Kpi color={color} icon={<Zap size={12} />} label={T('XP ganada', 'XP gained')} value={compact(stats.gained)}
            foot={trend === null ? (prefs.range === 'all' ? '' : T('sin base', 'no base')) : <Trend pct={trend} />} />
          <Kpi color={color} icon={<LineChart size={12} />} label={T('Media/día', 'Avg/day')} value={fmt(stats.avgPerDay, 1)} foot={`${fmt(stats.avgPerActiveDay, 1)} ${T('por día activo', 'per active day')}`} />
          <Kpi color={color} icon={<Trophy size={12} />} label={T('Mejor día', 'Best day')} value={stats.best ? `+${fmt(stats.best.xp)}` : '–'} foot={stats.best ? dateLabel(stats.best.date) : ''} />
          <Kpi color={color} icon={<CalendarCheck size={12} />} label={T('Activos', 'Active')} value={`${stats.activeDays}`} foot={`${T('de', 'of')} ${stats.days} · ${Math.round((stats.activeDays / Math.max(1, stats.days)) * 100)}%`} />
          <Kpi color={color} icon={<Flame size={12} />} label={T('Racha', 'Streak')} value={`${stats.longestStreak}`} foot={T('mejor, en días', 'best, in days')} />
          <Kpi color={color} icon={<Layers size={12} />} label={T('Niveles', 'Levels')} value={stats.levelsGained > 0 ? `+${stats.levelsGained}` : '0'} foot={T('en el periodo', 'this period')} />
        </section>

        {/* Chart */}
        <section className="mx-5 mt-4 rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded-xl bg-white/[0.05] p-0.5" role="tablist" aria-label={T('Métrica', 'Metric')}>
              {([['daily', T('Diario', 'Daily')], ['total', T('Acumulado', 'Total')], ['level', T('Nivel', 'Level')]] as [Metric, string][]).map(([m, l]) => (
                <button key={m} role="tab" aria-selected={prefs.metric === m} onClick={() => update({ metric: m })}
                  className={`h-8 rounded-[10px] px-2.5 text-[11.5px] font-extrabold transition-colors ${prefs.metric === m ? 'bg-white/15 text-white' : 'text-white/40'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {([['area', AreaIcon, T('Área', 'Area')], ['bars', BarChart3, T('Barras', 'Bars')], ['line', LineChart, T('Línea', 'Line')]] as [ChartStyle, React.ElementType, string][]).map(([s, I, l]) => (
                <button key={s} onClick={() => update({ style: s })} aria-label={l} aria-pressed={prefs.style === s}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${prefs.style === s ? 'bg-white/15 text-white' : 'text-white/35'}`}>
                  <I size={15} />
                </button>
              ))}
            </div>
          </div>

          <ChartReadout points={points} metric={prefs.metric} scrub={scrub} color={color} dateLabel={dateLabel} T={T} />
          <TrendChart
            key={`${attr.id}-${prefs.range}-${offset}`}
            points={points} metric={prefs.metric} style={prefs.metric === 'daily' && prefs.style === 'line' ? 'line' : prefs.style}
            color={color} avg={prefs.avg && prefs.metric === 'daily' ? stats.avgPerDay : null} goal={prefs.metric === 'daily' && goal > 0 ? goal : null}
            scrub={scrub} onScrub={setScrub} dateLabel={dateLabel}
          />
          <div className="mt-2 flex items-center justify-between">
            <button onClick={() => update({ avg: !prefs.avg })} disabled={prefs.metric !== 'daily'}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors disabled:opacity-30 ${prefs.avg ? 'text-white' : 'text-white/40'}`}
              style={prefs.avg ? { borderColor: hexA(color, 0.5), background: hexA(color, 0.14) } : { borderColor: 'rgba(255,255,255,0.1)' }}>
              <span className="h-px w-3 border-t border-dashed" style={{ borderColor: color }} /> {T('Media', 'Average')}
            </button>
            <span className="text-[10.5px] font-semibold text-white/30">{T('Desliza sobre la gráfica', 'Slide over the chart')}</span>
          </div>
        </section>

        {/* Daily goal */}
        <section className="mx-5 mt-4 rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: hexA(color, 0.18), color }}><Target size={17} /></span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-black text-white">{T('Meta diaria de XP', 'Daily XP goal')}</p>
                <p className="text-[11px] font-semibold text-white/40">
                  {goal > 0 ? T(`Cumpliste ${stats.goalHits} de ${stats.days} días`, `You hit it ${stats.goalHits} of ${stats.days} days`) : T('Ponte un objetivo para este rasgo', 'Set a target for this trait')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => update({ goals: { ...prefs.goals, [attr.id]: Math.max(0, goal - 5) } })} disabled={goal <= 0} aria-label={T('Bajar meta', 'Lower goal')}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 disabled:opacity-25 active:scale-95 transition-transform"><Minus size={15} /></button>
              <span className="w-11 text-center text-[16px] font-black tabular-nums text-white">{goal > 0 ? goal : '–'}</span>
              <button onClick={() => update({ goals: { ...prefs.goals, [attr.id]: Math.min(500, (goal || suggested - 5) + 5) } })} aria-label={T('Subir meta', 'Raise goal')}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70 active:scale-95 transition-transform"><Plus size={15} /></button>
            </div>
          </div>
          {goal > 0 ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stats.goalHits / Math.max(1, stats.days)) * 100)}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-[3px]" aria-hidden>
                {points.slice(-42).map(p => (
                  <span key={p.date} className="h-2.5 w-2.5 rounded-[3px]" title={`${dateLabel(p.date)} · ${p.gain} XP`}
                    style={{ background: p.gain >= goal ? color : p.gain > 0 ? hexA(color, 0.3) : 'rgba(255,255,255,0.07)' }} />
                ))}
              </div>
            </>
          ) : (
            <button onClick={() => update({ goals: { ...prefs.goals, [attr.id]: suggested } })} className="mt-3 w-full rounded-xl border border-dashed py-2 text-[12px] font-extrabold" style={{ borderColor: hexA(color, 0.5), color }}>
              {T(`Usar la sugerida: ${suggested} XP al día`, `Use the suggested ${suggested} XP a day`)}
            </button>
          )}
        </section>

        {/* Heatmap */}
        {heat && (
          <section className="mx-5 mt-4 rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="text-[13.5px] font-black text-white">{T('Últimas 13 semanas', 'Last 13 weeks')}</p>
              <span className="text-[11px] font-bold tabular-nums text-white/40">{heat.total} {T('días activos', 'active days')}</span>
            </div>
            <div className="flex gap-2">
              <div className="grid shrink-0 grid-rows-7 gap-[3px] pt-px text-[8.5px] font-bold text-white/30" aria-hidden>
                {dayNames.map((d, i) => <span key={d} className="flex h-[17px] items-center">{i % 2 === 0 ? d.slice(0, es ? 1 : 1) : ''}</span>)}
              </div>
              <div className="grid min-w-0 flex-1 gap-[3px]" style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 17px)', gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                {Array.from({ length: 91 }, (_, i) => {
                  const k = shiftKey(heat.start, i);
                  const p = heat.pts[i];
                  if (!p || k > today) return <span key={k} />;
                  const lv = heatLevel(p.gain, heat.max);
                  return <span key={k} title={`${dateLabel(k)} · ${p.gain} XP`} className="rounded-[4px]"
                    style={{ background: lv === 0 ? 'rgba(255,255,255,0.06)' : hexA(color, [0, 0.25, 0.5, 0.75, 1][lv]), outline: k === today ? `1.5px solid ${hexA(color, 0.9)}` : undefined }} />;
                })}
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-end gap-1 text-[9.5px] font-bold text-white/30">
              {T('Menos', 'Less')}
              {[0, 1, 2, 3, 4].map(l => <span key={l} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: l === 0 ? 'rgba(255,255,255,0.06)' : hexA(color, [0, 0.25, 0.5, 0.75, 1][l]) }} />)}
              {T('Más', 'More')}
            </div>
          </section>
        )}

        {/* Weekday pattern */}
        <section className="mx-5 mt-4 rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-4">
          <p className="text-[13.5px] font-black text-white">{T('Tus días fuertes', 'Your strong days')}</p>
          <p className="text-[11px] font-semibold text-white/40">
            {bestWeekday >= 0 ? T(`Ganas más los ${dayLong[bestWeekday]}.`, `You gain most on ${dayLong[bestWeekday]}.`) : T('Aún no hay datos en este periodo.', 'No data in this period yet.')}
          </p>
          <div className="mt-3 flex h-[84px] items-end gap-2">
            {weekdays.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <motion.div className="w-full rounded-[7px]" initial={{ height: 0 }} animate={{ height: weekdayMax > 0 ? Math.max(4, (v / weekdayMax) * 62) : 4 }} transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                  style={{ background: i === bestWeekday ? color : hexA(color, 0.28) }} />
                <span className={`text-[10px] font-extrabold ${i === bestWeekday ? 'text-white' : 'text-white/35'}`}>{dayNames[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Every trait compared */}
        <section className="mx-5 mt-4 rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[13.5px] font-black text-white">{T('Comparar rasgos', 'Compare traits')}</p>
            <span className="text-[10.5px] font-bold text-white/35">{periodLabel}</span>
          </div>
          <div className="space-y-2.5">
            {compare.rows.map(({ a, gained, trend: tr }, i) => {
              const m = meta(a);
              const on = a.id === attr.id;
              return (
                <button key={a.id} onClick={() => pickTrait(a.id)} className="flex w-full items-center gap-2.5 text-left active:opacity-70">
                  <span className="w-4 text-center text-[10.5px] font-black tabular-nums text-white/30">{i + 1}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: hexA(m.color, on ? 0.35 : 0.16), color: m.color }}>
                    {m.Icon ? <m.Icon size={15} strokeWidth={2.4} /> : <DynamicIcon icon={a.iconName} size={15} fallback="◆" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[12.5px] font-extrabold ${on ? 'text-white' : 'text-white/70'}`}>{m.label}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-black tabular-nums text-white/80">
                        {fmt(gained)} XP {tr !== null && <Trend pct={tr} small />}
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <motion.span className="block h-full rounded-full" style={{ background: m.color }} initial={{ width: 0 }}
                        animate={{ width: `${compare.max > 0 ? Math.max(2, (gained / compare.max) * 100) : 0}%` }} transition={{ duration: 0.6, delay: i * 0.04 }} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sub-traits */}
        {(attr.subTraits?.length || 0) > 0 && (
          <section className="mx-5 mt-4 rounded-[26px] border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="mb-3 text-[13.5px] font-black text-white">{T('Sub-rasgos de', 'Sub-traits of')} {label}</p>
            <div className="space-y-3">
              {attr.subTraits!.map(st => (
                <div key={st.id} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: hexA(color, 0.16), color }}>
                    <DynamicIcon icon={st.iconName} size={15} fallback="◆" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="truncate text-[12.5px] font-extrabold text-white/80">{st.name}</span>
                      <span className="text-[11px] font-black tabular-nums" style={{ color }}>{T('Nv', 'Lv')} {st.level}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full" style={{ width: `${st.maxXp > 0 ? Math.min(100, (st.xp / st.maxXp) * 100) : 0}%`, background: color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="px-5 pt-5">
          <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-[14px] font-bold text-white/60 active:scale-[0.99] transition-transform">
            {T('Cerrar', 'Close')}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── small pieces ──────────────────────────────────────────────────────────────

const Chip: React.FC<{ icon: React.ReactNode; text: string; accent?: string }> = ({ icon, text, accent }) => (
  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-extrabold tabular-nums"
    style={accent ? { background: hexA(accent, 0.16), color: accent } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
    {icon}{text}
  </span>
);

const Trend: React.FC<{ pct: number; small?: boolean }> = ({ pct, small }) => {
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-black tabular-nums ${small ? 'text-[10px]' : 'text-[10.5px]'} ${flat ? 'text-white/40' : up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {flat ? <Minus size={small ? 9 : 10} /> : up ? <ArrowUpRight size={small ? 10 : 11} /> : <ArrowDownRight size={small ? 10 : 11} />}
      {Math.abs(pct)}%
    </span>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; foot?: React.ReactNode; color: string }> = ({ icon, label, value, foot, color }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
    className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
    <div className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-white/40"><span style={{ color }}>{icon}</span><span className="truncate">{label}</span></div>
    <div className="mt-1 text-[22px] font-black leading-none tabular-nums text-white">{value}</div>
    <div className="mt-1 min-h-[14px] truncate text-[10px] font-semibold text-white/35">{foot}</div>
  </motion.div>
);

const metricValue = (p: DayPoint, metric: Metric) => (metric === 'daily' ? Math.max(0, p.gain) : metric === 'level' ? p.level : p.total);

const ChartReadout: React.FC<{ points: DayPoint[]; metric: Metric; scrub: number | null; color: string; dateLabel: (k: string, long?: boolean) => string; T: (a: string, b: string) => string }> = ({ points, metric, scrub, color, dateLabel, T }) => {
  const p = points[scrub ?? points.length - 1];
  if (!p) return <div className="h-[46px]" />;
  const v = metricValue(p, metric);
  const unit = metric === 'level' ? '' : ' XP';
  return (
    <div className="mt-3 flex items-end justify-between px-1">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{scrub === null ? T('Hoy', 'Today') : dateLabel(p.date, true)}</p>
        <p className="text-[26px] font-black leading-tight tabular-nums text-white">
          {metric === 'daily' && v > 0 ? '+' : ''}{fmt(v)}<span className="ml-1 text-[12px] font-bold text-white/40">{unit || T('nivel', 'level')}</span>
        </p>
      </div>
      {metric !== 'level' && (
        <div className="text-right text-[10.5px] font-bold text-white/40">
          <p>{T('Nivel', 'Level')} <span style={{ color }}>{p.level}</span></p>
          {metric === 'daily' && <p className="tabular-nums">{fmt(p.total)} XP {T('en total', 'total')}</p>}
        </div>
      )}
    </div>
  );
};

interface ChartProps {
  points: DayPoint[]; metric: Metric; style: ChartStyle; color: string; avg: number | null; goal: number | null;
  scrub: number | null; onScrub: (i: number | null) => void; dateLabel: (k: string) => string;
}

const TrendChart: React.FC<ChartProps> = ({ points, metric, style, color, avg, goal, scrub, onScrub, dateLabel }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, Math.round(el.clientWidth))));
    ro.observe(el);
    setWidth(Math.max(200, Math.round(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  const H = 176;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = points.length;
  const values = useMemo(() => points.map(p => metricValue(p, metric)), [points, metric]);
  const bars = style === 'bars';

  const dom = useMemo(() => {
    let lo = Math.min(...values);
    let hi = Math.max(...values, goal || 0, avg || 0);
    if (metric === 'daily' || bars) lo = 0;
    if (hi === lo) hi = lo + (metric === 'level' ? 1 : 10);
    if (metric === 'level') { lo = Math.floor(lo); hi = Math.ceil(hi); if (hi === lo) hi = lo + 1; }
    const padY = (hi - lo) * (metric === 'daily' || bars ? 0.08 : 0.12);
    return { lo: metric === 'daily' || bars ? 0 : lo - padY, hi: hi + padY };
  }, [values, metric, bars, goal, avg]);

  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const slot = iw / Math.max(1, n);
  const bx = (i: number) => pad.l + i * slot + slot / 2;
  const y = (v: number) => pad.t + ih - ((v - dom.lo) / (dom.hi - dom.lo)) * ih;
  const px = (i: number) => (bars ? bx(i) : x(i));

  const line = useMemo(() => {
    if (metric === 'level') return values.map((v, i) => (i === 0 ? `M ${x(0)} ${y(v)}` : `H ${x(i)} V ${y(v)}`)).join(' ');
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, metric, width, dom]);
  const area = `${line} L ${x(n - 1)} ${y(dom.lo)} L ${x(0)} ${y(dom.lo)} Z`;

  const ticks = useMemo(() => {
    const out: number[] = [];
    const steps = 3;
    for (let i = 0; i <= steps; i++) out.push(dom.lo + ((dom.hi - dom.lo) * i) / steps);
    return out;
  }, [dom]);

  const idxFromEvent = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const rel = (e.clientX - r.left - pad.l) / iw;
    return Math.max(0, Math.min(n - 1, bars ? Math.floor(rel * n) : Math.round(rel * (n - 1))));
  };

  const maxVal = Math.max(...values);
  const gid = `tg-${color.replace('#', '')}`;
  const active = scrub ?? n - 1;
  const xLabels = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];

  return (
    <div ref={wrap} className="mt-1 w-full select-none">
      <svg width={width} height={H} role="img" aria-label="chart" style={{ touchAction: 'pan-y', display: 'block' }}
        onPointerDown={e => onScrub(idxFromEvent(e))} onPointerMove={e => onScrub(idxFromEvent(e))}
        onPointerLeave={() => onScrub(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {ticks.map((tv, i) => (
          <g key={i}>
            <line x1={pad.l} x2={width - pad.r} y1={y(tv)} y2={y(tv)} stroke="rgba(255,255,255,0.06)" strokeDasharray={i === 0 ? undefined : '3 4'} />
            <text x={pad.l - 6} y={y(tv) + 3} textAnchor="end" fontSize={9} fontWeight={700} fill="rgba(255,255,255,0.32)">{metric === 'level' ? Math.round(tv) : compact(tv)}</text>
          </g>
        ))}

        {bars ? (
          values.map((v, i) => {
            const bw = Math.max(2, Math.min(18, slot * 0.68));
            const h = v > 0 ? Math.max(2, y(dom.lo) - y(v)) : 0;
            return (
              <motion.rect key={i} x={bx(i) - bw / 2} width={bw} rx={Math.min(4, bw / 2)}
                initial={{ height: 0, y: y(dom.lo) }} animate={{ height: h, y: y(dom.lo) - h }} transition={{ duration: 0.45, delay: Math.min(0.5, i * 0.008) }}
                fill={i === active ? '#fff' : v === maxVal && v > 0 ? color : hexA(color, v > 0 ? 0.55 : 0.1)} />
            );
          })
        ) : (
          <>
            {style === 'area' && <motion.path d={area} fill={`url(#${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />}
            <motion.path d={line} fill="none" stroke={color} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 5px ${hexA(color, 0.55)})` }} />
          </>
        )}

        {avg !== null && avg > 0 && (
          <g>
            <line x1={pad.l} x2={width - pad.r} y1={y(avg)} y2={y(avg)} stroke={color} strokeOpacity={0.8} strokeDasharray="5 4" />
            <text x={width - pad.r} y={y(avg) - 4} textAnchor="end" fontSize={9} fontWeight={800} fill={color}>⌀ {fmt(avg, 1)}</text>
          </g>
        )}
        {goal !== null && (
          <g>
            <line x1={pad.l} x2={width - pad.r} y1={y(goal)} y2={y(goal)} stroke="#fbbf24" strokeOpacity={0.85} strokeDasharray="2 4" />
            <text x={pad.l + 2} y={y(goal) - 4} fontSize={9} fontWeight={800} fill="#fbbf24">🎯 {goal}</text>
          </g>
        )}

        {n > 0 && (
          <g pointerEvents="none">
            <line x1={px(active)} x2={px(active)} y1={pad.t} y2={pad.t + ih} stroke="rgba(255,255,255,0.28)" strokeDasharray="2 3" />
            {!bars && <circle cx={px(active)} cy={y(values[active] ?? 0)} r={4.5} fill={color} stroke="#fff" strokeWidth={2} />}
          </g>
        )}

        {xLabels.map((i, k) => (
          <text key={i} x={px(i)} y={H - 6} fontSize={9} fontWeight={700} fill="rgba(255,255,255,0.32)"
            textAnchor={n <= 1 ? 'middle' : k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle'}>
            {dateLabel(points[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default TraitProgressView;
