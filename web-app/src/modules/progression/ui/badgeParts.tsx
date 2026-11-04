// Building blocks for the rank insignias: palettes, gradients and generators
// (wings, laurels, gems, crowns, rays…). Everything is plain SVG; the only
// animation is a CSS opacity/scale twinkle that the caller opts into.

import React from 'react';
import type { RankId } from '../engine/config';

export type Pt = [number, number];

export interface Pal {
  deep: string; dark: string; mid: string; light: string; shine: string;
  trimDark: string; trimMid: string; trimLight: string;
  gem: string; gemLight: string; gemDark: string;
  glow: string;
}

export const PALETTES: Record<RankId, Pal> = {
  BRONZE: { deep: '#2a1206', dark: '#7a4120', mid: '#c27a43', light: '#f0b57c', shine: '#ffe2c2', trimDark: '#5e3015', trimMid: '#d58e55', trimLight: '#ffd2a1', gem: '#2fb59c', gemLight: '#a8f5e4', gemDark: '#0e5a4c', glow: '#ff9d4d' },
  SILVER: { deep: '#1d2634', dark: '#5f6d82', mid: '#b4c0cf', light: '#e8eef6', shine: '#ffffff', trimDark: '#566072', trimMid: '#cfd8e3', trimLight: '#ffffff', gem: '#3d8bff', gemLight: '#b9d8ff', gemDark: '#12388f', glow: '#a9c8ff' },
  GOLD: { deep: '#3f2704', dark: '#94640f', mid: '#eebb3f', light: '#ffe48d', shine: '#fff8d9', trimDark: '#8a5a0c', trimMid: '#ffd45e', trimLight: '#fff3b8', gem: '#e0243f', gemLight: '#ff9fae', gemDark: '#69091a', glow: '#ffc43d' },
  PLATINUM: { deep: '#0b2a30', dark: '#1d5f66', mid: '#4fa3ab', light: '#b4e6e4', shine: '#f2fffd', trimDark: '#4d7a82', trimMid: '#b9dde0', trimLight: '#ffffff', gem: '#2f8dff', gemLight: '#b3d6ff', gemDark: '#0c3a8c', glow: '#5fe3e0' },
  DIAMOND: { deep: '#0a2a6b', dark: '#1f6fe0', mid: '#4db8ff', light: '#cdeeff', shine: '#ffffff', trimDark: '#3a86d8', trimMid: '#9fdcff', trimLight: '#ffffff', gem: '#6fd6ff', gemLight: '#ecfaff', gemDark: '#0f5bb8', glow: '#58c8ff' },
  CHAMPION: { deep: '#260a49', dark: '#5f23c4', mid: '#a770ff', light: '#e2c9ff', shine: '#ffffff', trimDark: '#8a5a0c', trimMid: '#ffd45e', trimLight: '#fff3b8', gem: '#ffcf3f', gemLight: '#fff3a6', gemDark: '#8a5a00', glow: '#c08bff' },
  GRAND_CHAMPION: { deep: '#3e0707', dark: '#a81818', mid: '#ff5f5f', light: '#ffc0c0', shine: '#fff0f0', trimDark: '#8a5a0c', trimMid: '#ffd45e', trimLight: '#fff3b8', gem: '#ff2a55', gemLight: '#ffadc0', gemDark: '#690018', glow: '#ff7a5a' },
  LEGEND: { deep: '#4d3000', dark: '#d78c00', mid: '#ffd84a', light: '#fff1a8', shine: '#ffffff', trimDark: '#a8730a', trimMid: '#ffe27a', trimLight: '#ffffff', gem: '#3fd8ff', gemLight: '#e3fbff', gemDark: '#0a6f94', glow: '#ffe27a' },
};

/** Legend colours (pink → orange → yellow → green → cyan → blue → violet → magenta). */
export const RAINBOW = ['#ff5d8f', '#ff9f43', '#ffe66d', '#6be675', '#35e0ff', '#6aa5ff', '#a97bff', '#ff7ad9'];

export const rad = (d: number) => (d * Math.PI) / 180;
export const f = (n: number) => Number(n.toFixed(2));
export const u = (id: string, name: string) => `url(#${id}-${name})`;

