import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Infinity as InfinityIcon, 
  Zap,
  Star,
  Shield,
  Loader2
} from 'lucide-react';
import { useLux } from '../../context/LuxContext';
import { createCheckoutPreference } from '../../services/mercadoPagoService';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: InfinityIcon,
    title: 'Capacidad Ilimitada',
    description: 'Sin límites en proyectos, hábitos y notas. Tu potencial desatado.'
  },
  {
    icon: Zap,
    title: 'Velocidad Cuántica',
    description: 'Sincronización en tiempo real y prioridad en servidores.'
  },
  {
    icon: Star,
    title: 'Estética Cósmica',
    description: 'Temas exclusivos y personalización avanzada de la interfaz.'
  },
  {
    icon: Shield,
    title: 'Legado Inmortal',
    description: 'Respaldos automáticos y bóveda de seguridad encriptada.'
  }
];

const PlansView = ({ onBack, onClose }: { onBack: () => void, onClose: () => void }) => {
  // Countdown Logic
  const targetDate = new Date('2026-05-01T00:00:00').getTime();
  const [timeLeft, setTimeLeft] = useState(targetDate - Date.now());
  const { user } = useLux();
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'yearly' | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(targetDate - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const days = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));
  const seconds = Math.max(0, Math.floor((timeLeft % (1000 * 60)) / 1000));

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    setLoadingPlan(planType);
    try {
      const initPoint = await createCheckoutPreference(planType, user);
      if (initPoint) {
        window.location.href = initPoint;
      } else {
        alert("Hubo un error al conectar con Mercado Pago. Intenta de nuevo.");
      }
    } catch (e) {
      console.error(e);
      alert("Hubo un error al procesar la solicitud.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col items-center justify-start w-full max-w-4xl mx-auto z-10 w-full pt-4 pb-8"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-2">
          Elige tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Plan</span>
        </h2>
      </div>

      <div className="flex flex-row gap-3 md:gap-6 w-full max-w-2xl mb-6">
        {/* Monthly Plan */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col items-center text-center hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden">
          <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Mensual</div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-1">$4.99<span className="text-sm md:text-lg text-white/50 font-normal">/mes</span></div>
          <div className="text-[10px] sm:text-xs md:text-sm text-white/40 line-through mb-4 md:mb-6">Reg: $9.90/mes</div>
          <button 
            onClick={() => handleSubscribe('monthly')}
            disabled={loadingPlan !== null}
            className="w-full py-3 md:py-3.5 rounded-xl bg-white/10 text-white text-sm md:text-base font-bold hover:bg-white/20 transition-colors mt-auto flex items-center justify-center gap-2"
          >
            {loadingPlan === 'monthly' ? <Loader2 size={18} className="animate-spin" /> : 'Seleccionar'}
          </button>
        </div>

        {/* Yearly Plan */}
        <div className="flex-1 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col items-center text-center hover:bg-indigo-500/20 transition-colors cursor-pointer relative overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.15)]">
          <div className="absolute top-0 inset-x-0 bg-indigo-500 text-white text-[9px] md:text-[10px] font-bold py-1 uppercase tracking-wider text-center">Más popular</div>
          <div className="text-indigo-300 text-xs font-bold uppercase tracking-wider mt-2 md:mt-0 mb-2">Anual</div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-1">$49.90<span className="text-sm md:text-lg text-white/50 font-normal">/año</span></div>
          <div className="text-[10px] sm:text-xs md:text-sm text-white/40 line-through mb-4 md:mb-6">Reg: $99.90/año</div>
          <button 
            onClick={() => handleSubscribe('yearly')}
            disabled={loadingPlan !== null}
            className="w-full py-3 md:py-3.5 rounded-xl bg-indigo-500 text-white text-sm md:text-base font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-colors mt-auto flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loadingPlan === 'yearly' ? <Loader2 size={18} className="animate-spin" /> : 'Seleccionar'}
          </button>
        </div>
      </div>

      {/* Countdown Box */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 md:p-6 max-w-2xl w-full flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-sm md:text-base text-red-200/90 leading-snug font-medium">
            <span className="text-red-400 font-bold block mb-1">🔥 OFERTA DE LANZAMIENTO</span>
            Aprovecha estos precios especiales de lanzamiento por tiempo limitado. Al finalizar la oferta subirán a $9.90 y $99.90.
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 text-center justify-center shrink-0">
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{days}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">Días</div>
          </div>
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{hours}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">Hrs</div>
          </div>
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{minutes}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">Min</div>
          </div>
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{seconds}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">Seg</div>
          </div>
        </div>
      </div>

      <button onClick={onBack} className="mt-8 text-white/40 hover:text-white transition-colors text-sm font-medium">
        ← Volver a los beneficios
      </button>
    </motion.div>
  );
};

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  // Use state to avoid heavy initial render if closed
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'features' | 'plans'>('features');
  
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setView('features'); // Reset view when opened
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  return (
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
          {/* Background Backdrop - Pure black for OLEDs, zero blur for max performance */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute inset-0 bg-black"
          />

          {/* Cosmic Performance-friendly Background */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1), transparent 50%)'
            }}
          />

          {/* Main Content Container - Scrollable on mobile */}
          <motion.div 
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className={`relative w-full h-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 overflow-y-auto md:overflow-visible custom-scrollbar ${view === 'features' ? 'p-6 pt-24 md:p-12 md:pt-20' : 'p-3 pt-14 md:p-12 md:pt-20'}`}
          >
            {/* Close Button - Moved further down to clear the absolute top safe area completely */}
            <button 
              onClick={onClose}
              className="absolute top-8 right-6 md:top-16 md:right-12 p-3 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors z-[110] focus:outline-none"
            >
              <X size={20} />
            </button>

            {view === 'features' ? (
              <>
                {/* Left Side: Copy & Branding */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left z-10 w-full max-w-xl shrink-0 justify-center">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-32 md:mt-48 text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 md:mb-6 tracking-tighter leading-[1.1]"
                  >
                    Desata tu <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                      Verdadero Poder
                    </span>
                  </motion.h2>

                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-base md:text-xl text-white/50 mb-8 md:mb-12 max-w-md font-medium leading-relaxed"
                  >
                    Eleva tu existencia a un nivel cósmico. Sin límites, sin restricciones, solo rendimiento puro.
                  </motion.p>

                  <div className="w-full flex justify-center md:justify-start mb-8 md:mb-0 mt-2">
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setView('plans');
                      }}
                      className="relative w-[90%] sm:w-[80%] md:w-auto mx-auto md:mx-0 overflow-hidden rounded-full group shadow-[0_0_50px_rgba(168,85,247,0.6)] hover:shadow-[0_0_80px_rgba(168,85,247,0.9)] transition-shadow duration-300 border border-purple-500/50 bg-[#0a0014]"
                    >
                  {/* Cosmos Inner Background - Static, purely CSS, 0 GPU lag */}
                  <motion.div 
                    className="absolute inset-0 z-0"
                    animate={{ 
                      backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: "linear" }}
                    style={{
                      backgroundColor: '#050010',
                      backgroundImage: `
                        radial-gradient(1px 1px at 15% 15%, white 100%, transparent), 
                        radial-gradient(1.5px 1.5px at 35% 45%, rgba(255,255,255,0.8) 100%, transparent), 
                        radial-gradient(2px 2px at 55% 85%, white 100%, transparent), 
                        radial-gradient(1px 1px at 75% 25%, rgba(255,255,255,0.6) 100%, transparent), 
                        radial-gradient(1.5px 1.5px at 85% 65%, white 100%, transparent),
                        radial-gradient(1px 1px at 25% 95%, rgba(255,255,255,0.9) 100%, transparent),
                        radial-gradient(circle at 50% 50%, rgba(99,102,241,0.5) 0%, rgba(168,85,247,0.3) 50%, transparent 100%)
                      `,
                      backgroundSize: '200px 200px, 200px 200px, 200px 200px, 200px 200px, 200px 200px, 200px 200px, 200% 200%'
                    }}
                  />
                  
                  {/* Content Layer */}
                  <div className="relative z-10 px-8 md:px-16 py-3.5 flex items-center justify-center">
                    <span className="font-black text-lg md:text-xl uppercase tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] whitespace-nowrap">
                      Activar Delux
                    </span>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Right Side: Features Grid */}
            <div className="flex-1 w-full max-w-xl z-10 pb-12 md:pb-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon as React.ElementType;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (index * 0.1) }}
                      className="p-5 md:p-6 rounded-[20px] md:rounded-[24px] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors flex flex-row sm:flex-col items-center sm:items-start gap-4 text-left"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl md:rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Icon size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base md:text-lg mb-1 md:mb-2">{feature.title}</h3>
                        <p className="text-white/40 text-xs md:text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            </>
            ) : (
              <PlansView onBack={() => setView('features')} onClose={onClose} />
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
