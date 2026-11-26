// The 15 super habits: identity, palette, and the whole 60-day story of each one.
// `badges[i]` / `lines[i]` line up with SUPER_MILESTONES[i] (days 2, 4, 7, 14, 21, 30, 45, 60).

import {
  Rocket, GraduationCap, Dumbbell, Languages, Droplets, MessageCircle, Apple, BookOpen, Briefcase,
  Brain, Code2, Flower2, PersonStanding, Sparkles, Cross, Coins, Zap, Heart, Leaf, Star, Lightbulb,
  Bird, Sun, Waves, type LucideIcon,
} from 'lucide-react';

export type SuperHabitId =
  | 'emprendimiento' | 'estudiar' | 'gym' | 'idiomas' | 'agua'
  | 'comunicacion' | 'alimentacion' | 'lectura' | 'trabajo' | 'iq'
  | 'programacion' | 'meditacion' | 'yoga' | 'skincare' | 'catolica';

/** Background motif drawn behind the roadmap banner and the card. */
export type BannerMotif = 'rays' | 'grid' | 'waves' | 'bubbles' | 'stripes' | 'rain';

export interface SuperHabitTheme {
  id: SuperHabitId;
  name: string;
  /** ≤ 15 characters: fits the habit title field. */
  shortName: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** Extra icons that fly out when the habit is completed. */
  particles: LucideIcon[];
  colors: { primary: string; secondary: string; deep: string };
  motif: BannerMotif;
  startLine: string;
  legendLine: string;
  /** One of these is shown as a toast when the habit is done on a non-milestone day. */
  doneLines: string[];
  badges: string[];
  lines: string[];
}

