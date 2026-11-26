import React from 'react';
import type { BannerMotif } from './catalog';
import './superHabits.css';

interface BannerBackdropProps {
  motif: BannerMotif;
  primary: string;
  secondary: string;
  deep: string;
  className?: string;
  /** Slow ambient motion. Off for cards in a long list. */
  animate?: boolean;
}

/** Themed banner background: gradient + a motif that matches the habit's world. */
export const BannerBackdrop = React.memo(({ motif, primary, secondary, deep, className = '', animate = true }: BannerBackdropProps) => {
  const move = animate ? '' : ' sh-still';
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${deep} 0%, ${primary}55 55%, ${secondary}40 100%)` }} />

      {motif === 'rays' && (
        <svg className={`absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 sh-rays${move}`} width="720" height="720" viewBox="-100 -100 200 200" style={{ opacity: 0.35 }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d="M0 0L-7 -100L7 -100Z" fill={i % 2 ? secondary : primary} opacity={i % 2 ? 0.5 : 0.8} transform={`rotate(${i * 22.5})`} />
          ))}
        </svg>
      )}

      {motif === 'grid' && (
        <>
          <div className="absolute inset-0 sh-grid" style={{ ['--sh-line' as any]: `${secondary}55` }} />
          <div className={`absolute inset-x-0 h-24 sh-scan${move}`} style={{ background: `linear-gradient(180deg, transparent, ${secondary}33, transparent)` }} />
        </>
      )}

      {motif === 'waves' && (
        <svg className="absolute inset-x-0 bottom-0 w-[200%] h-2/3" viewBox="0 0 800 200" preserveAspectRatio="none">
          {[0.35, 0.22, 0.14].map((o, i) => (
            <path key={i} className={`sh-wave-${i}${move}`} d={`M0 ${70 + i * 28} C100 ${30 + i * 28} 200 ${110 + i * 28} 300 ${70 + i * 28} S500 ${30 + i * 28} 600 ${70 + i * 28} S750 ${100 + i * 28} 800 ${70 + i * 28} V200 H0Z`}
              fill={i % 2 ? secondary : primary} opacity={o + 0.1} />
          ))}
        </svg>
      )}

      {motif === 'bubbles' && (
        <>
          {[
            { l: '8%', s: 46, d: 0 }, { l: '24%', s: 22, d: 1.2 }, { l: '42%', s: 64, d: 0.6 },
            { l: '63%', s: 28, d: 2 }, { l: '78%', s: 52, d: 0.3 }, { l: '92%', s: 20, d: 1.6 },
          ].map((b, i) => (
            <span key={i} className={`absolute rounded-full sh-bubble${move}`}
              style={{ left: b.l, bottom: '-10%', width: b.s, height: b.s, animationDelay: `${b.d}s`, background: `radial-gradient(circle at 30% 30%, ${secondary}aa, ${primary}22 70%)`, border: `1px solid ${secondary}55` }} />
          ))}
        </>
      )}

      {motif === 'stripes' && (
        <div className="absolute inset-0 sh-stripes" style={{ ['--sh-a' as any]: `${primary}22`, ['--sh-b' as any]: `${secondary}11` }} />
      )}

      {motif === 'rain' && (
        <div className={`absolute inset-0 sh-rain${move}`} style={{ ['--sh-line' as any]: `${primary}88` }} />
      )}

      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />
    </div>
  );
});
BannerBackdrop.displayName = 'BannerBackdrop';
