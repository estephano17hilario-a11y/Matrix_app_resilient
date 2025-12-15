export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export const addMonths = (date: Date, months: number): Date => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
};

export const addWeeks = (date: Date, weeks: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    return newDate;
};

export const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

export const getContextDates = (startDate: Date, level: 'YEAR' | 'SEMESTER' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY', index: number): { start: Date, end: Date, label: string } => {
    const start = new Date(startDate);
    let end = new Date(startDate);
    let label = '';

    switch (level) {
        case 'YEAR':
            // S1 vs S2
            // Index 0 = S1, Index 1 = S2
            start.setMonth(start.getMonth() + (index * 6));
            end = addMonths(start, 6);
            label = index === 0 ? 'Primeros 6 Meses' : 'Segundos 6 Meses';
            break;
        case 'SEMESTER':
            // Month 1..6
            start.setMonth(start.getMonth() + index);
            end = addMonths(start, 1);
            label = `Mes ${index + 1}`;
            break;
        case 'QUARTER':
            // Month 1..3
            start.setMonth(start.getMonth() + index);
            end = addMonths(start, 1);
            label = `Mes ${index + 1}`;
            break;
        case 'MONTH':
            // Week 1..4
            start.setDate(start.getDate() + (index * 7));
            end = addDays(start, 7);
            label = `Semana ${index + 1}`;
            break;
        case 'WEEK':
            // Day 1..7
            start.setDate(start.getDate() + index);
            end = addDays(start, 1);
            label = `Día ${index + 1}`;
            break;
        case 'DAY':
            // Hours or sub-tasks (not implemented yet, but preventing crash/type error)
            end = addDays(start, 1);
            label = `Bloque ${index + 1}`;
            break;
    }
    
    return { start, end, label };
};
