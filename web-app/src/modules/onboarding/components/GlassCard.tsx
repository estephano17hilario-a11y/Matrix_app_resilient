import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={twMerge(
        "glass-panel rounded-3xl p-6 relative overflow-hidden",
        // Volumetric lighting top edge
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
