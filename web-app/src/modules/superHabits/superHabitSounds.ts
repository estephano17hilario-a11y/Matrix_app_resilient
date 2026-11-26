// Synthesised sound signature for each super habit (Web Audio, no asset files).
// Each habit has its own little scene — a rocket launch, a gym plate, a bell,
// water drops — plus a bigger fanfare when a roadmap badge is unlocked.

import { getAudioContext } from '../../utils/soundEffects';
import type { SuperHabitId } from './catalog';

type Ctx = AudioContext;
interface Bus { out: GainNode; send: GainNode }

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let noiseBuf: AudioBuffer | null = null;
let reverbBuf: AudioBuffer | null = null;
let master: { ctx: Ctx; bus: Bus } | null = null;

const getNoise = (ctx: Ctx) => {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
};

const getReverb = (ctx: Ctx) => {
  if (reverbBuf && reverbBuf.sampleRate === ctx.sampleRate) return reverbBuf;
  const secs = 2.2;
  const len = Math.floor(ctx.sampleRate * secs);
  reverbBuf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = reverbBuf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return reverbBuf;
};

/** Shared output chain: dry + reverb send -> compressor -> speakers. */
const getBus = (ctx: Ctx): Bus => {
  if (master && master.ctx === ctx) return master.bus;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
  const out = ctx.createGain(); out.gain.value = 0.9;
  out.connect(comp); comp.connect(ctx.destination);
  const conv = ctx.createConvolver(); conv.buffer = getReverb(ctx);
  const send = ctx.createGain(); send.gain.value = 1;
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  send.connect(conv); conv.connect(wet); wet.connect(comp);
  master = { ctx, bus: { out, send } };
  return master.bus;
};

interface ToneOpts {
  f: number; t?: number; d?: number; v?: number; type?: OscillatorType; bendTo?: number;
  attack?: number; pan?: number; rev?: number; detune?: number; lp?: number;
}

/** One oscillator note with a click-free envelope. `rev` sends part of it to the reverb. */
const tone = (ctx: Ctx, bus: Bus, o: ToneOpts) => {
  const t0 = ctx.currentTime + (o.t ?? 0);
  const d = o.d ?? 0.4;
  const v = o.v ?? 0.1;
  const atk = o.attack ?? 0.006;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.bendTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.bendTo), t0 + d);
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(v, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  let node: AudioNode = osc;
  if (o.lp) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp;
    node.connect(f); node = f;
  }
  node.connect(g);
  let tail: AudioNode = g;
  if (o.pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); tail = p;
  }
  tail.connect(bus.out);
  if (o.rev) {
    const s = ctx.createGain(); s.gain.value = o.rev; tail.connect(s); s.connect(bus.send);
  }
  osc.start(t0);
  osc.stop(t0 + d + 0.05);
};

interface NoiseOpts {
  t?: number; d?: number; v?: number; type?: BiquadFilterType; f?: number; fTo?: number;
  q?: number; pan?: number; rev?: number; attack?: number;
}

/** Filtered noise burst / sweep: whooshes, page turns, crunches, breath. */
const noise = (ctx: Ctx, bus: Bus, o: NoiseOpts) => {
  const t0 = ctx.currentTime + (o.t ?? 0);
  const d = o.d ?? 0.2;
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx); src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = o.type ?? 'bandpass';
  filt.frequency.setValueAtTime(o.f ?? 1500, t0);
  if (o.fTo) filt.frequency.exponentialRampToValueAtTime(o.fTo, t0 + d);
  filt.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(o.v ?? 0.1, t0 + (o.attack ?? Math.min(0.02, d / 3)));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(filt); filt.connect(g);
  let tail: AudioNode = g;
  if (o.pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); tail = p;
  }
  tail.connect(bus.out);
  if (o.rev) {
    const s = ctx.createGain(); s.gain.value = o.rev; tail.connect(s); s.connect(bus.send);
  }
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + d + 0.05);
};

/** A sequence of notes (midi) spaced `step` seconds apart. */
const run = (ctx: Ctx, bus: Bus, notes: number[], step: number, o: Omit<ToneOpts, 'f'>) =>
  notes.forEach((m, i) => tone(ctx, bus, { ...o, f: hz(m), t: (o.t ?? 0) + i * step, pan: o.pan ?? (i % 2 ? 0.35 : -0.35) }));

