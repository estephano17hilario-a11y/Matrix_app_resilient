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

  const profile: any = {
    id: LAB_UID,
    uid: LAB_UID,
    email: 'lab@lux.test',
    displayName: 'Explorador',
    photoURL: null,
    avatarId: undefined,
    plan: 'PRO',
    es_pro: true,
    archetype: 'NEO',
    stats: { ...DEFAULT_USER_STATS, level: 7, xp: 640, gold: 1280, streak: 12 },
    preferences: {},
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    // ?onboarding → walk through the sign-up flow instead of the dashboard.
    onboarding: { successDefinition: 'Lab', obstacles: [], coachingTone: 'Stoic', completedAt: new URLSearchParams(location.search).has('onboarding') ? 0 : Date.now(), language: 'es' },
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
  if (new URLSearchParams(location.search).has('flames')) {
    const { SuperHabitsGallery } = await import('./SuperHabitsGallery');
    createRoot(document.getElementById('root')!).render(React.createElement(SuperHabitsGallery));
    return;
  }

  createRoot(document.getElementById('root')!).render(
    React.createElement(LabAuth, null, React.createElement(AppShell)),
  );
};

boot();
