// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — scripts. Each script is a list of steps run over the REAL app:
// the runner navigates, opens the real creators and reads the real DOM to know
// where the user is, so the guidance follows what they actually do.
// All copy is bilingual (es / en) and picked from the app language.
// ─────────────────────────────────────────────────────────────────────────────

import { editorHasText, findVisible, inputValue, readEditor, readWizard } from './dom';
import { monitor, type ScriptId, type SectionId } from './monitorStore';

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
  /** `pinTop`: the bubble sits at the very top of the screen (over a creator it must never cover the form). */
  placement?: 'auto' | 'top' | 'bottom' | 'center' | 'pinTop';
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
      ['Misiones', 'Missions'],
      ['Tus tareas pendientes. El número naranja son las que quedan hoy.', 'Your pending tasks. The orange number is what is left today.']),
    explain('tasks-list', 'TASKS', '[data-tour="task-list"]',
      ['Complétalas', 'Complete them'],
      ['Toca el círculo. La letra es la dificultad: más XP y oro.', 'Tap the circle. The letter is the difficulty: more XP and gold.']),
  ],
  habits: [
    explain('habits-header', 'HABITS', '[data-tour="habits-header"]',
      ['Hábitos', 'Habits'],
      ['Protocolos: lo que construyes. Vicios: lo que destruyes.', 'Protocols: what you build. Vices: what you destroy.']),
    explain('habits-chart', 'HABITS', '[data-tour="habit-chart"]',
      ['Tu constancia', 'Your consistency'],
      ['Cada barra es un día. Más alta, más hábitos cumplidos.', 'Each bar is a day. Taller means more habits done.']),
    explain('habits-vices', 'HABITS', '[data-tour="habit-vices-tab"]',
      ['Vicios', 'Vices'],
      ['Cuenta los días que llevas limpio.', 'Count the days you have been clean.']),
  ],
  focus: [
    explain('focus-stats', 'FOCUS', '[data-tour="focus-stats"]',
      ['Tu foco', 'Your focus'],
      ['Horas de hoy, la semana y el mes.', 'Hours for today, the week and the month.']),
    explain('focus-projects', 'FOCUS', '[data-tour="project-list"]',
      ['Proyectos', 'Projects'],
      ['Pulsa ▶ para empezar. Cada hora enfocado: +1 ELO.', 'Press ▶ to start. Every focused hour: +1 ELO.']),
  ],
  notes: [
    explain('notes-header', 'NOTES', '[data-tour="notes-header"]',
      ['Notas', 'Notes'],
      ['Bloques, carpetas y colores. Se guarda solo.', 'Blocks, folders and colours. Saves itself.']),
    explain('notes-journal', 'NOTES', '[data-tour="journal-tab-btn"]',
      ['Diario', 'Journal'],
      ['Escribe cómo te fue. Alimenta tus informes.', 'Write how it went. It feeds your reports.']),
  ],
  routine: [
    explain('routine-header', 'ROUTINE', '[data-tour="routine-header"]',
      ['Rutina', 'Routine'],
      ['Tu día por horas, en lista o calendario.', 'Your day by the hour, as a list or calendar.']),
  ],
  store: [
    explain('store-header', 'STORE', '[data-tour="store-header"]',
      ['Tienda', 'Store'],
      ['Gasta tu oro en escudos, marcos y premios.', 'Spend your gold on shields, frames and rewards.']),
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
    what: { title: ['1 · Nombre', '1 · Name'], body: ['Empieza con un verbo: «Llamar a mamá».', 'Start with a verb: "Call mom".'], todo: ['Escribe el nombre.', 'Type the name.'], focus: NAME_FIELD },
    when: { title: ['2 · Cuándo', '2 · When'], body: ['Las de HOY cuentan para tu ELO.', 'Tasks due TODAY count for ELO.'], todo: ['Elige una fecha.', 'Pick a date.'] },
    effort: { title: ['3 · Esfuerzo', '3 · Effort'], body: ['Más difícil, más XP y oro.', 'Harder means more XP and gold.'], todo: ['Elige la dificultad.', 'Pick the difficulty.'] },
    organize: { title: ['4 · Rasgo', '4 · Trait'], body: ['Cada tarea sube un rasgo de tu perfil.', 'Every task raises a trait on your profile.'], todo: ['Elige un rasgo.', 'Pick a trait.'] },
  },
  habit: {
    what: { title: ['1 · Hábito', '1 · Habit'], body: ['Nombre corto: «Leer 10 min». Elige el rasgo que sube.', 'Short name: "Read 10 min". Pick the trait it raises.'], todo: ['Escribe el nombre.', 'Type the name.'], focus: NAME_FIELD },
    when: { title: ['2 · Frecuencia', '2 · Frequency'], body: ['Solo los días que toca cuentan para tu racha.', 'Only due days count for your streak.'], todo: ['Elige cada cuánto.', 'Choose how often.'] },
    how: { title: ['3 · Cómo se cumple', '3 · How it counts'], body: ['Sí/No, una cantidad o una lista de pasos.', 'Yes/No, an amount or a checklist.'], todo: ['Elige el tipo.', 'Pick the type.'] },
    remind: { title: ['4 · Aviso', '4 · Reminder'], body: ['Con aviso se cumple mucho más. Es opcional.', 'With a reminder you do it far more. Optional.'], todo: ['Pon hora y termina.', 'Set a time and finish.'] },
  },
  project: {
    what: { title: ['1 · Proyecto', '1 · Project'], body: ['Algo grande que avanzas con foco: «Tesis».', 'Something big you move forward with focus: "Thesis".'], todo: ['Escribe el nombre.', 'Type the name.'], focus: NAME_FIELD },
    goal: { title: ['2 · Meta', '2 · Goal'], body: ['Se reparte por días. Si no la cumples hoy: −2 ELO.', 'Split across days. Miss it today: −2 ELO.'], todo: ['Elige el tiempo.', 'Choose the time.'] },
    focus: { title: ['3 · Sesiones', '3 · Sessions'], body: ['25 min de foco y 5 de descanso funciona bien.', '25 min focus and 5 min rest works well.'], todo: ['Ajusta foco y descanso.', 'Set focus and rest.'] },
    remind: { title: ['4 · Alarma', '4 · Alarm'], body: ['Para empezar a tiempo. Es opcional.', 'To start on time. Optional.'], todo: ['Alarma y botón final.', 'Alarm, then the final button.'] },
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
      return { target: '.cu-subsheet', title: x(L, 'Elige una opción', 'Pick an option'), body: '', todo: x(L, 'Toca una y luego «Listo».', 'Tap one, then "Done".'), placement: 'pinTop', block: false, next: false, mood: 'point', group: `${kind}:${w.step}` };
    }
    const copy = WIZ[kind]?.[w.step];
    const name = x(L, ...KIND_NAME[kind]);
    const todo = !w.valid
      ? (copy ? x(L, ...copy.todo) : x(L, 'Completa este paso.', 'Fill in this step.'))
      : w.last
        ? x(L, `Toca el botón para crear tu ${name}.`, `Tap the button to create your ${name}.`)
        : x(L, 'Bien. Toca «Siguiente».', 'Nice. Tap "Next".');
    return {
      target: !w.valid && copy?.focus ? copy.focus : '[data-tour="wiz-body"]',
      secondary: w.valid ? '[data-tour="wiz-cta"]' : null,
      title: copy ? x(L, ...copy.title) : x(L, 'Sigue así', 'Keep going'),
      body: copy ? x(L, ...copy.body) : '',
      todo,
      placement: 'pinTop', block: false, next: false, pad: 6, mood: 'point', group: `${kind}:${w.step}`,
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
        title: kind === 'task' ? x(L, 'Creemos una tarea', "Let's create a task") : kind === 'habit' ? x(L, 'Creemos un hábito', "Let's create a habit") : x(L, 'Creemos un proyecto', "Let's create a project"),
        body: x(L, 'Tú escribes. Yo te señalo cada paso.', 'You type. I point out every step.'),
        placement: 'center', next: x(L, 'Abrir', 'Open'), block: true, mood: 'talk',
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
          body: x(L, '¿Lo intentamos otra vez?', 'Shall we try again?'),
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
        title: x(L, '¡Listo!', 'Done!'),
        body: kind === 'task'
          ? x(L, 'Ya está en tu lista. Tócala para ganar XP.', 'It is on your list. Tap it to earn XP.')
          : kind === 'habit'
            ? x(L, 'Márcalo cada día para subir tu racha.', 'Check it every day to grow your streak.')
            : x(L, 'Pulsa ▶ en su tarjeta para tu primer foco.', 'Press ▶ on its card for your first focus.'),
        next: x(L, 'Siguiente', 'Next'), block: true, mood: 'happy',
      }),
    },
    whatNextStep(view),
  ];
};

