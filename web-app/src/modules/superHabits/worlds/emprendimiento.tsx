import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import { milestoneLevel } from '../engine';
import type { WorldDef, WorldCtx } from './types';

// EMPRENDIMIENTO — building a startup: your growth curve is a hockey stick and the
// rocket rides it. Each milestone is a funding stage along the curve.

const X0 = 34;
const XW = 284;
const Y0 = 468;
const YH = 392;
const P = 2.2;
const pt = (t: number) => ({ x: X0 + XW * t, y: Y0 - YH * Math.pow(t, P) });
const heading = (t: number) => (Math.atan2(XW, YH * P * Math.pow(Math.max(t, 0.02), P - 1)) * 180) / Math.PI;

const curve = (to: number) => {
  const steps = Math.max(2, Math.round(60 * to));
  return Array.from({ length: steps + 1 }, (_, k) => { const p = pt((to * k) / steps); return `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join('');
};

const money = (k: number) => (k >= 1000 ? `$${(k / 1000).toFixed(1)}M` : `$${Math.round(k)}k`);
const STARS = [[30, 40], [80, 120], [140, 60], [210, 30], [300, 90], [330, 160], [60, 200], [250, 220], [120, 280], [20, 340]];

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { level, theme, streak } = ctx;
  const { primary, secondary } = theme.colors;
  const here = pt(level);
  const angle = heading(level);
  const valuation = streak * streak * 3.2;
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => {
      const p = pt(milestoneLevel(i));
      return <WorldNode key={i} ctx={ctx} i={i} x={p.x} y={p.y} size={36} />;
    })}>
      <defs>
        <linearGradient id="em-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={secondary} stopOpacity="0.55" />
          <stop offset="1" stopColor={primary} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="em-line" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={primary} />
          <stop offset="1" stopColor={secondary} />
        </linearGradient>
      </defs>

      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.6} fill="#fff" className="w-anim w-twinkle" style={{ ['--d' as any]: `${2 + (i % 4)}s`, ['--dl' as any]: `${i * 0.37}s` }} />
      ))}

      {/* chart grid */}
      {Array.from({ length: 8 }, (_, i) => {
        const y = Y0 - YH * milestoneLevel(i) ** P;
        return <line key={i} x1={X0} x2={X0 + XW + 10} y1={y} y2={y} stroke="#fff" strokeOpacity="0.07" />;
      })}
      <line x1={X0} x2={X0} y1="40" y2={Y0} stroke="#fff" strokeOpacity="0.25" />
      <line x1={X0} x2={X0 + XW + 10} y1={Y0} y2={Y0} stroke="#fff" strokeOpacity="0.25" />
      <text x={X0 + 6} y="56" fontSize="10" fontWeight="800" fill="#fff" opacity="0.5" letterSpacing="2">VALORACIÓN</text>

      {/* full path (dim) + travelled path */}
      <path d={curve(1)} fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
      {level > 0 && <path d={`${curve(level)}L${here.x.toFixed(1)} ${Y0}L${X0} ${Y0}Z`} fill="url(#em-area)" />}
      {level > 0 && <path d={curve(level)} fill="none" stroke="url(#em-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}

      {/* summit flag */}
      <g transform={`translate(${pt(1).x} ${pt(1).y})`}>
        <circle r="34" fill={secondary} fillOpacity="0.1" className="w-anim w-pulse" style={{ ['--d' as any]: '3s' }} />
      </g>
      <text x="330" y="38" textAnchor="end" fontSize="10" fontWeight="900" fill={secondary} letterSpacing="3">UNICORNIO</text>

      {/* coins from the origin */}
      {[0, 1.4, 2.8].map((d, i) => (
        <circle key={i} cx={X0 + 8 + i * 12} cy={Y0 - 4} r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" className="w-anim w-rise" style={{ ['--d' as any]: '4s', ['--dl' as any]: `${d}s` }} />
      ))}

      {/* rocket */}
      <g className="w-move" style={{ transform: `translate(${here.x}px, ${here.y}px) rotate(${angle}deg) scale(1.4)` }}>
        <g className="w-anim w-flicker" style={{ ['--d' as any]: '0.35s' }}>
          <path d="M-5 8Q0 36 5 8Z" fill="#fbbf24" />
          <path d="M-3 8Q0 24 3 8Z" fill="#fff" opacity="0.9" />
        </g>
        <path d="M0-24C9-14 10 0 7 10L-7 10C-10 0-9-14 0-24Z" fill="#f8fafc" />
        <path d="M0-24C5-19 7-13 8-8L-8-8C-7-13-5-19 0-24Z" fill={primary} />
        <circle cx="0" cy="-2" r="4" fill="#0b1020" stroke={secondary} strokeWidth="1.6" />
        <path d="M-7 4L-15 14L-7 10Z" fill={primary} /><path d="M7 4L15 14L7 10Z" fill={primary} />
      </g>

      {/* live valuation */}
      <g className="w-move" style={{ transform: `translate(${Math.min(Math.max(here.x - 128, 40), 200)}px, ${Math.max(here.y - 14, 66)}px)` }}>
        <rect width="104" height="26" rx="13" fill="rgba(0,0,0,0.55)" stroke={secondary} strokeOpacity="0.7" />
        <text x="52" y="17.5" textAnchor="middle" fontSize="12.5" fontWeight="900" fill="#fff">{money(valuation)}</text>
      </g>
    </SceneBox>
  );
};

export const EMPRENDIMIENTO: WorldDef = {
  bg: 'radial-gradient(110% 70% at 80% 0%, #3b0f27 0%, #150a1c 55%, #07060d 100%)',
  headline: (c) => `Valoración ${money(c.streak * c.streak * 3.2)} · día ${c.streak}`,
  Scene,
};
