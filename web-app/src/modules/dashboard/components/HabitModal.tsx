import React, { useState, useMemo } from 'react';
import { X, Infinity as InfinityIcon, Plus, Clock, CheckCircle2, Hash, List, ArrowUp, ChevronDown, ChevronUp, Star, Target } from 'lucide-react';
import { Attribute, Habit, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards, Difficulty } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { useTranslation } from 'react-i18next';

export const HabitModal = React.memo(({ isOpen, onClose, attributes, smartProjects, projects = [], onConfirm, initialData }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], smartProjects?: SmartProject[], projects?: Project[], onConfirm: (data: Partial<Habit>) => void, initialData?: Habit }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [smartProjectId, setSmartProjectId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [freq, setFreq] = useState('DAILY');
    const [weekDays, setWeekDays] = useState<number[]>([]);
    const [monthCount, setMonthCount] = useState(1);
    const [logic, setLogic] = useState<'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN'>('BOOLEAN');
    const [target, setTarget] = useState('');
    const [unit, setUnit] = useState('');
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [isProjectPickerOpen, setProjectPickerOpen] = useState(false);

    // Reset or Populate form on open
    React.useEffect(() => {
        if (isOpen) {
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
                // WeekDays/MonthCount not standard in basic Habit interface shown but if they exist in custom fields:
                // Assuming defaults for now as they weren't in the partial type clearly.
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
                setMonthCount(1);
                setLogic('BOOLEAN');
                setTarget('');
                setUnit('');
                setSubtasks([]);
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
        return calculateTaskRewards(difficulty, null, estimatedTime);
    }, [difficulty, estimatedTime]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95" onClick={onClose} />
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
                    <div className="flex justify-between items-center mb-4 px-1 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : 'linear-gradient(135deg, #06b6d4, #2563eb)' }}>
                                <InfinityIcon size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">Nuevo Hábito</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 relative">
                            <div className="relative">
                                <button 
                                    onClick={() => setProjectPickerOpen(!isProjectPickerOpen)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${projectId ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    title={projectId ? projects.find(p => p.id === projectId)?.title : t('modals.quest.linkProject')}
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
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                        </div>
                    </div>

                    {/* Reward Prediction - Top Location */}
                    <div className="mb-4 px-1">
                        <RewardPredictionPill 
                            prediction={prediction} 
                            attributeColor={activeColor} 
                            AttributeIcon={SelectedIcon}
                            attributeLabel={activeLabel}
                        />
                    </div>

                    <div className="overflow-y-auto no-scrollbar pb-4 space-y-2">
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-all"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('modals.habit.namePlaceholder')} className="w-full h-full bg-transparent px-5 text-[17px] font-bold text-white placeholder:text-white/20 outline-none" /></div>
                             <div onClick={() => setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`}>
                                 {attrId ? (<SelectedIcon size={20} style={{ color: activeColor }} />) : <Plus size={20} className="text-white/30" />}
                                 {isAttrPickerOpen && (<><div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} /><div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>{attributes.map((attr) => {
                                     const Icon = attr.icon;
                                     return (
                                         <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10"><Icon size={16} style={{ color: attr.color }} /><span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span></button>
                                     )
                                 })}</div></>)}
                             </div>
                        </div>
                        
                        {smartProjects && smartProjects.length > 0 && (
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-2 px-4 flex items-center gap-3">
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

                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-3 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                 <Clock size={16} className="text-purple-400" />
                                 <span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.quest.estimatedTime') || "Est. Time (min)"}</span>
                             </div>
                             <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2 border border-white/5 focus-within:border-white/20 transition-colors w-24">
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

                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-3"><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('modals.habit.descPlaceholder')} className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" /></div>
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-1 overflow-hidden transition-all duration-300">
                             <div className="flex p-1 gap-1">{['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (<button key={f} onClick={() => setFreq(f)} className={`flex-1 py-2 rounded-[1.2rem] text-[10px] font-black tracking-wide transition-all ${freq === f ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t(`modals.habit.frequencies.${f}`)}</button>))}</div>
                             {freq === 'WEEKLY' && (<div className="p-3 pt-1 flex justify-between animate-in slide-in-from-top-2 fade-in">{['S','M','T','W','T','F','S'].map((day, i) => (<button key={i} onClick={() => setWeekDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${weekDays.includes(i) ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-slate-500'}`}>{day}</button>))}</div>)}
                             {freq === 'MONTHLY' && (<div className="p-4 flex items-center justify-between animate-in slide-in-from-top-2 fade-in"><span className="text-xs font-bold text-slate-400">Times per month</span><div className="flex items-center gap-4"><button onClick={() => setMonthCount(c => Math.max(1, c - 1))} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronDown size={14} /></button><span className="text-xl font-black text-white">{monthCount}</span><button onClick={() => setMonthCount(c => Math.min(30, c + 1))} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronUp size={14} /></button></div></div>)}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-3 flex flex-col justify-center relative overflow-hidden group"><div className="flex items-center gap-2 mb-1"><Clock size={16} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.habit.alert')}</span></div><input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="bg-transparent text-2xl font-black text-white outline-none w-full z-10 relative" />{!reminder && <span className="absolute left-4 bottom-4 text-2xl font-black text-white/10 pointer-events-none">OFF</span>}</div>
                            <button onClick={() => setLogic(t => t === 'BOOLEAN' ? 'QUANTITY' : t === 'QUANTITY' ? 'CHECKLIST' : 'BOOLEAN')} className="bg-white/5 rounded-[1.5rem] border border-white/5 p-3 flex flex-col items-start justify-center relative active:scale-95 transition-all"><div className="flex items-center gap-2 mb-1">{logic === 'BOOLEAN' ? <CheckCircle2 size={16} className="text-green-400" /> : logic === 'QUANTITY' ? <Hash size={16} className="text-blue-400" /> : <List size={16} className="text-yellow-400" />}<span className="text-[10px] font-bold text-slate-400 uppercase">{t('modals.habit.logic')}</span></div><span className="text-lg font-bold text-white capitalize">{t(`modals.habit.logics.${logic}`)}</span></button>
                        </div>
                        {logic === 'QUANTITY' && (<div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-3 animate-in fade-in slide-in-from-top-2"><div className="flex gap-4"><div className="flex-1"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">{t('modals.habit.target')}</span><input type="number" placeholder="10" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/10" /></div><div className="w-[1px] bg-white/10" /><div className="flex-1"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">{t('modals.habit.unit')}</span><input type="text" placeholder="pages" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/10" /></div></div></div>)}
                        {logic === 'CHECKLIST' && (<div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-3 animate-in fade-in slide-in-from-top-2 space-y-3"><div className="flex gap-2"><input type="text" placeholder={t('modals.quest.addStepPlaceholder')} value={newSubtask} onChange={e => setNewSubtask(e.target.value)} className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/20" /><button onClick={() => { if(newSubtask) { setSubtasks([...subtasks, newSubtask]); setNewSubtask(''); } }} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Plus size={12} /></button></div><div className="space-y-1">{subtasks.map((task, i) => (<div key={i} className="flex items-center gap-2 text-xs text-slate-400 bg-black/20 p-2 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> {task}</div>))}{subtasks.length === 0 && <span className="text-[10px] text-slate-600 italic pl-2">{t('modals.habit.noSteps')}</span>}</div></div>)}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-3 flex items-center gap-4"><span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">{t('modals.habit.impact')}</span><div className="flex-1 h-8 bg-black/30 rounded-full relative p-1 flex gap-1">{[1,2,3,4].map(lvl => (<button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-300 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />))}</div></div>
                        
                    </div>
                    <div className="pt-2">
                        <button 
                            onClick={() => onConfirm({ 
                                title, 
                                description: desc, 
                                attribute: attrId, 
                                frequency: freq, 
                                type: logic, 
                                targetValue: parseFloat(target), 
                                unit, 
                                checklist: subtasks.map((t, i) => ({ id: i.toString(), text: t, completed: false })), 
                                reminderTime: reminder,
                                projectId: smartProjectId || projectId || undefined,
                                estimatedTime
                            })} 
                            disabled={!title || !attrId} 
                            className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'text-white shadow-xl active:scale-95 border border-white/20 hover:shadow-2xl hover:border-white/40'}`}
                            style={{
                                background: (!title || !attrId) 
                                    ? undefined 
                                    : `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
                                boxShadow: (!title || !attrId) 
                                    ? undefined 
                                    : `0 8px 20px -4px ${activeColor}60, inset 0 1px 0 0 rgba(255,255,255,0.3)`
                            }}
                        >
                            {t('modals.habit.initiate')} <ArrowUp size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
