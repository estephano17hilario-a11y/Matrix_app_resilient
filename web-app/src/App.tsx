import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MatrixProvider } from './context/MatrixContext';
import { EconomyProvider } from './context/EconomyContext';
import { AuroraBackground } from './components/AuroraBackground';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';

// CRITICAL MODULES (Eager Load to prevent loading loops)
import { AuthScreen } from './modules/auth/AuthScreen';
import { OnboardingFlow } from './modules/onboarding/OnboardingFlow';

// Lazy load heavy dashboard
const Dashboard = lazy(() => import('./Dashboard'));

/**
 * COMPONENT: APP ROUTER
 * LOGIC: Determines the reality the user experiences.
 */
const AppRoutes = () => {
  const { user, profile, isLoading } = useAuth();
  
  return (
    <>
      {/* PERSISTENT BACKGROUND LAYER */}
      <div className="fixed inset-0 z-[-1]">
        <AuroraBackground />
      </div>

      <AnimatePresence mode="wait">
        {/* 1. INITIALIZATION STATE (The Loading Gate) */}
        {isLoading ? (
          <motion.div
            key="loading"
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <LoadingScreen />
          </motion.div>
        ) : !user ? (
          // 2. AUTHENTICATION GATE
          <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
          >
            <Suspense fallback={<LoadingScreen />}>
              <AuthScreen />
            </Suspense>
          </motion.div>
        ) : !profile?.onboarding?.completedAt ? (
            // 3. CALIBRATION GATE (Onboarding)
            <motion.div
                key="onboarding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
              <Suspense fallback={<LoadingScreen />}>
                <OnboardingFlow />
              </Suspense>
            </motion.div>
        ) : (
          // 4. REALITY FORK
          <MatrixProvider key="matrix-provider" userId={user.uid}>
            <EconomyProvider>
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5 }}
                >
                  <Suspense fallback={<LoadingScreen />}>
                    <Dashboard />
                  </Suspense>
                </motion.div>
            </EconomyProvider>
          </MatrixProvider>
        )}
      </AnimatePresence>
    </>
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
