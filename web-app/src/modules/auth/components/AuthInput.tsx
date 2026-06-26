import React, { forwardRef, useState } from 'react';
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
            "text-xs ml-1 uppercase tracking-wider font-bold transition-colors duration-150",
            error ? "text-red-400" : isFocused ? "text-indigo-400" : "text-gray-500"
          )}>
            {label}
          </label>
        )}
        
        <div className="relative group">
          {/* Icon */}
          {Icon && (
            <div className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-150 pointer-events-none z-10",
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
              "w-full bg-[#0a0a0f] border rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 outline-none transition-all duration-150 text-left",
              Icon ? "pl-11" : "pl-4",
              (isPasswordType || isValid) ? "pr-11" : "pr-4",
              
              // Border Colors - no shadow for 0 delay
              error 
                ? "border-red-500/50 focus:border-red-500" 
                : isValid && showValidation
                  ? "border-green-500/50 focus:border-green-500"
                  : "border-white/10 focus:border-indigo-500/50 focus:bg-[#101018]",
              
              className
            )}
            {...props}
          />
          
          {/* Right Actions (Password Toggle or Validation Check) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {isPasswordType ? (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/45 hover:text-white transition-colors cursor-pointer p-2 rounded-lg hover:bg-white/5 active:bg-white/10"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                ) : isValid && showValidation ? (
                   <div className="text-green-400 mr-2">
                      <CheckCircle2 size={18} />
                   </div>
                ) : null}
          </div>

          {/* Bottom Glow Line (Animated via CSS) */}
          <div className="absolute bottom-0 left-2 right-2 h-[1px] overflow-hidden pointer-events-none">
             <div className={cn(
                "w-full h-full transform transition-transform duration-200 ease-out origin-left",
                isFocused ? "scale-x-100" : "scale-x-0",
                error ? "bg-red-500" : isValid && showValidation ? "bg-green-500" : "bg-indigo-500"
             )} />
          </div>
        </div>

        {/* Error Message */}
        <div className={cn(
          "flex items-center gap-1.5 text-red-400 text-xs font-medium pl-1 overflow-hidden transition-all duration-200",
          error ? "opacity-100 max-h-10 mt-1" : "opacity-0 max-h-0 mt-0"
        )}>
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
