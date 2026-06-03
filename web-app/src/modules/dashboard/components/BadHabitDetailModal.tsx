import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Skull, TrendingUp, Flame, Clock } from 'lucide-react';
import { BadHabit, Attribute } from '../../../types';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BadHabitDetailModalProps {
 isOpen: boolean;
 onClose: () => void;
 habit: BadHabit | null;
 attributes?: Attribute[];
 attribute?: Attribute;
}

export const BadHabitDetailModal: React.FC<BadHabitDetailModalProps> = ({
 isOpen,
 onClose,
 habit,
 attributes,
 attribute
}) => {
 const stats = useMemo(() => {
 if (!habit) return null;
 
 const now = new Date();
 const createdDate = new Date(habit.createdAt);
 
 // Relapses sorted by date
 const sortedHistory = [...(habit.history || [])].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
 
 let longestStreak = 0;
 let currentStreakCount = 0;
 let lastRelapseDate: Date | null = null;
 
 if (sortedHistory.length === 0) {
 longestStreak = differenceInDays(now, createdDate);
 currentStreakCount = habit.streak; // Or diff from created
 } else {
 // Calculate streaks between relapses
 let previousDate = createdDate;
 sortedHistory.forEach(relapseISO => {
 const relapseDate = new Date(relapseISO);
 const diff = differenceInDays(relapseDate, previousDate);
 if (diff > longestStreak) {
 longestStreak = diff;
 }
 previousDate = relapseDate;
 });
 
 lastRelapseDate = new Date(sortedHistory[sortedHistory.length - 1]);
 const currentDiff = differenceInDays(now, lastRelapseDate);
 if (currentDiff > longestStreak) {
 longestStreak = currentDiff;
 }
 
 currentStreakCount = habit.streak;
 }

 return {
 longestStreak: Math.max(longestStreak, habit.streak),
 currentStreak: currentStreakCount,
 lastRelapse: lastRelapseDate,
 createdDate
 };
 }, [habit]);

  // Must be called unconditionally (before any early returns) per React Rules of Hooks
  const resolvedAttributes = useMemo(() => {
    if (!habit?.attribute) return attribute ? [attribute] : [];
    const ids = habit.attribute.split(',').map(s => s.trim()).filter(Boolean);
    const list = ids.map(id => attributes?.find(a => a.id === id)).filter(Boolean) as Attribute[];
    if (list.length === 0 && attribute) return [attribute];
    return list;
  }, [habit?.attribute, attributes, attribute]);

  if (!isOpen || !habit || !stats) return null;

  const color = resolvedAttributes[0]?.color || attribute?.color || '#f43f5e';
  const subTrait = resolvedAttributes[0]?.subTraits?.find(st => st.id === habit.subAttribute);

  return createPortal(
  <AnimatePresence>
  {isOpen && (
  <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={onClose}
  className="absolute inset-0 bg-black/90 "
  />

  <motion.div
  initial={{ y: "100%", opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: "100%", opacity: 0 }}
  transition={{ type: "spring", damping: 25, stiffness: 450 }}
  className="relative w-full max-w-md bg-[#0b0b0d] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-md overflow-hidden"
  >
  {/* Background Effects */}
  <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_center,_rgba(244,63,94,0.08)_0%,_transparent_60%)] pointer-events-none" />
  
  <div className="p-6 pb-28 sm:p-6">
  <div className="flex items-start justify-between mb-6 relative z-10">
  <div className="flex items-center gap-3">
  <div 
  className="w-12 h-12 rounded-2xl flex items-center justify-center border"
  style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
  >
  <Skull size={24} style={{ color }} />
  </div>
  <div>
  <h2 className="text-xl font-bold text-white tracking-tight">{habit.title}</h2>
  <p className="text-sm capitalize font-bold flex flex-wrap gap-1" style={{ color }}>
   {resolvedAttributes.length > 0 ? (
     resolvedAttributes.map((attr, idx) => (
       <span key={attr.id}>
         {attr.label?.replace('traits.', '')}
         {idx < resolvedAttributes.length - 1 && ', '}
       </span>
     ))
   ) : (
     'General'
   )}
   {resolvedAttributes.length === 1 && subTrait && ` › ${subTrait.name}`}
  </p>
  </div>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
 >
 <X size={20} />
 </button>
 </div>

 <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
 <div className="flex items-center gap-2 text-white/50">
 <Flame size={16} className="text-orange-400" />
 <span className="text-xs font-bold uppercase tracking-wider">Racha Actual</span>
 </div>
 <div className="text-3xl font-black text-white">{stats.currentStreak} <span className="text-sm font-medium text-white/40">días</span></div>
 </div>
 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
 <div className="flex items-center gap-2 text-white/50">
 <TrendingUp size={16} className="text-emerald-400" />
 <span className="text-xs font-bold uppercase tracking-wider">Mejor Racha</span>
 </div>
 <div className="text-3xl font-black text-white">{stats.longestStreak} <span className="text-sm font-medium text-white/40">días</span></div>
 </div>
 </div>

 <div className="space-y-3 relative z-10">
 <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-rose-500/10 rounded-xl">
 <Clock size={16} className="text-rose-400" />
 </div>
 <div>
 <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Última Recaída</div>
 <div className="text-sm font-medium text-white">
 {stats.lastRelapse ? format(stats.lastRelapse, "d 'de' MMMM, yyyy", { locale: es }) : 'Nunca'}
 </div>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-indigo-500/10 rounded-xl">
 <Calendar size={16} className="text-indigo-400" />
 </div>
 <div>
 <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Fecha de Creación</div>
 <div className="text-sm font-medium text-white">
 {format(stats.createdDate, "d 'de' MMMM, yyyy", { locale: es })}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 );
};
