import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Attribute } from '../../../types';
import { cn } from '../../../utils/cn';

interface TraitRadarChartProps {
    attributes: Attribute[];
    className?: string;
}

export const TraitRadarChart: React.FC<TraitRadarChartProps> = ({ attributes, className }) => {
    // 1. CONFIGURATION
    const CONTAINER_SIZE = 340; // REDUCED: Was 420. Fits better in mobile/card layouts.
    const CENTER = CONTAINER_SIZE / 2;
    const GRID_RADIUS = 85; // Scaled down (was 100)
    const ICON_DISTANCE = 115; // Scaled down (was 135)

    // Helper: Map Trait IDs to Hex Colors (Backup/Override)
    const TRAIT_COLORS: Record<string, string> = {
        // SPANISH IDs (From Constants)
        DISCIPLINA: '#3b82f6',  // Blue
        FISICO: '#ef4444',      // Red
        MENTAL: '#06b6d4',      // Cyan
        SOCIAL: '#ec4899',      // Pink
        ESPIRITU: '#8b5cf6',    // Violet
        FINANZAS: '#10b981',    // Emerald
        CREATIVIDAD: '#f59e0b', // Amber
        ORDEN: '#64748b',       // Slate
        LIDERAZGO: '#6366f1',   // Indigo
        RESILIENCIA: '#f97316', // Orange
        VITALIDAD: '#84cc16',   // Lime
        ESTILO: '#d946ef',      // Fuchsia
        
        // English Fallbacks
        relentless: '#ef4444', 
        strategic: '#06b6d4',  
        creative: '#d946ef',   
        disciplined: '#10b981', 
        leader: '#f59e0b',     
        analyst: '#6366f1',    
    };

    // 2. DATA PREPARATION
    const maxLevel = useMemo(() => {
        if (!attributes.length) return 10;
        const max = Math.max(...attributes.map(a => a.level), 1);
        return Math.max(max, 5);
    }, [attributes]);

    const chartData = useMemo(() => {
        const count = attributes.length;
        if (count < 3) return [];

        return attributes.map((attr, index) => {
            // Angle: -90deg (Top) is 0 index
            const angleDeg = (360 / count) * index - 90;
            const angleRad = angleDeg * (Math.PI / 180);

            // Helper for coordinates
            const getPoint = (r: number) => ({
                x: CENTER + r * Math.cos(angleRad),
                y: CENTER + r * Math.sin(angleRad)
            });

            const rawScore = attr.level + (attr.xp / attr.maxXp);
            const normalizedScore = Math.min(rawScore / maxLevel, 1);

            // Determine Label Alignment based on Angle
            let alignment: 'top' | 'right' | 'bottom' | 'left' = 'right';
            
            if (angleDeg === -90 || angleDeg === 270) alignment = 'top';
            else if (angleDeg === 90) alignment = 'bottom';
            else if (angleDeg > -90 && angleDeg < 90) alignment = 'right';
            else alignment = 'left';

            // Resolve color:
            // 1. Check if attr.color is already a Hex string (Best case)
            // 2. Lookup by ID (Upper or Lower case)
            // 3. Fallback to white
            let color = '#ffffff';
            if (attr.color && attr.color.startsWith('#')) {
                color = attr.color;
            } else {
                color = TRAIT_COLORS[attr.id] || TRAIT_COLORS[attr.id.toUpperCase()] || TRAIT_COLORS[attr.id.toLowerCase()] || '#ffffff';
            }

            return {
                ...attr,
                color, // OVERRIDE the gradient string with Hex
                angleRad,
                gridPoint: getPoint(GRID_RADIUS),
                valuePoint: getPoint(GRID_RADIUS * normalizedScore),
                iconPoint: getPoint(ICON_DISTANCE),
                alignment
            };
        });
    }, [attributes, maxLevel]);

    // 3. POLYGON PATHS
    const polygonPath = useMemo(() => {
        if (chartData.length < 3) return "";
        return chartData.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.valuePoint.x} ${p.valuePoint.y}`
        ).join(" ") + " Z";
    }, [chartData]);

    const gridLevels = [0.33, 0.66, 1];

    if (attributes.length < 3) return null;

    return (
        // Removed left-1/2 -translate-x-1/2. Rely on parent Flexbox for true centering.
        // Added mx-auto for safety.
        <div className={cn("relative flex items-center justify-center select-none mx-auto", className)} style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}>
            
            {/* SVG LAYER */}
            <svg 
                width={CONTAINER_SIZE} 
                height={CONTAINER_SIZE} 
                viewBox={`0 0 ${CONTAINER_SIZE} ${CONTAINER_SIZE}`}
                className="absolute inset-0 pointer-events-none"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <radialGradient id="radarGradient" cx="50%" cy="50%" r="45%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.2)" />
                        <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    {/* Dynamic Gradients for Perimeter Segments - SHARP TRANSITION FIXED */}
                    {chartData.map((p, i) => {
                        const nextP = chartData[(i + 1) % chartData.length];
                        return (
                            <linearGradient 
                                key={`seg-grad-${i}`} 
                                id={`seg-grad-${i}`} 
                                gradientUnits="userSpaceOnUse"
                                x1={p.valuePoint.x}
                                y1={p.valuePoint.y}
                                x2={nextP.valuePoint.x}
                                y2={nextP.valuePoint.y}
                            >
                                <stop offset="40%" stopColor={p.color} />
                                <stop offset="60%" stopColor={nextP.color} />
                            </linearGradient>
                        );
                    })}
                </defs>

                {/* Grid Web - WHITE & VISIBLE (Reference Lines) */}
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
                        stroke="rgba(255, 255, 255, 0.3)" // Increased opacity
                        strokeWidth="0.6" // Increased visibility
                    />
                ))}

                {/* Spokes - COLORED ZONES (Guiding the eye) */}
                {chartData.map((p, i) => (
                    <line
                        key={`spoke-${i}`}
                        x1={CENTER}
                        y1={CENTER}
                        x2={p.gridPoint.x}
                        y2={p.gridPoint.y}
                        stroke={p.color}
                        strokeOpacity="0.3" // Increased opacity
                        strokeWidth="0.6" // Increased visibility
                        strokeDasharray="4 4" // Dotted to distinguish from value lines
                    />
                ))}

                {/* Connector to Icon - SUBTLE */}
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

                {/* Active Value Lines (Center to Point) - STRONGER COLOR */}
                {chartData.map((p, i) => (
                    <motion.line
                        key={`active-${i}`}
                        x1={CENTER}
                        y1={CENTER}
                        x2={p.valuePoint.x}
                        y2={p.valuePoint.y}
                        stroke={p.color}
                        strokeWidth="1.5" // Increased thickness for vividness
                        strokeOpacity="1" // FULL VISIBILITY (VIVID)
                        strokeLinecap="round"
                        initial={{ x2: CENTER, y2: CENTER }}
                        animate={{ x2: p.valuePoint.x, y2: p.valuePoint.y }}
                        transition={{ type: "spring", stiffness: 40, damping: 10 }}
                    />
                ))}

                {/* Data Fill (Background) */}
                <motion.path
                    initial={{ d: chartData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${CENTER} ${CENTER}`).join(" ") + " Z", opacity: 0 }}
                    animate={{ d: polygonPath, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 40, damping: 10 }}
                    fill="url(#radarGradient)" // Use the gradient fill again for depth
                    fillOpacity="0.2" // Reduced opacity
                    stroke="none"
                    filter="url(#glow)"
                />

                {/* Data Perimeter - THIN GRADIENT WIREFRAME (CEO Precision) */}
                {chartData.map((p, i) => {
                    const nextP = chartData[(i + 1) % chartData.length];
                    return (
                        <motion.line
                            key={`perim-${i}`}
                            x1={p.valuePoint.x}
                            y1={p.valuePoint.y}
                            x2={nextP.valuePoint.x}
                            y2={nextP.valuePoint.y}
                            stroke={`url(#seg-grad-${i})`} // Gradient connecting traits
                            strokeWidth="0.5" // Ultra-thin (0.7 -> 0.5)
                            strokeOpacity="0.8"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1, x1: p.valuePoint.x, y1: p.valuePoint.y, x2: nextP.valuePoint.x, y2: nextP.valuePoint.y }}
                            transition={{ type: "spring", stiffness: 40, damping: 10 }}
                        />
                    );
                })}

                {/* Data Points - JEWELS */}
                {chartData.map((p, i) => (
                    <motion.circle
                        key={`pt-${i}`}
                        cx={p.valuePoint.x}
                        cy={p.valuePoint.y}
                        r={3.25} // Balanced size (between 2.5 and 4)
                        fill={p.color} // Trait color
                        stroke="none" // REMOVED WHITE STROKE COMPLETELY
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1, cx: p.valuePoint.x, cy: p.valuePoint.y }}
                        transition={{ delay: i * 0.05, type: "spring" }}
                    />
                ))}
            </svg>

            {/* HTML LABELS LAYER */}
            {chartData.map((item, i) => {
                const Icon = item.icon;
                
                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + (i * 0.05) }}
                        className="absolute pointer-events-auto group"
                        style={{
                            left: item.iconPoint.x,
                            top: item.iconPoint.y,
                            width: 0, // Zero width wrapper to act as anchor
                            height: 0,
                            overflow: 'visible'
                        }}
                    >
                         {/* MANUAL OFFSET WRAPPER TO FORCE ICON CENTER TO (0,0) 
                             Logic: Icon is 32x32 (center 16). 
                             We want Icon Center to be at Anchor (0,0).
                             Text flows OUTWARD from the icon.
                         */}
                         <div 
                            className={cn(
                                "absolute flex items-center gap-1.5", 
                                // TOP: Text Above (-90deg). Icon Bottom. Shift Up by (H-16).
                                item.alignment === 'top' && "flex-col-reverse -translate-x-1/2 -translate-y-[calc(100%-16px)]", 
                                // BOTTOM: Text Below (90deg). Icon Top. Shift Up by 16.
                                item.alignment === 'bottom' && "flex-col -translate-x-1/2 -translate-y-[16px]",
                                // RIGHT: Text Right. Icon Left. Shift Left by 16.
                                item.alignment === 'right' && "flex-row -translate-y-1/2 -translate-x-[16px]",
                                // LEFT: Text Left. Icon Right. Shift Left by (W-16).
                                item.alignment === 'left' && "flex-row-reverse -translate-y-1/2 -translate-x-[calc(100%-16px)]"
                            )}
                        >
                            <div 
                                className="w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md border shadow-lg z-10 shrink-0"
                                style={{ 
                                    backgroundColor: `${item.color}15`,
                                    borderColor: `${item.color}30`,
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
                                    className="text-[10px] font-bold uppercase tracking-widest drop-shadow-md leading-none mb-0.5"
                                    style={{ color: item.color }}
                                >
                                    {item.label}
                                </span>
                                <span className="text-[9px] font-mono text-white/40 leading-none">
                                    LVL {item.level}
                                </span>
                            </div>
                        </div>

                    </motion.div>
                );
            })}
            
            {/* Center Core */}
            <div className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_15px_white] z-20 animate-pulse" />
        </div>
    );
};
