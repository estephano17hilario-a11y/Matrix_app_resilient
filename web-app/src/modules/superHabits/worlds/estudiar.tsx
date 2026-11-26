import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import { SUPER_MILESTONES } from '../engine';
import type { WorldDef, WorldCtx } from './types';

// ESTUDIAR — your study notebook: a lined page where each milestone is a line of the
// plan you cross off, highlighted in yellow, with your running GPA stamped on top.

const ROW0 = 124;
const ROW = 43;
const INK = '#1e2a5a';
const HAND = "'Caveat', 'Bradley Hand', 'Segoe Print', cursive";

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { level, theme } = ctx;
  const { primary } = theme.colors;
  const gpa = (level * 4).toFixed(1);
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => (
      <WorldNode key={i} ctx={ctx} i={i} x={316} y={ROW0 + i * ROW - 5} size={30} label={false} />
    ))}>
      <defs>
        <radialGradient id="es-lamp" cx="0.15" cy="0" r="0.9">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="es-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7efd9" /><stop offset="1" stopColor="#e9dcb8" />
        </linearGradient>
      </defs>
      <rect x="-40" y="-40" width="440" height="600" fill="url(#es-lamp)" />

      {[40, 90, 150, 220, 280].map((x, i) => (
        <circle key={x} cx={x} cy={120 + i * 60} r="1.6" fill="#fde68a" className="w-anim w-float" style={{ ['--d' as any]: `${5 + i}s`, ['--dl' as any]: `${i * 0.7}s` }} opacity="0.6" />
      ))}

      <g transform="rotate(-1.4 180 260)">
        <rect x="26" y="46" width="316" height="448" rx="12" fill="#000" opacity="0.35" transform="translate(6 8)" />
        <rect x="26" y="46" width="316" height="448" rx="12" fill="url(#es-paper)" />
        {Array.from({ length: 14 }, (_, i) => <line key={i} x1="26" x2="342" y1={104 + i * 28} y2={104 + i * 28} stroke="#7aa5d8" strokeOpacity="0.45" />)}
        <line x1="70" x2="70" y1="46" y2="494" stroke="#e0556a" strokeOpacity="0.55" strokeWidth="1.6" />
        {Array.from({ length: 12 }, (_, i) => <circle key={i} cx="40" cy={70 + i * 36} r="5" fill="#0c0f24" opacity="0.8" />)}

        <text x="84" y="82" fontSize="25" fontWeight="700" fill={INK} style={{ fontFamily: HAND }}>Plan de estudio</text>
        <path d="M84 92Q130 98 176 90T268 92" fill="none" stroke={primary} strokeWidth="2.4" strokeLinecap="round" />

        {SUPER_MILESTONES.map((m, i) => {
          const y = ROW0 + i * ROW;
          const st = ctx.stateOf(i);
          return (
            <g key={m} opacity={st === 'locked' ? 0.5 : 1}>
              {st === 'earned' && <rect x="80" y={y - 20} width="188" height="26" rx="4" fill="#fde047" opacity="0.55" />}
              <rect x="84" y={y - 14} width="16" height="16" rx="3" fill="none" stroke={INK} strokeWidth="1.8" />
              {st === 'earned' && <path d={`M86 ${y - 6}L92 ${y}L106 ${y - 18}`} fill="none" stroke="#15803d" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />}
              <text x="110" y={y - 1} fontSize="17" fontWeight={st === 'next' ? 800 : 600} fill={INK} style={{ fontFamily: HAND }} textLength={`${m}. ${ctx.theme.badges[i]}`.length > 17 ? 178 : undefined} lengthAdjust="spacingAndGlyphs">{m}. {ctx.theme.badges[i]}</text>
              {st === 'next' && <path d={`M110 ${y + 5}q10 5 20 0t20 0t20 0t20 0t20 0t20 0`} fill="none" stroke="#e0556a" strokeWidth="2" strokeLinecap="round" />}
            </g>
          );
        })}

        <g transform="translate(300 70) rotate(12)">
          <circle r="29" fill="none" stroke="#c81e3a" strokeWidth="3" opacity="0.85" />
          <circle r="24" fill="none" stroke="#c81e3a" strokeWidth="1" opacity="0.7" />
          <text y="-3" textAnchor="middle" fontSize="8" fontWeight="900" fill="#c81e3a" letterSpacing="1.5">PROMEDIO</text>
          <text y="16" textAnchor="middle" fontSize="19" fontWeight="900" fill="#c81e3a">{gpa}</text>
        </g>
      </g>

      <g transform="translate(300 482) rotate(-32)"><g className="w-anim w-bob" style={{ ['--d' as any]: '4s' }}>
        <rect x="-4" y="-48" width="9" height="46" fill="#f59e0b" /><rect x="-4" y="-48" width="9" height="7" fill="#f472b6" />
        <polygon points="-4,-2 5,-2 0.5,10" fill="#fde68a" /><polygon points="-1.5,5 2.5,5 0.5,10" fill="#1f2937" />
      </g></g>
    </SceneBox>
  );
};

export const ESTUDIAR: WorldDef = {
  bg: 'radial-gradient(120% 80% at 10% 0%, #232a66 0%, #0e1133 55%, #070817 100%)',
  headline: (c) => `Promedio ${(c.level * 4).toFixed(1)} · ${c.earned.length}/8 tachadas`,
  Scene,
};
