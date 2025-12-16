import { differenceInDays, addDays, addMonths, addYears, differenceInMonths, differenceInYears } from 'date-fns';

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
    // Normalize dates to start of day for cleaner math if needed, but keeping time is safer for precision
    // Assuming inputs are already handled as dates.

    // Helper to check if a unit fits
    const fitsUnit = (start: Date, end: Date, unitConf: typeof HIERARCHY[0]): boolean => {
        let projectedEnd = new Date(start);
        if (unitConf.years) {
            projectedEnd = addYears(start, unitConf.years);
        } else if (unitConf.months) {
            projectedEnd = addMonths(start, unitConf.months);
        } else if (unitConf.days) {
            projectedEnd = addDays(start, unitConf.days);
        }
        
        // It fits if projectedEnd <= endDate
        // We add a small buffer for "end of day" logic if needed, but strictly:
        return projectedEnd.getTime() <= endDate.getTime();
    };

    const addUnit = (date: Date, unitConf: typeof HIERARCHY[0]): Date => {
        if (unitConf.years) return addYears(date, unitConf.years);
        if (unitConf.months) return addMonths(date, unitConf.months);
        if (unitConf.days) return addDays(date, unitConf.days);
        return date;
    };

    // Greedy Algorithm
    // We iterate through the hierarchy for the *remaining* time
    // But the requirement implies we might have multiple blocks of the same type if they fit?
    // "Example (4 months 10 days): ... 1 Quarter ... Remainder: 1 Month + 10 Days ... 1 Month ..."
    // So for each iteration of the "Remainder", we try to find the largest unit again.

    // Loop until current >= endDate
    while (current.getTime() < endDate.getTime()) {
        let foundUnit = false;

        for (const unitConf of HIERARCHY) {
            if (fitsUnit(current, endDate, unitConf)) {
                const nextDate = addUnit(current, unitConf);
                
                // Determine label
                let durationLabel = '';
                if (unitConf.unit === '10_YEARS') durationLabel = '10 Años';
                else if (unitConf.unit === '5_YEARS') durationLabel = '5 Años';
                else if (unitConf.unit === '1_YEAR') durationLabel = '1 Año';
                else if (unitConf.unit === 'SEMESTER') durationLabel = '1 Semestre';
                else if (unitConf.unit === 'QUARTER') durationLabel = '1 Trimestre';
                else if (unitConf.unit === 'MONTH') durationLabel = '1 Mes';
                else if (unitConf.unit === 'WEEK') durationLabel = '1 Semana';
                else if (unitConf.unit === 'DAY') durationLabel = '1 Día';

                structure.push({
                    type: unitConf.unit,
                    durationLabel,
                    isFull: true,
                    startDate: new Date(current),
                    endDate: new Date(nextDate),
                    count: 1
                });

                current = nextDate;
                foundUnit = true;
                break; // Restart hierarchy check for the remainder (Greedy Adaptive)
            }
        }

        if (!foundUnit) {
            // If even DAY doesn't fit (less than 24h?), we break to avoid infinite loop.
            // Or we treat it as a partial day if we cared about hours.
            // For now, assuming Day is the atomic unit.
            // If < 1 day remains, we might just snap to end.
            break;
        }
    }

    // Generate Drill Down Path
    // "La ruta crítica para preguntar objetivos (Solo el primer bloque de cada nivel)"
    // Logic: Start from the largest unit found in the structure (usually the first one if sorted by size, 
    // but the structure is ordered chronologically. However, due to Greedy, the first block is the largest possible fit).
    // From that unit, we go down the hierarchy step by step until Day?
    // Hierarchy: 10Y > 5Y > 1Y > Sem > Q > M > W > D
    
    const drillDownPath: TimeUnit[] = [];
    
    if (structure.length > 0) {
        const primaryBlock = structure[0];
        let currentLevelIndex = HIERARCHY.findIndex(h => h.unit === primaryBlock.type);
        
        if (currentLevelIndex !== -1) {
            // Add the starting level
            drillDownPath.push(HIERARCHY[currentLevelIndex].unit);

            // Now traverse down the hierarchy strictly? 
            // 1 Year -> Semester -> Quarter -> Month -> Week -> Day
            // User example: "1 Year -> 6 Months -> 3 Months -> 1 Month -> 1 Week -> 1 Day"
            // If we start at Quarter, we should go Quarter -> Month -> Week -> Day.
            
            for (let i = currentLevelIndex + 1; i < HIERARCHY.length; i++) {
                // Skip 5 Years if we started at 10? 
                // The prompt example for drill down: "1 Year -> 6 Months..." implies full descent.
                // But typically you don't do Semester AND Quarter. 
                // However, the user explicitly asked for "Semester to Quarter split" in previous prompts.
                // "add semester-to-quarter split (2 quarters per semester) before months"
                // So the path IS: Year -> Semester -> Quarter -> Month -> Week -> Day.
                
                // Are there skips?
                // 10 Years -> 5 Years? Maybe.
                // 5 Years -> 1 Year? Yes.
                // 1 Year -> Semester? Yes.
                
                drillDownPath.push(HIERARCHY[i].unit);
            }
        }
    }

    return {
        structure,
        drillDownPath
    };
};
