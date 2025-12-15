import React from 'react';
import { motion } from 'framer-motion';
import { StoreItem } from '../../../services/economyService';
import { Zap, Brain, Palette, User, ShieldAlert, ShoppingBag, Lock } from 'lucide-react';
import clsx from 'clsx';

interface StoreCardProps {
  item: StoreItem;
  userGold: number;
  onPurchase: (item: StoreItem) => void;
  disabled?: boolean;
}

const IconMap: Record<string, React.ElementType> = {
  Zap, Brain, Palette, User, ShieldAlert, ShoppingBag
};

export const StoreCard: React.FC<StoreCardProps> = ({ item, userGold, onPurchase, disabled }) => {
  const Icon = IconMap[item.iconName || 'ShoppingBag'] || ShoppingBag;
  const canAfford = userGold >= item.price;
  const isAffordable = canAfford && !disabled;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: canAfford ? 1 : 0.5, 
        scale: 1 
      }}
      whileHover={isAffordable ? { 
        scale: 1.02,
        boxShadow: "0 20px 50px -12px rgba(79, 70, 229, 0.3)" 
      } : {}}
      whileTap={isAffordable ? { scale: 0.98 } : {}}
      className={clsx(
        "relative flex flex-col p-5 rounded-2xl overflow-hidden transition-all duration-300",
        // Glassmorphism Base
        "bg-gray-900/40 backdrop-blur-3xl backdrop-saturate-150",
        "border border-white/10",
        // Top Highlight (Specular)
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]",
        // Glow Shadow
        "shadow-[0_20px_50px_-12px_rgba(79,70,229,0.15)]",
        !canAfford && "grayscale-[0.5]"
      )}
    >
      {/* Background Gradient Blob for Hover Effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header: Icon & Price */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={clsx(
          "p-3 rounded-xl",
          "bg-white/5 border border-white/10",
          "text-indigo-400"
        )}>
          <Icon size={24} />
        </div>
        <div className="flex items-center space-x-1">
          <span className={clsx(
            "font-mono font-bold text-lg",
            canAfford ? "text-emerald-400" : "text-rose-400"
          )}>
            {item.price}
          </span>
          <span className="text-xs text-white/40 uppercase font-medium">Gold</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10">
        <h3 className="text-lg font-semibold text-white mb-1 tracking-tight">
          {item.name}
        </h3>
        <p className="text-sm text-white/60 leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={() => isAffordable && onPurchase(item)}
        disabled={!isAffordable}
        className={clsx(
          "mt-5 w-full py-3 rounded-xl font-medium text-sm transition-all relative overflow-hidden group",
          canAfford 
            ? "bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white hover:text-white border border-white/10 hover:border-white/30"
            : "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
        )}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {canAfford ? (
            <>
              PURCHASE
            </>
          ) : (
            <>
              <Lock size={14} /> INSUFFICIENT FUNDS
            </>
          )}
        </span>
        
        {/* Shimmer Effect on affordable button */}
        {canAfford && (
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
        )}
      </button>
    </motion.div>
  );
};
