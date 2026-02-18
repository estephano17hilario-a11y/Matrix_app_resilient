import { GAMIFICATION_CONFIG } from '../config/gamification';

export const calculateLevelFromXp = (xp: number): number => {
    // Formula: Level = floor(sqrt(Account_XP / 20))
    if (xp < 0) return 1;
    const level = Math.floor(Math.sqrt(xp / GAMIFICATION_CONFIG.LEVEL_CONSTANT));
    return Math.max(1, level);
};

export const calculateXpForLevel = (level: number): number => {
    // Formula: XP = 20 * Level^2
    return GAMIFICATION_CONFIG.LEVEL_CONSTANT * Math.pow(level, 2);
};

export const calculateNextLevelXp = (currentLevel: number): number => {
    return calculateXpForLevel(currentLevel + 1);
};

export const calculateLevelProgress = (xp: number, level: number): number => {
    const currentLevelXp = calculateXpForLevel(level);
    const nextLevelXp = calculateNextLevelXp(level);
    const progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
    return Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1
};
