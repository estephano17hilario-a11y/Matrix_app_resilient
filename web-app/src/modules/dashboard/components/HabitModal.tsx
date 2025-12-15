import React, { useState } from 'react';
import { X, Infinity as InfinityIcon, Plus, Clock, CheckCircle2, Hash, List, ArrowUp, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Attribute, Habit } from '../../../types';

export const HabitModal = React.memo(({ isOpen, onClose, attributes, onConfirm }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], onConfirm: (data: Partial<Habit>) => void }) => {
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
    const [newSubtask, setNewSubtask] = useState('');
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);

    if (!isOpen) return null;
    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#3b82f6';
    const SelectedIcon = selectedAttr?.icon || Star;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px] animate-modal-enter">
                <div className="glass-panel rounded-[2.5rem] p-5 overflow-visible flex flex-col max-h-[85vh] relative shadow-2xl transition-colors duration-500">
                    <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : 'linear-gradient(135deg, #06b6d4, #2563eb)' }}><InfinityIcon size={20} className="text-white" /></div><div><h2 className="text-xl font-black text-white tracking-tight leading-none">Smart Protocol</h2><span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">System Architect</span></div></div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                    </div>
                    <div className="overflow-y-auto no-scrollbar pb-4 space-y-3">
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-all"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Protocol Name..." className="w-full h-full bg-transparent px-5 text-[17px] font-bold text-white placeholder:text-white/20 outline-none" autoFocus /></div>
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
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4"><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (Optional)..." className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" /></div>
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-1 overflow-hidden transition-all duration-300">
                             <div className="flex p-1 gap-1">{['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (<button key={f} onClick={() => setFreq(f)} className={`flex-1 py-3 rounded-[1.2rem] text-[10px] font-black tracking-wide transition-all ${freq === f ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>{f}</button>))}</div>
                             {freq === 'WEEKLY' && (<div className="p-3 pt-1 flex justify-between animate-in slide-in-from-top-2 fade-in">{['S','M','T','W','T','F','S'].map((day, i) => (<button key={i} onClick={() => setWeekDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${weekDays.includes(i) ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-slate-500'}`}>{day}</button>))}</div>)}
                             {freq === 'MONTHLY' && (<div className="p-4 flex items-center justify-between animate-in slide-in-from-top-2 fade-in"><span className="text-xs font-bold text-slate-400">Times per month</span><div className="flex items-center gap-4"><button onClick={() => setMonthCount(c => Math.max(1, c - 1))} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronDown size={14} /></button><span className="text-xl font-black text-white">{monthCount}</span><button onClick={() => setMonthCount(c => Math.min(30, c + 1))} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronUp size={14} /></button></div></div>)}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden group"><div className="flex items-center gap-2 mb-1"><Clock size={16} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Alert</span></div><input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="bg-transparent text-2xl font-black text-white outline-none w-full z-10 relative" />{!reminder && <span className="absolute left-4 bottom-4 text-2xl font-black text-white/10 pointer-events-none">OFF</span>}</div>
                            <button onClick={() => setLogic(t => t === 'BOOLEAN' ? 'QUANTITY' : t === 'QUANTITY' ? 'CHECKLIST' : 'BOOLEAN')} className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col items-start justify-center relative active:scale-95 transition-all"><div className="flex items-center gap-2 mb-1">{logic === 'BOOLEAN' ? <CheckCircle2 size={16} className="text-green-400" /> : logic === 'QUANTITY' ? <Hash size={16} className="text-blue-400" /> : <List size={16} className="text-yellow-400" />}<span className="text-[10px] font-bold text-slate-400 uppercase">Logic</span></div><span className="text-lg font-bold text-white capitalize">{logic.toLowerCase()}</span></button>
                        </div>
                        {logic === 'QUANTITY' && (<div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 animate-in fade-in slide-in-from-top-2"><div className="flex gap-4"><div className="flex-1"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Target</span><input type="number" placeholder="10" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/10" /></div><div className="w-[1px] bg-white/10" /><div className="flex-1"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Unit</span><input type="text" placeholder="pages" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/10" /></div></div></div>)}
                        {logic === 'CHECKLIST' && (<div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 animate-in fade-in slide-in-from-top-2 space-y-3"><div className="flex gap-2"><input type="text" placeholder="Add subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/20" /><button onClick={() => { if(newSubtask) { setSubtasks([...subtasks, newSubtask]); setNewSubtask(''); } }} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Plus size={12} /></button></div><div className="space-y-1">{subtasks.map((task, i) => (<div key={i} className="flex items-center gap-2 text-xs text-slate-400 bg-black/20 p-2 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> {task}</div>))}{subtasks.length === 0 && <span className="text-[10px] text-slate-600 italic pl-2">No steps defined</span>}</div></div>)}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex items-center gap-4"><span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">Impact</span><div className="flex-1 h-8 bg-black/30 rounded-full relative p-1 flex gap-1">{[1,2,3,4].map(lvl => (<button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-300 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />))}</div></div>
                    </div>
                    <div className="pt-2">
                        <button onClick={() => onConfirm({ title, description: desc, attribute: attrId, frequency: freq, type: logic, targetValue: parseFloat(target), unit, checklist: subtasks.map((t, i) => ({ id: i.toString(), text: t, completed: false })), reminderTime: reminder })} disabled={!title || !attrId} className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white shadow-xl active:scale-95 border border-white/10 hover:bg-white/20'}`}>Initiate Protocol <ArrowUp size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
});
