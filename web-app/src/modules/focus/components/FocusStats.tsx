import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Target, Layers } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { formatDateRange, getStartOfWeek } from '../../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLux } from '@/context/LuxContext';
import { getAvatarConfig } from '@/config/avatars';
import { DAILY_LIMITS } from '../../dashboard/constants';

export const FocusStats = React.memo(({ projects, attributes, isPro, onShowPro }: { projects: Project[], attributes: Attribute[], isPro?: boolean, onShowPro?: () => void }) => {
    const { user } = useLux();
    const avatarConfig = getAvatarConfig(user?.avatarId);
    const avatarColor = avatarConfig?.themeColor || '#6366f1';
    const [timeRange, setTimeRange] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('DAY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterMode, setFilterMode] = useState<'GLOBAL' | string>('GLOBAL'); // 'GLOBAL' or project/attribute ID
    const [activeDropdown, setActiveDropdown] = useState<'TRAITS' | 'PROJECTS' | 'GLOBAL_OPTIONS' | null>(null);
    
    const [viewMode, setViewMode] = useState<'TOTAL' | 'ATTRIBUTE' | 'PROJECT'>('ATTRIBUTE');
    
    // Reset date when range changes
    useEffect(() => {
        setCurrentDate(new Date());
    }, [timeRange]);

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

    const stats = useMemo(() => generateFocusData(projects, attributes, currentDate, timeRange, filterMode, groupMode), [projects, attributes, currentDate, timeRange, filterMode, groupMode]);
    
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

    const getRangeStart = (d: Date) => {
        const date = new Date(d);
        if (timeRange === 'DAY') {
            date.setHours(0, 0, 0, 0);
            return date;
        }
        if (timeRange === 'WEEK') return getStartOfWeek(date);
        if (timeRange === 'MONTH') {
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            return date;
        }
        date.setMonth(0, 1);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const canNavigateForward = useMemo(() => {
        const nextDate = new Date(currentDate);
        if (timeRange === 'DAY') nextDate.setDate(nextDate.getDate() + 1);
        else if (timeRange === 'WEEK') nextDate.setDate(nextDate.getDate() + 7);
        else if (timeRange === 'MONTH') nextDate.setMonth(nextDate.getMonth() + 1);
        else nextDate.setFullYear(nextDate.getFullYear() + 1);
        return getRangeStart(nextDate).getTime() <= getRangeStart(new Date()).getTime();
    }, [currentDate, timeRange]);

    const navigateDate = (dir: -1 | 1) => {
        const newDate = new Date(currentDate);
        if (timeRange === 'DAY') newDate.setDate(newDate.getDate() + dir);
        else if (timeRange === 'WEEK') newDate.setDate(newDate.getDate() + (dir * 7));
        else if (timeRange === 'MONTH') newDate.setMonth(newDate.getMonth() + dir);
        else newDate.setFullYear(newDate.getFullYear() + dir);
        if (dir === 1 && getRangeStart(newDate).getTime() > getRangeStart(new Date()).getTime()) return;
        setCurrentDate(newDate);
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
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 z-10 min-h-[42px]">
                    <div className="flex flex-col min-w-0">
                        <div className="flex flex-col min-w-0">
                            <span className={`${hoursFontSize} font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tighter transition-all duration-300 whitespace-nowrap leading-none`}>{formattedHours}</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex-shrink-0">Hours</span>
                                {timeRange === 'DAY' && (
                                    <span className="text-[9px] font-mono font-medium text-white/20 border border-white/10 px-1 rounded bg-white/5">
                                        / {DAILY_LIMITS.FOCUS.MAX_HOURS}h MAX
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end flex-shrink-0">
                        <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/5 shadow-sm flex-nowrap origin-right">
                        {['DAY', 'WEEK', 'MONTH', 'YEAR'].map((range) => {
                            return (
                                <button 
                                    key={range} 
                                    onClick={() => { 
                                        setTimeRange(range as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'); 
                                    }} 
                                    className={`relative px-2.5 py-1 rounded-md text-[9px] font-bold transition-all duration-300 z-10 flex items-center gap-1 whitespace-nowrap ${timeRange === range ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {timeRange === range && (
                                        <motion.div 
                                            layoutId="activeRange"
                                            className="absolute inset-0 bg-white/10 rounded-md shadow-sm border border-white/10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    {range}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

                {/* NEW FILTER CONTROLS ROW */}
                <div className="flex flex-col gap-1 z-20">
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
                                        {formatDateRange(currentDate, timeRange)}
                                    </motion.span>
                                </AnimatePresence>
                            </div>

                            <button onClick={() => navigateDate(1)} disabled={!canNavigateForward} className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${canNavigateForward ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white active:scale-90 border-white/5' : 'bg-white/5 text-slate-600 border-white/5 opacity-50 cursor-not-allowed'}`}>
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
                                                <span className="truncate">{attr.label.toUpperCase()}</span>
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
        </div>
    );
});
