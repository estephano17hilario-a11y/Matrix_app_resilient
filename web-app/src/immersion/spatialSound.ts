// Tiny synthesized UI sounds for the immersive layer. Everything is generated
// with WebAudio, so there are no assets to load. Volumes are deliberately low:
// these should be felt more than heard.

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

const audio = () => {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

const noiseBuffer = (c: AudioContext) => {
  if (noise) return noise;
  noise = c.createBuffer(1, c.sampleRate * 0.8, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
};

// Airy band-passed sweep. `direction` pans it across the stereo field so the
// sound travels the same way the camera does.
export const playTravel = (direction: number) => {
  const c = audio();
  if (!c) return;
  try {
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);

    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(direction === 0 ? 900 : 380, t);
    band.frequency.exponentialRampToValueAtTime(direction === 0 ? 260 : 1900, t + 0.42);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    let out: AudioNode = gain;
    if (c.createStereoPanner) {
      const pan = c.createStereoPanner();
      pan.pan.setValueAtTime(-0.6 * direction, t);
      pan.pan.linearRampToValueAtTime(0.6 * direction, t + 0.5);
      gain.connect(pan);
      out = pan;
    }

    src.connect(band);
    band.connect(gain);
    out.connect(c.destination);
    src.start(t);
    src.stop(t + 0.6);
  } catch { /* audio is best-effort */ }
};

// Soft glassy tick for presses. `pitch` lets each kind of control sound a
// little different (icons higher, cards lower).
export const playTouch = (pitch = 1) => {
  const c = audio();
  if (!c) return;
  try {
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(1250 * pitch, t + 0.05);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.022, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch { /* audio is best-effort */ }
};

// Coins changing hands: a quick cascade of small metallic chimes.
export const playCoins = (count = 4) => {
  const c = audio();
  if (!c) return;
  try {
    const t0 = c.currentTime;
    for (let i = 0; i < count; i++) {
      const t = t0 + i * 0.055 + Math.random() * 0.015;
      const f = 2200 + Math.random() * 900 - i * 120;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.82, t + 0.09);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.03, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    }
  } catch { /* audio is best-effort */ }
};

// A seal pressed onto paper: a soft low thump.
export const playSeal = () => {
  const c = audio();
  if (!c) return;
  try {
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.27);
  } catch { /* audio is best-effort */ }
};
