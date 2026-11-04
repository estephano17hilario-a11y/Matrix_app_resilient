import React, { memo, useId } from 'react';
import { getRank } from '../engine/ranks';
import type { RankId } from '../engine/config';
import {
  Crown, Defs, Gem, Laurel, PALETTES, RAINBOW, Rays, Sparkle, Ticks, Wing, f, starPoints, u, type Pal, type Pt,
} from './badgeParts';

// ─────────────────────────────────────────────────────────────────────────────
// RANK INSIGNIAS — bold, glossy game-icon style on a 200×200 canvas.
//
// Every rank has a signature emblem, and each division evolves it:
//   I   the emblem alone
//   II  + blade fins on both sides
//   III + big feathered wings and a crown
// Legend has no divisions: one prismatic, multi-colour insignia.
//
// `size` ≈ the height of the shield; the canvas is cropped per division so the
// shield keeps the same scale and only the ornaments add width.
// ─────────────────────────────────────────────────────────────────────────────

const CY = 102;
const ins = (s: number) => `translate(100 ${CY}) scale(${s}) translate(-100 -${CY})`;

// Shields are about as wide as they are tall (≈ 104 × 110), like game rank icons.
const SHIELD = {
  round: 'M48 52 Q48 46 54 46 H146 Q152 46 152 52 V102 C152 128 128 146 100 156 C72 146 48 128 48 102 Z',
  angular: 'M100 58 L126 48 L160 40 L150 66 L144 102 L100 158 L56 102 L50 66 L40 40 L74 48 Z',
  crest: 'M100 30 L120 48 L154 42 L146 72 L152 102 C148 130 126 148 100 160 C74 148 52 130 48 102 L54 72 L46 42 L80 48 Z',
  royal: 'M100 44 L128 52 L158 40 L152 84 L146 110 C140 136 122 152 100 162 C78 152 60 136 54 110 L48 84 L42 40 L72 52 Z',
  herald: 'M100 48 L126 54 L156 44 L150 82 L144 112 C138 138 120 152 100 164 C80 152 62 138 56 112 L50 82 L44 44 L74 54 Z',
} as const;

// viewBox crop per division (x, y, w, h). Division I is square: small crests
// and tips may overhang (the svg overflow is visible), the badge never looks tall.
const BOXES: [number, number, number, number][] = [
  [36, 36, 128, 128],
  [0, 24, 200, 152],
  [-40, 6, 280, 176],
];
const LEGEND_BOX: [number, number, number, number] = [-34, -6, 268, 212];
const PX_PER_UNIT_AT = 150;

interface Look {
  tone: 'trim' | 'body';
  scale: number;
  /** Divisions up to this index use blade-shaped wings; later ones use feathers. */
  sharpUpTo: number;
  glow: number;
  crownN: number;
  arches?: boolean;
}

const LOOK: Record<Exclude<RankId, 'LEGEND'>, Look> = {
  BRONZE: { tone: 'trim', scale: 0.8, sharpUpTo: 1, glow: 0, crownN: 3 },
  SILVER: { tone: 'trim', scale: 0.86, sharpUpTo: 1, glow: 0, crownN: 3 },
  GOLD: { tone: 'trim', scale: 0.95, sharpUpTo: 1, glow: 0.25, crownN: 3 },
  PLATINUM: { tone: 'body', scale: 1, sharpUpTo: 2, glow: 0.3, crownN: 5 },
  DIAMOND: { tone: 'body', scale: 1, sharpUpTo: 3, glow: 0.75, crownN: 0 },
  CHAMPION: { tone: 'body', scale: 1.04, sharpUpTo: 1, glow: 0.55, crownN: 5 },
  GRAND_CHAMPION: { tone: 'body', scale: 1.1, sharpUpTo: 1, glow: 0.6, crownN: 7, arches: true },
};

// ── Shield plate: rim, bevel, two-tone body ─────────────────────────────────

