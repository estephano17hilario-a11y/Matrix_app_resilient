// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — visual tour content. Each slide is a REAL screenshot of the app
// (public/tutorial/<lang>/<slide>.jpg, captured from the running app by
// scripts/capture-tutorial) and each spot is an anchor whose box was measured
// on that same screen (gallery.manifest.json). Copy is bilingual.
// ─────────────────────────────────────────────────────────────────────────────

import type { SectionId } from './monitorStore';

export interface SpotDef { id: string; sel: string; title: [string, string]; text: [string, string] }
export interface SlideDef { id: string; title: [string, string]; spots: SpotDef[] }

export const GALLERY: Record<SectionId, SlideDef[]> = {
  tasks: [
    {
      id: 'tasks-home', title: ['Tu pantalla principal', 'Your home screen'],
      spots: [
        { id: 'rank', sel: '[data-tour="rank-badge"]', title: ['Rango y ELO de hoy', "Rank and today's ELO"], text: ['Tu insignia de rango. El número de abajo es el ELO que ganas o pierdes hoy. Tócala para ver cómo ganar más.', 'Your rank insignia. The number below is the ELO you are winning or losing today. Tap it to see how to earn more.'] },
        { id: 'xp', sel: '[data-tour="xp-counter"]', title: ['Experiencia', 'Experience'], text: ['Tu XP del nivel actual. Se llena completando hábitos, tareas y foco.', 'Your XP for the current level. It fills up with habits, tasks and focus.'] },
        { id: 'gold', sel: '[data-tour="gold-counter"]', title: ['Oro', 'Gold'], text: ['Lo gastas en la tienda.', 'Spend it in the store.'] },
        { id: 'header', sel: '[data-tour="tasks-header"]', title: ['Misiones activas', 'Active missions'], text: ['Filtro, contador de pendientes, esta bombilla (yo) y el + para crear rápido.', 'Filter, pending counter, this lightbulb (me) and + to create quickly.'] },
        { id: 'list', sel: '[data-tour="task-list"]', title: ['Tu lista', 'Your list'], text: ['Toca el círculo de una tarea para completarla. Las de hoy cuentan para tu ELO.', "Tap a task's circle to complete it. Today's tasks count for your ELO."] },
        { id: 'plus', sel: '[data-tour="dock-main-btn"]', title: ['Crear', 'Create'], text: ['El + del centro abre el menú para crear tareas, hábitos, proyectos y más.', 'The + in the middle opens the menu to create tasks, habits, projects and more.'] },
      ],
    },
    {
      id: 'task-wiz-1', title: ['Crear una tarea · paso 1', 'Create a task · step 1'],
      spots: [
        { id: 'bars', sel: '[data-tour="wiz"] .cu-wiz-bars', title: ['Tu avance', 'Your progress'], text: ['Son 4 pasos cortos. Esta barra te dice en cuál vas.', 'Four short steps. This bar tells you where you are.'] },
        { id: 'name', sel: '[data-tour="wiz-body"] .cu-bigfield', title: ['Nombre', 'Name'], text: ['Escribe qué harás, empezando con un verbo.', 'Write what you will do, starting with a verb.'] },
        { id: 'cta', sel: '[data-tour="wiz-cta"]', title: ['Siguiente', 'Next'], text: ['Se activa cuando el paso está completo.', 'It turns on when the step is complete.'] },
      ],
    },
    {
      id: 'task-wiz-3', title: ['Crear una tarea · esfuerzo', 'Create a task · effort'],
      spots: [
        { id: 'diff', sel: '[data-tour="wiz-body"] > *:first-child', title: ['Dificultad', 'Difficulty'], text: ['Básico, Medio, Difícil o Épico. Más difícil = más XP y oro.', 'Basic, Medium, Hard or Epic. Harder = more XP and gold.'] },
        { id: 'dur', sel: '[data-tour="wiz-body"] > *:nth-child(2)', title: ['Duración', 'Duration'], text: ['Cuánto te tomará. La usa tu Rutina.', 'How long it takes. Your Routine uses it.'] },
      ],
    },
    {
      id: 'rank-screen', title: ['Tu rango: cómo ganar ELO', 'Your rank: how to earn ELO'],
      spots: [
        { id: 'hero', sel: '.prog-root section:first-of-type', title: ['Tu rango', 'Your rank'], text: ['Rango, ELO total, lo que ganas hoy y cuánto falta para el siguiente.', 'Rank, total ELO, today\'s gain and how much is left for the next one.'] },
        { id: 'coach', sel: '[data-tour="elo-coach"]', title: ['Tu plan de ELO', 'Your ELO plan'], text: ['Te digo exactamente qué completar hoy para ganar más: tus hábitos, tareas, foco y proyectos.', 'I tell you exactly what to complete today to earn more: your habits, tasks, focus and projects.'] },
      ],
    },
  ],
  habits: [
    {
      id: 'habits-home', title: ['Tus hábitos', 'Your habits'],
      spots: [
        { id: 'header', sel: '[data-tour="habits-header"]', title: ['Protocolos y vicios', 'Protocols & vices'], text: ['Cambia entre hábitos buenos y vicios a destruir.', 'Switch between good habits and vices to destroy.'] },
        { id: 'chart', sel: '[data-tour="habit-chart"]', title: ['Constancia', 'Consistency'], text: ['Cada barra es un día: cuántos hábitos cumpliste.', 'Each bar is a day: how many habits you did.'] },
        { id: 'streak', sel: '[data-tour="habit-streak"]', title: ['Racha', 'Streak'], text: ['Días seguidos cumpliendo tu meta.', 'Days in a row meeting your goal.'] },
        { id: 'vices', sel: '[data-tour="habit-vices-tab"]', title: ['Vicios', 'Vices'], text: ['Registra lo que quieres dejar y cuenta tus días limpio.', 'Track what you want to quit and count your clean days.'] },
      ],
    },
    {
      id: 'habit-wiz-2', title: ['Crear un hábito · frecuencia', 'Create a habit · frequency'],
      spots: [
        { id: 'body', sel: '[data-tour="wiz-body"]', title: ['¿Cada cuánto?', 'How often?'], text: ['Diario, ciertos días o X veces por semana.', 'Daily, some days or X times a week.'] },
        { id: 'cta', sel: '[data-tour="wiz-cta"]', title: ['Siguiente', 'Next'], text: ['Avanza al siguiente paso.', 'Go to the next step.'] },
      ],
    },
  ],
  focus: [
    {
      id: 'focus-home', title: ['Zona de enfoque', 'Focus zone'],
      spots: [
        { id: 'stats', sel: '[data-tour="focus-stats"]', title: ['Estadísticas', 'Stats'], text: ['Tus horas de foco por día, semana o mes.', 'Your focus hours per day, week or month.'] },
        { id: 'card', sel: '[data-tour="project-list"] > *:first-child', title: ['Un proyecto', 'A project'], text: ['Muestra la meta de HOY (aunque sea semanal o mensual) y tu avance.', "Shows TODAY's goal (even if it is weekly or monthly) and your progress."] },
      ],
    },
    {
      id: 'project-wiz-2', title: ['Crear un proyecto · meta', 'Create a project · goal'],
      spots: [
        { id: 'body', sel: '[data-tour="wiz-body"]', title: ['Tu meta de tiempo', 'Your time goal'], text: ['Diaria, semanal o mensual. Se reparte en tus días y esa parte es tu meta de foco de hoy (−2 ELO si no la cumples).', "Daily, weekly or monthly. It's split across your days and that share is today's focus goal (−2 ELO if missed)."] },
        { id: 'cta', sel: '[data-tour="wiz-cta"]', title: ['Siguiente', 'Next'], text: ['Sigue al paso de sesiones.', 'On to the sessions step.'] },
      ],
    },
  ],
  notes: [
    {
      id: 'notes-home', title: ['Tus notas', 'Your notes'],
      spots: [
        { id: 'header', sel: '[data-tour="notes-header"]', title: ['Filtros y pestañas', 'Filters & tabs'], text: ['Filtra, cambia entre Notas y Diario, y abre los ajustes.', 'Filter, switch between Notes and Journal, and open settings.'] },
        { id: 'journal', sel: '[data-tour="journal-tab-btn"]', title: ['Diario', 'Journal'], text: ['Tu página de cada día.', 'Your page for every day.'] },
        { id: 'fab', sel: '[data-tour="notes-fab"]', title: ['Nueva nota', 'New note'], text: ['Crea una nota en un toque.', 'Create a note in one tap.'] },
      ],
    },
    {
      id: 'note-editor', title: ['El editor de notas', 'The note editor'],
      spots: [
        { id: 'done', sel: '[data-tour="ed-done"]', title: ['Listo', 'Done'], text: ['Cierra y guarda.', 'Close and save.'] },
        { id: 'tools', sel: '[data-tour="ed-tools"]', title: ['Herramientas', 'Tools'], text: ['Carpeta, deshacer, plantillas, color y proyecto.', 'Folder, undo, templates, colour and project.'] },
        { id: 'title', sel: '[data-tour="ed-title"]', title: ['Título', 'Title'], text: ['De qué trata la nota.', 'What the note is about.'] },
        { id: 'body', sel: '[data-tour="ed-body"]', title: ['Contenido', 'Content'], text: ['Escribe por bloques: texto, listas, imágenes…', 'Write in blocks: text, lists, images…'] },
      ],
    },
    {
      id: 'journal-editor', title: ['Tu diario de hoy', "Today's journal"],
      spots: [
        { id: 'mood', sel: '[data-tour="ed-mood"]', title: ['Ánimo', 'Mood'], text: ['Cómo te sentiste. Pinta tu calendario.', 'How you felt. It colours your calendar.'] },
        { id: 'body', sel: '[data-tour="ed-body"]', title: ['Tu día', 'Your day'], text: ['Qué salió bien, qué aprendiste, qué mejorarás.', 'What went well, what you learned, what to improve.'] },
        { id: 'done', sel: '[data-tour="ed-done"]', title: ['Guardar', 'Save'], text: ['Toca Listo al terminar.', 'Tap Done when finished.'] },
      ],
    },
  ],
  routine: [
    {
      id: 'routine-home', title: ['Tu rutina', 'Your routine'],
      spots: [
        { id: 'header', sel: '[data-tour="routine-header"] h1', title: ['Hoy', 'Today'], text: ['Tu día ordenado por hora.', 'Your day ordered by time.'] },
        { id: 'tools', sel: '[data-tour="routine-tools"]', title: ['Vista', 'View'], text: ['Lista o calendario, y ajustes de la rutina.', 'List or calendar, and routine settings.'] },
      ],
    },
  ],
  store: [
    {
      id: 'store-home', title: ['El mercado', 'The market'],
      spots: [
        { id: 'header', sel: '[data-tour="store-header"]', title: ['Tu tienda', 'Your shop'], text: ['Gasta tu oro en escudos, marcos y recompensas.', 'Spend your gold on shields, frames and rewards.'] },
      ],
    },
  ],
};
