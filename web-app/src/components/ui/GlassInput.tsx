import React from 'react';
import { cn } from '../../utils/cn';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({ 
  className, 
  containerClassName, 
  icon, 
  ...props 
}) => {
  return (
    <div className={cn("relative group", containerClassName)}>
      {icon && (
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-white/40 group-focus-within:text-indigo-400 transition-colors">
          {icon}
        </div>
      )}
      <input
        className={cn(
          // BASE: Sin bordes sólidos, fondo sutil
          "w-full bg-white/5 rounded-xl py-3 text-white text-sm placeholder:text-white/20 transition-all duration-200",
          "border border-transparent", // Explicitly transparent border to prevent layout shift if we add one later
          
          // HOVER (Desktop only)
          "desktop-hover:hover:bg-white/10",
          
          // FOCUS: "Resplandor suave"
          // We use ring for the colored edge and shadow for the glow
          "focus:outline-none focus:bg-white/10",
          "focus:ring-2 focus:ring-indigo-500/30",
          "focus:shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)]", 
          
          icon ? "pl-10 pr-4" : "px-4",
          className
        )}
        {...props}
      />
    </div>
  );
};
