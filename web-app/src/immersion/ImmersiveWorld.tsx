import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
  getSceneAccent, hasHoverPointer, registerLayer, registerStarfield, setSkyMood, startImmersion, subscribeSceneAccent,
} from './engine';
import { useImmersionPrefs, prefersReducedMotion } from './immersionPrefs';
import { useLifeReading } from './lifeStore';
import { getPerfTier, subscribePerf } from './perf';
import { createStarfield, releaseStarfield, StarFieldSpec } from './starfield';
import './immersion.css';

// ─────────────────────────────────────────────────────────────────────────────
// The world behind the interface. Layers, back to front:
//   far     – the theme's aurora, swaying inside an oversized box
//   stars   – one canvas painting 1–3 star depths (by perf tier)
//   spot    – a soft light that follows the mouse (pointer devices only)
//   sky     – light of your day (adaptive world) or of the hour
//   floor   – the current section's light, pooling under the dock
//   ember   – urgency only: a slow breathing glow from below
//   vignette
// Colour changes crossfade (opacity only), never repaint while animating.
// ─────────────────────────────────────────────────────────────────────────────

// Kept sparse on purpose: a quiet sky, not a particle storm. Stars are crisp
// points; only a few bright ones get a tight sparkle, never a soft blob.
const FIELDS: StarFieldSpec[] = [
  { tile: 460, depth: 0.25, count: 88, size: [0.567, 1.134], alpha: [0.139, 0.385], glow: 0 },
  { tile: 560, depth: 0.55, count: 33, size: [0.851, 1.56], alpha: [0.27, 0.655], glow: 0.12, twinkle: true },
  { tile: 600, depth: 1, count: 10, size: [1.276, 1.985], alpha: [0.347, 0.578], glow: 0.3 },
];

const readRgb = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return (v || fallback).replace(/\s+/g, ' ').split(/[ ,]+/).slice(0, 3).join(',');
};

// Light of the hour, used when the adaptive world is off.
const hourLight = (hour: number) => {
  if (hour >= 5 && hour < 8) return 'radial-gradient(120% 70% at 50% 100%, rgba(255,170,90,0.07), transparent 70%)';
  if (hour >= 8 && hour < 17) return 'radial-gradient(120% 70% at 50% 0%, rgba(190,220,255,0.035), transparent 70%)';
  if (hour >= 17 && hour < 20) return 'radial-gradient(120% 70% at 50% 100%, rgba(255,90,140,0.07), transparent 70%)';
  return 'radial-gradient(120% 80% at 50% 0%, rgba(40,60,160,0.09), transparent 75%)';
};

const BASE_SKY = 'radial-gradient(70% 38% at 50% -6%, rgb(var(--color-primary-glow) / 0.16), transparent 72%)';

/** Two stacked layers: a new background fades in over the old one. */
const Crossfade: React.FC<{ bg: string; className: string; duration?: number }> = ({ bg, className, duration = 1800 }) => {
  const [state, setState] = useState<{ slots: [string, string]; front: 0 | 1 }>({ slots: [bg, ''], front: 0 });
  useEffect(() => {
    setState(prev => {
      if (prev.slots[prev.front] === bg) return prev;
      const next = (prev.front ^ 1) as 0 | 1;
      const slots: [string, string] = [prev.slots[0], prev.slots[1]];
      slots[next] = bg;
      return { slots, front: next };
    });
  }, [bg]);
  return (
    <>
      {state.slots.map((b, i) => (
        <div
          key={i}
          className={className}
          style={{ backgroundImage: b || 'none', opacity: i === state.front ? 1 : 0, transition: `opacity ${duration}ms ease` }}
        />
      ))}
    </>
  );
};

const ImmersiveWorldComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, availableThemes, vicesMode } = useTheme();
  const prefs = useImmersionPrefs();
  const reading = useLifeReading();
  const tier = useSyncExternalStore(subscribePerf, getPerfTier, getPerfTier);
  const accent = useSyncExternalStore(subscribeSceneAccent, getSceneAccent, getSceneAccent);
  const farRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);
  const isSolid = !!availableThemes?.[theme]?.isSolid;

  const living = prefs.enabled && !prefersReducedMotion();
  const depthCount = tier === 0 ? 3 : tier === 1 ? 2 : 1;

  useEffect(() => { startImmersion(); }, []);

  useEffect(() => (farRef.current ? registerLayer(farRef.current, 'far') : undefined), []);
  useEffect(() => (spotRef.current ? registerLayer(spotRef.current, 'spot') : undefined), [living]);

  // Stars are tinted with the theme's primary glow. Built in an effect so the
  // ThemeProvider has already written the new CSS variables.
  useEffect(() => {
    if (!living || !starsRef.current) return;
    const canvas = starsRef.current;
    const tint = vicesMode ? '255,90,90' : readRgb('--color-primary-glow', '99 102 241');
    const unregister = registerStarfield(createStarfield(canvas, FIELDS.slice(0, depthCount), tint));
    return () => {
      unregister();
      // Re-seeded on a theme change; its sky worker stops only once the canvas is gone.
      window.setTimeout(() => { if (!canvas.isConnected) releaseStarfield(canvas); }, 0);
    };
  }, [theme, vicesMode, living, depthCount]);

  // The day's mood sets how bright the stars are and how fast the sky drifts.
  useEffect(() => {
    setSkyMood(reading ? reading.stars : 1, reading ? reading.energy : 1);
  }, [reading]);

  const hour = new Date().getHours();
  const sky = reading
    ? `radial-gradient(75% 42% at 50% -8%, rgb(${reading.sky} / ${reading.skyAlpha}), transparent 72%),` +
      `radial-gradient(90% 38% at 50% 92%, rgb(${reading.ground} / ${reading.groundAlpha}), transparent 70%)`
    : `${BASE_SKY}, ${hourLight(hour)}`;

  const floor = useMemo(
    () => (accent ? `radial-gradient(70% 42% at 50% 118%, rgb(${accent} / 0.15), transparent 72%)` : ''),
    [accent],
  );

  return (
    <div className="lux-world" aria-hidden="true">
      <div ref={farRef} className="lux-far">{children}</div>

      {living && (
        <div className="lux-stars-wrap" style={{ opacity: isSolid ? 0.55 : 1 }}>
          <canvas ref={starsRef} className="lux-stars" />
        </div>
      )}

      {living && hasHoverPointer && <div ref={spotRef} className="lux-spot" />}

      <Crossfade bg={sky} className="lux-light" />
      {living && <Crossfade bg={floor} className="lux-light" duration={1200} />}
      {living && reading?.breathe && <div className="lux-ember" />}

      <div className="lux-vignette" style={{ opacity: reading ? reading.vignette : 0.55 }} />
    </div>
  );
};

export const ImmersiveWorld = React.memo(ImmersiveWorldComponent);
