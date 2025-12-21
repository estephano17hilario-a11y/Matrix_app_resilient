import React from 'react';
import { cn } from '../../utils/cn';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  className,
  label,
  error,
  ...props
}) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white/60 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          className={cn(
            // Base styles
            "w-full px-4 py-3 rounded-xl outline-none transition-all duration-300",
            // Typography
            "text-white placeholder-white/30 font-medium",
            // Background & Border (No solid borders)
            "bg-white/5 border border-transparent",
            // Focus State (The Glow)
            "focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 focus:shadow-[0_0_20px_rgba(79,70,229,0.3)]",
            // Error State
            error && "bg-rose-500/10 ring-2 ring-rose-500/50",
            className
          )}
          {...props}
        />
        {/* Subtle bottom highlight line */}
        <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      </div>
      {error && (
        <p className="text-rose-400 text-xs ml-1 animate-pulse">
          {error}
        </p>
      )}
    </div>
  );
};
