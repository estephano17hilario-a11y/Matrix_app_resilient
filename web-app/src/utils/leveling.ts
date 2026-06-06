import { toLocalISOString, getHistoryDateKey, parseLocalDate } from './dateUtils';

export const calculateXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    const n = level - 1;
    return n * 100 + (n * (n - 1) / 2) * 35;
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
    return 100 + (lvl - 1) * 35;
};

export const calculateSubTraitMaxXp = (level: number): number => {
    const lvl = Math.max(1, level);
    return 40 + (lvl - 1) * 15;
};

export const recalculateHabitStreak = (history: string[]): number => {
    if (!history || history.length === 0) return 0;
    
    // Normalize and sort history dates ascending
    const uniqueDates = Array.from(
        new Set(history.map(d => getHistoryDateKey(d)))
    ).sort();
    
    if (uniqueDates.length === 0) return 0;
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = toLocalISOString(yesterdayDate);
    
    const lastDateStr = uniqueDates[uniqueDates.length - 1];
    
    // If the last completion is older than yesterday, the streak is broken (0)
    if (lastDateStr < yesterdayStr) {
        return 0;
    }
    
    // Count backward from the last completion date to find consecutive days
    let streak = 0;
    let checkDate = parseLocalDate(lastDateStr);
    
    for (let i = uniqueDates.length - 1; i >= 0; i--) {
        const dateStr = uniqueDates[i];
        const checkStr = toLocalISOString(checkDate);
        
        if (dateStr === checkStr) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // Gap detected
            break;
        }
    }
    return streak;
};
