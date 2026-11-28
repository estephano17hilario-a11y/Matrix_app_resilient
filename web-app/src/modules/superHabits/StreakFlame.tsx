import React, { useId } from 'react';
import { flameTierFor } from './engine';
import './superHabits.css';

// A flame that matures with the streak: grey ash → spark → flame → fire →
// inferno → blue plasma → cosmic violet → platinum → mythic. Colour, shape
// (tongues, spire, halo, wings) and texture (veins, stars, metal, iridescence)
// all change, so a 60-day flame is obviously not a 2-day flame.

interface TierCfg {
  outer: [string, string];
  inner: [string, string];
  core: string;
  glow: string;
  scale: number;
  tongues: boolean;
  spire: boolean;
  halo: boolean;
  wings: boolean;
  sparks: number;
  texture: 'none' | 'veins' | 'stars' | 'metal' | 'iris';
}

const base = { tongues: false, spire: false, halo: false, wings: false, sparks: 0, texture: 'none' as const };

const TIERS: TierCfg[] = [
  { ...base, outer: ['#6b7280', '#374151'], inner: ['#9ca3af', '#4b5563'], core: '#d1d5db', glow: 'transparent', scale: 0.78 },
  { ...base, outer: ['#fdba74', '#ea580c'], inner: ['#fed7aa', '#fb923c'], core: '#fff7ed', glow: '#fb923c', scale: 0.84 },
  { ...base, outer: ['#fb923c', '#dc2626'], inner: ['#fde68a', '#f97316'], core: '#fffbeb', glow: '#f97316', scale: 0.92, sparks: 1 },
  { ...base, outer: ['#fde047', '#ef4444'], inner: ['#fff7ad', '#f59e0b'], core: '#ffffff', glow: '#f59e0b', scale: 0.96, tongues: true, sparks: 2 },
  { ...base, outer: ['#fb7185', '#7f1d1d'], inner: ['#fecdd3', '#e11d48'], core: '#fff1f2', glow: '#e11d48', scale: 1, tongues: true, sparks: 3, texture: 'veins' },
  { ...base, outer: ['#7dd3fc', '#1e3a8a'], inner: ['#e0f2fe', '#38bdf8'], core: '#ffffff', glow: '#38bdf8', scale: 1, tongues: true, sparks: 4, texture: 'veins' },
  { ...base, outer: ['#c4b5fd', '#4c1d95'], inner: ['#f5d0fe', '#a855f7'], core: '#ffffff', glow: '#a855f7', scale: 1, tongues: true, spire: true, sparks: 5, texture: 'stars' },
  { ...base, outer: ['#f8fafc', '#22d3ee'], inner: ['#ffffff', '#a5f3fc'], core: '#ffffff', glow: '#67e8f9', scale: 1, tongues: true, spire: true, halo: true, sparks: 5, texture: 'metal' },
  { ...base, outer: ['#fde68a', '#f472b6'], inner: ['#ffffff', '#fef3c7'], core: '#ffffff', glow: '#fde68a', scale: 1, tongues: true, spire: true, halo: true, wings: true, sparks: 6, texture: 'iris' },
];

const OUTER = 'M32 4C35 15 52 24 52 45C52 59 43 68 32 68C21 68 12 59 12 45C12 35 17 30 21 21C23 27 26 29 28 28C27 20 29 11 32 4Z';
const INNER = 'M32 26C34 33 43 38 43 49C43 58 38 63 32 63C26 63 21 58 21 49C21 43 24 40 27 35C28 38 30 39 31 38C30 33 31 29 32 26Z';
const CORE = 'M32 44C34 48 38 50 38 55C38 60 35 62 32 62C29 62 26 60 26 55C26 51 29 49 32 44Z';
const TONGUE_L = 'M17 42C13 35 14 28 19 21C19 28 22 31 23 37Z';
const TONGUE_R = 'M47 42C51 35 50 28 45 21C45 28 42 31 41 37Z';
const SPIRE = 'M32 -2C34 6 38 9 36 15C34 12 33 12 32 14C31 12 30 12 28 15C26 9 30 6 32 -2Z';
const WING_L = 'M14 46C6 46 -1 40 -4 30C3 31 8 33 13 38ZM14 38C7 36 2 30 1 22C7 24 11 27 15 31Z';
const WING_R = 'M50 46C58 46 65 40 68 30C61 31 56 33 51 38ZM50 38C57 36 62 30 63 22C57 24 53 27 49 31Z';

const SPARKS: { x: number; y: number; d: number; r: number }[] = [
  { x: 20, y: 22, d: 0, r: 1.6 }, { x: 44, y: 18, d: 0.5, r: 1.4 }, { x: 14, y: 34, d: 1.0, r: 1.2 },
  { x: 50, y: 30, d: 1.4, r: 1.5 }, { x: 32, y: 8, d: 0.8, r: 1.3 }, { x: 26, y: 14, d: 1.7, r: 1.1 },
];

const STARS: [number, number, number][] = [[26, 44, 1.5], [38, 38, 1.2], [32, 54, 1.7], [24, 56, 1], [40, 52, 1.1], [33, 31, 1]];

interface StreakFlameProps {
  streak: number;
  /** Pixel width; height follows the flame's proportions. */
  size?: number;
  /** Done today = full colour. Not yet = the flame is kept, just dimmer. */
  lit?: boolean;
  animate?: boolean;
  className?: string;
}

