import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Target, Lock as LockIcon, Layers } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { formatDateRange } from '../../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidProgressBar } from '../../../components/ui/LiquidProgressBar';

export const FocusStats = React.memo(({ projects, attributes, isPro, onShowPro }: { projects: Project[], attributes: Attribute[], isPro?: boolean, onShowPro?: () => void }) => {
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
        if (filterMode === 'GLOBAL') return 'indigo'; // Indigo
        const activeAttr = attributes.find(a => a.id === filterMode);
        if (activeAttr) return activeAttr.color;
        const activeProj = projects.find(p => p.id === filterMode);
        if (activeProj) {
            const attr = attributes.find(a => a.id === activeProj.attribute);
            return attr ? attr.color : 'indigo';
        }
        return 'indigo'; 
    }, [filterMode, attributes, projects]);

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

    const navigateDate = (dir: -1 | 1) => {
        const newDate = new Date(currentDate);
        if (timeRange === 'DAY') newDate.setDate(newDate.getDate() + dir);
        else if (timeRange === 'WEEK') newDate.setDate(newDate.getDate() + (dir * 7));
        else if (timeRange === 'MONTH') newDate.setMonth(newDate.getMonth() + dir);
        else newDate.setFullYear(newDate.getFullYear() + dir);
        setCurrentDate(newDate);
    };

    return (
        <div className="relative transition-all duration-300 ease-in-out flex-shrink-0">
            {/* Main Panel - Solid Background for Android Stability (No Blur) */}
            <div className="bg-[#121212] rounded-[1.5rem] p-2 flex flex-col gap-1 relative overflow-visible border border-white/5 shadow-2xl">
                 {/* Background Glow - Optimized (Radial Gradient instead of Blur) */}
                 <div 
                    className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20" 
                    style={{ 
                        background: `radial-gradient(circle closest-side, ${activeFilterColor}, transparent)`,
                        transform: 'translateZ(0)', 
                        backfaceVisibility: 'hidden' 
                    }}
                 />
                 
                {/* HEADER ROW: Stats & Time Range */}
                <div className="flex justify-between items-start z-10 min-h-[42px]">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span className={`${hoursFontSize} font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tighter transition-all duration-300`}>{formattedHours}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex-shrink-0">Hours</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">


                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                        {['DAY', 'WEEK', 'MONTH', 'YEAR'].map((range) => {
                            const isLocked = !isPro && (range === 'MONTH' || range === 'YEAR');
                            return (
                                <button 
                                    key={range} 
                                    onClick={() => { 
                                        if (isLocked) {
                                            if (onShowPro) onShowPro();
                                            return;
                                        }
                                        setTimeRange(range as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'); 
                                    }} 
                                    className={`relative px-3 py-1.5 rounded-lg text-[9px] font-black transition-all duration-300 z-10 flex items-center gap-1 ${timeRange === range ? 'text-white' : 'text-slate-500 hover:text-white'} ${isLocked ? 'opacity-50' : ''}`}
                                >
                                    {timeRange === range && (
                                        <motion.div 
                                            layoutId="activeRange"
                                            className="absolute inset-0 bg-white/10 rounded-lg shadow-sm border border-white/10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    {range}
                                    {isLocked && <LockIcon size={8} className="text-amber-400" />}
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

                            <button onClick={() => navigateDate(1)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
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
                                <div className={`bg-black/40 rounded-xl p-3 border border-white/5 backdrop-blur-sm grid gap-2 max-h-[240px] overflow-y-auto ${activeDropdown === 'GLOBAL_OPTIONS' ? 'grid-cols-1' : 'grid-cols-2'}`}>
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

                <div className="px-1 mt-1">
                    <LiquidProgressBar 
                        value={progressPercentage} 
                        color={(['blue', 'cyan', 'gray', 'indigo', 'pink', 'violet', 'emerald', 'rose', 'amber'] as const).includes(activeFilterColor as any) 
                            ? (activeFilterColor as any) 
                            : 'indigo'} 
                    />
                </div>

                {/* CHART AREA */}
                <BarChart 
                    datasets={stats.datasets.map(d => d.label === 'Total' ? { ...d, color: activeFilterColor } : d)}
                    labels={stats.labels}
                    height={160}
                    max={Math.max(stats.max, 60)}
                    className="mt-2"
                    stacked={groupMode !== 'TOTAL'}
                />
            </div>
        </div>
    );
});
