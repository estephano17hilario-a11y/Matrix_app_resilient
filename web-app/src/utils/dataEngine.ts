import { 
    subWeeks, 
    startOfMonth, endOfMonth, eachMonthOfInterval,
    startOfYear, endOfYear, format, differenceInDays,
    eachDayOfInterval, eachHourOfInterval,
    startOfQuarter, endOfQuarter
} from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek, endOfWeek, eachWeekOfInterval } from './dateUtils';
import { Project, Attribute } from '../types';

export const generateFocusData = (
    projects: Project[],
    attributes: Attribute[],
    date: Date, 
    range: 'DAY' | 'WEEK' | '8_WEEKS' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL', 
    contextId: string = 'GLOBAL',
    groupMode: 'TOTAL' | 'ATTRIBUTE' | 'PROJECT' = 'TOTAL'
) => {
  const labels: string[] = [];
  let max = 0;
  let totalMinutes = 0;

  // 1. Determine Range & Buckets
  let buckets: { start: Date, end: Date, label: string }[] = [];
  
  const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);
  
  if (range === 'DAY') {
      const hours = eachHourOfInterval({ start: startOfDay, end: endOfDay });
      buckets = hours.map(h => ({
          start: h,
          end: new Date(h.getTime() + 3600000 - 1),
          label: format(h, 'HH') + 'h'
      }));
  } else if (range === 'WEEK') {
      const start = startOfWeek(date);
      const end = endOfWeek(date);
      const days = eachDayOfInterval({ start, end });
      buckets = days.map(d => ({
          start: d,
          end: new Date(d.getTime() + 86400000 - 1),
          label: format(d, 'EEE', { locale: es }).slice(0, 1).toUpperCase()
      }));
  } else if (range === '8_WEEKS') {
      const end = endOfWeek(date);
      const start = subWeeks(end, 7);
      const weeks = eachWeekOfInterval({ start, end });
      buckets = weeks.map(w => ({
          start: w,
          end: endOfWeek(w),
          label: format(w, 'd/M')
      }));
  } else if (range === 'MONTH') {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const days = eachDayOfInterval({ start, end });
      buckets = days.map(d => ({
          start: d,
          end: new Date(d.getTime() + 86400000 - 1),
          label: format(d, 'd')
      }));
  } else if (range === '3_MONTHS') {
      // Standard Quarter Logic (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
      const start = startOfQuarter(date);
      const end = endOfQuarter(date);
      const weeks = eachWeekOfInterval({ start, end });
      buckets = weeks.map(w => ({
          start: w,
          end: endOfWeek(w),
          label: format(w, 'd/M')
      }));
  } else if (range === 'YEAR') {
      const start = startOfYear(date);
      const end = endOfYear(date);
      const months = eachMonthOfInterval({ start, end });
      buckets = months.map(m => ({
          start: m,
          end: endOfMonth(m),
          label: format(m, 'MMM', { locale: es }).slice(0, 3).toUpperCase()
      }));
  } else {
      // TOTAL
      let minDate = new Date();
      if (projects.some(p => p.sessions && p.sessions.length > 0)) {
          projects.forEach(p => {
              if (p.sessions) {
                  p.sessions.forEach(s => {
                      const d = new Date(s.date);
                      if (d < minDate) minDate = d;
                  });
              }
          });
      }
      
      const end = new Date();
      const daysDiff = differenceInDays(end, minDate);
      
      if (daysDiff <= 30) {
          // Si el historial es muy corto, mostrar por días (mínimo 7 días)
          const start = new Date(minDate); start.setHours(0,0,0,0);
          const adjustedStart = daysDiff < 7 ? new Date(end.getTime() - 6 * 86400000) : start;
          adjustedStart.setHours(0,0,0,0);
          
          const days = eachDayOfInterval({ start: adjustedStart, end });
          buckets = days.map(d => ({
              start: d,
              end: new Date(d.getTime() + 86400000 - 1),
              label: format(d, 'd/M')
          }));
      } else if (daysDiff <= 365) {
          // Hasta un año, mostrar por semanas
          const start = startOfWeek(minDate);
          const weeks = eachWeekOfInterval({ start, end });
          buckets = weeks.map(w => ({
              start: w,
              end: endOfWeek(w),
              label: format(w, 'd/M')
          }));
      } else {
          // Más de un año, mostrar por meses
          const start = startOfMonth(minDate);
          const months = eachMonthOfInterval({ start, end });
          buckets = months.map(m => ({
              start: m,
              end: endOfMonth(m),
              label: format(m, 'MMM yyyy', { locale: es })
          }));
      }
  }

  labels.push(...buckets.map(b => b.label));
  const bucketSize = buckets.length;

  // Initialize Buckets
  const segmentBuckets = new Map<string, number[]>();
  const getBuckets = (id: string) => {
      if (!segmentBuckets.has(id)) {
          segmentBuckets.set(id, new Array(bucketSize).fill(0));
      }
      return segmentBuckets.get(id)!;
  };

  // 2. Aggregate Data
  projects.forEach(p => {
     if (contextId === 'GLOBAL' || p.id === contextId || p.attribute === contextId) {
         if (p.sessions) {
             p.sessions.forEach(s => {
                const sDate = new Date(s.date);
                
                // Find matching bucket
                const bucketIndex = buckets.findIndex(b => sDate >= b.start && sDate <= b.end);

                if (bucketIndex !== -1) {
                    const minutes = Math.floor(s.duration / 60);
                    totalMinutes += minutes;

                    let segmentId = 'total';
                    if (groupMode === 'ATTRIBUTE') segmentId = p.attribute;
                    else if (groupMode === 'PROJECT') segmentId = p.id;

                    const b = getBuckets(segmentId);
                    b[bucketIndex] += minutes;
                }
             });
         }
     }
  });

  // 3. Construct Datasets
  const datasets: { data: number[]; color: string; label?: string }[] = [];
  
  if (groupMode === 'TOTAL') {
      const data = segmentBuckets.get('total') || new Array(bucketSize).fill(0);
      datasets.push({
          data,
          color: '#6366f1', // Default Indigo
          label: 'Total'
      });
      max = Math.max(...data, 1);
  } else {
      // Calculate Stacked Max (Sum of all segments per bucket)
      const totals = new Array(bucketSize).fill(0);
      
      segmentBuckets.forEach((buckets, id) => {
          let color = '#6366f1';
          let label = 'Unknown';

          if (groupMode === 'ATTRIBUTE') {
              const attr = attributes.find(a => a.id === id);
              if (attr) {
                  color = attr.color;
                  label = attr.label;
              }
          } else if (groupMode === 'PROJECT') {
              const proj = projects.find(p => p.id === id);
              if (proj) {
                  const attr = attributes.find(a => a.id === proj.attribute);
                  color = proj.color || (attr ? attr.color : '#6366f1'); 
                  label = proj.title;
              }
          }

          datasets.push({
              data: buckets,
              color,
              label
          });

          // Add to totals
          buckets.forEach((val, idx) => totals[idx] += val);
      });

      max = Math.max(...totals, 1);
      
      // Sort datasets by value size? Or by fixed order? 
      // Fixed order (e.g. Attributes order) is better for consistency.
      if (groupMode === 'ATTRIBUTE') {
          datasets.sort((a, b) => {
              const attrA = attributes.findIndex(attr => attr.label === a.label);
              const attrB = attributes.findIndex(attr => attr.label === b.label);
              return attrA - attrB;
          });
      } else if (groupMode === 'PROJECT') {
          datasets.sort((a, b) => {
               const projA = projects.find(p => p.title === a.label);
               const projB = projects.find(p => p.title === b.label);
               
               if (!projA && !projB) return 0;
               if (!projA) return 1;
               if (!projB) return -1;
               
               const attrA = attributes.findIndex(attr => attr.id === projA.attribute);
               const attrB = attributes.findIndex(attr => attr.id === projB.attribute);
               
               if (attrA !== attrB) return attrA - attrB;
               return projA.title.localeCompare(projB.title);
          });
      }
  }

  // Fallback if empty
  if (datasets.length === 0) {
      datasets.push({ data: new Array(bucketSize).fill(0), color: '#333', label: 'Empty' });
      max = 1;
  }

  return { 
      datasets, // Changed from data to datasets
      labels, 
      max, 
      totalHours: (totalMinutes / 60).toFixed(1) 
  };
};

