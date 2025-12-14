import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { checkUserExists, createUserRecord } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  completeOnboarding: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // The "Eye" of the Matrix - watching auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Reset state on change to prevent leaking previous user data
      setIsLoading(true);
      
      if (currentUser) {
        setUser(currentUser);
        
        // Critical Check: Is this a veteran or a new recruit?
        // We check Firestore to see if they have a profile.
        try {
          const exists = await checkUserExists(currentUser.uid);
          setIsNewUser(!exists);
        } catch (error) {
          console.error("Identity Verification Failed", error);
          // Default to safe state? Or maybe error state. 
          // Assuming new user to be safe, or retry logic could go here.
          setIsNewUser(false); 
        }
      } else {
        setUser(null);
        setIsNewUser(false);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const completeOnboarding = async () => {
    if (!user) return;
    
    // 1. Write to Firestore to mark existence
    await createUserRecord(user);
    
    // 2. Update local state to trigger redirect
    setIsNewUser(false);
  };

  const logoutUser = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isNewUser, 
      completeOnboarding,
      logoutUser
    }}>
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
