import { UserData, UserProfile } from '../types/User';

const KEYS = {
  PROFILE: 'MATRIX_CACHED_PROFILE',
  THEME: 'matrix-theme',
  VIVID: 'matrix-vivid-mode',
  OFFLINE_OVERRIDE: 'MATRIX_FORCE_OFFLINE',
  PHANTOM_SESSION: 'MATRIX_PHANTOM_SESSION',
  COLLECTION_PREFIX: 'MATRIX_CACHED_COLLECTION',
  SESSION_UID: 'MATRIX_ACTIVE_SESSION_UID'
};

const STORAGE_VERSION = 1;

type PersistedEnvelope<T> = {
  v: number;
  uid: string;
  updatedAt: number;
  checksum: string;
  data: T;
};

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const buildProfileKey = (uid: string) => `${KEYS.PROFILE}:${uid}`;
const buildCollectionKey = (uid: string, collectionName: string) => `${KEYS.COLLECTION_PREFIX}:${uid}:${collectionName}`;

const findLatestProfileUid = () => {
  try {
    const prefix = `${KEYS.PROFILE}:`;
    let latestUid = '';
    let latestTs = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || '';
      if (!key.startsWith(prefix) || !key.endsWith('_TS')) continue;
      const tsRaw = localStorage.getItem(key);
      const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
      if (!Number.isFinite(ts) || ts <= latestTs) continue;
      const uid = key.slice(prefix.length, key.length - 3);
      if (!uid) continue;
      latestUid = uid;
      latestTs = ts;
    }
    return latestUid;
  } catch {
    return '';
  }
};

const buildEnvelope = <T>(uid: string, data: T): PersistedEnvelope<T> => {
  const payload = JSON.stringify({ v: STORAGE_VERSION, uid, data });
  return {
    v: STORAGE_VERSION,
    uid,
    updatedAt: Date.now(),
    checksum: hashString(payload),
    data
  };
};

const parseEnvelope = <T>(raw: string | null, uid: string): PersistedEnvelope<T> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedEnvelope<T>;
    if (!parsed || parsed.uid !== uid || parsed.v !== STORAGE_VERSION) return null;
    const payload = JSON.stringify({ v: parsed.v, uid: parsed.uid, data: parsed.data });
    if (hashString(payload) !== parsed.checksum) return null;
    return parsed;
  } catch {
    return null;
  }
};

const readWithBackup = <T>(key: string, uid: string): T | null => {
  const primary = parseEnvelope<T>(localStorage.getItem(key), uid);
  if (primary) return primary.data;
  const backupRaw = localStorage.getItem(key + '_BACKUP');
  const backup = parseEnvelope<T>(backupRaw, uid);
  if (backup) {
    localStorage.setItem(key, backupRaw as string);
    return backup.data;
  }
  return null;
};

const persistWithBackup = <T>(key: string, uid: string, data: T) => {
  const previous = localStorage.getItem(key);
  if (previous) {
    localStorage.setItem(key + '_BACKUP', previous);
  }
  const envelope = buildEnvelope(uid, data);
  localStorage.setItem(key, JSON.stringify(envelope));
};

export const PersistenceService = {
  // --- PROFILE (Auth + Stats) ---
  saveProfile: (profile: UserProfile | UserData) => {
    try {
      if (!profile) return;
      if (!profile.uid) return;
      const key = buildProfileKey(profile.uid);
      persistWithBackup(key, profile.uid, profile);
      localStorage.setItem(key + '_TS', Date.now().toString());
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to write profile.", e);
    }
  },

  getProfile: (uid?: string): UserProfile | null => {
    try {
      const resolvedUid = uid || sessionStorage.getItem(KEYS.SESSION_UID) || findLatestProfileUid();
      if (!resolvedUid) return null;
      const key = buildProfileKey(resolvedUid);
      return readWithBackup<UserProfile>(key, resolvedUid);
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Corrupted profile data.", e);
      return null;
    }
  },

  clearProfile: () => {
    try {
      const sessionUid = sessionStorage.getItem(KEYS.SESSION_UID) || '';
      if (!sessionUid) return;
      const key = buildProfileKey(sessionUid);
      localStorage.removeItem(key);
      localStorage.removeItem(key + '_TS');
      localStorage.removeItem(key + '_BACKUP');
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
    const sessionUid = sessionStorage.getItem(KEYS.SESSION_UID) || '';
    if (!sessionUid) return 0;
    const ts = localStorage.getItem(buildProfileKey(sessionUid) + '_TS');
    return ts ? parseInt(ts, 10) : 0;
  },

  saveCollection: <T>(userId: string, collectionName: string, items: T[]) => {
    try {
      const key = buildCollectionKey(userId, collectionName);
      persistWithBackup(key, userId, items || []);
      localStorage.setItem(key + '_TS', Date.now().toString());
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to write collection.", e);
    }
  },

  getCollection: <T>(userId: string, collectionName: string): T[] | null => {
    try {
      const key = buildCollectionKey(userId, collectionName);
      return readWithBackup<T[]>(key, userId);
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Corrupted collection cache.", e);
      return null;
    }
  },

  getCollectionLastSync: (userId: string, collectionName: string): number => {
    const key = buildCollectionKey(userId, collectionName);
    const ts = localStorage.getItem(key + '_TS');
    return ts ? parseInt(ts, 10) : 0;
  },

  shouldSyncCollection: (userId: string, collectionName: string, maxAgeMs: number): boolean => {
    const last = PersistenceService.getCollectionLastSync(userId, collectionName);
    if (!last) return true;
    return Date.now() - last > maxAgeMs;
  },

  setSession: (uid: string) => {
    try {
      sessionStorage.setItem(KEYS.SESSION_UID, uid);
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to set session.", e);
    }
  },

  clearSession: () => {
    try {
      sessionStorage.removeItem(KEYS.SESSION_UID);
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to clear session.", e);
    }
  },

  clearUserCache: (uid: string) => {
    try {
      const profileKey = buildProfileKey(uid);
      localStorage.removeItem(profileKey);
      localStorage.removeItem(profileKey + '_TS');
      localStorage.removeItem(profileKey + '_BACKUP');
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i) || '';
        if (key.startsWith(`${KEYS.COLLECTION_PREFIX}:${uid}:`)) {
          localStorage.removeItem(key);
          localStorage.removeItem(key + '_TS');
          localStorage.removeItem(key + '_BACKUP');
        }
      }
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to clear user cache.", e);
    }
  }
};
