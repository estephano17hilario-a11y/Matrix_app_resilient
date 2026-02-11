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
  serverTimestamp,
  User,
  doc, 
  getDoc 
} from './firebase';

/**
 * SERVICE: Firebase Authentication & User Data
 * LOGIC: Pure business logic. No UI.
 */

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
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
        
        // Create user document for persistence
        await setDoc(doc(db, 'users', user.uid), {
            displayName: name,
            isAnonymous: true,
            createdAt: serverTimestamp(),
            email: null
        }, { merge: true });

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
