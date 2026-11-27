// Deluxe benefits as a story-style showcase: each benefit is a live mini motion-graphic, they
// auto-advance with progress bars, tap left/right or swipe to move. Below, an animated
// "Free vs Deluxe" table with the REAL limits (config/limits.ts) — nothing invented.

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, CalendarDays, Check, Crown, Flame, Infinity as InfinityIcon, LayoutGrid, Palette, Sparkles, Users, X } from 'lucide-react';
import { FREE_LIMITS } from '../../../config/limits';
import { tr, type FL } from './FunnelParts';

type Slide = { id: string; icon: typeof Flame; color: string; title: [string, string]; desc: [string, string]; Art: (p: { L: (es: string, en: string) => string }) => JSX.Element };

// ── Mini motion graphics ──

const FlameArt = () => (
  <div className="relative grid h-full place-items-center">
    {[0, 1, 2].map(i => (
      <motion.span key={i} className="absolute rounded-full border border-orange-300/30"
        style={{ width: 70 + i * 40, height: 70 + i * 40 }}
        animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }} />
    ))}
    <motion.div animate={{ scale: [0.6, 1, 1.25, 1.25], y: [10, 0, -4, -4] }} transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.35, 0.7, 1] }}
      className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600 shadow-[0_0_40px_rgba(249,115,22,0.7)]">
      <Flame size={40} className="text-white" fill="currentColor" />
    </motion.div>
    <motion.span className="absolute right-6 top-4 rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-orange-600"
      animate={{ scale: [0, 1.2, 1, 1, 0], rotate: [-20, 8, 0, 0, 0] }} transition={{ duration: 3.2, repeat: Infinity, times: [0.3, 0.42, 0.5, 0.9, 1] }}>
      🏅 60
    </motion.span>
    <div className="absolute bottom-3 left-6 right-6 h-1.5 overflow-hidden rounded-full bg-white/10">
      <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-500" style={{ originX: 0 }}
        animate={{ scaleX: [0, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  </div>
);

const RoutineArt = () => {
  const blocks = [
    { top: 8, h: 22, c: '#38bdf8', w: 'Gym' }, { top: 36, h: 30, c: '#a78bfa', w: 'Deep work' },
    { top: 72, h: 18, c: '#34d399', w: 'Leer' }, { top: 96, h: 24, c: '#f472b6', w: 'Proyecto' },
  ];
  return (
    <div className="relative mx-auto h-full w-[78%]">
      {[0, 1, 2, 3, 4].map(i => <div key={i} className="absolute left-0 right-0 border-t border-white/[0.07]" style={{ top: 8 + i * 28 }} />)}
      {blocks.map((b, i) => (
        <motion.div key={i} className="absolute left-8 right-2 flex items-center rounded-lg px-2 text-[10.5px] font-black text-black/70"
          style={{ top: b.top, height: b.h, background: b.c }}
          animate={{ x: [80, 0, 0, 80], opacity: [0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.25, times: [0, 0.2, 0.85, 1] }}>
          {b.w}
        </motion.div>
      ))}
      <motion.div className="absolute left-0 right-0 flex items-center" animate={{ top: [10, 120] }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" /><span className="h-[2px] flex-1 bg-rose-500" />
      </motion.div>
    </div>
  );
};

const WidgetArt = () => (
  <div className="relative mx-auto h-full w-[120px] rounded-[22px] border-2 border-white/15 bg-gradient-to-b from-[#1b1b3a] to-[#0b0b18] p-2">
    <div className="grid grid-cols-2 gap-1.5">
      {['#38bdf8', '#a78bfa', '#34d399', '#f59e0b'].map((c, i) => (
        <motion.div key={c} className={`rounded-lg ${i === 0 ? 'col-span-2 h-9' : 'h-12'}`} style={{ background: `${c}33`, border: `1px solid ${c}88` }}
          animate={{ scale: [0, 1.12, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.3, times: [0, 0.12, 0.2, 0.85, 1] }}>
          <div className="m-1.5 h-1.5 w-2/3 rounded bg-white/50" /><div className="mx-1.5 h-1 w-1/2 rounded bg-white/25" />
        </motion.div>
      ))}
    </div>
  </div>
);

const UnlimitedArt = ({ L }: { L: (es: string, en: string) => string }) => {
  const rows: [string, number][] = [[L('Hábitos', 'Habits'), FREE_LIMITS.HABITS], [L('Proyectos', 'Projects'), FREE_LIMITS.PROJECTS], [L('Estrategias', 'Strategies'), FREE_LIMITS.ACTIVE_STRATEGIES]];
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-4">
      {rows.map(([n, free], i) => (
        <div key={n} className="flex items-center gap-3">
          <span className="w-20 text-[12px] font-bold text-white/60">{n}</span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ originX: 0, width: '100%' }}
              animate={{ scaleX: [0.18, 0.18, 1] }} transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.8, delay: i * 0.2, times: [0, 0.4, 1] }} />
          </div>
          <span className="relative grid h-6 w-8 place-items-center">
            <motion.span className="absolute text-[15px] font-black" animate={{ opacity: [1, 1, 0, 0] }} transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.2, times: [0, 0.45, 0.5, 1] }}>{free}</motion.span>
            <motion.span className="absolute text-fuchsia-300"
              animate={{ opacity: [0, 0, 1, 1], scale: [0.5, 0.5, 1.2, 1] }} transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.2, times: [0, 0.48, 0.6, 1] }}>
              <InfinityIcon size={20} />
            </motion.span>
          </span>
        </div>
      ))}
    </div>
  );
};

