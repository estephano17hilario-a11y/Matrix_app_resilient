import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    Flame, 
    Trophy
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Habit } from '../../types';
import { cn } from '../../utils/cn';

// --- CONSTANTS ---
const TOTAL_DAYS = 66; // Standard habit formation time
const MILESTONES = [7, 21, 30, 66];

interface StreakRoadmapViewProps {
    habits: Habit[];
    onClose: () => void;
}

// --- IRON RULES COMPLIANT GLASS CARD ---
const GlassCard = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
    <div 
        onClick={onClick}
        className={cn(
            "relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-sm transition-all duration-300",
            className
        )}
    >
        {children}
    </div>
);

export const StreakRoadmapView: React.FC<StreakRoadmapViewProps> = ({ habits, onClose }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- LOGIC ---
    const { currentStreak, roadmapData, todayStats } = useMemo(() => {
        const activeHabits = habits.filter(h => !h.archived);
        const totalHabits = activeHabits.length;
        
        // Calculate Global Streak based on Habit consistency
        // Logic: A day is "Perfect" if all active habits were completed.
        // We look at history.
        
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        
        let currentStreak = 0;
        
        // We use the pre-calculated streak from the user stats ideally, 
        // but here we visualize the history.
        // Let's rely on the passed habits to reconstruct the "Perfect Days" history.
        
        const historyMap = new Map<string, number>(); // Date -> Count
        
        activeHabits.forEach(h => {
            h.history?.forEach(dateStr => {
                // Handle ISO strings
                const d = dateStr.split('T')[0];
                historyMap.set(d, (historyMap.get(d) || 0) + 1);
            });
            // Include today if completed
            if (h.completedToday) {
                historyMap.set(todayStr, (historyMap.get(todayStr) || 0) + 1);
            }
        });

        // Calculate Today's Status
        const todayCount = historyMap.get(todayStr) || 0;
        const todayProgress = totalHabits > 0 ? (todayCount / totalHabits) * 100 : 0;
        
        // Calculate Streak (Backwards from yesterday)
        let streak = 0;
        let checkDate = subDays(now, 1);
        
        // If today is fully complete, streak includes today?
        // Usually streak is "consecutive days COMPLETED". 
        // If today is not done, streak is valid up to yesterday.
        // If today IS done, streak includes today.
        
        if (todayProgress >= 100) {
            streak++;
        }
        
        while (true) {
            const dStr = format(checkDate, 'yyyy-MM-dd');
            const count = historyMap.get(dStr) || 0;
            const progress = totalHabits > 0 ? (count / totalHabits) : 0;
            
            if (progress >= 1) { // Strict Mode: 100% completion required
                streak++;
                checkDate = subDays(checkDate, 1);
            } else {
                break;
            }
        }
        
        currentStreak = streak;

        // Generate Roadmap Data
        // We show: Past few days, Today, Future days up to 66
        const days = [];
        // Show 3 days before current streak start (context)
        for (let i = 0; i < TOTAL_DAYS; i++) {
            const dayNum = i + 1;
            const isCompleted = dayNum <= currentStreak;
            const isToday = dayNum === currentStreak + 1; // The next target
            
            days.push({
                day: dayNum,
                status: isCompleted ? 'completed' : (isToday ? 'current' : 'locked'),
                isMilestone: MILESTONES.includes(dayNum)
            });
        }

        return {
            currentStreak,
            roadmapData: days,
            todayStats: {
                progress: todayProgress,
                count: todayCount,
                total: totalHabits
            }
        };
    }, [habits]);

    // Auto-scroll to current day
    useEffect(() => {
        if (scrollRef.current) {
            const currentEl = document.getElementById('current-day-node');
            if (currentEl) {
                currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, []);

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] bg-[#020204] text-white flex flex-col font-sans"
            >
                {/* --- AMBIENT BACKGROUND (Fake Glass) --- */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Subtle Gradient Orbs (No Blur > 16px on top) */}
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-3xl opacity-40" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/20 rounded-full blur-3xl opacity-40" />
                    
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
                </div>

                {/* --- HEADER --- */}
                <header className="relative z-50 flex items-center justify-between px-6 py-6 pt-safe">
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all"
                    >
                        <ArrowLeft size={20} className="text-white/70" />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Protocolo</span>
                        <h1 className="text-lg font-bold text-white tracking-tight">Racha Maestra</h1>
                    </div>

                    <div className="w-10 h-10 flex items-center justify-center">
                        <div className="relative">
                            <Flame size={24} className={cn("transition-colors", currentStreak > 0 ? "text-orange-500 fill-orange-500/20" : "text-white/20")} />
                            {currentStreak > 0 && (
                                <motion.div 
                                    layoutId="streak-flame-glow"
                                    className="absolute inset-0 bg-orange-500/30 blur-lg rounded-full" 
                                />
                            )}
                        </div>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden relative z-40 px-6 pb-32"
                >
                    {/* CURRENT STATUS CARD */}
                    <div className="mb-12 mt-4">
                        <GlassCard className="p-6 flex flex-col items-center text-center border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                            <div className="mb-2 text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                                {currentStreak}
                            </div>
                            <div className="text-sm font-medium text-white/50 uppercase tracking-widest mb-6">Días Consecutivos</div>
                            
                            {/* Progress Bar */}
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${todayStats.progress}%` }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                />
                            </div>
                            <div className="flex justify-between w-full text-xs text-white/40 font-mono">
                                <span>HOY: {Math.round(todayStats.progress)}%</span>
                                <span>META: 100%</span>
                            </div>
                        </GlassCard>
                    </div>

                    {/* TIMELINE */}
                    <div className="relative pl-8 border-l border-white/10 ml-4 space-y-12">
                        {roadmapData.map((node, index) => (
                            <div 
                                key={node.day} 
                                id={node.status === 'current' ? 'current-day-node' : undefined}
                                className="relative"
                            >
                                {/* Timeline Dot */}
                                <div className={cn(
                                    "absolute -left-[41px] top-4 w-5 h-5 rounded-full border-[3px] transition-all duration-500 z-10 flex items-center justify-center bg-[#020204]",
                                    node.status === 'completed' ? "border-emerald-500 text-emerald-500" :
                                    node.status === 'current' ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-125" :
                                    "border-white/10"
                                )}>
                                    {node.status === 'completed' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    {node.status === 'current' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                                </div>

                                {/* Content Card */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: "-10%" }}
                                    transition={{ type: "spring", stiffness: 100, delay: index * 0.05 }}
                                >
                                    <GlassCard className={cn(
                                        "p-5 transition-all duration-300 group",
                                        node.status === 'current' ? "bg-indigo-500/10 border-indigo-500/30" : 
                                        node.status === 'completed' ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100" : "opacity-40"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={cn(
                                                "text-xs font-bold uppercase tracking-wider",
                                                node.status === 'current' ? "text-indigo-400" : "text-white/40"
                                            )}>
                                                Día {node.day}
                                            </span>
                                            {node.isMilestone && <Trophy size={14} className="text-amber-400" />}
                                        </div>
                                        
                                        <h3 className={cn(
                                            "text-lg font-bold mb-1",
                                            node.status === 'locked' ? "text-white/30" : "text-white"
                                        )}>
                                            {node.isMilestone ? "Hito Legendario" : `Fase ${Math.ceil(node.day / 10)}`}
                                        </h3>
                                        
                                        <p className="text-sm text-white/50 leading-relaxed">
                                            {node.status === 'completed' ? "Completado con éxito." :
                                             node.status === 'current' ? "Objetivo activo. Completa todos tus hábitos hoy." :
                                             "Bloqueado. Mantén la racha para desbloquear."}
                                        </p>
                                    </GlassCard>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
