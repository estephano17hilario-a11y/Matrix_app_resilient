import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- CONFIGURATION CHECK ---
// Detects if the user hasn't set up the .env file yet
const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'your_api_key' &&
  !firebaseConfig.apiKey.includes('undefined');

let app;
let authInstance;
let dbInstance;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (e) {
    console.error("Matrix Core: Firebase Initialization Error", e);
  }
} else {
  console.warn("⚠️ MATRIX OS: FIREBASE CONFIG MISSING OR INVALID.");
  console.warn("Please update .env with your Firebase credentials.");
}

// Export safe instances (or mocks/nulls if failed) that won't crash the app immediately
// We'll handle the null check in AuthContext/AuthScreen
export const auth = authInstance || { _isMock: true } as any; 
export const db = dbInstance || { _isMock: true } as any;
export const configStatus = {
    isValid: !!isConfigValid,
    missingKeys: Object.keys(firebaseConfig).filter(k => !firebaseConfig[k as keyof typeof firebaseConfig] || firebaseConfig[k as keyof typeof firebaseConfig] === 'your_api_key' || firebaseConfig[k as keyof typeof firebaseConfig]?.includes('your_'))
};
