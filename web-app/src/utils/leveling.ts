
export const calculateXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    const n = level - 1;
    return n * 100 + (n * (n - 1) / 2) * 65;
};

export const calculateLevelFromXp = (xp: number): number => {
    if (xp < 0) return 1;
    let level = 1;
    while (calculateXpForLevel(level + 1) <= xp) {
        level++;
    }
    return level;
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
    return 100 + (lvl - 1) * 65;
};

export const calculateSubTraitMaxXp = (level: number): number => {
    const lvl = Math.max(1, level);
    return 50 + (lvl - 1) * 35;
};
