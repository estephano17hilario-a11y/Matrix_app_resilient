import React from 'react';
import { Flame, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Quest, Attribute, Project } from '../../types';
import { QuestItem } from './components/QuestItem';

interface TaskListProps {
  quests: Quest[];
  attributes: Attribute[];
  projects?: Project[];
  onCompleteQuest: (e: React.MouseEvent, q: Quest) => void;
  onDeleteQuest?: (id: string) => void;
  onEditQuest?: (quest: Quest) => void;
  onAddQuest?: () => void;
  onFocusProject?: (projectId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ quests, attributes, projects, onCompleteQuest, onDeleteQuest, onEditQuest, onAddQuest, onFocusProject }) => {
  const { t } = useTranslation();
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
            {t('dashboard.activeMissions')}
          </h2>
          <div className="bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Flame size={10} className="text-orange-400 fill-orange-400" />
            <span className="text-[10px] font-black text-orange-400">
              {activeQuests.length} {t('dashboard.targets')}
            </span>
          </div>
          {onAddQuest && (
            <button 
              onClick={onAddQuest}
              className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        
        <div className="flex flex-col pb-32 gap-3">
          {sortedQuests.map((quest) => (
            <QuestItem 
              key={quest.id} 
              quest={quest} 
              attribute={attributes.find(a => a.id === quest.attribute)} 
              project={projects?.find(p => p.id === quest.projectId)}
              onComplete={onCompleteQuest} 
              onDelete={onDeleteQuest}
              onEdit={onEditQuest}
              onFocusProject={onFocusProject}
            />
          ))}
          {sortedQuests.length === 0 && (
             <div className="py-10 text-center text-white/20 italic">
                {t('tasks.empty')}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
