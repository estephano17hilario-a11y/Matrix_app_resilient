import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Target, Layers, Plus, ChevronDown, Calendar as CalendarIcon, SlidersHorizontal, Check, Archive, Lock, ArrowUpDown } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { DailyLimits } from '../../../types/User';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { 
    format, startOfMonth, 
    subWeeks, addWeeks, addMonths, addYears, addDays,
    getDaysInMonth, startOfQuarter, endOfQuarter, addQuarters
} from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek, endOfWeek } from '../../../utils/dateUtils';
import { cn } from '../../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useLux } from '@/context/LuxContext';
import { getAvatarConfig } from '@/config/avatars';
import { getDynamicDailyTarget, getWeeklyGoalMinutes, getMonthlyGoalMinutes } from '../../../utils/projectUtils';
import { useTranslation } from 'react-i18next';
import { DateSelectionModal } from '../../dashboard/components/DateSelectionModal';

type TimeRange = 'DAY' | 'WEEK' | '8_WEEKS' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';

export const FocusStats = React.memo(({ 
    projects, 
    attributes,
    showArchived,
    onToggleArchived,
    onReorder,
    isPro,
    onOpenPro,
    weekStartDay = 1,
    defaultChartViews,
    defaultProjectView
}: { 
    projects: Project[], 
    attributes: Attribute[],
    dailyLimits?: DailyLimits,
    showArchived?: boolean,
    onToggleArchived?: () => void,
    onReorder?: () => void,
    isPro?: boolean,
    onOpenPro?: () => void,
    weekStartDay?: 0 | 1,
    defaultChartViews?: any,
    defaultProjectView?: 'TOTAL' | 'ATTRIBUTE' | 'PROJECT'
}) => {
    const { t, i18n: reactiveI18n } = useTranslation();
    const { user } = useLux();
    const avatarConfig = getAvatarConfig(user?.avatarId);
    const avatarColor = avatarConfig?.themeColor || '#6366f1';
    
    const ALL_RANGES = useMemo(() => [
        { value: 'DAY' as TimeRange, label: t('dashboard.today') },
        { value: 'WEEK' as TimeRange, label: t('dashboard.week') },
        { value: '8_WEEKS' as TimeRange, label: `8 ${t('dashboard.week')}s` },
        { value: 'MONTH' as TimeRange, label: t('dashboard.month') },
        { value: '3_MONTHS' as TimeRange, label: `3 ${t('dashboard.month')}s` },
        { value: 'YEAR' as TimeRange, label: t('dashboard.year') },
        { value: 'TOTAL' as TimeRange, label: 'Total' }
    ], [t]);
    
    const [timeRange, setTimeRange] = useState<TimeRange>(defaultChartViews?.focus || 'DAY');
    const [thirdSlot, setThirdSlot] = useState<TimeRange>('8_WEEKS');
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterMode, setFilterMode] = useState<'GLOBAL' | string>('GLOBAL'); // 'GLOBAL' or project/attribute ID
    const [activeDropdown, setActiveDropdown] = useState<'TRAITS' | 'PROJECTS' | 'GLOBAL_OPTIONS' | 'RANGES' | null>(null);
    
    const [viewMode, setViewMode] = useState<'TOTAL' | 'ATTRIBUTE' | 'PROJECT'>((defaultProjectView === 'PROJECT' && !isPro) ? 'ATTRIBUTE' : (defaultProjectView || 'ATTRIBUTE'));
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    
    // Sync defaultChartViews based on active viewMode
    useEffect(() => {
        if (viewMode === 'PROJECT' && defaultChartViews?.projects) {
            setTimeRange(defaultChartViews.projects);
        } else if ((viewMode === 'ATTRIBUTE' || viewMode === 'TOTAL') && defaultChartViews?.focus) {
            setTimeRange(defaultChartViews.focus);
        }
    }, [viewMode, defaultChartViews]);

    // Reset date when range changes
    useEffect(() => {
        setCurrentDate(new Date());
    }, [timeRange]);

    const handleTabClick = (range: TimeRange) => {
        if (!isPro && !['DAY', 'WEEK', '8_WEEKS'].includes(range)) {
            if (onOpenPro) onOpenPro();
            return;
        }

        setTimeRange(range);
        
        // If it's not DAY or WEEK, update the third slot
        if (range !== 'DAY' && range !== 'WEEK') {
            setThirdSlot(range);
        }
        
        setIsConfigOpen(false);
    };

    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
        // Switch to appropriate range if needed. 
        // For simplicity, if we select a date via modal, we might want to ensure we are in a mode that supports specific date selection nicely.
        // But FocusStats handles currentDate for all modes.
        // However, DateSelectionModal returns a specific date or start of week/month.
        // If user picks a day, we might want to switch to DAY mode or keep current?
        // Let's assume user wants to see that specific period.
        // But `DateSelectionModal` `mode` prop determines what they pick.
        // We will pass the mode based on current timeRange.
    };

    const attributeById = useMemo(() => {
        const map = new Map<string, Attribute>();
        attributes.forEach(attr => map.set(attr.id, attr));
        return map;
    }, [attributes]);

    const projectById = useMemo(() => {
        const map = new Map<string, Project>();
        projects.forEach(project => map.set(project.id, project));
        return map;
    }, [projects]);

    const activeFilterColor = useMemo(() => {
        if (filterMode === 'GLOBAL') return avatarColor;
        const activeAttr = attributeById.get(filterMode);
        if (activeAttr) return activeAttr.color;
        const activeProj = projectById.get(filterMode);
        if (activeProj) {
            const attr = attributeById.get(activeProj.attribute);
            return activeProj.color || (attr ? attr.color : '#6366f1');
        }
        return '#6366f1'; 
    }, [filterMode, attributeById, projectById, avatarColor]);

    const groupMode = useMemo(() => {
        if (filterMode === 'GLOBAL') return viewMode;
        const isAttr = attributeById.has(filterMode);
        if (isAttr) return 'PROJECT';
        return 'TOTAL';
    }, [filterMode, attributeById, viewMode]);

    const stats = useMemo(() => {
        return generateFocusData(projects, attributes, currentDate, timeRange, filterMode, groupMode);
    }, [projects, attributes, currentDate, timeRange, filterMode, groupMode, weekStartDay]);
    
    const activeProject = useMemo(() => {
        if (filterMode === 'GLOBAL') return undefined;
        return projectById.get(filterMode);
    }, [filterMode, projectById]);

    const isNonWorkingDay = useMemo(() => {
        if (timeRange !== 'DAY') return false;
        if (!activeProject) return false;
        const workingDays = activeProject.workingDays;
        if (!workingDays || workingDays.length === 0) return false;
        return !workingDays.includes(currentDate.getDay());
    }, [activeProject, currentDate, timeRange]);

    const nextWorkingLabel = useMemo(() => {
        if (!activeProject) return '';
        const workingDays = activeProject.workingDays;
        if (!workingDays || workingDays.length === 0) return '';
        for (let i = 1; i <= 7; i += 1) {
            const next = addDays(currentDate, i);
            if (workingDays.includes(next.getDay())) {
                if (i === 1) return t('tomorrow');
                const label = format(next, 'EEEE', { locale: reactiveI18n.language === 'es' ? es : undefined });
                return label.charAt(0).toUpperCase() + label.slice(1);
            }
        }
        return '';
    }, [activeProject, currentDate, t, reactiveI18n.language]);

    const dailyGoalMinutes = useMemo(() => {
        if (['3_MONTHS', 'YEAR', 'TOTAL'].includes(timeRange)) return 0;

        const isToday = new Date().toDateString() === currentDate.toDateString();
        let dayTotal = 0;
        let weekTotal = 0;
        let eightWeeksTotal = 0;
        let monthTotal = 0;

        projects.forEach((p) => {
            if (p.deleted || p.archived) return;
            const effectiveFrequency = p.uiFrequency || p.goalFrequency;

            if (effectiveFrequency === 'DAILY') {
                const daily = Math.max(0, p.goalTarget || 0);
                dayTotal += daily;
                weekTotal += daily * 7;
                eightWeeksTotal += daily * 56;
                monthTotal += daily * getDaysInMonth(currentDate);
                return;
            }

            if (effectiveFrequency === 'WEEKLY') {
                const weekly = Math.max(0, getWeeklyGoalMinutes(p));
                const workingDaysCount = p.workingDays?.length || 7;
                const dailyAvg = workingDaysCount > 0 ? weekly / workingDaysCount : 0;
                const dynamicToday = Math.max(0, getDynamicDailyTarget(p));
                dayTotal += timeRange === 'DAY' && isToday ? dynamicToday : Math.max(0, dailyAvg);
                weekTotal += weekly;
                eightWeeksTotal += weekly * 8;
                monthTotal += weekly * Math.max(1, Math.ceil(getDaysInMonth(currentDate) / 7));
                return;
            }

            if (effectiveFrequency === 'MONTHLY') {
                const monthly = Math.max(0, getMonthlyGoalMinutes(p));
                const workingDaysCount = p.workingDays?.length || 7;
                const dailyAvg = workingDaysCount > 0 ? monthly / (workingDaysCount * 4) : 0;
                const dynamicToday = Math.max(0, getDynamicDailyTarget(p));
                dayTotal += timeRange === 'DAY' && isToday ? dynamicToday : Math.max(0, dailyAvg);
                weekTotal += Math.max(0, dailyAvg) * 7;
                eightWeeksTotal += Math.max(0, dailyAvg) * 56;
                monthTotal += monthly;
            }
        });

        if (dayTotal === 0 && weekTotal === 0 && eightWeeksTotal === 0 && monthTotal === 0) {
            dayTotal = 240;
            weekTotal = 240 * 7;
            eightWeeksTotal = 240 * 56;
            monthTotal = 240 * getDaysInMonth(currentDate);
        }

        switch (timeRange) {
            case 'DAY': return dayTotal;
            case 'WEEK': return weekTotal;
            case '8_WEEKS': return eightWeeksTotal;
            case 'MONTH': return monthTotal;
            default: return 0;
        }
    }, [projects, timeRange, currentDate, weekStartDay]);

    const showGoal = dailyGoalMinutes > 0 && !isNonWorkingDay;

    const currentMinutes = useMemo(() => {
        return stats.datasets.reduce((acc, ds) => acc + ds.data.reduce((a, b) => a + b, 0), 0);
    }, [stats.datasets]);

    const progressPercentage = dailyGoalMinutes > 0 ? Math.min(100, (currentMinutes / dailyGoalMinutes) * 100) : 0;

    const dateRangeLabel = useMemo(() => {
        let start: Date, end: Date;
        const dateLocale = reactiveI18n.language === 'es' ? es : undefined;
        if (timeRange === 'DAY') {
            return format(currentDate, 'EEEE d MMM', { locale: dateLocale }).toUpperCase();
        } else if (timeRange === 'WEEK') {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
            return `${format(start, 'd MMM', { locale: dateLocale }).toUpperCase()} - ${format(end, 'd MMM', { locale: dateLocale }).toUpperCase()}`;
        } else if (timeRange === '8_WEEKS') {
            end = endOfWeek(currentDate);
            start = subWeeks(end, 7);
            start = startOfWeek(start);
            return `${format(start, 'd MMM', { locale: dateLocale })} - ${format(end, 'd MMM', { locale: dateLocale })}`;
        } else if (timeRange === 'MONTH') {
            start = startOfMonth(currentDate);
            const label = format(start, 'MMMM yyyy', { locale: dateLocale });
            return label.charAt(0).toUpperCase() + label.slice(1);
        } else if (timeRange === '3_MONTHS') {
            const start = startOfQuarter(currentDate);
            const end = endOfQuarter(currentDate);
            return `${format(start, 'MMM', { locale: dateLocale })} - ${format(end, 'MMM yyyy', { locale: dateLocale })}`;
        } else if (timeRange === 'YEAR') {
            return format(currentDate, 'yyyy');
        } else {
             return reactiveI18n.language === 'es' ? 'Histórico Completo' : 'Full History';
        }
    }, [timeRange, currentDate, weekStartDay, reactiveI18n.language]);

    const isCurrentRange = useMemo(() => {
        const today = new Date();
        if (timeRange === 'DAY') return format(currentDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        if (timeRange === 'WEEK') {
            const start = startOfWeek(currentDate);
            const end = endOfWeek(currentDate);
            return today >= start && today <= end;
        }
        if (timeRange === 'MONTH') {
            return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
        }
        if (timeRange === 'YEAR') return currentDate.getFullYear() === today.getFullYear();
        return false;
    }, [currentDate, timeRange, weekStartDay]);

    const navigateDate = (dir: -1 | 1) => {
        if (timeRange === 'DAY') setCurrentDate(d => addDays(d, dir));
        else if (timeRange === 'WEEK') setCurrentDate(d => addWeeks(d, dir));
        else if (timeRange === '8_WEEKS') setCurrentDate(d => addWeeks(d, dir * 8));
        else if (timeRange === 'MONTH') setCurrentDate(d => addMonths(d, dir));
        else if (timeRange === '3_MONTHS') setCurrentDate(d => addQuarters(d, dir));
        else if (timeRange === 'YEAR') setCurrentDate(d => addYears(d, dir));
    };

    const { chartMax, yTicks } = useMemo(() => {
        const base = Math.max(stats.max * 1.15, 60);
        const steps = [15, 30, 60, 90, 120, 180, 240, 360, 480, 720, 960];
        const maxTicks = 6;
        let step = steps.find((s) => Math.ceil(base / s) <= maxTicks - 1);
        if (!step) {
            // Dynamic step for very large values to prevent UI freeze and limit breaks
            step = Math.ceil(base / (maxTicks - 1) / 60) * 60;
            if (step === 0) step = 960;
        }
        const maxValue = Math.ceil(base / step) * step;
        const ticks = Array.from({ length: Math.floor(maxValue / step) + 1 }, (_, i) => i * step);
        return { chartMax: maxValue, yTicks: ticks };
    }, [stats.max]);

    const xTickInterval = useMemo(() => {
        if (timeRange === 'DAY') return 4;
        if (timeRange === 'MONTH') return 5;
        if (timeRange === '3_MONTHS') return 2;
        if (timeRange === 'YEAR') return 2;
        if (timeRange === 'TOTAL') {
             const len = stats.labels.length;
             if (len > 20) return Math.ceil(len / 8);
             if (len > 12) return 2;
             return 1;
        }
        return 1;
    }, [timeRange, stats.labels.length]);

    const barSpacing = useMemo(() => {
        if (timeRange === 'YEAR') return 'px-0.5 md:px-1';
        if (timeRange === 'MONTH') return 'px-[1px]';

        const count = stats.labels.length;
        // Aggressive reduction for mobile to prevent zero-width bars
        if (count > 20) return 'px-[1px] md:px-0.5'; // 24 items (Day) -> Very tight
        if (count > 12) return 'px-0.5 md:px-1';
        return 'px-1 md:px-2';
    }, [stats.labels.length, timeRange]);

    const formatMinutes = (mins: number) => {
        if (mins <= 0) return '0h';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (m === 0) return `${h}h`;
        if (h === 0) return `${m}m`;
        return `${h}h${m}m`;
    };

    return (
        <div data-tour="focus-header" className="relative transition-all duration-200 ease-in-out flex-shrink-0">
            <div data-tour="focus-stats" className="bg-gray-900/70 bg-gradient-to-b from-white/5 to-transparent rounded-[32px] p-4 flex flex-col gap-3 relative overflow-visible border border-white/10 shadow-md group ring-1 ring-white/5">
                 <div className="absolute top-0 right-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(99,102,241,0.18)_0%,_transparent_60%)]" />
                 <div className="absolute bottom-0 left-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(16,185,129,0.12)_0%,_transparent_60%)]" />
                 
                {/* NEW COMPACT HEADER: Time Range + Date Nav + Global */}
                <div className="flex flex-col gap-2 z-50 relative">
                    <div className="flex items-center justify-between gap-2">
                        {/* LEFT: Time Range Tabs (Reduced Size) */}
                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shadow-md relative z-20 flex-shrink min-w-0">
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                                <AnimatePresence>
                                    {['DAY', 'WEEK', thirdSlot].map((range, index) => {
                                        const isActive = timeRange === range;
                                        const label = ALL_RANGES.find(r => r.value === range)?.label || range;
                                        
                                        return (
                                            <motion.div 
                                                key={`tab-slot-${index}`} 
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="relative shrink-0"
                                            >
                                                <motion.button
                                                    layout
                                                    onClick={() => {
                                                        if (isActive) {
                                                            setIsConfigOpen(!isConfigOpen);
                                                        } else {
                                                            handleTabClick(range as TimeRange);
                                                            setIsConfigOpen(false); // Close if switching to another
                                                        }
                                                    }}
                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                    className={cn(
                                                        "py-1.5 rounded-lg font-bold transition-all relative whitespace-nowrap overflow-visible",
                                                        label.length > 5 ? "px-1.5 text-[9px]" : "px-3 text-[11px]",
                                                        isActive 
                                                            ? "bg-white text-black shadow-sm z-10" 
                                                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <span className="relative z-10 flex items-center gap-1 truncate max-w-[80px]">
                                                        <span className="truncate">{label}</span>
                                                        {isActive && (
                                                            <ChevronDown 
                                                                size={12} 
                                                                className={`transition-transform duration-200 flex-shrink-0 ${isConfigOpen ? 'rotate-180' : ''}`} 
                                                            />
                                                        )}
                                                    </span>
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="focusStatsActiveTab"
                                                            className="absolute inset-0 bg-white rounded-lg"
                                                            initial={false}
                                                            transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
                                                        />
                                                    )}
                                                </motion.button>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            <div className="w-[1px] h-4 bg-white/10 mx-0.5 shrink-0" />

                            {/* GLOBAL RANGE PICKER (PLUS BUTTON) - SEPARATE */}
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'RANGES' ? null : 'RANGES')} // Use separate state or reuse activeDropdown
                                    className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                        activeDropdown === 'RANGES'
                                            ? "bg-white/20 text-white" 
                                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    <Plus size={12} className={cn("transition-transform duration-200", activeDropdown === 'RANGES' && "rotate-45")} />
                                </button>

                                <AnimatePresence>
                                    {activeDropdown === 'RANGES' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.98, y: 5, x: "-50%" }}
                                            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                                            exit={{ opacity: 0, scale: 0.98, y: 5, x: "-50%" }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute left-1/2 top-full mt-2 w-40 bg-zinc-900 border border-white/10 rounded-xl shadow-md overflow-hidden z-[100] p-1"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                {ALL_RANGES.map((option) => {
                                                    const isPinned = option.value === 'DAY' || option.value === 'WEEK' || option.value === thirdSlot;
                                                    const isSelected = timeRange === option.value;
                                                    
                                                    const isLocked = !isPro && !['DAY', 'WEEK', '8_WEEKS'].includes(option.value);
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                handleTabClick(option.value);
                                                                setActiveDropdown(null);
                                                                setIsConfigOpen(false); // Ensure date nav closes
                                                            }}
                                                            className={cn(
                                                                "w-full px-2 py-1.5 rounded-lg text-left text-[10px] font-bold flex items-center justify-between group transition-all",
                                                                isSelected 
                                                                    ? "bg-white text-black shadow-md" 
                                                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <span>{option.label}</span>
                                                                {isLocked && <Lock size={10} className="text-yellow-400/80" />}
                                                            </div>
                                                            {isSelected && <Check size={10} className="text-black" />}
                                                            {isPinned && !isSelected && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
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

                        {/* RIGHT: Global Button & Calendar */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                             {/* CALENDAR BUTTON REMOVED AS REQUESTED - NOW NEXT TO NAVIGATOR */}

                            {/* Global Button */}
                            <button 
                                onClick={() => { 
                                    setFilterMode('GLOBAL'); 
                                    setActiveDropdown(activeDropdown === 'GLOBAL_OPTIONS' ? null : 'GLOBAL_OPTIONS'); 
                                }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${filterMode === 'GLOBAL' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                            >
                                <SlidersHorizontal size={12} />
                            </button>

                            {/* Archive Toggle Button */}
                            {onToggleArchived && (
                                <button
                                    onClick={onToggleArchived}
                                    className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                        showArchived
                                            ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                    )}
                                    title={showArchived ? "Ver Proyectos Activos" : "Ver Proyectos Archivados"}
                                >
                                    <Archive size={12} />
                                </button>
                            )}
                            {/* Reorder Button */}
                            {!showArchived && onReorder && (
                                <button
                                    onClick={onReorder}
                                    className="w-6 h-6 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
                                    title="Reorganizar Proyectos"
                                >
                                    <ArrowUpDown size={12} />
                                </button>
                            )}
                        </div>

                        {/* Global Dropdown (Absolute) */}
                        <AnimatePresence>
                            {activeDropdown === 'GLOBAL_OPTIONS' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98, y: 5 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute right-0 top-full mt-2 w-auto bg-zinc-900 border border-white/10 rounded-xl shadow-md overflow-hidden z-[100] p-1.5 min-w-[140px]"
                                >
                                    <div className="flex flex-col gap-1">
                                        <button 
                                            onClick={() => { setViewMode('TOTAL'); setActiveDropdown(null); }}
                                            className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'TOTAL' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-[2px] ${viewMode === 'TOTAL' ? 'bg-black' : 'bg-indigo-400'}`} />
                                            <span className="text-[10px] font-bold">{t('focus.stats.noDivision')}</span>
                                        </button>
                                        
                                        <button 
                                            onClick={() => { setViewMode('ATTRIBUTE'); setActiveDropdown(null); }}
                                            className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all ${viewMode === 'ATTRIBUTE' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <Layers size={12} />
                                            <span className="text-[10px] font-bold">{t('focus.stats.splitByTrait')}</span>
                                        </button>

                                        <button 
                                            onClick={() => { 
                                                if (!isPro) {
                                                    setActiveDropdown(null);
                                                    onOpenPro?.();
                                                    return;
                                                }
                                                setViewMode('PROJECT'); 
                                                setActiveDropdown(null); 
                                            }}
                                            className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-all ${viewMode === 'PROJECT' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Target size={12} />
                                                <span className="text-[10px] font-bold">{t('focus.stats.splitByProject')}</span>
                                            </div>
                                            {!isPro && <Lock size={10} className="text-yellow-400/80" />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    {/* DATE NAV DROPDOWN - PUSH CONTENT DOWN */}
                    <AnimatePresence>
                        {isConfigOpen && (
                            <motion.div
                                initial={{  opacity: 0, marginBottom: 0 }}
                                animate={{  opacity: 1, marginBottom: 4 }}
                                exit={{  opacity: 0, marginBottom: 0 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="overflow-hidden w-full"
                            >
                                <div className="flex items-center justify-between gap-2 px-1">
                                    {/* DATE NAV */}
                                    <div className="flex items-center justify-between gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 whitespace-nowrap shadow-sm">
                                        <button onClick={(e) => { e.stopPropagation(); navigateDate(-1); }} className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5 flex-shrink-0">
                                            <ChevronLeft size={10} />
                                        </button>
                                        
                                        <div 
                                            className="h-5 flex items-center justify-center relative overflow-hidden px-2 min-w-[70px] cursor-pointer hover:bg-white/5 rounded transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsDateModalOpen(true);
                                            }}
                                            title={t('focus.chooseDate', 'Choose date')}
                                        >
                                            <AnimatePresence mode="wait">
                                                <motion.span 
                                                    key={currentDate.toString() + timeRange}
                                                    initial={{ y: 2, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    exit={{ y: -2, opacity: 0 }}
                                                    transition={{ duration: 0.1 }}
                                                    className="text-[9px] font-bold text-white text-center whitespace-nowrap block"
                                                >
                                                    {dateRangeLabel}
                                                </motion.span>
                                            </AnimatePresence>
                                        </div>

                                        <button onClick={(e) => { e.stopPropagation(); navigateDate(1); }} disabled={timeRange === 'TOTAL'} className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${timeRange === 'TOTAL' ? 'bg-white/5 text-slate-600 border-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white active:scale-90 border-white/5'}`}>
                                            <ChevronRight size={10} />
                                        </button>
                                    </div>

                                    {/* NEW BLUE DATE BUTTON NEXT TO NAVIGATOR */}
                                    <button 
                                        onClick={() => setIsDateModalOpen(true)}
                                        className={cn(
                                            "px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer border active:scale-95",
                                            isCurrentRange
                                                ? "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                                                : "bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20"
                                        )}
                                    >
                                        <CalendarIcon size={12} className={cn(isCurrentRange ? "text-blue-300" : "text-amber-300")} />
                                        <span className={cn(
                                            "text-[10px] font-bold tracking-wide whitespace-nowrap font-mono",
                                            isCurrentRange ? "text-blue-200/90" : "text-amber-200/90"
                                        )}>
                                            {format(currentDate, 'MMMM yyyy', { locale: reactiveI18n.language === 'es' ? es : undefined })}
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Progress Bar (Goal) - Increased Text Size */}
                <div className="px-1 mt-0">
                    <div className="flex justify-between items-end mb-1 px-0.5">
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                            {isNonWorkingDay ? t('focus.stats.break') : showGoal ? "Goal" : "Total Focus"}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            {/* Increased from text-[10px] to text-sm (14px) or text-xs (12px) */}
                            <span className="text-sm font-bold text-white tracking-tight">
                                {Math.floor(currentMinutes / 60)}h {currentMinutes % 60}m
                            </span>
                            
                            {showGoal && (
                                <>
                                    <span className="text-xs font-medium text-white/30">
                                        / {Math.floor(dailyGoalMinutes / 60)}h{dailyGoalMinutes % 60 > 0 ? ` ${dailyGoalMinutes % 60}m` : ''}
                                    </span>
                                    <span className="text-xs font-bold ml-0.5" style={{ color: activeFilterColor }}>
                                        {Math.round(progressPercentage)}%
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {isNonWorkingDay ? (
                        <div className="flex items-center justify-between px-0.5 py-2 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">{t('focus.stats.break')}</span>
                            <span className="text-[11px] font-semibold text-white/70">
                                {nextWorkingLabel 
                                    ? `${reactiveI18n.language === 'es' ? 'Siguiente sesión:' : 'Next session:'} ${nextWorkingLabel}` 
                                    : (reactiveI18n.language === 'es' ? 'Siguiente sesión pronto' : 'Next session soon')}
                            </span>
                        </div>
                    ) : showGoal && (
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div 
                                
                                animate={{ width: `${Math.min(100, progressPercentage)}%` }}
                                transition={{ type: "spring", stiffness: 80, damping: 20 }}
                                className="h-full rounded-full relative overflow-hidden"
                                style={{ 
                                    backgroundColor: activeFilterColor,
                                    boxShadow: `0 0 14px ${activeFilterColor}45`
                                }}
                            >
                                <div className="absolute inset-0 bg-white/10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
                            </motion.div>
                        </div>
                    )}
                    
                    {/* DATE RANGE INDICATOR (Replaces BIO-LIMIT) */}
                    <div className="flex justify-end mt-1">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wide">
                            {dateRangeLabel}
                        </span>
                    </div>
                </div>

                {/* CHART AREA */}
                <BarChart 
                    datasets={stats.datasets.map(d => d.label === 'Total' ? { ...d, color: viewMode === 'TOTAL' ? avatarColor : activeFilterColor } : d)}
                    labels={stats.labels}
                    height={220}
                    max={chartMax}
                    className="mt-0"
                    showBackground={false}
                    showGrid={true}
                    stacked={groupMode !== 'TOTAL'}
                    yTicks={yTicks}
                    yTickFormatter={formatMinutes}
                    xTickInterval={xTickInterval}
                    barSpacing={barSpacing}
                    paddingTop="top-4"
                    tooltipValueFormatter={formatMinutes}
                    tooltipLabelFormatter={(label) => t(label)}
                />
            </div>
            
            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={handleDateSelect}
                mode={timeRange === 'MONTH' ? 'MONTH' : timeRange === 'YEAR' ? 'YEAR' : timeRange === 'WEEK' ? 'WEEK' : 'DAY'}
                currentDate={currentDate}
            />
        </div>
    );
});
