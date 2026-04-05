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

/**
 * SERVICE: Firebase Authentication & User Data
 * LOGIC: Pure business logic. No UI.
 */

const googleProvider = new GoogleAuthProvider();

export const initializeUserDocument = async (user: User, additionalData: any = {}) => {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    const defaultData: any = {
      uid: user.uid,
      email: user.email,
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
        language: "en"
      },
      ...additionalData
    };
    
    // Only set displayName if it's explicitly provided in additionalData or user object
    if (additionalData.displayName) {
        defaultData.displayName = additionalData.displayName;
    } else if (user.displayName) {
        defaultData.displayName = user.displayName;
    }
    
    // We use merge: true to avoid race conditions with onAuthStateChanged
    await setDoc(userDocRef, defaultData, { merge: true });
    return defaultData;
  } else {
    // If it exists, just update lastLoginAt and any additional data passed (like displayName)
    const updateData = { 
      lastLoginAt: Date.now(),
      ...additionalData
    };

    // FIX: Never overwrite onboarding progress for existing users
    // This prevents the Google Sign-In redirect loop where users are asked to create their account again
    if (updateData.onboarding) {
        delete updateData.onboarding;
    }

    await setDoc(userDocRef, updateData, { merge: true });
    return { ...userDoc.data(), ...updateData };
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
