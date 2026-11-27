import { ButtonHTMLAttributes, ReactNode, useEffect } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

// ─── 3D "chunky" button ─────────────────────────────────────────────────────
// Two layers: a static lip underneath and a face that slides down on :active.
// Only `transform` changes on press, so it stays on the compositor.

type ChunkyVariant = 'primary' | 'secondary' | 'google' | 'success';

const VARIANTS: Record<ChunkyVariant, { face: string; lip: string }> = {
  primary: {
    face: 'bg-gradient-to-b from-[#a78bfa] via-[#8b5cf6] to-[#7c3aed] text-white',
    lip: 'bg-[#5b21b6]',
  },
  success: {
    face: 'bg-gradient-to-b from-[#4ade80] to-[#22c55e] text-white',
    lip: 'bg-[#15803d]',
  },
  secondary: {
    face: 'bg-[#15142a] border-2 border-white/[0.12] text-white',
    lip: 'bg-white/[0.12]',
  },
  google: {
    face: 'bg-white text-slate-800',
    lip: 'bg-[#cbd5e1]',
  },
};

interface ChunkyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChunkyVariant;
  loading?: boolean;
  icon?: ReactNode;
  size?: 'lg' | 'md';
  shine?: boolean;
}

export const ChunkyButton = ({
  variant = 'primary', loading, icon, size = 'lg', shine, disabled, className, children, ...rest
}: ChunkyButtonProps) => {
  const off = disabled && !loading;
  const v = off
    ? { face: 'bg-[#1d1c2c] text-white/30 border-2 border-white/[0.04]', lip: 'bg-[#121120]' }
    : VARIANTS[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onTouchStart={() => { /* enables :active on iOS */ }}
      className={cn('chunky group relative block w-full select-none outline-none touch-manipulation',
        size === 'lg' ? 'h-[58px]' : 'h-[52px]', off && 'cursor-not-allowed', className)}
    >
      <span aria-hidden className={cn('absolute inset-x-0 bottom-0 top-[5px] rounded-2xl', v.lip)} />
      <span className={cn(
        'chunky-face absolute inset-x-0 top-0 bottom-[5px] rounded-2xl overflow-hidden flex items-center justify-center gap-2.5',
        'font-extrabold uppercase tracking-[0.08em]', size === 'lg' ? 'text-[15px]' : 'text-[13.5px]', v.face,
      )}>
        {shine && !off && !loading && <span aria-hidden className="chunky-shine" />}
        {!off && (variant === 'primary' || variant === 'success') && (
          <span aria-hidden className="absolute inset-x-2.5 top-[3px] h-[34%] rounded-[12px] bg-gradient-to-b from-white/25 to-white/0 pointer-events-none" />
        )}
        {loading ? (
          <Loader2 className="relative w-5 h-5 animate-spin" />
        ) : (
          <span className="relative flex items-center gap-2.5">{icon}{children}</span>
        )}
      </span>
    </button>
  );
};

// ─── Speech bubble ──────────────────────────────────────────────────────────
// `id` identifies the message: the pop + word stagger replays only when it changes,
// so live text (e.g. "Nice to meet you, Al…") doesn't re-animate on every keystroke.

export const SpeechBubble = ({ id, text, tail = 'left', tone = 'default', className }: {
  id: string; text: string; tail?: 'left' | 'bottom'; tone?: 'default' | 'error'; className?: string;
}) => {
  const words = text.split(' ');
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, scale: 0.82, x: tail === 'left' ? -10 : 0, y: tail === 'bottom' ? 8 : 0 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
      style={{ transformOrigin: tail === 'left' ? '0% 50%' : '50% 100%' }}
      className={cn(
        'relative rounded-[18px] px-4 py-3 text-[15px] leading-snug font-bold border-2',
        tone === 'error' ? 'bg-[#fff1f2] text-rose-700 border-rose-200' : 'bg-white text-slate-800 border-white',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn('absolute w-3.5 h-3.5 rotate-45 border-2',
          tone === 'error' ? 'bg-[#fff1f2] border-rose-200' : 'bg-white border-white',
          tail === 'left' ? '-left-[8px] top-1/2 -mt-[7px] border-r-0 border-t-0' : 'left-1/2 -ml-[7px] -bottom-[8px] border-l-0 border-t-0')}
      />
      <span className="relative">
        {words.map((w, i) => (
          <motion.span
            key={`${id}-${i}`}
            className="inline-block whitespace-pre"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + i * 0.03, type: 'spring', stiffness: 600, damping: 32 }}
          >
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </span>
    </motion.div>
  );
};

// ─── Progress bar (translateX of a full-width fill, so the rounded tip never squashes) ──

export const StepProgress = ({ value }: { value: number }) => (
  <div className="relative h-4 flex-1 rounded-full bg-white/[0.08] overflow-hidden" role="progressbar"
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
    <motion.div
      className="absolute inset-0 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#c084fc] to-[#f472b6]"
      initial={false}
      animate={{ x: `${(value - 1) * 100}%` }}
      transition={{ type: 'spring', stiffness: 170, damping: 20 }}
    >
      <span className="absolute left-3 right-3 top-[3px] h-[4px] rounded-full bg-white/35" />
    </motion.div>
  </div>
);

// ─── Misc ───────────────────────────────────────────────────────────────────

export const BackButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-white/60 hover:text-white bg-white/[0.06] active:scale-90 transition-transform duration-100 touch-manipulation"
  >
    <ChevronLeft className="w-6 h-6" />
  </button>
);

/** Shakes its children whenever `trigger` changes to a truthy value. */
export const Shake = ({ trigger, children, className }: { trigger: number; children: ReactNode; className?: string }) => {
  const controls = useAnimationControls();
  useEffect(() => {
    if (trigger) controls.start({ x: [0, -11, 10, -7, 6, -3, 0], transition: { duration: 0.45, ease: 'easeOut' } });
  }, [trigger, controls]);
  return <motion.div animate={controls} className={className}>{children}</motion.div>;
};

export const ErrorBanner = ({ message }: { message: string | null }) => (
  <AnimatePresence initial={false}>
    {message && (
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="flex items-start gap-2.5 rounded-2xl border-2 border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13.5px] font-semibold text-rose-200"
        role="alert"
      >
        <span className="mt-[1px] grid place-items-center w-5 h-5 shrink-0 rounded-full bg-rose-500 text-white text-[12px] font-black">!</span>
        <span>{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

export const OrDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex-1 h-[2px] rounded-full bg-white/[0.08]" />
    <span className="text-white/35 text-[12px] font-extrabold uppercase tracking-[0.18em]">{label}</span>
    <div className="flex-1 h-[2px] rounded-full bg-white/[0.08]" />
  </div>
);

export const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
