import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface TutorialContextType {
  isActive: boolean;
  startTutorial: () => void;
  stopTutorial: () => void;
  completeTutorial: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (hasSeen: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  // Load tutorial status
  useEffect(() => {
    const loadStatus = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, 'users', user.uid, 'settings', 'tutorial');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().hasSeen) {
            setHasSeenTutorial(true);
          } else {
            // If not seen, start it automatically (forced)
            setHasSeenTutorial(false);
            // Delay slightly to let UI load
            setTimeout(() => setIsActive(true), 1500);
          }
        } catch (error) {
          console.error("Error loading tutorial status:", error);
        }
      }
    };
    loadStatus();
  }, [user]);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);

  const stopTutorial = useCallback(() => {
    setIsActive(false);
  }, []);

  const completeTutorial = useCallback(async () => {
    setIsActive(false);
    setHasSeenTutorial(true);
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'settings', 'tutorial'), { 
          hasSeen: true,
          completedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving tutorial status:", error);
      }
    }
  }, [user]);

  const nextStep = useCallback(() => setCurrentStep(prev => prev + 1), []);
  const prevStep = useCallback(() => setCurrentStep(prev => Math.max(0, prev - 1)), []);

  return (
    <TutorialContext.Provider value={{
      isActive,
      startTutorial,
      stopTutorial,
      completeTutorial,
      currentStep,
      setCurrentStep,
      nextStep,
      prevStep,
      hasSeenTutorial,
      setHasSeenTutorial
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
