import { useState } from 'react';
import { motion } from 'framer-motion';
import { loginWithGoogle } from '../../services/firebaseService';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { LiquidButton } from '../../components/ui/LiquidButton';
import { AuroraBackground } from '../../components/AuroraBackground';

/**
 * COMPONENT: THE PORTAL (Login Screen)
 * DESIGN PHILOSOPHY: "Liquid Physiform"
 * Refactored to use "The Liquid Intelligence Protocol" Core Components
 */

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      // Transition handled by App.tsx
    } catch (error) {
      console.error("Authentication Failed", error);
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground className="flex items-center justify-center">
      <GlassPanel 
        className="relative z-10 w-full max-w-md p-8 mx-4 flex flex-col items-center text-center space-y-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        {/* Typography */}
        <div className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-md"
          >
            MATRIX
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm font-medium text-white/60 tracking-wide uppercase"
          >
            Gamify Your Existence
          </motion.p>
        </div>

        {/* Action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          <LiquidButton 
            onClick={handleLogin}
            isLoading={isLoading}
            className="w-full"
            variant="primary"
          >
            Initialize System
          </LiquidButton>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-white/30"
        >
          v2.0 • The Liquid Protocol
        </motion.div>
      </GlassPanel>
    </AuroraBackground>
  );
}
