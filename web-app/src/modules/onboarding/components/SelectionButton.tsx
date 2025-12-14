import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface SelectionButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  selected?: boolean;
  icon?: ReactNode;
  subtitle?: string;
}

export function SelectionButton({ 
  children, 
  selected, 
  className, 
  icon,
  subtitle,
  onClick,
  ...props 
}: SelectionButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onClick?.(e);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={twMerge(
        "w-full text-left p-5 rounded-3xl transition-all duration-500 border relative overflow-hidden group",
        selected 
          ? "bg-gradient-to-br from-white/10 to-white/5 border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.15)] ai-border-glow scale-[1.02]" 
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-5 relative z-10">
        {icon && (
          <div className={twMerge(
            "p-3 rounded-2xl transition-colors duration-500",
            selected ? "bg-white text-black shadow-lg shadow-white/20" : "bg-white/5 text-white/70 group-hover:text-white group-hover:bg-white/10"
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className={twMerge(
            "text-xl font-bold tracking-tight transition-colors truncate",
            selected ? "text-white" : "text-white/80 group-hover:text-white"
          )}>
            {children}
          </div>
          {subtitle && (
            <div className={twMerge(
              "text-base mt-1 font-medium leading-snug transition-colors",
               selected ? "text-white/80" : "text-white/40 group-hover:text-white/60"
            )}>
              {subtitle}
            </div>
          )}
        </div>
        
        {/* Selection Indicator - More Visible */}
        <div className={twMerge(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0",
          selected 
            ? "bg-white border-white scale-100 opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
            : "border-white/10 scale-90 opacity-0 group-hover:opacity-30"
        )}>
          {selected && (
            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      
      {/* Subtle Gradient Overlay on Select */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
      )}
    </motion.button>
  );
}