export const StreakFlame = React.memo(({ streak, size = 20, lit = true, animate = true, className }: StreakFlameProps) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tier = flameTierFor(streak);
  const cfg = TIERS[tier.index];
  const isAsh = tier.index === 0;
  const moving = animate && lit && !isAsh;
  // Small flames (habit rows, HUD pill: 12–22px) breathe as a whole on the compositor. Their inner loops
  // (tongues, veins, sparks, sheen…) were SVG-internal animations: invisible at that size, yet each one
  // repainted on the main thread every frame and made the page re-layerize (the Habits list had one per
  // row). Big flames (modals, celebrations, roadmap hero) keep every inner animation.
  const lite = size < 24;
  const inner = moving && !lite;
  const iris = cfg.texture === 'iris';
  const height = Math.round((size * 72) / 64);
  const gid = (s: string) => `${uid}${s}`;

  return (
    <svg
      viewBox="0 -4 64 76"
      width={size}
      height={height}
      className={[className, moving && lite ? 'sf-root-flick' : ''].filter(Boolean).join(' ') || undefined}
      aria-label={`Racha ${tier.name}`}
      role="img"
      style={{
        overflow: 'visible',
        opacity: lit ? 1 : 0.5,
        filter: lit && !isAsh ? `drop-shadow(0 0 ${Math.max(2, size / 5)}px ${cfg.glow})` : 'saturate(0.55)',
        transition: 'opacity .25s, filter .25s',
      }}
    >
      <defs>
        <linearGradient id={gid('o')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cfg.outer[0]} />
          {iris && <stop offset="0.35" stopColor="#f9a8d4" />}
          {iris && <stop offset="0.65" stopColor="#a5b4fc" />}
          <stop offset="1" stopColor={cfg.outer[1]} />
        </linearGradient>
        <linearGradient id={gid('i')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cfg.inner[0]} />
          <stop offset="1" stopColor={cfg.inner[1]} />
        </linearGradient>
        <linearGradient id={gid('s')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity={iris ? 0.55 : 0.75} />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={gid('h')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={cfg.glow} />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <clipPath id={gid('c')}><path d={OUTER} /></clipPath>
      </defs>

      <g className={iris && inner ? 'sf-hue' : undefined}>
        {cfg.halo && (
          <circle cx="32" cy="40" r="31" fill="none" stroke={`url(#${gid('h')})`} strokeWidth="1.2" strokeDasharray="2 4" opacity="0.8"
            className={inner ? 'sf-spin' : undefined} />
        )}

        {cfg.wings && (
          <g fill={`url(#${gid('h')})`} opacity="0.85">
            <path d={WING_L} /><path d={WING_R} />
          </g>
        )}

        <g transform={`translate(32 68) scale(${cfg.scale}) translate(-32 -68)`} className={inner ? 'sf-flick' : undefined}>
          {cfg.tongues && (
            <g fill={`url(#${gid('o')})`} opacity="0.92">
              <path d={TONGUE_L} className={inner ? 'sf-tongue-l' : undefined} />
              <path d={TONGUE_R} className={inner ? 'sf-tongue-r' : undefined} />
            </g>
          )}
          {cfg.spire && <path d={SPIRE} fill={`url(#${gid('i')})`} opacity="0.95" />}

          <path d={OUTER} fill={isAsh ? 'none' : `url(#${gid('o')})`} stroke={isAsh ? cfg.outer[0] : 'none'} strokeWidth="2.4" strokeLinejoin="round" />
          {isAsh && <path d={OUTER} fill={cfg.outer[1]} opacity="0.35" />}

          {/* Texture, clipped to the outer silhouette */}
          <g clipPath={`url(#${gid('c')})`}>
            {cfg.texture === 'veins' && (
              <g fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.4" className={inner ? 'sf-veins' : undefined}>
                <path d="M16 52C22 46 26 56 32 50C38 44 42 54 48 48" />
                <path d="M18 40C24 34 28 44 34 38C40 32 44 40 48 36" />
                <path d="M22 28C27 24 30 31 34 26" />
              </g>
            )}
            {cfg.texture === 'stars' && (
              <g fill="#fff">
                {STARS.map(([x, y, r], i) => (
                  <circle key={i} cx={x} cy={y} r={r} opacity={0.85} className={inner ? 'sf-twinkle' : undefined} style={{ animationDelay: `${i * 0.35}s` }} />
                ))}
              </g>
            )}
            {(cfg.texture === 'metal' || iris) && (
              <rect x="-20" y="0" width="104" height="80" fill={`url(#${gid('s')})`} className={inner ? 'sf-sheen' : undefined} />
            )}
          </g>

          {!isAsh && <path d={INNER} fill={`url(#${gid('i')})`} />}
          {!isAsh && <path d={CORE} fill={cfg.core} opacity="0.95" />}
        </g>

        {Array.from({ length: cfg.sparks }).map((_, i) => {
          const s = SPARKS[i % SPARKS.length];
          return (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={cfg.inner[0]}
              className={inner ? 'sf-spark' : undefined} style={{ animationDelay: `${s.d}s`, opacity: inner ? undefined : 0.7 }} />
          );
        })}
      </g>
    </svg>
  );
});
StreakFlame.displayName = 'StreakFlame';
