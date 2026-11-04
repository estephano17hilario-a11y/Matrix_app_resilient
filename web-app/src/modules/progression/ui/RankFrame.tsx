import React, { memo, useId } from 'react';
import { getRank } from '../engine/ranks';
import { Defs, Gem, Laurel, PALETTES, Rays, Sparkle, Ticks, Wing, f, u } from './badgeParts';
import { RankBadge } from './RankBadge';
import { useProgression } from '../progressionStore';

// ─────────────────────────────────────────────────────────────────────────────
// RANK FRAME — the ornamental frame that wraps the profile photo in the HUD,
// built from the same palette/parts as the insignia, plus the full insignia as
// a pendant. The photo (56 px) sits in the centre; the frame is drawn behind.
// ─────────────────────────────────────────────────────────────────────────────

const VB = { w: 128, h: 138 };
const C = { x: 64, y: 69 };
const R_HOLE = 36.5;

const TIER: Record<string, { wings: number; laurel: boolean; rays: number; gems: number; halo: boolean }> = {
  BRONZE: { wings: 0, laurel: false, rays: 0, gems: 4, halo: false },
  SILVER: { wings: 0, laurel: true, rays: 0, gems: 4, halo: false },
  GOLD: { wings: 2, laurel: false, rays: 0, gems: 4, halo: false },
  PLATINUM: { wings: 2, laurel: false, rays: 0, gems: 6, halo: true },
  DIAMOND: { wings: 3, laurel: false, rays: 16, gems: 6, halo: false },
  CHAMPION: { wings: 3, laurel: true, rays: 0, gems: 6, halo: false },
  GRAND_CHAMPION: { wings: 4, laurel: true, rays: 12, gems: 8, halo: false },
  LEGEND: { wings: 4, laurel: true, rays: 24, gems: 8, halo: true },
};

/** Frame art only (no photo). Sized so the 56 px avatar fits the hole exactly. */
export const RankFrameArt: React.FC<{ rankIndex: number; division?: number | null; animate?: boolean }> = memo(({ rankIndex, division = 0, animate }) => {
  const rank = getRank(rankIndex);
  const p = PALETTES[rank.id];
  const base = TIER[rank.id];
  const d = Math.max(0, Math.min(2, division ?? 2));
  // Ornaments grow with the division: I ring only, II fins, III big wings.
  const t = { ...base, wings: [0, 1, 3][d] };
  const sharpWings = d <= 1 || rank.id === 'PLATINUM' || rank.id === 'DIAMOND';
  const wingProps = { id: '', p, ax: C.x + 38, ay: C.y + 4, L: [0, 30, 46][d], rows: t.wings, n: 5, spread: [-76, 34] as [number, number], axis: C.x, sharp: sharpWings, lite: true as const, thick: d === 1 ? 1.8 : 1.45, tone: ['PLATINUM', 'DIAMOND', 'CHAMPION', 'GRAND_CHAMPION'].includes(rank.id) ? 'body' as const : 'trim' as const };
  const id = `rf${useId().replace(/:/g, '')}`;
  const gemAngles = Array.from({ length: t.gems }, (_, i) => -90 + (360 / t.gems) * i + (t.gems === 4 || t.gems === 8 ? 45 : 0));

  return (
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" height="100%" aria-hidden="true" style={{ overflow: 'visible' }}>
      <Defs id={id} p={p} />
      <circle cx={C.x} cy={C.y} r={58} fill={u(id, 'glow')} opacity={t.rays ? 0.6 : 0.35} />
      {t.rays > 0 && <Rays cx={C.x} cy={C.y} n={t.rays} r1={42} r2={66} half={0.05} fill={p.glow} opacity={0.4} />}

      {t.wings > 0 && (
        <>
          <Wing {...wingProps} id={id} />
          <Wing {...wingProps} id={id} mirror />
        </>
      )}
      {t.laurel && (
        <>
          <Laurel id={id} p={p} cx={C.x} cy={C.y} R={47} a0={92} a1={196} n={9} leaf={6.6} axis={C.x} lite />
          <Laurel id={id} p={p} cx={C.x} cy={C.y} R={47} a0={92} a1={196} n={9} leaf={6.6} axis={C.x} lite mirror />
        </>
      )}

      {/* Outer ring: bevelled metal, engraved band, rivets */}
      <circle cx={C.x} cy={C.y} r={46} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={1.1} />
      <circle cx={C.x} cy={C.y} r={43.5} fill={u(id, 'body')} stroke={p.trimDark} strokeWidth={0.6} />
      <circle cx={C.x} cy={C.y} r={40.4} fill={u(id, 'plate')} stroke={p.deep} strokeWidth={0.8} />
      <circle cx={C.x} cy={C.y} r={40.4} fill={u(id, 'sheen')} opacity={0.8} />
      <circle cx={C.x} cy={C.y} r={R_HOLE + 0.6} fill="none" stroke={p.deep} strokeWidth={1.4} opacity={0.8} />
      <circle cx={C.x} cy={C.y} r={42} fill="none" stroke={p.trimLight} strokeWidth={0.5} strokeDasharray="1.4 1.8" opacity={0.7} />
      <Ticks cx={C.x} cy={C.y} r={44.2} n={60} len={1.5} stroke={p.deep} w={0.5} opacity={0.5} />
      <path d={`M${C.x - 40} ${C.y - 6} A40.5 40.5 0 0 1 ${C.x - 8} ${C.y - 40}`} fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />

      {t.halo && (
        <g>
          <circle cx={C.x} cy={C.y} r={51} fill="none" stroke={p.trimLight} strokeWidth={0.6} opacity={0.6} />
          <Ticks cx={C.x} cy={C.y} r={51.5} n={48} len={2} stroke={p.trimMid} w={0.6} opacity={0.8} major={4} />
        </g>
      )}

      {gemAngles.map((a, i) => (
        <Gem key={i} id={id} p={p} cx={f(C.x + 43.3 * Math.cos((a * Math.PI) / 180))} cy={f(C.y + 43.3 * Math.sin((a * Math.PI) / 180))} r={i % 2 && t.gems > 4 ? 2.6 : 3.4} lite={false} />
      ))}

      {(t.wings > 0 || t.rays > 0) && [[10, 30, 3], [118, 30, 3], [8, 104, 2.4], [120, 104, 2.4]].map(([x, y, s], i) => (
        <Sparkle key={i} x={x} y={y} s={s} animate={animate} delay={i * 0.5} />
      ))}
    </svg>
  );
});
RankFrameArt.displayName = 'RankFrameArt';