/** After creating something: offer the other creators again; what is done is greyed out. */
const whatNextStep = (view?: string): Step => ({
  id: 'what-next', view,
  enter: () => monitor.markEnd(),
  frame: L => ({
    title: x(L, '¿Qué creamos ahora?', 'What next?'),
    body: x(L, 'Elige y te guío igual.', 'Pick one and I will guide you the same way.'),
    placement: 'center', next: false, block: true, mood: 'happy', actions: createActions(L),
  }),
});

const noteSteps = (): Step[] => [
  {
    id: 'intro', view: 'NOTES',
    enter: () => dispatch('monitor:notes-subview', { sub: 'NOTES' }),
    frame: L => ({ title: x(L, 'Creemos una nota', "Let's create a note"), body: x(L, 'Captura una idea en segundos.', 'Capture an idea in seconds.'), placement: 'center', next: x(L, 'Empezar', 'Start'), block: true, mood: 'talk' }),
  },
  {
    id: 'fab', view: 'NOTES',
    until: () => !!readEditor(),
    frame: L => ({ target: '[data-tour="notes-fab"]', title: x(L, 'Nueva nota', 'New note'), body: '', todo: x(L, 'Toca el botón que brilla.', 'Tap the glowing button.'), tap: true, block: true, next: false, mood: 'point' }),
  },
  {
    id: 'title',
    until: () => inputValue('[data-tour="ed-title"]').length > 0,
    frame: L => ({ target: '[data-tour="ed-title"]', title: x(L, 'Título', 'Title'), body: x(L, 'Corto y claro: «Ideas del viaje».', 'Short and clear: "Trip ideas".'), todo: x(L, 'Escribe un título.', 'Type a title.'), placement: 'bottom', block: false, next: x(L, 'Saltar', 'Skip'), mood: 'point' }),
  },
  {
    id: 'body',
    frame: (L) => ({ target: '[data-tour="ed-body"]', title: x(L, 'Tu idea', 'Your idea'), body: x(L, 'Escribe libre. La barra de abajo añade listas e imágenes.', 'Write freely. The toolbar below adds lists and images.'), todo: editorHasText() ? x(L, 'Bien. Toca «Siguiente».', 'Nice. Tap "Next".') : x(L, 'Escribe una línea.', 'Write a line.'), placement: 'bottom', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' }),
  },
  {
    id: 'tools',
    frame: L => ({ target: '[data-tour="ed-tools"]', title: x(L, 'Herramientas', 'Tools'), body: x(L, 'Deshacer, plantillas, color y proyecto. Se guarda solo.', 'Undo, templates, colour and project. Saves itself.'), placement: 'bottom', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' }),
  },
  {
    id: 'save',
    until: () => !readEditor(),
    frame: L => ({ target: '[data-tour="ed-done"]', title: x(L, 'Ciérrala', 'Close it'), body: x(L, 'Ya está guardada.', 'It is already saved.'), todo: x(L, 'Toca «Listo».', 'Tap "Done".'), placement: 'bottom', tap: true, block: false, next: false, mood: 'point' }),
  },
  {
    id: 'done', view: 'NOTES',
    enter: () => { createdWithMonitor.add('note'); },
    frame: L => ({ target: '[data-tour="notes-header"]', title: x(L, '¡Nota creada!', 'Note created!'), body: x(L, 'Ordénalas con filtros y carpetas.', 'Keep them tidy with filters and folders.'), next: x(L, 'Siguiente', 'Next'), block: true, mood: 'happy' }),
  },
  whatNextStep('NOTES'),
];

/** The first visit to the journal asks for reminder times: explain it before going on. */
const REMINDERS = '[data-tour="journal-reminders"]';
const withReminders = (f: (L: Lang, api: RunnerApi) => Frame | null) => (L: Lang, api: RunnerApi): Frame | null =>
  findVisible(REMINDERS)
    ? { target: REMINDERS, title: x(L, 'Tus avisos', 'Your reminders'), body: x(L, 'Elige cuándo avisarte. Es opcional.', 'Choose when to remind you. Optional.'), todo: x(L, '«Guardar» o «Ahora no».', '"Save" or "Not now".'), placement: 'top', block: false, next: false, mood: 'point' }
    : f(L, api);

const journalSteps = (): Step[] => [
  {
    id: 'intro', view: 'NOTES',
    enter: () => dispatch('monitor:notes-subview', { sub: 'JOURNAL' }),
    frame: L => ({ title: x(L, 'Tu diario de hoy', "Today's journal"), body: x(L, 'Dos minutos para ordenar la mente.', 'Two minutes to clear your mind.'), placement: 'center', next: x(L, 'Empezar', 'Start'), block: true, mood: 'talk' }),
  },
  {
    id: 'today', view: 'NOTES',
    enter: () => dispatch('monitor:notes-subview', { sub: 'JOURNAL' }),
    until: () => readEditor()?.mode === 'JOURNAL',
    frame: L => ({ target: '[data-tour="journal-today-btn"]', title: x(L, 'Hoy', 'Today'), body: x(L, 'Cada día tiene su página.', 'Every day has its own page.'), next: x(L, 'Abrir hoy', 'Open today'), onNext: () => dispatch('monitor:open-journal-today'), block: true, mood: 'point' }),
  },
  {
    id: 'mood',
    until: () => !findVisible(REMINDERS) && !!document.querySelector('[data-tour="ed-mood"] [aria-pressed="true"]'),
    frame: withReminders(L => ({ target: '[data-tour="ed-mood"]', title: x(L, '¿Cómo te sientes?', 'How do you feel?'), body: x(L, 'Pinta el día en tu calendario de ánimo.', 'It colours the day in your mood calendar.'), todo: x(L, 'Toca una cara.', 'Tap a face.'), placement: 'bottom', block: false, next: x(L, 'Saltar', 'Skip'), mood: 'point' })),
  },
  {
    id: 'write',
    frame: withReminders(L => ({ target: '[data-tour="ed-body"]', title: x(L, 'Tu día', 'Your day'), body: x(L, '¿Qué salió bien? ¿Qué mejorarás mañana?', 'What went well? What will you improve tomorrow?'), todo: editorHasText() ? x(L, 'Bien. Toca «Siguiente».', 'Nice. Tap "Next".') : x(L, 'Escribe cómo te fue.', 'Write how it went.'), placement: 'top', block: false, next: x(L, 'Siguiente', 'Next'), mood: 'point' })),
  },
  {
    id: 'save',
    until: () => !readEditor(),
    frame: L => ({ target: '[data-tour="ed-done"]', title: x(L, 'Ciérralo', 'Close it'), body: x(L, 'Tu entrada ya está guardada.', 'Your entry is already saved.'), todo: x(L, 'Toca «Listo».', 'Tap "Done".'), placement: 'bottom', tap: true, block: false, next: false, mood: 'point' }),
  },
  {
    id: 'done', view: 'NOTES',
    enter: () => { createdWithMonitor.add('journal'); },
    frame: L => ({ target: '[data-tour="journal-tab-btn"]', title: x(L, '¡Diario escrito!', 'Journal written!'), body: x(L, 'Vuelve cada noche.', 'Come back every night.'), next: x(L, 'Siguiente', 'Next'), block: true, mood: 'happy' }),
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
    frame: L => ({ title: x(L, 'Tu centro de mando', 'Your command center'), body: x(L, 'Te enseño cada zona en un minuto.', 'I show you every zone in a minute.'), placement: 'center', next: x(L, 'Vamos', "Let's go"), block: true, mood: 'talk' }),
  },
  explain('rank', 'TASKS', '[data-tour="rank-badge"]',
    ['Tu rango', 'Your rank'],
    ['Sube de Bronce a Leyenda ganando ELO.', 'Climb from Bronze to Legend by earning ELO.'], { pad: 4, showcase: 'ranks', placement: 'bottom' }),
  explain('xp', 'TASKS', '[data-tour="xp-counter"]',
    ['Experiencia', 'Experience'],
    ['Todo da XP. Nunca baja.', 'Everything gives XP. It never drops.']),
  explain('gold', 'TASKS', '[data-tour="gold-counter"]',
    ['Tu oro', 'Your gold'],
    ['Lo ganas con misiones y lo gastas en la tienda.', 'Earn it with missions, spend it in the store.']),
  explain('dock', 'TASKS', '[data-tour="dock"]',
    ['Navegación', 'Navigation'],
    ['Cambia de zona. El + crea lo que quieras.', 'Switch zones. The + creates anything.'], { pad: 6 }),
  ...SECTION_STEPS.tasks,
  ...SECTION_STEPS.habits,
  ...SECTION_STEPS.focus,
  ...SECTION_STEPS.notes,
  ...SECTION_STEPS.routine,
  ...SECTION_STEPS.store,
  explain('bulb', 'TASKS', '[data-tour="monitor-bulb"]',
    ['Siempre aquí', 'Always here'],
    ['Toca la bombilla de cualquier zona y te explico solo esa.', 'Tap the lightbulb in any zone and I explain just that one.'], { pad: 6 }),
  {
    id: 'finale', view: 'TASKS',
    enter: () => monitor.markEnd(),
    frame: L => ({
      title: x(L, '¿Creamos algo?', 'Create something?'),
      body: x(L, 'Empieza con una tarea de hoy.', 'Start with a task for today.'),
      placement: 'center', next: false, block: true, mood: 'happy', actions: createActions(L),
    }),
  },
];

const liveSteps = (section: SectionId): Step[] => [
  ...SECTION_STEPS[section],
  {
    id: 'live-end', view: SECTION_VIEW[section],
    frame: L => ({
      title: x(L, '¿Lo probamos?', 'Try it?'),
      body: x(L, 'Creamos algo aquí mismo.', 'Let us create something right here.'),
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

