import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
  error?: string;
  isValid?: boolean;
  showValidation?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ icon: Icon, label, className, type, error, isValid, showValidation, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const isPasswordType = type === 'password';
    const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className={cn(
            "text-xs ml-1 uppercase tracking-wider font-bold transition-colors duration-300",
            error ? "text-red-400" : isFocused ? "text-indigo-400" : "text-gray-500"
          )}>
            {label}
          </label>
        )}
        
        <div className="relative group">
          {/* Icon */}
          {Icon && (
            <div className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none z-10",
              error ? "text-red-400" : isFocused ? "text-indigo-400" : "text-white/30"
            )}>
              <Icon size={18} />
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            type={inputType}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full bg-black/20 border rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 outline-none transition-all duration-300",
              // Glass Effect (Lightweight)
              "backdrop-blur-sm",
              Icon ? "pl-11" : "pl-4",
              (isPasswordType || isValid) ? "pr-11" : "pr-4",
              
              // Border Colors
              error 
                ? "border-red-500/50 focus:border-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]" 
                : isValid && showValidation
                  ? "border-green-500/50 focus:border-green-500 shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]"
                  : "border-white/10 focus:border-indigo-500/50 focus:bg-white/5 focus:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]",
              
              className
            )}
            {...props}
          />
          
          {/* Right Actions (Password Toggle or Validation Check) */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
             <AnimatePresence mode="wait">
                {isPasswordType ? (
                  <motion.button
                    key="toggle"
                    type="button"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer pointer-events-auto"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </motion.button>
                ) : isValid && showValidation ? (
                   <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"
                   >
                      <CheckCircle2 size={18} />
                   </motion.div>
                ) : null}
             </AnimatePresence>
          </div>

          {/* Bottom Glow Line (Animated) */}
          <div className="absolute bottom-0 left-2 right-2 h-[1px] overflow-hidden pointer-events-none">
             <div className={cn(
                "w-full h-full transform transition-transform duration-500 ease-out origin-left",
                isFocused ? "scale-x-100" : "scale-x-0",
                error ? "bg-red-500" : isValid && showValidation ? "bg-green-500" : "bg-indigo-500"
             )} />
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -5 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -5 }}
              className="flex items-center gap-1.5 text-red-400 text-xs font-medium pl-1 overflow-hidden"
            >
              <AlertCircle size={12} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
