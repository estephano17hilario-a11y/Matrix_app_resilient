import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import { milestoneLevel } from '../engine';
import type { WorldDef, WorldCtx } from './types';

// YOGA — a salutation to the sun that lasts 60 days. The sun rises at day 1, crosses
// the sky as you earn milestones and sets on day 60, while you hold your pose on the mat.

const CX = 180, CY = 372, R = 146;
const at = (lvl: number) => { const a = Math.PI * (1 - lvl); return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }; };

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, level } = ctx;
  const { primary } = theme.colors;
  const sun = at(level);
  const dusk = Math.pow(Math.abs(2 * level - 1), 2) * 0.55;
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => { const p = at(milestoneLevel(i)); return <WorldNode key={i} ctx={ctx} i={i} x={p.x} y={p.y} size={34} label={false} />; })}>
      <defs>
        <radialGradient id="yo-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff7c2" /><stop offset="0.45" stopColor="#fde047" /><stop offset="1" stopColor="#fb923c" /></radialGradient>
        <radialGradient id="yo-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fde68a" stopOpacity="0.7" /><stop offset="1" stopColor="#fb923c" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="-30" y="-30" width="420" height="570" fill="#1a0a3a" opacity={dusk} className="w-move" />

      <path d={`M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" strokeDasharray="3 8" strokeLinecap="round" />
      {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(i * 71) % 360} cy={(i * 29) % 140} r="1.2" fill="#fff" opacity={0.3 + dusk} className="w-anim w-twinkle" style={{ ['--d' as any]: `${2 + (i % 4)}s`, ['--dl' as any]: `${i * 0.3}s` }} />)}

      {/* sun */}
      <g className="w-move" style={{ transform: `translate(${sun.x}px, ${sun.y}px)` }}>
        <circle r="78" fill="url(#yo-glow)" className="w-anim w-breathe" style={{ ['--d' as any]: '6s' }} />
        <g className="w-anim w-spin" style={{ ['--d' as any]: '50s' }}>
          {Array.from({ length: 12 }, (_, i) => <rect key={i} x="-2" y="-44" width="4" height="12" rx="2" fill="#fde68a" opacity="0.85" transform={`rotate(${i * 30})`} />)}
        </g>
        <circle r="26" fill="url(#yo-sun)" />
      </g>

      {/* mountains */}
      <path d="M-20 372L60 290L110 336L170 270L236 340L290 296L380 372V520H-20Z" fill="#3b1a5e" />
      <path d="M-20 400L50 350L120 392L200 332L280 392L340 354L380 400V520H-20Z" fill="#2a1048" />
      <path d="M-20 440L80 400L160 440L250 396L380 442V520H-20Z" fill="#190a30" />

      {/* birds */}
      {[0, 1].map(i => (
        <g key={i} className="w-anim w-drift" style={{ ['--d' as any]: `${26 + i * 10}s`, ['--dl' as any]: `${-i * 12}s` }}>
          <path d={`M0 ${120 + i * 34}q6-8 12 0q6-8 12 0`} fill="none" stroke="#1a0a3a" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}

      {/* mat + tree pose */}
      <rect x="110" y="478" width="140" height="10" rx="5" fill={primary} />
      <rect x="110" y="478" width="140" height="3" rx="2" fill="#fff" opacity="0.3" />
      <g className="w-anim w-breathe" style={{ ['--d' as any]: '5s', transformOrigin: '180px 476px', transformBox: 'view-box' }}>
        <g stroke="#ffe9c7" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M180 476V428" />
          <path d="M180 440L166 462" /><path d="M180 442Q204 446 194 464L180 458" />
          <path d="M180 396L180 430" />
          <path d="M178 400Q160 380 180 360Q200 380 182 400" />
        </g>
        <circle cx="180" cy="386" r="9" fill="#ffe9c7" />
      </g>
      <text x="180" y="512" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" opacity="0.55" letterSpacing="3">{level < 0.5 ? 'AMANECER' : level < 1 ? 'MEDIODÍA' : 'ATARDECER'}</text>
    </SceneBox>
  );
};

export const YOGA: WorldDef = {
  bg: 'linear-gradient(180deg, #4a1d6e 0%, #b4457a 42%, #f59e57 72%, #3b1a5e 72.1%, #190a30 100%)',
  headline: (c) => `Saludo al sol · día ${c.streak}/60`,
  Scene,
};
