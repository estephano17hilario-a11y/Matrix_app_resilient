import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User
} from "firebase/auth";
import { 
  doc, 
  getDoc,
  setDoc,
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "../firebase";

// --- AUTHENTICATION SERVICES ---

/**
 * Initiates the Google Sign-In flow using a popup.
 * @returns Promise<User> - The authenticated Firebase User.
 */
export const loginWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    // Force account selection to avoid auto-login loops if multiple accounts exist
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Matrix Access Denied:", error);
    throw error;
  }
};

/**
 * Terminates the current session.
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Disconnection Failed:", error);
    throw error;
  }
};

/**
 * Checks if a user document exists in the 'users' Firestore collection.
 * This determines if the user is a "Veteran" or "New Recruit".
 * 
 * @param uid - The unique Firebase User ID.
 * @returns Promise<boolean> - True if user exists in DB.
 */
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    console.error("Database Query Failed:", error);
    return false;
  }
};

/**
 * Creates the initial user record in Firestore.
 * Call this after Onboarding is complete.
 */
export const createUserRecord = async (user: User, data: any = {}) => {
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      onboardingCompleted: true,
      ...data
    }, { merge: true });
  } catch (error) {
    console.error("User Creation Failed:", error);
    throw error;
  }
};
