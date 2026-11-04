import type { CSSProperties } from 'react';
import type { Transition } from 'framer-motion';
import { PROGRESSION_CONFIG } from '../engine/config';
import { getRank } from '../engine/ranks';

/** Motion tokens: 150–300 ms for micro-interactions, 400–600 ms for celebrations. */
export const MOTION = {
  micro: 0.2,
  short: 0.28,
  celebrate: 0.5,
  sheet: { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } satisfies Transition,
  pop: { type: 'spring', stiffness: 520, damping: 26 } satisfies Transition,
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** CSS variables that colour a subtree with a rank's palette. */
export const rankStyle = (rankIndex: number): CSSProperties => {
  const r = getRank(rankIndex);
  return {
    '--rank': hexToRgb(r.color),
    '--rank-from': r.gradient[0],
    '--rank-to': r.gradient[1],
  } as CSSProperties;
};

export const rankRgb = (rankIndex: number) => hexToRgb(getRank(rankIndex).color);

export const RANKS = PROGRESSION_CONFIG.RANKS;
