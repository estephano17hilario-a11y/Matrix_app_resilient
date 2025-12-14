import { useState, useEffect } from 'react';
import { OnboardingFlow } from './modules/onboarding/OnboardingFlow';
import Dashboard from './Dashboard';
import { MatrixProvider } from './context/MatrixContext';
import { db } from './firebase'; // Keep connection alive but don't block UI

export default function App() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DEV MODE: Always show onboarding for review
    // const onboarded = localStorage.getItem('matrix_onboarding_completed');
    // if (onboarded === 'true') {
    //   setHasOnboarded(true);
    // }
    
    // Check local storage for onboarding status
    const onboarded = localStorage.getItem('matrix_onboarding_completed');
    if (onboarded === 'true') {
      setHasOnboarded(true);
    }
    
    // Simulate "System Boot"
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('matrix_onboarding_completed', 'true');
    setHasOnboarded(true);
  };

  // Loading State (Matrix Terminal Boot)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-green-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm tracking-widest animate-pulse">CONNECTING TO MATRIX... V2.0</p>
        </div>
      </div>
    );
  }

  return (
    <MatrixProvider userId="neo-01">
      {hasOnboarded ? (
        <Dashboard />
      ) : (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
    </MatrixProvider>
  );
}
