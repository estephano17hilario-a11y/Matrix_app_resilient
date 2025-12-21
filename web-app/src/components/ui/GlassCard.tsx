import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  hoverEffect = false, 
  ...props 
}) => {
  return (
    <motion.div
      className={cn(
        // THE HYPER-GLASS FORMULA
        // Base Semitransparente & Blur Extremo
        "bg-gray-900/40 backdrop-blur-3xl backdrop-saturate-150",
        // Borde de Luz (Rim Light)
        "border border-white/10",
        // Reflejo Superior & Sombra de Elevación (Combined to avoid override)
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_20px_50px_-12px_rgba(79,70,229,0.15)]",
        // Rounded
        "rounded-2xl",
        
        // Interactive states
        hoverEffect && "transition-all duration-300 hover:bg-gray-800/50 hover:border-white/20 hover:shadow-indigo-500/20",
        
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