export const Defs: React.FC<{ id: string; p: Pal }> = ({ id, p }) => (
  <defs>
    <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={p.light} /><stop offset=".3" stopColor={p.mid} /><stop offset=".68" stopColor={p.dark} /><stop offset="1" stopColor={p.deep} />
    </linearGradient>
    <linearGradient id={`${id}-plate`} x1=".2" y1="1" x2=".8" y2="0">
      <stop offset="0" stopColor={p.deep} /><stop offset=".35" stopColor={p.dark} /><stop offset=".8" stopColor={p.mid} /><stop offset="1" stopColor={p.light} />
    </linearGradient>
    <linearGradient id={`${id}-trim`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={p.trimLight} /><stop offset=".35" stopColor={p.trimMid} /><stop offset=".7" stopColor={p.trimDark} /><stop offset="1" stopColor={p.trimMid} />
    </linearGradient>
    <radialGradient id={`${id}-gem`} cx=".35" cy=".3" r=".85">
      <stop offset="0" stopColor={p.gemLight} /><stop offset=".45" stopColor={p.gem} /><stop offset="1" stopColor={p.gemDark} />
    </radialGradient>
    <radialGradient id={`${id}-glow`}>
      <stop offset="0" stopColor={p.glow} stopOpacity=".85" /><stop offset=".55" stopColor={p.glow} stopOpacity=".25" /><stop offset="1" stopColor={p.glow} stopOpacity="0" />
    </radialGradient>
    <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".32" />
    </linearGradient>
    <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={p.trimDark} /><stop offset=".55" stopColor={p.trimMid} /><stop offset="1" stopColor={p.trimLight} />
    </linearGradient>
    <linearGradient id={`${id}-wingD`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={p.deep} /><stop offset=".6" stopColor={p.dark} /><stop offset="1" stopColor={p.mid} />
    </linearGradient>
    <linearGradient id={`${id}-wingL`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={p.trimMid} /><stop offset=".6" stopColor={p.trimLight} /><stop offset="1" stopColor={p.shine} />
    </linearGradient>
    <linearGradient id={`${id}-halfL`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={p.light} /><stop offset=".55" stopColor={p.mid} /><stop offset="1" stopColor={p.dark} />
    </linearGradient>
    <linearGradient id={`${id}-halfR`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={p.mid} /><stop offset=".55" stopColor={p.dark} /><stop offset="1" stopColor={p.deep} />
    </linearGradient>
    <linearGradient id={`${id}-bwing`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={p.dark} /><stop offset=".6" stopColor={p.mid} /><stop offset="1" stopColor={p.light} />
    </linearGradient>
    <linearGradient id={`${id}-bwingD`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={p.deep} /><stop offset=".6" stopColor={p.dark} /><stop offset="1" stopColor={p.mid} />
    </linearGradient>
    <linearGradient id={`${id}-bwingL`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={p.mid} /><stop offset=".6" stopColor={p.light} /><stop offset="1" stopColor={p.shine} />
    </linearGradient>
    <linearGradient id={`${id}-prism`} x1="0" y1="0" x2="1" y2="1">
      {RAINBOW.map((c, i) => <stop key={i} offset={i / (RAINBOW.length - 1)} stopColor={c} />)}
    </linearGradient>
    <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={p.light} /><stop offset=".5" stopColor={p.mid} /><stop offset="1" stopColor={p.dark} />
    </linearGradient>
    <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#7b8696" /><stop offset=".45" stopColor="#f4f8ff" /><stop offset="1" stopColor="#8a95a6" />
    </linearGradient>
  </defs>
);

// ── Geometry helpers ────────────────────────────────────────────────────────

export const cubic = (a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt => {
  const s = 1 - t;
  return [s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0], s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1]];
};

export const inward = (p: Pt, cx: number, cy: number, d: number): Pt => {
  const dx = cx - p[0];
  const dy = cy - p[1];
  const l = Math.hypot(dx, dy) || 1;
  return [p[0] + (dx / l) * d, p[1] + (dy / l) * d];
};

export const starPoints = (cx: number, cy: number, ro: number, ri: number, n: number, rot = -90) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = rad(rot + (180 / n) * i);
    const r = i % 2 ? ri : ro;
    return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
  }).join(' ');

// ── Ornaments ───────────────────────────────────────────────────────────────

export const Rivet: React.FC<{ id: string; p: Pal; x: number; y: number; r?: number }> = ({ id, p, x, y, r = 1.9 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={0.45} />
    <circle cx={x - r * 0.3} cy={y - r * 0.32} r={r * 0.32} fill="#fff" opacity={0.85} />
  </g>
);

export const Gem: React.FC<{ id: string; p: Pal; cx: number; cy: number; r: number; rot?: number; bezel?: boolean; lite?: boolean }> = ({ id, p, cx, cy, r, rot = 0, bezel = true, lite }) => {
  const hex = (k: number) => Array.from({ length: 6 }, (_, i) => `${f(k * Math.cos(rad(60 * i - 90)))},${f(k * Math.sin(rad(60 * i - 90)))}`);
  const outer = hex(r);
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      {bezel && <circle r={r + 1.7} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={0.5} />}
      <polygon points={outer.join(' ')} fill={u(id, 'gem')} stroke={p.gemDark} strokeWidth={0.5} />
      {!lite && outer.map((pt, i) => (
        <polygon key={i} points={`0,0 ${pt} ${outer[(i + 1) % 6]}`} fill={i % 2 ? '#fff' : '#000'} opacity={i % 2 ? 0.17 : 0.15} />
      ))}
      {!lite && <polygon points={hex(r * 0.46).join(' ')} fill={p.gemLight} opacity={0.5} />}
      <ellipse cx={-r * 0.3} cy={-r * 0.38} rx={r * 0.24} ry={r * 0.12} fill="#fff" opacity={0.9} transform={`rotate(-35 ${-r * 0.3} ${-r * 0.38})`} />
    </g>
  );
};

export const Sparkle: React.FC<{ x: number; y: number; s: number; animate?: boolean; delay?: number; fill?: string }> = ({ x, y, s, animate, delay = 0, fill = '#fff' }) => (
  <g transform={`translate(${x} ${y})`}>
    <path
      d={`M0 ${-s} L${f(s * 0.22)} ${f(-s * 0.22)} L${s} 0 L${f(s * 0.22)} ${f(s * 0.22)} L0 ${s} L${f(-s * 0.22)} ${f(s * 0.22)} L${-s} 0 L${f(-s * 0.22)} ${f(-s * 0.22)}Z`}
      fill={fill}
      className={animate ? 'rb-twinkle' : undefined}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    />
  </g>
);

export const Rays: React.FC<{ cx: number; cy: number; n: number; r1: number; r2: number; half?: number; fill: string; opacity: number; alt?: number }> = ({ cx, cy, n, r1, r2, half = 0.05, fill, opacity, alt = 0.7 }) => (
  <g opacity={opacity}>
    {Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      const rr = i % 2 ? r2 * alt : r2;
      const pt = (r: number, da: number) => `${f(cx + r * Math.cos(a + da))},${f(cy + r * Math.sin(a + da))}`;
      return <polygon key={i} points={`${pt(r1, -half)} ${pt(rr, 0)} ${pt(r1, half)}`} fill={fill} />;
    })}
  </g>
);

export const Ticks: React.FC<{ cx: number; cy: number; r: number; n: number; len: number; stroke: string; w?: number; opacity?: number; major?: number }> = ({ cx, cy, r, n, len, stroke, w = 0.7, opacity = 1, major = 0 }) => (
  <g opacity={opacity} stroke={stroke} strokeWidth={w} strokeLinecap="round">
    {Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n;
      const l = major && i % major === 0 ? len * 1.7 : len;
      return <line key={i} x1={f(cx + r * Math.cos(a))} y1={f(cy + r * Math.sin(a))} x2={f(cx + (r + l) * Math.cos(a))} y2={f(cy + (r + l) * Math.sin(a))} />;
    })}
  </g>
);

/** A fan of overlapping feathers, root at (ax, ay). Mirror it about x = `axis`. */
export const Wing: React.FC<{
  id: string; p: Pal; ax: number; ay: number; L: number; rows: number; n: number;
  spread: [number, number]; mirror?: boolean; axis?: number; sharp?: boolean; lite?: boolean; tone?: 'trim' | 'body'; thick?: number;
}> = ({ id, p, ax, ay, L, rows, n, spread, mirror, axis = 80, sharp, lite, tone = 'trim', thick = 1 }) => {
  const feathers: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const k = 1 - r * 0.24;
    const cnt = Math.max(3, n - r);
    const grad = `${tone === 'body' ? 'b' : ''}${r === 0 ? 'wingD' : r === rows - 1 ? 'wingL' : 'wing'}`;
    for (let i = 0; i < cnt; i++) {
      const t = cnt === 1 ? 0 : i / (cnt - 1);
      const ang = spread[0] + (spread[1] - spread[0]) * t + (r % 2 ? (spread[1] - spread[0]) / (cnt * 2) : 0);
      const len = L * k * (0.8 + 0.2 * Math.sin(Math.PI * (0.2 + 0.8 * (1 - t))));
      const w = (sharp ? 4.4 : 7) * k * thick;
      const d = sharp
        ? `M0 0 L${f(len * 0.3)} ${f(-w)} L${f(len)} 0 L${f(len * 0.34)} ${f(w * 0.55)} Z`
        : `M0 0 C${f(len * 0.25)} ${f(-w)} ${f(len * 0.75)} ${f(-w * 1.1)} ${f(len)} 0 C${f(len * 0.75)} ${f(w * 0.7)} ${f(len * 0.25)} ${f(w * 0.85)} 0 0 Z`;
      feathers.push(
        <g key={`${r}-${i}`} transform={`rotate(${f(ang)})`}>
          <path d={d} fill={u(id, grad)} stroke={p.deep} strokeWidth={0.5} strokeLinejoin="round" />
          {!lite && <path d={`M${f(len * 0.08)} 0 L${f(len * 0.9)} 0`} stroke={p.shine} strokeWidth={0.4} opacity={0.6} />}
        </g>,
      );
    }
  }
  const place = `translate(${ax} ${ay})`;
  return <g transform={mirror ? `translate(${axis * 2} 0) scale(-1 1) ${place}` : place}>{feathers}</g>;
};

