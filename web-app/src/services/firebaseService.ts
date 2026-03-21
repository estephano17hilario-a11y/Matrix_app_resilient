import { 
  auth, 
  db,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
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
    const defaultData = {
      uid: user.uid,
      email: user.email,
      displayName: additionalData.displayName || user.displayName || 'Operator',
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
    await setDoc(userDocRef, defaultData);
    return defaultData;
  } else {
    // If it exists, just update lastLoginAt
    await setDoc(userDocRef, { lastLoginAt: Date.now() }, { merge: true });
    return userDoc.data();
  }
};

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    await initializeUserDocument(user, { isAnonymous: false });

    return user;
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
        
        await initializeUserDocument(user, { 
            displayName: name,
            isAnonymous: true,
            email: null
        });

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
