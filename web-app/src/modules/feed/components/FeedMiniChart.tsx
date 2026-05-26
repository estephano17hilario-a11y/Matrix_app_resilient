import React from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
  value: number;
  label?: string;
}

interface FeedMiniChartProps {
  data: DataPoint[];
  color: string;
  height?: number;
  type?: 'bar' | 'sparkline';
  showLabels?: boolean;
  delay?: number;
}

export const FeedMiniChart: React.FC<FeedMiniChartProps> = ({ 
  data, color, height = 48, type = 'bar', showLabels = true, delay = 0 
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const baseWidth = 196; // Standard reference width for calculations
  
  if (type === 'sparkline') {
    // SVG Sparkline
    const padding = 4;
    const chartWidth = baseWidth;
    const chartHeight = height;
    const usableWidth = chartWidth - padding * 2;
    const usableHeight = chartHeight - padding * 2;
    
    const points = data.map((d, i) => ({
      x: padding + (i / Math.max(data.length - 1, 1)) * usableWidth,
      y: padding + usableHeight - (d.value / maxValue) * usableHeight
    }));
    
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      
      // Smooth curve using quadratic bezier
      const prev = points[i - 1];
      const cpx = (prev.x + point.x) / 2;
      return `${acc} Q ${cpx} ${prev.y}, ${point.x} ${point.y}`;
    }, '');
    
    // Area path (same line + close at bottom)
    const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;
    
    return (
      <motion.div
        className="w-full flex flex-col items-center"
        style={{ willChange: 'transform, opacity' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
      >
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
          <defs>
            <linearGradient id={`sparkline-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          <motion.path
            d={areaD}
            fill={`url(#sparkline-fill-${color.replace('#', '')})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3, duration: 0.5 }}
          />
          
          {/* Line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
          
          {/* Dots */}
          {points.map((point, i) => (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={2.5}
              fill={data[i].value > 0 ? color : 'rgba(255,255,255,0.1)'}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.1 * i + 0.3, duration: 0.3 }}
            />
          ))}
        </svg>
        
        {showLabels && (
          <div className="flex justify-between mt-1 w-full px-1">
            {data.map((d, i) => (
              <span key={i} className="text-[8px] text-white/25 font-bold text-center flex-1">
                {d.label || ''}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Bar chart
  return (
    <motion.div 
      className="flex items-end justify-between w-full gap-1"
      style={{ height, willChange: 'transform, opacity' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      {data.map((d, i) => {
        const barHeight = maxValue > 0 ? (d.value / maxValue) * (height - (showLabels ? 16 : 0)) : 2;
        
        return (
          <div key={i} className="flex-1 max-w-[24px] flex flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-full relative overflow-hidden"
              style={{ 
                minHeight: 2,
                backgroundColor: `${color}15`
              }}
              initial={{ height: 2 }}
              animate={{ height: Math.max(barHeight, 2) }}
              transition={{ delay: delay + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{ 
                  background: d.value > 0 
                    ? `linear-gradient(to top, ${color}90, ${color})` 
                    : 'rgba(255,255,255,0.05)',
                  boxShadow: d.value > 0 ? `0 0 8px ${color}40` : 'none'
                }}
              />
            </motion.div>
            {showLabels && (
              <span className="text-[7px] text-white/25 font-bold">{d.label || ''}</span>
            )}
          </div>
        );
      })}
    </motion.div>
  );
};