const Plate: React.FC<{ id: string; p: Pal; d: string }> = ({ id, p, d }) => (
  <g>
    <path d={d} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={2.6} strokeLinejoin="round" />
    <g transform={ins(0.93)}><path d={d} fill={u(id, 'body')} stroke={p.trimDark} strokeWidth={1.1} strokeLinejoin="round" /></g>
    <g transform={ins(0.84)}>
      <clipPath id={`${id}-clip`}><path d={d} /></clipPath>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={0} y={0} width={100} height={200} fill={u(id, 'halfL')} />
        <rect x={100} y={0} width={100} height={200} fill={u(id, 'halfR')} />
        <rect x={0} y={0} width={200} height={200} fill={u(id, 'sheen')} opacity={0.5} />
      </g>
      <path d={d} fill="none" stroke={p.deep} strokeWidth={1.8} strokeLinejoin="round" />
    </g>
    <path d={d} fill="none" stroke="#fff" strokeOpacity={0.4} strokeWidth={1} strokeLinejoin="round" transform={ins(0.975)} />
  </g>
);

// ── Signature emblems (division I) ──────────────────────────────────────────

const Emblem: React.FC<{ rank: Exclude<RankId, 'LEGEND'>; id: string; p: Pal }> = props => (
  <g transform={['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].includes(props.rank) ? ins(1.14) : undefined}>
    <EmblemArt {...props} />
  </g>
);

/** Small faceted kite gem with explicit colours (for non-palette gems). */
const Facet: React.FC<{ cx: number; cy: number; r: number; light: string; mid: string; dark: string; deep: string }> = ({ cx, cy, r, light, mid, dark, deep }) => (
  <g strokeLinejoin="round">
    <path d={`M${cx} ${cy - r} L${cx + r * 0.78} ${cy} L${cx} ${cy + r} L${cx - r * 0.78} ${cy} Z`} fill={mid} stroke={deep} strokeWidth={1.4} />
    <path d={`M${cx} ${cy - r} L${cx} ${cy} L${cx - r * 0.78} ${cy} Z`} fill={light} />
    <path d={`M${cx} ${cy} L${cx + r * 0.78} ${cy} L${cx} ${cy + r} Z`} fill={dark} />
    <path d={`M${cx - r * 0.42} ${cy - r * 0.18} L${cx - r * 0.1} ${cy - r * 0.62}`} stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity={0.9} />
  </g>
);

const Sword: React.FC<{ id: string; p: Pal; rot: number }> = ({ id, p, rot }) => (
  <g transform={`rotate(${rot} 100 104)`} strokeLinejoin="round">
    <path d="M96 4 L100 -6 L104 4 L105 122 H95 Z" fill={u(id, 'steel')} stroke={p.deep} strokeWidth={1.4} />
    <path d="M100 0 V118" stroke={p.deep} strokeWidth={1} opacity={0.4} />
    <path d="M82 122 H118 L115 130 H85 Z" fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1.4} />
    <rect x={97} y={130} width={6} height={20} rx={1.6} fill={p.dark} stroke={p.deep} strokeWidth={1} />
    <circle cx={100} cy={155} r={5} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1.2} />
  </g>
);

