// DEV-ONLY design lab. Renders the real app tree with a mocked session so the
// UI can be reviewed without signing in. Every request to a non-local host is
// answered locally, so nothing reaches Supabase or any other backend.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', location.hostname]);

const isLocal = (url: string) => {
  try {
    return LOCAL_HOSTS.has(new URL(url, location.href).hostname);
  } catch {
    return true;
  }
};

const nativeFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (isLocal(url) || url.startsWith('https://fonts.')) return nativeFetch(input as any, init);
  // Optional fixture hook set from the devtools console: (url, init) => body | undefined.
  const fixture = (window as any).__labFetch?.(url, init);
  if (fixture instanceof Response) return fixture;
  if (fixture !== undefined) return new Response(JSON.stringify(fixture), { status: 200, headers: { 'content-type': 'application/json' } });
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};

class OfflineSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  readyState = 0;
  url: string;
  onopen = null; onclose = null; onerror = null; onmessage = null;
  constructor(url: string) { this.url = url; }
  send() {}
  close() { this.readyState = 3; }
  addEventListener() {}
  removeEventListener() {}
}
(window as any).WebSocket = OfflineSocket;

const LAB_UID = 'lab-user';

const boot = async () => {
  const [{ createRoot }, React, { AuthContext }, { AppShell }, { PersistenceService }, { DEFAULT_USER_STATS }] = await Promise.all([
    import('react-dom/client'),
    import('react'),
    import('@/context/AuthContext'),
    import('@/App'),
    import('@/services/persistence'),
    import('@/types/User'),
  ]);
  await import('@/index.css');
  await import('@/i18n');
  // Handle for poking the immersion engine from the devtools console.
  (window as any).__lux = await import('@/immersion/engine');
  (window as any).__luxLife = { ...(await import('@/immersion/lifeStore')), ...(await import('@/immersion/lifeState')) };

  await PersistenceService.initialize();

  // ?superhabits → seed one habit per streak tier so the evolving flame, badges and roadmap can be reviewed.
  if (new URLSearchParams(location.search).has('superhabits')) {
    const day = (back: number) => {
      const d = new Date(); d.setDate(d.getDate() - back);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const mk = (id: string, title: string, streak: number, doneToday: boolean, superHabit?: string) => ({
      id, title, streak, completedToday: doneToday, attribute: 'DISCIPLINA', totalCompletions: streak, frequency: 'DAILY',
      type: 'BOOLEAN', estimatedTime: 20, impact: 2, createdAt: Date.now() - streak * 86400000, reminderTime: '08:00',
      history: Array.from({ length: streak }, (_, i) => day(i + (doneToday ? 0 : 1))), superHabit,
    });
    PersistenceService.saveCollection(LAB_UID, 'habits', [
      mk('lab-1', 'Gym', 0, false, 'gym'),
      mk('lab-2', 'Estudiar', 3, false, 'estudiar'),
      mk('lab-3', 'Programación', 7, true, 'programacion'),
      mk('lab-4', 'Meditación', 14, false, 'meditacion'),
      mk('lab-5', 'Fe Católica', 30, true, 'catolica'),
      mk('lab-6', 'Tomar agua', 60, false, 'agua'),
      mk('lab-7', 'Leer 10 min', 5, false),
      mk('lab-8', 'Idiomas', 45, false, 'idiomas'),
    ]);
  }

  // ?routine → seed a busy day (habits + tasks with hours) to review the Routine calendar.
  if (new URLSearchParams(location.search).has('routine')) {
    const today = new Date();
    const dayStr = (back: number) => { const d = new Date(today); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const hab = (id: string, title: string, time: string | undefined, over: Record<string, unknown> = {}) => ({
      id, title, streak: 3, completedToday: false, attribute: 'DISCIPLINA', totalCompletions: 3, frequency: 'DAILY',
      type: 'BOOLEAN', estimatedTime: 20, impact: 2, createdAt: Date.now() - 5 * 86400000, reminderTime: time, history: [dayStr(1)], ...over,
    });
    const quest = (id: string, title: string, time: string | undefined, back = 0, over: Record<string, unknown> = {}) => ({
      id, title, completed: false, attribute: 'INTELECTO', deadline: dayStr(back), deadlineTime: time, createdAt: Date.now(), ...over,
    });
    PersistenceService.saveCollection(LAB_UID, 'habits', [
      hab('r1', 'Despertar y agua', '06:30', { completedToday: true, lastUpdatedDate: dayStr(0), history: [dayStr(0)] }),
      hab('r2', 'Meditar', '07:00', { completedToday: true, lastUpdatedDate: dayStr(0), history: [dayStr(0)] }),
      hab('r3', 'Gimnasio', '07:15'),
      hab('r4', 'Leer 10 min', '07:30'),
      hab('r5', 'Estudiar inglés', '09:00'),
      hab('r6', 'Tomar agua', '12:30', { type: 'QUANTITY', targetValue: 8, currentValue: 3, unit: 'vasos', lastUpdatedDate: dayStr(0) }),
      hab('r7', 'Caminar', '18:00'),
      hab('r8', 'Journaling', '21:30'),
      hab('r9', 'Sin hora', undefined),
    ]);
    PersistenceService.saveCollection(LAB_UID, 'quests', [
      quest('q1', 'Entregar informe', '09:00'),
      quest('q2', 'Llamar al banco', '15:30'),
      quest('q3', 'Comprar víveres', undefined),
      quest('q4', 'Pagar alquiler', '11:00', 2),
      quest('q5', 'Reunión de equipo', '15:00', 0, { completed: true }),
    ]);
  }

  // ?streaks → lost streaks (daily + habits) to review the loss report, the HUD sheet and the store powers.
  const labStreaks = new URLSearchParams(location.search).has('streaks');
  const sDay = (back: number) => { const d = new Date(); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  if (labStreaks) {
    const hab = (id: string, title: string, run: number, gap: number, color: string) => ({
      id, title, streak: 0, completedToday: false, attribute: 'DISCIPLINA', totalCompletions: run, frequency: 'DAILY',
      type: 'BOOLEAN', estimatedTime: 20, impact: 2, createdAt: Date.now() - 40 * 86400000, reminderTime: '08:00', customColor: color,
      history: Array.from({ length: run }, (_, i) => sDay(i + gap)),
    });
    PersistenceService.saveCollection(LAB_UID, 'habits', [
      hab('ls-1', 'Gimnasio', 9, 2, '#34d399'),
      hab('ls-2', 'Leer 20 páginas', 15, 3, '#60a5fa'),
      { ...hab('ls-3', 'Meditar', 6, 0, '#f472b6'), streak: 6, completedToday: true, lastUpdatedDate: sDay(0) },
    ]);
  }

  // ?lang=en → English UI (used to capture the English tutorial screenshots).
  const labLang = new URLSearchParams(location.search).get('lang');
  if (labLang) localStorage.setItem('i18nextLng', labLang);
  if (labLang) await (await import('i18next')).default.changeLanguage(labLang);

  // ?demo → a realistic account (habits, tasks, projects, notes, journal) for El Monitor's screenshots.
  if (new URLSearchParams(location.search).has('demo')) {
    const en = labLang === 'en';
    const tr = (es: string, e: string) => (en ? e : es);
    const today = new Date();
    const dayStr = (back: number) => { const d = new Date(today); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const hist = (n: number, skip: number[] = []) => Array.from({ length: n }, (_, i) => i + 1).filter(i => !skip.includes(i)).map(dayStr);
    const hab = (id: string, title: string, time: string | undefined, attribute: string, over: Record<string, unknown> = {}) => ({
      id, title, streak: 6, completedToday: false, attribute, totalCompletions: 20, frequency: 'DAILY',
      type: 'BOOLEAN', estimatedTime: 20, impact: 2, createdAt: Date.now() - 30 * 86400000, reminderTime: time, history: hist(14, [3, 8]), ...over,
    });
    PersistenceService.saveCollection(LAB_UID, 'habits', [
      hab('d1', tr('Meditar 10 min', 'Meditate 10 min'), '07:00', 'DISCIPLINA', { completedToday: true, lastUpdatedDate: dayStr(0), history: [dayStr(0), ...hist(14)] }),
      hab('d2', tr('Gimnasio', 'Gym'), '07:30', 'FUERZA'),
      hab('d3', tr('Leer 20 páginas', 'Read 20 pages'), '21:00', 'INTELECTO', { completedToday: true, lastUpdatedDate: dayStr(0), history: [dayStr(0), ...hist(14, [5])] }),
      hab('d4', tr('Tomar 8 vasos de agua', 'Drink 8 glasses of water'), '12:00', 'FUERZA', { type: 'QUANTITY', targetValue: 8, currentValue: 5, unit: tr('vasos', 'glasses'), lastUpdatedDate: dayStr(0) }),
      hab('d5', tr('Estudiar inglés', 'Study Spanish'), '19:00', 'INTELECTO'),
    ]);
    const quest = (id: string, title: string, difficulty: string, over: Record<string, unknown> = {}) => ({
      id, title, difficulty, completed: false, attribute: 'INTELECTO', deadline: dayStr(0), createdAt: Date.now() - 3600000, estimatedTime: 45, ...over,
    });
    PersistenceService.saveCollection(LAB_UID, 'quests', [
      quest('t1', tr('Entregar informe trimestral', 'Send quarterly report'), 'A', { deadlineTime: '10:00' }),
      quest('t2', tr('Llamar al dentista', 'Call the dentist'), 'C', { deadlineTime: '16:30', attribute: 'DISCIPLINA' }),
      quest('t3', tr('Preparar presentación del cliente', 'Prepare client presentation'), 'S', { estimatedTime: 120 }),
      quest('t4', tr('Comprar víveres', 'Buy groceries'), 'B', { attribute: 'DISCIPLINA' }),
      quest('t5', tr('Revisar correos', 'Review emails'), 'C', { completed: true, completedAt: Date.now() - 1800000 }),
    ]);
    const sess = (back: number, min: number, i: number) => ({ id: `s-${back}-${i}`, type: 'POMO', duration: min * 60, date: `${dayStr(back)}T${String(9 + i).padStart(2, '0')}:00:00` });
    PersistenceService.saveCollection(LAB_UID, 'projects', [
      { id: 'p1', title: tr('Tesis de maestría', "Master's thesis"), description: '', attribute: 'INTELECTO', color: '#8b5cf6', goalTarget: 600, goalFrequency: 'WEEKLY', uiFrequency: 'WEEKLY', uiTarget: 10, uiUnit: 'HOURS', pomoDuration: 25, breakDuration: 5, impact: 3, totalTime: 9 * 3600, workingDays: [1, 2, 3, 4, 5], createdAt: Date.now() - 40 * 86400000, sessions: [sess(0, 50, 0), sess(1, 90, 1), sess(2, 60, 2)] },
      { id: 'p2', title: tr('App personal', 'Side project app'), description: '', attribute: 'CREATIVIDAD', color: '#06b6d4', goalTarget: 60, goalFrequency: 'DAILY', uiFrequency: 'DAILY', pomoDuration: 25, breakDuration: 5, impact: 2, totalTime: 5 * 3600, createdAt: Date.now() - 20 * 86400000, sessions: [sess(0, 25, 3), sess(1, 60, 4)] },
    ]);
    const blk = (t: string) => [{ id: `b-${t.length}`, type: 'text', content: t }];
    PersistenceService.saveCollection(LAB_UID, 'notes', [
      { id: 'n1', title: tr('Ideas para el viaje', 'Trip ideas'), blocks: blk(tr('Cusco, Machu Picchu y el Valle Sagrado.', 'Cusco, Machu Picchu and the Sacred Valley.')), updatedAt: new Date().toISOString(), createdAt: Date.now() - 86400000, theme: 'blue' },
      { id: 'n2', title: tr('Resumen de clase', 'Class summary'), blocks: blk(tr('Capítulo 4: hábitos y sistemas.', 'Chapter 4: habits and systems.')), updatedAt: new Date().toISOString(), createdAt: Date.now() - 2 * 86400000, theme: 'purple' },
      { id: 'n3', title: tr('Lista de libros', 'Reading list'), blocks: blk(tr('Hábitos atómicos · Deep Work', 'Atomic Habits · Deep Work')), updatedAt: new Date().toISOString(), createdAt: Date.now() - 3 * 86400000 },
    ]);
    PersistenceService.saveCollection(LAB_UID, 'journal', [1, 2, 4, 5].map((back, i) => ({
      id: `j${back}`, date: dayStr(back), mood: ['good', 'rad', 'meh', 'good'][i], tags: [],
      blocks: blk(tr('Buen día: avancé la tesis y fui al gimnasio.', 'Good day: moved the thesis forward and hit the gym.')),
    })));
    // The mocked backend answers the collection sync with the same demo data (otherwise it would wipe it).
    const rows = ['habits', 'quests', 'projects', 'notes', 'journal'].flatMap(c =>
      (PersistenceService.getCollection<any>(LAB_UID, c) || []).map((item: any) => ({ id: `${LAB_UID}_${c}_${item.id}`, collection_name: c, data: item })));
    (window as any).__labFetch = (url: string) => {
      const u = decodeURIComponent(url.replace(/\+/g, ' '));
      if (!u.includes('user_collections') || !/select=(id,\s*collection_name,\s*data|data,\s*id)/.test(u)) return undefined;
      const only = /collection_name=eq\.(\w+)/.exec(u)?.[1];
      return only ? rows.filter(r => r.collection_name === only) : rows;
    };
  }

  const profile: any = {
    id: LAB_UID,
    uid: LAB_UID,
    email: 'lab@lux.test',
    displayName: 'Explorador',
    photoURL: null,
    avatarId: undefined,
    // ?free → check what a free account sees (Deluxe-gated features).
    plan: new URLSearchParams(location.search).has('free') ? 'FREE' : 'PRO',
    es_pro: !new URLSearchParams(location.search).has('free'),
    archetype: 'NEO',
    stats: labStreaks
      ? { ...DEFAULT_USER_STATS, level: 7, xp: 640, gold: 9800, streak: 0, previousStreak: 12, lastStreakDate: sDay(2), streakLostAt: sDay(2), longestStreak: 21, streakFrozenDays: [sDay(-1)] }
      : { ...DEFAULT_USER_STATS, level: 7, xp: 640, gold: 1280, streak: 12 },
    preferences: {},
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    // ?onboarding → walk through the sign-up flow instead of the dashboard.
    onboarding: { successDefinition: 'Lab', obstacles: [], coachingTone: 'Stoic', completedAt: new URLSearchParams(location.search).has('onboarding') ? 0 : Date.now(), language: labLang || 'es' },
  };

  const LabAuth = ({ children }: { children: React.ReactNode }) => {
    const [p, setP] = React.useState(profile);
    const value = React.useMemo(() => ({
      user: { id: LAB_UID, email: profile.email, user_metadata: {}, app_metadata: {} } as any,
      profile: p,
      isLoading: false,
      isInitializing: false,
      error: null,
      logout: async () => {},
      updateProfileLocally: (u: any) => setP((prev: any) => ({ ...prev, ...u })),
    }), [p]);
    return React.createElement(AuthContext.Provider, { value }, children);
  };

  // ?flames → component gallery (flame tiers, badges, themes, FX triggers) instead of the app.
  if (new URLSearchParams(location.search).has('flames') || new URLSearchParams(location.search).has('world')) {
    const { SuperHabitsGallery, WorldPreview } = await import('./SuperHabitsGallery');
    if (new URLSearchParams(location.search).has('world')) { createRoot(document.getElementById('root')!).render(React.createElement(WorldPreview)); return; }
    createRoot(document.getElementById('root')!).render(React.createElement(SuperHabitsGallery));
    return;
  }

  // ?auth → the signed-out screens (welcome / login / register) instead of the app.
  if (new URLSearchParams(location.search).has('auth')) {
    const { AuthScreen } = await import('@/modules/auth/AuthScreen');
    createRoot(document.getElementById('root')!).render(React.createElement(LabAuth, null, React.createElement(AuthScreen)));
    return;
  }

  createRoot(document.getElementById('root')!).render(
    React.createElement(LabAuth, null, React.createElement(AppShell)),
  );
};

boot();
