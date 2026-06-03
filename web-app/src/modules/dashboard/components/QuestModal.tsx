import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crosshair, Plus, Star, Circle, Square, Triangle, Target, Repeat, ChevronDown, CheckCircle2, Hexagon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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
    const [subAttrId, setSubAttrId] = useState('');
    const [isSubAttrPickerOpen, setSubAttrPickerOpen] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('C');
    const [deadline, setDeadline] = useState(toLocalISOString(new Date()));
    
    // Recurrence State
    const [recurrenceType, setRecurrenceType] = useState<'NONE' | 'INTERVAL' | 'WEEKLY' | 'MONTHLY'>('NONE');
    const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
    const [recurrenceMonths, setRecurrenceMonths] = useState<number[]>([0,1,2,3,4,5,6,7,8,9,10,11]);
    const [monthlyType, setMonthlyType] = useState<'SPECIFIC_DATES' | 'LAST_DAY'>('SPECIFIC_DATES');
    const [isRecurrencePickerOpen, setRecurrencePickerOpen] = useState(false);
    const [showInJournaling, setShowInJournaling] = useState<boolean>(false);
    const [journalIconColor, setJournalIconColor] = useState<string>('#3b82f6'); // default blue

    // Subtasks removed as per tactical steps removal request
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);

    // Reset subAttrId only when attribute is manually changed, not on mount/populate

    // Smart Auto-linking by Keywords in title
    React.useEffect(() => {
        if (!title || initialValues?.attribute || lockedAttributeId) return;
        
        for (const attr of attributes) {
            if (attr.subTraits) {
                for (const sub of attr.subTraits) {
                    const subWords = sub.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                    const matched = subWords.some(word => title.toLowerCase().includes(word)) || title.toLowerCase().includes(sub.name.toLowerCase());
                    if (matched) {
                        setAttrId(attr.id);
                        setSubAttrId(sub.id);
                        return;
                    }
                }
            }
        }
    }, [title, attributes, lockedAttributeId, initialValues]);

    // Effect to apply locked props or initial values
    React.useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
            if (initialValues) {
                setTitle(initialValues.title || '');
                setDesc(initialValues.description || '');
                setAttrId(initialValues.attribute || '');
                setSubAttrId(initialValues.subAttribute || '');
                setProjectId(initialValues.projectId || initialValues.smartProjectId || '');
                setDifficulty((initialValues.difficulty as Difficulty) || 'C');
                setDeadline(initialValues.deadline || toLocalISOString(new Date()));
                setEstimatedTime(initialValues.estimatedTime || 0);
                setShowInJournaling(initialValues.showInJournaling || false);
                setJournalIconColor(initialValues.journalIconColor || '#3b82f6');
                
                if (initialValues.recurrence) {
                    setRecurrenceType(initialValues.recurrence.type || 'NONE');
                    setRecurrenceInterval(initialValues.recurrence.interval || 1);
                    setRecurrenceDays(initialValues.recurrence.days || []);
                    setRecurrenceMonths(initialValues.recurrence.months || [0,1,2,3,4,5,6,7,8,9,10,11]);
                    setMonthlyType(initialValues.recurrence.monthlyType || 'SPECIFIC_DATES');
                } else {
                    setRecurrenceType('NONE');
                    setRecurrenceInterval(1);
                    setRecurrenceDays([]);
                    setRecurrenceMonths([0,1,2,3,4,5,6,7,8,9,10,11]);
                    setMonthlyType('SPECIFIC_DATES');
                }
            } else {
                // Reset defaults for new quest
                setTitle('');
                setDesc('');
                setAttrId('');
                setSubAttrId('');
                setProjectId('');
                setDifficulty('C');
                setDeadline(toLocalISOString(new Date()));
                setEstimatedTime(0);
                setRecurrenceType('NONE');
                setRecurrenceInterval(1);
                setRecurrenceDays([]);
                setRecurrenceMonths([0,1,2,3,4,5,6,7,8,9,10,11]);
                setMonthlyType('SPECIFIC_DATES');
                setShowInJournaling(false);
                setJournalIconColor('#3b82f6');
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
        return calculateTaskRewards(estimatedTime, multipliers[difficulty], 0, 'TASK');
    }, [estimatedTime, difficulty]);

    const [isSubmitting, setIsSubmitting] = useState(false);

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
                subAttribute: (subAttrId || null) as any,
                projectId: finalProjectId,
                smartProjectId: finalSmartProjectId,
                difficulty, 
                deadline,
                estimatedTime,
                subtasks: [], // Empty as tactical steps are removed
                xpReward: prediction.xp,
                gold: prediction.coins,
                isSmartQuest: isSmartTask || !!finalSmartProjectId,
                showInJournaling,
                journalIconColor,
                recurrence: recurrenceType !== 'NONE' ? {
                    type: recurrenceType,
                    interval: recurrenceInterval,
                    days: recurrenceDays,
                    monthlyType: monthlyType,
                    months: recurrenceMonths
                } : { type: 'NONE' }
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
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[500] flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-black/60" onClick={onClose} />
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative z-10 w-full max-w-[360px]"
                    >
                        <div 
                            className="rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] relative transition-all duration-200" 
                            style={{
                                background: 'linear-gradient(165deg, rgba(20,20,25,0.95) 0%, rgba(5,5,5,0.98) 100%)',
                                border: `1px solid ${attrId ? activeColor : 'rgba(255, 255, 255, 0.08)'}`,
                                boxShadow: attrId 
                                    ? `0 0 0 1px ${activeColor}40, 0 8px 32px -8px rgba(0,0,0,0.8)`
                                    : '0 20px 40px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
                            }}
                        >
                            <div className="overflow-y-auto no-scrollbar p-4 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-1 px-1 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-200" style={{ background: attrId ? activeColor : '#333' }}>
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
                                        <div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] flex flex-col gap-1 z-[999] shadow-md border border-white/10 animate-in zoom-in-95 w-[200px] max-h-[300px] overflow-y-auto">
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
                                                        onClick={() => { 
                                                            setProjectId(p.id); 
                                                            if (p.traitId) {
                                                                setAttrId(p.traitId);
                                                                setSubAttrId('');
                                                            }
                                                            setProjectPickerOpen(false); 
                                                        }}
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
                                                        onClick={() => { 
                                                            setProjectId(p.id); 
                                                            if (p.attribute) {
                                                                setAttrId(p.attribute);
                                                                setSubAttrId('');
                                                            }
                                                            setProjectPickerOpen(false); 
                                                        }}
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
                                         <div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-md border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                             {attributes.map((attr) => {
                                                 const Icon = attr.icon;
                                                 return (
                                                     <button key={attr.id} onClick={(e) => { e.stopPropagation(); if (attr.id !== attrId) { setAttrId(attr.id); setSubAttrId(''); } setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
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

                        {selectedAttr?.subTraits && selectedAttr.subTraits.length > 0 && (
                            <div className="space-y-1 animate-in slide-in-from-top-1 fade-in">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-wider block px-1">
                                    Sub-Rasgo
                                </span>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setSubAttrPickerOpen(!isSubAttrPickerOpen)}
                                        className="w-full h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between px-4 text-xs font-bold text-white transition-colors hover:bg-white/10"
                                    >
                                        <div className="flex items-center gap-2">
                                            {subAttrId ? (
                                                <>
                                                    <span className="text-slate-300">
                                                        {selectedAttr.subTraits.find(st => st.id === subAttrId)?.name || subAttrId}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-white/20">Seleccionar Sub-Rasgo (Opcional)</span>
                                            )}
                                        </div>
                                        <ChevronDown size={14} className="text-white/30" />
                                    </button>
                                    
                                    {isSubAttrPickerOpen && (
                                        <>
                                            <div className="fixed inset-0 z-[998] bg-transparent" onClick={() => setSubAttrPickerOpen(false)} />
                                            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] flex flex-col gap-1 z-[999] shadow-md border border-white/10 max-h-[160px] overflow-y-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => { setSubAttrId(''); setSubAttrPickerOpen(false); }}
                                                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left text-xs font-bold text-white/50"
                                                >
                                                    Ninguno
                                                </button>
                                                {selectedAttr.subTraits.map(st => (
                                                    <button
                                                        key={st.id}
                                                        type="button"
                                                        onClick={() => { setSubAttrId(st.id); setSubAttrPickerOpen(false); }}
                                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                                                    >
                                                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                                            {st.iconName && (LucideIcons as any)[st.iconName] ? React.createElement((LucideIcons as any)[st.iconName], { size: 12 }) : <Hexagon size={12} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-white">{st.name}</span>
                                                            <span className="text-[9px] font-bold text-slate-500">Lvl {st.level}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

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
                                        className="relative flex-1 h-8 flex items-center justify-center rounded-[1rem] transition-all duration-200 z-10"
                                    >
                                        {isSelected && (
                                            <div
                                                className="absolute inset-0 bg-white/10 shadow-lg rounded-[1rem] border border-white/5"
                                            />
                                        )}
                                        <div className={`flex items-center gap-1.5 ${isSelected ? 'scale-105' : 'opacity-50 scale-95'} transition-all duration-200`}>
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

                        {/* Recurrence Selector */}
                        <div className="bg-white/5 rounded-[1.2rem] border border-white/5 p-3 relative">
                            <div 
                                onClick={() => setRecurrencePickerOpen(!isRecurrencePickerOpen)}
                                className="flex items-center justify-between cursor-pointer group"
                            >
                                <div className="flex items-center gap-2">
                                    <Repeat size={14} className={recurrenceType !== 'NONE' ? "text-cyan-400" : "text-white/30"} />
                                    <span className={`text-[10px] font-bold uppercase ${recurrenceType !== 'NONE' ? "text-white" : "text-white/50"}`}>
                                        {recurrenceType === 'NONE' ? t('tasks.recurrence.none', 'No Repeat') :
                                         recurrenceType === 'INTERVAL' ? t('tasks.recurrence.interval', 'Interval') :
                                         recurrenceType === 'WEEKLY' ? t('tasks.recurrence.weekly', 'Weekly') :
                                         t('tasks.recurrence.monthly', 'Monthly')}
                                    </span>
                                </div>
                                <ChevronDown size={14} className={`text-white/30 transition-transform ${isRecurrencePickerOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Dropdown for Recurrence Type */}
                            <AnimatePresence>
                                {isRecurrencePickerOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden mt-3"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1">
                                            {['NONE', 'INTERVAL', 'MONTHLY'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        setRecurrenceType(type as any);
                                                        setRecurrenceDays([]);
                                                        setRecurrencePickerOpen(false);
                                                    }}
                                                    className={`py-2 rounded-xl text-[9px] font-black tracking-wide transition-all border ${recurrenceType === type ? "bg-white/10 text-white border-white/20 shadow-sm" : "bg-transparent border-transparent text-slate-500 hover:text-white"}`}
                                                >
                                                    {t(`tasks.recurrence.${type.toLowerCase()}`, type)}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Interval Configuration */}
                            {recurrenceType === 'INTERVAL' && (
                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/70">{t('tasks.recurrence.everyDays', 'Repeat every X days')}:</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="365" 
                                        value={recurrenceInterval} 
                                        onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-16 h-8 bg-black/40 rounded-lg text-center text-xs font-bold text-white outline-none border border-white/10 focus:border-white/30"
                                    />
                                </div>
                            )}

                            {/* Monthly Configuration */}
                            {recurrenceType === 'MONTHLY' && (
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-4">
                                    {/* Months Selector */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{t('tasks.recurrence.months', 'Meses')}</span>
                                            <span className="text-[9px] font-bold text-white/30">{recurrenceMonths.length === 12 ? t('common.all', 'Todos') : `${recurrenceMonths.length} seleccionados`}</span>
                                        </div>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                            {Array.from({ length: 12 }).map((_, index) => {
                                                const monthName = new Date(2024, index, 1).toLocaleDateString(undefined, { month: 'short' });
                                                const isSelected = recurrenceMonths.includes(index);
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            setRecurrenceMonths(prev => {
                                                                if (prev.includes(index)) {
                                                                    return prev.filter(m => m !== index);
                                                                }
                                                                return [...prev, index];
                                                            });
                                                        }}
                                                        className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-bold capitalize transition-all border ${isSelected ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"}`}
                                                    >
                                                        {monthName.replace('.', '')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Days Selector */}
                                    <div className="space-y-2 pt-3 border-t border-white/5">
                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('tasks.recurrence.days', 'Días')}</span>
                                        <div className="grid grid-cols-7 gap-1.5 mb-2">
                                            {Array.from({ length: 31 }).map((_, i) => {
                                                const day = i + 1;
                                                return (
                                                    <button
                                                        key={day}
                                                        onClick={() => {
                                                            // ELIMINADO: setMonthlyType('SPECIFIC_DATES'); para no desmarcar 'LAST_DAY'
                                                            setRecurrenceDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
                                                        }}
                                                        className={`h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all border ${recurrenceDays.includes(day) ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"}`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (monthlyType === 'LAST_DAY') {
                                                    setMonthlyType('SPECIFIC_DATES');
                                                } else {
                                                    setMonthlyType('LAST_DAY');
                                                    // ELIMINADO: setRecurrenceDays([]); para no desmarcar los días
                                                }
                                            }}
                                            className={`w-full py-2.5 rounded-xl text-[10px] font-bold transition-all border flex justify-center items-center gap-2 ${monthlyType === 'LAST_DAY' ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${monthlyType === 'LAST_DAY' ? "bg-cyan-500 border-cyan-400 text-black" : "border-slate-500"}`}>
                                                {monthlyType === 'LAST_DAY' && <CheckCircle2 size={12} />}
                                            </div>
                                            {t('habits.lastDayOfMonth', 'Último día del mes')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Journaling Integration Options */}
                            {recurrenceType !== 'NONE' && (
                                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                <Target size={14} />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-white block">Mostrar en el Journaling</span>
                                                <span className="text-[10px] text-white/40">Agrega esta tarea al calendario de Journal</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowInJournaling(!showInJournaling)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showInJournaling ? 'bg-emerald-500' : 'bg-white/10'}`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showInJournaling ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {showInJournaling && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pt-2 pb-1 space-y-2">
                                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Color del Icono</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308'].map(color => (
                                                            <button
                                                                key={color}
                                                                onClick={() => setJournalIconColor(color)}
                                                                className={`w-6 h-6 rounded-full border-2 transition-transform ${journalIconColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent scale-100 opacity-60 hover:opacity-100'}`}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleConfirm} 
                            disabled={!title || !attrId || isSubmitting} 
                            className={`w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 ${(!title || !attrId || isSubmitting) ? 'bg-white/5 text-white/20' : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-white/10 text-white shadow-lg active:scale-95 hover:shadow-md hover:border-white/20'}`}
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
                    </motion.div>
            
            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={(date) => setDeadline(toLocalISOString(date))}
                mode="DAY"
                currentDate={parseLocalDate(deadline)}
            />
        </motion.div>
        )}
    </AnimatePresence>,
        document.body
    );
});
