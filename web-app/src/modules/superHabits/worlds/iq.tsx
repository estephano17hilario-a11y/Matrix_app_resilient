import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// MEJORAR IQ — a neural network that wires itself. Each milestone is a neuron; when
// two neurons are earned, the synapse between them lights and carries signals.

const P = [[180, 442], [96, 380], [252, 372], [70, 282], [180, 308], [292, 262], [118, 172], [236, 118]];
const E: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 7]];
const DUST = [[40, 120], [320, 160], [30, 380], [330, 400], [150, 60], [210, 230], [260, 470], [60, 480], [310, 330], [24, 220]];

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme } = ctx;
  const { primary, secondary } = theme.colors;
  return (
    <SceneBox overlay={P.map(([x, y], i) => <WorldNode key={i} ctx={ctx} i={i} x={x} y={y} size={40} label={false} />)}>
      <defs>
        <linearGradient id="iq-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={primary} /><stop offset="1" stopColor={secondary} /></linearGradient>
      </defs>
      <g transform="translate(180 250)">
        <g className="w-anim w-spin" style={{ ['--d' as any]: '90s' }}>
          {[150, 200, 250].map((r, i) => <polygon key={r} points={Array.from({ length: 6 }, (_, k) => `${Math.cos((k * Math.PI) / 3) * r},${Math.sin((k * Math.PI) / 3) * r}`).join(' ')} fill="none" stroke={secondary} strokeOpacity={0.12 - i * 0.03} />)}
        </g>
      </g>
      {DUST.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 2 : 3} fill={secondary} className="w-anim w-twinkle" style={{ ['--d' as any]: `${2 + (i % 4)}s`, ['--dl' as any]: `${i * 0.4}s` }} />)}

      {E.map(([a, b], k) => {
        const on = ctx.stateOf(a) === 'earned' && ctx.stateOf(b) === 'earned';
        const [x1, y1] = P[a], [x2, y2] = P[b];
        return (
          <g key={k}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? 'url(#iq-edge)' : '#fff'} strokeOpacity={on ? 0.95 : 0.14} strokeWidth={on ? 3 : 1.5} strokeDasharray={on ? undefined : '3 6'} strokeLinecap="round" />
            {on && [0, 1].map(s => (
              <circle key={s} r="3.6" fill="#fff">
                <animateMotion dur={`${2 + (k % 3) * 0.5}s`} begin={`${s * 1.1}s`} repeatCount="indefinite" path={`M${x1} ${y1}L${x2} ${y2}`} />
              </circle>
            ))}
          </g>
        );
      })}

      {P.map(([x, y], i) => ctx.stateOf(i) === 'earned' && (
        <circle key={i} cx={x} cy={y} r="34" fill={primary} opacity="0.2" className="w-anim w-pulse" style={{ ['--d' as any]: `${3 + (i % 3)}s`, ['--dl' as any]: `${i * 0.3}s` }} />
      ))}
      <text x="180" y="506" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" opacity="0.55" letterSpacing="3">{ctx.earned.length * 12} BILLONES DE SINAPSIS</text>
    </SceneBox>
  );
};

export const IQ: WorldDef = {
  bg: 'radial-gradient(110% 70% at 50% 40%, #2b0f4d 0%, #0f0a26 55%, #050310 100%)',
  headline: (c) => `${c.earned.length}/8 neuronas conectadas`,
  Scene,
};
