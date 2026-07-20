export interface RivalLevel {
  level: number;
  name: string;
  title: string;
  avatar: string; // Icon identifier or emoji
  color: string;  // Hex or Tailwind color theme
  workStartHour: number; // e.g. 11 = 11:00 AM, 7 = 7:00 AM
  workStartMinute?: number;
  workEndHour: number;   // e.g. 18 = 6:00 PM, 23 = 11:00 PM
  workEndMinute?: number;
  targetTasks: number;       // Number of completed tasks to beat rival
  targetFocusMinutes: number; // Minutes of focus session to beat rival (e.g. 180 = 3h)
  targetHabitPct: number;    // % of daily habits completed (0 to 100)
  rewardGold: number;
  rewardXp: number;
  quote: string;
  difficulty: 'FÁCIL' | 'MEDIO' | 'DIFÍCIL' | 'ÉPICO' | 'LEGENDARIO' | 'DIOS';
}

export const RIVAL_LEVELS: RivalLevel[] = [
  {
    level: 1,
    name: 'Benjamin Franklin',
    title: 'El Fundador Disciplinado',
    avatar: '📜',
    color: '#3B82F6', // Blue
    workStartHour: 11,
    workEndHour: 18,
    targetTasks: 1,
    targetFocusMinutes: 180, // 3 hours
    targetHabitPct: 30,
    rewardGold: 150,
    rewardXp: 200,
    quote: 'La diligencia es la madre de la buena suerte.',
    difficulty: 'FÁCIL'
  },
  {
    level: 2,
    name: 'Thomas Edison',
    title: 'El Mago de Menlo Park',
    avatar: '💡',
    color: '#EAB308', // Yellow
    workStartHour: 10,
    workStartMinute: 30,
    workEndHour: 18,
    workEndMinute: 30,
    targetTasks: 2,
    targetFocusMinutes: 210, // 3.5h
    targetHabitPct: 35,
    rewardGold: 200,
    rewardXp: 250,
    quote: 'El genio es un 1% de inspiración y un 99% de transpiración.',
    difficulty: 'FÁCIL'
  },
  {
    level: 3,
    name: 'Isaac Newton',
    title: 'El Alquimista de la Fuerza',
    avatar: '🍎',
    color: '#10B981', // Emerald
    workStartHour: 10,
    workEndHour: 19,
    targetTasks: 2,
    targetFocusMinutes: 240, // 4h
    targetHabitPct: 40,
    rewardGold: 250,
    rewardXp: 300,
    quote: 'Lo que sabemos es una gota; lo que ignoramos es un océano.',
    difficulty: 'FÁCIL'
  },
  {
    level: 4,
    name: 'Nikola Tesla',
    title: 'El Domador del Rayo',
    avatar: '⚡',
    color: '#8B5CF6', // Purple
    workStartHour: 9,
    workStartMinute: 30,
    workEndHour: 19,
    workEndMinute: 30,
    targetTasks: 3,
    targetFocusMinutes: 270, // 4.5h
    targetHabitPct: 45,
    rewardGold: 300,
    rewardXp: 350,
    quote: 'El presente es de ellos; el futuro, por el que realmente trabajé, es mío.',
    difficulty: 'MEDIO'
  },
  {
    level: 5,
    name: 'Albert Einstein',
    title: 'El Viajero del Espaciotiempo',
    avatar: '🌌',
    color: '#06B6D4', // Cyan
    workStartHour: 9,
    workEndHour: 20,
    targetTasks: 3,
    targetFocusMinutes: 300, // 5h
    targetHabitPct: 50,
    rewardGold: 350,
    rewardXp: 400,
    quote: 'La medida de la inteligencia es la capacidad de cambiar.',
    difficulty: 'MEDIO'
  },
  {
    level: 6,
    name: 'Marie Curie',
    title: 'La Llama Radioactiva',
    avatar: '🧪',
    color: '#EC4899', // Pink
    workStartHour: 8,
    workStartMinute: 45,
    workEndHour: 20,
    workEndMinute: 15,
    targetTasks: 3,
    targetFocusMinutes: 330, // 5.5h
    targetHabitPct: 52,
    rewardGold: 400,
    rewardXp: 450,
    quote: 'Nada en la vida debe ser temido, solo debe ser comprendido.',
    difficulty: 'MEDIO'
  },
  {
    level: 7,
    name: 'Leonardo da Vinci',
    title: 'El Polímata Absoluto',
    avatar: '🎨',
    color: '#F97316', // Orange
    workStartHour: 8,
    workStartMinute: 30,
    workEndHour: 20,
    workEndMinute: 30,
    targetTasks: 4,
    targetFocusMinutes: 360, // 6h
    targetHabitPct: 55,
    rewardGold: 450,
    rewardXp: 500,
    quote: 'La simplicidad es la máxima sofisticación.',
    difficulty: 'MEDIO'
  },
  {
    level: 8,
    name: 'Miyamoto Musashi',
    title: 'El Espadachín Invicto',
    avatar: '⚔️',
    color: '#EF4444', // Red
    workStartHour: 8,
    workStartMinute: 15,
    workEndHour: 20,
    workEndMinute: 45,
    targetTasks: 4,
    targetFocusMinutes: 390, // 6.5h
    targetHabitPct: 60,
    rewardGold: 500,
    rewardXp: 550,
    quote: 'Percibe aquello que no puede ser visto a simple vista.',
    difficulty: 'DIFÍCIL'
  },
  {
    level: 9,
    name: 'Marcus Aurelius',
    title: 'El Emperador Estoico',
    avatar: '🏛️',
    color: '#D97706', // Amber
    workStartHour: 8,
    workEndHour: 21,
    targetTasks: 4,
    targetFocusMinutes: 420, // 7h
    targetHabitPct: 65,
    rewardGold: 550,
    rewardXp: 600,
    quote: 'Tienes poder sobre tu mente, no sobre los acontecimientos externos.',
    difficulty: 'DIFÍCIL'
  },
  {
    level: 10,
    name: 'Seneca',
    title: 'El Sabio del Tiempo',
    avatar: '⏳',
    color: '#6366F1', // Indigo
    workStartHour: 7,
    workStartMinute: 45,
    workEndHour: 21,
    workEndMinute: 15,
    targetTasks: 5,
    targetFocusMinutes: 450, // 7.5h
    targetHabitPct: 68,
    rewardGold: 600,
    rewardXp: 650,
    quote: 'No es que tengamos poco tiempo, sino que perdemos mucho.',
    difficulty: 'DIFÍCIL'
  },
  {
    level: 11,
    name: 'Steve Jobs',
    title: 'El Visionario Disruptivo',
    avatar: '📱',
    color: '#38BDF8', // Sky
    workStartHour: 7,
    workStartMinute: 30,
    workEndHour: 21,
    workEndMinute: 30,
    targetTasks: 5,
    targetFocusMinutes: 480, // 8h
    targetHabitPct: 70,
    rewardGold: 650,
    rewardXp: 700,
    quote: 'Tu tiempo es limitado, así que no lo malgastes viviendo la vida de otro.',
    difficulty: 'DIFÍCIL'
  },
  {
    level: 12,
    name: 'Bill Gates',
    title: 'El Arquitecto del Código',
    avatar: '💻',
    color: '#0284C7', // Blue-600
    workStartHour: 7,
    workStartMinute: 15,
    workEndHour: 21,
    workEndMinute: 45,
    targetTasks: 5,
    targetFocusMinutes: 510, // 8.5h
    targetHabitPct: 72,
    rewardGold: 700,
    rewardXp: 750,
    quote: 'La paciencia es un elemento clave del éxito.',
    difficulty: 'DIFÍCIL'
  },
  {
    level: 13,
    name: 'Jeff Bezos',
    title: 'El Impulsor del Día 1',
    avatar: '📦',
    color: '#F59E0B',
    workStartHour: 7,
    workEndHour: 22,
    targetTasks: 6,
    targetFocusMinutes: 540, // 9h
    targetHabitPct: 75,
    rewardGold: 750,
    rewardXp: 800,
    quote: 'Si estás enfocado en la competencia, tienes que esperar a que el competidor haga algo.',
    difficulty: 'ÉPICO'
  },
  {
    level: 14,
    name: 'Elon Musk',
    title: 'El Ingeniero Estelar',
    avatar: '🚀',
    color: '#E11D48', // Rose
    workStartHour: 6,
    workStartMinute: 45,
    workEndHour: 22,
    workEndMinute: 15,
    targetTasks: 6,
    targetFocusMinutes: 570, // 9.5h
    targetHabitPct: 78,
    rewardGold: 800,
    rewardXp: 850,
    quote: 'Trabaja el doble que los demás si quieres lograr el doble.',
    difficulty: 'ÉPICO'
  },
  {
    level: 15,
    name: 'Tim Cook',
    title: 'El Maestro Operativo',
    avatar: '⌚',
    color: '#64748B', // Slate
    workStartHour: 6,
    workStartMinute: 30,
    workEndHour: 22,
    workEndMinute: 30,
    targetTasks: 6,
    targetFocusMinutes: 600, // 10h
    targetHabitPct: 80,
    rewardGold: 900,
    rewardXp: 950,
    quote: 'Avanza y mantén la excelencia en cada milímetro.',
    difficulty: 'ÉPICO'
  },
  {
    level: 16,
    name: 'David Goggins',
    title: 'El Titán Imparable',
    avatar: '🔥',
    color: '#DC2626', // Red-600
    workStartHour: 6,
    workStartMinute: 15,
    workEndHour: 22,
    workEndMinute: 45,
    targetTasks: 7,
    targetFocusMinutes: 630, // 10.5h
    targetHabitPct: 82,
    rewardGold: 1000,
    rewardXp: 1050,
    quote: 'Cuando tu mente te dice que terminaste, solo estás al 40%.',
    difficulty: 'ÉPICO'
  },
  {
    level: 17,
    name: 'Kobe Bryant',
    title: 'La Mentalidad Mamba',
    avatar: '🐍',
    color: '#7C3AED', // Violet-600
    workStartHour: 6,
    workEndHour: 23,
    targetTasks: 7,
    targetFocusMinutes: 660, // 11h
    targetHabitPct: 85,
    rewardGold: 1100,
    rewardXp: 1150,
    quote: 'Lo más importante es intentar inspirar a las personas para que puedan ser grandes.',
    difficulty: 'ÉPICO'
  },
  {
    level: 18,
    name: 'Michael Jordan',
    title: 'El Voraz Competidor',
    avatar: '🏀',
    color: '#B91C1C',
    workStartHour: 5,
    workStartMinute: 45,
    workEndHour: 23,
    targetTasks: 7,
    targetFocusMinutes: 690, // 11.5h
    targetHabitPct: 88,
    rewardGold: 1200,
    rewardXp: 1250,
    quote: 'Puedo aceptar el fracaso, pero no puedo aceptar no intentarlo.',
    difficulty: 'ÉPICO'
  },
  {
    level: 19,
    name: 'Cristiano Ronaldo',
    title: 'La Máquina del Rendimiento',
    avatar: '⚽',
    color: '#2563EB',
    workStartHour: 5,
    workStartMinute: 30,
    workEndHour: 23,
    targetTasks: 8,
    targetFocusMinutes: 720, // 12h
    targetHabitPct: 90,
    rewardGold: 1300,
    rewardXp: 1350,
    quote: 'Tu amor me hace fuerte; tu odio me hace imparable.',
    difficulty: 'LEGENDARIO'
  },
  {
    level: 20,
    name: 'Sun Tzu',
    title: 'El Estratega Supremo',
    avatar: '📜',
    color: '#059669',
    workStartHour: 5,
    workStartMinute: 15,
    workEndHour: 23,
    targetTasks: 8,
    targetFocusMinutes: 750, // 12.5h
    targetHabitPct: 92,
    rewardGold: 1400,
    rewardXp: 1450,
    quote: 'La máxima victoria es aquella que no requiere batalla.',
    difficulty: 'LEGENDARIO'
  },
  {
    level: 21,
    name: 'Alejandro Magno',
    title: 'El Conquistador de Mundos',
    avatar: '👑',
    color: '#D97706',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 8,
    targetFocusMinutes: 780, // 13h
    targetHabitPct: 94,
    rewardGold: 1500,
    rewardXp: 1550,
    quote: 'No hay nada imposible para aquel que se atreve a intentarlo.',
    difficulty: 'LEGENDARIO'
  },
  {
    level: 22,
    name: 'Julio César',
    title: 'El Dictador del Destino',
    avatar: '🏛️',
    color: '#9333EA',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 9,
    targetFocusMinutes: 810, // 13.5h
    targetHabitPct: 95,
    rewardGold: 1600,
    rewardXp: 1650,
    quote: 'Veni, vidi, vici.',
    difficulty: 'LEGENDARIO'
  },
  {
    level: 23,
    name: 'Genghis Khan',
    title: 'El Señor de la Estepa',
    avatar: '🏹',
    color: '#B45309',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 9,
    targetFocusMinutes: 840, // 14h
    targetHabitPct: 96,
    rewardGold: 1700,
    rewardXp: 1750,
    quote: 'Si tienes miedo, no lo hagas; si lo haces, no tengas miedo.',
    difficulty: 'LEGENDARIO'
  },
  {
    level: 24,
    name: 'Napoleón Bonaparte',
    title: 'El Genio Táctico',
    avatar: '⚔️',
    color: '#1D4ED8',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 9,
    targetFocusMinutes: 870, // 14.5h
    targetHabitPct: 97,
    rewardGold: 1800,
    rewardXp: 1850,
    quote: 'Imposible es una palabra que se encuentra solo en el diccionario de los tontos.',
    difficulty: 'LEGENDARIO'
  },
  {
    level: 25,
    name: 'Chronos',
    title: 'El Guardián del Tiempo Eterno',
    avatar: '⏳',
    color: '#A855F7',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 10,
    targetFocusMinutes: 900, // 15h
    targetHabitPct: 98,
    rewardGold: 2000,
    rewardXp: 2000,
    quote: 'El tiempo todo lo devora, excepto la verdadera voluntad.',
    difficulty: 'DIOS'
  },
  {
    level: 26,
    name: 'Prometeo',
    title: 'El Portador del Fuego Divino',
    avatar: '🔥',
    color: '#F97316',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 10,
    targetFocusMinutes: 930, // 15.5h
    targetHabitPct: 98,
    rewardGold: 2200,
    rewardXp: 2200,
    quote: 'Conozco el precio de traer la luz a la oscuridad.',
    difficulty: 'DIOS'
  },
  {
    level: 27,
    name: 'Atlas',
    title: 'El Sostenedor del Firmamento',
    avatar: '🌍',
    color: '#0D9488',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 11,
    targetFocusMinutes: 960, // 16h
    targetHabitPct: 99,
    rewardGold: 2500,
    rewardXp: 2500,
    quote: 'El peso del mundo es ligero para quien posee disciplina inquebrantable.',
    difficulty: 'DIOS'
  },
  {
    level: 28,
    name: 'Odin',
    title: 'El Padre de Toda Sabiduría',
    avatar: '👁️',
    color: '#6366F1',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 11,
    targetFocusMinutes: 990, // 16.5h
    targetHabitPct: 99,
    rewardGold: 3000,
    rewardXp: 3000,
    quote: 'Sacrifiqué un ojo por la visión; sacrifiqué el descanso por el dominio.',
    difficulty: 'DIOS'
  },
  {
    level: 29,
    name: 'Cyber-Lux',
    title: 'La Entidad Sintética Suprema',
    avatar: '🤖',
    color: '#06B6D4',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 12,
    targetFocusMinutes: 1020, // 17h
    targetHabitPct: 100,
    rewardGold: 4000,
    rewardXp: 4000,
    quote: 'Mi procesamiento no conoce el cansancio ni la procrastinación.',
    difficulty: 'DIOS'
  },
  {
    level: 30,
    name: 'Omega Matrix',
    title: 'El Dios del Hiper-Rendimiento',
    avatar: '👁️‍🗨️',
    color: '#EC4899',
    workStartHour: 5,
    workEndHour: 23,
    targetTasks: 12,
    targetFocusMinutes: 1080, // 18h
    targetHabitPct: 100,
    rewardGold: 5000,
    rewardXp: 5000,
    quote: 'Has alcanzado el pináculo de la matriz humana. Vénceme y domina la realidad.',
    difficulty: 'DIOS'
  }
];
