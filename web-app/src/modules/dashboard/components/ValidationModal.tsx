import React from 'react';
import { Star, Check, ArrowUp } from 'lucide-react';
import { Habit, Attribute } from '../../../types';

interface ValidationModalProps {
    habit: Habit | null;
    onClose: () => void;
    attributes: Attribute[];
    valTempValue: string;
    setValTempValue: (val: string) => void;
    setValidationHabit: React.Dispatch<React.SetStateAction<Habit | null>>;
    onValidate: () => void;
}

export const ValidationModal = React.memo(({ habit, onClose, attributes, valTempValue, setValTempValue, setValidationHabit, onValidate }: ValidationModalProps) => {
    if (!habit) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm glass-panel rounded-[2rem] p-6 animate-modal-enter flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-lg" style={{ backgroundColor: (attributes.find(a => a.id === habit.attribute)?.color || '#fff') + '20' }}>
                    {React.createElement(attributes.find(a => a.id === habit.attribute)?.icon || Star, { size: 24, color: attributes.find(a => a.id === habit.attribute)?.color })}
                </div>
                <h3 className="text-xl font-bold text-white mb-1 text-center">{habit.title}</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-6">Validate Progress</p>
                {habit.type === 'QUANTITY' && (
                    <div className="w-full space-y-4">
                        <div className="flex justify-between text-sm font-medium text-slate-400 px-2"><span>Current: <strong className="text-white">{habit.currentValue || 0}</strong></span><span>Target: <strong className="text-white">{habit.targetValue}</strong> {habit.unit}</span></div>
                        <div className="flex gap-2"><input type="number" autoFocus placeholder="Amount added..." value={valTempValue} onChange={(e) => setValTempValue(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition-all font-mono text-lg" /></div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, ((habit.currentValue || 0) / (habit.targetValue || 1)) * 100)}%` }} /></div>
                    </div>
                )}
                {habit.type === 'CHECKLIST' && (
                        <div className="w-full space-y-2 mb-4">{habit.checklist?.map(item => (<button key={item.id} onClick={() => { const updated = habit.checklist?.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i); setValidationHabit(prev => prev ? { ...prev, checklist: updated } : null); }} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${item.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'}`}><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>{item.completed && <Check size={12} className="text-black" strokeWidth={4} />}</div><span className={`text-sm font-medium ${item.completed ? 'text-green-400 line-through' : 'text-white'}`}>{item.text}</span></button>))}</div>
                )}
                <button onClick={onValidate} className="w-full mt-6 py-4 bg-white text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">Update Progress <ArrowUp size={16} /></button>
            </div>
        </div>
    );
});