/** Laurel branch along an arc, with paired leaves and (optionally) berries. */
export const Laurel: React.FC<{
  id: string; p: Pal; cx: number; cy: number; R: number; a0: number; a1: number; n: number; leaf: number;
  mirror?: boolean; axis?: number; berries?: boolean; lite?: boolean;
}> = ({ id, p, cx, cy, R, a0, a1, n, leaf, mirror, axis = 80, berries, lite }) => {
  const at = (a: number): Pt => [cx + R * Math.cos(rad(a)), cy + R * Math.sin(rad(a))];
  const [sx, sy] = at(a0);
  const [ex, ey] = at(a1);
  const dir = a1 > a0 ? 1 : -1;
  const els: React.ReactNode[] = [
    <path key="stem" d={`M${f(sx)} ${f(sy)} A${R} ${R} 0 0 ${dir === 1 ? 1 : 0} ${f(ex)} ${f(ey)}`} fill="none" stroke={p.trimDark} strokeWidth={2.4} strokeLinecap="round" />,
    <path key="stem2" d={`M${f(sx)} ${f(sy)} A${R} ${R} 0 0 ${dir === 1 ? 1 : 0} ${f(ex)} ${f(ey)}`} fill="none" stroke={p.trimLight} strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />,
  ];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const a = a0 + (a1 - a0) * t;
    const [x, y] = at(a);
    const tangent = a + 90 * dir;
    const lf = leaf * (1 - 0.32 * t);
    for (const side of [-1, 1]) {
      const orient = tangent + side * 40;
      els.push(
        <g key={`${i}-${side}`} transform={`translate(${f(x)} ${f(y)}) rotate(${f(orient)})`}>
          <path d={`M0 0 C${f(lf * 0.3)} ${f(-lf * 0.46)} ${f(lf * 0.78)} ${f(-lf * 0.4)} ${f(lf)} 0 C${f(lf * 0.78)} ${f(lf * 0.4)} ${f(lf * 0.3)} ${f(lf * 0.46)} 0 0Z`} fill={u(id, 'leaf')} stroke={p.deep} strokeWidth={0.4} strokeLinejoin="round" />
          {!lite && <path d={`M${f(lf * 0.08)} 0 L${f(lf * 0.88)} 0`} stroke={p.shine} strokeWidth={0.3} opacity={0.7} />}
        </g>,
      );
    }
    if (berries && !lite && i % 3 === 1) {
      const [bx, by] = at(a + (a1 - a0) / (2 * n));
      els.push(<circle key={`b${i}`} cx={f(bx)} cy={f(by)} r={1.7} fill={u(id, 'gem')} stroke={p.deep} strokeWidth={0.3} />);
    }
  }
  const body = <g>{els}</g>;
  return mirror ? <g transform={`translate(${axis * 2} 0) scale(-1 1)`}>{body}</g> : body;
};

