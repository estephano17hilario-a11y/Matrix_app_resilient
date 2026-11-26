import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// LECTURA — a reading nook: an open book turning its pages above a bookcase.
// Every milestone puts a finished book on the shelf; the next one leans out, bookmarked.

const COLORS = ['#b45309', '#9f1239', '#1d4ed8', '#047857', '#7c3aed', '#c2410c', '#0e7490', '#a16207'];
const slot = (i: number) => {
  const row = i < 4 ? 0 : 1;
  const col = i % 4;
  return { x: 64 + col * 68, base: row ? 480 : 384, w: 46, h: 76 + ((i * 7) % 3) * 6 };
};

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme } = ctx;
  const { primary, secondary } = theme.colors;
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => { const s = slot(i); return <WorldNode key={i} ctx={ctx} i={i} x={s.x} y={s.base - s.h / 2} size={32} label={false} />; })}>
      <defs>
        <radialGradient id="le-lamp" cx="0.5" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.45" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="le-page" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e9dcb8" /><stop offset="0.5" stopColor="#fbf4de" /><stop offset="1" stopColor="#e9dcb8" />
        </linearGradient>
      </defs>
      <rect x="-30" y="-30" width="420" height="330" fill="url(#le-lamp)" />

      {/* open book */}
      <g transform="translate(0 6)">
        <path d="M40 232Q180 262 320 232L320 112Q180 142 40 112Z" fill="#3b1d0a" />
        <path d="M52 220Q180 246 308 220L308 100Q180 128 52 100Z" fill="url(#le-page)" />
        <line x1="180" x2="180" y1="116" y2="236" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5, 6].map(i => <rect key={i} x="68" y={116 + i * 14} width={104 - (i % 3) * 14} height="3" rx="1.5" fill="#6b5a3a" opacity="0.5" />)}
        {[0, 1, 2, 3, 4, 5, 6].map(i => <rect key={i} x="192" y={116 + i * 14} width={100 - (i % 2) * 20} height="3" rx="1.5" fill="#6b5a3a" opacity="0.5" />)}
        {/* turning page */}
        <g style={{ transformOrigin: '180px 150px', transformBox: 'view-box' }} className="w-anim w-pageflip">
          <path d="M180 116Q244 118 306 102L306 218Q244 232 180 236Z" fill="url(#le-page)" stroke="#c7b280" strokeWidth="1" />
          {[0, 1, 2, 3, 4].map(i => <rect key={i} x="198" y={128 + i * 16} width={84 - (i % 2) * 18} height="3" rx="1.5" fill="#6b5a3a" opacity="0.4" />)}
        </g>
        <path d="M176 112L176 168L168 158L160 168L160 112Z" fill={primary} />
        {[[70, 90], [150, 70], [250, 80], [300, 60]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.8" fill="#fde68a" className="w-anim w-float" style={{ ['--d' as any]: `${4 + i}s`, ['--dl' as any]: `${i * 0.6}s` }} opacity="0.8" />
        ))}
      </g>

      {/* shelves */}
      {[384, 480].map(y => (
        <g key={y}>
          <rect x="30" y={y} width="300" height="12" rx="3" fill="#4a2a12" /><rect x="30" y={y} width="300" height="3" fill="#8a5a2c" />
          <rect x="30" y={y - 96} width="8" height="96" fill="#2c180a" opacity="0.6" /><rect x="322" y={y - 96} width="8" height="96" fill="#2c180a" opacity="0.6" />
        </g>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const s = slot(i);
        const st = ctx.stateOf(i);
        const x = s.x - s.w / 2;
        if (st === 'locked') return <rect key={i} x={x} y={s.base - s.h} width={s.w} height={s.h} rx="4" fill="none" stroke="#fff" strokeOpacity="0.16" strokeDasharray="4 5" />;
        const tilt = st === 'next' ? -9 : 0;
        return (
          <g key={i} transform={`rotate(${tilt} ${x + s.w} ${s.base})`}>
            <rect x={x} y={s.base - s.h} width={s.w} height={s.h} rx="4" fill={COLORS[i]} />
            <rect x={x} y={s.base - s.h} width="6" height={s.h} fill="#000" opacity="0.2" />
            <rect x={x} y={s.base - s.h + 8} width={s.w} height="4" fill={st === 'earned' ? secondary : '#fff'} opacity="0.85" />
            <rect x={x} y={s.base - 12} width={s.w} height="4" fill={st === 'earned' ? secondary : '#fff'} opacity="0.85" />
            {st === 'next' && <path d={`M${x + s.w - 10} ${s.base - s.h}v${s.h * 0.55}l5 -5l5 5v-${s.h * 0.55}Z`} fill={primary} />}
          </g>
        );
      })}
    </SceneBox>
  );
};

export const LECTURA: WorldDef = {
  bg: 'radial-gradient(110% 60% at 50% 0%, #4a2b0c 0%, #1d1208 55%, #0a0603 100%)',
  headline: (c) => `${c.earned.length} libros en la estantería`,
  Scene,
};
