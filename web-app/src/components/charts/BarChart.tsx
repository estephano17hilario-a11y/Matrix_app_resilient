import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const BarChart = React.memo(({ 
    datasets, 
    labels, 
    height = 160,
    max,
    showGrid = true,
    showBackground = true,
    className = "",
    barClassName = "",
    stacked = false
}: { 
    datasets: { data: number[]; color: string; label?: string }[];
    labels: string[];
    height?: number;
    max?: number;
    showGrid?: boolean;
    showBackground?: boolean;
    className?: string;
    barClassName?: string;
    stacked?: boolean;
}) => {
    // If stacked, max should be provided by parent or calculated by summing indices. 
    // Here we assume if max is provided it is correct.
    // If not provided and stacked, we need to calculate max of totals.
    const maxValue = useMemo(() => {
        if (max) return max;
        if (stacked) {
            // Calculate max of sums
            let maxTotal = 0;
            const length = datasets[0]?.data.length || 0;
            for (let i = 0; i < length; i++) {
                const sum = datasets.reduce((acc, ds) => acc + (ds.data[i] || 0), 0);
                if (sum > maxTotal) maxTotal = sum;
            }
            return maxTotal || 1;
        }
        return Math.max(...datasets.flatMap(d => d.data), 1);
    }, [datasets, max, stacked]);

    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{top: number, left: number} | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close tooltip when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setActiveIndex(null);
            }
        };
        if (activeIndex !== null) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeIndex]);

    const handleBarClick = (i: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Stop propagation to prevent document listener from closing immediately if attached
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate position: Center of the bar, slightly above the top
        const top = rect.top + window.scrollY - 10;
        const left = rect.left + window.scrollX + (rect.width / 2);
        
        setActiveIndex(i);
        setTooltipPos({ top, left });
    };
    
    return (
        <div ref={containerRef} className={`w-full relative select-none ${className}`} style={{ height }}>
             {showBackground && (
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-40 rounded-3xl pointer-events-none" />
             )}

             {/* Grid Lines */}
             {showGrid && (
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-10">
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                </div>
             )}

            {/* Portal Tooltip */}
            {activeIndex !== null && tooltipPos && createPortal(
                <div 
                    className="absolute z-[9999] bg-[#1c1c1e] border px-3 py-2 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center gap-1 min-w-[80px] pointer-events-none"
                    style={{ 
                        top: tooltipPos.top, 
                        left: tooltipPos.left, 
                        transform: 'translate(-50%, -100%)',
                        borderColor: datasets[0]?.color || '#3b82f6'
                    }}
                >
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{labels[activeIndex]}</span>
                    {datasets.map((ds, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-black text-white whitespace-nowrap">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ds.color, boxShadow: `0 0 5px ${ds.color}` }} />
                            {ds.data[activeIndex]} <span className="text-[9px] text-white/40 font-bold ml-auto">{ds.label}</span>
                        </div>
                    ))}
                    {/* Tiny Triangle Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]" style={{ borderTopColor: datasets[0]?.color || '#3b82f6' }} />
                </div>,
                document.body
            )}

            <div className="absolute inset-0 flex items-end gap-2 pt-4">
                {labels.map((label, i) => (
                    <div 
                        key={i} 
                        onClick={(e) => handleBarClick(i, e)}
                        className="flex-1 h-full flex flex-col justify-end gap-1 group relative z-10 cursor-pointer"
                    >
                        {/* Bars Container */}
                        <div className={`w-full flex ${stacked ? 'flex-col-reverse justify-start' : 'items-end justify-center'} ${stacked ? 'gap-0' : 'gap-1'} flex-1 relative px-0.5`}>
                            {datasets.map((ds, idx) => {
                                const val = ds.data[i];
                                const h = (val / maxValue);
                                return (
                                    <div 
                                        key={idx} 
                                        className={`${stacked ? 'w-full' : 'w-full h-full'} relative flex items-end justify-center group-hover:brightness-125 transition-all duration-300`}
                                        style={stacked ? { height: `${h * 100}%` } : {}}
                                    >
                                         <div 
                                            className={`w-full ${val > 0 ? 'min-h-[1px]' : 'h-0'} ${stacked ? 'first:rounded-b-sm last:rounded-t-sm' : 'rounded-t-lg'} ${stacked && idx > 0 ? 'border-b border-black/30' : ''} relative overflow-hidden transition-all duration-500 ease-out ${barClassName}`}
                                            style={{ 
                                                height: stacked ? '100%' : `${h * 100}%`,
                                                background: ds.color,
                                            }}
                                         >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                                            {!stacked && <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40" />}
                                            
                                            {/* Inner Shine */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                         </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Label */}
                        <span className={`text-[9px] font-bold text-center mt-2 transition-colors duration-300 ${activeIndex === i ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>{label}</span>
                    </div>
                ))}
            </div>
            </div>
    );
});
