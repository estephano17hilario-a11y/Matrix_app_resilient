// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — scripts. Each script is a list of steps run over the REAL app:
// the runner navigates, opens the real creators and reads the real DOM to know
// where the user is, so the guidance follows what they actually do.
// All copy is bilingual (es / en) and picked from the app language.
// ─────────────────────────────────────────────────────────────────────────────

import { editorHasText, findVisible, inputValue, readEditor, readWizard } from './dom';
import type { ScriptId, SectionId } from './monitorStore';

export type Lang = 'es' | 'en';
const x = (L: Lang, es: string, en: string) => (L === 'es' ? es : en);

export interface RunnerApi {
  next: () => void;
  goto: (stepId: string) => void;
  run: (script: ScriptId) => void;
  close: () => void;
  /** Per-run scratch state (cleared when a script starts). */
  ctx: Record<string, unknown>;
}

export interface MonitorAction {
  label: string;
  primary?: boolean;
  icon?: 'task' | 'habit' | 'project' | 'note' | 'journal' | 'retry' | 'later';
  /** Shown greyed out and not tappable (e.g. what the user already created in this tour). */
  disabled?: boolean;
  /** Small tag under a disabled action ("Hecho"). */
  badge?: string;
  run: (api: RunnerApi) => void;
}

export interface Frame {
  target?: string | null;
  /** A second element that gets a pulsing ring (e.g. the "Next" button of the real wizard). */
  secondary?: string | null;
  title: string;
  body: string;
  placement?: 'auto' | 'top' | 'bottom' | 'center';
  /** Label of the bubble's "Next" button; false hides it. */
  next?: string | false;
  /** Runs instead of advancing when "Next" is pressed (the step then advances by `until`/`event`). */
  onNext?: (api: RunnerApi) => void;
  /** Blocks taps outside the spotlight (explanations). Guides over the real UI don't block. */
  block?: boolean;
  /** The user must tap the highlighted element; taps pass through the hole. */
  tap?: boolean;
  pad?: number;
  mood?: 'talk' | 'point' | 'happy' | 'think';
  actions?: MonitorAction[];
  /** Motion-graphics panel shown inside the bubble. */
  showcase?: 'ranks';
  /** "Your turn" callout: the one concrete thing the user has to do on screen now. */
  todo?: string;
  /**
   * Steps where the user acts on the real UI get an "OK" button that hides the bubble so the screen is free;
   * it comes back by itself when the step (or its `group`) changes. Defaults to true for free-interaction and
   * tap steps; set false to force it off.
   */
  hideable?: boolean;
  /** The bubble stays hidden while this value is the same (e.g. the open wizard step); defaults to the step. */
  group?: string;
}

export interface Step {
  id: string;
  /** Dashboard view to show before this step. */
  view?: string;
  enter?: (api: RunnerApi) => void;
  frame: (L: Lang, api: RunnerApi) => Frame | null;
  /** Polled ~8×/s; true advances. */
  until?: (api: RunnerApi) => boolean;
  /** Window event that advances the step. */
  event?: string;
  onEvent?: (e: Event, api: RunnerApi) => boolean;
}

const dispatch = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

type CreateKind = 'task' | 'habit' | 'project' | 'note' | 'journal';
/** What the user already created with El Monitor during this app session. */
export const createdWithMonitor = new Set<CreateKind>();

// ── Shared explanation steps per section (used by the grand tour and the live tours) ──

const explain = (id: string, view: string | undefined, target: string, title: [string, string], body: [string, string], extra: Partial<Frame> = {}): Step => ({
  id, view,
  frame: L => ({ target, title: x(L, ...title), body: x(L, ...body), next: x(L, 'Siguiente', 'Next'), block: true, mood: 'point', ...extra }),
});

