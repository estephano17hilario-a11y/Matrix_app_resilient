import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { X, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useAuth } from '../../context/AuthContext';
import { syncSubscriptionWithServer } from '../../services/subscriptionService';
import { MembershipStatus } from './MembershipStatus';
import { DeluxeFunnel } from './funnel/DeluxeFunnel';
import { toast } from 'react-hot-toast';

interface ProUpgradeModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
 const [isCelebrating, setIsCelebrating] = useState(false);
 const isNative = Capacitor.isNativePlatform();
 const { weeklyPackage, monthlyPackage, annualPackage, isPremium, comprarPaquete, restaurarCompras } = useRevenueCat();
 const { user, updateProfileLocally } = useAuth();
 
 const activateLocallyAndSync = async () => {
   updateProfileLocally({ plan: 'PRO', es_pro: true });
   const server = await syncSubscriptionWithServer(true);
   if (server?.plan === 'PRO') {
     updateProfileLocally({ plan: 'PRO', es_pro: true, planExpiryDate: server.planExpiryDate, plan_product: server.plan_product });
   }
 };

 const handlePurchase = async (rcPackage: any) => {
   const toastId = toast.loading('Procesando compra...');
   try {
     const isProNow = await comprarPaquete(rcPackage);
     
      if (isProNow && user?.id) {
        // Google Play + RevenueCat already confirmed the purchase: unlock right away, then let the
        // server verify and persist it (the client is not allowed to write the plan itself).
        await activateLocallyAndSync();
        toast.dismiss(toastId);
        setIsCelebrating(true);
        // Restart app after celebration
        setTimeout(() => {
          window.location.reload();
        }, 4500);
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
 
 const handleRestore = async () => {
   const toastId = toast.loading('Restaurando compras...');
   try {
     const isProNow = await restaurarCompras();
     if (isProNow && user?.id) {
       await activateLocallyAndSync();
       toast.success('¡Suscripción restaurada con éxito!');
     } else {
       toast.error('No se encontró ninguna compra para restaurar.');
     }
   } catch (error) {
     toast.error('Error al restaurar las compras.');
   } finally {
     toast.dismiss(toastId);
   }
 };

 const lang: 'es' | 'en' = (i18n.language || 'es').startsWith('en') ? 'en' : 'es';

 useEffect(() => {
 if (isOpen) {
 setMounted(true);
 }
 }, [isOpen]);

  // removed auto-close to prevent sync issues and allow managing active subscription

 if (!mounted && !isOpen) return null;

 // Portaled to <body>: the purchase screen can open over sheets that live there (habit form, routine settings…),
 // and inside the Dashboard's own stacking context it would always end up underneath them.
 return createPortal(
 <AnimatePresence onExitComplete={() => setMounted(false)}>
 {isOpen && (
 <div className="fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden">
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
 background: 'radial-gradient(120% 60% at 50% -10%, rgba(139,92,246,0.32), transparent 60%), radial-gradient(80% 50% at 100% 100%, rgba(236,72,153,0.14), transparent 60%), radial-gradient(70% 50% at 0% 80%, rgba(245,158,11,0.10), transparent 60%)'
 }}
 />

 {/* Main content: the funnel, or the active-membership card */}
 <motion.div
 initial={{ opacity: 0, y: 14 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 14 }}
 transition={{ type: "spring", damping: 28, stiffness: 320 }}
 className="relative w-full h-full"
 >
 {isNative && isPremium ? (
 <div className="flex h-full w-full flex-col items-center justify-center px-6">
 <button onClick={onClose} aria-label="Cerrar" className="absolute top-[max(env(safe-area-inset-top),16px)] right-4 p-3 rounded-full bg-white/5 text-white/60 hover:text-white"><X size={20} /></button>
 <div className="flex flex-col items-center gap-5 bg-[#100820]/80 border border-purple-500/30 p-8 rounded-3xl w-full max-w-sm shadow-lg shadow-purple-500/10">
 <div className="relative w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
 <div className="absolute inset-0 bg-purple-500/10 rounded-full animate-pulse" />
 <Crown size={32} className="text-purple-400" />
 </div>
 <div className="text-center">
 <h3 className="text-white font-black text-lg tracking-wider uppercase mb-1.5">{t('pro.activeTitle', 'Lux Pro Activo')}</h3>
 <p className="text-white/60 text-xs leading-relaxed font-medium">{t('pro.activeDesc', 'Tu membresía Premium está activa a través de Google Play Store. ¡Todos los límites y restricciones han sido eliminados!')}</p>
 </div>
 <MembershipStatus className="w-full" />
 <button
 onClick={async () => { const { showCustomerCenter } = await import('../../services/revenueCatService'); await showCustomerCenter(); }}
 className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-full active:scale-95"
 >
 {t('pro.manageSubscription', 'Administrar Suscripción')}
 </button>
 </div>
 </div>
 ) : (
 <DeluxeFunnel
 lang={lang}
 isNative={isNative}
 weekly={weeklyPackage}
 monthly={monthlyPackage}
 annual={annualPackage}
 onBuy={handlePurchase}
 onRestore={handleRestore}
 onClose={onClose}
 />
 )}
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
 className="fixed inset-0 z-[100001] flex flex-col items-center justify-center bg-[#050010] overflow-hidden"
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

 </AnimatePresence>,
 document.body
 );
};