const StatsArt = ({ L }: { L: (es: string, en: string) => string }) => {
  const ranges = [L('Semana', 'Week'), L('Mes', 'Month'), L('Año', 'Year'), 'Total'];
  const [r, setR] = useState(0);
  useEffect(() => { const id = setInterval(() => setR(x => (x + 1) % ranges.length), 1100); return () => clearInterval(id); }, [ranges.length]);
  const bars = [0.3, 0.55, 0.42, 0.7, 0.62, 0.85, 0.95];
  return (
    <div className="flex h-full flex-col px-5 pt-2">
      <div className="flex gap-1">
        {ranges.map((x, i) => <span key={x} className={`rounded-full px-2 py-0.5 text-[10px] font-black transition-colors ${i === r ? 'bg-cyan-400 text-black' : 'bg-white/[0.06] text-white/40'}`}>{x}</span>)}
      </div>
      <div className="mt-3 flex flex-1 items-end gap-1.5 pb-2">
        {bars.map((b, i) => (
          <motion.div key={`${r}-${i}`} className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-300" style={{ originY: 1, height: `${b * 100}%` }}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 20 }} />
        ))}
      </div>
    </div>
  );
};

const ColorsArt = () => {
  const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#22d3ee', '#34d399'];
  return (
    <div className="relative grid h-full place-items-center">
      <motion.svg viewBox="0 0 100 90" width="120" height="108" animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        <motion.polygon points="50,6 94,84 6,84" fill="none" strokeWidth="3"
          animate={{ stroke: colors }} transition={{ duration: 4, repeat: Infinity }} />
        <motion.polygon points="50,30 72,72 28,72" animate={{ fill: colors.map(c => `${c}66`) }} transition={{ duration: 4, repeat: Infinity }} />
      </motion.svg>
      <div className="absolute bottom-2 flex gap-1.5">
        {colors.map((c, i) => (
          <motion.span key={c} className="h-4 w-4 rounded-full ring-2 ring-white/20" style={{ background: c }}
            animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.4, delay: i * 0.6 }} />
        ))}
      </div>
    </div>
  );
};

const BadgeArt = ({ L }: { L: (es: string, en: string) => string }) => (
  <div className="grid h-full place-items-center px-4">
    <div className="relative w-full max-w-[230px] overflow-hidden rounded-2xl border border-amber-300/40 bg-white/[0.05] p-3">
      <motion.span aria-hidden className="absolute inset-y-0 w-1/3" style={{ background: 'linear-gradient(100deg,transparent,rgba(253,230,138,0.25),transparent)' }}
        animate={{ x: ['-150%', '400%'] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1 }} />
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 text-[15px] font-black">TÚ</span>
        <div className="min-w-0">
          <div className="text-[13px] font-black">{L('Tu perfil', 'Your profile')}</div>
          <motion.span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-2 py-0.5 text-[9.5px] font-black text-black"
            animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <Crown size={10} /> DELUXE
          </motion.span>
        </div>
      </div>
      <div className="mt-2 text-[11px] font-semibold text-white/45">{L('Tus amigos lo ven en su lista', 'Your friends see it on their list')}</div>
    </div>
  </div>
);

