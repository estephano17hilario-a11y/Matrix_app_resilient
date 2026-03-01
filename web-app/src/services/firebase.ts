import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithPopup as firebasePopup,
  signInWithRedirect as firebaseSignInWithRedirect,
  signInWithCredential as firebaseSignInWithCredential,
  getRedirectResult as firebaseGetRedirectResult,
  createUserWithEmailAndPassword as firebaseCreate,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';
import { 
    getFirestore, 
    Firestore, 
    initializeFirestore, 
    persistentLocalCache,
    persistentMultipleTabManager,
    enableNetwork,
    disableNetwork,
    doc as firestoreDoc,
    setDoc as firestoreSetDoc,
    getDoc as firestoreGetDoc,
    updateDoc as firestoreUpdateDoc,
    collection as firestoreCollection,
    getDocs as firestoreGetDocs,
    query as firestoreQuery,
    deleteDoc as firestoreDeleteDoc,
    onSnapshot as firestoreSnapshot,
    waitForPendingWrites as firestoreWait,
    runTransaction as firestoreRunTransaction,
    addDoc as firestoreAddDoc,
    Timestamp,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    where,
    orderBy,
    limit,
    DocumentSnapshot,
    QuerySnapshot,
    DocumentReference, 
    CollectionReference,
    FirestoreError,
    Transaction,
    QueryConstraint,
    writeBatch as firestoreWriteBatch,
    WriteBatch
} from 'firebase/firestore';
import { getMessaging, Messaging, getToken, onMessage } from 'firebase/messaging';

// --- 1. CONFIGURATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isValidEnvValue = (value?: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  if (trimmed.includes('your_')) return false;
  return true;
};

const requiredConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId
};

const missingKeys = Object.entries(requiredConfig)
  .filter(([, value]) => !isValidEnvValue(value))
  .map(([key]) => key);

const isConfigValid = missingKeys.length === 0;

// --- 2. SINGLETON INSTANCES ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    
    // 🛡️ SECURITY: Explicitly set persistence to LOCAL to avoid session loss on redirect/refresh
    setPersistence(auth, browserLocalPersistence).catch(err => {
        console.warn("⚠️ MATRIX CORE: Failed to set Auth Persistence:", err);
    });

    // 💾 OFFLINE-FIRST: Enable Multi-Tab Persistence
    // This is critical for the "Matrix" experience (Zero Latency)
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("💎 MATRIX: Offline Persistence Enabled (Multi-Tab)");
    } catch (err: any) {
        // Fallback if already initialized or error
        if (err.code === 'failed-precondition') {
            console.warn("⚠️ MATRIX: Multiple tabs open, persistence enabled in first tab only.");
        } else if (err.code === 'unimplemented') {
            console.warn("⚠️ MATRIX: Browser doesn't support persistence.");
        }
        // Fallback to default
        db = getFirestore(app); 
    }

    // 🔔 MESSAGING (Optional)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        messaging = getMessaging(app);
      } catch (e) {
        console.warn("⚠️ MATRIX: Messaging not supported in this environment.");
      }
    }

  } catch (error) {
    console.error("❌ MATRIX CORE: Initialization Failed", error);
    // Phantom Mode Fallback (prevents crash)
    app = {} as any;
    auth = {} as any;
    db = {} as any;
  }
} else {
  console.warn("⚠️ MATRIX: Running in Phantom Mode (No Config)");
  app = {} as any;
  auth = {} as any;
  db = {} as any;
}

export { app, auth, db, messaging, getToken, onMessage };

const TRANSIENT_CODES = new Set([
  'aborted',
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'cancelled'
]);

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const withRetry = async <T>(op: () => Promise<T>, label: string, maxRetries = 5): Promise<T> => {
  let attempt = 0;
  let lastError: any = null;
  while (attempt <= maxRetries) {
    try {
      return await op();
    } catch (e: any) {
      lastError = e;
      const code = e?.code || e?.name || 'unknown';
      const isTransient = TRANSIENT_CODES.has(code);
      if (!isTransient && attempt > 0) break;
      if (!isTransient && attempt === 0) {
      } else if (!isTransient) {
        break;
      }
      const backoff = Math.min(200 * 2 ** attempt, 2000) + Math.floor(Math.random() * 150);
      attempt += 1;
      if (attempt > maxRetries) break;
      console.warn(`↻ Retry(${attempt}/${maxRetries}) ${label} after error:`, code);
      await sleep(backoff);
      continue;
    }
  }
  console.error(`✗ Permanent failure in ${label}:`, lastError);
  throw lastError;
};

