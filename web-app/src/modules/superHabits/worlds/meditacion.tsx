import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// MEDITACIÓN — a moonlit pond. Stepping stones lead across the water to a lotus that
// opens as you advance; every stone you earn lights up and sends ripples out.

const STONES = [[120, 480], [236, 452], [132, 424], [226, 398], [142, 374], [218, 350], [158, 328], [202, 308]];
const SIZE = (i: number) => 44 - i * 2.2;
const FIREFLIES = [[50, 330], [310, 360], [90, 440], [280, 300], [60, 250], [320, 450]];

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, level } = ctx;
  const { primary, secondary } = theme.colors;
  const bloom = 0.35 + level * 0.65;
  return (
    <SceneBox overlay={STONES.map(([x, y], i) => <WorldNode key={i} ctx={ctx} i={i} x={x} y={y - 2} size={SIZE(i)} label={false} />)}>
      <defs>
        <radialGradient id="me-moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff" /><stop offset="0.7" stopColor="#ede9fe" /><stop offset="1" stopColor={secondary} /></radialGradient>
        <radialGradient id="me-halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={secondary} stopOpacity="0.5" /><stop offset="1" stopColor={secondary} stopOpacity="0" /></radialGradient>
        <linearGradient id="me-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b1445" /><stop offset="1" stopColor="#07061a" /></linearGradient>
      </defs>

      {Array.from({ length: 28 }, (_, i) => <circle key={i} cx={(i * 67) % 360} cy={(i * 41) % 200} r={i % 5 ? 0.9 : 1.6} fill="#fff" className="w-anim w-twinkle" style={{ ['--d' as any]: `${2 + (i % 5)}s`, ['--dl' as any]: `${i * 0.3}s` }} />)}

      <circle cx="180" cy="104" r="96" fill="url(#me-halo)" className="w-anim w-breathe" style={{ ['--d' as any]: '8s' }} />
      <circle cx="180" cy="104" r="50" fill="url(#me-moon)" />
      <circle cx="166" cy="92" r="9" fill="#c4b5fd" opacity="0.35" /><circle cx="196" cy="118" r="6" fill="#c4b5fd" opacity="0.3" />

      <rect x="-20" y="236" width="400" height="300" fill="url(#me-water)" />
      <ellipse cx="180" cy="262" rx="46" ry="9" fill={secondary} opacity="0.3" className="w-anim w-breathe" style={{ ['--d' as any]: '8s' }} />
      <ellipse cx="180" cy="262" rx="26" ry="5" fill="#fff" opacity="0.35" />
      {[0, 1, 2].map(i => <ellipse key={i} cx="180" cy="300" rx="150" ry="22" fill="none" stroke={secondary} strokeOpacity="0.28" className="w-anim w-ripple" style={{ ['--d' as any]: '7s', ['--dl' as any]: `${i * 2.3}s` }} />)}

      {/* lotus */}
      <g transform="translate(180 282)" className="w-move" style={{ transform: `translate(180px, 282px) scale(${bloom})` }}>
        {[-70, -42, -16, 16, 42, 70].map((r, i) => <ellipse key={i} cx="0" cy="-16" rx="9" ry="22" fill={i % 2 ? primary : secondary} opacity="0.92" transform={`rotate(${r})`} />)}
        <ellipse cx="0" cy="-14" rx="8" ry="20" fill="#fff" opacity="0.85" />
        <circle cx="0" cy="-8" r="4" fill="#fde68a" />
      </g>

      {STONES.map(([x, y], i) => {
        const st = ctx.stateOf(i);
        const w = SIZE(i) / 2 + 8;
        return (
          <g key={i}>
            {st === 'earned' && [0, 1].map(k => <ellipse key={k} cx={x} cy={y + 4} rx={w + 14} ry={(w + 14) * 0.32} fill="none" stroke={secondary} strokeOpacity="0.7" className="w-anim w-ripple" style={{ ['--d' as any]: '4.5s', ['--dl' as any]: `${k * 2.2 + i * 0.4}s` }} />)}
            <ellipse cx={x} cy={y + 6} rx={w} ry={w * 0.36} fill="#000" opacity="0.5" />
            <ellipse cx={x} cy={y} rx={w} ry={w * 0.42} fill={st === 'locked' ? '#2a2750' : '#5b4fb0'} />
            <ellipse cx={x} cy={y - 2} rx={w - 3} ry={(w - 3) * 0.36} fill={st === 'locked' ? '#3a3670' : '#8b7be0'} opacity="0.9" />
          </g>
        );
      })}

      {FIREFLIES.map(([x, y], i) => (
        <g key={i} className="w-anim w-float" style={{ ['--d' as any]: `${5 + i}s`, ['--dl' as any]: `${i * 0.8}s` }}>
          <circle cx={x} cy={y} r="7" fill="#fde68a" opacity="0.25" /><circle cx={x} cy={y} r="2.4" fill="#fef9c3" className="w-anim w-twinkle" style={{ ['--d' as any]: '2s', ['--dl' as any]: `${i * 0.4}s` }} />
        </g>
      ))}

      <circle cx="46" cy="52" r="15" fill="none" stroke="#fff" strokeOpacity="0.5" className="w-anim w-breathe" style={{ ['--d' as any]: '8s' }} />
      <text x="46" y="84" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" opacity="0.6" letterSpacing="2">RESPIRA</text>
    </SceneBox>
  );
};

export const MEDITACION: WorldDef = {
  bg: 'linear-gradient(180deg, #170f3d 0%, #0d0a28 55%, #05040f 100%)',
  headline: (c) => `${c.earned.length}/8 piedras cruzadas`,
  Scene,
};