/** Crown with `n` points; `base` is the y of its lower band. */
export const Crown: React.FC<{ id: string; p: Pal; cx: number; base: number; w: number; h: number; n: number; arches?: boolean; lite?: boolean }> = ({ id, p, cx, base, w, h, n, arches, lite }) => {
  const x0 = cx - w / 2;
  const mid = (n - 1) / 2;
  const tips: Pt[] = Array.from({ length: n }, (_, k) => [x0 + (w * k) / (n - 1), base - h * (1 - 0.3 * (Math.abs(k - mid) / Math.max(mid, 1)))]);
  let d = `M${f(x0)} ${base} L${f(tips[0][0])} ${f(tips[0][1])}`;
  for (let k = 1; k < n; k++) {
    d += ` L${f((tips[k - 1][0] + tips[k][0]) / 2)} ${f(base - h * 0.36)} L${f(tips[k][0])} ${f(tips[k][1])}`;
  }
  d += ` L${f(x0 + w)} ${base} Z`;
  const topY = Math.min(...tips.map(t => t[1]));
  return (
    <g>
      {arches && (
        <g fill="none" stroke={p.trimDark} strokeWidth={1.6} strokeLinecap="round">
          <path d={`M${f(x0 + 3)} ${base - 4} Q${f(cx)} ${f(topY - h * 0.95)} ${f(x0 + w - 3)} ${base - 4}`} />
          <path d={`M${f(x0 + 3)} ${base - 4} Q${f(cx)} ${f(topY - h * 0.95)} ${f(x0 + w - 3)} ${base - 4}`} stroke={p.trimLight} strokeWidth={0.7} />
        </g>
      )}
      <path d={d} fill={u(id, 'trim')} stroke={p.deep} strokeWidth={0.9} strokeLinejoin="round" />
      {!lite && <path d={d} fill={u(id, 'sheen')} opacity={0.7} />}
      <path d={`M${f(x0)} ${base - 5} H${f(x0 + w)} V${base + 3} H${f(x0)} Z`} fill={u(id, 'body')} stroke={p.deep} strokeWidth={0.8} />
      <path d={`M${f(x0)} ${base - 5} H${f(x0 + w)}`} stroke={p.trimLight} strokeWidth={0.7} opacity={0.8} />
      {tips.map(([tx, ty], k) => <circle key={k} cx={f(tx)} cy={f(ty - 1.2)} r={k === Math.round(mid) ? 2.5 : 1.9} fill={u(id, 'gem')} stroke={p.deep} strokeWidth={0.4} />)}
      {Array.from({ length: Math.max(3, n - 2) }, (_, k) => {
        const gx = x0 + 6 + ((w - 12) * k) / (Math.max(3, n - 2) - 1);
        return <circle key={`g${k}`} cx={f(gx)} cy={base - 1} r={1.5} fill={u(id, 'gem')} stroke={p.deep} strokeWidth={0.3} />;
      })}
      {arches && (
        <g>
          <circle cx={cx} cy={f(topY - h * 0.5 - 2)} r={2.8} fill={u(id, 'gem')} stroke={p.deep} strokeWidth={0.5} />
          <path d={`M${cx} ${f(topY - h * 0.5 - 7)} V${f(topY - h * 0.5 - 4.5)} M${f(cx - 1.6)} ${f(topY - h * 0.5 - 6)} H${f(cx + 1.6)}`} stroke={p.trimLight} strokeWidth={0.9} strokeLinecap="round" />
        </g>
      )}
      {!lite && Array.from({ length: n }, (_, k) => <path key={`l${k}`} d={`M${f(tips[k][0])} ${f(tips[k][1] + 3)} V${base - 6}`} stroke={p.trimLight} strokeWidth={0.4} opacity={0.6} />)}
    </g>
  );
};
