import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HabitGoalChartProps {
    dataPoints: {
        date: Date;
        value: number;
        label: string;
        isToday: boolean;
    }[];
    goalValue: number;
    totalValue: number;
    startDate: Date;
    endDate: Date;
    color?: string;
}

// Helper functions for smooth curve (Catmull-Rom to Cubic Bezier)
const line = (pointA: number[], pointB: number[]) => {
    const lengthX = pointB[0] - pointA[0];
    const lengthY = pointB[1] - pointA[1];
    return {
        length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
        angle: Math.atan2(lengthY, lengthX)
    };
};

const controlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.15;
    const o = line(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * smoothing;
    const x = current[0] + Math.cos(angle) * length;
    const y = current[1] + Math.sin(angle) * length;
    return [x, y];
};

const bezierCommand = (point: number[], i: number, a: number[][]) => {
    const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
    const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
    return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
};

const getSmoothPath = (points: number[][]) => {
    if (points.length === 0) return "";
    return points.reduce((acc, point, i, a) => i === 0
        ? `M ${point[0]},${point[1]}`
        : `${acc} ${bezierCommand(point, i, a)}`
    , '');
};

export const HabitGoalChart: React.FC<HabitGoalChartProps> = ({ 
    dataPoints, 
    goalValue, 
    totalValue,
    startDate, 
    endDate,
    color = '#3b82f6'
}) => {
    // 1. Calculate Cumulative Data
    const cumulativeData = useMemo(() => {
        let sum = 0;
        return dataPoints.map(point => {
            sum += point.value;
            return {
                ...point,
                cumulativeValue: sum
            };
        });
    }, [dataPoints]);

    // 2. Dimensions & Scales
    const width = 100;
    const height = 50;
    const padding = 2;
    
    // Max value for Y scale (Goal or Total, whichever is higher, plus some buffer)
    const maxY = Math.max(goalValue, totalValue) * 1.1 || 10;

    // Extended Data for visual origin (0,0)
    const visualData = useMemo(() => {
        // Prepend a virtual start point at (0,0)
        // We use a simple object with cumulativeValue: 0
        return [{ cumulativeValue: 0 }, ...cumulativeData];
    }, [cumulativeData]);
    
    // X Scale: index / (length - 1) * width
    // Now we use visualData.length
    const getX = (index: number) => {
        const count = visualData.length;
        if (count <= 1) return index === 0 ? padding : width - padding;
        return (index / (count - 1)) * (width - (padding * 2)) + padding;
    };

    // Y Scale: height - (value / maxY * height)
    const getY = (value: number) => {
        return height - ((value / maxY) * (height - (padding * 2))) - padding;
    };

    // 3. Generate Paths
    const points = useMemo(() => {
        return visualData.map((d, i) => [getX(i), getY(d.cumulativeValue)]);
    }, [visualData, maxY]);

    // Filter points to only show up to current moment
    const progressPoints = useMemo(() => {
        const now = new Date();
        
        // Ensure we are comparing correctly regardless of time
        // We want to include points up to the "current slot"
        
        // Always include the starting point (0,0 virtual)
        const validIndices = [0];
        
        dataPoints.forEach((p, i) => {
            const pointDate = new Date(p.date);
            // Compare full timestamps to handle both Daily (00:00) and Hourly points
            if (pointDate <= now) {
                 validIndices.push(i + 1);
            }
        });

        return validIndices.map(i => points[i]);
    }, [points, dataPoints]);

    const areaPath = useMemo(() => {
        if (progressPoints.length === 0) return '';
        
        const smoothCurve = getSmoothPath(progressPoints);
        // Close the area
        // From last point -> bottom right (of the progress, not chart) -> bottom left -> first point
        const lastPoint = progressPoints[progressPoints.length - 1];
        const firstPoint = progressPoints[0];
        
        return `${smoothCurve} L ${lastPoint[0]} ${height} L ${firstPoint[0]} ${height} Z`;
    }, [progressPoints]);

    const linePath = useMemo(() => {
        return getSmoothPath(progressPoints);
    }, [progressPoints]);

    const goalPath = useMemo(() => {
        // Goal Line also starts from 0,0 (index 0 of visualData)
        // And goes to the end (index length-1)
        const startX = getX(0);
        const endX = getX(visualData.length - 1);
        const startY = getY(0); // Origin Y
        const endY = getY(goalValue);
        return `M ${startX} ${startY} L ${endX} ${endY}`;
    }, [visualData.length, goalValue, maxY]);

    // Last Point for Dots/Vertical Line (Now based on progressPoints)
    const lastPointCoordinates = progressPoints[progressPoints.length - 1];
    const lastX = lastPointCoordinates ? lastPointCoordinates[0] : getX(0);
    const lastY = lastPointCoordinates ? lastPointCoordinates[1] : getY(0);
    
    // Find the cumulative value for the last point to check if goal is met
    const lastProgressIndex = progressPoints.length - 1; 
    const currentCumulativeValue = visualData[lastProgressIndex]?.cumulativeValue || 0;
    
    const goalY = getY(goalValue);

    // Calculate the Y position on the Goal Line at the current X position
    // Goal Line equation: Y = m*X + b
    // Start (0, 0 value -> Height Y), End (Width, Goal value -> goalY)
    // Actually we need to interpolate the Y value of the goal line at lastX
    const startX = getX(0);
    const endX = getX(visualData.length - 1);
    const startY = getY(0);
    const endY_Goal = getY(goalValue);
    
    // Linear interpolation for Goal Y at current X
    // Fraction of progress along X axis
    const fractionX = (lastX - startX) / (endX - startX || 1); 
    // Calculate expected Y (Goal) at this X
    const currentGoalY = startY + (endY_Goal - startY) * fractionX;


    // Check if goal is met (or exceeded) based on current progress
    const isGoalMet = currentCumulativeValue >= goalValue;

    return (
        <div className="w-full h-full relative select-none">
            <svg 
                viewBox={`0 0 ${width} ${height}`} 
                preserveAspectRatio="none" 
                className="w-full h-full overflow-visible"
            >
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="habit-goal-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="0.4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    {/* Stronger Glow for Overload Effect */}
                    <filter id="habit-goal-overload" x="-100%" y="-100%" width="300%" height="300%">
                         <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                         <feMerge>
                             <feMergeNode in="coloredBlur" />
                             <feMergeNode in="coloredBlur" />
                             <feMergeNode in="SourceGraphic" />
                         </feMerge>
                    </filter>
                </defs>

                {/* 1. Goal Line (Grey) */}
                <motion.path
                    d={goalPath}
                    fill="none"
                    stroke="#52525b" // zinc-600
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />

                {/* Gap Line (Red) - Connects Current Progress to Expected Goal at this X */}
                <motion.line
                    x1={lastX}
                    y1={lastY}
                    x2={lastX}
                    y2={currentGoalY}
                    stroke="#ef4444" // Red-500
                    strokeWidth="0.6"
                    strokeDasharray="1 2"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                />

                {/* 2. Area Fill (Blue) */}
                <motion.path
                    d={areaPath}
                    fill="url(#chartGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                />

                {/* 3. Progress Line (Blue) */}
                <motion.path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.8" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={isGoalMet ? "url(#habit-goal-overload)" : "url(#habit-goal-glow)"}
                    initial={{ pathLength: 0 }}
                    animate={{ 
                        pathLength: 1,
                        strokeWidth: isGoalMet ? [0.8, 1.2, 0.8] : 0.8,
                        strokeOpacity: isGoalMet ? [1, 0.8, 1] : 1
                    }}
                    transition={{ 
                        pathLength: { duration: 0.8, ease: "easeOut" },
                        strokeWidth: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        strokeOpacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                />

                {/* 4. Vertical Drop Line (at current progress) */}
                <motion.line
                    x1={lastX}
                    y1={height - 2} // Ends a bit higher from bottom
                    x2={lastX}
                    y2={Math.max(lastY, currentGoalY)} // To whichever is lower (visually higher value)
                    stroke={color}
                    strokeWidth="0.6"
                    strokeDasharray="1 2"
                    strokeLinecap="round"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 0.2, scaleY: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    style={{ originY: 1 }}
                />

                {/* 5. End Points - Moved OUTSIDE SVG to avoid distortion */}
            </svg>

            {/* Goal Endpoint (Absolute Div) */}
            <motion.div
                className="absolute rounded-full border border-zinc-600 bg-zinc-900 z-10"
                style={{
                    left: `${(getX(visualData.length - 1) / width) * 100}%`,
                    top: `${(goalY / height) * 100}%`,
                    width: '8px',
                    height: '8px',
                    x: '-50%',
                    y: '-50%'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1 }}
            />

            {/* Current Endpoint (Absolute Div) */}
            <motion.div
                className="absolute rounded-full flex items-center justify-center z-20"
                style={{
                    left: `${(lastX / width) * 100}%`,
                    top: `${(lastY / height) * 100}%`,
                    width: isGoalMet ? '20px' : '12px',
                    height: isGoalMet ? '20px' : '12px',
                    x: '-50%',
                    y: '-50%'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
            >
                {/* Core Dot */}
                <motion.div 
                    className="rounded-full bg-black border border-solid"
                    style={{ 
                        borderColor: color,
                        borderWidth: isGoalMet ? 0 : 2,
                        backgroundColor: isGoalMet ? color : '#000',
                        width: isGoalMet ? '100%' : '8px', // Smaller core
                        height: isGoalMet ? '100%' : '8px',
                    }}
                    animate={{
                        scale: isGoalMet ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Overload Ripple Effect */}
                {isGoalMet && (
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            backgroundColor: color,
                            width: '100%',
                            height: '100%',
                            zIndex: -1
                        }}
                        animate={{
                            scale: [1, 2.5],
                            opacity: [0.6, 0]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                        }}
                    />
                )}
            </motion.div>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[10px] text-zinc-500 font-medium mt-2 px-1">
                <span>{format(startDate, 'd MMM', { locale: es })}</span>
                <span>{format(endDate, 'd MMM', { locale: es })}</span>
            </div>
        </div>
    );
};
