import React, { useEffect, useRef } from 'react';

export interface ParticleConfig {
  enabled: boolean;
  trigger: 'BREAK_ONLY' | 'FOCUS_ONLY' | 'BOTH';
  focusDirection: 'FALLING' | 'RISING';
  focusColor: string;
  breakDirection: 'FALLING' | 'RISING';
  breakColor: string;
  auraEnabled: boolean;
  ringMode: 'DRAIN' | 'FILL';
  showRoutinePomodorosOnProjects?: boolean;
}

export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  enabled: true,
  trigger: 'BREAK_ONLY',
  focusDirection: 'FALLING',
  focusColor: '',
  breakDirection: 'FALLING',
  breakColor: '',
  auraEnabled: true,
  ringMode: 'DRAIN',
  showRoutinePomodorosOnProjects: true
};

interface ParticleOverlayProps {
  config: ParticleConfig;
  isBreak: boolean;
  isActive: boolean; // true = timer running (play), false = paused / stopped
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  swayAmp: number;
  swayPhase: number;
  opacity: number;
}

export const ParticleOverlay: React.FC<ParticleOverlayProps> = React.memo(({
  config,
  isBreak,
  isActive,
  color = '#3b82f6'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const speedMultiplierRef = useRef<number>(isActive ? 1.0 : 0.0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const shouldRender = (() => {
    if (!config.enabled) return false;
    if (config.trigger === 'BREAK_ONLY') return isBreak;
    if (config.trigger === 'FOCUS_ONLY') return !isBreak;
    return true; // BOTH
  })();

  const currentDirection = isBreak
    ? (config.breakDirection || 'FALLING')
    : (config.focusDirection || 'FALLING');
  
  const particleColor = isBreak
    ? (config.breakColor || '#93c5fd')
    : (config.focusColor || color);

  const isFalling = currentDirection === 'FALLING';

  // Initialize particles once or on canvas resize
  const initParticles = (width: number, height: number) => {
    const count = 35;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 2.5,
        speedY: Math.random() * 40 + 25, // px per sec
        swayAmp: Math.random() * 15 + 5,
        swayPhase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.5 + 0.4
      });
    }
    particlesRef.current = particles;
  };

  useEffect(() => {
    if (!shouldRender) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      if (particlesRef.current.length === 0) {
        initParticles(w, h);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.1); // in seconds, capped
      lastTimeRef.current = now;

      // ─── 2-SECOND TRANSITION ACCELERATION / DECELERATION LOGIC ───
      const targetSpeed = isActive ? 1.0 : 0.0;
      const transitionRate = 0.5; // 1.0 / 2.0s = 0.5 per sec

      if (speedMultiplierRef.current < targetSpeed) {
        speedMultiplierRef.current = Math.min(targetSpeed, speedMultiplierRef.current + transitionRate * deltaTime);
      } else if (speedMultiplierRef.current > targetSpeed) {
        speedMultiplierRef.current = Math.max(targetSpeed, speedMultiplierRef.current - transitionRate * deltaTime);
      }

      const mult = speedMultiplierRef.current;
      // Smooth ease curve: mult * mult * (3 - 2 * mult)
      const smoothMult = mult * mult * (3 - 2 * mult);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const directionSign = isFalling ? 1 : -1;

      // Draw and update particles
      for (const p of particlesRef.current) {
        if (smoothMult > 0.0001) {
          p.y += directionSign * p.speedY * smoothMult * deltaTime;
          p.swayPhase += 1.5 * smoothMult * deltaTime;
          p.x += Math.sin(p.swayPhase) * p.swayAmp * smoothMult * deltaTime * 0.1;

          // Wrap around logic
          if (isFalling && p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          } else if (!isFalling && p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }

          if (p.x > width + 10) p.x = -10;
          if (p.x < -10) p.x = width + 10;
        }

        // Render particle
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = particleColor;
        ctx.shadowColor = particleColor;
        ctx.shadowBlur = p.size * 2.5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [shouldRender, isActive, isBreak, isFalling, particleColor]);

  if (!shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10 overflow-hidden"
    />
  );
});
