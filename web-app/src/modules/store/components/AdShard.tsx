import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { useEconomy } from '../../../context/EconomyContext';

export const AdShard: React.FC = () => {
  const { grantAdReward } = useEconomy();
  const [loading, setLoading] = useState(false);
  const [adsWatched, setAdsWatched] = useState<number>(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimer, setAdTimer] = useState(0);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('adsWatchedProgress');
    if (saved) {
      setAdsWatched(parseInt(saved, 10) || 0);
    }
  }, []);

  const handleWatchClick = () => {
    if (loading) return;
    setShowAdModal(true);
    setAdTimer(5); // Simulate 5 seconds ad
  };

  // Handle fake ad timer
  useEffect(() => {
    let interval: any;
    if (showAdModal && adTimer > 0) {
      interval = setInterval(() => {
        setAdTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showAdModal, adTimer]);

  const handleCloseAd = async () => {
    if (adTimer > 0) return; // Cannot close yet
    setShowAdModal(false);
    
    const newCount = adsWatched + 1;
    
    if (newCount >= 2) {
      // Reward user!
      setLoading(true);
      await grantAdReward();
      setAdsWatched(0);
      localStorage.setItem('adsWatchedProgress', '0');
      setLoading(false);
    } else {
      // Save progress
      setAdsWatched(newCount);
      localStorage.setItem('adsWatchedProgress', newCount.toString());
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={clsx(
          "relative flex flex-row items-center p-6 rounded-[32px] overflow-hidden cursor-pointer group",
          "bg-[#1c1c1e] border border-indigo-500/20 hover:border-indigo-400/50 transition-all duration-300",
          "shadow-lg shadow-indigo-900/10"
        )}
        onClick={handleWatchClick}
      >
        {/* Fast background hover effect (NO BLUR, NO LAG) */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Icon Circle */}
        <div className="relative mr-5 z-10">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full scale-110 group-hover:scale-125 transition-transform duration-300" />
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/40 to-purple-500/40 border border-indigo-400/50 flex items-center justify-center text-indigo-100 group-hover:text-white transition-colors">
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
          </div>
        </div>

        {/* Text Info */}
        <div className="flex-1 z-10">
          <h3 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
            Ver Transmisión <Sparkles size={14} className="text-yellow-400" />
          </h3>
          <p className="text-indigo-200/80 text-sm font-medium">
            Google Ads ({adsWatched}/2)
          </p>
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-black/40 rounded-full mt-2 overflow-hidden">
             <div 
               className="h-full bg-indigo-500 transition-all duration-500 ease-out"
               style={{ width: `${(adsWatched / 2) * 100}%` }}
             />
          </div>
        </div>

        {/* Reward Pill */}
        <div className="relative z-10 ml-4 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-sm font-bold group-hover:bg-emerald-500/30 transition-colors">
          +50 ORO
        </div>
      </motion.div>

      {/* Ad Modal Overlay */}
      <AnimatePresence>
        {showAdModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4"
          >
            <div className="relative w-full max-w-md bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
               
               {/* Close Button - Only visible when timer is 0 */}
               {adTimer === 0 ? (
                 <button 
                   onClick={handleCloseAd}
                   className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
               ) : (
                 <div className="absolute top-4 right-4 px-3 py-1 bg-white/10 rounded-full text-white/50 text-sm font-mono">
                   {adTimer}s
                 </div>
               )}

               {/* Mock Ad Content (Place real Google Ads here) */}
               <div className="w-full flex-1 flex flex-col items-center justify-center opacity-80">
                 <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4">
                   <Play size={32} className="text-indigo-400" />
                 </div>
                 <h2 className="text-xl font-bold text-white mb-2">Espacio Publicitario</h2>
                 <p className="text-white/50 text-sm max-w-[250px]">
                   Aquí puedes integrar tu etiqueta de Google Ads (AdSense o AdMob).
                 </p>
                 {/* 
                   // TODO: INTEGRATE GOOGLE ADS HERE
                   // Example for AdSense:
                   // <ins className="adsbygoogle"
                   //      style={{ display: "block" }}
                   //      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                   //      data-ad-slot="XXXXXXXXXX"
                   //      data-ad-format="auto"
                   //      data-full-width-responsive="true"></ins>
                 */}
               </div>

               {adTimer === 0 && (
                 <motion.button
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   onClick={handleCloseAd}
                   className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                 >
                   <CheckCircle2 size={18} />
                   Continuar
                 </motion.button>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