const SECTION_STEPS: Record<SectionId, Step[]> = {
  tasks: [
    explain('tasks-header', 'TASKS', '[data-tour="tasks-header"]',
      ['Misiones activas', 'Active missions'],
      ['Aquí viven tus tareas pendientes. El número naranja te dice cuántas te quedan hoy.', 'Your pending tasks live here. The orange number tells you how many are left.']),
    explain('tasks-list', 'TASKS', '[data-tour="task-list"]',
      ['Tu lista de misiones', 'Your mission list'],
      ['Toca el círculo para completarla. La letra (C, B, A, S, ÉPICA) es su dificultad: más difícil, más XP y oro. Las que tienen fecha de hoy cuentan para tu ELO.', 'Tap the circle to complete one. The letter (C, B, A, S, EPIC) is its difficulty: harder means more XP and gold. Tasks due today count for your ELO.']),
  ],
  habits: [
    explain('habits-header', 'HABITS', '[data-tour="habits-header"]',
      ['Protocolos y vicios', 'Protocols & vices'],
      ['Los protocolos son hábitos que quieres construir; los vicios, hábitos que quieres destruir.', 'Protocols are habits you want to build; vices are habits you want to destroy.']),
    explain('habits-chart', 'HABITS', '[data-tour="habit-chart"]',
      ['Tu constancia', 'Your consistency'],
      ['Cada barra es un día. Mientras más alta, más hábitos cumpliste. Tu meta diaria empieza en 40 % y sube con tu racha.', 'Each bar is a day. The taller it is, the more habits you did. Your daily goal starts at 40% and grows with your streak.']),
    explain('habits-vices', 'HABITS', '[data-tour="habit-vices-tab"]',
      ['Zona de vicios', 'Vice zone'],
      ['Aquí declaras la guerra a un mal hábito y ves cuántos días llevas limpio.', 'Here you declare war on a bad habit and see how many days you have been clean.']),
  ],
  focus: [
    explain('focus-stats', 'FOCUS', '[data-tour="focus-stats"]',
      ['Tus horas de foco', 'Your focus hours'],
      ['Mira cuánto te concentraste hoy, esta semana o este mes, y en qué proyectos.', 'See how much you focused today, this week or this month, and on which projects.']),
    explain('focus-projects', 'FOCUS', '[data-tour="project-list"]',
      ['Tus proyectos', 'Your projects'],
      ['Cada tarjeta muestra la meta de HOY y tu avance (si la meta es semanal o mensual, ves solo la parte de hoy). Pulsa ▶ para empezar: cada hora con temporizador da +1 ELO.', "Each card shows TODAY's goal and your progress (weekly or monthly goals show just today's share). Press ▶ to start: every timer hour gives +1 ELO."]),
  ],
  notes: [
    explain('notes-header', 'NOTES', '[data-tour="notes-header"]',
      ['Tu segundo cerebro', 'Your second brain'],
      ['Notas con bloques, carpetas, colores y proyectos. Todo se guarda solo.', 'Notes with blocks, folders, colours and projects. Everything saves itself.']),
    explain('notes-journal', 'NOTES', '[data-tour="journal-tab-btn"]',
      ['Tu diario', 'Your journal'],
      ['Cada día puedes escribir cómo te fue y cómo te sentiste. Lo uso para tus informes y tu calendario de ánimo.', 'Each day you can write how it went and how you felt. I use it for your reports and mood calendar.']),
  ],
  routine: [
    explain('routine-header', 'ROUTINE', '[data-tour="routine-header"]',
      ['Tu rutina', 'Your routine'],
      ['Tu día ordenado por horas: hábitos, tareas y proyectos con hora. Puedes verla como lista o como calendario.', 'Your day ordered by time: habits, tasks and projects with a time. View it as a list or a calendar.']),
  ],
  store: [
    explain('store-header', 'STORE', '[data-tour="store-header"]',
      ['El mercado', 'The market'],
      ['Aquí gastas tu oro: escudos de descanso, marcos de rango y recompensas que tú mismo te pones.', 'Spend your gold here: rest shields, rank frames and rewards you set for yourself.']),
  ],
};

export const SECTION_VIEW: Record<SectionId, string> = {
  tasks: 'TASKS', habits: 'HABITS', focus: 'FOCUS', notes: 'NOTES', routine: 'ROUTINE', store: 'STORE',
};

// ── Wizard follower: explains whichever step of the real creator is open ──

type WizCopy = { title: [string, string]; body: [string, string]; todo: [string, string]; focus?: string };
const NAME_FIELD = '[data-tour="wiz-body"] .cu-bigfield, [data-tour="wiz-body"] input';

