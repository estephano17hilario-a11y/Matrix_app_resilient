// ─────────────────────────────────────────────────────────────────────────────
// SHARE PROGRESS — draws the "today's progress" card on a canvas.
//
// One fixed 4:5 composition (1080×1350). Every block is optional; the visible
// blocks are measured first, then stacked and centred, and the whole stack is
// scaled down if it would not fit — so any combination of toggles looks balanced.
// Pure canvas: no DOM-to-image dependency, no cross-origin images (nothing taints).
// ─────────────────────────────────────────────────────────────────────────────

import type { ThemeConfig } from '../../../config/themes';

export const CARD_W = 1080;
export const CARD_H = 1350;
export const QUOTE_MAX = 30;

export interface ShareProjectRow { name: string; minutes: number; color: string }
export interface ShareHabitRow { name: string; done: boolean }

export interface ShareHud {
  name: string;
  /** Local avatar image (same-origin only); null → initial letter. */
  avatar: HTMLImageElement | null;
  rankLabel: string;
  rankGradient: [string, string];
  rankColor: string;
  /** 0-based division, null for Legend. */
  division: number | null;
  level: number;
  hp: number;
  maxHp: number;
}

export interface ShareData {
  dateLabel: string;
  focusMinutes: number;
  projects: ShareProjectRow[];
  habits: ShareHabitRow[];
  habitsDone: number;
  habitsTotal: number;
  tasksDone: number;
  score: number;
  hud: ShareHud | null;
}

/** How the stat figures (focus, tasks, habits, accuracy, score) are grouped. */
export type ShareStyle = 'cards' | 'list' | 'spotlight';
export const SHARE_STYLES: ShareStyle[] = ['cards', 'list', 'spotlight'];

export interface ShareOptions {
  style: ShareStyle;
  /** Export without any background (PNG keeps its alpha channel). */
  transparent: boolean;
  focus: boolean;
  projects: boolean;
  projectNames: boolean;
  habits: boolean;
  habitNames: boolean;
  accuracy: boolean;
  tasks: boolean;
  score: boolean;
  hud: boolean;
  quote: string;
}

export interface ShareCopy {
  focus: string; tasks: string; habits: string; accuracy: string; score: string;
  projects: string; project: string; more: (n: number) => string; brand: string; title: string;
  tasksSub: string; focusSub: string;
}

export const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  style: 'cards', transparent: false,
  focus: true, projects: true, projectNames: true, habits: true, habitNames: true,
  accuracy: true, tasks: true, score: true, hud: false, quote: '',
};

const FONT = `'Inter', 'Segoe UI', system-ui, -apple-system, 'Roboto', sans-serif`;
const PAD = 72;
const CW = CARD_W - PAD * 2;
const MAX_PROJECT_ROWS = 3;
const MAX_HABIT_ROWS = 5;

// ── helpers ────────────────────────────────────────────────────────────────

const rgb = (triplet: string, alpha = 1) => {
  const [r, g, b] = triplet.trim().split(/\s+/).map(Number);
  return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
};

export const formatFocus = (minutes: number) => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxW: number) => {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
};

// Set once per render. Without a background the panels turn into dark glass so
// the white text stays readable over whatever the image ends up on.
let glass = false;

const panel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 30) => {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = glass ? 'rgba(8,8,14,0.46)' : 'rgba(255,255,255,0.065)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = glass ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.11)';
  ctx.stroke();
};

/** Soft drop shadow for text that floats directly on the (maybe transparent) background. */
const withShadow = (ctx: CanvasRenderingContext2D, draw: () => void) => {
  ctx.save();
  if (glass) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;
  }
  draw();
  ctx.restore();
};

// ── background ─────────────────────────────────────────────────────────────

