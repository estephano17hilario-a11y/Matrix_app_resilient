import React, { forwardRef, ReactNode, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, EyeOff, LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: LucideIcon;
  label?: string;
  error?: string | null;
  /** Shows the green state + animated check once the value is acceptable. */
  valid?: boolean;
  /** Content of the reserved line under the field (counter, hint). Errors replace it. */
  hint?: ReactNode;
  onVisibilityChange?: (visible: boolean) => void;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ icon: Icon, label, error, valid, hint, type, className, onVisibilityChange, onFocus, onBlur, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [visible, setVisible] = useState(false);
    const [focused, setFocused] = useState(false);
    const isPassword = type === 'password';
    const state = error ? 'error' : valid ? 'valid' : focused ? 'focus' : 'idle';

    const toggle = () => {
      const next = !visible;
      setVisible(next);
      onVisibilityChange?.(next);
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={cn(
            'block mb-2 ml-1 text-[12.5px] font-extrabold uppercase tracking-[0.12em] transition-colors duration-150',
            state === 'error' ? 'text-rose-300' : state === 'focus' ? 'text-violet-300' : 'text-white/45',
          )}>
            {label}
          </label>
        )}

        <div className="relative">
          {/* Focus halo: opacity + scale only */}
          <span aria-hidden className={cn(
            'absolute -inset-[5px] rounded-[22px] border-2 pointer-events-none transition-[opacity,transform] duration-200 ease-out',
            state === 'error' ? 'border-rose-400/30' : state === 'valid' ? 'border-emerald-400/25' : 'border-violet-400/35',
            focused ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]',
          )} />

          <div className={cn(
            'relative rounded-2xl border-2 bg-white/[0.045] transition-colors duration-150',
            state === 'error' ? 'border-rose-400/70 bg-rose-500/[0.06]'
              : state === 'valid' ? 'border-emerald-400/60'
              : state === 'focus' ? 'border-violet-400/80 bg-white/[0.07]'
              : 'border-white/[0.1]',
          )}>
            {Icon && (
              <Icon aria-hidden className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors duration-150',
                state === 'error' ? 'text-rose-300' : state === 'valid' ? 'text-emerald-300'
                  : state === 'focus' ? 'text-violet-300' : 'text-white/35',
              )} />
            )}
            <input
              ref={ref}
              id={inputId}
              type={isPassword ? (visible ? 'text' : 'password') : type}
              aria-invalid={!!error}
              onFocus={(e) => { setFocused(true); onFocus?.(e); }}
              onBlur={(e) => { setFocused(false); onBlur?.(e); }}
              className={cn(
                'w-full h-[56px] bg-transparent rounded-2xl text-[17px] font-semibold text-white placeholder:text-white/25 placeholder:font-medium outline-none caret-violet-300',
                Icon ? 'pl-12' : 'pl-4',
                isPassword && valid ? 'pr-[88px]' : 'pr-12',
                className,
              )}
              {...props}
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <AnimatePresence initial={false}>
                {valid && !error && (
                  <motion.span
                    key="ok"
                    initial={{ scale: 0, rotate: -60 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, transition: { duration: 0.12 } }}
                    transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                    className={cn('grid place-items-center w-7 h-7 rounded-full bg-emerald-500 text-white', isPassword ? '' : 'mr-1.5')}
                  >
                    <Check className="w-4 h-4" strokeWidth={3.5} />
                  </motion.span>
                )}
              </AnimatePresence>
              {isPassword && (
                <button
                  type="button"
                  onClick={toggle}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  className="relative w-10 h-10 grid place-items-center rounded-xl text-white/50 hover:text-white active:scale-90 transition-transform duration-100"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={visible ? 'off' : 'on'}
                      initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 26 }}
                      className="grid place-items-center"
                    >
                      {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              )}
            </div>
          </div>
        </div>

        {(hint !== undefined || error !== undefined) && (
          <div className="relative min-h-[24px] pt-1.5 px-1 text-[12.5px] font-semibold">
            <AnimatePresence initial={false} mode="wait">
              {error ? (
                <motion.p key="err" className="text-rose-300"
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}>
                  {error}
                </motion.p>
              ) : (
                <motion.div key="hint" className="text-white/40"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {hint}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  },
);

AuthInput.displayName = 'AuthInput';
