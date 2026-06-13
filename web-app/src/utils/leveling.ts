export const calculateXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    const n = level - 1;
    // Base 120 XP + 36 XP increment per level
    return 120 * n + (36 * n * (n - 1)) / 2;
};

export const calculateLevelFromXp = (xp: number): number => {
    if (xp <= 0) return 1;
    // Quadratic inverse: 120n + 18n(n-1) = xp => 18n^2 + 102n - xp = 0
    const n = (-102 + Math.sqrt(102 * 102 + 4 * 18 * xp)) / (2 * 18);
    return Math.floor(n) + 1;
};

export const calculateNextLevelXp = (currentLevel: number): number => {
    return calculateXpForLevel(currentLevel + 1);
};

export const calculateLevelProgress = (xp: number, level: number): number => {
    const currentLevelXp = calculateXpForLevel(level);
    const nextLevelXp = calculateNextLevelXp(level);
    if (nextLevelXp === currentLevelXp) return 0;
    const progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
    return Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1
};

export const calculateAttributeMaxXp = (level: number): number => {
    const lvl = Math.max(1, level);
    // Trait: base 80 + 18 per level
    return 80 + (lvl - 1) * 18;
};

export const calculateSubTraitMaxXp = (level: number): number => {
    const lvl = Math.max(1, level);
    // Sub-trait: base 50 + 11 per level
    return 50 + (lvl - 1) * 11;
};
