import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import { SUPER_MILESTONES } from '../engine';
import type { WorldDef, WorldCtx } from './types';

// GYM — a plate tree under a spotlight. Every milestone slams one more plate on the
// bar; the LED counter adds up the load you can now move.

const KG = [25, 20, 20, 15, 10, 5, 2.5, 1.25];
const Y = (i: number) => 440 - i * 46;
const W = (i: number) => 224 - i * 15;
const loadOf = (n: number) => 20 + KG.slice(0, n).reduce((s, k) => s + k * 2, 0);

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme } = ctx;
  const { primary, secondary } = theme.colors;
  const load = loadOf(ctx.earned.length);
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => (
      <WorldNode key={i} ctx={ctx} i={i} x={180 + W(i) / 2 + 26} y={Y(i)} size={34} label={false} />
    ))}>
      <defs>
        <linearGradient id="gy-spot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gy-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4b5563" /><stop offset="0.45" stopColor="#e5e7eb" /><stop offset="1" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="gy-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={secondary} /><stop offset="0.5" stopColor={primary} /><stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="gy-dead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2f3a" /><stop offset="1" stopColor="#15171d" />
        </linearGradient>
      </defs>

      <polygon points="120,0 240,0 330,520 30,520" fill="url(#gy-spot)" className="w-anim w-breathe" style={{ ['--d' as any]: '6s' }} />
      <ellipse cx="180" cy="478" rx="150" ry="16" fill="#000" opacity="0.5" />
      <ellipse cx="180" cy="474" rx="120" ry="10" fill={primary} opacity="0.16" />

      <rect x="110" y="20" width="140" height="46" rx="8" fill="#0a0a0d" stroke="#3f3f46" />
      <text x="180" y="52" textAnchor="middle" fontSize="28" fontWeight="900" fill={secondary} style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>{load}<tspan fontSize="13" dx="4">KG</tspan></text>

      <rect x="171" y="70" width="18" height="404" rx="4" fill="url(#gy-steel)" />
      <rect x="150" y="466" width="60" height="10" rx="3" fill="#1f2937" />

      {SUPER_MILESTONES.map((_, i) => {
        const on = ctx.stateOf(i) === 'earned';
        const x = 180 - W(i) / 2;
        return (
          <g key={i} opacity={on ? 1 : 0.55}>
            <rect x={x} y={Y(i) - 19} width={W(i)} height="38" rx="9" fill={on ? 'url(#gy-plate)' : 'url(#gy-dead)'} stroke={on ? secondary : '#4b5563'} strokeWidth="1.6" />
            {on && <rect x={x + 8} y={Y(i) - 16} width={W(i) - 16} height="6" rx="3" fill="#fff" opacity="0.35" />}
            <circle cx="180" cy={Y(i)} r="8" fill="#0b0b0f" stroke="#9ca3af" />
            <text x={x + 14} y={Y(i) + 4} fontSize="11" fontWeight="900" fill={on ? '#fff' : '#6b7280'}>{KG[i]}</text>
            <text x={x + W(i) - 14} y={Y(i) + 4} textAnchor="end" fontSize="11" fontWeight="900" fill={on ? '#fff' : '#6b7280'}>{KG[i]}</text>
          </g>
        );
      })}

      {[110, 150, 200, 240].map((x, i) => (
        <circle key={x} cx={x} cy={462} r="2.2" fill="#fff" opacity="0.7" className="w-anim w-rise" style={{ ['--d' as any]: `${3 + i}s`, ['--dl' as any]: `${i * 0.8}s` }} />
      ))}
    </SceneBox>
  );
};

export const GYM: WorldDef = {
  bg: 'radial-gradient(110% 70% at 50% 0%, #3a0f12 0%, #14090b 55%, #070506 100%)',
  headline: (c) => `${loadOf(c.earned.length)} kg en la barra`,
  Scene,
};
