import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Plus, Minus, X, Target, Zap, Check } from 'lucide-react';
import { Habit } from '../../../types';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface QuantityUpdateModalProps {
 habit: Habit;
 isOpen: boolean;
 onClose: () => void;
 onUpdate: (habitId: string, data: Partial<Habit>) => void;
}

export const QuantityUpdateModal: React.FC<QuantityUpdateModalProps> = ({ habit, isOpen, onClose, onUpdate }) => {
 const { t } = useTranslation();
 const [value, setValue] = useState(habit.currentValue || 0);
 const [isEditing, setIsEditing] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);
 const controls = useAnimation();

 useEffect(() => {
 if (isOpen) {
 const originalStyle = window.getComputedStyle(document.body).overflow;
 document.body.style.overflow = 'hidden';
 document.body.style.overscrollBehavior = 'none';
 setValue(habit.currentValue || 0);
 return () => {
 document.body.style.overflow = originalStyle;
 document.body.style.overscrollBehavior = 'auto';
 };
 }
 }, [isOpen, habit.currentValue]);

 useEffect(() => {
 if (isEditing && inputRef.current) {
 inputRef.current.focus();
 inputRef.current.select();
 }
 }, [isEditing]);

 const target = habit.targetValue || 1;
 const isComplete = value >= target;
 const progress = Math.min(value / target, 1);
 
 // Circular Progress settings
 const radius = 80;
 const circumference = 2 * Math.PI * radius;
 const strokeDashoffset = circumference - progress * circumference;

 // Trigger animation when complete
 useEffect(() => {
 if (isComplete) {
 controls.start({
 scale: [1, 1.05, 1],
 transition: { duration: 0.2, ease: "easeInOut" }
 });
 }
 }, [isComplete, controls]);

 const getIncrementAmount = () => {
 // ALWAYS RETURN 1 FOR THE MANUAL BUTTON
 return 1;
 };

 const getDecrementAmount = () => {
 // ALWAYS RETURN 1 FOR THE MANUAL BUTTON
 return 1;
 };

 const handleIncrement = () => {
 const incrementAmount = getIncrementAmount();
 const newValue = value + incrementAmount;
 setValue(newValue);
 
 const updateData: Partial<Habit> = { currentValue: newValue };
 
 if (habit.isDivided && habit.dividedMode === 'INTERVAL' && habit.dividedInterval) {
 const nextTime = new Date();
 nextTime.setMinutes(nextTime.getMinutes() + habit.dividedInterval);
 updateData.nextInstanceTime = nextTime.toISOString();
 }
 
 onUpdate(habit.id, updateData);
 };

 const handleDecrement = () => {
 const decrementAmount = getDecrementAmount();
 const newValue = Math.max(0, value - decrementAmount);
 setValue(newValue);
 
 const updateData: Partial<Habit> = { currentValue: newValue };
 
 // Optionally clear nextInstanceTime if we go to 0, but probably leave it alone or clear if 0
 if (newValue === 0 && habit.isDivided) {
 updateData.nextInstanceTime = undefined; // Or null depending on DB. We can omit it.
 }
 
 onUpdate(habit.id, updateData);
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const newValue = parseInt(e.target.value) || 0;
 setValue(newValue);
 };

 const handleInputBlur = () => {
 setIsEditing(false);
 onUpdate(habit.id, { currentValue: value });
 };

 const handleInputKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 setIsEditing(false);
 onUpdate(habit.id, { currentValue: value });
 }
 };

 const colorPrimary = habit.customColor || '#3b82f6';

 const renderNextInstance = () => {
 if (!habit.isDivided || isComplete) return null;
 
 if (habit.dividedMode === 'FIXED' && habit.dividedTimes && habit.dividedTimes.length > 0) {
 const times = [...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time));
 let accumulated = 0;
 let nextTime = null;
 for (const t of times) {
 accumulated += t.amount;
 if ((value || 0) < accumulated) {
 nextTime = t.time;
 break;
 }
 }
 if (nextTime) {
 return (
 <div className="text-[10px] font-bold text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 mt-2">
 <Zap size={10} className="text-yellow-400" />
 <span>Próximo: {nextTime}</span>
 </div>
 );
 }
 } else if (habit.nextInstanceTime) {
 const nextDate = new Date(habit.nextInstanceTime);
 const today = new Date();
 if (nextDate.getDate() === today.getDate() && nextDate.getMonth() === today.getMonth()) {
 const hours = nextDate.getHours().toString().padStart(2, '0');
 const minutes = nextDate.getMinutes().toString().padStart(2, '0');
 return (
 <div className="text-[10px] font-bold text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 mt-2">
 <Zap size={10} className="text-yellow-400" />
 <span>Próximo: {hours}:{minutes}</span>
 </div>
 );
 }
 }
 return null;
 };

 return createPortal(
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
 {/* Dark backdrop with SAFE, lightweight blur for mobile performance */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="absolute inset-0 bg-[#050505]/95 "
 />

 {/* Modal Container */}
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.85, y: 40 }}
 transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
 className={cn(
 "relative w-full max-w-[400px] rounded-[32px] p-6 sm:p-8 overflow-hidden transition-all duration-200 border border-white/[0.12] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]",
 "bg-[#0f0f13]/80",
 isComplete 
 ? "shadow-[0_0_80px_-15px_rgba(16,185,129,0.3)]" 
 : ""
 )}
 onClick={e => e.stopPropagation()}
 >
 {/* Dynamic Background Glow - GPU Friendly */}
 <motion.div 
 animate={{ 
 scale: [1, 1.1, 1],
 opacity: [0.15, 0.25, 0.15]
 }}
 transition={{ duration: 6, repeat: Infinity }}
 className="absolute -top-[20%] -left-[20%] w-[100%] h-[60%] pointer-events-none will-change-transform"
 style={{ 
 background: `radial-gradient(circle, ${isComplete ? '#10b981' : colorPrimary} 0%, transparent 70%)`
 }} 
 />

 {/* Header - Enhanced */}
 <div className="relative z-10 flex justify-between items-center w-full mb-6">
 <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
 <Target size={14} className={isComplete ? "text-emerald-400" : "text-white/40"} strokeWidth={2.5} />
 <span className="text-[9px] font-black text-white/50 tracking-[0.2em] uppercase">
 {habit.title}
 </span>
 </div>
 {renderNextInstance()}
 <button 
 onClick={onClose}
 className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-90"
 >
 <X size={20} strokeWidth={3} />
 </button>
 </div>

 <div className="relative z-10 flex flex-col items-center justify-center">
 
 {/* Circular Visualizer - Ultra Polish */}
 <div className="relative w-48 h-48 flex items-center justify-center mb-6">
 {/* Rotating Background Ring */}
 <motion.div 
 animate={{ rotate: 360 }}
 transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
 className="absolute inset-0 rounded-full border border-dashed border-white/[0.03]"
 />
 
 {/* SVG Ring */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
 <defs>
 <linearGradient id="quantityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor={colorPrimary} />
 <stop offset="100%" stopColor={isComplete ? "#10b981" : `${colorPrimary}aa`} />
 </linearGradient>
 </defs>
 {/* Background Ring */}
 <circle
 cx="96"
 cy="96"
 r={radius}
 fill="none"
 stroke="rgba(255,255,255,0.02)"
 strokeWidth="10"
 />
 {/* Progress Ring - Dynamic Stroke */}
 <motion.circle
 cx="96"
 cy="96"
 r={radius}
 fill="none"
 stroke="url(#quantityGradient)"
 strokeWidth={isComplete ? "14" : "12"}
 strokeLinecap="round"
 strokeDasharray={circumference}
 initial={{ strokeDashoffset: circumference }}
 animate={{ strokeDashoffset }}
 transition={{ duration: 0.15, type: "spring", bounce: 0.2 }}
 style={{
 filter: isComplete ? 'drop-shadow(0 0 15px rgba(16,185,129,0.5))' : `drop-shadow(0 0 12px ${colorPrimary}30)`
 }}
 />
 </svg>

 {/* Center Content - Maximum Visual Weight */}
 <motion.div 
 animate={controls}
 className="relative z-10 flex flex-col items-center justify-center"
 >
 {isEditing ? (
 <input
 ref={inputRef}
 type="number"
 value={value}
 onChange={handleInputChange}
 onBlur={handleInputBlur}
 onKeyDown={handleInputKeyDown}
 className={cn(
 "w-40 bg-transparent text-center outline-none",
 "text-7xl font-[1000] tracking-[-0.06em] leading-none tabular-nums",
 isComplete ? "text-emerald-400" : "text-white"
 )}
 />
 ) : (
 <motion.div 
 key={value}
 onClick={() => setIsEditing(true)}
 initial={{ opacity: 0, scale: 0.8, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 className="flex flex-col items-center"
 >
 <span className={cn(
 "text-7xl font-[1000] tracking-[-0.06em] leading-none tabular-nums cursor-pointer drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
 isComplete ? "text-emerald-400" : "text-white"
 )}>
 {value}
 </span>
 
 <div className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] ">
 <span className="text-[10px] font-black text-white/20 tracking-[0.1em] uppercase">Objetivo</span>
 <span className="text-sm font-black text-white/80 tabular-nums">{target}</span>
 {habit.unit && (
 <span className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">{habit.unit}</span>
 )}
 </div>
 </motion.div>
 )}
 </motion.div>
 </div>

 {/* Enhanced Controls */}
 <div className="flex items-center gap-6 w-full justify-center px-4 mb-4">
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.9 }}
 onClick={handleDecrement}
 className="w-10 h-10 rounded-[14px] bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.1] transition-all flex items-center justify-center border border-white/[0.08] group shadow-md "
 >
 <Minus size={18} className="text-white/40 group-hover:text-white transition-colors" strokeWidth={3} />
 </motion.button>

 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.9 }}
 onClick={handleIncrement}
 className={cn(
 "w-14 h-14 rounded-[16px] flex items-center justify-center border transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group relative overflow-hidden",
 isComplete 
 ? "bg-emerald-500 border-emerald-400/50" 
 : "bg-white border-white"
 )}
 >
 {/* Animated background on complete */}
 {isComplete && (
 <motion.div 
 animate={{ opacity: [0.5, 0.8, 0.5] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-emerald-600"
 />
 )}
 
 {isComplete ? (
 <Check size={24} strokeWidth={4} className="text-white relative z-10 drop-shadow-lg" />
 ) : (
 <div className="flex items-center text-black relative z-10">
 <Plus size={24} strokeWidth={4} />
 </div>
 )}
 </motion.button>
 </div>

 {/* Subtasks (Fixed Times) below controls */}
 {habit.isDivided && habit.dividedMode === 'FIXED' && habit.dividedTimes && (
 <div className="w-full max-w-[280px] space-y-2 max-h-36 overflow-y-auto no-scrollbar px-2 mb-2 border-t border-white/5 pt-3">
 {[...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time)).map((item, index) => {
 const times = [...habit.dividedTimes!].sort((a, b) => a.time.localeCompare(b.time));
 let accumulated = 0;
 for (let i = 0; i <= index; i++) {
 accumulated += times[i].amount;
 }
 const isItemCompleted = (value || 0) >= accumulated || isComplete;
 const isNextItem = !isItemCompleted && ((value || 0) >= accumulated - item.amount);
 
 return (
 <div 
 key={item.id}
 className={cn(
 "flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer",
 isNextItem ? "bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]" : "bg-white/5 border-white/5 hover:bg-white/10"
 )}
 onClick={() => {
 if (isItemCompleted) {
 const newValue = Math.max(0, accumulated - item.amount);
 setValue(newValue);
 onUpdate(habit.id, { currentValue: newValue });
 } else {
 setValue(accumulated);
 onUpdate(habit.id, { currentValue: accumulated });
 }
 }}
 >
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
 isItemCompleted ? "border-transparent bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]" : (isNextItem ? "border-white/40 bg-white/5" : "border-white/10 bg-black/20")
 )}>
 {isItemCompleted && <Check size={14} strokeWidth={3} />}
 </div>
 <span className={cn(
 "text-sm font-bold transition-colors flex items-center gap-2",
 isItemCompleted ? "text-white/30 line-through" : (isNextItem ? "text-white" : "text-white/70")
 )}>
 {item.time}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className={cn(
 "text-xs font-black px-2 py-1 rounded-lg",
 isItemCompleted ? "bg-white/5 text-white/30" : "bg-emerald-400/10 text-emerald-400"
 )}>
 +{item.amount} {habit.unit}
 </span>
 {isNextItem && <Zap size={14} className="text-yellow-400 animate-pulse-slow drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
 </div>
 </div>
 );
 })}
 </div>
 )}
 
 {/* Visual Feedback Message - Polish */}
 <AnimatePresence>
 {isComplete && (
 <motion.div
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 className="flex items-center gap-2 text-emerald-400 font-[900] text-[10px] tracking-[0.2em] uppercase"
 >
 <Zap size={14} className="fill-emerald-400" />
 <span>{t('habits.objectiveMet')}</span>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 );
};
