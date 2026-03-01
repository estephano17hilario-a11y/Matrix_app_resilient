import { Project } from '../types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getStartOfWeek } from './dateUtils';

/**
 * Calculates the dynamic daily target for a project with a WEEKLY goal.
 * It distributes the remaining weekly goal across the remaining working days of the week.
 * 
 * @param project The project to calculate the target for.
 * @returns The daily target in minutes for TODAY.
 */
const getSafeWorkingDaysCount = (project: Project): number => {
    const count = project.workingDays?.length;
    return count && count > 0 ? count : 7;
};

const getSafeMinutes = (value: number | undefined | null): number => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.round(value as number));
};

export const getWeeklyGoalMinutes = (project: Project): number => {
    const effectiveFrequency = project.uiFrequency || project.goalFrequency;
    if (effectiveFrequency !== 'WEEKLY') return getSafeMinutes(project.goalTarget);
    const workingDaysCount = getSafeWorkingDaysCount(project);
    if (Number.isFinite(project.uiTarget) && (project.uiTarget || 0) > 0) {
        return getSafeMinutes((project.uiTarget as number) * 60);
    }
    if (project.goalFrequency === 'WEEKLY') return getSafeMinutes(project.goalTarget);
    return getSafeMinutes((project.goalTarget || 0) * workingDaysCount);
};

export const getMonthlyGoalMinutes = (project: Project): number => {
    const effectiveFrequency = project.uiFrequency || project.goalFrequency;
    if (effectiveFrequency !== 'MONTHLY') return getSafeMinutes(project.goalTarget);
    
    if (Number.isFinite(project.uiTarget) && (project.uiTarget || 0) > 0) {
        return getSafeMinutes((project.uiTarget as number) * 60);
    }
    
    if (project.monthlyType === 'FLEXIBLE_COUNT' && project.monthlyFlexibleCount) {
         // goalTarget is stored as the "Session Target" (Daily Goal equivalent)
         // So Monthly Total = Session Target * Flexible Count
         return getSafeMinutes((project.goalTarget || 0) * project.monthlyFlexibleCount);
    }

    const workingDaysCount = getSafeWorkingDaysCount(project);
    if (project.goalFrequency === 'MONTHLY') return getSafeMinutes(project.goalTarget);
    
    // For SPECIFIC_DATES or Default, we assume goalTarget is the daily session target
    // But wait, if specific dates are 1, 15... count is 2.
    // Logic below used workingDaysCount * 4 which assumes weekly-like structure?
    // If specific dates are used, workingDaysCount is the number of selected days in the generic calendar (up to 31?).
    // Actually, for SPECIFIC_DATES, workingDays contains 1..31.
    // The number of working days in a month is roughly workingDays.length.
    // It's not *4.
    if (project.monthlyType === 'SPECIFIC_DATES') {
        return getSafeMinutes((project.goalTarget || 0) * workingDaysCount);
    }

    // Fallback for legacy or other types
    return getSafeMinutes((project.goalTarget || 0) * (workingDaysCount * 4));
};

