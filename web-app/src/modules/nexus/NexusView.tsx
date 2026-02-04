import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatrix } from '@/context/MatrixContext';
import { Habit, Note, Project, Quest } from '../../types';
import { SmartProject } from '../../types/SmartGoal';
import { MissionCard } from './components/MissionCard';
import { MissionHUD } from './components/MissionHUD';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const NexusView: React.FC<{ 
  onToggleImmersive?: (immersive: boolean) => void;
  onOpenProjectModal?: (smartProjectId: string) => void;
  onOpenHabitModal?: (smartProjectId: string) => void;
  smartProjects: SmartProject[];
  habits: Habit[];
  notes: Note[];
  projects: Project[];
  quests: Quest[];
  onToggleHabit: (e: React.MouseEvent, habit: Habit) => void;
  onUpdateSmartProject: (updatedProject: SmartProject) => void;
  onCompleteQuest: (e: React.MouseEvent, quest: Quest) => void;
  onAddNote: (content: string, projectId: string) => void;
  loading?: boolean;
  targetSmartProjectId?: string | null;
  onOpenWizard?: () => void;
  onDeleteSmartProject?: (id: string) => void;
  onAddQuest?: (date: Date, smartProjectId?: string) => void;
  onClose?: () => void;
  onSelectProject?: (projectId: string | null) => void;
}> = ({ 
  onToggleImmersive, 
  onOpenProjectModal, 
  onOpenHabitModal,
  smartProjects,
  habits,
  notes,
  projects,
  quests,
  onToggleHabit,
  onUpdateSmartProject,
  onCompleteQuest,
  onAddNote,
  loading = false,
  targetSmartProjectId,
  onOpenWizard,
  onDeleteSmartProject,
  onAddQuest,
  onClose,
  onSelectProject
}) => {
  const { user } = useMatrix();
  const { t } = useTranslation();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(targetSmartProjectId || null);

  useEffect(() => {
    if (targetSmartProjectId) {
      setSelectedProjectId(targetSmartProjectId);
    }
  }, [targetSmartProjectId]);

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (onSelectProject) {
        onSelectProject(projectId);
    }
  };

  const selectedProject = smartProjects.find(p => p.id === selectedProjectId) || null;

  // Sync Immersive Mode
  useEffect(() => {
    if (onToggleImmersive) {
      onToggleImmersive(!!selectedProject);
    }
  }, [selectedProject, onToggleImmersive]);

  // Actions
  const handleUpdateProject = async (updatedProject: SmartProject) => {
    if (!user?.uid) return;
    // Call global handler directly
    onUpdateSmartProject(updatedProject);
  };

  const handleToggleHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        // Create a synthetic event with necessary properties for handleHabitClick
        const syntheticEvent = { 
            stopPropagation: () => {}, 
            currentTarget: document.createElement('div') 
        } as unknown as React.MouseEvent;
        onToggleHabit(syntheticEvent, habit);
    }
  };

  const handleCompleteQuest = (questId: string) => {
    const quest = quests.find((q: Quest) => q.id === questId);
    if (quest) {
        const syntheticEvent = { stopPropagation: () => {}, currentTarget: document.createElement('div') } as unknown as React.MouseEvent;
        onCompleteQuest(syntheticEvent, quest);
    }
  };

  const handleAddNote = (content: string) => {
    if (selectedProject) {
        onAddNote(content, selectedProject.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-6 overflow-y-auto pb-24">
      
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div className="flex flex-col gap-4">
          {onClose && (
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group w-fit"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-mono text-xs uppercase tracking-widest">{t('nexus.backToStrategy') || 'VOLVER A ESTRATEGIA'}</span>
            </button>
          )}
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tighter">
              DEPLOYMENT NEXUS
            </h1>
            <p className="text-white/40 font-mono text-sm mt-2">
              SELECT ACTIVE MISSION PARAMETERS
            </p>
          </div>
        </div>
        {onOpenWizard && (
            <button 
                onClick={onOpenWizard}
                className="px-6 py-3 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 font-bold tracking-wider rounded-xl transition-all uppercase text-xs flex items-center gap-2"
            >
                <span>+ NEW PROTOCOL</span>
            </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {smartProjects.map(project => (
          <MissionCard
            key={project.id}
            project={project}
            onClick={() => handleSelectProject(project.id)}
            isActive={false}
          />
        ))}
        
        {/* Add New Mission Placeholder */}
        <motion.div 
            onClick={onOpenWizard}
            className="rounded-3xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center h-[280px] hover:bg-white/10 transition-colors cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:text-cyan-400 transition-colors">
                <span className="text-2xl">+</span>
            </div>
            <span className="mt-4 text-sm font-mono text-white/40 group-hover:text-white/80">INITIATE NEW MISSION</span>
        </motion.div>
      </div>

      {/* HUD Overlay */}
      <AnimatePresence>
        {selectedProject && (
          <MissionHUD 
            project={selectedProject} 
            onClose={() => handleSelectProject(null)} 
            habits={habits.filter(h => h.projectId === selectedProject.id)}
            notes={notes.filter(n => n.projectId === selectedProject.id)}
            projects={projects.filter(p => p.smartProjectId === selectedProject.id)}
            quests={quests.filter(q => q.smartProjectId === selectedProject.id)}
            onToggleHabit={handleToggleHabit}
            onCompleteQuest={handleCompleteQuest}
            onUpdateProject={handleUpdateProject}
            onAddNote={handleAddNote}
            onAddProject={() => onOpenProjectModal?.(selectedProject.id)}
            onAddHabit={() => onOpenHabitModal?.(selectedProject.id)}
            onDeleteProject={() => {
                if (onDeleteSmartProject) {
                    onDeleteSmartProject(selectedProject.id);
                    setSelectedProjectId(null);
                }
            }}
            onAddQuest={() => onAddQuest?.(new Date(), selectedProject.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
