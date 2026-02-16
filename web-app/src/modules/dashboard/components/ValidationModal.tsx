import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Check, ArrowUp, Minus, Plus } from 'lucide-react';
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

    const attribute = useMemo(() => attributes.find(a => a.id === habit.attribute), [attributes, habit.attribute]);
    const attributeColor = attribute?.color || '#3b82f6';
    const attributeIcon = attribute?.icon;
    const iconType = typeof attributeIcon === 'function' || (typeof attributeIcon === 'object' && attributeIcon !== null && '$$typeof' in attributeIcon)
        ? attributeIcon
        : Star;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/90"
                onClick={onClose} 
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative z-10 w-full max-w-sm rounded-[2rem] p-6 flex flex-col items-center bg-[#141419] bg-gradient-to-b from-white/5 to-transparent border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_28px_-16px_rgba(0,0,0,0.6)]"
                style={{
                    background: habit?.attribute 
                        ? `linear-gradient(165deg, ${attributeColor}20 0%, #141419 100%)`
                        : '#141419',
                    borderColor: habit?.attribute ? `${attributeColor}30` : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: habit?.attribute 
                        ? `0 12px 28px -16px ${attributeColor}20, inset 0 1px 0 0 rgba(255,255,255,0.1)` 
                        : '0 12px 28px -16px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.1)'
                }}
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-sm" style={{ backgroundColor: `${attributeColor}20` }}>
                    {React.createElement(iconType, { size: 24, color: attributeColor })}
                </div>
                <h3 className="text-xl font-bold text-white mb-1 text-center">{habit.title}</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-6">Validate Progress</p>
                {habit.type === 'QUANTITY' && (
                    <div className="w-full space-y-4">
                        <div className="flex justify-between text-sm font-medium text-slate-400 px-2"><span>Current: <strong className="text-white">{habit.currentValue || 0}</strong></span><span>Target: <strong className="text-white">{habit.targetValue}</strong> {habit.unit}</span></div>
                        
                        <div className="flex items-center justify-center gap-6 py-6">
                            <button 
                                onClick={() => {
                                    const val = parseFloat(valTempValue) || 0;
                                    setValTempValue(Math.max(0, val - 1).toString());
                                }}
                                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-[transform,background-color,color,border-color]"
                            >
                                <Minus size={24} />
                            </button>
                            
                            <div className="flex flex-col items-center">
                                <input 
                                    type="number" 
                                    autoFocus 
                                    value={valTempValue} 
                                    onChange={(e) => setValTempValue(e.target.value)} 
                                    className="w-32 bg-transparent text-5xl font-light text-white text-center outline-none p-0 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-white/20"
                                    placeholder="0"
                                />
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
                                    {habit.unit || 'Units'}
                                </span>
                            </div>

                            <button 
                                onClick={() => {
                                    const val = parseFloat(valTempValue) || 0;
                                    setValTempValue((val + 1).toString());
                                }}
                                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-[transform,background-color,color,border-color]"
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-transform duration-500 origin-left" style={{ transform: `scaleX(${Math.min(1, ((habit.currentValue || 0) / (habit.targetValue || 1)) )})` }} /></div>
                    </div>
                )}
                {habit.type === 'CHECKLIST' && (
                        <div className="w-full space-y-2 mb-4">{habit.checklist?.map(item => (<button key={item.id} onClick={() => { const updated = habit.checklist?.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i); setValidationHabit(prev => prev ? { ...prev, checklist: updated } : null); }} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${item.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'}`}><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>{item.completed && <Check size={12} className="text-black" strokeWidth={4} />}</div><span className={`text-sm font-medium ${item.completed ? 'text-green-400 line-through' : 'text-white'}`}>{item.text}</span></button>))}</div>
                )}
                <button onClick={onValidate} className="w-full mt-6 py-4 bg-white text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-[transform,background-color,color,border-color] shadow-md flex items-center justify-center gap-2">Update Progress <ArrowUp size={16} /></button>
            </motion.div>
        </div>
    );
});
