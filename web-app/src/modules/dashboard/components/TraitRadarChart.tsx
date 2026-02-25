import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Attribute } from '../../../types';
import { cn } from '../../../utils/cn';

interface TraitRadarChartProps {
    attributes: Attribute[];
    className?: string;
}

export const TraitRadarChart: React.FC<TraitRadarChartProps> = ({ attributes, className }) => {
    const { t } = useTranslation();
    // 1. CONFIGURATION
    const CONTAINER_SIZE = 300; // Expanded to fit new radius
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const availableWidth = width - 24; // Tighter padding
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
    const GRID_RADIUS = 95; // Increased to touch icons
    const ICON_DISTANCE = 110; // Moved further out

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
        // Safety check for NaN or infinite levels
        const validAttributes = attributes.filter(a => !isNaN(a.level) && isFinite(a.level));
        if (!validAttributes.length) return 10;
        
        const max = Math.max(...validAttributes.map(a => a.level || 1), 1);
        // Add 15% buffer so the highest value isn't stuck to the edge (User Request: "mental demasiado pegado")
        // This ensures the max value is around ~87% of the radius, leaving breathing room.
        return Math.max(max * 1.15, 5);
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

            // Safety checks for NaN
            const lvl = isNaN(attr.level) ? 1 : (attr.level || 1);
            const xp = isNaN(attr.xp) ? 0 : (attr.xp || 0);
            const maxXp = (isNaN(attr.maxXp) || attr.maxXp === 0) ? 100 : (attr.maxXp || 100);
            
            const rawScore = lvl + (xp / maxXp);
            // Clamp score between 0 and 1.2 (allow slight overflow for visual pop but prevent infinite)
            let normalizedScore = rawScore / maxLevel;
            
            if (isNaN(normalizedScore) || !isFinite(normalizedScore)) {
                normalizedScore = 0.1;
            }
            
            // Cap at 1.0 for the graph boundary, or 1.1 for "breaking limits" effect?
            // User complained about "sale completamente", so cap strictly at 1.0
            const validScore = Math.min(Math.max(normalizedScore, 0.05), 1.0);

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
        // WRAPPER: Handles the scaled size footprint
        <div 
            className={cn("relative flex items-center justify-center select-none mx-auto", className)} 
            style={{ 
                width: CONTAINER_SIZE * scale, 
                height: CONTAINER_SIZE * scale 
            }}
        >
            {/* INNER: The actual chart, scaled */}
            <div style={{
                width: CONTAINER_SIZE,
                height: CONTAINER_SIZE,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                position: 'relative' // Keeps it centered in the flex parent
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
                    <radialGradient id="radarGradient" cx="50%" cy="50%" r="65%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="rgba(100, 116, 139, 0.1)" />
                        <stop offset="100%" stopColor="rgba(100, 116, 139, 0.05)" />
                    </radialGradient>
                    {/* OPTIMIZATION: Removed SVG Filter "glow" for GPU performance */}
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

                {/* Data Fill (Background) */}
                <motion.path
                    initial={{ d: chartData.map((_, i) => `${i === 0 ? 'M' : 'L'} ${CENTER} ${CENTER}`).join(" ") + " Z", opacity: 0 }}
                    animate={{ d: polygonPath, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    fill="rgba(255, 255, 255, 0.5)" // White fill 50%
                    stroke="rgba(255, 255, 255, 0.4)" // Slightly brighter
                    strokeWidth="1.5"
                />

                {/* Data Perimeter - OPTIMIZED SINGLE PATH (Better Performance than many lines) */}
                <motion.path
                    d={polygonPath}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1, d: polygonPath }}
                    transition={{ type: "spring", stiffness: 40, damping: 10 }}
                    style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))' }} // Fake Glow
                />

                {/* Data Points - JEWELS (Subtle Gradient Tips) */}
                {chartData.map((p, i) => (
                    <motion.circle
                        key={`pt-${i}`}
                        cx={p.valuePoint.x}
                        cy={p.valuePoint.y}
                        r={2.5} // Tiny tip
                        fill={p.color} // Trait color
                        fillOpacity="0.9"
                        stroke={p.color}
                        strokeWidth="2"
                        strokeOpacity="0.3" // Gradient glow effect via stroke
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1, cx: p.valuePoint.x, cy: p.valuePoint.y }}
                        transition={{ delay: i * 0.05, type: "spring" }}
                    />
                ))}

            </svg>

            {/* HTML LABELS LAYER */}
            {chartData.map((item, i) => {
                const Icon = item.icon;
                const labelText = t(item.label) as string;
                
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
                                className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm z-10 shrink-0"
                                style={{ 
                                    backgroundColor: `${item.color}20`, // Slightly more opacity to compensate for no blur
                                    borderColor: `${item.color}40`,
                                    // backdropFilter: 'blur(8px)' // REMOVED: Expensive
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
