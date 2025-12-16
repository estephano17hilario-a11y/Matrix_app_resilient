import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Brain, 
  Infinity, 
  Palette, 
  BarChart, 
  Check, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeatureItem = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex items-center p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-yellow-500/20 transition-all duration-300">
    <div className="p-2 rounded-lg bg-gradient-to-br from-gray-800 to-black border border-white/10 text-yellow-500 mr-4 group-hover:scale-110 transition-transform">
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <h3 className="text-white font-medium text-sm">{title}</h3>
      <p className="text-gray-400 text-xs">{description}</p>
    </div>
    <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
      <Check size={12} className="text-yellow-500" />
    </div>
  </div>
);

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);

    // 1. Simular latencia de red (La tensión de la espera)
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // 2. Actualizar Firebase (Magia Real)
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        plan: 'PRO',
        updatedAt: Date.now()
      });

      // 3. Feedback de Éxito (Dopamina)
      setSuccess(true);
      
      // 4. Cierre automático
      setTimeout(() => {
        onClose();
        setSuccess(false); // Reset state for next time
        setIsProcessing(false);
      }, 1500);
      
    } catch (error) {
      console.error("Purchase failed", error);
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black rounded-t-3xl sm:rounded-3xl border border-yellow-500/20 overflow-hidden shadow-2xl shadow-yellow-900/20"
          >
            {/* Success Overlay */}
            <AnimatePresence>
              {success && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-center p-8"
                >
                  <motion.div
                    initial={{ scale: 0.5, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring" }}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-600 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30"
                  >
                    <Check size={48} className="text-white" strokeWidth={3} />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500 mb-2">
                    Welcome to PRO
                  </h2>
                  <p className="text-gray-400">Your potential is now unlocked.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Early Access Badge */}
            <div className="absolute top-0 inset-x-0 flex justify-center -mt-3">
              <div className="bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-1 rounded-full shadow-lg border border-yellow-400/30 flex items-center gap-1.5">
                <Sparkles size={12} className="text-white animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-white uppercase">Early Access</span>
              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-6 sm:p-8 pt-10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">Unlock your full potential</h2>
                <p className="text-gray-400 text-sm">Join the elite circle of founders and creators.</p>
              </div>

              {/* Pricing Anchor */}
              <div className="flex justify-center items-baseline gap-3 mb-8">
                <span className="text-gray-500 line-through text-lg decoration-red-500/50">$9.90</span>
                <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500">
                  $4.90
                </span>
                <span className="text-gray-500 text-sm font-medium">/ mo</span>
              </div>

              {/* Feature Stack */}
              <div className="space-y-3 mb-8">
                <FeatureItem 
                  icon={Brain} 
                  title="IA Architect" 
                  description="Advanced Neural Guidance" 
                />
                <FeatureItem 
                  icon={Infinity} 
                  title="Unlimited Flow" 
                  description="Infinite Habits & Projects" 
                />
                <FeatureItem 
                  icon={Palette} 
                  title="Ether Themes" 
                  description="Exclusive Visual Environments" 
                />
                <FeatureItem 
                  icon={BarChart} 
                  title="Data Vault" 
                  description="Deep Analytics & Trends" 
                />
              </div>

              {/* FOMO Text */}
              <div className="text-center mb-4">
                <p className="text-amber-500/80 text-xs font-medium tracking-wide">
                  FOUNDER OFFER • ENDS JAN 30
                </p>
              </div>

              {/* Trigger Button */}
              <button
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 transform transition-all active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors" />
                <div className="flex items-center justify-center gap-2">
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Upgrade Now</span>
                      <span className="bg-black/10 px-2 py-0.5 rounded text-xs opacity-70">
                        $4.90 / mo
                      </span>
                    </>
                  )}
                </div>
              </button>
              
              <p className="text-center text-[10px] text-gray-600 mt-4">
                Cancel anytime. Secure payment processing.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
