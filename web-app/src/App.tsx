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
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  // A profile is considered "loading" if we have a user but no profile data yet
  const isSyncingProfile = !!user && !profile;
  const isActuallyLoading = (isLoading || isSyncingProfile) && !hasTimedOut;
  
  // SIMPLIFIED: Overlay follows loading state directly
  const showOverlay = isActuallyLoading;

  useEffect(() => {
    // MATRIX STATS LOGGING
    console.log("MATRIX STATE:", { 
      isLoading, 
      hasUser: !!user, 
      hasProfile: !!profile, 
      isSyncingProfile,
      isActuallyLoading,
      hasTimedOut
    });
    
    // Safety timeout: If loading takes more than 8 seconds, force show whatever we have
    const safetyTimer = setTimeout(() => {
      if (isActuallyLoading) {
        console.warn("MATRIX: Loading took too long. Forcing entry...");
        setHasTimedOut(true);
      }
    }, 8000);

    return () => clearTimeout(safetyTimer);
  }, [isActuallyLoading, isLoading, user, profile, hasTimedOut]);

  // Determine what to show in the content layer
  const renderContent = () => {
    // CRITICAL: If overlay is showing, DO NOT render content yet to avoid "ghosts" behind the glass.
    if (showOverlay) return null;

    // Snappier transition for FLASH speed
    const transition = { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const };

    // ALLOW ZOMBIE MODE: If we have a profile but no user, we still show the dashboard (Offline/Readonly)
    const canEnterMatrix = !!user || !!profile;

    if (!canEnterMatrix) {
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
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020204]/60 backdrop-blur-xl"
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
