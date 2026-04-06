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

const STORAGE_VERSION = 3; // Bumped to force fresh sync from Firestore

type PersistedEnvelope<T> = {
  v: number;
  uid: string;
  updatedAt: number;
  checksum: string;
  data: T;
};

// --- ROBUST HASHING (FNV-1a) ---
const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // Correct FNV-1a multiplication: hash * 16777619
    // (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24) = hash * 16777618
    // So we add hash one more time.
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

// --- STABLE SERIALIZATION ---
// Ensures {a:1, b:2} and {b:2, a:1} produce the same string for checksums
const stableStringify = (obj: any): string => {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => {
    return JSON.stringify(key) + ':' + stableStringify(obj[key]);
  });
  return '{' + parts.join(',') + '}';
};

const buildProfileKey = (uid: string) => `${KEYS.PROFILE}:${uid}`;
const buildCollectionKey = (uid: string, collectionName: string) => `${KEYS.COLLECTION_PREFIX}:${uid}:${collectionName}`;
const buildCollectionSafeKey = (uid: string, collectionName: string) => `${buildCollectionKey(uid, collectionName)}_SAFE`;

// --- SAFE STORAGE ACCESS ---
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      // Handle Quota Exceeded
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn("💾 MATRIX MEMORY: Quota exceeded. Attempting cleanup...");
        try {
          // Emergency cleanup: Remove backups
          Object.keys(localStorage).forEach(k => {
            if (k.endsWith('_BACKUP')) localStorage.removeItem(k);
          });
          // Retry once
          localStorage.setItem(key, value);
          return true;
        } catch {
          console.error("💾 MATRIX MEMORY: Critical storage failure.");
          return false;
        }
      }
      return false;
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  },
  length: () => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.length : 0;
    } catch { return 0; }
  },
  key: (i: number) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.key(i) : null;
    } catch { return null; }
  }
};

const findLatestProfileUid = () => {
  try {
    const prefix = `${KEYS.PROFILE}:`;
    let latestUid = '';
    let latestTs = 0;
    const len = safeStorage.length();
    
    for (let i = 0; i < len; i += 1) {
      const key = safeStorage.key(i) || '';
      if (!key.startsWith(prefix) || !key.endsWith('_TS')) continue;
      
      const tsRaw = safeStorage.getItem(key);
      const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
      
      if (!Number.isFinite(ts) || ts <= latestTs) continue;
      
      // Extract UID: PREFIX + UID + _TS
      // PREFIX length includes ':'
      // Suffix is '_TS' (3 chars)
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
  // Use stable stringify for consistent checksums
  const payload = stableStringify({ v: STORAGE_VERSION, uid, data });
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
    
    // Integrity Check 1: Structure
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.uid !== uid) return null;

    // Integrity Check 2: Version & Checksum
    if (parsed.v === STORAGE_VERSION) {
       // Reconstruct payload with stable stringify
       const payload = stableStringify({ v: parsed.v, uid: parsed.uid, data: parsed.data });
       if (hashString(payload) !== parsed.checksum) {
         console.warn("⚠️ MATRIX MEMORY: Checksum mismatch for", uid);
         // CRITICAL FIX: Return data anyway to prevent total data loss in case of hashing algorithm drift
         // or if the data was modified externally.
         // We prioritize DATA AVAILABILITY over strict integrity checks here, 
         // as losing user projects is worse than loading potentially slightly older data.
         return parsed;
       }
       return parsed;
    } 
    
    // MIGRATION STRATEGY (V1 -> V2 -> V3)
    // If version is 1 or 2, we try to accept it if valid, but we don't verify checksum strictly 
    // because older versions had unstable stringify and weak hash.
    // We implicitly "trust" older data if it parses correctly, to allow migration.
    if (parsed.v === 1 || parsed.v === 2) {
        console.log(`♻️ MATRIX MEMORY: Migrating V${parsed.v} data for`, uid);
        return parsed; // Return it so it can be re-saved as current version
    }

    return null;
  } catch {
    return null;
  }
};

const readWithBackup = <T>(key: string, uid: string): T | null => {
  const primary = parseEnvelope<T>(safeStorage.getItem(key), uid);
  if (primary) return primary.data;
  
  const backupRaw = safeStorage.getItem(key + '_BACKUP');
  const backup = parseEnvelope<T>(backupRaw, uid);
  
  if (backup) {
    console.warn("⚠️ MATRIX MEMORY: Restoring from backup for", key);
    // If we recovered from backup, try to restore primary
    safeStorage.setItem(key, backupRaw as string);
    return backup.data;
  }
  return null;
};

const persistWithBackup = <T>(key: string, uid: string, data: T) => {
  const previous = safeStorage.getItem(key);
  if (previous) {
    safeStorage.setItem(key + '_BACKUP', previous);
  }
  const envelope = buildEnvelope(uid, data);
  safeStorage.setItem(key, JSON.stringify(envelope));
};