const EmblemArt: React.FC<{ rank: Exclude<RankId, 'LEGEND'>; id: string; p: Pal }> = ({ rank, id, p }) => {
  switch (rank) {
    case 'BRONZE':
      return (
        <g strokeLinejoin="round">
          <path d="M70 92 L100 120 V140 L70 112 Z" fill={p.light} stroke={p.deep} strokeWidth={1.6} />
          <path d="M130 92 L100 120 V140 L130 112 Z" fill={p.dark} stroke={p.deep} strokeWidth={1.6} />
          <path d="M70 92 L100 120 L130 92 L130 100 L100 128 L70 100 Z" fill={p.shine} opacity={0.35} />
          <path d="M70 92 L100 120 L130 92" fill="none" stroke={p.shine} strokeWidth={1.2} opacity={0.7} />
        </g>
      );
    case 'SILVER':
      return (
        <g>
          <g transform={ins(0.56)}><path d={SHIELD.round} fill="none" stroke={p.trimLight} strokeWidth={2} opacity={0.8} /></g>
          <path d="M100 66 V138" stroke={p.deep} strokeWidth={1.2} opacity={0.35} />
          <path d="M100 66 V138" stroke="#fff" strokeWidth={1} opacity={0.55} transform="translate(1.4 0)" />
        </g>
      );
    case 'GOLD':
      return (
        <g strokeLinejoin="round">
          <path d="M80 82 H120 V108 C120 122 111 131 100 136 C89 131 80 122 80 108 Z" fill={p.dark} stroke={p.trimLight} strokeWidth={2} />
          <path d="M84 86 H116 V108 C116 119 109 127 100 131 C91 127 84 119 84 108 Z" fill={p.deep} opacity={0.35} />
          <path d="M100 88 V128" stroke={p.trimLight} strokeWidth={2.4} strokeLinecap="round" />
          {[1, -1].map(s => (
            <path key={s} d={`M${100 + s * 2} 96 L${100 + s * 15} 88 L${100 + s * 11} 99 L${100 + s * 17} 100 L${100 + s * 9} 108 L${100 + s * 2} 106 Z`} fill={p.trimLight} stroke={p.deep} strokeWidth={0.8} />
          ))}
        </g>
      );
    case 'PLATINUM':
      return (
        <g strokeLinejoin="round">
          <path d="M100 74 L126 98 L100 142 L74 98 Z" fill={p.dark} stroke={p.trimLight} strokeWidth={2} />
          <path d="M100 74 L126 98 L100 98 Z" fill={p.light} opacity={0.55} />
          <path d="M100 98 L126 98 L100 142 Z" fill={p.deep} opacity={0.4} />
          <path d="M100 74 V142 M74 98 H126" stroke={p.trimLight} strokeWidth={0.9} opacity={0.6} />
          <Gem id={id} p={p} cx={100} cy={98} r={7} bezel={false} />
        </g>
      );
    case 'DIAMOND':
      return null;
    case 'CHAMPION':
      // Winged flame (phoenix) on a peaked crest, gold laurel, amethyst at the peak.
      return (
        <g strokeLinejoin="round">
          <Laurel id={id} p={p} cx={100} cy={104} R={38} a0={98} a1={168} n={6} leaf={8} axis={100} lite />
          <Laurel id={id} p={p} cx={100} cy={104} R={38} a0={98} a1={168} n={6} leaf={8} axis={100} lite mirror />
          {[1, -1].map(s => (
            <g key={s} transform={s === -1 ? 'translate(200 0) scale(-1 1)' : undefined}>
              <path d="M96 118 C80 116 66 104 60 84 C70 94 78 98 86 98 C78 92 73 84 72 74 C80 86 89 92 97 96 Z" fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1.5} />
              <path d="M94 112 C82 110 72 102 66 90" fill="none" stroke="#fff" strokeWidth={1} opacity={0.55} strokeLinecap="round" />
            </g>
          ))}
          <path d="M100 62 C106 78 124 90 123 112 C122 131 112 142 100 142 C88 142 78 131 77 112 C76 99 86 92 90 80 C92 88 96 92 98 96 C99 87 97 74 100 62 Z" fill={u(id, 'gem')} stroke={p.deep} strokeWidth={2} />
          <path d="M100 90 C104 101 113 106 113 119 C113 129 107 135 100 135 C93 135 87 129 87 119 C87 110 93 106 95 98 C97 103 99 104 100 107 C101 101 100 96 100 90 Z" fill={p.shine} opacity={0.8} />
          <polygon points={starPoints(100, 148, 5, 2, 4)} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={0.8} />
          <Facet cx={100} cy={40} r={9} light={p.light} mid={p.mid} dark={p.dark} deep={p.deep} />
        </g>
      );
    case 'GRAND_CHAMPION':
      // Crowned ruby inside a gold laurel and sunburst.
      return (
        <g strokeLinejoin="round">
          <Rays cx={100} cy={108} n={16} r1={20} r2={36} half={0.1} fill={p.trimMid} opacity={0.9} alt={0.72} />
          <Laurel id={id} p={p} cx={100} cy={108} R={30} a0={96} a1={200} n={7} leaf={7} axis={100} lite />
          <Laurel id={id} p={p} cx={100} cy={108} R={30} a0={96} a1={200} n={7} leaf={7} axis={100} lite mirror />
          <circle cx={100} cy={108} r={19} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1.8} />
          <circle cx={100} cy={108} r={15} fill={p.deep} opacity={0.55} />
          <Gem id={id} p={p} cx={100} cy={108} r={12.5} bezel={false} />
          <Crown id={id} p={p} cx={100} base={86} w={28} h={13} n={3} lite />
        </g>
      );
  }
};

