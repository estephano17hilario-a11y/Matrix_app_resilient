import { startOfDay, setYear, getYear, addYears, getDate, setDate, addMonths, isPast, isSameDay } from 'date-fns';
import { SpecialEvent } from './types';

// Helper to calculate the next occurrence of an event
export const getNextEventDate = (event: SpecialEvent): Date => {
    const baseDate = startOfDay(new Date(event.date));
    const now = startOfDay(new Date());

    if (!event.recurrence || event.recurrence === 'NONE') {
        return baseDate;
    }

    if (event.recurrence === 'ANNUAL') {
        let nextDate = setYear(baseDate, getYear(now));
        // If the date for this year has passed, move to next year
        if (isPast(nextDate) && !isSameDay(nextDate, now)) {
            nextDate = addYears(nextDate, 1);
        }
        return nextDate;
    }

    if (event.recurrence === 'MONTHLY') {
        const dayOfMonth = getDate(baseDate);
        let nextDate = setDate(now, dayOfMonth);
        
        // Handle edge cases where current month doesn't have the day (e.g. 31st in Feb)
        // date-fns setDate wraps to next month automatically, but let's be careful.
        // Actually, let's just use the current month/year and set the date.
        
        // If today is past the day of month, or it's today (we want to show it as today), 
        // logic depends. If it's passed, next month.
        
        if (getDate(now) > dayOfMonth) {
             nextDate = addMonths(nextDate, 1);
             // Re-set date just in case addMonths shifted it due to day overflow
             nextDate = setDate(nextDate, dayOfMonth);
        }
        
        return nextDate;
    }

    return baseDate;
};
