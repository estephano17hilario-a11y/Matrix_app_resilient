import { UserData, UserProfile } from '../types/User';

const KEYS = {
  PROFILE: 'MATRIX_CACHED_PROFILE',
  THEME: 'matrix-theme',
  VIVID: 'matrix-vivid-mode',
  OFFLINE_OVERRIDE: 'MATRIX_FORCE_OFFLINE',
  PHANTOM_SESSION: 'MATRIX_PHANTOM_SESSION'
};

export const PersistenceService = {
  // --- PROFILE (Auth + Stats) ---
  saveProfile: (profile: UserProfile | UserData) => {
    try {
      if (!profile) return;
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
      // Also save a timestamp to know how old the data is
      localStorage.setItem(KEYS.PROFILE + '_TS', Date.now().toString());
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to write profile.", e);
    }
  },

  getProfile: (): UserProfile | null => {
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      if (!data) return null;
      return JSON.parse(data) as UserProfile;
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Corrupted profile data.", e);
      return null;
    }
  },

  clearProfile: () => {
    try {
      localStorage.removeItem(KEYS.PROFILE);
      localStorage.removeItem(KEYS.PROFILE + '_TS');
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to clear profile.", e);
    }
  },

  // --- THEME ---
  saveTheme: (theme: string) => {
    localStorage.setItem(KEYS.THEME, theme);
  },

  getTheme: (): string | null => {
    return localStorage.getItem(KEYS.THEME);
  },

  // --- UTILS ---
  getLastSyncTime: (): number => {
    const ts = localStorage.getItem(KEYS.PROFILE + '_TS');
    return ts ? parseInt(ts, 10) : 0;
  }
};
