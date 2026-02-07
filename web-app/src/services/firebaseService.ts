import { 
  auth, 
  db,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
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

const isLocalhost = () => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
};

const isSecureContextAllowed = () => window.isSecureContext || isLocalhost();

const isMobileAgent = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const isSafariAgent = () => {
  const ua = navigator.userAgent;
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua);
  return isSafari;
};

const shouldRedirectFallback = (errorCode?: string) => {
  if (isMobileAgent() || isSafariAgent()) return true;
  return (
    errorCode === 'auth/popup-blocked' ||
    errorCode === 'auth/cancelled-popup-request' ||
    errorCode === 'auth/network-request-failed' ||
    errorCode === 'auth/internal-error' // Sometimes happens on mobile webviews
  );
};

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    // 1. CONFIGURATION
    // REMOVED: prompt: 'select_account' (Causes Windows Hello Loops)
    // ADDED: login_hint (Optional, if we had email) but avoiding for now to keep it clean.
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    console.log("🔐 Matrix Auth: Initiating Google Login...", { 
      secure: isSecureContextAllowed(), 
      mobile: isMobileAgent(),
      safari: isSafariAgent()
    });

    if (!isSecureContextAllowed()) {
      console.warn("⚠️ Insecure Context Detected. Google Auth may fail.");
    }

    // 2. STRATEGY SELECTION
    // "Definitive Solution": If the user is on a desktop OS that might trigger Windows Hello (like Windows),
    // or if they are on mobile/Safari, we PREFER Redirect to avoid the popup sandbox issues.
    // However, to be safe, we will try Popup first ONLY on non-problematic environments, 
    // OR we can force Redirect if we detect previous failures.
    
    // DECISION: For this user ("SOLUCION DEFINITIVA"), we will force Redirect 
    // if we suspect ANY instability, or just make it the default for robust auth.
    // Given the user's specific "PIN Loop" issue, Popup is the vector of the problem.
    // Switching to Redirect eliminates the Popup entirely.

    console.log("🔄 Matrix Auth: Executing Redirect Strategy (Robust Mode)...", {
        authReady: !!auth,
        provider: !!googleProvider,
        domain: window.location.hostname,
        protocol: window.location.protocol
    });
    
    // NATIVE REDIRECT: This promise may never resolve because the page unloads.
    try {
        console.log("🚀 CALLING signInWithRedirect NOW...");
        const potentialMockResult = await signInWithRedirect(auth, googleProvider);
        console.log("✅ signInWithRedirect RESOLVED/RETURNED. (Page should be navigating...)");

        // If we are in Mock/Phantom mode, signInWithRedirect actually returns a UserCredential!
        if (potentialMockResult && (potentialMockResult as any).user) {
             console.warn("⚠️ Matrix Auth: Mock Redirect detected (Phantom Mode). returning user.");
             return (potentialMockResult as any).user;
        }
    } catch (redirectError: any) {
        console.error("💥 CRITICAL ERROR during signInWithRedirect:", redirectError);
        throw redirectError;
    }

    return null; // The app will reload and catch the result in AuthView

    /* 
    // LEGACY POPUP CODE (Disabled for Robustness)
    const result = await signInWithPopup(auth, googleProvider);
    console.log("✅ Matrix Auth: Google Login Success", result.user.uid);
    return result.user; 
    */

  } catch (error: any) {
    console.error("❌ Matrix Auth Failed:", error.code, error.message);
    
    // If Redirect fails immediately (rare), we throw
    throw error;
  }
};

export const loginWithGooglePopup = async (): Promise<User | null> => {
    try {
        console.log("🔓 Matrix Auth: Attempting Manual Popup Strategy...");
        const result = await signInWithPopup(auth, googleProvider);
        console.log("✅ Matrix Auth: Google Popup Success", result.user.uid);
        return result.user;
    } catch (error: any) {
        console.error("❌ Matrix Auth Popup Failed:", error);
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
