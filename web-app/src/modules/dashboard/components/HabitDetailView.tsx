import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Share2, MoreVertical, Edit2, Archive, Trash2, Plus, Check } from 'lucide-react';
import { Habit, Project } from '../../../types';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, startOfYear, endOfYear, eachWeekOfInterval, eachMonthOfInterval, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears, isWithinInterval, differenceInDays, differenceInWeeks, startOfDay, endOfDay, eachHourOfInterval, isSameHour, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';
import { getDynamicDailyTarget, getWeeklyGoalMinutes, getMonthlyGoalMinutes } from '../../../utils/projectUtils';
import { DateSelectionModal, DateSelectionMode } from './DateSelectionModal';
import { HabitGoalChart } from './HabitGoalChart';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';

interface HabitDetailViewProps {
    habit?: Habit | null;
    project?: Project | null;
    attributeColor?: string;
    onClose: () => void;
    onEdit?: (item: Habit | Project) => void;
    onDelete?: (itemId: string) => void;
    onArchive?: (item: Habit | Project) => void;
    onStartFocus?: () => void;
}

type TimeRange = 'TODAY' | 'WEEK' | '8_WEEKS' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';

const ALL_RANGES: { value: TimeRange; label: string }[] = [
    { value: 'TODAY', label: 'Hoy' },
    { value: 'WEEK', label: 'Semana' },
    { value: '8_WEEKS', label: '8 Semanas' },
    { value: 'MONTH', label: 'Mes' },
    { value: '3_MONTHS', label: '3 Meses' },
    { value: 'YEAR', label: 'Año' },
    { value: 'TOTAL', label: 'Total' }
];

// --- HELPERS ---
const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const formatValue = (value: number, type: Habit['type'] | undefined, unit: string = '', isDuration: boolean = false) => {
    if (isDuration) return formatDuration(value);
    if (type === 'BOOLEAN' || type === 'SIMPLE') return `${value}`;
    return `${value} ${unit}`;
};

const FormattedValue = ({ value, type, unit, isDuration, className }: { value: number, type: Habit['type'] | undefined, unit: string, isDuration: boolean, className?: string }) => {
    if (isDuration) {
        const h = Math.floor(value / 60);
        const m = Math.round(value % 60);
        
        if (h === 0) {
             return (
                <div className={cn("flex items-baseline whitespace-nowrap", className)}>
                    <span>{m}</span>
                    <span className="text-[0.6em] font-medium text-white/50 ml-0.5">m</span>
                </div>
            );
        }

        return (
            <div className={cn("flex items-baseline whitespace-nowrap", className)}>
                <span>{h}</span>
                <span className="text-[0.6em] font-medium text-white/50 ml-0.5 mr-1.5">h</span>
                <span className="text-[0.8em] text-white/80">{m.toString().padStart(2, '0')}</span>
                <span className="text-[0.5em] font-medium text-white/50 ml-0.5">m</span>
            </div>
        );
    }
    
    if (type === 'BOOLEAN' || type === 'SIMPLE') return <span className={className}>{value}</span>;
    
    return (
        <div className={cn("flex items-baseline whitespace-nowrap", className)}>
             <span>{value}</span>
             {unit && <span className="text-[0.5em] font-medium text-white/50 ml-1">{unit}</span>}
        </div>
    );
};

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { 
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 }
    }
};

const barVariants: Variants = {
    hidden: { scaleY: 0 },
    visible: { 
        scaleY: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 }
    }
};

