import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface ParticleConfig {
  enabled: boolean;
  trigger: 'BREAK_ONLY' | 'FOCUS_ONLY' | 'BOTH';
  focusDirection: 'FALLING' | 'RISING';
  focusColor: string;
  breakDirection: 'FALLING' | 'RISING';
  breakColor: string;
  auraEnabled: boolean;
  ringMode: 'DRAIN' | 'FILL';
}

export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  enabled: true,
  trigger: 'BREAK_ONLY',
  focusDirection: 'FALLING',
  focusColor: '',
  breakDirection: 'FALLING',
  breakColor: '',
  auraEnabled: true,
  ringMode: 'DRAIN'
};

interface ParticleOverlayProps {
  config: ParticleConfig;
  isBreak: boolean;
  isActive: boolean;
  color?: string;
}

export const ParticleOverlay: React.FC<ParticleOverlayProps> = React.memo(({
  config,
  isBreak,
  isActive,
  color = '#3b82f6'
}) => {
  const shouldRender = useMemo(() => {
    if (!config.enabled) return false;
    if (!isActive) return false; // Only render when timer session is active!
    if (config.trigger === 'BREAK_ONLY') return isBreak;
    if (config.trigger === 'FOCUS_ONLY') return !isBreak;
    return true; // BOTH (active focus or active break)
  }, [config, isBreak, isActive]);

  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 6 + 6,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.3
    }));
  }, []);

  if (!shouldRender) return null;

  const currentDirection = isBreak
    ? (config.breakDirection || 'FALLING')
    : (config.focusDirection || 'FALLING');
  
  const particleColor = isBreak
    ? (config.breakColor || '#93c5fd')
    : (config.focusColor || color);

  const isFalling = currentDirection === 'FALLING';

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{
            x: `${p.x}vw`,
            y: isFalling ? '-5vh' : '105vh',
            opacity: 0
          }}
          animate={{
            y: isFalling ? '105vh' : '-5vh',
            opacity: [0, p.opacity, p.opacity, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear'
          }}
          className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: particleColor,
            boxShadow: `0 0 8px ${particleColor}`
          }}
        />
      ))}
    </div>
  );
});
