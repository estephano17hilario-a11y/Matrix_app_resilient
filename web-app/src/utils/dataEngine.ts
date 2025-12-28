import { getStartOfWeek } from './dateUtils';
import { Project, Session, Attribute } from '../types';

export const generateFocusData = (
    projects: Project[],
    attributes: Attribute[],
    date: Date, 
    range: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', 
    contextId: string = 'GLOBAL',
    groupMode: 'TOTAL' | 'ATTRIBUTE' | 'PROJECT' = 'TOTAL'
) => {
  const labels: string[] = [];
  let max = 0;
  let totalMinutes = 0;

  // Initialize buckets for aggregation
  // Structure: Map<SegmentId, number[]> where number[] is the buckets
  const segmentBuckets = new Map<string, number[]>();
  
  // Helper to get or create bucket for a segment
  const getBuckets = (id: string, size: number) => {
      if (!segmentBuckets.has(id)) {
          segmentBuckets.set(id, new Array(size).fill(0));
      }
      return segmentBuckets.get(id)!;
  };

  // 1. Define Labels & Bucket Size
  let bucketSize = 0;
  if (range === 'DAY') {
    bucketSize = 12; // 0h, 2h, ... 22h
    for (let i = 0; i <= 22; i += 2) labels.push(`${i}h`);
  } else if (range === 'WEEK') {
      bucketSize = 7;
      labels.push('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
  } else if (range === 'MONTH') {
      bucketSize = 5;
      labels.push('W1', 'W2', 'W3', 'W4', 'W5');
  } else if (range === 'YEAR') {
      bucketSize = 12;
      labels.push('J','F','M','A','M','J','J','A','S','O','N','D');
  }

  // 2. Filter & Aggregate Sessions
  const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);
  
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 7);

  const month = date.getMonth();
  const year = date.getFullYear();

  projects.forEach(p => {
     // Filter by Context
     if (contextId === 'GLOBAL' || p.id === contextId || p.attribute === contextId) {
         if (p.sessions) {
             p.sessions.forEach(s => {
                const sDate = new Date(s.date);
                let bucketIndex = -1;

                // Determine Bucket Index
                if (range === 'DAY') {
                    if (sDate >= startOfDay && sDate <= endOfDay) {
                        bucketIndex = Math.floor(sDate.getHours() / 2);
                        if (bucketIndex >= 12) bucketIndex = 11;
                    }
                } else if (range === 'WEEK') {
                    if (sDate >= startOfWeek && sDate < endOfWeek) {
                        const diffTime = sDate.getTime() - startOfWeek.getTime();
                        bucketIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    }
                } else if (range === 'MONTH') {
                    if (sDate.getMonth() === month && sDate.getFullYear() === year) {
                        const day = sDate.getDate();
                        bucketIndex = Math.floor((day - 1) / 7);
                        if (bucketIndex > 4) bucketIndex = 4;
                    }
                } else if (range === 'YEAR') {
                    if (sDate.getFullYear() === year) {
                        bucketIndex = sDate.getMonth();
                    }
                }

                if (bucketIndex !== -1 && bucketIndex < bucketSize) {
                    const minutes = Math.floor(s.duration / 60);
                    totalMinutes += minutes;

                    // Determine Segment
                    let segmentId = 'total';
                    if (groupMode === 'ATTRIBUTE') {
                        segmentId = p.attribute;
                    } else if (groupMode === 'PROJECT') {
                        segmentId = p.id;
                    }

                    const buckets = getBuckets(segmentId, bucketSize);
                    buckets[bucketIndex] += minutes;
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
                  color = attr ? attr.color : '#6366f1'; // Use attribute color for project or distinct? 
                  // If multiple projects have same attribute, colors will clash. 
                  // Maybe adjust opacity or brightness? For now use attribute color.
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

