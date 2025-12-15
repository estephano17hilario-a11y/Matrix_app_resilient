import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Tv } from 'lucide-react';
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        "relative flex flex-row items-center p-5 rounded-2xl overflow-hidden cursor-pointer group",
        // Distinctive style for Ad: More vibrant
        "bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-3xl",
        "border border-indigo-500/30",
        "shadow-[0_20px_50px_-12px_rgba(124,58,237,0.2)]"
      )}
      onClick={handleWatch}
    >
      {/* Icon Circle */}
      <div className="relative mr-5">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-40 animate-pulse-slow" />
        <div className="relative w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-indigo-300">
           {loading ? <Loader2 className="animate-spin" size={24} /> : <Play fill="currentColor" size={20} />}
        </div>
      </div>

      {/* Text Info */}
      <div className="flex-1">
        <h3 className="text-white font-semibold text-lg tracking-tight">
          Watch Transmission
        </h3>
        <p className="text-indigo-200/60 text-sm">
          Receive supply drop.
        </p>
      </div>

      {/* Reward Pill */}
      <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-sm font-bold">
        +50 G
      </div>
      
      {/* Interactive Shine */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
    </motion.div>
  );
};
