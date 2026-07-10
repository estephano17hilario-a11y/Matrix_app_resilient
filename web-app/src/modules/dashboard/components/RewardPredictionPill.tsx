import React from 'react';
import { Sparkles, Coins } from 'lucide-react';
import { RewardPrediction } from '../../../utils/rewardCalculator';

interface RewardPredictionPillProps {
  prediction: RewardPrediction;
  attributeColor: string;
  AttributeIcon: React.ElementType;
  attributeLabel: string;
}

export const RewardPredictionPill = React.memo(({
  prediction,
  attributeColor,
  AttributeIcon,
  attributeLabel
}: RewardPredictionPillProps) => {
  return (
    <div
      className="bg-black/40 border border-white/10 rounded-full px-4 py-2 flex items-center justify-between gap-4 shadow-lg w-full mb-4"
    >
      {/* XP Section */}
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-white" />
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-bold text-white">{prediction.xp}</span>
          <span className="text-xs font-medium text-white/60">{t('common.xp', 'XP')}</span>
        </div>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Trait Section */}
      <div className="flex items-center gap-2">
        <AttributeIcon size={14} style={{ color: attributeColor }} />
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-bold" style={{ color: attributeColor }}>
            +{prediction.traitXp}
          </span>
          <span className="text-xs font-medium uppercase text-white/60">
             {typeof attributeLabel === 'string' ? attributeLabel.substring(0, 3) : ''}
          </span>
        </div>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Coins Section */}
      <div className="flex items-center gap-2">
        <Coins size={14} className="text-yellow-400" />
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-bold text-yellow-400">{prediction.coins}</span>
          <span className="text-xs font-medium text-white/60">{t('common.gold', 'Gold')}</span>
        </div>
      </div>
      
      {/* Early Bird Indicator */}
      {prediction.bonusApplied && (
         <div 
            className="ml-auto bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30"
         >
            +20%
         </div>
      )}
    </div>
  );
});
