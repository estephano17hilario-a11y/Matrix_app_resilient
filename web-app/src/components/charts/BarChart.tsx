import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export const BarChart = React.memo(({ 
    datasets, 
    labels, 
    height = 160,
    max,
    showGrid = true,
    className = "",
    barClassName = ""
}: { 
    datasets: { data: number[]; color: string; label?: string }[];
    labels: string[];
    height?: number;
    max?: number;
    showGrid?: boolean;
    className?: string;
    barClassName?: string;
}) => {
    const maxValue = useMemo(() => max || Math.max(...datasets.flatMap(d => d.data), 1), [datasets, max]);
    
    return (
        <div className={`w-full relative select-none ${className}`} style={{ height }}>
             {/* Apple Intelligence Aura Background */}
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-3xl opacity-50 rounded-full pointer-events-none" />

             {/* Grid Lines */}
             {showGrid && (
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-10">
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                </div>
             )}

            <div className="absolute inset-0 flex items-end gap-2 pt-4">
                {labels.map((label, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col justify-end gap-1 group relative z-10">
                        {/* Tooltip */}
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center gap-1 min-w-[80px] scale-95 group-hover:scale-100 origin-bottom duration-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                            {datasets.map((ds, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs font-black text-white whitespace-nowrap">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ds.color, boxShadow: `0 0 5px ${ds.color}` }} />
                                    {ds.data[i]} <span className="text-[9px] text-white/40 font-bold ml-auto">{ds.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Bars Container */}
                        <div className="w-full flex items-end justify-center gap-1 flex-1 relative px-0.5">
                            {datasets.map((ds, idx) => {
                                const val = ds.data[i];
                                const h = (val / maxValue);
                                return (
                                    <div key={idx} className="w-full h-full relative flex items-end justify-center group-hover:brightness-125 transition-all duration-300">
                                         <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: `${h * 100}%`, opacity: 1 }}
                                            transition={{ 
                                                type: "spring", 
                                                stiffness: 200, 
                                                damping: 20, 
                                                delay: i * 0.03 
                                            }}
                                            className={`w-full min-h-[4px] rounded-t-lg relative overflow-hidden ${barClassName}`}
                                            style={{ 
                                                background: `linear-gradient(to top, ${ds.color}40, ${ds.color})`,
                                                boxShadow: `0 0 20px ${ds.color}40`
                                            }}
                                         >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/60 shadow-[0_0_10px_white]" />
                                            
                                            {/* Inner Shine */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                         </motion.div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Label */}
                        <span className="text-[9px] font-bold text-slate-500 text-center mt-2 group-hover:text-white transition-colors duration-300">{label}</span>
                    </div>
                ))}
                </div>
            </div>
    );
});
