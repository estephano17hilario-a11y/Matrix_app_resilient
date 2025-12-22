import { 
  auth, 
  db,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  User,
  doc, 
  getDoc 
} from './firebase';

/**
 * SERVICE: Firebase Authentication & User Data
 * LOGIC: Pure business logic. No UI.
 */

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Matrix Access Denied:", error);
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
