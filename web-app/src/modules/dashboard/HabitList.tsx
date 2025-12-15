import React from 'react';
import { Flame, Calendar, CheckCircle2 } from 'lucide-react';
import { Habit, Attribute } from '../../types';
import { HabitItem } from './components/HabitItem';
import { GlassPanel } from '../../components/ui/GlassPanel';

interface HabitListProps {
  habits: Habit[];
  attributes: Attribute[];
  onCompleteHabit: (e: React.MouseEvent, h: Habit) => void;
}

export const HabitList: React.FC<HabitListProps> = ({ habits, attributes, onCompleteHabit }) => {
  // Stats calculation
  const streak = habits.reduce((acc, h) => acc + h.streak, 0);
  const completionRate = habits.length > 0 
    ? Math.round((habits.filter(h => h.completedToday).length / habits.length) * 100) 
    : 0;
  const perfectDays = 42; // Placeholder or calculate from history if available

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Flame, color: 'text-orange-500', val: streak.toString(), label: 'Streak' }, 
          { icon: Calendar, color: 'text-cyan-500', val: `${completionRate}%`, label: 'Consistency' }, 
          { icon: CheckCircle2, color: 'text-green-500', val: perfectDays.toString(), label: 'Perfect' }
        ].map((stat, i) => (
          <GlassPanel key={i} className="p-3 flex flex-col items-center justify-center bg-white/5 backdrop-blur-md border-white/5">
            <stat.icon className={`${stat.color} mb-1`} size={20} />
            <span className="text-xl font-black text-white tracking-tight">{stat.val}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{stat.label}</span>
          </GlassPanel>
        ))}
      </div>

      <h2 className="text-xl font-bold text-white tracking-tight px-1 mb-4">Daily Protocols</h2>
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
                No active protocols.
             </div>
        )}
      </div>
    </div>
  );
};
