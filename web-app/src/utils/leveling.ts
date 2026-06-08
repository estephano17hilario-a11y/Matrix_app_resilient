
export const calculateXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    let totalXp = 0;
    let currentReq = 120;
    for (let l = 1; l < level; l++) {
        totalXp += currentReq;
        if (l < 9) {
            currentReq += 55;
        } else if (l < 19) {
            currentReq += 65;
        } else if (l < 29) {
            currentReq += 75;
        } else {
            currentReq += 85;
        }
    }
    return totalXp;
};

export const calculateLevelFromXp = (xp: number): number => {
    if (xp <= 0) return 1;
    let totalXp = 0;
    let currentReq = 120;
    let level = 1;
    while (true) {
        if (totalXp + currentReq > xp) {
            break;
        }
        totalXp += currentReq;
        level++;
        if (level - 1 < 9) {
            currentReq += 55;
        } else if (level - 1 < 19) {
            currentReq += 65;
        } else if (level - 1 < 29) {
            currentReq += 75;
        } else {
            currentReq += 85;
        }
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
