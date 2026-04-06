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
  getDoc 
} from './firebase';
import { DEFAULT_USER_STATS } from '../types/User';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';

/**
 * SERVICE: Firebase Authentication & User Data
 * LOGIC: Pure business logic. No UI.
 */

const googleProvider = new GoogleAuthProvider();

export const initializeUserDocument = async (user: User, additionalData: any = {}, isNewRegistration: boolean = false) => {
  const userDocRef = doc(db, 'users', user.uid);
  
  try {
    // If we know it's a new registration, skip getDoc to avoid permission-denied race conditions
    let exists = false;
    let existingData = {};
    let getDocFailed = false;
    
    if (!isNewRegistration) {
      try {
        const userDoc = await getDoc(userDocRef);
        exists = userDoc.exists();
        if (exists) {
          existingData = userDoc.data() || {};
        }
      } catch (e) {
        console.warn("getDoc failed in initializeUserDocument, assuming it might not exist or offline:", e);
        getDocFailed = true;
      }
    }

    // Si es un registro nuevo confirmado, o si estamos 100% seguros de que no existe (getDoc funcionó y devolvió exists=false)
    if (isNewRegistration || (!exists && !getDocFailed)) {
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
        ...additionalData
      };

      if (!defaultData.onboarding) {
        defaultData.onboarding = {
          successDefinition: "Becoming the One",
          obstacles: [],
          coachingTone: "Stoic",
          completedAt: 0,
          language: "en"
        };
      }
      
      if (additionalData.displayName) {
          defaultData.displayName = additionalData.displayName;
      } else if (user.displayName) {
          defaultData.displayName = user.displayName;
      }
      
      const cleanData = sanitizeFirestoreData(defaultData);
      await setDoc(userDocRef, cleanData, { merge: true });
      return cleanData;
    } else {
      // Si ya existe O si getDoc falló (no sabemos si existe o no, así que NO sobrescribimos nada crítico)
      const updateData = { 
        lastLoginAt: Date.now(),
        ...additionalData
      };

      // NUNCA sobrescribir el onboarding si getDoc falló o si el documento ya existe
      if (updateData.onboarding) {
          delete updateData.onboarding;
      }
      // Tampoco sobrescribir plan, stats, o theme accidentalmente si venían en additionalData
      if (getDocFailed) {
          delete updateData.plan;
          delete updateData.stats;
          delete updateData.theme;
          delete updateData.archetype;
      }

      const cleanUpdate = sanitizeFirestoreData(updateData);
      await setDoc(userDocRef, cleanUpdate, { merge: true });
      return { ...existingData, ...cleanUpdate };
    }
  } catch (err) {
    console.error("Critical error in initializeUserDocument:", err);
    throw err;
  }
};

import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { PersistenceService } from './persistence';

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

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const currentLanguage = localStorage.getItem('i18nextLng') || 'en';
    
    if (Capacitor.isNativePlatform()) {
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const result = await signInWithCredential(auth, credential);
      if (result.user) {
        PersistenceService.setSession(result.user.uid);
        try {
            await initializeUserDocument(result.user, { 
                isAnonymous: false,
                onboarding: {
                    successDefinition: "Becoming the One",
                    obstacles: [],
                    coachingTone: "Stoic",
                    completedAt: 0,
                    language: currentLanguage
                }
            });
        } catch(e) {
            console.warn("Secondary profile initialization failed:", e);
        }
        return result.user;
      }
      return null;
    } else {
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user) {
        PersistenceService.setSession(user.uid);
        try {
            await initializeUserDocument(user, { 
                isAnonymous: false,
                onboarding: {
                    successDefinition: "Becoming the One",
                    obstacles: [],
                    coachingTone: "Stoic",
                    completedAt: 0,
                    language: currentLanguage
                }
            });
        } catch(e) {
            console.warn("Secondary profile initialization failed:", e);
        }
        return user;
      }
      return null;
    }
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
        PersistenceService.setSession(user.uid);
        
        try {
            await updateProfile(user, { displayName: name });
            await initializeUserDocument(user, { 
                displayName: name,
                isAnonymous: true,
                email: null
            });
        } catch(e) {
            console.warn("Secondary profile initialization failed:", e);
        }

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
