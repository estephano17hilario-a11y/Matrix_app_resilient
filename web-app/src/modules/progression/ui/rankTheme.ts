import type { CSSProperties } from 'react';
import { PROGRESSION_CONFIG } from '../engine/config';
import { LEGEND_INDEX, getRank } from '../engine/ranks';

// ─────────────────────────────────────────────────────────────────────────────
// RANK THEME — the whole Progression screen is painted from the rank AND the division you are looking at.
//
//   · The rank decides the hue (Bronze copper, Silver steel, Gold, Platinum teal, Diamond sapphire,
//     Champion violet, Grand Champion crimson, Legend prismatic).
//   · The division decides how much of it: I is calm and a little darker, II is brighter and adds light rays,
//     III is the full material and adds drifting sparkles.
//
// Pure functions (no React, no DOM) so the colour maths is unit-tested.
// ─────────────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];

const parseHex = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const triplet = ([r, g, b]: Rgb) => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;

/** Linear mix: 0 → a, 1 → b. */
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

/** 0 = Division I … 2 = Division III. Legend (no division) counts as the top. */
export const divisionTier = (rankIndex: number, division: number | null | undefined): 0 | 1 | 2 =>
  rankIndex === LEGEND_INDEX || division === null || division === undefined ? 2 : (Math.max(0, Math.min(2, division)) as 0 | 1 | 2);

export interface RankTheme {
  /** Inline CSS variables to put on the screen root. */
  style: CSSProperties;
  /** Accent as a #hex (for SVG / canvas). */
  accent: string;
  /** 0.7 / 0.85 / 1 — how intense the aurora, halo and rays are. */
  energy: number;
  tier: 0 | 1 | 2;
  /** Light rays appear from division II up, sparkles at division III. */
  rays: boolean;
  sparkles: boolean;
  legend: boolean;
}

const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [7, 7, 11];
const SURFACE: Rgb = [16, 16, 22];

/**
 * @param tinted  true on the dark appearance: the page background and card surfaces are mixed with the rank hue.
 *                On light appearance only the accent changes (a tinted white would just look dirty).
 */
export const rankTheme = (rankIndex: number, division: number | null | undefined, tinted = true): RankTheme => {
  const rank = getRank(rankIndex);
  const tier = divisionTier(rankIndex, division);
  const legend = rankIndex === LEGEND_INDEX;
  const base = parseHex(rank.color);
  const [g0, g1] = [parseHex(rank.gradient[0]), parseHex(rank.gradient[1])];

  // The accent warms up with the division: I = the rank colour, III = pushed towards its light end.
  const accent = mix(base, g1, tier * 0.22);
  const from = mix(g0, g1, tier * 0.16);
  const to = mix(g1, WHITE, tier * 0.1);
  const energy = [0.7, 0.85, 1][tier];

  const style: Record<string, string | number> = {
    '--rank': triplet(accent),
    '--rank-from': toHex(from),
    '--rank-to': toHex(to),
    '--vp-energy': energy,
  };
  if (tinted) {
    // Deeper division → a touch more colour in the room.
    const k = 0.075 + tier * 0.02;
    style['--p-bg'] = triplet(mix(INK, base, k));
    style['--p-surface'] = triplet(mix(SURFACE, base, 0.1 + tier * 0.02));
    style['--p-surface-2'] = triplet(mix(SURFACE, base, 0.17 + tier * 0.02));
  }
  return { style: style as CSSProperties, accent: toHex(accent), energy, tier, rays: tier >= 1, sparkles: tier >= 2, legend };
};

/** The division names of the insignia evolution, for captions. */
export const DIVISION_ART = ['Escudo', 'Aletas', 'Alas y corona'] as const;

export const RANK_COUNT = PROGRESSION_CONFIG.RANKS.length;
