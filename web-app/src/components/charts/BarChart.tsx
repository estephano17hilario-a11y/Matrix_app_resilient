import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

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
    paddingTop = "top-6",
    tooltipValueFormatter,
    tooltipLabelFormatter
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
    tooltipValueFormatter?: (value: number) => string;
    tooltipLabelFormatter?: (label: string) => string;
}) => {
    const maxValue = useMemo(() => {
        if (max) return max;
        if (stacked) {
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
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
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

            {/* Grid lines: Feed-style solid thin vectors */}
            {showGrid && !yTicks && (
                <div className={`absolute inset-x-0 ${paddingTop} bottom-5 flex flex-col justify-between pointer-events-none`}>
                    <div className="w-full h-px bg-white/[0.04]" />
                    <div className="w-full h-px bg-white/[0.03]" />
                    <div className="w-full h-px bg-white/[0.03]" />
                    <div className="w-full h-px bg-white/[0.06]" />
                </div>
             )}

            {showGrid && yTicks && (
                <div className={`absolute inset-x-0 ${paddingTop} bottom-6 pointer-events-none`}>
                    {yTicks.map((val) => (
                        <div
                            key={val}
                            className="absolute left-6 right-0 h-px bg-white/[0.05]"
                            style={{ top: `${100 - (val / maxValue) * 100}%` }}
                        >
                            <span className={cn(
                                "absolute -left-6 w-6 text-right pr-1.5 text-[9px] text-slate-300 font-mono",
                                val === maxValue ? "top-0" : (val === 0 ? "bottom-0" : "top-1/2 -translate-y-1/2")
                            )}>
                                {yTickFormatter ? yTickFormatter(val) : val}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Portal Tooltip */}
            {activeIndex !== null && tooltipPos && createPortal(
                <div 
                    className="absolute z-[9999] bg-[#1c1c1e] border px-3 py-2.5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-start gap-1.5 min-w-[90px] pointer-events-none"
                    style={{ 
                        top: tooltipPos.top, 
                        left: tooltipPos.left, 
                        transform: 'translate(-50%, -100%)',
                        borderColor: datasets[0]?.color || '#3b82f6'
                    }}
                >
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider w-full">{labels[activeIndex]}</span>
                    
                    {/* Individual datasets */}
                    {datasets.map((ds, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-black text-white whitespace-nowrap w-full">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ds.color, boxShadow: `0 0 5px ${ds.color}` }} />
                            <span className="text-white/70 text-[9px] font-bold mr-auto">
                                {tooltipLabelFormatter ? tooltipLabelFormatter(ds.label || '') : ds.label}
                            </span>
                            <span className="text-white font-black tabular-nums text-xs">
                                {tooltipValueFormatter ? tooltipValueFormatter(ds.data[activeIndex]) : ds.data[activeIndex]}
                            </span>
                        </div>
                    ))}

                    {/* Total row — shown when multiple datasets (stacked/trait/project modes) */}
                    {datasets.length > 1 && (() => {
                        const total = datasets.reduce((acc, ds) => acc + (ds.data[activeIndex] || 0), 0);
                        return (
                            <div className="border-t border-white/[0.08] pt-1 mt-0.5 w-full flex items-center justify-between gap-3">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">Total</span>
                                <span className="text-white font-black tabular-nums text-xs">
                                    {tooltipValueFormatter ? tooltipValueFormatter(total) : total}
                                </span>
                            </div>
                        );
                    })()}

                    {/* Tiny Triangle Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]" style={{ borderTopColor: datasets[0]?.color || '#3b82f6' }} />
                </div>,
                document.body
            )}

            <div className={`absolute inset-0 flex items-end ${labels.length > 30 ? 'gap-0' : labels.length > 15 ? 'gap-0.5' : 'gap-1'} ${yTicks ? 'pl-6' : ''}`}>
                {labels.map((label, i) => (
                    <div 
                        key={i} 
                        onClick={(e) => handleBarClick(i, e)}
                        className="flex-1 h-full relative group z-10 cursor-pointer min-w-0"
                    >
                        {/* Bars Container */}
                        <div className={`absolute ${paddingTop} bottom-6 left-0 right-0 ${labels.length > 20 ? 'px-0' : barSpacing} flex items-end justify-center`}>
                            <div className={`w-full h-full flex ${stacked ? 'flex-col-reverse justify-start' : 'items-end justify-center'} ${stacked ? 'gap-0' : (labels.length > 20 ? 'gap-0.5' : 'gap-1.5')}`}>
                                {datasets.map((ds, idx) => {
                                    const val = ds.data[i];
                                    const h = Math.min(val / maxValue, 1);
                                    
                                    const isTopVisible = stacked 
                                        ? idx === datasets.reduce((last, d, currIdx) => (d.data[i] > 0 ? currIdx : last), -1)
                                        : true;

                                    const roundingClass = stacked
                                        ? (isTopVisible ? 'rounded-t-sm' : 'rounded-none')
                                        : 'rounded-t-sm';

                                    const safeColor = ds.color || '#6366f1';
                                    const backgroundStyle = safeColor;
                                    const isHex = safeColor.startsWith('#');
                                    const shadowStyle = isHex
                                        ? `inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 15px ${safeColor}45, 0 4px 15px ${safeColor}35`
                                        : `inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 15px rgba(0,0,0,0.3)`;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`w-full ${roundingClass} relative overflow-hidden group-hover:brightness-110`}
                                            style={{ 
                                                height: `${h * 100}%`,
                                                backgroundColor: backgroundStyle,
                                                boxShadow: shadowStyle
                                            }}
                                        >
                                             {/* Shine Effect */}
                                             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30" />
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
                                <span className={`text-[9px] font-bold text-center leading-none transition-colors duration-200 ${activeIndex === i ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>{label}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            </div>
    );
});
