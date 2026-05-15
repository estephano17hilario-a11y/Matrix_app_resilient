import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const LineChart = React.memo(({ 
    datasets, 
    labels, 
    height = 160,
    max,
    showGrid = true,
    showBackground = true,
    className = "",
    yTicks,
    yTickFormatter,
    xTickInterval = 1,
    paddingTop = "top-6"
}: { 
    datasets: { data: number[]; color: string; label?: string }[];
    labels: string[];
    height?: number;
    max?: number;
    showGrid?: boolean;
    showBackground?: boolean;
    className?: string;
    yTicks?: number[];
    yTickFormatter?: (value: number) => string;
    xTickInterval?: number;
    paddingTop?: string;
}) => {
    const maxValue = useMemo(() => {
        if (max) return max;
        return Math.max(...datasets.flatMap(d => d.data), 1);
    }, [datasets, max]);

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

    const handlePointClick = (i: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const top = rect.top + window.scrollY - 10;
        const left = rect.left + window.scrollX + (rect.width / 2);
        
        setActiveIndex(i);
        setTooltipPos({ top, left });
    };

    const numPoints = labels.length;
    const getX = (index: number) => (index / Math.max(numPoints - 1, 1)) * 100;
    const getY = (val: number) => 100 - (val / maxValue) * 100;

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
                    {datasets.map((ds, idx) => {
                        const val = ds.data[activeIndex];
                        if (val === null || val === undefined) return null;
                        return (
                            <div key={idx} className="flex items-center gap-2 text-xs font-black text-white whitespace-nowrap">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ds.color, boxShadow: `0 0 5px ${ds.color}` }} />
                                {val} <span className="text-[9px] text-white/40 font-bold ml-auto">{ds.label}</span>
                            </div>
                        );
                    })}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]" style={{ borderTopColor: datasets[0]?.color || '#3b82f6' }} />
                </div>,
                document.body
            )}

            <div className={`absolute ${paddingTop} bottom-8 right-0 ${yTicks ? 'left-6' : 'left-0'}`}>
                <svg className="w-full h-full overflow-visible pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                        {datasets.map((ds, i) => (
                            <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={ds.color} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={ds.color} stopOpacity="0.0" />
                            </linearGradient>
                        ))}
                    </defs>
                    {datasets.map((ds, i) => {
                        if (ds.data.length === 0) return null;
                        
                        // Filtrar los valores nulos (días futuros) para que no se dibujen
                        const validPoints = ds.data
                            .map((val, idx) => val !== null && val !== undefined ? `${getX(idx)},${getY(val)}` : null)
                            .filter(Boolean);
                            
                        if (validPoints.length === 0) return null;

                        const points = validPoints.join(' L ');
                        
                        // Para el área debajo de la línea, necesitamos bajar a 100 en el primer y último punto válido
                        const firstValidIdx = ds.data.findIndex((val: any) => val !== null && val !== undefined);
                        const lastValidIdx = (() => {
                            for (let j = ds.data.length - 1; j >= 0; j--) {
                                if (ds.data[j] !== null && ds.data[j] !== undefined) return j;
                            }
                            return -1;
                        })();
                        
                        const areaPath = `M ${getX(firstValidIdx)},100 L ${points} L ${getX(lastValidIdx)},100 Z`;

                        return (
                            <g key={i}>
                                <path
                                    d={areaPath}
                                    fill={`url(#grad-${i})`}
                                />
                                <path
                                    d={`M ${points}`}
                                    fill="none"
                                    stroke={ds.color}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    style={{ filter: `drop-shadow(0px 2px 4px ${ds.color}80)` }}
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Invisible hover areas & points */}
                <div className="absolute inset-0">
                    {labels.map((label, i) => {
                        const x = getX(i);
                        return (
                        <div 
                            key={i} 
                            onClick={(e) => handlePointClick(i, e)}
                            className="absolute top-0 bottom-0 group cursor-pointer"
                            style={{ 
                                left: i === 0 ? '0%' : i === labels.length - 1 ? 'auto' : `calc(${x}% - ${50 / (labels.length - 1)}%)`,
                                right: i === labels.length - 1 ? '0%' : 'auto',
                                width: i === 0 || i === labels.length - 1 ? `${50 / Math.max(labels.length - 1, 1)}%` : `${100 / Math.max(labels.length - 1, 1)}%`
                            }}
                        >
                            {/* The vertical highlight line on hover */}
                            <div className="absolute top-0 bottom-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                style={{
                                    left: i === 0 ? '0' : i === labels.length - 1 ? 'auto' : '50%',
                                    right: i === labels.length - 1 ? '0' : 'auto',
                                    transform: i !== 0 && i !== labels.length - 1 ? 'translateX(-50%)' : 'none',
                                    width: '1px'
                                }}
                            />

                            {datasets.map((ds, idx) => {
                                const val = ds.data[i];
                                if (val === null || val === undefined) return null; // No mostrar punto para valores nulos
                                const y = getY(val);
                                return (
                                    <div
                                        key={idx}
                                        className={`absolute w-2.5 h-2.5 rounded-full transition duration-200 pointer-events-none
                                            ${activeIndex === i ? 'scale-150 opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                        `}
                                        style={{
                                            left: i === 0 ? '0' : i === labels.length - 1 ? 'auto' : '50%',
                                            right: i === labels.length - 1 ? '0' : 'auto',
                                            transform: `translate(${i === 0 ? '-50%' : i === labels.length - 1 ? '50%' : '-50%'}, -50%)`,
                                            top: `${y}%`,
                                            backgroundColor: '#fff',
                                            border: `2px solid ${ds.color}`,
                                            boxShadow: `0 0 10px ${ds.color}`
                                        }}
                                    />
                                );
                            })}
                            
                            <div className="absolute bottom-[-24px] left-0 right-0 flex justify-center pointer-events-none">
                                {(i % xTickInterval === 0) && (
                                    <span className={`text-[9px] font-bold text-center leading-none transition-colors duration-200 ${activeIndex === i ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>{label}</span>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
});