const WIZ: Record<string, Record<string, WizCopy>> = {
  task: {
    what: {
      title: ['1 · Nombre de tu tarea', '1 · Name your task'],
      body: ['Una tarea es algo concreto que haces una vez. Escríbela con un verbo para que sea clara: «Entregar informe», «Llamar a mamá». La nota de abajo es opcional: úsala para detalles.', 'A task is one concrete thing you do once. Start with a verb so it is clear: "Send report", "Call mom". The note below is optional: use it for details.'],
      todo: ['Escribe el nombre de tu tarea en el campo grande.', 'Type your task name in the big field.'], focus: NAME_FIELD,
    },
    when: {
      title: ['2 · ¿Cuándo?', '2 · When?'],
      body: ['Elige Hoy, Mañana u otra fecha. Las tareas con fecha de HOY son las que cuentan para tu ELO diario. Si además le pones hora, aparece en tu Rutina y te llega un aviso.', 'Pick Today, Tomorrow or a date. Tasks due TODAY are the ones that count for your daily ELO. Give it a time too and it shows in your Routine with a reminder.'],
      todo: ['Toca «Hoy» (o la fecha que prefieras).', 'Tap "Today" (or any date you prefer).'],
    },
    effort: {
      title: ['3 · Esfuerzo', '3 · Effort'],
      body: ['La dificultad decide la recompensa: Básico es rápida y da poco; Difícil y Épico dan mucha más XP y oro. Ajusta también cuánto crees que tardarás.', 'Difficulty sets the reward: Basic is quick and gives little; Hard and Epic give much more XP and gold. Also adjust how long you think it will take.'],
      todo: ['Elige la dificultad que mejor describa tu tarea.', 'Pick the difficulty that best fits your task.'],
    },
    organize: {
      title: ['4 · Organízala', '4 · Organise it'],
      body: ['Cada tarea entrena un rasgo (Disciplina, Intelecto…) y sube esa barra en tu perfil. Si pertenece a un proyecto, elígelo para que quede dentro de él.', 'Every task trains a trait (Discipline, Intellect…) and raises that bar on your profile. If it belongs to a project, pick it so it lives inside it.'],
      todo: ['Elige el rasgo que entrena (y el proyecto, si quieres).', 'Pick the trait it trains (and the project, if you want).'],
    },
  },
  habit: {
    what: {
      title: ['1 · Tu hábito', '1 · Your habit'],
      body: ['Un hábito es algo que repites. Ponle un nombre corto y claro, como «Leer 10 min», y elige el rasgo que fortalece: ese rasgo sube cada vez que lo cumples.', 'A habit is something you repeat. Give it a short, clear name like "Read 10 min" and pick the trait it strengthens: that trait grows every time you do it.'],
      todo: ['Escribe el nombre de tu hábito en el campo grande.', 'Type your habit name in the big field.'], focus: NAME_FIELD,
    },
    when: {
      title: ['2 · Frecuencia', '2 · Frequency'],
      body: ['Todos los días, ciertos días de la semana o X veces por semana. Solo los días que te toca cuentan para tu meta de hábitos y para tu racha, así que no te castigo en días libres.', 'Every day, certain weekdays or X times a week. Only due days count for your habit goal and streak, so I never punish you on off days.'],
      todo: ['Elige cada cuánto quieres hacerlo.', 'Choose how often you want to do it.'],
    },
    how: {
      title: ['3 · Cómo se cumple', '3 · How it counts'],
      body: ['Sí/No (lo hiciste o no), una cantidad (8 vasos de agua) o una lista de pasos. Define también su importancia: los hábitos importantes pesan más en tu puntaje.', 'Yes/No (you did it or not), an amount (8 glasses of water) or a checklist. Also set its importance: important habits weigh more in your score.'],
      todo: ['Elige cómo se marca como cumplido y su importancia.', 'Choose how it is checked off and its importance.'],
    },
    remind: {
      title: ['4 · Recordatorio', '4 · Reminder'],
      body: ['Pon una hora y te aviso. Es opcional, pero un hábito con recordatorio se cumple muchísimo más. Aparecerá también en tu Rutina a esa hora.', 'Set a time and I will remind you. Optional, but a habit with a reminder gets done far more often. It also shows in your Routine at that time.'],
      todo: ['Elige una hora (o déjalo sin hora) y toca el botón final.', 'Pick a time (or leave it off) and tap the final button.'],
    },
  },
  project: {
    what: {
      title: ['1 · Tu proyecto', '1 · Your project'],
      body: ['Un proyecto es algo grande que avanzas poco a poco con sesiones de foco: «Tesis», «Mi app», «Inglés». Cada hora de foco te da +1 ELO.', 'A project is something big you move forward bit by bit with focus sessions: "Thesis", "My app", "English". Every focus hour gives +1 ELO.'],
      todo: ['Escribe el nombre de tu proyecto en el campo grande.', 'Type your project name in the big field.'], focus: NAME_FIELD,
    },
    goal: {
      title: ['2 · Tu meta de tiempo', '2 · Your time goal'],
      body: ['Diaria, semanal o mensual. Yo la reparto entre tus días: esa parte es tu meta de foco de HOY. Si no la cumples con el temporizador, pierdes 2 de ELO.', "Daily, weekly or monthly. I split it across your days: that share is TODAY's focus goal. Miss it with the timer and you lose 2 ELO."],
      todo: ['Elige cuánto tiempo quieres dedicarle.', 'Choose how much time you want to give it.'],
    },
    focus: {
      title: ['3 · Tus sesiones', '3 · Your sessions'],
      body: ['Cuánto dura cada bloque de trabajo y cuánto su descanso (técnica Pomodoro). 25 min de trabajo y 5 de descanso es un buen punto de partida.', 'How long each work block and its break last (Pomodoro technique). 25 min work and 5 min rest is a good starting point.'],
      todo: ['Ajusta la duración del bloque y del descanso.', 'Adjust the work block and break length.'],
    },
    remind: {
      title: ['4 · Recordatorio', '4 · Reminder'],
      body: ['Una alarma para empezar a tiempo cada día. Es opcional. Al terminar, toca el botón final para crear el proyecto.', 'An alarm to start on time every day. Optional. When done, tap the final button to create the project.'],
      todo: ['Pon la alarma si quieres y toca el botón final.', 'Set the alarm if you like and tap the final button.'],
    },
  },
};

