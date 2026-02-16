import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Plus, Target, ChevronDown, ChevronUp, Hourglass, Bell, Calendar, Calculator, Loader2, CheckCircle2 } from 'lucide-react';
import { Attribute, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards, Difficulty } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';

export const ProjectModal = React.memo(({ isOpen, onClose, attributes, smartProjects, onConfirm, initialData }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], smartProjects?: SmartProject[], onConfirm: (data: Partial<Project>) => Promise<void> | void, initialData?: Partial<Project> }) => {
    const { t } = useTranslation();
    const [expandedBlock, setExpandedBlock] = useState<1 | 2 | 3>(1);

    // Block 1: Identity
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [smartProjectId, setSmartProjectId] = useState('');
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);

    // Block 2: Mechanics (Goals)
    const [goalTarget, setGoalTarget] = useState(10);
    const [goalFreq, setGoalFreq] = useState('DAILY');
    const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default

    // Block 3: Commitment (Session)
    const [pomoDuration, setPomoDuration] = useState(25);
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    
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
                setSmartProjectId(initialData.smartProjectId || '');
                // goalTarget logic is complex due to calculation, for now we skip complex reverse-calc or assume simpler default if not fully provided
                setGoalTarget(initialData.goalTarget ? Math.round(initialData.goalTarget / 60) : 10); // Convert back to hours approx
                setGoalFreq(initialData.goalFrequency || 'DAILY'); 
                setPomoDuration(initialData.pomoDuration || 25);
                setReminder(initialData.reminder || '');
                setImpact(initialData.impact || 1);
                if (initialData.workingDays) setWorkingDays(initialData.workingDays);
            } else {
                setTitle('');
                setDesc('');
                setAttrId('');
                setSmartProjectId('');
                setGoalTarget(10);
                setGoalFreq('DAILY');
                setWorkingDays([1, 2, 3, 4, 5]);
                setPomoDuration(25);
                setReminder('');
                setImpact(1);
            }
        }
    }, [isOpen, initialData]);

    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#3b82f6';
    const hasColorSource = !!attrId;
    const SelectedIcon = selectedAttr?.icon || Briefcase;
    const activeLabel = selectedAttr?.label || 'Trait';

    const difficultyMap: Record<number, Difficulty> = {
        1: 'C',
        2: 'B',
        3: 'A',
        4: 'S'
    };
    const difficulty = difficultyMap[impact] || 'C';

    const prediction = useMemo(() => {
        return calculateTaskRewards(difficulty);
    }, [difficulty]);

    const toggleDay = (dayIndex: number) => {
        setWorkingDays(prev => 
            prev.includes(dayIndex) 
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex].sort()
        );
    };

    const calculatedDailyGoal = useMemo(() => {
        if (goalFreq === 'DAILY') return goalTarget;
        const daysCount = workingDays.length || 1;
        
        let daily = goalTarget;
        if (goalFreq === 'WEEKLY') {
            daily = goalTarget / daysCount;
        } else if (goalFreq === 'MONTHLY') {
            daily = goalTarget / (daysCount * 4);
        }
        
        // Round to 1 decimal place
        return Math.round(daily * 10) / 10;
    }, [goalTarget, goalFreq, workingDays]);

    const handleConfirm = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        try {
            // Optimistic UI: 0ms delay
            await onConfirm({ 
                title, 
                description: desc, 
                attribute: attrId, 
                goalTarget: calculatedDailyGoal * 60, // Save as minutes (User inputs Hours)
                goalFrequency: 'DAILY', // Always save as DAILY so the tracker works per day
                pomoDuration, 
                breakDuration: 5, 
                reminder, 
                impact,
                workingDays: goalFreq === 'DAILY' ? undefined : workingDays,
                smartProjectId: smartProjectId || undefined
            });
            // The modal will close automatically from parent if successful
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const DAYS = t('modals.project.daysInitials', { returnObjects: true }) as string[];

    // Validation Logic
    const isBlock1Valid = title.trim() !== '' && attrId !== '';
    const isBlock2Valid = goalTarget > 0 && (goalFreq === 'DAILY' || workingDays.length > 0);
    const isBlock3Valid = pomoDuration > 0;

    const handleBlockChange = (block: 1 | 2 | 3) => {
        if (expandedBlock === 1 && !isBlock1Valid) return;
        if (block === 3 && (!isBlock1Valid || !isBlock2Valid)) return;
        setExpandedBlock(block);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={!isSubmitting ? onClose : undefined} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative z-10 w-full max-w-[400px]"
            >
                <div 
                    className="rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] relative bg-[#0a0a0a] transition-all duration-500 ease-out"
                    style={{
                        border: `1px solid ${hasColorSource ? activeColor : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: hasColorSource
                            ? `0 0 0 1px ${activeColor}40, 0 0 60px -10px ${activeColor}50, 0 0 20px ${activeColor}30, inset 0 0 20px ${activeColor}10`
                            : `0 20px 50px -10px rgba(0,0,0,0.5)`
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: activeColor }}>
                                <SelectedIcon size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">{initialData ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
                                <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-wider">{t('modals.project.subtitle')}</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"><X size={16} /></button>
                    </div>

                    <div ref={scrollContainerRef} className="overflow-y-auto no-scrollbar p-4 space-y-3">
                        
                        {/* BLOCK 1: IDENTIDAD */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
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
                                    <span className={cn("text-sm font-bold tracking-wide", expandedBlock === 1 ? "text-white" : "text-white/50")}>IDENTIDAD</span>
                                </div>
                                <ChevronDown size={16} className={cn("transition-transform duration-300 text-white/30", expandedBlock === 1 && "rotate-180")} />
                            </button>
                            
                            <AnimatePresence initial={false}>
                                {expandedBlock === 1 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                                                        <span className="text-xs font-bold text-white">{selectedAttr?.label}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={18} className="text-white/30" />
                                                        <span className="text-xs font-bold text-white/30">Seleccionar Rasgo</span>
                                                    </>
                                                )}
                                                <ChevronDown size={16} className={cn("ml-auto transition-transform text-white/30", isAttrPickerOpen && "rotate-180")} />
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
                                                                            {t(`traits.${attr.id.toLowerCase()}.label`)}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Smart Project Link - MOVED TO BLOCK 3 */}

                                        <div className="pt-2 flex justify-end">
                                            <button 
                                                onClick={() => isBlock1Valid && handleBlockChange(2)}
                                                disabled={!isBlock1Valid}
                                                className="px-6 py-2 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* BLOCK 2: MECÁNICA (GOALS) */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
                            expandedBlock === 2
                                ? "bg-white/5 border-white/10" 
                                : "bg-transparent border-white/5 hover:bg-white/[0.02]"
                        )}>
                            <button 
                                onClick={() => handleBlockChange(2)}
                                className="w-full flex items-center justify-between p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 2 ? "bg-white text-black" : isBlock2Valid && expandedBlock > 2 ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        {isBlock2Valid && expandedBlock !== 2 ? <CheckCircle2 size={14} /> : "2"}
                                    </div>
                                    <span className={cn("text-sm font-bold tracking-wide", expandedBlock === 2 ? "text-white" : "text-white/50")}>OBJETIVOS</span>
                                </div>
                                <ChevronDown size={16} className={cn("transition-transform duration-300 text-white/30", expandedBlock === 2 && "rotate-180")} />
                            </button>

                            <AnimatePresence initial={false}>
                                {expandedBlock === 2 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="px-4 pb-4 space-y-4"
                                    >
                                        <div className="flex items-center gap-2 mb-1"><Target size={16} className="text-cyan-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.project.goalCalculation')}</span></div>
                                        
                                        <div className="flex justify-between items-center bg-black/20 rounded-xl p-1">
                                            {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                                <button key={f} onClick={() => setGoalFreq(f)} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${goalFreq === f ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>{t(`modals.project.frequencies.${f}`)}</button>
                                            ))}
                                        </div>

                                        {/* Goal Input */}
                                        <div className="flex items-center justify-between px-2 bg-black/20 rounded-xl py-2">
                                            <button onClick={() => setGoalTarget(Math.max(1, goalTarget - 1))} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><ChevronDown size={14} /></button>
                                            <div className="text-center">
                                                <span className="text-2xl font-black text-white font-mono">{goalTarget}</span>
                                                <span className="text-xs font-bold text-slate-500 ml-1">{t('modals.project.hrs')} / {goalFreq === 'DAILY' ? t('modals.project.day') : goalFreq === 'WEEKLY' ? t('modals.project.week') : t('modals.project.month')}</span>
                                            </div>
                                            <button onClick={() => setGoalTarget(Math.min(100, goalTarget + 1))} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><ChevronUp size={14} /></button>
                                        </div>

                                        {/* Working Days Selector (Only if not Daily) */}
                                        {goalFreq !== 'DAILY' && (
                                            <div className="animate-in slide-in-from-top-2 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.project.workingDays')}</span>
                                                </div>
                                                <div className="flex justify-between gap-1">
                                                    {DAYS.map((d, i) => (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => toggleDay(i)}
                                                            className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${workingDays.includes(i) ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                                        >
                                                            {d}
                                                        </button>
                                                    ))}
                                                </div>
                                                
                                                {/* Calculated Result */}
                                                <div className="mt-3 bg-cyan-500/10 rounded-xl p-3 flex items-center gap-3 border border-cyan-500/20">
                                                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                                        <Calculator size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-bold text-cyan-200 uppercase">{t('modals.project.dailyTarget')}</div>
                                                        <div className="text-sm font-black text-white"><span className="font-mono">{calculatedDailyGoal}</span> {t('modals.project.hours')} <span className="text-white/50">/ {t('modals.project.day').toLowerCase()}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Impact - MOVED FROM BLOCK 3 */}
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex items-center gap-4">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">{t('modals.project.impact')}</span>
                                            <div className="flex-1 h-8 bg-black/30 rounded-full relative p-1 flex gap-1">
                                                {[1,2,3,4].map(lvl => (
                                                    <button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-300 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button 
                                                onClick={() => isBlock2Valid && handleBlockChange(3)}
                                                disabled={!isBlock2Valid}
                                                className="px-6 py-2 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* BLOCK 3: COMPROMISO (SESSION) */}
                        <div className={cn(
                            "rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
                            expandedBlock === 3
                                ? "bg-white/5 border-white/10" 
                                : "bg-transparent border-white/5 hover:bg-white/[0.02]"
                        )}>
                            <button 
                                onClick={() => handleBlockChange(3)}
                                className="w-full flex items-center justify-between p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 3 ? "bg-white text-black" : isBlock3Valid ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        3
                                    </div>
                                    <span className={cn("text-sm font-bold tracking-wide", expandedBlock === 3 ? "text-white" : "text-white/50")}>COMPROMISO</span>
                                </div>
                                <ChevronDown size={16} className={cn("transition-transform duration-300 text-white/30", expandedBlock === 3 && "rotate-180")} />
                            </button>

                            <AnimatePresence initial={false}>
                                {expandedBlock === 3 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="px-4 pb-4 space-y-4"
                                    >
                                        {/* Pomodoro */}
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2"><Hourglass size={16} className="text-yellow-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.project.pomodoro')}</span></div>
                                            <div className="flex gap-1 mb-2">
                                                {[25, 45, 60].map(t => (
                                                    <button key={t} onClick={() => setPomoDuration(t)} className={`flex-1 py-1 rounded-md text-[10px] font-bold font-mono border transition-all ${pomoDuration === t ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-transparent border-white/10 text-slate-500'}`}>{t}</button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">{t('modals.project.custom')}:</span><input type="number" value={pomoDuration} onChange={(e) => setPomoDuration(parseInt(e.target.value) || 25)} className="w-12 bg-transparent border-b border-white/20 text-white font-mono text-sm text-center focus:border-white outline-none" /></div>
                                        </div>

                                        {/* Reminder */}
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5 group">
                                            <div className="flex items-center gap-2 mb-1"><Bell size={16} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.project.alert')}</span></div>
                                            <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="bg-transparent text-2xl font-black text-white outline-none w-full z-10 relative" />
                                            {!reminder && <span className="absolute left-7 bottom-7 text-sm font-bold text-white/20 pointer-events-none">{t('modals.project.off')}</span>}
                                        </div>

                                        {/* Smart Project Link - MOVED HERE */}
                                        {smartProjects && smartProjects.length > 0 && (
                                            <div className="bg-black/20 rounded-xl p-2 px-3 border border-white/5 flex items-center gap-3">
                                                <Target size={16} className="text-indigo-400 shrink-0" />
                                                <select 
                                                    value={smartProjectId} 
                                                    onChange={(e) => setSmartProjectId(e.target.value)} 
                                                    className="w-full bg-transparent text-xs font-medium text-white outline-none appearance-none cursor-pointer"
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

                                        {/* Reward Prediction (Conditional) */}
                                        <AnimatePresence>
                                            {reminder && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
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

                                        <div className="pt-2">
                                            <button 
                                                onClick={handleConfirm} 
                                                disabled={!title || !attrId || isSubmitting || !reminder} 
                                                className={`w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${(!title || !attrId || isSubmitting || !reminder) ? 'bg-white/5 text-white/20' : 'text-white shadow-xl active:scale-95 border border-white/20 hover:shadow-2xl hover:border-white/40'}`}
                                                style={{
                                                    background: (!title || !attrId || isSubmitting || !reminder) 
                                                        ? undefined 
                                                        : `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
                                                    boxShadow: (!title || !attrId || isSubmitting || !reminder) 
                                                        ? undefined 
                                                        : `0 8px 20px -4px ${activeColor}60, inset 0 1px 0 0 rgba(255,255,255,0.3)`
                                                }}
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 size={16} className="animate-spin" />
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
        </div>
    );
}, (prev, next) => {
    return prev.isOpen === next.isOpen && prev.initialData === next.initialData && prev.smartProjects === next.smartProjects; 
});
