import React, { useState, useMemo } from 'react';
import { X, Briefcase, Plus, Target, ChevronDown, ChevronUp, Hourglass, Bell, ArrowUp, Star, Calendar, Calculator, Loader2 } from 'lucide-react';
import { Attribute, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards, Difficulty } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { useTranslation } from 'react-i18next';

export const ProjectModal = React.memo(({ isOpen, onClose, attributes, smartProjects, onConfirm, initialData }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], smartProjects?: SmartProject[], onConfirm: (data: Partial<Project>) => void, initialData?: Partial<Project> }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [smartProjectId, setSmartProjectId] = useState('');
    const [goalTarget, setGoalTarget] = useState(10);
    const [goalFreq, setGoalFreq] = useState('DAILY');
    const [pomoDuration, setPomoDuration] = useState(25);
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset or Populate form on open
    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setDesc(initialData.description || '');
                setAttrId(initialData.attribute || '');
                setSmartProjectId(initialData.smartProjectId || '');
                // goalTarget logic is complex due to calculation, for now we skip complex reverse-calc or assume simpler default if not fully provided
                // setGoalTarget(...); 
                setPomoDuration(initialData.pomoDuration || 25);
                setReminder(initialData.reminder || '');
                setImpact(initialData.impact || 1);
            } else {
                setTitle('');
                setDesc('');
                setAttrId('');
                setSmartProjectId('');
                setGoalTarget(10);
                setPomoDuration(25);
                setReminder('');
                setImpact(1);
            }
        }
    }, [isOpen, initialData]);

    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#3b82f6';
    const SelectedIcon = selectedAttr?.icon || Star;
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
        
        // Wait a bit to prevent double clicks and show loading state (if onConfirm is sync)
        // If onConfirm is async, we should await it, but the prop type is void.
        // We'll add a small artificial delay to ensure UI feedback.
        await new Promise(resolve => setTimeout(resolve, 500));
        
        onConfirm({ 
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
        
        setIsSubmitting(false);
        // onClose is usually handled by parent after update, but if not:
        // onClose(); 
    };

    const DAYS = t('modals.project.daysInitials', { returnObjects: true }) as string[];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95" onClick={!isSubmitting ? onClose : undefined} />
            <div className="relative z-10 w-full max-w-[360px]">
                <div 
                    className="rounded-[2.5rem] p-5 overflow-visible flex flex-col max-h-[85vh] relative"
                    style={{
                        background: '#0a0a0a',
                        border: `2px solid ${attrId ? activeColor : 'rgba(255, 255, 255, 0.1)'}`,
                        boxShadow: attrId 
                            ? `0 0 0 1px ${activeColor}20, 0 10px 40px -10px ${activeColor}40`
                            : '0 10px 30px -10px rgba(0,0,0,0.8)'
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : 'linear-gradient(135deg, #06b6d4, #2563eb)' }}>
                                <Briefcase size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">{t('modals.project.title')}</h2>
                                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">{t('modals.project.subtitle')}</span>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"><X size={16} /></button>
                    </div>
                    
                    <div className="overflow-y-auto no-scrollbar pb-4 space-y-3">
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-all">
                                 <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('modals.project.namePlaceholder')} className="w-full h-full bg-transparent px-5 text-[16px] font-bold text-white placeholder:text-white/20 outline-none" />
                             </div>
                             <div onClick={() => !isSubmitting && setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`}>
                                 {attrId ? (<SelectedIcon size={20} style={{ color: activeColor }} />) : <Plus size={20} className="text-white/30" />}
                                 {isAttrPickerOpen && (<><div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} /><div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>{attributes.map((attr) => {
                                     const Icon = attr.icon;
                                     return (
                                        <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10"><Icon size={16} style={{ color: attr.color }} /><span className="text-[9px] font-bold text-slate-400 mt-1">{t(`traits.${attr.id.toLowerCase()}.label`)}</span></button>
                                    )
                                })}</div></>)}
                             </div>
                        </div>

                        {smartProjects && smartProjects.length > 0 && (
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-2 px-4 flex items-center gap-3 mb-2">
                                <Target size={16} className="text-indigo-400 shrink-0" />
                                <select 
                                    value={smartProjectId} 
                                    onChange={(e) => setSmartProjectId(e.target.value)} 
                                    className="w-full bg-transparent text-sm font-medium text-white outline-none appearance-none cursor-pointer"
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

                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4">
                            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('modals.project.descPlaceholder')} className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" />
                        </div>

                        {/* Goal Section */}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1"><Target size={16} className="text-cyan-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.project.goalCalculation')}</span></div>
                            
                            <div className="flex justify-between items-center bg-black/20 rounded-xl p-1">
                                {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                    <button key={f} onClick={() => setGoalFreq(f)} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${goalFreq === f ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>{t(`modals.project.frequencies.${f}`)}</button>
                                ))}
                            </div>

                            {/* Goal Input */}
                            <div className="flex items-center justify-between px-2">
                                <button onClick={() => setGoalTarget(Math.max(1, goalTarget - 1))} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><ChevronDown size={14} /></button>
                                <div className="text-center">
                                    <span className="text-2xl font-black text-white">{goalTarget}</span>
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
                                            <div className="text-sm font-black text-white">{calculatedDailyGoal} {t('modals.project.hours')} <span className="text-white/50">/ {t('modals.project.day').toLowerCase()}</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col relative">
                                <div className="flex items-center gap-2 mb-2"><Hourglass size={16} className="text-yellow-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.project.pomodoro')}</span></div>
                                <div className="flex gap-1 mb-2">
                                    {[25, 45, 60].map(t => (
                                        <button key={t} onClick={() => setPomoDuration(t)} className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all ${pomoDuration === t ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-transparent border-white/10 text-slate-500'}`}>{t}</button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">{t('modals.project.custom')}:</span><input type="number" value={pomoDuration} onChange={(e) => setPomoDuration(parseInt(e.target.value) || 25)} className="w-12 bg-transparent border-b border-white/20 text-white font-mono text-sm text-center focus:border-white outline-none" /></div>
                            </div>
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden group">
                                <div className="flex items-center gap-2 mb-1"><Bell size={16} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.project.alert')}</span></div>
                                <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="bg-transparent text-2xl font-black text-white outline-none w-full z-10 relative" />
                                {!reminder && <span className="absolute left-4 bottom-4 text-2xl font-black text-white/10 pointer-events-none">{t('modals.project.off')}</span>}
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">{t('modals.project.impact')}</span>
                            <div className="flex-1 h-8 bg-black/30 rounded-full relative p-1 flex gap-1">
                                {[1,2,3,4].map(lvl => (
                                    <button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-300 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />
                                ))}
                            </div>
                        </div>

                        {/* Reward Prediction */}
                        <RewardPredictionPill 
                            prediction={prediction} 
                            attributeColor={activeColor} 
                            AttributeIcon={SelectedIcon}
                            attributeLabel={activeLabel}
                        />
                    </div>
                    
                    <div className="pt-2">
                        <button 
                            onClick={handleConfirm} 
                            disabled={!title || !attrId || isSubmitting} 
                            className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${(!title || !attrId || isSubmitting) ? 'bg-white/5 text-white/20' : 'text-white shadow-xl active:scale-95 border border-white/20 hover:shadow-2xl hover:border-white/40'}`}
                            style={{
                                background: (!title || !attrId || isSubmitting) 
                                    ? undefined 
                                    : `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
                                boxShadow: (!title || !attrId || isSubmitting) 
                                    ? undefined 
                                    : `0 8px 20px -4px ${activeColor}60, inset 0 1px 0 0 rgba(255,255,255,0.3)`
                            }}
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>{t('modals.project.launch')} <ArrowUp size={16} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
