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
    stacked = false,
    yTicks,
    yTickFormatter,
    xTickInterval = 1,
    barSpacing = "px-2",
    paddingTop = "top-6"
}: { 
    datasets: { data: number[]; color: string; label?: string }[];
    labels: string[];
    height?: number;
    max?: number;
    showGrid?: boolean;
    showBackground?: boolean;
    className?: string;
    stacked?: boolean;
    yTicks?: number[];
    yTickFormatter?: (value: number) => string;
    xTickInterval?: number;
    barSpacing?: string;
    paddingTop?: string;
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
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-20 rounded-3xl pointer-events-none" />
             )}

            {showGrid && !yTicks && (
                <div className={`absolute inset-x-0 ${paddingTop} bottom-8 flex flex-col justify-between pointer-events-none opacity-[0.05]`}>
                    <div className="border-t border-dashed border-white/30 w-full" />
                    <div className="border-t border-dashed border-white/30 w-full" />
                    <div className="border-t border-dashed border-white/30 w-full" />
                </div>
             )}

            {showGrid && yTicks && (
                <div className={`absolute inset-x-0 ${paddingTop} bottom-8 pointer-events-none`}>
                    {yTicks.map((val) => (
                        <div
                            key={val}
                            className="absolute left-6 right-0 border-t border-dashed border-white/20"
                            style={{ top: `${100 - (val / maxValue) * 100}%` }}
                        >
                            <span className="absolute -top-1.5 -left-6 w-6 text-right pr-1 text-[9px] text-slate-400 font-mono">
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
                        {/* Bars Container - Fixed Centering & Height */}
                        <div className={`absolute ${paddingTop} bottom-8 left-0 right-0 ${barSpacing} flex items-end justify-center`}>
                            <div className={`w-full h-full flex ${stacked ? 'flex-col-reverse justify-start' : 'items-end justify-center'} ${stacked ? 'gap-0' : 'gap-1.5'}`}>
                                {datasets.map((ds, idx) => {
                                    const val = ds.data[i];
                                    const h = Math.min(val / maxValue, 1);
                                    
                                    const isTopVisible = stacked 
                                        ? idx === datasets.reduce((last, d, currIdx) => (d.data[i] > 0 ? currIdx : last), -1)
                                        : true;

                                    const roundingClass = stacked
                                        ? (isTopVisible ? 'rounded-t-sm' : 'rounded-none')
                                        : 'rounded-t-sm';

                                    // Safe Color Handling
                                    const safeColor = ds.color || '#6366f1';
                                    const isHex = safeColor.startsWith('#');
                                    const backgroundStyle = isHex 
                                        ? `linear-gradient(180deg, ${safeColor}DD 0%, ${safeColor}80 100%)`
                                        : safeColor;
                                    const shadowStyle = isHex
                                        ? `inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 15px ${safeColor}45, 0 4px 15px ${safeColor}35`
                                        : `inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 15px rgba(0,0,0,0.3)`;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`w-full transition-all duration-500 ease-out ${roundingClass} relative overflow-hidden group-hover:brightness-110`}
                                            style={{ 
                                                height: `${h * 100}%`,
                                                background: backgroundStyle,
                                                boxShadow: shadowStyle
                                            }}
                                        >
                                             {/* Shine Effect */}
                                             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30" />
                                                
                                                {/* Bottom Grounding Shadow */}
                                                <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent" />
                                             </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Label */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                            {(i % xTickInterval === 0) && (
                                <span className={`text-[9px] font-bold text-center leading-none transition-colors duration-300 ${activeIndex === i ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>{label}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            </div>
    );
});
