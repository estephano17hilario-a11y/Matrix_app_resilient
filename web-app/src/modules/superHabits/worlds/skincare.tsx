import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// SKINCARE — your vanity. The mirror shows how much you glow; every milestone adds a
// product to the shelf, from cleanser to night mask, and the glow grows with the level.

const slot = (i: number) => ({ x: 66 + (i % 4) * 76, base: i < 4 ? 376 : 470, kind: i % 4 });

const Bottle: React.FC<{ x: number; base: number; kind: number; on: boolean; a: string; b: string }> = ({ x, base, kind, on, a, b }) => {
  const fill = on ? `url(#sk-${kind})` : '#241a24';
  const stroke = on ? '#fff' : '#6b5a68';
  return (
    <g opacity={on ? 1 : 0.7}>
      {kind === 0 && <><path d={`M${x - 15} ${base}L${x + 15} ${base}L${x + 11} ${base - 62}L${x - 11} ${base - 62}Z`} fill={fill} stroke={stroke} strokeOpacity="0.6" /><rect x={x - 8} y={base - 76} width="16" height="14" rx="3" fill={on ? b : '#3a2c3a'} /></>}
      {kind === 1 && <><rect x={x - 22} y={base - 36} width="44" height="36" rx="9" fill={fill} stroke={stroke} strokeOpacity="0.6" /><rect x={x - 24} y={base - 46} width="48" height="12" rx="5" fill={on ? b : '#3a2c3a'} /></>}
      {kind === 2 && <><rect x={x - 13} y={base - 56} width="26" height="56" rx="8" fill={fill} stroke={stroke} strokeOpacity="0.6" /><rect x={x - 5} y={base - 72} width="10" height="18" rx="3" fill={on ? b : '#3a2c3a'} /><ellipse cx={x} cy={base - 76} rx="6" ry="7" fill={on ? a : '#3a2c3a'} /></>}
      {kind === 3 && <><rect x={x - 16} y={base - 58} width="32" height="58" rx="7" fill={fill} stroke={stroke} strokeOpacity="0.6" /><rect x={x - 3} y={base - 74} width="6" height="16" fill={on ? b : '#3a2c3a'} /><rect x={x - 3} y={base - 76} width="22" height="5" rx="2.5" fill={on ? b : '#3a2c3a'} /></>}
      {on && <rect x={x - 9} y={base - 52} width="4" height="38" rx="2" fill="#fff" opacity="0.45" />}
    </g>
  );
};

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, level } = ctx;
  const { primary, secondary } = theme.colors;
  const glow = Math.round(level * 100);
  const n = ctx.earned.length;
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => { const s = slot(i); return <WorldNode key={i} ctx={ctx} i={i} x={s.x} y={s.base - 26} size={28} label={false} />; })}>
      <defs>
        <radialGradient id="sk-mirror" cx="0.4" cy="0.3" r="0.9"><stop offset="0" stopColor="#fff" stopOpacity="0.35" /><stop offset="1" stopColor={primary} stopOpacity="0.18" /></radialGradient>
        <linearGradient id="sk-frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde4cf" /><stop offset="0.5" stopColor="#e8a98d" /><stop offset="1" stopColor="#b9735a" /></linearGradient>
        <radialGradient id="sk-skin" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stopColor="#ffe7d6" /><stop offset="1" stopColor="#f5b9a0" /></radialGradient>
        <radialGradient id="sk-aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={secondary} stopOpacity="0.9" /><stop offset="1" stopColor={secondary} stopOpacity="0" /></radialGradient>
        {[0, 1, 2, 3].map(k => <linearGradient key={k} id={`sk-${k}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={[primary, secondary, '#fff', primary][k]} /><stop offset="1" stopColor={[secondary, primary, primary, '#7c3a5a'][k]} /></linearGradient>)}
      </defs>

      {/* mirror */}
      <g>
        <circle cx="180" cy="150" r="124" fill="url(#sk-aura)" opacity={0.25 + level * 0.6} className="w-move" />
        <ellipse cx="180" cy="150" rx="104" ry="128" fill="url(#sk-mirror)" stroke="url(#sk-frame)" strokeWidth="9" />
        <ellipse cx="180" cy="150" rx="96" ry="120" fill="none" stroke="#fff" strokeOpacity="0.25" />

        {/* face */}
        <g className="w-anim w-breathe" style={{ ['--d' as any]: '6s' }}>
          <ellipse cx="180" cy="158" rx="58" ry="72" fill="url(#sk-skin)" />
          <ellipse cx="146" cy="176" rx="14" ry="8" fill="#f472b6" opacity={0.25 + level * 0.4} />
          <ellipse cx="214" cy="176" rx="14" ry="8" fill="#f472b6" opacity={0.25 + level * 0.4} />
          <path d="M150 142Q160 134 170 142" fill="none" stroke="#6b3a3a" strokeWidth="3" strokeLinecap="round" />
          <path d="M190 142Q200 134 210 142" fill="none" stroke="#6b3a3a" strokeWidth="3" strokeLinecap="round" />
          <path d="M170 190Q180 200 190 190" fill="none" stroke="#c0505f" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M178 156Q176 168 182 170" fill="none" stroke="#d99a84" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="160" cy="124" rx="16" ry="8" fill="#fff" opacity={0.15 + level * 0.45} />
        </g>

        {Array.from({ length: Math.max(2, n + 2) }, (_, i) => {
          const a = (i / (n + 2)) * Math.PI * 2;
          return <g key={i} transform={`translate(${180 + Math.cos(a) * 92} ${150 + Math.sin(a) * 112})`}><path d="M0-7Q1-1 7 0Q1 1 0 7Q-1 1-7 0Q-1-1 0-7Z" fill="#fff" className="w-anim w-glint" style={{ ['--d' as any]: '3.2s', ['--dl' as any]: `${i * 0.5}s` }} /></g>;
        })}
        <text x="180" y="300" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" letterSpacing="4">GLOW {glow}%</text>
      </g>

      {/* shelves */}
      {[376, 470].map(y => (
        <g key={y}><rect x="26" y={y} width="308" height="8" rx="4" fill="#fff" opacity="0.28" /><rect x="26" y={y + 8} width="308" height="5" rx="2.5" fill="#fff" opacity="0.1" /></g>
      ))}
      {Array.from({ length: 8 }, (_, i) => { const s = slot(i); return <Bottle key={i} x={s.x} base={s.base} kind={s.kind} on={ctx.stateOf(i) === 'earned'} a={primary} b={secondary} />; })}
    </SceneBox>
  );
};

export const SKINCARE: WorldDef = {
  bg: 'radial-gradient(110% 60% at 50% 10%, #5a1f42 0%, #2a0f24 55%, #10050f 100%)',
  headline: (c) => `Glow ${Math.round(c.level * 100)}% · ${c.earned.length} productos`,
  Scene,
};
