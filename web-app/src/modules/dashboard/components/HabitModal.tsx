import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { X, Plus, CheckCircle2, Hash, List, ChevronDown, Star, Target, Zap, AlertCircle, Calendar, Palette, Trash2, GripVertical } from 'lucide-react';
import { Attribute, Habit, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { IconPicker } from './IconPicker';
import { DurationPicker } from './DurationPicker';
import { usePermissions } from '../../../hooks/usePermissions';

export const HabitModal = React.memo(({ isOpen, onClose, attributes, projects = [], onConfirm, initialData, onSwitchToBadHabit }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], smartProjects?: SmartProject[], projects?: Project[], onConfirm: (data: Partial<Habit>) => Promise<void> | void, initialData?: Habit, onSwitchToBadHabit?: () => void }) => {
    const { t } = useTranslation();
    const { permissions, requestPermissions, openSystemSettings } = usePermissions();
    const [expandedBlock, setExpandedBlock] = useState<1 | 2 | 3>(1);
    
    // Block 1: Identity
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [customColor, setCustomColor] = useState<string | undefined>(undefined);
    const [customIconName, setCustomIconName] = useState<string | null>(null);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);

    // Block 2: Mechanics
    const [freq, setFreq] = useState('DAILY');
    const [weekDays, setWeekDays] = useState<number[]>([]);
    const [logic, setLogic] = useState<'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN'>('BOOLEAN');
    const [target, setTarget] = useState('');
    const [unit, setUnit] = useState('');
    const [subtasks, setSubtasks] = useState<{ id: string; text: string; completed: boolean; color?: string; days?: number[] }[]>([]);
    const [openMenu, setOpenMenu] = useState<{id: string, type: 'COLOR' | 'DAYS'} | null>(null);
    const [newSubtask, setNewSubtask] = useState('');
    const [impact, setImpact] = useState(1);

    // Block 3: Commitment
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [reminder, setReminder] = useState('');
    const [smartProjectId, setSmartProjectId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const iconPickerRef = useRef<HTMLDivElement>(null);

    const handleIconPickerToggle = (isOpen: boolean) => {
        if (isOpen) {
            // Wait for animation to expand enough to calculate correct center
            setTimeout(() => {
                if (iconPickerRef.current) {
                    iconPickerRef.current.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            }, 300);
        }
    };

    // Reset or Populate form on open
    useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
            setExpandedBlock(1);
            if (initialData) {
                setTitle(initialData.title || '');
                setDesc(initialData.description || '');
                setAttrId(initialData.attribute || '');
                setSmartProjectId(initialData.projectId || '');
                setFreq(initialData.frequency || 'DAILY');
                setWeekDays(initialData.frequencyDays || []);
                setLogic(initialData.type || 'BOOLEAN');
                setTarget(initialData.targetValue?.toString() || '');
                setUnit(initialData.unit || '');
                setSubtasks(initialData.checklist || []);
                setReminder(initialData.reminderTime || '');
                setEstimatedTime(initialData.estimatedTime || 0);
                setCustomColor(initialData.customColor);
                setCustomIconName(initialData.iconName || null);
                setImpact(initialData.impact || 1);
                // Try to infer impact/difficulty if not present
            } else {
                // Reset
                setTitle('');
                setDesc('');
                setAttrId('');
                setSmartProjectId('');
                setProjectId('');
                setEstimatedTime(0);
                setFreq('DAILY');
                setWeekDays([]);
                setLogic('BOOLEAN');
                setTarget('');
                setUnit('');
                setSubtasks([]);
                setReminder('');
                setImpact(1);
                setCustomColor(undefined);
                setCustomIconName(null);
            }
        }
    }, [isOpen, initialData]);

    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = customColor || (selectedAttr ? selectedAttr.color : '#3b82f6');
    const hasColorSource = !!attrId || !!customColor;
    const CustomIcon = customIconName && (LucideIcons as any)[customIconName] 
        ? (LucideIcons as any)[customIconName] 
        : null;
    const SelectedIcon = CustomIcon || selectedAttr?.icon || Star;
    const TraitIcon = selectedAttr?.icon || Star;
    const activeLabel = selectedAttr ? t(selectedAttr.label, selectedAttr.label.replace('traits.', '')) : 'Trait';

    const prediction = useMemo(() => {
        // If creating a new habit, streak is 0.
        // If editing, use the current streak to show the NEXT reward.
        // BUT WAIT! The user might be confused. "Base Reward" vs "Next Reward".
        // The most honest thing is to show the BASE reward + CURRENT STREAK BONUS.
        // Because that's what they will get if they complete it today.
        
        const currentStreak = initialData?.streak || 0;
        return calculateTaskRewards(estimatedTime, impact, currentStreak, 'HABIT');
    }, [estimatedTime, impact, initialData?.streak]);

    // Validation Logic
    const isBlock1Valid = title.trim() !== '' && desc.trim() !== '' && attrId !== '';
    const isBlock2Valid = true; // Always valid with defaults
    const isBlock3Valid = estimatedTime > 0 && reminder !== '';

    const canSubmit = isBlock1Valid && isBlock2Valid && isBlock3Valid;

    const handleBlockChange = (block: 1 | 2 | 3) => {
        if (expandedBlock === 1 && !isBlock1Valid) return;
        // If trying to jump to 3, 2 must be valid (it's always valid technically)
        if (block === 3 && (!isBlock1Valid)) return; 
        
        setExpandedBlock(block);
    };

    const handleConfirm = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                title,
                description: desc,
                attribute: attrId,
                type: logic,
                frequency: freq,
                frequencyDays: freq === 'WEEKLY' ? weekDays : undefined,
                targetValue: logic === 'QUANTITY' ? parseInt(target) : 1,
                unit: unit || undefined,
                checklist: logic === 'CHECKLIST' ? subtasks : [],
                reminderTime: reminder || undefined,
                estimatedTime,
                customColor,
                iconName: customIconName || undefined,
                impact,
                projectId: projectId || undefined,
                smartProjectId: smartProjectId || undefined,
                ...(initialData?.id ? { id: initialData.id } : {})
            });
            onClose();
            
            // Dispatch event for TourGuide
            if (!initialData?.id) {
                window.dispatchEvent(new CustomEvent('habit-created'));
            }
        } catch (error) {
            console.error("Failed to save habit", error);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        onClose();
        if (!initialData?.id) {
            window.dispatchEvent(new CustomEvent('habit-created'));
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[500] flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-black/60" onClick={!isSubmitting ? handleClose : undefined} />
                    <motion.div 
                        initial={{ scale: 0.95, y: 10, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 10, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative z-10 w-full max-w-[360px]"
                    >
                <div 
                    className="rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] relative bg-[#0a0a0a] transition-all duration-500 ease-out"
                    style={{
                        border: `1px solid ${hasColorSource ? activeColor : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: hasColorSource
                            ? `0 0 0 1px ${activeColor}40, 0 0 30px -10px ${activeColor}50, 0 0 20px ${activeColor}30, inset 0 0 20px ${activeColor}10`
                            : `0 20px 50px -10px rgba(0,0,0,0.5)`
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 pb-2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: activeColor }}>
                                <SelectedIcon size={21} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight leading-none">{initialData ? t('habits.editHabit', 'Edit Habit') : t('habits.newHabit', 'New Habit')}</h2>
                                <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-wider">{t('habits.lifeProtocol', 'Life Protocol')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!initialData && onSwitchToBadHabit && (
                                <div className="flex p-0.5 rounded-full bg-white/5 border border-white/10">
                                    <div className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold shadow-sm">
                                        {t('habits.habit', 'Habit')}
                                    </div>
                                    <button 
                                        onClick={onSwitchToBadHabit}
                                        className="px-3 py-1 rounded-full text-white/40 text-[10px] font-bold hover:text-white transition-colors"
                                    >
                                        {t('habits.vice', 'Vice')}
                                    </button>
                                </div>
                            )}
                            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                        </div>
                    </div>

                    <div ref={scrollContainerRef} className="overflow-y-auto no-scrollbar p-3 space-y-2">
                        
                        {/* BLOCK 1: IDENTIDAD */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
                            expandedBlock === 1 
                                ? "bg-white/5 border-white/10" 
                                : "bg-transparent border-white/5 hover:bg-white/[0.02]"
                        )}>
                            <button 
                                onClick={() => handleBlockChange(1)}
                                className="w-full flex items-center justify-between p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 1 ? "bg-white text-black" : isBlock1Valid ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        {isBlock1Valid && expandedBlock !== 1 ? <CheckCircle2 size={14} /> : "1"}
                                    </div>
                                    <span className={cn("text-xs font-bold tracking-wide", expandedBlock === 1 ? "text-white" : "text-white/50")}>{t('habits.identity', 'IDENTITY')}</span>
                                </div>
                                <ChevronDown size={14} className={cn("transition-transform duration-300 text-white/30", expandedBlock === 1 && "rotate-180")} />
                            </button>
                            
                            <AnimatePresence initial={false}>
                                {expandedBlock === 1 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="px-3 pb-3 space-y-2"
                                    >
                                        {/* Title */}
                                        <div className="bg-black/20 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-all">
                                            <input 
                                                type="text" 
                                                value={title} 
                                                onChange={(e) => setTitle(e.target.value)} 
                                                placeholder={t('habits.protocolNamePlaceholder', 'Protocol Name...')}
                                                className="w-full h-9 bg-transparent px-3 text-xs font-bold text-white placeholder:text-white/20 outline-none" 
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="bg-black/20 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-all">
                                            <input 
                                                type="text" 
                                                value={desc} 
                                                onChange={(e) => setDesc(e.target.value)} 
                                                placeholder={t('habits.descriptionPlaceholder', 'Description (Required)...')} 
                                                className="w-full h-9 bg-transparent px-3 text-xs font-medium text-slate-300 placeholder:text-white/20 outline-none" 
                                            />
                                        </div>

                                        {/* Trait Picker */}
                                        <div className="flex flex-col gap-2">
                                            <div 
                                                onClick={() => setAttrPickerOpen(!isAttrPickerOpen)} 
                                                className={cn(
                                                    "w-full h-10 rounded-xl border flex items-center px-3 gap-3 cursor-pointer transition-all relative",
                                                    attrId ? "bg-white/5 border-white/10" : "bg-black/20 border-dashed border-white/10 hover:border-white/30"
                                                )}
                                            >
                                                        {attrId ? (
                                                    <>
                                                        <TraitIcon size={16} style={{ color: selectedAttr?.color || '#3b82f6' }} />
                                                        <span className="text-xs font-bold text-white">{selectedAttr ? t(selectedAttr.label, selectedAttr.label.replace('traits.', '')) : ''}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={16} className="text-white/30" />
                                                        <span className="text-xs font-bold text-white/30">{t('habits.selectTrait', 'Select Trait')}</span>
                                                    </>
                                                )}
                                                <div className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                                    <ChevronDown size={14} className={cn("transition-transform text-white/30 group-hover:text-white/50", isAttrPickerOpen && "rotate-180")} />
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isAttrPickerOpen && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="grid grid-cols-2 gap-2 p-2 bg-[#1c1c1e]/50 rounded-xl border border-white/10">
                                                            {attributes.map((attr) => {
                                                                const Icon = attr.icon;
                                                                const isSelected = attrId === attr.id;
                                                                return (
                                                                    <button 
                                                                        key={attr.id} 
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            setAttrId(attr.id); 
                                                                            setAttrPickerOpen(false); 
                                                                        }} 
                                                                        className={cn(
                                                                            "flex items-center gap-3 p-3 rounded-lg transition-all border",
                                                                            isSelected 
                                                                                ? "bg-white/10 border-white/20" 
                                                                                : "bg-white/5 border-transparent hover:bg-white/10"
                                                                        )}
                                                                    >
                                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
                                                                            <Icon size={16} style={{ color: attr.color }} />
                                                                        </div>
                                                                    <span className={cn(
                                                                            "text-xs font-bold",
                                                                            isSelected ? "text-white" : "text-slate-400"
                                                                        )}>
                                                                        {t(attr.label, attr.label.replace('traits.', ''))}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Icon & Color Picker */}
                                        <div ref={iconPickerRef}>
                                            <IconPicker 
                                                selectedIcon={customIconName}
                                                onSelectIcon={setCustomIconName}
                                                selectedColor={customColor}
                                                onSelectColor={setCustomColor}
                                                onToggle={handleIconPickerToggle}
                                            />
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button 
                                                onClick={() => isBlock1Valid && handleBlockChange(2)}
                                                disabled={!isBlock1Valid}
                                                className="px-6 py-2 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                            >
                                                {t('common.next', 'Next')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* BLOCK 2: MECÁNICA */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
                            expandedBlock === 2
                                ? "bg-white/5 border-white/10" 
                                : "bg-transparent border-white/5 hover:bg-white/[0.02]"
                        )}>
                            <button 
                                onClick={() => handleBlockChange(2)}
                                className="w-full flex items-center justify-between p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 2 ? "bg-white text-black" : isBlock2Valid && expandedBlock > 2 ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        {isBlock2Valid && expandedBlock > 2 ? <CheckCircle2 size={14} /> : "2"}
                                    </div>
                                    <span className={cn("text-xs font-bold tracking-wide", expandedBlock === 2 ? "text-white" : "text-white/50")}>{t('habits.mechanics', 'MECHANICS')}</span>
                                </div>
                                <ChevronDown size={14} className={cn("transition-transform duration-300 text-white/30", expandedBlock === 2 && "rotate-180")} />
                            </button>

                            <AnimatePresence initial={false}>
                                {expandedBlock === 2 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="px-3 pb-3 space-y-3"
                                    >
                                        {/* Frequency */}
                                        <div className="bg-black/20 rounded-xl p-1 flex">
                                            {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                                <button 
                                                    key={f} 
                                                    onClick={() => setFreq(f)} 
                                                    className={cn(
                                                        "flex-1 py-1.5 rounded-lg text-[9px] font-black tracking-wide transition-all",
                                                        freq === f ? "bg-white/10 text-white shadow-sm border border-white/10" : "text-slate-500 hover:text-white"
                                                    )}
                                                >
                                                    {t(`modals.habit.frequencies.${f}`)}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        {freq === 'WEEKLY' && (
                                            <div className="flex justify-between animate-in slide-in-from-top-2 fade-in px-1">
                                                {(t('common.weekdays.initials', { returnObjects: true }) as string[]).map((label: string, index: number) => (
                                                    <button 
                                                        key={index} 
                                                        onClick={() => setWeekDays(prev => prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index])} 
                                                        className={cn(
                                                            "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all border",
                                                            weekDays.includes(index) ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Logic */}
                                        <div className="grid grid-cols-1 gap-2">
                                            <button 
                                                onClick={() => setLogic(t => t === 'BOOLEAN' ? 'QUANTITY' : t === 'QUANTITY' ? 'CHECKLIST' : 'BOOLEAN')} 
                                                className="bg-black/20 rounded-xl p-2.5 flex items-center justify-between group hover:bg-black/30 transition-colors border border-white/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", logic === 'BOOLEAN' ? "bg-green-500/20 text-green-400" : logic === 'QUANTITY' ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400")}>
                                                        {logic === 'BOOLEAN' ? <CheckCircle2 size={14} /> : logic === 'QUANTITY' ? <Hash size={14} /> : <List size={14} />}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase block">{t('modals.habit.logic')}</span>
                                                        <span className="text-xs font-bold text-white capitalize">{t(`modals.habit.logics.${logic}`)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                                    <ChevronDown size={14} className="text-white/30 group-hover:text-white/50" />
                                                </div>
                                            </button>
                                        </div>

                                        {logic === 'QUANTITY' && (
                                            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex-1 bg-black/20 rounded-xl p-2 border border-white/5">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1 ml-1">{t('modals.habit.target')}</span>
                                                    <input type="number" placeholder="10" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-transparent text-lg font-bold text-white outline-none px-1" />
                                                </div>
                                                <div className="flex-1 bg-black/20 rounded-xl p-2 border border-white/5">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1 ml-1">{t('modals.habit.unit')}</span>
                                                    <input type="text" placeholder={t('habits.pagesPlaceholder', 'pages')} value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-lg font-bold text-white outline-none px-1" />
                                                </div>
                                            </div>
                                        )}

                                        {logic === 'CHECKLIST' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex gap-2 bg-black/20 rounded-xl p-1 border border-white/5">
                                                    <input 
                                                        type="text" 
                                                        placeholder={t('modals.quest.addStepPlaceholder')} 
                                                        value={newSubtask} 
                                                        onChange={e => setNewSubtask(e.target.value)} 
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && newSubtask.trim()) {
                                                                const defaultDays = freq === 'WEEKLY' ? weekDays : freq === 'MONTHLY' ? [] : undefined;
                                                                setSubtasks([...subtasks, { id: Date.now().toString(), text: newSubtask, completed: false, days: defaultDays }]);
                                                                setNewSubtask('');
                                                            }
                                                        }}
                                                        className="flex-1 bg-transparent text-sm font-medium text-white outline-none px-3" 
                                                    />
                                                    <button 
                                                        onClick={() => { 
                                                            if(newSubtask.trim()) { 
                                                                const defaultDays = freq === 'WEEKLY' ? weekDays : freq === 'MONTHLY' ? [] : undefined;
                                                                setSubtasks([...subtasks, { id: Date.now().toString(), text: newSubtask, completed: false, days: defaultDays }]); 
                                                                setNewSubtask(''); 
                                                            } 
                                                        }} 
                                                        className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                
                                                <Reorder.Group axis="y" values={subtasks} onReorder={setSubtasks} className="space-y-2">
                                                    {subtasks.map((task) => (
                                                        <Reorder.Item key={task.id} value={task} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                                            <div className="flex items-center gap-2 p-2">
                                                                <GripVertical size={14} className="text-white/20 cursor-grab active:cursor-grabbing flex-shrink-0" />
                                                                
                                                                <div 
                                                                    className="w-2 h-2 rounded-full flex-shrink-0" 
                                                                    style={{ backgroundColor: task.color || 'rgba(255,255,255,0.2)' }}
                                                                />

                                                                <input 
                                                                    value={task.text}
                                                                    onChange={(e) => setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, text: e.target.value } : t))}
                                                                    className="flex-1 bg-transparent text-xs text-white outline-none min-w-0"
                                                                />

                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <button 
                                                                        onClick={() => setOpenMenu(prev => (prev?.id === task.id && prev?.type === 'COLOR') ? null : { id: task.id, type: 'COLOR' })}
                                                                        className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", task.color ? "text-white" : "text-white/30 hover:text-white")}
                                                                    >
                                                                        <Palette size={12} />
                                                                    </button>

                                                                    <button 
                                                                        onClick={() => setOpenMenu(prev => (prev?.id === task.id && prev?.type === 'DAYS') ? null : { id: task.id, type: 'DAYS' })}
                                                                        className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", (task.days && task.days.length > 0) ? "text-cyan-400" : "text-white/30 hover:text-white")}
                                                                    >
                                                                        <Calendar size={12} />
                                                                    </button>

                                                                    <button 
                                                                        onClick={() => setSubtasks(subtasks.filter(t => t.id !== task.id))}
                                                                        className="p-1.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {openMenu?.id === task.id && (
                                                                    <motion.div 
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="border-t border-white/5 bg-black/20"
                                                                    >
                                                                        {openMenu.type === 'COLOR' && (
                                                                            <div className="flex gap-1.5 p-2 overflow-x-auto no-scrollbar">
                                                                                <button onClick={() => setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, color: undefined } : t))} className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center bg-transparent"><X size={10} className="text-white/50" /></button>
                                                                                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'].map(c => (
                                                                                    <button 
                                                                                        key={c}
                                                                                        onClick={() => setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, color: c } : t))}
                                                                                        className={cn("w-5 h-5 rounded-full border transition-transform hover:scale-110 flex-shrink-0", task.color === c ? "border-white scale-110" : "border-transparent")}
                                                                                        style={{ backgroundColor: c }}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {openMenu.type === 'DAYS' && (
                                                                            <div className="flex justify-between p-2">
                                                                                {(t('common.weekdays.initials', { returnObjects: true }) as string[]).map((label: string, index: number) => {
                                                                                    const isSelected = task.days ? task.days.includes(index) : true;
                                                                                    return (
                                                                                        <button 
                                                                                            key={index} 
                                                                                            onClick={() => {
                                                                                                const currentDays = task.days || [0,1,2,3,4,5,6];
                                                                                                const newDays = currentDays.includes(index) 
                                                                                                    ? currentDays.filter(d => d !== index)
                                                                                                    : [...currentDays, index];
                                                                                                setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, days: newDays.length === 7 ? undefined : newDays } : t));
                                                                                            }} 
                                                                                            className={cn(
                                                                                                "w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-all border",
                                                                                                isSelected ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.4)]" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                                                                            )}
                                                                                        >
                                                                                            {label}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </Reorder.Item>
                                                    ))}
                                                </Reorder.Group>
                                            </div>
                                        )}

                                        {/* Impact */}
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-bold text-white/30 uppercase pl-1">{t('habits.positiveImpact', 'Positive Impact')}</span>
                                            <div className="h-8 bg-black/30 rounded-full p-1 flex gap-1">
                                                {[1,2,3,4].map(lvl => (
                                                    <button 
                                                        key={lvl} 
                                                        onClick={() => setImpact(lvl)} 
                                                        className={cn(
                                                            "flex-1 rounded-full transition-all duration-300",
                                                            impact >= lvl 
                                                                ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                                                                : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                                                                : lvl === 3 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                                                                : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                                                                : 'bg-white/5'
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button 
                                                onClick={() => isBlock2Valid && handleBlockChange(3)}
                                                className="px-5 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:scale-105 transition-transform"
                                            >
                                                {t('common.next', 'Next')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* BLOCK 3: COMPROMISO */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
                            expandedBlock === 3
                                ? "bg-white/5 border-white/10" 
                                : "bg-transparent border-white/5 hover:bg-white/[0.02]"
                        )}>
                            <button 
                                onClick={() => handleBlockChange(3)}
                                className="w-full flex items-center justify-between p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 3 ? "bg-white text-black" : (isBlock3Valid || initialData) ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        {expandedBlock === 3 ? "3" : (isBlock3Valid || initialData) ? <CheckCircle2 size={14} /> : "3"}
                                    </div>
                                    <span className={cn("text-xs font-bold tracking-wide", expandedBlock === 3 ? "text-white" : "text-white/50")}>{t('habits.commitment', 'COMMITMENT')}</span>
                                </div>
                                <ChevronDown size={14} className={cn("transition-transform duration-300 text-white/30", expandedBlock === 3 && "rotate-180")} />
                            </button>

                            <AnimatePresence initial={false}>
                                {expandedBlock === 3 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="px-3 pb-3 space-y-3"
                                    >
                                        {/* Estimated Time */}
                                        <DurationPicker value={estimatedTime} onChange={setEstimatedTime} />

                                        {/* Reminder */}
                                        <div className="space-y-2">
                                            <div className="bg-black/20 rounded-xl p-2.5 flex items-center justify-between border border-white/5 group">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle size={14} className="text-orange-400" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.habit.alert') || "Alerta"}</span>
                                                </div>
                                                <div className="relative">
                                                    <input 
                                                        type="time" 
                                                        value={reminder} 
                                                        onChange={(e) => {
                                                            setReminder(e.target.value);
                                                            if (e.target.value && permissions.notifications !== 'granted') {
                                                                requestPermissions();
                                                            }
                                                        }} 
                                                        className="bg-transparent text-xs font-bold text-white outline-none w-24 text-right cursor-pointer z-10 relative" 
                                                    />
                                                    {!reminder && <span className="absolute right-0 top-0 text-xs font-bold text-white/20 pointer-events-none">OFF</span>}
                                                </div>
                                            </div>

                                            {/* Permission & Battery Checks */}
                                            <AnimatePresence>
                                                {reminder && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="space-y-2 overflow-hidden"
                                                    >
                                                        {/* Notification Permission Gate */}
                                                        {(permissions.notifications !== 'granted' && permissions.notifications !== 'unknown') && (
                                                            <button 
                                                                onClick={requestPermissions}
                                                                className="w-full flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <AlertCircle size={12} />
                                                                    <span className="text-[10px] font-bold">{t('habits.missingPermissions', 'Missing Permissions')}</span>
                                                                </div>
                                                                <span className="text-[10px] font-bold underline">{t('common.activate', 'ACTIVATE')}</span>
                                                            </button>
                                                        )}

                                                        {/* Battery Optimization Check */}
                                                        <button 
                                                            onClick={openSystemSettings}
                                                            className="w-full flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Zap size={12} />
                                                                <span className="text-[10px] font-bold">{t('habits.batteryBackground', 'Battery / Background')}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold underline">{t('common.review', 'REVIEW')}</span>
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Project Link */}
                                        <div className="relative">
                                            <button 
                                                onClick={() => setProjectPickerOpen(!isProjectPickerOpen)}
                                                className={cn(
                                                    "w-full bg-black/20 rounded-xl p-2.5 flex items-center justify-between border border-white/5 transition-colors",
                                                    projectId ? "border-indigo-500/30 bg-indigo-500/5" : "hover:bg-black/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Target size={14} className={projectId ? "text-indigo-400" : "text-slate-500"} />
                                                    <span className={cn("text-[9px] font-bold uppercase", projectId ? "text-indigo-300" : "text-slate-400")}>
                                                        {projectId ? projects.find(p => p.id === projectId)?.title : "Vincular Proyecto (Opcional)"}
                                                    </span>
                                                </div>
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                                    <ChevronDown size={14} className="text-white/30 group-hover:text-white/50" />
                                                </div>
                                            </button>

                                            {isProjectPickerOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-[998]" onClick={() => setProjectPickerOpen(false)} />
                                                    <div className="absolute bottom-full left-0 mb-2 w-full bg-[#1c1c1e] rounded-xl border border-white/10 shadow-2xl z-[999] max-h-[200px] overflow-y-auto p-1 animate-in slide-in-from-bottom-2">
                                                        <button 
                                                            onClick={() => { setProjectId(''); setProjectPickerOpen(false); }}
                                                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left"
                                                        >
                                                            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center"><X size={12} className="text-white/50" /></div>
                                                            <span className="text-xs font-bold text-white/50">{t('habits.noProject', 'No Project')}</span>
                                                        </button>
                                                        {projects.map(p => {
                                                            const attr = attributes.find(a => a.id === p.attribute);
                                                            return (
                                                                <button 
                                                                    key={p.id} 
                                                                    onClick={() => { setProjectId(p.id); setProjectPickerOpen(false); }}
                                                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left"
                                                                >
                                                                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: attr?.color || '#333' }}>
                                                                        <Target size={12} className="text-white" />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-white truncate">{p.title}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Footer / Create Button */}
                    <div className="p-3 mt-auto border-t border-white/5 flex flex-col gap-3">
                        {/* Stats Preview - Shows when valid AND reminder set (Alarm) */}
                        <AnimatePresence>
                            {canSubmit && reminder && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="flex justify-center gap-2 flex-wrap"
                                >
                                    {/* XP */}
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                        <Zap size={10} className="text-yellow-400" />
                                        <span className="text-[9px] font-black text-white">{prediction.xp} XP</span>
                                    </div>
                                    
                                    {/* Gold */}
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                                        <span className="text-[9px] font-black text-white">{prediction.coins} G</span>
                                    </div>

                                    {/* Trait XP */}
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                        <TraitIcon size={10} style={{ color: selectedAttr?.color || '#3b82f6' }} />
                                        <span className="text-[9px] font-black text-white">+{prediction.traitXp} {activeLabel}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <button 
                            disabled={!canSubmit || isSubmitting}
                            onClick={handleConfirm}
                            className={`w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${(!canSubmit || isSubmitting) ? 'bg-white/5 text-white/20' : 'text-white shadow-xl active:scale-95 border border-white/20 hover:shadow-2xl hover:border-white/40'}`}
                            style={{
                                background: (!canSubmit || isSubmitting) 
                                    ? undefined 
                                    : `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
                                boxShadow: (!canSubmit || isSubmitting) 
                                    ? undefined 
                                    : `0 8px 20px -4px ${activeColor}60, inset 0 1px 0 0 rgba(255,255,255,0.3)`
                            }}
                        >
                            {isSubmitting ? (
                                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                            ) : (
                                initialData ? t('modals.habit.update') : t('modals.habit.create')
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}, (prev, next) => prev.isOpen === next.isOpen && prev.initialData === next.initialData);
