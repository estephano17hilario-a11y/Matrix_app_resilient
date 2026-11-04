// Spanish natural-language helpers for the deterministic report writer.
// Every helper returns a complete, grammatical fragment; templates never
// concatenate raw numbers with units themselves.

import { daysBetween, type DayKey } from '../engine/dayKey';

export type Forms = readonly [singular: string, plural: string];

export const WORDS = {
  minute: ['minuto', 'minutos'],
  hour: ['hora', 'horas'],
  day: ['día', 'días'],
  week: ['semana', 'semanas'],
  session: ['sesión', 'sesiones'],
  pause: ['pausa', 'pausas'],
  habit: ['hábito', 'hábitos'],
  task: ['tarea', 'tareas'],
  time: ['vez', 'veces'],
  point: ['punto', 'puntos'],
} as const satisfies Record<string, Forms>;

/** Grammatical gender of each lexicon word (for "un"/"una"). */
const FEMININE = new Set(['hora', 'semana', 'sesión', 'pausa', 'tarea', 'vez']);

const UNITS_M = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

/** Number in words up to ten (agreeing in gender), digits beyond. */
export const numberWord = (n: number, feminine = false): string => {
  if (!Number.isInteger(n) || n < 0 || n > 10) return String(n);
  if (n === 1) return feminine ? 'una' : 'un';
  return UNITS_M[n];
};

/** "1 día", "3 días" — digits, correct plural. */
export const count = (n: number, forms: Forms): string =>
  `${formatInt(n)} ${Math.abs(n) === 1 ? forms[0] : forms[1]}`;

/** "un día", "tres días", "12 días" — words up to ten. */
export const countWords = (n: number, forms: Forms): string =>
  `${numberWord(n, FEMININE.has(forms[0]))} ${Math.abs(n) === 1 ? forms[0] : forms[1]}`;

export const formatInt = (n: number): string => {
  const r = Math.round(n);
  return Math.abs(r) >= 10_000 ? r.toLocaleString('es-ES') : String(r);
};

/** 55 → "casi una hora", 90 → "una hora y media", 7 → "siete minutos". */
export const humanMinutes = (minutes: number): string => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 1) return 'menos de un minuto';
  if (m < 50) return countWords(m, WORDS.minute);
  if (m < 60) return 'casi una hora';
  const h = Math.floor(m / 60);
  const r = m % 60;
  const hours = countWords(h, WORDS.hour);
  if (r < 5) return hours;
  if (r <= 20) return `poco más de ${hours}`;
  if (r >= 25 && r <= 35) return `${hours} y media`;
  if (r >= 50) return `casi ${countWords(h + 1, WORDS.hour)}`;
  return `${hours} y ${countWords(r, WORDS.minute)}`;
};

/**
 * How much more/less than a reference, phrased for "… que tu promedio".
 * Returns e.g. "el doble de", "un tercio más que", "un 18 % menos que".
 */
export const comparedTo = (pctDiff: number): string => {
  const p = Math.round(pctDiff);
  const near = (target: number, tol = 3) => Math.abs(p - target) <= tol;
  if (near(200, 8)) return 'el triple de';
  if (near(100, 6)) return 'el doble de';
  if (near(50)) return 'la mitad más que';
  if (near(33)) return 'un tercio más que';
  if (near(25)) return 'un cuarto más que';
  if (near(-50)) return 'la mitad de';
  if (p > 0) return `un ${p} % más que`;
  if (p < 0) return `un ${-p} % menos que`;
  return 'lo mismo que';
};

/** Ratio as a phrase: 2 → "el doble", 1.33 → "un tercio más". */
export const ratioPhrase = (ratio: number): string => {
  const pct = (ratio - 1) * 100;
  return comparedTo(pct).replace(/ (de|que)$/, '');
};

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const parseKey = (key: DayKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};

export const weekdayName = (weekday: number): string => WEEKDAYS[((weekday % 7) + 7) % 7];

/** Plural weekday for habits ("los martes"). */
export const weekdayPlural = (weekday: number): string => {
  const name = weekdayName(weekday);
  return name === 'sábado' || name === 'domingo' ? `los ${name}s` : `los ${name}`;
};

/** "el 12 de octubre" (+ year when different). */
export const calendarDate = (key: DayKey, todayKey: DayKey): string => {
  const a = parseKey(key);
  const t = parseKey(todayKey);
  return `el ${a.d} de ${MONTHS[a.m - 1]}${a.y !== t.y ? ` de ${a.y}` : ''}`;
};

/** "hoy", "ayer", "anteayer", "el martes", "hace dos semanas", "el 12 de octubre". */
export const relativeDay = (key: DayKey, todayKey: DayKey): string => {
  const diff = daysBetween(key, todayKey);
  if (diff <= 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff === 2) return 'anteayer';
  if (diff < 7) return `el ${weekdayName(parseKey(key).weekday)}`;
  if (diff < 28) {
    const weeks = Math.floor(diff / 7);
    return weeks === 1 ? 'hace una semana' : `hace ${countWords(weeks, WORDS.week)}`;
  }
  return calendarDate(key, todayKey);
};

/** "desde ayer", "desde el martes", "desde el 12 de octubre". */
export const sinceDay = (key: DayKey, todayKey: DayKey): string => {
  const rel = relativeDay(key, todayKey);
  return rel.startsWith('hace') ? `desde ${calendarDate(key, todayKey)}` : `desde ${rel}`;
};

export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'NIGHT';

/** Mañana 05–12, tarde 12–19, noche 19–05. */
export const slotOf = (hour: number): TimeSlot => (hour >= 5 && hour < 12 ? 'MORNING' : hour >= 12 && hour < 19 ? 'AFTERNOON' : 'NIGHT');

export const SLOT_NAMES: Record<TimeSlot, { noun: string; byThe: string; the: string }> = {
  MORNING: { noun: 'mañana', byThe: 'por la mañana', the: 'la mañana' },
  AFTERNOON: { noun: 'tarde', byThe: 'por la tarde', the: 'la tarde' },
  NIGHT: { noun: 'noche', byThe: 'por la noche', the: 'la noche' },
};

/** "a", "a y b", "a, b y c" — with "e" before words starting with an i-sound. */
export const joinList = (items: string[]): string => {
  if (items.length <= 1) return items[0] ?? '';
  const last = items[items.length - 1];
  const conj = /^(i|hi)[^aeou]/i.test(last) ? 'e' : 'y';
  return `${items.slice(0, -1).join(', ')} ${conj} ${last}`;
};

export const capitalize = (s: string): string => (s ? s[0].toLocaleUpperCase('es-ES') + s.slice(1) : s);

export const lowerFirst = (s: string): string => (s ? s[0].toLocaleLowerCase('es-ES') + s.slice(1) : s);

/** Short quote for note recall: trimmed to ~60 chars on a word boundary. */
export const shortQuote = (text: string, max = 60): string => {
  const clean = text.replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, '');
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 10)).trim()}…`;
};

/** Ensures a sentence ends with terminal punctuation. */
export const sentence = (s: string): string => {
  const t = capitalize(s.trim());
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};
