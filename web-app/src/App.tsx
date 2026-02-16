import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
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

  // Determine what to show in the content layer
  const renderContent = () => {
    // Snappier transition for FLASH speed
    const transition = { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const };

    // ALLOW ZOMBIE MODE: If we have a profile but no user, we still show the dashboard (Offline/Readonly)
    const canEnterMatrix = !!user || !!profile;

    if (isLoading || profile?.isSkeleton) {
      return (
        <motion.div 
          key="loading" 
          initial={{ opacity: 0, scale: 0.99 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 1.01 }} 
          transition={transition}
          className="w-full h-full"
        >
          <LoadingScreen />
        </motion.div>
      );
    }

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
        <AnimatePresence>
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
              background: 'rgba(5, 5, 5, 0.95)',
              backdropFilter: 'blur(12px)',
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
