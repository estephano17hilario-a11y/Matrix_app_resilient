// Duel wins by contract length, read by the social achievements
// (config/achievements.ts). Kept tiny so that file doesn't pull in the store.
export const socialWins: Record<'DAY' | 'WEEK' | 'MONTH', number> = { DAY: 0, WEEK: 0, MONTH: 0 };
