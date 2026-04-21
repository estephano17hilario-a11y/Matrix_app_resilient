import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Minus, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface DurationPickerProps {
 value: number; // in minutes
 onChange: (minutes: number) => void;
}

type Mode = 'MINUTES' | 'HOURS';

export const DurationPicker: React.FC<DurationPickerProps> = ({ value, onChange }) => {
 const { t } = useTranslation();
 // Determine initial mode based on value
 // If value is a multiple of 60 and > 0, default to HOURS, else MINUTES
 const [mode, setMode] = useState<Mode>(() => {
 if (value > 0 && value % 60 === 0) return 'HOURS';
 return 'MINUTES';
 });
 
 // Internal state for display to avoid jumping
 const [displayValue, setDisplayValue] = useState(mode === 'HOURS' ? value / 60 : value);

 // Sync displayValue when value prop changes externally (e.g. reset)
 useEffect(() => {
 if (mode === 'HOURS') {
 // Check if it still fits hours mode cleanly, otherwise switch to minutes might be better?
 // For now, just update display value
 setDisplayValue(Number((value / 60).toFixed(1)));
 } else {
 setDisplayValue(value);
 }
 }, [value, mode]);

 const handleModeChange = (newMode: Mode) => {
 setMode(newMode);
 if (newMode === 'HOURS') {
 // Convert current minutes to hours
 // Round to nearest 0.5 hour for better UX
 const hours = Math.round((value / 60) * 2) / 2;
 setDisplayValue(hours);
 // We don't necessarily need to trigger onChange here unless we want to round the value immediately
 } else {
 // Convert hours to minutes
 setDisplayValue(value);
 }
 };

 const handleIncrement = () => {
 const step = mode === 'HOURS' ? 0.5 : 5;
 const current = displayValue;
 const newValue = current + step;
 
 // Update parent immediately
 const minutes = mode === 'HOURS' ? newValue * 60 : newValue;
 onChange(minutes);
 };

 const handleDecrement = () => {
 const step = mode === 'HOURS' ? 0.5 : 5;
 const current = displayValue;
 const newValue = Math.max(0, current - step);
 
 // Update parent
 const minutes = mode === 'HOURS' ? newValue * 60 : newValue;
 onChange(minutes);
 };

 const handlePreset = (presetValue: number) => {
 const minutes = mode === 'HOURS' ? presetValue * 60 : presetValue;
 onChange(minutes);
 };

 const presets = mode === 'MINUTES' 
 ? [15, 30, 45, 60] 
 : [1, 2, 4, 8];

 return (
 <div className="w-full bg-[#0a0a0a] rounded-xl border border-white/10 p-3 overflow-hidden relative group">
 {/* Ambient Glow - Premium & Lightweight (No heavy blur to avoid GPU lag/black flickers) */}
 <div className="absolute -top-16 -right-16 w-56 h-56 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25)_0%,rgba(99,102,241,0.1)_35%,transparent_70%)] pointer-events-none opacity-80" />
 
 <div className="relative z-10 flex flex-col gap-3">
 {/* Header & Toggle */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-slate-400">
 <div className="p-1 rounded-md bg-white/5">
 <Clock size={12} className="text-indigo-400" />
 </div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{t('common.estimatedDuration', 'Estimated Duration')}</span>
 </div>
 
 <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
 {(['MINUTES', 'HOURS'] as Mode[]).map((m) => (
 <button
 key={m}
 onClick={() => handleModeChange(m)}
 className={cn(
 "px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider transition-all",
 mode === m 
 ? "bg-white/15 text-white shadow-sm" 
 : "text-slate-600 hover:text-slate-400"
 )}
 >
 {m === 'MINUTES' ? 'MIN' : 'HRS'}
 </button>
 ))}
 </div>
 </div>

 {/* Main Control */}
 <div className="flex items-center justify-between gap-4">
 <motion.button 
 whileTap={{ scale: 0.9 }}
 onClick={handleDecrement}
 className="w-10 h-10 rounded-xl bg-[#141416] border border-white/5 flex items-center justify-center text-white/30 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all shadow-lg shadow-black/20"
 >
 <Minus size={16} />
 </motion.button>

 <div className="flex-1 flex flex-col items-center justify-center h-12 relative">
 <AnimatePresence mode='popLayout'>
 <motion.div 
 key={`${mode}-${displayValue}`}
 initial={{ y: 20, opacity: 0, scale: 0.8 }}
 animate={{ y: 0, opacity: 1, scale: 1 }}
 exit={{ y: -20, opacity: 0, scale: 0.8 }}
 transition={{ type: "spring", stiffness: 400, damping: 25 }}
 className="flex items-baseline gap-1 absolute"
 >
 <span className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
 {displayValue}
 </span>
 <span className="text-xs text-white/30 font-bold uppercase tracking-widest">
 {mode === 'MINUTES' ? 'min' : 'hrs'}
 </span>
 </motion.div>
 </AnimatePresence>
 </div>

 <motion.button 
 whileTap={{ scale: 0.9 }}
 onClick={handleIncrement}
 className="w-10 h-10 rounded-xl bg-[#141416] border border-white/5 flex items-center justify-center text-white/30 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all shadow-lg shadow-black/20"
 >
 <Plus size={16} />
 </motion.button>
 </div>

 {/* Presets */}
 <div className="grid grid-cols-4 gap-2">
 {presets.map(preset => {
 const isActive = displayValue === preset;
 return (
 <button
 key={preset}
 onClick={() => handlePreset(preset)}
 className={cn(
 "py-1.5 rounded-lg text-[10px] font-bold transition-all border",
 isActive
 ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]"
 : "bg-[#141416] border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300"
 )}
 >
 {preset}{mode === 'MINUTES' ? 'm' : 'h'}
 </button>
 )
 })}
 </div>
 </div>
 </div>
 );
};
