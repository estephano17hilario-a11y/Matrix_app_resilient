import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { 
 X, 
 BarChart3,
 Target,
 Activity,
 FolderGit2,
 Hexagon,
 Smartphone,
 Crown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { toast } from 'react-hot-toast';

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

const CountdownBanner = () => {
 const { t } = useTranslation();
  const targetDate = new Date('2026-10-14T23:59:59').getTime();
 const { days, hours, minutes, seconds } = useCountdown(targetDate);

 return (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="mt-[20rem] sm:mt-[22rem] md:mt-[24rem] mb-4 md:mb-6 flex flex-col items-center justify-center gap-3 w-full "
 >
 <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.15)]">
  <span className="animate-pulse">🔥</span> {t('pro.offerEnds', "LA OFERTA TERMINA EL 14 DE OCTUBRE")}
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
  useEffect(() => {
    console.log("🟢 [ProUpgradeModal LifeCycle] ProUpgradeModal mounted!");
    return () => {
      console.log("🔴 [ProUpgradeModal LifeCycle] ProUpgradeModal UNMOUNTED!");
    };
  }, []);
  console.log(`🌀 [ProUpgradeModal LifeCycle] ProUpgradeModal rendering (isOpen: ${isOpen})`);
  const [mounted, setMounted] = useState(false);
 const [isCelebrating, setIsCelebrating] = useState(false);
 const isNative = Capacitor.isNativePlatform();
 const { weeklyPackage, monthlyPackage, isPremium, comprarPaquete, restaurarCompras } = useRevenueCat();
 const { user, updateProfileLocally } = useAuth();
 
 const handlePurchase = async (rcPackage: any) => {
   const toastId = toast.loading('Procesando compra...');
   try {
     const isProNow = await comprarPaquete(rcPackage);
     
      if (isProNow && user?.id) {
        // Force DB update manually to ensure instant activation on client without waiting for webhook
        let updateSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`[Supabase Update] Attempting to set PRO status in DB (attempt ${attempt}/3)...`);
            const { error } = await supabase.from('users').update({
              plan: 'PRO',
              es_pro: true,
              planExpiryDate: null
            }).eq('id', user.id);
            
            if (error) throw error;
            updateSuccess = true;
            break;
          } catch (err) {
            console.error(`[Supabase Update] Failed at attempt ${attempt}:`, err);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        if (updateSuccess) {
          updateProfileLocally({ plan: 'PRO', es_pro: true });
          toast.dismiss(toastId);
          setIsCelebrating(true);
          
          // Restart app after celebration
          setTimeout(() => {
            window.location.reload();
          }, 4500);
        } else {
          toast.error('Compra exitosa, pero hubo un problema al sincronizar con el servidor. Tu plan se actualizará automáticamente.', { id: toastId, duration: 6000 });
          // Fallback optimistic update
          updateProfileLocally({ plan: 'PRO', es_pro: true });
          setIsCelebrating(true);
          setTimeout(() => {
            window.location.reload();
          }, 4500);
        }
      } else {
       toast.dismiss(toastId);
     }
   } catch (error: any) {
     console.error("Purchase error captured:", error);
     const isConfigError = 
       error.code === '23' || 
       error.code === 23 || 
       error.readableErrorCode === 'ConfigurationError' ||
       error.readable_error_code === 'ConfigurationError' ||
       (error.message && error.message.includes('ConfigurationError')) ||
       (error.underlyingErrorMessage && error.underlyingErrorMessage.includes('Store products'));

     if (isConfigError) {
       toast.error(
         'Error de Configuración de RevenueCat: Registra tus productos de Google Play y vincúlalos a tus Ofertas (Offerings) en el panel de RevenueCat.',
         { id: toastId, duration: 8000 }
       );
     } else {
       toast.error(error.message || 'Error al procesar la compra', { id: toastId });
     }
   }
 };
 
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
 }
 }, [isOpen]);

  // removed auto-close to prevent sync issues and allow managing active subscription

 if (!mounted && !isOpen) return null;

 return (
 <AnimatePresence onExitComplete={() => setMounted(false)}>
 {isOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
 {/* Background Backdrop - Pure black for OLEDs, NO blur for maximum GPU performance on mobile */}
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.15, ease: "easeInOut" }}
 className="absolute inset-0 bg-black"
 />

 {/* Cosmic Performance-friendly Background */}
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2, delay: 0.1 }}
 className="absolute inset-0 pointer-events-none "
 style={{
 background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1), transparent 50%)'
 }}
 />

 {/* Main Content Container */}
 <motion.div 
 initial={{ scale: 0.98, opacity: 0, y: 10 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.98, opacity: 0, y: 10 }}
 transition={{ type: "spring", damping: 25, stiffness: 400 }}
 className="relative w-full h-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 overflow-y-auto md:overflow-visible custom-scrollbar p-6 pt-24 md:p-12 md:pt-20 "
 >
 <button 
 onClick={onClose}
 className="absolute top-8 right-6 md:top-16 md:right-12 p-3 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors z-[110] focus:outline-none"
 >
 <X size={20} />
 </button>

 {/* Left Side: Copy & Branding */}
 <div className="flex-1 flex flex-col items-center md:items-center text-center md:text-center z-10 w-full max-w-xl shrink-0 justify-center">
 <CountdownBanner />

 <motion.h2 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 }}
 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 md:mb-6 tracking-tighter leading-[1.1] "
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
 className="text-base md:text-xl text-white/50 mb-6 md:mb-8 max-w-md font-medium leading-relaxed mx-auto "
 >
 {t('pro.elevateDesc', "Eleva tu existencia a un nivel cósmico. Sin límites, sin restricciones, solo rendimiento puro.")}
 </motion.p>
 <div className="w-full flex flex-col items-center justify-center mb-12 md:mb-0 mt-2">
  {isNative ? (
    isPremium ? (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5 bg-[#100820]/80 border border-purple-500/30 p-8 rounded-3xl w-full max-w-sm mx-auto shadow-lg shadow-purple-500/10 relative z-10"
      >
        <div className="relative w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[inset_0_0_15px_rgba(168,85,247,0.2)]">
          <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-pulse" />
          <Crown size={32} className="text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]" />
        </div>
        <div className="text-center">
          <h3 className="text-white font-black text-lg tracking-wider uppercase mb-1.5">
            {t('pro.activeTitle', 'Lux Pro Activo')}
          </h3>
          <p className="text-white/60 text-xs leading-relaxed font-medium">
            {t('pro.activeDesc', 'Tu membresía Premium está activa a través de Google Play Store. ¡Todos los límites y restricciones han sido eliminados!')}
          </p>
        </div>
        <button
          onClick={async () => {
            const { showCustomerCenter } = await import('../../services/revenueCatService');
            await showCustomerCenter();
          }}
          className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/25 transition-all duration-200 cursor-pointer active:scale-95"
        >
          {t('pro.manageSubscription', 'Administrar Suscripción')}
        </button>
      </motion.div>
    ) : (
      <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
        {/* Weekly Package Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePurchase(weeklyPackage || 'weekly')}
          className="relative w-full overflow-hidden rounded-full group shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-200 border border-purple-500/50 bg-[#0a0014]"
        >
          <motion.div 
            className="absolute inset-0 z-0 opacity-90"
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: "linear" }}
            style={{
              backgroundColor: '#050010',
              backgroundImage: `
                radial-gradient(1px 1px at 15% 15%, white 100%, transparent), 
                radial-gradient(1.5px 1.5px at 35% 45%, rgba(255,255,255,0.8) 100%, transparent), 
                radial-gradient(circle at 50% 50%, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.2) 50%, transparent 100%)
              `,
              backgroundSize: '200px 200px, 200px 200px, 200% 200%'
            }}
          />
          <div className="relative z-10 px-8 py-3.5 flex flex-col items-center justify-center">
            <span className="font-black text-base uppercase tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] whitespace-nowrap">
              {t('pro.activateWeekly', "Plan Semanal")}
            </span>
            <span className="text-white/70 text-xs font-bold mt-1">
              {weeklyPackage ? weeklyPackage.product.priceString : "S/. 7.90"} / {t('pro.week', 'Semana')}
            </span>
          </div>
        </motion.button>

        {/* Monthly Package Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handlePurchase(monthlyPackage || 'monthly')}
          className="relative w-full overflow-hidden rounded-full group shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-200 border border-purple-500/50 bg-[#0a0014]"
        >
          <motion.div 
            className="absolute inset-0 z-0 opacity-90"
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: "linear" }}
            style={{
              backgroundColor: '#050010',
              backgroundImage: `
                radial-gradient(1px 1px at 15% 15%, white 100%, transparent), 
                radial-gradient(1.5px 1.5px at 35% 45%, rgba(255,255,255,0.8) 100%, transparent), 
                radial-gradient(circle at 50% 50%, rgba(168,85,247,0.4) 0%, rgba(99,102,241,0.2) 50%, transparent 100%)
              `,
              backgroundSize: '200px 200px, 200px 200px, 200% 200%'
            }}
          />
          <div className="relative z-10 px-8 py-3.5 flex flex-col items-center justify-center">
            <span className="font-black text-base uppercase tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] whitespace-nowrap">
              {t('pro.activateMonthly', "Plan Mensual")}
            </span>
            <span className="text-white/70 text-xs font-bold mt-1">
              {monthlyPackage ? monthlyPackage.product.priceString : "S/. 19.90"} / {t('pro.month', 'Mes')}
            </span>
          </div>
        </motion.button>

        {/* Restore Purchases Button */}
        <button
          onClick={async () => {
            const toastId = toast.loading('Restaurando compras...');
            try {
              const isProNow = await restaurarCompras();
              if (isProNow && user?.id) {
                let updateSuccess = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                  try {
                    console.log(`[Supabase Restore] Attempting to set PRO status in DB (attempt ${attempt}/3)...`);
                    const { error } = await supabase.from('users').update({
                      plan: 'PRO',
                      es_pro: true,
                      planExpiryDate: null
                    }).eq('id', user.id);
                    if (error) throw error;
                    updateSuccess = true;
                    break;
                  } catch (err) {
                    console.error(`[Supabase Restore] Failed at attempt ${attempt}:`, err);
                    if (attempt < 3) {
                      await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                  }
                }
                if (updateSuccess) {
                  updateProfileLocally({ plan: 'PRO', es_pro: true });
                  toast.success('¡Suscripción restaurada con éxito!');
                } else {
                  toast.error('Compra restaurada en la tienda, pero hubo un problema al sincronizar con el servidor. Tu cuenta se sincronizará automáticamente.');
                  updateProfileLocally({ plan: 'PRO', es_pro: true });
                }
              } else {
                toast.error('No se encontró ninguna compra para restaurar.');
              }
            } catch (error) {
              toast.error('Error al restaurar las compras.');
            } finally {
              toast.dismiss(toastId);
            }
          }}
          className="text-xs text-white/40 hover:text-white/80 transition-colors mt-2 block mx-auto underline cursor-pointer"
        >
          {t('monetization.restorePurchases', 'Restaurar Compras')}
        </button>
      </div>
    )
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col items-center gap-4 bg-[#100820]/80 border border-purple-500/30 p-6 rounded-2xl max-w-md mx-auto shadow-lg shadow-purple-500/10"
    >
      <Smartphone size={32} className="text-purple-400 mb-2" />
      <p className="text-white text-base md:text-lg font-medium text-center">
        {t('monetization.unlockProInstruction', 'Para desbloquear Lux PRO, abre la aplicación en tu celular y dirígete a la sección Premium.')}
      </p>
      <a 
        href="https://play.google.com/store/apps/details?id=com.luxresilient.app" 
        target="_blank" 
        rel="noreferrer"
        className="mt-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all duration-200"
      >
        {t('monetization.downloadGooglePlay', 'Descargar en Google Play')}
      </a>
    </motion.div>
  )}
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
 className={`p-5 md:p-6 rounded-[24px] bg-[#1a0f2e]/40 border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 flex flex-row sm:flex-col items-center sm:items-start gap-4 text-left shadow-lg ${feature.shadow} `}
 >
 <div className={`w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center border border-white/20 shadow-md`}>
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
 </motion.div>
 </div>
 )}

 {/* Celebration Overlay */}
 {isCelebrating && (
 <motion.div
 key="celebration-overlay"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#050010] overflow-hidden"
 >
 {/* Background Particles/Rays */}
 <motion.div 
 className="absolute inset-0 pointer-events-none"
 animate={{ rotate: 360 }}
 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
 style={{
 background: 'conic-gradient(from 0deg at 50% 50%, rgba(168, 85, 247, 0) 0%, rgba(168, 85, 247, 0.2) 20%, rgba(168, 85, 247, 0) 40%, rgba(168, 85, 247, 0.2) 60%, rgba(168, 85, 247, 0) 80%, rgba(168, 85, 247, 0.2) 100%)'
 }}
 />
 
 {/* Floating Particles */}
 {Array.from({ length: 30 }).map((_, i) => (
 <motion.div
 key={i}
 initial={{ 
 opacity: 0, 
 scale: 0,
 x: 0,
 y: 0
 }}
 animate={{ 
 opacity: [0, 1, 0],
 scale: [0, 1.5, 0.5],
 x: (Math.random() - 0.5) * 500,
 y: (Math.random() - 0.5) * 500
 }}
 transition={{
 duration: 2 + Math.random() * 2,
 ease: "easeOut",
 repeat: Infinity
 }}
 className="absolute w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]"
 style={{
 top: '50%',
 left: '50%'
 }}
 />
 ))}

 <motion.div
 initial={{ scale: 0.5, y: 50, opacity: 0 }}
 animate={{ scale: 1, y: 0, opacity: 1 }}
 transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
 className="relative z-10 flex flex-col items-center"
 >
 <motion.div
 animate={{ 
 y: [0, -10, 0],
 scale: [1, 1.05, 1],
 boxShadow: [
 "0 0 40px rgba(168, 85, 247, 0.4)",
 "0 0 80px rgba(168, 85, 247, 0.8)",
 "0 0 40px rgba(168, 85, 247, 0.4)"
 ]
 }}
 transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
 className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-8 border border-white/20"
 >
 <Crown size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
 </motion.div>

 <motion.h1 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.5 }}
 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-300 text-center drop-shadow-[0_0_20px_rgba(216,180,254,0.5)] mb-4 tracking-tight uppercase"
 >
 {t('monetization.nowLuxPro', '¡AHORA ERES LUX PRO!')}
 </motion.h1>

 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.8 }}
 className="text-white/60 text-lg md:text-xl font-medium tracking-wide uppercase animate-pulse"
 >
 {t('monetization.rebooting', 'Reiniciando el sistema...')}
 </motion.p>
 </motion.div>
 </motion.div>
 )}

 </AnimatePresence>
 );
};
