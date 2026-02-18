import { 
  User
} from 'firebase/auth';

// --- LUX LOCAL PROTOCOL (OFFLINE-FIRST) ---
// "The Core" - A pure local simulation of the database.
// Replaces Google Firebase to ensure 100% Privacy and Reliability.

const STORAGE_PREFIX = 'lux_v1_';
const LEGACY_PREFIX = 'matrix_v1_';

// --- MOCK TYPES ---
export interface DocumentReference {
  path: string;
  id: string;
}

export interface DocumentSnapshot {
  exists(): boolean;
  data(): any;
  id: string;
}

// --- MOCK DATABASE ENGINE ---

const dispatchUpdate = (path: string) => {
  // Simple custom event for reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('matrix-db-update', { detail: { path } }));
  }
};

const getLocalData = (path: string) => {
  let raw = localStorage.getItem(STORAGE_PREFIX + path);
  if (!raw) {
    // Try legacy migration
    const legacy = localStorage.getItem(LEGACY_PREFIX + path);
    if (legacy) {
      raw = legacy;
      localStorage.setItem(STORAGE_PREFIX + path, legacy);
      // localStorage.removeItem(LEGACY_PREFIX + path); // Keep for safety
    }
  }
  return raw ? JSON.parse(raw) : null;
};

const setLocalData = (path: string, data: any) => {
  localStorage.setItem(STORAGE_PREFIX + path, JSON.stringify(data));
  dispatchUpdate(path);
};

// Helper: Handle "stats.xp" dot notation
const updateNestedData = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  
  const lastKey = keys[keys.length - 1];
  
  // Handle Special Operators
  if (value && typeof value === 'object' && value.__op === 'increment') {
    current[lastKey] = (current[lastKey] || 0) + value.value;
  } else if (value && typeof value === 'object' && value.__op === 'arrayUnion') {
    if (!Array.isArray(current[lastKey])) current[lastKey] = [];
    // Avoid duplicates
    const existing = new Set(current[lastKey]);
    value.elements.forEach((el: any) => {
      if (!existing.has(el)) current[lastKey].push(el);
    });
  } else {
    current[lastKey] = value;
  }
};

// --- FIRESTORE EXPORTS (MOCKED) ---

export const db = { type: 'local' }; // Mock Instance
export const auth = { type: 'local' }; // Mock Instance

export const doc = (_dbInstance: any, ...paths: string[]): DocumentReference => {
  const path = paths.join('/');
  const id = paths[paths.length - 1];
  return { path, id };
};

export const getDoc = async (ref: DocumentReference): Promise<DocumentSnapshot> => {
  const data = getLocalData(ref.path);
  return {
    exists: () => !!data,
    data: () => data,
    id: ref.id
  };
};

export const setDoc = async (ref: DocumentReference, data: any, options?: { merge: boolean }) => {
  if (options?.merge) {
    const existing = getLocalData(ref.path) || {};
    setLocalData(ref.path, { ...existing, ...data });
  } else {
    setLocalData(ref.path, data);
  }
};

export const updateDoc = async (ref: DocumentReference, data: any) => {
  const existing = getLocalData(ref.path) || {};
  
  Object.keys(data).forEach(key => {
    updateNestedData(existing, key, data[key]);
  });
  
  setLocalData(ref.path, existing);
};

export const runTransaction = async (_dbInstance: any, updateFunction: (transaction: any) => Promise<any>) => {
  // In local mode, we don't need real locking, but we simulate the interface
  const transaction = {
    get: async (ref: DocumentReference) => getDoc(ref),
    update: (ref: DocumentReference, data: any) => updateDoc(ref, data),
    set: (ref: DocumentReference, data: any) => setDoc(ref, data)
  };
  return await updateFunction(transaction);
};

export const arrayUnion = (...elements: any[]) => ({ __op: 'arrayUnion', elements });
export const increment = (value: number) => ({ __op: 'increment', value });

// Stub for collection/query/where/onSnapshot (Advanced features)
// For now, if used, they might need more logic. 
// Based on current usage, we mostly use doc/get/update.
// We'll add basic stubs to prevent crashes.

export const collection = (_dbInstance: any, ...paths: string[]) => ({ path: paths.join('/') });
export const query = (colRef: any, ..._constraints: any[]) => ({ colRef, constraints: _constraints });
export const where = (field: string, op: string, value: any) => ({ field, op, value });

export const deleteDoc = async (ref: DocumentReference) => {
  localStorage.removeItem(STORAGE_PREFIX + ref.path);
};

export const getDocs = async (queryOrCol: any) => {
  const results = [];
  const rootPath = STORAGE_PREFIX + queryOrCol.path + '/';
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(rootPath)) {
       const subPath = key.substring(STORAGE_PREFIX.length);
       const relative = subPath.substring(queryOrCol.path.length + 1);
       if (relative && !relative.includes('/')) {
         const data = JSON.parse(localStorage.getItem(key) || '{}');
         results.push({
           id: relative,
           data: () => data,
           exists: () => true
         });
       }
    }
  }
  return { docs: results, empty: results.length === 0 };
};

// Listener (Simple Polling or Event based? For now, no-op or simple fetch)
export const onSnapshot = (ref: any, callback: (snap: any) => void, errorCallback?: (error: Error) => void) => {
  // Initial call
  if (ref.path) { // Doc ref
     getDoc(ref).then(callback).catch(err => errorCallback && errorCallback(err));
  }

  // Listen for local updates
  const listener = (e: any) => {
    if (e.detail && e.detail.path === ref.path) {
      getDoc(ref).then(callback).catch(err => errorCallback && errorCallback(err));
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('matrix-db-update', listener);
  }

  // Return unsubscribe
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('matrix-db-update', listener);
    }
  }; 
};


// --- AUTH EXPORTS (MOCKED) ---

export const getAuth = (_app?: any) => auth;

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}

// Simple Auth State Observer
let authStateListeners: ((user: User | null) => void)[] = [];

const notifyAuthListeners = (user: User | null) => {
  authStateListeners.forEach(listener => listener(user));
  if (user) {
    localStorage.setItem(STORAGE_PREFIX + 'session_user', JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_PREFIX + 'session_user');
  }
};

export const onAuthStateChanged = (_authInstance: any, callback: (user: User | null) => void) => {
  authStateListeners.push(callback);
  // Initial check
  const savedUser = localStorage.getItem(STORAGE_PREFIX + 'session_user');
  if (savedUser) {
    callback(JSON.parse(savedUser));
  } else {
    callback(null);
  }
  
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== callback);
  };
};

export const signInWithPopup = async (_authInstance: any, _provider: any) => {
  // Simulate successful login
  const mockUser: User = {
    uid: 'local_operator_v1',
    displayName: 'Operator (Local)',
    email: 'operator@lux.local',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    providerId: 'firebase',
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock_token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
  };
  
  // Auto-create user profile in DB if not exists
  const userRef = doc(db, 'users', mockUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: mockUser.uid,
      displayName: mockUser.displayName,
      email: mockUser.email,
      stats: { hp: 100, xp: 0, gold: 0, level: 1 },
      createdAt: Date.now()
    });
  }
  
  notifyAuthListeners(mockUser);
  return { user: mockUser };
};

export const signOut = async (_authInstance: any) => {
  console.log('Lux: Disconnected from Core');
  notifyAuthListeners(null);
};

// Export app as dummy
export const app = { name: '[DEFAULT]' };
export type { User };
