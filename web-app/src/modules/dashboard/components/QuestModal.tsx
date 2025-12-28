import React, { useState, useMemo } from 'react';
import { X, Crosshair, Plus, Star, Circle, Square, Triangle, Lock, Target, Clock, ChevronDown } from 'lucide-react';
import { Attribute, Quest, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { Difficulty, calculateTaskRewards } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { useTranslation } from 'react-i18next';
import { toLocalISOString } from '../../../utils/dateUtils';

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
    onConfirm: (data: Partial<Quest>) => void,
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
    const [isTimePickerOpen, setTimePickerOpen] = useState(false);

    // Effect to apply locked props or initial values
    React.useEffect(() => {
        if (isOpen) {
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
    const activeLabel = selectedAttr?.label || 'Trait';
    
    const selectedProject = projects.find(p => p.id === projectId);
    const selectedSmartProject = smartProjects.find(p => p.id === (lockedSmartProjectId || initialValues?.smartProjectId));

    const prediction = useMemo(() => {
        return calculateTaskRewards(difficulty, deadline, estimatedTime);
    }, [difficulty, deadline, estimatedTime]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        // If the selected projectId is actually a smart project, move it to smartProjectId
        const finalSmartProjectId = lockedSmartProjectId || 
                                   smartProjects.find(p => p.id === projectId)?.id || 
                                   initialValues?.smartProjectId;
        
        const finalProjectId = smartProjects.find(p => p.id === projectId) ? '' : projectId;

        onConfirm({ 
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
    };

    const difficulties: { id: Difficulty, label: string, icon: React.ElementType, color: string }[] = [
        { id: 'C', label: t('modals.quest.difficulties.Basic'), icon: Circle, color: 'text-cyan-400' },
        { id: 'B', label: t('modals.quest.difficulties.Medium'), icon: Square, color: 'text-emerald-400' },
        { id: 'A', label: t('modals.quest.difficulties.Hard'), icon: Triangle, color: 'text-orange-400' },
        { id: 'S', label: t('modals.quest.difficulties.Epic'), icon: Star, color: 'text-purple-500' },
    ];

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px]">
                <div 
                    className="rounded-[2.5rem] p-5 overflow-visible relative transition-all duration-500" 
                    style={{
                        background: 'linear-gradient(165deg, rgba(20,20,25,0.95) 0%, rgba(5,5,5,0.98) 100%)',
                        border: `1px solid ${attrId ? activeColor : 'rgba(255, 255, 255, 0.08)'}`,
                        boxShadow: attrId 
                            ? `0 0 0 1px ${activeColor}40, 0 0 60px -10px ${activeColor}50, 0 0 20px ${activeColor}30, inset 0 0 20px ${activeColor}10`
                            : '0 20px 40px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : '#333' }}>
                                <Crosshair size={18} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    {initialValues ? t('modals.quest.titleEdit') : (isSmartTask ? t('modals.quest.titleSmart') : t('modals.quest.titleNew'))}
                                    {lockedSmartProjectId && (
                                        <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full uppercase tracking-widest border border-cyan-500/20">
                                            Mission: {selectedSmartProject?.mainGoal || 'Active'}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-white/40 font-medium">
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
                                    <Target size={16} />
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
                    <div className="mb-6">
                        <RewardPredictionPill 
                            prediction={prediction} 
                            attributeColor={activeColor} 
                            AttributeIcon={SelectedIcon}
                            attributeLabel={activeLabel}
                        />
                    </div>

                    <div className="space-y-4">
                        {/* Title & Attribute */}
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-colors">
                                 <input 
                                    type="text" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    placeholder={t('modals.quest.namePlaceholder')} 
                                    className="w-full bg-transparent px-5 py-4 text-[17px] font-bold text-white placeholder:text-white/20 outline-none" 
                                />
                             </div>
                             <div 
                                onClick={() => !lockedAttributeId && setAttrPickerOpen(true)} 
                                className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative ${isAttrPickerOpen ? 'z-50' : ''} ${lockedAttributeId ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`} 
                             >
                                 {attrId ? (<SelectedIcon size={22} style={{ color: activeColor }} />) : <Plus size={22} className="text-white/30" />}
                                 {isAttrPickerOpen && !lockedAttributeId && (
                                     <>
                                         <div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} />
                                         <div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                             {attributes.map((attr) => {
                                                 const Icon = attr.icon;
                                                 return (
                                                     <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                         <Icon size={16} style={{ color: attr.color }} />
                                                         <span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span>
                                                     </button>
                                                 )
                                             })}
                                         </div>
                                     </>
                                 )}
                             </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4">
                            <input 
                                type="text" 
                                value={desc} 
                                onChange={(e) => setDesc(e.target.value)} 
                                placeholder={t('modals.quest.briefingPlaceholder')} 
                                className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" 
                            />
                        </div>


                        {/* Estimated Time - Redesigned */}
                        <div className="relative z-40">
                            <button 
                                onClick={() => setTimePickerOpen(!isTimePickerOpen)}
                                className="w-full bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex items-center justify-between hover:bg-white/10 active:scale-[0.99] transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${estimatedTime > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400'}`}>
                                        <Clock size={16} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('modals.quest.estimatedTime')}</span>
                                        <span className={`text-sm font-black ${estimatedTime > 0 ? 'text-white' : 'text-white/30'}`}>
                                            {estimatedTime > 0 ? `${estimatedTime} min` : 'Sin estimar'}
                                        </span>
                                    </div>
                                </div>
                                <div className={`text-white/30 transition-transform duration-300 ${isTimePickerOpen ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={18} />
                                </div>
                            </button>

                            {/* Dropdown */}
                            {isTimePickerOpen && (
                                <>
                                    <div className="fixed inset-0 z-[40]" onClick={() => setTimePickerOpen(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-[#1c1c1e] rounded-[1.5rem] border border-white/10 shadow-2xl z-[50] animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                            {[5, 10, 15, 30, 45, 60, 90, 120].map(time => (
                                                <button
                                                    key={time}
                                                    onClick={() => { setEstimatedTime(time); setTimePickerOpen(false); }}
                                                    className={`py-2 rounded-xl text-xs font-bold transition-all ${estimatedTime === time ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    {time}m
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Manual</span>
                                            <div className="flex-1 bg-black/30 rounded-xl px-3 py-2 flex items-center border border-white/5 focus-within:border-cyan-500/50 transition-colors">
                                                <input 
                                                    type="number" 
                                                    value={estimatedTime === 0 ? '' : estimatedTime} 
                                                    onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
                                                    placeholder="Custom"
                                                    className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/20"
                                                    autoFocus
                                                />
                                                <span className="text-[10px] font-bold text-slate-500 ml-1">min</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Difficulty Selector (Liquid UI) */}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-1 flex justify-between relative">
                            {difficulties.map((diff) => {
                                const isSelected = difficulty === diff.id;
                                const DiffIcon = diff.icon;
                                return (
                                    <button
                                        key={diff.id}
                                        onClick={() => setDifficulty(diff.id)}
                                        className="relative flex-1 h-10 flex items-center justify-center rounded-[1.2rem] transition-all duration-300 z-10"
                                    >
                                        {isSelected && (
                                            <div
                                                className="absolute inset-0 bg-white/10 shadow-lg rounded-[1.2rem] border border-white/5"
                                            />
                                        )}
                                        <div className={`flex items-center gap-1.5 ${isSelected ? 'scale-105' : 'opacity-50 scale-95'} transition-all duration-300`}>
                                            <DiffIcon size={12} className={diff.color} fill={isSelected ? "currentColor" : "none"} />
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${diff.color}`}>
                                                {diff.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Date Picker */}
                        <div className={`rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-between px-5 py-3 relative overflow-hidden ${lockedDate ? 'opacity-80 cursor-not-allowed' : ''}`}>
                             <input 
                                type="date" 
                                value={deadline} 
                                onChange={(e) => setDeadline(e.target.value)} 
                                className="absolute inset-0 opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed" 
                                disabled={!!lockedDate}
                             />
                             <span className="text-[10px] font-black text-white/30 uppercase flex items-center gap-2">
                                {t('modals.quest.dueDate')}
                                {lockedDate && <Lock size={10} />}
                             </span>
                             <div className="flex items-baseline gap-1 pointer-events-none">
                                 <span className="text-lg font-bold text-white">{new Date(deadline).getDate()}</span>
                                 <span className="text-xs font-bold text-white/50 uppercase">{new Date(deadline).toLocaleDateString('en-US', { month: 'short' })}</span>
                             </div>
                        </div>

                        <button 
                            onClick={handleConfirm} 
                            disabled={!title || !attrId} 
                            className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-white/10 text-white shadow-lg active:scale-95 hover:shadow-xl hover:border-white/20'}`}
                        >
                            {t('modals.quest.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