const chord = (ctx: Ctx, bus: Bus, notes: number[], o: Omit<ToneOpts, 'f'>) =>
  notes.forEach((m, i) => tone(ctx, bus, { ...o, f: hz(m), detune: (i % 2 ? 4 : -4) }));

/** Bell with inharmonic partials; the heart of the church and singing-bowl sounds. */
const bell = (ctx: Ctx, bus: Bus, base: number, t: number, v: number, d: number, partials = [1, 2.0, 2.4, 3.0, 4.2, 5.4]) =>
  partials.forEach((p, i) =>
    tone(ctx, bus, { f: base * p, t, d: d / (1 + i * 0.55), v: v / (1 + i * 0.7), rev: 0.9, attack: 0.002 }));

// ── The 15 signatures ───────────────────────────────────────────────────────

const SIGNATURES: Record<SuperHabitId, (ctx: Ctx, b: Bus) => number> = {
  // Ignition, launch, then coins.
  emprendimiento: (c, b) => {
    noise(c, b, { d: 0.8, v: 0.12, type: 'bandpass', f: 300, fTo: 3600, q: 0.8, attack: 0.5 });
    tone(c, b, { f: 90, bendTo: 900, d: 0.8, v: 0.07, type: 'sawtooth', lp: 1800, attack: 0.3 });
    run(c, b, [88, 92, 95, 100], 0.07, { t: 0.78, d: 0.35, v: 0.09, type: 'triangle', rev: 0.5 });
    tone(c, b, { f: hz(95), t: 1.1, d: 1.1, v: 0.09, rev: 0.8 });
    return 2.1;
  },
  // Page flip and marimba "aha".
  estudiar: (c, b) => {
    noise(c, b, { d: 0.16, v: 0.1, type: 'highpass', f: 2500, fTo: 6000, q: 0.5 });
    run(c, b, [74, 78, 81, 83, 86], 0.08, { t: 0.18, d: 0.42, v: 0.12, type: 'triangle', rev: 0.4 });
    tone(c, b, { f: hz(98), t: 0.62, d: 1.1, v: 0.07, rev: 0.9 });
    return 1.8;
  },
  // Weight hits the floor, plates clank, brass stab.
  gym: (c, b) => {
    tone(c, b, { f: 130, bendTo: 40, d: 0.32, v: 0.4, attack: 0.002 });
    noise(c, b, { t: 0.02, d: 0.09, v: 0.16, type: 'bandpass', f: 4200, q: 4 });
    noise(c, b, { t: 0.2, d: 0.08, v: 0.12, type: 'bandpass', f: 3300, q: 5 });
    tone(c, b, { f: 880, t: 0.2, d: 0.12, v: 0.05, type: 'square', lp: 2400 });
    chord(c, b, [40, 47, 52, 59], { t: 0.34, d: 0.75, v: 0.075, type: 'sawtooth', lp: 1300, attack: 0.03 });
    return 1.2;
  },
  // Friendly greeting in two voices.
  idiomas: (c, b) => {
    run(c, b, [72, 79], 0.16, { d: 0.4, v: 0.1, type: 'triangle', rev: 0.4 });
    run(c, b, [76, 81, 84], 0.12, { t: 0.4, d: 0.4, v: 0.09, type: 'sine', rev: 0.4 });
    tone(c, b, { f: hz(91), t: 0.85, d: 1.2, v: 0.07, rev: 0.9 });
    return 2.0;
  },
  // Water drops and a soft splash.
  agua: (c, b) => {
    [0, 0.13, 0.29, 0.47].forEach((t, i) =>
      tone(c, b, { f: 420 + i * 70, bendTo: 1500 + i * 150, t, d: 0.09, v: 0.16, rev: 0.7, pan: i % 2 ? 0.4 : -0.4 }));
    noise(c, b, { t: 0.55, d: 0.7, v: 0.07, type: 'lowpass', f: 2600, fTo: 500, q: 0.7, attack: 0.15, rev: 0.6 });
    tone(c, b, { f: hz(88), t: 0.62, d: 1.0, v: 0.06, rev: 0.9 });
    return 1.5;
  },
  // Two pops and a message ding.
  comunicacion: (c, b) => {
    tone(c, b, { f: 760, bendTo: 280, d: 0.09, v: 0.18, pan: -0.35 });
    tone(c, b, { f: 900, bendTo: 320, t: 0.11, d: 0.09, v: 0.18, pan: 0.35 });
    run(c, b, [79, 86], 0.14, { t: 0.3, d: 0.5, v: 0.1, type: 'triangle', rev: 0.5 });
    return 1.0;
  },
  // Crunch, crunch, happy ding.
  alimentacion: (c, b) => {
    [0, 0.07, 0.16].forEach(t => noise(c, b, { t, d: 0.05, v: 0.2, type: 'bandpass', f: 3200 + t * 3000, q: 1.5 }));
    tone(c, b, { f: 300, bendTo: 620, t: 0.28, d: 0.18, v: 0.08, type: 'triangle' });
    chord(c, b, [84, 88, 91], { t: 0.45, d: 0.9, v: 0.07, rev: 0.6 });
    return 1.4;
  },
  // Page turn and a music box.
  lectura: (c, b) => {
    noise(c, b, { d: 0.28, v: 0.1, type: 'highpass', f: 1800, fTo: 5200, q: 0.6, attack: 0.12 });
    run(c, b, [88, 91, 95, 100, 95, 91, 88], 0.11, { t: 0.3, d: 0.9, v: 0.09, type: 'sine', rev: 0.8 });
    return 2.0;
  },
  // Approval stamp, keys, success chord.
  trabajo: (c, b) => {
    tone(c, b, { f: 100, bendTo: 48, d: 0.2, v: 0.38, attack: 0.002 });
    noise(c, b, { d: 0.05, v: 0.18, type: 'bandpass', f: 1500, q: 2 });
    [0.22, 0.28, 0.33].forEach(t => noise(c, b, { t, d: 0.02, v: 0.12, type: 'highpass', f: 3500 }));
    chord(c, b, [60, 64, 67, 72], { t: 0.45, d: 0.9, v: 0.07, type: 'triangle', rev: 0.4 });
    return 1.5;
  },
  // Synapses firing, then lock-in.
  iq: (c, b) => {
    run(c, b, [72, 74, 79, 76, 81, 84, 88, 91], 0.055, { d: 0.14, v: 0.07, type: 'square', lp: 3000 });
    chord(c, b, [78, 82, 85, 90], { t: 0.5, d: 1.3, v: 0.06, rev: 0.8 });
    run(c, b, [102, 106, 109], 0.07, { t: 0.55, d: 0.5, v: 0.04, rev: 0.9 });
    return 2.0;
  },
  // Typing and an 8-bit "build passed".
  programacion: (c, b) => {
    [0, 0.06, 0.11, 0.19, 0.24, 0.31].forEach(t => noise(c, b, { t, d: 0.018, v: 0.13, type: 'bandpass', f: 2600, q: 3 }));
    run(c, b, [72, 76, 79, 84], 0.075, { t: 0.45, d: 0.12, v: 0.07, type: 'square', lp: 3800, pan: 0 });
    chord(c, b, [72, 79, 84], { t: 0.78, d: 0.5, v: 0.05, type: 'square', lp: 2600 });
    return 1.4;
  },
  // Singing bowl, struck twice.
  meditacion: (c, b) => {
    bell(c, b, 196, 0, 0.12, 4.2, [1, 2.71, 5.4]);
    tone(c, b, { f: 196, t: 0, d: 4, v: 0.05, detune: 6, rev: 0.7, attack: 0.05 });
    bell(c, b, 262, 1.1, 0.07, 3.2, [1, 2.71, 5.4]);
    return 4.2;
  },
  // Breath in, breath out, soft chime.
  yoga: (c, b) => {
    noise(c, b, { d: 0.7, v: 0.07, type: 'bandpass', f: 500, fTo: 1800, q: 0.8, attack: 0.5, rev: 0.4 });
    noise(c, b, { t: 0.72, d: 0.9, v: 0.07, type: 'bandpass', f: 1800, fTo: 450, q: 0.8, attack: 0.2, rev: 0.4 });
    tone(c, b, { f: 136, t: 0.6, d: 1.8, v: 0.06, attack: 0.5, rev: 0.6 });
    run(c, b, [69, 72, 76], 0.22, { t: 1.55, d: 1.4, v: 0.08, type: 'triangle', rev: 0.9 });
    return 3.0;
  },
  // Pump click and a glass sparkle.
  skincare: (c, b) => {
    noise(c, b, { d: 0.04, v: 0.14, type: 'bandpass', f: 2200, q: 3 });
    run(c, b, [88, 91, 95, 98, 100, 103, 107, 110], 0.065, { t: 0.12, d: 0.7, v: 0.07, type: 'sine', rev: 0.9 });
    chord(c, b, [96, 100, 103], { t: 0.55, d: 1.6, v: 0.04, rev: 1, attack: 0.15 });
    return 2.1;
  },
  // Church bell and a soft organ chord.
  catolica: (c, b) => {
    bell(c, b, 233, 0, 0.12, 3.6);
    bell(c, b, 233, 1.0, 0.08, 3.2);
    [36, 43, 48, 52, 55].forEach((m, i) =>
      tone(c, b, { f: hz(m), t: 1.5 + i * 0.04, d: 2.2, v: 0.05, type: 'sine', attack: 0.25, rev: 1 }));
    return 4.0;
  },
};

