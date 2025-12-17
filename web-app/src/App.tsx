import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MatrixProvider } from './context/MatrixContext';
import { EconomyProvider } from './context/EconomyContext';
import { TutorialProvider } from './context/TutorialContext';
import { AuthScreen } from './modules/auth/AuthScreen';
import { AuroraBackground } from './components/AuroraBackground';
import { LoadingScreen } from './components/ui/LoadingScreen';
import Dashboard from './Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * COMPONENT: APP ROUTER
 * LOGIC: Determines the reality the user experiences.
 */
const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  
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
              <AuthScreen />
          </motion.div>
        ) : (
          // 4. REALITY FORK
          <MatrixProvider key="matrix-provider" userId={user.uid}>
            <EconomyProvider>
              <TutorialProvider>
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5 }}
                >
                  <Dashboard />
                </motion.div>
              </TutorialProvider>
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
