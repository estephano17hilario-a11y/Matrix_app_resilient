export const calculateXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    const n = level - 1;
    return 120 * n + (23 * n * (n - 1)) / 2;
};

export const calculateLevelFromXp = (xp: number): number => {
    if (xp <= 0) return 1;
    const n = (-217 + Math.sqrt(47089 + 184 * xp)) / 46;
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
    return 80 + (lvl - 1) * 15;
};

export const calculateSubTraitMaxXp = (level: number): number => {
    const lvl = Math.max(1, level);
    return 50 + (lvl - 1) * 10;
};