export const HabitDetailView: React.FC<HabitDetailViewProps> = ({ habit, project, attributeColor, onClose, onEdit, onDelete, onArchive }) => {
    const themeColor = useMemo(() => habit?.customColor || attributeColor || '#0ea5e9', [habit?.customColor, attributeColor]);

    const [timeRange, setTimeRange] = useState<TimeRange>('WEEK');
    const [pinnedRanges, setPinnedRanges] = useState<TimeRange[]>(['TODAY', 'WEEK', 'MONTH']);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 20);
    };

    const handleTabClick = (tabValue: TimeRange) => {
        // If clicking on a tab that is not in pinned ranges (from config menu),
        // we might want to swap it into the pinned list or just set it active.
        // User requested: "3 pinned + 1 config".
        // Let's assume selecting from config just sets it active.
        // But visually, the user wants 3 slots + "+".
        // So if I select "YEAR", it should probably replace the last slot or be visible?
        // Let's implement logic: if not pinned, replace the 3rd slot.
        if (!pinnedRanges.includes(tabValue)) {
             setPinnedRanges(prev => {
                 const newPinned = [...prev];
                 newPinned[2] = tabValue; // Replace 3rd slot
                 return newPinned;
             });
        }

        if (timeRange === tabValue) {
            // For ranges that support date selection, open modal
            if (['WEEK', 'MONTH', 'YEAR'].includes(tabValue)) {
                setIsDateModalOpen(true);
            }
        } else {
            setTimeRange(tabValue);
            // Reset date to today when switching ranges, unless it's total
            if (tabValue !== 'TOTAL') {
                setCurrentDate(new Date());
            }
        }
        setIsConfigOpen(false);
    };

    const [isLoading, setIsLoading] = useState(true);
    const activeItem = habit || project || null;

    // Simulate loading for skeleton effect
    useEffect(() => {
        if (activeItem) {
            setIsLoading(true);
            const timer = setTimeout(() => setIsLoading(false), 400);
            return () => clearTimeout(timer);
        }
    }, [activeItem]);

    // Prevent scroll when modal is open
    useEffect(() => {
        if (activeItem) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activeItem]);

    const isQuantity = habit?.type === 'QUANTITY';
    const isTimeBased = habit ? (habit.estimatedTime || 0) > 0 : true;
    const unitLabel = isTimeBased ? 'h' : (habit?.unit || '');

    // --- DATA CALCULATION ENGINE ---
    const { chartData, totalValue, averageValue, bestDayValue, totalSessions, dateRangeLabel, summaryValue, goalValue, maxChartValue, streakDays } = useMemo(() => {
        if (!habit && !project) {
            return {
                chartData: [],
                totalValue: 0,
                averageValue: 0,
                bestDayValue: 0,
                totalSessions: 0,
                dateRangeLabel: '',
                summaryValue: 0,
                goalValue: 0,
                maxChartValue: 10,
                streakDays: 0
            };
        }

        const isTimeBasedItem = habit ? (habit.estimatedTime || 0) > 0 : true;
        const baseValue = habit 
            ? (isTimeBasedItem ? habit.estimatedTime! : (isQuantity ? (habit.targetValue || 1) : 1))
            : 0; // For project, baseValue isn't fixed per completion, it's duration based
        
        // Prepare session/history data
        let sessionEntries: any[] = [];
        if (project && project.sessions) {
            sessionEntries = project.sessions
                .map(s => ({ ...s, dateObj: new Date(s.date) }))
                .filter(s => !isNaN(s.dateObj.getTime()));
        }

        const goalTargetMinutes = project?.goalTarget || 0;
        const workingDaysCount = Math.max(1, project?.workingDays?.length || 7);
        const effectiveFrequency = project?.uiFrequency || project?.goalFrequency;
        const weeklyGoalMinutes = project ? getWeeklyGoalMinutes(project) : 0;
        const monthlyGoalMinutes = project ? getMonthlyGoalMinutes(project) : 0;
        const dailyGoalMinutes = effectiveFrequency === 'WEEKLY'
            ? (weeklyGoalMinutes / workingDaysCount)
            : effectiveFrequency === 'MONTHLY'
                ? (monthlyGoalMinutes / (workingDaysCount * 4))
                : goalTargetMinutes;

        let start: Date, end: Date;
        let dataPoints: any[] = [];
        let calculatedGoalValue = 0;

        // 1. DETERMINE RANGE & DATA POINTS
        if (timeRange === 'TODAY') {
            start = startOfDay(currentDate);
            end = endOfDay(currentDate);
            calculatedGoalValue = habit ? baseValue : (effectiveFrequency === 'WEEKLY' || effectiveFrequency === 'MONTHLY') && project ? getDynamicDailyTarget(project) : dailyGoalMinutes;

            if (project) {
                // Hourly breakdown for Project
                const hours = eachHourOfInterval({ start, end });
                dataPoints = hours.map(hour => {
                    const value = sessionEntries.reduce((acc, s) => {
                        return isSameHour(s.dateObj, hour) ? acc + (s.duration / 60) : acc;
                    }, 0);
                    return {
                        label: format(hour, 'HH:mm'),
                        fullDate: format(hour, 'yyyy-MM-dd HH:mm'),
                        value,
                        isToday: true,
                        date: hour
                    };
                });
            } else if (habit) {
                // For Habit, Today View is just a single bar or maybe "Morning/Afternoon/Evening" buckets?
                // Let's stick to simple "Today" single bar for now or just show 1 point.
                // Or maybe show the last 7 days but highlight today?
                // The user wants "Today" specific stats. 
                // Let's show a single bar for "Today"
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                const value = completions * baseValue;
                dataPoints = [{
                    label: 'Hoy',
                    fullDate: dateStr,
                    value,
                    isToday: true,
                    date: currentDate
                }];
            }

        } else if (timeRange === 'WEEK') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });
            
            calculatedGoalValue = habit ? (baseValue * 7) : (dailyGoalMinutes * 7);
            if (effectiveFrequency === 'WEEKLY') calculatedGoalValue = weeklyGoalMinutes;

            dataPoints = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                let value = 0;
                if (project) {
                    value = sessionEntries.reduce((acc, s) => isSameDay(s.dateObj, day) ? acc + (s.duration / 60) : acc, 0);
                } else if (habit) {
                    const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                    value = completions * baseValue;
                }

                return {
                    label: format(day, 'EEE', { locale: es }).toUpperCase().slice(0, 1),
                    fullDate: dateStr,
                    value,
                    isToday: isSameDay(day, new Date()),
                    date: day
                };
            });

        } else if (timeRange === '8_WEEKS') {
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            start = subWeeks(end, 7);
            start = startOfWeek(start, { weekStartsOn: 1 });
            const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
            
            calculatedGoalValue = (habit ? (baseValue * 7) : (dailyGoalMinutes * 7)) * 8; // Approx

            dataPoints = weeks.map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                let weeklyValue = 0;
                
                if (project) {
                    weeklyValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: weekStart, end: weekEnd }) ? acc + (s.duration / 60) : acc, 0);
                } else if (habit) {
                    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
                    daysInWeek.forEach(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                        weeklyValue += completions * baseValue;
                    });
                }

                return {
                    label: format(weekStart, 'd/M'),
                    value: weeklyValue,
                    isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
                    date: weekStart
                };
            });

        } else if (timeRange === 'MONTH') {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
            const days = eachDayOfInterval({ start, end });
            
            calculatedGoalValue = habit ? (baseValue * 30) : (dailyGoalMinutes * 30);
            if (effectiveFrequency === 'MONTHLY') calculatedGoalValue = monthlyGoalMinutes;

            dataPoints = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                let value = 0;
                if (project) {
                    value = sessionEntries.reduce((acc, s) => isSameDay(s.dateObj, day) ? acc + (s.duration / 60) : acc, 0);
                } else if (habit) {
                    const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                    value = completions * baseValue;
                }

                const showLabel = [6, 14, 21, 28].includes(day.getDate());

                return {
                    label: showLabel ? format(day, 'd') : '',
                    fullDate: dateStr,
                    value,
                    isToday: isSameDay(day, new Date()),
                    date: day
                };
            });

        } else if (timeRange === '3_MONTHS') {
            end = endOfMonth(currentDate);
            start = subMonths(startOfMonth(end), 2); // Current + 2 prev = 3 months
            const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
            
            calculatedGoalValue = (habit ? (baseValue * 7) : (dailyGoalMinutes * 7)) * 13; // Approx 13 weeks

            dataPoints = weeks.map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                let weeklyValue = 0;
                
                if (project) {
                    weeklyValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: weekStart, end: weekEnd }) ? acc + (s.duration / 60) : acc, 0);
                } else if (habit) {
                    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
                    daysInWeek.forEach(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                        weeklyValue += completions * baseValue;
                    });
                }

                return {
                    label: format(weekStart, 'd/M'),
                    value: weeklyValue,
                    isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
                    date: weekStart
                };
            });

        } else if (timeRange === 'YEAR') {
            start = startOfYear(currentDate);
            end = endOfYear(currentDate);
            const months = eachMonthOfInterval({ start, end });
            
            calculatedGoalValue = (habit ? (baseValue * 30) : (dailyGoalMinutes * 30)) * 12;

            dataPoints = months.map(monthStart => {
                const monthEnd = endOfMonth(monthStart);
                let monthlyValue = 0;
                
                if (project) {
                    monthlyValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: monthStart, end: monthEnd }) ? acc + (s.duration / 60) : acc, 0);
                } else if (habit) {
                    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    daysInMonth.forEach(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                        monthlyValue += completions * baseValue;
                    });
                }

                return {
                    label: format(monthStart, 'MMM', { locale: es }).toUpperCase().slice(0, 3),
                    value: monthlyValue,
                    isToday: isWithinInterval(new Date(), { start: monthStart, end: monthEnd }),
                    date: monthStart
                };
            });

        } else {
            // TOTAL
            // Determine start date from history
            let minDate = new Date();
            if (project && sessionEntries.length > 0) {
                minDate = sessionEntries.reduce((min, s) => s.dateObj < min ? s.dateObj : min, sessionEntries[0].dateObj);
            } else if (habit && habit.history && habit.history.length > 0) {
                const dates = habit.history.map(d => new Date(d));
                minDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
            }
            start = startOfWeek(minDate, { weekStartsOn: 1 }); // Align to week start
            end = new Date(); // Now

            const daysDiff = differenceInDays(end, start);
            
            if (daysDiff > 365) {
                // Group by Month if > 1 year
                const months = eachMonthOfInterval({ start, end });
                dataPoints = months.map(monthStart => {
                    const monthEnd = endOfMonth(monthStart);
                    let monthlyValue = 0;
                    if (project) {
                        monthlyValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: monthStart, end: monthEnd }) ? acc + (s.duration / 60) : acc, 0);
                    } else if (habit) {
                         // Simplify for perf: filter history by YYYY-MM
                         const prefix = format(monthStart, 'yyyy-MM');
                         const completions = habit.history?.filter((h: string) => h.startsWith(prefix)).length || 0;
                         monthlyValue = completions * baseValue;
                    }
                    return {
                        label: format(monthStart, 'MMM', { locale: es }),
                        value: monthlyValue,
                        isToday: isWithinInterval(new Date(), { start: monthStart, end: monthEnd }),
                        date: monthStart
                    };
                });
            } else {
                // Group by Week
                const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
                dataPoints = weeks.map(weekStart => {
                    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                    let weeklyValue = 0;
                    if (project) {
                        weeklyValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: weekStart, end: weekEnd }) ? acc + (s.duration / 60) : acc, 0);
                    } else if (habit) {
                        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
                        daysInWeek.forEach(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                            weeklyValue += completions * baseValue;
                        });
                    }
                    return {
                        label: format(weekStart, 'd/M'),
                        value: weeklyValue,
                        isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
                        date: weekStart
                    };
                });
            }

            // Calculate total goal based on duration
            if (project) {
                 const totalDurationWeeks = differenceInWeeks(end, start) || 1;
                 calculatedGoalValue = totalDurationWeeks * (effectiveFrequency === 'WEEKLY' ? weeklyGoalMinutes : dailyGoalMinutes * 7);
                 if (project.totalTime) {
                     // If we have totalTime project goal, use that? 
                     // Usually project goal is recurring. If it's a fixed goal project, we might handle differently.
                 }
            } else if (habit) {
                 const totalDurationDays = differenceInDays(end, start) || 1;
                 calculatedGoalValue = totalDurationDays * baseValue;
            }
        }

        // 2. AGGREGATE VALUES
        const total = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
        const sessionCountInRange = project
            ? sessionEntries.filter(s => isWithinInterval(s.dateObj, { start, end })).length
            : 0;
        const avg = project
            ? (sessionCountInRange > 0 ? total / sessionCountInRange : 0)
            : (total / (dataPoints.length || 1));
        const best = Math.max(...dataPoints.map(d => d.value), 0);
        const sessionsCount = project ? sessionCountInRange : dataPoints.filter(d => d.value > 0).length;
        const maxVal = Math.max(best, 1);

        let rangeLabel = '';
        if (timeRange === 'TODAY') {
            rangeLabel = format(currentDate, 'd MMMM yyyy', { locale: es });
        } else if (timeRange === 'MONTH') {
            rangeLabel = format(start, 'MMMM yyyy', { locale: es });
            rangeLabel = rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1);
        } else if (timeRange === '3_MONTHS') {
            rangeLabel = `${format(start, 'MMM')} - ${format(end, 'MMM yyyy', { locale: es })}`;
            rangeLabel = rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1);
        } else if (timeRange === 'YEAR') {
            rangeLabel = format(start, 'yyyy');
        } else if (timeRange === 'TOTAL') {
             rangeLabel = 'Histórico Completo';
        } else {
            rangeLabel = `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
        }

        // Streak Calc (simplified)
        let streak = 0;
        if (habit) streak = habit.streak;
        else if (project) {
            // Project streak logic
            const uniqueDays = Array.from(new Set(sessionEntries.map(s => format(s.dateObj, 'yyyy-MM-dd'))));
            const sortedDays = uniqueDays.sort((a, b) => b.localeCompare(a));
            let cursor = new Date();
            while (sortedDays.includes(format(cursor, 'yyyy-MM-dd'))) {
                streak += 1;
                cursor = subDays(cursor, 1);
            }
        }

        return {
            chartData: dataPoints,
            totalValue: total,
            averageValue: avg,
            bestDayValue: best,
            totalSessions: sessionsCount,
            dateRangeLabel: rangeLabel,
            summaryValue: total, // Summary is now the total of the selected range
            goalValue: calculatedGoalValue,
            maxChartValue: maxVal,
            streakDays: streak
        };

    }, [habit, project, timeRange, currentDate, isQuantity]);

    const summaryRatio = goalValue > 0 ? summaryValue / goalValue : 0;
    const summaryBarValue = Math.min(Math.max(summaryRatio, 0), 1);
    const summaryPercentage = Math.round(Math.max(summaryRatio, 0) * 100);

    // --- UI COMPONENTS ---
    const StatCard = ({ label, value }: { label: string; value: string | number }) => (
        <motion.div 
            variants={itemVariants}
            className="bg-zinc-900/90 rounded-[24px] p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-zinc-800 transition-colors border border-white/10 shadow-sm"
        >
            <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col items-center w-full gap-2">
                    <span className="text-zinc-400 text-xs font-medium">{label}</span>
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-1 relative z-10 mt-auto">
                {isLoading ? (
                    <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
                ) : (
                    <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                )}
            </div>
        </motion.div>
    );

    if (!activeItem) return null;

    return createPortal(
        <AnimatePresence mode="wait">
            <motion.div
                key={`detail-${activeItem.id}`}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[9999] bg-[#000000] text-white flex flex-col overflow-hidden"
            >
                {/* Background Atmosphere - Optimized (No Blur Filter needed, use Gradients) */}
                <div 
                    className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full pointer-events-none opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.8) 0%, transparent 70%)' }} 
                />
                <div 
                    className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full pointer-events-none opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)' }} 
                />
                <div 
                    className="absolute top-[40%] left-[30%] w-[60%] h-[60%] rounded-full pointer-events-none opacity-10"
                    style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.8) 0%, transparent 70%)' }} 
                />

                {/* Header */}
                <div className="relative z-[10000] flex items-center justify-between px-6 pt-12 pb-4">
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-1 text-blue-400 font-medium active:opacity-70 transition-opacity"
                    >
                        <ChevronLeft size={24} />
                        <span className="text-[17px]">Atrás</span>
                    </button>
                    
                    <h2 className="text-[17px] font-bold text-white tracking-tight absolute left-1/2 -translate-x-1/2">
                        {habit?.title || project?.title}
                    </h2>

                    <div className="relative flex items-center gap-1 z-[10000]">


                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className="text-blue-400 active:opacity-70 transition-opacity p-3 -mr-2 hover:bg-white/5 rounded-full"
                        >
                            <MoreVertical size={24} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[10000]"
                                >
                                    {onEdit && (
                                        <button 
                                            onClick={() => {
                                                onEdit(habit || project!);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                        >
                                            <Edit2 size={16} className="text-blue-400" />
                                            Editar
                                        </button>
                                    )}
                                    
                                    {onArchive && (
                                        <button 
                                            onClick={() => {
                                                onArchive(habit || project!);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-3 transition-colors"
                                        >
                                            <Archive size={16} className="text-amber-400" />
                                            {habit?.archived || project?.archived ? 'Desarchivar' : 'Archivar'}
                                        </button>
                                    )}

                                    {onDelete && (
                                        <button 
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setShowDeleteConfirmation(true);
                                            }}
                                            className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors border-t border-white/5"
                                        >
                                            <Trash2 size={16} />
                                            Eliminar
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Fixed Controls */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative z-20"
                >
                    {/* Unified Control Deck - Optimized for Mobile Performance */}
                    <motion.div 
                        className="flex flex-col items-center mx-auto transition-all duration-300 origin-top bg-zinc-900/95 border border-white/10 shadow-lg relative z-50"
                        animate={{
                            borderRadius: isScrolled ? 24 : 32,
                            padding: isScrolled ? "12px 20px" : "12px 24px",
                            gap: isScrolled ? 2 : 12,
                            scale: isScrolled ? 1 : 1,
                            y: isScrolled ? 0 : 0
                        }}
                        style={{ width: 'fit-content', minWidth: '340px' }}
                    >
                        {/* Row 1: Time Range Tabs */}
                        <div className="flex items-center gap-1 relative z-10">
                            <AnimatePresence mode="popLayout">
                                {pinnedRanges.map((range) => {
                                    const isActive = timeRange === range;
                                    const label = ALL_RANGES.find(r => r.value === range)?.label || range;
                                    
                                    return (
                                        <motion.button
                                            key={range}
                                            layoutId={`tab-${range}`}
                                            onClick={() => handleTabClick(range)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-[11px] font-bold transition-all relative overflow-hidden whitespace-nowrap",
                                                isActive 
                                                    ? "bg-white text-black shadow-lg z-10" 
                                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            <span className="relative z-10">{label}</span>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-white"
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </AnimatePresence>

                            {/* Divider */}
                            <div className="w-[1px] h-3 bg-white/10 mx-1" />

                            {/* Config Button (+) */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                                    className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                        isConfigOpen 
                                            ? "bg-white/20 text-white rotate-45" 
                                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    <Plus size={14} />
                                </button>

                                {/* Dropdown Menu (VisionOS Style) */}
                                <AnimatePresence>
                                    {isConfigOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                            className="absolute right-0 top-full mt-2 w-32 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] p-1"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                {ALL_RANGES.map((option) => {
                                                    const isPinned = pinnedRanges.includes(option.value);
                                                    const isSelected = timeRange === option.value;
                                                    
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => handleTabClick(option.value)}
                                                            className={cn(
                                                                "w-full px-2 py-1.5 rounded-lg text-left text-[10px] font-bold flex items-center justify-between group transition-all",
                                                                isSelected 
                                                                    ? "bg-white text-black shadow-md" 
                                                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                                                            )}
                                                        >
                                                            <span>{option.label}</span>
                                                            {isSelected && <Check size={12} className="text-black" />}
                                                            {isPinned && !isSelected && (
                                                                <div className="w-1 h-1 rounded-full bg-zinc-600" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Row 2: Date Navigation */}
                        <motion.div 
                            className="flex items-center justify-between w-full"
                            animate={{
                                gap: isScrolled ? 0 : 16,
                                scale: isScrolled ? 1 : 1,
                                height: 'auto',
                                opacity: 1,
                                marginTop: 0
                            }}
                        >
                            <button 
                                onClick={() => {
                                    if (timeRange === 'TODAY') setCurrentDate(d => subDays(d, 1));
                                    if (timeRange === 'WEEK') setCurrentDate(d => subWeeks(d, 1));
                                    if (timeRange === '8_WEEKS') setCurrentDate(d => subWeeks(d, 8));
                                    if (timeRange === 'MONTH') setCurrentDate(d => subMonths(d, 1));
                                    if (timeRange === '3_MONTHS') setCurrentDate(d => subMonths(d, 3));
                                    if (timeRange === 'YEAR') setCurrentDate(d => subYears(d, 1));
                                }}
                                disabled={timeRange === 'TOTAL'}
                                className={cn(
                                    "rounded-full flex items-center justify-center transition-all active:scale-90",
                                    timeRange === 'TOTAL' ? "opacity-0 pointer-events-none" : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5",
                                    isScrolled ? "w-8 h-8" : "w-8 h-8"
                                )}
                            >
                                <ChevronLeft size={isScrolled ? 16 : 16} />
                            </button>
                            
                            <motion.span 
                                key={dateRangeLabel}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "text-xs font-bold text-zinc-300 tracking-wider uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/5 shadow-sm transition-all",
                                    isScrolled && "bg-transparent border-transparent shadow-none px-2 py-0 text-white/50 text-[11px] font-medium"
                                )}
                            >
                                {dateRangeLabel}
                            </motion.span>

                            <button 
                                onClick={() => {
                                    if (timeRange === 'TODAY') setCurrentDate(d => addDays(d, 1));
                                    if (timeRange === 'WEEK') setCurrentDate(d => addWeeks(d, 1));
                                    if (timeRange === '8_WEEKS') setCurrentDate(d => addWeeks(d, 8));
                                    if (timeRange === 'MONTH') setCurrentDate(d => addMonths(d, 1));
                                    if (timeRange === '3_MONTHS') setCurrentDate(d => addMonths(d, 3));
                                    if (timeRange === 'YEAR') setCurrentDate(d => addYears(d, 1));
                                }}
                                disabled={timeRange === 'TOTAL'}
                                className={cn(
                                    "rounded-full flex items-center justify-center transition-all active:scale-90",
                                    timeRange === 'TOTAL' ? "opacity-0 pointer-events-none" : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5",
                                    isScrolled ? "w-8 h-8" : "w-8 h-8"
                                )}
                            >
                                <ChevronRight size={isScrolled ? 16 : 16} />
                            </button>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Main Content */}
                <div 
                    onScroll={handleScroll}
                    className={cn(
                        "flex-1 overflow-y-auto overflow-x-hidden px-5 pt-0 pb-20 space-y-4 scrollbar-hide overscroll-contain",
                        isDateModalOpen && "overflow-hidden"
                    )}
                >
                    
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4 max-w-md mx-auto"
                    >


                        {/* 1. MAIN STATS CARD */}
                        <motion.div 
                            variants={itemVariants} 
                            className="bg-zinc-900/90 rounded-[32px] p-6 border border-white/10 shadow-md mb-4 relative overflow-hidden"
                        >
                            {/* Glow Effect */}
                            <div
                              className="absolute top-0 right-0 w-32 h-32 rounded-full -z-10 pointer-events-none opacity-70"
                              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
                            />
                            
                            <div className="flex flex-col gap-4">
                                {/* Big Number */}
                                <div className="text-center py-2">
                                    <motion.div 
                                        key={timeRange + summaryValue}
                                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className="text-5xl font-bold text-white tracking-tighter drop-shadow-lg"
                                    >
                                        {formatValue(summaryValue, habit?.type, unitLabel, isTimeBased)}
                                    </motion.div>
                                </div>
                                <div className="px-2 space-y-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-zinc-400 font-semibold uppercase tracking-wide">Relación</span>
                                        <span className="text-white/80 font-medium">
                                            {formatValue(summaryValue, habit?.type, unitLabel, isTimeBased)} / {formatValue(goalValue, habit?.type, unitLabel, isTimeBased)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                                            <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: summaryBarValue }}
                                                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                                                className="h-full rounded-full bg-cyan-400/80 origin-left"
                                            />
                                        </div>
                                        <span className="text-[11px] font-bold text-white">
                                            {summaryPercentage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. GOAL SUMMARY (Line Chart) */}
                        <motion.div variants={itemVariants} className="bg-zinc-900/70 rounded-[32px] p-6 border border-white/10 shadow-md relative overflow-hidden">
                            <h3 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide mb-6">RESUMEN DE METAS</h3>
                            
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <span className="text-[13px] text-zinc-400">Trabajado en este período</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight ml-4">
                                        <FormattedValue value={summaryValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                        <span className="text-[13px] text-zinc-400">Meta estimada</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight mr-4">
                                        <FormattedValue value={goalValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} className="justify-end" />
                                    </div>
                                </div>
                            </div>

                            {/* Line Chart Component */}
                            <div className="h-48 w-full relative">
                                <HabitGoalChart 
                                    dataPoints={chartData}
                                    goalValue={goalValue}
                                    totalValue={summaryValue}
                                    startDate={chartData[0]?.date || new Date()}
                                    endDate={chartData[chartData.length - 1]?.date || new Date()}
                                    color={themeColor}
                                />
                            </div>
                        </motion.div>

                        {/* 3. WORKED HOURS (Bar Chart) */}
                        <motion.div variants={itemVariants} className="bg-zinc-800/40 backdrop-blur-sm rounded-[32px] p-6 border border-white/10 shadow-md relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide">
                                    {isTimeBased ? 'HORAS TRABAJADAS' : 'PROGRESO'}
                                </h3>
                                <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors">
                                    <Share2 size={16} />
                                </button>
                            </div>

                            {/* No local tabs here anymore, controlled by top tabs */}

                            <div className="flex justify-between px-8 mb-8 mt-4">
                                <div className="text-center">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Total</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        <FormattedValue value={totalValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} className="justify-center" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Promedio</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        <FormattedValue value={averageValue} type={habit?.type} unit={unitLabel} isDuration={isTimeBased} className="justify-center" />
                                    </div>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="h-56 flex items-end justify-between gap-2 relative pl-2 pr-8">
                                {/* Y-Axis Labels (Right Side) */}
                                <div className="absolute right-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-zinc-500 text-right w-6">
                                    <span>{formatValue(maxChartValue, habit?.type, unitLabel, isTimeBased)}</span>
                                    <span>{formatValue(maxChartValue / 2, habit?.type, unitLabel, isTimeBased)}</span>
                                    <span>0</span>
                                </div>

                                {/* Grid Lines */}
                                <div className="absolute inset-0 right-8 bottom-6 flex flex-col justify-between pointer-events-none z-0">
                                    <div className="w-full h-[1px] bg-white/5" />
                                    <div className="w-full h-[1px] bg-white/5" />
                                    <div className="w-full h-[1px] bg-white/5" />
                                </div>

                                {chartData.map((data: any, i: number) => {
                                    // Smart Label Visibility to prevent overlap
                                    let showLabel = true;
                                    if (timeRange === 'TODAY') {
                                        showLabel = i % 4 === 0; // 00:00, 04:00, ...
                                    } else if (timeRange === '3_MONTHS') {
                                        showLabel = i % 2 === 0; // Every 2 weeks
                                    } else if (timeRange === 'YEAR') {
                                        showLabel = i % 2 === 0; // Every 2 months (Jan, Mar, May...)
                                    } else if (timeRange === '8_WEEKS') {
                                        showLabel = i % 2 === 0;
                                    }

                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-3 z-10 h-full justify-end group cursor-pointer pb-6">
                                            <div className="w-full max-w-[32px] h-[85%] relative flex items-end">
                                                {data.value > 0 && (
                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                        {formatValue(data.value, habit?.type, unitLabel, isTimeBased)}
                                                    </div>
                                                )}
                                                <motion.div 
                                                    variants={barVariants}
                                                    style={{ 
                                                        height: `${(data.value / maxChartValue) * 100}%`, 
                                                        originY: 1,
                                                        backgroundColor: data.isToday ? themeColor : `${themeColor}99` // 60% opacity
                                                    }}
                                                    className="w-full rounded-t-[4px] relative overflow-hidden"
                                                />
                                            </div>
                                            <span className={cn(
                                                "absolute bottom-0 text-[10px] font-bold uppercase text-zinc-500 truncate w-full text-center transition-opacity duration-200",
                                                showLabel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                            )}>
                                                {data.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* 4. STATS GRID */}
                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                            <StatCard 
                                label="Sesiones" 
                                value={totalSessions} 
                            />
                            <StatCard 
                                label="Racha actual" 
                                value={`${streakDays} días`} 
                            />
                            <StatCard 
                                label="Sesión promedio" 
                                value={formatValue(averageValue, habit?.type, unitLabel, isTimeBased)}
                            />
                            <StatCard 
                                label="Mejor día" 
                                value={formatValue(bestDayValue, habit?.type, unitLabel, isTimeBased)}
                            />
                        </motion.div>
                        
                        {/* Bottom Spacer */}
                        <div className="h-10" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal 
                isOpen={showDeleteConfirmation}
                onClose={() => setShowDeleteConfirmation(false)}
                onConfirm={() => {
                    const targetId = habit?.id || project?.id;
                    if (targetId && onDelete) {
                        onDelete(targetId);
                        onClose();
                    }
                }}
                title={habit ? '¿Eliminar Hábito?' : '¿Eliminar Proyecto?'}
                message={`Estás a punto de eliminar "${habit?.title || project?.title}". Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
            />

            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={setCurrentDate}
                mode={['WEEK', 'MONTH', 'YEAR'].includes(timeRange) ? (timeRange as DateSelectionMode) : 'WEEK'}
                currentDate={currentDate}
            />
        </AnimatePresence>,
        document.body
    );
};
