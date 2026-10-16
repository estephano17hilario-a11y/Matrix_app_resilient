import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/immersion/engine';

interface HoldToConfirmProps {
  label: string;
  holdingLabel?: string;
  disabledLabel?: string;
  disabled?: boolean;
  /** "r g b" */
  accent?: string;
  duration?: number;
  onComplete: () => void;
}

// Press and hold to commit. Buying a vice should be a decision, not a tap:
// the ring fills while you hold (with a haptic tick every quarter), and
// letting go early cancels.
export const HoldToConfirm = ({
  label,
  holdingLabel,
  disabledLabel,
  disabled,
  accent = '245 158 11',
  duration = 1200,
  onComplete,
}: HoldToConfirmProps) => {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const quarter = useRef(0);
  const done = useRef(false);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    if (!done.current) setProgress(0);
  };

  const tick = (now: number) => {
    const p = Math.min(1, (now - start.current) / duration);
    setProgress(p);
    const q = Math.floor(p * 4);
    if (q > quarter.current && q < 4) {
      quarter.current = q;
      haptic(6 + q * 3);
    }
    if (p >= 1) {
      done.current = true;
      raf.current = 0;
      haptic([18, 40, 26]);
      onComplete();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = (e: React.PointerEvent) => {
    if (disabled || done.current) return;
    // Keep receiving the pointer if the finger drifts; not fatal if refused.
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    start.current = performance.now();
    quarter.current = 0;
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const holding = progress > 0 && progress < 1;
  const r = 22;
  const circumference = 2 * Math.PI * r;

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={e => e.preventDefault()}
      className="lux-hold relative w-full h-16 rounded-2xl overflow-hidden select-none touch-none disabled:cursor-not-allowed"
      style={{
        background: disabled
          ? 'rgba(255,255,255,0.04)'
          : `linear-gradient(135deg, rgb(${accent} / 0.22), rgb(${accent} / 0.08))`,
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : `rgb(${accent} / 0.45)`}`,
        boxShadow: disabled ? 'none' : `0 0 ${12 + progress * 30}px rgb(${accent} / ${0.15 + progress * 0.35})`,
      }}
    >
      {/* Fill sweeping across while holding */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0"
        style={{
          width: '100%',
          transformOrigin: 'left center',
          transform: `scaleX(${progress})`,
          background: `linear-gradient(90deg, rgb(${accent} / 0.15), rgb(${accent} / 0.45))`,
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-3 h-full px-4">
        <svg width="52" height="52" viewBox="0 0 52 52" className="-my-2 shrink-0" aria-hidden="true">
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          <circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke={disabled ? 'rgba(255,255,255,0.2)' : `rgb(${accent})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 26 26)"
          />
          <circle cx="26" cy="26" r={7 + progress * 4} fill={disabled ? 'rgba(255,255,255,0.15)' : `rgb(${accent} / ${0.5 + progress * 0.5})`} />
        </svg>
        <span className={`text-[13px] font-black uppercase tracking-[0.16em] ${disabled ? 'text-white/30' : 'text-white'}`}>
          {disabled ? disabledLabel || label : holding ? holdingLabel || label : label}
        </span>
      </span>
    </button>
  );
};
