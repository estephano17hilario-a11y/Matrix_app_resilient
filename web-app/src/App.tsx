import { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MatrixProvider } from '@/context/MatrixContext';
import { EconomyProvider } from '@/context/EconomyContext';
import { AuroraBackground } from '@/components/AuroraBackground';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';

// CRITICAL MODULES
import { AuthScreen } from '@/modules/auth/AuthScreen';
import { OnboardingFlow } from '@/modules/onboarding/OnboardingFlow';

// Lazy load Dashboard
const Dashboard = lazy(() => import('./Dashboard'));

const AppRoutes = () => {
  const { user, profile, isLoading } = useAuth();
  const [showOverlay, setShowOverlay] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [authDelayReady, setAuthDelayReady] = useState(false);
  
  // 🛡️ MINIMUM LOAD TIME ENFORCER (1.5 Seconds)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  
  useEffect(() => {
      const timer = setTimeout(() => {
          console.log("⏰ MATRIX: Minimum load time (1.5s) elapsed.");
          setMinTimeElapsed(true);
      }, 1500);
      return () => clearTimeout(timer);
  }, []);
  
  // A profile is considered "loading" if we have a user but no profile data yet
  const isSyncingProfile = user && !profile;
  const isActuallyLoading = (isLoading || isSyncingProfile) && !hasTimedOut;

  useEffect(() => {
    // MATRIX STATS LOGGING
    console.log("MATRIX STATE:", { 
      isLoading, 
      hasUser: !!user, 
      hasProfile: !!profile, 
      isSyncingProfile,
      isActuallyLoading,
      hasTimedOut,
      minTimeElapsed
    });
    
    // Safety timeout: If loading takes more than 5 seconds, force show whatever we have
    const safetyTimer = setTimeout(() => {
      if (isActuallyLoading) {
        console.warn("MATRIX: Loading took too long. Forcing entry...");
        setHasTimedOut(true);
      }
    }, 5000);

    // AUTH DELAY: Prevent flash of register screen
    let authTimer: any;
    // We only assume logged out if we have NO user AND NO profile
    if (!isActuallyLoading && !user && !profile) {
        // If we think we are logged out, wait 800ms to be sure it's not a blip
        authTimer = setTimeout(() => {
            setAuthDelayReady(true);
        }, 800);
    } else if (user || profile) {
        // If we have a user OR a profile (zombie mode), we are ready
        setAuthDelayReady(true);
    }

    // 🔒 THE GATEKEEPER:
    // We only open the overlay if:
    // 1. Loading is finished (isActuallyLoading = false)
    // 2. Minimum time of 3s has passed (minTimeElapsed = true)
    const canLiftCurtain = !isActuallyLoading && minTimeElapsed;

    if (canLiftCurtain) {
      // SMART OVERLAY LOGIC:
      // Only hide the overlay if we have decided where to go.
      
      const canEnterMatrix = !!user || !!profile;
      
      if (canEnterMatrix) {
          // Case 1: Going to Dashboard. Safe to hide immediately.
          // FORCE UNMOUNT AUTH SCREEN: Ensure auth screen is destroyed
          if (authDelayReady) setAuthDelayReady(false);
          
          const timer = setTimeout(() => {
            setShowOverlay(false);
          }, 50);
          return () => clearTimeout(timer);
      } else {
          // Case 2: Going to Auth.
          // CRITICAL: Only hide if authDelayReady is TRUE.
          // If authDelayReady is false, it means we are still in the "uncertainty buffer" (500ms).
          // We must KEEP the overlay up until that buffer expires.
          if (authDelayReady) {
              const timer = setTimeout(() => {
                setShowOverlay(false);
              }, 50);
              return () => clearTimeout(timer);
          } else {
              // We are not loading, but we are not ready for Auth either.
              // Keep overlay up.
              setShowOverlay(true);
          }
      }
    } else {
      setShowOverlay(true);
      if (isActuallyLoading) {
          setAuthDelayReady(false); // Reset if we go back to loading
      }
    }

    return () => {
        clearTimeout(safetyTimer);
        clearTimeout(authTimer);
    };
  }, [isActuallyLoading, isLoading, user, profile, hasTimedOut, minTimeElapsed, authDelayReady]);

  // Determine what to show in the content layer
  // If we are loading, we don't render anything in Layer 1 to avoid partial mounts
  const renderContent = () => {
    if (isActuallyLoading && !hasTimedOut) return null;

    // Snappier transition for FLASH speed
    const transition = { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const };

    // ALLOW ZOMBIE MODE: If we have a profile but no user, we still show the dashboard (Offline/Readonly)
    const canEnterMatrix = !!user || !!profile;

    if (!canEnterMatrix) {
      if (!authDelayReady) return null; // Wait for delay to ensure we are really logged out

      return (
        <motion.div 
          key="auth" 
          initial={{ opacity: 0, scale: 0.99 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 1.01 }} 
          transition={transition}
          className="w-full h-full"
        >
          <AuthScreen />
        </motion.div>
      );
    }

    if (!profile?.onboarding?.completedAt) {
      return (
        <motion.div 
          key="onboarding" 
          initial={{ opacity: 0, scale: 0.99 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 1.01 }} 
          transition={transition}
          className="w-full h-full"
        >
          <OnboardingFlow />
        </motion.div>
      );
    }

    return (
      <motion.div 
        key="main" 
        initial={{ opacity: 0, scale: 0.99 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 1.01 }} 
        transition={transition}
        className="w-full h-full"
      >
        <MatrixProvider userId={user?.uid || profile?.uid || 'phantom-user'}>
          <EconomyProvider>
            <Suspense fallback={null}>
              <Dashboard />
            </Suspense>
          </EconomyProvider>
        </MatrixProvider>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020204]">
      {/* 1. LAYER 0: PERSISTENT BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <AuroraBackground />
      </div>

      {/* 2. LAYER 1: APP CONTENT */}
      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>

      {/* 3. LAYER 2: GLOBAL LOADING OVERLAY (The Gate) */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="global-loading"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020204]/60 backdrop-blur-md"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.05,
              filter: 'blur(20px)',
              transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] }
            }}
          >
            <LoadingScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
}
