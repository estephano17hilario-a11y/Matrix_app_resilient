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
import { PersistenceService } from '../services/persistence';

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
  updateProfileLocally: (updates: Partial<UserProfile>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // 🧠 MEMORY CORE: Boot directly from Persistence
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    return PersistenceService.getProfile();
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateProfileLocally = (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    PersistenceService.saveProfile(newProfile);
    console.log("⚡ MATRIX: Profile updated locally (Optimistic)", updates);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        if (ENABLE_GLOBAL_PRO) {
            data.plan = 'PRO';
        }
        setProfile(data);
        PersistenceService.saveProfile(data);
      }
    } catch (e) {
      console.error("Error refreshing profile:", e);
    }
  };

  const logout = async () => {
    try {
      console.log("💾 MATRIX: Ensuring data persistence before disconnect...");
      // We do NOT clear profile here immediately to allow for "offline" access if needed,
      // but standard logout implies clearing session.
      PersistenceService.clearProfile();
      
      try {
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
    } catch (error: any) {
      console.error("Logout Error:", error);
      setError(error.message);
    }
  };

  useEffect(() => {
    // SAFETY NET: Force stop loading after 45 seconds (Extended for Hardware Keys / Slow Connections)
    const safetyTimer = setTimeout(() => {
        setIsLoading(prev => {
            if (prev) {
                console.warn("⚠️ MATRIX CORE: Auth timeout triggered. Forcing entry.");
                if (navigator.onLine) {
                    setError("Connection slow. Entering Offline Mode.");
                }
                return false;
            }
            return prev;
        });
    }, 45000);

    // SAFEGUARD: Mock Mode
    if (!configStatus.isValid) {
        console.warn("⚠️ MATRIX CORE: RUNNING IN PHANTOM MODE (No Firebase Config)");
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        if (!currentUser) {
          // LOGOUT / NO SESSION
          setUser(null);
          
          // ZOMBIE MODE CHECK
          const cached = PersistenceService.getProfile();
          if (!cached) {
              setProfile(null);
          } else {
              console.log("ℹ️ MATRIX: User is null but Profile exists. Entering Zombie/Offline Mode.");
          }
          
          setIsLoading(false); 
          return;
        }

        // LOGIN DETECTED
        setUser(currentUser);
        setError(null);
        
        // OPTIMISTIC: If cached profile matches, use it while syncing
        if (!profile || profile.uid !== currentUser.uid) {
             const cached = PersistenceService.getProfile();
             if (cached && cached.uid === currentUser.uid) {
                 console.log("⚡ MATRIX: Restored cached profile.");
                 setProfile(cached);
             } else {
                 // SKELETON (Prevent UI Hang)
                 const skeletonProfile: UserProfile = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || "Operator",
                    photoURL: currentUser.photoURL,
                    plan: 'FREE',
                    archetype: 'NEO',
                    stats: DEFAULT_USER_STATS,
                    createdAt: Date.now(),
                    lastLoginAt: Date.now(),
                    theme: 'MATRIX',
                    onboarding: DEFAULT_ONBOARDING,
                    isSkeleton: true 
                };
                setProfile(skeletonProfile);
             }
        }

        // Unblock UI immediately
        setIsLoading(false);
        
        // BACKGROUND HYDRATION
        try {
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const existingProfile = userSnap.data() as UserProfile;
              
              // RECOVERY: Fix empty profiles
              if (!existingProfile.stats || !existingProfile.archetype) {
                 console.log("⚠️ MATRIX: Repairing corrupted profile...");
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
                 
                 setDoc(userRef, completeProfile, { merge: true });
                 if (ENABLE_GLOBAL_PRO) completeProfile.plan = 'PRO';
                 
                 setProfile(completeProfile as UserProfile);
                 PersistenceService.saveProfile(completeProfile as UserProfile);
              } else {
                 // NORMAL SYNC
                 setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
                 if (ENABLE_GLOBAL_PRO) existingProfile.plan = 'PRO';
                 
                 const finalProfile = { ...existingProfile, lastLoginAt: Date.now() };
                 setProfile(finalProfile);
                 PersistenceService.saveProfile(finalProfile);
              }
            } else {
              console.log("🆕 MATRIX: Creating missing profile.");
              const newUserProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || "Operator",
                photoURL: currentUser.photoURL,
                plan: 'FREE',
                archetype: 'NEO',
                stats: DEFAULT_USER_STATS,
                createdAt: Date.now(),
                lastLoginAt: Date.now(),
                theme: 'MATRIX',
                onboarding: { ...DEFAULT_ONBOARDING, completedAt: 0 }
              };

              const cleanProfile = sanitizeFirestoreData(newUserProfile);
              await setDoc(userRef, cleanProfile, { merge: true });
              
              if (ENABLE_GLOBAL_PRO) newUserProfile.plan = 'PRO';
              setProfile(newUserProfile);
              PersistenceService.saveProfile(newUserProfile);
            }
        } catch (err) {
            console.error("🔥 MATRIX: Background Sync Failed", err);
        }
      } catch (err: any) {
        console.error("CRITICAL AUTH ERROR:", err);
        setError(err.message || "Failed to synchronize neural link.");
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, error, logout, refreshProfile, updateProfileLocally }}>
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
