export const toLocalISOString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

export const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export const formatDateRange = (date: Date, range: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') => {
  if (range === 'DAY') return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  if (range === 'MONTH') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if (range === 'YEAR') return date.getFullYear().toString();
  
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric' })}`;
};

export const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
};

// Assuming JournalEntry is needed for calculateStreak, but we can make it generic or import the type
import { JournalEntry } from '../types';

export const calculateStreak = (entries: JournalEntry[]) => {
    if (!entries.length) return 0;
    const sortedDates = [...new Set(entries.map(e => e.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = toLocalISOString(new Date());
    const yesterday = toLocalISOString(new Date(Date.now() - 86400000));
    
    // Check if streak is alive (has entry today or yesterday)
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    let currentDate = new Date(sortedDates[0]);
    for (let i = 0; i < sortedDates.length; i++) {
        const entryDate = new Date(sortedDates[i]);
        // Normalize times to compare only dates
        const cDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const eDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        
        const diffTime = Math.abs(cDate.getTime() - eDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (i === 0) { streak++; currentDate = entryDate; continue; }
        if (diffDays === 1) { streak++; currentDate = entryDate; } else { break; }
    }
    return streak;
};
