import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
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
import { ENABLE_GLOBAL_PRO } from '../config/limits';
import { PersistenceService } from '../services/persistence';

const DEFAULT_ONBOARDING = {
  successDefinition: "Becoming the One",
  obstacles: [],
  coachingTone: "Stoic",
  completedAt: 0,
  language: 'en'
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  updateProfileLocally: (updates: Partial<UserProfile>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    return PersistenceService.getProfile();
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const startSafetyTimer = (onExpire: () => void, ms = 8000) => {
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(onExpire, ms);
  };

  const updateProfileLocally = useCallback((updates: Partial<UserProfile>) => {
    if (!profile) return;
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    PersistenceService.saveProfile(newProfile);
    console.log("⚡ MATRIX: Profile updated locally (Optimistic)");
  }, [profile]);

  const logout = useCallback(async () => {
    try {
      console.log("💾 MATRIX: Ensuring data persistence before disconnect...");
      
      if (user?.uid) {
        PersistenceService.clearUserCache(user.uid);
      }
      PersistenceService.clearSession();
      sessionStorage.setItem('MATRIX_INTENTIONAL_LOGOUT', 'true');
      
      try {
          await Promise.race([
              waitForPendingWrites(db),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Sync Timeout")), 3000))
          ]);
      } catch (e) {
          console.warn("⚠️ MATRIX: Sync timeout on logout.");
      }

      await signOut(auth);
      
      // FIX: Ensure Google Auth is also signed out so the account picker shows next time
      try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
              const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
              await GoogleAuth.signOut();
          }
      } catch (e) {
          console.warn("⚠️ GoogleAuth signOut failed:", e);
      }

      setUser(null);
      setProfile(null);
    } catch (error: any) {
      console.error("Logout Error:", error);
      setError(error.message);
    }
  }, [user]);

  useEffect(() => {
    clearSafetyTimer();

    // Phantom mode guard
    if (!configStatus.isValid) {
        console.warn("⚠️ MATRIX: Running in PHANTOM MODE (No Firebase Config). Using cached profile only.");
        const cached = PersistenceService.getProfile();
        if (cached) {
            setProfile(cached);
            setUser({ uid: cached.uid, email: cached.email, displayName: cached.displayName } as User);
        }
        setIsLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        if (!currentUser) {
          const isIntentionalLogout = sessionStorage.getItem('MATRIX_INTENTIONAL_LOGOUT') === 'true';
          
          clearSafetyTimer();
          
          if (isIntentionalLogout) {
             console.log("👋 MATRIX: Intentional Logout Detected.");
             setUser(null);
             setProfile(null);
             sessionStorage.removeItem('MATRIX_INTENTIONAL_LOGOUT');
          } else {
             const cached = PersistenceService.getProfile();
             if (!cached) {
                 setUser(null);
                 setProfile(null);
             } else {
                 console.log("ℹ️ MATRIX: Entering Zombie/Offline Mode.");
                 setProfile(cached);
                 setUser({ uid: cached.uid, email: cached.email, displayName: cached.displayName } as User);
             }
          }
          
          setIsLoading(false);
          return;
        }

        // LOGIN DETECTED
        console.log("🔐 MATRIX: User logged in:", currentUser.uid);
        setUser(currentUser);
        setError(null);
        
        // Restore from cache instantly
        const cached = PersistenceService.getProfile();
        if (cached && cached.uid === currentUser.uid) {
             console.log("⚡ MATRIX: Restored from cache.");
             setProfile(cached);
        }

        // Set safety timer - MUST unblock UI no matter what
         // 10 seconds is generous even on very slow connections
         startSafetyTimer(() => {
             console.warn("⚠️ MATRIX: Safety timer expired. Forcing entry with fallback profile.");
             setIsLoading(false);
             setProfile(prev => {
                 if (prev && prev.uid === currentUser.uid) {
                     console.log("🩹 MATRIX: Preserving existing profile, just removing skeleton flag.");
                     return { ...prev, isSkeleton: false };
                 }
                 console.log("🩹 MATRIX: Creating brand new fallback profile from safety timer.");
                    return {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName || "",
                        photoURL: currentUser.photoURL,
                        plan: 'FREE',
                        archetype: 'NEO',
                     stats: DEFAULT_USER_STATS,
                     createdAt: Date.now(),
                     lastLoginAt: Date.now(),
                     theme: 'MATRIX',
                     onboarding: { ...DEFAULT_ONBOARDING, completedAt: 0 },
                     isSkeleton: false
                 };
             });
         }, 10000);

        // ONE-TIME FETCH with retry - Using setDoc to create/fill profile instead of just reading
         // This avoids permission-denied on getDoc during initial login
         const userRef = doc(db, "users", currentUser.uid);
         
         const createOrFillProfile = async (attempts = 0) => {
            try {
                const userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    // Give AuthView a moment to complete its initializeUserDocument if this is a fresh registration
                    if (attempts === 0) {
                        await new Promise(r => setTimeout(r, 1000));
                        return createOrFillProfile(1);
                    }
                    
                    const defaultData: any = {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        plan: ENABLE_GLOBAL_PRO ? 'PRO' : 'FREE',
                        archetype: 'NEO',
                        stats: DEFAULT_USER_STATS,
                        theme: 'MATRIX',
                        createdAt: Date.now(),
                        lastLoginAt: Date.now()
                    };
                    
                    if (currentUser.displayName) {
                        defaultData.displayName = currentUser.displayName;
                    }
                    
                    // Solo inicializamos el onboarding si realmente no existe nada (AuthContext fallback)
                    // No sobreescribimos con completedAt: 0 para evitar borrar el onboarding completado por OnboardingFlow
                    await setDoc(userRef, defaultData, { merge: true });
                } else {
                    await setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
                }
                
                clearSafetyTimer();

                const finalSnap = await getDoc(userRef);
                
                if (finalSnap.exists()) {
                    const data = finalSnap.data() as UserProfile;
                    let resolvedOnboarding = data.onboarding || { ...DEFAULT_ONBOARDING, completedAt: 0 };
                    const localCache = PersistenceService.getProfile(currentUser.uid);
                    
                    if (localCache?.onboarding?.completedAt && localCache.onboarding.completedAt > (resolvedOnboarding.completedAt || 0)) {
                        resolvedOnboarding = localCache.onboarding;
                    }

                    const finalProfile: UserProfile = {
                        ...data,
                        uid: currentUser.uid,
                        displayName: data.displayName || currentUser.displayName || "",
                        stats: data.stats || DEFAULT_USER_STATS,
                        archetype: data.archetype || 'NEO',
                        plan: ENABLE_GLOBAL_PRO ? 'PRO' : (data.plan || 'FREE'),
                        theme: data.theme || 'MATRIX',
                        createdAt: data.createdAt || Date.now(),
                        lastLoginAt: Date.now(),
                        onboarding: resolvedOnboarding,
                        isSkeleton: false
                    };

                    console.log("✅ MATRIX: Profile loaded from Firestore.");
                    setProfile(finalProfile);
                    PersistenceService.saveProfile(finalProfile);
                } else {
                     // Should never happen since we just wrote it, but handle gracefully
                     console.warn("⚠️ MATRIX: Profile still not found after write.");
                    const fallback: UserProfile = {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName || "",
                        photoURL: currentUser.photoURL,
                        plan: ENABLE_GLOBAL_PRO ? 'PRO' : 'FREE',
                         archetype: 'NEO',
                         stats: DEFAULT_USER_STATS,
                         theme: 'MATRIX',
                         createdAt: Date.now(),
                         lastLoginAt: Date.now(),
                         onboarding: { ...DEFAULT_ONBOARDING, completedAt: 0 },
                         isSkeleton: false
                     };
                     setProfile(fallback);
                     PersistenceService.saveProfile(fallback);
                 }
                 
                 setIsLoading(false);
                 
             } catch (err) {
                 console.error("🔥 MATRIX: Profile create/fetch error:", err);
                 if (attempts < 2) {
                     await new Promise(r => setTimeout(r, 1500));
                     return createOrFillProfile(attempts + 1);
                 }
                 clearSafetyTimer();
                 // Even on total failure, unblock the user with a minimal profile
                const fallback: UserProfile = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || "",
                    photoURL: currentUser.photoURL,
                    plan: ENABLE_GLOBAL_PRO ? 'PRO' : 'FREE',
                     archetype: 'NEO',
                     stats: DEFAULT_USER_STATS,
                     theme: 'MATRIX',
                     createdAt: Date.now(),
                     lastLoginAt: Date.now(),
                     onboarding: { ...DEFAULT_ONBOARDING, completedAt: 0 },
                     isSkeleton: false
                 };
                 setProfile(fallback);
                 setIsLoading(false);
             }
         };

        createOrFillProfile();

      } catch (err: any) {
        console.error("CRITICAL AUTH ERROR:", err);
        clearSafetyTimer();
        setError(err.message || "Failed to synchronize.");
        setIsLoading(false);
      }
    });

    return () => {
      clearSafetyTimer();
      unsubscribeAuth();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    isLoading,
    error,
    logout,
    updateProfileLocally
  }), [user, profile, isLoading, error, logout, updateProfileLocally]);

  return (
    <AuthContext.Provider value={value}>
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
