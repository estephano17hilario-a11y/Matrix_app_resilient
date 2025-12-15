import { getStartOfWeek } from './dateUtils';

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const generateFocusData = (date: Date, range: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', contextId: string = 'global') => {
  const contextSeed = contextId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + contextSeed;
  
  const data: number[] = [];
  const labels: string[] = [];
  let max = 0;
  let totalHours = 0;

  if (range === 'DAY') {
    for (let i = 0; i <= 22; i += 2) { 
        const seed = baseSeed + date.getDate() * 100 + i;
        const timeBias = (i > 8 && i < 18) ? 1.5 : 0.5;
        const val = Math.floor(pseudoRandom(seed) * 60 * timeBias); 
        data.push(val);
        labels.push(`${i}h`);
        if(val > max) max = val;
        totalHours += val;
    }
  } else if (range === 'WEEK') {
    const start = getStartOfWeek(date);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const daySeed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + contextSeed;
        const val = Math.floor(pseudoRandom(daySeed) * 8 * 60); 
        data.push(val);
        labels.push(days[i]);
        if(val > max) max = val;
        totalHours += val;
    }
  } else if (range === 'MONTH') {
    const month = date.getMonth();
    for (let i = 1; i <= 4; i++) { 
        const weekSeed = baseSeed + month * 100 + i;
        const val = Math.floor(pseudoRandom(weekSeed) * 40 * 60);
        data.push(val);
        labels.push(`W${i}`);
        if(val > max) max = val;
        totalHours += val;
    }
  } else { 
     const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
     for(let i=0; i<12; i++){
         const mSeed = baseSeed + (i + 1) * 50;
         const val = Math.floor(pseudoRandom(mSeed) * 150 * 60); 
         data.push(val);
         labels.push(months[i]);
         if(val > max) max = val;
         totalHours += val;
     }
  }
  return { data, labels, max: max || 1, totalHours: (totalHours / 60).toFixed(1) };
};
