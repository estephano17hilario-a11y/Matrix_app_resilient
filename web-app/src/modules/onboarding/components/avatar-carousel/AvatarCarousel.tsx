import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AVAILABLE_AVATARS, type AvatarConfig } from '../../../../config/avatars';

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER SELECT — a video-game roster screen.
// One big trading-card hero (swipe it, it tilts under the finger), a living aura
// that takes the colour of the hero (rotating rays, rising sparks, a glowing
// pedestal) and a roster strip underneath. Every moving part
// is transform/opacity only, so it holds 60fps on a phone.
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarCarouselProps {
  onSelect: (avatarId: string) => void;
  initialAvatarId?: string;
}

/** "251 146 60" → "251,146,60" (for rgba()). */
const rgbOf = (a: AvatarConfig) => (a.themeColorRgb || '255 255 255').trim().split(/[\s,]+/).join(',');

const SPARKS = Array.from({ length: 9 }, (_, i) => ({
  left: (i * 37 + 9) % 100,
  size: 2 + ((i * 7) % 4),
  delay: -((i * 0.83) % 7),
  dur: 5.5 + ((i * 13) % 6),
  drift: ((i * 29) % 40) - 20,
}));

const cardVariants = {
  enter: (d: number) => ({ x: `${d * 62}%`, opacity: 0, scale: 0.84, rotateY: d * -38 }),
  center: { x: '0%', opacity: 1, scale: 1, rotateY: 0 },
  exit: (d: number) => ({ x: `${d * -62}%`, opacity: 0, scale: 0.84, rotateY: d * 38, transition: { duration: 0.2, ease: 'easeIn' as const } }),
};

const CSS = `
@keyframes cs-spin { to { transform: translate3d(-50%,-50%,0) rotate(360deg); } }
@keyframes cs-float { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-7px,0); } }
@keyframes cs-spark { 0% { transform: translate3d(0,0,0) scale(0.6); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate3d(var(--dx),-46vh,0) scale(1); opacity: 0; } }
@keyframes cs-sheen { 0%,55% { transform: translate3d(-130%,0,0) skewX(-18deg); } 100% { transform: translate3d(330%,0,0) skewX(-18deg); } }
@keyframes cs-ring { 0% { transform: scale(0.55); opacity: 0.7; } 100% { transform: scale(1.55); opacity: 0; } }
@keyframes cs-cta { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(0,0,0) scale(1.025); } }
/* The rays are a 512px canvas stretched by the GPU: a 170vmax gradient would be a ~50MB texture on a phone. */
.cs-rays { position: absolute; left: 50%; top: 46%; width: max(150vw, 105dvh); height: max(150vw, 105dvh); transform: translate3d(-50%,-50%,0); animation: cs-spin 80s linear infinite; will-change: transform; pointer-events: none; }
.cs-float { animation: cs-float 4.2s ease-in-out infinite; will-change: transform; }
.cs-spark { position: absolute; bottom: 4%; border-radius: 50%; animation: cs-spark linear infinite; }
.cs-thumb-ring { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity 200ms ease; }
.cs-thumb[aria-selected="true"] .cs-thumb-ring { opacity: 1; }
.cs-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 38%; pointer-events: none; background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%); animation: cs-sheen 4.4s ease-in-out infinite; }
.cs-ring { position: absolute; inset: 10% 8%; border-radius: 32px; animation: cs-ring 0.7s ease-out both; pointer-events: none; }
.cs-cta { animation: cs-cta 2.2s ease-in-out infinite; will-change: transform; }
.cs-thumb { transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease; }
@media (prefers-reduced-motion: reduce) { .cs-rays, .cs-float, .cs-spark, .cs-sheen, .cs-cta { animation: none !important; } }
`;

