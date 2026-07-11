import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crosshair, Plus, Star, Circle, Square, Triangle, Target, Repeat, ChevronDown, CheckCircle2, Hexagon, Hourglass, Play } from 'lucide-react';
import { Attribute, Quest, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { Difficulty, calculateTaskRewards } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { useTranslation } from 'react-i18next';
import { DurationPicker } from './DurationPicker';
import { toLocalISOString, parseLocalDate } from '../../../utils/dateUtils';
import { DateSelectionModal } from './DateSelectionModal';

// ─────────────────────────────────────────────────────────────────────────────
// 🔒 PERFORMANCE FIX #1: Replace wildcard import with targeted lazy lookup.
// `import * as LucideIcons` loads every icon in lucide-react (~300+ SVGs) into
// the JS heap on the first render of this component. On low-end Android devices
// this alone can block the UI thread for 50-200ms, causing the jank we see.
// We replace it with a lightweight async resolver that is only called when the
// attr picker is opened — NOT on initial mount.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// We still need the full icon set for the attr picker dropdown, but only lazily.
// We load it in a module-level variable that starts null and is populated on
// demand (when the picker opens). This keeps the main thread free during modal entry.
// ─────────────────────────────────────────────────────────────────────────────
let LucideIconsCache: Record<string, React.ElementType> | null = null;
const loadLucideIcons = async (): Promise<Record<string, React.ElementType>> => {
    if (LucideIconsCache) return LucideIconsCache;
    const mod = await import('lucide-react');
    LucideIconsCache = mod as unknown as Record<string, React.ElementType>;
    return LucideIconsCache;
};

const resolveIconFromCache = (iconName?: string | null, icon?: any): React.ElementType => {
    if (!iconName && !icon) return Hexagon;
    if (LucideIconsCache && iconName && LucideIconsCache[iconName]) return LucideIconsCache[iconName];
    if (icon) {
        if (typeof icon === 'function') return icon;
        if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) return icon;
    }
    return Hexagon;
};

