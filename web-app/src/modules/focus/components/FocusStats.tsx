import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Target, Layers, Plus, Check } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { 
    format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
    subWeeks, addWeeks, subMonths, addMonths, addYears, addDays 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useLux } from '@/context/LuxContext';
import { getAvatarConfig } from '@/config/avatars';
import { useTranslation } from 'react-i18next';
import { DAILY_LIMITS } from '../../dashboard/constants';
import { FocusLimits } from '../FocusLimits';

type TimeRange = 'DAY' | 'WEEK' | '8_WEEKS' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';

const ALL_RANGES: { value: TimeRange; label: string }[] = [
    { value: 'DAY', label: 'Hoy' },
    { value: 'WEEK', label: 'Semana' },
    { value: '8_WEEKS', label: '8 Semanas' },
    { value: 'MONTH', label: 'Mes' },
    { value: '3_MONTHS', label: '3 Meses' },
    { value: 'YEAR', label: 'Año' },
    { value: 'TOTAL', label: 'Total' }
];

export const FocusStats = React.memo(({ projects, attributes }: { projects: Project[], attributes: Attribute[] }) => {
    const { user } = useLux();
    const dailyLimits = user?.dailyLimits || { date: '', taskXp: 0, taskGold: 0, taskTraitPoints: 0, habitsCompleted: 0, focusSeconds: 0 };
    const { t } = useTranslation();
    const avatarConfig = getAvatarConfig(user?.avatarId);
    const avatarColor = avatarConfig?.themeColor || '#6366f1';
    
    const [timeRange, setTimeRange] = useState<TimeRange>('DAY');
    const [pinnedRanges, setPinnedRanges] = useState<TimeRange[]>(['DAY', 'WEEK', 'MONTH']);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterMode, setFilterMode] = useState<'GLOBAL' | string>('GLOBAL'); // 'GLOBAL' or project/attribute ID
    const [activeDropdown, setActiveDropdown] = useState<'TRAITS' | 'PROJECTS' | 'GLOBAL_OPTIONS' | null>(null);
    
    const [viewMode, setViewMode] = useState<'TOTAL' | 'ATTRIBUTE' | 'PROJECT'>('ATTRIBUTE');
    
    // Reset date when range changes
    useEffect(() => {
        setCurrentDate(new Date());
    }, [timeRange]);

    const handleTabClick = (range: TimeRange) => {
        setTimeRange(range);
        if (!pinnedRanges.includes(range)) {
            if (pinnedRanges.length >= 3) {
                setPinnedRanges([range, ...pinnedRanges.slice(0, 2)]);
            } else {
                setPinnedRanges([range, ...pinnedRanges]);
            }
        }
        setIsConfigOpen(false);
    };

    const activeFilterColor = useMemo(() => {
        if (filterMode === 'GLOBAL') return avatarColor;
        const activeAttr = attributes.find(a => a.id === filterMode);
        if (activeAttr) return activeAttr.color;
        const activeProj = projects.find(p => p.id === filterMode);
        if (activeProj) {
            const attr = attributes.find(a => a.id === activeProj.attribute);
            return attr ? attr.color : '#6366f1';
        }
        return '#6366f1'; 
    }, [filterMode, attributes, projects, avatarColor]);

    const activeAttribute = useMemo(() => attributes.find(a => a.id === filterMode), [filterMode, attributes]);
    const activeProject = useMemo(() => projects.find(p => p.id === filterMode), [filterMode, projects]);

    const groupMode = useMemo(() => {
        if (filterMode === 'GLOBAL') return viewMode;
        const isAttr = attributes.some(a => a.id === filterMode);
        if (isAttr) return 'PROJECT';
        return 'TOTAL';
    }, [filterMode, attributes, viewMode]);

    const stats = useMemo(() => {
        const data = generateFocusData(projects, attributes, currentDate, timeRange, filterMode, groupMode);
        // Debug logging for stats generation
        const totalMinutes = data.datasets.reduce((acc, ds) => acc + ds.data.reduce((a, b) => a + b, 0), 0);
        console.log(`📊 FocusStats Generated: Range=${timeRange}, Total=${totalMinutes}m, Projects=${projects.length}`);
        return data;
    }, [projects, attributes, currentDate, timeRange, filterMode, groupMode]);
    
    const dailyGoalMinutes = useMemo(() => {
        if (timeRange !== 'DAY') return 0;
        return projects.reduce((acc, p) => {
            if (!p.deleted && !p.archived && p.goalFrequency === 'DAILY') {
                return acc + (p.goalTarget || 0);
            }
            return acc;
        }, 0) || 240; // Default 4 hours
    }, [projects, timeRange]);

    const currentMinutes = useMemo(() => {
        return stats.datasets.reduce((acc, ds) => acc + ds.data.reduce((a, b) => a + b, 0), 0);
    }, [stats.datasets]);

    const progressPercentage = dailyGoalMinutes > 0 ? Math.min(100, (currentMinutes / dailyGoalMinutes) * 100) : 0;

    const formattedHours = useMemo(() => {
        const num = parseFloat(stats.totalHours);
        return isNaN(num) ? "0" : Math.floor(num).toString();
    }, [stats.totalHours]);

    const hoursFontSize = useMemo(() => {
        const len = formattedHours.length;
        if (len > 6) return 'text-xl';
        if (len > 4) return 'text-2xl';
        return 'text-3xl';
    }, [formattedHours]);

    const dateRangeLabel = useMemo(() => {
        let start: Date, end: Date;
        if (timeRange === 'DAY') {
            return format(currentDate, 'd MMMM yyyy', { locale: es });
        } else if (timeRange === 'WEEK') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
        } else if (timeRange === '8_WEEKS') {
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            start = subWeeks(end, 7);
            start = startOfWeek(start, { weekStartsOn: 1 });
            return `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
        } else if (timeRange === 'MONTH') {
            start = startOfMonth(currentDate);
            return format(start, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());
        } else if (timeRange === '3_MONTHS') {
            end = endOfMonth(currentDate);
            start = subMonths(startOfMonth(end), 2);
            return `${format(start, 'MMM')} - ${format(end, 'MMM yyyy', { locale: es })}`;
        } else if (timeRange === 'YEAR') {
            return format(currentDate, 'yyyy');
        } else {
             return 'Histórico Completo';
        }
    }, [timeRange, currentDate]);

    const navigateDate = (dir: -1 | 1) => {
        if (timeRange === 'DAY') setCurrentDate(d => addDays(d, dir));
        else if (timeRange === 'WEEK') setCurrentDate(d => addWeeks(d, dir));
        else if (timeRange === '8_WEEKS') setCurrentDate(d => addWeeks(d, dir * 8));
        else if (timeRange === 'MONTH') setCurrentDate(d => addMonths(d, dir));
        else if (timeRange === '3_MONTHS') setCurrentDate(d => addMonths(d, dir * 3));
        else if (timeRange === 'YEAR') setCurrentDate(d => addYears(d, dir));
    };

    const { chartMax, yTicks } = useMemo(() => {
        const base = Math.max(stats.max * 1.15, 60);
        const steps = [15, 30, 60, 90, 120, 180, 240, 360, 480, 720, 960];
        const maxTicks = 5;
        const step = steps.find((s) => Math.ceil(base / s) <= maxTicks - 1) || steps[steps.length - 1];
        const maxValue = Math.ceil(base / step) * step;
        const ticks = Array.from({ length: Math.floor(maxValue / step) + 1 }, (_, i) => i * step);
        return { chartMax: maxValue, yTicks: ticks };
    }, [stats.max]);

    const formatMinutes = (mins: number) => {
        if (mins <= 0) return '0h';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (m === 0) return `${h}h`;
        if (h === 0) return `${m}m`;
        return `${h}h${m}m`;
    };

    return (
        <div className="relative transition-all duration-300 ease-in-out flex-shrink-0">
            <div className="bg-gray-900/70 bg-gradient-to-b from-white/5 to-transparent rounded-[32px] p-5 flex flex-col gap-2 relative overflow-visible border border-white/10 shadow-md group ring-1 ring-white/5">
                 <div className="absolute top-0 right-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(99,102,241,0.18)_0%,_transparent_60%)]" />
                 <div className="absolute bottom-0 left-0 w-64 h-64 -z-10 pointer-events-none opacity-60 bg-[radial-gradient(circle,_rgba(16,185,129,0.12)_0%,_transparent_60%)]" />
                 
                {/* HEADER ROW: Stats & Time Range */}
                <div className="flex justify-between items-start z-50 min-h-[42px] relative">
                    <div className="flex flex-col min-w-0">
                        <span className={`${hoursFontSize} font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tighter transition-all duration-300 whitespace-nowrap leading-none`}>{formattedHours}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex-shrink-0">Hours</span>
                    </div>

                    {/* NEW CONFIGURABLE TIME RANGE TABS */}
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg relative">
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
                                            "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all relative overflow-hidden whitespace-nowrap",
                                            isActive 
                                                ? "bg-white text-black shadow-lg scale-105 z-10" 
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

                        <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                        <div className="relative">
                            <button
                                onClick={() => setIsConfigOpen(!isConfigOpen)}
                                className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                    isConfigOpen 
                                        ? "bg-white/20 text-white rotate-45" 
                                        : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <Plus size={14} />
                            </button>

                            <AnimatePresence>
                                {isConfigOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                        className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] p-1"
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
                </div>

                {/* NEW FILTER CONTROLS ROW */}
                <div className="flex flex-col gap-1 z-20 mt-2">
                    <div className="flex items-center gap-1 w-full overflow-hidden">
                        {/* 1. Date Navigation - Compact Left */}
                        <div className="flex items-center justify-between gap-1 bg-black/20 p-0.5 rounded-lg border border-white/5 flex-shrink-0 min-w-[120px] max-w-[140px]">
                            <button onClick={() => navigateDate(-1)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                                <ChevronLeft size={12} />
                            </button>
                            
                            <div className="flex-1 h-6 flex items-center justify-center relative overflow-hidden px-1">
                                <AnimatePresence mode="wait">
                                    <motion.span 
                                        key={currentDate.toString() + timeRange}
                                        initial={{ y: 5, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -5, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 25, mass: 0.5 }}
                                        className="text-[9px] font-bold text-white text-center absolute whitespace-nowrap"
                                    >
                                        {dateRangeLabel}
                                    </motion.span>
                                </AnimatePresence>
                            </div>

                            <button onClick={() => navigateDate(1)} disabled={timeRange === 'TOTAL'} className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${timeRange === 'TOTAL' ? 'bg-white/5 text-slate-600 border-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white active:scale-90 border-white/5'}`}>
                                <ChevronRight size={12} />
                            </button>
                        </div>

                        {/* Filter Buttons Group - Compact Right - Flexible */}
                        <div className="flex flex-1 gap-1 min-w-0">
                            {/* 2. Global Filter Box */}
                            <button 
                                onClick={() => { 
                                    setFilterMode('GLOBAL'); 
                                    setActiveDropdown(activeDropdown === 'GLOBAL_OPTIONS' ? null : 'GLOBAL_OPTIONS'); 
                                }}
                                className={`h-8 px-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center flex-1 min-w-0 ${filterMode === 'GLOBAL' ? 'bg-white text-black border-white shadow-lg shadow-white/10' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'}`}
                            >
                                <span className="truncate">GLOBAL</span>
                            </button>

                            {/* 3. Trait Filter Box */}
                            <button 
                                onClick={() => setActiveDropdown(activeDropdown === 'TRAITS' ? null : 'TRAITS')}
                                className={`h-8 px-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 flex-1 min-w-0 ${activeAttribute ? '' : (activeDropdown === 'TRAITS' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white')}`}
                                style={activeAttribute ? { backgroundColor: activeAttribute.color, borderColor: activeAttribute.color, color: 'white', boxShadow: `0 0 10px -5px ${activeAttribute.color}` } : {}}
                            >
                                {activeAttribute ? <activeAttribute.icon size={10} className="shrink-0" /> : <Layers size={10} className="shrink-0" />}
                                <span className="truncate">{activeAttribute ? activeAttribute.label.toUpperCase() : 'TRAITS'}</span>
                            </button>

                            {/* 4. Project Filter Box */}
                            <button 
                                onClick={() => setActiveDropdown(activeDropdown === 'PROJECTS' ? null : 'PROJECTS')}
                                className={`h-8 px-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 flex-1 min-w-0 ${activeProject ? '' : (activeDropdown === 'PROJECTS' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white')}`}
                                style={activeProject ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: 'white', boxShadow: '0 0 10px -5px #6366f1' } : {}}
                            >
                                <Target size={10} className="shrink-0" />
                                <span className="truncate">{activeProject ? activeProject.title.toUpperCase() : 'PROJECTS'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Expandable Dropdown Panel */}
                    <AnimatePresence>
                        {activeDropdown && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="overflow-hidden"
                            >
                                <div className={`bg-black/40 rounded-xl p-3 border border-white/5 grid gap-2 max-h-[240px] overflow-y-auto ${activeDropdown === 'GLOBAL_OPTIONS' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {activeDropdown === 'GLOBAL_OPTIONS' && (
                                        <>
                                            <button 
                                                onClick={() => { setViewMode('TOTAL'); setActiveDropdown(null); }}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[10px] font-bold transition-all ${viewMode === 'TOTAL' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <div className={`w-3.5 h-3.5 rounded-[2px] ${viewMode === 'TOTAL' ? 'bg-black' : 'bg-indigo-400'}`} />
                                                <span className="truncate">SIN DIVIDIR</span>
                                            </button>
                                            
                                            <button 
                                                onClick={() => { setViewMode('ATTRIBUTE'); setActiveDropdown(null); }}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[10px] font-bold transition-all ${viewMode === 'ATTRIBUTE' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <Layers size={14} className={viewMode === 'ATTRIBUTE' ? 'text-black' : 'text-indigo-400'} />
                                                <span className="truncate">DIVIDIR POR RASGO</span>
                                            </button>

                                            <button 
                                                onClick={() => { setViewMode('PROJECT'); setActiveDropdown(null); }}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[10px] font-bold transition-all ${viewMode === 'PROJECT' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <Target size={14} className={viewMode === 'PROJECT' ? 'text-black' : 'text-indigo-400'} />
                                                <span className="truncate">DIVIDIR POR PROYECTO</span>
                                            </button>
                                        </>
                                    )}
                                    {activeDropdown === 'TRAITS' && attributes.map(attr => {
                                        const Icon = attr.icon;
                                        const isActive = filterMode === attr.id;
                                        return (
                                            <button 
                                                key={attr.id} 
                                                onClick={() => { setFilterMode(attr.id); setActiveDropdown(null); }}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[10px] font-bold transition-all ${isActive ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <Icon size={14} style={{ color: isActive ? 'black' : attr.color }} /> 
                                                <span className="truncate">{t(attr.label, attr.label).toUpperCase()}</span>
                                            </button>
                                        );
                                    })}

                                    {activeDropdown === 'PROJECTS' && projects.filter(p => !p.deleted).map(proj => {
                                        const isActive = filterMode === proj.id;
                                        return (
                                            <button 
                                                key={proj.id} 
                                                onClick={() => { setFilterMode(proj.id); setActiveDropdown(null); }}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[10px] font-bold transition-all ${isActive ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <Target size={14} className={isActive ? 'text-black' : 'text-indigo-400'} />
                                                <span className="truncate">{proj.title.toUpperCase()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Progress Bar */}
                <div className="px-1 mt-1 mb-0.5">
                    <div className="flex justify-between items-end mb-1 px-0.5">
                        <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Goal</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-bold text-white tracking-tight">
                                {Math.floor(currentMinutes / 60)}h {currentMinutes % 60}m
                            </span>
                            <span className="text-[9px] font-medium text-white/30">
                                / {Math.floor(dailyGoalMinutes / 60)}h{dailyGoalMinutes % 60 > 0 ? ` ${dailyGoalMinutes % 60}m` : ''}
                            </span>
                            <span className="text-[9px] font-bold ml-0.5" style={{ color: activeFilterColor }}>
                                {Math.round(progressPercentage)}%
                            </span>
                        </div>
                    </div>
                    
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, progressPercentage)}%` }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            className="h-full rounded-full relative"
                            style={{ 
                                backgroundColor: activeFilterColor,
                                boxShadow: `0 0 8px ${activeFilterColor}50`
                            }}
                        >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]" />
                        </motion.div>
                    </div>
                    
                    {/* BIO-LIMIT INDICATOR (Discrete) */}
                    <div className="flex justify-end mt-1">
                        <span className={`text-[8px] font-mono ${parseFloat(stats.totalHours) >= DAILY_LIMITS.FOCUS.MAX_HOURS ? 'text-red-500 font-bold' : 'text-white/20'}`}>
                            BIO-LIMIT: {parseFloat(stats.totalHours).toFixed(1)}/{DAILY_LIMITS.FOCUS.MAX_HOURS}h
                        </span>
                    </div>
                </div>

                {/* CHART AREA */}
                <BarChart 
                    datasets={stats.datasets.map(d => d.label === 'Total' ? { ...d, color: activeFilterColor } : d)}
                    labels={stats.labels}
                    height={160}
                    max={chartMax}
                    className="mt-2"
                    showBackground={false}
                    stacked={groupMode !== 'TOTAL'}
                    yTicks={yTicks}
                    yTickFormatter={formatMinutes}
                />
            </div>
            
            {/* LIMITS - OUTSIDE CHART - BELOW */}
            <div className="mt-2 px-2">
                    <FocusLimits dailyLimits={dailyLimits} />
            </div>
        </div>
    );
});
