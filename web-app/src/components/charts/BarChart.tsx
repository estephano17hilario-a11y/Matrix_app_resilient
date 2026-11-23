import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface BarColumnProps {
    index: number;
    label: string;
    count: number;
    isActive: boolean;
    datasets: { data: number[]; color: string; label?: string }[];
    maxValue: number;
    stacked: boolean;
    barStyle: 'gradient' | 'solid';
    paddingTop: string;
    barSpacing: string;
    xTickInterval: number;
    setColRef: (index: number, el: HTMLDivElement | null) => void;
    onClick: (index: number) => void;
    onEnter: (index: number) => void;
    onLeave: () => void;
}

// One column of the chart. Memoised so that moving the tooltip between bars only
// re-renders the two columns whose active state changed, not all of them.
const BarColumn = React.memo(({
    index: i, label, count, isActive, datasets, maxValue, stacked, barStyle,
    paddingTop, barSpacing, xTickInterval, setColRef, onClick, onEnter, onLeave
}: BarColumnProps) => (
    <div
        ref={(el) => setColRef(i, el)}
        className="flex-1 h-full relative group z-10 min-w-0 cursor-pointer"
        onClick={() => onClick(i)}
        onMouseEnter={() => onEnter(i)}
        onMouseLeave={onLeave}
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
        <div className={`absolute ${paddingTop} bottom-6 left-0 right-0 ${count > 20 ? 'px-0' : barSpacing} flex items-end justify-center z-10`}>
            <div className={`w-full h-full flex ${stacked ? 'flex-col-reverse justify-start' : 'items-end justify-center'} ${stacked ? 'gap-0' : (count > 20 ? 'gap-0.5' : 'gap-1.5')}`}>
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
                            initial={false}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ type: "spring", stiffness: 480, damping: 28, mass: 0.8 }}
                            // Only filter/transform transition via CSS: `transition-all` also transitioned
                            // `height`, fighting the spring that drives it.
                            className={cn(
                                `w-full ${roundingClass} relative overflow-hidden transition-[filter,transform] duration-150`,
                                isActive ? 'brightness-125 scale-x-[1.06]' : 'group-hover:brightness-110'
                            )}
                            style={{
                                background: backgroundStyle,
                                boxShadow: shadowStyle,
                                transformOrigin: 'bottom center',
                            }}
                        >
                            {/* Neon LED Cap Line at top of bar */}
                            {val > 0 && !isSolid && (
                                <div
                                    className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-white/30 via-white/95 to-white/30 rounded-t-full shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                                />
                            )}

                            {/* Shimmer Light Reflection Overlay: only mounted on the active bar */}
                            {!isSolid && isActive && (
                                <div className="absolute inset-0 pointer-events-none">
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
));

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

    // Default time formatter (always hours + minutes)
    const defaultFormatter = useCallback((mins: number) => {
        if (!mins || mins <= 0) return '0h 0m';
        const total = Math.round(mins);
        return `${Math.floor(total / 60)}h ${total % 60}m`;
    }, []);

    const formatValue = tooltipValueFormatter || defaultFormatter;
    const formatLabel = tooltipLabelFormatter || ((l: string) => l);

    // Real column elements: the source of truth for hit-testing. The bars area has
    // left padding (y-axis gutter) and gaps, so dividing its full width by the bar
    // count shifts the touched index relative to the bar that is actually drawn.
    const colRefs = useRef<(HTMLDivElement | null)[]>([]);
    const setColRef = useCallback((i: number, el: HTMLDivElement | null) => { colRefs.current[i] = el; }, []);
    const colRectsRef = useRef<{ left: number; right: number }[]>([]);
    const activeIdxRef = useRef<number | null>(null);
    const lastTouchRef = useRef(0);

    const measureColumns = useCallback(() => {
        const rects: { left: number; right: number }[] = [];
        for (let i = 0; i < labels.length; i++) {
            const el = colRefs.current[i];
            if (!el) { rects.push({ left: 0, right: 0 }); continue; }
            const r = el.getBoundingClientRect();
            rects.push({ left: r.left, right: r.right });
        }
        colRectsRef.current = rects;
    }, [labels.length]);

    // Activate tooltip for a given bar index, anchored on the real column element
    const activateBar = useCallback((index: number) => {
        if (index < 0 || index >= labels.length) return;
        if (!barsAreaRef.current || !containerRef.current) return;
        const colEl = colRefs.current[index];
        if (!colEl) return;

        clearTimer();
        if (activeIdxRef.current === index) return;
        activeIdxRef.current = index;

        const containerRect = containerRef.current.getBoundingClientRect();
        const barsRect = barsAreaRef.current.getBoundingClientRect();
        const colRect = colEl.getBoundingClientRect();

        // Keep the tooltip inside the chart: clamp horizontally so edge bars don't push it
        // out of the card, and vertically so the tallest bar doesn't send it above it
        // (parents clip it there).
        const TIP_HALF_W = 40;
        const TIP_MIN_TOP = 64;
        const colCenterX = Math.min(
            Math.max(colRect.left - containerRect.left + colRect.width / 2, TIP_HALF_W),
            Math.max(containerRect.width - TIP_HALF_W, TIP_HALF_W)
        );
        const total = getBarTotal(index);
        const barHeightFraction = Math.min(total / maxValue, 1);
        const barTopY = Math.max(
            barsRect.top - containerRect.top + barsRect.height * (1 - barHeightFraction),
            TIP_MIN_TOP
        );

        setActiveBar(index);
        setTooltipPos({ x: colCenterX, y: barTopY });
    }, [labels.length, getBarTotal, maxValue, clearTimer]);

    // Schedule hide
    const scheduleHide = useCallback(() => {
        clearTimer();
        hideTimerRef.current = setTimeout(() => {
            activeIdxRef.current = null;
            setActiveBar(null);
            setTooltipPos(null);
        }, 2500);
    }, [clearTimer]);

    // Immediate hide
    const hideNow = useCallback(() => {
        clearTimer();
        activeIdxRef.current = null;
        setActiveBar(null);
        setTooltipPos(null);
    }, [clearTimer]);

    // ─── Touch handlers on the container for drag-across ───
    const getBarIndexFromTouch = useCallback((clientX: number): number | null => {
        const rects = colRectsRef.current;
        if (!rects.length) return null;
        if (clientX < rects[0].left - 8 || clientX > rects[rects.length - 1].right + 8) return null;
        for (let i = 0; i < rects.length; i++) {
            // right edge + half gap so taps between columns still resolve to the nearest one
            if (clientX <= rects[i].right) return i;
        }
        return rects.length - 1;
    }, []);

    const onContainerTouchStart = useCallback((e: React.TouchEvent) => {
        lastTouchRef.current = Date.now();
        measureColumns();
        const idx = getBarIndexFromTouch(e.touches[0].clientX);
        if (idx !== null) activateBar(idx);
    }, [measureColumns, getBarIndexFromTouch, activateBar]);

    const onContainerTouchMove = useCallback((e: React.TouchEvent) => {
        lastTouchRef.current = Date.now();
        const idx = getBarIndexFromTouch(e.touches[0].clientX);
        if (idx !== null) activateBar(idx);
    }, [getBarIndexFromTouch, activateBar]);

    const onContainerTouchEnd = useCallback(() => {
        lastTouchRef.current = Date.now();
        scheduleHide();
    }, [scheduleHide]);

    // Browsers synthesize mouseenter/click after a tap; ignore them so they can't
    // re-activate (or toggle off) a bar the touch handlers already resolved.
    const isSyntheticMouse = () => Date.now() - lastTouchRef.current < 800;

    // ─── Click handler for desktop ───
    const onBarClick = useCallback((index: number) => {
        if (isSyntheticMouse()) return;
        if (activeIdxRef.current === index) {
            hideNow();
        } else {
            activateBar(index);
            scheduleHide();
        }
    }, [activateBar, hideNow, scheduleHide]);

    // ─── Mouse hover for desktop ───
    const onBarMouseEnter = useCallback((index: number) => {
        if (isSyntheticMouse()) return;
        activateBar(index);
    }, [activateBar]);

    const onBarMouseLeave = useCallback(() => {
        if (isSyntheticMouse()) return;
        hideNow();
    }, [hideNow]);

    // A different range/data set means the old index no longer points at the same bar
    const labelsKey = labels.join('|');
    useEffect(() => { hideNow(); }, [labelsKey, hideNow]);

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
                    // Positioning lives on a plain wrapper: framer-motion rewrites `transform`
                    // (for scale/y), which silently dropped translate(-50%,-100%) and threw the
                    // tooltip off its anchor. `contain: none` is inline because the global
                    // `.pointer-events-none { contain: strict }` rule collapses an absolutely
                    // positioned, content-sized box to 0×0 — leaving an empty frame.
                    <div
                        className="absolute pointer-events-none z-[100]"
                        style={{
                            left: tooltipPos.x,
                            top: tooltipPos.y - 12,
                            transform: 'translate(-50%, -100%)',
                            contain: 'none',
                        }}
                    >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 6 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        style={{ transformOrigin: 'bottom center' }}
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
                    </div>
                )}
            </AnimatePresence>

            {/* ─── BAR COLUMNS ─── */}
            <div 
                ref={barsAreaRef}
                className={`absolute inset-0 flex items-end ${labels.length > 30 ? 'gap-0' : labels.length > 15 ? 'gap-0.5' : 'gap-1'} ${yTicks ? 'pl-6' : ''}`}
            >
                {labels.map((label, i) => (
                    <BarColumn
                        key={i}
                        index={i}
                        label={label}
                        count={labels.length}
                        isActive={activeBar === i}
                        datasets={datasets}
                        maxValue={maxValue}
                        stacked={stacked}
                        barStyle={barStyle}
                        paddingTop={paddingTop}
                        barSpacing={barSpacing}
                        xTickInterval={xTickInterval}
                        setColRef={setColRef}
                        onClick={onBarClick}
                        onEnter={onBarMouseEnter}
                        onLeave={onBarMouseLeave}
                    />
                ))}
            </div>
      </div>
    );
});