export const QuestModal = React.memo(({
    isOpen,
    onClose,
    attributes = [],
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
    attributes?: Attribute[],
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

    if (isOpen) {
        debugger;
    }

    useEffect(() => {
        console.log("🟢 [QuestModal LifeCycle] QuestModal mounted!");
        return () => {
            console.log("🔴 [QuestModal LifeCycle] QuestModal UNMOUNTED!");
        };
    }, []);

    console.log(`🌀 [QuestModal LifeCycle] QuestModal rendering (isOpen: ${isOpen})`);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔒 PERFORMANCE FIX #2: Deferred rendering.
    // When `isOpen` flips to true, Android needs to run the entry animation
    // (scale + fade from framer-motion) at 60fps. If we also mount 400+ DOM
    // nodes (form inputs, pickers, buttons) on the SAME frame, the UI thread
    // stalls — this is the "jank list is out of time" error in the logs.
    //
    // Solution: render only the backdrop + shell on frame 1, then after a
    // single requestAnimationFrame we set `isContentReady = true` and render
    // the full form. This gives Android ONE frame to commit the entry animation
    // before the heavy DOM work begins.
    // ─────────────────────────────────────────────────────────────────────────
    const [isContentReady, setIsContentReady] = useState(false);

    useEffect(() => {
        console.log(`🌀 [QuestModal LifeCycle] useEffect triggered for isOpen. isOpen: ${isOpen}, isContentReady: ${isContentReady}`);
        if (!isOpen) {
            // Reset immediately on close so next open starts fresh
            setIsContentReady(false);
            return;
        }
        // Defer the heavy form render until after the first paint frame
        const rafId = requestAnimationFrame(() => {
            // setTimeout(0) inside rAF guarantees we are past the commit phase
            const tid = setTimeout(() => {
                console.log("🌀 [QuestModal LifeCycle] requestAnimationFrame + setTimeout fired. Setting isContentReady to true.");
                setIsContentReady(true);
            }, 0);
            return () => clearTimeout(tid);
        });
        return () => cancelAnimationFrame(rafId);
    }, [isOpen]);

    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('DISCIPLINA');
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
    const [journalIconColor, setJournalIconColor] = useState<string>('#3b82f6');

    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [pomodoroTarget, setPomodoroTarget] = useState<number>(0);
    const [pomodoroCompleted, setPomodoroCompleted] = useState<number>(0);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔒 PERFORMANCE FIX #3: Load full Lucide icon set lazily on picker open.
    // ─────────────────────────────────────────────────────────────────────────
    const [iconsLoaded, setIconsLoaded] = useState(false);
    const handleOpenAttrPicker = useCallback(async () => {
        if (!LucideIconsCache) {
            await loadLucideIcons();
            setIconsLoaded(true); // trigger re-render so picker icons resolve
        }
        setAttrPickerOpen(true);
    }, []);
    // Keep iconsLoaded in scope for the JSX below (it just needs to reference it
    // so the component re-renders after the lazy load)
    void iconsLoaded;

    // To prevent mobile ghost clicks from closing the modal immediately after mounting,
    // we track if the touch/click actually started (via touchstart/mousedown) on this backdrop.
    // Ghost clicks do not trigger touchstart/mousedown on the newly mounted backdrop.
    const backdropTouchStartedRef = React.useRef(false);

    const handleBackdropTouchStart = () => {
        console.log("🌀 [QuestModal UI] Backdrop touch/mousedown started.");
        backdropTouchStartedRef.current = true;
    };

    const handleBackdropClick = (_e: React.MouseEvent) => {
        console.log(`🌀 [QuestModal UI] Backdrop click event fired. touchStarted: ${backdropTouchStartedRef.current}`);
        if (!backdropTouchStartedRef.current) {
            console.log("🌀 [QuestModal UI] Ignoring ghost backdrop click.");
            return;
        }
        backdropTouchStartedRef.current = false;
        console.log("🌀 [QuestModal UI] Backdrop click valid. Invoking onClose().");
        onClose();
    };

    // Smart Auto-linking by Keywords in title
    React.useEffect(() => {
        if (!title || initialValues?.attribute || lockedAttributeId) return;
        for (const attr of (attributes || [])) {
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
                setPomodoroTarget(initialValues.pomodoroTarget || 0);
                setPomodoroCompleted(initialValues.pomodoroCompleted || 0);
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
                setTitle('');
                setDesc('');
                setAttrId('DISCIPLINA');
                setSubAttrId('');
                setProjectId('');
                setDifficulty('C');
                setDeadline(toLocalISOString(new Date()));
                setEstimatedTime(0);
                setPomodoroTarget(0);
                setPomodoroCompleted(0);
                setRecurrenceType('NONE');
                setRecurrenceInterval(1);
                setRecurrenceDays([]);
                setRecurrenceMonths([0,1,2,3,4,5,6,7,8,9,10,11]);
                setMonthlyType('SPECIFIC_DATES');
                setShowInJournaling(false);
                setJournalIconColor('#3b82f6');
            }

            if (lockedAttributeId) setAttrId(lockedAttributeId);
            if (lockedDate) setDeadline(lockedDate);
        }
    }, [isOpen, lockedAttributeId, lockedDate, initialValues]);

    const selectedAttr = attributes?.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#333333';

    // ─────────────────────────────────────────────────────────────────────────
    // 🔒 PERFORMANCE FIX #4: Use targeted icon resolver instead of scanning
    // the entire LucideIcons namespace on every render.
    // ─────────────────────────────────────────────────────────────────────────
    const SelectedIcon = useMemo(() => {
        if (!selectedAttr) return Star;
        return resolveIconFromCache(selectedAttr.iconName, selectedAttr.icon);
    }, [selectedAttr]);

    const activeLabel = selectedAttr && selectedAttr.label
        ? t(selectedAttr.label, typeof selectedAttr.label === 'string' ? selectedAttr.label.replace('traits.', '') : '')
        : t('modals.project.traitDefault', 'Trait');

    const selectedProject = projects.find(p => p.id === projectId);
    const selectedSmartProject = smartProjects.find(p => p.id === (lockedSmartProjectId || initialValues?.smartProjectId));

    const prediction = useMemo(() => {
        const multipliers: Record<Difficulty, number> = { 'C': 1, 'B': 2, 'A': 3, 'S': 4 };
        return calculateTaskRewards(estimatedTime, multipliers[difficulty], 0, 'TASK');
    }, [estimatedTime, difficulty]);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔒 PERFORMANCE FIX #5: Memoize the difficulties array so it isn't
    // recreated on every render (it calls t() for each label).
    // ─────────────────────────────────────────────────────────────────────────
    const difficulties = useMemo(() => [
        { id: 'C' as Difficulty, label: t('modals.quest.difficulties.Basic'), icon: Circle, color: 'text-cyan-400' },
        { id: 'B' as Difficulty, label: t('modals.quest.difficulties.Medium'), icon: Square, color: 'text-emerald-400' },
        { id: 'A' as Difficulty, label: t('modals.quest.difficulties.Hard'), icon: Triangle, color: 'text-orange-400' },
        { id: 'S' as Difficulty, label: t('modals.quest.difficulties.Epic'), icon: Star, color: 'text-purple-500' },
    ], [t]);

    const handleConfirm = async () => {
        console.log(`🌀 [QuestModal API] handleConfirm clicked. title: "${title}", isSubmitting: ${isSubmitting}`);
        if (isSubmitting) return;
        setIsSubmitting(true);

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
                pomodoroTarget,
                pomodoroCompleted,
                subtasks: [],
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

    if (typeof document === 'undefined' || !document.body) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center p-4"
                >
                    <div 
                        className="absolute inset-0 bg-black/60" 
                        onTouchStart={handleBackdropTouchStart}
                        onMouseDown={handleBackdropTouchStart}
                        onClick={handleBackdropClick} 
                    />
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
                            {/* ─────────────────────────────────────────────────────────── */}
                            {/* FRAME 1: Shell always renders immediately (lightweight)     */}
                            {/* This is what Android sees during the entry animation        */}
                            {/* ─────────────────────────────────────────────────────────── */}
                            <div className="p-4 flex justify-between items-center mb-1 px-5 shrink-0">
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
                                <div className="flex items-center gap-2">
                                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:bg-white/20 transition-colors hover:bg-white/10">
                                        <X size={16} className="text-white/70" />
                                    </button>
                                </div>
                            </div>

                            {/* ─────────────────────────────────────────────────────────── */}
                            {/* FRAME 2+: Full content deferred until after entry animation */}
                            {/* ─────────────────────────────────────────────────────────── */}
                            {!isContentReady ? (
                                /* Skeleton placeholder — keeps the modal height stable while loading */
                                <div className="px-4 pb-4 space-y-3 animate-pulse">
                                    <div className="h-10 rounded-2xl bg-white/5 w-full" />
                                    <div className="h-8 rounded-full bg-white/5 w-full" />
                                    <div className="h-24 rounded-2xl bg-white/5 w-full" />
                                    <div className="h-8 rounded-xl bg-white/5 w-full" />
                                    <div className="h-10 rounded-xl bg-white/5 w-full" />
                                </div>
                            ) : (
                                <div className="overflow-y-auto no-scrollbar px-4 pb-4 space-y-4">
                                    {/* Reward Prediction */}
                                    <div>
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
                                                    autoFocus={false}
                                                />
                                            </div>
                                            <div
                                                onClick={() => !lockedAttributeId && handleOpenAttrPicker()}
                                                className={`w-14 rounded-[1.2rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative ${isAttrPickerOpen ? 'z-50' : ''} ${lockedAttributeId ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`}
                                            >
                                                {attrId ? (<SelectedIcon size={20} style={{ color: activeColor }} />) : <Plus size={20} className="text-white/30" />}
                                                {isAttrPickerOpen && !lockedAttributeId && (
                                                    <>
                                                        <div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} />
                                                        <div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-md border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                            {Array.isArray(attributes) && attributes.map((attr) => {
                                                                if (!attr) return null;
                                                                const Icon = resolveIconFromCache(attr.iconName, attr.icon);
                                                                return (
                                                                    <button key={attr.id} onClick={(e) => { e.stopPropagation(); if (attr.id !== attrId) { setAttrId(attr.id); setSubAttrId(''); } setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                                        <Icon size={16} style={{ color: attr.color }} />
                                                                        <span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label ? t(attr.label, typeof attr.label === 'string' ? attr.label.replace('traits.', '') : '') : ''}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

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
                                                                <span className="text-slate-300">
                                                                    {selectedAttr.subTraits.find(st => st.id === subAttrId)?.name || subAttrId}
                                                                </span>
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
                                                                            {resolveIconFromCache(st.iconName) ? React.createElement(resolveIconFromCache(st.iconName), { size: 12 }) : <Hexagon size={12} />}
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

                                        {/* Estimated Time */}
                                        <div className="pt-1">
                                            <DurationPicker
                                                value={estimatedTime}
                                                onChange={setEstimatedTime}
                                            />
                                        </div>

                                        {/* Pomodoro Target Picker (Only shown if associated with a project) */}
                                        {projectId && projectId !== 'none' && (
                                            <div className="bg-white/5 rounded-[1.2rem] border border-white/5 p-3 space-y-2 mb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <Hourglass size={12} className="text-cyan-400" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Pomodoros de Objetivo</span>
                                                    </div>
                                                    <span className="text-xs font-mono font-black text-white">{pomodoroTarget || 'Sin Límite'}</span>
                                                </div>
                                                <div className="flex items-center justify-center gap-4 bg-black/20 rounded-xl p-2 border border-white/5">
                                                    <button 
                                                        onClick={() => setPomodoroTarget(prev => Math.max(0, prev - 1))}
                                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white font-bold"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-sm font-black font-mono text-white min-w-[20px] text-center">{pomodoroTarget}</span>
                                                    <button 
                                                        onClick={() => setPomodoroTarget(prev => Math.min(10, prev + 1))}
                                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-[8px] text-slate-500 font-medium text-center">
                                                    Servirá como guía de pomodoros para completar la tarea.
                                                </div>
                                            </div>
                                        )}

                                        {/* Difficulty Selector */}
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
                                                            <div className="absolute inset-0 bg-white/10 shadow-lg rounded-[1rem] border border-white/5" />
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

                                        {/* Project Link */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setProjectPickerOpen(!isProjectPickerOpen)}
                                                className={`w-full h-9 rounded-[1.2rem] border border-white/5 flex items-center justify-between px-4 text-xs font-bold transition-colors ${projectId ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Target size={13} className={projectId ? 'text-white' : 'text-white/30'} />
                                                    <span>{projectId ? (selectedProject?.title || smartProjects.find(p => p.id === projectId)?.mainGoal || t('modals.quest.linkProject')) : t('modals.quest.linkProject')}</span>
                                                </div>
                                                <ChevronDown size={13} className="text-white/30" />
                                            </button>
                                            {isProjectPickerOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-[998] bg-transparent" onClick={() => setProjectPickerOpen(false)} />
                                                    <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] flex flex-col gap-1 z-[999] shadow-md border border-white/10 animate-in zoom-in-95 max-h-[300px] overflow-y-auto">
                                                        <button
                                                            onClick={() => { setProjectId(''); setProjectPickerOpen(false); }}
                                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                                <X size={14} className="text-white/50" />
                                                            </div>
                                                            <span className="text-xs font-bold text-white/50">{t('modals.quest.noProject')}</span>
                                                        </button>

                                                        {smartProjects && smartProjects.length > 0 && (
                                                            <div className="px-3 py-1 text-[9px] font-bold text-white/30 uppercase tracking-widest">{t('quests.strategic', 'Strategic')}</div>
                                                        )}
                                                        {Array.isArray(smartProjects) && smartProjects.map(p => {
                                                            if (!p) return null;
                                                            const attr = Array.isArray(attributes) ? attributes.find(a => a?.id === p.traitId) : undefined;
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => {
                                                                        setProjectId(p.id);
                                                                        if (p.traitId) { setAttrId(p.traitId); setSubAttrId(''); }
                                                                        setProjectPickerOpen(false);
                                                                    }}
                                                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.traitColor || attr?.color || '#333' }}>
                                                                        <Target size={14} className="text-white" />
                                                                    </div>
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="text-xs font-bold text-white truncate w-full">{p.mainGoal}</span>
                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{t('quests.strategy', 'Strategy')}</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}

                                                        {projects && projects.length > 0 && (
                                                            <div className="px-3 py-1 text-[9px] font-bold text-white/30 uppercase tracking-widest mt-2">{t('quests.protocols', 'Protocols')}</div>
                                                        )}
                                                        {Array.isArray(projects) && projects.map(p => {
                                                            if (!p) return null;
                                                            const attr = Array.isArray(attributes) ? attributes.find(a => a?.id === p.attribute) : undefined;
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => {
                                                                        setProjectId(p.id);
                                                                        if (p.attribute) { setAttrId(p.attribute); setSubAttrId(''); }
                                                                        setProjectPickerOpen(false);
                                                                    }}
                                                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: attr?.color || '#333' }}>
                                                                        <Target size={14} className="text-white" />
                                                                    </div>
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="text-xs font-bold text-white truncate w-full">{p.title}</span>
                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{attr?.label ? t(attr.label, typeof attr.label === 'string' ? attr.label.replace('traits.', '') : '') : ''}</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
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
                                                         recurrenceType === 'INTERVAL' ? t('tasks.recurrence.interval', 'Interval') + ' (opcional)' :
                                                         recurrenceType === 'WEEKLY' ? t('tasks.recurrence.weekly', 'Weekly') :
                                                         t('tasks.recurrence.monthly', 'Monthly')}
                                                    </span>
                                                </div>
                                                <ChevronDown size={14} className={`text-white/30 transition-transform ${isRecurrencePickerOpen ? 'rotate-180' : ''}`} />
                                            </div>

                                            <AnimatePresence>
                                                {isRecurrencePickerOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="mt-3"
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

                                            {recurrenceType === 'MONTHLY' && (
                                                <div className="mt-3 pt-3 border-t border-white/5 space-y-4">
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
                                                                                if (prev.includes(index)) return prev.filter(m => m !== index);
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

                                                    <div className="space-y-2 pt-3 border-t border-white/5">
                                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('tasks.recurrence.days', 'Días')}</span>
                                                        <div className="grid grid-cols-7 gap-1.5 mb-2">
                                                            {Array.from({ length: 31 }).map((_, i) => {
                                                                const day = i + 1;
                                                                return (
                                                                    <button
                                                                        key={day}
                                                                        onClick={() => {
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
                                                                if (monthlyType === 'LAST_DAY') setMonthlyType('SPECIFIC_DATES');
                                                                else setMonthlyType('LAST_DAY');
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

                                            {recurrenceType !== 'NONE' && (
                                                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                                <Target size={14} />
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-bold text-white block">{t('quests.showInJournaling', 'Mostrar en el Journaling')}</span>
                                                                <span className="text-[10px] text-white/40">{t('quests.addToJournalCalendar', 'Agrega esta tarea al calendario de Journal')}</span>
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
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="mt-3"
                                                            >
                                                                <div className="pt-2 pb-1 space-y-2">
                                                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('quests.iconColor', 'Color del Icono')}</span>
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
                            )}
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
}, (prev, next) => {
    if (!prev.isOpen && !next.isOpen) return true;
    return false;
});
