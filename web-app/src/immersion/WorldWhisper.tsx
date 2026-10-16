import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { accentFor, hasArrived } from './engine';
import { getImmersionPrefs, immersionActive } from './immersionPrefs';
import { getLifeReading, subscribeLife } from './lifeStore';
import { lifeParams, LifeMood } from './lifeState';

// ─────────────────────────────────────────────────────────────────────────────
// Whispers: one short line from the world, just above the dock.
//   area – entering a section shows its name, like entering a zone in a game
//   life – the adaptive world says, once per state and day, how today is going
// Never blocking: area lines can't be touched, life lines close on tap.
// ─────────────────────────────────────────────────────────────────────────────

type Whisper =
  | { id: number; kind: 'area'; scene: string; accent: string }
  | { id: number; kind: 'life'; mood: LifeMood; params: Record<string, number>; rgb: string };

let seq = 0;
let push: ((w: Whisper) => void) | null = null;

/** Called by the Dashboard when the camera travels to another section. */
export const announceArea = (scene: string) => {
  if (!immersionActive() || !hasArrived() || !getImmersionPrefs().areaTitles) return;
  push?.({ id: ++seq, kind: 'area', scene, accent: accentFor(scene) });
};

const SEEN_KEY = 'lux-whispers-seen';
const today = () => new Date().toDateString();

const alreadySaid = (mood: string) => {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    return seen.day === today() && Array.isArray(seen.moods) && seen.moods.includes(mood);
  } catch { return false; }
};

const markSaid = (mood: string) => {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    const moods = seen.day === today() && Array.isArray(seen.moods) ? seen.moods : [];
    localStorage.setItem(SEEN_KEY, JSON.stringify({ day: today(), moods: [...moods, mood] }));
  } catch { /* ignore */ }
};

const AREA_DEFAULTS: Record<string, [string, string]> = {
  TASKS: ['Misiones', 'Lo que hoy importa'],
  HABITS: ['Hábitos', 'Lo que te construye'],
  FOCUS: ['Enfoque', 'Un solo punto de luz'],
  NOTES: ['Mente', 'Donde piensas en voz baja'],
  FEED: ['Progreso', 'El camino recorrido'],
  ACHIEVEMENTS: ['Legado', 'Lo que ya conquistaste'],
  STORE: ['Tienda', 'Recompensas del esfuerzo'],
};

export const MOOD_DEFAULTS: Record<LifeMood, [string, string]> = {
  victory: ['Día conquistado', 'Todo lo de hoy está hecho. El cielo brilla por ti.'],
  recovery: ['Día difícil', 'Un paso pequeño también cuenta. Empieza por lo mínimo.'],
  urgency: ['El día se está cerrando', 'Quedan {{pending}} pendientes. Tu racha de {{streak}} días te espera.'],
  drift: ['El mundo se enfría', 'El día avanza en pausa. Dos minutos de enfoque lo reactivan.'],
  flow: ['Estás en flujo', '{{pct}}% del día completado. Sigue el impulso.'],
  fresh: ['Hoy empieza una racha', 'Lienzo limpio: {{pending}} cosas por delante.'],
  dawn: ['Amanecer', 'El día recién abre: {{pending}} pendientes por delante.'],
  morning: ['Mañana', 'Energía alta. Buen momento para lo difícil.'],
  afternoon: ['Tarde', 'Mantén el ritmo: {{pending}} pendientes.'],
  evening: ['Atardecer', 'Cierra el día con intención.'],
  night: ['Noche', 'El cielo se llena de estrellas. Descansa: mañana se reanuda.'],
};

export const WorldWhisper = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<Whisper | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    const show = (w: Whisper) => {
      // A message about your day is never cut short by a zone name.
      setCurrent(prev => (prev?.kind === 'life' && w.kind === 'area' ? prev : w));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCurrent(c => (c?.id === w.id ? null : c)), w.kind === 'area' ? 1500 : 5600);
    };
    push = show;

    let lastMood: string | null = null;
    const sayLife = () => {
      const r = getLifeReading();
      if (!r || !immersionActive() || !hasArrived() || document.hidden) return;
      if (r.mood === lastMood) return;
      lastMood = r.mood;
      if (alreadySaid(r.mood)) return;
      markSaid(r.mood);
      show({ id: ++seq, kind: 'life', mood: r.mood, params: lifeParams(r), rgb: r.sky });
    };

    // Speak once the world has arrived (after the splash), then on changes.
    let arrivalDelay = 0;
    const onArrived = () => { arrivalDelay = window.setTimeout(sayLife, 1600); };
    if (hasArrived()) onArrived();
    window.addEventListener('lux:arrived', onArrived);
    const unsub = subscribeLife(sayLife);

    return () => {
      push = null;
      unsub();
      window.removeEventListener('lux:arrived', onArrived);
      window.clearTimeout(arrivalDelay);
      window.clearTimeout(timer.current);
    };
  }, []);

  const dismiss = () => setCurrent(null);

  let body: JSX.Element | null = null;
  if (current?.kind === 'area') {
    const [title, sub] = AREA_DEFAULTS[current.scene] || [current.scene, ''];
    body = (
      <motion.div
        key={current.id}
        className="lux-whisper-area"
        style={{ ['--lux-w' as any]: current.accent || 'var(--lux-accent)' }}
        initial={{ opacity: 0, y: 8, scale: 1.06 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.35 } }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="lux-whisper-line" />
        <span className="lux-whisper-title">{t(`world.area.${current.scene}.title`, title)}</span>
        <span className="lux-whisper-line" />
        {sub && <span className="lux-whisper-sub">{t(`world.area.${current.scene}.sub`, sub)}</span>}
      </motion.div>
    );
  } else if (current?.kind === 'life') {
    const [title, detail] = MOOD_DEFAULTS[current.mood];
    body = (
      <motion.button
        type="button"
        key={current.id}
        onClick={dismiss}
        className="lux-whisper-life"
        style={{ ['--lux-w' as any]: current.rgb }}
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.3 } }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <span className="lux-whisper-orb" />
        <span className="lux-whisper-text">
          <span className="lux-whisper-life-title">{t(`world.mood.${current.mood}.title`, title)}</span>
          <span className="lux-whisper-life-detail">{t(`world.mood.${current.mood}.detail`, detail, current.params)}</span>
        </span>
      </motion.button>
    );
  }

  return (
    <div className="lux-whisper-dock">
      <AnimatePresence mode="wait">{body}</AnimatePresence>
    </div>
  );
};
