import React, { useMemo } from 'react';
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

    return (
      <div 
          className={`w-full relative select-none overflow-hidden ${className}`} 
          style={{ height }}
      >
             {showBackground && (
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-20 rounded-3xl pointer-events-none" />
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

            <div className={`absolute inset-0 flex items-end ${labels.length > 30 ? 'gap-0' : labels.length > 15 ? 'gap-0.5' : 'gap-1'} ${yTicks ? 'pl-6' : ''}`}>
                {labels.map((label, i) => (
                    <div 
                        key={i} 
                        className="flex-1 h-full relative group z-10 min-w-0"
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
                                <span className="text-[9px] font-bold text-center leading-none text-slate-500 group-hover:text-white transition-colors duration-200">{label}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
      </div>
    );
});
