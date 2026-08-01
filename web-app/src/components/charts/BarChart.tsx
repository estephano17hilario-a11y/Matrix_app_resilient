import React, { useMemo, useState, useEffect, useRef } from 'react';
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
    const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouch = (e: React.TouchEvent) => {
        // Only prevent default on move to avoid breaking normal scrolling unless dragging inside the chart
        if (e.type === 'touchmove' && e.cancelable) {
            e.preventDefault();
        }
        const touch = e.touches[0];
        if (!touch || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = touch.clientX - rect.left - (yTicks ? 24 : 0);
        const chartWidth = rect.width - (yTicks ? 24 : 0);
        
        if (relativeX < 0 || relativeX > chartWidth) {
            setActiveIndex(null);
            return;
        }
        
        const percentX = relativeX / chartWidth;
        const index = Math.floor(percentX * labels.length);
        
        if (index >= 0 && index < labels.length) {
            const barElements = containerRef.current.querySelectorAll('.bar-touch-target');
            const barEl = barElements[index];
            if (barEl) {
                const barRect = barEl.getBoundingClientRect();
                const left = barRect.left - rect.left + (barRect.width / 2);
                
                setActiveIndex(index);
                setTooltipLeft(left);
            }
        }
    };

    useEffect(() => {
        const handleOutsideAction = (e: Event) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setActiveIndex(null);
            }
        };
        if (activeIndex !== null) {
            document.addEventListener('click', handleOutsideAction);
            document.addEventListener('touchstart', handleOutsideAction, { passive: true });
        }
        return () => {
            document.removeEventListener('click', handleOutsideAction);
            document.removeEventListener('touchstart', handleOutsideAction);
        };
    }, [activeIndex]);

    const handleBarHover = (i: number, e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const rect = e.currentTarget.getBoundingClientRect();
        const left = rect.left - containerRect.left + (rect.width / 2);
        
        setActiveIndex(i);
        setTooltipLeft(left);
    };

    const handleBarClick = (i: number, e: React.MouseEvent) => {
        e.stopPropagation();
        handleBarHover(i, e);
    };
    
    return (
      <div 
          ref={containerRef} 
          className={`w-full relative select-none overflow-visible ${className}`} 
          style={{ height }}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
      >
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

            {/* Inline Tooltip — anchored near TOP of chart, tracks bar X with clamped boundaries */}
            {activeIndex !== null && tooltipLeft !== null && (
                <div 
                    className="absolute z-[99999] bg-zinc-950/95 border px-3.5 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex flex-col items-start gap-1.5 min-w-[130px] max-w-[200px] pointer-events-none backdrop-blur-md"
                    style={{ 
                        top: 10,
                        left: Math.max(70, Math.min(tooltipLeft, (containerRef.current?.getBoundingClientRect().width || 300) - 70)), 
                        transform: 'translate(-50%, 0)',
                        borderColor: datasets[0]?.color || '#3b82f6'
                    }}
                >
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-1 w-full text-center">
                        {labels[activeIndex]}
                    </span>
                    
                    {/* Active datasets and Total calculation */}
                    {(() => {
                        const total = datasets.reduce((sum, ds) => sum + (ds.data[activeIndex] || 0), 0);
                        const activeDs = datasets.filter(ds => (ds.data[activeIndex] || 0) > 0);

                        return (
                            <div className="w-full flex flex-col gap-1 mt-0.5">
                                {activeDs.length === 0 ? (
                                    <div className="flex items-center justify-between gap-3 text-white/60 font-bold text-xs py-0.5">
                                        <span className="text-[10px] text-slate-400">Sin actividad</span>
                                        <span className="font-mono tabular-nums text-slate-400 text-xs">
                                            {tooltipValueFormatter ? tooltipValueFormatter(0) : '0h 0m'}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        {activeDs.map((ds, idx) => {
                                            const val = ds.data[activeIndex] || 0;
                                            const rawLabel = ds.label || '';
                                            const isGenericTotal = rawLabel === 'Total' || rawLabel === 'total' || rawLabel === 'Unknown';
                                            const displayLabel = !isGenericTotal && tooltipLabelFormatter ? tooltipLabelFormatter(rawLabel) : (!isGenericTotal ? rawLabel : null);

                                            return (
                                                <div key={idx} className="flex items-center justify-between gap-2.5 text-xs font-bold text-white whitespace-nowrap w-full">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ds.color, boxShadow: `0 0 6px ${ds.color}` }} />
                                                        {displayLabel && (
                                                            <span className="text-white/80 text-[10px] font-medium truncate max-w-[100px]">
                                                                {displayLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-white font-mono font-black tabular-nums text-xs ml-auto">
                                                        {tooltipValueFormatter ? tooltipValueFormatter(val) : `${val}m`}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* TIEMPO TOTAL ROW — Always displayed for clear totals */}
                                        <div className="border-t border-white/15 pt-1.5 mt-1 w-full flex items-center justify-between gap-3">
                                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">TIEMPO TOTAL</span>
                                            <span className="text-amber-400 font-mono font-black tabular-nums text-xs">
                                                {tooltipValueFormatter ? tooltipValueFormatter(total) : `${total}m`}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            <div className={`absolute inset-0 flex items-end ${labels.length > 30 ? 'gap-0' : labels.length > 15 ? 'gap-0.5' : 'gap-1'} ${yTicks ? 'pl-6' : ''}`}>
                {labels.map((label, i) => (
                    <div 
                        key={i} 
                        onMouseEnter={(e) => handleBarHover(i, e)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onClick={(e) => handleBarClick(i, e)}
                        className="flex-1 h-full relative group z-10 cursor-pointer min-w-0 bar-touch-target"
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
