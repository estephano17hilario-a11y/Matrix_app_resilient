import { ReactNode, useMemo } from 'react';

const stars = (count: number, seed: number) => {
  // Deterministic pseudo-random so the sky doesn't reshuffle between mounts.
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${(rnd() * 100).toFixed(2)}vw ${(rnd() * 100).toFixed(2)}vh rgba(255,255,255,${(0.25 + rnd() * 0.6).toFixed(2)})`);
  }
  return out.join(',');
};

/**
 * Full-screen shell for the auth screens: cosmic gradient, drifting colour blobs and twinkling
 * stars. Everything moves with transform/opacity keyframes only, so it runs on the compositor.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const s1 = useMemo(() => stars(26, 7), []);
  const s2 = useMemo(() => stars(14, 21), []);
  const s3 = useMemo(() => stars(7, 42), []);

  return (
    <div className="auth-root relative w-full h-full overflow-hidden bg-[#05040d] text-white selection:bg-violet-500/30">
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(120% 80% at 50% -10%, #3b1a7a 0%, #1a0f3d 38%, #07061a 70%, #05040d 100%)' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden auth-fade-in">
        <div className="auth-blob auth-blob-a" />
        <div className="auth-blob auth-blob-b" />
        <div className="auth-blob auth-blob-c" />
        <div className="auth-stars auth-stars-1" style={{ boxShadow: s1 }} />
        <div className="auth-stars auth-stars-2" style={{ boxShadow: s2 }} />
        <div className="auth-stars auth-stars-3" style={{ boxShadow: s3 }} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />

      <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
        <div className="min-h-full w-full max-w-md mx-auto flex flex-col px-5 pt-[max(env(safe-area-inset-top),14px)] pb-[max(env(safe-area-inset-bottom),18px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

const AUTH_CSS = `
.auth-fade-in { animation: auth-fade 1.2s ease-out both; }
@keyframes auth-fade { from { opacity: 0 } to { opacity: 1 } }

.auth-blob { position: absolute; width: 85vmax; height: 85vmax; border-radius: 50%; will-change: transform; }
.auth-blob-a { left: -45vmax; top: -40vmax; background: radial-gradient(circle, rgba(124,58,237,0.42) 0%, rgba(124,58,237,0) 62%); animation: auth-drift-a 22s ease-in-out infinite alternate; }
.auth-blob-b { right: -50vmax; top: 5vh; background: radial-gradient(circle, rgba(219,39,119,0.24) 0%, rgba(219,39,119,0) 60%); animation: auth-drift-b 27s ease-in-out infinite alternate; }
.auth-blob-c { left: -20vmax; bottom: -55vmax; background: radial-gradient(circle, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0) 60%); animation: auth-drift-c 31s ease-in-out infinite alternate; }
@keyframes auth-drift-a { to { transform: translate3d(14vw, 10vh, 0) scale(1.12); } }
@keyframes auth-drift-b { to { transform: translate3d(-18vw, 14vh, 0) scale(0.92); } }
@keyframes auth-drift-c { to { transform: translate3d(16vw, -12vh, 0) scale(1.1); } }

.auth-stars { position: absolute; top: 0; left: 0; border-radius: 50%; background: transparent; will-change: opacity, transform; }
.auth-stars-1 { width: 1.5px; height: 1.5px; animation: auth-twinkle 4s ease-in-out infinite alternate, auth-rise 90s linear infinite; }
.auth-stars-2 { width: 2px; height: 2px; animation: auth-twinkle 5.5s ease-in-out -2s infinite alternate, auth-rise 120s linear infinite; }
.auth-stars-3 { width: 3px; height: 3px; animation: auth-twinkle 3.2s ease-in-out -1s infinite alternate, auth-rise 150s linear infinite; }
@keyframes auth-twinkle { from { opacity: 1 } to { opacity: 0.35 } }
@keyframes auth-rise { from { transform: translate3d(0,0,0) } to { transform: translate3d(0,-12vh,0) } }

.lux-float { animation: lux-float 3.4s ease-in-out infinite; will-change: transform; }
@keyframes lux-float { 0%,100% { transform: translate3d(0,0,0) } 50% { transform: translate3d(0,-7px,0) } }
.lux-glow { animation: lux-glow 3.4s ease-in-out infinite; will-change: transform, opacity; }
@keyframes lux-glow { 0%,100% { transform: scale(0.9); opacity: 0.75 } 50% { transform: scale(1.05); opacity: 1 } }

.auth-bob { animation: auth-bob 3s ease-in-out infinite; will-change: transform; }
@keyframes auth-bob { 0%,100% { transform: translate3d(0,0,0) rotate(0deg) } 50% { transform: translate3d(0,-6px,0) rotate(-4deg) } }

.chunky-face { transform: translate3d(0,0,0); transition: transform 90ms ease-out; }
.chunky:not(:disabled):active .chunky-face { transform: translate3d(0,5px,0); transition-duration: 40ms; }
.chunky:focus-visible .chunky-face { outline: 3px solid rgba(196,181,253,0.7); outline-offset: 3px; }
.chunky-shine { position: absolute; top: 0; bottom: 0; left: 0; width: 45%; pointer-events: none;
  background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%);
  transform: translate3d(-120%,0,0) skewX(-18deg); animation: chunky-shine 3.6s ease-in-out 1.2s infinite; }
@keyframes chunky-shine { 0% { transform: translate3d(-120%,0,0) skewX(-18deg) } 45%,100% { transform: translate3d(330%,0,0) skewX(-18deg) } }

.auth-pop-up { animation: auth-pop-up 1.6s ease-out infinite; }
@keyframes auth-pop-up { 0% { transform: translate3d(0,4px,0) scale(0.6); opacity: 0 } 25% { opacity: 1; transform: translate3d(0,-4px,0) scale(1) } 100% { transform: translate3d(0,-16px,0) scale(1); opacity: 0 } }

@media (prefers-reduced-motion: reduce) {
  .auth-blob, .auth-stars, .lux-float, .lux-glow, .auth-bob, .chunky-shine, .auth-pop-up { animation: none !important; }
}
`;
