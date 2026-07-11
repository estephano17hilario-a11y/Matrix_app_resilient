import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Plus, Target, ChevronDown, ChevronUp, Hourglass, Bell, Calendar, Calculator, Loader2, CheckCircle2, Zap, Minus, Sliders } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Attribute, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { getWeekStartDay } from '../../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { usePermissions } from '../../../hooks/usePermissions';
import { TimePicker } from '../../../components/ui/TimePicker';
import { ColorPicker } from './ColorPicker';

export const ProjectModal = React.memo(({ isOpen, onClose, attributes = [], smartProjects, onConfirm, onDelete, initialData }: { isOpen: boolean, onClose: () => void, attributes?: Attribute[], smartProjects?: SmartProject[], onConfirm: (data: Partial<Project>) => Promise<void> | void, onDelete?: (projectId: string) => void, initialData?: Partial<Project> }) => {
    const { t } = useTranslation();
    useEffect(() => {
        console.log("🟢 [ProjectModal LifeCycle] ProjectModal mounted!");
        return () => {
            console.log("🔴 [ProjectModal LifeCycle] ProjectModal UNMOUNTED!");
        };
    }, []);

    console.log(`🌀 [ProjectModal LifeCycle] ProjectModal rendering (isOpen: ${isOpen})`);
    const { permissions, requestPermissions, openSystemSettings } = usePermissions();
    const [expandedBlock, setExpandedBlock] = useState<1 | 2 | 3>(1);

    // Block 1: Identity
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('DISCIPLINA');
    const [customColor, setCustomColor] = useState<string | undefined>(undefined);
    const [smartProjectId, setSmartProjectId] = useState('');
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);

    // Block 2: Mechanics (Goals)
    const [goalTarget, setGoalTarget] = useState(1);
    const [goalUnit, setGoalUnit] = useState<'HOURS' | 'MINUTES'>('HOURS');
    const [goalFreq, setGoalFreq] = useState('DAILY');
    const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
    const [monthlyType, setMonthlyType] = useState<'SPECIFIC_DATES' | 'FLEXIBLE_COUNT'>('SPECIFIC_DATES');
    const [monthlyFlexibleCount, setMonthlyFlexibleCount] = useState<number | string>(10);
    const [monthlyLastDay, setMonthlyLastDay] = useState(false);

    // Block 3: Commitment (Session)
    const [pomoDuration, setPomoDuration] = useState<number | string>(25);
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    
    const [focusRoutine, setFocusRoutine] = useState<any[]>([]);
    const [focusRoutineDays, setFocusRoutineDays] = useState<number[]>([]);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [timelineDuration, setTimelineDuration] = useState<number>(25);
    const [timelineStepType, setTimelineStepType] = useState<'FOCUS' | 'BREAK'>('FOCUS');
    const [timelineSubTrait, setTimelineSubTrait] = useState<string | undefined>(undefined);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Reset or Populate form on open
    useEffect(() => {
        if (isOpen) {
            setExpandedBlock(1);
            setIsSubmitting(false);
            if (initialData) {
                setTitle(initialData.title || '');
                setDesc(initialData.description || '');
                setAttrId(initialData.attribute || '');
                setCustomColor(initialData.color);
                setSmartProjectId(initialData.smartProjectId || '');
                
                // Frequency Restoration
                const freq = initialData.uiFrequency || initialData.goalFrequency || 'DAILY';
                setGoalFreq(freq);

                if (initialData.monthlyType) setMonthlyType(initialData.monthlyType);
                if (initialData.monthlyFlexibleCount) setMonthlyFlexibleCount(initialData.monthlyFlexibleCount);
                if (initialData.monthlyLastDay) setMonthlyLastDay(initialData.monthlyLastDay);

                // Target Restoration
                if (initialData.uiTarget) {
                    setGoalTarget(initialData.uiTarget);
                    setGoalUnit(initialData.uiUnit || 'HOURS');
                } else if (initialData.goalTarget) {
                    // Fallback logic for legacy projects
                    const days = initialData.workingDays?.length || 5;
                    if (freq === 'WEEKLY') {
                         setGoalTarget(Math.round((initialData.goalTarget * days) / 60));
                    } else if (freq === 'MONTHLY') {
                        // If legacy monthly, assume specific dates if workingDays exist and are > 6 (implying dates) or use simple division
                        // Actually legacy workingDays for monthly didn't exist properly, usually it was daily based.
                        // Let's just use the stored total / 60
                         setGoalTarget(Math.round((initialData.goalTarget * (initialData.workingDays?.length || 20)) / 60));
                    } else {
                         setGoalTarget(Math.round(initialData.goalTarget / 60));
                    }
                    setGoalUnit('HOURS');
                } else {
                    setGoalTarget(1);
                    setGoalUnit('HOURS');
                }

                setPomoDuration(initialData.pomoDuration || 25);
                setReminder(initialData.reminder || '');
                setImpact(initialData.impact || 1);
                if (initialData.workingDays) setWorkingDays(initialData.workingDays);
                setFocusRoutine(initialData.focusRoutine || []);
                setFocusRoutineDays(initialData.focusRoutineDays || []);
            } else {
                setTitle('');
                setDesc('');
                setAttrId('DISCIPLINA');
                setCustomColor(undefined);
                setSmartProjectId('');
                setGoalTarget(1);
                setGoalUnit('HOURS');
                setGoalFreq('DAILY');
                setWorkingDays([1, 2, 3, 4, 5]);
                setMonthlyType('SPECIFIC_DATES');
                setMonthlyFlexibleCount(10);
                setPomoDuration(25);
                setReminder('');
                setImpact(1);
                setFocusRoutine([]);
                setFocusRoutineDays([]);
            }
        }
    }, [isOpen, initialData]);

    const selectedAttr = attributes?.find((a) => a.id === attrId);
    const activeColor = customColor || (selectedAttr ? selectedAttr.color : '#3b82f6');
    const hasColorSource = !!attrId || !!customColor;
    const SelectedIcon = useMemo(() => {
        if (!selectedAttr) return Briefcase;
        const iconName = selectedAttr.iconName;
        if (iconName && (LucideIcons as any)[iconName]) {
            return (LucideIcons as any)[iconName];
        }
        const icon = selectedAttr.icon;
        if (icon) {
            if (typeof icon === 'function') return icon;
            if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) return icon;
        }
        return Briefcase;
    }, [selectedAttr]);
    const activeLabel = selectedAttr && selectedAttr.label 
        ? t(selectedAttr.label, typeof selectedAttr.label === 'string' ? selectedAttr.label.replace('traits.', '') : '') 
        : t('modals.project.traitDefault', 'Trait');

    const calculatedDailyGoal = useMemo(() => {
        // Normalize to hours for calculations
        const valueInHours = goalUnit === 'MINUTES' ? goalTarget / 60 : goalTarget;

        if (goalFreq === 'DAILY') return valueInHours;
        
        let daily = valueInHours;
        if (goalFreq === 'WEEKLY') {
            const daysCount = workingDays.length || 1;
            daily = valueInHours / daysCount;
        } else if (goalFreq === 'MONTHLY') {
            if (monthlyType === 'SPECIFIC_DATES') {
                // If last day is enabled, we consider it as effectively one more day in the "schedule"
                // But calculation-wise, if 31 is selected and Last Day is ON, it just means 31 maps to 28 in Feb.
                // It doesn't add an EXTRA day if 31 is already selected.
                // However, if 31 is NOT selected but Last Day IS, then it adds a day.
                // Simplified: The count is just workingDays.length + (lastDay && !workingDays.includes(31) ? 1 : 0) ?
                // Actually, let's keep it simple: Just divide by number of selected markers.
                // The user logic is: "I want to work on days 1, 15 and Last Day". That's 3 days.
                let count = workingDays.length;
                if (monthlyLastDay && !workingDays.includes(31)) {
                    // If last day is checked and 31 is NOT already selected (which usually represents last day in UI), add 1
                    // But usually 31 IS the last day visual.
                    // Let's assume the "Last Day" toggle is a modifier for the "31st" slot or a separate logical slot.
                    // User said: "Si marcas 29, 30, 31 no cuentan en febrero, solo si activas la opcion Ultimo Dia".
                    // So we should calculate based on a "Average Month" (30.4 days)? No, just use the count of "Intentions".
                    // If I mark 5 days, I intend to work 5 days.
                    count = workingDays.length + (monthlyLastDay ? 1 : 0);
                }
                const daysCount = count || 1;
                daily = valueInHours / daysCount;
            } else {
                // FLEXIBLE_COUNT
                daily = valueInHours / Number(monthlyFlexibleCount);
            }
        }
        
        // Round to 2 decimal places for better precision with minutes
        return Math.round(daily * 100) / 100;
    }, [goalTarget, goalFreq, workingDays, goalUnit, monthlyType, monthlyFlexibleCount]);

    const prediction = useMemo(() => {
        return calculateTaskRewards(calculatedDailyGoal * 60, impact, 0, 'PROJECT');
    }, [calculatedDailyGoal, impact]);

    const toggleDay = (dayIndex: number) => {
        setWorkingDays(prev => 
            prev.includes(dayIndex) 
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex].sort((a, b) => a - b)
        );
    };

    const handleConfirm = async () => {
        console.log(`🌀 [ProjectModal API] handleConfirm clicked. title: "${title}", isSubmitting: ${isSubmitting}`);
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        try {
            const isUpdate = !!initialData?.id;
            console.log(`[ProjectModal] Confirming. Mode: ${isUpdate ? 'UPDATE' : 'CREATE'}`, { initialData });

            // Optimistic UI: 0ms delay
            await onConfirm({ 
                id: isUpdate ? initialData!.id : undefined,
                title, 
                description: desc, 
                attribute: attrId, 
                color: customColor,
                goalTarget: calculatedDailyGoal * 60, // Save as minutes (User inputs Hours)
                goalFrequency: 'DAILY', // Always save as DAILY so the tracker works per day
                uiFrequency: goalFreq, // Store UI preference
                uiTarget: goalTarget, // Store UI input
                uiUnit: goalUnit, // Store UI Unit
                monthlyType: goalFreq === 'MONTHLY' ? monthlyType : undefined,
                monthlyFlexibleCount: goalFreq === 'MONTHLY' && monthlyType === 'FLEXIBLE_COUNT' ? (typeof monthlyFlexibleCount === 'number' ? monthlyFlexibleCount : parseInt(monthlyFlexibleCount) || 1) : undefined,
                pomoDuration: typeof pomoDuration === 'number' ? pomoDuration : parseInt(pomoDuration) || 25, 
                breakDuration: 5, 
                reminder, 
                impact,
                workingDays: goalFreq === 'DAILY' ? undefined : workingDays,
                smartProjectId: smartProjectId || undefined,
                focusRoutine,
                focusRoutineDays
            });
            onClose();
        } catch (error) {
            console.error("Failed to create project:", error);
            setIsSubmitting(false);
        }
    };

    const daysRawResult = t('modals.project.daysInitials', { returnObjects: true });
    const DAYS_RAW = Array.isArray(daysRawResult) ? daysRawResult : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const weekStart = getWeekStartDay();
    const DAYS = useMemo(() => {
        return weekStart === 1 
            ? [...DAYS_RAW.slice(1).map((l, i) => ({ label: l, index: i + 1 })), { label: DAYS_RAW[0], index: 0 }]
            : DAYS_RAW.map((l, i) => ({ label: l, index: i }));
    }, [DAYS_RAW, weekStart]);

    // Validation Logic
    const isBlock1Valid = title.trim() !== '' && attrId !== '';
    const isBlock2Valid = (() => {
        if (goalTarget <= 0) return false;
        if (goalFreq === 'DAILY') return true;
        if (goalFreq === 'WEEKLY') return workingDays.length > 0;
        if (goalFreq === 'MONTHLY') {
            if (monthlyType === 'SPECIFIC_DATES') return workingDays.length > 0 || monthlyLastDay;
            if (monthlyType === 'FLEXIBLE_COUNT') return Number(monthlyFlexibleCount) > 0;
        }
        return false;
    })();
    // When editing an existing project, alarm is optional; when creating, it is required
    const isBlock3Valid = typeof pomoDuration === 'number' && pomoDuration > 0 && (!!initialData?.id ? true : reminder !== '');

    const handleBlockChange = (block: 1 | 2 | 3) => {
        if (expandedBlock === 1 && !isBlock1Valid) return;
        if (block === 3 && (!isBlock1Valid || !isBlock2Valid)) return;
        setExpandedBlock(block);
    };

    // To prevent mobile ghost clicks from closing the modal immediately after mounting,
    // we track if the touch/click actually started (via touchstart/mousedown) on this backdrop.
    // Ghost clicks do not trigger touchstart/mousedown on the newly mounted backdrop.
    const backdropTouchStartedRef = React.useRef(false);

    const handleBackdropTouchStart = () => {
        console.log("🌀 [ProjectModal UI] Backdrop touch/mousedown started.");
        backdropTouchStartedRef.current = true;
    };

    const handleBackdropClick = () => {
        console.log(`🌀 [ProjectModal UI] Backdrop click event fired. touchStarted: ${backdropTouchStartedRef.current}`);
        if (!backdropTouchStartedRef.current) {
            console.log("🌀 [ProjectModal UI] Ignoring ghost backdrop click.");
            return;
        }
        backdropTouchStartedRef.current = false;
        if (!isSubmitting) {
            console.log("🌀 [ProjectModal UI] Backdrop click valid. Invoking onClose().");
            onClose();
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
                        className="relative z-10 w-full max-w-[400px]"
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
                    <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-200" style={{ background: activeColor }}>
                                <SelectedIcon size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">{initialData ? t('projects.editProject', 'Edit Project') : t('projects.newProject', 'New Project')}</h2>
                                <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-wider">{t('modals.project.subtitle')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"><X size={16} /></button>
                    </div>

                    <div ref={scrollContainerRef} className="overflow-y-auto no-scrollbar p-4 space-y-3">
                        
                        {/* BLOCK 1: IDENTIDAD */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-200 overflow-hidden",
                            expandedBlock === 1 
                                ? "bg-white/5 border-white/10" 
                                : "bg-transparent border-white/5 hover:bg-white/[0.02]"
                        )}>
                            <button 
                                onClick={() => handleBlockChange(1)}
                                className="w-full flex items-center justify-between p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 1 ? "bg-white text-black" : isBlock1Valid ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        {isBlock1Valid && expandedBlock !== 1 ? <CheckCircle2 size={14} /> : "1"}
                                    </div>
                                    <span className={cn("text-sm font-bold tracking-wide", expandedBlock === 1 ? "text-white" : "text-white/50")}>{t('habits.identity', 'IDENTITY')}</span>
                                </div>
                                <ChevronDown size={16} className={cn("transition-transform duration-200 text-white/30", expandedBlock === 1 && "rotate-180")} />
                            </button>
                            
                            <AnimatePresence initial={false}>
                                {expandedBlock === 1 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="px-4 pb-4 space-y-3"
                                    >
                                        {/* Title */}
                                        <div className="bg-black/20 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-all">
                                            <input 
                                                type="text" 
                                                value={title} 
                                                onChange={(e) => setTitle(e.target.value)} 
                                                placeholder={t('modals.project.namePlaceholder')} 
                                                className="w-full h-10 bg-transparent px-3 text-sm font-bold text-white placeholder:text-white/20 outline-none" 
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="bg-black/20 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-all">
                                            <input 
                                                type="text" 
                                                value={desc} 
                                                onChange={(e) => setDesc(e.target.value)} 
                                                placeholder={t('modals.project.descPlaceholder')} 
                                                className="w-full h-10 bg-transparent px-3 text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" 
                                            />
                                        </div>

                                        {/* Trait Picker */}
                                        <div className="flex flex-col gap-2">
                                            <div 
                                                onClick={() => setAttrPickerOpen(!isAttrPickerOpen)} 
                                                className={cn(
                                                    "w-full h-12 rounded-xl border flex items-center px-3 gap-3 cursor-pointer transition-all relative",
                                                    attrId ? "bg-white/5 border-white/10" : "bg-black/20 border-dashed border-white/10 hover:border-white/30"
                                                )}
                                            >
                                                {attrId ? (
                                                    <>
                                                        <SelectedIcon size={18} style={{ color: selectedAttr?.color || '#3b82f6' }} />
                                                        <span className="text-xs font-bold text-white">{selectedAttr ? t(selectedAttr.label, selectedAttr.label) : ''}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={18} className="text-white/30" />
                                                        <span className="text-xs font-bold text-white/30">{t('habits.selectTrait', 'Select Trait')}</span>
                                                    </>
                                                )}
                                                <ChevronDown size={16} className={cn("ml-auto transition-transform text-white/30", isAttrPickerOpen && "rotate-180")} />
                                            </div>

                                            <AnimatePresence>
                                                {isAttrPickerOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
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
                                                                    return Target;
                                                                })();
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

                                        {/* Color Picker */}
                                        <ColorPicker 
                                            selectedColor={customColor}
                                            onSelectColor={setCustomColor}
                                            onToggle={(isOpen) => {
                                                if (isOpen && scrollContainerRef.current) {
                                                    setTimeout(() => {
                                                        scrollContainerRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
                                                    }, 300);
                                                }
                                            }}
                                        />

                                        {/* Smart Project Link - MOVED TO BLOCK 3 */}

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

                        {/* BLOCK 2: MECÁNICA (GOALS) */}
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
                                        {isBlock2Valid && expandedBlock !== 2 ? <CheckCircle2 size={14} /> : "2"}
                                    </div>
                                    <span className={cn("text-xs font-bold tracking-wide", expandedBlock === 2 ? "text-white" : "text-white/50")}>{t('habits.mechanics', 'MECHANICS')}</span>
                                </div>
                                <ChevronDown size={14} className={cn("transition-transform duration-200 text-white/30", expandedBlock === 2 && "rotate-180")} />
                            </button>

                            <AnimatePresence initial={false}>
                                {expandedBlock === 2 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="px-3 pb-3 space-y-3"
                                    >
                                        <div className="flex items-center gap-2 mb-1"><Target size={14} className="text-cyan-400" /><span className="text-[9px] font-bold text-slate-400 uppercase">{t('modals.project.goalCalculation')}</span></div>
                                        
                                        <div className="flex justify-between items-center bg-black/20 rounded-xl p-1">
                                            {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                                <button 
                                                    key={f} 
                                                    onClick={() => {
                                                        setGoalFreq(f);
                                                        // Reset working days based on freq
                                                        if (f === 'WEEKLY') setWorkingDays([1, 2, 3, 4, 5]);
                                                        else if (f === 'MONTHLY') setWorkingDays([]); // Reset for specific dates
                                                    }} 
                                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${goalFreq === f ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                                                >
                                                    {t(`modals.project.frequencies.${f}`)}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Goal Input */}
                                        <div className="bg-black/20 rounded-xl p-2 space-y-2">
                                            <div className="flex justify-center gap-1 bg-black/20 p-1 rounded-lg w-fit mx-auto">
                                                <button onClick={() => { setGoalUnit('HOURS'); if(goalTarget > 24 || goalTarget < 1) setGoalTarget(1); }} className={cn("text-[10px] font-bold px-3 py-1 rounded transition-colors", goalUnit === 'HOURS' ? "bg-white text-black" : "text-slate-500 hover:text-white")}>{t('common.hoursShort', 'HRS')}</button>
                                                <button onClick={() => { setGoalUnit('MINUTES'); if(goalTarget < 15) setGoalTarget(30); }} className={cn("text-[10px] font-bold px-3 py-1 rounded transition-colors", goalUnit === 'MINUTES' ? "bg-white text-black" : "text-slate-500 hover:text-white")}>{t('common.minUpper', 'MIN')}</button>
                                            </div>

                                            <div className="flex items-center justify-between px-2">
                                                <button 
                                                    onClick={() => setGoalTarget(Math.max(goalUnit === 'HOURS' ? 0.5 : 5, goalTarget - (goalUnit === 'HOURS' ? 0.5 : 5)))} 
                                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                                <div className="text-center">
                                                    <span className="text-2xl font-black text-white font-mono">{goalTarget}</span>
                                                    <span className="text-[10px] font-bold text-slate-500 ml-1 block uppercase tracking-wider">
                                                        {goalUnit === 'HOURS' ? t('modals.project.hrs') : 'MIN'} / {goalFreq === 'DAILY' ? t('modals.project.day') : goalFreq === 'WEEKLY' ? t('modals.project.week') : t('modals.project.month')}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => setGoalTarget(Math.min(goalUnit === 'HOURS' ? 24 : 720, goalTarget + (goalUnit === 'HOURS' ? 0.5 : 5)))} 
                                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Working Days Selector (Weekly) */}
                                        {goalFreq === 'WEEKLY' && (
                                            <div className="animate-in slide-in-from-top-2 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{t('modals.project.workingDays')}</span>
                                                </div>
                                                <div className="flex justify-between gap-1">
                                                    {DAYS.map(({ label, index }) => (
                                                        <button 
                                                            key={index} 
                                                            onClick={() => toggleDay(index)}
                                                            className={`w-7 h-7 rounded-lg text-[9px] font-bold transition-all ${workingDays.includes(index) ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Monthly Selector */}
                                        {goalFreq === 'MONTHLY' && (
                                            <div className="animate-in slide-in-from-top-2 pt-2 border-t border-white/5 space-y-3">
                                                {/* Type Toggle */}
                                                <div className="flex bg-black/20 p-1 rounded-lg">
                                                    <button 
                                                        onClick={() => setMonthlyType('SPECIFIC_DATES')} 
                                                        className={cn("flex-1 py-1 text-[9px] font-bold rounded transition-all", monthlyType === 'SPECIFIC_DATES' ? "bg-white text-black" : "text-slate-500 hover:text-white")}
                                                    >
                                                        {t('projects.specificDays', 'Specific Days')}
                                                    </button>
                                                    <button 
                                                        onClick={() => setMonthlyType('FLEXIBLE_COUNT')} 
                                                        className={cn("flex-1 py-1 text-[9px] font-bold rounded transition-all", monthlyType === 'FLEXIBLE_COUNT' ? "bg-white text-black" : "text-slate-500 hover:text-white")}
                                                    >
                                                        {t('habits.flexibleCount', 'Cantidad Flexible')}
                                                    </button>
                                                </div>

                                                {monthlyType === 'SPECIFIC_DATES' ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-7 gap-1">
                                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                                                <button 
                                                                    key={d} 
                                                                    onClick={() => {
                                                                        if (workingDays.length >= 28 && !workingDays.includes(d)) return; // Limit to 28 days
                                                                        toggleDay(d);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full aspect-square rounded flex items-center justify-center text-[9px] font-bold transition-all",
                                                                        workingDays.includes(d) 
                                                                            ? "bg-cyan-500 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]" 
                                                                            : "bg-white/5 text-slate-500 hover:bg-white/10"
                                                                    )}
                                                                >
                                                                    {d}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        
                                                        {/* Last Day Option */}
                                                        <button 
                                                            onClick={() => setMonthlyLastDay(!monthlyLastDay)}
                                                            className={cn(
                                                                "w-full flex items-center justify-between p-2 rounded-xl border transition-all",
                                                                monthlyLastDay ? "bg-cyan-500/10 border-cyan-500/30" : "bg-black/20 border-white/5 hover:bg-white/5"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", monthlyLastDay ? "bg-cyan-500 border-cyan-500" : "border-white/30")}>
                                                                    {monthlyLastDay && <CheckCircle2 size={10} className="text-black" />}
                                                                </div>
                                                                <span className={cn("text-[10px] font-bold uppercase", monthlyLastDay ? "text-cyan-400" : "text-slate-400")}>
                                                                    {t('dashboard.lastDayOfMonth')}
                                                                </span>
                                                            </div>
                                                            <div className="group relative">
                                                                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-white/50 cursor-help">?</div>
                                                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black border border-white/10 rounded-lg text-[9px] text-slate-300 shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                                    {t('dashboard.lastDayOption')}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                                                        <button 
                                                            onClick={() => setMonthlyFlexibleCount(Math.max(1, Number(monthlyFlexibleCount) - 1))} 
                                                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
                                                        >
                                                            <ChevronDown size={14} />
                                                        </button>
                                                        <div className="text-center">
                                                            <span className="text-lg font-black text-white">{monthlyFlexibleCount}</span>
                                                            <span className="text-[10px] font-bold text-slate-500 block uppercase">{t('common.daysPerMonth')}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setMonthlyFlexibleCount(Math.min(28, Number(monthlyFlexibleCount) + 1))} 
                                                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
                                                        >
                                                            <ChevronUp size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Calculated Result (Shared for Weekly/Monthly) */}
                                        {goalFreq !== 'DAILY' && (
                                            <div className="mt-2 bg-cyan-500/10 rounded-xl p-2.5 flex items-center gap-3 border border-cyan-500/20">
                                                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                                    <Calculator size={14} />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-bold text-cyan-200 uppercase">{t('modals.project.dailyTarget')}</div>
                                                    <div className="text-xs font-black text-white">
                                                        <span className="font-mono">
                                                            {calculatedDailyGoal < 1 ? Math.round(calculatedDailyGoal * 60) : calculatedDailyGoal}
                                                        </span>{' '}
                                                        {calculatedDailyGoal < 1 ? t('modals.project.minutes', 'minutos') : t('modals.project.hours')}{' '}
                                                        <span className="text-white/50">/ {t('modals.project.day').toLowerCase()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Impact - MOVED FROM BLOCK 3 */}
                                        <div className="bg-black/20 rounded-xl p-2.5 border border-white/5 flex items-center gap-3">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase w-10 shrink-0">{t('modals.project.impact')}</span>
                                            <div className="flex-1 h-7 bg-black/30 rounded-full relative p-1 flex gap-1">
                                                {[1,2,3,4].map(lvl => (
                                                    <button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-200 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button 
                                                onClick={() => isBlock2Valid && handleBlockChange(3)}
                                                disabled={!isBlock2Valid}
                                                className="px-5 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                            >
                                                {t('common.next', 'Next')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* BLOCK 3: COMPROMISO (SESSION) */}
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
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 3 ? "bg-white text-black" : isBlock3Valid ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        3
                                    </div>
                                    <span className={cn("text-xs font-bold tracking-wide", expandedBlock === 3 ? "text-white" : "text-white/50")}>{t('habits.commitment', 'COMMITMENT')}</span>
                                </div>
                                <ChevronDown size={14} className={cn("transition-transform duration-200 text-white/30", expandedBlock === 3 && "rotate-180")} />
                            </button>

                            <AnimatePresence initial={false}>
                                {expandedBlock === 3 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="px-3 pb-3 space-y-3"
                                    >
                                        {/* Pomodoro */}
                                        <div className="bg-black/20 rounded-xl p-2.5 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2"><Hourglass size={14} className="text-yellow-400" /><span className="text-[9px] font-bold text-slate-400 uppercase">{t('modals.project.pomodoro')}</span></div>
                                            <div className="flex gap-1 mb-2">
                                                {[25, 45, 60].map(t => (
                                                    <button key={t} onClick={() => setPomoDuration(t)} className={`flex-1 py-0.5 rounded-md text-[9px] font-bold font-mono border transition-all ${pomoDuration === t ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-transparent border-white/10 text-slate-500'}`}>{t}</button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 font-bold">{t('modals.project.custom')}:</span><input type="number" value={pomoDuration} onChange={(e) => {
                                                if (e.target.value === '') {
                                                    setPomoDuration('');
                                                } else {
                                                    setPomoDuration(parseInt(e.target.value) || 25);
                                                }
                                            }} onBlur={() => {
                                                if (pomoDuration === '') setPomoDuration(25);
                                            }} className="w-10 bg-transparent border-b border-white/20 text-white font-mono text-xs text-center focus:border-white outline-none" /></div>
                                        </div>

                                        {/* Focus Routine Timeline */}
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Hourglass size={14} className="text-cyan-400" />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Rutina de Enfoque (Timeline)</span>
                                                </div>
                                                {focusRoutine.length > 0 && (
                                                    <button 
                                                        onClick={() => { setFocusRoutine([]); setSelectedStepId(null); }}
                                                        className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
                                                    >
                                                        Limpiar
                                                    </button>
                                                )}
                                            </div>

                                            {/* Vertical Timeline container */}
                                            <div className="flex flex-col items-center py-2 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
                                                {/* Vertical center line */}
                                                <div className="absolute top-10 bottom-10 w-0.5 bg-white/10 left-1/2 -translate-x-1/2 z-0" />

                                                {/* Start Node */}
                                                <div className="relative z-10 bg-[#161622] border border-white/15 px-2.5 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-wider mb-4 shadow-md">
                                                    START
                                                </div>

                                                {/* Timeline Nodes */}
                                                {focusRoutine.length === 0 ? (
                                                    <div className="text-[10px] text-white/30 italic py-4 relative z-10">Sin pasos. Agrega enfoques o intervalos abajo.</div>
                                                ) : (
                                                    <div className="w-full flex flex-col gap-3 px-6 my-2 relative z-10">
                                                        {focusRoutine.map((step, idx) => {
                                                            const isFocus = step.type === 'FOCUS';
                                                            const isSelected = selectedStepId === step.id;
                                                            const subTraitName = step.subAttribute ? subTraits.find(st => st.id === step.subAttribute)?.name : null;

                                                            return (
                                                                <div 
                                                                    key={step.id} 
                                                                    onClick={() => {
                                                                        setSelectedStepId(step.id);
                                                                        setTimelineDuration(step.duration);
                                                                        setTimelineStepType(step.type);
                                                                        setTimelineSubTrait(step.subAttribute);
                                                                    }}
                                                                    className={cn(
                                                                        "w-1/2 flex items-center relative cursor-pointer group",
                                                                        isFocus ? "self-end justify-start pl-4" : "self-start justify-end pr-4 text-right"
                                                                    )}
                                                                >
                                                                    {/* Indicator Dot on Timeline */}
                                                                    <div 
                                                                        className={cn(
                                                                            "absolute w-2.5 h-2.5 rounded-full border top-1/2 -translate-y-1/2 z-20 shadow-md transition-all",
                                                                            isFocus ? "-left-1.25" : "-right-1.25",
                                                                            isSelected 
                                                                                ? "bg-white border-cyan-400 scale-125" 
                                                                                : isFocus 
                                                                                    ? "bg-cyan-500 border-cyan-400" 
                                                                                    : "bg-amber-500 border-amber-400"
                                                                        )}
                                                                        style={isFocus ? { left: '-5px' } : { right: '-5px' }}
                                                                    />

                                                                    {/* Card body */}
                                                                    <div 
                                                                        className={cn(
                                                                            "p-2 rounded-xl border text-[9px] font-bold transition-all shadow-md max-w-full truncate relative",
                                                                            isSelected 
                                                                                ? "bg-white/10 border-white text-white scale-102" 
                                                                                : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]"
                                                                        )}
                                                                    >
                                                                        <div>
                                                                            {step.duration} min en {isFocus ? 'Enfoque' : 'Intervalo'}
                                                                        </div>
                                                                        {isFocus && subTraitName && (
                                                                            <div className="text-[7px] text-cyan-400 mt-0.5 uppercase tracking-wide truncate">
                                                                                🎯 {subTraitName}
                                                                            </div>
                                                                        )}
                                                                        {isSelected && (
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setFocusRoutine(focusRoutine.filter(s => s.id !== step.id));
                                                                                    setSelectedStepId(null);
                                                                                }}
                                                                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 border border-white/20 flex items-center justify-center text-white text-[8px] hover:bg-red-500 transition-colors shadow-md"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Finish Node */}
                                                <div className="relative z-10 bg-[#161622] border border-white/15 px-2.5 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-wider mt-4 shadow-md">
                                                    FINALIZAR
                                                </div>
                                            </div>

                                            {/* Timeline Editor Control */}
                                            <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 space-y-2">
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
                                                    {selectedStepId ? 'Editar Paso Seleccionado' : 'Agregar Nuevo Paso'}
                                                </div>

                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button 
                                                        onClick={() => setTimelineStepType('FOCUS')}
                                                        className={cn(
                                                            "flex-1 py-1 rounded-md text-[9px] font-bold border transition-all uppercase tracking-wider",
                                                            timelineStepType === 'FOCUS' 
                                                                ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]" 
                                                                : "bg-transparent border-white/10 text-slate-500 hover:border-white/20"
                                                        )}
                                                    >
                                                        Enfoque
                                                    </button>
                                                    <button 
                                                        onClick={() => setTimelineStepType('BREAK')}
                                                        className={cn(
                                                            "flex-1 py-1 rounded-md text-[9px] font-bold border transition-all uppercase tracking-wider",
                                                            timelineStepType === 'BREAK' 
                                                                ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]" 
                                                                : "bg-transparent border-white/10 text-slate-500 hover:border-white/20"
                                                        )}
                                                    >
                                                        Intervalo
                                                    </button>
                                                </div>

                                                {/* Sub-Trait assignment dropdown for FOCUS steps */}
                                                {timelineStepType === 'FOCUS' && subTraits.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Asignar Sub-Rasgo Exclusivo:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            <button 
                                                                onClick={() => setTimelineSubTrait(undefined)}
                                                                className={cn(
                                                                    "px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all",
                                                                    timelineSubTrait === undefined 
                                                                        ? "bg-white/15 border-white text-white" 
                                                                        : "bg-transparent border-white/10 text-slate-500"
                                                                )}
                                                            >
                                                                Ninguno (Principal)
                                                            </button>
                                                            {subTraits.map(st => (
                                                                <button 
                                                                    key={st.id}
                                                                    onClick={() => setTimelineSubTrait(st.id)}
                                                                    className={cn(
                                                                        "px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all",
                                                                        timelineSubTrait === st.id 
                                                                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" 
                                                                            : "bg-transparent border-white/10 text-slate-500"
                                                                    )}
                                                                >
                                                                    {st.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Minus/Plus picker */}
                                                <div className="flex items-center justify-between bg-black/40 rounded-lg p-1.5 border border-white/5">
                                                    <button 
                                                        onClick={() => setTimelineDuration(prev => Math.max(1, prev - 1))}
                                                        className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white font-bold text-xs"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="text-center">
                                                        <span className="text-xs font-black text-white font-mono">{timelineDuration}</span>
                                                        <span className="text-[8px] text-slate-500 ml-1 font-bold">MINUTOS</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => setTimelineDuration(prev => Math.min(180, prev + 1))}
                                                        className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white font-bold text-xs"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {selectedStepId ? (
                                                    <div className="flex gap-1.5">
                                                        <button 
                                                            onClick={() => {
                                                                setFocusRoutine(focusRoutine.map(step => 
                                                                    step.id === selectedStepId 
                                                                        ? { ...step, type: timelineStepType, duration: timelineDuration, subAttribute: timelineStepType === 'FOCUS' ? timelineSubTrait : undefined } 
                                                                        : step
                                                                ));
                                                                setSelectedStepId(null);
                                                            }}
                                                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-emerald-500 transition-colors shadow-md"
                                                        >
                                                            Guardar Paso
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedStepId(null);
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 font-bold text-[9px] uppercase tracking-wider hover:bg-white/15 transition-colors"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            const newStep = {
                                                                id: Math.random().toString(),
                                                                type: timelineStepType,
                                                                duration: timelineDuration,
                                                                subAttribute: timelineStepType === 'FOCUS' ? timelineSubTrait : undefined
                                                            };
                                                            setFocusRoutine([...focusRoutine, newStep]);
                                                            setTimelineSubTrait(undefined);
                                                        }}
                                                        className="w-full py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-cyan-500 transition-colors shadow-md"
                                                    >
                                                        Agregar Paso
                                                    </button>
                                                )}
                                            </div>

                                            {/* Days selection for Routine */}
                                            <div className="space-y-1.5 border-t border-white/5 pt-2">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Días activos de la rutina:</span>
                                                <div className="flex justify-between">
                                                    {DAYS.map(({ label, index }) => {
                                                        const isSelected = focusRoutineDays.includes(index);
                                                        return (
                                                            <button 
                                                                key={index} 
                                                                onClick={() => {
                                                                    if (focusRoutineDays.includes(index)) {
                                                                        setFocusRoutineDays(focusRoutineDays.filter(d => d !== index));
                                                                    } else {
                                                                        setFocusRoutineDays([...focusRoutineDays, index].sort((a,b) => a-b));
                                                                    }
                                                                }} 
                                                                className={cn(
                                                                    "w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-all border",
                                                                    isSelected 
                                                                        ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.4)]" 
                                                                        : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                                                )}
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reminder */}
                                        <div className="space-y-2">
                                            <div className="bg-black/20 rounded-xl p-2.5 border border-white/5 group relative">
                                                <div className="flex items-center gap-2 mb-1"><Bell size={14} className="text-purple-400" /><span className="text-[9px] font-bold text-slate-400 uppercase">{t('modals.project.alert')}</span></div>
                                                <TimePicker 
                                                    value={reminder}
                                                    onChange={(val) => {
                                                        setReminder(val);
                                                        if (val && permissions.notifications !== 'granted') {
                                                            requestPermissions();
                                                        }
                                                    }}
                                                    className="text-xl font-black text-white w-full z-10 relative"
                                                />
                                            </div>

                                            {/* Permission & Battery Checks */}
                                            <AnimatePresence>
                                                {reminder && (
                                                    <motion.div 
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="space-y-2"
                                                    >
                                                        {(permissions.notifications !== 'granted' && permissions.notifications !== 'unknown') && (
                                                            <button 
                                                                onClick={requestPermissions}
                                                                className="w-full flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Bell size={12} />
                                                                    <span className="text-[10px] font-bold">{t('habits.activateNotifications', 'Activate Notifications')}</span>
                                                                </div>
                                                                <span className="text-[10px] font-bold underline">{t('common.fix', 'FIX')}</span>
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={openSystemSettings}
                                                            className="w-full flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Zap size={12} />
                                                                <span className="text-[10px] font-bold">{t('habits.batteryOptimization', 'Battery Optimization')}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold underline">{t('common.review', 'REVIEW')}</span>
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Smart Project Link - MOVED HERE */}
                                        {smartProjects && smartProjects.length > 0 && (
                                            <div className="bg-black/20 rounded-xl p-2 px-3 border border-white/5 flex items-center gap-3">
                                                <Target size={14} className="text-indigo-400 shrink-0" />
                                                <select 
                                                    value={smartProjectId} 
                                                    onChange={(e) => setSmartProjectId(e.target.value)} 
                                                    className="w-full bg-transparent text-[10px] font-medium text-white outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-[#1c1c1e] text-white/50">{t('modals.habit.linkToProject') || "Link to Smart Project (Optional)"}</option>
                                                    {smartProjects.map(p => (
                                                        <option key={p.id} value={p.id} className="bg-[#1c1c1e] text-white">
                                                            {p.mainGoal}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="text-white/30 pointer-events-none" />
                                            </div>
                                        )}

                                        {/* Reward Prediction */}
                                        <AnimatePresence>
                                            {isBlock3Valid && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                >
                                                    <RewardPredictionPill 
                                                        prediction={prediction} 
                                                        attributeColor={activeColor} 
                                                        AttributeIcon={SelectedIcon}
                                                        attributeLabel={activeLabel}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="pt-2 space-y-2">
                                            {initialData?.id && onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(initialData.id as string)}
                                                    disabled={isSubmitting}
                                                    className="w-full h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {t('common.delete', 'Eliminar')}
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleConfirm} 
                                                disabled={!title || !attrId || isSubmitting || !isBlock3Valid} 
                                                className={`w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 ${(!title || !attrId || isSubmitting || !isBlock3Valid) ? 'bg-white/5 text-white/20' : 'text-white shadow-md active:scale-95 border border-white/20 hover:shadow-md hover:border-white/40'}`}
                                                style={{
                                                    background: (!title || !attrId || isSubmitting || !isBlock3Valid) 
                                                        ? undefined 
                                                        : `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
                                                    boxShadow: (!title || !attrId || isSubmitting || !isBlock3Valid) 
                                                        ? undefined 
                                                        : `0 8px 20px -4px ${activeColor}60, inset 0 1px 0 0 rgba(255,255,255,0.3)`
                                                }}
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        {initialData ? t('modals.project.update') : t('modals.project.create')}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

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
    return prev.isOpen === next.isOpen && prev.initialData === next.initialData && prev.smartProjects === next.smartProjects; 
});
