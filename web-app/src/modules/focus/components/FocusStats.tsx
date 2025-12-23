import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Target, Lock as LockIcon, ChevronDown, Layers } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { formatDateRange } from '../../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

export const FocusStats = React.memo(({ projects, attributes, isPro, onShowPro }: { projects: Project[], attributes: Attribute[], isPro?: boolean, onShowPro?: () => void }) => {
    const [timeRange, setTimeRange] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('DAY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterMode, setFilterMode] = useState<'GLOBAL' | string>('GLOBAL'); // 'GLOBAL' or project/attribute ID
    const [activeDropdown, setActiveDropdown] = useState<'NONE' | 'TRAIT' | 'PROJECT'>('NONE');
    
    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeDropdown !== 'NONE' && !(event.target as Element).closest('.dropdown-container')) {
                setActiveDropdown('NONE');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    const activeFilterColor = useMemo(() => {
        if (filterMode === 'GLOBAL') return '#8b5cf6';
        const attr = attributes.find(a => a.id === filterMode);
        if (attr) return attr.color;
        const proj = projects.find(p => p.id === filterMode);
        if (proj) return attributes.find(a => a.id === proj.attribute)?.color || '#fff';
        return '#fff';
    }, [filterMode, attributes, projects]);

    const stats = useMemo(() => generateFocusData(projects, currentDate, timeRange, filterMode), [projects, currentDate, timeRange, filterMode]);
    
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

    // const isToday calculation removed as unused

    // Helper to get active label
    // const activeLabel removed as unused

    return (
        <div className="relative transition-all duration-300 ease-in-out flex-shrink-0 z-50">
            <div className="glass-panel rounded-[2rem] p-4 sm:p-5 flex flex-col gap-2 relative !overflow-visible">
                 {/* Background Glow - Contained */}
                 <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full" />
                 </div>
                 
                {/* HEADER ROW: Stats & Time Range */}
                <div className="flex justify-between items-center relative z-10 w-full">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-baseline gap-1.5 w-[70px] shrink-0">
                            <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tighter">
                                {Math.round(Number(stats.totalHours))}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wide">Hours</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${badgeConfig.color}`}>
                            {badgeConfig.text}
                        </span>
                    </div>

                    <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-md p-0.5 rounded-xl border border-white/5 shadow-inner shrink-0">
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
                                    className={`relative px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black transition-all duration-300 z-10 flex items-center gap-1 ${timeRange === range ? 'text-white' : 'text-slate-500 hover:text-white'} ${isLocked ? 'opacity-50' : ''}`}
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

                {/* CONTROLS ROW: Date Nav & Filters */}
                <div className="flex items-center justify-between gap-2 relative z-20 w-full">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-xl border border-white/5 backdrop-blur-md shrink-0">
                        <button onClick={() => navigateDate(-1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                            <ChevronLeft size={14} />
                        </button>
                        
                        <div className="w-20 sm:w-28 h-7 flex items-center justify-center relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.span 
                                    key={currentDate.toString() + timeRange}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="text-[9px] sm:text-[10px] font-bold text-white text-center absolute whitespace-nowrap"
                                >
                                    {formatDateRange(currentDate, timeRange)}
                                </motion.span>
                            </AnimatePresence>
                        </div>

                        <button onClick={() => navigateDate(1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* NEW FILTER UI */}
                    <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0 dropdown-container">
                        
                        {/* 1. Global Button */}
                        <button 
                            onClick={() => { setFilterMode('GLOBAL'); setActiveDropdown('NONE'); }}
                            className={`h-8 sm:h-9 px-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all duration-300 shrink-0 ${filterMode === 'GLOBAL' ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                        >
                            <LayoutGrid size={14} />
                            <span className="text-[9px] font-bold uppercase hidden sm:inline">Global</span>
                        </button>

                        {/* 2. Trait Dropdown */}
                        <div className="relative min-w-0 shrink">
                            {(() => {
                                const activeTrait = attributes.find(a => a.id === filterMode);
                                const isActive = !!activeTrait;
                                const activeColor = activeTrait?.color;
                                const Icon = activeTrait?.icon || Layers;
                                
                                return (
                                    <>
                                        <button 
                                            onClick={() => setActiveDropdown(activeDropdown === 'TRAIT' ? 'NONE' : 'TRAIT')}
                                            style={{ 
                                                backgroundColor: isActive ? activeColor : undefined,
                                                borderColor: isActive ? activeColor : undefined,
                                                boxShadow: isActive ? `0 0 15px -5px ${activeColor}` : undefined
                                            }}
                                            className={`h-8 sm:h-9 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-300 w-full justify-between ${isActive ? 'text-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Icon size={14} className="shrink-0" />
                                                <span className="text-[9px] font-bold uppercase truncate">
                                                    {activeTrait?.label || 'Traits'}
                                                </span>
                                            </div>
                                            <ChevronDown size={12} className={`transition-transform duration-300 shrink-0 ${activeDropdown === 'TRAIT' ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        <AnimatePresence>
                                            {activeDropdown === 'TRAIT' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                    className={`absolute top-full right-0 mt-1 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden z-[9999] backdrop-blur-3xl p-1 origin-top-right ${attributes.length > 6 ? 'w-56 grid grid-cols-2 gap-1' : 'w-32 flex flex-col gap-0.5'}`}
                                                >
                                                    <div className={`px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider ${attributes.length > 6 ? 'col-span-2' : ''}`}>Select Trait</div>
                                                    {attributes.map(attr => {
                                                        // const AttrIcon = attr.icon || Layers;
                                                        return (
                                                            <button 
                                                                key={attr.id}
                                                                onClick={() => { setFilterMode(attr.id); setActiveDropdown('NONE'); }}
                                                                className={`w-full px-2 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${filterMode === attr.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: attr.color }} />
                                                                <span className="text-[10px] font-medium truncate">{attr.label}</span>
                                                                {filterMode === attr.id && <div className="ml-auto w-1 h-1 rounded-full bg-white shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                );
                            })()}
                        </div>

                        {/* 3. Project Dropdown */}
                        <div className="relative min-w-0 shrink">
                            {(() => {
                                const activeProject = projects.find(p => p.id === filterMode);
                                const isActive = !!activeProject;
                                const projectAttr = activeProject ? attributes.find(a => a.id === activeProject.attribute) : null;
                                const activeColor = projectAttr?.color;
                                const ProjectIcon = projectAttr?.icon || Target;
                                
                                return (
                                    <>
                                        <button 
                                            onClick={() => setActiveDropdown(activeDropdown === 'PROJECT' ? 'NONE' : 'PROJECT')}
                                            style={{ 
                                                backgroundColor: isActive ? activeColor : undefined,
                                                borderColor: isActive ? activeColor : undefined,
                                                boxShadow: isActive ? `0 0 15px -5px ${activeColor}` : undefined
                                            }}
                                            className={`h-8 sm:h-9 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-300 w-full justify-between ${isActive ? 'text-white' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <ProjectIcon size={14} className="shrink-0" />
                                                <span className="text-[9px] font-bold uppercase truncate">
                                                    {activeProject?.title || 'Projects'}
                                                </span>
                                            </div>
                                            <ChevronDown size={12} className={`transition-transform duration-300 shrink-0 ${activeDropdown === 'PROJECT' ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {activeDropdown === 'PROJECT' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                    className="absolute top-full right-0 mt-1 w-36 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden z-[9999] backdrop-blur-3xl p-1 flex flex-col gap-0.5 max-h-[200px] overflow-y-auto origin-top-right"
                                                >
                                                    <div className="px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-[#1c1c1e] z-10">Select Project</div>
                                                    {projects.filter(p => !p.deleted).map(proj => {
                                                        const isActive = filterMode === proj.id;
                                                        const attr = attributes.find(a => a.id === proj.attribute);
                                                        return (
                                                            <button 
                                                                key={proj.id}
                                                                onClick={() => { setFilterMode(proj.id); setActiveDropdown('NONE'); }}
                                                                className={`w-full px-2 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                                            >
                                                                <Target size={10} style={{ color: attr?.color }} />
                                                                <span className="text-[10px] font-medium truncate text-left flex-1">{proj.title}</span>
                                                                {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-white shrink-0" />}
                                                            </button>
                                                        )
                                                    })}
                                                    {projects.filter(p => !p.deleted).length === 0 && (
                                                        <div className="px-2 py-3 text-center text-[9px] text-slate-600">No active projects</div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* CHART AREA */}
                <div className="relative z-10">
                    <BarChart 
                        datasets={[{ 
                            data: stats.data, 
                            color: activeFilterColor, 
                            label: 'Minutes' 
                        }]}
                        labels={stats.labels}
                        height={160}
                        max={Math.max(...stats.data, 60)}
                        className="mt-0"
                        barClassName="!rounded-t-md"
                    />
                </div>
            </div>
        </div>
    );
});