const awaitSync = async (firestore: Firestore, timeoutMs = 2500) => {
  try {
    await Promise.race([
      firestoreWait(firestore),
      new Promise((_, reject) => setTimeout(() => reject(new Error('sync-timeout')), timeoutMs))
    ]);
  } catch {
  }
};

const safeSetDoc = async <T>(
  ref: DocumentReference<T>,
  data: Partial<T>,
  options?: { merge?: boolean },
  ensureSync: boolean = false
) => {
  const result = await withRetry(() => firestoreSetDoc(ref, data as any, options as any), `setDoc(${ref.path})`);
  if (ensureSync && (db as any)) await awaitSync(db);
  return result;
};

const safeUpdateDoc = async <T>(
  ref: DocumentReference<T>,
  data: Partial<T>,
  ensureSync: boolean = false
) => {
  const result = await withRetry(() => firestoreUpdateDoc(ref as any, data as any), `updateDoc(${(ref as any).path})`);
  if (ensureSync && (db as any)) await awaitSync(db);
  return result;
};

const safeAddDoc = async <T>(
  coll: CollectionReference<T>,
  data: T,
  ensureSync: boolean = false
) => {
  const result = await withRetry(() => firestoreAddDoc(coll as any, data as any), `addDoc(${coll.path})`);
  if (ensureSync && (db as any)) await awaitSync(db);
  return result;
};

const patchedWriteBatch = (firestore: Firestore): WriteBatch => {
  const batch = firestoreWriteBatch(firestore);
  const originalCommit = (batch as any).commit.bind(batch);
  (batch as any).commit = async () => {
    const res = await withRetry(() => originalCommit(), 'batch.commit');
    await awaitSync(firestore);
    return res;
  };
  return batch;
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    try { enableNetwork(db as any); } catch { }
  });
  window.addEventListener('offline', () => {
    try { disableNetwork(db as any); } catch { }
  });
}



export const configStatus = {
    isValid: !!isConfigValid,
    hasKeys: Object.keys(firebaseConfig).length > 0,
    missingKeys
};
export const onAuthStateChanged = (authInstance: Auth, observer: any) => {
    if (!authInstance) {
        observer(null);
        return () => {};
    }
    return firebaseOnAuthStateChanged(authInstance, observer);
};

export const signInWithEmailAndPassword = async (authInstance: Auth, email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return firebaseSignIn(authInstance, email, pass);
};

export const signInWithPopup = async (authInstance: Auth, provider: any) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return firebasePopup(authInstance, provider);
};

export const signInWithCredential = async (authInstance: Auth, credential: any) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return firebaseSignInWithCredential(authInstance, credential);
};

export const signInWithRedirect = async (authInstance: Auth, provider: any) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return firebaseSignInWithRedirect(authInstance, provider);
};

export const getRedirectResult = async (authInstance: Auth) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    try {
        return await firebaseGetRedirectResult(authInstance);
    } catch (e: any) {
        if (e.code === 'auth/missing-initial-state') return null;
        throw e;
    }
};

export const createUserWithEmailAndPassword = async (authInstance: Auth, email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return firebaseCreate(authInstance, email, pass);
};

export const signOut = async (authInstance: Auth) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return firebaseSignOut(authInstance);
};

export const signInAnonymously = async (authInstance: Auth) => {
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return firebaseSignInAnonymously(authInstance);
};

export const updateProfile = async (user: any, profile: any) => {
    return firebaseUpdateProfile(user, profile);
};

export const doc = firestoreDoc;
export const setDoc = safeSetDoc as typeof firestoreSetDoc;
export const getDoc = firestoreGetDoc;
export const updateDoc = safeUpdateDoc as typeof firestoreUpdateDoc;
export const collection = firestoreCollection;
export const getDocs = firestoreGetDocs;
export const query = firestoreQuery;
export const deleteDoc = firestoreDeleteDoc;
export const onSnapshot = firestoreSnapshot;
export const runTransaction = firestoreRunTransaction;
export const writeBatch = patchedWriteBatch as unknown as typeof firestoreWriteBatch;
export const addDoc = safeAddDoc as typeof firestoreAddDoc;
export const waitForPendingWrites = firestoreWait;

// Re-export common types and SDK features
export { 
    GoogleAuthProvider,
    Timestamp,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    where,
    orderBy,
    limit,
    DocumentSnapshot, 
    QuerySnapshot, 
    DocumentReference, 
    CollectionReference,
    Transaction
};
export type { User } from 'firebase/auth';
export type { 
    Firestore,
    Auth,
    QueryConstraint,
    FirestoreError
};
