// Rank frames for the HUD avatar. One inventory item per rank, granted when the
// rank is first reached; wearing one is optional (ProgressionMeta.equippedFrame).

const PREFIX = 'frame_rank_';

export const frameItemId = (rankIndex: number) => `${PREFIX}${rankIndex}`;

/** Rank index of a frame item id, or null if the id is not a frame. */
export const frameRankOf = (itemId: string): number | null =>
  itemId.startsWith(PREFIX) ? Number(itemId.slice(PREFIX.length)) : null;
