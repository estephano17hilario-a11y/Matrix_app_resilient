import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, CalendarDays, Check, Crown, FolderKanban, Hexagon, Infinity as InfinityIcon, KeyRound, LayoutGrid, Palette,
  PartyPopper, Repeat, SlidersHorizontal, Sparkles, StickyNote, Target, Wand2, X,
} from 'lucide-react';
import { SUPER_HABIT_LIST } from '../superHabits/catalog';
import { FREE_LIMITS } from '../../config/limits';
import { DELUXE_PROMPT_EVENT, openDeluxe, type DeluxeFeature } from './deluxe';

interface FeatureCopy {
  icon: React.ElementType;
  accent: [string, string];
  title: [string, string];
  /** One short, tempting line. */
  hook: [string, string];
  /** Up to three tiny benefits. */
  bullets: [string, string][];
}

// [es, en] pairs, kept short on purpose: a glance, a temptation, a button.
const COPY: Record<DeluxeFeature, FeatureCopy> = {
  superHabits: {
    icon: Sparkles, accent: ['#f59e0b', '#ec4899'],
    title: ['Súper hábitos', 'Super habits'],
    hook: ['Convierte un hábito en una misión épica que da gusto cumplir.', 'Turn a habit into an epic quest you love to complete.'],
    bullets: [['15 mundos temáticos', '15 themed worlds'], ['Roadmap de 60 días con insignias', '60-day roadmap with badges'], ['Llama que evoluciona con tu racha', 'A flame that evolves with your streak']],
  },
  routineCalendar: {
    icon: CalendarDays, accent: ['#38bdf8', '#818cf8'],
    title: ['Calendario de rutina', 'Routine calendar'],
    hook: ['Ve tu día entero de un vistazo y muévelo con el dedo.', 'See your whole day at a glance and move it with a finger.'],
    bullets: [['Día, 3 días o semana', 'Day, 3 days or week'], ['Arrastra y estira bloques', 'Drag and stretch blocks'], ['Cambia un día sin tocar el resto', 'Change one day only']],
  },
  routineCustom: {
    icon: SlidersHorizontal, accent: ['#a78bfa', '#38bdf8'],
    title: ['Rutina a tu medida', 'Routine your way'],
    hook: ['Divide tu día en bloques y mete tus proyectos dentro.', 'Split your day into blocks and bring your projects in.'],
    bullets: [['Bloques de 1 a 6 horas', '1–6 hour blocks'], ['Proyectos en tu rutina', 'Projects in your routine'], ['Filtros por bloque', 'Filters per block']],
  },
  widgets: {
    icon: LayoutGrid, accent: ['#6366f1', '#ec4899'],
    title: ['Widgets Deluxe', 'Deluxe widgets'],
    hook: ['Tu día en la pantalla de inicio, sin abrir la app.', 'Your day on the home screen, no app needed.'],
    bullets: [['Rutina con un toque para marcar', 'Routine, tap to check'], ['Calendario de día o semana', 'Day or week calendar'], ['Tus rachas de diario', 'Your journal streaks']],
  },
  charts: {
    icon: BarChart3, accent: ['#22d3ee', '#6366f1'],
    title: ['Estadísticas completas', 'Full statistics'],
    hook: ['Descubre tus patrones: qué te hace avanzar y qué te frena.', 'Discover your patterns: what moves you and what stops you.'],
    bullets: [['Mes, 3 meses, año y total', 'Month, 3 months, year, total'], ['Tendencias y mapas de calor', 'Trends and heatmaps'], ['Todo tu historial', 'Your whole history']],
  },
  habits: {
    icon: Repeat, accent: ['#ef4444', '#f97316'],
    title: ['Hábitos ilimitados', 'Unlimited habits'],
    hook: [`Ya usas tus ${FREE_LIMITS.HABITS} hábitos gratis. Con Deluxe no hay techo.`, `You are using your ${FREE_LIMITS.HABITS} free habits. Deluxe has no ceiling.`],
    bullets: [['Todos los hábitos que quieras', 'As many habits as you want'], ['Súper hábitos incluidos', 'Super habits included'], ['Estadísticas completas', 'Full statistics']],
  },
  projects: {
    icon: FolderKanban, accent: ['#6366f1', '#a855f7'],
    title: ['Proyectos ilimitados', 'Unlimited projects'],
    hook: [`Tienes ${FREE_LIMITS.PROJECTS} proyectos activos. Deluxe te deja avanzar en todos.`, `You have ${FREE_LIMITS.PROJECTS} active projects. Deluxe lets you push all of them.`],
    bullets: [['Proyectos sin límite', 'No project limit'], ['Proyectos en tu rutina', 'Projects in your routine'], ['Metas de foco por proyecto', 'Focus goals per project']],
  },
  strategies: {
    icon: Target, accent: ['#a855f7', '#6366f1'],
    title: ['Estrategias ilimitadas', 'Unlimited strategies'],
    hook: ['Planifica todas tus metas grandes a la vez, paso a paso.', 'Plan all your big goals at once, step by step.'],
    bullets: [['Estrategias activas sin tope', 'No cap on active strategies'], ['Anual, trimestral, semanal…', 'Yearly, quarterly, weekly…'], ['Tareas generadas solas', 'Tasks generated for you']],
  },
  traits: {
    icon: Hexagon, accent: ['#ec4899', '#f43f5e'],
    title: ['Todos los rasgos', 'Every trait'],
    hook: ['Construye tu mejor versión con el espectro completo.', 'Build your best self with the full spectrum.'],
    bullets: [[`Más de ${FREE_LIMITS.ACTIVE_TRAITS} rasgos activos`, `More than ${FREE_LIMITS.ACTIVE_TRAITS} active traits`], ['Cámbialos cuando quieras', 'Change them anytime'], ['Radar completo de tu progreso', 'Full progress radar']],
  },
  notes: {
    icon: StickyNote, accent: ['#06b6d4', '#22c55e'],
    title: ['Notas ilimitadas', 'Unlimited notes'],
    hook: ['Tu segundo cerebro, sin espacio que se acabe.', 'Your second brain, without running out of space.'],
    bullets: [['Notas sin límite', 'No note limit'], ['Carpetas y plantillas', 'Folders and templates'], ['Estadísticas del diario', 'Journal statistics']],
  },
  vault: {
    icon: KeyRound, accent: ['#f59e0b', '#eab308'],
    title: ['Bóveda con PIN', 'PIN vault'],
    hook: ['Guarda lo privado detrás de tu propio PIN.', 'Keep private things behind your own PIN.'],
    bullets: [['Notas protegidas', 'Protected notes'], ['PIN personal', 'Personal PIN'], ['Solo tú las ves', 'Only you see them']],
  },
  specialEvents: {
    icon: PartyPopper, accent: ['#ec4899', '#f59e0b'],
    title: ['Eventos ilimitados', 'Unlimited events'],
    hook: ['Nunca más olvides un cumpleaños o una fecha importante.', 'Never forget a birthday or an important date again.'],
    bullets: [[`Más de ${FREE_LIMITS.NOTES} eventos`, `More than ${FREE_LIMITS.NOTES} events`], ['Avisos a tu hora', 'Reminders at your time'], ['Anuales o mensuales', 'Yearly or monthly']],
  },
  focusEffects: {
    icon: Wand2, accent: ['#8b5cf6', '#22d3ee'],
    title: ['Efectos de foco', 'Focus effects'],
    hook: ['Haz que cada sesión de foco se sienta como entrar en otra dimensión.', 'Make every focus session feel like entering another dimension.'],
    bullets: [['Partículas y estilos exclusivos', 'Exclusive particles and styles'], ['Personaliza tu temporizador', 'Customize your timer'], ['Más inmersión, menos distracción', 'More immersion, less distraction']],
  },
  customization: {
    icon: Palette, accent: ['#ec4899', '#8b5cf6'],
    title: ['Personalización Deluxe', 'Deluxe customization'],
    hook: ['Haz que Lux se vea exactamente como tú.', 'Make Lux look exactly like you.'],
    bullets: [['Colores exclusivos', 'Exclusive colours'], ['Estilos visuales premium', 'Premium visual styles'], ['Todo desbloqueado', 'Everything unlocked']],
  },
};

