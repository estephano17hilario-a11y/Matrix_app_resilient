import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Tv, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface AdShardProps {
  onWatch: () => Promise<void>;
}

export const AdShard: React.FC<AdShardProps> = ({ onWatch }) => {
  const [loading, setLoading] = useState(false);

  const handleWatch = async () => {
    if (loading) return;
    setLoading(true);
    await onWatch();
    setLoading(false);
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        "relative flex flex-row items-center p-6 rounded-[32px] overflow-hidden cursor-pointer group",
        // Distinctive style for Ad: More vibrant but classy
        "bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent backdrop-blur-2xl",
        "border border-indigo-500/20 hover:border-indigo-400/40 transition-colors duration-300",
        "shadow-lg shadow-indigo-900/10 hover:shadow-indigo-500/20"
      )}
      onClick={handleWatch}
    >
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Icon Circle */}
      <div className="relative mr-5 z-10">
        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 group-hover:text-white transition-colors">
           {loading ? <Loader2 className="animate-spin" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
        </div>
      </div>

      {/* Text Info */}
      <div className="flex-1 z-10">
        <h3 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
          Watch Transmission <Sparkles size={14} className="text-yellow-400" />
        </h3>
        <p className="text-indigo-200/60 text-sm font-medium">
          Receive a supply drop from the network.
        </p>
      </div>

      {/* Reward Pill */}
      <div className="relative z-10 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-sm font-bold shadow-inner shadow-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
        +50 GOLD
      </div>
      
      {/* Interactive Shine */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-20" />
    </motion.div>
  );
};
