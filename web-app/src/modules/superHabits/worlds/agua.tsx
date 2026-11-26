import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import { milestoneLevel } from '../engine';
import type { WorldDef, WorldCtx } from './types';

// AGUA — a giant glass you fill, one milestone per eighth. 60 days = brim.

const TOP = 80;
const BOTTOM = 470;
const H = BOTTOM - TOP;
const GLASS = 'M82 80L278 80L254 452Q252 470 234 470L126 470Q108 470 106 452Z';
const edgeX = (y: number) => 278 - (24 * (y - TOP)) / (H - 18);

const WAVE = 'M0 0q25-9 50 0t50 0t50 0t50 0t50 0t50 0t50 0t50 0V460H0Z';

const BUBBLES = [
  [120, 440, 4, 5.5, 0], [150, 420, 3, 6.5, 1.3], [180, 450, 5, 7, 2.1], [210, 430, 3, 5, 0.6],
  [235, 445, 4, 6, 3.2], [165, 400, 2.5, 8, 4], [200, 410, 3.5, 6.8, 1.9],
] as const;

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { level, theme } = ctx;
  const { primary, secondary } = theme.colors;
  const drop = (1 - level) * H; // how far the water sits below the brim
  const surface = TOP + drop;
  const ml = Math.round(level * 500);
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => (
      <WorldNode key={i} ctx={ctx} i={i} x={326} y={BOTTOM - H * milestoneLevel(i)} size={38} />
    ))}>
      <defs>
        <linearGradient id="ag-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={secondary} stopOpacity="0.95" />
          <stop offset="1" stopColor={primary} />
        </linearGradient>
        <linearGradient id="ag-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="ag-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={secondary} stopOpacity="0.22" />
          <stop offset="1" stopColor={secondary} stopOpacity="0" />
        </linearGradient>
        <clipPath id="ag-clip"><path d={GLASS} /></clipPath>
      </defs>

      {/* caustic light shafts */}
      {[40, 150, 250].map((x, i) => (
        <polygon key={x} points={`${x},0 ${x + 46},0 ${x + 110},520 ${x + 30},520`} fill="url(#ag-beam)" className="w-anim w-breathe" style={{ ['--d' as any]: `${7 + i * 2}s`, ['--dl' as any]: `${i}s` }} />
      ))}

      {/* tap + stream */}
      <rect x="168" y="-4" width="24" height="26" rx="6" fill="#cbd5e1" opacity="0.7" />
      <rect x="177" y="20" width="6" height={Math.max(0, surface - 20)} fill={secondary} opacity="0.55" />
      {[0, 1.1, 2.2].map(d => (
        <circle key={d} cx="180" cy="34" r="3.2" fill="#fff" opacity="0.8" className="w-anim w-fall" style={{ ['--d' as any]: '2.4s', ['--dl' as any]: `${d}s` }} />
      ))}

      {/* glass back + water */}
      <path d={GLASS} fill="rgba(255,255,255,0.05)" />
      <g clipPath="url(#ag-clip)">
        <g className="w-move" style={{ transform: `translateY(${drop}px)` }}>
          <rect x="60" y={TOP + 6} width="240" height={H + 30} fill="url(#ag-water)" />
          <g transform={`translate(60 ${TOP - 4})`}><g className="w-anim w-wave" style={{ ['--d' as any]: '6s' }}><path d={WAVE} fill={secondary} opacity="0.55" /></g></g>
          <g transform={`translate(60 ${TOP + 2})`}><g className="w-anim w-wave" style={{ ['--d' as any]: '9s' }}><path d={WAVE} fill={primary} opacity="0.7" transform="translate(-17 0)" /></g></g>
          {BUBBLES.map(([x, y, r, d, dl], i) => (
            <circle key={i} cx={x} cy={y - 40} r={r} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.4" className="w-anim w-rise" style={{ ['--d' as any]: `${d}s`, ['--dl' as any]: `${dl}s` }} />
          ))}
        </g>
      </g>

      {/* glass front: shine, rim, base */}
      <path d={GLASS} fill="url(#ag-glass)" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M96 100L116 440" stroke="#fff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
      <path d="M262 100L248 300" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="180" cy={TOP} rx="98" ry="9" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
      <ellipse cx="180" cy={BOTTOM + 2} rx="62" ry="7" fill="#000" opacity="0.25" />

      {/* ml read-out */}
      <text x="180" y="276" textAnchor="middle" fontSize="54" fontWeight="900" fill="#fff" opacity="0.9" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: -2 }}>{ml}</text>
      <text x="180" y="300" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" opacity="0.7" letterSpacing="4">ML / 500</text>

      {/* level ticks */}
      {Array.from({ length: 8 }, (_, i) => {
        const y = BOTTOM - H * milestoneLevel(i);
        return <line key={i} x1={edgeX(y) + 2} x2={300} y1={y} y2={y} stroke="#fff" strokeOpacity={ctx.stateOf(i) === 'locked' ? 0.18 : 0.6} strokeDasharray="3 4" />;
      })}
      <line x1="40" x2="82" y1={surface} y2={surface} stroke={secondary} strokeWidth="2" strokeLinecap="round" className="w-move" opacity="0.9" />
      <text x="40" y={surface - 7} textAnchor="start" fontSize="10" fontWeight="800" fill={secondary}>AHORA</text>
    </SceneBox>
  );
};

export const AGUA: WorldDef = {
  bg: 'radial-gradient(120% 70% at 50% 0%, #0b4a78 0%, #052338 55%, #02111d 100%)',
  headline: (c) => `${Math.round(c.level * 500)} ml · ${c.earned.length}/8 insignias`,
  Scene,
};