const drawBackground = (ctx: CanvasRenderingContext2D, theme: ThemeConfig) => {
  if (glass) {
    ctx.clearRect(0, 0, CARD_W, CARD_H);
    return;
  }
  const { bgDepth, primaryGlow, secondaryGlow } = theme.colors;
  ctx.fillStyle = rgb(bgDepth);
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const solid = !!theme.isSolid;
  const strength = solid ? 0.16 : 0.42;

  const g1 = ctx.createRadialGradient(CARD_W * 0.12, CARD_H * 0.06, 0, CARD_W * 0.12, CARD_H * 0.06, CARD_W * 0.95);
  g1.addColorStop(0, rgb(primaryGlow, strength));
  g1.addColorStop(1, rgb(primaryGlow, 0));
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const g2 = ctx.createRadialGradient(CARD_W * 0.95, CARD_H * 0.97, 0, CARD_W * 0.95, CARD_H * 0.97, CARD_W * 1.05);
  g2.addColorStop(0, rgb(secondaryGlow, strength * 0.9));
  g2.addColorStop(1, rgb(secondaryGlow, 0));
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (!solid) {
    const g3 = ctx.createRadialGradient(CARD_W * 0.8, CARD_H * 0.38, 0, CARD_W * 0.8, CARD_H * 0.38, CARD_W * 0.5);
    g3.addColorStop(0, rgb(primaryGlow, 0.12));
    g3.addColorStop(1, rgb(primaryGlow, 0));
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  // Soft vignette keeps text legible on bright themes.
  const v = ctx.createLinearGradient(0, 0, 0, CARD_H);
  v.addColorStop(0, 'rgba(0,0,0,0.10)');
  v.addColorStop(0.5, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Hairline frame.
  roundRect(ctx, 18, 18, CARD_W - 36, CARD_H - 36, 44);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.stroke();
};

// ── blocks ─────────────────────────────────────────────────────────────────

interface Block { height: number; draw: (ctx: CanvasRenderingContext2D, y: number) => void }

const drawShield = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, gradient: [string, string], division: number | null) => {
  const w = size * 0.86;
  const top = cy - size / 2;
  const g = ctx.createLinearGradient(cx, top, cx, top + size);
  g.addColorStop(0, gradient[1]);
  g.addColorStop(1, gradient[0]);
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx + w / 2, top + size * 0.16);
  ctx.lineTo(cx + w / 2, top + size * 0.55);
  ctx.quadraticCurveTo(cx + w / 2, top + size * 0.86, cx, top + size);
  ctx.quadraticCurveTo(cx - w / 2, top + size * 0.86, cx - w / 2, top + size * 0.55);
  ctx.lineTo(cx - w / 2, top + size * 0.16);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = `900 ${size * 0.42}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(division === null ? '★' : ['I', 'II', 'III'][division] ?? '', cx, cy + size * 0.04);
};

const hudBlock = (hud: ShareHud): Block => ({
  height: 190,
  draw: (ctx, y) => {
    panel(ctx, PAD, y, CW, 190, 38);

    // Avatar with rank-coloured ring
    const r = 62;
    const ax = PAD + 40 + r;
    const ay = y + 95;
    ctx.beginPath();
    ctx.arc(ax, ay, r + 8, 0, Math.PI * 2);
    const ring = ctx.createLinearGradient(ax - r, ay - r, ax + r, ay + r);
    ring.addColorStop(0, hud.rankGradient[1]);
    ring.addColorStop(1, hud.rankGradient[0]);
    ctx.fillStyle = ring;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.clip();
    if (hud.avatar && hud.avatar.naturalWidth > 0) {
      const s = Math.max((r * 2) / hud.avatar.naturalWidth, (r * 2) / hud.avatar.naturalHeight);
      const w = hud.avatar.naturalWidth * s;
      const h = hud.avatar.naturalHeight * s;
      ctx.drawImage(hud.avatar, ax - w / 2, ay - h / 2 - (h - r * 2) * 0.15, w, h);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(ax - r, ay - r, r * 2, r * 2);
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${r}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((hud.name || '?').charAt(0).toUpperCase(), ax, ay + 4);
    }
    ctx.restore();

    const tx = ax + r + 36;
    const maxW = PAD + CW - 36 - tx;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 44px ${FONT}`;
    ctx.fillText(fitText(ctx, hud.name, maxW), tx, y + 62);

    // Rank shield + label + level
    drawShield(ctx, tx + 22, y + 102, 50, hud.rankGradient, hud.division);
    ctx.fillStyle = hud.rankColor;
    ctx.font = `800 32px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const rankText = fitText(ctx, hud.rankLabel, maxW - 200);
    ctx.fillText(rankText, tx + 62, y + 103);
    const rw = ctx.measureText(rankText).width;
    const chipX = tx + 62 + rw + 22;
    const chipLabel = `${hud.level}`;
    ctx.font = `800 26px ${FONT}`;
    const chipW = ctx.measureText(`LV ${chipLabel}`).width + 30;
    roundRect(ctx, chipX, y + 103 - 22, chipW, 44, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`LV ${chipLabel}`, chipX + chipW / 2, y + 104);

    // HP bar
    const barX = tx;
    const barY = y + 146;
    const barW = maxW;
    const pct = hud.maxHp > 0 ? Math.max(0, Math.min(1, hud.hp / hud.maxHp)) : 0;
    roundRect(ctx, barX, barY, barW, 18, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    if (pct > 0) {
      roundRect(ctx, barX, barY, Math.max(18, barW * pct), 18, 9);
      const hg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      hg.addColorStop(0, '#fb7185');
      hg.addColorStop(1, pct > 0.5 ? '#34d399' : '#f59e0b');
      ctx.fillStyle = hg;
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `700 22px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`HP ${Math.round(hud.hp)}/${Math.round(hud.maxHp)}`, barX + barW, barY - 10);
  },
});

