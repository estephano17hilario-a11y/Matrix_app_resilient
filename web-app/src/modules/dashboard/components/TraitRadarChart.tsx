import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Attribute } from '../../../types';
import { cn } from '../../../utils/cn';
import { RadarConfig, DEFAULT_RADAR_CONFIG } from '@/types/User';

interface TraitRadarChartProps {
    attributes: Attribute[];
    className?: string;
    radarConfig?: RadarConfig;
}

export const TraitRadarChart: React.FC<TraitRadarChartProps> = ({ 
    attributes, 
    className,
    radarConfig = DEFAULT_RADAR_CONFIG 
}) => {
    const { t } = useTranslation();
    const CONTAINER_SIZE = 300;
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const availableWidth = width - 24;
            if (availableWidth < CONTAINER_SIZE) {
                setScale(availableWidth / CONTAINER_SIZE);
            } else {
                setScale(1);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const CENTER = CONTAINER_SIZE / 2;
    const GRID_RADIUS = 95;
    const ICON_DISTANCE = 110;

    const activeConfig = useMemo(() => ({
        ...DEFAULT_RADAR_CONFIG,
        ...radarConfig
    }), [radarConfig]);

    const isMulticolor = activeConfig.fillColor === 'multicolor';

    // Helper: Map Trait IDs to Hex Colors
    const TRAIT_COLORS: Record<string, string> = {
        DISCIPLINA: '#3b82f6',
        FISICO: '#ef4444',
        MENTAL: '#06b6d4',
        SOCIAL: '#ec4899',
        ESPIRITU: '#8b5cf6',
        FINANZAS: '#10b981',
        CREATIVIDAD: '#f59e0b',
        ORDEN: '#64748b',
        LIDERAZGO: '#6366f1',
        RESILIENCIA: '#f97316',
        VITALIDAD: '#84cc16',
        ESTILO: '#d946ef',
        relentless: '#ef4444', 
        strategic: '#06b6d4',  
        creative: '#d946ef',   
        disciplined: '#10b981', 
        leader: '#f59e0b',     
        analyst: '#6366f1',    
    };

    // DATA PREPARATION
    const maxLevel = useMemo(() => {
        if (!attributes.length) return 10;
        const validAttributes = attributes.filter(a => !isNaN(a.level) && isFinite(a.level));
        if (!validAttributes.length) return 10;
        
        const max = Math.max(...validAttributes.map(a => a.level || 1), 1);
        return Math.max(max * 1.15, 5);
    }, [attributes]);

    const chartData = useMemo(() => {
        const count = attributes.length;
        if (count < 3) return [];

        return attributes.map((attr, index) => {
            const angleDeg = (360 / count) * index - 90;
            const angleRad = angleDeg * (Math.PI / 180);

            const getPoint = (r: number) => ({
                x: CENTER + r * Math.cos(angleRad),
                y: CENTER + r * Math.sin(angleRad)
            });

            const lvl = isNaN(attr.level) ? 1 : (attr.level || 1);
            const xp = isNaN(attr.xp) ? 0 : (attr.xp || 0);
            const maxXp = (isNaN(attr.maxXp) || attr.maxXp === 0) ? 100 : (attr.maxXp || 100);
            
            const rawScore = lvl + (xp / maxXp);
            let normalizedScore = rawScore / maxLevel;
            
            if (isNaN(normalizedScore) || !isFinite(normalizedScore)) {
                normalizedScore = 0.1;
            }
            
            const validScore = Math.min(Math.max(normalizedScore, 0.05), 1.0);

            let alignment: 'top' | 'right' | 'bottom' | 'left' = 'right';
            
            if (angleDeg === -90 || angleDeg === 270) alignment = 'top';
            else if (angleDeg === 90) alignment = 'bottom';
            else if (angleDeg > -90 && angleDeg < 90) alignment = 'right';
            else alignment = 'left';

            let color = '#ffffff';
            if (attr.color && attr.color.startsWith('#')) {
                color = attr.color;
            } else {
                color = TRAIT_COLORS[attr.id] || TRAIT_COLORS[attr.id.toUpperCase()] || TRAIT_COLORS[attr.id.toLowerCase()] || '#ffffff';
            }

            return {
                ...attr,
                color,
                angleRad,
                gridPoint: getPoint(GRID_RADIUS),
                valuePoint: getPoint(GRID_RADIUS * validScore),
                iconPoint: getPoint(ICON_DISTANCE),
                alignment
            };
        });
    }, [attributes, maxLevel]);

    const getLabelClassName = (label: string) => {
        const words = label.trim().split(/\s+/).filter(Boolean);
        const maxWordLength = Math.max(0, ...words.map(word => word.length));
        if (maxWordLength <= 6) return "text-[9px] tracking-widest";
        if (maxWordLength <= 8) return "text-[8px] tracking-wide";
        if (maxWordLength <= 10) return "text-[7px] tracking-normal";
        return "text-[6px] tracking-normal";
    };

    // POLYGON PATHS
    const polygonPath = useMemo(() => {
        if (chartData.length < 3) return "";
        return chartData.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.valuePoint.x} ${p.valuePoint.y}`
        ).join(" ") + " Z";
    }, [chartData]);

    // DYNAMIC HEIGHT CALCULATION
    const chartHeight = useMemo(() => {
        if (chartData.length < 3) return CONTAINER_SIZE;
        
        let maxY = 0;
        chartData.forEach(p => {
             let bottom = p.iconPoint.y + 16;
             if (p.alignment === 'bottom') {
                 bottom += 24;
             }
             if (bottom > maxY) maxY = bottom;
        });

        return Math.min(Math.max(maxY + 10, CONTAINER_SIZE * 0.5), CONTAINER_SIZE);
    }, [chartData]);

    const gridLevels = [0.33, 0.66, 1];

    // Parse hex to RGB
    const hexToRgb = (hex: string) => {
        if (!hex || hex === 'multicolor') return { r: 255, g: 255, b: 255 };
        const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
        const r = parseInt(cleanHex.slice(0, 2), 16) || 255;
        const g = parseInt(cleanHex.slice(2, 4), 16) || 255;
        const b = parseInt(cleanHex.slice(4, 6), 16) || 255;
        return { r, g, b };
    };

    const fillRgb = hexToRgb(activeConfig.fillColor);
    const fillAlpha = (activeConfig.fillOpacity ?? 55) / 100;
    const dotAlpha = (activeConfig.dotOpacity ?? 80) / 100;
    const dotRadius = activeConfig.dotSize ?? 4.5;

    if (attributes.length < 3) return null;

    return (
        <div 
            className={cn("relative flex items-start justify-center select-none mx-auto", className)} 
            style={{ 
                width: CONTAINER_SIZE * scale, 
                height: chartHeight * scale 
            }}
        >
            <div style={{
                width: CONTAINER_SIZE,
                height: CONTAINER_SIZE,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                position: 'relative'
            }}>
            
            {/* SVG LAYER */}
            <svg 
                width={CONTAINER_SIZE} 
                height={CONTAINER_SIZE} 
                viewBox={`0 0 ${CONTAINER_SIZE} ${CONTAINER_SIZE}`}
                className="absolute inset-0 pointer-events-none"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* Standard Radial Gradient */}
                    {!isMulticolor && (
                        <radialGradient id="polyFillGradient" cx="50%" cy="50%" r="55%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor={`rgba(${fillRgb.r}, ${fillRgb.g}, ${fillRgb.b}, ${fillAlpha * 0.15})`} />
                            <stop offset="50%" stopColor={`rgba(${fillRgb.r}, ${fillRgb.g}, ${fillRgb.b}, ${fillAlpha * 0.5})`} />
                            <stop offset="85%" stopColor={`rgba(${fillRgb.r}, ${fillRgb.g}, ${fillRgb.b}, ${fillAlpha * 0.85})`} />
                            <stop offset="100%" stopColor={`rgba(${fillRgb.r}, ${fillRgb.g}, ${fillRgb.b}, ${fillAlpha})`} />
                        </radialGradient>
                    )}

                    {/* Sector Gradients for Multicolor Rainbow Projection */}
                    {isMulticolor && chartData.map((p, i) => {
                        const nextIdx = (i + 1) % chartData.length;
                        const nextP = chartData[nextIdx];
                        return (
                            <linearGradient 
                                key={`sector-grad-${i}`} 
                                id={`sectorGrad-${i}`}
                                x1={p.valuePoint.x} y1={p.valuePoint.y}
                                x2={nextP.valuePoint.x} y2={nextP.valuePoint.y}
                                gradientUnits="userSpaceOnUse"
                            >
                                <stop offset="0%" stopColor={p.color} stopOpacity={fillAlpha} />
                                <stop offset="100%" stopColor={nextP.color} stopOpacity={fillAlpha} />
                            </linearGradient>
                        );
                    })}

                    {/* Per-segment gradients for the border lines */}
                    {chartData.map((p, i) => {
                        const nextIdx = (i + 1) % chartData.length;
                        const nextP = chartData[nextIdx];
                        const useLineFill = activeConfig.lineColorMode === 'fill' && !isMulticolor;
                        const segColor1 = useLineFill ? activeConfig.fillColor : p.color;
                        const segColor2 = useLineFill ? activeConfig.fillColor : nextP.color;
                        return (
                            <linearGradient 
                                key={`seg-grad-${i}`} 
                                id={`segGrad-${i}`}
                                x1={p.valuePoint.x} y1={p.valuePoint.y}
                                x2={nextP.valuePoint.x} y2={nextP.valuePoint.y}
                                gradientUnits="userSpaceOnUse"
                            >
                                <stop offset="0%" stopColor={segColor1} stopOpacity="0.9" />
                                <stop offset="100%" stopColor={segColor2} stopOpacity="0.9" />
                            </linearGradient>
                        );
                    })}
                </defs>

                {/* Grid Web - Reference Lines */}
                {gridLevels.map((level, i) => (
                    <path
                        key={`grid-${i}`}
                        d={chartData.map((p, j) => {
                            const r = GRID_RADIUS * level;
                            const x = CENTER + r * Math.cos(p.angleRad);
                            const y = CENTER + r * Math.sin(p.angleRad);
                            return `${j === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(" ") + " Z"}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="0.6"
                    />
                ))}

                {/* Connector to Icon */}
                {chartData.map((p, i) => (
                    <line
                        key={`conn-${i}`}
                        x1={p.gridPoint.x}
                        y1={p.gridPoint.y}
                        x2={p.iconPoint.x}
                        y2={p.iconPoint.y}
                        stroke={p.color}
                        strokeOpacity="0.2" 
                        strokeDasharray="2 2"
                    />
                ))}

                {/* POLYGON FILL: Rainbow Triangles Blending into Center OR Standard Radial Gradient */}
                {isMulticolor ? (
                    <g>
                        {chartData.map((p, i) => {
                            const nextIdx = (i + 1) % chartData.length;
                            const nextP = chartData[nextIdx];
                            const triPath = `M ${CENTER} ${CENTER} L ${p.valuePoint.x} ${p.valuePoint.y} L ${nextP.valuePoint.x} ${nextP.valuePoint.y} Z`;
                            return (
                                <motion.path
                                    key={`tri-${i}`}
                                    d={triPath}
                                    fill={`url(#sectorGrad-${i})`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: i * 0.04 }}
                                />
                            );
                        })}
                    </g>
                ) : (
                    <motion.path
                        d={polygonPath}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
                        style={{ originX: "50%", originY: "50%" }}
                        fill={activeConfig.fillStyleMode === 'solid' ? `rgba(${fillRgb.r}, ${fillRgb.g}, ${fillRgb.b}, ${fillAlpha})` : "url(#polyFillGradient)"}
                        stroke={`rgba(${fillRgb.r}, ${fillRgb.g}, ${fillRgb.b}, ${fillAlpha * 0.6})`}
                        strokeWidth="1"
                    />
                )}

                {/* BORDER: Smooth gradient line segments */}
                {chartData.map((p, i) => {
                    const nextIdx = (i + 1) % chartData.length;
                    const nextP = chartData[nextIdx];
                    return (
                        <motion.line
                            key={`border-seg-${i}`}
                            x1={p.valuePoint.x}
                            y1={p.valuePoint.y}
                            x2={nextP.valuePoint.x}
                            y2={nextP.valuePoint.y}
                            stroke={`url(#segGrad-${i})`}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ 
                                duration: 0.3, 
                                ease: "easeInOut", 
                                delay: 0.15 + (i * 0.03) 
                            }}
                            style={{ filter: `drop-shadow(0 0 6px ${p.color}60)` }}
                        />
                    );
                })}

                {/* DATA VERTEX DOTS: NO WHITE BORDER, CUSTOM SIZE */}
                {chartData.map((p, i) => {
                    const dotColor = (activeConfig.dotColorMode === 'fill' && !isMulticolor) ? activeConfig.fillColor : p.color;
                    return (
                        <motion.circle
                            key={`pt-${i}`}
                            cx={p.valuePoint.x}
                            cy={p.valuePoint.y}
                            r={dotRadius}
                            fill={dotColor}
                            fillOpacity={dotAlpha}
                            stroke="none"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + (i * 0.05), duration: 0.2, type: "spring", stiffness: 300 }}
                            style={{ filter: `drop-shadow(0 0 6px ${dotColor}dd)` }}
                        />
                    );
                })}

            </svg>

            {/* HTML LABELS LAYER */}
            {chartData.map((item, i) => {
                const Icon = item.icon;
                const labelText = t(item.label, item.label.replace('traits.', '')) as string;
                
                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + (i * 0.05), type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute pointer-events-auto group"
                        style={{
                            left: item.iconPoint.x,
                            top: item.iconPoint.y,
                            overflow: 'visible'
                        }}
                    >
                         <div 
                            className={cn(
                                "absolute flex items-center gap-1.5", 
                                item.alignment === 'top' && "flex-col-reverse -translate-x-1/2 -translate-y-[calc(100%-16px)]", 
                                item.alignment === 'bottom' && "flex-col -translate-x-1/2 -translate-y-[16px]",
                                item.alignment === 'right' && "flex-row -translate-y-1/2 -translate-x-[16px]",
                                item.alignment === 'left' && "flex-row-reverse -translate-y-1/2 -translate-x-[calc(100%-16px)]"
                            )}
                        >
                            <div 
                                className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm z-10 shrink-0"
                                style={{ 
                                    backgroundColor: `${item.color}20`,
                                    borderColor: `${item.color}40`,
                                }}
                            >
                                <Icon size={14} style={{ color: item.color }} />
                            </div>
                            
                            <div className={cn(
                                "flex flex-col",
                                (item.alignment === 'top' || item.alignment === 'bottom') && "items-center",
                                item.alignment === 'right' && "items-start",
                                item.alignment === 'left' && "items-end"
                            )}>
                                <span 
                                    className={cn(
                                        "font-bold uppercase drop-shadow-sm leading-none mb-0.5",
                                        getLabelClassName(labelText)
                                    )}
                                    style={{ color: item.color }}
                                >
                                    {labelText}
                                </span>
                                <span className="text-[8px] font-mono text-white/40 leading-none">
                                    {t('dashboard.level')} {item.level}
                                </span>
                            </div>
                        </div>

                    </motion.div>
                );
            })}
            
            </div>
        </div>
    );
};
