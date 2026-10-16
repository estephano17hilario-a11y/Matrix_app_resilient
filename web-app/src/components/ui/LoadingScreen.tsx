import { useMemo } from 'react';

// Boot sequence: a horizon of light opens, the mark resolves out of the dark
// and an orbit draws itself around it. Pure CSS (transform/opacity, plus a
// small text blur), so it starts on the first frame with no JS work.
export const LoadingScreen = () => {
  const splashPhrase = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('matrix_splash_phrase');
        if (saved && saved.trim().length > 0) return saved.trim().slice(0, 20);
      } catch (e) {}
    }
    return 'Sin Excusas';
  }, []);

  // index.html already painted the mark while the bundle loaded; keep it on
  // screen instead of fading it out and back in.
  const markShown = useMemo(() => {
    const at = typeof window !== 'undefined' ? (window as any).__luxBootMark : 0;
    return !!at && Date.now() - at < 6000;
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-[9999] pointer-events-auto select-none"
      style={{ backgroundColor: '#020204' }}
    >
      <style>{`
        @keyframes lux-boot-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lux-boot-halo {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; }
          100% { opacity: 0.85; transform: scale(1); }
        }
        @keyframes lux-boot-breathe { from { opacity: 0.85; } to { opacity: 0.55; } }
        @keyframes lux-boot-horizon {
          from { opacity: 0; transform: scaleX(0); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes lux-boot-letter {
          from { opacity: 0; transform: translateY(14px) scale(0.92); filter: blur(10px); }
          to   { opacity: 1; transform: none; filter: blur(0); }
        }
        @keyframes lux-boot-orbit-draw { from { stroke-dashoffset: 760; } to { stroke-dashoffset: 0; } }
        @keyframes lux-boot-orbit-spin { to { transform: rotate(360deg); } }
        @keyframes lux-boot-rise {
          from { opacity: 0; transform: translateY(8px); letter-spacing: 0.45em; }
          to   { opacity: 1; transform: none; letter-spacing: 0.18em; }
        }
        @keyframes lux-boot-scan {
          from { transform: translateX(-120%); }
          to   { transform: translateX(120%); }
        }
        .lux-boot-letter {
          display: inline-block;
          opacity: 0;
          animation: lux-boot-letter 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .lux-boot * { animation-duration: 0.01s !important; animation-delay: 0s !important; }
        }
      `}</style>

      <div className="lux-boot relative flex flex-col items-center" style={{ animation: markShown ? undefined : 'lux-boot-fade 0.3s ease both' }}>
        {/* Halo behind the mark */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 420,
            height: 420,
            marginLeft: -210,
            marginTop: -250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(236,72,153,0.07) 38%, transparent 66%)',
            animation: 'lux-boot-halo 1.6s cubic-bezier(0.16,1,0.3,1) both, lux-boot-breathe 2.4s ease-in-out 1.6s infinite alternate',
          }}
        />

        {/* Orbit */}
        <svg
          aria-hidden="true"
          width="248"
          height="248"
          viewBox="0 0 248 248"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -124,
            marginTop: -164,
            animation: 'lux-boot-orbit-spin 14s linear infinite',
          }}
        >
          <defs>
            <linearGradient id="lux-boot-orbit" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0)" />
              <stop offset="45%" stopColor="rgba(34,211,238,0.55)" />
              <stop offset="100%" stopColor="rgba(129,140,248,0.05)" />
            </linearGradient>
          </defs>
          <circle
            cx="124"
            cy="124"
            r="120"
            fill="none"
            stroke="url(#lux-boot-orbit)"
            strokeWidth="1"
            strokeDasharray="760"
            strokeLinecap="round"
            style={{ animation: 'lux-boot-orbit-draw 1.7s cubic-bezier(0.65,0,0.35,1) 0.15s both' }}
          />
          <circle cx="124" cy="4" r="2" fill="rgba(165,243,252,0.9)" style={{ animation: 'lux-boot-fade 0.6s ease 1.5s both' }} />
        </svg>

        {/* Mark */}
        <h1
          style={{
            position: 'relative',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 100,
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            letterSpacing: '0.45em',
            marginRight: '-0.45em',
            color: 'rgba(255,255,255,0.94)',
            lineHeight: 1,
            textShadow: '0 0 32px rgba(129,140,248,0.35)',
          }}
        >
          {'LUX'.split('').map((ch, i) => (
            <span
              key={i}
              className={markShown ? undefined : 'lux-boot-letter'}
              style={markShown ? { display: 'inline-block' } : { animationDelay: `${0.12 + i * 0.12}s` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        {/* Horizon */}
        <div
          style={{
            position: 'relative',
            marginTop: 22,
            width: 132,
            height: 1,
            overflow: 'hidden',
            borderRadius: 9999,
            background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.6), rgba(34,211,238,0.7), rgba(99,102,241,0.6), transparent)',
            boxShadow: '0 0 14px rgba(34,211,238,0.35)',
            animation: 'lux-boot-horizon 1.2s cubic-bezier(0.16,1,0.3,1) 0.35s both',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.95), transparent)',
              animation: 'lux-boot-scan 1.6s cubic-bezier(0.45,0,0.55,1) 1s infinite',
            }}
          />
        </div>

        {/* Custom Subtitle Phrase (Max 20 chars) */}
        <p
          style={{
            marginTop: 16,
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: 'rgba(34, 211, 238, 0.85)',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            textAlign: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            animation: 'lux-boot-rise 1.1s cubic-bezier(0.16,1,0.3,1) 0.65s both',
          }}
        >
          {splashPhrase}
        </p>
      </div>
    </div>
  );
};
