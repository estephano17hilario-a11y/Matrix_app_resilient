import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { X, Plus, CheckCircle2, Hash, List, ChevronDown, Star, Target, Zap, AlertCircle, Calendar, Palette, Trash2, GripVertical, Sliders } from 'lucide-react';
import { Attribute, Habit, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { getWeekStartDay } from '../../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { IconPicker } from './IconPicker';
import { DurationPicker } from './DurationPicker';
import { TimePicker } from '../../../components/ui/TimePicker';
import { usePermissions } from '../../../hooks/usePermissions';

export const HabitModal = React.memo(({ isOpen, onClose, attributes = [], projects = [], onConfirm, initialData, onSwitchToBadHabit }: { isOpen: boolean, onClose: () => void, attributes?: Attribute[], smartProjects?: SmartProject[], projects?: Project[], onConfirm: (data: Partial<Habit>) => Promise<void> | void, initialData?: Habit & { _initialTab?: 'alarm' | 'checklist', _targetSubtaskId?: string }, onSwitchToBadHabit?: () => void }) => {
    const { t } = useTranslation();
    useEffect(() => {
        console.log("🟢 [HabitModal LifeCycle] HabitModal mounted!");
        return () => {
            console.log("🔴 [HabitModal LifeCycle] HabitModal UNMOUNTED!");
        };
    }, []);

    console.log(`🌀 [HabitModal LifeCycle] HabitModal rendering (isOpen: ${isOpen})`);
    const { permissions, requestPermissions, openSystemSettings } = usePermissions();
    const [expandedBlock, setExpandedBlock] = useState<1 | 2 | 3>(1);
    
    // Block 1: Identity
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('DISCIPLINA');
    const [customColor, setCustomColor] = useState<string | undefined>(undefined);
    const [customIconName, setCustomIconName] = useState<string | null>(null);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [subAttrId, setSubAttrId] = useState('');
    const [isSubAttrPickerOpen, setSubAttrPickerOpen] = useState(false);

    // Block 2: Mechanics
    const [freq, setFreq] = useState('DAILY');
    const [weekDays, setWeekDays] = useState<number[]>([]);
    const [weeklyType, setWeeklyType] = useState<'SPECIFIC_DAYS' | 'FLEXIBLE_COUNT'>('SPECIFIC_DAYS');
    const [weeklyFlexibleCount, setWeeklyFlexibleCount] = useState<number | string>(1);
    const [monthlyType, setMonthlyType] = useState<'SPECIFIC_DATES' | 'FLEXIBLE_COUNT'>('SPECIFIC_DATES');
    const [monthlyFlexibleCount, setMonthlyFlexibleCount] = useState<number | string>(1);
    const [monthlyLastDay, setMonthlyLastDay] = useState<boolean>(false);
    const [logic, setLogic] = useState<'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN'>('BOOLEAN');
    const [target, setTarget] = useState('');
    const [unit, setUnit] = useState('');
    const [isDivided, setIsDivided] = useState(false);
    const [dividedMode, setDividedMode] = useState<'INTERVAL' | 'FIXED'>('INTERVAL');
    const [dividedTimes, setDividedTimes] = useState<{ time: string; amount: number; id: string }[]>([]);
    const [dividedQuantity, setDividedQuantity] = useState('1');
    const [dividedInterval, setDividedInterval] = useState('90');
    const [subtasks, setSubtasks] = useState<{ 
        id: string; 
        text: string; 
        completed: boolean; 
        color?: string; 
        days?: number[]; 
        reminderTime?: string;
        intervalType?: 'WEEKLY' | 'MONTHLY' | 'NONE';
        intervalCount?: number;
        allowSkip?: boolean;
    }[]>([]);
    const [openMenu, setOpenMenu] = useState<{id: string, type: 'COLOR' | 'DAYS' | 'TIME'} | null>(null);
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
            
            if (initialData) {
                setTitle(initialData.title || '');
                setDesc(initialData.description || '');
                setAttrId(initialData.attribute || '');
                setSmartProjectId(initialData.projectId || '');
                setFreq(initialData.frequency || 'DAILY');
                setWeekDays(initialData.frequencyDays || []);
                setWeeklyType(initialData.weeklyType || 'SPECIFIC_DAYS');
                setWeeklyFlexibleCount(initialData.weeklyFlexibleCount || 1);
                setMonthlyType(initialData.monthlyType || 'SPECIFIC_DATES');
                setMonthlyFlexibleCount(initialData.monthlyFlexibleCount || 1);
                setMonthlyLastDay(initialData.monthlyLastDay || false);
                setLogic(initialData.type || 'BOOLEAN');
                setTarget(initialData.targetValue?.toString() || '');
                setUnit(initialData.unit || '');
                setIsDivided(initialData.isDivided || false);
                setDividedMode(initialData.dividedMode || 'INTERVAL');
                setDividedTimes(initialData.dividedTimes || []);
                setDividedQuantity(initialData.dividedQuantity?.toString() || '1');
                setDividedInterval(initialData.dividedInterval?.toString() || '90');
                setSubtasks(initialData.checklist || []);
                setReminder(initialData.reminderTime || '');
                setEstimatedTime(initialData.estimatedTime || 0);
                setCustomColor(initialData.customColor);
                setCustomIconName(initialData.iconName || null);
                setImpact(initialData.impact || 1);
                setSubAttrId(initialData.subAttribute || '');
                
                // Handle direct navigation requests from Dashboard (Chronological view)
                if (initialData._initialTab === 'alarm') {
                    setExpandedBlock(3);
                } else if (initialData._initialTab === 'checklist') {
                    setExpandedBlock(2);
                    if (initialData._targetSubtaskId) {
                        setOpenMenu({ id: initialData._targetSubtaskId, type: 'TIME' });
                    }
                } else {
                    setExpandedBlock(1);
                }
                
                // Try to infer impact/difficulty if not present
            } else {
                setExpandedBlock(1);
                // Reset
                setTitle('');
                setDesc('');
                setAttrId('DISCIPLINA');
                setSmartProjectId('');
                setProjectId('');
                setEstimatedTime(0);
                setFreq('DAILY');
                setWeekDays([]);
                setWeeklyType('SPECIFIC_DAYS');
                setWeeklyFlexibleCount(1);
                setMonthlyType('SPECIFIC_DATES');
                setMonthlyFlexibleCount(1);
                setMonthlyLastDay(false);
                setLogic('BOOLEAN');
                setTarget('');
                setUnit('');
                setIsDivided(false);
                setDividedMode('INTERVAL');
                setDividedTimes([]);
                setDividedQuantity('1');
                setDividedInterval('90');
                setSubtasks([]);
                setReminder('');
                setImpact(1);
                setCustomColor(undefined);
                setCustomIconName(null);
                setSubAttrId('');
            }
        }
    }, [isOpen, initialData]);

    // Reset subAttrId only when attribute is manually changed or reset, not automatically on mount/populate

    // Smart Auto-linking by Keywords in title
    useEffect(() => {
        if (!title || initialData?.attribute) return;
        
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
    }, [title, attributes, initialData]);

    const selectedAttr = (attributes || []).find((a) => a.id === attrId);
    const activeColor = customColor || (selectedAttr ? selectedAttr.color : '#3b82f6');
    const hasColorSource = !!attrId || !!customColor;
    const TraitIcon = useMemo(() => {
        if (!selectedAttr) return Star;
        const iconName = selectedAttr.iconName;
        if (iconName && (LucideIcons as any)[iconName]) {
            return (LucideIcons as any)[iconName];
        }
        const icon = selectedAttr.icon;
        if (icon) {
            if (typeof icon === 'function') return icon;
            if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) return icon;
        }
        return Star;
    }, [selectedAttr]);

    const SelectedIcon = useMemo(() => {
        if (customIconName && (LucideIcons as any)[customIconName]) {
            return (LucideIcons as any)[customIconName];
        }
        return TraitIcon;
    }, [customIconName, TraitIcon]);

    const activeLabel = selectedAttr && selectedAttr.label
        ? t(selectedAttr.label, typeof selectedAttr.label === 'string' ? selectedAttr.label.replace('traits.', '') : '')
        : 'Trait';

    const weekDaysRawResult = t('common.weekdays.initials', { returnObjects: true });
    const weekDaysRaw = Array.isArray(weekDaysRawResult) ? weekDaysRawResult : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const weekStart = getWeekStartDay();
    const weekDaysList = useMemo(() => {
        return weekStart === 1 
            ? [...weekDaysRaw.slice(1).map((l, i) => ({ label: l, index: i + 1 })), { label: weekDaysRaw[0], index: 0 }]
            : weekDaysRaw.map((l, i) => ({ label: l, index: i }));
    }, [weekDaysRaw, weekStart]);

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
    const isBlock1Valid = title.trim() !== '' && attrId !== '';
    const isBlock2Valid = (() => {
        if (freq === 'WEEKLY') {
            if (weeklyType === 'SPECIFIC_DAYS' && weekDays.length === 0) return false;
            if (weeklyType === 'FLEXIBLE_COUNT' && (!weeklyFlexibleCount || Number(weeklyFlexibleCount) < 1)) return false;
        }
        if (freq === 'MONTHLY') {
            if (monthlyType === 'SPECIFIC_DATES' && weekDays.length === 0 && !monthlyLastDay) return false;
            if (monthlyType === 'FLEXIBLE_COUNT' && (!monthlyFlexibleCount || Number(monthlyFlexibleCount) < 1)) return false;
        }
        if (logic === 'QUANTITY') {
            if (!target || isNaN(parseInt(target)) || parseInt(target) <= 0) return false;
            if (isDivided) {
                if (dividedMode === 'INTERVAL') {
                    if (!dividedQuantity || isNaN(parseInt(dividedQuantity)) || parseInt(dividedQuantity) <= 0) return false;
                    if (!dividedInterval || isNaN(parseInt(dividedInterval)) || parseInt(dividedInterval) <= 0) return false;
                } else {
                    if (dividedTimes.length === 0) return false;
                    const totalDivided = dividedTimes.reduce((sum, t) => sum + t.amount, 0);
                    if (totalDivided !== parseInt(target)) return false;
                }
            }
        }
        if (logic === 'CHECKLIST' && subtasks.length === 0 && !newSubtask.trim()) return false;
        return true;
    })();
    // When editing an existing habit, alarm is optional (may predate requirement)
    // When creating a new habit, alarm is required
    const isBlock3Valid = !!initialData?.id ? true : reminder !== ''; 

    const canSubmit = isBlock1Valid && isBlock2Valid && isBlock3Valid;

    const handleBlockChange = (block: 1 | 2 | 3) => {
        if (expandedBlock === 1 && !isBlock1Valid) return;
        
        // Auto-add subtask if logic is checklist and there's a pending task
        if (expandedBlock === 2 && logic === 'CHECKLIST' && newSubtask.trim()) {
            const defaultDays = freq === 'WEEKLY' ? weekDays : freq === 'MONTHLY' ? [] : undefined;
            setSubtasks([...subtasks, { id: Date.now().toString(), text: newSubtask.trim(), completed: false, days: defaultDays }]);
            setNewSubtask('');
            // Allow the state update to propagate before blocking
            setTimeout(() => setExpandedBlock(block), 0);
            return;
        }
        
        if (block === 3 && (!isBlock1Valid || !isBlock2Valid)) return; 
        
        setExpandedBlock(block);
    };

    const handleConfirm = async () => {
        console.log(`🌀 [HabitModal API] handleConfirm clicked. title: "${title}", isSubmitting: ${isSubmitting}`);
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                title,
                description: desc,
                attribute: attrId,
                type: logic,
                frequency: freq,
                frequencyDays: (freq === 'WEEKLY' || freq === 'MONTHLY') ? weekDays : undefined,
                weeklyType: freq === 'WEEKLY' ? weeklyType : undefined,
                weeklyFlexibleCount: freq === 'WEEKLY' ? (typeof weeklyFlexibleCount === 'number' ? weeklyFlexibleCount : parseInt(weeklyFlexibleCount) || 1) : undefined,
                monthlyType: freq === 'MONTHLY' ? monthlyType : undefined,
                monthlyFlexibleCount: freq === 'MONTHLY' ? (typeof monthlyFlexibleCount === 'number' ? monthlyFlexibleCount : parseInt(monthlyFlexibleCount) || 1) : undefined,
                monthlyLastDay: freq === 'MONTHLY' ? monthlyLastDay : undefined,
                targetValue: logic === 'QUANTITY' ? parseInt(target) : 1,
                unit: unit || undefined,
                isDivided: logic === 'QUANTITY' ? isDivided : false,
                dividedMode: logic === 'QUANTITY' && isDivided ? dividedMode : undefined,
                dividedQuantity: logic === 'QUANTITY' && isDivided && dividedMode === 'INTERVAL' ? parseInt(dividedQuantity) : undefined,
                dividedInterval: logic === 'QUANTITY' && isDivided && dividedMode === 'INTERVAL' ? parseInt(dividedInterval) : undefined,
                dividedTimes: logic === 'QUANTITY' && isDivided && dividedMode === 'FIXED' ? dividedTimes : undefined,
                checklist: logic === 'CHECKLIST' ? subtasks : [],
                reminderTime: reminder || undefined,
                estimatedTime,
                customColor,
                iconName: customIconName || undefined,
                impact,
                projectId: projectId || undefined,
                smartProjectId: smartProjectId || undefined,
                subAttribute: (subAttrId || null) as any,
                ...(initialData?.id ? { id: initialData.id } : {})
            });
            onClose();
        } catch (error) {
            console.error("Failed to save habit", error);
            setIsSubmitting(false);
        }
    };

    // To prevent mobile ghost clicks from closing the modal immediately after mounting,
    // we track if the touch/click actually started (via touchstart/mousedown) on this backdrop.
    // Ghost clicks do not trigger touchstart/mousedown on the newly mounted backdrop.
    const backdropTouchStartedRef = React.useRef(false);

    const handleBackdropTouchStart = () => {
        console.log("🌀 [HabitModal UI] Backdrop touch/mousedown started.");
        backdropTouchStartedRef.current = true;
    };

    const handleClose = () => {
        console.log("🌀 [HabitModal UI] handleClose invoked. Calling onClose().");
        onClose();
    };

    const handleBackdropClick = () => {
        console.log(`🌀 [HabitModal UI] Backdrop click event fired. touchStarted: ${backdropTouchStartedRef.current}`);
        if (!backdropTouchStartedRef.current) {
            console.log("🌀 [HabitModal UI] Ignoring ghost backdrop click.");
            return;
        }
        backdropTouchStartedRef.current = false;
        if (!isSubmitting) {
            console.log("🌀 [HabitModal UI] Backdrop click valid. Invoking handleClose().");
            handleClose();
        }
    };

    if (typeof document === 'undefined' || !document.body) return null;

    return createPortal(
        <div className={cn("fixed inset-0 z-[99999] flex items-center justify-center p-4", isOpen ? "pointer-events-auto" : "pointer-events-none")}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                    <div 
                        className="absolute inset-0 bg-black/60" 
                        onTouchStart={handleBackdropTouchStart}
                        onMouseDown={handleBackdropTouchStart}
                        onClick={handleBackdropClick} 
                    />
                    <motion.div 
                        initial={{ scale: 0.95, y: 10, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 10, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative z-10 w-full max-w-[360px]"
                    >
                <div 
                    className="rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] relative bg-[#0a0a0a] transition-all duration-200 ease-out"
                    style={{
                        border: `1px solid ${hasColorSource ? activeColor : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: hasColorSource
                            ? `0 0 0 1px ${activeColor}40, 0 8px 32px -8px rgba(0,0,0,0.8)`
                            : `0 20px 50px -10px rgba(0,0,0,0.8)`
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 pb-2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-200" style={{ background: activeColor }}>
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
                                        data-tour="habit-modal-vice-switch"
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
                            "rounded-[1.5rem] border transition-all duration-200 overflow-hidden",
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
                                <ChevronDown size={14} className={cn("transition-transform duration-200 text-white/30", expandedBlock === 1 && "rotate-180")} />
                            </button>
                            
                                {expandedBlock === 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="px-3 pb-3 space-y-2 overflow-hidden"
                                    >
                                        {/* Title */}
                                        <div className="bg-black/20 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-all">
                                            <input 
                                                type="text" 
                                                value={title} 
                                                maxLength={15}
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
                                                        <span className="text-xs font-bold text-white">{selectedAttr && selectedAttr.label ? t(selectedAttr.label, typeof selectedAttr.label === 'string' ? selectedAttr.label.replace('traits.', '') : '') : ''}</span>
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
                                                        initial={{ opacity: 0, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -4 }}
                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="grid grid-cols-2 gap-2 p-2 bg-[#1c1c1e]/50 rounded-xl border border-white/10">
                                                            {Array.isArray(attributes) && attributes.map((attr) => {
                                                                if (!attr) return null;
                                                                const Icon = (() => {
                                                                    const iconName = attr.iconName;
                                                                    if (iconName && (LucideIcons as any)[iconName]) {
                                                                        return (LucideIcons as any)[iconName];
                                                                    }
                                                                    const icon = attr.icon;
                                                                    if (icon) {
                                                                        if (typeof icon === 'function') return icon;
                                                                        if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) return icon;
                                                                    }
                                                                    return Star;
                                                                })();
                                                                const isSelected = attrId === attr.id;
                                                                return (
                                                                    <button 
                                                                        key={attr.id} 
                                                                        onClick={(e) => { 
                                                                            e.stopPropagation(); 
                                                                            if (attr.id !== attrId) {
                                                                                setAttrId(attr.id); 
                                                                                setSubAttrId('');
                                                                            }
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
                                                                        {attr.label ? t(attr.label, typeof attr.label === 'string' ? attr.label.replace('traits.', '') : '') : ''}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Sub-Trait Picker */}
                                        {selectedAttr?.subTraits && selectedAttr.subTraits.length > 0 && (
                                            <div className="space-y-1 animate-in slide-in-from-top-1 fade-in">
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-wider block px-1">
                                                    {t('habits.subTrait', 'Sub-Rasgo')}
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
                                                                <span className="text-white/20">{t('habits.selectSubTraitOptional', 'Seleccionar Sub-Rasgo (Opcional)')}</span>
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
                                                                    {t('common.none', 'Ninguno')}
                                                                </button>
                                                                {selectedAttr.subTraits.map(st => (
                                                                    <button
                                                                        key={st.id}
                                                                        type="button"
                                                                        onClick={() => { setSubAttrId(st.id); setSubAttrPickerOpen(false); }}
                                                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                                                                    >
                                                                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                                                            {st.iconName && (LucideIcons as any)[st.iconName] ? React.createElement((LucideIcons as any)[st.iconName], { size: 12 }) : <LucideIcons.Hexagon size={12} />}
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
                        </div>

                        {/* BLOCK 2: MECÁNICA */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-200 overflow-hidden",
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
                                <ChevronDown size={14} className={cn("transition-transform duration-200 text-white/30", expandedBlock === 2 && "rotate-180")} />
                            </button>

                                {expandedBlock === 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="px-3 pb-3 space-y-3 overflow-hidden"
                                    >
                                        {/* Frequency */}
                                        <div className="bg-black/20 rounded-xl p-1 flex">
                                            {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                                <button 
                                                    key={f} 
                                                    onClick={() => {
                                                        if (f !== freq) {
                                                            setWeekDays([]);
                                                        }
                                                        setFreq(f);
                                                    }} 
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
                                            <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 fade-in p-2 bg-black/20 rounded-xl border border-white/5">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setWeeklyType('SPECIFIC_DAYS')}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[9px] font-black tracking-wide transition-all border",
                                                            weeklyType === 'SPECIFIC_DAYS' ? "bg-white/10 text-white border-white/20 shadow-sm" : "bg-transparent border-transparent text-slate-500 hover:text-white"
                                                        )}
                                                    >
                                                        {t('habits.specificDays', 'SPECIFIC DAYS')}
                                                    </button>
                                                    <button
                                                        onClick={() => setWeeklyType('FLEXIBLE_COUNT')}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[9px] font-black tracking-wide transition-all border",
                                                            weeklyType === 'FLEXIBLE_COUNT' ? "bg-white/10 text-white border-white/20 shadow-sm" : "bg-transparent border-transparent text-slate-500 hover:text-white"
                                                        )}
                                                    >
                                                        {t('habits.flexibleCount', 'FLEXIBLE COUNT')}
                                                    </button>
                                                </div>

                                                {weeklyType === 'SPECIFIC_DAYS' ? (
                                                    <div className="flex justify-between gap-1">
                                                        {weekDaysList.map(({ label, index }) => {
                                                            const isSelected = weekDays.includes(index);
                                                            return (
                                                                <button 
                                                                    key={index} 
                                                                    onClick={() => setWeekDays(prev => isSelected ? prev.filter(d => d !== index) : [...prev, index])} 
                                                                    className={cn(
                                                                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border",
                                                                        isSelected ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                                                    )}
                                                                >
                                                                    {label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                                                        <span className="text-xs font-bold text-white/70">{t('habits.timesPerWeek', 'Times per week')}:</span>
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            max="7" 
                                                            value={weeklyFlexibleCount} 
                                                            onChange={(e) => {
                                                                if (e.target.value === '') {
                                                                    setWeeklyFlexibleCount('');
                                                                } else {
                                                                    setWeeklyFlexibleCount(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)));
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (weeklyFlexibleCount === '') setWeeklyFlexibleCount(1);
                                                            }}
                                                            className="w-16 h-8 bg-black/40 rounded-lg text-center text-xs font-bold text-white outline-none border border-white/10 focus:border-white/30"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}


                                        {freq === 'MONTHLY' && (
                                            <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 fade-in p-2 bg-black/20 rounded-xl border border-white/5">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setMonthlyType('SPECIFIC_DATES')}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[9px] font-black tracking-wide transition-all border",
                                                            monthlyType === 'SPECIFIC_DATES' ? "bg-white/10 text-white border-white/20 shadow-sm" : "bg-transparent border-transparent text-slate-500 hover:text-white"
                                                        )}
                                                    >
                                                        {t('habits.specificDates', 'SPECIFIC DATES')}
                                                    </button>
                                                    <button
                                                        onClick={() => setMonthlyType('FLEXIBLE_COUNT')}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-[9px] font-black tracking-wide transition-all border",
                                                            monthlyType === 'FLEXIBLE_COUNT' ? "bg-white/10 text-white border-white/20 shadow-sm" : "bg-transparent border-transparent text-slate-500 hover:text-white"
                                                        )}
                                                    >
                                                        {t('habits.flexibleCount', 'FLEXIBLE COUNT')}
                                                    </button>
                                                </div>

                                                {monthlyType === 'SPECIFIC_DATES' ? (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-7 gap-1">
                                                            {Array.from({ length: 31 }).map((_, i) => {
                                                                const day = i + 1;
                                                                return (
                                                                    <button
                                                                        key={day}
                                                                        onClick={() => setWeekDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                                                        className={cn(
                                                                            "h-6 rounded flex items-center justify-center text-[9px] font-bold transition-all border",
                                                                            weekDays.includes(day) ? "bg-cyan-500 text-black border-cyan-400" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                                                        )}
                                                                    >
                                                                        {day}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <button
                                                            onClick={() => setMonthlyLastDay(!monthlyLastDay)}
                                                            className={cn(
                                                                "w-full py-1.5 rounded-lg text-[10px] font-bold transition-all border flex justify-center items-center gap-2",
                                                                monthlyLastDay ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className={cn("w-3 h-3 rounded-sm border flex items-center justify-center", monthlyLastDay ? "bg-cyan-500 border-cyan-400 text-black" : "border-slate-500")}>
                                                                {monthlyLastDay && <CheckCircle2 size={10} />}
                                                            </div>
                                                            {t('habits.lastDayOfMonth', 'Last day of month')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                                                        <span className="text-xs font-bold text-white/70">{t('habits.timesPerMonth', 'Times per month')}:</span>
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            max="31" 
                                                            value={monthlyFlexibleCount} 
                                                            onChange={(e) => {
                                                                if (e.target.value === '') {
                                                                    setMonthlyFlexibleCount('');
                                                                } else {
                                                                    setMonthlyFlexibleCount(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)));
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (monthlyFlexibleCount === '') setMonthlyFlexibleCount(1);
                                                            }}
                                                            className="w-16 h-8 bg-black/40 rounded-lg text-center text-xs font-bold text-white outline-none border border-white/10 focus:border-white/30"
                                                        />
                                                    </div>
                                                )}
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
                                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-black/20 rounded-xl p-2 border border-white/5">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1 ml-1">{t('modals.habit.target', 'Target')}</span>
                                                        <input type="number" placeholder="10" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-transparent text-lg font-bold text-white outline-none px-1" />
                                                    </div>
                                                    <div className="flex-1 bg-black/20 rounded-xl p-2 border border-white/5">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1 ml-1">{t('modals.habit.unit', 'Unit')}</span>
                                                        <input type="text" placeholder={t('habits.pagesPlaceholder', 'pages')} value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-lg font-bold text-white outline-none px-1" />
                                                    </div>
                                                </div>

                                                <label className="flex items-center gap-2 p-2 bg-black/20 rounded-xl border border-white/5 cursor-pointer mt-1">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isDivided}
                                                        onChange={(e) => setIsDivided(e.target.checked)}
                                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                                    />
                                                    <span className="text-xs font-bold text-white/70">{t('habits.divideMetaIntervals', 'Dividir meta en intervalos (Recordatorios automáticos)')}</span>
                                                </label>

                                                {isDivided && (
                                                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 mt-1">
                                                        <div className="flex items-center gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                                                            <button
                                                                onClick={() => setDividedMode('INTERVAL')}
                                                                className={cn("flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors", dividedMode === 'INTERVAL' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}
                                                            >
                                                                {t('habits.intervals', 'Intervalos')}
                                                            </button>
                                                            <button
                                                                onClick={() => setDividedMode('FIXED')}
                                                                className={cn("flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors", dividedMode === 'FIXED' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}
                                                            >
                                                                {t('habits.fixedSchedules', 'Horarios Fijos')}
                                                            </button>
                                                        </div>

                                                        {dividedMode === 'INTERVAL' ? (
                                                            <>
                                                                <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                                                                    <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-1 ml-1">{t('habits.quantityPerTime', 'Cantidad por vez')}</span>
                                                                    <div className="flex items-center">
                                                                        <input type="number" placeholder="1" value={dividedQuantity} onChange={e => setDividedQuantity(e.target.value)} className="w-full bg-transparent text-sm font-bold text-white outline-none px-1" />
                                                                        <span className="text-xs text-white/40">{unit}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                                                                    <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-1 ml-1">{t('habits.frequency', 'Frecuencia')}</span>
                                                                    <div className="flex items-center">
                                                                        <span className="text-xs text-white/40 mr-1">{t('common.every', 'Cada')}</span>
                                                                        <input type="number" placeholder="90" value={dividedInterval} onChange={e => setDividedInterval(e.target.value)} className="w-full bg-transparent text-sm font-bold text-white outline-none px-1" />
                                                                        <span className="text-xs text-white/40">{t('common.min', 'min')}</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-3">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Horarios Fijos ({dividedTimes.length})</span>
                                                                    <div className="px-2 py-1 rounded bg-black/40 border border-white/10 flex items-center gap-1.5">
                                                                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{t('common.totalColon', 'Total:')}</span>
                                                                        <span className={cn("text-xs font-black", dividedTimes.reduce((sum, t) => sum + t.amount, 0) > parseInt(target || '0') ? "text-red-400" : dividedTimes.reduce((sum, t) => sum + t.amount, 0) === parseInt(target || '0') ? "text-emerald-400" : "text-white")}>
                                                                            {dividedTimes.reduce((sum, t) => sum + t.amount, 0)} <span className="text-white/30">/</span> {target || 0}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="space-y-2">
                                                                    {dividedTimes.map((item) => (
                                                                        <div key={item.id} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl p-2 relative group">
                                                                            <div className="flex-1 flex items-center gap-3">
                                                                                <div className="flex-1">
                                                                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-1">{t('common.hour', 'Hora')}</span>
                                                                                    <TimePicker 
                                                                                        value={item.time}
                                                                                        onChange={(val) => {
                                                                                            const newTimes = dividedTimes.map(t => t.id === item.id ? { ...t, time: val } : t);
                                                                                            setDividedTimes(newTimes);
                                                                                        }}
                                                                                        className="text-sm font-bold text-white z-10 relative bg-black/40 border border-white/10 rounded-lg w-full h-9 flex items-center justify-center"
                                                                                    />
                                                                                </div>
                                                                                <div className="w-px h-8 bg-white/10" />
                                                                                <div className="w-20">
                                                                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block mb-1">{t('common.qty', 'Cant.')}</span>
                                                                                    <input 
                                                                                        type="number"
                                                                                        value={item.amount || ''}
                                                                                        onChange={(e) => {
                                                                                            const newAmount = parseInt(e.target.value) || 0;
                                                                                            setDividedTimes(dividedTimes.map(t => t.id === item.id ? { ...t, amount: newAmount } : t));
                                                                                        }}
                                                                                        className="w-full bg-black/40 text-sm font-bold text-emerald-400 px-2 h-9 rounded-lg outline-none border border-white/10 text-center"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <button 
                                                                                onClick={() => setDividedTimes(dividedTimes.filter(t => t.id !== item.id))} 
                                                                                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        const currentTotal = dividedTimes.reduce((sum, t) => sum + t.amount, 0);
                                                                        const maxTarget = parseInt(target || '0');
                                                                        const remaining = Math.max(0, maxTarget - currentTotal);
                                                                        
                                                                        if (remaining > 0) {
                                                                            const newTimes = [...dividedTimes, { id: Date.now().toString(), time: '12:00', amount: remaining }];
                                                                            newTimes.sort((a, b) => a.time.localeCompare(b.time));
                                                                            setDividedTimes(newTimes);
                                                                        }
                                                                    }}
                                                                    disabled={dividedTimes.reduce((sum, t) => sum + t.amount, 0) >= parseInt(target || '0')}
                                                                    className="w-full py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/20 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                                                                >
                                                                    <Plus size={14} strokeWidth={3} />
                                                                    {t('habits.addSchedule', 'Añadir Horario')}
                                                                </button>
                                                                
                                                                <span className={cn("text-[10px] block text-center mt-2 font-medium", dividedTimes.reduce((sum, t) => sum + t.amount, 0) > parseInt(target || '0') ? "text-red-400" : "text-white/40")}>
                                                                    {dividedTimes.reduce((sum, t) => sum + t.amount, 0) > parseInt(target || '0') 
                                                                        ? `Límite excedido por ${dividedTimes.reduce((sum, t) => sum + t.amount, 0) - parseInt(target || '0')} ${unit}`
                                                                        : dividedTimes.reduce((sum, t) => sum + t.amount, 0) < parseInt(target || '0') 
                                                                            ? `Faltan asignar ${parseInt(target || '0') - dividedTimes.reduce((sum, t) => sum + t.amount, 0)} ${unit}`
                                                                            : '✨ Objetivo completamente asignado'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
                                                                        onClick={() => setOpenMenu(prev => (prev?.id === task.id && prev?.type === 'TIME') ? null : { id: task.id, type: 'TIME' })}
                                                                        className={cn("p-1.5 rounded hover:bg-white/10 transition-colors", task.reminderTime ? "text-orange-400" : "text-white/30 hover:text-white")}
                                                                    >
                                                                        <AlertCircle size={12} />
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
                                                                        initial={{ opacity: 0, y: -4 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -4 }}
                                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                                        className="border-t border-white/5 bg-black/20 overflow-hidden"
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
                                                                            <div className="p-3 space-y-3">
                                                                                {/* Weekdays row */}
                                                                                <div className={cn("flex justify-between transition-opacity", (task.intervalType && task.intervalType !== 'NONE') ? "opacity-30 pointer-events-none" : "opacity-100")}>
                                                                                    {weekDaysList.map(({ label, index }) => {
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

                                                                                {/* Intervals Section if active */}
                                                                                {task.intervalType && task.intervalType !== 'NONE' && (
                                                                                    <div className="space-y-3 p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-left">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Intervalo:</span>
                                                                                            <div className="flex gap-1">
                                                                                                <button
                                                                                                    onClick={() => setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, intervalType: 'WEEKLY', intervalCount: Math.min(t.intervalCount || 3, 6) } : t))}
                                                                                                    className={cn("px-2 py-0.5 rounded text-[9px] font-bold border transition-all", task.intervalType === 'WEEKLY' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 border-transparent text-white/40")}
                                                                                                >
                                                                                                    Semanal
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, intervalType: 'MONTHLY', intervalCount: t.intervalCount || 10 } : t))}
                                                                                                    className={cn("px-2 py-0.5 rounded text-[9px] font-bold border transition-all", task.intervalType === 'MONTHLY' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 border-transparent text-white/40")}
                                                                                                >
                                                                                                    Mensual
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                                                {task.intervalType === 'WEEKLY' ? 'Veces por semana:' : 'Veces al mes:'}
                                                                                            </span>
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const count = Math.max(1, (task.intervalCount || 1) - 1);
                                                                                                        setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, intervalCount: count } : t));
                                                                                                    }}
                                                                                                    className="w-5 h-5 rounded bg-white/5 text-white/60 hover:bg-white/10 flex items-center justify-center font-bold text-xs"
                                                                                                >
                                                                                                    -
                                                                                                </button>
                                                                                                <span className="text-xs font-bold text-white min-w-[12px] text-center">
                                                                                                    {task.intervalCount || (task.intervalType === 'WEEKLY' ? 3 : 10)}
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const maxLimit = task.intervalType === 'WEEKLY' ? 6 : 31;
                                                                                                        const count = Math.min(maxLimit, (task.intervalCount || 1) + 1);
                                                                                                        setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, intervalCount: count } : t));
                                                                                                    }}
                                                                                                    className="w-5 h-5 rounded bg-white/5 text-white/60 hover:bg-white/10 flex items-center justify-center font-bold text-xs"
                                                                                                >
                                                                                                    +
                                                                                                </button>
                                                                                                {task.intervalType === 'WEEKLY' && (
                                                                                                    <span className="text-[8px] text-white/30 italic">(máx. 6)</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* Toggle Intervals Button at bottom */}
                                                                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                                                    <button 
                                                                                        onClick={() => {
                                                                                            const isCurrentlyInterval = task.intervalType && task.intervalType !== 'NONE';
                                                                                            setSubtasks(subtasks.map(t => t.id === task.id ? { 
                                                                                                ...t, 
                                                                                                intervalType: isCurrentlyInterval ? 'NONE' : 'WEEKLY',
                                                                                                intervalCount: isCurrentlyInterval ? undefined : 3,
                                                                                                days: isCurrentlyInterval ? undefined : undefined
                                                                                            } : t));
                                                                                        }}
                                                                                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors uppercase tracking-wider"
                                                                                    >
                                                                                        <Sliders size={10} />
                                                                                        {task.intervalType && task.intervalType !== 'NONE' ? "Días de la semana" : "Intervalos"}
                                                                                    </button>

                                                                                    {task.intervalType && task.intervalType !== 'NONE' && (
                                                                                        <button
                                                                                            onClick={() => setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, allowSkip: !t.allowSkip } : t))}
                                                                                            className={cn("px-2 py-1 rounded text-[9px] font-bold border transition-all flex items-center gap-1", task.allowSkip ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse" : "bg-white/5 border-transparent text-white/40")}
                                                                                        >
                                                                                            Permitir salteo
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {openMenu.type === 'TIME' && (
                                                                            <div className="flex items-center justify-between p-3">
                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{t('habits.optionalAlarm', 'Alarma Opcional')}</span>
                                                                                <div className="relative">
                                                                                    <TimePicker 
                                                                                        value={task.reminderTime || ''}
                                                                                        onChange={(val) => {
                                                                                            setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, reminderTime: val } : t));
                                                                                            if (val && permissions.notifications !== 'granted') {
                                                                                                requestPermissions();
                                                                                            }
                                                                                        }}
                                                                                        className="text-xs font-bold text-white z-10 relative"
                                                                                    />
                                                                                </div>
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
                                                            "flex-1 rounded-full transition-all duration-200",
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
                                                disabled={!isBlock2Valid}
                                                className="px-6 py-2 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                            >
                                                {t('common.next', 'Next')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                        </div>

                        {/* BLOCK 3: COMPROMISO */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-200 overflow-hidden",
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
                                <ChevronDown size={14} className={cn("transition-transform duration-200 text-white/30", expandedBlock === 3 && "rotate-180")} />
                            </button>

                                {expandedBlock === 3 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="px-3 pb-3 space-y-3 overflow-hidden"
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
                                                    <TimePicker 
                                                        value={reminder}
                                                        onChange={(val) => {
                                                            setReminder(val);
                                                            if (val && permissions.notifications !== 'granted') {
                                                                requestPermissions();
                                                            }
                                                        }}
                                                        className="text-xs font-bold text-white z-10 relative min-w-[80px]"
                                                    />
                                                </div>
                                            </div>

                                            {/* Permission & Battery Checks */}
                                            <AnimatePresence>
                                                {reminder && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -4 }}
                                                        transition={{ duration: 0.15, ease: "easeOut" }}
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
                                                    <div className="absolute bottom-full left-0 mb-2 w-full bg-[#1c1c1e] rounded-xl border border-white/10 shadow-md z-[999] max-h-[200px] overflow-y-auto p-1 animate-in slide-in-from-bottom-2">
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
                                                                    onClick={() => { 
                                                                        setProjectId(p.id); 
                                                                        if (p.attribute) {
                                                                            setAttrId(p.attribute);
                                                                            setSubAttrId('');
                                                                        }
                                                                        setProjectPickerOpen(false); 
                                                                    }}
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
                        </div>
                    </div>

                    {/* Footer / Create Button */}
                    <div className="p-3 mt-auto border-t border-white/5 flex flex-col gap-3">
                        {/* Stats Preview - Shows when valid AND reminder set (Alarm) */}
                        <AnimatePresence>
                            {canSubmit && reminder && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
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
                            className={`w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 ${(!canSubmit || isSubmitting) ? 'bg-white/5 text-white/20' : 'text-white shadow-md active:scale-95 border border-white/20 hover:shadow-md hover:border-white/40'}`}
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
        </AnimatePresence>
        </div>,
        document.body
    );
}, (prev, next) => {
    if (!prev.isOpen && !next.isOpen) return true;
    return prev.isOpen === next.isOpen && prev.initialData === next.initialData;
});
