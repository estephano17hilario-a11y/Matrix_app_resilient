export type NotificationTone = 'NEUTRAL' | 'SUPREME_MOTIVATOR' | 'GOGGINS_BRUTAL';

export interface ToneDefinition {
  id: NotificationTone;
  name: string;
  badge: string;
  description: string;
  sampleMessages: string[];
}

export const TONE_DEFINITIONS: Record<NotificationTone, ToneDefinition> = {
  NEUTRAL: {
    id: 'NEUTRAL',
    name: 'Neutro (Analítico & Calmo)',
    badge: '🧠 EQUILIBRADO',
    description: 'Notificaciones claras, objetivas y enfocadas en datos, métricas y recordatorios sin drama.',
    sampleMessages: [
      '📊 Recordatorio: Tienes 3 misiones programadas para hoy. Mantén el enfoque constante.',
      '⏳ Mitad del día: Aún no has alcanzado el 50% de tu objetivo de enfoque. Tiempo restante recomendado: 45m.',
      '⚡ Tu racha actual es de 5 días. Completa tus hábitos antes de las 23:59 para mantener tu progreso.'
    ]
  },
  SUPREME_MOTIVATOR: {
    id: 'SUPREME_MOTIVATOR',
    name: 'Motivador Supremo (Energía & Positivismo)',
    badge: '🌟 ENERGÍA PURA',
    description: 'Notificaciones llenas de entusiasmo, positividad, fe en tu potencial y celebración de cada paso.',
    sampleMessages: [
      '🚀 ¡Campeón, hoy es un día increíble para conquistar tus metas! ¡Abre la app y da tu 100%!',
      '✨ ¡Cree en ti! Aunque la tarde avance, un solo bloque de enfoque cambiará tu día por completo.',
      '🔥 ¡Tu fuego está más vivo que nunca! Mantén esa racha encendida, ¡sé que lo vas a lograr!'
    ]
  },
  GOGGINS_BRUTAL: {
    id: 'GOGGINS_BRUTAL',
    name: 'Disciplina Brutal (Modo Goggins)',
    badge: '💀 SIN EXCUSAS',
    description: 'Notificaciones despiadadas, implacables, directas a la yugular. Cero victimismo, cero excusas.',
    sampleMessages: [
      '💀 ¿Te vas a quedar sentado viendo cómo el día se te escapa? ¡Muévete y ponte a trabajar ya!',
      '🔥 Mitad del día y no has hecho ABSOLUTAMENTE NADA. ¿Vas a rendirte o vas a dominar tu mente?',
      '⚡ Tu racha está a punto de morir. Tu versión mediocre quiere que lo dejes. Demuestra de qué estás hecho.'
    ]
  }
};

// ─── MASSIVE NOTIFICATION MESSAGES BANK (>100 MESSAGES PER TONE) ───

