// El Monitor's face: a living orb with an eye that looks where it points,
// counter-rotating rings, orbiting sparks and a blink. Honours prefers-reduced-motion.
//
// Performance: every moving part is its own stacked <svg> inside a <div> that is animated with CSS
// `transform` / `opacity` keyframes, so the compositor runs the loops. (Animating <g>/<circle> inside
// one SVG — as before, through framer-motion — repainted the whole orb on the main thread every frame
// and re-layerized the page: the tutorial bubble was the laggiest thing in the app.) Same drawing,
// same timings.

import React, { memo, useId } from 'react';
import { useReducedMotion } from 'framer-motion';

export type OrbMood = 'talk' | 'point' | 'happy' | 'think';

const ORB_CSS = `
.mo-layer { position: absolute; inset: 0; transform-origin: 50% 50%; }
.mo-layer > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.mo-anim { will-change: transform; }
.mo-glow { animation: mo-breathe 2.6s ease-in-out infinite; will-change: transform, opacity; }
.mo-glow.mo-speaking { animation-duration: 0.9s; animation-name: mo-breathe-strong; }
.mo-spin { animation: mo-spin linear infinite; }
.mo-spin-rev { animation: mo-spin-rev linear infinite; }
.mo-eye { transition: transform 0.6s cubic-bezier(0.34, 1.45, 0.64, 1); will-change: transform; }
.mo-blink { animation: mo-blink 4.2s linear infinite; will-change: transform; }
@keyframes mo-breathe { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.06); opacity: 1; } }
@keyframes mo-breathe-strong { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.12); opacity: 1; } }
@keyframes mo-spin { to { transform: rotate(360deg); } }
@keyframes mo-spin-rev { to { transform: rotate(-360deg); } }
@keyframes mo-blink { 0%, 90% { transform: scaleY(1); } 93% { transform: scaleY(0.1); } 96%, 100% { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) { .mo-glow, .mo-spin, .mo-spin-rev, .mo-blink { animation: none !important; } .mo-eye { transition: none; } }
`;

let cssInjected = false;
const useOrbCss = () => {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const s = document.createElement('style');
  s.setAttribute('data-monitor-orb', '');
  s.textContent = ORB_CSS;
  document.head.appendChild(s);
};

const VB = '0 0 100 100';

export const MonitorOrb: React.FC<{ size?: number; mood?: OrbMood; look?: { x: number; y: number }; speaking?: boolean }> = memo(({ size = 56, mood = 'talk', look = { x: 0, y: 0 }, speaking }) => {
  useOrbCss();
  const reduce = !!useReducedMotion();
  const id = `mo${useId().replace(/:/g, '')}`;
  const lx = Math.max(-1, Math.min(1, look.x)) * 7;
  const ly = Math.max(-1, Math.min(1, look.y)) * 6;
  const happy = mood === 'happy';
  const think = mood === 'think';
  const anim = !reduce;
  // SVG units → px for the eye's travel.
  const k = size / 100;

  return (
    <div style={{ width: size, height: size, position: 'relative', flex: 'none' }} aria-hidden="true">
      {/* Glow breathing */}
      <div className={`mo-layer${anim ? ` mo-glow${speaking ? ' mo-speaking' : ''}` : ''}`} style={anim ? undefined : { opacity: 0.85 }}>
        <svg viewBox={VB}>
          <defs>
            <radialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill={`url(#${id}glow)`} />
        </svg>
      </div>

      {/* Outer segmented HUD arcs (slow, opposite direction) */}
      <div className={`mo-layer${anim ? ' mo-anim mo-spin-rev' : ''}`} style={anim ? { animationDuration: '22s' } : undefined}>
        <svg viewBox={VB}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <path key={i} d="M50 1.5 A48.5 48.5 0 0 1 82.9 14.4" fill="none" stroke={i % 2 ? '#818cf8' : '#22d3ee'} strokeOpacity={i % 2 ? 0.55 : 0.85}
              strokeWidth={i % 3 === 0 ? 2.4 : 1.4} strokeLinecap="round" transform={`rotate(${i * 60} 50 50)`} />
          ))}
        </svg>
      </div>

      {/* Outer dashed ring */}
      <div className={`mo-layer${anim ? ' mo-anim mo-spin' : ''}`} style={anim ? { animationDuration: think ? '3s' : '14s' } : undefined}>
        <svg viewBox={VB}>
          <defs>
            <linearGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="none" stroke={`url(#${id}ring)`} strokeWidth="2" strokeDasharray="6 5 1 5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Inner ring, counter-rotating with ticks */}
      <div className={`mo-layer${anim ? ' mo-anim mo-spin-rev' : ''}`} style={anim ? { animationDuration: '9s' } : undefined}>
        <svg viewBox={VB}>
          <circle cx="50" cy="50" r="37.5" fill="none" stroke="#a5b4fc" strokeOpacity="0.35" strokeWidth="1" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="50" y1="11.5" x2="50" y2={i % 3 === 0 ? 16 : 14} stroke="#c7d2fe" strokeOpacity={i % 3 === 0 ? 0.9 : 0.45} strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </svg>
      </div>

      {/* Core sphere (static) */}
      <div className="mo-layer">
        <svg viewBox={VB}>
          <defs>
            <radialGradient id={`${id}core`} cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#e0f7ff" />
              <stop offset="28%" stopColor="#67e8f9" />
              <stop offset="62%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="31" fill={`url(#${id}core)`} />
          <circle cx="50" cy="50" r="31" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
          <ellipse cx="40" cy="35" rx="11" ry="6" fill="#fff" opacity="0.35" transform="rotate(-28 40 35)" />
        </svg>
      </div>

      {/* Eye: looks where it points (transition), blinks (keyframes) */}
      <div className="mo-layer mo-eye" style={{ transform: `translate3d(${(lx * k).toFixed(2)}px, ${(ly * k).toFixed(2)}px, 0)` }}>
        {happy ? (
          <svg viewBox={VB}>
            <path d="M38 52 Q50 40 62 52" fill="none" stroke="#ecfeff" strokeWidth="5" strokeLinecap="round" />
          </svg>
        ) : (
          <div className={`mo-layer${anim ? ' mo-blink' : ''}`}>
            <svg viewBox={VB}>
              <defs>
                <radialGradient id={`${id}iris`} cx="50%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="45%" stopColor="#a5f3fc" />
                  <stop offset="100%" stopColor="#0891b2" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r={think ? 9 : 11} fill={`url(#${id}iris)`} />
              <circle cx="50" cy="50" r={think ? 3.6 : 4.6} fill="#0b1026" />
              <circle cx="46.5" cy="46.5" r="2" fill="#fff" />
            </svg>
          </div>
        )}
      </div>

      {/* Orbiting sparks */}
      {anim && [0, 1, 2].map(i => (
        <div key={i} className="mo-layer mo-anim mo-spin" style={{ animationDuration: `${5 + i * 2.2}s`, animationDelay: `${-i * 1.3}s` }}>
          <svg viewBox={VB}>
            <circle cx="50" cy={4 + i * 2} r={2.2 - i * 0.4} fill={['#67e8f9', '#f0abfc', '#fde68a'][i]} />
          </svg>
        </div>
      ))}
    </div>
  );
});
MonitorOrb.displayName = 'MonitorOrb';
