import React, { memo, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Orb {
  x: number;
  y: number;
  r: number;
  color: string;
  speed: number;
  phase: number;
}

interface MeshBackgroundProps {
  className?: string;
}

// DEFAULT_COLORS is not used, removing.

const COSMIC_PALETTES: Record<string, string[]> = {
  cosmic_void: ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899'],
  cosmic_nebula: ['#7c3aed', '#c026d3', '#ec4899', '#f43f5e'],
  cosmic_ocean: ['#0891b2', '#06b6d4', '#0ea5e9', '#0284c7'],
  cosmic_sunset: ['#d97706', '#c2410c', '#ea580c', '#b45309'],
  cosmic_forest: ['#0d9488', '#14b8a6', '#06b6d4', '#10b981'],
  cosmic_ember: ['#be1234', '#9f1239', '#c2410c', '#b45309'],
};

export const MeshBackground: React.FC<MeshBackgroundProps> = memo(({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, vicesMode } = useTheme();
  const isCosmicTheme = theme.startsWith('cosmic_');
  
  // If vices mode is active, override cosmic colors with deep reds
  const currentColors = vicesMode 
    ? ['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] // Red-600 to Red-900
    : (COSMIC_PALETTES[theme] || COSMIC_PALETTES['cosmic_void']);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      // Scale down canvas dimensions for massive performance boost
      // A resolution of 25% of screen size is perfectly sufficient for blurry background orbs
      width = Math.ceil(window.innerWidth * 0.25);
      height = Math.ceil(window.innerHeight * 0.25);
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    const orbs: Orb[] = [
      { x: 0.1, y: 0.2, r: 0.7, color: currentColors[0], speed: 0.0004, phase: 0 },
      { x: 0.9, y: 0.8, r: 0.8, color: currentColors[1], speed: 0.0006, phase: 2 },
      { x: 0.8, y: 0.2, r: 0.6, color: currentColors[2], speed: 0.0003, phase: 4 },
      { x: 0.2, y: 0.8, r: 0.7, color: currentColors[3], speed: 0.0005, phase: 6 },
    ];

    const parsedOrbs = orbs.map((orb) => {
      const hex = orb.color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { ...orb, rStr: `${r}, ${g}, ${b}` };
    });

    let isPaused = false;
    let lastRenderTime = 0;

    const render = (timestamp: number = 0) => {
      if (isPaused) return;

      animationFrameId = requestAnimationFrame(render);

      // Limit background updates to 30 FPS (every 33ms) for maximum battery and CPU saving
      if (timestamp - lastRenderTime < 33) {
        return;
      }
      lastRenderTime = timestamp;

      time += 0.8;
      const w = width;
      const h = height;

      ctx.fillStyle = '#020204';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'source-over';

      parsedOrbs.forEach((orb) => {
        const movementX = Math.sin(time * orb.speed + orb.phase) * 0.12;
        const movementY = Math.cos(time * orb.speed + orb.phase) * 0.12;
        const x = (orb.x + movementX) * w;
        const y = (orb.y + movementY) * h;
        const radius = Math.max(w, h) * orb.r;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${orb.rStr}, 0.17)`);
        gradient.addColorStop(0.5, `rgba(${orb.rStr}, 0.045)`);
        gradient.addColorStop(1, `rgba(${orb.rStr}, 0)`);

        ctx.fillStyle = gradient;

        const startX = Math.max(0, x - radius);
        const startY = Math.max(0, y - radius);
        const rectW = Math.min(w - startX, radius * 2);
        const rectH = Math.min(h - startY, radius * 2);

        if (rectW > 0 && rectH > 0) {
          ctx.fillRect(startX, startY, rectW, rectH);
        }
      });

      ctx.globalCompositeOperation = 'source-over';
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        cancelAnimationFrame(animationFrameId);
      } else {
        if (isPaused) {
          isPaused = false;
          render();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!document.hidden) {
      render();
    } else {
      isPaused = true;
    }

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, isCosmicTheme, vicesMode]);

  if (!isCosmicTheme) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none block m-0 p-0 ${className || ''}`}
      style={{ zIndex: 0 }}
    />
  );
});

MeshBackground.displayName = 'MeshBackground';
