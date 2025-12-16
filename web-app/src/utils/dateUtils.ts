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

export const getContextDates = (
    parentStart: Date, 
    parentEnd: Date, 
    level: '10_YEARS' | '5_YEARS' | 'YEAR' | 'SEMESTER' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY', 
    index: number,
    totalChildren: number
): { start: Date, end: Date, label: string } => {
    const start = new Date(parentStart);
    let end = new Date(parentStart);
    let label = '';

    // Helper to check if this is the last child
    const isLast = index === totalChildren - 1;

    switch (level) {
        case '10_YEARS':
            // Parent: 10 Years. Child: 5 Years.
            // Logic: Add 5 years.
            start.setFullYear(start.getFullYear() + (index * 5));
            if (isLast) {
                end = new Date(parentEnd);
            } else {
                end = new Date(start);
                end.setFullYear(end.getFullYear() + 5);
            }
            label = index === 0 ? 'Primer Lustro' : 'Segundo Lustro';
            break;

        case '5_YEARS':
            // Parent: 5 Years. Child: Year.
            // Logic: Add 1 year.
            start.setFullYear(start.getFullYear() + index);
            if (isLast) {
                end = new Date(parentEnd);
            } else {
                end = new Date(start);
                end.setFullYear(end.getFullYear() + 1);
            }
            label = `Año ${index + 1}`;
            break;

        case 'YEAR':
            // Parent: Year. Child: Semester.
            // Logic: Add 6 months for each index.
            start.setMonth(start.getMonth() + (index * 6));
            if (isLast) {
                end = new Date(parentEnd);
            } else {
                end = new Date(start);
                end.setMonth(end.getMonth() + 6);
            }
            label = index === 0 ? 'Primeros 6 Meses' : 'Segundos 6 Meses';
            break;

        case 'SEMESTER':
            // Parent: Semester (6mo). Child: Quarter.
            // Logic: Add 3 months.
            start.setMonth(start.getMonth() + (index * 3));
            if (isLast) {
                end = new Date(parentEnd);
            } else {
                end = new Date(start);
                end.setMonth(end.getMonth() + 3);
            }
            label = `Trimestre ${index + 1}`;
            break;

        case 'QUARTER':
            // Parent: Quarter (3mo). Child: Month.
            // Logic: Add 1 month.
            start.setMonth(start.getMonth() + index);
            if (isLast) {
                end = new Date(parentEnd);
            } else {
                end = new Date(start);
                end.setMonth(end.getMonth() + 1);
            }
            label = `Mes ${index + 1}`;
            break;

        case 'MONTH':
            // Parent: Month. Child: Week.
            // Logic: Month usually has 4 weeks in this system, but could be more.
            // We use 7 days per week.
            // IMPORTANT: The last week must absorb the remainder of the month.
            start.setDate(start.getDate() + (index * 7));
            
            if (isLast) {
                // If last child, end date is strictly the parent's end date.
                end = new Date(parentEnd);
            } else {
                end = new Date(start);
                end.setDate(end.getDate() + 7);
            }
            label = `Semana ${index + 1}`;
            break;

        case 'WEEK':
            // Parent: Week. Child: Day.
            // Logic: 1 Day.
            start.setDate(start.getDate() + index);
            end = new Date(start);
            end.setDate(end.getDate() + 1);
            
            if (isLast) {
                 // Ensure last day matches parent end (though for week->day it usually aligns perfectly)
                 end = new Date(parentEnd);
            }
            label = `Día ${index + 1}`;
            break;

        case 'DAY':
            // Parent: Day. Child: Blocks/Hours.
            // Just placeholder logic.
            end = addDays(start, 1);
            label = `Bloque ${index + 1}`;
            break;
    }

    // FINAL SAFEGUARD:
    // If we are the last child, we FORCE the end date to match the parent's end date
    // to ensure no gaps and perfect precision (e.g. 31st of the month, or partial blocks).
    if (isLast) {
        end = new Date(parentEnd);
    }
    
    return { start, end, label };
};

export const getStartOfWeek = (date: Date): Date => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
    newDate.setDate(diff);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
};

export const formatDateRange = (date: Date, range: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'): string => {
    const d = new Date(date);
    const locale = 'es-ES';

    if (range === 'DAY') {
        return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    } else if (range === 'WEEK') {
        const start = getStartOfWeek(d);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
    } else if (range === 'MONTH') {
        return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (range === 'YEAR') {
        return d.getFullYear().toString();
    }
    return '';
};

export const toLocalISOString = (date: Date): string => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

export const calculateStreak = (entries: { date: string }[]): number => {
    if (!entries.length) return 0;
    const uniqueDates = new Set(entries.map(e => e.date.split('T')[0]));
    const today = new Date();
    const todayStr = toLocalISOString(today);
    
    let streak = 0;
    let current = new Date(today);
    
    // If no entry today, check yesterday. If neither, streak is 0.
    if (!uniqueDates.has(todayStr)) {
        current.setDate(current.getDate() - 1);
        if (!uniqueDates.has(toLocalISOString(current))) {
            return 0;
        }
    }
    
    while (uniqueDates.has(toLocalISOString(current))) {
        streak++;
        current.setDate(current.getDate() - 1);
    }
    
    return streak;
};

export const getDaysInMonth = (date: Date): { days: number, firstDay: number } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
};
