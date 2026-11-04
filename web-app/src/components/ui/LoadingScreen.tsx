import { useMemo } from 'react';

// Boot screen: just the name, fading in (and, when the app is ready, fading
// out with the overlay in App.tsx). Opacity only — composited, so it stays
// smooth while the app renders underneath.
export const LoadingScreen = () => {
  // index.html already faded the mark in while the bundle loaded; keep it on
  // screen instead of fading it out and back in.
  const markShown = useMemo(() => {
    const at = typeof window !== 'undefined' ? (window as any).__luxBootMark : 0;
    return !!at && Date.now() - at < 6000;
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden z-[9999] pointer-events-auto select-none"
      style={{ backgroundColor: '#020204' }}
    >
      <style>{`@keyframes lux-boot-fade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <h1
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 100,
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          letterSpacing: '0.45em',
          marginRight: '-0.45em',
          color: 'rgba(255,255,255,0.94)',
          lineHeight: 1,
          textShadow: '0 0 32px rgba(129,140,248,0.35)',
          animation: markShown ? undefined : 'lux-boot-fade 0.6s ease both',
        }}
      >
        LUX
      </h1>
    </div>
  );
};
