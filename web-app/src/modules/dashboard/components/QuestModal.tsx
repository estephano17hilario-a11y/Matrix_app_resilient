import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Crosshair, Plus, Star, Circle, Square, Triangle, Target } from 'lucide-react';
import { Attribute, Quest, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { Difficulty, calculateTaskRewards } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { useTranslation } from 'react-i18next';
import { DurationPicker } from './DurationPicker';
import { toLocalISOString, parseLocalDate } from '../../../utils/dateUtils';
import { DateSelectionModal } from './DateSelectionModal';

export const QuestModal = React.memo(({ 
    isOpen, 
    onClose, 
    attributes, 
    projects = [],
    smartProjects = [],
    onConfirm,
    lockedAttributeId,
    lockedDate,
    lockedSmartProjectId,
    isSmartTask,
    initialValues
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    attributes: Attribute[], 
    projects?: Project[],
    smartProjects?: SmartProject[],
    onConfirm: (data: Partial<Quest>) => Promise<void> | void,
    lockedAttributeId?: string,
    lockedDate?: string,
    lockedSmartProjectId?: string,
    isSmartTask?: boolean,
    initialValues?: Partial<Quest> | null
}) => {
    const { t } = useTranslation();
    // Common State
    const [title, setTitle] = useState(''); // Main Goal
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('C');
    const [deadline, setDeadline] = useState(toLocalISOString(new Date()));
    // Subtasks removed as per tactical steps removal request
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);

    // Effect to apply locked props or initial values
    React.useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
            if (initialValues) {
                setTitle(initialValues.title || '');
                setDesc(initialValues.description || '');
                setAttrId(initialValues.attribute || '');
                setProjectId(initialValues.projectId || initialValues.smartProjectId || '');
                setDifficulty((initialValues.difficulty as Difficulty) || 'C');
                setDeadline(initialValues.deadline || toLocalISOString(new Date()));
                setEstimatedTime(initialValues.estimatedTime || 0);
            } else {
                // Reset defaults for new quest
                setTitle('');
                setDesc('');
                setAttrId('');
                setProjectId('');
                setDifficulty('C');
                setDeadline(toLocalISOString(new Date()));
                setEstimatedTime(0);
            }

            // Locks override initial values if present (though usually mutually exclusive)
            if (lockedAttributeId) setAttrId(lockedAttributeId);
            if (lockedDate) setDeadline(lockedDate);
        }
    }, [isOpen, lockedAttributeId, lockedDate, initialValues]);

    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#333333';
    const SelectedIcon = selectedAttr?.icon || Star;
    const activeLabel = selectedAttr ? t(selectedAttr.label, selectedAttr.label.replace('traits.', '')) : t('modals.project.traitDefault', 'Trait');
    
    const selectedProject = projects.find(p => p.id === projectId);
    const selectedSmartProject = smartProjects.find(p => p.id === (lockedSmartProjectId || initialValues?.smartProjectId));

    const prediction = useMemo(() => {
        const multipliers: Record<Difficulty, number> = { 'C': 1, 'B': 2, 'A': 3, 'S': 4 };
        return calculateTaskRewards(estimatedTime, multipliers[difficulty]);
    }, [estimatedTime, difficulty]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // If the selected projectId is actually a smart project, move it to smartProjectId
        const finalSmartProjectId = lockedSmartProjectId || 
                                   smartProjects.find(p => p.id === projectId)?.id || 
                                   initialValues?.smartProjectId;
        
        const finalProjectId = smartProjects.find(p => p.id === projectId) ? '' : projectId;

        try {
            await onConfirm({ 
                ...(initialValues?.id ? { id: initialValues.id } : {}),
                title, 
                description: desc, 
                attribute: attrId, 
                projectId: finalProjectId,
                smartProjectId: finalSmartProjectId,
                difficulty, 
                deadline,
                estimatedTime,
                subtasks: [], // Empty as tactical steps are removed
                xpReward: prediction.xp,
                gold: prediction.coins,
                isSmartQuest: isSmartTask || !!finalSmartProjectId
            });
        } catch (error) {
            console.error("Failed to save quest", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const difficulties: { id: Difficulty, label: string, icon: React.ElementType, color: string }[] = [
        { id: 'C', label: t('modals.quest.difficulties.Basic'), icon: Circle, color: 'text-cyan-400' },
        { id: 'B', label: t('modals.quest.difficulties.Medium'), icon: Square, color: 'text-emerald-400' },
        { id: 'A', label: t('modals.quest.difficulties.Hard'), icon: Triangle, color: 'text-orange-400' },
        { id: 'S', label: t('modals.quest.difficulties.Epic'), icon: Star, color: 'text-purple-500' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px]">
                <div 
                    className="rounded-[2rem] p-4 overflow-visible relative transition-all duration-500" 
                    style={{
                        background: 'linear-gradient(165deg, rgba(20,20,25,0.95) 0%, rgba(5,5,5,0.98) 100%)',
                        border: `1px solid ${attrId ? activeColor : 'rgba(255, 255, 255, 0.08)'}`,
                        boxShadow: attrId 
                            ? `0 0 0 1px ${activeColor}40, 0 0 60px -10px ${activeColor}50, 0 0 20px ${activeColor}30, inset 0 0 20px ${activeColor}10`
                            : '0 20px 40px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : '#333' }}>
                                <Crosshair size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                    {initialValues ? t('modals.quest.titleEdit') : (isSmartTask ? t('modals.quest.titleSmart') : t('modals.quest.titleNew'))}
                                    {lockedSmartProjectId && (
                                        <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full uppercase tracking-widest border border-cyan-500/20">
                                            Mission: {selectedSmartProject?.mainGoal || 'Active'}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-[10px] text-white/40 font-medium">
                                    {lockedDate ? `Linked to ${lockedDate}` : (isSmartTask ? t('modals.quest.linkedStrategy') : '')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 relative">
                            {/* Project Link Button */}
                            <div className="relative">
                                <button 
                                    onClick={() => setProjectPickerOpen(!isProjectPickerOpen)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${projectId ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    title={projectId ? selectedProject?.title : t('modals.quest.linkProject')}
                                >
                                    <Target size={14} />
                                </button>
                                {isProjectPickerOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[998] bg-transparent" onClick={() => setProjectPickerOpen(false)} />
                                        <div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] flex flex-col gap-1 z-[999] shadow-2xl border border-white/10 animate-in zoom-in-95 w-[200px] max-h-[300px] overflow-y-auto">
                                            <button 
                                                onClick={() => { setProjectId(''); setProjectPickerOpen(false); }}
                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <X size={14} className="text-white/50" />
                                                </div>
                                                <span className="text-xs font-bold text-white/50">{t('modals.quest.noProject')}</span>
                                            </button>
                                            
                                            {/* Smart Projects Section */}
                                            {smartProjects && smartProjects.length > 0 && (
                                                <div className="px-3 py-1 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                                    Strategic
                                                </div>
                                            )}
                                            {smartProjects?.map(p => {
                                                const attr = attributes.find(a => a.id === p.traitId);
                                                return (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => { setProjectId(p.id); setProjectPickerOpen(false); }}
                                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.traitColor || attr?.color || '#333' }}>
                                                            <Target size={14} className="text-white" />
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-xs font-bold text-white truncate w-full">{p.mainGoal}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Strategy</span>
                                                        </div>
                                                    </button>
                                                )
                                            })}

                                            {/* Regular Projects Section */}
                                            {projects && projects.length > 0 && (
                                                <div className="px-3 py-1 text-[9px] font-bold text-white/30 uppercase tracking-widest mt-2">
                                                    Protocols
                                                </div>
                                            )}
                                            {projects.map(p => {
                                                const attr = attributes.find(a => a.id === p.attribute);
                                                return (
                                                    <button 
                                                        key={p.id} 
                                                        onClick={() => { setProjectId(p.id); setProjectPickerOpen(false); }}
                                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: attr?.color || '#333' }}>
                                                            <Target size={14} className="text-white" />
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-xs font-bold text-white truncate w-full">{p.title}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{attr?.label}</span>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:bg-white/20 transition-colors hover:bg-white/10">
                                <X size={16} className="text-white/70" />
                            </button>
                        </div>
                    </div>

                    {/* Reward Prediction - Top Location */}
                    <div className="mb-4">
                        <RewardPredictionPill 
                            prediction={prediction} 
                            attributeColor={activeColor} 
                            AttributeIcon={SelectedIcon}
                            attributeLabel={activeLabel}
                        />
                    </div>

                    <div className="space-y-3">
                        {/* Title & Attribute */}
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.2rem] border border-white/5 p-1 focus-within:border-white/20 transition-colors">
                                 <input 
                                    type="text" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    placeholder={t('modals.quest.namePlaceholder')} 
                                    className="w-full bg-transparent px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 outline-none" 
                                />
                             </div>
                             <div 
                                onClick={() => !lockedAttributeId && setAttrPickerOpen(true)} 
                                className={`w-14 rounded-[1.2rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative ${isAttrPickerOpen ? 'z-50' : ''} ${lockedAttributeId ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`} 
                             >
                                 {attrId ? (<SelectedIcon size={20} style={{ color: activeColor }} />) : <Plus size={20} className="text-white/30" />}
                                 {isAttrPickerOpen && !lockedAttributeId && (
                                     <>
                                         <div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} />
                                         <div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                             {attributes.map((attr) => {
                                                 const Icon = attr.icon;
                                                 return (
                                                     <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                         <Icon size={16} style={{ color: attr.color }} />
                                                        <span className="text-[9px] font-bold text-slate-400 mt-1">{t(attr.label, attr.label.replace('traits.', ''))}</span>
                                                     </button>
                                                 )
                                             })}
                                         </div>
                                     </>
                                 )}
                             </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white/5 rounded-[1.2rem] border border-white/5 p-3">
                            <input 
                                type="text" 
                                value={desc} 
                                onChange={(e) => setDesc(e.target.value)} 
                                placeholder={t('modals.quest.briefingPlaceholder')} 
                                className="w-full bg-transparent text-xs font-medium text-slate-300 placeholder:text-white/20 outline-none" 
                            />
                        </div>


                        {/* Estimated Time - Visual Picker */}
                        <div className="pt-1">
                            <DurationPicker 
                                value={estimatedTime} 
                                onChange={setEstimatedTime} 
                            />
                        </div>


                        {/* Difficulty Selector (Liquid UI) */}
                        <div className="bg-white/5 rounded-[1.2rem] border border-white/5 p-1 flex justify-between relative">
                            {difficulties.map((diff) => {
                                const isSelected = difficulty === diff.id;
                                const DiffIcon = diff.icon;
                                return (
                                    <button
                                        key={diff.id}
                                        onClick={() => setDifficulty(diff.id)}
                                        className="relative flex-1 h-8 flex items-center justify-center rounded-[1rem] transition-all duration-300 z-10"
                                    >
                                        {isSelected && (
                                            <div
                                                className="absolute inset-0 bg-white/10 shadow-lg rounded-[1rem] border border-white/5"
                                            />
                                        )}
                                        <div className={`flex items-center gap-1.5 ${isSelected ? 'scale-105' : 'opacity-50 scale-95'} transition-all duration-300`}>
                                            <DiffIcon size={10} className={diff.color} fill={isSelected ? "currentColor" : "none"} />
                                            <span className={`text-[9px] font-bold uppercase tracking-wide ${diff.color}`}>
                                                {diff.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Date Picker */}
                        <div 
                            onClick={() => !lockedDate && setIsDateModalOpen(true)}
                            className={`rounded-[1.2rem] bg-white/5 border border-white/5 flex items-center justify-between px-4 py-2.5 relative overflow-hidden transition-colors ${lockedDate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'}`}
                        >
                             <span className="text-[9px] font-black text-white/30 uppercase flex items-center gap-2">
                                {t('modals.quest.dueDate')}
                             </span>
                             <div className="flex items-baseline gap-1 pointer-events-none">
                                 <span className="text-sm font-bold text-white">{parseLocalDate(deadline).getDate()}</span>
                                 <span className="text-[10px] font-bold text-white/50 uppercase">{parseLocalDate(deadline).toLocaleDateString('en-US', { month: 'short' })}</span>
                             </div>
                        </div>

                        <button 
                            onClick={handleConfirm} 
                            disabled={!title || !attrId || isSubmitting} 
                            className={`w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${(!title || !attrId || isSubmitting) ? 'bg-white/5 text-white/20' : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-white/10 text-white shadow-lg active:scale-95 hover:shadow-xl hover:border-white/20'}`}
                        >
                            {isSubmitting ? (
                                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                            ) : (
                                t('modals.quest.confirm')
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={(date) => setDeadline(toLocalISOString(date))}
                mode="DAY"
                currentDate={parseLocalDate(deadline)}
            />
        </div>,
        document.body
    );
});