const KIND_NAME: Record<string, [string, string]> = {
  task: ['tarea', 'task'], habit: ['hábito', 'habit'], project: ['proyecto', 'project'],
};

const wizardFrame = (kind: string, L: Lang, api: RunnerApi): Frame | null => {
  const w = readWizard();
  if (w && !w.closing && w.kind === kind) {
    api.ctx.sawWizard = true;
    api.ctx.lostAt = 0;
    if (w.sub) {
      return { target: '.cu-subsheet', title: x(L, 'Elige una opción', 'Pick an option'), body: x(L, 'Se abrió una lista con las opciones de este campo.', 'A list with the options for this field just opened.'), todo: x(L, 'Toca la que quieras y luego «Listo» arriba a la derecha.', 'Tap the one you want, then "Done" at the top right.'), placement: 'top', block: false, next: false, mood: 'point', group: `${kind}:${w.step}` };
    }
    const copy = WIZ[kind]?.[w.step];
    const name = x(L, ...KIND_NAME[kind]);
    const todo = !w.valid
      ? (copy ? x(L, ...copy.todo) : x(L, 'Completa este paso para poder seguir.', 'Fill in this step to continue.'))
      : w.last
        ? x(L, `Todo listo. Toca el botón de abajo para crear tu ${name}.`, `All set. Tap the button below to create your ${name}.`)
        : x(L, 'Perfecto. Toca «Siguiente» (brilla abajo) para pasar al próximo paso.', 'Perfect. Tap "Next" (it glows below) to go to the next step.');
    return {
      target: !w.valid && copy?.focus ? copy.focus : '[data-tour="wiz-body"]',
      secondary: w.valid ? '[data-tour="wiz-cta"]' : null,
      title: copy ? x(L, ...copy.title) : x(L, 'Sigue así', 'Keep going'),
      body: copy ? x(L, ...copy.body) : '',
      todo,
      placement: 'top', block: false, next: false, pad: 6, mood: 'point', group: `${kind}:${w.step}`,
    };
  }
  return null;
};

