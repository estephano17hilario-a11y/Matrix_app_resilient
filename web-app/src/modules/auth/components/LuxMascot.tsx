import { memo, useEffect, useId, useState } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';

export type MascotMood = 'idle' | 'happy' | 'excited' | 'thinking' | 'sad' | 'shy' | 'peek';

interface LuxMascotProps {
  mood?: MascotMood;
  /** Where the pupils look, each axis in -1..1. Omit to let Lux glance around on its own. */
  look?: { x: number; y: number } | null;
  size?: number;
  className?: string;
}

// Every mouth uses the same command list (M + C) so framer can morph between them.
const MOUTHS: Record<MascotMood, string> = {
  idle: 'M50 75 C54 79 66 79 70 75',
  happy: 'M47 74 C53 82 67 82 73 74',
  excited: 'M45 72 C52 86 68 86 75 72',
  thinking: 'M53 77 C57 76 62 78 67 76',
  sad: 'M50 79 C55 73 65 73 70 79',
  shy: 'M54 77 C57 79 63 79 66 77',
  peek: 'M52 76 C56 79 64 79 68 76',
};

// Hand offsets from their rest spot (sides of the body).
const HANDS: Record<MascotMood, { l: [number, number]; r: [number, number] }> = {
  idle: { l: [0, 0], r: [0, 0] },
  happy: { l: [-3, -6], r: [3, -6] },
  excited: { l: [-6, -22], r: [6, -22] },
  thinking: { l: [0, 0], r: [-10, -12] },
  sad: { l: [2, 3], r: [-2, 3] },
  shy: { l: [21, -23], r: [-21, -23] },
  peek: { l: [21, -23], r: [-12, -8] },
};
const handScale = (mood: MascotMood, side: 'l' | 'r') =>
  mood === 'shy' || (mood === 'peek' && side === 'l') ? 1.45 : 1;

const spring: Transition = { type: 'spring', stiffness: 420, damping: 26, mass: 0.7 };

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Lux, the light-orb mascot. Pure SVG; idle float/glow run as compositor CSS animations on the
 * wrapper, the expressive bits (pupils, mouth, hands, blink) are small framer springs.
 */
