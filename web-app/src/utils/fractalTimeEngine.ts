
export type TimeUnit = '10_YEARS' | '5_YEARS' | '1_YEAR' | 'SEMESTER' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY';

export interface TimeBlock {
    type: TimeUnit;
    duration: string;
    isFull: boolean;
    count: number; // How many of this unit
    startDate?: Date;
    endDate?: Date;
}

export interface FractalStructure {
    structure: TimeBlock[];
    drillDownPath: TimeUnit[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const addYears = (date: Date, years: number): Date => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
};

const addMonths = (date: Date, months: number): Date => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
};

const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

// Helper to calculate difference in full units
const diffInYears = (d1: Date, d2: Date) => {
    let years = d2.getFullYear() - d1.getFullYear();
    if (d2.getMonth() < d1.getMonth() || (d2.getMonth() === d1.getMonth() && d2.getDate() < d1.getDate())) {
        years--;
    }
    return years;
};

const diffInMonths = (d1: Date, d2: Date) => {
    let months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    if (d2.getDate() < d1.getDate()) {
        months--;
    }
    return months;
};

export const generateTimeBlocks = (startDate: Date, endDate: Date): FractalStructure => {
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure end is after current
    if (end <= current) {
        return { structure: [], drillDownPath: [] };
    }

    const structure: TimeBlock[] = [];
    
    // Greedy allocation
    
    // 1. Check for 10 Years
    const yearsTotal = diffInYears(current, end);
    let yearsLeft = yearsTotal;
    
    if (yearsLeft >= 10) {
        const count = Math.floor(yearsLeft / 10);
        structure.push({ type: '10_YEARS', duration: `${count * 10} Años`, isFull: true, count });
        current = addYears(current, count * 10);
        yearsLeft -= count * 10;
    }

    // 2. Check for 5 Years
    if (yearsLeft >= 5) {
         structure.push({ type: '5_YEARS', duration: '5 Años', isFull: true, count: 1 });
         current = addYears(current, 5);
         yearsLeft -= 5;
    }

    // 3. Check for 1 Year
    if (yearsLeft >= 1) {
        structure.push({ type: '1_YEAR', duration: `${yearsLeft} Año${yearsLeft > 1 ? 's' : ''}`, isFull: true, count: yearsLeft });
        current = addYears(current, yearsLeft);
    }

    // Now handle months
    const monthsTotal = diffInMonths(current, end);
    let monthsLeft = monthsTotal;

    // 4. Semester (6 months)
    if (monthsLeft >= 6) {
        const count = Math.floor(monthsLeft / 6);
        structure.push({ type: 'SEMESTER', duration: `${count} Semestre${count > 1 ? 's' : ''}`, isFull: true, count });
        current = addMonths(current, count * 6);
        monthsLeft -= count * 6;
    }

    // 5. Quarter (3 months)
    if (monthsLeft >= 3) {
        const count = Math.floor(monthsLeft / 3);
        structure.push({ type: 'QUARTER', duration: `${count} Trimestre${count > 1 ? 's' : ''}`, isFull: true, count });
        current = addMonths(current, count * 3);
        monthsLeft -= count * 3;
    }

    // 6. Month
    if (monthsLeft >= 1) {
        structure.push({ type: 'MONTH', duration: `${monthsLeft} Mes${monthsLeft > 1 ? 'es' : ''}`, isFull: true, count: monthsLeft });
        current = addMonths(current, monthsLeft);
    }

    // Now handle days/weeks
    const msDiff = end.getTime() - current.getTime();
    const daysTotal = Math.floor(msDiff / MS_PER_DAY);
    let daysLeft = daysTotal;

    // 7. Week
    if (daysLeft >= 7) {
        const count = Math.floor(daysLeft / 7);
        structure.push({ type: 'WEEK', duration: `${count} Semana${count > 1 ? 's' : ''}`, isFull: true, count });
        daysLeft -= count * 7;
    }

    // 8. Days
    if (daysLeft > 0) {
        structure.push({ type: 'DAY', duration: `${daysLeft} Día${daysLeft > 1 ? 's' : ''}`, isFull: true, count: daysLeft });
    }

    // Determine Drill Down Path
    // Path should only follow the *first* available unit of each level down to Day
    // Logic: If we have > 1 year, next step is likely Semester or Quarter of the *first* year.
    // However, the prompt says: "La ruta crítica para preguntar objetivos (Solo el primer bloque de cada nivel)"
    // And "Hierarchy: 10 Years > 5 Years > 1 Year > Semester (6m) > Quarter (3m) > Month > Week > Day."
    
    // We construct the path based on the largest unit found.
    const path: TimeUnit[] = [];
    
    // If we have a big block, we drill down inside IT.
    // Example: 4 months, 10 days. 
    // Structure: 1 Quarter (3m), 1 Month (1m), 1 Week (7d), 3 Days.
    // Path: Quarter -> Month -> Week -> Day.
    
    // If we start with 10 Years, path: 10Y -> 1Y -> Semester -> Quarter -> Month -> Week -> Day?
    // Prompt example: "Ok, para lograr eso, definamos el objetivo del primer [TRIMESTRE]." -> "Dentro de ese trimestre, ¿qué harás el primer [MES]?"
    
    // Let's define the standard hierarchy chain
    const fullHierarchy: TimeUnit[] = ['10_YEARS', '5_YEARS', '1_YEAR', 'SEMESTER', 'QUARTER', 'MONTH', 'WEEK', 'DAY'];
    
    // Find the largest unit present in structure
    const largestUnit = structure.length > 0 ? structure[0].type : null;
    
    if (largestUnit) {
        let startIndex = fullHierarchy.indexOf(largestUnit);
        // We add the largest unit itself to the path?
        // Prompt says: "Pregunta 2 (Automática): El sistema mira el drillDownPath. 'Ok, para lograr eso, definamos el objetivo del primer [TRIMESTRE].'"
        // This implies the path starts with the largest unit found.
        
        // But we should skip some if they are too close?
        // 1 Year -> Quarter? (Skip Semester?)
        // Let's follow the strict hierarchy for now, but maybe skip 5 Years if we have 10?
        
        // Actually, let's just push the next logical step.
        // If we have 1 Year, next is Quarter (usually people skip Semester planning if they do Quarters).
        // If we have Quarter, next is Month.
        // If we have Month, next is Week.
        // If we have Week, next is Day.
        
        // Let's build a chain based on the prompt's implied logic.
        // 10 Years -> 1 Year
        // 5 Years -> 1 Year
        // 1 Year -> Quarter (Skip Semester usually, or allow both?)
        // Quarter -> Month
        // Month -> Week
        // Week -> Day
        
        // Let's dynamically build it.
        let currentUnit = largestUnit;
        path.push(currentUnit);
        
        while (currentUnit !== 'DAY') {
             if (currentUnit === '10_YEARS' || currentUnit === '5_YEARS') {
                 currentUnit = '1_YEAR';
             } else if (currentUnit === '1_YEAR') {
                 currentUnit = 'QUARTER'; // Skip semester usually
             } else if (currentUnit === 'SEMESTER') {
                 currentUnit = 'QUARTER';
             } else if (currentUnit === 'QUARTER') {
                 currentUnit = 'MONTH';
             } else if (currentUnit === 'MONTH') {
                 currentUnit = 'WEEK';
             } else if (currentUnit === 'WEEK') {
                 currentUnit = 'DAY';
             } else {
                 break;
             }
             path.push(currentUnit);
        }
    }

    return {
        structure,
        drillDownPath: path
    };
};