// ── Back-button integration (Dashboard checks this before anything else) ─────────────
let promptOpen = false;
let closePrompt: (() => void) | null = null;
export const isDeluxePromptOpen = (): boolean => promptOpen;
export const closeDeluxePrompt = (): void => { closePrompt?.(); };

/** Mount once. Listens for `promptDeluxe(feature)`: a short, animated "here is what you unlock" sheet. */
export const DeluxePromptHost: React.FC = () => {
  const { i18n } = useTranslation();
  const es = !!i18n.language?.startsWith('es');
  const reduce = !!useReducedMotion();
  const [feature, setFeature] = useState<DeluxeFeature | null>(null);
  const close = useCallback(() => setFeature(null), []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      const f = (e as CustomEvent<{ feature?: DeluxeFeature }>).detail?.feature;
      if (f && COPY[f]) setFeature(f);
      else openDeluxe();
    };
    window.addEventListener(DELUXE_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(DELUXE_PROMPT_EVENT, onPrompt);
  }, []);

  useEffect(() => {
    promptOpen = feature !== null;
    closePrompt = feature !== null ? close : null;
    return () => { promptOpen = false; closePrompt = null; };
  }, [feature, close]);

  if (typeof document === 'undefined') return null;
  const c = feature ? COPY[feature] : null;
  const pick = (p: [string, string]) => (es ? p[0] : p[1]);
  const Icon = c?.icon;

  return createPortal(
    <AnimatePresence>
      {c && Icon && feature && (
        <motion.div
          key="deluxe-prompt"
          className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/75"
          style={{ zIndex: 100002 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onClick={close}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={pick(c.title)}
            className="relative w-full max-w-md overflow-hidden rounded-t-[30px] sm:rounded-[30px] border border-white/10 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
            style={{ background: `radial-gradient(120% 70% at 50% 0%, ${c.accent[0]}38, transparent 62%), #0a0a10` }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={e => e.stopPropagation()}
          >
            {/* drifting light */}
            {!reduce && (
              <motion.span aria-hidden className="absolute -top-20 left-1/2 h-48 w-48 -ml-24 rounded-full"
                style={{ pointerEvents: 'none', background: `radial-gradient(circle, ${c.accent[1]}40, transparent 70%)` }}
                animate={{ x: [-60, 60, -60], opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
            )}
            <div className="relative mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
            <button type="button" onClick={close} aria-label={es ? 'Cerrar' : 'Close'}
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/50 active:scale-90 transition-transform">
              <X size={16} />
            </button>

            <div className="relative flex items-center gap-4 pt-2">
              <div className="relative h-[72px] w-[72px] shrink-0">
                {!reduce && (
                  <motion.span aria-hidden className="absolute -inset-3 rounded-[30px]"
                    style={{ pointerEvents: 'none', background: `radial-gradient(closest-side, ${c.accent[1]}66, transparent 75%)` }}
                    animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
                )}
                <motion.div className="relative flex h-full w-full items-center justify-center rounded-[24px]"
                  style={{ background: `linear-gradient(135deg, ${c.accent[0]}, ${c.accent[1]})`, boxShadow: `0 14px 34px -10px ${c.accent[1]}cc` }}
                  initial={reduce ? false : { scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.08 }}>
                  <Icon size={32} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
                </motion.div>
                <motion.span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#0a0a10]"
                  initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 600, damping: 15 }}>
                  <Crown size={13} className="text-amber-300" />
                </motion.span>
              </div>
              <div className="min-w-0 pr-8">
                <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: c.accent[0] }}>Deluxe</p>
                <h2 className="mt-0.5 text-[22px] font-black leading-tight tracking-tight text-white">{pick(c.title)}</h2>
              </div>
            </div>

            <motion.p className="relative mt-3 text-[14px] font-semibold leading-snug text-white/75"
              initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              {pick(c.hook)}
            </motion.p>

            {feature === 'superHabits' && (
              <div className="relative mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                {SUPER_HABIT_LIST.slice(0, 10).map((t, i) => {
                  const I = t.icon;
                  return (
                    <motion.span key={t.id} className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}
                      initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 500, damping: 16 }}>
                      <I size={15} className="text-white" />
                    </motion.span>
                  );
                })}
              </div>
            )}

            <ul className="relative mt-4 space-y-2">
              {c.bullets.slice(0, 3).map((b, i) => (
                <motion.li key={i} className="flex items-center gap-2.5"
                  initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.09 }}>
                  <motion.span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: c.accent[0], color: '#0a0a10' }}
                    initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 + i * 0.09, type: 'spring', stiffness: 600, damping: 14 }}>
                    <Check size={12} strokeWidth={3.5} />
                  </motion.span>
                  <span className="text-[13.5px] font-bold text-white/85">{pick(b)}</span>
                </motion.li>
              ))}
              <motion.li className="flex items-center gap-2.5 text-[12px] font-bold text-white/40"
                initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <InfinityIcon size={16} className="text-white/40" /> {es ? 'Y todo lo demás de Deluxe' : 'And everything else in Deluxe'}
              </motion.li>
            </ul>

            <motion.button type="button" onClick={() => { close(); openDeluxe(); }}
              whileTap={{ scale: 0.97 }}
              className="relative mt-5 flex h-[56px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[15px] font-black text-white"
              style={{ background: `linear-gradient(110deg, ${c.accent[0]} 0%, #a855f7 55%, ${c.accent[1]} 100%)`, boxShadow: `0 14px 30px -10px ${c.accent[1]}cc` }}>
              {!reduce && (
                <motion.span aria-hidden className="absolute inset-y-0 w-1/3"
                  style={{ pointerEvents: 'none', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                  initial={{ x: '-120%' }} animate={{ x: '360%' }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }} />
              )}
              <Crown size={18} /> {es ? 'Obtenerlo' : 'Get it'}
            </motion.button>
            <button type="button" onClick={close} className="mt-1.5 h-10 w-full rounded-2xl text-[12px] font-bold text-white/40 active:text-white/80">
              {es ? 'Ahora no' : 'Not now'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
