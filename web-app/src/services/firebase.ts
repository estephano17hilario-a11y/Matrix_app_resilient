import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithPopup as firebasePopup,
  createUserWithEmailAndPassword as firebaseCreate,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider
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
  waitForPendingWrites as firestoreWait
} from 'firebase/firestore';

// --- 1. CONFIGURATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.length > 20 &&
  !firebaseConfig.apiKey.includes('your_api_key');

// --- 1.5 FORCE OFFLINE OVERRIDE ---
// Allows the app to function even if the network is dead by forcing Phantom Mode.
const forceOffline = localStorage.getItem('MATRIX_FORCE_OFFLINE') === 'true';

// --- 2. SINGLETON INSTANCES ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isConfigValid && !forceOffline) {
  try {
    // A. Initialize App
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // B. Initialize Auth
    auth = getAuth(app);

    // C. Initialize Firestore (STANDARD MODE)
    // Using standard configuration with automatic fallback.
    // We avoid 'experimentalForceLongPolling' as it can cause 'net::ERR_ABORTED' in modern environments.
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                // Tab manager can be unstable in some dev environments; defaulting to standard behavior is safer.
                // If multi-tab sync is critical, we can re-enable it carefully.
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("🔥 MATRIX CORE: Firestore connected with Persistence.");
    } catch (e: any) {
        // Fallback for HMR or environments where persistence fails (e.g., Private Mode)
        if (e.code === 'failed-precondition' || e.code === 'unimplemented') {
            console.warn("⚠️ MATRIX CORE: Persistence unavailable, falling back to memory cache.");
            try {
                // Try getting existing instance first
                db = getFirestore(app);
            } catch {
                // If that fails, initialize without persistence
                db = initializeFirestore(app, {
                    localCache: persistentLocalCache({}) // Try minimal cache or let it default
                });
            }
        } else if (e.message && e.message.includes('already exists')) {
             db = getFirestore(app);
        } else {
            console.error("🔥 MATRIX CORE: Firestore Init Failed", e);
            // Last resort fallback to keep app alive
            try {
                 db = getFirestore(app);
            } catch (finalErr) {
                 console.error("☠️ FATAL: Could not initialize Firestore.", finalErr);
                 throw e;
            }
        }
    }

  } catch (error) {
    console.error("❌ CRITICAL: Firebase failed to load.", error);
    app = { _isMock: true } as any;
    auth = { _isMock: true } as any;
    db = { _isMock: true } as any;
  }
} else {
  console.warn("⚠️ MATRIX CORE: Running in Config-Less Mode.");
  app = { _isMock: true } as any;
  auth = { _isMock: true } as any;
  db = { _isMock: true } as any;
}

// --- 3. EXPORTS & PHANTOM PROXIES ---
export { app, auth, db };
export const configStatus = {
    isValid: !!isConfigValid,
    hasKeys: Object.keys(firebaseConfig).length > 0
};

import { 
    PHANTOM_USER, 
    phantomDoc, 
    phantomGetDoc, 
    phantomSetDoc, 
    phantomUpdateDoc 
} from './phantom';

// --- AUTH PHANTOM PROXIES ---
export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    if (authInstance?._isMock) {
        console.warn("🛡️ PHANTOM AUTH: Simulating Login...");
        await new Promise(r => setTimeout(r, 800)); // Simulate network
        
        const user = { ...PHANTOM_USER, email, displayName: email.split('@')[0] };
        if (authInstance._notifyAuthState) {
            authInstance._notifyAuthState(user);
        }
        return { user };
    }
    return firebaseSignIn(authInstance, email, pass);
};

export const signInWithPopup = async (authInstance: any, provider: any) => {
    if (authInstance?._isMock) {
        console.warn("🛡️ PHANTOM AUTH: Simulating Google Login...");
        await new Promise(r => setTimeout(r, 1000));
        
        if (authInstance._notifyAuthState) {
            authInstance._notifyAuthState(PHANTOM_USER);
        }
        return { user: PHANTOM_USER };
    }
    return firebasePopup(authInstance, provider);
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    if (authInstance?._isMock) {
        console.warn("🛡️ PHANTOM AUTH: Simulating Registration...");
        await new Promise(r => setTimeout(r, 1200));
        
        const user = { ...PHANTOM_USER, email, displayName: 'New Operator' };
        if (authInstance._notifyAuthState) {
            authInstance._notifyAuthState(user);
        }
        return { user };
    }
    return firebaseCreate(authInstance, email, pass);
};

export const signOut = async (authInstance: any) => {
    if (authInstance?._isMock) {
        console.warn("🛡️ PHANTOM AUTH: Simulating Logout...");
        localStorage.removeItem('MATRIX_FORCE_OFFLINE'); // Reset on logout
        window.location.reload();
        return;
    }
    return firebaseSignOut(authInstance);
};

export const updateProfile = async (user: any, profile: any) => {
    if ((auth as any)?._isMock) {
        console.warn("🛡️ PHANTOM AUTH: Simulating Profile Update...");
        return;
    }
    return firebaseUpdateProfile(user, profile);
};

// --- FIRESTORE PHANTOM PROXIES ---
export const doc = (firestore: any, path: string, ...segments: string[]) => {
    if ((firestore as any)?._isMock) return phantomDoc(firestore, path, ...segments);
    return firestoreDoc(firestore, path, ...segments);
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
    if (docRef?.firestore?._isMock || docRef?._isMock) {
        return phantomSetDoc(docRef, data, options);
    }
    return firestoreSetDoc(docRef, data, options);
};

export const getDoc = async (docRef: any) => {
    if (docRef?.firestore?._isMock || docRef?._isMock) {
        return phantomGetDoc(docRef);
    }
    return firestoreGetDoc(docRef);
};

export const updateDoc = async (docRef: any, data: any) => {
    if (docRef?.firestore?._isMock || docRef?._isMock) {
        return phantomUpdateDoc(docRef, data);
    }
    return firestoreUpdateDoc(docRef, data);
};

export const collection = (firestore: any, path: string, ...segments: string[]) => {
    if ((firestore as any)?._isMock) return { _isMock: true, firestore, path: [path, ...segments].join('/') } as any;
    return firestoreCollection(firestore, path, ...segments);
};

export const getDocs = async (queryRef: any) => {
    if (queryRef?.firestore?._isMock || queryRef?._isMock) {
        console.warn("🛡️ PHANTOM DB: Simulating getDocs...");
        return { docs: [] };
    }
    return firestoreGetDocs(queryRef);
};

export const query = (ref: any, ...constraints: any[]) => {
    if (ref?.firestore?._isMock || ref?._isMock) return ref;
    return firestoreQuery(ref, ...constraints);
};

export const deleteDoc = async (docRef: any) => {
    if (docRef?.firestore?._isMock || docRef?._isMock) {
        console.warn("🛡️ PHANTOM DB: Simulating Delete...");
        return;
    }
    return firestoreDeleteDoc(docRef);
};

export const waitForPendingWrites = async (firestore: any) => {
    if ((firestore as any)?._isMock) return Promise.resolve();
    return firestoreWait(firestore);
};

export { GoogleAuthProvider };
export type { Firestore, Auth };
