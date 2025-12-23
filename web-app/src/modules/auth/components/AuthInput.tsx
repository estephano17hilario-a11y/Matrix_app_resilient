import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ icon: Icon, label, className, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && <label className="text-xs text-gray-400 ml-1 uppercase tracking-wider font-medium">{label}</label>}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-indigo-400 transition-colors duration-300">
              <Icon size={18} />
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 outline-none transition-all duration-300",
              Icon && "pl-11",
              "focus:bg-white/10 focus:border-indigo-500/50 focus:shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]",
              className
            )}
            {...props}
          />
          <motion.div 
            className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full opacity-0 group-focus-within:opacity-100"
            initial={false}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