/** Shapes that belong to the base silhouette (drawn behind the plate). */
const BaseBack: React.FC<{ rank: Exclude<RankId, 'LEGEND'>; id: string; p: Pal }> = ({ rank, id, p }) => {
  if (rank !== 'GRAND_CHAMPION') return null;
  // Crossed swords behind a battlemented gold back plate.
  const back = 'M100 26 L116 40 L136 30 L146 44 L170 38 L162 80 L156 112 C150 142 126 160 100 172 C74 160 50 142 44 112 L38 80 L30 38 L54 44 L64 30 L84 40 Z';
  return (
    <g strokeLinejoin="round">
      <Sword id={id} p={p} rot={-38} />
      <Sword id={id} p={p} rot={38} />
      <path d={back} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={2.4} />
      <path d={back} fill={u(id, 'sheen')} opacity={0.6} />
      <g transform={ins(0.95)}><path d={back} fill="none" stroke={p.trimDark} strokeWidth={1.2} /></g>
      {[[64, 34], [100, 30], [136, 34]].map(([x, y], i) => <circle key={i} cx={x} cy={y + 8} r={3.2} fill={u(id, 'gem')} stroke={p.deep} strokeWidth={0.8} />)}
    </g>
  );
};

/** Platinum's top spike / Diamond-free crest shapes that sit on the plate. */
const Spike: React.FC<{ id: string; p: Pal; tall?: boolean }> = ({ id, p, tall }) => (
  <g strokeLinejoin="round">
    <path d={`M100 ${tall ? 20 : 26} L108 46 L100 54 L92 46 Z`} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1.6} />
    <path d={`M100 ${tall ? 20 : 26} L100 54 L92 46 Z`} fill="#fff" opacity={0.4} />
  </g>
);

// ── Diamond (gem) ───────────────────────────────────────────────────────────

const DiamondGem: React.FC<{ id: string; p: Pal }> = ({ id, p }) => {
  const tris: [Pt, Pt, Pt][] = [
    [[54, 84], [76, 56], [78, 84]], [[76, 56], [100, 56], [78, 84]], [[100, 56], [100, 84], [78, 84]],
    [[146, 84], [124, 56], [122, 84]], [[124, 56], [100, 56], [122, 84]], [[100, 56], [100, 84], [122, 84]],
    [[54, 84], [78, 84], [100, 152]], [[78, 84], [100, 84], [100, 152]], [[100, 84], [122, 84], [100, 152]], [[122, 84], [146, 84], [100, 152]],
  ];
  const fills = [p.light, p.mid, p.shine, p.mid, p.light, p.trimMid, p.dark, p.mid, p.light, p.dark];
  const op = [0.9, 0.95, 0.8, 0.9, 0.8, 0.9, 1, 0.9, 0.95, 1];
  return (
    <g strokeLinejoin="round">
      <path d="M76 56 H124 L146 84 L100 152 L54 84 Z" fill={u(id, 'body')} stroke={p.deep} strokeWidth={3} />
      {tris.map((t, i) => <polygon key={i} points={t.map(q => q.join(',')).join(' ')} fill={fills[i]} opacity={op[i]} stroke="#fff" strokeWidth={0.8} strokeOpacity={0.7} />)}
      <path d="M76 56 H124 L146 84 L100 152 L54 84 Z" fill="none" stroke="#fff" strokeWidth={1.4} strokeOpacity={0.55} />
      <path d="M62 80 L78 62" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <Sparkle x={112} y={72} s={7} />
    </g>
  );
};

// ── Division adornments ─────────────────────────────────────────────────────

const WING_BY_DIVISION = [
  null,
  { rows: 1, n: 3, L: 56, spread: [-44, 22] as [number, number], thick: 1.9 },
  { rows: 3, n: 6, L: 90, spread: [-84, 26] as [number, number], thick: 1.5 },
];

const Wings: React.FC<{ id: string; p: Pal; look: Look; division: number }> = ({ id, p, look, division }) => {
  const w = WING_BY_DIVISION[division];
  if (!w) return null;
  const sharp = division <= look.sharpUpTo;
  const props = { id, p, ax: 138, ay: 98, L: w.L * look.scale, rows: w.rows, n: w.n, spread: w.spread, sharp, tone: look.tone, axis: 100, lite: true as const, thick: w.thick };
  return (
    <g>
      <Wing {...props} />
      <Wing {...props} mirror />
    </g>
  );
};

