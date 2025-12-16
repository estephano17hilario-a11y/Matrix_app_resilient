import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager
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

// --- 2. SINGLETON INSTANCES ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isConfigValid) {
  try {
    // A. Initialize App
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // B. Initialize Auth
    auth = getAuth(app);

    // C. Initialize Firestore (STANDARD MODE)
    // Reverting to standard persistent cache but with tab manager to handle multiple tabs.
    // Removing "experimentalForceLongPolling" as it might be causing 400 Bad Request errors.
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("🔥 MATRIX CORE: Firestore connected (Standard Persistence).");
    } catch (e: any) {
        if (e.code === 'failed-precondition') {
            db = getFirestore(app);
            console.log("🔥 MATRIX CORE: Firestore re-connected (HMR).");
        } else {
            console.error("🔥 MATRIX CORE: Firestore Init Failed", e);
            throw e;
        }
    }

  } catch (error) {
    console.error("❌ CRITICAL: Firebase failed to load.", error);
    app = {} as any;
    auth = {} as any;
    db = {} as any;
  }
} else {
  console.warn("⚠️ MATRIX CORE: Running in Config-Less Mode.");
  app = {} as any;
  auth = {} as any;
  db = {} as any;
}

// --- 3. EXPORTS ---
export { app, auth, db };
export const configStatus = {
    isValid: !!isConfigValid,
    hasKeys: Object.keys(firebaseConfig).length > 0
};
