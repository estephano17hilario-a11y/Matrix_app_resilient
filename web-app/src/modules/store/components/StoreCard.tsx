import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { StoreItem } from '../../../services/economyService';
import { 
  Zap, Brain, Palette, User, ShieldAlert, ShoppingBag, Lock, Clock, Code, Smartphone, 
  Square, Image, Share2, Bell, Gamepad, Newspaper, Coffee, Armchair, Moon, UserX, 
  Droplet, Layers, Frown, CloudRain, Target, MicOff, Watch, MessageSquare, CreditCard, Trash 
} from 'lucide-react';
import clsx from 'clsx';

interface StoreCardProps {
  item: StoreItem;
  userGold: number;
  onPurchase: (item: StoreItem) => void;
  disabled?: boolean;
}

const IconMap: Record<string, React.ElementType> = {
  Zap, Brain, Palette, User, ShieldAlert, ShoppingBag, Clock, Code, Smartphone,
  Square, Image, Share2, Bell, Gamepad, Newspaper, Coffee, Armchair, Moon, UserX,
  Droplet, Layers, Frown, CloudRain, Target, MicOff, Watch, MessageSquare, CreditCard, Trash
};

export const StoreCard = React.forwardRef<HTMLDivElement, StoreCardProps>(({ item, userGold, onPurchase, disabled }, ref) => {
  const { t } = useTranslation();
  const Icon = IconMap[item.iconName || 'ShoppingBag'] || ShoppingBag;
  const canAfford = userGold >= item.price;
  const isAffordable = canAfford && !disabled;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ 
        opacity: canAfford ? 1 : 0.6, 
        scale: 1 
      }}
      whileHover={isAffordable ? { scale: 1.01 } : {}}
      whileTap={isAffordable ? { scale: 0.99 } : {}}
      className={clsx(
        "relative flex flex-col p-4 rounded-[20px] overflow-hidden transition-all duration-200",
        // Apple Glassmorphism (Cleaner)
        "bg-[#1c1c1e]/80 backdrop-blur-xl", // Apple dark system gray
        "border border-white/5",
        canAfford ? "shadow-sm" : "grayscale-[0.3] opacity-80"
      )}
    >
      {/* Header: Icon & Price */}
      <div className="flex justify-between items-start mb-3">
        <div className={clsx(
          "p-2.5 rounded-xl flex items-center justify-center",
          "bg-white/10 text-white"
        )}>
          <Icon size={20} strokeWidth={2} />
        </div>
        
        {/* Price Tag - Minimal */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20">
          <span className={clsx(
            "font-semibold text-[15px] tracking-tight",
            canAfford ? "text-white" : "text-red-400"
          )}>
            {item.price}
          </span>
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{t('store.currency')}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mb-4">
        <h3 className="text-[17px] font-semibold text-white mb-1 leading-snug tracking-tight">
          {t(item.name)}
        </h3>
        <p className="text-[13px] text-white/50 leading-relaxed font-medium">
          {t(item.description)}
        </p>
      </div>

      {/* Action Button - Apple Style */}
      <button
        onClick={() => isAffordable && onPurchase(item)}
        disabled={!isAffordable}
        className={clsx(
          "w-full py-2.5 rounded-xl font-semibold text-[13px] tracking-wide transition-all active:scale-[0.98]",
          canAfford 
            ? "bg-white text-black hover:bg-white/90"
            : "bg-white/10 text-white/20 cursor-not-allowed"
        )}
      >
        {canAfford ? (
          t('store.buy')
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <Lock size={12} /> <span>{t('store.locked')}</span>
          </div>
        )}
      </button>
    </motion.div>
  );
});

StoreCard.displayName = 'StoreCard';