// ── Legend ──────────────────────────────────────────────────────────────────

const Legend: React.FC<{ id: string; p: Pal; animate: boolean }> = ({ id, p, animate }) => {
  const feather = (len: number, w: number) => `M0 0 C${f(len * 0.25)} ${f(-w)} ${f(len * 0.75)} ${f(-w * 1.1)} ${f(len)} 0 C${f(len * 0.75)} ${f(w * 0.7)} ${f(len * 0.25)} ${f(w * 0.85)} 0 0 Z`;
  const wing: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) {
    const cnt = 8 - r;
    const k = 1 - r * 0.2;
    for (let i = 0; i < cnt; i++) {
      const t = i / (cnt - 1);
      const ang = -82 + 100 * t + (r % 2 ? 6 : 0);
      const len = 92 * k * (0.82 + 0.18 * Math.sin(Math.PI * (0.2 + 0.8 * (1 - t))));
      const hue = RAINBOW[(i + r * 2) % RAINBOW.length];
      wing.push(
        <g key={`${r}-${i}`} transform={`rotate(${f(ang)})`}>
          <path d={feather(len, 11 * k)} fill={hue} stroke={p.deep} strokeWidth={0.8} strokeLinejoin="round" opacity={0.96 - r * 0.04} />
          <path d={`M${f(len * 0.1)} 0 L${f(len * 0.88)} 0`} stroke="#fff" strokeWidth={0.8} opacity={0.65} />
          <path d={feather(len * 0.96, 11 * k)} fill="#fff" opacity={0.18} />
        </g>,
      );
    }
  }
  return (
    <g>
      <circle cx={100} cy={100} r={98} fill={u(id, 'glow')} opacity={0.6} />
      <g className={animate ? 'rb-spin' : undefined}>
        {Array.from({ length: 32 }, (_, i) => {
          const a = (2 * Math.PI * i) / 32 - Math.PI / 2;
          const rr = i % 2 ? 80 : 98;
          const pt = (r: number, da: number) => `${f(100 + r * Math.cos(a + da))},${f(100 + r * Math.sin(a + da))}`;
          return <polygon key={i} points={`${pt(64, -0.045)} ${pt(rr, 0)} ${pt(64, 0.045)}`} fill={RAINBOW[i % RAINBOW.length]} opacity={0.6} />;
        })}
      </g>
      <circle cx={100} cy={100} r={86} fill="none" stroke={u(id, 'prism')} strokeWidth={2.4} opacity={0.95} />
      <Ticks cx={100} cy={100} r={88} n={72} len={2.6} stroke="#fff" w={0.7} opacity={0.8} major={6} />

      <g transform="translate(122 96)">{wing}</g>
      <g transform="translate(200 0) scale(-1 1) translate(122 96)">{wing}</g>

      <Plate id={id} p={p} d={SHIELD.herald} />
      <g>
        <polygon points={starPoints(100, 102, 38, 12, 8)} fill={u(id, 'prism')} stroke={p.deep} strokeWidth={1.8} strokeLinejoin="round" />
        <polygon points={starPoints(100, 102, 27, 11, 8, -67.5)} fill={p.shine} opacity={0.55} />
        <circle cx={100} cy={102} r={15} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1.6} />
        <circle cx={100} cy={102} r={11} fill={u(id, 'prism')} stroke={p.deep} strokeWidth={0.8} />
        <ellipse cx={96} cy={97} rx={4} ry={2.4} fill="#fff" opacity={0.85} transform="rotate(-30 96 97)" />
      </g>
      {[[62, 62], [138, 62], [100, 146]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y} r={5.4} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1} /><circle cx={x} cy={y} r={3.4} fill={RAINBOW[(i * 3 + 1) % 8]} /></g>
      ))}

      <Crown id={id} p={p} cx={100} base={48} w={54} h={26} n={9} arches />
      {[[20, 24, 5], [180, 24, 5], [10, 100, 4], [190, 100, 4], [30, 170, 3.4], [170, 170, 3.4], [100, 4, 4.4], [100, 196, 3.4]].map(([x, y, s], i) => (
        <Sparkle key={i} x={x} y={y} s={s} animate={animate} delay={(i * 0.41) % 2.4} fill={RAINBOW[i % 8]} />
      ))}
    </g>
  );
};

