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
    const [activeDropdown, setActiveDropdown] = useState<'TRAITS' | 'PROJECTS' | null>(null);
    
    // Reset date when range changes
    useEffect(() => {
        setCurrentDate(new Date());
    }, [timeRange]);

    const activeFilterColor = useMemo(() => {
        if (filterMode === 'GLOBAL') return '#6366f1'; // Indigo
        const activeAttr = attributes.find(a => a.id === filterMode);
        if (activeAttr) return activeAttr.color;
        const activeProj = projects.find(p => p.id === filterMode);
        if (activeProj) {
            const attr = attributes.find(a => a.id === activeProj.attribute);
            return attr ? attr.color : '#6366f1';
        }
        return '#6366f1'; 
    }, [filterMode, attributes, projects]);

    const activeAttribute = useMemo(() => attributes.find(a => a.id === filterMode), [filterMode, attributes]);
    const activeProject = useMemo(() => projects.find(p => p.id === filterMode), [filterMode, projects]);

    // Helper to extract color name from hex if possible, or default to indigo
    const liquidColor = useMemo(() => {
        // Simplified mapping for liquid bar
        return 'indigo';
    }, [filterMode]);

    const stats = useMemo(() => generateFocusData(projects, currentDate, timeRange, filterMode), [projects, currentDate, timeRange, filterMode]);
    
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
        return stats.data.reduce((a, b) => a + b, 0);
    }, [stats.data]);

    const progressPercentage = dailyGoalMinutes > 0 ? Math.min(100, (currentMinutes / dailyGoalMinutes) * 100) : 0;

    const prevDate = useMemo(() => {
        const d = new Date(currentDate);
        if (timeRange === 'DAY') d.setDate(d.getDate() - 1);
        else if (timeRange === 'WEEK') d.setDate(d.getDate() - 7);
        else if (timeRange === 'MONTH') d.setMonth(d.getMonth() - 1);
        else d.setFullYear(d.getFullYear() - 1);
        return d;
    }, [currentDate, timeRange]);

    const prevStats = useMemo(() => generateFocusData(projects, prevDate, timeRange, filterMode), [projects, prevDate, timeRange, filterMode]);

    const badgeConfig = useMemo(() => {
        const current = parseFloat(stats.totalHours);
        const previous = parseFloat(prevStats.totalHours);
        let val = 0;
        if (previous === 0) val = current > 0 ? 100 : 0;
        else val = ((current - previous) / previous) * 100;

        const text = `${val > 0 ? '+' : ''}${val.toFixed(0)}% vs last`;
        
        if (val > 10) {
            return { color: 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]', text };
        } else if (val < -10) {
            return { color: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]', text };
        } else {
            return { color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', text };
        }
    }, [stats.totalHours, prevStats.totalHours]);

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
            <div className="bg-[#121212] rounded-[2rem] p-4 flex flex-col gap-3 relative overflow-visible border border-white/5 shadow-2xl">
                 {/* Background Glow - Optimized */}
                 <div 
                    className="absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20" 
                    style={{ background: activeFilterColor, transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                 />
                 
                {/* HEADER ROW: Stats & Time Range */}
                <div className="flex justify-between items-start z-10">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tighter">{stats.totalHours}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Hours</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border w-fit ${badgeConfig.color}`}>
                            {badgeConfig.text}
                        </span>
                        {timeRange === 'DAY' && (
                            <div className="mt-2 w-full h-1.5 bg-gray-800/50 rounded-full overflow-hidden shadow-inner border border-white/5">
                                <LiquidProgressBar percentage={progressPercentage} color={liquidColor} />
                            </div>
                        )}
                    </div>

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

                {/* NEW FILTER CONTROLS ROW */}
                <div className="flex flex-col gap-2 z-20">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                        {/* 1. Date Navigation */}
                        <div className="flex items-center justify-between gap-1 bg-black/20 p-1 rounded-xl border border-white/5 w-full sm:w-auto flex-shrink-0">
                            <button onClick={() => navigateDate(-1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                                <ChevronLeft size={14} />
                            </button>
                            
                            <div className="flex-1 sm:w-[100px] h-8 flex items-center justify-center relative overflow-hidden px-2">
                                <AnimatePresence mode="wait">
                                    <motion.span 
                                        key={currentDate.toString() + timeRange}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -20, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="text-[10px] font-bold text-white text-center absolute whitespace-nowrap"
                                    >
                                        {formatDateRange(currentDate, timeRange)}
                                    </motion.span>
                                </AnimatePresence>
                            </div>

                            <button onClick={() => navigateDate(1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Filter Buttons Group */}
                        <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto sm:flex-1">
                            {/* 2. Global Filter Box */}
                            <button 
                                onClick={() => { setFilterMode('GLOBAL'); setActiveDropdown(null); }}
                                className={`h-10 px-2 sm:px-4 rounded-xl border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center ${filterMode === 'GLOBAL' ? 'bg-white text-black border-white shadow-lg shadow-white/10' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'}`}
                            >
                                GLOBAL
                            </button>

                            {/* 3. Trait Filter Box */}
                            <button 
                                onClick={() => setActiveDropdown(activeDropdown === 'TRAITS' ? null : 'TRAITS')}
                                className={`h-10 px-2 sm:px-4 rounded-xl border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 ${activeAttribute ? '' : (activeDropdown === 'TRAITS' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white')}`}
                                style={activeAttribute ? { backgroundColor: activeAttribute.color, borderColor: activeAttribute.color, color: 'white', boxShadow: `0 0 15px -5px ${activeAttribute.color}` } : {}}
                            >
                                {activeAttribute ? <activeAttribute.icon size={12} className="sm:w-3.5 sm:h-3.5" /> : <Layers size={12} className="sm:w-3.5 sm:h-3.5" />}
                                <span className="truncate max-w-[60px] sm:max-w-none">{activeAttribute ? activeAttribute.label.toUpperCase() : 'TRAITS'}</span>
                            </button>

                            {/* 4. Project Filter Box */}
                            <button 
                                onClick={() => setActiveDropdown(activeDropdown === 'PROJECTS' ? null : 'PROJECTS')}
                                className={`h-10 px-2 sm:px-4 rounded-xl border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 ${activeProject ? '' : (activeDropdown === 'PROJECTS' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white')}`}
                                style={activeProject ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: 'white', boxShadow: '0 0 15px -5px #6366f1' } : {}}
                            >
                                <Target size={12} className="sm:w-3.5 sm:h-3.5" />
                                <span className="truncate max-w-[60px] sm:max-w-none">{activeProject ? activeProject.title.toUpperCase() : 'PROJECTS'}</span>
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
                                <div className="bg-black/40 rounded-xl p-3 border border-white/5 backdrop-blur-sm grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto">
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

                {/* CHART AREA */}
                <BarChart 
                    datasets={[{ 
                        data: stats.data, 
                        color: activeFilterColor, 
                        label: 'Minutes' 
                    }]}
                    labels={stats.labels}
                    height={160}
                    max={Math.max(...stats.data, 60)}
                    className="mt-2"
                    barClassName="!rounded-t-md"
                />
            </div>
        </div>
    );
});
