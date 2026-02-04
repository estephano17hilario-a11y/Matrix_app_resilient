import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithPopup as firebasePopup,
  signInWithCredential as firebaseSignInWithCredential,
  getRedirectResult as firebaseGetRedirectResult,
  createUserWithEmailAndPassword as firebaseCreate,
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

const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.length > 20 &&
  !firebaseConfig.apiKey.includes('your_api_key');

// --- 1.5 FORCE OFFLINE OVERRIDE ---
const forceOffline = localStorage.getItem('MATRIX_FORCE_OFFLINE') === 'true';

// --- 2. SINGLETON INSTANCES ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;

if (isConfigValid && !forceOffline) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    
    // 🛡️ SECURITY: Explicitly set persistence to LOCAL to avoid session loss on redirect/refresh
    setPersistence(auth, browserLocalPersistence).catch(err => {
        console.warn("⚠️ MATRIX CORE: Failed to set Auth Persistence:", err);
    });

    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.warn("⚠️ MATRIX CORE: Firebase Messaging not supported in this environment.", e);
    }
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("🔥 MATRIX CORE: Firestore connected with Persistence.");
    } catch (e: any) {
        if (e.code === 'failed-precondition' || e.code === 'unimplemented') {
            console.warn("⚠️ MATRIX CORE: Persistence unavailable, falling back to memory cache.");
            try {
                db = getFirestore(app);
            } catch {
                db = initializeFirestore(app, {
                    localCache: persistentLocalCache({})
                });
            }
        } else if (e.message && e.message.includes('already exists')) {
             db = getFirestore(app);
        } else {
            console.error("🔥 MATRIX CORE: Firestore Init Failed", e);
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
export { app, auth, db, messaging, getToken, onMessage };



export const configStatus = {
    isValid: !!isConfigValid,
    hasKeys: Object.keys(firebaseConfig).length > 0
};

import { 
    PHANTOM_USER, 
    phantomDoc, 
    phantomGetDoc, 
    phantomSetDoc, 
    phantomUpdateDoc,
    phantomDeleteDoc,
    phantomGetDocs,
    phantomOnAuthStateChanged,
    phantomOnSnapshot,
    phantomRunTransaction,
    phantomWriteBatch
} from './phantom';

// --- AUTH PHANTOM PROXIES ---

export const onAuthStateChanged = (authInstance: any, observer: any) => {
    if (authInstance?._isMock) {
        return phantomOnAuthStateChanged(authInstance, observer);
    }
    return firebaseOnAuthStateChanged(authInstance, observer);
};

export const signInWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    if (authInstance?._isMock) {
        console.warn("🛡️ PHANTOM AUTH: Simulating Login...");
        await new Promise(r => setTimeout(r, 200));
        
        const user = { 
            ...PHANTOM_USER, 
            email, 
            displayName: email.split('@')[0],
            uid: `phantom-${email.replace(/[^a-zA-Z0-9]/g, '-')}` 
        };

        localStorage.setItem('MATRIX_PHANTOM_SESSION', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));

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
        await new Promise(r => setTimeout(r, 300));
        
        localStorage.setItem('MATRIX_PHANTOM_SESSION', JSON.stringify({
            uid: PHANTOM_USER.uid,
            email: PHANTOM_USER.email,
            displayName: PHANTOM_USER.displayName,
            photoURL: PHANTOM_USER.photoURL
        }));

        if (authInstance._notifyAuthState) {
            authInstance._notifyAuthState(PHANTOM_USER);
        }
        return { user: PHANTOM_USER };
    }
    return firebasePopup(authInstance, provider);
};

export const signInWithCredential = async (authInstance: any, credential: any) => {
    if (authInstance?._isMock) {
         console.warn("🛡️ PHANTOM AUTH: Simulating Credential Login...");
         return signInWithPopup(authInstance, credential);
    }
    return firebaseSignInWithCredential(authInstance, credential);
};

export const signInWithRedirect = async (authInstance: any, provider: any) => {
    // 🛡️ FORCE OVERRIDE: Redirect is dangerous on partitioned storage environments (Brave, Incognito).
    // We forcibly upgrade this call to Popup to prevent the "Missing Initial State" crash.
    console.warn("⚠️ MATRIX CORE: signInWithRedirect intercepted. Upgrading to signInWithPopup for stability.");
    return signInWithPopup(authInstance, provider);
};

export const getRedirectResult = async (authInstance: any) => {
    if (authInstance?._isMock) {
        return null;
    }
    try {
        return await firebaseGetRedirectResult(authInstance);
    } catch (e: any) {
        // Silently handle the "missing initial state" error at the lowest level
        if (e.code === 'auth/missing-initial-state') {
            console.debug("⚠️ MATRIX CORE: Suppressed 'missing initial state' error.");
            return null;
        }
        throw e;
    }
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, pass: string) => {
    if (authInstance?._isMock) {
        console.warn("🛡️ PHANTOM AUTH: Simulating Registration...");
        await new Promise(r => setTimeout(r, 400));
        
        const user = { 
            ...PHANTOM_USER, 
            email, 
            displayName: email.split('@')[0],
            uid: `phantom-${email.replace(/[^a-zA-Z0-9]/g, '-')}`
        };

        localStorage.setItem('MATRIX_PHANTOM_SESSION', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));

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
        localStorage.removeItem('MATRIX_PHANTOM_SESSION');
        localStorage.removeItem('MATRIX_FORCE_OFFLINE');
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
        return phantomGetDocs(queryRef);
    }
    return firestoreGetDocs(queryRef);
};

export const query = (ref: any, ...constraints: any[]) => {
    if (ref?.firestore?._isMock || ref?._isMock) return ref;
    return firestoreQuery(ref, ...constraints);
};

export const deleteDoc = async (docRef: any) => {
    if (docRef?.firestore?._isMock || docRef?._isMock) {
        return phantomDeleteDoc(docRef);
    }
    return firestoreDeleteDoc(docRef);
};

export const onSnapshot = (ref: any, ...args: any[]) => {
    if (ref?.firestore?._isMock || ref?._isMock) {
        const [first, second, third] = args;
        if (typeof first === 'function') {
            return phantomOnSnapshot(ref, first, second);
        }
        return phantomOnSnapshot(ref, second, third);
    }
    // @ts-ignore
    return firestoreSnapshot(ref, ...args);
};

export const runTransaction = async (firestore: any, updateFunction: any, options?: any) => {
    if ((firestore as any)?._isMock) {
        return phantomRunTransaction(firestore, updateFunction);
    }
    return firestoreRunTransaction(firestore, updateFunction, options);
};

export const writeBatch = (firestore: any) => {
    if ((firestore as any)?._isMock) {
        return phantomWriteBatch(firestore);
    }
    return firestoreWriteBatch(firestore);
};

export const addDoc = async (collectionRef: any, data: any) => {
    if (collectionRef?.firestore?._isMock || collectionRef?._isMock) {
         const id = 'phantom-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
         const path = collectionRef.path + '/' + id;
         const docRef = { type: 'document', path, firestore: collectionRef.firestore, id };
         await phantomSetDoc(docRef, data);
         return docRef;
    }
    return firestoreAddDoc(collectionRef, data);
};

export const waitForPendingWrites = async (firestore: any) => {
    if ((firestore as any)?._isMock) return Promise.resolve();
    return firestoreWait(firestore);
};

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
