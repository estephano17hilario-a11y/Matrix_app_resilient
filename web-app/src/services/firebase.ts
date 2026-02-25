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
    writeBatch as firestoreWriteBatch
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
export const setDoc = firestoreSetDoc;
export const getDoc = firestoreGetDoc;
export const updateDoc = firestoreUpdateDoc;
export const collection = firestoreCollection;
export const getDocs = firestoreGetDocs;
export const query = firestoreQuery;
export const deleteDoc = firestoreDeleteDoc;
export const onSnapshot = firestoreSnapshot;
export const runTransaction = firestoreRunTransaction;
export const writeBatch = firestoreWriteBatch;
export const addDoc = firestoreAddDoc;
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
