import React, { useMemo } from 'react';

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
      `}</style>

      {/* Logo */}
      <h1
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 100,
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          letterSpacing: '0.45em',
          marginRight: '-0.45em',
          color: 'rgba(255,255,255,0.92)',
          lineHeight: 1,
        }}
      >
        LUX
      </h1>

      {/* Static separator line */}
      <div
        style={{
          marginTop: '20px',
          width: '100px',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.45), transparent)',
          borderRadius: '9999px',
        }}
      />

      {/* Custom Subtitle Phrase (Max 20 chars) */}
      <p 
        style={{
          marginTop: '14px',
          fontSize: '0.8rem',
          fontWeight: 600,
          letterSpacing: '0.15em',
          color: 'rgba(34, 211, 238, 0.85)',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          textAlign: 'center',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        {splashPhrase}
      </p>
    </div>
  );
};
