import React from 'react';
import { SceneBox, WorldNode } from './WorldShell';
import type { WorldDef, WorldCtx } from './types';

// TRABAJO — your career as a skyscraper. One floor per milestone: lights switch on
// as you climb, the elevator rides up to your level and the roof ends in the CEO helipad.

const ROLES = ['Pasante', 'Junior', 'Analista', 'Senior', 'Líder', 'Gerente', 'Director', 'CEO'];
const FY = (i: number) => 458 - i * 46; // centre of floor i
const TX = 104;
const TW = 152;

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, level } = ctx;
  const { primary, secondary } = theme.colors;
  const cur = Math.min(7, Math.max(0, ctx.earned.length - (ctx.next ? 0 : 1)));
  const carY = FY(Math.max(0, Math.min(7, Math.ceil(level * 8) - 1))) - 15;
  return (
    <SceneBox overlay={Array.from({ length: 8 }, (_, i) => <WorldNode key={i} ctx={ctx} i={i} x={310} y={FY(i)} size={34} label={false} />)}>
      <defs>
        <linearGradient id="tr-tower" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b2540" /><stop offset="0.5" stopColor="#26345c" /><stop offset="1" stopColor="#141c33" />
        </linearGradient>
        <linearGradient id="tr-glow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={primary} stopOpacity="0.35" /><stop offset="1" stopColor={primary} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* far skyline */}
      {[[8, 300, 44], [50, 260, 40], [262, 280, 50], [312, 330, 40], [0, 360, 36]].map(([x, y, w], i) => (
        <g key={i}><rect x={x} y={y} width={w} height={500 - y} fill="#0f1730" />
          {Array.from({ length: 6 }, (_, k) => <rect key={k} x={x + 6 + (k % 2) * 16} y={y + 14 + Math.floor(k / 2) * 22} width="6" height="8" fill="#fde68a" opacity="0.5" className="w-anim w-twinkle" style={{ ['--d' as any]: `${3 + ((i + k) % 4)}s`, ['--dl' as any]: `${(i + k) * 0.4}s` }} />)}
        </g>
      ))}
      {[[40, 40], [300, 70], [200, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill="#fff" className="w-anim w-twinkle" style={{ ['--d' as any]: `${2 + i}s` }} />)}

      {/* tower */}
      <rect x={TX} y="96" width={TW} height="394" rx="4" fill="url(#tr-tower)" stroke={primary} strokeOpacity="0.4" />
      <rect x={TX} y="96" width={TW} height="394" fill="url(#tr-glow)" />
      <rect x={TX + 18} y="82" width={TW - 36} height="16" rx="3" fill="#1b2540" />
      <rect x={TX + TW / 2 - 1.5} y="40" width="3" height="44" fill="#9ca3af" />
      <circle cx={TX + TW / 2} cy="38" r="4" fill="#ef4444" className="w-anim w-blink" style={{ ['--d' as any]: '1.4s' }} />
      {ctx.stateOf(7) === 'earned' && (
        <g><circle cx={TX + TW / 2} cy="78" r="12" fill="none" stroke={secondary} strokeWidth="2" /><text x={TX + TW / 2} y="83" textAnchor="middle" fontSize="13" fontWeight="900" fill={secondary}>H</text></g>
      )}

      {Array.from({ length: 8 }, (_, i) => {
        const st = ctx.stateOf(i);
        const y = FY(i);
        return (
          <g key={i}>
            <line x1={TX} x2={TX + TW} y1={y + 23} y2={y + 23} stroke="#fff" strokeOpacity="0.1" />
            {Array.from({ length: 6 }, (_, k) => {
              const lit = st === 'earned' || (st === 'next' && k % 2 === 0);
              return <rect key={k} x={TX + 14 + (k % 3) * 40} y={y - 14 + Math.floor(k / 3) * 20} width="28" height="13" rx="2" fill={lit ? '#fde68a' : '#0b1124'} opacity={lit ? (st === 'next' ? 0.7 : 0.95) : 0.9}
                className={st === 'next' && lit ? 'w-anim w-twinkle' : undefined} style={st === 'next' ? { ['--d' as any]: '2.2s', ['--dl' as any]: `${k * 0.3}s` } : undefined} />;
            })}
            <text x={TX - 8} y={y + 4} textAnchor="end" fontSize="11" fontWeight="800" fill={st === 'locked' ? '#64748b' : '#e2e8f0'}>{ROLES[i]}</text>
            <line x1={TX + TW + 6} x2={296} y1={y} y2={y} stroke="#fff" strokeOpacity={st === 'locked' ? 0.12 : 0.4} strokeDasharray="3 4" />
          </g>
        );
      })}

      {/* elevator shaft + car */}
      <rect x={TX + TW / 2 - 6} y="100" width="12" height="388" fill="#0b1124" opacity="0.65" />
      <g className="w-move" style={{ transform: `translateY(${carY}px)` }}>
        <rect x={TX + TW / 2 - 6} y="0" width="12" height="30" rx="2" fill={secondary} />
        <rect x={TX + TW / 2 - 3} y="5" width="6" height="12" rx="1" fill="#0b1124" opacity="0.6" />
      </g>

      <rect x="60" y="486" width="240" height="8" rx="3" fill="#0b1124" />
      <text x="180" y="512" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" opacity="0.5" letterSpacing="3">{ROLES[cur].toUpperCase()}</text>
    </SceneBox>
  );
};

export const TRABAJO: WorldDef = {
  bg: 'linear-gradient(180deg, #0b1f4a 0%, #101c3d 50%, #070d1e 100%)',
  headline: (c) => `Planta ${Math.max(1, c.earned.length)} · ${ROLES[Math.min(7, Math.max(0, c.earned.length - (c.next ? 0 : 1)))]}`,
  Scene,
};
