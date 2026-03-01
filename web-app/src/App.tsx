import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { SplashScreen } from '@capacitor/splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LuxProvider } from '@/context/LuxContext';
import { EconomyProvider } from '@/context/EconomyContext';
import { NotesProvider } from '@/modules/notes/context/NotesContext';
import { RewardProvider } from '@/modules/rewards/context/RewardContext';
import { RewardOverlay } from '@/modules/rewards/components/RewardOverlay';
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

  useEffect(() => {
    if (user || profile) {
      import('./Dashboard');
    }
  }, [user, profile]);

  // 🚀 PERFORMANCE: Hide Splash Screen ASAP
  useEffect(() => {
    if (!isLoading) {
      // Immediate hide to prevent perceived lag
      SplashScreen.hide().catch(() => {
        // Ignore error if not running on device
      });
    }
  }, [isLoading]);

  // Determine what to show in the content layer
  const renderContent = () => {
    // Snappier transition for FLASH speed
    const transition = { duration: 0.15, ease: "easeOut" as const };

    // ALLOW ZOMBIE MODE: If we have a profile but no user, we still show the dashboard (Offline/Readonly)
    const canEnterLux = !!user || !!profile;
    const shouldShowLoading = (isLoading && !profile) || (user && (!profile || profile.isSkeleton));

    if (shouldShowLoading) {
      return (
        <motion.div 
          key="loading" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={transition}
          className="w-full h-full"
        >
          <LoadingScreen />
        </motion.div>
      );
    }

    if (!canEnterLux) {
      return (
        <motion.div 
          key="auth" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={transition}
          className="w-full h-full"
        >
          <AuthScreen />
        </motion.div>
      );
    }

    if (profile && !profile.isSkeleton && !profile.onboarding?.completedAt) {
      return (
        <motion.div 
          key="onboarding" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
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
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={transition}
        className="w-full h-full"
      >
        <LuxProvider userId={user?.uid || profile?.uid || 'phantom-user'}>
          <EconomyProvider>
            <RewardProvider>
              <NotesProvider>
                <Suspense fallback={<LoadingScreen />}>
                  <Dashboard />
                </Suspense>
                <RewardOverlay />
              </NotesProvider>
            </RewardProvider>
          </EconomyProvider>
        </LuxProvider>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020204]">
      <div
        id="notification-stack-root"
        className="fixed top-4 left-0 right-0 z-[10000] flex flex-col items-center gap-2 pointer-events-none px-4"
      />
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
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            className: '',
            style: {
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2)), rgba(5, 5, 5, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              boxShadow: '0 0 40px rgba(0,0,0,0.8)',
              borderRadius: '16px',
              padding: '12px 24px',
              fontSize: '14px',
              maxWidth: '400px',
              zIndex: 9999,
            },
            success: {
              style: {
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)',
              },
              iconTheme: {
                primary: '#10b981',
                secondary: '#050505',
              },
            },
            error: {
              style: {
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#050505',
              },
            },
          }}
        />
        <AppRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
}