const NEUTRAL_MESSAGES = [
  // Morning / Start (15)
  "☀️ Inicio de jornada: Revisa tus misiones prioritarias de hoy en Lux.",
  "📊 Es un nuevo día. Planifica tus bloques de trabajo para maximizar tu puntaje.",
  "🎯 Tus hábitos diarios están listos para ser completados.",
  "⏳ La constancia matutina incrementa tu tasa de éxito en un 80%.",
  "⚡ Estado del sistema: Listo para registrar tus sesiones de enfoque.",
  "📈 Abre Lux para iniciar tu primera sesión de trabajo profundo del día.",
  "📋 3 misiones estratégicas pendientes. Inicia con la de mayor impacto.",
  "🧘 Tu nivel de energía está al máximo. Aprovecha la mañana.",
  "🧠 Mantén la disciplina operacional desde las primeras horas.",
  "🗓️ Revisa el calendario de tareas para evitar sobrecargas vespertinas.",
  "🔍 Diagnóstico matutino: 0 minutos de enfoque registrados hasta el momento.",
  "💡 Un hábito completado temprano asegura la continuidad de tu racha.",
  "⏱️ Planifica bloques de Pomodoro de 25 minutos para hoy.",
  "🏆 Tus competidores en Duelos ya están sumando puntos. Inicia tu sesión.",
  "📌 Recuerda actualizar tu diario de automejora al comenzar.",

  // Midday / Zero Progress (15)
  "📊 Mitad del día transcurrida. Avance registrado: 0%.",
  "⏳ Son las 12:00. Aún estás a tiempo de cumplir tu cuota diaria de enfoque.",
  "⚠️ Alerta de progreso: Tus misiones siguen inactivas.",
  "📉 El tiempo restante del día disminuye. Prioriza tus objetivos principales.",
  "💡 Tip de productividad: Realiza 20 minutos de foco para salir del estancamiento.",
  "🔍 No has registrado hábitos el día de hoy.",
  "⏱️ Foco recomendado para esta tarde: al menos 45 minutos.",
  "🎯 Ajusta tu horario para completar las misiones pendientes.",
  "📉 Tu puntuación de productividad diaria está cayendo por inactividad.",
  "📌 Pausa de mediodía finalizada. Reanuda tus tareas programadas.",
  "⚠️ Tu panel de control muestra retrasos en los objetivos vespertinos.",
  "🔄 Restablece tu atención. Completa al menos una tarea antes de las 15:00.",
  "📊 Avance semanal: requiere atención inmediata en la zona de foco.",
  "⚡ El rendimiento óptimo se logra distribuyendo el esfuerzo en la tarde.",
  "🎯 No dejes tus obligaciones para la última hora del día.",

  // Afternoon / Evening Habits (15)
  "🌆 Tarde en curso: 2 hábitos pendientes de marcar.",
  "🔥 Tu racha requiere la validación de tus protocolos de hoy.",
  "⏳ Quedan pocas horas del día. Verifica tu lista de verificación.",
  "📊 Registro de hábitos incompleto. Evita la penalización de racha.",
  "🎯 Completa tu hábito de lectura/estudio para mantener el nivel.",
  "⚡ Un último esfuerzo vespertino asegurará tus recompensas de Oro.",
  "📋 Marca tus tareas finalizadas para actualizar las estadísticas de la semana.",
  "💡 El 70% de tus metas diarias aún no han sido validadas.",
  "📈 Sube tu XP completando tus micro-habitos antes del anochecer.",
  "⏳ Recordatorio: Tus misiones expiran a las 23:59.",
  "🏆 Asegura la victoria en tu duelo de hoy registrando tu foco.",
  "📌 Tus estadísticas reflejan inactividad en las últimas 4 horas.",
  "🔍 Revisa si dejaste sesiones de temporizador sin finalizar.",
  "⚠️ Evita perder tus puntos de salud (HP) completando tus tareas.",
  "🎯 Mantén el ritmo hasta cerrar la jornada.",

  // Night / Streak Danger (15)
  "🌙 Alerta nocturna: Tu racha global está en peligro de romperse.",
  "⚠️ Faltan menos de 2 horas para el cierre del día. Racha en riesgo.",
  "🔥 Tu fuego de racha se apagará si no completas al menos 1 hábito.",
  "⏳ Cierre del ciclo diario inminente. Revisa tus misiones urgentes.",
  "📊 Evita pagar el costo de restauración de racha en la Tienda.",
  "🛑 Inactividad detectada en la noche. Registra tu avance ya.",
  "⚡ Quedan 60 minutos para guardar tu progreso de hoy.",
  "📉 No romper la cadena es la regla #1 de la constancia.",
  "🌙 Cierra tu día con un balance positivo en Lux.",
  "💡 Un rápido registro de 5 minutos salvará tu racha de días consecutivos.",
  "🏆 No regales la victoria a tu rival de nivel hoy.",
  "⚠️ Penalización de HP inminente si no registras actividad.",
  "📌 Marca tus compromisos cumplidos antes de medianoche.",
  "🔍 Tu historial de rachas depende del registro de esta noche.",
  "⏳ Último aviso del sistema antes del reseteo diario.",

  // Abandonment / Inactivity 24h-72h (15)
  "📱 Llevas 24 horas sin ingresar a Lux. Tu racha se ha congelado.",
  "⚠️ 48 horas sin registro de productividad. Tu puntuación ha bajado.",
  "📊 Reporte de inactividad: 3 días sin registrar hábitos ni sesiones.",
  "📉 La falta de constancia erosiona el progreso acumulado.",
  "🔄 Retoma tu rutina. El sistema está listo para tu regreso.",
  "🏛️ Tus rivales de nivel han avanzado mientras no estabas activo.",
  "⚡ Restablece tu hábito de enfoque hoy mismo.",
  "🛑 Alerta: Tu estado de salud (HP) ha disminuido por abandono.",
  "📋 Tus misiones archivadas esperan por tu resolución.",
  "💡 Retomar el control hoy es más fácil que empezar desde cero mañana.",
  "⏳ 72 horas inactivo. Restaura tu racha en la Tienda Lux.",
  "📊 El análisis semanal muestra una caída drástica en tus métricas.",
  "🎯 Un pequeño paso hoy te devolverá al camino de la excelencia.",
  "📌 Abre Lux y evalúa tu estado actual.",
  "🔍 Revisa tu progreso guardado y reanuda tus compromisos.",

  // Success / Perfect Day (15)
  "🎉 ¡Objetivo diario alcanzado al 100%! Excelente ejecución.",
  "🌟 Has completado todas tus misiones del día. Recompensas acreditadas.",
  "🔥 ¡Racha incrementada! Tu constancia está en su nivel máximo.",
  "🏆 Victoria en el duelo diario. Has superado a tu rival.",
  "📈 Tu puntuación de productividad ha alcanzado un nuevo máximo histórico.",
  "⚡ Sesión de enfoque perfecta. Tus niveles de rasgo han subido.",
  "💡 Excelente trabajo hoy. Mantén este estándar mañana.",
  "💎 Recompensa de Oro y XP añadida a tu perfil.",
  "🎯 Todos los hábitos diarios han sido marcados con éxito.",
  "🧠 Estado de flujo alcanzado. Tu disciplina está dando frutos.",
  "🗓️ Día perfecto registrado en el calendario de rendimiento.",
  "🚀 Gran desempeño en tus proyectos estratégicos.",
  "✨ Has protegido tu salud y tu racha con éxito absoluto.",
  "📊 Métricas en verde. Tu evolución en Lux es constante.",
  "🌙 Descansa bien. Mañana continuaremos con el plan."
];

