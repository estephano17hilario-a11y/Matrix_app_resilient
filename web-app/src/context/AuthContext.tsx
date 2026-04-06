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
import { sanitizeFirestoreData } from '../utils/firestoreUtils';

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
      
      // 🔥 FAST LOGOUT: Clear UI immediately (0 delay)
      setUser(null);
      setProfile(null);
      
      // Let the sync and actual signOut happen in the background
      setTimeout(async () => {
        try {
            await Promise.race([
                waitForPendingWrites(db),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Sync Timeout")), 1000))
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
      }, 0);

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
                 
                 // 🩹 HEAL POISONED CACHE
                 if (!cached.onboarding?.completedAt && (cached.stats?.level > 1 || cached.stats?.xp > 0 || cached.plan === 'PRO' || cached.avatarId)) {
                     cached.onboarding = cached.onboarding || { ...DEFAULT_ONBOARDING, completedAt: 0 };
                     cached.onboarding.completedAt = cached.createdAt || Date.now();
                     PersistenceService.saveProfile(cached);
                 }
                 
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
             
             // 🩹 HEAL POISONED CACHE: If the previous bug corrupted completedAt to 0, fix it instantly before rendering
             if (!cached.onboarding?.completedAt && (cached.stats?.level > 1 || cached.stats?.xp > 0 || cached.plan === 'PRO' || cached.avatarId)) {
                 cached.onboarding = cached.onboarding || { ...DEFAULT_ONBOARDING, completedAt: 0 };
                 cached.onboarding.completedAt = cached.createdAt || Date.now();
                 PersistenceService.saveProfile(cached); // Save healed cache
             }
             
             setProfile(cached);
        } else {
            // Optimistic UI to prevent black flickers, but keep skeleton TRUE to prevent flash of Onboarding
            setProfile({
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
                isSkeleton: true // Set to true to wait for real Firestore data before routing
            });
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
                let exists = false;
                let dataToSet: any = {};
                let snapData: any = null;
                
                let getDocFailed = false;
                try {
                    const userSnap = await getDoc(userRef);
                    exists = userSnap.exists();
                    if (exists) {
                        snapData = userSnap.data();
                        dataToSet = snapData || {};
                    }
                } catch (e) {
                    console.warn("⚠️ MATRIX: getDoc failed in createOrFillProfile. Network or permissions issue. Proceeding with optimistic merge.", e);
                    getDocFailed = true;
                    throw e; // Force a retry if we cannot read the profile!
                }
                
                if (!exists) {
                    // Fresh registration - create document immediately (0 delay)
                    const defaultData: any = {
                        uid: currentUser.uid,
                        email: currentUser.email || null,
                        photoURL: currentUser.photoURL || null,
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
                    
                    // Solo inicializamos el onboarding si realmente no existe nada
                    const cleanData = sanitizeFirestoreData(defaultData);
                    await setDoc(userRef, cleanData, { merge: true });
                    dataToSet = { ...dataToSet, ...cleanData };
                } else {
                    await setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
                    if (snapData) {
                        dataToSet = snapData;
                    }
                }
                
                clearSafetyTimer();

                const data = dataToSet as UserProfile;
                let resolvedOnboarding = data.onboarding || { ...DEFAULT_ONBOARDING, completedAt: 0 };
                const localCache = PersistenceService.getProfile(currentUser.uid);
                
                let needsFirestoreHeal = false;

                // If Firestore is missing completedAt but cache has it, use cache and heal Firestore
                if (localCache?.onboarding?.completedAt && localCache.onboarding.completedAt > (resolvedOnboarding.completedAt || 0)) {
                    resolvedOnboarding = localCache.onboarding;
                    needsFirestoreHeal = true;
                }
                
                // If onboarding is marked as not completed, but they have stats/xp, a plan, or an avatarId, they clearly finished it.
                if (!resolvedOnboarding.completedAt && (data.stats?.level > 1 || data.stats?.xp > 0 || data.plan === 'PRO' || data.avatarId)) {
                    resolvedOnboarding.completedAt = data.createdAt || Date.now();
                    needsFirestoreHeal = true;
                }

                if (needsFirestoreHeal) {
                    console.log("🩹 MATRIX: Healing missing onboarding state in Firestore");
                    setDoc(userRef, { onboarding: resolvedOnboarding }, { merge: true }).catch(console.error);
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
                 
                setIsLoading(false);
                 
             } catch (err) {
                 console.error("🔥 MATRIX: Profile create/fetch error:", err);
                 if (attempts < 2) {
                     await new Promise(r => setTimeout(r, 1500));
                     return createOrFillProfile(attempts + 1);
                 }
                 clearSafetyTimer();
                 
                 // Before falling back to an empty profile, try cache again!
                 const localCache = PersistenceService.getProfile(currentUser.uid);
                 
                 // 🩹 HEAL POISONED CACHE
                 if (localCache && !localCache.onboarding?.completedAt && (localCache.stats?.level > 1 || localCache.stats?.xp > 0 || localCache.plan === 'PRO' || localCache.avatarId)) {
                     localCache.onboarding = localCache.onboarding || { ...DEFAULT_ONBOARDING, completedAt: 0 };
                     localCache.onboarding.completedAt = localCache.createdAt || Date.now();
                     PersistenceService.saveProfile(localCache);
                 }

                 if (localCache && localCache.uid === currentUser.uid && localCache.onboarding?.completedAt) {
                     console.log("🩹 MATRIX: Fetch failed. Restored from cache completely.");
                     setProfile(localCache);
                     setIsLoading(false);
                     return;
                 }

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
