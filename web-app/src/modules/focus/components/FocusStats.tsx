import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Target, Calendar, Lock as LockIcon } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { formatDateRange } from '../../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

export const FocusStats = React.memo(({ projects, attributes, isPro, onShowPro }: { projects: Project[], attributes: Attribute[], isPro?: boolean, onShowPro?: () => void }) => {
    const [timeRange, setTimeRange] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('DAY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterMode, setFilterMode] = useState<'GLOBAL' | string>('GLOBAL'); // 'GLOBAL' or project/attribute ID
    
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

    const isToday = useMemo(() => {
        const today = new Date();
        return currentDate.getDate() === today.getDate() && 
               currentDate.getMonth() === today.getMonth() && 
               currentDate.getFullYear() === today.getFullYear();
    }, [currentDate]);

    return (
        <div className="relative transition-all duration-300 ease-in-out flex-shrink-0">
            <div className="glass-panel rounded-[2rem] p-4 flex flex-col gap-3 relative overflow-hidden">
                 {/* Background Glow */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                 
                {/* HEADER ROW: Stats & Time Range */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tighter">{stats.totalHours}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Hours</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border w-fit ${badgeConfig.color}`}>
                            {badgeConfig.text}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-inner">
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

                {/* CONTROLS ROW: Date Nav & Filters */}
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 backdrop-blur-md flex-shrink-0">
                        <button onClick={() => navigateDate(-1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                            <ChevronLeft size={14} />
                        </button>
                        
                        <div className="w-32 h-8 flex items-center justify-center relative overflow-hidden">
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

                    {/* Reset Today */}
                    {!isToday && (
                        <button onClick={() => setCurrentDate(new Date())} className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 flex items-center justify-center transition-colors border border-blue-500/30">
                            <Calendar size={14} />
                        </button>
                    )}

                    {/* Divider */}
                    <div className="w-[1px] h-8 bg-white/5 flex-shrink-0" />

                    {/* CONTEXT FILTER SCROLL */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mask-gradient-x items-center">
                        <button onClick={() => setFilterMode('GLOBAL')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold whitespace-nowrap transition-all duration-300 ${filterMode === 'GLOBAL' ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                            <LayoutGrid size={10} /> GLOBAL
                        </button>
                        {attributes.map(attr => {
                            const Icon = attr.icon;
                            const isActive = filterMode === attr.id;
                            return (
                                <button key={attr.id} onClick={() => setFilterMode(attr.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold whitespace-nowrap transition-all duration-300 ${isActive ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                                    <Icon size={10} style={{ color: isActive ? 'black' : attr.color }} /> {attr.label.toUpperCase()}
                                </button>
                            )
                        })}
                        {projects.filter(p => !p.deleted).map(proj => {
                            const isActive = filterMode === proj.id;
                            return (
                                <button key={proj.id} onClick={() => setFilterMode(proj.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold whitespace-nowrap transition-all duration-300 ${isActive ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                                    <Target size={10} /> {proj.title.toUpperCase()}
                                </button>
                            )
                        })}
                    </div>
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
                    className="mt-0"
                    barClassName="!rounded-t-md"
                />
            </div>
        </div>
    );
});
