import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    X, ArrowLeft, ArrowRight, Sparkles, Infinity as InfinityIcon, 
    Check, Calendar, Clock, Hash, List, CheckCircle2, Star, Target,
    Flame, Zap, Trophy, Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Attribute, Habit } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards, Difficulty } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { cn } from '../../../utils/cn';

interface HabitWizardProps {
    isOpen: boolean;
    onClose: () => void;
    attributes: Attribute[];
    smartProjects?: SmartProject[];
    onConfirm: (data: Partial<Habit>) => void;
    initialData?: Habit;
}

// --- SUB-COMPONENTS FOR STEPS ---

// STEP 1: IDENTITY (Name & Description)
const IdentityStep = ({ 
    title, setTitle, desc, setDesc, onNext 
}: { 
    title: string; setTitle: (v: string) => void; 
    desc: string; setDesc: (v: string) => void;
    onNext: () => void; 
}) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-4">
                <h2 className="text-3xl font-bold text-white tracking-tight">{t('wizard.habit.identityTitle') || "What is this new habit?"}</h2>
                <p className="text-white/50">{t('wizard.habit.identitySubtitle') || "Name it. Define it. Make it real."}</p>
            </div>

            <div className="space-y-4">
                <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur"></div>
                    <div className="relative bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                        <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1 block">Habit Name</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Morning Meditation" 
                            className="w-full bg-transparent text-xl font-bold text-white placeholder:text-white/20 outline-none"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur"></div>
                    <div className="relative bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Description (Optional)</label>
                        <textarea 
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Why are you doing this?" 
                            className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/10 outline-none resize-none h-20"
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={onNext}
                disabled={!title.trim()}
                className="mt-4 w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
                Next <ArrowRight size={20} />
            </button>
        </div>
    );
};