// Per-habit voice used by the badge fanfare (root note + waveform).
const FANFARE_VOICE: Record<SuperHabitId, { root: number; type: OscillatorType }> = {
  emprendimiento: { root: 62, type: 'sawtooth' }, estudiar: { root: 62, type: 'triangle' },
  gym: { root: 52, type: 'sawtooth' }, idiomas: { root: 64, type: 'triangle' },
  agua: { root: 65, type: 'sine' }, comunicacion: { root: 67, type: 'triangle' },
  alimentacion: { root: 67, type: 'triangle' }, lectura: { root: 69, type: 'sine' },
  trabajo: { root: 60, type: 'triangle' }, iq: { root: 66, type: 'square' },
  programacion: { root: 64, type: 'square' }, meditacion: { root: 57, type: 'sine' },
  yoga: { root: 57, type: 'sine' }, skincare: { root: 72, type: 'sine' }, catolica: { root: 55, type: 'sine' },
};

const PENTA = [0, 2, 4, 7, 9];

/**
 * Habit completed on an ordinary day: the habit's own signature.
 * Returns its approximate length in seconds (0 if audio is unavailable).
 */
export function playSuperHabitSound(id: SuperHabitId): number {
  try {
    const ctx = getAudioContext();
    return SIGNATURES[id](ctx, getBus(ctx));
  } catch (e) {
    console.warn('Super habit sound failed', e);
    return 0;
  }
}

