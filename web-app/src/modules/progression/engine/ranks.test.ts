import { describe, expect, it } from 'vitest';
import { PROGRESSION_CONFIG } from './config';
import {
  compareStandings, divisionIndex, divisionStart, getStanding, legendPosition, LEGEND_INDEX,
  naturalRankIndex, nextRankIndex,
} from './ranks';

const RANKS = PROGRESSION_CONFIG.RANKS;
const idx = (id: string) => RANKS.findIndex(r => r.id === id);

describe('rank table', () => {
  it('each rank entry = previous entry + previous cost', () => {
    for (let i = 1; i < RANKS.length; i++) {
      const prev = RANKS[i - 1];
      expect(RANKS[i].entry).toBe(prev.entry + (prev.cost ?? 0));
    }
  });

  it('natural rank by ELO', () => {
    expect(naturalRankIndex(0)).toBe(idx('BRONZE'));
    expect(naturalRankIndex(149)).toBe(idx('BRONZE'));
    expect(naturalRankIndex(150)).toBe(idx('SILVER'));
    expect(naturalRankIndex(2699)).toBe(idx('GRAND_CHAMPION'));
    expect(naturalRankIndex(2700)).toBe(LEGEND_INDEX);
  });
});

describe('divisions with costs not divisible by 3', () => {
  it.each([
    ['SILVER', [150, 216, 281, 346]],
    ['GOLD', [346, 431, 516, 600]],
    ['CHAMPION', [1350, 1550, 1750, 1950]],
    ['GRAND_CHAMPION', [1950, 2200, 2450, 2700]],
  ] as const)('%s division starts', (id, starts) => {
    const r = idx(id);
    expect([0, 1, 2, 3].map(d => divisionStart(r, d))).toEqual(starts);
  });

  it('there are exactly three divisions per rank, and Grand Champion starts at 1950', () => {
    expect(PROGRESSION_CONFIG.DIVISIONS_PER_RANK).toBe(3);
    expect(RANKS[idx('GRAND_CHAMPION')].entry).toBe(1950);
    expect(divisionIndex(1949, idx('CHAMPION'))).toBe(2);
    expect(naturalRankIndex(1949)).toBe(idx('CHAMPION'));
    expect(naturalRankIndex(1950)).toBe(idx('GRAND_CHAMPION'));
    expect(getStanding(2449, idx('GRAND_CHAMPION')).label).toBe('Gran Campeón II');
    expect(getStanding(2450, idx('GRAND_CHAMPION')).label).toBe('Gran Campeón III');
  });

  it('Plata: exact boundary values', () => {
    const r = idx('SILVER');
    expect(divisionIndex(215, r)).toBe(0);
    expect(divisionIndex(216, r)).toBe(1);
    expect(divisionIndex(280, r)).toBe(1);
    expect(divisionIndex(281, r)).toBe(2);
    expect(divisionIndex(345, r)).toBe(2);
  });

  it('every integer ELO maps to the division whose range contains it, sizes differ by ≤ 1', () => {
    RANKS.forEach((rank, r) => {
      if (rank.cost === null) return;
      const sizes = [0, 0, 0];
      for (let elo = rank.entry; elo < rank.entry + rank.cost; elo++) {
        const d = divisionIndex(elo, r)!;
        expect(elo).toBeGreaterThanOrEqual(divisionStart(r, d));
        expect(elo).toBeLessThan(divisionStart(r, d + 1));
        sizes[d]++;
      }
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(sizes.reduce((a, b) => a + b)).toBe(rank.cost);
    });
  });

  it('Legend has no divisions', () => {
    expect(divisionIndex(2500, LEGEND_INDEX)).toBeNull();
    const s = getStanding(2500, LEGEND_INDEX);
    expect(s.label).toBe('Leyenda');
    expect(s.progress).toBeNull();
  });
});

describe('rank protection', () => {
  const GOLD = idx('GOLD');
  const SILVER = idx('SILVER');

  it('promotion is immediate', () => {
    expect(nextRankIndex(SILVER, 346)).toBe(GOLD);
    expect(nextRankIndex(0, 620)).toBe(idx('PLATINUM'));
  });

  it('stays in the rank until ELO is 10 below its entry', () => {
    expect(nextRankIndex(GOLD, 341)).toBe(GOLD);
    expect(nextRankIndex(GOLD, 336)).toBe(GOLD);
    expect(nextRankIndex(GOLD, 335)).toBe(SILVER);
  });

  it('while protected: division I, empty bar, flagged', () => {
    const s = getStanding(340, GOLD);
    expect(s.label).toBe('Oro I');
    expect(s.protected).toBe(true);
    expect(s.progress).toBe(0);
    expect(s.eloToNext).toBe(431 - 340);
  });

  it('after demotion the division is the natural one', () => {
    const r = nextRankIndex(GOLD, 335);
    expect(getStanding(335, r).label).toBe('Plata III');
  });

  it('divisions go up and down freely inside a rank', () => {
    expect(getStanding(480, GOLD).label).toBe('Oro II');
    expect(getStanding(400, nextRankIndex(GOLD, 400)).label).toBe('Oro I');
  });

  it('a big drop demotes straight to the natural rank', () => {
    expect(nextRankIndex(idx('DIAMOND'), 150)).toBe(SILVER);
  });
});

describe('standing & progress bar', () => {
  it('progress towards the next division', () => {
    const s = getStanding(230, idx('SILVER'));
    expect(s.label).toBe('Plata II');
    expect(s.progress).toBeCloseTo(14 / 65);
    expect(s.eloToNext).toBe(51);
    expect(s.nextLabel).toBe('Plata III');
  });

  it('last division points at the next rank', () => {
    expect(getStanding(345, idx('SILVER')).nextLabel).toBe('Oro I');
    expect(getStanding(2699, idx('GRAND_CHAMPION')).nextLabel).toBe('Leyenda');
  });

  it('classifies changes for celebrations', () => {
    const silver = idx('SILVER');
    expect(compareStandings(getStanding(180, silver), getStanding(230, silver))).toBe('DIVISION_UP');
    expect(compareStandings(getStanding(345, silver), getStanding(347, idx('GOLD')))).toBe('RANK_UP');
    expect(compareStandings(getStanding(230, silver), getStanding(180, silver))).toBe('DIVISION_DOWN');
    expect(compareStandings(getStanding(180, silver), getStanding(182, silver))).toBe('NONE');
  });

  it('Legend position', () => {
    expect(legendPosition(1850, [2000, 1900, 1850])).toBe(3);
    expect(legendPosition(2100, [2000, 1900])).toBe(1);
  });
});