export const LuxMascot = memo(({ mood = 'idle', look, size = 160, className }: LuxMascotProps) => {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const [wander, setWander] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  // Idle glance-around when nobody drives the eyes.
  useEffect(() => {
    if (look || reduce) return;
    const spots = [{ x: 0, y: 0 }, { x: -0.7, y: -0.3 }, { x: 0.6, y: 0.2 }, { x: 0.2, y: -0.6 }, { x: 0, y: 0.4 }];
    let i = 0;
    const id = window.setInterval(() => { i = (i + 1) % spots.length; setWander(spots[i]); }, 2200);
    return () => window.clearInterval(id);
  }, [look, reduce]);

  // Natural blink every 2.5–5 s.
  useEffect(() => {
    if (reduce) return;
    let t: number;
    let t2: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        t2 = window.setTimeout(() => { setBlink(false); loop(); }, 130);
      }, 2500 + Math.random() * 2500);
    };
    loop();
    return () => { window.clearTimeout(t); window.clearTimeout(t2); };
  }, [reduce]);

  const eyesHidden = mood === 'shy';
  const happyEyes = mood === 'excited' || mood === 'happy';
  let target = look ?? wander;
  if (mood === 'thinking') target = { x: -0.6, y: -0.8 };
  if (mood === 'sad') target = { x: 0, y: 0.8 };
  const px = clamp(target.x) * 3.4;
  const py = clamp(target.y) * 3;
  const eyeScaleY = blink || happyEyes ? 0.08 : mood === 'sad' ? 0.8 : 1;
  const hands = HANDS[mood];

  const bodyAnim =
    reduce ? {} :
    mood === 'excited' ? { y: [0, -10, 0], scaleY: [1, 1.04, 1], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' } } :
    mood === 'sad' ? { x: [0, -7, 7, -5, 5, -2, 0], y: 3, transition: { duration: 0.5 } } :
    mood === 'thinking' ? { rotate: [-5, 5, -5], transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } } :
    mood === 'shy' ? { scale: 0.95, scaleY: 1, y: 2, rotate: 0, x: 0, transition: spring } :
    { scale: 1, scaleY: 1, y: 0, rotate: 0, x: 0, transition: spring };

  return (
    <div
      className={`lux-mascot relative select-none ${className ?? ''}`}
      // Inline: the global `.pointer-events-none` class adds `contain: strict`, which clips the aura.
      style={{ width: size, height: size, pointerEvents: 'none' }}
      aria-hidden
    >
      {/* Aura lives outside the floating layer: a composited layer clips its overflow to its own box. */}
      <div className={`absolute -inset-[24%] rounded-full ${reduce ? '' : 'lux-glow'}`}
        style={{ background: 'radial-gradient(circle closest-side, rgba(251,191,36,0.40) 0%, rgba(245,158,11,0.15) 45%, rgba(245,158,11,0) 100%)' }} />
      <div className={`absolute inset-0 ${reduce ? '' : 'lux-float'}`}>
      <svg viewBox="0 0 120 120" width={size} height={size} className="relative overflow-visible">
        <defs>
          <radialGradient id={`${uid}-body`} cx="40%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#fffbe6" />
            <stop offset="28%" stopColor="#fde68a" />
            <stop offset="65%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <linearGradient id={`${uid}-flame`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <radialGradient id={`${uid}-hand`} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>
        </defs>

        <motion.g animate={bodyAnim} style={{ originX: 0.5, originY: 1 }}>
          {/* Flame tuft */}
          <motion.path
            d="M60 12 C68 22 72 30 66 38 C64 41 56 41 54 38 C49 31 53 24 60 12 Z"
            fill={`url(#${uid}-flame)`}
            style={{ originX: 0.5, originY: 1 }}
            animate={reduce ? undefined : { rotate: [-7, 7, -7], scaleY: [1, 1.12, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Body */}
          <circle cx="60" cy="66" r="34" fill={`url(#${uid}-body)`} />
          <ellipse cx="47" cy="49" rx="9" ry="5.5" fill="#fff" opacity="0.55" transform="rotate(-25 47 49)" />

          {/* Cheeks */}
          <motion.ellipse cx="39" cy="75" rx="5.5" ry="3.4" fill="#fb7185"
            animate={{ opacity: mood === 'shy' || mood === 'peek' || mood === 'excited' ? 0.75 : 0.4 }} />
          <motion.ellipse cx="81" cy="75" rx="5.5" ry="3.4" fill="#fb7185"
            animate={{ opacity: mood === 'shy' || mood === 'peek' || mood === 'excited' ? 0.75 : 0.4 }} />

          {/* Eyes */}
          {[48, 72].map((cx) => (
            <g key={cx}>
              <motion.g
                animate={{ scaleY: eyeScaleY, opacity: eyesHidden ? 0 : 1 }}
                transition={blink ? { duration: 0.06 } : spring}
              >
                <ellipse cx={cx} cy="63" rx="8.2" ry="9.6" fill="#fff" />
                <motion.g animate={{ x: px, y: py }} transition={spring}>
                  <circle cx={cx} cy="64" r="4.9" fill="#1e1b4b" />
                  <circle cx={cx + 1.8} cy="62" r="1.6" fill="#fff" />
                </motion.g>
              </motion.g>
              {/* Happy "^" eyes */}
              <motion.path
                d={`M${cx - 6} 66 Q${cx} 57 ${cx + 6} 66`}
                stroke="#1e1b4b" strokeWidth="3.2" strokeLinecap="round" fill="none"
                initial={false}
                animate={{ opacity: happyEyes ? 1 : 0, pathLength: happyEyes ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </g>
          ))}

          {/* Mouth */}
          <motion.path
            initial={false}
            animate={{ d: MOUTHS[mood] }}
            transition={spring}
            stroke="#7c2d12" strokeWidth="3.4" strokeLinecap="round" fill="none"
          />

          {/* Hands */}
          <motion.circle cx="27" cy="86" r="7.5" fill={`url(#${uid}-hand)`} stroke="#c2410c" strokeWidth="2"
            animate={{ x: hands.l[0], y: hands.l[1], scale: handScale(mood, 'l') }} transition={spring} />
          <motion.circle cx="93" cy="86" r="7.5" fill={`url(#${uid}-hand)`} stroke="#c2410c" strokeWidth="2"
            animate={{ x: hands.r[0], y: hands.r[1], scale: handScale(mood, 'r') }} transition={spring} />
        </motion.g>
      </svg>
      </div>
    </div>
  );
});

LuxMascot.displayName = 'LuxMascot';
