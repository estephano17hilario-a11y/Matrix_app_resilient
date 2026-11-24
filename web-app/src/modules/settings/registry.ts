import {
  User, ShieldCheck, LogOut, Palette, Sparkles, Hexagon, LayoutTemplate, LineChart,
  Brain, SlidersHorizontal, CheckCircle2, Bell, Globe,
  type LucideIcon,
} from 'lucide-react';

/**
 * Settings map. Every setting of the app lives in exactly one page; the home
 * screen lists pages by group and the search box looks through titles,
 * descriptions and the keywords below (both languages, accent-insensitive).
 */

export type SectionKey = 'account' | 'visuals' | 'neural' | 'system';
export type GroupId = 'account' | 'look' | 'interface' | 'content' | 'general' | 'session';

export interface SettingsPage {
  id: string;
  group: GroupId;
  /** Which legacy section component renders this page. */
  section: SectionKey;
  icon: LucideIcon;
  tint: string;
  es: { title: string; desc: string };
  en: { title: string; desc: string };
  /** Extra words people may search for (both languages). */
  keywords: string;
}

export const GROUPS: { id: GroupId; es: string; en: string }[] = [
  { id: 'account', es: 'Cuenta', en: 'Account' },
  { id: 'look', es: 'Apariencia', en: 'Appearance' },
  { id: 'interface', es: 'Interfaz', en: 'Interface' },
  { id: 'content', es: 'Contenido', en: 'Content' },
  { id: 'general', es: 'General', en: 'General' },
  { id: 'session', es: 'Sesión', en: 'Session' },
];

