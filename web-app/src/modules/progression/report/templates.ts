// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE BANK — at least 6 variants per opening, insight and closing.
//
// Every template is a typed function, so a variable can never be missing.
// Fragments have no final period; the composer adds punctuation, connectors
// and capitalisation. Structures avoid gender/number agreement with values we
// don't control (item names, the user's gender).
// ─────────────────────────────────────────────────────────────────────────────

import type { CompletionKind, InsightData, InsightType, Moment, Tone } from './types';
import {
  SLOT_NAMES, WORDS, comparedTo, count, countWords, humanMinutes as H,
  relativeDay, shortQuote, sinceDay, weekdayName, weekdayPlural, type Forms,
} from './language';

export interface Ctx {
  moment: Moment;
  kind: CompletionKind;
  itemName: string;
}

export type Template<D> = (d: D, c: Ctx) => string;

const MOMENT: Record<Moment, { noun: string; the: string; this: string; byThe: string }> = {
  DAWN: { noun: 'madrugada', the: 'la madrugada', this: 'esta madrugada', byThe: 'de madrugada' },
  MORNING: { noun: 'mañana', the: 'la mañana', this: 'esta mañana', byThe: 'por la mañana' },
  AFTERNOON: { noun: 'tarde', the: 'la tarde', this: 'esta tarde', byThe: 'por la tarde' },
  NIGHT: { noun: 'noche', the: 'la noche', this: 'esta noche', byThe: 'por la noche' },
};

const KIND: Record<CompletionKind, { word: string; fem: boolean }> = {
  FOCUS: { word: 'sesión', fem: true },
  HABIT: { word: 'hábito', fem: false },
  TASK: { word: 'tarea', fem: true },
  SUBTASK: { word: 'subtarea', fem: true },
};

const m = (c: Ctx) => MOMENT[c.moment];
const dem = (c: Ctx) => `${KIND[c.kind].fem ? 'esta' : 'este'} ${KIND[c.kind].word}`;
const q = (s: string) => `«${s}»`;
const decimal = (n: number) => n.toFixed(1).replace('.', ',');
const RECORD_FORMS: Forms = ['registro', 'registros'];

// ── Openings (by tone, aware of the time of day) ────────────────────────────

export const OPENINGS: Record<Tone, Template<void>[]> = {
  EXCELLENT: [
    (_, c) => ({ DAWN: 'Madrugada épica', MORNING: 'Arrancaste fuerte la mañana', AFTERNOON: 'Tarde de las buenas', NIGHT: 'Gran cierre de noche' })[c.moment],
    (_, c) => `Qué manera de aprovechar ${m(c).the}`,
    (_, c) => `${dem(c)} fue de ${KIND[c.kind].fem ? 'las' : 'los'} que cuentan`,
    (_, c) => `Nivel altísimo ${m(c).byThe}`,
    (_, c) => `Lo de ${m(c).this} fue de otra liga`,
    (_, c) => `Impecable lo de ${q(c.itemName)}`,
    (_, c) => `Así se juega ${m(c).this}`,
  ],
  GOOD: [
    (_, c) => ({ DAWN: 'Buen trabajo en plena madrugada', MORNING: 'Buena mañana', AFTERNOON: 'Buena tarde de trabajo', NIGHT: 'Buen remate de noche' })[c.moment],
    (_, c) => `Bien hecho ${m(c).this}`,
    (_, c) => `${dem(c)} suma, y mucho`,
    (_, c) => `Paso firme ${m(c).this}`,
    (_, c) => `${q(c.itemName)}, hecho`,
    (_, c) => `Otro ladrillo más ${m(c).this}`,
    (_, c) => `Cumpliste con ${q(c.itemName)}`,
  ],
  REGULAR: [
    () => 'No fue perfecto, pero cuenta',
    (_, c) => `Sumaste ${m(c).this}, aunque hay margen`,
    () => 'Hecho es mejor que perfecto',
    (_, c) => `Un paso más ${m(c).this}`,
    (_, c) => `Seguiste en movimiento ${m(c).this}`,
    (_, c) => `${q(c.itemName)} quedó marcado; ya habrá tiempo de afinar`,
  ],
  DIFFICULT: [
    () => 'Costó, pero lo hiciste',
    (_, c) => `${m(c).noun} complicada, y aun así apareciste`,
    () => 'No todos los días salen redondos',
    () => 'Lo importante es que no lo soltaste',
    () => 'Día cuesta arriba, pero sumaste igual',
    () => 'Aunque fue corto, mantuviste el hilo',
  ],
};

