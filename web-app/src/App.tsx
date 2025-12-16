import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MatrixProvider } from './context/MatrixContext';
import { EconomyProvider } from './context/EconomyContext';
import { AuthScreen } from './modules/auth/AuthScreen';
import { OnboardingFlow } from './modules/onboarding/OnboardingFlow';
import { LoadingScreen } from './components/ui/LoadingScreen';
import Dashboard from './Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * COMPONENT: APP ROUTER
 * LOGIC: Determines the reality the user experiences.
 */
const AppRoutes = () => {
  const { user, profile, isLoading } = useAuth();
  
  // 1. INITIALIZATION STATE (The Loading Gate)
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AnimatePresence mode="wait">
      {/* 2. AUTHENTICATION GATE */}
      {!user ? (
        <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <AuthScreen />
        </motion.div>
      ) : !profile?.onboarding ? (
        // 3. ONBOARDING GATE (New "Apple Intelligence" Flow)
        <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <OnboardingFlow />
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
            >
              <Dashboard />
            </motion.div>
          </EconomyProvider>
        </MatrixProvider>
      )}
    </AnimatePresence>
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