const createSteps = (kind: 'task' | 'habit' | 'project'): Step[] => {
  const view = kind === 'task' ? 'TASKS' : kind === 'habit' ? 'HABITS' : 'FOCUS';
  const open = kind === 'task' ? 'open-quest-modal' : kind === 'habit' ? 'open-habit-modal' : 'open-project-modal';
  return [
    {
      id: 'intro', view,
      frame: L => ({
        title: kind === 'task' ? x(L, 'Creemos una tarea juntos', "Let's create a task together") : kind === 'habit' ? x(L, 'Creemos un hábito juntos', "Let's create a habit together") : x(L, 'Creemos un proyecto juntos', "Let's create a project together"),
        body: x(L, 'Voy a abrir el creador real. Tú escribes y eliges; yo te explico cada paso y te señalo dónde tocar.', 'I will open the real creator. You type and choose; I explain each step and point where to tap.'),
        placement: 'center', next: x(L, 'Abrir el creador', 'Open the creator'), block: true, mood: 'talk',
      }),
    },
    {
      id: 'wizard',
      enter: api => { api.ctx.created = false; api.ctx.sawWizard = false; dispatch(open); },
      event: 'lux:created',
      onEvent: e => (e as CustomEvent).detail?.kind === kind,
      frame: (L, api) => {
        const f = wizardFrame(kind, L, api);
        if (f) return f;
        if (!api.ctx.sawWizard) return null; // still opening
        // Closed without saving: wait a moment (the save event may be on its way).
        const now = Date.now();
        if (!api.ctx.lostAt) api.ctx.lostAt = now;
        if (now - (api.ctx.lostAt as number) < 700) return null;
        return {
          title: x(L, 'Cerraste el creador', 'You closed the creator'),
          body: x(L, 'No pasa nada. ¿Lo intentamos otra vez? Estaré a tu lado en cada paso.', 'No problem. Shall we try again? I will be with you every step.'),
          placement: 'center', next: false, block: true, mood: 'think',
          actions: [
            { label: x(L, 'Intentar de nuevo', 'Try again'), primary: true, icon: 'retry', run: a => a.goto('wizard') },
            { label: x(L, 'Más tarde', 'Later'), icon: 'later', run: a => a.close() },
          ],
        };
      },
    },
    {
      id: 'done', view,
      enter: () => { createdWithMonitor.add(kind); },
      frame: L => ({
        target: kind === 'task' ? '[data-tour="task-list"]' : kind === 'habit' ? '[data-tour="habits-header"]' : '[data-tour="project-list"]',
        title: x(L, '¡Lo lograste!', 'You did it!'),
        body: kind === 'task'
          ? x(L, 'Tu tarea ya está en tu lista. Complétala tocando su círculo y gana XP, oro y ELO si es de hoy.', 'Your task is on your list. Tap its circle to complete it and earn XP, gold and ELO if it is due today.')
          : kind === 'habit'
            ? x(L, 'Tu hábito ya está activo. Márcalo cada día que lo cumplas para subir tu racha y tu ELO.', 'Your habit is live. Check it every day you do it to grow your streak and ELO.')
            : x(L, 'Tu proyecto está listo. Pulsa ▶ en su tarjeta para tu primera sesión de foco.', 'Your project is ready. Press ▶ on its card for your first focus session.'),
        next: x(L, 'Siguiente', 'Next'), block: true, mood: 'happy',
      }),
    },
    whatNextStep(view),
  ];
};

/** After creating something: offer the other creators again; what is done is greyed out. */
const whatNextStep = (view?: string): Step => ({
  id: 'what-next', view,
  frame: L => ({
    title: x(L, '¿Qué quieres crear ahora?', 'What do you want to create now?'),
    body: x(L, 'Sigamos armando tu sistema. Elige lo siguiente y te guío igual que antes.', "Let's keep building your system. Pick the next one and I will guide you like before."),
    placement: 'center', next: false, block: true, mood: 'happy', actions: createActions(L),
  }),
});

