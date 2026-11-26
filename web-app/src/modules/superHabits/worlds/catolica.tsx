import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// RELIGIÓN CATÓLICA — a rose window. Eight panes, one per milestone: each one you earn
// fills with stained glass and throws its light into the nave; the gold cross glows at the heart.

const CX = 180, CY = 232, R0 = 60, R1 = 138;
const GLASS = ['#e11d48', '#2563eb', '#16a34a', '#eab308', '#9333ea', '#f97316', '#0ea5e9', '#f43f5e'];
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, d: number) => `${(CX + r * Math.cos(rad(d))).toFixed(1)} ${(CY + r * Math.sin(rad(d))).toFixed(1)}`;
const pane = (i: number) => {
  const a0 = -90 + i * 45 + 1.5, a1 = a0 + 42;
  return `M${pt(R0, a0)}L${pt(R1, a0)}A${R1} ${R1} 0 0 1 ${pt(R1, a1)}L${pt(R0, a1)}A${R0} ${R0} 0 0 0 ${pt(R0, a0)}Z`;
};
const mid = (i: number) => { const d = -90 + i * 45 + 22.5; return { x: CX + 99 * Math.cos(rad(d)), y: CY + 99 * Math.sin(rad(d)) }; };

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme } = ctx;
  const { primary, secondary, deep } = theme.colors;
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => { const m = mid(i); return <WorldNode key={i} ctx={ctx} i={i} x={m.x} y={m.y} size={38} label={false} />; })}>
      <defs>
        <radialGradient id="ca-core" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stopColor="#fff7c2" /><stop offset="0.6" stopColor={primary} /><stop offset="1" stopColor="#92620a" /></radialGradient>
        <linearGradient id="ca-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id="ca-stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3b3550" /><stop offset="0.5" stopColor="#5a5275" /><stop offset="1" stopColor="#3b3550" /></linearGradient>
      </defs>

      {/* nave arch */}
      <path d="M12 520V232Q12 52 180 6Q348 52 348 232V520Z" fill={deep} stroke="url(#ca-stone)" strokeWidth="12" />
      <path d="M30 520V234Q30 70 180 26Q330 70 330 234V520Z" fill="none" stroke="#fff" strokeOpacity="0.06" strokeWidth="2" />

      {/* light from earned panes */}
      {Array.from({ length: 8 }, (_, i) => ctx.stateOf(i) === 'earned' && (
        <polygon key={i} points={`${mid(i).x - 16},${CY + 70} ${mid(i).x + 16},${CY + 70} ${mid(i).x + (mid(i).x - CX) * 0.9 + 28},520 ${mid(i).x + (mid(i).x - CX) * 0.9 - 28},520`} fill={GLASS[i]} opacity="0.16" className="w-anim w-breathe" style={{ ['--d' as any]: `${5 + (i % 3)}s`, ['--dl' as any]: `${i * 0.4}s` }} />
      ))}
      <polygon points="150,370 210,370 270,520 90,520" fill="url(#ca-ray)" className="w-anim w-breathe" style={{ ['--d' as any]: '7s' }} />

      {/* rose window */}
      <circle cx={CX} cy={CY} r="150" fill="#0a0820" stroke="url(#ca-stone)" strokeWidth="10" />
      <circle cx={CX} cy={CY} r="146" fill="none" stroke={primary} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="1 7" strokeLinecap="round" />
      {Array.from({ length: 8 }, (_, i) => {
        const on = ctx.stateOf(i) === 'earned';
        return (
          <g key={i}>
            <path d={pane(i)} fill={on ? GLASS[i] : '#14122e'} opacity={on ? 0.92 : 1} stroke={primary} strokeOpacity={on ? 0.9 : 0.35} strokeWidth="2.4" strokeLinejoin="round" />
            {on && <path d={pane(i)} fill="#fff" opacity="0.14" className="w-anim w-twinkle" style={{ ['--d' as any]: `${3 + (i % 3)}s`, ['--dl' as any]: `${i * 0.35}s` }} />}
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={R0 - 4} fill="url(#ca-core)" stroke={primary} strokeWidth="2.4" />
      <circle cx={CX} cy={CY} r={R0 + 6} fill="none" stroke={secondary} strokeOpacity="0.5" className="w-anim w-pulse" style={{ ['--d' as any]: '4s' }} />
      <g fill="#fffbe6" stroke="#92620a" strokeWidth="1.5" strokeLinejoin="round">
        <path d={`M${CX - 7} ${CY - 34}h14v22h22v14h-22v38h-14v-38h-22v-14h22Z`} />
      </g>

      {/* candles */}
      {[110, 180, 250].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy="506" rx="26" ry="6" fill={primary} opacity="0.14" className="w-anim w-pulse" style={{ ['--d' as any]: `${3 + i}s` }} />
          <rect x={x - 7} y="478" width="14" height="28" rx="2" fill="#f5efe0" /><rect x={x - 7} y="478" width="4" height="28" fill="#fff" opacity="0.5" />
          <g className="w-anim w-flicker" style={{ ['--d' as any]: `${0.5 + i * 0.12}s` }}>
            <path d={`M${x} 450C${x + 8} 462 ${x + 6} 476 ${x} 477C${x - 6} 476 ${x - 8} 462 ${x} 450Z`} fill="#fbbf24" /><path d={`M${x} 462C${x + 3} 468 ${x + 2} 474 ${x} 475C${x - 2} 474 ${x - 3} 468 ${x} 462Z`} fill="#fff" />
          </g>
        </g>
      ))}
      {[[40, 90], [320, 120], [60, 400], [310, 380], [90, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fde68a" className="w-anim w-float" style={{ ['--d' as any]: `${5 + i}s`, ['--dl' as any]: `${i * 0.7}s` }} opacity="0.7" />)}
    </SceneBox>
  );
};

export const CATOLICA: WorldDef = {
  bg: 'radial-gradient(110% 70% at 50% 30%, #261b5e 0%, #120e2a 55%, #06050f 100%)',
  headline: (c) => `${c.earned.length}/8 vitrales encendidos`,
  Scene,
};
