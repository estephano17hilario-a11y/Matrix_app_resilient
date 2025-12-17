import React, { useState, useMemo } from 'react';
import { X, Briefcase, Plus, Target, ChevronDown, ChevronUp, Hourglass, Bell, ArrowUp, Star, Calendar, Calculator, Loader2 } from 'lucide-react';
import { Attribute, Project } from '../../../types';

export const ProjectModal = React.memo(({ isOpen, onClose, attributes, onConfirm }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], onConfirm: (data: Partial<Project>) => void }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [goalTarget, setGoalTarget] = useState(10);
    const [goalFreq, setGoalFreq] = useState('DAILY');
    const [pomoDuration, setPomoDuration] = useState(25);
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;
    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#3b82f6';
    const SelectedIcon = selectedAttr?.icon || Star;

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
            goalTarget: calculatedDailyGoal, // Use the calculated daily goal
            goalFrequency: 'DAILY', // Always save as DAILY so the tracker works per day
            pomoDuration, 
            breakDuration: 5, 
            reminder, 
            impact,
            workingDays: goalFreq === 'DAILY' ? undefined : workingDays 
        });
        
        setIsSubmitting(false);
        // onClose is usually handled by parent after update, but if not:
        // onClose(); 
    };

    const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={!isSubmitting ? onClose : undefined} />
            <div className="relative z-10 w-full max-w-[360px] animate-modal-enter">
                <div className="glass-panel rounded-[2.5rem] p-5 overflow-visible flex flex-col max-h-[85vh] relative shadow-2xl transition-colors duration-500">
                    <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : 'linear-gradient(135deg, #06b6d4, #2563eb)' }}>
                                <Briefcase size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">New Project</h2>
                                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Focus Engine</span>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSubmitting} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"><X size={16} /></button>
                    </div>
                    
                    <div className="overflow-y-auto no-scrollbar pb-4 space-y-3">
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-all">
                                 <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project Name..." className="w-full h-full bg-transparent px-5 text-[16px] font-bold text-white placeholder:text-white/20 outline-none" autoFocus />
                             </div>
                             <div onClick={() => !isSubmitting && setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`}>
                                 {attrId ? (<SelectedIcon size={20} style={{ color: activeColor }} />) : <Plus size={20} className="text-white/30" />}
                                 {isAttrPickerOpen && (<><div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} /><div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>{attributes.map((attr) => {
                                     const Icon = attr.icon;
                                     return (
                                         <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10"><Icon size={16} style={{ color: attr.color }} /><span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span></button>
                                     )
                                 })}</div></>)}
                             </div>
                        </div>

                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4">
                            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is the goal? (Optional)" className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" />
                        </div>

                        {/* Goal Section */}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1"><Target size={16} className="text-cyan-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Goal Calculation</span></div>
                            
                            <div className="flex justify-between items-center bg-black/20 rounded-xl p-1">
                                {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                    <button key={f} onClick={() => setGoalFreq(f)} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${goalFreq === f ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>{f}</button>
                                ))}
                            </div>

                            {/* Goal Input */}
                            <div className="flex items-center justify-between px-2">
                                <button onClick={() => setGoalTarget(Math.max(1, goalTarget - 1))} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><ChevronDown size={14} /></button>
                                <div className="text-center">
                                    <span className="text-2xl font-black text-white">{goalTarget}</span>
                                    <span className="text-xs font-bold text-slate-500 ml-1">HRS / {goalFreq === 'DAILY' ? 'DAY' : goalFreq === 'WEEKLY' ? 'WEEK' : 'MO'}</span>
                                </div>
                                <button onClick={() => setGoalTarget(Math.min(100, goalTarget + 1))} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><ChevronUp size={14} /></button>
                            </div>

                            {/* Working Days Selector (Only if not Daily) */}
                            {goalFreq !== 'DAILY' && (
                                <div className="animate-in slide-in-from-top-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Working Days</span>
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
                                            <div className="text-[10px] font-bold text-cyan-200 uppercase">Daily Target</div>
                                            <div className="text-sm font-black text-white">{calculatedDailyGoal} Hours <span className="text-white/50">/ day</span></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col relative">
                                <div className="flex items-center gap-2 mb-2"><Hourglass size={16} className="text-yellow-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Pomodoro</span></div>
                                <div className="flex gap-1 mb-2">
                                    {[25, 45, 60].map(t => (
                                        <button key={t} onClick={() => setPomoDuration(t)} className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all ${pomoDuration === t ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-transparent border-white/10 text-slate-500'}`}>{t}</button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">Custom:</span><input type="number" value={pomoDuration} onChange={(e) => setPomoDuration(parseInt(e.target.value) || 25)} className="w-12 bg-transparent border-b border-white/20 text-white font-mono text-sm text-center focus:border-white outline-none" /></div>
                            </div>
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden group">
                                <div className="flex items-center gap-2 mb-1"><Bell size={16} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Alert</span></div>
                                <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="bg-transparent text-2xl font-black text-white outline-none w-full z-10 relative" />
                                {!reminder && <span className="absolute left-4 bottom-4 text-2xl font-black text-white/10 pointer-events-none">OFF</span>}
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">Impact</span>
                            <div className="flex-1 h-8 bg-black/30 rounded-full relative p-1 flex gap-1">
                                {[1,2,3,4].map(lvl => (
                                    <button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-300 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <button 
                            onClick={handleConfirm} 
                            disabled={!title || !attrId || isSubmitting} 
                            className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(!title || !attrId || isSubmitting) ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white shadow-xl active:scale-95 border border-white/10 hover:bg-white/20'}`}
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>Initialize Project <ArrowUp size={16} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