export const PAGES: SettingsPage[] = [
  {
    id: 'profile', group: 'account', section: 'account', icon: User, tint: '#a78bfa',
    es: { title: 'Perfil y avatar', desc: 'Tu nombre, correo y personaje' },
    en: { title: 'Profile & avatar', desc: 'Your name, email and character' },
    keywords: 'nombre name usuario username correo email avatar foto personaje character cambiar nombre',
  },
  {
    id: 'security', group: 'account', section: 'account', icon: ShieldCheck, tint: '#818cf8',
    es: { title: 'Seguridad y cuentas', desc: 'Contraseña y cuenta de Google' },
    en: { title: 'Security & accounts', desc: 'Password and Google account' },
    keywords: 'contrasena password clave google vincular desvincular link unlink acceso login seguridad security',
  },
  {
    id: 'themes', group: 'look', section: 'visuals', icon: Palette, tint: '#f472b6',
    es: { title: 'Temas', desc: 'Fondos y estilos de toda la app' },
    en: { title: 'Themes', desc: 'Backgrounds and styles for the whole app' },
    keywords: 'tema theme fondo background color estilo cosmic holo orbs office gradients comprar buy preview vista previa',
  },
  {
    id: 'effects', group: 'look', section: 'visuals', icon: Sparkles, tint: '#fbbf24',
    es: { title: 'Efectos y movimiento', desc: 'Modo vívido, profundidad, háptica y sonido' },
    en: { title: 'Effects & motion', desc: 'Vivid mode, depth, haptics and sound' },
    keywords: 'vivid vivido oled saturacion saturation inmersion immersion profundidad depth movimiento motion haptica haptics vibracion vibration sonido sound audio animaciones animations',
  },
  {
    id: 'radar', group: 'look', section: 'visuals', icon: Hexagon, tint: '#6366f1',
    es: { title: 'Gráfico radar', desc: 'Color, relleno, puntos y opacidad' },
    en: { title: 'Radar chart', desc: 'Color, fill, dots and opacity' },
    keywords: 'radar arana spider grafico chart color relleno fill puntos dots opacidad opacity lineas lines deluxe',
  },
  {
    id: 'layout', group: 'interface', section: 'system', icon: LayoutTemplate, tint: '#ec4899',
    es: { title: 'Barra y accesos rápidos', desc: 'Dock, sección de inicio, menú (+) y su pulsación larga' },
    en: { title: 'Dock & quick actions', desc: 'Dock, start section, (+) menu and its long press' },
    keywords: 'inicio start arranque abrir open sección section mantener presionado pulsar pulsacion larga hold long press tiempo time segundos seconds dock barra inferior layout aura legacy menu desplegable plus mas acciones rapidas quick actions hud cabecera header iconos icons secciones habitos section controls botones',
  },
  {
    id: 'charts', group: 'interface', section: 'system', icon: LineChart, tint: '#22d3ee',
    es: { title: 'Gráficos y estadísticas', desc: 'Estilo, estado inicial y periodos' },
    en: { title: 'Charts & stats', desc: 'Style, initial state and timeframes' },
    keywords: 'grafico chart radar barras bar estadisticas stats analytics maximizado minimizado periodo timeframe semana mes ano week month year foco focus habitos proyectos notas',
  },
  {
    id: 'traits', group: 'content', section: 'neural', icon: Brain, tint: '#34d399',
    es: { title: 'Atributos', desc: 'Tus rasgos, colores y sub-rasgos' },
    en: { title: 'Traits', desc: 'Your attributes, colors and sub-traits' },
    keywords: 'atributo atributos trait traits rasgo rasgos neural sub-rasgo subtrait crear editar eliminar icono color mental fisico disciplina',
  },
  {
    id: 'defaults', group: 'content', section: 'system', icon: SlidersHorizontal, tint: '#fb923c',
    es: { title: 'Vistas predeterminadas', desc: 'Hábitos, proyectos y notas al abrirlos' },
    en: { title: 'Default views', desc: 'Habits, projects and notes when opened' },
    keywords: 'vista view predeterminada default habitos habits prioridad priority cronologico chronological proyectos projects division notas notes cuadricula grid lista list resumen emociones overview emotions',
  },
  {
    id: 'taskfilters', group: 'content', section: 'system', icon: CheckCircle2, tint: '#60a5fa',
    es: { title: 'Filtros de tareas', desc: 'Filtros iniciales de la lista de tareas' },
    en: { title: 'Task filters', desc: 'Initial filters for the task list' },
    keywords: 'tareas tasks filtro filtros filter timeline fecha date atributo dificultad difficulty tipo type smart normal ocultar completadas hide completed',
  },
  {
    id: 'notifications', group: 'general', section: 'system', icon: Bell, tint: '#f59e0b',
    es: { title: 'Notificaciones y avisos', desc: 'Permisos, tono del coach y frases' },
    en: { title: 'Notifications & alerts', desc: 'Permissions, coach tone and phrases' },
    keywords: 'notificacion notificaciones notifications permisos permissions bateria battery tono tone coach frase phrase anti procrastinacion splash carga loading oro gold alertas alarm',
  },
  {
    id: 'language', group: 'general', section: 'system', icon: Globe, tint: '#38bdf8',
    es: { title: 'Idioma y calendario', desc: 'Idioma de la app e inicio de semana' },
    en: { title: 'Language & calendar', desc: 'App language and first day of the week' },
    keywords: 'idioma language espanol spanish ingles english semana week lunes monday domingo sunday calendario calendar',
  },
  {
    id: 'session', group: 'session', section: 'account', icon: LogOut, tint: '#f87171',
    es: { title: 'Cerrar sesión y cuenta', desc: 'Salir o eliminar tu cuenta' },
    en: { title: 'Sign out & account', desc: 'Sign out or delete your account' },
    keywords: 'cerrar sesion salir logout sign out eliminar borrar cuenta delete account datos',
  },
];

const BY_ID = new Map(PAGES.map(p => [p.id, p] as const));

/** Old tab ids (Dashboard still deep-links with 'account') → their closest page. */
const LEGACY: Record<string, string> = {
  account: 'profile',
  visuals: 'themes',
  neural: 'traits',
  system: 'layout',
};

export const getPage = (id: string | null | undefined) => (id ? BY_ID.get(id) ?? null : null);

export const resolvePage = (id?: string | null): string | null => {
  if (!id) return null;
  if (BY_ID.has(id)) return id;
  return LEGACY[id] ?? null;
};

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export const searchPages = (query: string, lang: 'es' | 'en'): SettingsPage[] => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { page: SettingsPage; score: number }[] = [];
  for (const page of PAGES) {
    const title = normalize(page[lang].title);
    const desc = normalize(page[lang].desc);
    const other = normalize(`${page.es.title} ${page.en.title} ${page.es.desc} ${page.en.desc} ${page.keywords}`);
    let score = 0;
    let all = true;
    for (const w of words) {
      if (title.startsWith(w)) score += 6;
      else if (title.includes(w)) score += 4;
      else if (desc.includes(w)) score += 2;
      else if (other.includes(w)) score += 1;
      else { all = false; break; }
    }
    if (all) scored.push({ page, score });
  }
  return scored.sort((a, b) => b.score - a.score).map(s => s.page);
};
