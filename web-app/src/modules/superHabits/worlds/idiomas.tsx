import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// IDIOMAS — a spinning globe and a flight route. Each milestone lands in a new
// country, and the globe greets you in that language.

const HELLO = ['Hola', 'Hello', 'Bonjour', 'Ciao', 'Hallo', 'こんにちは', 'Olá', 'Привет'];
const START = { x: 18, y: 470 };
const PTS = Array.from({ length: 8 }, (_, i) => ({ x: 46 + i * 38, y: i % 2 ? 424 : 462 }));
const ROUTE = [START, ...PTS];

const LAND = [
  'M30 90q20-30 55-22t40 34q-6 28-38 30t-57-42Z', 'M150 40q30-14 58 6t10 38q-34 14-62-8t-6-36Z',
  'M60 170q26-8 38 22t-12 48q-28-4-34-34t8-36Z', 'M200 150q36-6 52 26t-24 54q-34-6-38-36t10-44Z',
  'M274 70q22-6 34 18t-18 34q-22-8-22-26t6-26Z', 'M110 250q22-10 34 8t-8 30q-22 0-26-18t0-20Z',
];

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, level } = ctx;
  const { primary, secondary } = theme.colors;
  const u = level * 8;
  const j = Math.min(7, Math.floor(u));
  const f = u - j;
  const a = ROUTE[j], b = ROUTE[j + 1];
  const plane = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const last = ctx.earned.length - 1;
  const route = ROUTE.map((p, k) => `${k ? 'L' : 'M'}${p.x} ${p.y}`).join('');
  return (
    <SceneBox overlay={PTS.map((p, i) => <WorldNode key={i} ctx={ctx} i={i} x={p.x} y={p.y} size={32} label={false} />)}>
      <defs>
        <clipPath id="id-globe"><circle cx="180" cy="168" r="118" /></clipPath>
        <radialGradient id="id-sea" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={secondary} /><stop offset="0.55" stopColor={primary} /><stop offset="1" stopColor="#06141f" />
        </radialGradient>
        <radialGradient id="id-shade" cx="0.3" cy="0.25" r="0.9">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
      </defs>
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={(i * 83) % 360} cy={(i * 47) % 300} r={i % 4 ? 0.9 : 1.5} fill="#fff" className="w-anim w-twinkle" style={{ ['--d' as any]: `${2 + (i % 4)}s`, ['--dl' as any]: `${i * 0.3}s` }} />
      ))}

      <circle cx="180" cy="168" r="128" fill={secondary} opacity="0.18" className="w-anim w-breathe" style={{ ['--d' as any]: '5s' }} />
      <circle cx="180" cy="168" r="118" fill="url(#id-sea)" />
      <g clipPath="url(#id-globe)">
        <g transform="translate(62 50)">
          <g className="w-anim w-wave" style={{ ['--d' as any]: '48s' }}>
            <g fill="#34d399" opacity="0.88">{LAND.map((d, i) => <path key={i} d={d} />)}</g>
            <g fill="#34d399" opacity="0.88" transform="translate(360 0)">{LAND.map((d, i) => <path key={i} d={d} />)}</g>
          </g>
        </g>
        {[-60, -30, 0, 30, 60].map(y => <line key={y} x1="62" x2="298" y1={168 + y * 1.6} y2={168 + y * 1.6} stroke="#fff" strokeOpacity="0.12" />)}
        {[30, 60, 90, 120].map(rx => <ellipse key={rx} cx="180" cy="168" rx={rx} ry="118" fill="none" stroke="#fff" strokeOpacity="0.1" />)}
        <circle cx="180" cy="168" r="118" fill="url(#id-shade)" />
      </g>
      <text x="180" y="182" textAnchor="middle" fontSize={last >= 0 && HELLO[last].length > 6 ? 30 : 44} fontWeight="900" fill="#fff" stroke="#000" strokeOpacity="0.25" strokeWidth="1" style={{ letterSpacing: -1 }}>
        {last >= 0 ? HELLO[last] : '…'}
      </text>

      <path d={route} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />
      {PTS.map((p, i) => ctx.stateOf(i) === 'earned' && (
        <g key={i}>
          <rect x={p.x - 24} y={p.y - 54} width="48" height="20" rx="10" fill="rgba(0,0,0,0.6)" stroke={secondary} strokeOpacity="0.8" />
          <text x={p.x} y={p.y - 40} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">{HELLO[i]}</text>
        </g>
      ))}

      <g className="w-move" style={{ transform: `translate(${plane.x}px, ${plane.y}px) rotate(${ang}deg) scale(1.5)` }}>
        <path d="M14 0L-8-9L-5 0L-8 9Z" fill="#fff" /><path d="M-1-2L-10-14L-6-14L4-2Z" fill="#e2e8f0" /><path d="M-1 2L-10 14L-6 14L4 2Z" fill="#e2e8f0" />
      </g>
      <text x="180" y="318" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" opacity="0.55" letterSpacing="3">
        {ctx.earned.length ? `${ctx.earned.length} PAÍSES VISITADOS` : 'PASAPORTE EN BLANCO'}
      </text>
    </SceneBox>
  );
};

export const IDIOMAS: WorldDef = {
  bg: 'radial-gradient(110% 70% at 50% 20%, #0f3a44 0%, #0b1730 55%, #05070f 100%)',
  headline: (c) => `${c.earned.length} idiomas saludados`,
  Scene,
};
