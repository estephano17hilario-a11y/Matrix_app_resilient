export const calculateLevelFromXp = (xp: number): number => {
    // Basic formula: Level = 1 + sqrt(xp / 100) or similar
    // Using the one from useDashboardLogic: 500 * 1.2^(L-1)
    // Reverse: L-1 = log(xp/500) / log(1.2) => L = 1 + log(xp/500)/log(1.2)
    if (xp < 500) return 1;
    return Math.floor(1 + Math.log(xp / 500) / Math.log(1.2));
};
