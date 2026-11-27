import { describe, expect, it } from 'vitest';
import { divisionTier, mix, rankTheme } from './rankTheme';

describe('rankTheme', () => {
  it('mixes colours linearly and clamps', () => {
    expect(mix([0, 0, 0], [200, 100, 50], 0.5)).toEqual([100, 50, 25]);
    expect(mix([0, 0, 0], [200, 100, 50], 5)).toEqual([200, 100, 50]);
    expect(mix([0, 0, 0], [200, 100, 50], -1)).toEqual([0, 0, 0]);
  });

  it('maps divisions to tiers; Legend and unknown count as the top', () => {
    expect(divisionTier(0, 0)).toBe(0);
    expect(divisionTier(0, 1)).toBe(1);
    expect(divisionTier(3, 2)).toBe(2);
    expect(divisionTier(7, null)).toBe(2);
    expect(divisionTier(2, undefined)).toBe(2);
    expect(divisionTier(2, 9)).toBe(2);
  });

  it('makes a deeper division brighter and adds effects in order', () => {
    const one = rankTheme(2, 0);
    const two = rankTheme(2, 1);
    const three = rankTheme(2, 2);
    expect([one.energy, two.energy, three.energy]).toEqual([0.7, 0.85, 1]);
    expect([one.rays, two.rays, three.rays]).toEqual([false, true, true]);
    expect([one.sparkles, two.sparkles, three.sparkles]).toEqual([false, false, true]);
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(lum(three.accent)).toBeGreaterThan(lum(one.accent));
  });

  it('gives every rank its own hue and background', () => {
    const accents = new Set(Array.from({ length: 8 }, (_, i) => rankTheme(i, 0).accent));
    expect(accents.size).toBe(8);
    const bgs = new Set(Array.from({ length: 8 }, (_, i) => (rankTheme(i, 0).style as Record<string, string>)['--p-bg']));
    expect(bgs.size).toBe(8);
  });

  it('keeps the page background untouched on the light appearance', () => {
    const style = rankTheme(4, 1, false).style as Record<string, string>;
    expect(style['--p-bg']).toBeUndefined();
    expect(style['--rank']).toBeDefined();
  });

  it('flags Legend', () => {
    expect(rankTheme(7, null).legend).toBe(true);
    expect(rankTheme(6, 2).legend).toBe(false);
  });
});
