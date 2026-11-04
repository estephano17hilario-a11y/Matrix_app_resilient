// Weekly narrative summary — same technique as the completion report:
// tone opening → top weekly facts with connectors → closing.

import type { DayKey } from '../engine/dayKey';
import type { StandingChange } from '../engine/ranks';
import { REPORT_CONFIG as R } from './config';
import { SLOT_NAMES, WORDS, capitalize, comparedTo, count, countWords, humanMinutes as H, lowerFirst, relativeDay, sentence, type TimeSlot } from './language';
import { VariantPicker, polish } from './narrative';
import { createRng, hashSeed } from './stats';
import type { ReportMemory, Tone } from './types';
import { CONNECTORS, type Template } from './templates';

export interface WeeklyInput {
  weekStartKey: DayKey;
  todayKey: DayKey;
  userName?: string | null;
  focusMinutes: number;
  prevFocusMinutes: number;
  sessions: number;
  /** Average habit compliance r over the week's closed days (null if none). */
  habitRatioAvg: number | null;
  habitDaysMet: number;
  tasksDone: number;
  eloDelta: number;
  startLabel: string;
  endLabel: string;
  rankChange: StandingChange;
  bestDay: { dayKey: DayKey; minutes: number } | null;
  bestSlot: TimeSlot | null;
  streak: number;
  memory: ReportMemory;
}

type WeeklyFact =
  | { type: 'FOCUS'; magnitude: number; polarity: 'positive' | 'neutral' | 'negative' }
  | { type: 'HABITS' | 'TASKS' | 'BEST_DAY' | 'RANK' | 'STREAK' | 'ELO' | 'SLOT'; magnitude: number; polarity: 'positive' | 'neutral' | 'negative' };

const OPEN: Record<Tone, Template<void>[]> = {
  EXCELLENT: [
    () => 'Semana de campeonato', () => 'Qué semana te marcaste', () => 'Esta semana jugaste en otra liga',
    () => 'Siete días de los que se recuerdan', () => 'Semana redonda', () => 'Pocas semanas salen así',
  ],
  GOOD: [
    () => 'Buena semana', () => 'Semana sólida', () => 'La semana deja buen sabor',
    () => 'Siete días bien aprovechados', () => 'Semana de avance', () => 'Vas en la dirección correcta',
  ],
  REGULAR: [
    () => 'Semana de mantenimiento', () => 'Una semana de altibajos', () => 'La semana fue irregular',
    () => 'Siete días con luces y sombras', () => 'Semana tranquila', () => 'No fue la mejor semana, pero sumó',
  ],
  DIFFICULT: [
    () => 'Semana cuesta arriba', () => 'Esta semana costó', () => 'Siete días complicados',
    () => 'No fue tu semana', () => 'Semana para olvidar rápido', () => 'Semana dura, de las que enseñan',
  ],
};

const CLOSE: Record<Tone, Template<void>[]> = {
  EXCELLENT: [
    () => 'la próxima semana, a defender lo ganado', () => 'repite la receta el lunes', () => 'el siguiente rango te está mirando',
    () => 'mantén los mismos horarios y seguirás subiendo', () => 'no cambies nada que funcione', () => 'a por otra igual',
  ],
  GOOD: [
    () => 'la próxima, intenta sumar un día más de hábitos cumplidos', () => 'un pequeño empujón y la próxima será excelente', () => 'sigue construyendo sobre esta base',
    () => 'el lunes, empieza fuerte desde la mañana', () => 'elige un objetivo concreto para la próxima semana', () => 'la constancia te está llevando lejos',
  ],
  REGULAR: [
    () => 'la próxima semana, prioriza tres cosas y ninguna más', () => 'ajusta tus metas para que sean alcanzables', () => 'empieza el lunes con una sesión corta',
    () => 'busca tu mejor franja y protégela', () => 'un buen lunes cambia toda la semana', () => 'piensa qué te frenó y quítalo de en medio',
  ],
  DIFFICULT: [
    () => 'la próxima semana es una página en blanco', () => 'empieza por lo mínimo y crece desde ahí', () => 'baja las metas una semana y recupera ritmo',
    () => 'un día bueno basta para cambiar la inercia', () => 'descansa bien el domingo y vuelve con calma', () => 'lo importante es volver a empezar',
  ],
};

