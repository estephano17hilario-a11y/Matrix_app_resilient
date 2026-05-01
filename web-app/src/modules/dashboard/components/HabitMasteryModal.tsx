import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Habit, Attribute } from '../../../types';
import { X, Flame, Trophy, Calendar, Star, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { HabitHeatmap } from './HabitHeatmap';
import { HabitTrendChart } from './HabitTrendChart';

interface HabitMasteryModalProps {
 isOpen: boolean;
 onClose: () => void;
 habit: Habit | null;
 attribute?: Attribute;
}

const getBestStreak = (history?: string[], currentStreak: number = 0): number => {
 if (!history || history.length === 0) return currentStreak;

 const sorted = [...history].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
 
 let maxStreak = 1;
 let tempStreak = 1;

 for (let i = 1; i < sorted.length; i++) {
 const prev = new Date(sorted[i - 1]);
 const curr = new Date(sorted[i]);
 
 // reset to midnight to compare just dates
 prev.setHours(0, 0, 0, 0);
 curr.setHours(0, 0, 0, 0);
 
 const diffTime = curr.getTime() - prev.getTime();
 const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

 if (diffDays === 1) {
 tempStreak++;
 if (tempStreak > maxStreak) maxStreak = tempStreak;
 } else if (diffDays > 1) {
 tempStreak = 1;
 }
 }

 return Math.max(maxStreak, currentStreak);
};

const StatCard = ({ icon: Icon, label, value, color, delay = 0 }: { icon: any, label: string, value: string | number, color: string, delay?: number }) => (
 <motion.div 
 initial={{ opacity: 0, y: 15 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay, type: 'spring', damping: 20, stiffness: 350 }}
 whileHover={{ y: -4, scale: 1.02 }}
 whileTap={{ scale: 0.96 }}
 className="relative group bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-[24px] p-4 flex flex-col items-center justify-center overflow-hidden transition-all duration-200 hover:bg-white/[0.06] hover:border-white/20"
 >
 {/* Subtle Glow Background */}
 <div 
 className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-10 group-hover:opacity-15 transition-opacity duration-200 blur-sm "
 style={{ backgroundColor: color }}
 />
 
 <div 
 className="w-10 h-10 rounded-[14px] flex items-center justify-center mb-2 transition-all duration-200 group-hover:scale-110"
 style={{ backgroundColor: `${color}15` }}
 >
 <Icon size={20} style={{ color }} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
 </div>
 
 <span className={`font-black text-white tracking-tight leading-none mb-1 group-hover:scale-105 transition-transform whitespace-nowrap ${String(value).length > 4 ? 'text-lg' : 'text-2xl'}`}>
 {value}
 </span>
 <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] text-center leading-tight">
 {label}
 </span>
 </motion.div>
);

