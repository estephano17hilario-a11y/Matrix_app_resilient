import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function GlassCard({ children, className, hoverEffect = false, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        // Base structure & Glass effect
        "relative overflow-hidden rounded-3xl",
        "bg-white/5 backdrop-blur-3xl", // Transparencia lechosa (deep frosted glass)
        "border border-white/10", // Borde sutil
        "shadow-2xl shadow-black/50", // Sombra difusa grande
        
        // Inner glow / highlight for "grabbing light"
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none",
        
        // Optional Hover Effect
        hoverEffect && "hover:bg-white/10 hover:border-white/20 hover:shadow-indigo-500/10 transition-all duration-300",
        
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
