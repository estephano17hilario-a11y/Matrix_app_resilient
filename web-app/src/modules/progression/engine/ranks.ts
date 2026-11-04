// Ranks & divisions.
//
// Divisions move freely with ELO. Ranks are "sticky" on the way down: you only
// leave your current rank once ELO falls RANK_DEMOTION_BUFFER points below its
// entry. While inside that buffer you sit at division I with an empty bar.
//
// Division boundaries use integer math (floor(4·Δ / cost)) so ranks whose cost
// is not divisible by 3 (100, 130, 170, 220, 280, 400, 500) never suffer float drift.

import { PROGRESSION_CONFIG } from './config';

const { RANKS, DIVISIONS_PER_RANK } = PROGRESSION_CONFIG;
const BUFFER = PROGRESSION_CONFIG.ELO.PROTECTION.RANK_DEMOTION_BUFFER;

export type RankDef = (typeof RANKS)[number];
export const LEGEND_INDEX = RANKS.length - 1;
const DIVISION_LABELS = ['I', 'II', 'III'] as const;

export const getRank = (rankIndex: number): RankDef =>
  RANKS[Math.max(0, Math.min(LEGEND_INDEX, rankIndex))];

/** The rank ELO alone would place you in (no protection). */
export const naturalRankIndex = (elo: number): number => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (elo >= RANKS[i].entry) return i;
  }
  return 0;
};

/** Raw division index (0 = I) for an ELO inside a rank, clamped to the rank. Null for Legend. */
export const divisionIndex = (elo: number, rankIndex: number): number | null => {
  const rank = getRank(rankIndex);
  if (rank.cost === null) return null;
  const delta = elo - rank.entry;
  if (delta <= 0) return 0;
  return Math.min(DIVISIONS_PER_RANK - 1, Math.floor((DIVISIONS_PER_RANK * delta) / rank.cost));
};

/** Lowest integer ELO that belongs to `division` of a rank. Division 4 = next rank's entry. */
export const divisionStart = (rankIndex: number, division: number): number => {
  const rank = getRank(rankIndex);
  if (rank.cost === null) return rank.entry;
  return rank.entry + Math.ceil((division * rank.cost) / DIVISIONS_PER_RANK);
};

/**
 * Applies rank protection. Promotion is immediate; demotion only happens once
 * ELO drops BUFFER points below the current rank's entry.
 */
export const nextRankIndex = (currentRankIndex: number, elo: number): number => {
  const natural = naturalRankIndex(elo);
  if (natural >= currentRankIndex) return natural;
  const entry = getRank(currentRankIndex).entry;
  return elo < entry - BUFFER ? natural : currentRankIndex;
};

export interface Standing {
  rankIndex: number;
  rank: RankDef;
  /** 0-based division, null for Legend. */
  division: number | null;
  /** "Oro II", "Leyenda" */
  label: string;
  /** Progress towards the next division, 0..1 (null for Legend). */
  progress: number | null;
  /** ELO still missing to reach the next division (null for Legend). */
  eloToNext: number | null;
  /** Label of the next division/rank (null for Legend). */
  nextLabel: string | null;
  /** True while ELO sits in the demotion buffer below the rank entry. */
  protected: boolean;
}

export const divisionLabel = (rankIndex: number, division: number | null): string => {
  const rank = getRank(rankIndex);
  return division === null ? rank.name : `${rank.name} ${DIVISION_LABELS[division]}`;
};

export const getStanding = (elo: number, rankIndex: number): Standing => {
  const rank = getRank(rankIndex);
  const division = divisionIndex(elo, rankIndex);
  const label = divisionLabel(rankIndex, division);

  if (division === null) {
    return { rankIndex, rank, division, label, progress: null, eloToNext: null, nextLabel: null, protected: false };
  }

  const isProtected = elo < rank.entry;
  const start = divisionStart(rankIndex, division);
  const end = divisionStart(rankIndex, division + 1);
  const progress = isProtected ? 0 : Math.max(0, Math.min(1, (elo - start) / (end - start)));
  const nextLabel = division + 1 < DIVISIONS_PER_RANK
    ? divisionLabel(rankIndex, division + 1)
    : divisionLabel(rankIndex + 1, rankIndex + 1 === LEGEND_INDEX ? null : 0);

  return {
    rankIndex,
    rank,
    division,
    label,
    progress,
    eloToNext: Math.max(0, end - elo),
    nextLabel,
    protected: isProtected,
  };
};

export type StandingChange = 'RANK_UP' | 'DIVISION_UP' | 'NONE' | 'DIVISION_DOWN' | 'RANK_DOWN';

/** What celebration (or not) a move between two standings deserves. */
export const compareStandings = (before: Standing, after: Standing): StandingChange => {
  if (after.rankIndex > before.rankIndex) return 'RANK_UP';
  if (after.rankIndex < before.rankIndex) return 'RANK_DOWN';
  const b = before.division ?? 0;
  const a = after.division ?? 0;
  if (a > b) return 'DIVISION_UP';
  if (a < b) return 'DIVISION_DOWN';
  return 'NONE';
};

/** "Leyenda #N": 1-based position among Legend players ordered by ELO (ties share a spot). */
export const legendPosition = (elo: number, legendElos: number[]): number =>
  1 + legendElos.filter(other => other > elo).length;
