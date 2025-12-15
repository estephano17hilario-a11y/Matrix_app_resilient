import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Target } from 'lucide-react';
import { Project, Attribute } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { generateFocusData } from '../../../utils/dataEngine';
import { formatDateRange } from '../../../utils/dateUtils';

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

    const stats = useMemo(() => generateFocusData(currentDate, timeRange, filterMode), [currentDate, timeRange, filterMode]);
    
    const navigateDate = (dir: -1 | 1) => {
        const newDate = new Date(currentDate);
        if (timeRange === 'DAY') newDate.setDate(newDate.getDate() + dir);
        else if (timeRange === 'WEEK') newDate.setDate(newDate.getDate() + (dir * 7));
        else if (timeRange === 'MONTH') newDate.setMonth(newDate.getMonth() + dir);
        else newDate.setFullYear(newDate.getFullYear() + dir);
        setCurrentDate(newDate);
    };

    return (
        <div className="relative transition-all duration-700 ease-in-out mb-4 flex-shrink-0">
            <div className="glass-panel rounded-[2rem] p-4 flex flex-col gap-4">
                {/* VIEW CONTROLS */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
                                {['DAY', 'WEEK', 'MONTH', 'YEAR'].map((range) => (
                                    <button key={range} onClick={() => { setTimeRange(range as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${timeRange === range ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>{range}</button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => navigateDate(-1)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"><ChevronLeft size={16} /></button>
                                <span className="text-xs font-bold w-24 text-center date-slide-enter" key={currentDate.toString()}>{formatDateRange(currentDate, timeRange)}</span>
                                <button onClick={() => navigateDate(1)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        {/* CONTEXT FILTER SCROLL */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                            <button onClick={() => setFilterMode('GLOBAL')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all ${filterMode === 'GLOBAL' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                <LayoutGrid size={12} /> GLOBAL
                            </button>
                            {attributes.map(attr => {
                                const Icon = attr.icon;
                                return (
                                    <button key={attr.id} onClick={() => setFilterMode(attr.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all ${filterMode === attr.id ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                        <Icon size={12} style={{ color: filterMode === attr.id ? 'black' : attr.color }} /> {attr.label.toUpperCase()}
                                    </button>
                                )
                            })}
                            <div className="w-[1px] h-6 bg-white/10 mx-1" />
                            {projects.map(proj => (
                                <button key={proj.id} onClick={() => setFilterMode(proj.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all ${filterMode === proj.id ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                    <Target size={12} /> {proj.title.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* HEADER STATS */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white tracking-tight">{stats.totalHours}</span>
                            <span className="text-xs font-bold text-slate-500 uppercase">Hours Focus</span>
                            <span className="text-[10px] font-bold text-green-400 ml-auto bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">+12% vs last</span>
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
                            className="mt-4"
                            barClassName="!rounded-t-sm"
                        />
                    </div>
        </div>
    );
});
