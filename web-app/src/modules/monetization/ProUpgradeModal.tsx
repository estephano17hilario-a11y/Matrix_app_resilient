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
import { showPaywall } from '../../services/revenueCatService';
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
 const targetDate = new Date('2026-05-31T00:00:00').getTime();
 const { days, hours, minutes, seconds } = useCountdown(targetDate);

 return (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="mt-[20rem] sm:mt-[22rem] md:mt-[24rem] mb-4 md:mb-6 flex flex-col items-center justify-center gap-3 w-full "
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
 const [mounted, setMounted] = useState(false);
 const [isCelebrating, setIsCelebrating] = useState(false);
 const isNative = Capacitor.isNativePlatform();
 const { currentOffering, isPremium, purchasePackage } = useRevenueCat();
 const { user, updateProfileLocally } = useAuth();
 
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

 useEffect(() => {
 if (isPremium && !isCelebrating) {
 onClose();
 }
 }, [isPremium, onClose, isCelebrating]);

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
 <motion.button
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={async () => {
 const toastId = toast.loading('Procesando compra...');
 try {
   let isProNow = false;
   if (currentOffering?.weekly) {
     isProNow = await purchasePackage(currentOffering.weekly);
   } else {
     console.log("No weekly package found, attempting fallback showPaywall");
     isProNow = await showPaywall();
   }

   if (isProNow && user?.id) {
     // Force DB update manually to ensure instant activation on client without waiting for webhook
     await supabase.from('users').update({
       plan: 'PRO',
       es_pro: true
     }).eq('id', user.id);
     
     updateProfileLocally({ plan: 'PRO', es_pro: true });
     toast.dismiss(toastId);
     setIsCelebrating(true);
     
     // Restart app after celebration
     setTimeout(() => {
       window.location.reload();
     }, 4500);
   } else {
     toast.dismiss(toastId);
   }
 } catch (error) {
   console.error(error);
   toast.error('Error al procesar la compra', { id: toastId });
 }
 }}
 className="relative w-[90%] sm:w-[80%] md:w-auto mx-auto overflow-hidden rounded-full group shadow-[0_0_50px_rgba(168,85,247,0.6)] hover:shadow-[0_0_80px_rgba(168,85,247,0.9)] transition-shadow duration-200 border border-purple-500/50 bg-[#0a0014] "
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
 
 <div className="relative z-10 px-8 md:px-16 py-3.5 flex flex-col items-center justify-center">
 <span className="font-black text-lg md:text-xl uppercase tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] whitespace-nowrap">
 {t('pro.activateDelux', "Activar Delux")}
 </span>
 {currentOffering?.weekly && (
 <span className="text-white/70 text-xs font-bold mt-1">
 {currentOffering.weekly.product.priceString} / {t('pro.week', 'Semana')}
 </span>
 )}
 </div>
 </motion.button>
 ) : (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 className="flex flex-col items-center gap-4 bg-[#100820]/80 border border-purple-500/30 p-6 rounded-2xl max-w-md mx-auto shadow-lg shadow-purple-500/10"
 >
 <Smartphone size={32} className="text-purple-400 mb-2" />
 <p className="text-white text-base md:text-lg font-medium text-center">
 Para desbloquear Lux PRO, abre la aplicación en tu celular y dirígete a la sección Premium.
 </p>
 <a 
 href="https://play.google.com/store/apps/details?id=com.lux.app" 
 target="_blank" 
 rel="noreferrer"
 className="mt-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all duration-200"
 >
 Descargar en Google Play
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
 ¡AHORA ERES LUX PRO!
 </motion.h1>

 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.8 }}
 className="text-white/60 text-lg md:text-xl font-medium tracking-wide uppercase animate-pulse"
 >
 Reiniciando el sistema...
 </motion.p>
 </motion.div>
 </motion.div>
 )}

 </AnimatePresence>
 );
};