/**
 * Profile photo frame for the HUD. `children` is the photo (56 px). The equipped
 * frame (if any) is drawn behind it, and the rank insignia hangs below as a pendant.
 */
export const RankFrame: React.FC<{ children: React.ReactNode; onOpen?: () => void; avatarSize?: number }> = ({ children, onOpen, avatarSize = 56 }) => {
  const { ready, standing, meta } = useProgression();
  const frame = meta.equippedFrame ?? null;
  if (!ready) return <>{children}</>;

  const k = avatarSize / (R_HOLE * 2);
  const w = VB.w * k;
  const h = VB.h * k;
  const left = avatarSize / 2 - C.x * k;
  const top = avatarSize / 2 - C.y * k;

  return (
    <div className="relative" style={{ width: avatarSize, height: avatarSize }}>
      {/* The frame is optional: only drawn when the user equipped one from the inventory. */}
      {/* Inline pointer-events: the global `.pointer-events-none` rule adds `contain: strict`, which would clip the wings. */}
      {frame !== null && (
        <div className="absolute" style={{ left, top, width: w, height: h, pointerEvents: 'none', contain: 'none' }} aria-hidden="true">
          <RankFrameArt rankIndex={frame} division={frame === standing.rankIndex ? standing.division : 2} animate />
        </div>
      )}
      <div className="relative z-[1]">{children}</div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onOpen?.(); }}
        className="absolute z-[11] active:scale-95 transition-transform"
        // Mirrors the level circle (bottom-right, centre 8 px inside the photo): same horizontal axis.
        style={{ left: 8, top: avatarSize - 8, transform: 'translate(-50%, -50%)', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}
        aria-label={`${standing.label}`}
      >
        <RankBadge rankIndex={standing.rankIndex} division={standing.division} size={36} title={standing.label} />
      </button>
    </div>
  );
};