// ── Badge ───────────────────────────────────────────────────────────────────

interface RankBadgeProps {
  rankIndex: number;
  /** 0-based division (I–III); null for Legend. */
  division?: number | null;
  /** Approximate shield height in px; ornaments add width/height around it. */
  size?: number;
  className?: string;
  title?: string;
  /** Sparkles twinkle and the Legend halo turns (big badges only). */
  animate?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = memo(({ rankIndex, division = 0, size = 48, className, title, animate = false }) => {
  const rank = getRank(rankIndex);
  const p = PALETTES[rank.id];
  const id = `rb${useId().replace(/:/g, '')}`;
  const isLegend = rank.id === 'LEGEND';
  const d = Math.max(0, Math.min(2, division ?? 0));
  const [bx, by, bw, bh] = isLegend ? LEGEND_BOX : BOXES[d];
  const k = size / PX_PER_UNIT_AT;

  let body: React.ReactNode;
  if (isLegend) {
    body = <Legend id={id} p={p} animate={animate} />;
  } else {
    const r = rank.id as Exclude<RankId, 'LEGEND'>;
    const look = LOOK[r];
    const isDiamond = r === 'DIAMOND';
    const shape = r === 'PLATINUM' ? SHIELD.angular : r === 'CHAMPION' ? SHIELD.crest : r === 'GRAND_CHAMPION' ? SHIELD.royal : SHIELD.round;
    const glow = look.glow * (0.45 + 0.18 * d);

    body = (
      <g>
        {glow > 0 && <circle cx={100} cy={100} r={isDiamond ? 94 : 84} fill={u(id, 'glow')} opacity={Math.min(1, glow)} />}
        {isDiamond && d >= 2 && <Rays cx={100} cy={100} n={14} r1={48} r2={96} half={0.07} fill={p.light} opacity={0.5} alt={0.62} />}

        <Wings id={id} p={p} look={look} division={d} />
        <BaseBack rank={r} id={id} p={p} />

        {isDiamond ? <DiamondGem id={id} p={p} /> : (
          <>
            <Plate id={id} p={p} d={shape} />
            <Emblem rank={r} id={id} p={p} />
          </>
        )}

        {/* Platinum keeps its spike; III adds a crown (Diamond gets crystal spires instead) */}
        {!isDiamond && r === 'PLATINUM' && <Spike id={id} p={p} tall={d >= 2} />}
        {!isDiamond && d >= 2 && <Crown id={id} p={p} cx={100} base={r === 'PLATINUM' ? 40 : r === 'CHAMPION' ? 30 : r === 'GRAND_CHAMPION' ? 28 : 48} w={30 + look.crownN * 3} h={16 + look.crownN} n={look.crownN} arches={look.arches} lite />}
        {isDiamond && d >= 2 && (
          <g strokeLinejoin="round">
            <path d="M100 14 L110 58 H90 Z" fill={u(id, 'bwingL')} stroke={p.deep} strokeWidth={1.4} />
            {[[72, 34, 82, 58, 64, 58], [128, 34, 136, 58, 118, 58]].map((q, i) => <path key={i} d={`M${q[0]} ${q[1]} L${q[2]} ${q[3]} L${q[4]} ${q[5]} Z`} fill={u(id, 'bwingL')} stroke={p.deep} strokeWidth={1.2} />)}
          </g>
        )}

        {d >= 2 && [[18, 40, 3.6], [182, 40, 3.6], [100, 8, 3.6], [14, 120, 2.8], [186, 120, 2.8]].map(([x, y, s], i) => (
          <Sparkle key={i} x={x} y={y} s={s} animate={animate} delay={(i * 0.43) % 2.4} />
        ))}
      </g>
    );
  }

  return (
    <svg
      width={f(bw * k)} height={f(bh * k)} viewBox={`${bx} ${by} ${bw} ${bh}`}
      className={className} role="img" aria-label={title ?? rank.name} style={{ overflow: 'visible', maxWidth: '100%', height: 'auto' }}
    >
      <Defs id={id} p={p} />
      {body}
    </svg>
  );
});
RankBadge.displayName = 'RankBadge';
