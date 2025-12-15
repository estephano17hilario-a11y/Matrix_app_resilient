import { AuthProvider, useAuth } from './context/AuthContext';
import { MatrixProvider } from './context/MatrixContext';
import { EconomyProvider } from './context/EconomyContext';
import LoginScreen from './modules/auth/LoginScreen';
import { OnboardingFlow } from './modules/onboarding/OnboardingFlow';
import Dashboard from './Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * COMPONENT: LOADING GATE
 * VISUAL: A breathing Matrix core while the system initializes.
 */
const LoadingGate = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]"
  >
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        opacity: [0.5, 1, 0.5],
        filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="w-16 h-16 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.5)]"
    />
  </motion.div>
);

/**
 * COMPONENT: APP ROUTER
 * LOGIC: Determines the reality the user experiences.
 */
const AppRoutes = () => {
  const { user, isLoading, isNewUser, completeOnboarding } = useAuth();
  
  console.log('APP_ROUTES: Rendering. isLoading:', isLoading, 'User:', user ? user.uid : 'null', 'isNewUser:', isNewUser);

  // 1. INITIALIZATION STATE
  if (isLoading) {
    return <LoadingGate />;
  }

  return (
    <AnimatePresence mode="wait">
      {/* 2. AUTHENTICATION GATE */}
      {!user ? (
        <LoginScreen key="login" />
      ) : (
        // 3. REALITY FORK
        <MatrixProvider key="matrix-provider" userId={user.uid}>
          <EconomyProvider>
          {isNewUser ? (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              <OnboardingFlow onComplete={completeOnboarding} />
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
            >
              <Dashboard />
            </motion.div>
          )}
          </EconomyProvider>
        </MatrixProvider>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
