import { useEffect, useState } from 'react';

export const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 3200; // 3.2s progress fill
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-[9999] pointer-events-auto select-none"
      style={{
        backgroundColor: '#020204',
        animation: 'lux-fade-in 0.35s ease forwards',
      }}
    >
      <style>{`
        @keyframes lux-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lux-pulse-glow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>

      {/* Ambient background glow */}
      <div 
        className="absolute w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(99,102,241,0.2) 60%, transparent 100%)',
        }}
      />

      {/* Logo */}
      <h1
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 100,
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          letterSpacing: '0.45em',
          marginRight: '-0.45em',
          color: 'rgba(255,255,255,0.95)',
          lineHeight: 1,
          animation: 'lux-pulse-glow 3s infinite ease-in-out',
        }}
      >
        LUX
      </h1>

      {/* Progress container bar */}
      <div className="relative mt-8 w-44 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-75 ease-out rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Subtle loading text */}
      <span className="mt-4 text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">
        CARGANDO APLICACIÓN...
      </span>
    </div>
  );
};

