import React from 'react';
import { Flame } from 'lucide-react';
import { Habit, Attribute } from '../../types';
import { HabitItem } from './components/HabitItem';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { useTranslation } from 'react-i18next';

interface HabitListProps {
  habits: Habit[];
  attributes: Attribute[];
  onCompleteHabit: (e: React.MouseEvent, h: Habit) => void;
}

export const HabitList: React.FC<HabitListProps> = ({ habits, attributes, onCompleteHabit }) => {
  const { t } = useTranslation();

  // Stats calculation
  const totalHabits = habits.length;
  const completedHabits = habits.filter(h => h.completedToday).length;
  const streak = habits.reduce((acc, h) => acc + h.streak, 0);
  
  // 75% Rule Logic
  const minTarget = Math.ceil(totalHabits * 0.75);
  const isSafe = completedHabits >= minTarget;
  const deficit = isSafe ? 0 : minTarget - completedHabits;
  const potentialDamage = deficit * 3;

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <GlassPanel className="p-3 flex flex-col items-center justify-center bg-white/5 backdrop-blur-md border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
          <Flame className="text-orange-500 mb-1 relative z-10" size={20} />
          <span className="text-xl font-black text-white tracking-tight relative z-10">{streak}</span>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold relative z-10">{t('habits.streak')}</span>
        </GlassPanel>

        {/* DAILY PROTOCOL STATUS (New Requirement) */}
        <GlassPanel className={`col-span-2 p-3 flex flex-row items-center justify-between bg-white/5 backdrop-blur-md border-white/5 relative overflow-hidden group`}>
           <div className={`absolute inset-0 opacity-20 transition-colors duration-500 ${isSafe ? 'bg-emerald-500' : 'bg-rose-500'}`} />
           
           <div className="flex flex-col relative z-10">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">{t('habits.dailyProtocol')}</span>
              <div className="flex items-baseline space-x-1">
                <span className={`text-2xl font-black tracking-tight ${isSafe ? 'text-emerald-400' : 'text-white'}`}>
                  {completedHabits}/{totalHabits}
                </span>
                <span className="text-xs text-slate-500 font-medium">{t('habits.completed')}</span>
              </div>
           </div>

           <div className="flex flex-col items-end relative z-10 text-right">
              <div className="flex items-center space-x-1 mb-1">
                 <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">{t('habits.target')}</span>
                 <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isSafe ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {minTarget}/{totalHabits}
                 </div>
              </div>
              
              {!isSafe ? (
                 <span className="text-xs font-medium text-rose-400 animate-pulse">
                   -{potentialDamage} {t('habits.hpRisk')}
                 </span>
              ) : (
                 <span className="text-xs font-medium text-emerald-400">
                   {t('habits.protocolSafe')}
                 </span>
              )}
           </div>
        </GlassPanel>
      </div>

      <h2 className="text-xl font-bold text-white tracking-tight px-1 mb-4">{t('habits.dailyProtocols')}</h2>
      <div className="space-y-3 pb-32">
        {habits.map(habit => (
          <HabitItem 
            key={habit.id} 
            habit={habit} 
            attribute={attributes.find(a => a.id === habit.attribute)} 
            onComplete={onCompleteHabit}
          />
        ))}
        {habits.length === 0 && (
             <div className="py-10 text-center text-white/20 italic">
                {t('habits.empty')}
             </div>
        )}
      </div>

    </div>
  );
};
