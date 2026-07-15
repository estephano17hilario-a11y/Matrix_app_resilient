import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface MoodSnakeChartProps {
    data: {
        date: string;
        display: string;
        mood: number | null; // 1-5
        moodColor: string;
        moodIcon: string;
    }[];
}

// --- CURVE MATH UTILS ---
const getControlPoints = (p1: any, p2: any, p3: any, t = 0.3) => {
    const d1 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const d2 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));
    
    if (d1 === 0 || d2 === 0) return [{ x: p2.x, y: p2.y }, { x: p2.x, y: p2.y }];

    const fa = (t * d1) / (d1 + d2);
    const fb = t - fa;
    
    const p1x = p2.x - fa * (p3.x - p1.x);
    const p1y = p2.y - fa * (p3.y - p1.y);
    const p2x = p2.x + fb * (p3.x - p1.x);
    const p2y = p2.y + fb * (p3.y - p1.y);
    
    return [{ x: p1x, y: p1y }, { x: p2x, y: p2y }];
};

export const MoodSnakeChart = ({ data }: MoodSnakeChartProps) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setDimensions({ width: clientWidth, height: clientHeight });
            }
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    const PADDING_X = Math.max(dimensions.width * 0.05, 20); 
    const PADDING_Y = Math.max(dimensions.height * 0.15, 60); 
    const WIDTH = dimensions.width;
    const CHART_HEIGHT = dimensions.height;
    
    const moodCount = useMemo(() => data.filter(d => d.mood !== null).length, [data]);

    const points = useMemo(() => {
        if (WIDTH === 0 || CHART_HEIGHT === 0 || data.length === 0) return [];
        
        const stepX = data.length > 1 ? (WIDTH - PADDING_X * 2) / (data.length - 1) : 0;
        const nextKnownMood: (number | null)[] = new Array(data.length).fill(null);
        const nextKnownColor: (string | null)[] = new Array(data.length).fill(null);
        let nextMood: number | null = null;
        let nextColor: string | null = null;
        for (let i = data.length - 1; i >= 0; i -= 1) {
            if (data[i].mood !== null) {
                nextMood = data[i].mood;
                nextColor = data[i].moodColor;
            }
            nextKnownMood[i] = nextMood;
            nextKnownColor[i] = nextColor;
        }

        let lastMood: number | null = null;
        let lastColor: string | null = null;
        return data.map((d, i) => {
            if (d.mood !== null) {
                lastMood = d.mood;
                lastColor = d.moodColor;
            }
            const moodValue = d.mood ?? lastMood ?? nextKnownMood[i] ?? 3;
            const colorValue = d.moodColor || lastColor || nextKnownColor[i] || '#64748b';
            return {
                x: PADDING_X + i * stepX,
                y: CHART_HEIGHT - PADDING_Y - ((moodValue - 1) / 4) * (CHART_HEIGHT - PADDING_Y * 2),
                color: colorValue,
                mood: moodValue,
                display: d.display,
                icon: d.moodIcon,
                hasMood: d.mood !== null
            };
        });
    }, [data, WIDTH, CHART_HEIGHT, PADDING_X, PADDING_Y]);

    const pathData = useMemo(() => {
        if (points.length === 0) return '';
        
        let d = `M ${points[0].x} ${points[0].y}`;
        
        if (points.length === 2) {
             const p1 = points[0];
             const p2 = points[1];
             const midX = (p1.x + p2.x) / 2;
             d += ` C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
        } else {
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i - 1] || points[i];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2] || p2;

                const cp1 = getControlPoints(p0, p1, p2)[1];
                const cp2 = getControlPoints(p1, p2, p3)[0];

                d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
            }
        }
        return d;
    }, [points]);

    const gradientId = "snakeGradientPastel";
    const gradientStops = points.map((p, i) => {
        const offset = (i / (points.length - 1)) * 100;
        return <stop key={i} offset={`${offset}%`} stopColor={p.color} stopOpacity={0.9} />;
    });

    if (moodCount < 2) {
        return (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-sm italic">
                {t('notes.addMoreEntriesMoodFlow', 'Add more entries to see your mood flow...')}
            </div>
        );
    }

    const pointCount = points.length;
    const strokeWidth = pointCount >= 28 ? 8 : pointCount >= 20 ? 9 : pointCount >= 14 ? 10 : 12;
    const iconSize = pointCount >= 28 ? 20 : pointCount >= 20 ? 22 : pointCount >= 14 ? 24 : 28;
    const circleRadius = Math.round(iconSize * 0.7);
    const textDy = Math.round(iconSize * 0.35);
    const markerOffset = Math.round(iconSize * 0.9);
    const labelStep = pointCount > 14 ? Math.ceil(pointCount / 8) : 1;

    return (
        <div ref={containerRef} className="w-full h-full relative select-none">
            {WIDTH > 0 && CHART_HEIGHT > 0 && (
                <svg 
                    width={WIDTH}
                    height={CHART_HEIGHT}
                    className="overflow-visible pointer-events-none"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                            {gradientStops}
                        </linearGradient>
                    </defs>

                    {/* --- BACKGROUND GRID --- */}
                    {[1, 2, 3, 4, 5].map(level => {
                        const y = CHART_HEIGHT - PADDING_Y - ((level - 1) / 4) * (CHART_HEIGHT - PADDING_Y * 2);
                        return (
                            <line 
                                key={`h-${level}`} 
                                x1={PADDING_X} y1={y} 
                                x2={WIDTH - PADDING_X} y2={y} 
                                stroke="rgba(255,255,255,0.03)" 
                                strokeWidth="1" 
                                strokeDasharray="4 4"
                            />
                        );
                    })}

                    {/* --- THE SNAKE BODY --- */}
                    <motion.path 
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        d={pathData} 
                        fill="none" 
                        stroke={`url(#${gradientId})`} 
                        strokeWidth={strokeWidth} 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    
                    {/* --- MARKERS --- */}
                    {points.map((p, i) => (
                        <motion.g 
                            key={`marker-${i}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.05, type: 'spring', stiffness: 400, damping: 20 }}
                        >
                            {p.hasMood && (
                                <>
                                    <circle cx={p.x} cy={p.y} r={circleRadius} fill="rgba(255,255,255,0.1)" />
                                    <text 
                                        x={p.x} 
                                        y={p.y} 
                                        dy={textDy} 
                                        textAnchor="middle" 
                                        fontSize={iconSize} 
                                        className="pointer-events-none select-none"
                                    >
                                        {p.icon}
                                    </text>
                                </>
                            )}

                            {(i % labelStep === 0 || i === points.length - 1) && (
                                <text 
                                    x={p.x} 
                                    y={CHART_HEIGHT - 10} 
                                    textAnchor="middle" 
                                    fontSize="10" 
                                    fill="rgba(255,255,255,0.4)" 
                                    fontWeight="bold"
                                    style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                >
                                    {p.display}
                                </text>
                            )}
                            
                            {p.hasMood && (
                                <line 
                                    x1={p.x} y1={p.y + markerOffset} 
                                    x2={p.x} y2={CHART_HEIGHT - 20} 
                                    stroke="rgba(255,255,255,0.08)" 
                                    strokeWidth="1" 
                                    strokeDasharray="2 2"
                                />
                            )}
                        </motion.g>
                    ))}
                </svg>
            )}
        </div>
    );
};