const FACTS: Record<WeeklyFact['type'], Template<WeeklyInput>[]> = {
  FOCUS: [
    d => `sumaste ${H(d.focusMinutes)} de foco en ${count(d.sessions, WORDS.session)}`,
    d => (d.prevFocusMinutes > 0 ? `tu foco fue ${comparedTo((d.focusMinutes / d.prevFocusMinutes - 1) * 100)} la semana pasada` : `acumulaste ${H(d.focusMinutes)} de foco`),
    d => `${H(d.focusMinutes)} de foco repartidos en ${count(d.sessions, WORDS.session)}`,
    d => (d.focusMinutes >= d.prevFocusMinutes ? `le dedicaste más tiempo al foco que la semana anterior: ${H(d.focusMinutes)}` : `el foco bajó respecto a la semana anterior, hasta ${H(d.focusMinutes)}`),
    d => `el contador de foco marca ${H(d.focusMinutes)} esta semana`,
    d => `entre todas tus sesiones, ${H(d.focusMinutes)} de concentración`,
  ],
  HABITS: [
    d => `cumpliste tu meta de hábitos ${count(d.habitDaysMet, WORDS.time)} esta semana`,
    d => `tus hábitos llegaron a la meta en ${count(d.habitDaysMet, WORDS.day)}`,
    d => `la meta diaria de hábitos se cumplió ${countWords(d.habitDaysMet, WORDS.time)}`,
    d => `en hábitos, ${count(d.habitDaysMet, WORDS.day)} con la meta cumplida`,
    d => `tu cumplimiento medio de hábitos fue del ${Math.round((d.habitRatioAvg ?? 0) * 100)} % de la meta`,
    d => `${count(d.habitDaysMet, WORDS.day)} de hábitos al día`,
  ],
  TASKS: [
    d => `cerraste ${count(d.tasksDone, WORDS.task)}`,
    d => `${count(d.tasksDone, WORDS.task)} tachadas de la lista`,
    d => `despachaste ${count(d.tasksDone, WORDS.task)} en siete días`,
    d => `tu lista de pendientes perdió ${count(d.tasksDone, WORDS.task)}`,
    d => `en tareas, ${count(d.tasksDone, WORDS.task)} completadas`,
    d => `completaste ${count(d.tasksDone, WORDS.task)} esta semana`,
  ],
  BEST_DAY: [
    d => `tu mejor día fue ${relativeDay(d.bestDay!.dayKey, d.todayKey)}, con ${H(d.bestDay!.minutes)} de foco`,
    d => `${relativeDay(d.bestDay!.dayKey, d.todayKey)} fue el día más productivo`,
    d => `el pico de la semana llegó ${relativeDay(d.bestDay!.dayKey, d.todayKey)}`,
    d => `destaca ${relativeDay(d.bestDay!.dayKey, d.todayKey)}: ${H(d.bestDay!.minutes)} de foco`,
    d => `si hay que quedarse con un día, es ${relativeDay(d.bestDay!.dayKey, d.todayKey)}`,
    d => `${relativeDay(d.bestDay!.dayKey, d.todayKey)} marcaste el máximo semanal`,
  ],
  RANK: [
    d => (d.rankChange === 'RANK_UP' ? `subiste de rango: de ${d.startLabel} a ${d.endLabel}` : d.rankChange === 'DIVISION_UP' ? `subiste de ${d.startLabel} a ${d.endLabel}` : `bajaste de ${d.startLabel} a ${d.endLabel}`),
    d => (d.rankChange.endsWith('UP') ? `terminas la semana en ${d.endLabel}` : `la semana te deja en ${d.endLabel}`),
    d => (d.rankChange.endsWith('UP') ? `${d.endLabel} ya es tuyo` : `toca recuperar ${d.startLabel}`),
    d => `pasaste de ${d.startLabel} a ${d.endLabel}`,
    d => (d.rankChange.endsWith('UP') ? `ascenso confirmado a ${d.endLabel}` : `retroceso a ${d.endLabel}, nada que no se recupere`),
    d => `el ranking te sitúa ahora en ${d.endLabel}`,
  ],
  STREAK: [
    d => `tu racha de hábitos va por ${count(d.streak, WORDS.day)}`,
    d => `${count(d.streak, WORDS.day)} seguidos cumpliendo la meta`,
    d => `la racha sigue viva: ${count(d.streak, WORDS.day)}`,
    d => `llevas ${countWords(d.streak, WORDS.day)} sin romper la cadena`,
    d => `la cadena ya mide ${count(d.streak, WORDS.day)}`,
    d => `${count(d.streak, WORDS.day)} de racha y contando`,
  ],
  ELO: [
    d => (d.eloDelta >= 0 ? `ganaste ${count(d.eloDelta, WORDS.point)} de ELO` : `perdiste ${count(-d.eloDelta, WORDS.point)} de ELO`),
    d => (d.eloDelta >= 0 ? `tu ELO subió ${count(d.eloDelta, WORDS.point)}` : `tu ELO bajó ${count(-d.eloDelta, WORDS.point)}`),
    d => (d.eloDelta >= 0 ? `el balance de ELO es de +${d.eloDelta}` : `el balance de ELO es de ${d.eloDelta}`),
    d => (d.eloDelta >= 0 ? `${count(d.eloDelta, WORDS.point)} más en el marcador` : `${count(-d.eloDelta, WORDS.point)} menos en el marcador`),
    d => `cierras la semana con ${d.eloDelta >= 0 ? '+' : ''}${d.eloDelta} de ELO`,
    d => (d.eloDelta >= 0 ? `sumaste ${count(d.eloDelta, WORDS.point)} al ranking` : `cediste ${count(-d.eloDelta, WORDS.point)} en el ranking`),
  ],
  SLOT: [
    d => `tu mejor franja fue ${SLOT_NAMES[d.bestSlot!].the}`,
    d => `${SLOT_NAMES[d.bestSlot!].byThe} es cuando más rindes`,
    d => `${SLOT_NAMES[d.bestSlot!].the} volvió a ser tu momento`,
    d => `la mayor parte de tu buen foco llegó ${SLOT_NAMES[d.bestSlot!].byThe}`,
    d => `si buscas repetir, ${SLOT_NAMES[d.bestSlot!].the} es tu franja`,
    d => `${SLOT_NAMES[d.bestSlot!].byThe} rindes por encima del resto del día`,
  ],
};

