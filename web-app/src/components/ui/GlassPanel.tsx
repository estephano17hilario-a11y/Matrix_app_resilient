import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn'; // Assuming utils/cn exists or I need to create it. I'll check/create it.

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: 'base' | 'hover';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ 
  children, 
  className, 
  variant = 'base',
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 450, damping: 25, mass: 0.8 }}
      className={cn(
        // OPTIMIZED HYPER-GLASS (Safe for VisionOS/Android)
        // Reduced blur from lg to md to prevent GPU flickering
        "bg-gray-900/70 bg-gradient-to-b from-white/5 to-transparent", 
        // Borde de Luz (Rim Light)
        "border border-white/10",
        // Reflejo Superior (Specular Highlight) & Sombra de Elevación (Glow Shadow)
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_30px_-16px_rgba(79,70,229,0.12)]",
        // Rounded defaults
        "rounded-2xl",
        className
      )}
      {...props}
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)', ...props.style }}
    >
      {children}
    </motion.div>
  );
};
