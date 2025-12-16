import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from '../firebase';
import { auth, db, configStatus } from '../services/firebase';
import { UserProfile, DEFAULT_USER_STATS } from '../types/User';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    try {
        await auth.signOut();
        setUser(null);
        setProfile(null);
    } catch (error) {
        console.error("Logout Error:", error);
    }
  };

  useEffect(() => {
    // MATRIX LINK INITIALIZATION
    
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
          // CASE B: EXISTING USER
          const existingProfile = userSnap.data() as UserProfile;
          
          // TACTICAL UPDATE: lastLoginAt (Non-blocking ideally, but await here for safety)
          await updateDoc(userRef, {
            lastLoginAt: Date.now()
          });

          setProfile({
            ...existingProfile,
            lastLoginAt: Date.now()
          });
        } else {
          // CASE A: NEW USER
          const newUserProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            plan: 'FREE',
            archetype: 'NEO', // Default archetype
            stats: DEFAULT_USER_STATS,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
            theme: 'MATRIX'
          };

          await setDoc(userRef, newUserProfile);
          setProfile(newUserProfile);
        }
      } catch (err: any) {
        console.error("CRITICAL AUTH ERROR:", err);
        setError(err.message || "Failed to synchronize neural link.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, error, logout }}>
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
