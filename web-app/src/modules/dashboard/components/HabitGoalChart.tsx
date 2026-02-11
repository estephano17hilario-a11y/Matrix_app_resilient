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
    
    // X Scale: index / (length - 1) * width
    const getX = (index: number) => {
        if (dataPoints.length <= 1) return index === 0 ? 0 : width;
        return (index / (dataPoints.length - 1)) * (width - (padding * 2)) + padding;
    };

    // Y Scale: height - (value / maxY * height)
    const getY = (value: number) => {
        return height - ((value / maxY) * (height - (padding * 2))) - padding;
    };

    // 3. Generate Paths
    const areaPath = useMemo(() => {
        if (cumulativeData.length === 0) return '';
        
        let path = `M ${getX(0)} ${height}`; // Start bottom-left
        
        cumulativeData.forEach((point, i) => {
            path += ` L ${getX(i)} ${getY(point.cumulativeValue)}`;
        });

        // Close the area
        path += ` L ${getX(cumulativeData.length - 1)} ${height} Z`;
        return path;
    }, [cumulativeData, maxY]);

    const linePath = useMemo(() => {
        if (cumulativeData.length === 0) return '';
        
        let path = `M ${getX(0)} ${getY(cumulativeData[0].cumulativeValue)}`;
        
        cumulativeData.forEach((point, i) => {
            path += ` L ${getX(i)} ${getY(point.cumulativeValue)}`;
        });

        return path;
    }, [cumulativeData, maxY]);

    const goalPath = useMemo(() => {
        const startX = getX(0);
        const endX = getX(dataPoints.length - 1);
        const endY = getY(goalValue);
        return `M ${startX} ${getY(0)} L ${endX} ${endY}`;
    }, [dataPoints.length, goalValue, maxY]);

    // Last Point for Dots/Vertical Line
    const lastPoint = cumulativeData[cumulativeData.length - 1];
    const lastX = lastPoint ? getX(cumulativeData.length - 1) : 0;
    const lastY = lastPoint ? getY(lastPoint.cumulativeValue) : 0;
    const goalY = getY(goalValue);

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
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                        <feMerge>
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
                    strokeDasharray="1 1"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                />

                {/* 2. Area Fill (Blue) */}
                <motion.path
                    d={areaPath}
                    fill="url(#chartGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                />

                {/* 3. Progress Line (Blue) */}
                <motion.path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    filter="url(#glow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, type: "spring", stiffness: 50 }}
                />

                {/* 4. Vertical Drop Line (at current progress) */}
                <motion.line
                    x1={lastX}
                    y1={lastY}
                    x2={lastX}
                    y2={height}
                    stroke={color}
                    strokeWidth="0.5"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: 1.2, duration: 0.3 }}
                    style={{ originY: 0 }}
                />

                {/* 5. End Points */}
                {/* Goal Endpoint */}
                <motion.circle
                    cx={getX(dataPoints.length - 1)}
                    cy={goalY}
                    r="1"
                    fill="#52525b"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1 }}
                />

                {/* Current Endpoint */}
                <motion.circle
                    cx={lastX}
                    cy={lastY}
                    r="1.5"
                    fill="#000"
                    stroke={color}
                    strokeWidth="0.5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2, type: "spring" }}
                />
            </svg>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[10px] text-zinc-500 font-medium mt-2 px-1">
                <span>{format(startDate, 'd MMM', { locale: es })}</span>
                <span>{format(endDate, 'd MMM', { locale: es })}</span>
            </div>
        </div>
    );
};