/**
 * A roadmap badge was just unlocked. `level` is the milestone index (0..7):
 * the later the milestone, the longer and bigger the fanfare.
 */
export function playSuperBadgeSound(id: SuperHabitId, level: number): number {
  try {
    const ctx = getAudioContext();
    const bus = getBus(ctx);
    const base = SIGNATURES[id](ctx, bus);
    const lvl = Math.max(0, Math.min(7, Math.floor(level)));
    const { root, type } = FANFARE_VOICE[id];
    const start = Math.min(base, 1.4) * 0.55;
    const count = 4 + lvl;
    const notes = Array.from({ length: count }, (_, i) => root + 12 + PENTA[i % 5] + 12 * Math.floor(i / 5));
    run(ctx, bus, notes, 0.075, { t: start, d: 0.7, v: 0.075, type, rev: 0.6 });
    const end = start + count * 0.075;
    chord(ctx, bus, [root, root + 7, root + 12, root + 16, root + 19].slice(0, 3 + Math.min(2, Math.floor(lvl / 3))), {
      t: end, d: 1.8 + lvl * 0.15, v: 0.06 + lvl * 0.004, type, rev: 0.9, attack: 0.03, lp: 3600,
    });
    tone(ctx, bus, { f: hz(root + 36), t: end, d: 2.6, v: 0.06, rev: 1, attack: 0.002 });
    if (lvl >= 3) tone(ctx, bus, { f: hz(root - 24), t: end, d: 1.2, v: 0.18, bendTo: hz(root - 36), attack: 0.004 });
    if (lvl >= 7) {
      noise(ctx, bus, { t: end, d: 1.6, v: 0.06, type: 'highpass', f: 4000, fTo: 9000, attack: 0.5, rev: 0.8 });
      run(ctx, bus, [root + 24, root + 28, root + 31, root + 36, root + 40], 0.09, { t: end + 0.2, d: 1.2, v: 0.05, rev: 1 });
    }
    return end + 2.6;
  } catch (e) {
    console.warn('Super badge sound failed', e);
    return 0;
  }
}
