import React from 'react';
import { Flame } from 'lucide-react';
import { Quest, Attribute } from '../../types';
import { QuestItem } from './components/QuestItem';

interface TaskListProps {
  quests: Quest[];
  attributes: Attribute[];
  onCompleteQuest: (e: React.MouseEvent, q: Quest) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ quests, attributes, onCompleteQuest }) => {
  const activeQuests = quests.filter(q => !q.completed);
  const completedQuests = quests.filter(q => q.completed);

  // Sort: Active first, then by difficulty (S > A > B...) or deadline
  const sortedQuests = [...activeQuests, ...completedQuests];

  return (
    <div className="flex flex-col gap-6">
      {/* ACTIVE MISSIONS HEADER */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2">
            Active Missions
          </h2>
          <div className="bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Flame size={10} className="text-orange-400 fill-orange-400" />
            <span className="text-[10px] font-black text-orange-400">
              {activeQuests.length} TARGETS
            </span>
          </div>
        </div>
        
        <div className="flex flex-col pb-32 gap-3">
          {sortedQuests.map((quest) => (
            <QuestItem 
              key={quest.id} 
              quest={quest} 
              attribute={attributes.find(a => a.id === quest.attribute)} 
              onComplete={onCompleteQuest} 
            />
          ))}
          {sortedQuests.length === 0 && (
             <div className="py-10 text-center text-white/20 italic">
                No active missions.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
