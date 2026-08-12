import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
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
    tooltipLabelFormatter,
    solidBackground = false
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
    solidBackground?: boolean;
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

    // ─── Tooltip state ───
    const [activeBar, setActiveBar] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const barsAreaRef = useRef<HTMLDivElement>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear any pending hide timer
    const clearTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    // Get total value for a bar index
    const getBarTotal = useCallback((index: number) => {
        return datasets.reduce((acc, ds) => acc + (ds.data[index] || 0), 0);
    }, [datasets]);

    // Default time formatter
    const defaultFormatter = useCallback((mins: number) => {
        if (!mins || mins <= 0) return '0m';
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    }, []);

    const formatValue = tooltipValueFormatter || defaultFormatter;
    const formatLabel = tooltipLabelFormatter || ((l: string) => l);

    // Activate tooltip for a given bar index using pixel math
    const activateBar = useCallback((index: number) => {
        if (index < 0 || index >= labels.length) return;
        if (!barsAreaRef.current || !containerRef.current) return;

        clearTimer();
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const barsRect = barsAreaRef.current.getBoundingClientRect();
        
        // Each bar column is an equal fraction of barsArea width
        const colWidth = barsRect.width / labels.length;
        const colCenterX = barsRect.left - containerRect.left + (index + 0.5) * colWidth;
        
        // Calculate bar top position: bar area goes from barsRect.top to barsRect.bottom
        const total = getBarTotal(index);
        const barHeightFraction = Math.min(total / maxValue, 1);
        const barsAreaHeight = barsRect.height;
        const barTopY = barsRect.top - containerRect.top + barsAreaHeight * (1 - barHeightFraction);

        setActiveBar(index);
        setTooltipPos({ x: colCenterX, y: barTopY });
    }, [labels.length, getBarTotal, maxValue, clearTimer]);

    // Schedule hide
    const scheduleHide = useCallback(() => {
        clearTimer();
        hideTimerRef.current = setTimeout(() => {
            setActiveBar(null);
            setTooltipPos(null);
        }, 2000);
    }, [clearTimer]);

    // Immediate hide
    const hideNow = useCallback(() => {
        clearTimer();
        setActiveBar(null);
        setTooltipPos(null);
    }, [clearTimer]);

    // ─── Touch handlers on the container for drag-across ───
    const getBarIndexFromTouch = useCallback((clientX: number): number | null => {
        if (!barsAreaRef.current) return null;
        const rect = barsAreaRef.current.getBoundingClientRect();
        const relX = clientX - rect.left;
        if (relX < 0 || relX > rect.width) return null;
        const idx = Math.floor((relX / rect.width) * labels.length);
        return Math.max(0, Math.min(labels.length - 1, idx));
    }, [labels.length]);

    const onContainerTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        const idx = getBarIndexFromTouch(touch.clientX);
        if (idx !== null) activateBar(idx);
    }, [getBarIndexFromTouch, activateBar]);

    const onContainerTouchMove = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        const idx = getBarIndexFromTouch(touch.clientX);
        if (idx !== null) activateBar(idx);
    }, [getBarIndexFromTouch, activateBar]);

    const onContainerTouchEnd = useCallback(() => {
        scheduleHide();
    }, [scheduleHide]);

    // ─── Click handler for desktop ───
    const onBarClick = useCallback((index: number) => {
        if (activeBar === index) {
            hideNow();
        } else {
            activateBar(index);
            scheduleHide();
        }
    }, [activeBar, activateBar, hideNow, scheduleHide]);

    // ─── Mouse hover for desktop ───
    const onBarMouseEnter = useCallback((index: number) => {
        activateBar(index);
    }, [activateBar]);

    const onBarMouseLeave = useCallback(() => {
        hideNow();
    }, [hideNow]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { clearTimer(); };
    }, [clearTimer]);

    // Compute tooltip content
    const tooltipContent = useMemo(() => {
        if (activeBar === null) return null;
        const total = getBarTotal(activeBar);
        if (total <= 0) return null;
        return {
            value: formatValue(total),
            label: formatLabel(labels[activeBar] || ''),
        };
    }, [activeBar, getBarTotal, formatValue, formatLabel, labels]);

    return (
      <div 
          ref={containerRef}
          className={`w-full relative select-none ${className}`} 
          style={{ height, overflow: 'visible' }}
          onTouchStart={onContainerTouchStart}
          onTouchMove={onContainerTouchMove}
          onTouchEnd={onContainerTouchEnd}
          onTouchCancel={hideNow}
      >
             {showBackground && (
                solidBackground ? (
                  <div className="absolute inset-0 bg-[#0d0d14] border border-white/10 rounded-3xl pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-20 rounded-3xl pointer-events-none" />
                )
             )}

            {/* Grid lines */}
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

            {/* ─── FLOATING TOOLTIP (rendered at container level) ─── */}
            {tooltipContent && tooltipPos && (
                <div 
                    className="absolute pointer-events-none"
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y - 8,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 999,
                    }}
                >
                    <div 
                        className="px-2.5 py-1.5 rounded-xl shadow-2xl border border-white/20 backdrop-blur-xl whitespace-nowrap"
                        style={{
                            background: 'linear-gradient(145deg, rgba(10,10,20,0.95) 0%, rgba(25,25,45,0.95) 100%)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
                        }}
                    >
                        <div className="text-[11px] font-extrabold text-white text-center leading-tight tracking-tight">
                            {tooltipContent.value}
                        </div>
                        <div className="text-[8px] font-semibold text-white/40 text-center leading-tight mt-0.5 uppercase tracking-wider">
                            {tooltipContent.label}
                        </div>
                    </div>
                    {/* Arrow pointing down */}
                    <div className="flex justify-center">
                        <div 
                            className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent"
                            style={{ borderTopColor: 'rgba(25,25,45,0.95)' }}
                        />
                    </div>
                </div>
            )}

            {/* ─── Bar columns ─── */}
            <div 
                ref={barsAreaRef}
                className={`absolute inset-0 flex items-end ${labels.length > 30 ? 'gap-0' : labels.length > 15 ? 'gap-0.5' : 'gap-1'} ${yTicks ? 'pl-6' : ''}`}
            >
                {labels.map((label, i) => {
                    const isActive = activeBar === i;

                    return (
                    <div 
                        key={i} 
                        className="flex-1 h-full relative group z-10 min-w-0 cursor-pointer"
                        onClick={() => onBarClick(i)}
                        onMouseEnter={() => onBarMouseEnter(i)}
                        onMouseLeave={onBarMouseLeave}
                    >
                        {/* Highlight line when active */}
                        {isActive && (
                            <div 
                                className={`absolute ${paddingTop} bottom-6 left-1/2 -translate-x-1/2 w-px pointer-events-none`}
                                style={{ background: 'linear-gradient(to top, transparent, rgba(255,255,255,0.25), transparent)' }}
                            />
                        )}

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
                                    const shadowStyle = solidBackground ? 'none' : (isHex
                                        ? `inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 15px ${safeColor}45, 0 4px 15px ${safeColor}35`
                                        : `inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 15px rgba(0,0,0,0.3)`);
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`w-full ${roundingClass} relative overflow-hidden transition-all duration-150 ${isActive ? 'brightness-125 scale-[1.03]' : 'group-hover:brightness-110'}`}
                                            style={{ 
                                                height: `${h * 100}%`,
                                                backgroundColor: backgroundStyle,
                                                boxShadow: shadowStyle,
                                                transformOrigin: 'bottom center',
                                            }}
                                        >
                                             {/* Shine Effect */}
                                             {!solidBackground && (
                                                <div className={`absolute inset-0 transition-opacity duration-200 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30" />
                                                    <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent" />
                                                </div>
                                             )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Label */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                            {(i % xTickInterval === 0) && (
                                <span className={cn(
                                    "text-[9px] font-bold text-center leading-none transition-colors duration-200",
                                    isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                                )}>{label}</span>
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>
      </div>
    );
});
