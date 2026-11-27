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

type WizCopy = { title: [string, string]; body: [string, string]; focus?: string };
const NAME_FIELD = '[data-tour="wiz-body"] .cu-bigfield, [data-tour="wiz-body"] input';

const WIZ: Record<string, Record<string, WizCopy>> = {
  task: {
    what: { title: ['1 · Nombre de tu tarea', '1 · Name your task'], body: ['Escríbela con un verbo: «Entregar informe», «Llamar a mamá». La nota de abajo es opcional.', 'Start with a verb: "Send report", "Call mom". The note below is optional.'], focus: NAME_FIELD },
    when: { title: ['2 · ¿Cuándo?', '2 · When?'], body: ['Elige Hoy, Mañana u otra fecha. Las tareas con fecha de HOY cuentan para tu ELO. Si le pones hora, aparece en tu Rutina.', 'Pick Today, Tomorrow or a date. Tasks due TODAY count for your ELO. Give it a time and it shows up in your Routine.'] },
    effort: { title: ['3 · Esfuerzo', '3 · Effort'], body: ['La dificultad decide la recompensa: Básico es rápida; Difícil y Épico dan mucha más XP y oro. Ajusta la duración si quieres.', 'Difficulty sets the reward: Basic is quick; Hard and Epic give much more XP and gold. Adjust the duration if you like.'] },
    organize: { title: ['4 · Organízala', '4 · Organise it'], body: ['Elige el rasgo que entrena (Disciplina, Intelecto…) y, si quieres, el proyecto al que pertenece.', 'Pick the trait it trains (Discipline, Intellect…) and, optionally, the project it belongs to.'] },
  },
  habit: {
    what: { title: ['1 · Tu hábito', '1 · Your habit'], body: ['Ponle un nombre corto y claro, como «Leer 10 min», y elige el rasgo que fortalece.', 'Give it a short, clear name like "Read 10 min" and pick the trait it strengthens.'], focus: NAME_FIELD },
    when: { title: ['2 · Frecuencia', '2 · Frequency'], body: ['Todos los días, ciertos días o X veces por semana. Los días que te toca cuentan para tu meta de hábitos y tu racha.', 'Every day, some days or X times a week. Due days count for your habit goal and streak.'] },
    how: { title: ['3 · Cómo se cumple', '3 · How it counts'], body: ['Sí/No, una cantidad (8 vasos de agua) o una lista. Define también su importancia.', 'Yes/No, an amount (8 glasses of water) or a checklist. Also set how important it is.'] },
    remind: { title: ['4 · Recordatorio', '4 · Reminder'], body: ['Pon una hora y te aviso. Es opcional, pero sube muchísimo la constancia.', 'Set a time and I will remind you. Optional, but it boosts consistency a lot.'] },
  },
  project: {
    what: { title: ['1 · Tu proyecto', '1 · Your project'], body: ['Algo grande que avanzas con sesiones de foco: «Tesis», «Mi app», «Inglés».', 'Something big you move forward with focus sessions: "Thesis", "My app", "English".'], focus: NAME_FIELD },
    goal: { title: ['2 · Tu meta de tiempo', '2 · Your time goal'], body: ['Diaria, semanal o mensual. Yo la reparto en tus días: esa parte es tu meta de foco de HOY. Si no la cumples con el temporizador, pierdes 2 de ELO.', "Daily, weekly or monthly. I split it across your days: that share is TODAY's focus goal. Miss it with the timer and you lose 2 ELO."] },
    focus: { title: ['3 · Tus sesiones', '3 · Your sessions'], body: ['Cuánto dura cada bloque de trabajo y su descanso (técnica Pomodoro).', 'How long each work block and its break last (Pomodoro technique).'] },
    remind: { title: ['4 · Recordatorio', '4 · Reminder'], body: ['Una alarma para empezar a tiempo. Luego toca el botón final para crearlo.', 'An alarm to start on time. Then tap the final button to create it.'] },
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
      return { target: '.cu-subsheet', title: x(L, 'Elige una opción', 'Pick an option'), body: x(L, 'Toca la que quieras y luego «Listo» arriba a la derecha.', 'Tap the one you want, then "Done" at the top right.'), placement: 'top', block: false, next: false, mood: 'point' };
    }
    const copy = WIZ[kind]?.[w.step];
    const name = x(L, ...KIND_NAME[kind]);
    const tail = !w.valid
      ? x(L, ' Complétalo para poder seguir.', ' Fill it in to continue.')
      : w.last
        ? x(L, ` Cuando estés listo, toca el botón de abajo para crear tu ${name}.`, ` When ready, tap the button below to create your ${name}.`)
        : x(L, ' Cuando termines, toca «Siguiente».', ' When done, tap "Next".');
    return {
      target: !w.valid && copy?.focus ? copy.focus : '[data-tour="wiz-body"]',
      secondary: w.valid ? '[data-tour="wiz-cta"]' : null,
      title: copy ? x(L, ...copy.title) : x(L, 'Sigue así', 'Keep going'),
      body: (copy ? x(L, ...copy.body) : '') + tail,
      placement: 'top', block: false, next: false, pad: 6, mood: 'point',
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
    frame: L => ({ target: '[data-tour="notes-fab"]', title: x(L, 'Toca aquí', 'Tap here'), body: x(L, 'Este botón crea una nota nueva. Tócalo.', 'This button creates a new note. Tap it.'), tap: true, block: true, next: false, mood: 'point' }),
  },
  {
    id: 'title',
    until: () => inputValue('[data-tour="ed-title"]').length > 0,
    frame: L => ({ target: '[data-tour="ed-title"]', title: x(L, 'Ponle un título', 'Give it a title'), body: x(L, 'Escribe de qué trata: «Ideas para el viaje», «Resumen de clase»…', 'Write what it is about: "Trip ideas", "Class summary"…'), placement: 'bottom', block: false, next: x(L, 'Saltar', 'Skip'), mood: 'point' }),
  },
  {
    id: 'body',
    frame: (L) => ({ target: '[data-tour="ed-body"]', title: x(L, 'Escribe tu idea', 'Write your idea'), body: x(L, 'Toca aquí y escribe. Puedes añadir listas, títulos, imágenes y más desde la barra.', 'Tap here and write. You can add lists, headings, images and more from the toolbar.') + (editorHasText() ? x(L, ' ¡Bien! Toca «Siguiente».', ' Nice! Tap "Next".') : ''), placement: 'bottom', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' }),
  },
  {
    id: 'tools',
    frame: L => ({ target: '[data-tour="ed-tools"]', title: x(L, 'Tus herramientas', 'Your tools'), body: x(L, 'Deshacer, plantillas, color y proyecto de la nota, e información. Todo se guarda solo.', 'Undo, templates, note colour and project, and info. Everything saves itself.'), placement: 'bottom', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' }),
  },
  {
    id: 'save',
    until: () => !readEditor(),
    frame: L => ({ target: '[data-tour="ed-done"]', title: x(L, 'Guárdala', 'Save it'), body: x(L, 'Toca «Listo» para cerrar. Tu nota queda guardada.', 'Tap "Done" to close. Your note is saved.'), placement: 'bottom', tap: true, block: false, next: false, mood: 'point' }),
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
    ? { target: REMINDERS, title: x(L, 'Primero, tus recordatorios', 'First, your reminders'), body: x(L, '¿A qué hora quieres que te avise para escribir? Elige una hora y toca «Guardar», o «Ahora no». Luego seguimos.', 'When should I remind you to write? Pick a time and tap "Save", or "Not now". Then we continue.'), placement: 'top', block: false, next: false, mood: 'point' }
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
    frame: L => ({ target: '[data-tour="journal-today-btn"]', title: x(L, 'Este es tu día de hoy', 'This is your today'), body: x(L, 'Cada día tiene su página. Abro la de hoy.', 'Every day has its page. Let me open today.'), next: x(L, 'Abrir hoy', 'Open today'), onNext: () => dispatch('monitor:open-journal-today'), block: true, mood: 'point' }),
  },
  {
    id: 'mood',
    until: () => !findVisible(REMINDERS) && !!document.querySelector('[data-tour="ed-mood"] [aria-pressed="true"]'),
    frame: withReminders(L => ({ target: '[data-tour="ed-mood"]', title: x(L, '¿Cómo te sientes?', 'How do you feel?'), body: x(L, 'Elige la cara que mejor describe tu día. Con esto armo tu calendario de ánimo.', 'Pick the face that best fits your day. I build your mood calendar from it.'), placement: 'bottom', block: false, next: x(L, 'Saltar', 'Skip'), mood: 'point' })),
  },
  {
    id: 'write',
    frame: withReminders(L => ({ target: '[data-tour="ed-body"]', title: x(L, 'Cuéntame tu día', 'Tell me about your day'), body: x(L, '¿Qué salió bien? ¿Qué aprendiste? ¿Qué harás mejor mañana? Escribe libremente.', 'What went well? What did you learn? What will you do better tomorrow? Write freely.') + (editorHasText() ? x(L, ' ¡Perfecto!', ' Perfect!') : ''), placement: 'top', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' })),
  },
  {
    id: 'save',
    until: () => !readEditor(),
    frame: L => ({ target: '[data-tour="ed-done"]', title: x(L, 'Guárdalo', 'Save it'), body: x(L, 'Toca «Listo». Tu entrada queda en el calendario del diario.', 'Tap "Done". Your entry stays in the journal calendar.'), placement: 'bottom', tap: true, block: false, next: false, mood: 'point' }),
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