export const HabitMasteryModal: React.FC<HabitMasteryModalProps> = ({
 isOpen,
 onClose,
 habit,
 attribute
}) => {
 const { t } = useTranslation();

 // Cache habit to preserve content during exit animation
 const [cachedHabit, setCachedHabit] = React.useState<Habit | null>(null);
 
 useEffect(() => {
 if (habit) setCachedHabit(habit);
 }, [habit]);

 // Prevent scroll when modal is open
 useEffect(() => {
 if (isOpen) {
 const originalStyle = window.getComputedStyle(document.body).overflow;
 document.body.style.overflow = 'hidden';
 // On some mobile devices, overflow: hidden on body is not enough
 // We use overscroll-behavior to prevent bounce
 document.body.style.overscrollBehavior = 'none';
 
 return () => {
 document.body.style.overflow = originalStyle;
 document.body.style.overscrollBehavior = 'auto';
 };
 }
 }, [isOpen]);

 const displayHabit = habit || cachedHabit;

 const bestStreak = useMemo(() => {
 if (!displayHabit) return 0;
 return getBestStreak(displayHabit.history, displayHabit.streak);
 }, [displayHabit]);

 const baseColor = displayHabit?.customColor || attribute?.color || '#6366f1';
 const creationDate = displayHabit?.createdAt ? new Date(displayHabit.createdAt) : new Date();
 
 // 21 days for mastery
 const masteryTarget = 21; 
 const currentProgress = Math.min(displayHabit?.streak || 0, masteryTarget);
 const percentage = (currentProgress / masteryTarget) * 100;
 const isMastered = (displayHabit?.streak || 0) >= masteryTarget;

 const modalContent = (
 <AnimatePresence>
 {isOpen && displayHabit && (
 <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
 {/* Overlay with safe blur for mobile - LIGHTER BLUR FOR GPU CARE */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="absolute inset-0 bg-black/85 backdrop-blur-sm will-change-transform transition-all duration-200"
 />
 
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 30 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.85, opacity: 0, y: 40 }}
 transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.8 }}
 onClick={(e) => e.stopPropagation()}
 className="relative w-[95%] max-w-[640px] bg-[#0a0a0c] border border-white/[0.12] rounded-[40px] overflow-y-auto overflow-x-hidden max-h-[90vh] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] z-10 no-scrollbar"
 >
 {/* Animated Mesh Background - GPU FRIENDLY */}
 <motion.div 
 animate={{ 
 scale: [1, 1.05, 1],
 rotate: [0, 2, 0]
 }}
 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
 className="absolute -top-[10%] -left-[10%] w-[120%] h-[60%] opacity-20 pointer-events-none will-change-transform"
 style={{
 background: `radial-gradient(circle at center, ${baseColor} 0%, transparent 70%)`,
 filter: 'blur(8px)'
 }}
 />

 {/* Glassmorphism Header Effect */}
 <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

 {/* Close Button - Enhanced */}
 <button
 onClick={onClose}
 className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-90"
 >
 <X size={20} strokeWidth={2.5} />
 </button>

 <div className="px-5 py-8 sm:px-6 flex flex-col items-center relative z-10 mt-2">
 {/* Header - Enhanced Typography */}
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="text-center mb-8"
 >
 <h2 className="text-3xl font-[1000] text-white tracking-[-0.04em] mb-1.5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
 {displayHabit.title}
 </h2>
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
 <Sparkles size={10} className="text-white/40" />
 <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
 {attribute ? t(attribute.label, attribute.label.replace('traits.', '')) : 'Protocolo'}
 </p>
 </div>
 </motion.div>

 {/* Mastery Circle - Ultra Visuals */}
 <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
 {/* Rotating Outer Ring */}
 <motion.div 
 animate={{ rotate: 360 }}
 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
 className="absolute inset-0 rounded-full border border-dashed border-white/[0.05]"
 />
 
 {/* Background Circle */}
 <svg className="absolute inset-0 w-full h-full -rotate-90">
 <defs>
 <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor={baseColor} />
 <stop offset="100%" stopColor={isMastered ? '#10b981' : `${baseColor}dd`} />
 </linearGradient>
 <filter id="glow">
 <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
 <feMerge>
 <feMergeNode in="coloredBlur"/>
 <feMergeNode in="SourceGraphic"/>
 </feMerge>
 </filter>
 </defs>
 
 <circle
 cx="96"
 cy="96"
 r="84"
 fill="none"
 stroke="rgba(255,255,255,0.03)"
 strokeWidth="8"
 />
 {/* Progress Circle - Smooth and Glowing */}
 <motion.circle
 cx="96"
 cy="96"
 r="84"
 fill="none"
 stroke="url(#progressGradient)"
 strokeWidth="10"
 strokeLinecap="round"
 initial={{ strokeDasharray: '0 1000' }}
 animate={{ strokeDasharray: `${(percentage / 100) * (2 * Math.PI * 84)} 1000` }}
 transition={{ duration: 2, ease: [0.34, 1.56, 0.64, 1] }}
 style={{
 filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.1))'
 }}
 />
 </svg>

 {/* Center Content - More Impact */}
 <div className="flex flex-col items-center justify-center text-center z-10">
 {isMastered ? (
 <motion.div
 initial={{ scale: 0.5, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.6, type: 'spring', damping: 15 }}
 className="flex flex-col items-center"
 >
 <div className="relative mb-3 flex flex-col items-center justify-center">
 <Trophy size={56} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
 <motion.div 
 animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
 transition={{ duration: 3, repeat: Infinity }}
 className="absolute inset-0 bg-emerald-400 blur-sm -z-10 opacity-20"
 />
 </div>
 <span className="text-xs font-black text-emerald-400 tracking-[0.2em] uppercase drop-shadow-sm">
 {t('habits.mastered', "DOMINADO")}
 </span>
 </motion.div>
 ) : (
 <motion.div
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: 0.3 }}
 className="flex flex-col items-center justify-center h-full"
 >
 <span className="text-7xl font-[1000] text-white tracking-[-0.06em] leading-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
 {Math.round(percentage)}%
 </span>
 </motion.div>
 )}
 </div>
 </div>

 {/* Science Note - Better visual weight */}
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.5 }}
 className="relative mb-8"
 >
 <p className="text-[11px] font-medium text-center text-white/40 max-w-[280px] leading-relaxed italic">
 {isMastered 
 ? t('habits.masteredDesc', "¡Excelencia alcanzada! Has integrado este protocolo en tu sistema operativo biológico.")
 : t('habits.masteryDesc', "La neuroplasticidad requiere 21 días de repetición consciente para forjar un nuevo camino neuronal.")}
 </p>
 </motion.div>

 {/* Stats Grid - Enhanced Cards */}
 <div className="grid grid-cols-3 gap-4 w-full mb-8">
 <StatCard 
 icon={Flame} 
 label={t('habits.streak', "Racha")} 
 value={displayHabit.streak} 
 color="#f97316" 
 delay={0.6}
 />
 <StatCard 
 icon={Star} 
 label={t('habits.best', "Mejor")} 
 value={bestStreak} 
 color="#facc15" 
 delay={0.7}
 />
 <StatCard 
 icon={Calendar} 
 label={t('habits.started', "Iniciado")} 
 value={format(creationDate, 'd MMM', { locale: t('locale') === 'es' ? es : undefined })} 
 color="#3b82f6" 
 delay={0.8}
 />
 </div>

 {/* Heatmap Contribution Graph */}
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.9 }}
 className="w-full mb-4"
 >
 <HabitHeatmap habit={displayHabit} color={baseColor} />
 </motion.div>

 {/* Trend Line Chart */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 1.0 }}
 className="w-full mb-4"
 >
 <HabitTrendChart habit={displayHabit} color={baseColor} />
 </motion.div>

 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 );

 return createPortal(modalContent, document.body);
};