// ── Insights ────────────────────────────────────────────────────────────────

type Bank = { [K in InsightType]: Template<InsightData[K]>[] };

const recordAdj = { WEEK: 'semanal', MONTH: 'mensual', ALL: 'histórico' } as const;
const recordIn = { WEEK: 'de esta semana', MONTH: 'del último mes', ALL: 'anterior' } as const;
const recordSpan = { WEEK: 'de la semana', MONTH: 'del último mes', ALL: 'de siempre' } as const;
const recordEver = { WEEK: 'en toda la semana', MONTH: 'en todo el mes', ALL: 'nunca' } as const;

const deRel = (rel: string) => (rel.startsWith('el ') ? `d${rel}` : `de ${rel}`);
const contrastOf = (d: InsightData['NOTE_RECALL']) =>
  d.contrast === 'NO_PAUSES' ? ' Hoy no hubo pausas' : d.contrast === 'LONGER' ? ` Hoy aguantaste ${H(d.extraMinutes)} más` : '';
const noteLead = (d: InsightData['NOTE_RECALL']) => (d.contrast ? '.' : '');

const progressForms = (d: InsightData['DAY_PROGRESS']): Forms => (d.noun === 'HABITS' ? WORDS.habit : WORDS.task);
const doneAll = (d: InsightData['DAY_PROGRESS']) => {
  const fem = d.noun === 'TASKS';
  const [one, many] = progressForms(d);
  return d.total === 1 ? `${fem ? 'la única' : 'el único'} ${one}` : `${fem ? 'las' : 'los'} ${d.total} ${many}`;
};
const pctDone = (d: InsightData['DAY_PROGRESS']) => Math.round((100 * d.done) / Math.max(1, d.total));

const goalVal = (n: number, target: 'PROJECT' | 'HABITS') => (target === 'PROJECT' ? count(n, WORDS.minute) : `${n} %`);
const soon = (days: number) => (days <= 1 ? 'mañana mismo' : `en unos ${countWords(days, WORDS.day)}`);
const projectOf = (name: string | null) => (name ? q(name) : 'este proyecto');
const subjectFocus = (s: 'FOCUS' | 'HABITS') => (s === 'FOCUS' ? 'con el foco' : 'con tus hábitos');

