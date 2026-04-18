import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface LiquidProgressBarProps {
 value: number;
 max?: number;
 label?: string;
 color?: 'indigo' | 'cyan' | 'emerald' | 'rose' | 'amber' | 'blue' | 'pink' | 'violet' | 'gray';
 className?: string;
 showValue?: boolean;
 size?: 'sm' | 'md' | 'lg';
}

export const LiquidProgressBar: React.FC<LiquidProgressBarProps> = ({
 value,
 max = 100,
 label,
 color = 'indigo',
 className,
 showValue = false,
 size = 'md',
}) => {
 const percentage = Math.min(100, Math.max(0, (value / max) * 100));

 const colorMap = {
 indigo: "from-indigo-500 to-violet-500 shadow-indigo-500/50",
 cyan: "from-cyan-400 to-blue-500 shadow-cyan-400/50",
 emerald: "from-emerald-400 to-teal-500 shadow-emerald-500/50",
 rose: "from-rose-500 to-red-600 shadow-rose-500/50",
 amber: "from-amber-400 to-orange-500 shadow-amber-500/50",
 blue: "from-blue-500 to-indigo-500 shadow-blue-500/50",
 pink: "from-pink-500 to-rose-500 shadow-pink-500/50",
 violet: "from-violet-500 to-purple-500 shadow-violet-500/50",
 gray: "from-slate-500 to-gray-500 shadow-slate-500/50",
 };

 const heightMap = {
 sm: "h-1.5",
 md: "h-3",
 lg: "h-4",
 };

 return (
 <div className={cn("w-full", className)}>
 {(label || showValue) && (
 <div className="flex justify-between items-end mb-2 px-1">
 {label && (
 <span className="text-white/60 font-medium text-sm tracking-wide">
 {label}
 </span>
 )}
 {showValue && (
 <span className="font-mono text-white text-sm">
 {value}/{max}
 </span>
 )}
 </div>
 )}
 
 {/* Container: Tube */}
 <div className={cn(
 "relative w-full bg-gray-800/60 rounded-full shadow-inner overflow-hidden",
 heightMap[size]
 )}>
 {/* Liquid Fill */}
 <motion.div
 className={cn(
 "h-full rounded-full bg-gradient-to-r relative",
 colorMap[color]
 )}
 initial={{ width: 0 }}
 animate={{ width: `${percentage}%` }}
 transition={{ type: "spring", stiffness: 100, damping: 20 }}
 >
 {/* Shimmer Effect on the liquid */}
 <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
 
 {/* The "Head" Glow */}
 <div className="absolute right-0 top-0 h-full w-3 bg-gradient-to-l from-white/40 to-transparent blur-sm transform-gpu backface-hidden rounded-r-full" />
 </motion.div>
 </div>
 </div>
 );
};
