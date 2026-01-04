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
  completedAt: Date.now() // ASSUME COMPLETED by default for Optimistic UI (prevents flashing for existing users)
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
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // OPTIMISTIC CACHE: Try to load from localStorage for instant UI
    try {
      const cached = localStorage.getItem('MATRIX_CACHED_PROFILE');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveProfileToCache = (p: UserProfile) => {
    try {
      localStorage.setItem('MATRIX_CACHED_PROFILE', JSON.stringify(p));
    } catch (e) {
      console.warn("Cache failed", e);
    }
  };

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
         saveProfileToCache(data);
      }
    } catch (e) {
      console.error("Error refreshing profile:", e);
    }
  };

  const logout = async () => {
    try {
      console.log("💾 MATRIX: Ensuring data persistence before disconnect...");
      localStorage.removeItem('MATRIX_CACHED_PROFILE');
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

    // SAFETY NET: Force stop loading after 8 seconds if nothing happens
    const safetyTimer = setTimeout(() => {
        setIsLoading(prev => {
            if (prev) {
                console.warn("⚠️ MATRIX CORE: Auth timeout triggered (8000ms). Forcing entry.");
                // Check if we are online before assuming timeout error
                if (navigator.onLine) {
                    setError("Connection slow. Entering Offline Mode.");
                }
                return false;
            }
            return prev;
        });
    }, 8000);
    
    // INTENT TO WAIT FOR AUTH READY (If available in SDK)
    const initAuth = async () => {
        if ((auth as any).authStateReady) {
            try {
                await (auth as any).authStateReady();
                console.log("✅ MATRIX: Auth State Ready confirmed.");
            } catch (e: any) {
                console.warn("⚠️ MATRIX: Auth State Ready error:", e);
            }
        }
    };

    initAuth();

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
          
          // INTELLIGENT SESSION HANDLING:
          // If we have a cached profile in localStorage, it means we did NOT explicitly logout.
          // In this case, we keep the profile in state to show the UI (Offline Mode / Zombie Mode)
          // instead of flashing the Login screen.
          const cached = localStorage.getItem('MATRIX_CACHED_PROFILE');
          if (!cached) {
              // Only clear profile if we truly have no local session data (Clean Logout)
              setProfile(null);
          } else {
              console.log("ℹ️ MATRIX: User is null but Profile exists. Entering Zombie/Offline Mode.");
          }
          
          // Only stop loading if we are NOT waiting for a potential auth restoration
          // We rely on authStateReady for the initial load, but this handles subsequent updates
          setIsLoading(false); 
          return;
        }

        // LOGIN DETECTED - SET USER IMMEDIATELY
        setUser(currentUser);
        
        // OPTIMISTIC: If we don't have a profile yet, create a skeleton so the UI doesn't hang
        if (!profile || profile.uid !== currentUser.uid) {
            const skeletonProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "Operator",
                photoURL: currentUser.photoURL,
                plan: 'FREE',
                archetype: 'NEO',
                stats: DEFAULT_USER_STATS,
                createdAt: Date.now(),
                lastLoginAt: Date.now(),
                theme: 'MATRIX',
                onboarding: DEFAULT_ONBOARDING
            };
            setProfile(skeletonProfile);
        }

        // FAST PATH: Stop loading now if we have a basic profile (even if skeleton/cached)
        setIsLoading(false);
        
        // BACKGROUND HYDRATION: Fetch real data without blocking the UI
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const existingProfile = userSnap.data() as UserProfile;
          
          // Check for missing critical fields
          if (!existingProfile.stats || !existingProfile.archetype || !existingProfile.onboarding) {
             console.log("⚠️ MATRIX: Background Hydrating skeleton profile...");
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
             
             // Async write, don't await
             setDoc(userRef, completeProfile, { merge: true });
             
             if (ENABLE_GLOBAL_PRO) completeProfile.plan = 'PRO';
             setProfile(completeProfile as UserProfile);
             saveProfileToCache(completeProfile as UserProfile);
          } else {
             // Normal update
             setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
  
             if (ENABLE_GLOBAL_PRO) existingProfile.plan = 'PRO';
             const finalProfile = { ...existingProfile, lastLoginAt: Date.now() };
             setProfile(finalProfile);
             saveProfileToCache(finalProfile);
          }
        } else {
          // NEW USER CASE
          const newUserProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "Operator",
            photoURL: currentUser.photoURL,
            plan: 'FREE',
            archetype: 'NEO',
            stats: DEFAULT_USER_STATS,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
            theme: 'MATRIX',
            onboarding: { ...DEFAULT_ONBOARDING, completedAt: 0 } // FORCE 0 for truly new users
          };

          const cleanProfile = sanitizeFirestoreData(newUserProfile);
          await setDoc(userRef, cleanProfile, { merge: true });
          
          if (ENABLE_GLOBAL_PRO) newUserProfile.plan = 'PRO';
          setProfile(newUserProfile);
          saveProfileToCache(newUserProfile);
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
