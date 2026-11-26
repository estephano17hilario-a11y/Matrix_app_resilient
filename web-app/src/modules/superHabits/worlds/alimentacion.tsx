import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// ALIMENTACIÓN — a fruit tree you grow. The trunk climbs as the level rises, a new
// branch sprouts at every milestone and its fruit ripens when you earn it.

const BY = (i: number) => 440 - i * 47;
const TIP = (i: number) => ({ x: 180 + (i % 2 ? 1 : -1) * (74 + (i % 3) * 14), y: BY(i) - 36 });

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, level } = ctx;
  const { primary, secondary } = theme.colors;
  const climb = (1 - level) * 380;
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => { const t = TIP(i); return <WorldNode key={i} ctx={ctx} i={i} x={t.x} y={t.y} size={38} label={false} />; })}>
      <defs>
        <linearGradient id="al-trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5b3a1e" /><stop offset="0.5" stopColor="#a0693a" /><stop offset="1" stopColor="#5b3a1e" />
        </linearGradient>
        <radialGradient id="al-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7c2" /><stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
        <clipPath id="al-clip"><rect x="120" y="60" width="120" height="430" className="w-move" style={{ transform: `translateY(${climb}px)` }} /></clipPath>
      </defs>

      {/* sun + clouds */}
      <circle cx="60" cy="70" r="64" fill="url(#al-sun)" className="w-anim w-breathe" style={{ ['--d' as any]: '6s' }} />
      <g transform="translate(60 70)"><g className="w-anim w-spin" style={{ ['--d' as any]: '40s' }}>
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x="-2" y="-46" width="4" height="12" rx="2" fill="#fde047" opacity="0.8" transform={`rotate(${i * 36})`} />)}
      </g></g>
      <circle cx="60" cy="70" r="24" fill="#fde047" />
      {[[0, 60, 1], [60, 120, 0.7]].map(([d, y, s], i) => (
        <g key={i} className="w-anim w-drift" style={{ ['--d' as any]: `${50 + i * 20}s`, ['--dl' as any]: `${-d}s` }}>
          <ellipse cx="0" cy={y} rx={34 * s} ry={11 * s} fill="#fff" opacity="0.5" /><ellipse cx={14 * s} cy={y - 8 * s} rx={20 * s} ry={10 * s} fill="#fff" opacity="0.5" />
        </g>
      ))}

      {/* ground */}
      <ellipse cx="180" cy="520" rx="250" ry="70" fill="#2f7a2b" />
      <ellipse cx="180" cy="526" rx="250" ry="62" fill="#3f9a37" opacity="0.8" />
      {[70, 110, 250, 300].map(x => <path key={x} d={`M${x} 484q-3-14 0-22q3 8 4 22`} fill="none" stroke="#86efac" strokeWidth="2.4" strokeLinecap="round" className="w-anim w-sway" style={{ ['--d' as any]: '3.5s' }} />)}

      {/* ghost trunk + branches */}
      <path d="M168 484C170 360 172 220 176 70L184 70C188 220 190 360 192 484Z" fill="#fff" opacity="0.1" />
      {Array.from({ length: 8 }, (_, i) => { const t = TIP(i); const y = BY(i); const dir = t.x > 180 ? 1 : -1; return <path key={i} d={`M180 ${y}Q${180 + dir * 40} ${y - 4} ${t.x} ${t.y}`} fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="5" strokeLinecap="round" />; })}

      {/* grown part, revealed from the ground up */}
      <g clipPath="url(#al-clip)">
        <path d="M166 486C168 360 172 220 176 64L184 64C188 220 192 360 194 486Z" fill="url(#al-trunk)" />
        {Array.from({ length: 8 }, (_, i) => { const t = TIP(i); const y = BY(i); const dir = t.x > 180 ? 1 : -1; return <path key={i} d={`M180 ${y}Q${180 + dir * 40} ${y - 4} ${t.x} ${t.y}`} fill="none" stroke="#7a4a26" strokeWidth="6" strokeLinecap="round" />; })}
      </g>

      {/* leaves, only on earned branches */}
      {Array.from({ length: 8 }, (_, i) => {
        if (ctx.stateOf(i) !== 'earned') return null;
        const t = TIP(i);
        return [[-22, 8, -30], [22, 10, 25], [0, 24, 5]].map(([dx, dy, r], k) => (
          <ellipse key={`${i}-${k}`} cx={t.x + dx} cy={t.y + dy} rx="15" ry="7.5" fill={k % 2 ? primary : '#4ade80'} transform={`rotate(${r} ${t.x + dx} ${t.y + dy})`} className="w-anim w-sway" style={{ ['--d' as any]: `${3 + k}s`, ['--dl' as any]: `${i * 0.2}s` }} />
        ));
      })}

      {/* butterflies */}
      {[0, 1].map(i => (
        <g key={i} className="w-anim w-drift" style={{ ['--d' as any]: `${22 + i * 9}s`, ['--dl' as any]: `${-i * 8}s` }}>
          <g transform={`translate(0 ${230 + i * 80})`}><g className="w-anim w-bob" style={{ ['--d' as any]: '1.2s' }}>
            <ellipse cx="-5" cy="0" rx="5" ry="3.4" fill={secondary} /><ellipse cx="5" cy="0" rx="5" ry="3.4" fill={primary} />
          </g></g>
        </g>
      ))}

      {/* basket */}
      <g transform="translate(300 482)">
        <path d="M-26 -14L26 -14L20 14L-20 14Z" fill="#a16207" stroke="#713f12" strokeWidth="2" />
        <path d="M-24 -14Q0-38 24 -14" fill="none" stroke="#713f12" strokeWidth="3" />
        {Array.from({ length: Math.min(6, ctx.earned.length) }, (_, i) => <circle key={i} cx={-14 + i * 6} cy={-16 - (i % 2) * 4} r="6" fill={i % 2 ? secondary : primary} />)}
      </g>
    </SceneBox>
  );
};

export const ALIMENTACION: WorldDef = {
  bg: 'linear-gradient(180deg, #0c3a46 0%, #0f5a49 45%, #0b2a16 100%)',
  headline: (c) => `${c.earned.length} frutos maduros`,
  Scene,
};
