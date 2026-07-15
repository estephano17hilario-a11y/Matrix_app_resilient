import React from 'react';
import { DailyLimits } from '../../types/User';
import { Zap, Coins, Dna } from 'lucide-react';
import { TourLightbulb } from '../../components/TourLightbulb';
import { useTranslation } from 'react-i18next';

interface FocusLimitsProps {
  dailyLimits: DailyLimits;
}

export const FocusLimits: React.FC<FocusLimitsProps> = ({ dailyLimits }) => {
  const { t } = useTranslation();
  const currentXP = dailyLimits?.focusXp || 0;
  const currentTP = dailyLimits?.focusTraitPoints || 0;
  const currentCoins = dailyLimits?.focusGold || 0;

  return (
    <div className="w-full px-2 pt-1 pb-1 flex flex-col gap-2">
      {/* Earned Stats (No Limits, just info) */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex-1">
          <span className="text-[9px] font-bold text-fuchsia-400 uppercase mb-0.5 flex items-center gap-1"><Zap size={8} /> {t('common.xp', 'XP')}</span>
          <span className="text-[11px] font-mono text-white/90 font-bold tabular-nums">{Math.floor(currentXP)}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex-1">
          <span className="text-[9px] font-bold text-cyan-400 uppercase mb-0.5 flex items-center gap-1"><Dna size={8} /> {t('common.tp', 'TP')}</span>
          <span className="text-[11px] font-mono text-white/90 font-bold tabular-nums">{Math.floor(currentTP)}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex-1">
          <span className="text-[9px] font-bold text-amber-400 uppercase mb-0.5 flex items-center gap-1"><Coins size={8} /> {t('common.gold', 'Gold')}</span>
          <span className="text-[11px] font-mono text-white/90 font-bold tabular-nums">{Math.floor(currentCoins)}</span>
        </div>
        <TourLightbulb tourId="focus" className="shrink-0" />
      </div>
    </div>
  );
};
