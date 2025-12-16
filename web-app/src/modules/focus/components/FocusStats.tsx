import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Target, Calendar } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { formatDateRange } from '../../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

export const FocusStats = React.memo(({ projects, attributes }: { projects: Project[], attributes: Attribute[] }) => {
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
        <div className="relative transition-all duration-700 ease-in-out mb-4 flex-shrink-0">
            <div className="glass-panel rounded-[2rem] p-5 flex flex-col gap-6 relative overflow-hidden">
                 {/* Background Glow */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                 
                {/* VIEW CONTROLS */}
                        <div className="flex flex-col gap-4">
                            {/* Top Row: Time Range Selector */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                    {['DAY', 'WEEK', 'MONTH', 'YEAR'].map((range) => (
                                        <button 
                                            key={range} 
                                            onClick={() => { setTimeRange(range as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'); }} 
                                            className={`relative px-4 py-2 rounded-xl text-[10px] font-black transition-all duration-300 z-10 ${timeRange === range ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            {timeRange === range && (
                                                <motion.div 
                                                    layoutId="activeRange"
                                                    className="absolute inset-0 bg-white/10 rounded-xl shadow-sm border border-white/10"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            {range}
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Date Navigation */}
                                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                                    <button onClick={() => navigateDate(-1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                                        <ChevronLeft size={18} />
                                    </button>
                                    
                                    <div className="flex flex-col items-center justify-center w-32 h-10 relative overflow-hidden">
                                        <AnimatePresence mode="wait">
                                            <motion.span 
                                                key={currentDate.toString() + timeRange}
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -20, opacity: 0 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                className="text-xs font-bold text-white text-center absolute"
                                            >
                                                {formatDateRange(currentDate, timeRange)}
                                            </motion.span>
                                        </AnimatePresence>
                                    </div>

                                    <button onClick={() => navigateDate(1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-90 border border-white/5">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Reset to Today (if not today) */}
                            {!isToday && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex justify-center">
                                    <button onClick={() => setCurrentDate(new Date())} className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-500/30 transition-colors border border-blue-500/30">
                                        <Calendar size={10} /> Back to Today
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* CONTEXT FILTER SCROLL */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 mask-gradient-x">
                            <button onClick={() => setFilterMode('GLOBAL')} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${filterMode === 'GLOBAL' ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                                <LayoutGrid size={12} /> GLOBAL
                            </button>
                            {attributes.map(attr => {
                                const Icon = attr.icon;
                                const isActive = filterMode === attr.id;
                                return (
                                    <button key={attr.id} onClick={() => setFilterMode(attr.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${isActive ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                                        <Icon size={12} style={{ color: isActive ? 'black' : attr.color }} /> {attr.label.toUpperCase()}
                                    </button>
                                )
                            })}
                            <div className="w-[1px] h-6 bg-white/10 mx-1 self-center" />
                            {projects.map(proj => {
                                const isActive = filterMode === proj.id;
                                return (
                                    <button key={proj.id} onClick={() => setFilterMode(proj.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all duration-300 ${isActive ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}>
                                        <Target size={12} /> {proj.title.toUpperCase()}
                                    </button>
                                )
                            })}
                        </div>

                        {/* HEADER STATS */}
                        <div className="flex items-baseline gap-3 px-1">
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tighter">{stats.totalHours}</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hours Focus</span>
                            <span className="text-[10px] font-bold text-green-400 ml-auto bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]">+12% vs last</span>
                        </div>

                        {/* CHART AREA */}
                        <BarChart 
                            datasets={[{ 
                                data: stats.data, 
                                color: activeFilterColor, 
                                label: 'Minutes' 
                            }]}
                            labels={stats.labels}
                            height={180}
                            max={Math.max(...stats.data, 60)}
                            className="mt-2"
                            barClassName="!rounded-t-lg"
                        />
                    </div>
        </div>
    );
});
