// Starfield renderer: every depth layer is a pre-painted tile used as a
// repeating pattern, and the whole sky is drawn into ONE viewport-sized canvas.
//
// This replaced oversized CSS tile layers: on a phone at DPR ~2.75 each of
// those could cost tens of MB of GPU memory, which is exactly what tips
// Android WebViews into black screens. Here the cost is one small canvas, and
// a frame is three pattern fills — and frames only happen while something moves.

export interface StarFieldSpec {
  tile: number;          // tile size in CSS px
  depth: number;         // 0 (far) .. 1 (near): parallax factor
  count: number;
  size: [number, number];
  alpha: [number, number];
  glow: number;          // share of stars that get a soft halo
  twinkle?: boolean;
}

export interface Pulse {
  x: number;
  y: number;
  rgb: string;           // "r,g,b"
  t: number;             // 0..1 progress
}

export interface StarView {
  travel: number;        // camera position in px (already scaled by width)
  tiltX: number;         // -1..1
  tiltY: number;         // -1..1
  scroll: number;        // content scroll in px
  speed: number;         // camera speed, for motion streaks
  time: number;          // seconds, for drift/twinkle (0 = static)
  pulses?: Pulse[];
  brightness?: number;   // 0..1, set by the adaptive world (night is brightest)
}

const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const paintTile = (spec: StarFieldSpec, seed: number, tint: string, dpr: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.round(spec.tile * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  const rand = rng(seed);

  for (let i = 0; i < spec.count; i++) {
    const x = rand() * spec.tile;
    const y = rand() * spec.tile;
    const r = spec.size[0] + rand() * (spec.size[1] - spec.size[0]);
    const a = spec.alpha[0] + rand() * (spec.alpha[1] - spec.alpha[0]);
    const color = rand() < 0.28 ? tint : '255,255,255';
    const glows = rand() < spec.glow;

    // Paint the star at every wrapped position (the canvas clips the rest) so
    // stars and halos near an edge continue seamlessly into the next tile.
    for (const dx of [-spec.tile, 0, spec.tile]) {
      for (const dy of [-spec.tile, 0, spec.tile]) {
        const cx = x + dx;
        const cy = y + dy;
        if (glows) {
          // Tight sparkle hugging the star (2.5× radius), not a soft blob.
          const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.5);
          halo.addColorStop(0, `rgba(${color},${(a * 0.35).toFixed(3)})`);
          halo.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return canvas;
};

export const createStarfield = (canvas: HTMLCanvasElement, specs: StarFieldSpec[], tint: string) => {
  const ctx = canvas.getContext('2d');
  // Render at (almost) the screen's real density so every star is a crisp
  // point; capped only to keep memory sane on ~3x displays.
  const dpr = Math.min(window.devicePixelRatio || 1, 2.25);
  let width = 0;
  let height = 0;

  const layers = specs.map((spec, i) => {
    const tile = paintTile(spec, 101 + i * 977, tint, dpr);
    const pattern = ctx?.createPattern(tile, 'repeat') || null;
    return { spec, pattern };
  });

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };
  resize();

  const draw = (view: StarView) => {
    if (!ctx) return;
    if (canvas.width !== Math.round(window.innerWidth * dpr) || canvas.height !== Math.round(window.innerHeight * dpr)) resize();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const stretch = 1 + Math.min(view.speed * 0.09, 0.55);

    layers.forEach(({ spec, pattern }) => {
      if (!pattern) return;
      const d = spec.depth;
      const drift = view.time * (10 + 14 * d); // px/s, slow diagonal drift
      const ox = -view.travel * 0.22 * d + view.tiltX * 26 * d - drift;
      const oy = view.tiltY * 26 * d - view.scroll * 0.12 * d - drift * 0.6;
      const s = 1 + (stretch - 1) * d;

      // Pattern space → CSS px: undo the tile's DPR, then offset/stretch.
      // Stretch is anchored at the screen center so stars streak outwards.
      const m = new DOMMatrix()
        .translate(width / 2, 0)
        .scale(s, 1)
        .translate(-width / 2 + ox, oy)
        .scale(1 / dpr, 1 / dpr);
      pattern.setTransform(m);

      const twinkle = spec.twinkle && view.time ? 0.78 + 0.22 * Math.sin(view.time * 0.9) : 1;
      ctx.globalAlpha = twinkle * (view.brightness ?? 1);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    });
    ctx.globalAlpha = 1;

    // Impact shockwaves: rings of light expanding through the sky. Drawn here
    // rather than as DOM elements so a screen-sized ring costs no GPU memory.
    view.pulses?.forEach(({ x, y, rgb, t }) => {
      const maxR = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
      const eased = 1 - Math.pow(1 - t, 3);
      const r = 12 + eased * maxR;
      const band = 26 + 70 * eased;
      const alpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      const g = ctx.createRadialGradient(x, y, Math.max(0, r - band), x, y, r + band * 0.35);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(0.62, `rgba(${rgb},${(0.1 * alpha).toFixed(3)})`);
      g.addColorStop(0.78, `rgba(${rgb},${(0.44 * alpha).toFixed(3)})`);
      g.addColorStop(0.86, `rgba(${rgb},${(0.14 * alpha).toFixed(3)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      const R = r + band;
      ctx.fillRect(Math.max(0, x - R), Math.max(0, y - R), Math.min(width, x + R) - Math.max(0, x - R), Math.min(height, y + R) - Math.max(0, y - R));
    });
  };

  return { draw };
};

export type Starfield = ReturnType<typeof createStarfield>;