interface Tile { label: string; value: string; sub?: string; accent: string; pct?: number }

const drawTile = (ctx: CanvasRenderingContext2D, t: Tile, x: number, y: number, w: number, h: number) => {
  panel(ctx, x, y, w, h, 28);
  ctx.fillStyle = t.accent;
  roundRect(ctx, x + 22, y + 26, 8, 28, 4);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `800 21px ${FONT}`;
  ctx.fillText(t.label.toUpperCase(), x + 44, y + 50);

  ctx.fillStyle = '#ffffff';
  let size = 60;
  ctx.font = `900 ${size}px ${FONT}`;
  while (ctx.measureText(t.value).width > w - 56 && size > 30) {
    size -= 2;
    ctx.font = `900 ${size}px ${FONT}`;
  }
  ctx.fillText(t.value, x + 28, y + 100);

  if (t.sub) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(fitText(ctx, t.sub, w - 56), x + 28, y + h - 14);
  }
};

const drawScoreRing = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, score: number, theme: ThemeConfig, label: string) => {
  const r = size / 2 - 18;
  const lw = 26;
  if (glass) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + lw / 2 + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,8,14,0.46)';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = lw;
  ctx.strokeStyle = glass ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)';
  ctx.stroke();

  const pct = Math.max(0, Math.min(1, score / 100));
  if (pct > 0) {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, rgb(theme.colors.primaryGlow, 1));
    g.addColorStop(1, rgb(theme.colors.secondaryGlow, 1));
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.strokeStyle = g;
    ctx.shadowColor = rgb(theme.colors.primaryGlow, 0.6);
    ctx.shadowBlur = 28;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${size * 0.34}px ${FONT}`;
  ctx.fillText(String(Math.round(score)), cx, cy + size * 0.07);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText(label.toUpperCase(), cx, cy + size * 0.07 + 40);
};

const sectionTitle = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, right?: string) => {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText(text.toUpperCase(), x, y);
  if (right) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText(right, x + (CW - 72), y);
  }
};

const accuracyOf = (data: ShareData) => (data.habitsTotal > 0 ? Math.round((data.habitsDone / data.habitsTotal) * 100) : 0);

const buildTiles = (data: ShareData, opts: ShareOptions, copy: ShareCopy): Tile[] => {
  const accuracy = accuracyOf(data);
  const tiles: Tile[] = [];
  if (opts.focus) tiles.push({ label: copy.focus, value: formatFocus(data.focusMinutes), sub: copy.focusSub, accent: '#818cf8' });
  if (opts.tasks) tiles.push({ label: copy.tasks, value: String(data.tasksDone), sub: copy.tasksSub, accent: '#fb923c' });
  if (opts.habits) tiles.push({ label: copy.habits, value: `${data.habitsDone}/${data.habitsTotal}`, accent: '#34d399', pct: data.habitsTotal > 0 ? data.habitsDone / data.habitsTotal : 0 });
  if (opts.accuracy) tiles.push({ label: copy.accuracy, value: `${accuracy}%`, sub: opts.habits ? undefined : `${data.habitsDone}/${data.habitsTotal} ${copy.habits.toLowerCase()}`, accent: '#22d3ee', pct: accuracy / 100 });
  return tiles;
};

/** Same figures as the tiles plus the score, in a stable priority order (focus first). */
const buildMetrics = (data: ShareData, opts: ShareOptions, copy: ShareCopy): Tile[] => {
  const byLabel = new Map(buildTiles(data, opts, copy).map(t => [t.label, t]));
  const out: Tile[] = [];
  const focus = byLabel.get(copy.focus);
  if (focus) out.push(focus);
  if (opts.score) out.push({ label: copy.score, value: String(Math.round(data.score)), accent: '#f472b6', pct: Math.max(0, Math.min(1, data.score / 100)) });
  [copy.tasks, copy.habits, copy.accuracy].forEach(l => {
    const t = byLabel.get(l);
    if (t) out.push(t);
  });
  return out;
};

/** Style "cards": score ring + a grid of tiles. */
const cardsStats = (data: ShareData, opts: ShareOptions, theme: ThemeConfig, copy: ShareCopy): Block | null => {
  const tiles = buildTiles(data, opts, copy);

  if (tiles.length === 0 && !opts.score) return null;

  const TILE_H = 134;
  const GAP = 18;

  if (opts.score) {
    const ring = 284;
    const cols = 2;
    const gridX = PAD + ring + 24;
    const gridW = CW - ring - 24;
    const tileW = (gridW - GAP) / cols;
    const rows = Math.max(1, Math.ceil(tiles.length / cols));
    const gridH = rows * TILE_H + (rows - 1) * GAP;
    const height = Math.max(ring, gridH);
    return {
      height,
      draw: (ctx, y) => {
        drawScoreRing(ctx, PAD + ring / 2, y + height / 2, ring, data.score, theme, copy.score);
        const startY = y + (height - gridH) / 2;
        // With a single tile it reads better full-width of the right column.
        tiles.forEach((t, i) => {
          const col = tiles.length === 1 ? 0 : i % cols;
          const row = tiles.length === 1 ? 0 : Math.floor(i / cols);
          const w = tiles.length === 1 ? gridW : tileW;
          drawTile(ctx, t, gridX + col * (tileW + GAP), startY + row * (TILE_H + GAP), w, TILE_H);
        });
      },
    };
  }

  const cols = tiles.length === 1 ? 1 : 2;
  const tileW = (CW - GAP * (cols - 1)) / cols;
  const rows = Math.ceil(tiles.length / cols);
  const height = rows * TILE_H + (rows - 1) * GAP;
  return {
    height,
    draw: (ctx, y) => {
      tiles.forEach((t, i) => {
        // An odd last tile spans the full row instead of leaving a hole.
        const lonely = cols === 2 && i === tiles.length - 1 && tiles.length % 2 === 1;
        drawTile(ctx, t, PAD + (lonely ? 0 : (i % cols) * (tileW + GAP)), y + Math.floor(i / cols) * (TILE_H + GAP), lonely ? CW : tileW, TILE_H);
      });
    },
  };
};

/** Style "list": every figure is a row of one single panel, with a mini bar where a percentage makes sense. */
const listStats = (data: ShareData, opts: ShareOptions, copy: ShareCopy): Block | null => {
  const rows = buildMetrics(data, opts, copy);
  if (rows.length === 0) return null;
  const ROW_H = 96;
  const PADV = 14;
  const height = PADV * 2 + rows.length * ROW_H;
  return {
    height,
    draw: (ctx, y) => {
      panel(ctx, PAD, y, CW, height, 36);
      const left = PAD + 40;
      const right = PAD + CW - 40;
      rows.forEach((r, i) => {
        const cy = y + PADV + i * ROW_H + ROW_H / 2;

        ctx.fillStyle = r.accent;
        roundRect(ctx, left, cy - 24, 8, 48, 4);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = `800 25px ${FONT}`;
        ctx.fillText(fitText(ctx, r.label.toUpperCase(), 300), left + 30, cy + 1);

        if (r.pct !== undefined) {
          const bw = 270;
          const bx = right - 200 - bw;
          roundRect(ctx, bx, cy - 8, bw, 16, 8);
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.fill();
          if (r.pct > 0) {
            roundRect(ctx, bx, cy - 8, Math.max(16, bw * r.pct), 16, 8);
            ctx.fillStyle = r.accent;
            ctx.fill();
          }
        }

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        let size = 46;
        ctx.font = `900 ${size}px ${FONT}`;
        while (ctx.measureText(r.value).width > 186 && size > 26) {
          size -= 2;
          ctx.font = `900 ${size}px ${FONT}`;
        }
        ctx.fillText(r.value, right, cy + 2);

        if (i < rows.length - 1) {
          const ly = y + PADV + (i + 1) * ROW_H;
          ctx.beginPath();
          ctx.moveTo(left, ly);
          ctx.lineTo(right, ly);
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.09)';
          ctx.stroke();
        }
      });
    },
  };
};

/** Style "spotlight": one huge hero figure, the rest in a compact strip underneath. */
const spotlightStats = (data: ShareData, opts: ShareOptions, copy: ShareCopy): Block | null => {
  const all = buildMetrics(data, opts, copy);
  if (all.length === 0) return null;
  const [main, ...rest] = all;
  const MAIN_H = main.sub ? 300 : 262;
  const STRIP_GAP = 22;
  const STRIP_H = 150;
  const height = MAIN_H + (rest.length > 0 ? STRIP_GAP + STRIP_H : 0);
  return {
    height,
    draw: (ctx, y) => {
      const cx = CARD_W / 2;
      const cy = y + 150;

      // Accent aura behind the hero figure.
      if (!glass) {
        const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, 380);
        aura.addColorStop(0, `${main.accent}33`);
        aura.addColorStop(1, `${main.accent}00`);
        ctx.fillStyle = aura;
        ctx.fillRect(PAD - 40, y - 40, CW + 80, MAIN_H + 80);
      }

      withShadow(ctx, () => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = main.accent;
        ctx.font = `800 28px ${FONT}`;
        ctx.fillText(main.label.toUpperCase(), cx, y + 38);

        ctx.fillStyle = '#ffffff';
        let size = 230;
        ctx.font = `900 ${size}px ${FONT}`;
        while (ctx.measureText(main.value).width > CW - 20 && size > 90) {
          size -= 6;
          ctx.font = `900 ${size}px ${FONT}`;
        }
        ctx.textBaseline = 'middle';
        ctx.fillText(main.value, cx, cy + 6);

        if (main.sub) {
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = 'rgba(255,255,255,0.62)';
          ctx.font = `700 30px ${FONT}`;
          ctx.fillText(main.sub, cx, y + MAIN_H - 16);
        }
      });

      if (rest.length === 0) return;
      const sy = y + MAIN_H + STRIP_GAP;
      panel(ctx, PAD, sy, CW, STRIP_H, 36);
      const colW = CW / rest.length;
      rest.forEach((r, i) => {
        const ccx = PAD + colW * (i + 0.5);

        ctx.fillStyle = r.accent;
        roundRect(ctx, ccx - 20, sy + 22, 40, 7, 3.5);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#ffffff';
        let size = 58;
        ctx.font = `900 ${size}px ${FONT}`;
        while (ctx.measureText(r.value).width > colW - 28 && size > 28) {
          size -= 2;
          ctx.font = `900 ${size}px ${FONT}`;
        }
        ctx.fillText(r.value, ccx, sy + 92);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `800 20px ${FONT}`;
        ctx.fillText(fitText(ctx, r.label.toUpperCase(), colW - 24), ccx, sy + 128);

        if (i > 0) {
          ctx.beginPath();
          ctx.moveTo(PAD + colW * i, sy + 30);
          ctx.lineTo(PAD + colW * i, sy + STRIP_H - 30);
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.stroke();
        }
      });
    },
  };
};

const statsBlock = (data: ShareData, opts: ShareOptions, theme: ThemeConfig, copy: ShareCopy): Block | null => {
  if (opts.style === 'list') return listStats(data, opts, copy);
  if (opts.style === 'spotlight') return spotlightStats(data, opts, copy);
  return cardsStats(data, opts, theme, copy);
};

const projectsBlock = (data: ShareData, opts: ShareOptions, copy: ShareCopy): Block | null => {
  if (!opts.projects || data.projects.length === 0) return null;
  const rows = data.projects.slice(0, MAX_PROJECT_ROWS);
  const total = data.projects.reduce((a, p) => a + p.minutes, 0) || 1;
  const ROW_H = 54;
  const height = 64 + rows.length * ROW_H + 46;
  return {
    height,
    draw: (ctx, y) => {
      panel(ctx, PAD, y, CW, height, 32);
      sectionTitle(ctx, copy.projects, PAD + 36, y + 52);

      rows.forEach((p, i) => {
        const ry = y + 64 + i * ROW_H;
        ctx.fillStyle = p.color || '#818cf8';
        ctx.beginPath();
        ctx.arc(PAD + 50, ry + 22, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 30px ${FONT}`;
        const label = opts.projectNames ? p.name : `${copy.project} ${i + 1}`;
        ctx.fillText(fitText(ctx, label, CW - 330), PAD + 80, ry + 32);

        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `800 30px ${FONT}`;
        ctx.fillText(formatFocus(p.minutes), PAD + CW - 36, ry + 32);
      });

      // Proportional stacked bar
      const bx = PAD + 36;
      const by = y + height - 34;
      const bw = CW - 72;
      ctx.save();
      roundRect(ctx, bx, by, bw, 14, 7);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(bx, by, bw, 14);
      let cx = bx;
      data.projects.forEach(p => {
        const w = (p.minutes / total) * bw;
        ctx.fillStyle = p.color || '#818cf8';
        ctx.fillRect(cx, by, w, 14);
        cx += w;
      });
      ctx.restore();
    },
  };
};

