import React, { useMemo } from 'react';

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
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl flex flex-col items-center gap-1 min-w-[80px] scale-95 group-hover:scale-100 origin-bottom duration-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                            {datasets.map((ds, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs font-black text-white whitespace-nowrap">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ds.color, boxShadow: `0 0 5px ${ds.color}` }} />
                                    {ds.data[i]} <span className="text-[9px] text-white/40 font-bold ml-auto">{ds.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Bars Container */}
                        <div className="w-full flex items-end justify-center gap-1 h-full relative px-0.5">
                            {datasets.map((ds, idx) => {
                                const val = ds.data[i];
                                const h = (val / maxValue);
                                return (
                                    <div key={idx} className="w-full h-full relative rounded-sm overflow-hidden group-hover:brightness-125 bg-white/5 transition-colors">
                                         <div 
                                            className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${barClassName}`}
                                            style={{ 
                                                height: '100%',
                                                backgroundColor: `${ds.color}`, 
                                                opacity: 0.9,
                                                transform: `scaleY(${h})`,
                                                transformOrigin: 'bottom'
                                            }}
                                         >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/50 shadow-[0_0_10px_white]" />
                                         </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Label */}
                        <span className="text-[9px] font-bold text-slate-500 text-center mt-1 group-hover:text-white transition-colors">{label}</span>
                    </div>
                ))}
                </div>
            </div>
    );
});
