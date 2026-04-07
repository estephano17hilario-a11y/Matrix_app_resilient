import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { 
  User, 
  onAuthStateChanged,
  signOut,
  doc, 
  getDoc,
  waitForPendingWrites
} from '../services/firebase';
import { auth, db, configStatus } from '../services/firebase';
import { UserProfile, DEFAULT_USER_STATS } from '../types/User';
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
  const [profile, setProfile] = useState<UserProfile | null>(() => PersistenceService.getProfile());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      setUser(null);
      setProfile(null);
      
      setTimeout(async () => {
        try {
            await Promise.race([
                waitForPendingWrites(db),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Sync Timeout")), 1000))
            ]);
        } catch (e) {}

        await signOut(auth);
        
        try {
            if (Capacitor.isNativePlatform()) {
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                await GoogleAuth.signOut();
            }
        } catch (e) {}
      }, 0);

    } catch (error: any) {
      console.error("Logout Error:", error);
      setError(error.message);
    }
  }, [user]);

  useEffect(() => {
    if (!configStatus.isValid) {
        console.warn("⚠️ MATRIX: Running in PHANTOM MODE (No Firebase Config).");
        setIsLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        if (!currentUser) {
          const isIntentionalLogout = sessionStorage.getItem('MATRIX_INTENTIONAL_LOGOUT') === 'true';
          
          if (isIntentionalLogout) {
             setUser(null);
             setProfile(null);
             sessionStorage.removeItem('MATRIX_INTENTIONAL_LOGOUT');
          } else {
             const cached = PersistenceService.getProfile();
             if (!cached) {
                 setUser(null);
                 setProfile(null);
             } else {
                 setProfile(cached);
                 setUser({ uid: cached.uid, email: cached.email, displayName: cached.displayName } as User);
             }
          }
          
          setIsLoading(false);
          return;
        }

        // --- USER IS LOGGED IN ---
        console.log("🔐 MATRIX: User logged in:", currentUser.uid);
        setUser(currentUser);
        setError(null);
        
        // 1. Show cached profile immediately if available
        const cached = PersistenceService.getProfile(currentUser.uid);
        if (cached) {
             setProfile(cached);
        } else {
            // Optimistic Skeleton while we fetch
            setProfile({
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || "",
                photoURL: currentUser.photoURL,
                plan: 'FREE',
                archetype: 'NEO',
                stats: DEFAULT_USER_STATS,
                theme: 'MATRIX',
                createdAt: Date.now(),
                lastLoginAt: Date.now(),
                onboarding: { ...DEFAULT_ONBOARDING, completedAt: 0 },
                isSkeleton: true
            });
        }

        // 2. Fetch the real document from Firestore
        const fetchProfile = async (attempts = 0) => {
            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const data = userSnap.data() as UserProfile;
                    const finalProfile: UserProfile = {
                        ...data,
                        uid: currentUser.uid,
                        displayName: data.displayName || currentUser.displayName || "",
                        stats: data.stats || DEFAULT_USER_STATS,
                        archetype: data.archetype || 'NEO',
                        plan: data.plan || 'FREE',
                        theme: data.theme || 'MATRIX',
                        createdAt: data.createdAt || Date.now(),
                        onboarding: data.onboarding || { ...DEFAULT_ONBOARDING, completedAt: 0 },
                        isSkeleton: false
                    };
                    
                    console.log("✅ MATRIX: Profile loaded from Firestore.");
                    setProfile(finalProfile);
                    PersistenceService.saveProfile(finalProfile);
                    setIsLoading(false);
                } else {
                    // IF DOCUMENT DOES NOT EXIST YET:
                    // Because we decoupled Auth creation from Firestore creation in AuthView,
                    // the document might still be writing. We retry a few times.
                    if (attempts < 5) {
                        console.log(`⏳ MATRIX: Profile document not found yet. Retrying (${attempts + 1}/5)...`);
                        await new Promise(r => setTimeout(r, 1000));
                        return fetchProfile(attempts + 1);
                    } else {
                        // After 5 seconds, if still no document, it's a critical error.
                        throw new Error("Profile creation timed out. Please try logging in again.");
                    }
                }
            } catch (err: any) {
                console.error("🔥 MATRIX: Fetch error:", err);
                if (attempts < 5) {
                    await new Promise(r => setTimeout(r, 1000));
                    return fetchProfile(attempts + 1);
                }
                
                // Fallback to cache if offline
                if (cached) {
                    setProfile(cached);
                    setIsLoading(false);
                } else {
                    setError("Could not load profile from network. Please restart the app.");
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();

      } catch (err: any) {
        console.error("CRITICAL AUTH ERROR:", err);
        setError(err.message || "Failed to synchronize.");
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
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