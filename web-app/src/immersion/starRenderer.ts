// Star sky renderer, shared by the main thread (fallback) and the sky worker.
//
// Each depth layer is a tile of star positions that repeats across the sky.
// A frame clears the canvas and stamps only the stars that are on screen,
// each one a tiny pre-rendered sprite (core + optional sparkle), so the GPU
// touches ~20k pixels per frame instead of filling the whole screen once per
// depth layer (what a repeating-pattern fill costs, transparent pixels
// included: ~2.4M px). Three parallax depths, one screen-sized canvas.

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

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

interface Sprite {
  img: AnyCanvas;
  box: number;           // CSS px, square
}

interface Star {
  x: number;             // position inside the tile (CSS px)
  y: number;
  alpha: number;
  sprite: Sprite;
}

const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const mod = (v: number, m: number) => ((v % m) + m) % m;

export const createStarRenderer = (
  ctx: Ctx2D,
  makeCanvas: (w: number, h: number) => AnyCanvas,
  specs: StarFieldSpec[],
  tint: string,
  dpr: number,
) => {
  /** A star (and its tight sparkle) rendered once at full alpha; alpha is applied per draw. */
  const paintSprite = (r: number, color: string, glows: boolean): Sprite => {
    const reach = glows ? r * 2.5 : r;
    const box = Math.ceil(reach * 2 + 2);
    const px = Math.max(1, Math.round(box * dpr));
    const img = makeCanvas(px, px);
    const c2 = img.getContext('2d') as Ctx2D | null;
    if (c2) {
      c2.scale(dpr, dpr);
      const c = box / 2;
      if (glows) {
        // Tight sparkle hugging the star (2.5× radius), not a soft blob.
        const halo = c2.createRadialGradient(c, c, r * 0.6, c, c, r * 2.5);
        halo.addColorStop(0, `rgba(${color},0.35)`);
        halo.addColorStop(1, `rgba(${color},0)`);
        c2.fillStyle = halo;
        c2.beginPath();
        c2.arc(c, c, r * 2.5, 0, Math.PI * 2);
        c2.fill();
      }
      c2.fillStyle = `rgb(${color})`;
      c2.beginPath();
      c2.arc(c, c, r, 0, Math.PI * 2);
      c2.fill();
    }
    return { img, box };
  };

  // Sprites are shared by stars of (almost) the same size and colour.
  const sprites = new Map<string, Sprite>();
  const spriteFor = (r: number, color: string, glows: boolean) => {
    const rq = Math.round(r * 20) / 20;
    const key = `${rq}|${color}|${glows ? 1 : 0}`;
    let s = sprites.get(key);
    if (!s) { s = paintSprite(rq, color, glows); sprites.set(key, s); }
    return s;
  };

  const layers = specs.map((spec, i) => {
    const rand = rng(101 + i * 977);
    const stars: Star[] = [];
    for (let k = 0; k < spec.count; k++) {
      const x = rand() * spec.tile;
      const y = rand() * spec.tile;
      const r = spec.size[0] + rand() * (spec.size[1] - spec.size[0]);
      const alpha = spec.alpha[0] + rand() * (spec.alpha[1] - spec.alpha[0]);
      const color = rand() < 0.28 ? tint : '255,255,255';
      const glows = rand() < spec.glow;
      stars.push({ x, y, alpha, sprite: spriteFor(r, color, glows) });
    }
    return { spec, stars };
  });

  /** Draws one frame; the canvas is `width`×`height` CSS px at `dpr`. */
  const draw = (view: StarView, width: number, height: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Math.round(width * dpr), Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const stretch = 1 + Math.min(view.speed * 0.09, 0.55);
    const cx = width / 2;
    const brightness = view.brightness ?? 1;

    for (const { spec, stars } of layers) {
      const d = spec.depth;
      const tile = spec.tile;
      const drift = view.time * (10 + 14 * d); // px/s, slow diagonal drift
      const ox = -view.travel * 0.22 * d + view.tiltX * 26 * d - drift;
      const oy = view.tiltY * 26 * d - view.scroll * 0.12 * d - drift * 0.6;
      const s = 1 + (stretch - 1) * d;
      const twinkle = spec.twinkle && view.time ? 0.78 + 0.22 * Math.sin(view.time * 0.9) : 1;
      const layerAlpha = twinkle * brightness;
      if (layerAlpha <= 0.01) continue;

      // A star at tile position (tx, ty) repeats every `tile` px; on screen:
      //   x = cx + s * (tx + k*tile + ox - cx)    (stretch anchored at the centre)
      //   y = ty + j*tile + oy
      const bx = mod(ox - cx, tile);
      const by = mod(oy, tile);
      const half = cx / s + tile;            // unstretched reach from the centre
      const firstX = -tile * Math.ceil(half / tile);
      const snap = s === 1;

      for (const star of stars) {
        const { img, box } = star.sprite;
        const w = box * s;
        const r = box / 2;
        ctx.globalAlpha = star.alpha * layerAlpha;
        const yStart = mod(star.y + by, tile) - tile;
        for (let rx = mod(star.x + bx, tile) + firstX; rx < half; rx += tile) {
          let left = cx + rx * s - w / 2;
          if (left + w < 0 || left > width) continue;
          if (snap) left = Math.round(left * dpr) / dpr;
          for (let py = yStart; py - r < height; py += tile) {
            if (py + r < 0) continue;
            const top = snap ? Math.round((py - r) * dpr) / dpr : py - r;
            ctx.drawImage(img, left, top, w, box);
          }
        }
      }
    }
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
