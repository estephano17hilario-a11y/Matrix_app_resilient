import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Coins } from 'lucide-react';
import { RewardPrediction } from '../../../utils/rewardCalculator';
import { cn } from '../../../utils/cn';

interface RewardPredictionPillProps {
  prediction: RewardPrediction;
  attributeColor: string;
  AttributeIcon: React.ElementType;
  attributeLabel: string;
}

const NumberTicker = ({ value, className }: { value: number; className?: string }) => {
  return (
    <div className="relative inline-block overflow-hidden h-[1.2em] min-w-[2ch] align-bottom">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn("block", className)}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export const RewardPredictionPill: React.FC<RewardPredictionPillProps> = ({
  prediction,
  attributeColor,
  AttributeIcon,
  attributeLabel
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center justify-between gap-4 shadow-lg w-full mb-4"
    >
      {/* XP Section */}
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-white" />
        <div className="flex items-center gap-1">
          <NumberTicker value={prediction.xp} className="font-mono text-sm font-bold text-white" />
          <span className="text-xs font-medium text-white/60">XP</span>
        </div>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Trait Section */}
      <div className="flex items-center gap-2">
        <AttributeIcon size={14} style={{ color: attributeColor }} />
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-bold" style={{ color: attributeColor }}>
            +<NumberTicker value={prediction.traitXp} />
          </span>
          <span className="text-xs font-medium uppercase text-white/60">
             {attributeLabel.substring(0, 3)}
          </span>
        </div>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Coins Section */}
      <div className="flex items-center gap-2">
        <Coins size={14} className="text-yellow-400" />
        <div className="flex items-center gap-1">
          <NumberTicker value={prediction.coins} className="font-mono text-sm font-bold text-yellow-400" />
          <span className="text-xs font-medium text-white/60">Gold</span>
        </div>
      </div>
      
      {/* Early Bird Indicator */}
      {prediction.bonusApplied && (
         <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30"
         >
            +20%
         </motion.div>
      )}
    </motion.div>
  );
};
