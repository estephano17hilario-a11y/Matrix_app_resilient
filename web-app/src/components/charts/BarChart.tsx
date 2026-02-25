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
    stacked = false,
    yTicks,
    yTickFormatter
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
    yTicks?: number[];
    yTickFormatter?: (value: number) => string;
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

            {showGrid && !yTicks && (
                <div className="absolute inset-x-0 top-4 bottom-6 flex flex-col justify-between pointer-events-none opacity-10">
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                </div>
             )}

            {showGrid && yTicks && (
                <div className="absolute inset-x-0 top-2 bottom-4 pointer-events-none">
                    {yTicks.map((val) => (
                        <div
                            key={val}
                            className="absolute left-6 right-0 border-t border-dashed border-white/15"
                            style={{ top: `${100 - (val / maxValue) * 100}%` }}
                        >
                            <span className="absolute -top-1.5 -left-6 w-6 text-right pr-1 text-[9px] text-slate-500 font-mono">
                                {yTickFormatter ? yTickFormatter(val) : val}
                            </span>
                        </div>
                    ))}
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

            <div className={`absolute inset-0 flex items-end gap-1 ${yTicks ? 'pl-6' : ''}`}>
                {labels.map((label, i) => (
                    <div 
                        key={i} 
                        onClick={(e) => handleBarClick(i, e)}
                        className="flex-1 h-full relative group z-10 cursor-pointer"
                    >
                        {/* Bars Container */}
                        <div className="absolute top-2 bottom-4 left-0 right-0 px-0.5">
                            <div className={`w-full h-full flex ${stacked ? 'flex-col-reverse justify-start' : 'items-end justify-center'} ${stacked ? 'gap-0' : 'gap-1'}`} style={{ perspective: '700px' }}>
                                {datasets.map((ds, idx) => {
                                    const val = ds.data[i];
                                    const h = (val / maxValue);
                                    
                                    // Calculate if this is the top visible segment for stacked charts
                                    // We need to know which is the highest index that has value > 0 for this column
                                    const isTopVisible = stacked 
                                        ? idx === datasets.reduce((last, d, currIdx) => (d.data[i] > 0 ? currIdx : last), -1)
                                        : true; // Non-stacked always gets rounded top

                                    // Minimum rounding as requested (2px)
                                    const roundingClass = stacked
                                        ? (isTopVisible ? 'rounded-t-[2px]' : 'rounded-none')
                                        : 'rounded-t-[2px]';

                                    // const isTopSegment = !stacked || idx === datasets.length - 1;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`${stacked ? 'w-full' : 'w-full h-full'} relative flex items-end justify-center transition-all duration-300`}
                                            style={stacked ? { height: `${h * 100}%` } : { }}
                                        >
                                             <div 
                                                className={`w-full ${val > 0 ? 'min-h-[1px]' : 'h-0'} ${roundingClass} rounded-b-none ${stacked && idx > 0 ? 'border-b border-black/20' : ''} relative transition-all duration-500 ease-out ${barClassName}`}
                                                style={{ 
                                                    height: stacked ? '100%' : `${h * 100}%`,
                                                    transformStyle: 'preserve-3d',
                                                }}
                                             >
                                                <div className={`absolute inset-0 ${roundingClass} rounded-b-none border border-white/10`} style={{ background: ds.color, transform: 'translateZ(6px)' }} />
                                                {isTopVisible && (
                                                    <div className={`absolute top-0 left-0 right-0 h-[6px] ${roundingClass} border border-white/10`} style={{ background: ds.color, transform: 'rotateX(90deg)', transformOrigin: 'top' }} />
                                                )}
                                             </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Label */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                            <span className={`text-[9px] font-bold text-center leading-none transition-colors duration-300 ${activeIndex === i ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>{label}</span>
                        </div>
                    </div>
                ))}
            </div>
            </div>
    );
});
