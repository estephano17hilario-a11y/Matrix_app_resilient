import React, { useMemo, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Project, Attribute } from '../../types';
import { FocusStats } from './components/FocusStats';
import { ProjectCardMinimal } from './components/ProjectCardMinimal';
import { HabitDetailView } from '../dashboard/components/HabitDetailView';
import { AnimatePresence } from 'framer-motion';

export const FocusView = React.memo(({ 
    projects, 
    attributes, 
    onOpenProjectModal,
    onDeleteProject,
    onUpdateProject,
    onStartFocus,
    onDetailViewChange
}: {  
    projects: Project[], 
    attributes: Attribute[], 
    onOpenProjectModal: (project?: Project) => void, 
    onStartFocus?: (projectId: string) => void,
    onDetailViewChange?: (isOpen: boolean) => void,
    // Unused props kept for interface compatibility if needed, but not used in logic
    onCompleteSession?: any, 
    onAddManualSession?: any,
    onDeleteSession?: any,
    onUpdateProject?: any,
    onDeleteProject?: (projectId: string) => void,
    initialProjectId?: any,
    autoStartProjectId?: any,
    onAutoStartConsumed?: any,
    onToggleFullScreen?: any,
    isActive?: any,
    openArchived?: any,
    onExitSession?: any,
    onSelectProject?: any,
}) => {
    // Navigation State
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Notify parent when detail view state changes
    useEffect(() => {
        if (onDetailViewChange) {
            onDetailViewChange(!!selectedProjectId);
        }
    }, [selectedProjectId, onDetailViewChange]);

    // Sort projects: Active first, then by creation date or title
    const visibleProjects = useMemo(() => {
        return projects
            .filter(p => !p.deleted && !p.archived)
            .sort((a, b) => (b.lastSessionDate ? new Date(b.lastSessionDate).getTime() : 0) - (a.lastSessionDate ? new Date(a.lastSessionDate).getTime() : 0));
    }, [projects]);

    // Handle Detail View
    const selectedProject = useMemo(() => 
        selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null,
    [selectedProjectId, projects]);

    if (selectedProject) {
        const attribute = attributes.find(a => a.id === selectedProject.attribute);
        return (
            <AnimatePresence>
                <HabitDetailView 
                    project={selectedProject} 
                    attributeColor={attribute?.color} 
                    onClose={() => setSelectedProjectId(null)}
                    onEdit={(item) => {
                        setSelectedProjectId(null); // Close detail view
                        onOpenProjectModal(item as Project);
                    }}
                    onDelete={(id) => {
                        console.log("FocusView: Deleting project", id);
                        
                        // Don't close manually, let the prop update close it naturally to ensure sync
                        // setSelectedProjectId(null); 

                        if (onDeleteProject) {
                            onDeleteProject(id);
                            // Fallback: Close after a short delay if prop update fails
                            setTimeout(() => setSelectedProjectId(null), 100);
                        } else {
                            console.error("onDeleteProject function is missing in FocusView props");
                            alert("Error: Delete function not connected. Please refresh.");
                        }
                    }}
                    onArchive={(item) => {
                        if (onUpdateProject) {
                            onUpdateProject({ ...item, archived: !item.archived });
                        }
                    }}
                    onStartFocus={() => onStartFocus?.(selectedProject.id)}
                />
            </AnimatePresence>
        );
    }

    return (
        <div className="relative w-full h-full font-sans flex flex-col p-4 overflow-y-auto">
            {/* Stats - Always Visible (General Graph + Stops + Specific Graphics) */}
            <div className="relative z-10 mb-2">
                <FocusStats projects={projects} attributes={attributes} />
            </div>

            {/* Project Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-20">
                {visibleProjects.map(project => {
                    const attribute = attributes.find(a => a.id === project.attribute);
                    return (
                        <div key={project.id} className="relative z-10"> {/* Wrapper for clean layout */}
                            <ProjectCardMinimal 
                                project={project} 
                                attribute={attribute} 
                                onClick={() => setSelectedProjectId(project.id)}
                                onStartFocus={() => onStartFocus?.(project.id)}
                            />
                        </div>
                    );
                })}
                
                {/* New Project Silhouette Card */}
                <div 
                    onClick={() => onOpenProjectModal()}
                    className="relative z-10 h-full min-h-[140px] rounded-[32px] border-[3px] border-dashed border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer group flex flex-col items-center justify-center gap-3 active:scale-95"
                >
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <Plus size={24} className="text-white/20 group-hover:text-white/40 transition-colors" />
                    </div>
                    <span className="text-xs font-bold text-white/20 group-hover:text-white/40 uppercase tracking-widest transition-colors">
                        Create New Project
                    </span>
                </div>
            </div>
        </div>
    );
});
