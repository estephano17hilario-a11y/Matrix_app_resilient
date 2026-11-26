import React, { useId } from 'react';
import { Lock, type LucideIcon } from 'lucide-react';
import './superHabits.css';

// Roadmap badge. The metal and the silhouette grow with the milestone:
// bronze disc → silver → gold shield → platinum shield → emerald hexagon →
// ruby star → sapphire diamond → mythic sunburst.

export const BADGE_METALS = [
  { name: 'Bronce', a: '#f0b27a', b: '#7c4a1e', rim: '#fcd9b0' },
  { name: 'Plata', a: '#f1f5f9', b: '#64748b', rim: '#ffffff' },
  { name: 'Oro', a: '#fde047', b: '#b45309', rim: '#fff3b0' },
  { name: 'Platino', a: '#e2e8f0', b: '#38bdf8', rim: '#f8fafc' },
  { name: 'Esmeralda', a: '#6ee7b7', b: '#047857', rim: '#d1fae5' },
  { name: 'Rubí', a: '#fda4af', b: '#9f1239', rim: '#ffe4e6' },
  { name: 'Zafiro', a: '#bae6fd', b: '#1d4ed8', rim: '#e0f2fe' },
  { name: 'Mítico', a: '#fde68a', b: '#c026d3', rim: '#ffffff' },
] as const;

const star = (points: number, outer: number, inner: number) => {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
};

const SHAPES: ((p: { fill?: string; stroke?: string; strokeWidth?: number; transform?: string }) => React.ReactElement)[] = [
  p => <circle cx="50" cy="50" r="40" {...p} />,
  p => <circle cx="50" cy="50" r="42" {...p} />,
  p => <path d="M50 6L87 19V51C87 73 71 88 50 95C29 88 13 73 13 51V19Z" {...p} />,
  p => <path d="M50 4L90 18V50C90 74 72 90 50 97C28 90 10 74 10 50V18Z" {...p} />,
  p => <path d="M50 5L89 27V73L50 95L11 73V27Z" {...p} />,
  p => <polygon points={star(8, 46, 36)} {...p} />,
  p => <path d="M50 3L92 40L50 97L8 40Z" {...p} />,
  p => <polygon points={star(12, 48, 40)} {...p} />,
];

interface BadgeEmblemProps {
  /** 0..7, position in the roadmap. */
  level: number;
  icon: LucideIcon;
  size?: number;
  state?: 'earned' | 'next' | 'locked';
  /** Habit accent used for the inner plate. */
  accent?: string;
  animate?: boolean;
}

export const BadgeEmblem = React.memo(({ level, icon: Icon, size = 64, state = 'earned', accent = '#6366f1', animate = true }: BadgeEmblemProps) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const lv = Math.max(0, Math.min(7, level));
  const metal = BADGE_METALS[lv];
  const Shape = SHAPES[lv];
  const earned = state === 'earned';
  const locked = state === 'locked';
  const mythic = lv === 7;

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size, height: size,
        filter: earned ? `drop-shadow(0 0 ${size / 6}px ${metal.a}88)` : locked ? 'grayscale(1) brightness(.55)' : 'grayscale(.5) brightness(.8)',
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className={mythic && earned && animate ? 'sf-hue' : undefined} aria-hidden>
        <defs>
          <linearGradient id={`${uid}m`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={metal.a} />
            {mythic && <stop offset="0.5" stopColor="#f472b6" />}
            <stop offset="1" stopColor={metal.b} />
          </linearGradient>
          <linearGradient id={`${uid}p`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity="0.95" />
            <stop offset="1" stopColor="#0a0a0f" />
          </linearGradient>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}c`}>{Shape({})}</clipPath>
        </defs>
        {Shape({ fill: `url(#${uid}m)`, stroke: metal.rim, strokeWidth: 2.2 })}
        {Shape({ fill: `url(#${uid}p)`, stroke: metal.b, strokeWidth: 1, transform: 'translate(50 50) scale(.74) translate(-50 -50)' })}
        {earned && (
          <g clipPath={`url(#${uid}c)`}>
            <rect x="-60" y="0" width="220" height="100" fill={`url(#${uid}s)`} className={animate ? 'sf-sheen' : undefined} />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {locked ? (
          <Lock size={size * 0.3} className="text-white/60" />
        ) : (
          <Icon size={size * 0.38} strokeWidth={2.2} style={{ color: '#fff', filter: `drop-shadow(0 1px 2px ${accent})` }} />
        )}
      </div>
    </div>
  );
});
BadgeEmblem.displayName = 'BadgeEmblem';