export const INSIGHTS: Bank = {
  ABOVE_AVERAGE: [
    d => `fueron ${H(d.minutes)}, ${comparedTo(d.pctDiff)} tu promedio de las últimas sesiones`,
    d => `le dedicaste ${comparedTo(d.pctDiff)} lo habitual${d.projectName ? ` en ${q(d.projectName)}` : ''}`,
    d => `superaste tu media reciente: ${H(d.minutes)} frente a ${H(d.avgMinutes)}`,
    d => `tu media venía en ${H(d.avgMinutes)} y hoy llegaste a ${H(d.minutes)}`,
    d => `rendiste ${comparedTo(d.pctDiff)} tu promedio de siete sesiones`,
    d => `estuviste ${comparedTo(d.pctDiff)} tu ritmo normal`,
  ],
  RECORD: [
    d => `es tu sesión más larga ${recordSpan[d.scope]}: ${H(d.minutes)}`,
    d => `nuevo récord ${recordAdj[d.scope]} con ${H(d.minutes)}`,
    d => `${H(d.minutes)} sin soltar: no se había visto algo así ${recordEver[d.scope]}`,
    d => `pusiste el listón ${recordAdj[d.scope]} más alto: ${H(d.minutes)}`,
    d => `ninguna sesión ${recordIn[d.scope]} llega a esta`,
    d => `récord ${recordAdj[d.scope]} desbloqueado`,
  ],
  BEST_SINCE: [
    d => `es tu mejor sesión ${sinceDay(d.sinceDayKey, d.todayKey)}`,
    d => `no rendías tanto ${sinceDay(d.sinceDayKey, d.todayKey)}`,
    d => `${H(d.minutes)}: algo que no lograbas ${sinceDay(d.sinceDayKey, d.todayKey)}`,
    d => `la última vez que rendiste así fue ${relativeDay(d.sinceDayKey, d.todayKey)}`,
    d => `tu mejor marca ${sinceDay(d.sinceDayKey, d.todayKey)}`,
    d => `superaste todo lo que hiciste ${sinceDay(d.sinceDayKey, d.todayKey)}`,
  ],
  STREAK_MILESTONE: [
    d => `${q(d.itemName)} ya suma ${count(d.days, WORDS.day)} seguidos`,
    d => `${countWords(d.days, WORDS.day)} sin fallar con ${q(d.itemName)}`,
    d => `alcanzaste la racha de ${count(d.days, WORDS.day)} en ${q(d.itemName)}`,
    d => `hito desbloqueado: ${count(d.days, WORDS.day)} de racha`,
    d => `la racha de ${q(d.itemName)} llega a ${count(d.days, WORDS.day)}`,
    d => `${count(d.days, WORDS.day)} al hilo: eso ya es costumbre`,
  ],
  TREND: [
    d => (d.direction === 'UP' ? `vienes subiendo de forma constante ${subjectFocus(d.subject)}` : `vienes bajando poco a poco ${subjectFocus(d.subject)}`),
    d => `las últimas dos semanas dibujan una curva hacia ${d.direction === 'UP' ? 'arriba' : 'abajo'}`,
    d => `tu tendencia de 14 días apunta ${d.direction === 'UP' ? 'hacia arriba' : 'a la baja'}`,
    d => `cada semana rindes un poco ${d.direction === 'UP' ? 'más' : 'menos'} ${subjectFocus(d.subject)}`,
    d => (d.direction === 'UP' ? 'la línea de tus últimos 14 días sube sin tropiezos' : 'la línea de tus últimos 14 días va perdiendo altura'),
    d => (d.direction === 'UP'
      ? `el progreso ${d.subject === 'FOCUS' ? 'de tu foco' : 'de tus hábitos'} no es casualidad: es una tendencia`
      : `${d.subject === 'FOCUS' ? 'tu foco viene' : 'tus hábitos vienen'} perdiendo fuerza estos 14 días`),
  ],
  CONSISTENCY: [
    () => 'tus sesiones son cada vez más estables',
    () => 'la duración de tus sesiones varía cada vez menos',
    () => 'estás encontrando un ritmo propio, con menos altibajos que antes',
    () => 'ganaste regularidad: tus tiempos ya no se disparan ni se desploman',
    () => 'tu constancia mejoró frente a las siete sesiones anteriores',
    () => 'se nota un patrón más sólido en tus últimas sesiones',
  ],
  BEST_SLOT: [
    d => `tus mejores calificaciones de enfoque llegan ${SLOT_NAMES[d.slot].byThe} (${decimal(d.avg)} de media)`,
    d => (d.isNow ? `${SLOT_NAMES[d.slot].the} es tu franja fuerte, y se nota` : `${SLOT_NAMES[d.slot].the} sigue siendo tu mejor franja para concentrarte`),
    d => `cuando trabajas ${SLOT_NAMES[d.slot].byThe} te concentras mejor: ${decimal(d.avg)} de 5`,
    d => `${SLOT_NAMES[d.slot].byThe} tu enfoque rinde más que en el resto del día`,
    d => `si buscas tu mejor versión, ${SLOT_NAMES[d.slot].the} es tu momento`,
    d => `tu enfoque promedia ${decimal(d.avg)} ${SLOT_NAMES[d.slot].byThe}, tu mejor marca del día`,
  ],
  BEST_WEEKDAY: [
    d => `${weekdayPlural(d.weekday)} son tu mejor día para enfocarte`,
    d => (d.isToday ? `hoy es ${weekdayName(d.weekday)}, tu día más productivo` : `${weekdayPlural(d.weekday)} suelen ser tus jornadas más productivas`),
    d => `si hubiera que elegir un día, sería el ${weekdayName(d.weekday)}`,
    d => `tu historial dice que ${weekdayPlural(d.weekday)} rindes más`,
    d => `${weekdayPlural(d.weekday)} combinas más minutos y mejor enfoque`,
    d => `el ${weekdayName(d.weekday)} es, de lejos, tu día fuerte`,
  ],
  SAME_WEEKDAY: [
    d => `rendiste ${comparedTo(d.pctDiff)} tus ${weekdayPlural(d.weekday).slice(4)} habituales`,
    d => `frente a otros ${weekdayPlural(d.weekday).slice(4)}, hoy fue ${d.pctDiff > 0 ? 'mejor' : 'algo más flojo'}`,
    d => `${weekdayPlural(d.weekday)} sueles hacer ${d.pctDiff > 0 ? 'menos' : 'más'}; hoy ${d.pctDiff > 0 ? 'superaste' : 'quedaste por debajo de'} esa marca`,
    d => `para ser ${weekdayName(d.weekday)}, ${d.pctDiff > 0 ? 'fue una gran sesión' : 'la sesión quedó algo corta'}`,
    d => (d.pctDiff > 0
      ? `este ${weekdayName(d.weekday)} dejó atrás a tus ${weekdayPlural(d.weekday).slice(4)} habituales`
      : `este ${weekdayName(d.weekday)} quedó por debajo de tus ${weekdayPlural(d.weekday).slice(4)} habituales`),
    d => `hiciste ${comparedTo(d.pctDiff)} un ${weekdayName(d.weekday)} normal`,
  ],
  NOTE_RECALL: [
    d => `la última vez anotaste: «${shortQuote(d.quote)}»${noteLead(d)}${contrastOf(d)}`,
    d => `${relativeDay(d.dayKey, d.todayKey)} escribiste «${shortQuote(d.quote)}»${noteLead(d)}${contrastOf(d)}`,
    d => `tu nota ${deRel(relativeDay(d.dayKey, d.todayKey))} decía «${shortQuote(d.quote)}»${noteLead(d)}${contrastOf(d)}`,
    d => `recuerda lo que dejaste anotado ${relativeDay(d.dayKey, d.todayKey)}: «${shortQuote(d.quote)}»${noteLead(d)}${contrastOf(d)}`,
    d => `en una ocasión parecida apuntaste «${shortQuote(d.quote)}»${noteLead(d)}${contrastOf(d)}`,
    d => `según tu nota ${deRel(relativeDay(d.dayKey, d.todayKey))}, «${shortQuote(d.quote)}»${noteLead(d)}${contrastOf(d)}`,
  ],
  TASK_ESTIMATE: [
    d => `la terminaste en ${H(d.actual)}, ${comparedTo(d.pctDiff)} lo estimado`,
    d => `estimaste ${H(d.estimated)} y te llevó ${H(d.actual)}`,
    d => (d.pctDiff < 0 ? 'te llevó menos de lo previsto' : 'te llevó más de lo previsto'),
    d => (d.pctDiff < 0 ? `le ganaste al reloj por ${H(d.estimated - d.actual)}` : `se alargó ${H(d.actual - d.estimated)} sobre lo previsto`),
    d => `usaste ${comparedTo(d.pctDiff)} el tiempo que habías calculado`,
    d => `tu estimación era de ${H(d.estimated)}; el tiempo real, ${H(d.actual)}`,
  ],
  HABIT_RATE: [
    d => (d.rate7 > d.rate30
      ? `esta semana lo cumpliste el ${Math.round(d.rate7 * 100)} % de los días, por encima de tu ${Math.round(d.rate30 * 100)} % mensual`
      : `esta semana bajaste al ${Math.round(d.rate7 * 100)} %, frente a un ${Math.round(d.rate30 * 100)} % en el mes`),
    d => `tu tasa de 7 días (${Math.round(d.rate7 * 100)} %) ${d.rate7 > d.rate30 ? 'supera' : 'está por debajo de'} la de 30 (${Math.round(d.rate30 * 100)} %)`,
    d => `la última semana vas ${d.rate7 > d.rate30 ? 'mejor que' : 'algo por debajo de'} tu media del mes`,
    d => `en los últimos 30 días llevas un ${Math.round(d.rate30 * 100)} %, y esta semana un ${Math.round(d.rate7 * 100)} %`,
    d => (d.rate7 > d.rate30 ? `vas en subida: ${Math.round(d.rate7 * 100)} % esta semana` : `esta semana costó más: ${Math.round(d.rate7 * 100)} % de cumplimiento`),
    d => {
      const diff = Math.abs(Math.round(d.rate7 * 100) - Math.round(d.rate30 * 100));
      return d.rate7 > d.rate30 ? `mejoraste ${count(diff, WORDS.point)} respecto a tu promedio mensual` : `perdiste ${count(diff, WORDS.point)} respecto a tu promedio mensual`;
    },
  ],
  DAY_PROGRESS: [
    d => `llevas ${d.done} de ${count(d.total, progressForms(d))} de hoy`,
    d => (d.done >= d.total
      ? `completaste ${doneAll(d)} de hoy`
      : `te ${d.total - d.done === 1 ? 'queda' : 'quedan'} ${count(d.total - d.done, progressForms(d))} para cerrar el día`),
    d => `van ${d.done} de ${count(d.total, progressForms(d))} hoy`,
    d => (d.goalPct !== null
      ? `tu meta diaria es el ${d.goalPct} % y ya vas por el ${pctDone(d)} %`
      : `ya despachaste el ${pctDone(d)} % de tus tareas del día`),
    d => `${pctDone(d)} % del día resuelto`,
    d => `el día avanza: ${d.done} de ${d.total} ${d.noun === 'HABITS' ? 'hechos' : 'hechas'}`,
  ],
  PROJECT_GOAL: [
    d => (d.met ? `meta diaria de ${projectOf(d.projectName)} cumplida: ${H(d.minutesToday)} de ${H(d.goal)}` : `llevas ${H(d.minutesToday)} de una meta de ${H(d.goal)} en ${projectOf(d.projectName)}`),
    d => (d.met ? `con esto ${projectOf(d.projectName)} ya tiene su meta del día` : `distancia a la meta de ${projectOf(d.projectName)}: ${H(d.goal - d.minutesToday)}`),
    d => (d.met ? `la meta de ${projectOf(d.projectName)} quedó cubierta por hoy` : `la meta de ${projectOf(d.projectName)} sigue en marcha, al ${Math.round((100 * d.minutesToday) / d.goal)} %`),
    d => (d.met ? `${H(d.minutesToday)} hoy en ${projectOf(d.projectName)}: meta superada` : `${H(d.minutesToday)} hoy en ${projectOf(d.projectName)}, de una meta de ${H(d.goal)}`),
    d => `objetivo del día en ${projectOf(d.projectName)}: ${d.met ? 'hecho' : `${Math.round((100 * d.minutesToday) / d.goal)} % completado`}`,
    d => (d.met ? `misión diaria de ${projectOf(d.projectName)} completada` : `la meta de ${projectOf(d.projectName)} sigue abierta, con ${H(d.goal - d.minutesToday)} por delante`),
  ],
  BUILDING_HISTORY: [
    d => `construyendo tu historial: ${d.remaining === 1 ? 'un registro más' : `${countWords(d.remaining, RECORD_FORMS)} más`} y empezarán las comparaciones`,
    () => 'aún estamos construyendo tu historial, así que hoy toca sumar sin comparar',
    () => 'construyendo tu historial: cada registro afina lo que te contaré después',
    () => 'todavía es pronto para comparar; seguimos construyendo tu historial',
    d => `construyendo tu historial: con ${countWords(d.remaining, RECORD_FORMS)} más ya podré decirte cómo vas`,
    () => 'este registro entra a tu historial, que aún se está construyendo',
  ],
  LOWER_GOAL: [
    d => `tus últimas tres sesiones quedaron por debajo del 70 % de lo planeado; prueba a bajar la meta a ${count(d.suggested, WORDS.minute)}`,
    d => `quizá ${count(d.current, WORDS.minute)} es demasiado por ahora: ${count(d.suggested, WORDS.minute)} te encajaría mejor`,
    d => `ajustar la meta a ${count(d.suggested, WORDS.minute)} podría ayudarte a terminar con buen sabor de boca`,
    d => `tres sesiones seguidas cortas: una meta de ${count(d.suggested, WORDS.minute)} es más realista`,
    d => `baja el listón a ${count(d.suggested, WORDS.minute)} unos días y vuelve a subirlo cuando fluya`,
    d => `te propongo sesiones de ${count(d.suggested, WORDS.minute)} en lugar de ${count(d.current, WORDS.minute)}`,
  ],
  RAISE_GOAL: [
    d => `cinco días seguidos al 100 %: ya puedes subir la meta a ${goalVal(d.suggested, d.target)}`,
    d => `llevas cinco días cumpliendo de sobra; prueba con ${goalVal(d.suggested, d.target)}`,
    d => `es buen momento para exigirte un poco más: ${goalVal(d.suggested, d.target)}`,
    d => `tu meta de ${goalVal(d.current, d.target)} se te quedó pequeña; ${goalVal(d.suggested, d.target)} suena mejor`,
    d => `sube un 10 %: de ${goalVal(d.current, d.target)} a ${goalVal(d.suggested, d.target)}`,
    d => `con esta racha, una meta de ${goalVal(d.suggested, d.target)} es el siguiente paso natural`,
  ],
  LOW_FOCUS: [
    d => `tus últimas cinco calificaciones promedian ${decimal(d.avg)}; quizá convenga cambiar de horario o de entorno`,
    d => `el enfoque viene flojo (${decimal(d.avg)} de 5): prueba otro lugar o una hora distinta`,
    d => `si el enfoque sigue en ${decimal(d.avg)}, cambiar de entorno puede marcar la diferencia`,
    () => 'algo te está distrayendo últimamente; prueba a moverte de sitio o de franja horaria',
    d => `con un enfoque medio de ${decimal(d.avg)}, vale la pena probar otro horario en la próxima sesión`,
    () => 'cambia una variable en la próxima sesión: el lugar, la hora o el móvil lejos',
  ],
  TAKE_BREAK: [
    d => `llevas ${H(d.minutes)} de foco sin una pausa de 15 minutos; date un descanso`,
    d => `${H(d.minutes)} sin parar: toca un respiro de 15 minutos`,
    d => `tu cerebro agradecerá una pausa larga ahora, que ya van ${H(d.minutes)}`,
    () => 'levántate, estírate y bebe agua: tanto foco seguido pide descanso',
    () => 'antes de seguir, regálate 15 minutos lejos de la pantalla',
    d => `el descanso también entrena, y llevas ${H(d.minutes)} sin parar`,
  ],
  PREDICTION: [
    d => `a este ritmo llegas a ${d.nextLabel} ${soon(d.days)}`,
    d => `si mantienes el paso, ${d.nextLabel} te espera ${soon(d.days)}`,
    d => `${d.nextLabel} queda ${d.days <= 1 ? 'a un día' : `a unos ${countWords(d.days, WORDS.day)}`} si sigues así`,
    d => `con tu promedio de ELO de esta semana, alcanzarías ${d.nextLabel} ${soon(d.days)}`,
    d => `sigue así y ${soon(d.days)} estrenas ${d.nextLabel}`,
    d => `mi predicción: ${d.nextLabel} ${soon(d.days)}`,
  ],
};

