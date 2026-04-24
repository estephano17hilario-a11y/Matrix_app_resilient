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
        // THE HYPER-GLASS FORMULA (RESTORED TRANSLUCENCY)
        // Base Semitransparente
        "bg-[#111]/70 bg-gradient-to-b from-white/5 to-transparent", 
        // Borde de Luz (Rim Light)
        "border border-white/10",
        // Reflejo Superior & Sombra de Elevación (Combined to avoid override)
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_30px_-16px_rgba(79,70,229,0.12)]",
        // Rounded
        "rounded-2xl",
        
        // Interactive states
        hoverEffect && "transition-all duration-200 hover:bg-[#1a1a1a]/95 hover:border-white/20 hover:shadow-indigo-500/15",
        
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