export const SUPER_HABITS: Record<SuperHabitId, SuperHabitTheme> = {
  emprendimiento: {
    id: 'emprendimiento', name: 'Emprendimiento', shortName: 'Emprendimiento',
    tagline: 'Construye algo de la nada', description: 'Cada día, un paso hacia tu propio negocio.',
    icon: Rocket, particles: [Coins, Rocket, Star], colors: { primary: '#f43f5e', secondary: '#f59e0b', deep: '#2a0a14' }, motif: 'rays',
    startLine: 'Día 1: una idea, una hora y la decisión de no soltarla.',
    legendLine: '60 días de ejecución. Ya no sueñas con fundar: fundaste.',
    doneLines: ['Otro ladrillo del imperio.', 'Hoy ejecutaste. Mañana escalas.', 'Los fundadores aparecen incluso sin ganas.'],
    badges: ['Primera Idea', 'Prototipo', 'Primer Cliente', 'Producto en Mercado', 'Flujo de Caja', 'Escalando', 'Ronda Semilla', 'Unicornio'],
    lines: [
      'La idea ya no vive solo en tu cabeza.',
      'Lo imperfecto lanzado vence a lo perfecto guardado.',
      'Alguien pagó por lo que haces. Eso es real.',
      'Dos semanas de ejecución: ya eres fundador, no soñador.',
      'Tres semanas. Los números empiezan a hablar.',
      'Un mes de tracción. Tu competencia ya te mira.',
      'Las rondas llegan a quienes no se detienen.',
      '60 días de ejecución pura. Eres un unicornio.',
    ],
  },
  estudiar: {
    id: 'estudiar', name: 'Estudiar', shortName: 'Estudiar',
    tagline: 'Aprender es una ventaja injusta', description: 'Foco, constancia y conocimiento que se acumula.',
    icon: GraduationCap, particles: [BookOpen, Lightbulb, Star], colors: { primary: '#6366f1', secondary: '#22d3ee', deep: '#0b0d2a' }, motif: 'stripes',
    startLine: 'Día 1: abre el cuaderno y empieza, aunque sea diez minutos.',
    legendLine: '60 días de estudio. Lo que sabes hoy no se parece a lo que sabías.',
    doneLines: ['Apuntes al día, mente afilada.', 'Cada sesión suma al promedio final.', 'El examen del futuro te lo agradece.'],
    badges: ['Primer Apunte', 'Marcador Fluor', 'Cuaderno Lleno', 'Dos Semanas de Foco', 'Promedio Alto', 'Mes Académico', 'Beca Completa', 'Summa Cum Laude'],
    lines: [
      'Dos días seguidos: la materia ya te suena familiar.',
      'Subrayas con propósito, no por costumbre.',
      'Una semana de estudio: el hábito ya tiene raíz.',
      'Dos semanas. Tu memoria trabaja a tu favor.',
      'Tres semanas: lo difícil empieza a sentirse fácil.',
      'Un mes entero de disciplina académica.',
      'Constancia de becado: nadie te la regala.',
      '60 días. Honores por constancia, no por suerte.',
    ],
  },
  gym: {
    id: 'gym', name: 'Gym', shortName: 'Gym',
    tagline: 'El hierro no miente', description: 'Entrena aunque no tengas ganas. Ahí se forja todo.',
    icon: Dumbbell, particles: [Dumbbell, Zap, Heart], colors: { primary: '#ef4444', secondary: '#f97316', deep: '#1c0606' }, motif: 'stripes',
    startLine: 'Día 1: la barra pesa lo mismo para todos. Levántala.',
    legendLine: '60 días de hierro. Tu cuerpo ya es otro argumento.',
    doneLines: ['Sudor pagado, músculo ganado.', 'Una serie más cerca de tu mejor versión.', 'Descansa, que el progreso se construye ahora.'],
    badges: ['Calentamiento', 'Primer Sudor', 'Pesas Arriba', 'Rutina Forjada', 'Músculo en Marcha', 'Cuerpo de Acero', 'Máquina Imparable', 'Titán'],
    lines: [
      'Ya entraste dos veces. La puerta del gym ya te conoce.',
      'El cuerpo empieza a pedirte la rutina.',
      'Una semana completa. Eso es disciplina, no motivación.',
      'Dos semanas: la técnica se vuelve instinto.',
      'Tres semanas. El espejo ya notó algo.',
      'Un mes de hierro. Tu fuerza es de verdad.',
      'Fuerza, constancia y cabeza fría. Imparable.',
      '60 días. Forjaste un titán a base de repetición.',
    ],
  },
  idiomas: {
    id: 'idiomas', name: 'Idiomas', shortName: 'Idiomas',
    tagline: 'Un idioma nuevo, un mundo nuevo', description: 'Practica a diario hasta pensar en otro idioma.',
    icon: Languages, particles: [MessageCircle, Languages, Star], colors: { primary: '#14b8a6', secondary: '#a78bfa', deep: '#041a1a' }, motif: 'bubbles',
    startLine: 'Día 1: Hello. Bonjour. Ciao. Hoy empieza tu conversación.',
    legendLine: '60 días de práctica. Ya sueñas en otro idioma.',
    doneLines: ['Well done. Très bien. ¡Muy bien!', 'Cada palabra nueva abre una puerta.', 'Practicar a diario vence al talento.'],
    badges: ['Hello / Hola', 'Primeras Frases', 'Conversador', 'Sin Subtítulos', 'Pensando en Otro Idioma', 'Acento Propio', 'Intérprete', 'Políglota'],
    lines: [
      'Ya saludas sin traducir en tu cabeza.',
      'Armas frases completas. Se nota el avance.',
      'Una semana: pides un café sin dudar.',
      'Dos semanas. Entiendes más de lo que respondes, y eso es buena señal.',
      'Empiezas a pensar directamente en el idioma.',
      'Un mes de práctica: ya tienes tu propio acento.',
      'Traduces conversaciones al vuelo. Impresionante.',
      '60 días. Eres puente entre dos mundos.',
    ],
  },
  agua: {
    id: 'agua', name: 'Agua', shortName: 'Tomar agua',
    tagline: 'Hidrátate como si importara', description: 'Tu cuerpo es agua en su mayoría. Cuídalo.',
    icon: Droplets, particles: [Droplets, Waves, Star], colors: { primary: '#0ea5e9', secondary: '#67e8f9', deep: '#031624' }, motif: 'waves',
    startLine: 'Día 1: un vaso ahora mismo. Empieza por lo simple.',
    legendLine: '60 días fluyendo. Eres océano.',
    doneLines: ['Glu glu: cuerpo agradecido.', 'Hidratado, enfocado, imparable.', 'Una gota más hacia tu meta diaria.'],
    badges: ['Primera Gota', 'Arroyo', 'Manantial', 'Río Constante', 'Cascada', 'Lago Sereno', 'Océano', 'Marea Eterna'],
    lines: [
      'Dos días: la sed ya no te sorprende.',
      'Pequeño pero constante, como un arroyo.',
      'Una semana de hidratación. Tu piel y tu mente lo notan.',
      'Dos semanas fluyendo sin parar.',
      'Tres semanas: la energía cae como cascada.',
      'Un mes de calma y constancia.',
      'Profundo, vasto, imposible de detener.',
      '60 días. Marea eterna: nada te frena.',
    ],
  },
  comunicacion: {
    id: 'comunicacion', name: 'Comunicación', shortName: 'Comunicación',
    tagline: 'Habla claro, escucha mejor', description: 'Conversa, conecta y expresa lo que piensas.',
    icon: MessageCircle, particles: [MessageCircle, Heart, Star], colors: { primary: '#ec4899', secondary: '#8b5cf6', deep: '#1f0620' }, motif: 'bubbles',
    startLine: 'Día 1: una conversación real vale más que mil likes.',
    legendLine: '60 días conectando. Tu voz ya mueve personas.',
    doneLines: ['Mensaje enviado, vínculo reforzado.', 'Hablar bien también se entrena.', 'Hoy conectaste con alguien. Eso suma.'],
    badges: ['Primer Mensaje', 'Escucha Activa', 'Voz Clara', 'Buen Oyente', 'Persuasión', 'Carisma', 'Orador', 'Líder de Palabra'],
    lines: [
      'Rompiste el hielo dos días seguidos.',
      'Escuchar de verdad es la mitad de hablar.',
      'Una semana diciendo lo que piensas, con claridad.',
      'Dos semanas: la gente te escucha con atención.',
      'Aprendes a convencer sin presionar.',
      'Un mes. Tu presencia ya se nota en la sala.',
      'Hablas y el ambiente se detiene a escucharte.',
      '60 días. Tus palabras tienen peso y dirección.',
    ],
  },
  alimentacion: {
    id: 'alimentacion', name: 'Alimentación', shortName: 'Alimentación',
    tagline: 'Comer bien es amor propio', description: 'Come con intención y siente la diferencia.',
    icon: Apple, particles: [Apple, Leaf, Heart], colors: { primary: '#84cc16', secondary: '#f97316', deep: '#0f1a04' }, motif: 'bubbles',
    startLine: 'Día 1: un plato real, sin culpa y con propósito.',
    legendLine: '60 días nutriéndote. Cocinas tu mejor versión.',
    doneLines: ['Plato limpio, energía limpia.', 'Tu cuerpo no tiene repuestos: aliméntalo bien.', 'Una decisión sana más.'],
    badges: ['Primer Plato Sano', 'Despensa Limpia', 'Hábito Verde', 'Cocina Consciente', 'Energía Real', 'Mesa Equilibrada', 'Nutrición Maestra', 'Chef de Vida'],
    lines: [
      'Dos días eligiendo bien. El primero fue el difícil.',
      'Tu despensa empieza a parecerse a tus metas.',
      'Una semana comiendo con conciencia.',
      'Dos semanas. Cocinas en vez de improvisar.',
      'Tres semanas: la energía ya no se desploma.',
      'Un mes de equilibrio. Sin dietas, con hábito.',
      'Sabes qué necesita tu cuerpo y se lo das.',
      '60 días. Tu relación con la comida cambió para siempre.',
    ],
  },
  lectura: {
    id: 'lectura', name: 'Lectura', shortName: 'Lectura',
    tagline: 'Vive mil vidas en un libro', description: 'Unas páginas al día cambian cómo piensas.',
    icon: BookOpen, particles: [BookOpen, Sparkles, Star], colors: { primary: '#d97706', secondary: '#fde68a', deep: '#1c1004' }, motif: 'stripes',
    startLine: 'Día 1: una página. Después otra. Así se termina un libro.',
    legendLine: '60 días leyendo. Tu mente ya es otra biblioteca.',
    doneLines: ['Otra página, otro mundo.', 'Leer hoy es pensar mejor mañana.', 'El marcapáginas avanza. Tú también.'],
    badges: ['Primera Página', 'Marcapáginas', 'Capítulo Cerrado', 'Libro Terminado', 'Biblioteca Propia', 'Devorador de Libros', 'Sabio de Estantería', 'Gran Bibliófilo'],
    lines: [
      'Dos días leyendo: el libro ya te espera.',
      'Dejas la marca justo donde te quedaste.',
      'Una semana de lectura. Un capítulo entero ya es tuyo.',
      'Dos semanas: terminaste tu primer libro.',
      'Tu mesa de noche ya parece una biblioteca.',
      'Un mes. Lees por placer, no por obligación.',
      'Tus ideas vienen de cien autores distintos.',
      '60 días. Tu mente es un archivo de mundos.',
    ],
  },
  trabajo: {
    id: 'trabajo', name: 'Trabajo', shortName: 'Trabajo',
    tagline: 'Constancia que se nota', description: 'Rinde, entrega y avanza en tu carrera.',
    icon: Briefcase, particles: [Briefcase, Zap, Star], colors: { primary: '#3b82f6', secondary: '#94a3b8', deep: '#07111f' }, motif: 'grid',
    startLine: 'Día 1: ficha, enfócate y entrega algo tangible.',
    legendLine: '60 días de rendimiento. Eres referente de tu equipo.',
    doneLines: ['Tarea cerrada, reputación sólida.', 'Resultados, no excusas.', 'Constancia profesional: lo que te hace crecer.'],
    badges: ['Fichaje', 'Bandeja Limpia', 'Jornada Sólida', 'Pieza Clave', 'Referente', 'Empleado del Mes', 'Ascenso Merecido', 'Director Ejecutivo'],
    lines: [
      'Dos días puntuales y enfocados.',
      'Cero pendientes olvidados. Orden mental.',
      'Una semana de trabajo sólido y sin drama.',
      'Dos semanas: tu equipo cuenta contigo.',
      'Resuelves antes de que te lo pidan.',
      'Un mes de rendimiento. Se nota en los resultados.',
      'El ascenso se gana con días como estos.',
      '60 días. Tu constancia ya es tu marca personal.',
    ],
  },
  iq: {
    id: 'iq', name: 'Mejorar IQ', shortName: 'Mejorar IQ',
    tagline: 'Entrena tu mente como un músculo', description: 'Lógica, memoria y razonamiento a diario.',
    icon: Brain, particles: [Brain, Zap, Lightbulb], colors: { primary: '#a855f7', secondary: '#22d3ee', deep: '#12062a' }, motif: 'grid',
    startLine: 'Día 1: un acertijo, una pregunta, una neurona nueva.',
    legendLine: '60 días de entrenamiento mental. Piensas distinto, piensas mejor.',
    doneLines: ['Sinapsis reforzadas.', 'Tu cerebro acaba de subir de nivel.', 'Pensar duro hoy es pensar rápido mañana.'],
    badges: ['Primera Sinapsis', 'Neuronas Activas', 'Lógica Afilada', 'Razonamiento Veloz', 'Patrones Visibles', 'Mente Analítica', 'Cerebro Expandido', 'Genio'],
    lines: [
      'Dos días y la mente ya pide más reto.',
      'Tus conexiones se vuelven más rápidas.',
      'Una semana resolviendo en vez de rendirte.',
      'Dos semanas: piensas en varios pasos a la vez.',
      'Ves patrones donde antes veías ruido.',
      'Un mes de análisis constante.',
      'Memoria, lógica y velocidad creciendo juntas.',
      '60 días. Tu cerebro ya no es el de antes.',
    ],
  },
  programacion: {
    id: 'programacion', name: 'Programación', shortName: 'Programación',
    tagline: 'Escribe código, escribe futuro', description: 'Practica, construye y despliega a diario.',
    icon: Code2, particles: [Code2, Zap, Star], colors: { primary: '#22c55e', secondary: '#4ade80', deep: '#02140a' }, motif: 'rain',
    startLine: 'Día 1: console.log("empiezo"). Y no paras.',
    legendLine: '60 días de commits. Compilas sin errores.',
    doneLines: ['Build verde. Día cerrado.', 'git push y a dormir tranquilo.', 'Un bug menos, una skill más.'],
    badges: ['Hello World', 'Primer Commit', 'Bug Aplastado', 'Pull Request', 'Build Verde', 'Deploy a Producción', 'Arquitecto de Código', 'Principal Engineer'],
    lines: [
      'Dos días y el cursor ya te conoce.',
      'Tu historial de commits empieza a hablar.',
      'Una semana. Ese bug ya no te gana.',
      'Dos semanas: tu código lo revisa un equipo.',
      'Tres semanas con la pipeline en verde.',
      'Un mes. Tu proyecto vive en producción.',
      'Diseñas sistemas, no solo funciones.',
      '60 días. Escribes código que otros admiran.',
    ],
  },
  meditacion: {
    id: 'meditacion', name: 'Meditación', shortName: 'Meditación',
    tagline: 'Silencio que ordena el ruido', description: 'Respira, observa y vuelve a ti.',
    icon: Flower2, particles: [Flower2, Sparkles, Star], colors: { primary: '#7c3aed', secondary: '#e9d5ff', deep: '#0e0624' }, motif: 'waves',
    startLine: 'Día 1: cierra los ojos y cuenta tres respiraciones.',
    legendLine: '60 días de silencio. La calma ya vive en ti.',
    doneLines: ['Mente quieta, corazón liviano.', 'Respiraste. Eso basta por hoy.', 'El ruido pasa, tú permaneces.'],
    badges: ['Primer Respiro', 'Mente Quieta', 'Silencio Interior', 'Atención Plena', 'Calma Profunda', 'Ecuanimidad', 'Presencia Total', 'Iluminación'],
    lines: [
      'Dos días respirando con intención.',
      'Los pensamientos pasan como nubes.',
      'Una semana de silencio. Se nota en tu día.',
      'Dos semanas: observas sin reaccionar.',
      'Tres semanas de calma profunda.',
      'Un mes. Nada te saca de tu centro tan fácil.',
      'Estás presente en todo lo que haces.',
      '60 días. Silencio, claridad y paz.',
    ],
  },
  yoga: {
    id: 'yoga', name: 'Yoga', shortName: 'Yoga',
    tagline: 'Cuerpo y mente, una sola cosa', description: 'Flexibilidad, equilibrio y respiración.',
    icon: PersonStanding, particles: [PersonStanding, Sun, Leaf], colors: { primary: '#fb923c', secondary: '#fda4af', deep: '#1f0d05' }, motif: 'rays',
    startLine: 'Día 1: tapete, respiración y un saludo al sol.',
    legendLine: '60 días de práctica. Tu cuerpo fluye como tu mente.',
    doneLines: ['Namasté. Práctica del día completada.', 'Más flexible por dentro y por fuera.', 'Respira, estírate y sigue.'],
    badges: ['Saludo al Sol', 'Postura Firme', 'Respiración Fluida', 'Flexibilidad', 'Equilibrio', 'Cuerpo y Mente', 'Guerrero Sereno', 'Maestro Yogui'],
    lines: [
      'Dos días saludando al sol.',
      'Tu postura ya sostiene sin temblar.',
      'Una semana: respiras y te mueves como uno.',
      'Dos semanas. Tu cuerpo llega donde antes no.',
      'Tres semanas de equilibrio estable.',
      'Un mes. Cuerpo y mente trabajan en armonía.',
      'Fuerte y sereno, como un guerrero en calma.',
      '60 días. Tu práctica ya es tu forma de vivir.',
    ],
  },
  skincare: {
    id: 'skincare', name: 'Skincare', shortName: 'Skincare',
    tagline: 'Tu piel, tu mejor carta', description: 'Limpia, hidrata, protege. Todos los días.',
    icon: Sparkles, particles: [Sparkles, Heart, Star], colors: { primary: '#f472b6', secondary: '#fbcfe8', deep: '#1f0a16' }, motif: 'bubbles',
    startLine: 'Día 1: limpiar, hidratar, proteger. Así de simple.',
    legendLine: '60 días de cuidado. Tu piel habla por ti.',
    doneLines: ['Rutina hecha, glow asegurado.', 'La constancia es el mejor sérum.', 'Tu yo del futuro te lo va a agradecer.'],
    badges: ['Rostro Limpio', 'Piel Hidratada', 'Protector Solar', 'Rutina de Noche', 'Luz Natural', 'Piel Radiante', 'Glow Constante', 'Piel de Porcelana'],
    lines: [
      'Dos días de rutina: tu piel ya lo nota.',
      'Hidratación constante, textura suave.',
      'Una semana con protector solar. Eso sí es amor propio.',
      'Dos semanas. La rutina nocturna ya es sagrada.',
      'Tres semanas: la piel respira y brilla.',
      'Un mes. El glow no es suerte, es constancia.',
      'Tu piel luce uniforme y descansada.',
      '60 días. Piel de porcelana, hábito de oro.',
    ],
  },
  catolica: {
    id: 'catolica', name: 'Religión Católica', shortName: 'Fe Católica',
    tagline: 'Fe que se vive cada día', description: 'Oración, constancia y vida interior.',
    icon: Cross, particles: [Cross, Sun, Bird], colors: { primary: '#eab308', secondary: '#f8fafc', deep: '#120e2a' }, motif: 'rays',
    startLine: 'Día 1: unos minutos de oración y el corazón en calma.',
    legendLine: '60 días de fe perseverante. Luz que se mantiene encendida.',
    doneLines: ['Paz en el alma, gratitud en el corazón.', 'Un día más en la presencia de Dios.', 'La fe se fortalece con la constancia.'],
    badges: ['Primera Oración', 'Ángelus', 'Domingo Santo', 'Rosario Constante', 'Examen de Conciencia', 'Fe Perseverante', 'Alma en Gracia', 'Corazón Consagrado'],
    lines: [
      'Dos días orando con el corazón abierto.',
      'Haces una pausa y le hablas a Dios.',
      'Una semana de vida interior. Se siente.',
      'Dos semanas rezando con constancia.',
      'Revisas el día y agradeces con humildad.',
      'Un mes de fe perseverante, sin falta.',
      'La gracia se refleja en tu calma y tu trato.',
      '60 días. Tu fe es raíz firme y luz diaria.',
    ],
  },
};

export const SUPER_HABIT_LIST: SuperHabitTheme[] = (Object.keys(SUPER_HABITS) as SuperHabitId[]).map(k => SUPER_HABITS[k]);

export const isSuperHabitId = (v: unknown): v is SuperHabitId =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(SUPER_HABITS, v);

export const getSuperTheme = (id: string | null | undefined): SuperHabitTheme | null =>
  isSuperHabitId(id) ? SUPER_HABITS[id] : null;

/** A completion toast line that rotates deterministically with the day count. */
export const pickDoneLine = (theme: SuperHabitTheme, seed: number) =>
  theme.doneLines[Math.abs(Math.floor(seed)) % theme.doneLines.length];