// ── Generic closings (when no suggestion/prediction wins) ───────────────────

export const CLOSINGS: Record<Tone, Template<void>[]> = {
  EXCELLENT: [
    () => 'en la próxima, repite la fórmula',
    () => 'guarda esta sensación para la siguiente',
    () => 'el listón queda alto: a por la próxima',
    () => 'así es como se construye un rango',
    () => 'que no sea la última vez',
    () => 'la próxima vez, intenta empezar a la misma hora',
  ],
  GOOD: [
    () => 'mantén este ritmo y los números seguirán subiendo',
    () => 'la próxima vez, intenta arañar unos minutos más',
    () => 'pequeños pasos así son los que suman',
    () => 'sigue sumando días como este',
    () => 'vas por buen camino',
    () => 'para la próxima, prepara el espacio antes de empezar',
  ],
  REGULAR: [
    () => 'la próxima, empieza con algo corto para coger impulso',
    () => 'cada día es otra oportunidad para afinar',
    () => 'prueba a eliminar una distracción en la siguiente',
    () => 'lo importante es no romper la cadena',
    () => 'un pequeño ajuste y la próxima saldrá mejor',
    () => 'antes de empezar, define qué quieres terminar',
  ],
  DIFFICULT: [
    () => 'descansa y vuelve con energía',
    () => 'la próxima vez, empieza por lo más fácil',
    () => 'no te castigues: la constancia gana a la intensidad',
    () => 'un día flojo no define tu semana',
    () => 'la próxima, ponte una meta pequeña y cúmplela',
    () => 'lo que cuenta es volver a intentarlo',
  ],
};

// ── Connectors between body sentences ───────────────────────────────────────

export interface Connector { text: string; colon?: boolean }

/** `colon` connectors are followed by ":" instead of ",". */
export const CONNECTORS: Record<'POSITIVE' | 'CONTRAST' | 'NEUTRAL', readonly Connector[]> = {
  POSITIVE: [{ text: 'además' }, { text: 'y lo mejor', colon: true }, { text: 'encima' }, { text: 'de hecho' }, { text: 'por si fuera poco' }, { text: 'y ojo al dato', colon: true }],
  CONTRAST: [{ text: 'eso sí' }, { text: 'ojo', colon: true }, { text: 'ahora bien' }, { text: 'aun así' }, { text: 'dicho esto' }, { text: 'un detalle', colon: true }],
  NEUTRAL: [{ text: 'por cierto' }, { text: 'además' }, { text: 'aparte' }, { text: 'un dato más', colon: true }, { text: 'de paso' }, { text: 'y otra cosa', colon: true }],
};

