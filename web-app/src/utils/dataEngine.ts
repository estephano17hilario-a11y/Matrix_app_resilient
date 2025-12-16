import { getStartOfWeek } from './dateUtils';
import { Project, Session } from '../types';

export const generateFocusData = (
    projects: Project[],
    date: Date, 
    range: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', 
    contextId: string = 'GLOBAL'
) => {
  const data: number[] = [];
  const labels: string[] = [];
  let max = 0;
  let totalMinutes = 0;

  // 1. Filter relevant sessions
  const sessions: Session[] = [];
  projects.forEach(p => {
     if (contextId === 'GLOBAL' || p.id === contextId || p.attribute === contextId) {
         if (p.sessions) {
             sessions.push(...p.sessions);
         }
     }
  });

  // 2. Aggregate based on range
  if (range === 'DAY') {
    // 0-23 hours, aggregated in 2-hour blocks to match original UI
    const startOfDay = new Date(date);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23,59,59,999);

    const buckets = new Array(12).fill(0);
    for (let i = 0; i <= 22; i += 2) {
       labels.push(`${i}h`);
    }

    sessions.forEach(s => {
        const sDate = new Date(s.date);
        if (sDate >= startOfDay && sDate <= endOfDay) {
            const hour = sDate.getHours();
            // Map 0-1 -> index 0 (0h), 2-3 -> index 1 (2h)
            const index = Math.floor(hour / 2);
            if (index < 12) {
                buckets[index] += Math.floor(s.duration / 60);
            }
        }
    });
    
    data.push(...buckets);

  } else if (range === 'WEEK') {
      const start = getStartOfWeek(date);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const buckets = new Array(7).fill(0);
      labels.push(...days);
      
      // Calculate end of week (Start + 7 days)
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      sessions.forEach(s => {
          const sDate = new Date(s.date);
          if (sDate >= start && sDate < end) {
              const diffTime = sDate.getTime() - start.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
              if (diffDays >= 0 && diffDays < 7) {
                  buckets[diffDays] += Math.floor(s.duration / 60);
              }
          }
      });
      data.push(...buckets);

  } else if (range === 'MONTH') {
      const month = date.getMonth();
      const year = date.getFullYear();
      
      // We'll use 5 weeks to cover all days
      labels.push('W1', 'W2', 'W3', 'W4', 'W5');
      const buckets = new Array(5).fill(0);

      sessions.forEach(s => {
          const sDate = new Date(s.date);
          if (sDate.getMonth() === month && sDate.getFullYear() === year) {
              const day = sDate.getDate();
              // Simple week calc: 1-7 -> W1 (0), 8-14 -> W2 (1)...
              const weekIndex = Math.floor((day - 1) / 7);
              if (weekIndex < 5) buckets[weekIndex] += Math.floor(s.duration / 60);
              else buckets[4] += Math.floor(s.duration / 60); 
          }
      });
      data.push(...buckets);

  } else if (range === 'YEAR') {
      const year = date.getFullYear();
      const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
      labels.push(...months);
      const buckets = new Array(12).fill(0);
      
      sessions.forEach(s => {
          const sDate = new Date(s.date);
          if (sDate.getFullYear() === year) {
              buckets[sDate.getMonth()] += Math.floor(s.duration / 60);
          }
      });
      data.push(...buckets);
  }

  max = Math.max(...data, 1);
  totalMinutes = data.reduce((a, b) => a + b, 0);

  return { 
      data, 
      labels, 
      max, 
      totalHours: (totalMinutes / 60).toFixed(1) 
  };
};