const SLIDES: Slide[] = [
  { id: 'super', icon: Flame, color: '#f97316', title: ['Súper Hábitos', 'Super Habits'], desc: ['15 hábitos temáticos con roadmap de 60 días, insignias, llama que evoluciona y efectos y sonidos propios.', '15 themed habits with a 60-day roadmap, badges, an evolving flame and their own effects and sounds.'], Art: () => <FlameArt /> },
  { id: 'routine', icon: CalendarDays, color: '#38bdf8', title: ['Rutina por horas + calendario', 'Hourly routine + calendar'], desc: ['Tu día en bloques de horas, con tus proyectos y un calendario donde arrastras y estiras cada actividad.', 'Your day in hour blocks, with your projects and a calendar where you drag and stretch every activity.'], Art: () => <RoutineArt /> },
  { id: 'widgets', icon: LayoutGrid, color: '#34d399', title: ['Widgets Pro', 'Pro widgets'], desc: ['Rutina, Calendario y Diario en tu pantalla de inicio. Ves qué toca sin abrir la app.', 'Routine, Calendar and Journal on your home screen. See what is next without opening the app.'], Art: () => <WidgetArt /> },
  { id: 'unlimited', icon: InfinityIcon as unknown as typeof Flame, color: '#c084fc', title: ['Todo ilimitado', 'Everything unlimited'], desc: ['Hábitos, proyectos, estrategias, rasgos y eventos especiales sin tope.', 'Habits, projects, strategies, traits and special events with no cap.'], Art: ({ L }) => <UnlimitedArt L={L} /> },
  { id: 'stats', icon: BarChart3, color: '#22d3ee', title: ['Estadísticas completas', 'Full statistics'], desc: ['Mes, 3 meses, año e historial total de tus hábitos y tu diario.', 'Month, 3 months, year and full history of your habits and journal.'], Art: ({ L }) => <StatsArt L={L} /> },
  { id: 'colors', icon: Palette, color: '#ec4899', title: ['Personalización exclusiva', 'Exclusive customization'], desc: ['Colores del radar exclusivos Deluxe y efectos de partículas en tus sesiones de foco.', 'Deluxe-only radar colours and particle effects in your focus sessions.'], Art: () => <ColorsArt /> },
  { id: 'badge', icon: Users, color: '#fbbf24', title: ['Insignia DELUXE', 'DELUXE badge'], desc: ['Tus amigos ven tu insignia dorada en su lista y en los duelos.', 'Your friends see your gold badge on their list and in duels.'], Art: ({ L }) => <BadgeArt L={L} /> },
];

const DURATION = 4500;

export const BenefitShowcase = ({ lang }: { lang: FL }) => {
  const L = (es: string, en: string) => tr(lang, es, en);
  const reduce = useReducedMotion();
  const [[i, dir], setI] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const go = (n: number) => setI(([cur]) => [(n + SLIDES.length) % SLIDES.length, n >= cur ? 1 : -1]);

  useEffect(() => {
    if (paused || reduce) return;
    const id = setTimeout(() => go(i + 1), DURATION);
    return () => clearTimeout(id);
  }, [i, paused, reduce]);

  const s = SLIDES[i];
  return (
    <div className="select-none">
      {/* Story progress */}
      <div className="flex gap-1">
        {SLIDES.map((sl, k) => (
          <button key={sl.id} type="button" aria-label={L(sl.title[0], sl.title[1])} onClick={() => go(k)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            {k < i && <span className="block h-full w-full bg-white/80" />}
            {k === i && (
              <motion.span key={`${i}-${paused}`} className="block h-full bg-gradient-to-r from-amber-200 to-orange-400" style={{ originX: 0 }}
                initial={{ scaleX: 0 }} animate={{ scaleX: paused ? 0.5 : 1 }} transition={{ duration: paused ? 0 : DURATION / 1000, ease: 'linear' }} />
            )}
          </button>
        ))}
      </div>

      <div className="relative mt-3 h-[330px] overflow-hidden rounded-[26px] border border-white/10"
        style={{ background: `radial-gradient(120% 80% at 50% 0%, ${s.color}33, rgba(10,8,20,0.9) 65%)` }}
        onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.div key={s.id} custom={dir} className="absolute inset-0 flex flex-col p-4"
            variants={{ enter: (d: number) => ({ x: d * 120, opacity: 0, scale: 0.92 }), center: { x: 0, opacity: 1, scale: 1 }, exit: (d: number) => ({ x: d * -120, opacity: 0, scale: 0.92 }) }}
            initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.3}
            onDragEnd={(_, info) => { if (info.offset.x < -50) go(i + 1); else if (info.offset.x > 50) go(i - 1); }}>
            <div className="flex items-center gap-2.5">
              <motion.span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: s.color, boxShadow: `0 8px 24px -8px ${s.color}` }}
                initial={{ rotate: -30, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.1 }}>
                <s.icon size={20} className="text-white" />
              </motion.span>
              <span className="text-[10.5px] font-black uppercase tracking-[0.2em] text-white/45">{i + 1} / {SLIDES.length}</span>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-black text-amber-200"><Sparkles size={11} /> DELUXE</span>
            </div>
            <div className="mt-2 min-h-0 flex-1"><s.Art L={L} /></div>
            <h3 className="text-[20px] font-black leading-tight">{L(s.title[0], s.title[1])}</h3>
            <p className="mt-1 text-[13.5px] font-medium leading-snug text-white/60">{L(s.desc[0], s.desc[1])}</p>
          </motion.div>
        </AnimatePresence>
        {/* tap zones */}
        <button type="button" aria-label={L('Anterior', 'Previous')} onClick={() => go(i - 1)} className="absolute inset-y-0 left-0 w-[22%]" />
        <button type="button" aria-label={L('Siguiente', 'Next')} onClick={() => go(i + 1)} className="absolute inset-y-0 right-0 w-[22%]" />
      </div>
    </div>
  );
};