// STEP 2: TRAIT (Attribute Selection)
const TraitStep = ({ 
    attributes, selectedAttrId, onSelect, onNext, onBack 
}: { 
    attributes: Attribute[]; 
    selectedAttrId: string; 
    onSelect: (id: string) => void; 
    onNext: () => void;
    onBack: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-center space-y-2 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">{t('wizard.habit.traitTitle') || "Choose your Path"}</h2>
                <p className="text-white/50">{t('wizard.habit.traitSubtitle') || "Which attribute does this habit evolve?"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-1 custom-scrollbar">
                {attributes.map(attr => {
                    const Icon = attr.icon || Star;
                    const isSelected = selectedAttrId === attr.id;
                    return (
                        <button
                            key={attr.id}
                            onClick={() => onSelect(attr.id)}
                            className={cn(
                                "relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-300",
                                isSelected 
                                    ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02]" 
                                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                            )}
                        >
                            <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors"
                                style={{ backgroundColor: isSelected ? attr.color : 'rgba(255,255,255,0.1)', color: isSelected ? 'white' : attr.color }}
                            >
                                <Icon size={20} />
                            </div>
                            <span className="text-sm font-bold text-white">{attr.label}</span>
                            {isSelected && (
                                <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/20" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-3 mt-4">
                <button 
                    onClick={onBack}
                    className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
                >
                    Back
                </button>
                <button 
                    onClick={onNext}
                    disabled={!selectedAttrId}
                    className="flex-[2] py-4 bg-white text-black rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                    Next <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

// STEP 3: LOGIC (Frequency & Type)
const LogicStep = ({ 
    freq, setFreq, weekDays, setWeekDays, monthCount, setMonthCount,
    logic, setLogic, target, setTarget, unit, setUnit,
    subtasks, setSubtasks,
    onNext, onBack
}: {
    freq: string; setFreq: (v: string) => void;
    weekDays: number[]; setWeekDays: (v: React.SetStateAction<number[]>) => void;
    monthCount: number; setMonthCount: (v: React.SetStateAction<number>) => void;
    logic: 'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN'; setLogic: (v: any) => void;
    target: string; setTarget: (v: string) => void;
    unit: string; setUnit: (v: string) => void;
    subtasks: string[]; setSubtasks: (v: string[]) => void;
    onNext: () => void; onBack: () => void;
}) => {
    const { t } = useTranslation();
    const [newSubtask, setNewSubtask] = useState('');

    return (
        <div className="flex flex-col gap-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-center space-y-2 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">{t('wizard.habit.logicTitle') || "How does it work?"}</h2>
                <p className="text-white/50">{t('wizard.habit.logicSubtitle') || "Set the rules of engagement."}</p>
            </div>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto p-1 custom-scrollbar">
                {/* FREQUENCY */}
                <div className="bg-white/5 rounded-3xl p-1 flex">
                    {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                        <button 
                            key={f} 
                            onClick={() => setFreq(f)}
                            className={cn(
                                "flex-1 py-3 rounded-2xl text-xs font-bold transition-all duration-300",
                                freq === f ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* FREQUENCY DETAILS */}
                {freq === 'WEEKLY' && (
                    <div className="flex justify-between bg-white/5 rounded-3xl p-4">
                        {['S','M','T','W','T','F','S'].map((day, i) => (
                            <button 
                                key={i} 
                                onClick={() => setWeekDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                    weekDays.includes(i) ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-white/5 text-slate-500"
                                )}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                )}
                {freq === 'MONTHLY' && (
                    <div className="flex items-center justify-between bg-white/5 rounded-3xl p-4">
                        <span className="text-sm font-bold text-slate-400">Times per month</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setMonthCount(c => Math.max(1, c - 1))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ArrowLeft size={14}/></button>
                            <span className="text-xl font-bold text-white">{monthCount}</span>
                            <button onClick={() => setMonthCount(c => Math.min(30, c + 1))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ArrowRight size={14}/></button>
                        </div>
                    </div>
                )}

                {/* TYPE / LOGIC */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'BOOLEAN', icon: CheckCircle2, label: 'Yes/No' },
                        { id: 'QUANTITY', icon: Hash, label: 'Number' },
                        { id: 'CHECKLIST', icon: List, label: 'List' }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => setLogic(type.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border transition-all",
                                logic === type.id 
                                    ? "bg-white/10 border-white/40 shadow-lg" 
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            <type.icon size={20} className={logic === type.id ? "text-white" : "text-slate-500"} />
                            <span className={cn("text-[10px] font-bold uppercase", logic === type.id ? "text-white" : "text-slate-500")}>{type.label}</span>
                        </button>
                    ))}
                </div>

                {/* LOGIC DETAILS */}
                {logic === 'QUANTITY' && (
                    <div className="flex gap-3 animate-in slide-in-from-top-2 fade-in">
                        <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target</label>
                            <input type="number" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none" placeholder="10" />
                        </div>
                        <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Unit</label>
                            <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none" placeholder="pages" />
                        </div>
                    </div>
                )}

                {logic === 'CHECKLIST' && (
                    <div className="bg-white/5 rounded-3xl p-4 border border-white/10 space-y-3 animate-in slide-in-from-top-2 fade-in">
                         <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newSubtask} 
                                onChange={e => setNewSubtask(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter' && newSubtask) { setSubtasks([...subtasks, newSubtask]); setNewSubtask(''); } }}
                                placeholder="Add step..." 
                                className="flex-1 bg-transparent text-sm font-medium text-white outline-none" 
                            />
                            <button onClick={() => { if(newSubtask) { setSubtasks([...subtasks, newSubtask]); setNewSubtask(''); } }} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"><Sparkles size={14} /></button>
                        </div>
                        <div className="space-y-1">
                            {subtasks.map((task, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 bg-black/20 rounded-xl">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    <span className="text-sm text-slate-300">{task}</span>
                                    <button onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))} className="ml-auto text-slate-600 hover:text-red-400"><X size={12}/></button>
                                </div>
                            ))}
                            {subtasks.length === 0 && <p className="text-xs text-slate-600 italic text-center py-2">No steps defined yet.</p>}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-3 mt-4">
                <button onClick={onBack} className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">Back</button>
                <button onClick={onNext} className="flex-[2] py-4 bg-white text-black rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2">Next <ArrowRight size={20} /></button>
            </div>
        </div>
    );
};

// STEP 4: IMPACT & REWARDS
const ImpactStep = ({
    impact, setImpact, reminder, setReminder, attribute, onNext, onBack
}: {
    impact: number; setImpact: (v: number) => void;
    reminder: string; setReminder: (v: string) => void;
    attribute?: Attribute;
    onNext: () => void; onBack: () => void;
}) => {
    const { t } = useTranslation();
    
    // Calculate rewards preview
    const difficultyMap: Record<number, Difficulty> = { 1: 'C', 2: 'B', 3: 'A', 4: 'S' };
    const difficulty = difficultyMap[impact] || 'C';
    const rewards = useMemo(() => calculateTaskRewards(difficulty), [difficulty]);
    const AttrIcon = attribute?.icon || Star;

    return (
        <div className="flex flex-col gap-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">{t('wizard.habit.impactTitle') || "Positive Impact"}</h2>
                <p className="text-white/50">{t('wizard.habit.impactSubtitle') || "How much does this change your life?"}</p>
            </div>

            <div className="space-y-6">
                {/* IMPACT SLIDER */}
                <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase">Impact Level</span>
                        <span className={cn("text-xs font-bold uppercase", 
                            impact === 1 ? "text-slate-400" : 
                            impact === 2 ? "text-cyan-400" : 
                            impact === 3 ? "text-purple-400" : "text-orange-400"
                        )}>
                            {impact === 1 ? 'Standard' : impact === 2 ? 'High' : impact === 3 ? 'Life Changing' : 'God Tier'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setImpact(lvl)}
                                className={cn(
                                    "flex-1 h-12 rounded-2xl transition-all duration-300 relative overflow-hidden group",
                                    impact >= lvl 
                                        ? lvl === 1 ? 'bg-slate-500' : lvl === 2 ? 'bg-cyan-500' : lvl === 3 ? 'bg-purple-500' : 'bg-orange-500' 
                                        : "bg-white/5"
                                )}
                            >
                                {impact >= lvl && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* REMINDER */}
                <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-indigo-400">
                            <Clock size={20} />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white block">Reminder</span>
                            <span className="text-xs text-slate-500">Notify me at</span>
                        </div>
                    </div>
                    <input 
                        type="time" 
                        value={reminder} 
                        onChange={(e) => setReminder(e.target.value)} 
                        className="bg-transparent text-xl font-bold text-white outline-none text-right w-32" 
                    />
                </div>

                {/* REWARD PREVIEW */}
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl p-5 border border-white/10">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-3 text-center">Rewards per completion</span>
                    <div className="flex items-center justify-center gap-6">
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-yellow-400">{rewards.xp}</span>
                            <span className="text-[10px] font-bold text-yellow-400/50 uppercase">XP</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-black" style={{ color: attribute?.color || '#fff' }}>{Math.floor(rewards.xp * 0.4)}</span>
                            <div className="flex items-center gap-1 text-[10px] font-bold opacity-50 uppercase" style={{ color: attribute?.color || '#fff' }}>
                                <AttrIcon size={10} /> {attribute?.label || 'Trait'}
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-amber-500">{rewards.gold}</span>
                            <span className="text-[10px] font-bold text-amber-500/50 uppercase">Gold</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mt-4">
                <button onClick={onBack} className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">Back</button>
                <button onClick={onNext} className="flex-[2] py-4 bg-white text-black rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2">Next <ArrowRight size={20} /></button>
            </div>
        </div>
    );
};

// STEP 5: SUMMARY (Confirm)
const SummaryStep = ({
    title, desc, attribute, freq, impact, logic, onConfirm, onBack
}: {
    title: string; desc: string; attribute?: Attribute; freq: string; impact: number; logic: string;
    onConfirm: () => void; onBack: () => void;
}) => {
    const { t } = useTranslation();
    const AttrIcon = attribute?.icon || Star;
    const color = attribute?.color || '#fff';

    return (
        <div className="flex flex-col gap-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-center space-y-2 mb-4">
                <h2 className="text-3xl font-bold text-white tracking-tight">{t('wizard.habit.summaryTitle') || "Ready to initiate?"}</h2>
                <p className="text-white/50">{t('wizard.habit.summarySubtitle') || "Confirm your new protocol."}</p>
            </div>

            <div className="relative bg-black/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 overflow-hidden group">
                {/* Glow Effect */}
                <div 
                    className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-700" 
                    style={{ backgroundColor: color }}
                />

                <div className="relative z-10 flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: `${color}20`, color: color }}>
                            <AttrIcon size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>
                            <p className="text-sm text-slate-400">{desc || "No description provided."}</p>
                        </div>
                    </div>

                    <div className="h-px bg-white/10 w-full" />

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Frequency</span>
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-400" /> {freq}
                            </span>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Impact</span>
                            <span className={cn("text-sm font-bold flex items-center gap-2", 
                                impact >= 3 ? "text-orange-400" : "text-white"
                            )}>
                                <Zap size={14} /> Level {impact}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mt-4">
                <button onClick={onBack} className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">Back</button>
                <button 
                    onClick={onConfirm}
                    className="flex-[2] py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, boxShadow: `0 8px 30px -4px ${color}50` }}
                >
                    Yes, let's do it! <Check size={20} />
                </button>
            </div>
        </div>
    );
};

// --- MAIN WIZARD COMPONENT ---

export const HabitWizard = React.memo(({ isOpen, onClose, attributes, smartProjects, onConfirm, initialData }: HabitWizardProps) => {
    const [step, setStep] = useState(0);

    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [freq, setFreq] = useState('DAILY');
    const [weekDays, setWeekDays] = useState<number[]>([]);
    const [monthCount, setMonthCount] = useState(1);
    const [logic, setLogic] = useState<'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN'>('BOOLEAN');
    const [target, setTarget] = useState('');
    const [unit, setUnit] = useState('');
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [smartProjectId, setSmartProjectId] = useState('');

    // Pre-fill if editing
    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setDesc(initialData.description || '');
            setAttrId(initialData.attribute);
            setFreq(initialData.frequency);
            setLogic(initialData.type);
            setTarget(initialData.targetValue?.toString() || '');
            setUnit(initialData.unit || '');
            setSubtasks(initialData.checklist?.map(c => c.text) || []);
            setReminder(initialData.reminderTime || '');
            // Impact is not stored directly on habit usually, or it's implicitly part of it? 
            // Checking types: Habit doesn't have impact field explicitly in the interface shown in `types/index.ts`. 
            // Wait, let me check the `Habit` type again.
            // Ah, `Habit` interface in `types/index.ts` does NOT have `impact`.
            // However, `HabitModal` had `impact` state. Where does it go?
            // `HabitModal` calculates `difficulty` from `impact` but `Habit` interface doesn't seem to store difficulty?
            // `Quest` has `difficulty`. `Habit` doesn't seem to have it in the type definition I saw.
            // Let's check `HabitModal` onConfirm again.
            // `onConfirm({ title, ..., frequency, type, targetValue, unit, checklist, reminderTime, projectId })`
            // It seems `impact` is used for Reward Prediction in Modal but NOT saved to Habit?
            // Or maybe it is saved but missing from type?
            // In `HabitModal.tsx`: `const difficulty = difficultyMap[impact] || 'C';` -> `calculateTaskRewards(difficulty)`.
            // But `onConfirm` payload does NOT include impact or difficulty.
            // So for Habits, rewards might be calculated dynamically or fixed?
            // If the user wants "Impact", maybe we should save it?
            // For now I will keep it as local state for the "Experience" but if it's not saved, I can't pre-fill it accurately.
            // I'll default to 1 or try to infer if possible (unlikely).
            
            setSmartProjectId(initialData.projectId || '');
        } else {
            // Reset
            setStep(0);
            setTitle('');
            setDesc('');
            setAttrId('');
            setFreq('DAILY');
            setLogic('BOOLEAN');
            setTarget('');
            setUnit('');
            setSubtasks([]);
            setReminder('');
            setImpact(1);
        }
    }, [initialData, isOpen]);

    const selectedAttr = attributes.find(a => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#4f46e5'; // Indigo default

    const handleConfirm = () => {
        onConfirm({
            ...(initialData || {}), // Keep ID if editing
            title,
            description: desc,
            attribute: attrId,
            frequency: freq,
            type: logic,
            targetValue: target ? parseFloat(target) : undefined,
            unit,
            checklist: subtasks.map((t, i) => ({ id: i.toString(), text: t, completed: false })),
            reminderTime: reminder,
            projectId: smartProjectId || undefined,
            // If we want to support difficulty, we'd need to add it to Habit type.
            // For now, adhere to existing type.
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 overflow-hidden">
            {/* Dynamic Background */}
            <div 
                className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-in-out"
                style={{ 
                    background: attrId 
                        ? `radial-gradient(circle at 50% 50%, ${activeColor}20 0%, #000000 90%)`
                        : 'radial-gradient(circle at 50% 50%, #4f46e510 0%, #000000 90%)'
                }}
            />

            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-50 backdrop-blur-md"
            >
                <X size={24} />
            </button>

            {/* Main Content */}
            <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div key="step0" exit={{ opacity: 0, x: -20 }} className="w-full flex justify-center">
                            <IdentityStep 
                                title={title} setTitle={setTitle} 
                                desc={desc} setDesc={setDesc} 
                                onNext={() => setStep(1)} 
                            />
                        </motion.div>
                    )}
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} exit={{ opacity: 0, x: -20 }} className="w-full flex justify-center">
                            <TraitStep 
                                attributes={attributes} 
                                selectedAttrId={attrId} 
                                onSelect={setAttrId} 
                                onNext={() => setStep(2)} 
                                onBack={() => setStep(0)} 
                            />
                        </motion.div>
                    )}
                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} exit={{ opacity: 0, x: -20 }} className="w-full flex justify-center">
                            <LogicStep 
                                freq={freq} setFreq={setFreq}
                                weekDays={weekDays} setWeekDays={setWeekDays}
                                monthCount={monthCount} setMonthCount={setMonthCount}
                                logic={logic} setLogic={setLogic}
                                target={target} setTarget={setTarget}
                                unit={unit} setUnit={setUnit}
                                subtasks={subtasks} setSubtasks={setSubtasks}
                                onNext={() => setStep(3)}
                                onBack={() => setStep(1)}
                            />
                        </motion.div>
                    )}
                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} exit={{ opacity: 0, x: -20 }} className="w-full flex justify-center">
                            <ImpactStep 
                                impact={impact} setImpact={setImpact}
                                reminder={reminder} setReminder={setReminder}
                                attribute={selectedAttr}
                                onNext={() => setStep(4)}
                                onBack={() => setStep(2)}
                            />
                        </motion.div>
                    )}
                    {step === 4 && (
                        <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} className="w-full flex justify-center">
                            <SummaryStep 
                                title={title} desc={desc} attribute={selectedAttr}
                                freq={freq} impact={impact} logic={logic}
                                onConfirm={handleConfirm} onBack={() => setStep(3)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Progress Dots */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-50">
                {[0, 1, 2, 3, 4].map(s => (
                    <div 
                        key={s} 
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-500",
                            s === step ? "w-8 bg-white" : "w-1.5 bg-white/20"
                        )} 
                    />
                ))}
            </div>
        </div>
    );
});
