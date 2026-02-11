import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { X, Infinity as InfinityIcon, Plus, Clock, CheckCircle2, Hash, List, ArrowUp, ChevronDown, Star, Target, Zap, AlertCircle } from 'lucide-react';
import { Attribute, Habit, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards, Difficulty } from '../../../utils/rewardCalculator';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { IconPicker } from './IconPicker';

export const HabitModal = React.memo(({ isOpen, onClose, attributes, projects = [], onConfirm, initialData }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], smartProjects?: SmartProject[], projects?: Project[], onConfirm: (data: Partial<Habit>) => void, initialData?: Habit }) => {
    const { t } = useTranslation();
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
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [impact, setImpact] = useState(1);

    // Block 3: Commitment
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [reminder, setReminder] = useState('');
    const [smartProjectId, setSmartProjectId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);

    const NEON_COLORS = [
        '#ef4444', // Red
        '#f97316', // Orange
        '#eab308', // Yellow
        '#22c55e', // Green
        '#06b6d4', // Cyan
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#d946ef', // Fuchsia
        '#f43f5e', // Rose
    ];

    // Reset or Populate form on open
    useEffect(() => {
        if (isOpen) {
            setExpandedBlock(1);
            if (initialData) {
                setTitle(initialData.title || '');
                setDesc(initialData.description || '');
                setAttrId(initialData.attribute || '');
                setSmartProjectId(initialData.projectId || '');
                setFreq(initialData.frequency || 'DAILY');
                setLogic(initialData.type || 'BOOLEAN');
                setTarget(initialData.targetValue?.toString() || '');
                setUnit(initialData.unit || '');
                setSubtasks(initialData.checklist?.map(c => c.text) || []);
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
    const CustomIcon = customIconName && (LucideIcons as any)[customIconName] 
        ? (LucideIcons as any)[customIconName] 
        : null;
    const SelectedIcon = CustomIcon || selectedAttr?.icon || Star;
    const activeLabel = selectedAttr?.label || 'Trait';

    const difficultyMap: Record<number, Difficulty> = {
        1: 'C',
        2: 'B',
        3: 'A',
        4: 'S'
    };
    const difficulty = difficultyMap[impact] || 'C';

    const prediction = useMemo(() => {
        return calculateTaskRewards(difficulty, null, estimatedTime);
    }, [difficulty, estimatedTime]);

    // Validation Logic
    const isBlock1Valid = title.trim() !== '' && desc.trim() !== '' && attrId !== '';
    const isBlock2Valid = true; // Always valid with defaults
    const isBlock3Valid = estimatedTime > 0;

    const canSubmit = isBlock1Valid && isBlock2Valid && isBlock3Valid;

    const handleBlockChange = (block: 1 | 2 | 3) => {
        if (expandedBlock === 1 && !isBlock1Valid) return;
        // If trying to jump to 3, 2 must be valid (it's always valid technically)
        if (block === 3 && (!isBlock1Valid)) return; 
        
        setExpandedBlock(block);
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 w-full max-w-[400px]"
            >
                <div 
                    className="rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh] relative bg-[#0a0a0a]"
                    style={{
                        boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 20px 50px -10px rgba(0,0,0,0.5)`
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: activeColor }}>
                                <SelectedIcon size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">{initialData ? 'Editar Hábito' : 'Nuevo Hábito'}</h2>
                                <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-wider">Protocolo de Vida</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                    </div>

                    <div className="overflow-y-auto no-scrollbar p-4 space-y-3">
                        
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
                                        className="px-4 pb-4 space-y-3"
                                    >
                                        {/* Title */}
                                        <div className="bg-black/20 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-all">
                                            <input 
                                                type="text" 
                                                value={title} 
                                                onChange={(e) => setTitle(e.target.value)} 
                                                placeholder="Nombre del Protocolo..." 
                                                className="w-full h-10 bg-transparent px-3 text-sm font-bold text-white placeholder:text-white/20 outline-none" 
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="bg-black/20 rounded-xl p-1 border border-white/5 focus-within:border-white/20 transition-all">
                                            <input 
                                                type="text" 
                                                value={desc} 
                                                onChange={(e) => setDesc(e.target.value)} 
                                                placeholder="Descripción (Requerida)..." 
                                                className="w-full h-10 bg-transparent px-3 text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" 
                                            />
                                        </div>

                                        {/* Trait Picker */}
                                        <div className="flex gap-2">
                                            <div 
                                                onClick={() => setAttrPickerOpen(true)} 
                                                className={cn(
                                                    "flex-1 h-12 rounded-xl border flex items-center px-3 gap-3 cursor-pointer transition-all relative",
                                                    attrId ? "bg-white/5 border-white/10" : "bg-black/20 border-dashed border-white/10 hover:border-white/30"
                                                )}
                                            >
                                                {attrId ? (
                                                    <>
                                                        <SelectedIcon size={18} style={{ color: activeColor }} />
                                                        <span className="text-xs font-bold text-white">{selectedAttr?.label}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={18} className="text-white/30" />
                                                        <span className="text-xs font-bold text-white/30">Seleccionar Rasgo</span>
                                                    </>
                                                )}
                                                
                                                {isAttrPickerOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-[998]" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} />
                                                        <div className="absolute top-full left-0 mt-2 p-2 bg-[#1c1c1e] rounded-xl grid grid-cols-2 gap-2 z-[999] w-full shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                            {attributes.map((attr) => {
                                                                const Icon = attr.icon;
                                                                return (
                                                                    <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
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

                                        {/* Icon & Color Picker */}
                                        <IconPicker 
                                            selectedIcon={customIconName}
                                            onSelectIcon={setCustomIconName}
                                            selectedColor={customColor}
                                            onSelectColor={setCustomColor}
                                        />

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

                        {/* BLOCK 2: MECÁNICA */}
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
                                        {isBlock2Valid && expandedBlock > 2 ? <CheckCircle2 size={14} /> : "2"}
                                    </div>
                                    <span className={cn("text-sm font-bold tracking-wide", expandedBlock === 2 ? "text-white" : "text-white/50")}>MECÁNICA</span>
                                </div>
                                <ChevronDown size={16} className={cn("transition-transform duration-300 text-white/30", expandedBlock === 2 && "rotate-180")} />
                            </button>

                            <AnimatePresence initial={false}>
                                {expandedBlock === 2 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-4 pb-4 space-y-4"
                                    >
                                        {/* Frequency */}
                                        <div className="bg-black/20 rounded-xl p-1 flex">
                                            {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                                <button 
                                                    key={f} 
                                                    onClick={() => setFreq(f)} 
                                                    className={cn(
                                                        "flex-1 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all",
                                                        freq === f ? "bg-white/10 text-white shadow-sm border border-white/10" : "text-slate-500 hover:text-white"
                                                    )}
                                                >
                                                    {t(`modals.habit.frequencies.${f}`)}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        {freq === 'WEEKLY' && (
                                            <div className="flex justify-between animate-in slide-in-from-top-2 fade-in px-1">
                                                {['S','M','T','W','T','F','S'].map((day, i) => (
                                                    <button 
                                                        key={i} 
                                                        onClick={() => setWeekDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])} 
                                                        className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border",
                                                            weekDays.includes(i) ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Logic */}
                                        <div className="grid grid-cols-1 gap-2">
                                            <button 
                                                onClick={() => setLogic(t => t === 'BOOLEAN' ? 'QUANTITY' : t === 'QUANTITY' ? 'CHECKLIST' : 'BOOLEAN')} 
                                                className="bg-black/20 rounded-xl p-3 flex items-center justify-between group hover:bg-black/30 transition-colors border border-white/5"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", logic === 'BOOLEAN' ? "bg-green-500/20 text-green-400" : logic === 'QUANTITY' ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400")}>
                                                        {logic === 'BOOLEAN' ? <CheckCircle2 size={16} /> : logic === 'QUANTITY' ? <Hash size={16} /> : <List size={16} />}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('modals.habit.logic')}</span>
                                                        <span className="text-sm font-bold text-white capitalize">{t(`modals.habit.logics.${logic}`)}</span>
                                                    </div>
                                                </div>
                                                <ChevronDown size={14} className="text-white/30" />
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
                                                    <input type="text" placeholder="pág" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-lg font-bold text-white outline-none px-1" />
                                                </div>
                                            </div>
                                        )}

                                        {logic === 'CHECKLIST' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex gap-2 bg-black/20 rounded-xl p-1 border border-white/5">
                                                    <input type="text" placeholder={t('modals.quest.addStepPlaceholder')} value={newSubtask} onChange={e => setNewSubtask(e.target.value)} className="flex-1 bg-transparent text-sm font-medium text-white outline-none px-3" />
                                                    <button onClick={() => { if(newSubtask) { setSubtasks([...subtasks, newSubtask]); setNewSubtask(''); } }} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"><Plus size={14} /></button>
                                                </div>
                                                <div className="space-y-1 pl-1">
                                                    {subtasks.map((task, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" /> {task}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Impact */}
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-white/30 uppercase pl-1">Impacto Positivo</span>
                                            <div className="h-10 bg-black/30 rounded-full p-1 flex gap-1">
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
                                                className="px-6 py-2 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform"
                                            >
                                                Siguiente
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
                                className="w-full flex items-center justify-between p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors", expandedBlock === 3 ? "bg-white text-black" : (isBlock3Valid || initialData) ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/50")}>
                                        {expandedBlock === 3 ? "3" : (isBlock3Valid || initialData) ? <CheckCircle2 size={14} /> : "3"}
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
                                        className="px-4 pb-4 space-y-4"
                                    >
                                        {/* Estimated Time */}
                                        <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between border border-white/5">
                                             <div className="flex items-center gap-2">
                                                 <Clock size={16} className="text-purple-400" />
                                                 <span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.quest.estimatedTime') || "Tiempo Diario"}</span>
                                             </div>
                                             <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1 border border-white/5 focus-within:border-white/20 transition-colors w-24">
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

                                        {/* Reminder */}
                                        <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between border border-white/5 group">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={16} className="text-orange-400" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.habit.alert') || "Alerta"}</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="time" 
                                                    value={reminder} 
                                                    onChange={(e) => setReminder(e.target.value)} 
                                                    className="bg-transparent text-sm font-bold text-white outline-none w-24 text-right cursor-pointer z-10 relative" 
                                                />
                                                {!reminder && <span className="absolute right-0 top-0 text-sm font-bold text-white/20 pointer-events-none">OFF</span>}
                                            </div>
                                        </div>

                                        {/* Project Link */}
                                        <div className="relative">
                                            <button 
                                                onClick={() => setProjectPickerOpen(!isProjectPickerOpen)}
                                                className={cn(
                                                    "w-full bg-black/20 rounded-xl p-3 flex items-center justify-between border border-white/5 transition-colors",
                                                    projectId ? "border-indigo-500/30 bg-indigo-500/5" : "hover:bg-black/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Target size={16} className={projectId ? "text-indigo-400" : "text-slate-500"} />
                                                    <span className={cn("text-[10px] font-bold uppercase", projectId ? "text-indigo-300" : "text-slate-400")}>
                                                        {projectId ? projects.find(p => p.id === projectId)?.title : "Vincular Proyecto (Opcional)"}
                                                    </span>
                                                </div>
                                                <ChevronDown size={14} className="text-white/30" />
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
                                                            <span className="text-xs font-bold text-white/50">Sin Proyecto</span>
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
                    <div className="p-4 mt-auto border-t border-white/5 flex flex-col gap-3">
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
                                        <Zap size={12} className="text-yellow-400" />
                                        <span className="text-[10px] font-black text-white">{prediction.xp} XP</span>
                                    </div>
                                    
                                    {/* Gold */}
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                        <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                                        <span className="text-[10px] font-black text-white">{prediction.coins} G</span>
                                    </div>

                                    {/* Trait XP */}
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                        <SelectedIcon size={12} style={{ color: activeColor }} />
                                        <span className="text-[10px] font-black text-white">+{prediction.traitXp} {activeLabel}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <button 
                            disabled={!canSubmit}
                            onClick={() => {
                                onConfirm({
                                    title,
                                    description: desc,
                                    attribute: attrId,
                                    projectId: projectId || undefined,
                                    smartProjectId: smartProjectId || undefined,
                                    frequency: freq as any,
                                    type: logic,
                                    targetValue: logic === 'QUANTITY' ? parseInt(target) : 1,
                                    unit,
                                    checklist: logic === 'CHECKLIST' ? subtasks.map((t, i) => ({ id: i.toString(), text: t, completed: false })) : [],
                                    reminderTime: reminder,
                                    estimatedTime,
                                    customColor,
                                    iconName: customIconName || undefined,
                                    impact
                                });
                                onClose();
                            }}
                            className="w-full h-12 bg-white rounded-xl font-black text-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {initialData ? 'Guardar Cambios' : 'Crear Hábito'} <ArrowUp size={18} />
                            </span>
                            {canSubmit && (
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}, (prev, next) => prev.isOpen === next.isOpen && prev.initialData === next.initialData);