export const AvatarCarousel: React.FC<AvatarCarouselProps> = ({ onSelect, initialAvatarId }) => {
  const { t } = useTranslation();
  const reduce = !!useReducedMotion();
  const len = AVAILABLE_AVATARS.length;

  const [index, setIndex] = useState(() => {
    const i = initialAvatarId ? AVAILABLE_AVATARS.findIndex(a => a.id === initialAvatarId) : 0;
    return i < 0 ? 0 : i;
  });
  const [dir, setDir] = useState(1);
  const [locking, setLocking] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const rosterRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x0: number; dx: number } | null>(null);
  const lockTimer = useRef<number | null>(null);

  const avatar = AVAILABLE_AVATARS[index];
  const rgb = rgbOf(avatar);
  const color = avatar.themeColor || '#ffffff';
  const name = t(`avatars.${avatar.id}`, avatar.name);

  // Warm the cache so swiping never waits on a decode.
  useEffect(() => {
    AVAILABLE_AVATARS.forEach(a => { const img = new Image(); img.src = a.path; });
    return () => { if (lockTimer.current !== null) window.clearTimeout(lockTimer.current); };
  }, []);

  const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* no haptics */ } };

  const goTo = useCallback((next: number, d?: number) => {
    if (locking) return;
    const target = ((next % len) + len) % len;
    if (target === index) return;
    setDir(d ?? (target > index ? 1 : -1));
    setIndex(target);
    buzz(8);
  }, [index, len, locking]);
  const step = useCallback((d: number) => goTo(index + d, d), [goTo, index]);

  // Keep the roster centred on the chosen character.
  useEffect(() => {
    const el = rosterRef.current?.children[index] as HTMLElement | undefined;
    const box = rosterRef.current;
    if (!el || !box) return;
    box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.clientWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  }, [index, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Enter') confirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // The hero follows the finger (written straight to the DOM: no React render per move).
  const tilt = (dx: number, animate: boolean) => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    el.style.transform = `translate3d(${dx * 0.35}px,0,0) rotateY(${Math.max(-24, Math.min(24, dx * 0.11))}deg)`;
  };
  const onDown = (e: React.PointerEvent) => {
    if (locking || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { id: e.pointerId, x0: e.clientX, dx: 0 };
    try { stageRef.current?.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dx = e.clientX - d.x0;
    tilt(d.dx, false);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    tilt(0, true);
    if (Math.abs(d.dx) > 46) step(d.dx < 0 ? 1 : -1);
  };

  function confirm() {
    if (locking) return;
    setLocking(true);
    buzz(28);
    lockTimer.current = window.setTimeout(() => onSelect(avatar.id), reduce ? 80 : 520);
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black text-white select-none">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Living backdrop: takes the hero's colour ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={avatar.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ background: `radial-gradient(90% 60% at 50% 42%, rgba(${rgb},0.34) 0%, rgba(${rgb},0.12) 45%, rgba(0,0,0,0) 78%)` }}
          />
        </AnimatePresence>
        <Rays rgb={rgb} />
        {/* Static vignette: hides the rays' outer edge and keeps the bottom readable */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% 44%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 70%, #000 100%)' }} />
        {/* Glow is a soft radial gradient, not a box-shadow: no blur to repaint */}
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="cs-spark"
            style={{
              left: `${s.left}%`, width: s.size * 3, height: s.size * 3,
              background: `radial-gradient(closest-side, ${color} 0%, ${color} 30%, rgba(${rgb},0) 100%)`,
              animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`, ['--dx' as string]: `${s.drift}px`,
            }}
          />
        ))}
      </div>

      {/* ── Header (below the onboarding progress dots) ── */}
      <div className="relative z-10 flex items-end justify-between px-6 pt-[calc(var(--sat)+58px)]">
        <div>
          <p className="text-[10px] font-black tracking-[0.34em] text-white/45">{t('onboarding.charSelect.title', 'ELIGE TU PERSONAJE')}</p>
          <p className="mt-1 text-[11px] font-semibold text-white/35">{t('onboarding.charSelect.hint', 'Desliza la tarjeta o toca la lista')}</p>
        </div>
        <span className="font-mono text-[13px] font-bold tabular-nums text-white/55">
          <span style={{ color }}>{String(index + 1).padStart(2, '0')}</span>/{String(len).padStart(2, '0')}
        </span>
      </div>

      {/* ── Hero stage ── */}
      <div
        ref={stageRef}
        className="relative z-10 mt-2 min-h-0 flex-1 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'pan-y', perspective: 900 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Glowing pedestal under the card */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[1%] left-1/2 h-[7%] w-[70%] -translate-x-1/2 rounded-[50%]"
          style={{ background: `radial-gradient(closest-side, rgba(${rgb},0.75), rgba(${rgb},0))` }}
        />

        <div className="absolute inset-0 flex items-center justify-center pb-3 pt-1">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={avatar.id}
              custom={dir}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 28 }}
              className="absolute flex h-full items-center justify-center"
            >
              <motion.div
                className="h-full"
                animate={locking ? { scale: [1, 1.07, 1.03] } : { scale: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <div ref={tiltRef} className="h-full">
                  <div className={reduce ? 'h-full' : 'cs-float h-full'}>
                    <HeroCard avatar={avatar} rgb={rgb} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pulse when the hero changes / locks in */}
        <div key={`ring-${avatar.id}-${locking}`} aria-hidden className="cs-ring" style={{ border: `2px solid ${color}`, boxShadow: `0 0 30px rgba(${rgb},0.6)` }} />
        <AnimatePresence>
          {locking && !reduce && (
            <motion.div
              aria-hidden className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 0.65, 0] }} transition={{ duration: 0.5 }}
              style={{ background: `radial-gradient(60% 50% at 50% 45%, rgba(${rgb},0.9), rgba(255,255,255,0.5) 35%, rgba(0,0,0,0) 75%)` }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Name ── */}
      <div className="relative z-10 px-6 pt-1 text-center">
        <div className="relative h-[38px]">
          <AnimatePresence initial={false} custom={dir}>
            <motion.h2
              key={avatar.id}
              custom={dir}
              variants={{
                enter: (d: number) => ({ y: d * 26, opacity: 0 }),
                center: { y: 0, opacity: 1 },
                exit: (d: number) => ({ y: d * -26, opacity: 0, transition: { duration: 0.15 } }),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="absolute inset-x-0 whitespace-nowrap text-[28px] font-black leading-[38px] tracking-tight"
              style={{ color: '#fff', textShadow: `0 0 26px rgba(${rgb},0.85)` }}
            >
              {name}
            </motion.h2>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Roster ── */}
      <div
        ref={rosterRef}
        role="listbox"
        aria-label={t('onboarding.charSelect.title', 'ELIGE TU PERSONAJE')}
        className="no-scrollbar relative z-10 mt-2 flex gap-2.5 overflow-x-auto px-[calc(50%-30px)] py-3"
        style={{ overscrollBehaviorX: 'contain' }}
      >
        {AVAILABLE_AVATARS.map((a, i) => {
          const on = i === index;
          return (
            <button
              key={a.id}
              type="button"
              role="option"
              aria-selected={on}
              aria-label={t(`avatars.${a.id}`, a.name)}
              onClick={() => goTo(i)}
              className="cs-thumb relative h-[74px] w-[60px] flex-none touch-manipulation rounded-[18px]"
              style={{
                transform: on ? 'scale(1.14) translate3d(0,-3px,0)' : 'scale(0.94)',
                opacity: on ? 1 : 0.5,
                boxShadow: '0 0 0 1.5px rgba(255,255,255,0.12)',
              }}
            >
              {/* Colour ring + glow live on their own layer and only fade (no box-shadow transition) */}
              <span aria-hidden className="cs-thumb-ring" style={{ boxShadow: `0 0 0 2.5px ${a.themeColor}, 0 6px 22px -2px rgba(${rgbOf(a)},0.8)` }} />
              <span className="absolute inset-0 overflow-hidden rounded-[18px]">
                <img src={a.path} alt="" draggable={false} decoding="async" className="h-full w-full object-cover" style={{ objectPosition: '50% 14%' }} />
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.75), rgba(0,0,0,0))' }} />
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Actions ── */}
      <div className="relative z-10 flex items-center gap-3 px-5 pb-[var(--action-bottom)] pt-1">
        <button type="button" onClick={() => step(-1)} aria-label="‹"
          className="grid h-[60px] w-[60px] flex-none place-items-center rounded-full border-2 border-white/10 bg-white/[0.06] text-white/70 transition-transform duration-100 active:scale-90">
          <ChevronLeft size={26} />
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={locking}
          className={`relative flex h-[60px] min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full px-5 text-[15px] font-black uppercase tracking-[0.06em] text-black active:scale-[0.97] ${locking ? '' : 'cs-cta'}`}
          style={{ background: `linear-gradient(135deg, ${color}, rgba(${rgb},0.78))`, boxShadow: `0 0 0 2px rgba(255,255,255,0.18) inset, 0 12px 34px -8px rgba(${rgb},0.95)` }}
        >
          <span aria-hidden className="cs-sheen" />
          <span className="relative min-w-0 truncate">
            {locking ? t('onboarding.charSelect.locked', '¡Listo!') : t('onboarding.charSelect.pick', 'Confirmar')}
          </span>
          <Check size={20} strokeWidth={3.5} className="relative flex-none" />
        </button>
        <button type="button" onClick={() => step(1)} aria-label="›"
          className="grid h-[60px] w-[60px] flex-none place-items-center rounded-full border-2 border-white/10 bg-white/[0.06] text-white/70 transition-transform duration-100 active:scale-90">
          <ChevronRight size={26} />
        </button>
      </div>
    </div>
  );
};

// Rotating sunburst. Drawn once per colour into a small canvas; CSS only rotates/scales it.
const RAY_COUNT = 16;
const Rays: React.FC<{ rgb: string }> = ({ rgb }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const S = c.width, mid = S / 2, step = (Math.PI * 2) / RAY_COUNT;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = `rgba(${rgb},0.2)`;
    for (let i = 0; i < RAY_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(mid, mid);
      ctx.arc(mid, mid, mid * 1.45, i * step, i * step + step * 0.32);
      ctx.closePath();
      ctx.fill();
    }
  }, [rgb]);
  return <canvas ref={ref} width={512} height={512} aria-hidden className="cs-rays" />;
};

// The collectible card: coloured frame, portrait, HUD corners and a sheen that sweeps across.
const HeroCard: React.FC<{ avatar: AvatarConfig; rgb: string }> = ({ avatar, rgb }) => (
  <div
    className="relative h-full overflow-hidden rounded-[28px] p-[2.5px]"
    style={{
      aspectRatio: '2 / 3',
      maxWidth: '80vw',
      background: `linear-gradient(160deg, ${avatar.themeColor}, rgba(${rgb},0.25) 38%, ${avatar.themeColor} 100%)`,
      boxShadow: `0 28px 60px -18px rgba(${rgb},0.7), 0 0 44px -8px rgba(${rgb},0.55)`,
    }}
  >
    <div className="relative h-full w-full overflow-hidden rounded-[25.5px] bg-neutral-900">
      <img
        src={avatar.path}
        alt={avatar.name}
        draggable={false}
        decoding="async"
        className="h-full w-full object-cover"
        style={{ objectPosition: '50% 12%' }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.72) 100%)' }} />
      <span aria-hidden className="cs-sheen" />
      {/* HUD corner brackets */}
      {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
        <span key={c} aria-hidden className="pointer-events-none absolute h-5 w-5" style={{
          top: c[0] === 't' ? 10 : undefined, bottom: c[0] === 'b' ? 10 : undefined,
          left: c[1] === 'l' ? 10 : undefined, right: c[1] === 'r' ? 10 : undefined,
          borderTop: c[0] === 't' ? `2px solid ${avatar.themeColor}` : undefined, borderBottom: c[0] === 'b' ? `2px solid ${avatar.themeColor}` : undefined,
          borderLeft: c[1] === 'l' ? `2px solid ${avatar.themeColor}` : undefined, borderRight: c[1] === 'r' ? `2px solid ${avatar.themeColor}` : undefined,
          borderRadius: 4, opacity: 0.9,
        }} />
      ))}
    </div>
  </div>
);