const habitsBlock = (data: ShareData, opts: ShareOptions, copy: ShareCopy): Block | null => {
  if (!opts.habits || data.habits.length === 0) return null;
  const accuracy = data.habitsTotal > 0 ? Math.round((data.habitsDone / data.habitsTotal) * 100) : 0;
  const right = `${data.habitsDone}/${data.habitsTotal}${opts.accuracy ? ` · ${accuracy}%` : ''}`;

  if (!opts.habitNames) {
    // Names hidden: one dot per habit (filled = done) — keeps the count without exposing anything.
    const dots = data.habits.slice(0, 24);
    const perRow = 12;
    const rows = Math.ceil(dots.length / perRow);
    const height = 70 + rows * 56 + 22;
    return {
      height,
      draw: (ctx, y) => {
        panel(ctx, PAD, y, CW, height, 32);
        sectionTitle(ctx, copy.habits, PAD + 36, y + 52, right);
        const step = (CW - 72) / perRow;
        dots.forEach((h, i) => {
          const cx = PAD + 36 + step * (i % perRow) + step / 2;
          const cy = y + 92 + Math.floor(i / perRow) * 56;
          ctx.beginPath();
          ctx.arc(cx, cy, 17, 0, Math.PI * 2);
          if (h.done) {
            ctx.fillStyle = '#34d399';
            ctx.fill();
          } else {
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.stroke();
          }
        });
      },
    };
  }

  // Names shown: completed first, capped, with a "+N" remainder.
  const sorted = [...data.habits].sort((a, b) => Number(b.done) - Number(a.done));
  const shown = sorted.slice(0, MAX_HABIT_ROWS);
  const rest = sorted.length - shown.length;
  const ROW_H = 46;
  const height = 66 + shown.length * ROW_H + (rest > 0 ? 44 : 14);
  return {
    height,
    draw: (ctx, y) => {
      panel(ctx, PAD, y, CW, height, 32);
      sectionTitle(ctx, copy.habits, PAD + 36, y + 52, right);
      shown.forEach((h, i) => {
        const ry = y + 68 + i * ROW_H;
        ctx.beginPath();
        ctx.arc(PAD + 52, ry + 20, 13, 0, Math.PI * 2);
        if (h.done) {
          ctx.fillStyle = '#34d399';
          ctx.fill();
          ctx.strokeStyle = '#06281c';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(PAD + 46, ry + 20);
          ctx.lineTo(PAD + 50, ry + 25);
          ctx.lineTo(PAD + 59, ry + 14);
          ctx.stroke();
          ctx.lineCap = 'butt';
        } else {
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(255,255,255,0.28)';
          ctx.stroke();
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = h.done ? '#ffffff' : 'rgba(255,255,255,0.55)';
        ctx.font = `700 28px ${FONT}`;
        ctx.fillText(fitText(ctx, h.name, CW - 150), PAD + 84, ry + 30);
      });
      if (rest > 0) {
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `700 24px ${FONT}`;
        ctx.fillText(copy.more(rest), PAD + 84, y + height - 18);
      }
    },
  };
};

const quoteBlock = (quote: string): Block | null => {
  const text = quote.trim().slice(0, QUOTE_MAX);
  if (!text) return null;
  return {
    height: 76,
    draw: (ctx, y) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      let size = 50;
      ctx.font = `italic 800 ${size}px ${FONT}`;
      const shown = `“${text}”`;
      while (ctx.measureText(shown).width > CW && size > 26) {
        size -= 2;
        ctx.font = `italic 800 ${size}px ${FONT}`;
      }
      withShadow(ctx, () => ctx.fillText(shown, CARD_W / 2, y + 38));
    },
  };
};

