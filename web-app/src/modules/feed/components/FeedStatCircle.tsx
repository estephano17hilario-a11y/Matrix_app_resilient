import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface FeedStatCircleProps {
  value: number;
  max: number;
  label: string;
  icon: React.ReactNode;
  gradient: [string, string]; // [from, to] hex colors
  delay?: number;
  size?: number;
}

export const FeedStatCircle: React.FC<FeedStatCircleProps> = ({ 
  value, max, label, icon, gradient, delay = 0, size = 72 
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const rafRef = useRef<number>(0);
  
  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (animatedValue / (max || 1)));
  
  // Stable gradient ID using label
  const gradientId = `stat-grad-${label.replace(/\s/g, '-')}`;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const end = value;
      const duration = 800;
      const startTime = performance.now();
      
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(end * eased);
        setAnimatedValue(current);
        
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      
      rafRef.current = requestAnimationFrame(animate);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, delay, max]);

  const isComplete = animatedValue >= max && max > 0;

  return (
    <motion.div 
      className="flex flex-col items-center gap-1.5"
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg 
          width={size} 
          height={size} 
          className="transform -rotate-90"
          style={{ filter: isComplete ? `drop-shadow(0 0 12px ${gradient[0]}50)` : `drop-shadow(0 0 6px ${gradient[0]}30)` }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradient[0]} />
              <stop offset="100%" stopColor={gradient[1]} />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="mb-0.5" style={{ color: gradient[0] }}>
            {icon}
          </div>
          <span className="text-sm font-black text-white tabular-nums leading-none">
            {animatedValue}
          </span>
        </div>

        {/* Completion glow pulse */}
        {isComplete && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ 
              border: `2px solid ${gradient[0]}30`,
              transform: 'translateZ(0)'
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
      
      <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.12em] text-center leading-tight max-w-[60px]">
        {label}
      </span>
    </motion.div>
  );
};
