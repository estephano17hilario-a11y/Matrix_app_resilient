export const getRequiredPercentForDay = (day: number) => {
    if (day <= 7) return 50;
    if (day <= 14) return 53;
    if (day <= 21) return 57;
    if (day <= 30) return 67;
    if (day <= 45) return 80;
    if (day <= 60) return 85;
    return 85;
};

export const normalizeHistoryDate = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        const local = new Date(parsed);
        local.setHours(0, 0, 0, 0);
        return local.toISOString().split('T')[0];
    }
    return value.split('T')[0];
};