const noteSteps = (): Step[] => [
  {
    id: 'intro', view: 'NOTES',
    enter: () => dispatch('monitor:notes-subview', { sub: 'NOTES' }),
    frame: L => ({ title: x(L, 'Creemos una nota', "Let's create a note"), body: x(L, 'Te enseño a capturar una idea en segundos, con la app real.', 'I will show you how to capture an idea in seconds, in the real app.'), placement: 'center', next: x(L, 'Empezar', 'Start'), block: true, mood: 'talk' }),
  },
  {
    id: 'fab', view: 'NOTES',
    until: () => !!readEditor(),
    frame: L => ({ target: '[data-tour="notes-fab"]', title: x(L, 'Toca aquí', 'Tap here'), body: x(L, 'Este botón redondo crea una nota nueva en blanco. Se abrirá el editor.', 'This round button creates a new blank note. The editor will open.'), todo: x(L, 'Toca el botón que brilla.', 'Tap the glowing button.'), tap: true, block: true, next: false, mood: 'point' }),
  },
  {
    id: 'title',
    until: () => inputValue('[data-tour="ed-title"]').length > 0,
    frame: L => ({ target: '[data-tour="ed-title"]', title: x(L, 'Ponle un título', 'Give it a title'), body: x(L, 'El título es lo que verás en tu lista de notas, así que hazlo corto y claro: «Ideas para el viaje», «Resumen de clase»…', 'The title is what you will see in your notes list, so keep it short and clear: "Trip ideas", "Class summary"…'), todo: x(L, 'Escribe un título en el campo iluminado.', 'Type a title in the highlighted field.'), placement: 'bottom', block: false, next: x(L, 'Saltar', 'Skip'), mood: 'point' }),
  },
  {
    id: 'body',
    frame: (L) => ({ target: '[data-tour="ed-body"]', title: x(L, 'Escribe tu idea', 'Write your idea'), body: x(L, 'Este es el cuerpo de la nota. Escribe libremente; con la barra de abajo puedes añadir listas, títulos, imágenes y más.', 'This is the body of the note. Write freely; with the toolbar below you can add lists, headings, images and more.'), todo: editorHasText() ? x(L, '¡Bien! Cuando termines toca «Siguiente».', 'Nice! When you finish, tap "Next".') : x(L, 'Toca el área y escribe una o dos líneas.', 'Tap the area and write a line or two.'), placement: 'bottom', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' }),
  },
  {
    id: 'tools',
    frame: L => ({ target: '[data-tour="ed-tools"]', title: x(L, 'Tus herramientas', 'Your tools'), body: x(L, 'Aquí tienes deshacer, plantillas, el color y el proyecto de la nota, e información. No necesitas guardar a mano: todo se guarda solo mientras escribes.', 'Here you have undo, templates, the note colour and project, and info. You never need to save by hand: everything saves itself as you write.'), placement: 'bottom', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' }),
  },
  {
    id: 'save',
    until: () => !readEditor(),
    frame: L => ({ target: '[data-tour="ed-done"]', title: x(L, 'Ciérrala', 'Close it'), body: x(L, '«Listo» cierra el editor y te devuelve a tu lista. Tu nota ya está guardada.', '"Done" closes the editor and takes you back to your list. Your note is already saved.'), todo: x(L, 'Toca «Listo».', 'Tap "Done".'), placement: 'bottom', tap: true, block: false, next: false, mood: 'point' }),
  },
  {
    id: 'done', view: 'NOTES',
    enter: () => { createdWithMonitor.add('note'); },
    frame: L => ({ target: '[data-tour="notes-header"]', title: x(L, '¡Nota creada!', 'Note created!'), body: x(L, 'La encontrarás en tu lista. Usa el filtro y las carpetas para tenerlo todo ordenado.', 'You will find it in your list. Use filters and folders to keep things tidy.'), next: x(L, 'Siguiente', 'Next'), block: true, mood: 'happy' }),
  },
  whatNextStep('NOTES'),
];

/** The first visit to the journal asks for reminder times: explain it before going on. */
const REMINDERS = '[data-tour="journal-reminders"]';
const withReminders = (f: (L: Lang, api: RunnerApi) => Frame | null) => (L: Lang, api: RunnerApi): Frame | null =>
  findVisible(REMINDERS)
    ? { target: REMINDERS, title: x(L, 'Primero, tus recordatorios', 'First, your reminders'), body: x(L, 'La primera vez, el diario te pregunta a qué hora quieres que te avise para escribir. Es opcional.', 'The first time, the journal asks when you want to be reminded to write. It is optional.'), todo: x(L, 'Elige una hora y toca «Guardar», o toca «Ahora no». Luego seguimos.', 'Pick a time and tap "Save", or tap "Not now". Then we continue.'), placement: 'top', block: false, next: false, mood: 'point' }
    : f(L, api);

const journalSteps = (): Step[] => [
  {
    id: 'intro', view: 'NOTES',
    enter: () => dispatch('monitor:notes-subview', { sub: 'JOURNAL' }),
    frame: L => ({ title: x(L, 'Escribamos tu diario de hoy', "Let's write today's journal"), body: x(L, 'Dos minutos al día para ordenar la mente. Yo te guío.', 'Two minutes a day to clear your mind. I will guide you.'), placement: 'center', next: x(L, 'Empezar', 'Start'), block: true, mood: 'talk' }),
  },
  {
    id: 'today', view: 'NOTES',
    enter: () => dispatch('monitor:notes-subview', { sub: 'JOURNAL' }),
    until: () => readEditor()?.mode === 'JOURNAL',
    frame: L => ({ target: '[data-tour="journal-today-btn"]', title: x(L, 'Este es tu día de hoy', 'This is your today'), body: x(L, 'Cada día tiene su propia página en el diario. Este botón te lleva a la de hoy. Toca «Abrir hoy» y la abro por ti.', 'Every day has its own journal page. This button takes you to today. Tap "Open today" and I open it for you.'), next: x(L, 'Abrir hoy', 'Open today'), onNext: () => dispatch('monitor:open-journal-today'), block: true, mood: 'point' }),
  },
  {
    id: 'mood',
    until: () => !findVisible(REMINDERS) && !!document.querySelector('[data-tour="ed-mood"] [aria-pressed="true"]'),
    frame: withReminders(L => ({ target: '[data-tour="ed-mood"]', title: x(L, '¿Cómo te sientes?', 'How do you feel?'), body: x(L, 'Cada cara es un estado de ánimo. Con lo que elijas pinto el día en tu calendario de ánimo y lo uso en tus informes.', 'Every face is a mood. What you pick colours the day in your mood calendar and feeds your reports.'), todo: x(L, 'Toca la cara que mejor describa tu día.', 'Tap the face that best fits your day.'), placement: 'bottom', block: false, next: x(L, 'Saltar', 'Skip'), mood: 'point' })),
  },
  {
    id: 'write',
    frame: withReminders(L => ({ target: '[data-tour="ed-body"]', title: x(L, 'Cuéntame tu día', 'Tell me about your day'), body: x(L, 'Tres preguntas que ayudan: ¿Qué salió bien? ¿Qué aprendiste? ¿Qué harás mejor mañana? No tiene que ser largo.', 'Three helpful questions: What went well? What did you learn? What will you do better tomorrow? It does not have to be long.'), todo: editorHasText() ? x(L, '¡Perfecto! Toca «Siguiente» cuando termines.', 'Perfect! Tap "Next" when you finish.') : x(L, 'Toca el área y escribe cómo te fue hoy.', 'Tap the area and write how your day went.'), placement: 'top', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' })),
  },
  {
    id: 'save',
    until: () => !readEditor(),
    frame: L => ({ target: '[data-tour="ed-done"]', title: x(L, 'Ciérralo', 'Close it'), body: x(L, '«Listo» cierra la página. Tu entrada ya quedó guardada en el calendario del diario.', '"Done" closes the page. Your entry is already saved in the journal calendar.'), todo: x(L, 'Toca «Listo».', 'Tap "Done".'), placement: 'bottom', tap: true, block: false, next: false, mood: 'point' }),
  },
  {
    id: 'done', view: 'NOTES',
    enter: () => { createdWithMonitor.add('journal'); },
    frame: L => ({ target: '[data-tour="journal-tab-btn"]', title: x(L, '¡Diario escrito!', 'Journal written!'), body: x(L, 'Vuelve cada noche. Los días con entrada se pintan del color de tu ánimo.', 'Come back every night. Days with an entry get your mood colour.'), next: x(L, 'Siguiente', 'Next'), block: true, mood: 'happy' }),
  },
  whatNextStep('NOTES'),
];

function createActions(L: Lang): MonitorAction[] {
  const items: { kind: CreateKind; label: string; script: ScriptId }[] = [
    { kind: 'task', label: x(L, 'Una tarea', 'A task'), script: 'create-task' },
    { kind: 'habit', label: x(L, 'Un hábito', 'A habit'), script: 'create-habit' },
    { kind: 'project', label: x(L, 'Un proyecto', 'A project'), script: 'create-project' },
    { kind: 'note', label: x(L, 'Una nota', 'A note'), script: 'create-note' },
    { kind: 'journal', label: x(L, 'Mi diario', 'My journal'), script: 'create-journal' },
  ];
  const firstOpen = items.find(i => !createdWithMonitor.has(i.kind))?.kind;
  return [
    ...items.map(i => ({
      label: i.label,
      icon: i.kind,
      primary: i.kind === firstOpen,
      disabled: createdWithMonitor.has(i.kind),
      badge: createdWithMonitor.has(i.kind) ? x(L, 'Hecho', 'Done') : undefined,
      run: (a: RunnerApi) => a.run(i.script),
    })),
    { label: x(L, 'Más tarde', 'Later'), icon: 'later' as const, run: (a: RunnerApi) => a.close() },
  ];
}

const tourSteps = (): Step[] => [
  {
    id: 'hello', view: 'TASKS',
    frame: L => ({ title: x(L, 'Este es tu centro de mando', 'This is your command center'), body: x(L, 'Te llevo de la mano por cada zona. Toca «Siguiente» cuando quieras avanzar.', 'I will walk you through every zone. Tap "Next" whenever you are ready.'), placement: 'center', next: x(L, 'Vamos', "Let's go"), block: true, mood: 'talk' }),
  },
  explain('rank', 'TASKS', '[data-tour="rank-badge"]',
    ['Tu rango y tu ELO', 'Your rank and ELO'],
    ['Este escudo es tu rango. Hay 8 rangos, de Bronce a Leyenda, y subes ganando ELO con tus hábitos, tareas y foco. El número de abajo es el ELO de hoy. Tócalo cuando quieras y te diré cómo ganar más.', 'This shield is your rank. There are 8 ranks, from Bronze to Legend, and you climb by earning ELO with your habits, tasks and focus. The number below is today’s ELO. Tap it anytime and I will tell you how to earn more.'], { pad: 4, showcase: 'ranks', placement: 'bottom' }),
  explain('xp', 'TASKS', '[data-tour="xp-counter"]',
    ['Experiencia', 'Experience'],
    ['Todo lo que completas da XP y te sube de nivel. La XP nunca baja.', 'Everything you complete gives XP and levels you up. XP never goes down.']),
  explain('gold', 'TASKS', '[data-tour="gold-counter"]',
    ['Tu oro', 'Your gold'],
    ['La moneda de la tienda. La ganas completando misiones.', 'The store currency. You earn it by completing missions.']),
  explain('dock', 'TASKS', '[data-tour="dock"]',
    ['Tu barra de navegación', 'Your navigation bar'],
    ['Desde aquí saltas entre zonas: tareas, hábitos, foco, notas… El botón + del centro crea cualquier cosa.', 'Jump between zones from here: tasks, habits, focus, notes… The + in the middle creates anything.'], { pad: 6 }),
  ...SECTION_STEPS.tasks,
  ...SECTION_STEPS.habits,
  ...SECTION_STEPS.focus,
  ...SECTION_STEPS.notes,
  ...SECTION_STEPS.routine,
  ...SECTION_STEPS.store,
  explain('bulb', 'TASKS', '[data-tour="monitor-bulb"]',
    ['Siempre estoy aquí', 'I am always here'],
    ['En cada zona verás esta bombilla. Tócala y te ayudo a crear algo paso a paso, o te muestro capturas reales con cada parte explicada.', 'Every zone has this lightbulb. Tap it and I help you create something step by step, or show you real screenshots with every part explained.'], { pad: 6 }),
  {
    id: 'finale', view: 'TASKS',
    frame: L => ({
      title: x(L, '¿Creamos algo juntos ahora?', 'Shall we create something now?'),
      body: x(L, 'Elige y te guío con la app real, paso a paso. Lo mejor es empezar por una tarea de hoy.', 'Pick one and I will guide you in the real app, step by step. A task for today is the best start.'),
      placement: 'center', next: false, block: true, mood: 'happy', actions: createActions(L),
    }),
  },
];

const liveSteps = (section: SectionId): Step[] => [
  ...SECTION_STEPS[section],
  {
    id: 'live-end', view: SECTION_VIEW[section],
    frame: L => ({
      title: x(L, '¿Lo probamos?', 'Shall we try it?'),
      body: x(L, 'Ya conoces esta zona. ¿Creamos algo aquí mismo, paso a paso?', 'Now you know this zone. Shall we create something right here, step by step?'),
      placement: 'center', next: false, block: true, mood: 'happy',
      actions: [
        ...(section === 'tasks' ? [{ label: x(L, 'Crear una tarea', 'Create a task'), primary: true, icon: 'task' as const, run: (a: RunnerApi) => a.run('create-task') }] : []),
        ...(section === 'habits' ? [{ label: x(L, 'Crear un hábito', 'Create a habit'), primary: true, icon: 'habit' as const, run: (a: RunnerApi) => a.run('create-habit') }] : []),
        ...(section === 'focus' ? [{ label: x(L, 'Crear un proyecto', 'Create a project'), primary: true, icon: 'project' as const, run: (a: RunnerApi) => a.run('create-project') }] : []),
        ...(section === 'notes' ? [
          { label: x(L, 'Crear una nota', 'Create a note'), primary: true, icon: 'note' as const, run: (a: RunnerApi) => a.run('create-note') },
          { label: x(L, 'Escribir mi diario', 'Write my journal'), icon: 'journal' as const, run: (a: RunnerApi) => a.run('create-journal') },
        ] : []),
        { label: x(L, 'Cerrar', 'Close'), icon: 'later' as const, run: (a: RunnerApi) => a.close() },
      ],
    }),
  },
];

export const getScript = (id: ScriptId): Step[] => {
  switch (id) {
    case 'tour': return tourSteps();
    case 'create-task': return createSteps('task');
    case 'create-habit': return createSteps('habit');
    case 'create-project': return createSteps('project');
    case 'create-note': return noteSteps();
    case 'create-journal': return journalSteps();
    default: return liveSteps(id.replace('live-', '') as SectionId);
  }
};

