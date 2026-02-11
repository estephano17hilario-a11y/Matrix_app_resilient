import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Share2, Crown, MoreVertical } from 'lucide-react';
import { Habit, Project, Session } from '../../../types';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, startOfYear, endOfYear, eachWeekOfInterval, eachMonthOfInterval, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears, isWithinInterval, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';

interface HabitDetailViewProps {
    habit?: Habit | null;
    project?: Project | null;
    onClose: () => void;
}

type TimeRange = 'WEEK' | '8_WEEKS' | 'MONTH' | 'YEAR';
type SummaryScope = 'TODAY' | 'WEEK' | 'TOTAL';

import { HabitGoalChart } from './HabitGoalChart';

// --- HELPERS ---
const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const formatValue = (value: number, type: Habit['type'] | undefined, unit: string = '', isDuration: boolean = false) => {
    if (isDuration) return formatDuration(value);
    // Para booleanos o simples, si no hay unidad, es "veces" implícito pero mostramos solo número
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

export const HabitDetailView: React.FC<HabitDetailViewProps> = ({ habit, project, onClose }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('WEEK');
    const [summaryScope, setSummaryScope] = useState<SummaryScope>('WEEK');
    const [currentDate, setCurrentDate] = useState(new Date());
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

        if (habit) {
            const isTimeBased = (habit.estimatedTime || 0) > 0;
            const baseValue = isTimeBased ? habit.estimatedTime! : (isQuantity ? (habit.targetValue || 1) : 1);
            
            let start: Date, end: Date;
            let dataPoints: any[] = [];

            if (timeRange === 'WEEK') {
                start = startOfWeek(currentDate, { weekStartsOn: 1 });
                end = endOfWeek(currentDate, { weekStartsOn: 1 });
                const days = eachDayOfInterval({ start, end });
                
                dataPoints = days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                    const value = completions * baseValue;

                    return {
                        label: format(day, 'EEE', { locale: es }).toUpperCase().slice(0, 1),
                        fullDate: dateStr,
                        value: value,
                        isToday: isSameDay(day, new Date()),
                        date: day
                    };
                });
            } else if (timeRange === '8_WEEKS') {
                end = endOfWeek(currentDate, { weekStartsOn: 1 });
                start = subWeeks(end, 7);
                start = startOfWeek(start, { weekStartsOn: 1 });
                
                const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
                
                dataPoints = weeks.map(weekStart => {
                    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                    const weekLabel = `${format(weekStart, 'd/M')}`;
                    
                    let weeklyValue = 0;
                    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
                    
                    daysInWeek.forEach(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                        weeklyValue += completions * baseValue;
                    });

                    return {
                        label: weekLabel,
                        value: weeklyValue,
                        isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
                        date: weekStart
                    };
                });
            } else if (timeRange === 'MONTH') {
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
                const days = eachDayOfInterval({ start, end });
                
                dataPoints = days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                    const value = completions * baseValue;

                    // Show labels only for specific days (6, 14, 21, 28) to avoid clutter
                    const showLabel = [6, 14, 21, 28].includes(day.getDate());

                    return {
                        label: showLabel ? format(day, 'd') : '',
                        fullDate: dateStr,
                        value: value,
                        isToday: isSameDay(day, new Date()),
                        date: day
                    };
                });
            } else if (timeRange === 'YEAR') {
                start = startOfYear(currentDate);
                end = endOfYear(currentDate);
                const months = eachMonthOfInterval({ start, end });
                
                dataPoints = months.map(monthStart => {
                    const monthEnd = endOfMonth(monthStart);
                    const monthLabel = format(monthStart, 'MMM', { locale: es }).toUpperCase().slice(0, 3);
                    
                    let monthlyValue = 0;
                    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    
                    daysInMonth.forEach(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const completions = habit.history?.filter((h: string) => h.startsWith(dateStr)).length || 0;
                        monthlyValue += completions * baseValue;
                    });

                    return {
                        label: monthLabel,
                        value: monthlyValue,
                        isToday: isWithinInterval(new Date(), { start: monthStart, end: monthEnd }),
                        date: monthStart
                    };
                });
            } else {
                start = new Date();
                end = new Date();
            }

            const total = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
            const avg = total / (dataPoints.length || 1);
            const best = Math.max(...dataPoints.map(d => d.value), 0);
            const sessions = dataPoints.filter(d => d.value > 0).length;
            const maxVal = Math.max(best, 1);

            let calculatedSummaryValue = 0;
            let calculatedGoalValue = 0;
            const dailyGoal = baseValue; 

            if (summaryScope === 'TODAY') {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const completionsToday = habit.history?.filter((h: string) => h.startsWith(todayStr)).length || 0;
                calculatedSummaryValue = completionsToday * baseValue;
                calculatedGoalValue = dailyGoal;
            } else if (summaryScope === 'WEEK') {
                const wStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                const wEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
                const wDays = eachDayOfInterval({ start: wStart, end: wEnd });
                
                let wTotal = 0;
                wDays.forEach(day => {
                    const dStr = format(day, 'yyyy-MM-dd');
                    if (habit.history?.some(h => h.startsWith(dStr))) {
                        wTotal += baseValue;
                    }
                });
                calculatedSummaryValue = wTotal;
                calculatedGoalValue = dailyGoal * 7;
            } else {
                const totalCompletions = habit.history?.length || 0;
                calculatedSummaryValue = totalCompletions * baseValue;
                if (habit.history && habit.history.length > 0) {
                     const dates = habit.history.map(d => new Date(d).getTime());
                     const minDate = new Date(Math.min(...dates));
                     const daysSinceStart = Math.max(1, Math.floor((new Date().getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                     calculatedGoalValue = daysSinceStart * dailyGoal;
                } else {
                     calculatedGoalValue = dailyGoal;
                }
            }

            let rangeLabel = '';
            if (timeRange === 'MONTH') {
                rangeLabel = format(start, 'MMMM yyyy', { locale: es });
                rangeLabel = rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1);
            } else if (timeRange === 'YEAR') {
                rangeLabel = format(start, 'yyyy');
            } else {
                rangeLabel = `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
            }

            return {
                chartData: dataPoints,
                totalValue: total,
                averageValue: avg,
                bestDayValue: best,
                totalSessions: sessions,
                dateRangeLabel: rangeLabel,
                summaryValue: calculatedSummaryValue,
                goalValue: calculatedGoalValue,
                maxChartValue: maxVal,
                streakDays: habit.streak
            };
        }

        const sessions = (project?.sessions || []) as Session[];
        const sessionEntries = sessions.map(s => ({ ...s, dateObj: new Date(s.date) }));
        const goalTargetMinutes = project?.goalTarget || 0;
        const workingDaysCount = Math.max(1, project?.workingDays?.length || 5);
        const dailyGoalMinutes = project?.goalFrequency === 'WEEKLY'
            ? goalTargetMinutes / workingDaysCount
            : project?.goalFrequency === 'MONTHLY'
                ? goalTargetMinutes / (workingDaysCount * 4)
                : goalTargetMinutes;

        let start: Date, end: Date;
        let dataPoints: any[] = [];

        if (timeRange === 'WEEK') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start, end });

            dataPoints = days.map(day => {
                const value = sessionEntries.reduce((acc, s) => isSameDay(s.dateObj, day) ? acc + (s.duration / 60) : acc, 0);

                return {
                    label: format(day, 'EEE', { locale: es }).toUpperCase().slice(0, 1),
                    fullDate: format(day, 'yyyy-MM-dd'),
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

            dataPoints = weeks.map(weekStart => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const weeklyValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: weekStart, end: weekEnd }) ? acc + (s.duration / 60) : acc, 0);

                return {
                    label: `${format(weekStart, 'd/M')}`,
                    value: weeklyValue,
                    isToday: isWithinInterval(new Date(), { start: weekStart, end: weekEnd }),
                    date: weekStart
                };
            });
        } else if (timeRange === 'MONTH') {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
            const days = eachDayOfInterval({ start, end });

            dataPoints = days.map(day => {
                const value = sessionEntries.reduce((acc, s) => isSameDay(s.dateObj, day) ? acc + (s.duration / 60) : acc, 0);

                // Show labels only for specific days (6, 14, 21, 28) to avoid clutter
                const showLabel = [6, 14, 21, 28].includes(day.getDate());

                return {
                    label: showLabel ? format(day, 'd') : '',
                    fullDate: format(day, 'yyyy-MM-dd'),
                    value,
                    isToday: isSameDay(day, new Date()),
                    date: day
                };
            });
        } else if (timeRange === 'YEAR') {
            start = startOfYear(currentDate);
            end = endOfYear(currentDate);
            const months = eachMonthOfInterval({ start, end });

            dataPoints = months.map(monthStart => {
                const monthEnd = endOfMonth(monthStart);
                const monthlyValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: monthStart, end: monthEnd }) ? acc + (s.duration / 60) : acc, 0);

                return {
                    label: format(monthStart, 'MMM', { locale: es }).toUpperCase().slice(0, 3),
                    value: monthlyValue,
                    isToday: isWithinInterval(new Date(), { start: monthStart, end: monthEnd }),
                    date: monthStart
                };
            });
        } else {
            start = new Date();
            end = new Date();
        }

        const sessionsInRange = sessionEntries.filter(s => isWithinInterval(s.dateObj, { start, end }));
        const total = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
        const avg = sessionsInRange.length > 0 ? total / sessionsInRange.length : 0;
        const best = Math.max(...dataPoints.map(d => d.value), 0);
        const maxVal = Math.max(best, 1);

        let calculatedSummaryValue = 0;
        let calculatedGoalValue = 0;

        if (summaryScope === 'TODAY') {
            const todayValue = sessionEntries.reduce((acc, s) => isSameDay(s.dateObj, new Date()) ? acc + (s.duration / 60) : acc, 0);
            calculatedSummaryValue = todayValue;
            calculatedGoalValue = dailyGoalMinutes;
        } else if (summaryScope === 'WEEK') {
            const wStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const wEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
            const weekValue = sessionEntries.reduce((acc, s) => isWithinInterval(s.dateObj, { start: wStart, end: wEnd }) ? acc + (s.duration / 60) : acc, 0);
            calculatedSummaryValue = weekValue;
            calculatedGoalValue = project?.goalFrequency === 'WEEKLY'
                ? goalTargetMinutes
                : project?.goalFrequency === 'MONTHLY'
                    ? goalTargetMinutes / 4
                    : dailyGoalMinutes * 7;
        } else {
            const totalFromSessions = sessionEntries.reduce((acc, s) => acc + (s.duration / 60), 0);
            calculatedSummaryValue = project?.totalTime ? project.totalTime / 60 : totalFromSessions;

            const firstSessionDate = sessionEntries.length > 0
                ? sessionEntries.reduce((min, s) => s.dateObj < min ? s.dateObj : min, sessionEntries[0].dateObj)
                : new Date();

            if (project?.goalFrequency === 'WEEKLY') {
                const weeks = Math.max(1, differenceInWeeks(new Date(), firstSessionDate) + 1);
                calculatedGoalValue = weeks * goalTargetMinutes;
            } else if (project?.goalFrequency === 'MONTHLY') {
                const months = Math.max(1, differenceInMonths(new Date(), firstSessionDate) + 1);
                calculatedGoalValue = months * goalTargetMinutes;
            } else {
                const days = Math.max(1, differenceInDays(new Date(), firstSessionDate) + 1);
                calculatedGoalValue = days * goalTargetMinutes;
            }
        }

        let rangeLabel = '';
        if (timeRange === 'MONTH') {
            rangeLabel = format(start, 'MMMM yyyy', { locale: es });
            rangeLabel = rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1);
        } else if (timeRange === 'YEAR') {
            rangeLabel = format(start, 'yyyy');
        } else {
            rangeLabel = `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
        }

        const uniqueDays = Array.from(new Set(sessionEntries.map(s => format(s.dateObj, 'yyyy-MM-dd'))));
        const sessionDays = uniqueDays.sort((a, b) => b.localeCompare(a));
        let streak = 0;
        let cursor = new Date();
        while (sessionDays.includes(format(cursor, 'yyyy-MM-dd'))) {
            streak += 1;
            cursor = subDays(cursor, 1);
        }

        return {
            chartData: dataPoints,
            totalValue: total,
            averageValue: avg,
            bestDayValue: best,
            totalSessions: sessionsInRange.length,
            dateRangeLabel: rangeLabel,
            summaryValue: calculatedSummaryValue,
            goalValue: calculatedGoalValue,
            maxChartValue: maxVal,
            streakDays: streak
        };

    }, [habit, project, timeRange, currentDate, summaryScope, isQuantity]);

    const summaryRatio = goalValue > 0 ? summaryValue / goalValue : 0;
    const summaryBarValue = Math.min(Math.max(summaryRatio, 0), 1);
    const summaryPercentage = Math.round(Math.max(summaryRatio, 0) * 100);
    const summaryScopeLabel = summaryScope === 'TODAY' ? 'Hoy' : summaryScope === 'WEEK' ? 'Semana' : 'Total';


    // --- UI COMPONENTS ---
    const StatCard = ({ label, value, icon: Icon, isGold }: any) => (
        <motion.div 
            variants={itemVariants}
            className="bg-zinc-900/60 backdrop-blur-md rounded-[24px] p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-zinc-800/60 transition-colors border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
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

                    <button className="text-blue-400 active:opacity-70 transition-opacity">
                        <MoreVertical size={24} />
                    </button>
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
                            className="bg-zinc-900/40 backdrop-blur-md rounded-[32px] p-6 border border-white/10 shadow-lg mb-4 relative overflow-hidden"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -z-10 pointer-events-none" />
                            
                            <div className="flex flex-col gap-4">
                                {/* Tabs */}
                                <div className="flex bg-black/20 p-1 rounded-full self-center backdrop-blur-sm border border-white/5">
                                    {[
                                        { value: 'TODAY', label: 'Hoy' },
                                        { value: 'WEEK', label: 'Esta semana' },
                                        { value: 'TOTAL', label: 'Total' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.value}
                                            onClick={() => setSummaryScope(tab.value as SummaryScope)}
                                            className={cn(
                                                "px-4 py-1.5 rounded-full text-xs font-bold transition-all relative",
                                                summaryScope === tab.value 
                                                    ? "text-white" 
                                                    : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {summaryScope === tab.value && (
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

                                {/* Big Number */}
                                <div className="text-center py-2">
                                    <motion.div 
                                        key={summaryScope}
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
                                        <span className="text-zinc-400 font-semibold uppercase tracking-wide">Relación {summaryScopeLabel}</span>
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
                        <motion.div variants={itemVariants} className="bg-zinc-900/40 backdrop-blur-md rounded-[32px] p-6 border border-white/10 shadow-lg relative overflow-hidden">
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
                                />
                            </div>
                        </motion.div>

                        {/* 3. WORKED HOURS (Bar Chart) */}
                        <motion.div variants={itemVariants} className="bg-zinc-900/40 backdrop-blur-md rounded-[32px] p-6 border border-white/10 shadow-lg relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wide">
                                    {isTimeBased ? 'HORAS TRABAJADAS' : 'PROGRESO'}
                                </h3>
                                <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors">
                                    <Share2 size={16} />
                                </button>
                            </div>

                            {/* Time Range Tabs */}
                            <div className="flex bg-black/20 p-1 rounded-lg mb-6 backdrop-blur-sm border border-white/5 w-fit">
                                {[
                                    { value: 'WEEK', label: 'Semana' },
                                    { value: '8_WEEKS', label: '8 Semanas' },
                                    { value: 'MONTH', label: 'Mes' },
                                    { value: 'YEAR', label: 'Año' }
                                ].map((tab) => (
                                    <button
                                        key={tab.value}
                                        onClick={() => setTimeRange(tab.value as TimeRange)}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-[10px] font-bold transition-all relative",
                                            timeRange === tab.value 
                                                ? "text-white" 
                                                : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        {timeRange === tab.value && (
                                            <motion.div
                                                layoutId="rangeTab"
                                                className="absolute inset-0 bg-white/10 rounded-md shadow-sm border border-white/5"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Date Navigation */}
                            <div className="flex items-center justify-between mb-8 px-2 bg-white/5 rounded-xl p-2 border border-white/5">
                                <button 
                                    onClick={() => {
                                        if (timeRange === 'WEEK') setCurrentDate(d => subWeeks(d, 1));
                                        if (timeRange === '8_WEEKS') setCurrentDate(d => subWeeks(d, 8));
                                        if (timeRange === 'MONTH') setCurrentDate(d => subMonths(d, 1));
                                        if (timeRange === 'YEAR') setCurrentDate(d => subYears(d, 1));
                                    }}
                                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                
                                <span className="text-sm font-medium text-white tracking-wide">
                                    {dateRangeLabel}
                                </span>

                                <button 
                                    onClick={() => {
                                        if (timeRange === 'WEEK') setCurrentDate(d => addWeeks(d, 1));
                                        if (timeRange === '8_WEEKS') setCurrentDate(d => addWeeks(d, 8));
                                        if (timeRange === 'MONTH') setCurrentDate(d => addMonths(d, 1));
                                        if (timeRange === 'YEAR') setCurrentDate(d => addYears(d, 1));
                                    }}
                                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <div className="flex justify-between px-8 mb-8">
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
                                                style={{ height: `${(data.value / maxChartValue) * 100}%`, originY: 1 }}
                                                className={cn(
                                                    "w-full rounded-t-[4px] relative overflow-hidden",
                                                    data.isToday 
                                                        ? "bg-[#0ea5e9]" 
                                                        : "bg-[#0ea5e9]/60"
                                                )}
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
        </AnimatePresence>
    );
};
