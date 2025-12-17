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
