import React, { useState, useMemo } from 'react';
import { X, Crosshair, Plus, Star, Circle, Square, Triangle, Lock, Sparkles, Target, Clock } from 'lucide-react';
import { Attribute, Quest, Project } from '../../../types';
import { Difficulty, calculateTaskRewards } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { useTranslation } from 'react-i18next';

export const QuestModal = React.memo(({ 
    isOpen, 
    onClose, 
    attributes, 
    projects = [],
    onConfirm,
    lockedAttributeId,
    lockedDate,
    isSmartTask,
    initialValues
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    attributes: Attribute[], 
    projects?: Project[],
    onConfirm: (data: Partial<Quest>) => void,
    lockedAttributeId?: string,
    lockedDate?: string,
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
    const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
    // Subtasks removed as per tactical steps removal request
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(0);

    // Effect to apply locked props or initial values
    React.useEffect(() => {
        if (isOpen) {
            if (initialValues) {
                setTitle(initialValues.title || '');
                setDesc(initialValues.description || '');
                setAttrId(initialValues.attribute || '');
                setProjectId(initialValues.projectId || '');
                setDifficulty((initialValues.difficulty as Difficulty) || 'C');
                setDeadline(initialValues.deadline || new Date().toISOString().split('T')[0]);
                setEstimatedTime(initialValues.estimatedTime || 0);
            } else {
                // Reset defaults for new quest
                setTitle('');
                setDesc('');
                setAttrId('');
                setProjectId('');
                setDifficulty('C');
                setDeadline(new Date().toISOString().split('T')[0]);
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

    const prediction = useMemo(() => {
        return calculateTaskRewards(difficulty, deadline, estimatedTime);
    }, [difficulty, deadline, estimatedTime]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm({ 
            ...(initialValues?.id ? { id: initialValues.id } : {}),
            title, 
            description: desc, 
            attribute: attrId, 
            projectId,
            difficulty, 
            deadline,
            estimatedTime,
            subtasks: [], // Empty as tactical steps are removed
            xpReward: prediction.xp,
            gold: prediction.coins,
            isSmartQuest: isSmartTask
        });
    };

    const difficulties: { id: Difficulty, label: string, icon: React.ElementType, color: string }[] = [
        { id: 'C', label: t('modals.quest.difficulties.Basic'), icon: Circle, color: 'text-cyan-400' },
        { id: 'B', label: t('modals.quest.difficulties.Medium'), icon: Square, color: 'text-emerald-400' },
        { id: 'A', label: t('modals.quest.difficulties.Hard'), icon: Triangle, color: 'text-orange-400' },
        { id: 'S', label: t('modals.quest.difficulties.Epic'), icon: Star, color: 'text-purple-500' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px]">
                <div 
                    className="rounded-[2.5rem] p-5 overflow-visible relative" 
                    style={{
                        background: '#0a0a0a',
                        border: `2px solid ${attrId ? activeColor : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: attrId 
                            ? `0 0 0 1px ${activeColor}20, 0 10px 40px -10px ${activeColor}40`
                            : '0 10px 30px -10px rgba(0,0,0,0.8)'
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : '#333' }}>
                                <Crosshair size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none flex items-center gap-2">
                                    {initialValues ? t('modals.quest.titleEdit') : (isSmartTask ? t('modals.quest.titleSmart') : t('modals.quest.titleNew'))}
                                    {isSmartTask && <Sparkles size={14} className="text-yellow-400" />}
                                </h2>
                                {isSmartTask && <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('modals.quest.linkedStrategy')}</span>}
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


                        {/* Estimated Time */}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-cyan-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.quest.estimatedTime') || "Est. Time (min)"}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2 border border-white/5 focus-within:border-white/20 transition-colors w-32">
                                <input 
                                    type="number" 
                                    value={estimatedTime === 0 ? '' : estimatedTime} 
                                    onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)} 
                                    placeholder="30"
                                    className="w-full bg-transparent text-right text-sm font-bold text-white placeholder:text-white/20 outline-none"
                                />
                                <span className="text-[10px] font-bold text-white/30">min</span>
                            </div>
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
