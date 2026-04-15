import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface LiquidButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const LiquidButton: React.FC<LiquidButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  ...props
}) => {
  const baseStyles = "relative overflow-hidden rounded-full font-medium text-white transition-all duration-300 ring-1 ring-white/20 hover:ring-white/40";
  
  const sizeStyles = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-8 py-3 text-sm",
    lg: "px-10 py-4 text-base"
  };

  const variants = {
    primary: "bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
    secondary: "bg-white/10 backdrop-blur-sm transform-gpu hover:bg-white/15",
    danger: "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/50 shadow-lg",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={cn(baseStyles, sizeStyles[size], variants[variant], className)}
      {...props}
    >
      {/* Mesh Gradient Internal Overlay */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      )}
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <span className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
};