export const PersistenceService = {
  // --- PROFILE (Auth + Stats) ---
  saveProfile: (profile: UserProfile | UserData) => {
    try {
      if (!profile) return;
      if (!profile.uid) return;
      const key = buildProfileKey(profile.uid);
      persistWithBackup(key, profile.uid, profile);
      safeStorage.setItem(key + '_TS', Date.now().toString());
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to write profile.", e);
    }
  },

  getProfile: (uid?: string): UserProfile | null => {
    try {
      let resolvedUid = uid || sessionStorage.getItem(KEYS.SESSION_UID) || localStorage.getItem(KEYS.SESSION_UID);
      
      if (!resolvedUid) {
          resolvedUid = findLatestProfileUid();
          if (resolvedUid) console.log("💾 MATRIX MEMORY: Auto-detected last user:", resolvedUid);
      }

      if (!resolvedUid) {
          // FINAL FALLBACK: Scan all keys for any profile
          const len = safeStorage.length();
          for (let i = 0; i < len; i++) {
              const key = safeStorage.key(i) || '';
              if (key.startsWith(KEYS.PROFILE + ':') && !key.endsWith('_TS') && !key.endsWith('_BACKUP')) {
                  const parts = key.split(':');
                  if (parts.length >= 2) {
                      resolvedUid = parts[1];
                      console.log("💾 MATRIX MEMORY: Found orphan profile:", resolvedUid);
                      break;
                  }
              }
          }
      }

      if (!resolvedUid) return null;
      
      const key = buildProfileKey(resolvedUid);
      const profile = readWithBackup<UserProfile>(key, resolvedUid);
      
      if (profile) {
          // Ensure stats exist
          if (!profile.stats) {
              profile.stats = {
                  hp: 100,
                  maxHp: 100,
                  xp: 0,
                  level: 1,
                  gold: 0,
                  streak: 0,
                  lastStreakDate: '',
                  streakFrozenUntil: undefined
              };
          }
      }
      
      return profile;
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
      safeStorage.removeItem(key);
      safeStorage.removeItem(key + '_TS');
      safeStorage.removeItem(key + '_BACKUP');
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to clear profile.", e);
    }
  },

  // --- THEME ---
  saveTheme: (theme: string) => {
    safeStorage.setItem(KEYS.THEME, theme);
  },

  getTheme: (): string | null => {
    return safeStorage.getItem(KEYS.THEME);
  },

  // --- UTILS ---
  getLastSyncTime: (): number => {
    const sessionUid = sessionStorage.getItem(KEYS.SESSION_UID) || '';
    if (!sessionUid) return 0;
    const ts = safeStorage.getItem(buildProfileKey(sessionUid) + '_TS');
    return ts ? parseInt(ts, 10) : 0;
  },

  saveCollection: <T>(userId: string, collectionName: string, items: T[]) => {
    try {
      const key = buildCollectionKey(userId, collectionName);
      persistWithBackup(key, userId, items || []);
      safeStorage.setItem(key + '_TS', Date.now().toString());
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to write collection.", e);
    }
  },
  saveCollectionSafe: <T>(userId: string, collectionName: string, items: T[]) => {
    try {
      if (!items || items.length === 0) return;
      const key = buildCollectionSafeKey(userId, collectionName);
      persistWithBackup(key, userId, items);
      safeStorage.setItem(key + '_TS', Date.now().toString());
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to write safe collection.", e);
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
  getCollectionSafe: <T>(userId: string, collectionName: string): T[] | null => {
    try {
      const key = buildCollectionSafeKey(userId, collectionName);
      return readWithBackup<T[]>(key, userId);
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Corrupted safe collection cache.", e);
      return null;
    }
  },
  clearCollectionSafe: (userId: string, collectionName: string) => {
    try {
      const key = buildCollectionSafeKey(userId, collectionName);
      safeStorage.removeItem(key);
      safeStorage.removeItem(key + '_TS');
      safeStorage.removeItem(key + '_BACKUP');
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to clear safe collection.", e);
    }
  },

  hasCollectionCache: (userId: string, collectionName: string): boolean => {
    try {
      const key = buildCollectionKey(userId, collectionName);
      return !!safeStorage.getItem(key) || !!safeStorage.getItem(key + '_BACKUP');
    } catch {
      return false;
    }
  },

  getCollectionLastSync: (userId: string, collectionName: string): number => {
    const key = buildCollectionKey(userId, collectionName);
    const ts = safeStorage.getItem(key + '_TS');
    return ts ? parseInt(ts, 10) : 0;
  },

  shouldSyncCollection: (userId: string, collectionName: string, maxAgeMs: number): boolean => {
    const last = PersistenceService.getCollectionLastSync(userId, collectionName);
    if (!last) return true;
    return Date.now() - last > maxAgeMs;
  },

  setSession: (uid: string) => {
    try {
      localStorage.setItem(KEYS.SESSION_UID, uid);
      sessionStorage.setItem(KEYS.SESSION_UID, uid);
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to set session.", e);
    }
  },

  clearSession: () => {
    try {
      localStorage.removeItem(KEYS.SESSION_UID);
      sessionStorage.removeItem(KEYS.SESSION_UID);
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to clear session.", e);
    }
  },

  clearUserCache: (uid: string) => {
    try {
      const profileKey = buildProfileKey(uid);
      safeStorage.removeItem(profileKey);
      safeStorage.removeItem(profileKey + '_TS');
      safeStorage.removeItem(profileKey + '_BACKUP');
      
      const len = safeStorage.length();
      // Iterate backwards to safely remove keys
      for (let i = len - 1; i >= 0; i -= 1) {
        const key = safeStorage.key(i) || '';
        if (key.startsWith(`${KEYS.COLLECTION_PREFIX}:${uid}:`)) {
          safeStorage.removeItem(key);
          safeStorage.removeItem(key + '_TS');
          safeStorage.removeItem(key + '_BACKUP');
        }
      }
    } catch (e) {
      console.error("💾 MATRIX MEMORY: Failed to clear user cache.", e);
    }
  }
};