export const getDynamicDailyTarget = (project: Project): number => {
    const effectiveFrequency = project.uiFrequency || project.goalFrequency;
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let totalGoalMinutes = 0;

    if (effectiveFrequency === 'WEEKLY') {
        totalGoalMinutes = getWeeklyGoalMinutes(project);
        periodStart = getStartOfWeek(now);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
    } else if (effectiveFrequency === 'MONTHLY') {
        totalGoalMinutes = getMonthlyGoalMinutes(project);
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
    } else {
        return project.goalTarget || 0;
    }

    if (!totalGoalMinutes) {
        return 0;
    }

    const todayStr = now.toDateString();

    const periodSessions = (project.sessions || []).filter(s => {
        const sDate = new Date(s.date);
        if (Number.isNaN(sDate.getTime())) return false;
        return sDate >= periodStart && sDate <= periodEnd;
    });

    const pastPeriodSessions = periodSessions.filter(s => new Date(s.date).toDateString() !== todayStr);
    
    const pastPeriodProgressSeconds = pastPeriodSessions.reduce((acc, s) => {
        const duration = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
        return acc + duration;
    }, 0);

    const pastPeriodProgressMinutes = Math.floor(pastPeriodProgressSeconds / 60);
    const remainingGoalAtStartOfDay = Math.max(0, totalGoalMinutes - pastPeriodProgressMinutes);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let remainingDaysCount = 0;
    
    // Monthly Logic with SPECIFIC_DATES or FLEXIBLE_COUNT
    if (effectiveFrequency === 'MONTHLY') {
        if (project.monthlyType === 'FLEXIBLE_COUNT') {
            // Flexible Count Logic
            // 1. Calculate physical days left in month (including today)
            let physicalDaysRemaining = 0;
            const tempDate = new Date(today);
            while (tempDate <= periodEnd) {
                physicalDaysRemaining++;
                tempDate.setDate(tempDate.getDate() + 1);
            }

            // 2. Calculate sessions remaining needed
            const workedDays = new Set(pastPeriodSessions.map(s => new Date(s.date).toDateString())).size;
            const quota = project.monthlyFlexibleCount || 1;
            const sessionsRemaining = Math.max(0, quota - workedDays);

            // 3. Determine divisor
            // If sessionsRemaining > 0, we try to distribute over sessionsRemaining, constrained by physical time.
            // If sessionsRemaining == 0, but goal is not met, we force 1 day (Today) to encourage completion.
            if (sessionsRemaining > 0) {
                remainingDaysCount = Math.min(physicalDaysRemaining, sessionsRemaining);
            } else {
                remainingDaysCount = remainingGoalAtStartOfDay > 0 ? 1 : 0;
            }

        } else {
            // Specific Dates or Default
            const tempDate = new Date(today);
            while (tempDate <= periodEnd) {
                let isWorkingDay = false;
                const dayOfMonth = tempDate.getDate();
                const lastDayOfMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();

                if (project.monthlyType === 'SPECIFIC_DATES') {
                    const selectedDays = project.workingDays || [];
                    
                    if (selectedDays.includes(dayOfMonth)) {
                        isWorkingDay = true;
                    } 
                    
                    // "Last Day of Month" Logic
                    if (project.monthlyLastDay && dayOfMonth === lastDayOfMonth) {
                        isWorkingDay = true;
                    }
                } else {
                    // Legacy Monthly (Assume all days valid or fallback)
                    isWorkingDay = true; 
                }

                if (isWorkingDay) {
                    remainingDaysCount++;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }
        }
    } else {
        // Weekly Logic
    const workingDays = project.workingDays && project.workingDays.length > 0 ? project.workingDays : undefined;
    let strictRemainingDays = 0;
    let physicalRemainingDays = 0;
    
    // First pass: Count strictly working days AND physical days
    const tempPhysicalDate = new Date(today);
    while (tempPhysicalDate <= periodEnd) {
        physicalRemainingDays++;
        
        const dayOfWeek = tempPhysicalDate.getDay(); // 0-6
        const isWorkingDay = !workingDays || workingDays.includes(dayOfWeek);
        if (isWorkingDay) {
            strictRemainingDays++;
        }
        
        tempPhysicalDate.setDate(tempPhysicalDate.getDate() + 1);
    }

    remainingDaysCount = strictRemainingDays;

    // INTELLIGENT LOGIC (SMART DISTRIBUTION):
    // If we are falling behind schedule, we should utilize non-working days (like weekends) to catch up,
    // rather than piling up an impossible amount of work on the remaining "strict" working days.
    
    // Calculate the "Ideal Daily Load" based on total goal and total planned working days.
    const totalPlannedDays = workingDays ? workingDays.length : 7;
    const idealDailyLoad = totalGoalMinutes / Math.max(1, totalPlannedDays);
    
    // Calculate the "Current Required Load" if we stick to the strict schedule.
    const strictDailyLoad = strictRemainingDays > 0 ? (remainingGoalAtStartOfDay / strictRemainingDays) : Infinity;

    // RECOVERY MODE TRIGGER:
    // 1. No strict days left but goal remains (Panic Mode).
    // 2. Overload: Current load is > 10% higher than ideal (Early Warning).
    // 3. Weekend Rescue: If today is a weekend and we have debt, activate it to help.
    const isOverloaded = strictDailyLoad > (idealDailyLoad * 1.10);
    const hasExtraDays = physicalRemainingDays > strictRemainingDays;
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    const hasDebt = remainingGoalAtStartOfDay > 0;

    if ((strictRemainingDays === 0 && hasDebt) || (isOverloaded && hasExtraDays) || (isWeekend && hasDebt && hasExtraDays)) {
        remainingDaysCount = physicalRemainingDays;
    }
    }

    if (remainingDaysCount === 0) {
        // Last resort: If still 0 but we have debt, force 1 day (Today)
        return (remainingGoalAtStartOfDay > 0) ? remainingGoalAtStartOfDay : 0;
    }

    // Use Math.ceil to ensure we don't under-calculate by rounding down seconds
    // Also ensure we don't return a negative number
    const dailyTarget = Math.ceil(remainingGoalAtStartOfDay / remainingDaysCount);

    return Math.max(0, dailyTarget);
};

/**
 * Helper to get today's progress in minutes
 */
export const getTodayProgress = (project: Project): number => {
    const todayStr = new Date().toDateString();
    const todaySeconds = (project.sessions || [])
        .filter(s => new Date(s.date).toDateString() === todayStr)
        .reduce((acc, s) => {
            const duration = Number.isFinite(s.duration) ? Math.max(0, s.duration) : 0;
            return acc + duration;
        }, 0);
    return Math.max(0, Math.floor(todaySeconds / 60));
};