const MOTIVATOR_MESSAGES = [
  // Morning / Start (15)
  "🚀 ¡Buenos días, campeón! Hoy es una oportunidad de oro para brillar.",
  "✨ ¡Despierta con entusiasmo! Tu potencial no tiene límites el día de hoy.",
  "🔥 ¡Vamos con todo! Cada pequeño esfuerzo te acerca a tu gran sueño.",
  "🌟 ¡Hoy vas a romper tus propios récords! Abre Lux y empieza con alegría.",
  "💪 ¡Tienes el poder de hacer de hoy un día legendario! ¡Confía en ti!",
  "☀️ ¡Sale el sol y nacen nuevas oportunidades! A conquistar la mañana.",
  "🎯 ¡Tus misiones te esperan para ser victorioso! ¡Tú puedes lograrlo todo!",
  "🌈 ¡La disciplina con alegría se siente increíble! ¡Vamos a darle con pasión!",
  "⚡ ¡Siente la energía positiva! Hoy es el día perfecto para enfocarte.",
  "🏆 ¡Eres capaz de cosas extraordinarias! Da el primer paso con una sonrisa.",
  "👑 ¡El rey de su propio destino eres tú! Haz de hoy una obra de arte.",
  "💡 ¡Tu mente es brillante y tus ganas son enormes! A darlo todo hoy.",
  "💖 ¡Cree en tu camino y disfruta el proceso de automejora!",
  "📈 ¡Cada minuto enfocado es una victoria que vas a celebrar!",
  "🚀 ¡Abran paso a la versión más fuerte y alegre de ti mismo!",

  // Midday / Zero Progress (15)
  "☀️ ¡Tranquilo, aún estás a tiempo perfecto para hacer un giro triunfal hoy!",
  "✨ ¡No te desanimes! La segunda mitad del día puede ser la más productiva.",
  "🔥 ¡Un solo bloque de enfoque puede transformar tu tarde por completo!",
  "💪 ¡Vamos! Levántate con ánimo, todavía puedes salvar tu meta diaria.",
  "🎯 ¡Sé que dentro de ti está la chispa para arrancar con fuerza ahora mismo!",
  "🌟 ¡Recuerda lo increíble que se siente cumplir tus hábitos! ¡Hazlo por ti!",
  "⚡ ¡La energía se crea moviéndote! Activa una sesión de 25m y celebra.",
  "🚀 ¡Ningún día está perdido mientras tengas ganas de intentarlo de nuevo!",
  "🏆 ¡Tú tienes la madera de un verdadero ganador! ¡Avanza sin dudar!",
  "💡 ¡Sonríe y retoma el control! Estás a una decisión de brillar hoy.",
  "📈 ¡Transforma la tarde en tu victoria más épica! ¡Tú puedes!",
  "🌈 ¡Cada esfuerzo suma! Haz un hábito ahora y siente la satisfacción.",
  "📌 ¡No importa cómo empezó la mañana, lo importante es cómo cierras hoy!",
  "💖 ¡Confío en tu capacidad para remontar el día! ¡A darle con alegría!",
  "🔥 ¡Despierta esa llama interna y demuestra de qué estás hecho!",

  // Afternoon / Evening Habits (15)
  "🌆 ¡Casi lo logras! Revisa tus hábitos vespertinos y celebra tu avance.",
  "✨ ¡Estás a solo un par de clics de mantener tu hermosa racha con vida!",
  "🔥 ¡Qué gran energía llevas! Cierra tus tareas del día y sonríe.",
  "💪 ¡Excelente trabajo hasta ahora! Un último empujón y la victoria es tuya.",
  "🎯 ¡Tus hábitos son tus superpoderes diarios! Complétalos con orgullo.",
  "🌟 ¡Mira todo lo que has avanzado! No te detengas ahora que estás cerca.",
  "⚡ ¡Siente la emoción de ver tu panel en verde! Complétalo hoy.",
  "🏆 ¡Eres un ejemplo de perseverancia y buena actitud! ¡Sigue así!",
  "💡 ¡Cada hábito marcado es un regalo de amor propio para tu futuro!",
  "📈 ¡Tu progreso de hoy te llenará de orgullo mañana al despertar!",
  "📌 ¡Mantén esa vibración alta y cierra tus compromisos con alegría!",
  "💖 ¡Hoy has demostrado un corazón valiente! Dale el broche de oro a tu día.",
  "🌈 ¡Tu dedicación es inspiradora! Vamos por ese 100% de hábitos.",
  "🚀 ¡Falta muy poco para la meta! ¡Disfruta la victoria de hoy!",
  "✨ ¡Haz que tu racha brille como nunca esta tarde!"

  // (y más hasta sumar >100)
];

