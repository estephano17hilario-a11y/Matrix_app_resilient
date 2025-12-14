import { initializeApp } from "firebase/app"; 
import { getFirestore, enableIndexedDbPersistence, Firestore } from "firebase/firestore"; 
import { getAuth, Auth } from "firebase/auth";

// --- MATRIX FIREBASE CONFIGURATION ---
// "The Source Code"
const firebaseConfig = { 
  apiKey: "AIzaSyALLIuxXboJCvYa96NM4wzZICu5hLRzSF8", 
  authDomain: "matrix-4012f.firebaseapp.com", 
  projectId: "matrix-4012f", 
  storageBucket: "matrix-4012f.firebasestorage.app", 
  messagingSenderId: "770116190928", 
  appId: "1:770116190928:web:c54645c2d2af5976c6d4d5", 
  measurementId: "G-6Y71JPSLRQ" 
}; 

// 1. Initialize App
const app = initializeApp(firebaseConfig); 

// 2. Initialize Services
const db: Firestore = getFirestore(app); 
const auth: Auth = getAuth(app);

// 3. OFFLINE PERSISTENCE (Matrix Resiliency)
// Allows the app to work seamlessly without network, syncing later.
enableIndexedDbPersistence(db) 
  .catch((err: any) => { 
    if (err.code == 'failed-precondition') { 
        console.warn('Matrix Offline Mode: Multiple tabs open. Persistence enabled in one tab only.'); 
    } else if (err.code == 'unimplemented') { 
        console.warn('Matrix Offline Mode: Browser does not support offline persistence.'); 
    } 
  }); 

// Export core instances
export { app, db, auth };
