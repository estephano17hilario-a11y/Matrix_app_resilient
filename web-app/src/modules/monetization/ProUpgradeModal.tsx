import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { 
  X, 
  Loader2,
  BarChart3,
  Target,
  Activity,
  FolderGit2,
  Hexagon
} from 'lucide-react';
import { createCheckoutPreference } from '../../services/mercadoPagoService';
import { useTranslation } from 'react-i18next';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const useCountdown = (targetDate: number) => {
  const [timeLeft, setTimeLeft] = useState(targetDate - Date.now());

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

  return { days, hours, minutes, seconds };
};

const PlansView = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation();
  // Countdown Logic
  const targetDate = new Date('2026-05-31T00:00:00').getTime();
  const { days, hours, minutes, seconds } = useCountdown(targetDate);
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'yearly' | null>(null);

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    setLoadingPlan(planType);
    try {
      const pref = await createCheckoutPreference(planType);
      
      if (pref && pref.init_point) {
        if (Capacitor.isNativePlatform()) {
          // Listen for browser close to check if they paid
          const listener = await Browser.addListener('browserFinished', () => {
             // Let the main Dashboard component know that we should check subscription
             window.location.search = `?payment_status=success&plan=${planType}&preapproval_id=${pref.id}`;
             listener.remove();
          });
          await Browser.open({ url: pref.init_point });
        } else {
          window.location.href = pref.init_point;
        }
      } else {
        alert(t('pro.mercadoPagoError', "Hubo un error al conectar con Mercado Pago. Intenta de nuevo."));
      }
    } catch (e: any) {
      alert(t('pro.mercadoPagoConnError', "La conexión con Mercado Pago falló. Por favor verifica tu conexión a internet e intenta de nuevo."));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col items-center justify-start w-full max-w-4xl mx-auto z-10 pt-4 pb-8"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-2">
          {t('pro.chooseYour', "Elige tu")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{t('pro.plan', "Plan")}</span>
        </h2>
      </div>

      <div className="flex flex-row gap-3 md:gap-6 w-full max-w-2xl mb-6">
        {/* Monthly Plan */}
        <div className="flex-1 bg-[#0b0415] border border-[#23153c] rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col items-center text-center hover:border-[#422675] hover:bg-[#100820] transition-colors duration-200 cursor-pointer relative overflow-hidden">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{t('pro.monthly', "Mensual")}</div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-1 tracking-tight">$4.99<span className="text-sm md:text-lg text-slate-500 font-medium">/{t('pro.month', "mes")}</span></div>
          <div className="text-[10px] sm:text-xs md:text-sm text-slate-600 line-through mb-4 md:mb-6">{t('pro.reg', "Reg")}: $9.90/{t('pro.month', "mes")}</div>
          <button 
            onClick={() => handleSubscribe('monthly')}
            disabled={loadingPlan !== null}
            className="w-full py-3 md:py-3.5 rounded-xl bg-[#1a0f2e] border border-[#301c54] text-slate-300 text-sm md:text-base font-bold hover:bg-[#251642] hover:text-white transition-colors mt-auto flex items-center justify-center gap-2"
          >
            {loadingPlan === 'monthly' ? <Loader2 size={18} className="animate-spin" /> : t('pro.select', "Seleccionar")}
          </button>
        </div>

        {/* Yearly Plan */}
        <div className="flex-1 bg-[#130826] border border-[#6d28d9] rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col items-center text-center hover:border-[#8b5cf6] hover:bg-[#1a0b33] transition-colors duration-200 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#4c1d95] text-white text-[9px] md:text-[10px] font-bold py-1.5 uppercase tracking-widest text-center">{t('pro.mostPopular', "Más popular")}</div>
          <div className="text-[#a78bfa] text-xs font-bold uppercase tracking-widest mt-2 md:mt-0 mb-2">{t('pro.yearly', "Anual")}</div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-[#c4b5fd] mb-1 tracking-tight">$49.90<span className="text-sm md:text-lg text-[#8b5cf6] font-medium">/{t('pro.year', "año")}</span></div>
          <div className="text-[10px] sm:text-xs md:text-sm text-[#6d28d9] line-through mb-4 md:mb-6">{t('pro.reg', "Reg")}: $99.90/{t('pro.year', "año")}</div>
          <button 
            onClick={() => handleSubscribe('yearly')}
            disabled={loadingPlan !== null}
            className="w-full py-3 md:py-3.5 rounded-xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] text-white text-sm md:text-base font-bold hover:from-[#6d28d9] hover:to-[#8b5cf6] transition-colors mt-auto flex items-center justify-center gap-2 disabled:opacity-70 border border-[#8b5cf6]"
          >
            {loadingPlan === 'yearly' ? <Loader2 size={18} className="animate-spin" /> : t('pro.select', "Seleccionar")}
          </button>
        </div>
      </div>

      {/* Countdown Box */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 md:p-6 max-w-2xl w-full flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-sm md:text-base text-red-200/90 leading-snug font-medium">
            <span className="text-red-400 font-bold block mb-1">🔥 {t('pro.launchOffer', "OFERTA DE LANZAMIENTO")}</span>
            {t('pro.launchOfferDesc', "Aprovecha estos precios especiales de lanzamiento por tiempo limitado. Al finalizar la oferta subirán a $9.90 y $99.90.")}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 text-center justify-center shrink-0">
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{days}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">{t('pro.days', "Días")}</div>
          </div>
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{hours}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">{t('pro.hrs', "Hrs")}</div>
          </div>
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{minutes}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">{t('pro.min', "Min")}</div>
          </div>
          <div className="bg-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{seconds}</div>
            <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">{t('pro.sec', "Seg")}</div>
          </div>
        </div>
      </div>

      <button onClick={onBack} className="mt-8 text-white/40 hover:text-white transition-colors text-sm font-medium">
        ← {t('pro.backToBenefits', "Volver a los beneficios")}
      </button>
    </motion.div>
  );
};

const CountdownBanner = () => {
  const { t } = useTranslation();
  const targetDate = new Date('2026-05-31T00:00:00').getTime();
  const { days, hours, minutes, seconds } = useCountdown(targetDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-[20rem] sm:mt-[22rem] md:mt-[24rem] mb-4 md:mb-6 flex flex-col items-center justify-center gap-3 w-full"
    >
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.15)]">
        <span className="animate-pulse">🔥</span> {t('pro.offerEnds', "LA OFERTA TERMINA EL 31 DE MAYO")}
      </div>
      <div className="flex gap-2 sm:gap-3 text-center justify-center items-center">
        <div className="bg-[#0a0014]/80 border border-white/10 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px] shadow-lg">
          <div className="text-xl sm:text-2xl font-black text-white leading-none">{days}</div>
          <div className="text-[9px] sm:text-[10px] text-white/50 uppercase font-bold mt-1">{t('pro.days', "Días")}</div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white/20 pb-3">:</div>
        <div className="bg-[#0a0014]/80 border border-white/10 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px] shadow-lg">
          <div className="text-xl sm:text-2xl font-black text-white leading-none">{hours}</div>
          <div className="text-[9px] sm:text-[10px] text-white/50 uppercase font-bold mt-1">{t('pro.hrs', "Hrs")}</div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white/20 pb-3">:</div>
        <div className="bg-[#0a0014]/80 border border-white/10 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px] shadow-lg">
          <div className="text-xl sm:text-2xl font-black text-white leading-none">{minutes}</div>
          <div className="text-[9px] sm:text-[10px] text-white/50 uppercase font-bold mt-1">{t('pro.min', "Min")}</div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white/20 pb-3">:</div>
        <div className="bg-[#0a0014]/80 border border-red-500/20 rounded-xl p-2 sm:p-3 min-w-[50px] sm:min-w-[60px] shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <div className="text-xl sm:text-2xl font-black text-red-400 leading-none">{seconds}</div>
          <div className="text-[9px] sm:text-[10px] text-red-400/70 uppercase font-bold mt-1">{t('pro.sec', "Seg")}</div>
        </div>
      </div>
    </motion.div>
  );
};

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  // Use state to avoid heavy initial render if closed
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'features' | 'plans'>('features');
  
  const features = [
    {
      icon: BarChart3,
      title: t('pro.features.charts.title', 'Gráficos Desbloqueados'),
      description: t('pro.features.charts.desc', 'Visualiza tu progreso y estadísticas sin restricciones.'),
      color: 'from-blue-500 to-cyan-400',
      shadow: 'shadow-blue-500/20'
    },
    {
      icon: Target,
      title: t('pro.features.strategies.title', 'Estrategias Ilimitadas'),
      description: t('pro.features.strategies.desc', 'Crea y ejecuta infinitas estrategias para dominar tu día.'),
      color: 'from-purple-500 to-indigo-400',
      shadow: 'shadow-purple-500/20'
    },
    {
      icon: Activity,
      title: t('pro.features.habits.title', 'Hábitos Ilimitados'),
      description: t('pro.features.habits.desc', 'Forja y rastrea todos los hábitos que necesites.'),
      color: 'from-emerald-500 to-teal-400',
      shadow: 'shadow-emerald-500/20'
    },
    {
      icon: FolderGit2,
      title: t('pro.features.projects.title', 'Proyectos Ilimitados'),
      description: t('pro.features.projects.desc', 'Gestiona múltiples misiones simultáneas sin fronteras.'),
      color: 'from-orange-500 to-amber-400',
      shadow: 'shadow-orange-500/20'
    },
    {
      icon: Hexagon,
      title: t('pro.features.traits.title', 'Todos los Rasgos Desbloqueados'),
      description: t('pro.features.traits.desc', 'Accede al espectro completo de personalización de tu avatar.'),
      color: 'from-pink-500 to-rose-400',
      shadow: 'shadow-pink-500/20'
    }
  ];

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
          {/* Text-galactic style moved to index.css */}
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
                <div className="flex-1 flex flex-col items-center md:items-center text-center md:text-center z-10 w-full max-w-xl shrink-0 justify-center">
                  <CountdownBanner />

                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 md:mb-6 tracking-tighter leading-[1.1]"
                  >
                    {t('pro.unleashYour', "Desata tu")} <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                      {t('pro.truePower', "Verdadero Poder")}
                    </span>
                  </motion.h2>

                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-base md:text-xl text-white/50 mb-6 md:mb-8 max-w-md font-medium leading-relaxed mx-auto"
                  >
                    {t('pro.elevateDesc', "Eleva tu existencia a un nivel cósmico. Sin límites, sin restricciones, solo rendimiento puro.")}
                  </motion.p>

                  <div className="w-full flex justify-center mb-12 md:mb-0 mt-2">
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setView('plans');
                      }}
                      className="relative w-[90%] sm:w-[80%] md:w-auto mx-auto overflow-hidden rounded-full group shadow-[0_0_50px_rgba(168,85,247,0.6)] hover:shadow-[0_0_80px_rgba(168,85,247,0.9)] transition-shadow duration-300 border border-purple-500/50 bg-[#0a0014]"
                    >
                  {/* Cosmos Inner Background */}
                  <motion.div 
                    className="absolute inset-0 z-0 opacity-90"
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
                      {t('pro.activateDelux', "Activar Delux")}
                    </span>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Right Side: Features Grid */}
            <div className="flex-1 w-full max-w-xl z-10 pb-12 md:pb-0 -mt-10 md:-mt-16">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon as React.ElementType;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (index * 0.1) }}
                      className={`p-5 md:p-6 rounded-[24px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 flex flex-row sm:flex-col items-center sm:items-start gap-4 text-left shadow-lg ${feature.shadow}`}
                    >
                      <div className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center border border-white/20 shadow-inner`}>
                        <Icon size={24} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base md:text-lg mb-1 md:mb-2 leading-tight">
                          {feature.title.split(new RegExp(`(${t('pro.unlockedWord', 'Desbloqueados')}|${t('pro.unlimitedWord', 'Ilimitadas')}|${t('pro.unlimitedWordM', 'Ilimitados')}|Unlocked|Unlimited)`,'g')).map((part, i) => {
                            if ([t('pro.unlockedWord', 'Desbloqueados'), t('pro.unlimitedWord', 'Ilimitadas'), t('pro.unlimitedWordM', 'Ilimitados'), 'Unlocked', 'Unlimited'].includes(part)) {
                              return (
                                <span 
                                  key={i} 
                                  className="font-black text-galactic"
                                >
                                  {part}
                                </span>
                              );
                            }
                            return part;
                          })}
                        </h3>
                        <p className="text-white/50 text-xs md:text-sm leading-relaxed font-medium">{feature.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            </>
            ) : (
              <PlansView onBack={() => setView('features')} />
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
