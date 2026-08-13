import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    solidBackground = false,
    barStyle = 'gradient'
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
    barStyle?: 'gradient' | 'solid';
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
        }, 2500);
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
                  <div className="absolute inset-0 bg-[#0d0d14]/90 border border-white/10 rounded-3xl pointer-events-none shadow-2xl backdrop-blur-md" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-cyan-500/10 border border-white/10 rounded-3xl pointer-events-none shadow-2xl backdrop-blur-xl" />
                )
             )}

            {/* Futuristic Grid Lines */}
            {showGrid && !yTicks && (
                <div className={`absolute inset-x-0 ${paddingTop} bottom-6 flex flex-col justify-between pointer-events-none z-0`}>
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
                </div>
             )}

            {showGrid && yTicks && (
                <div className={`absolute inset-x-0 ${paddingTop} bottom-6 pointer-events-none z-0`}>
                    {yTicks.map((val) => (
                        <div
                            key={val}
                            className="absolute left-6 right-0 h-px bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent"
                            style={{ top: `${100 - (val / maxValue) * 100}%` }}
                        >
                            <span className={cn(
                                "absolute -left-6 w-6 text-right pr-1.5 text-[9px] font-bold text-white/40 font-mono tracking-tight",
                                val === maxValue ? "top-0" : (val === 0 ? "bottom-0" : "top-1/2 -translate-y-1/2")
                            )}>
                                {yTickFormatter ? yTickFormatter(val) : val}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── FLOATING GLASS TOOLTIP ─── */}
            <AnimatePresence>
                {tooltipContent && tooltipPos && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 6 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className="absolute pointer-events-none z-[100]"
                        style={{
                            left: tooltipPos.x,
                            top: tooltipPos.y - 12,
                            transform: 'translate(-50%, -100%)',
                        }}
                    >
                        <div 
                            className="px-3.5 py-2 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl whitespace-nowrap bg-gradient-to-b from-[#181826]/95 via-[#12121c]/95 to-[#0b0b12]/95"
                            style={{
                                boxShadow: '0 12px 35px rgba(0,0,0,0.8), 0 0 20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                            }}
                        >
                            <div className="text-xs font-black text-white text-center leading-tight tracking-tight drop-shadow-md">
                                {tooltipContent.value}
                            </div>
                            <div className="text-[9px] font-extrabold text-cyan-300/90 text-center leading-tight mt-0.5 uppercase tracking-wider font-mono">
                                {tooltipContent.label}
                            </div>
                        </div>
                        {/* Downward indicator arrow */}
                        <div className="flex justify-center -mt-0.5">
                            <div 
                                className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent"
                                style={{ borderTopColor: 'rgba(11,11,18,0.95)' }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── BAR COLUMNS ─── */}
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
                        {/* Ambient Light Pillar behind active/hovered bar */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div 
                                    initial={{ opacity: 0, scaleY: 0 }}
                                    animate={{ opacity: 1, scaleY: 1 }}
                                    exit={{ opacity: 0, scaleY: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className={`absolute ${paddingTop} bottom-6 left-0 right-0 rounded-2xl bg-gradient-to-t from-white/[0.08] via-white/[0.03] to-transparent pointer-events-none border-x border-white/[0.08] z-0`}
                                    style={{ transformOrigin: 'bottom center' }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Top Indicator Highlight Line */}
                        {isActive && (
                            <div 
                                className={`absolute ${paddingTop} bottom-6 left-1/2 -translate-x-1/2 w-px pointer-events-none z-0`}
                                style={{ background: 'linear-gradient(to top, transparent, rgba(255,255,255,0.4), transparent)' }}
                            />
                        )}

                        {/* Bars Container */}
                        <div className={`absolute ${paddingTop} bottom-6 left-0 right-0 ${labels.length > 20 ? 'px-0' : barSpacing} flex items-end justify-center z-10`}>
                            <div className={`w-full h-full flex ${stacked ? 'flex-col-reverse justify-start' : 'items-end justify-center'} ${stacked ? 'gap-0' : (labels.length > 20 ? 'gap-0.5' : 'gap-1.5')}`}>
                                {datasets.map((ds, idx) => {
                                    const val = ds.data[i];
                                    const hFraction = Math.min(Math.max(val / maxValue, 0), 1);
                                    const heightPercent = hFraction * 100;
                                    
                                    const isTopVisible = stacked 
                                        ? idx === datasets.reduce((last, d, currIdx) => (d.data[i] > 0 ? currIdx : last), -1)
                                        : true;

                                    const roundingClass = stacked
                                        ? (isTopVisible ? 'rounded-t-xl' : 'rounded-none')
                                        : 'rounded-t-xl';

                                    const safeColor = ds.color || '#6366f1';
                                    const isSolid = barStyle === 'solid';
                                    const isHex = safeColor.startsWith('#');

                                    // Dynamic neon capsule style calculation
                                    const backgroundStyle = isSolid
                                        ? safeColor
                                        : `linear-gradient(180deg, ${safeColor} 0%, ${safeColor}dd 50%, ${safeColor}44 100%)`;

                                    const shadowStyle = isSolid ? 'none' : (isHex
                                        ? `0 0 16px ${safeColor}60, inset 0 1.5px 0 rgba(255,255,255,0.7), inset 0 -4px 10px ${safeColor}40`
                                        : `0 0 14px rgba(99,102,241,0.5), inset 0 1.5px 0 rgba(255,255,255,0.5)`);

                                    return (
                                        <motion.div 
                                            key={idx}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${heightPercent}%` }}
                                            transition={{ type: "spring", stiffness: 480, damping: 28, mass: 0.8 }}
                                            className={cn(
                                                `w-full ${roundingClass} relative overflow-hidden transition-all duration-200`,
                                                isActive ? 'brightness-125 scale-x-[1.06] shadow-2xl' : 'group-hover:brightness-110'
                                            )}
                                            style={{ 
                                                background: backgroundStyle,
                                                boxShadow: shadowStyle,
                                                transformOrigin: 'bottom center',
                                                willChange: 'transform, height'
                                            }}
                                        >
                                             {/* Neon LED Cap Line at top of bar */}
                                             {val > 0 && !isSolid && (
                                                <div 
                                                    className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-white/30 via-white/95 to-white/30 rounded-t-full shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                                                />
                                             )}

                                             {/* Shimmer Light Reflection Overlay */}
                                             {!isSolid && (
                                                <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                                                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                                                </div>
                                             )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* X-Axis Label */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                            {(i % xTickInterval === 0) && (
                                <span className={cn(
                                    "text-[9px] font-extrabold text-center leading-none transition-colors duration-200 font-mono tracking-tight",
                                    isActive ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" : "text-slate-400/90 group-hover:text-white"
                                )}>
                                    {label}
                                </span>
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>
      </div>
    );
});