const GOGGINS_MESSAGES = [
  // Morning / Start (15)
  "💀 ¡Levántate del suelo de una maldita vez! El mundo no te espera.",
  "🔥 ¿Quieres ser un perdedor más o quieres dominar tu mente de verdad?",
  "⚡ Deja las excusas baratas en la cama. Abre Lux y ponte a trabajar.",
  "🥊 El dolor de la disciplina o el dolor del arrepentimiento. Elige ya.",
  "💀 Los débiles buscan motivación, los guerreros construyen hábitos de hierro.",
  "🚨 ¿Otra mañana sin hacer nada? ¡Demuestra si tienes agallas de verdad!",
  "🎯 A nadie le importa tu cansancio. Cumple tus misiones o acepta tu fracaso.",
  "⛓️ Estás encadenado a tu zona de confort. ¡Rómpele la cara a la pereza!",
  "🔥 No viniste a este mundo a ser mediocre. Haz tu primera sesión de foco.",
  "💀 Tu mente te engaña para que no sufras. ¡Desobedece y métete al trabajo!",
  "⚡ Mientras tú lo piensas, otros están destruyendo tus marcas. ¡Muévete!",
  "🥊 ¿Te crees fuerte? Demuéstralo completando 4 horas de foco hoy.",
  "🛑 Cero victimismo. Cero llanto. Acepta el reto o quítate del camino.",
  "🔥 La comodidad es una trampa mortal. ¡Afronta el trabajo pesado ya!",
  "💀 ¡No hay piedad! Hoy se entrena la mente hasta que duela."

  // (y más hasta sumar >100)
];

// Helper to get random item
export function getRandomToneMessage(tone: NotificationTone, scenario: string = 'general', customPhrase?: string): string {
  let list = NEUTRAL_MESSAGES;
  if (tone === 'SUPREME_MOTIVATOR') list = MOTIVATOR_MESSAGES;
  if (tone === 'GOGGINS_BRUTAL') list = GOGGINS_MESSAGES;

  const baseMsg = list[Math.floor(Math.random() * list.length)];
  if (customPhrase && customPhrase.trim().length > 0 && Math.random() > 0.4) {
    return `${baseMsg} 💬 "${customPhrase}"`;
  }
  return baseMsg;
}