const weeklyTone = (d: WeeklyInput): Tone =>
  d.eloDelta >= 15 || d.rankChange === 'RANK_UP' ? 'EXCELLENT' : d.eloDelta >= 5 ? 'GOOD' : d.eloDelta >= 0 ? 'REGULAR' : 'DIFFICULT';

const factsOf = (d: WeeklyInput): WeeklyFact[] => {
  const out: WeeklyFact[] = [];
  if (d.rankChange !== 'NONE') out.push({ type: 'RANK', magnitude: d.rankChange.startsWith('RANK') ? 1 : 0.8, polarity: d.rankChange.endsWith('UP') ? 'positive' : 'negative' });
  if (d.focusMinutes > 0) {
    const change = d.prevFocusMinutes > 0 ? d.focusMinutes / d.prevFocusMinutes - 1 : 0.3;
    out.push({ type: 'FOCUS', magnitude: Math.min(1, 0.4 + Math.abs(change)), polarity: change >= 0 ? 'positive' : 'neutral' });
  }
  if (d.habitRatioAvg !== null) out.push({ type: 'HABITS', magnitude: Math.min(1, d.habitDaysMet / 7 + 0.2), polarity: d.habitDaysMet >= 4 ? 'positive' : 'neutral' });
  if (d.tasksDone > 0) out.push({ type: 'TASKS', magnitude: Math.min(1, d.tasksDone / 20 + 0.2), polarity: 'positive' });
  if (d.bestDay && d.bestDay.minutes > 0) out.push({ type: 'BEST_DAY', magnitude: 0.45, polarity: 'neutral' });
  if (d.streak >= 3) out.push({ type: 'STREAK', magnitude: Math.min(1, d.streak / 30 + 0.4), polarity: 'positive' });
  if (d.eloDelta !== 0) out.push({ type: 'ELO', magnitude: Math.min(1, Math.abs(d.eloDelta) / 30 + 0.3), polarity: d.eloDelta > 0 ? 'positive' : 'negative' });
  if (d.bestSlot) out.push({ type: 'SLOT', magnitude: 0.35, polarity: 'neutral' });
  return out;
};

export const generateWeeklySummary = (d: WeeklyInput, seed = hashSeed(`week:${d.weekStartKey}`)) => {
  const picker = new VariantPicker(createRng(seed), d.memory);
  const tone = weeklyTone(d);
  const facts = factsOf(d).sort((a, b) => b.magnitude - a.magnitude || a.type.localeCompare(b.type)).slice(0, R.MAX_INSIGHTS);

  let opening = picker.pick(`wopen:${tone}`, OPEN[tone])(undefined, undefined as never);
  const name = d.userName?.trim().split(/\s+/)[0];
  if (name && picker.chance(R.NAME_PROBABILITY)) opening = `${opening}, ${name}`;
  const parts = [sentence(opening)];

  facts.forEach((f, i) => {
    const text = picker.pick(`wfact:${f.type}`, FACTS[f.type])(d, undefined as never);
    if (i === 0) return parts.push(sentence(text));
    const group = f.polarity === 'negative' ? 'CONTRAST' : f.polarity === 'positive' ? 'POSITIVE' : 'NEUTRAL';
    const c = picker.pick(`con:${group}`, CONNECTORS[group]);
    parts.push(sentence(`${capitalize(c.text)}${c.colon ? ':' : ','} ${lowerFirst(text)}`));
  });

  parts.push(sentence(picker.pick(`wclose:${tone}`, CLOSE[tone])(undefined, undefined as never)));
  return { tone, text: polish(parts.join(' ')), variantIds: picker.picked, factTypes: facts.map(f => f.type) };
};
