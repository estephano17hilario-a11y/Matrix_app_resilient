import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, auth } from '../firebase';
import { checkUserExists } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean | null; // null until checked
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);

  const completeOnboarding = () => {
    setIsNewUser(false);
  };

  useEffect(() => {
    // MATRIX LINK ESTABLISHED
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Don't set loading to false immediately. We need to check Firestore.
      if (currentUser) {
        setUser(currentUser);
        try {
          // Verify existence in the Matrix (Firestore)
          const exists = await checkUserExists(currentUser.uid);
          setIsNewUser(!exists);
        } catch (error) {
          console.error("Identity Verification Failed:", error);
          setIsNewUser(true); // Default to onboarding if check fails
        }
      } else {
        setUser(null);
        setIsNewUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isNewUser, completeOnboarding }}>
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