/** Free vs Deluxe with the app's real limits. Rows light up one by one. */
export const CompareTable = ({ lang }: { lang: FL }) => {
  const L = (es: string, en: string) => tr(lang, es, en);
  const rows: [string, string | boolean, string | boolean][] = [
    [L('Hábitos', 'Habits'), String(FREE_LIMITS.HABITS), '∞'],
    [L('Proyectos', 'Projects'), String(FREE_LIMITS.PROJECTS), '∞'],
    [L('Estrategias activas', 'Active strategies'), String(FREE_LIMITS.ACTIVE_STRATEGIES), '∞'],
    [L('Rasgos activos', 'Active traits'), String(FREE_LIMITS.ACTIVE_TRAITS), L('Todos', 'All')],
    [L('Eventos especiales', 'Special events'), String(FREE_LIMITS.NOTES), '∞'],
    [L('Súper Hábitos', 'Super Habits'), false, true],
    [L('Calendario y rutina por horas', 'Calendar & hourly routine'), false, true],
    [L('Widgets Rutina / Calendario / Diario', 'Routine / Calendar / Journal widgets'), false, true],
    [L('Estadísticas de mes, año y total', 'Month, year & total stats'), false, true],
    [L('Insignia DELUXE', 'DELUXE badge'), false, true],
  ];
  const cell = (v: string | boolean, deluxe: boolean) =>
    typeof v === 'boolean'
      ? (v ? <Check size={17} strokeWidth={3} className="mx-auto text-emerald-300" /> : <X size={16} strokeWidth={3} className="mx-auto text-white/20" />)
      : <span className={`font-black ${deluxe ? 'text-amber-200' : 'text-white/45'}`}>{v}</span>;
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
      <div className="grid grid-cols-[1fr_64px_72px] items-center bg-white/[0.05] px-4 py-2.5 text-[10.5px] font-black uppercase tracking-[0.14em]">
        <span className="text-white/40">{L('Función', 'Feature')}</span>
        <span className="text-center text-white/40">{L('Gratis', 'Free')}</span>
        <span className="flex items-center justify-center gap-1 text-amber-200"><Crown size={11} /> Deluxe</span>
      </div>
      {rows.map(([name, free, deluxe], k) => (
        <motion.div key={name} className="relative grid grid-cols-[1fr_64px_72px] items-center border-t border-white/[0.05] px-4 py-2.5 text-[13px]"
          initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-20px' }} transition={{ delay: k * 0.06 }}>
          <span className="font-semibold text-white/75">{name}</span>
          <span className="text-center">{cell(free, false)}</span>
          <span className="relative text-center">
            <motion.span aria-hidden className="absolute inset-x-1 -inset-y-1 rounded-lg bg-amber-300/10"
              initial={{ opacity: 0 }} whileInView={{ opacity: [0, 1, 0.5] }} viewport={{ once: true }} transition={{ delay: 0.2 + k * 0.06, duration: 0.6 }} />
            <span className="relative">{cell(deluxe, true)}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
};
