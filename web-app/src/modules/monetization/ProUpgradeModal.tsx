import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Infinity, 
  Palette, 
  BarChart3, 
  Sparkles,
  Loader2,
  Zap,
  Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, doc, updateDoc } from '../../services/firebase';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RGBCheck = () => (
  <div className="relative flex items-center justify-center w-6 h-6">
    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-md opacity-40 animate-pulse-slow" />
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className="w-4 h-4 relative z-10 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="rgb-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <motion.path 
        initial={{ pathLength: 0, opacity: 0 }} 
        animate={{ pathLength: 1, opacity: 1 }} 
        transition={{ duration: 0.8, ease: "easeOut" }}
        d="M20 6L9 17l-5-5" 
        stroke="url(#rgb-gradient)" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const BenefitCard = ({ icon: Icon, text, delay }: { icon: any, text: string, delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4, type: "spring" }}
    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group backdrop-blur-sm"
  >
    <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 group-hover:scale-110 transition-transform duration-300">
      <Icon size={16} className="text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
    </div>
    <span className="text-white/80 font-medium text-[13px] leading-tight flex-1 group-hover:text-white transition-colors">
      {text}
    </span>
    <RGBCheck />
  </motion.div>
);

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
    setIsProcessing(true);
    
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          plan: 'PRO',
          'stats.gold': (profile?.stats?.gold || 0) + 1000
        });
        onClose();
      } catch (error) {
        console.error('Error upgrading:', error);
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Background Backdrop - Glassmorphism Total */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
          >
             {/* Subtle Ambient Light */}
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-fuchsia-600/30 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-2s' }} />
             </div>
          </motion.div>

          {/* The Crystal Monolith */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-[500px] overflow-hidden rounded-[32px] border border-white/10 shadow-2xl"
          >
            {/* Glass Material Layer */}
            <div className="absolute inset-0 bg-[#121214]/60 backdrop-blur-3xl" />
            
            {/* Noise Texture for Realism */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

            {/* Content Container */}
            <div className="relative p-6 md:p-8 flex flex-col h-full">
              
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-20 group"
              >
                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4"
                >
                  <Sparkles size={12} className="text-indigo-400" />
                  <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">
                    Matrix Intelligence
                  </span>
                </motion.div>

                <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
                  Premium
                </h2>
                <p className="text-white/40 text-sm">
                  Desbloquea el potencial infinito.
                </p>
              </div>

              {/* Benefits Grid - Compact & Elegant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                <BenefitCard icon={Infinity} text="Proyectos Ilimitados" delay={0.1} />
                <BenefitCard icon={Infinity} text="Tareas Inteligentes" delay={0.2} />
                <BenefitCard icon={Infinity} text="Hábitos Ilimitados" delay={0.3} />
                <BenefitCard icon={Infinity} text="Notas Infinitas" delay={0.4} />
                <BenefitCard icon={Crown} text="Rasgos Desbloqueados" delay={0.5} />
                <BenefitCard icon={BarChart3} text="Análisis Avanzado" delay={0.6} />
                <BenefitCard icon={Palette} text="Temas Exclusivos" delay={0.7} />
              </div>

              {/* Footer Actions */}
              <div className="mt-auto pt-6 border-t border-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">$4.99</span>
                    <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">/ Mes</span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpgrade}
                    disabled={isProcessing}
                    className="flex-1 relative overflow-hidden rounded-2xl group focus:outline-none"
                  >
                    <div className="absolute inset-0 bg-white" />
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                    
                    <div className="relative px-6 py-3.5 flex items-center justify-center gap-2">
                      {isProcessing ? (
                        <Loader2 size={18} className="text-black animate-spin" />
                      ) : (
                        <>
                          <span className="font-semibold text-black text-sm tracking-wide">Comprar Ahora</span>
                          <Zap size={16} className="text-indigo-600" fill="currentColor" />
                        </>
                      )}
                    </div>
                  </motion.button>
                </div>
                
                <p className="text-center text-[10px] text-white/20 mt-4">
                  Pago seguro via Stripe • Cancela cuando quieras
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
