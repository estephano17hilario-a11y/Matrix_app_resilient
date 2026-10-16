// ─────────────────────────────────────────────────────────────────────────────
// LIFE READING — what kind of day you are having, in one word.
//
// Pure function: today's numbers + the clock (+ battery) in, a "mood" out.
// The world uses the mood to colour its light, brighten or dim the stars,
// speed or slow the drift, and to whisper one sentence about your day.
// ─────────────────────────────────────────────────────────────────────────────

export type DayPhase = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

export type LifeMood =
  | 'victory'   // everything for today is done
  | 'recovery'  // a hard day: relapse or low health
  | 'urgency'   // evening, streak not secured, things pending
  | 'drift'     // the day is passing with nothing started
  | 'flow'      // good momentum
  | 'fresh'     // morning, no streak yet: a new one can start today
  | DayPhase;   // a regular day: the light follows the hour

export interface LifeInput {
  now: Date;
  tasksTotal: number;     // due today (done + pending)
  tasksDone: number;      // completed today
  habitsTotal: number;    // scheduled today
  habitsDone: number;
  relapses: number;       // bad-habit relapses today
  health: number;         // 0..1
  streak: number;         // current streak in days
  streakSecured: boolean; // today's streak requirements already met
  focusMinutes: number;
  battery?: { level: number; charging: boolean } | null;
}

export interface LifeReading {
  mood: LifeMood;
  phase: DayPhase;
  progress: number;       // 0..1 of today's tasks + habits
  pending: number;
  streak: number;
  eco: boolean;           // low battery: the world saves energy
  // Light of the world
  sky: string;            // "r g b" glow from above
  ground: string;         // "r g b" glow from below
  skyAlpha: number;
  groundAlpha: number;
  stars: number;          // 0..1 star brightness
  energy: number;         // sky drift speed multiplier
  vignette: number;       // 0..1 edge darkness
  breathe: boolean;       // the ground glow pulses slowly (urgency)
}

export const dayPhase = (hour: number): DayPhase => {
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 13) return 'morning';
  if (hour >= 13 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
};

type Look = Pick<LifeReading, 'sky' | 'ground' | 'skyAlpha' | 'groundAlpha' | 'stars' | 'energy' | 'vignette' | 'breathe'>;

const LOOKS: Record<LifeMood, Look> = {
  dawn:      { sky: '255 183 120', ground: '255 120 90',  skyAlpha: 0.14, groundAlpha: 0.09, stars: 0.7,  energy: 1,    vignette: 0.5,  breathe: false },
  morning:   { sky: '160 210 255', ground: '99 102 241',  skyAlpha: 0.12, groundAlpha: 0.06, stars: 0.55, energy: 1.1,  vignette: 0.45, breathe: false },
  afternoon: { sky: '255 214 160', ground: '236 72 153',  skyAlpha: 0.1,  groundAlpha: 0.06, stars: 0.6,  energy: 1,    vignette: 0.5,  breathe: false },
  evening:   { sky: '255 110 160', ground: '255 140 60',  skyAlpha: 0.12, groundAlpha: 0.11, stars: 0.85, energy: 0.9,  vignette: 0.55, breathe: false },
  night:     { sky: '80 100 230',  ground: '30 40 110',   skyAlpha: 0.13, groundAlpha: 0.1,  stars: 1,    energy: 0.75, vignette: 0.62, breathe: false },
  fresh:     { sky: '125 211 252', ground: '52 211 153',  skyAlpha: 0.14, groundAlpha: 0.08, stars: 0.65, energy: 1.2,  vignette: 0.45, breathe: false },
  flow:      { sky: '34 211 238',  ground: '99 102 241',  skyAlpha: 0.16, groundAlpha: 0.1,  stars: 0.95, energy: 1.6,  vignette: 0.45, breathe: false },
  victory:   { sky: '250 204 21',  ground: '52 211 153',  skyAlpha: 0.16, groundAlpha: 0.12, stars: 1,    energy: 1.3,  vignette: 0.4,  breathe: false },
  urgency:   { sky: '255 130 70',  ground: '239 68 68',   skyAlpha: 0.1,  groundAlpha: 0.17, stars: 0.8,  energy: 1.1,  vignette: 0.72, breathe: true },
  drift:     { sky: '148 163 184', ground: '71 85 105',   skyAlpha: 0.07, groundAlpha: 0.07, stars: 0.45, energy: 0.35, vignette: 0.72, breathe: false },
  recovery:  { sky: '99 102 241',  ground: '56 189 248',  skyAlpha: 0.1,  groundAlpha: 0.08, stars: 0.8,  energy: 0.55, vignette: 0.55, breathe: false },
};

export const readLife = (input: LifeInput): LifeReading => {
  const hour = input.now.getHours();
  const phase = dayPhase(hour);
  const total = input.tasksTotal + input.habitsTotal;
  const done = Math.min(total, input.tasksDone + input.habitsDone);
  const pending = Math.max(0, total - done);
  const progress = total > 0 ? done / total : 0;
  const late = phase === 'evening' || phase === 'night';
  const eco = !!input.battery && !input.battery.charging && input.battery.level <= 0.2;

  let mood: LifeMood;
  if (total > 0 && pending === 0) mood = 'victory';
  else if (input.relapses > 0 || input.health < 0.35) mood = 'recovery';
  else if (late && hour >= 19 && !input.streakSecured && pending > 0 && (input.streak > 0 || progress < 0.5)) mood = 'urgency';
  else if (hour >= 13 && done === 0 && pending > 0 && input.focusMinutes < 5) mood = 'drift';
  else if (progress >= 0.5 || input.focusMinutes >= 45) mood = 'flow';
  else if ((phase === 'dawn' || phase === 'morning') && input.streak === 0 && done === 0) mood = 'fresh';
  else mood = phase;

  const look = { ...LOOKS[mood] };
  if (eco) look.energy *= 0.5;

  return { mood, phase, progress, pending, streak: input.streak, eco, ...look };
};

/** i18n params for the whisper text of a reading. */
export const lifeParams = (r: LifeReading) => ({
  pending: r.pending,
  streak: r.streak,
  pct: Math.round(r.progress * 100),
});
