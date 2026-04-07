import { 
  auth, 
  db,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithCredential,
  signOut as firebaseSignOut,
  signInAnonymously,
  updateProfile,
  setDoc,
  User,
  doc, 
  getDoc,
  waitForPendingWrites
} from './firebase';
import { DEFAULT_USER_STATS } from '../types/User';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { PersistenceService } from './persistence';
import { retryOperation } from '../utils/networkUtils';

const googleProvider = new GoogleAuthProvider();

if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize({
      clientId: '337956413837-50tlt5kf1l8o39bobc1bispknmun857o.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (e) {
    console.warn("GoogleAuth initialization failed:", e);
  }
}

/**
 * ATOMIC USER INITIALIZATION (DESDE CERO)
 * This is the ONLY place where a user document is created.
 */
export const initializeUserDocument = async (user: User, additionalData: any = {}) => {
  const userDocRef = doc(db, 'users', user.uid);
  
  try {
    // 1. FORZAR PROPAGACIÓN DEL TOKEN A LAS REGLAS DE FIRESTORE
    await user.getIdToken(true);
    
    // 2. DELAY ESTRATÉGICO PARA CAPACITOR (Permitir que el motor de reglas procese el token)
    const delayMs = Capacitor.isNativePlatform() ? 1500 : 500;
    await new Promise(r => setTimeout(r, delayMs));

    // 3. INTENTAR LEER SI YA EXISTE
    let exists = false;
    let existingData = {};
    let getDocFailed = false;

    try {
        const userDoc = await getDoc(userDocRef);
        exists = userDoc.exists();
        if (exists) {
            existingData = userDoc.data() || {};
        }
    } catch (e) {
        console.warn("⚠️ MATRIX: getDoc failed in initializeUserDocument. Assuming network issue.", e);
        getDocFailed = true;
    }

    // 4. CREACIÓN DE NUEVO USUARIO ATÓMICA
    if (!exists && !getDocFailed) {
        console.log("💎 MATRIX: Creating fresh user document atomically...");
        const defaultData: any = {
            uid: user.uid,
            email: user.email || null,
            photoURL: user.photoURL || null,
            plan: 'FREE',
            archetype: 'NEO',
            stats: DEFAULT_USER_STATS,
            theme: 'MATRIX',
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
            onboarding: {
                successDefinition: "Becoming the One",
                obstacles: [],
                coachingTone: "Stoic",
                completedAt: 0,
                language: localStorage.getItem('i18nextLng') || 'en'
            },
            ...additionalData
        };

        if (additionalData.displayName) {
            defaultData.displayName = additionalData.displayName;
        } else if (user.displayName) {
            defaultData.displayName = user.displayName;
        }

        const cleanData = sanitizeFirestoreData(defaultData);
        
        // Escritura Atómica
        await retryOperation(() => setDoc(userDocRef, cleanData, { merge: true }));
        
        // En móviles, ESPERAR a que la base de datos confirme la escritura antes de continuar
        if (Capacitor.isNativePlatform()) {
            try {
                await waitForPendingWrites(db);
                console.log("💎 MATRIX: Mobile write confirmed.");
            } catch (e) {
                console.warn("⚠️ MATRIX: Mobile write confirmation timed out, but proceeding.");
            }
        }
        
        return cleanData;
    } else {
        // 5. ACTUALIZACIÓN SEGURA DE USUARIO EXISTENTE
        console.log("💎 MATRIX: Updating existing user login timestamp...");
        const updateData = { 
            lastLoginAt: Date.now(),
            ...additionalData
        };

        // PROTECCIÓN ABSOLUTA: Nunca sobrescribir datos críticos si falló la lectura
        if (updateData.onboarding) delete updateData.onboarding;
        if (getDocFailed) {
            delete updateData.plan;
            delete updateData.stats;
            delete updateData.theme;
            delete updateData.archetype;
        }

        const cleanUpdate = sanitizeFirestoreData(updateData);
        await retryOperation(() => setDoc(userDocRef, cleanUpdate, { merge: true }));
        return { ...existingData, ...cleanUpdate };
    }
  } catch (err) {
    console.error("⛔ CRITICAL ERROR in initializeUserDocument:", err);
    throw err;
  }
};

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    let user: User | null = null;

    if (Capacitor.isNativePlatform()) {
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const result = await signInWithCredential(auth, credential);
      user = result.user;
    } else {
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      const result = await signInWithPopup(auth, googleProvider);
      user = result.user;
    }

    if (user) {
        // BLOCKING INITIALIZATION: No dejamos que continúe hasta que Firestore esté listo
        await initializeUserDocument(user, { isAnonymous: false });
        PersistenceService.setSession(user.uid);
        return user;
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
};

export const loginAsGuest = async (name: string): Promise<User> => {
    try {
        const result = await signInAnonymously(auth);
        const user = result.user;
        
        await updateProfile(user, { displayName: name });
        // BLOCKING INITIALIZATION
        await initializeUserDocument(user, { displayName: name, isAnonymous: true, email: null });
        
        PersistenceService.setSession(user.uid);
        return user;
    } catch (error) {
        console.error("Guest Login Failed:", error);
        throw error;
    }
};

export const logout = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Disconnection Error:", error);
    throw error;
  }
};

export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists();
  } catch (error) {
    console.error("Database Query Failed:", error);
    return false; // Fail safe
  }
};