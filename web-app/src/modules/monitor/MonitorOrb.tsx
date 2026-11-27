// El Monitor's face: a living orb with an eye that looks where it points,
// counter-rotating rings, orbiting sparks and a blink. Pure SVG + framer-motion
// (transform / opacity only), honours prefers-reduced-motion.

import React, { memo, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type OrbMood = 'talk' | 'point' | 'happy' | 'think';

export const MonitorOrb: React.FC<{ size?: number; mood?: OrbMood; look?: { x: number; y: number }; speaking?: boolean }> = memo(({ size = 56, mood = 'talk', look = { x: 0, y: 0 }, speaking }) => {
  const reduce = useReducedMotion();
  const id = `mo${useId().replace(/:/g, '')}`;
  const lx = Math.max(-1, Math.min(1, look.x)) * 7;
  const ly = Math.max(-1, Math.min(1, look.y)) * 6;
  const happy = mood === 'happy';
  const think = mood === 'think';

  return (
    <div style={{ width: size, height: size, position: 'relative', flex: 'none' }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={`${id}core`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#e0f7ff" />
            <stop offset="28%" stopColor="#67e8f9" />
            <stop offset="62%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
          <linearGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <radialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}iris`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
        </defs>

        {/* Glow breathing */}
        <motion.circle cx="50" cy="50" r="50" fill={`url(#${id}glow)`}
          animate={reduce ? undefined : { scale: speaking ? [1, 1.12, 1] : [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: speaking ? 0.9 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '50px 50px' }} />

        {/* Outer segmented HUD arcs (slow, opposite direction) */}
        <motion.g animate={reduce ? undefined : { rotate: -360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '50px 50px' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <path key={i} d="M50 1.5 A48.5 48.5 0 0 1 82.9 14.4" fill="none" stroke={i % 2 ? '#818cf8' : '#22d3ee'} strokeOpacity={i % 2 ? 0.55 : 0.85}
              strokeWidth={i % 3 === 0 ? 2.4 : 1.4} strokeLinecap="round" transform={`rotate(${i * 60} 50 50)`} />
          ))}
        </motion.g>

        {/* Outer dashed ring */}
        <motion.circle cx="50" cy="50" r="44" fill="none" stroke={`url(#${id}ring)`} strokeWidth="2" strokeDasharray="6 5 1 5" strokeLinecap="round"
          animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: think ? 3 : 14, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '50px 50px' }} />
        {/* Inner ring, counter-rotating with ticks */}
        <motion.g animate={reduce ? undefined : { rotate: -360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '50px 50px' }}>
          <circle cx="50" cy="50" r="37.5" fill="none" stroke="#a5b4fc" strokeOpacity="0.35" strokeWidth="1" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="50" y1="11.5" x2="50" y2={i % 3 === 0 ? 16 : 14} stroke="#c7d2fe" strokeOpacity={i % 3 === 0 ? 0.9 : 0.45} strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </motion.g>

        {/* Core sphere */}
        <circle cx="50" cy="50" r="31" fill={`url(#${id}core)`} />
        <circle cx="50" cy="50" r="31" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
        <ellipse cx="40" cy="35" rx="11" ry="6" fill="#fff" opacity="0.35" transform="rotate(-28 40 35)" />

        {/* Eye */}
        <motion.g animate={{ x: lx, y: ly }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
          {happy ? (
            <path d="M38 52 Q50 40 62 52" fill="none" stroke="#ecfeff" strokeWidth="5" strokeLinecap="round" />
          ) : (
            <motion.g
              animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1, 1] }}
              transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
              style={{ transformOrigin: '50px 50px' }}
            >
              <circle cx="50" cy="50" r={think ? 9 : 11} fill={`url(#${id}iris)`} />
              <circle cx="50" cy="50" r={think ? 3.6 : 4.6} fill="#0b1026" />
              <circle cx="46.5" cy="46.5" r="2" fill="#fff" />
            </motion.g>
          )}
        </motion.g>

        {/* Orbiting sparks */}
        {!reduce && [0, 1, 2].map(i => (
          <motion.g key={i} animate={{ rotate: 360 }} transition={{ duration: 5 + i * 2.2, repeat: Infinity, ease: 'linear', delay: -i * 1.3 }} style={{ transformOrigin: '50px 50px' }}>
            <circle cx="50" cy={4 + i * 2} r={2.2 - i * 0.4} fill={['#67e8f9', '#f0abfc', '#fde68a'][i]} />
          </motion.g>
        ))}
      </svg>
    </div>
  );
});
MonitorOrb.displayName = 'MonitorOrb';
