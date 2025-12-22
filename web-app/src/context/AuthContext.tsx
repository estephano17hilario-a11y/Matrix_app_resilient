import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged,
  signOut,
  doc, 
  getDoc, 
  setDoc,
  waitForPendingWrites
} from '../services/firebase';
import { auth, db, configStatus } from '../services/firebase';
import { UserProfile, DEFAULT_USER_STATS } from '../types/User';
import { sanitizeFirestoreData } from '../utils/firestoreUtils';
import { ENABLE_GLOBAL_PRO } from '../config/limits';

const DEFAULT_ONBOARDING = {
  successDefinition: "Becoming the One",
  obstacles: [],
  coachingTone: "Stoic",
  completedAt: 0 // Default to 0 so we know to show the Onboarding Flow
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
         const data = userSnap.data() as UserProfile;
         // ⚡ OVERRIDE: Global PRO
         if (ENABLE_GLOBAL_PRO) {
             data.plan = 'PRO';
         }
         setProfile(data);
      }
    } catch (e) {
      console.error("Error refreshing profile:", e);
    }
  };

  const logout = async () => {
    try {
      console.log("💾 MATRIX: Ensuring data persistence before disconnect...");
      try {
          // Attempt to flush pending writes
          await Promise.race([
              waitForPendingWrites(db),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Sync Timeout")), 3000))
          ]);
          console.log("✅ MATRIX: Data synchronized.");
      } catch (e) {
          console.warn("⚠️ MATRIX: Could not verify full sync (likely offline). Logout proceeding.");
      }

      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  useEffect(() => {
    // MATRIX LINK INITIALIZATION

    // SAFETY NET: Force stop loading after 2 seconds if nothing happens (prevents infinite loading screen)
    const safetyTimer = setTimeout(() => {
        setIsLoading(prev => {
            if (prev) {
                console.warn("⚠️ MATRIX CORE: Auth timeout triggered (2000ms). Forcing entry.");
                setError("Connection timeout. Entering Offline Mode.");
                return false;
            }
            return prev;
        });
    }, 2000);
    
    // SAFEGUARD: If Config is invalid, we proceed in PHANTOM MODE (Mock)
    if (!configStatus.isValid) {
        console.warn("⚠️ MATRIX CORE: RUNNING IN PHANTOM MODE (No Firebase Config)");
        // We do NOT return here anymore. The wrapped onAuthStateChanged handles the mock.
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        if (!currentUser) {
          // LOGOUT / NO SESSION
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        // LOGIN DETECTED
        setUser(currentUser);
        
        // REFERENCE TO FIRESTORE DOC
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // CASE B: EXISTING USER (OR SKELETON FROM REGISTRATION)
          const existingProfile = userSnap.data() as UserProfile;
          
          // HYDRATION CHECK: Ensure critical fields exist
          // (Fixes race condition where AuthView creates a partial doc with just name/email)
          if (!existingProfile.stats || !existingProfile.archetype || !existingProfile.onboarding) {
             console.log("⚠️ MATRIX: Hydrating skeleton user profile...");
             const completeProfile = {
                ...existingProfile,
                stats: existingProfile.stats || DEFAULT_USER_STATS,
                archetype: existingProfile.archetype || 'NEO',
                plan: existingProfile.plan || 'FREE',
                theme: existingProfile.theme || 'MATRIX',
                createdAt: existingProfile.createdAt || Date.now(),
                lastLoginAt: Date.now(),
                onboarding: existingProfile.onboarding || DEFAULT_ONBOARDING
             };
             
             // Save the missing pieces
             await setDoc(userRef, completeProfile, { merge: true });
             
             // ⚡ OVERRIDE: Global PRO
             if (ENABLE_GLOBAL_PRO) completeProfile.plan = 'PRO';
             
             setProfile(completeProfile as UserProfile);
          } else {
             // NORMAL LOGIN: Just update timestamp
             await setDoc(userRef, {
               lastLoginAt: Date.now()
             }, { merge: true });
  
             // ⚡ OVERRIDE: Global PRO
             if (ENABLE_GLOBAL_PRO) existingProfile.plan = 'PRO';

             setProfile({
               ...existingProfile,
               lastLoginAt: Date.now()
             });
          }
        } else {
          // CASE A: NEW USER
          // Fallback for name if null (common in Email/Pass flow before profile update)
          const fallbackName = currentUser.displayName || currentUser.email?.split('@')[0] || "Operator";
          
          const newUserProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: fallbackName,
            photoURL: currentUser.photoURL,
            plan: 'FREE', // Saved as FREE in DB for future compatibility
            archetype: 'NEO', // Default archetype
            stats: DEFAULT_USER_STATS,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
            theme: 'MATRIX',
            onboarding: DEFAULT_ONBOARDING
          };

          // SANITIZE & SAVE
          // Use merge: true to be robust against race conditions
          const cleanProfile = sanitizeFirestoreData(newUserProfile);
          await setDoc(userRef, cleanProfile, { merge: true });
          
          // ⚡ OVERRIDE: Global PRO
          if (ENABLE_GLOBAL_PRO) newUserProfile.plan = 'PRO';
          
          setProfile(newUserProfile);
        }
      } catch (err: any) {
        console.error("CRITICAL AUTH ERROR:", err);
        setError(err.message || "Failed to synchronize neural link.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, error, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
