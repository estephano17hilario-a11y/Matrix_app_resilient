// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — visual tour. Real screenshots of the app with numbered circles
// on each part, a dimmed spotlight, an arrow to a callout with the explanation,
// and dots to jump to the next real screen.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import manifest from './gallery.manifest.json';
import { GALLERY, type SlideDef } from './galleryContent';
import { MonitorOrb } from './MonitorOrb';
import type { SectionId } from './monitorStore';
import type { Lang } from './scripts';

type Rect = [number, number, number, number];
interface ManifestSlide { w: number; h: number; spots: Record<string, Record<string, Rect>>; langs: string[] }
interface ResolvedSlide { w: number; h: number; spots: Record<string, Rect>; lang: string }
const MANIFEST = manifest as unknown as Record<string, ManifestSlide>;

/** Screenshot + measured boxes in the app language (falls back to the other one). */
const resolve = (m: ManifestSlide, lang: Lang): ResolvedSlide => {
  const l = m.langs.includes(lang) ? lang : m.langs[0];
  return { w: m.w, h: m.h, spots: m.spots[l] || {}, lang: l };
};
const srcFor = (slide: string, m: ResolvedSlide) => `${import.meta.env.BASE_URL}tutorial/${m.lang}/${slide}.jpg`;

export const MonitorGallery: React.FC<{ section: SectionId; lang: Lang; onClose: () => void; onCreate?: () => void }> = ({ section, lang, onClose, onCreate }) => {
  const reduce = !!useReducedMotion();
  const L = (p: [string, string]) => (lang === 'es' ? p[0] : p[1]);
  const slides = useMemo(
    () => GALLERY[section]
      .filter(s => MANIFEST[s.id] && MANIFEST[s.id].langs?.length)
      .map(s => { const m = resolve(MANIFEST[s.id], lang); return { def: s, m, spots: s.spots.filter(sp => m.spots[sp.id]) }; })
      .filter(s => s.spots.length > 0),
    [section, lang],
  );
  const [si, setSi] = useState(0);
  const [pi, setPi] = useState(0);
  const [dir, setDir] = useState(1);
  const [box, setBox] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onR = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    const onK = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    window.addEventListener('resize', onR);
    window.addEventListener('keydown', onK);
    return () => { window.removeEventListener('resize', onR); window.removeEventListener('keydown', onK); };
  });

  if (!slides.length) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 100550, background: 'rgba(3,3,10,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, color: '#fff', textAlign: 'center' }} onClick={onClose}>
        <MonitorOrb size={90} mood="think" />
        <p style={{ fontSize: 15 }}>{lang === 'es' ? 'Aún no tengo capturas de esta zona.' : 'No screenshots for this zone yet.'}</p>
      </div>,
      document.body,
    );
  }

  const slide = slides[Math.min(si, slides.length - 1)];
  const spot = slide.spots[Math.min(pi, slide.spots.length - 1)];
  const isLast = si === slides.length - 1 && pi >= slide.spots.length - 1;

  function step(d: 1 | -1) {
    if (d === 1) {
      if (pi < slide.spots.length - 1) setPi(pi + 1);
      else if (si < slides.length - 1) { setDir(1); setSi(si + 1); setPi(0); }
      else onClose();
    } else {
      if (pi > 0) setPi(pi - 1);
      else if (si > 0) { setDir(-1); setSi(si - 1); setPi(slides[si - 1].spots.length - 1); }
    }
  }
  const goSlide = (i: number) => { setDir(i > si ? 1 : -1); setSi(i); setPi(0); };

  // Phone frame size: fit the screenshot in the upper ~62 % of the screen.
  const maxH = Math.min(box.h * 0.6, 640);
  const maxW = Math.min(box.w - 48, 340);
  const scale = Math.min(maxW / slide.m.w, maxH / slide.m.h);
  const fw = Math.round(slide.m.w * scale);
  const fh = Math.round(slide.m.h * scale);

  return createPortal(
    <motion.div
      role="dialog" aria-modal="true" aria-label={lang === 'es' ? 'Recorrido visual' : 'Visual tour'}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100550, background: 'radial-gradient(120% 80% at 50% 0%, #15153d 0%, #05050f 60%, #000 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'calc(env(safe-area-inset-top) + 10px) 16px calc(env(safe-area-inset-bottom) + 12px)', color: '#fff' }}
    >
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 10 }}>
        <MonitorOrb size={36} mood="point" look={{ x: 0.2, y: 0.4 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: '#67e8f9' }}>EL MONITOR · {si + 1}/{slides.length}</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{L(slide.def.title)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={lang === 'es' ? 'Cerrar' : 'Close'} style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      </div>

      {/* Screenshot */}
      <div style={{ position: 'relative', marginTop: 12, width: fw + 14, height: fh + 14, flex: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 30, background: 'linear-gradient(140deg, #3a3a55, #121220 40%, #2a2a40)', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px -20px rgba(103,232,249,0.4)' }} />
        <div style={{ position: 'absolute', left: 7, top: 7, width: fw, height: fh, borderRadius: 24, overflow: 'hidden', background: '#000' }}>
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div key={slide.def.id} custom={dir}
              initial={reduce ? { opacity: 0 } : { x: dir * fw, opacity: 0.4 }} animate={{ x: 0, opacity: 1 }} exit={reduce ? { opacity: 0 } : { x: -dir * fw, opacity: 0.4 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              style={{ position: 'absolute', inset: 0 }}
              drag={reduce ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25}
              onDragEnd={(_, info) => { if (info.offset.x < -60 && si < slides.length - 1) goSlide(si + 1); else if (info.offset.x > 60 && si > 0) goSlide(si - 1); }}
            >
              <img src={srcFor(slide.def.id, slide.m)} alt={L(slide.def.title)} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' }} />
              <SpotLayer slide={slide.def} m={slide.m} spots={slide.spots} active={spot?.id} scale={scale} reduce={reduce} onPick={i => setPi(i)} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Callout */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, marginTop: 14, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {spot && (
            <motion.div key={`${slide.def.id}-${spot.id}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}
              style={{ borderRadius: 20, padding: 1.5, background: 'linear-gradient(135deg, rgba(103,232,249,0.7), rgba(167,139,250,0.5), rgba(244,114,182,0.55))' }}>
              <div style={{ borderRadius: 18.5, background: 'rgba(12,12,26,0.97)', padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 999, background: 'linear-gradient(135deg, #22d3ee, #818cf8)', color: '#06101f', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(103,232,249,0.6)' }}>{pi + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15.5, fontWeight: 900 }}>{L(spot.title)}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13.5, lineHeight: 1.45, color: 'rgba(235,240,255,0.82)' }}>{L(spot.text)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ flex: 1 }} />

        {/* Slide dots: each one is another real screen */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '12px 0' }} role="tablist">
          {slides.map((s, i) => (
            <button key={s.def.id} type="button" role="tab" aria-selected={i === si} aria-label={L(s.def.title)} onClick={() => goSlide(i)}
              style={{ width: 44, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.span animate={{ width: i === si ? 26 : 10, background: i === si ? '#67e8f9' : 'rgba(255,255,255,0.25)' }} style={{ height: 10, borderRadius: 99, display: 'block' }} />
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => step(-1)} disabled={si === 0 && pi === 0} aria-label={lang === 'es' ? 'Anterior' : 'Previous'}
            style={{ width: 52, height: 50, borderRadius: 16, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: si === 0 && pi === 0 ? 0.35 : 1 }}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => (isLast && onCreate ? onCreate() : step(1))}
            style={{ flex: 1, height: 50, borderRadius: 16, fontWeight: 900, fontSize: 15, color: '#06101f', background: 'linear-gradient(100deg, #22d3ee, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {isLast
              ? (onCreate ? (lang === 'es' ? 'Ahora créalo conmigo' : 'Now create it with me') : (lang === 'es' ? 'Terminar' : 'Finish'))
              : pi >= slide.spots.length - 1 ? (lang === 'es' ? 'Siguiente pantalla' : 'Next screen') : (lang === 'es' ? 'Siguiente' : 'Next')}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
};

/** Dim + spotlight + numbered circles + arrow, drawn in screenshot pixels. */
const SpotLayer: React.FC<{ slide: SlideDef; m: ResolvedSlide; spots: SlideDef['spots']; active?: string; scale: number; reduce: boolean; onPick: (i: number) => void }> = ({ m, spots, active, scale, reduce, onPick }) => {
  const a = active ? m.spots[active] : null;
  const maskId = `gm-${active}`;
  const r = 13 / scale; // circle radius in image px (≈13 px on screen)
  return (
    <svg viewBox={`0 0 ${m.w} ${m.h}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <mask id={maskId}>
          <rect width={m.w} height={m.h} fill="#fff" />
          {a && <motion.rect fill="#000" rx={14} initial={false} animate={{ x: a[0] - 6, y: a[1] - 6, width: a[2] + 12, height: a[3] + 12 }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 26 }} />}
        </mask>
      </defs>
      <rect width={m.w} height={m.h} fill="#000" opacity={0.42} mask={`url(#${maskId})`} />
      {a && (
        <motion.rect fill="none" stroke="#67e8f9" strokeWidth={2.5 / scale} rx={14} strokeDasharray={`${8 / scale} ${6 / scale}`}
          initial={false} animate={{ x: a[0] - 6, y: a[1] - 6, width: a[2] + 12, height: a[3] + 12, strokeDashoffset: reduce ? 0 : [0, -28 / scale] }}
          transition={{ type: 'spring', stiffness: 200, damping: 26, strokeDashoffset: { duration: 1, repeat: Infinity, ease: 'linear' } }} />
      )}
      {a && (() => {
        // Arrow from the callout (below the screenshot) up to the highlighted part.
        const tx = a[0] + a[2] / 2;
        const below = a[1] + a[3] + 10;
        const above = a[1] - 10;
        const fromBottom = below < m.h * 0.9;
        const ty = fromBottom ? below : above;
        const sx = m.w / 2;
        const sy = fromBottom ? m.h - 4 : 4;
        if (Math.abs(sy - ty) < 40 / scale) return null;
        const my = (sy + ty) / 2;
        const d = `M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`;
        const head = 9 / scale;
        const up = fromBottom; // arrow points up when it comes from the bottom
        return (
          <g key={`arrow-${active}`}>
            <motion.path d={d} fill="none" stroke="#fde68a" strokeWidth={3 / scale} strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5 }} style={{ filter: 'drop-shadow(0 0 4px rgba(253,230,138,0.8))' }} />
            <motion.path d={up ? `M ${tx - head} ${ty + head} L ${tx} ${ty} L ${tx + head} ${ty + head}` : `M ${tx - head} ${ty - head} L ${tx} ${ty} L ${tx + head} ${ty - head}`}
              fill="none" stroke="#fde68a" strokeWidth={3 / scale} strokeLinecap="round" strokeLinejoin="round"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.45 }} />
          </g>
        );
      })()}
      {spots.map((sp, i) => {
        const b = m.spots[sp.id];
        // Circle on the top-left corner of the part (kept inside the image).
        const cx = Math.max(r + 2, Math.min(m.w - r - 2, b[0] + Math.min(b[2] - r, r * 1.4)));
        const cy = Math.max(r + 2, Math.min(m.h - r - 2, b[1]));
        const on = sp.id === active;
        return (
          <g key={sp.id} onClick={() => onPick(i)} style={{ cursor: 'pointer' }}>
            {on && !reduce && (
              <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke="#67e8f9" strokeWidth={2 / scale}
                animate={{ r: [r, r * 2], opacity: [0.9, 0] }} transition={{ duration: 1.3, repeat: Infinity }} />
            )}
            <circle cx={cx} cy={cy} r={r * 1.9} fill="transparent" />
            <circle cx={cx} cy={cy} r={r} fill={on ? '#22d3ee' : 'rgba(10,10,25,0.85)'} stroke={on ? '#fff' : '#67e8f9'} strokeWidth={1.6 / scale} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={13 / scale} fontWeight={900} fill={on ? '#06101f' : '#fff'}>{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
};
