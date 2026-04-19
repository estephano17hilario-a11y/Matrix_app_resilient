import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Archive } from 'lucide-react';
import { Project, Attribute } from '../../types';
import { FocusStats } from './components/FocusStats';
import { ProjectCardMinimal } from './components/ProjectCardMinimal';
import { HabitDetailView } from '../dashboard/components/HabitDetailView';
import { AnimatePresence } from 'framer-motion';
import { ReorderModal } from '../../components/ui/ReorderModal';
import { useLongPress } from '../../hooks/useLongPress';
import { useTranslation } from 'react-i18next';

export const FocusView = React.memo(({ 
    projects, 
    attributes, 
    onOpenProjectModal,
    onDeleteProject,
    onUpdateProject,
    onStartFocus,
    onDetailViewChange,
    openArchived,
    onReorder,
    isPro,
    onOpenPro,
    weekStartDay = 1,
    defaultChartViews,
    defaultProjectView
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
    openArchived?: boolean,
    onExitSession?: any,
    onSelectProject?: any,
    onReorder?: (projects: Project[]) => void;
    isPro?: boolean;
    onOpenPro?: () => void;
    weekStartDay?: 0 | 1;
    defaultChartViews?: any;
    defaultProjectView?: 'PROJECT' | 'TRAIT' | 'NONE';
}) => {
    const { t } = useTranslation();
    // Navigation State
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    // Sync with prop if provided
    useEffect(() => {
        if (openArchived) {
            setShowArchived(true);
        }
    }, [openArchived]);

    // Notify parent when detail view state changes
    useEffect(() => {
        if (onDetailViewChange) {
            onDetailViewChange(!!selectedProjectId);
        }
    }, [selectedProjectId, onDetailViewChange]);

    // Sort projects: Active first, then by order, then by creation date or title
    const visibleProjects = useMemo(() => {
        return projects
            .filter(p => !p.deleted && (showArchived ? p.archived : !p.archived))
            .sort((a, b) => {
                 const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                 const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                 if (orderA !== orderB) return orderA - orderB;
                 
                 return (b.lastSessionDate ? new Date(b.lastSessionDate).getTime() : 0) - (a.lastSessionDate ? new Date(a.lastSessionDate).getTime() : 0);
            });
    }, [projects, showArchived]);

    // Long Press Handler
    const longPressHandlers = useLongPress(() => {
        if (!showArchived && onReorder) {
            // Trigger vibration if available
            if (navigator.vibrate) navigator.vibrate(50);
            setIsReorderModalOpen(true);
        }
    }, { threshold: 600 });

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
                    isPro={isPro}
                    onOpenPro={onOpenPro}
                    weekStartDay={weekStartDay}
                />
            </AnimatePresence>
        );
    }

    return (
        <div className="relative w-full font-sans flex flex-col p-4 pt-0">
            {/* Stats - Always Visible (General Graph + Stops + Specific Graphics) */}
            <div className="relative z-10 mb-2 -mt-1">
                <FocusStats 
                    projects={projects} 
                    attributes={attributes} 
                    showArchived={showArchived}
                    onToggleArchived={() => setShowArchived(!showArchived)}
                    isPro={isPro}
                    onOpenPro={onOpenPro}
                    defaultChartViews={defaultChartViews}
                    defaultProjectView={defaultProjectView === 'NONE' ? 'TOTAL' : defaultProjectView as any}
                />
            </div>

            {/* Project Grid */}
            <div data-tour="project-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-20">
                {showArchived && (
                    <div className="col-span-full mb-2 bg-amber-900/20 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                            <Archive size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-200 tracking-wide">{t('dashboard.archived.title')}</h3>
                            <p className="text-xs text-amber-200/60 font-medium mt-0.5">{t('dashboard.archived.message')}</p>
                        </div>
                    </div>
                )}

                {visibleProjects.map(project => {
                    const attribute = attributes.find(a => a.id === project.attribute);
                    return (
                        <div 
                            key={project.id} 
                            className="relative z-10 touch-manipulation"
                            {...longPressHandlers}
                            onContextMenu={(e) => {
                                if (!showArchived && onReorder) {
                                    e.preventDefault();
                                    setIsReorderModalOpen(true);
                                }
                            }}
                        > 
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
                {!showArchived && (
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
                )}
            </div>

            {onReorder && isReorderModalOpen && (
                <ReorderModal
                    isOpen={isReorderModalOpen}
                    onClose={() => setIsReorderModalOpen(false)}
                    items={visibleProjects}
                    onSave={(newItems) => onReorder(newItems)}
                    title={t('focus.reorderProjects', 'Reorder Projects')}
                    getItemColor={(p) => attributes.find(a => a.id === p.attribute)?.color || '#fff'}
                />
            )}
        </div>
    );
});
