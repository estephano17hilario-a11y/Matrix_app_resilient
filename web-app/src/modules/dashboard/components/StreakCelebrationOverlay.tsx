import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Circle } from 'lucide-react';
import { addDays, isSameDay, format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfWeek, parseLocalDate } from '../../../utils/dateUtils';
import { useTranslation } from 'react-i18next';

interface StreakCelebrationOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    streak: number;
    lastStreakDate?: string;
}

export const StreakCelebrationOverlay: React.FC<StreakCelebrationOverlayProps> = ({ 
    isOpen, 
    onClose, 
    streak, 
    lastStreakDate 
}) => {
    const { t } = useTranslation();

    // Auto-close after 5 seconds
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    // Calculate Weekly View Data
    const weekData = useMemo(() => {
        const today = new Date();
        const start = startOfWeek(today); // Start on Monday
        
        // Generate array of active dates based on streak and lastStreakDate
        const activeDates: string[] = [];
        if (lastStreakDate && streak > 0) {
            const lastDate = parseLocalDate(lastStreakDate);
            // Add the lastDate and (streak - 1) days before it
            for (let i = 0; i < streak; i++) {
                activeDates.push(format(subDays(lastDate, i), 'yyyy-MM-dd'));
            }
        }
        
        // Since this modal ONLY appears when we complete the streak today, ensure today is active
        const todayStr = format(today, 'yyyy-MM-dd');
        if (!activeDates.includes(todayStr)) {
            activeDates.push(todayStr);
        }

        return Array.from({ length: 7 }).map((_, i) => {
            const date = addDays(start, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const isActive = activeDates.includes(dateStr);
            const isToday = isSameDay(date, today);
            const isFuture = date > today;
            
            return {
                date,
                label: format(date, 'EE', { locale: es }).substring(0, 1).toUpperCase(),
                isActive,
                isToday,
                isFuture
            };
        });
    }, [streak, lastStreakDate]);

    // If not open, return null immediately
    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto">
                    {/* BACKDROP - Dark gradient for focus */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90"
                        style={{
                            background: 'radial-gradient(circle at center, rgba(2,2,4,0.8) 0%, rgba(0,0,0,0.95) 100%)'
                        }}
                    />

                    <div className="relative z-10 w-full max-w-[340px] px-4 flex flex-col items-center">
                        
                        {/* THE BIG FLAME ANIMATION */}
                        <div className="w-full flex flex-col items-center mb-8 relative">
                            {/* Particles Explosion */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center top-[-20px]">
                                {Array.from({ length: 24 }).map((_, i) => {
                                    const angle = (i * 360) / 24;
                                    const dist = 80 + Math.random() * 60;
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                                            animate={{
                                                opacity: 0,
                                                scale: Math.random() * 0.8 + 0.4,
                                                x: Math.cos(angle * Math.PI / 180) * dist,
                                                y: Math.sin(angle * Math.PI / 180) * dist,
                                            }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className={`absolute w-3 h-3 rounded-full ${i % 2 === 0 ? 'bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.8)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'}`}
                                        />
                                    );
                                })}
                            </div>

                            {/* Main Big Flame */}
                            <motion.div 
                                initial={{ scale: 0, rotate: -30, y: 50 }}
                                animate={{ scale: [0, 1.4, 1], rotate: [ -30, 15, 0 ], y: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                                className="relative z-10 w-32 h-32 flex items-center justify-center"
                            >
                                <div 
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.5) 0%, transparent 70%)' }}
                                />
                                <Flame 
                                    size={110} 
                                    className="text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,1)] relative z-10" 
                                    fill="currentColor"
                                />
                            </motion.div>

                            {/* Streak Number */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.4, type: "spring" }}
                                className="mt-4 text-center"
                            >
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-300 to-red-600 drop-shadow-[0_4px_10px_rgba(249,115,22,0.5)] tracking-tighter">
                                        {streak}
                                    </span>
                                    <span className="text-2xl font-bold text-orange-400">DÍAS</span>
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight mt-2 drop-shadow-md uppercase">
                                    {t('streak.secured', '¡Racha Asegurada!')}
                                </h2>
                            </motion.div>
                        </div>

                        {/* WEEKLY VIEW IN THE OVERLAY */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, type: "spring", stiffness: 450, damping: 20 }}
                            className="w-full bg-white/10 rounded-3xl p-4 border border-white/10 shadow-md"
                        >
                            <div className="flex justify-between items-center w-full px-1">
                                {weekData.map((day, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 relative">
                                        <span className={`text-[11px] font-bold ${day.isToday ? 'text-white' : 'text-white/50'}`}>
                                            {day.label}
                                        </span>
                                        <div className="relative">
                                            {day.isActive ? (
                                                <motion.div
                                                    initial={day.isToday ? { scale: 0, rotate: -180 } : { scale: 1 }}
                                                    animate={day.isToday ? { scale: [0, 1.3, 1], rotate: 0 } : { scale: 1 }}
                                                    transition={{ type: "spring", delay: day.isToday ? 1.2 : 0, duration: 0.25 }}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                                                >
                                                    <Flame size={18} className="text-white drop-shadow-md" fill="currentColor" />
                                                </motion.div>
                                            ) : (
                                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all ${day.isFuture ? 'bg-transparent border-white/5' : 'bg-white/5 border-white/10'}`}>
                                                    {!day.isFuture && <Circle size={10} className="text-white/20" />}
                                                </div>
                                            )}
                                            {day.isToday && (
                                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2, duration: 1 }}
                            className="text-white/30 text-xs mt-8 cursor-pointer hover:text-white/50"
                            onClick={onClose}
                        >
                            {t('common.tapToContinue')}
                        </motion.p>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