// ── public API ─────────────────────────────────────────────────────────────

export const renderShareCard = (
  canvas: HTMLCanvasElement,
  data: ShareData,
  opts: ShareOptions,
  theme: ThemeConfig,
  copy: ShareCopy,
) => {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  glass = !!opts.transparent;
  drawBackground(ctx, theme);

  // Header
  withShadow(ctx, () => {
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = glass ? '#ffffff' : rgb(theme.colors.textPrimary, 0.95);
    ctx.font = `900 40px ${FONT}`;
    ctx.fillText(copy.brand.toUpperCase(), PAD, 118);
    ctx.textAlign = 'right';
    ctx.fillStyle = glass ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)';
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(data.dateLabel, CARD_W - PAD, 116);
    ctx.fillStyle = rgb(theme.colors.primaryGlow, 0.9);
    roundRect(ctx, PAD, 136, 88, 6, 3);
    ctx.fill();
  });

  const blocks: Block[] = [];
  if (opts.hud && data.hud) blocks.push(hudBlock(data.hud));
  const stats = statsBlock(data, opts, theme, copy);
  if (stats) blocks.push(stats);
  const projects = projectsBlock(data, opts, copy);
  if (projects) blocks.push(projects);
  const habits = habitsBlock(data, opts, copy);
  if (habits) blocks.push(habits);
  const quote = quoteBlock(opts.quote);
  if (quote) blocks.push(quote);

  if (blocks.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText('—', CARD_W / 2, CARD_H / 2);
    return;
  }

  const GAP = 26;
  const TOP = 172;
  const BOTTOM = CARD_H - 104;
  const avail = BOTTOM - TOP;
  const total = blocks.reduce((a, b) => a + b.height, 0) + GAP * (blocks.length - 1);
  const scale = Math.min(1, avail / total);
  const stackH = total * scale;
  const startY = TOP + (avail - stackH) / 2;

  ctx.save();
  // Scale about the card's horizontal centre so side padding stays symmetric.
  ctx.translate(CARD_W / 2, startY);
  ctx.scale(scale, scale);
  ctx.translate(-CARD_W / 2, 0);
  let y = 0;
  blocks.forEach(b => {
    b.draw(ctx, y);
    y += b.height + GAP;
  });
  ctx.restore();

  // Footer
  withShadow(ctx, () => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = glass ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.38)';
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(copy.title.toUpperCase(), CARD_W / 2, CARD_H - 56);
  });
};
