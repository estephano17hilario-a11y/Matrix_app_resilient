import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Share2, Crown, MoreVertical, Edit2, Archive, Trash2, AlertTriangle } from 'lucide-react';
import { Habit, Project } from '../../../types';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, startOfYear, endOfYear, eachWeekOfInterval, eachMonthOfInterval, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears, isWithinInterval, differenceInDays, differenceInWeeks, startOfDay, endOfDay, eachHourOfInterval, isSameHour, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';
import { DateSelectionModal, DateSelectionMode } from './DateSelectionModal';
import { HabitGoalChart } from './HabitGoalChart';

interface HabitDetailViewProps {
    habit?: Habit | null;
    project?: Project | null;
    attributeColor?: string;
    onClose: () => void;
    onEdit?: (item: Habit | Project) => void;
    onDelete?: (itemId: string) => void;
    onArchive?: (item: Habit | Project) => void;
}

type TimeRange = 'TODAY' | 'WEEK' | '8_WEEKS' | 'MONTH' | 'YEAR' | 'TOTAL';

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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const handleTabClick = (tabValue: TimeRange) => {
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
            sessionEntries = project.sessions.map(s => ({ ...s, dateObj: new Date(s.date) }));
        }

        const goalTargetMinutes = project?.goalTarget || 0;
        const workingDaysCount = Math.max(1, project?.workingDays?.length || 5);
        // Daily goal in minutes for Project
        const dailyGoalMinutes = project?.goalFrequency === 'WEEKLY'
            ? goalTargetMinutes / workingDaysCount
            : project?.goalFrequency === 'MONTHLY'
                ? goalTargetMinutes / (workingDaysCount * 4)
                : goalTargetMinutes;

        let start: Date, end: Date;
        let dataPoints: any[] = [];
        let calculatedGoalValue = 0;

        // 1. DETERMINE RANGE & DATA POINTS
        if (timeRange === 'TODAY') {
            start = startOfDay(currentDate);
            end = endOfDay(currentDate);
            calculatedGoalValue = habit ? baseValue : dailyGoalMinutes;

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
            if (project?.goalFrequency === 'WEEKLY') calculatedGoalValue = goalTargetMinutes;

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
            
            calculatedGoalValue = habit ? (baseValue * 30) : (dailyGoalMinutes * 30); // Approx
            if (project?.goalFrequency === 'MONTHLY') calculatedGoalValue = goalTargetMinutes;

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

        } else if (timeRange === 'YEAR') {
            start = startOfYear(currentDate);
            end = endOfYear(currentDate);
            const months = eachMonthOfInterval({ start, end });
            
            calculatedGoalValue = (habit ? (baseValue * 30) : (dailyGoalMinutes * 30)) * 12; // Approx

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
                 calculatedGoalValue = totalDurationWeeks * (project.goalFrequency === 'WEEKLY' ? goalTargetMinutes : dailyGoalMinutes * 7);
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
        const avg = total / (dataPoints.length || 1);
        const best = Math.max(...dataPoints.map(d => d.value), 0);
        const sessionsCount = dataPoints.filter(d => d.value > 0).length;
        const maxVal = Math.max(best, 1);

        let rangeLabel = '';
        if (timeRange === 'TODAY') {
            rangeLabel = format(currentDate, 'd MMMM yyyy', { locale: es });
        } else if (timeRange === 'MONTH') {
            rangeLabel = format(start, 'MMMM yyyy', { locale: es });
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
    const StatCard = ({ label, value, icon: Icon, isGold }: any) => (
        <motion.div 
            variants={itemVariants}
            className="bg-zinc-900/70 rounded-[24px] p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-zinc-800/70 transition-colors border border-white/10 shadow-sm"
        >
            <div className="flex justify-between items-start relative z-10">
                {isGold ? (
                     <div className="flex flex-col items-center w-full gap-2">
                        <span className="text-zinc-400 text-xs font-medium">{label}</span>
                        <Icon size={20} className="text-yellow-500 fill-yellow-500" />
                     </div>
                ) : (
                    <div className="flex flex-col items-center w-full gap-2">
                        <span className="text-zinc-400 text-xs font-medium">{label}</span>
                    </div>
                )}
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

    return (
        <AnimatePresence>
            <motion.div
                key="fullscreen-habit-view"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[100] bg-[#000000] text-white flex flex-col overflow-hidden"
            >
                {/* Background Atmosphere */}
                <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-cyan-500/10 blur-lg rounded-full pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-indigo-500/10 blur-lg rounded-full pointer-events-none" />
                <div className="absolute top-[40%] left-[30%] w-[60%] h-[60%] bg-pink-500/10 blur-lg rounded-full pointer-events-none" />

                {/* Header */}
                <div className="relative z-20 flex items-center justify-between px-6 py-5 pt-safe-top">
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

                    <div className="relative">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-blue-400 active:opacity-70 transition-opacity p-2 -mr-2"
                        >
                            <MoreVertical size={24} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
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
                                                setIsDeleteConfirmOpen(true);
                                                setIsMenuOpen(false);
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

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 pb-20 scrollbar-hide">
                    
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4 max-w-md mx-auto"
                    >
                        {/* 1. MAIN STATS CARD */}
                        <motion.div 
                            variants={itemVariants} 
                            className="bg-zinc-900/70 rounded-[32px] p-6 border border-white/10 shadow-md mb-4 relative overflow-hidden"
                        >
                            {/* Glow Effect */}
                            <div
                              className="absolute top-0 right-0 w-32 h-32 rounded-full -z-10 pointer-events-none opacity-70"
                              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
                            />
                            
                            <div className="flex flex-col gap-4">
                                {/* Global Time Range Tabs */}
                                <div className="flex overflow-x-auto scrollbar-hide bg-black/40 p-1 rounded-full self-center border border-white/5 max-w-full">
                                    {[
                                        { value: 'TODAY', label: 'Hoy' },
                                        { value: 'WEEK', label: 'Semana' },
                                        { value: '8_WEEKS', label: '8 Semanas' },
                                        { value: 'MONTH', label: 'Mes' },
                                        { value: 'YEAR', label: 'Año' },
                                        { value: 'TOTAL', label: 'Total' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.value}
                                            onClick={() => handleTabClick(tab.value as TimeRange)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all relative whitespace-nowrap flex-shrink-0",
                                                timeRange === tab.value 
                                                    ? "text-white" 
                                                    : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {timeRange === tab.value && (
                                                <motion.div
                                                    layoutId="scopeTab"
                                                    className="absolute inset-0 bg-white/10 rounded-full shadow-sm border border-white/5"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <span className="relative z-10">{tab.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Date Navigation */}
                                <div className="flex items-center justify-center gap-4 mt-1">
                                    <button 
                                        onClick={() => {
                                            if (timeRange === 'TODAY') setCurrentDate(d => subDays(d, 1));
                                            if (timeRange === 'WEEK') setCurrentDate(d => subWeeks(d, 1));
                                            if (timeRange === '8_WEEKS') setCurrentDate(d => subWeeks(d, 8));
                                            if (timeRange === 'MONTH') setCurrentDate(d => subMonths(d, 1));
                                            if (timeRange === 'YEAR') setCurrentDate(d => subYears(d, 1));
                                        }}
                                        disabled={timeRange === 'TOTAL'}
                                        className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                            timeRange === 'TOTAL' ? "opacity-0 pointer-events-none" : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                        )}
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    
                                    <span className="text-[11px] font-medium text-zinc-400 tracking-wide uppercase">
                                        {dateRangeLabel}
                                    </span>

                                    <button 
                                        onClick={() => {
                                            if (timeRange === 'TODAY') setCurrentDate(d => addDays(d, 1));
                                            if (timeRange === 'WEEK') setCurrentDate(d => addWeeks(d, 1));
                                            if (timeRange === '8_WEEKS') setCurrentDate(d => addWeeks(d, 8));
                                            if (timeRange === 'MONTH') setCurrentDate(d => addMonths(d, 1));
                                            if (timeRange === 'YEAR') setCurrentDate(d => addYears(d, 1));
                                        }}
                                        disabled={timeRange === 'TOTAL'}
                                        className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                            timeRange === 'TOTAL' ? "opacity-0 pointer-events-none" : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                        )}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>

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
                                        {formatValue(summaryValue, habit?.type, unitLabel, isTimeBased)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                        <span className="text-[13px] text-zinc-400">Meta estimada</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white tracking-tight mr-4">
                                        {formatValue(goalValue, habit?.type, unitLabel, isTimeBased)}
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
                        <motion.div variants={itemVariants} className="bg-zinc-900/70 rounded-[32px] p-6 border border-white/10 shadow-md relative overflow-hidden">
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
                                        {formatValue(totalValue, habit?.type, unitLabel, isTimeBased)}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Promedio</div>
                                    <div className="text-2xl font-bold text-white tracking-tight">
                                        {formatValue(averageValue, habit?.type, unitLabel, isTimeBased)}
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

                                {chartData.map((data: any, i: number) => (
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
                                        <span className="absolute bottom-0 text-[10px] font-bold uppercase text-zinc-500 truncate w-full text-center">{data.label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* 4. STATS GRID */}
                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                            <StatCard 
                                label="Sesiones" 
                                value={totalSessions} 
                                icon={Crown}
                            />
                            <StatCard 
                                label="Racha actual" 
                                value={`${streakDays} días`} 
                            />
                            <StatCard 
                                label="Sesión promedio" 
                                value={formatValue(averageValue, habit?.type, unitLabel, isTimeBased)}
                                icon={Crown}
                                isGold 
                            />
                            <StatCard 
                                label="Mejor día" 
                                value={formatValue(bestDayValue, habit?.type, unitLabel, isTimeBased)}
                                icon={Crown}
                                isGold 
                            />
                        </motion.div>
                        
                        {/* Bottom Spacer */}
                        <div className="h-10" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleteConfirmOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                                    <AlertTriangle size={24} />
                                </div>
                                
                                <h3 className="text-lg font-bold text-white">¿Eliminar {habit ? 'Hábito' : 'Proyecto'}?</h3>
                                <p className="text-sm text-zinc-400">
                                    Esta acción no se puede deshacer. Se perderá todo el progreso y las estadísticas asociadas.
                                </p>

                                <div className="flex gap-3 w-full mt-4">
                                    <button 
                                        onClick={() => setIsDeleteConfirmOpen(false)}
                                        className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (onDelete && (habit?.id || project?.id)) {
                                                onDelete((habit?.id || project?.id)!);
                                            }
                                            setIsDeleteConfirmOpen(false);
                                            onClose();
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/20 transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={setCurrentDate}
                mode={['WEEK', 'MONTH', 'YEAR'].includes(timeRange) ? (timeRange as DateSelectionMode) : 'WEEK'}
                currentDate={currentDate}
            />
        </AnimatePresence>
    );
};
