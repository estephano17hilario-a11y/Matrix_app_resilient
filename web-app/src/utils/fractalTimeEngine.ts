import { 
    differenceInDays, 
    addYears, 
    differenceInMonths, 
    differenceInYears,
    endOfYear,
    endOfQuarter,
    endOfMonth,
    endOfDay,
    addMilliseconds,
    getMonth
} from 'date-fns';
import { endOfWeek } from './dateUtils';

export type TimeUnit = '10_YEARS' | '5_YEARS' | '1_YEAR' | 'SEMESTER' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY';

export interface TimeBlock {
    type: TimeUnit;
    durationLabel: string;
    isFull: boolean;
    startDate: Date;
    endDate: Date;
    count: number;
}

export interface FractalStructure {
    structure: TimeBlock[];
    drillDownPath: TimeUnit[];
}

const HIERARCHY: { unit: TimeUnit; months?: number; years?: number; days?: number }[] = [
    { unit: '10_YEARS', years: 10 },
    { unit: '5_YEARS', years: 5 },
    { unit: '1_YEAR', years: 1 },
    { unit: 'SEMESTER', months: 6 },
    { unit: 'QUARTER', months: 3 },
    { unit: 'MONTH', months: 1 },
    { unit: 'WEEK', days: 7 },
    { unit: 'DAY', days: 1 }
];

export const generateTimeBlocks = (startDate: Date, endDate: Date): FractalStructure => {
    const structure: TimeBlock[] = [];
    let current = new Date(startDate);
    
    // 1. SELECT DOMINANT UNIT (Calendar Aware Selection)
    // We check if the duration is roughly enough to trigger the unit.
    // We favor larger units if they fit "mostly" or if the duration is large.
    
    let selectedUnit: typeof HIERARCHY[0] = HIERARCHY[HIERARCHY.length - 1]; // Default DAY

    const years = differenceInYears(endDate, startDate);
    const months = differenceInMonths(endDate, startDate);
    const days = differenceInDays(endDate, startDate);

    if (years >= 10) selectedUnit = HIERARCHY.find(h => h.unit === '10_YEARS')!;
    else if (years >= 5) selectedUnit = HIERARCHY.find(h => h.unit === '5_YEARS')!;
    else if (years >= 1) selectedUnit = HIERARCHY.find(h => h.unit === '1_YEAR')!;
    else if (months >= 6) selectedUnit = HIERARCHY.find(h => h.unit === 'SEMESTER')!;
    else if (months >= 3) selectedUnit = HIERARCHY.find(h => h.unit === 'QUARTER')!;
    else if (months >= 1) selectedUnit = HIERARCHY.find(h => h.unit === 'MONTH')!;
    else if (days >= 7) selectedUnit = HIERARCHY.find(h => h.unit === 'WEEK')!;
    else selectedUnit = HIERARCHY.find(h => h.unit === 'DAY')!;

    // Special case: 5 months -> 3 Quarters logic requested by user?
    // If months >= 3, we pick QUARTER. 
    // 5 months >= 3 -> QUARTER. Correct.

    // 2. GENERATE BLOCKS (Calendar Aligned)
    
    const getNextBoundary = (date: Date, unit: TimeUnit): Date => {
        switch (unit) {
            case '10_YEARS': return endOfYear(addYears(date, 10 - (date.getFullYear() % 10) - 1)); // End of decade
            case '5_YEARS': return endOfYear(addYears(date, 4)); // Crude 5 year block? Or just 5 relative years? Let's use relative for > Year as calendar decades are weird for planning.
            case '1_YEAR': return endOfYear(date);
            case 'SEMESTER': 
                // Jan-Jun, Jul-Dec
                return getMonth(date) < 6 
                    ? new Date(date.getFullYear(), 5, 30, 23, 59, 59, 999) 
                    : endOfYear(date);
            case 'QUARTER': return endOfQuarter(date);
            case 'MONTH': return endOfMonth(date);
            case 'WEEK': return endOfWeek(date);
            case 'DAY': return endOfDay(date);
            default: return endOfDay(date);
        }
    };

    // For Years > 1, stick to relative logic if it's cleaner, or Calendar Year?
    // Calendar Year is better for "This Year", "Next Year".
    // But for 5_YEARS, 10_YEARS, maybe just relative is fine or align to 5-year marks.
    // Let's stick to Calendar End for everything < 5 Years.
    // For 5/10 Years, maybe treat as blocks of 5 years relative to start?
    // User complaint was about 5 Years -> 12 Semesters.
    // If we picked 5_YEARS, we just have 1 block.
    
    let blockCount = 0;

    while (current.getTime() < endDate.getTime()) {
        blockCount++;
        let boundary: Date;

        if (selectedUnit.unit === '10_YEARS' || selectedUnit.unit === '5_YEARS') {
             // Use relative for massive units to avoid "2 years left in this decade" being a whole block
             boundary = addYears(current, selectedUnit.years!);
             // Adjust boundary to be 1ms before next start? No, addYears keeps time.
             // Let's set to end of that day/period.
             boundary = endOfDay(boundary);
        } else {
             boundary = getNextBoundary(current, selectedUnit.unit);
        }

        // If boundary is beyond endDate, cap it.
        // BUT, if the unit "spans" (e.g. 10 days -> 2 weeks), we want the boundary to be the week end, 
        // effectively saying "This covers Week 1".
        // However, the *task duration* for that block shouldn't exceed the project end date?
        // Actually, for planning, you plan for "The Week". Even if you only have 3 days.
        // So the block END date can be the boundary, but we should know it's partial?
        // The user says "even if one is incomplete".
        // Let's clamp to endDate for the block data, but the loop continues from boundary?
        // No, if we clamp to endDate, next loop `current` will be `endDate`. Loop finishes.
        // If we use boundary, we jump to start of next week.
        
        const effectiveEnd = boundary.getTime() > endDate.getTime() ? endDate : boundary;
        
        // Determine Label
        let label = `${selectedUnit.unit} ${blockCount}`;
        // Enhance labels later if needed (e.g. "Week 1", "Q1 2025")

        structure.push({
            type: selectedUnit.unit,
            durationLabel: label,
            isFull: boundary.getTime() <= endDate.getTime(), // Full if boundary is within range
            startDate: new Date(current),
            endDate: new Date(effectiveEnd),
            count: 1
        });

        // Advance to next unit start (boundary + 1ms)
        current = addMilliseconds(boundary, 1);
    }

    // 3. GENERATE DRILL DOWN PATH
    const drillDownPath: TimeUnit[] = [];
    if (structure.length > 0) {
        const primaryBlock = structure[0];
        let currentLevelIndex = HIERARCHY.findIndex(h => h.unit === primaryBlock.type);
        
        if (currentLevelIndex !== -1) {
            drillDownPath.push(HIERARCHY[currentLevelIndex].unit);
            for (let i = currentLevelIndex + 1; i < HIERARCHY.length; i++) {
                drillDownPath.push(HIERARCHY[i].unit);
            }
        }
    }

    return { structure, drillDownPath };
};
