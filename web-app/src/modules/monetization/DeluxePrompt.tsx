import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Crown, X, Sparkles, CalendarDays, SlidersHorizontal, LayoutGrid } from 'lucide-react';
import { SUPER_HABIT_LIST } from '../superHabits/catalog';
import { DELUXE_PROMPT_EVENT, openDeluxe, type DeluxeFeature } from './deluxe';

interface FeatureCopy {
  icon: React.ElementType;
  accent: [string, string];
  title: [string, string];
  kicker: [string, string];
  desc: [string, string];
  bullets: [string, string][];
}

// [es, en] pairs. Kept inline (like the Routine screen does) so the locale files stay untouched.
const COPY: Record<DeluxeFeature, FeatureCopy> = {
  superHabits: {
    icon: Sparkles,
    accent: ['#f59e0b', '#ec4899'],
    title: ['Súper hábitos', 'Super habits'],
    kicker: ['Solo con Deluxe', 'Deluxe only'],
    desc: [
      'Convierte un hábito en una misión épica. Cada súper hábito tiene su propio mundo, un roadmap de 60 días con insignias y una llama que evoluciona mientras mantienes la racha.',
      'Turn a habit into an epic quest. Every super habit gets its own world, a 60-day roadmap with badges and a flame that evolves while you keep your streak.',
    ],
    bullets: [
      ['15 temas: gimnasio, lectura, meditación, programación…', '15 themes: gym, reading, meditation, coding…'],
      ['Roadmap de 60 días con insignias que se desbloquean', '60-day roadmap with badges you unlock'],
      ['Llama de racha que evoluciona de nivel', 'A streak flame that levels up'],
      ['Efectos y sonidos temáticos al cumplir', 'Themed effects and sounds when you complete'],
    ],
  },
  routineCalendar: {
    icon: CalendarDays,
    accent: ['#38bdf8', '#818cf8'],
    title: ['Calendario de rutina', 'Routine calendar'],
    kicker: ['Solo con Deluxe', 'Deluxe only'],
    desc: [
      'Tu rutina como un calendario tipo Google, en pantalla completa, con bloques por hora y la hora actual marcada.',
      'Your routine as a Google-style calendar, full screen, with hour blocks and the current time marked.',
    ],
    bullets: [
      ['Vista de día, 3 días o semana completa', 'Day, 3-day or full-week view'],
      ['Mueve y cambia la duración arrastrando', 'Move and resize by dragging'],
      ['Cambia un solo día sin tocar el resto', 'Change a single day without touching the rest'],
      ['Colores por rasgo o por importancia', 'Colors by trait or importance'],
    ],
  },
  routineCustom: {
    icon: SlidersHorizontal,
    accent: ['#a78bfa', '#38bdf8'],
    title: ['Personaliza tu rutina', 'Customize your routine'],
    kicker: ['Solo con Deluxe', 'Deluxe only'],
    desc: [
      'Organiza tu día a tu manera: divídelo en bloques de 1 a 6 horas y suma tus proyectos a la rutina.',
      'Shape your day your way: split it into 1–6 hour blocks and bring your projects into the routine.',
    ],
    bullets: [
      ['División del día por bloques de horas', 'Day split into hour blocks'],
      ['Proyectos con aviso dentro de tu rutina', 'Projects with reminders inside your routine'],
      ['Filtros rápidos por bloque', 'Quick filters per block'],
    ],
  },
  widgets: {
    icon: LayoutGrid,
    accent: ['#6366f1', '#ec4899'],
    title: ['Widgets Deluxe', 'Deluxe widgets'],
    kicker: ['Solo con Deluxe', 'Deluxe only'],
    desc: [
      'Lleva tu rutina a la pantalla de inicio con los widgets premium de Lux.',
      'Put your routine on your home screen with Lux premium widgets.',
    ],
    bullets: [
      ['Lux · Rutina: tu día en orden, con un toque para marcar', 'Lux · Routine: your day in order, tap to check off'],
      ['Lux · Calendario: día, 3 días o semana', 'Lux · Calendar: day, 3 days or week'],
      ['Matrix Diario Calendario: tus rachas de escritura', 'Matrix Journal Calendar: your writing streaks'],
    ],
  },
};

// ── Back-button integration (Dashboard checks this before anything else) ─────────────
let promptOpen = false;
let closePrompt: (() => void) | null = null;
export const isDeluxePromptOpen = (): boolean => promptOpen;
export const closeDeluxePrompt = (): void => { closePrompt?.(); };

/**
 * Mount once. Listens for `promptDeluxe(feature)` and shows a sheet that explains the locked feature
 * with a button to the purchase screen.
 */
export const DeluxePromptHost: React.FC = () => {
  const { i18n } = useTranslation();
  const es = !!i18n.language?.startsWith('es');
  const [feature, setFeature] = useState<DeluxeFeature | null>(null);

  const close = useCallback(() => setFeature(null), []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      const f = (e as CustomEvent<{ feature?: DeluxeFeature }>).detail?.feature;
      if (f && COPY[f]) setFeature(f);
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={pick(c.title)}
            className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[30px] sm:rounded-[30px] border border-white/10 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+22px)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
            style={{ background: `radial-gradient(120% 70% at 50% 0%, ${c.accent[0]}33, transparent 60%), #0a0a10` }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-3" />
            <button
              type="button"
              onClick={close}
              aria-label={es ? 'Cerrar' : 'Close'}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 text-white/50 flex items-center justify-center active:scale-90 transition-transform"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center pt-3">
              <div
                className="relative w-[76px] h-[76px] rounded-[26px] flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${c.accent[0]}, ${c.accent[1]})`, boxShadow: `0 14px 34px -10px ${c.accent[1]}cc` }}
              >
                <Icon size={34} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
                <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#0a0a10] flex items-center justify-center border border-white/15">
                  <Crown size={15} className="text-amber-300" />
                </span>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: c.accent[0] }}>{pick(c.kicker)}</p>
              <h2 className="mt-1 text-[24px] font-black tracking-tight text-white leading-tight">{pick(c.title)}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60 font-medium max-w-[34ch]">{pick(c.desc)}</p>
            </div>

            {feature === 'superHabits' && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
                {SUPER_HABIT_LIST.map(t => {
                  const I = t.icon;
                  return (
                    <span key={t.id} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}>
                      <I size={16} className="text-white" />
                    </span>
                  );
                })}
              </div>
            )}

            <ul className="mt-5 space-y-2">
              {c.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-2.5">
                  <span className="mt-[1px] w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${c.accent[0]}26`, color: c.accent[0] }}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-[12.5px] font-semibold text-white/80 leading-snug">{pick(b)}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => { close(); openDeluxe(); }}
              className="mt-5 w-full h-[52px] rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-[0.16em] text-white active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(110deg, #6366f1 0%, #a855f7 55%, #ec4899 100%)', boxShadow: '0 14px 30px -10px rgba(168,85,247,0.8)' }}
            >
              <Crown size={17} /> {es ? 'Conseguir Deluxe' : 'Get Deluxe'}
            </button>
            <button
              type="button"
              onClick={close}
              className="mt-2 w-full h-11 rounded-2xl text-[12px] font-bold text-white/45 active:text-white/80"
            >
              {es ? 'Ahora no' : 'Not now'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
