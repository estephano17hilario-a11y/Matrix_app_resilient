import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatrix } from '../../context/MatrixContext';
import { Habit, Note, Project } from '../../types';
import { SmartProject } from '../../types/SmartGoal';
import { persistenceService } from '../../services/persistenceService';
import { MissionCard } from './components/MissionCard';
import { MissionHUD } from './components/MissionHUD';
import { Loader2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const NexusView: React.FC = () => {
  const { user } = useMatrix();
  const [smartProjects, setSmartProjects] = useState<SmartProject[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<SmartProject | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
    if (!user?.uid) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [fetchedProjects, fetchedHabits, fetchedNotes, fetchedFocusProjects] = await Promise.all([
          persistenceService.smartProjects.getAll(user.uid),
          persistenceService.habits.getAll(user.uid),
          persistenceService.notes.getAll(user.uid),
          persistenceService.projects.getAll(user.uid)
        ]);

        // Cast fetched projects to SmartProject[]
        setSmartProjects(fetchedProjects as SmartProject[]);
        setHabits(fetchedHabits);
        setNotes(fetchedNotes);
        setProjects(fetchedFocusProjects);
      } catch (error) {
        console.error("Failed to initialize Nexus:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.uid]);

  // Actions
  const handleToggleHabit = async (habitId: string) => {
    if (!user?.uid) return;
    
    // Optimistic Update
    setHabits(prev => prev.map(h => 
      h.id === habitId ? { ...h, completedToday: !h.completedToday } : h
    ));

    // Persist
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        await persistenceService.habits.save(user.uid, {
            ...habit,
            completedToday: !habit.completedToday
        });
    }
  };

  const handleUpdateProject = async (updatedProject: SmartProject) => {
    if (!user?.uid) return;

    // Optimistic Update
    setSmartProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (selectedProject?.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }

    // Persist
    await persistenceService.smartProjects.save(user.uid, updatedProject);
  };

  const handleAddNote = async (content: string) => {
    if (!user?.uid || !selectedProject) return;
    
    const tempId = Date.now().toString();
    const newNote: Note = {
        id: tempId,
        title: `Mission Log: ${selectedProject.mainGoal}`,
        blocks: [{ id: '1', type: 'text', content }],
        updatedAt: new Date().toISOString(),
        projectId: selectedProject.id
    };

    // Optimistic Update
    setNotes(prev => [newNote, ...prev]);
    
    // Add to Notes collection
    try {
        const docRef = await addDoc(collection(db, `users/${user.uid}/notes`), {
            title: newNote.title,
            blocks: newNote.blocks,
            projectId: newNote.projectId,
            createdAt: new Date().toISOString(),
            updatedAt: newNote.updatedAt
        });

        // Update with real ID
        setNotes(prev => prev.map(n => n.id === tempId ? { ...n, id: docRef.id } : n));
    } catch (e) {
        console.error("Failed to log note", e);
        // Revert
        setNotes(prev => prev.filter(n => n.id !== tempId));
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tighter">
          DEPLOYMENT NEXUS
        </h1>
        <p className="text-white/40 font-mono text-sm mt-2">
          SELECT ACTIVE MISSION PARAMETERS
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {smartProjects.map(project => (
          <MissionCard
            key={project.id}
            project={project}
            onClick={() => setSelectedProject(project)}
            isActive={false}
          />
        ))}
        
        {/* Add New Mission Placeholder */}
        <motion.div 
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
            onClose={() => setSelectedProject(null)} 
            habits={habits.filter(h => h.projectId === selectedProject.id)}
            notes={notes.filter(n => n.projectId === selectedProject.id)}
            projects={projects.filter(p => p.smartProjectId === selectedProject.id)}
            onToggleHabit={handleToggleHabit}
            onUpdateProject={handleUpdateProject}
            onAddNote={handleAddNote}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
