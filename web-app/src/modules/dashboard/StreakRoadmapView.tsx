import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    Target, 
    Flame, 
    CheckCircle2, 
    Trophy, 
    Crown, 
    Gift 
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Habit } from '../../types';
import { toLocalISOString } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

// --- CONSTANTS & CONFIG ---
const ITEM_HEIGHT = 90;
const AMPLITUDE = 85; // Horizontal spread
const TOTAL_DAYS = 60;

interface StreakRoadmapViewProps {
    habits: Habit[];
    onClose: () => void;
}

type RoadmapNode = {
    day: number;
    requiredPercent: number;
    status: 'done' | 'current' | 'locked';
    isMilestone: boolean;
};

// --- HELPER: LOGIC ---
const getRequiredPercentForDay = (day: number) => {
    // Milestones trigger the NEW percentage level
    if (day < 7) return 50;
    if (day < 14) return 55;
    if (day < 21) return 60;
    if (day < 30) return 70;
    if (day < 45) return 80;
    return 85;
};

const isMilestoneDay = (day: number) => {
    return [7, 14, 21, 30, 45, 60].includes(day);
};

// --- COMPONENT: GLOWING ORB (OPTIMIZED) ---
const GlowingOrb = ({ glowColor, className, delay = 0 }: { glowColor: string; className: string; delay?: number }) => (
    <motion.div
        animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ 
            duration: 5, 
            repeat: Infinity, 
            delay,
            ease: "easeInOut" 
        }}
        className={cn("absolute rounded-full pointer-events-none opacity-70", className)}
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
    />
);

// --- COMPONENT: NODE CARD ---
const NodeCard = ({ node, index, xOffset, currentStreak }: { node: RoadmapNode; index: number; xOffset: number; currentStreak: number }) => {
    // Determine visibility priority
    const distance = Math.abs(node.day - currentStreak);
    const isVisible = distance < 15; // Only heavy render items close to streak
    
    // Milestones have special icons
    const getIcon = () => {
        if (node.status === 'locked') return <span className="font-bold text-sm text-white/30 font-mono">{node.day}</span>;
        if (node.day === 60) return <Crown size={20} className="text-amber-300" />;
        if (node.day === 30) return <Trophy size={18} className="text-purple-300" />;
        if (node.day % 7 === 0) return <Gift size={18} className="text-cyan-300" />;
        return <span className="font-bold text-sm">{node.day}</span>;
    };

    const handleMilestoneClick = () => {
        if (!node.isMilestone) return;
        
        let rewardText = "Recompensa desconocida";
        if (node.day === 7) rewardText = "+500 XP, +100 Gold";
        else if (node.day === 14) rewardText = "+1000 XP, +250 Gold, Badge 'Constancia'";
        else if (node.day === 21) rewardText = "+2000 XP, +500 Gold, Desbloqueo de Tema";
        else if (node.day === 30) rewardText = "+5000 XP, +1000 Gold, Badge 'Mensual'";
        else if (node.day === 45) rewardText = "+7500 XP, +1500 Gold";
        else if (node.day === 60) rewardText = "FINAL BOSS REWARD: +10000 XP, +5000 Gold, STATUS LEGENDARIO";

        toast.success(
            <div className="flex flex-col gap-1">
                <span className="font-bold text-sm uppercase tracking-wider">Hito Día {node.day}</span>
                <span className="text-xs opacity-90">{rewardText}</span>
            </div>,
            {
                style: {
                    background: 'rgba(20, 20, 20, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                },
                icon: '🎁'
            }
        );
    };

    const getDayLabel = () => {
        if (node.day === 60) return "Final Boss";
        
        const diff = node.day - currentStreak;
        let suffix = "";
        if (diff > 0) suffix = ` (En ${diff} día${diff > 1 ? 's' : ''})`;
        if (diff === 0) suffix = " (Hoy)";
        
        if (node.isMilestone) return `Hito Épico${suffix}`;
        
        if (diff > 1) return `En ${diff} días`;
        if (diff === 1) return "Mañana";
        if (diff === 0) return "Hoy";
        return `Día ${node.day}`;
    };

    const isActiveCompleted = node.status === 'done' && node.day === currentStreak;
    const isCurrent = node.status === 'current';

    return (
        <div
            className="absolute flex items-center justify-center w-full pointer-events-none"
            style={{ 
                top: index * ITEM_HEIGHT, 
                height: ITEM_HEIGHT,
                transform: `translateX(${xOffset}px)`
            }}
        >
            {/* The Card */}
            <motion.div 
                onClick={handleMilestoneClick}
                initial={isVisible ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                    duration: 0.4,
                    delay: isVisible ? Math.min(index * 0.03, 1) : 0 
                }}
                className={cn(
                "relative group rounded-3xl border transition-all duration-300 flex items-center gap-3 pointer-events-auto",
                // SIZE
                node.isMilestone ? "w-64 py-4 px-5 z-20" : "w-40 py-2 px-3",
                
                // CURSOR
                node.isMilestone ? "cursor-pointer" : "cursor-default",

                // STYLES (OPTIMIZED: Removed backdrop-blur from non-critical items)
                isCurrent
                    ? "bg-slate-800/90 border-indigo-500/50 shadow-[0_0_25px_-5px_rgba(99,102,241,0.4)] scale-110 z-30"
                    : node.status === 'done'
                        ? cn(
                            "bg-[#0a0a0a]/80 border-emerald-500/20 shadow-none",
                            isActiveCompleted && "bg-emerald-900/20 border-emerald-400/50"
                        )
                        : node.isMilestone
                            ? "bg-[#121212]/90 border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.1)]"
                            : "bg-[#050505]/60 border-white/5 opacity-50"
            )}>
                {/* Highlight Glow for Current */}
                {isCurrent && (
                    <div className="absolute inset-0 rounded-3xl border border-indigo-400/50 animate-pulse" />
                )}

                {/* Circle Icon */}
                <div className={cn(
                    "rounded-2xl flex items-center justify-center border shrink-0 transition-transform duration-500",
                    node.isMilestone ? "w-12 h-12" : "w-10 h-10",
                    isCurrent
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-lg" 
                        : node.status === 'done'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-white/20 border-white/5"
                )}>
                    {node.status === 'done' ? <CheckCircle2 size={node.isMilestone ? 20 : 16} /> : getIcon()}
                </div>

                {/* Text Info */}
                <div className="flex flex-col min-w-0">
                    <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider mb-0.5 truncate",
                        isCurrent ? "text-indigo-300" : "text-white/30"
                    )}>
                        {getDayLabel()}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {node.status === 'done' ? (
                            <span className="text-xs font-bold text-emerald-500/80">Completado</span>
                        ) : (
                            <>
                                <Target size={12} className={isCurrent ? "text-white" : "text-white/20"} />
                                <span className={cn(
                                    "text-xs font-bold",
                                    isCurrent ? "text-white" : "text-white/30",
                                    node.isMilestone && "text-amber-200"
                                )}>
                                    {node.requiredPercent}%
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Milestone Reward Icon */}
                {node.isMilestone && (
                    <div className="ml-auto">
                        <Gift size={20} className={cn(node.status === 'locked' ? "text-white/10" : "text-amber-400 animate-bounce")} />
                    </div>
                )}
                
                {/* Connector Dot */}
                <div className={cn(
                    "absolute top-1/2 w-3 h-3 rounded-full border-2 transform -translate-y-1/2 z-20",
                    // Fix Dot Position based on xOffset direction
                    xOffset < 0 ? "-right-1.5" : "-left-1.5", 
                    isCurrent ? "bg-indigo-500 border-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : 
                    node.status === 'done' ? "bg-emerald-600 border-emerald-400" : "bg-black border-white/10"
                )} />
            </motion.div>
        </div>
    );
};


// --- MAIN VIEW ---
export const StreakRoadmapView: React.FC<StreakRoadmapViewProps> = ({ habits, onClose }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- DATA LOGIC ---
    const { currentStreak, visualProgress, roadmap, stats } = useMemo(() => {
        const activeHabits = habits.filter(h => !h.archived);
        const total = activeHabits.length;
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        const normalizeHistoryDate = (value: string) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) return toLocalISOString(parsed);
            return value.split('T')[0];
        };

        const getCompletionCount = (dateStr: string) => {
            return activeHabits.filter(h => 
                h.history?.some(hDate => normalizeHistoryDate(hDate) === dateStr)
            ).length;
        };

        const getDailyPercent = (dateStr: string) => {
            const count = getCompletionCount(dateStr);
            return total > 0 ? Math.round((count / total) * 100) : 0;
        };

        // Calculate Streak (Backwards from yesterday)
        let streak = 0;
        for (let i = 1; i <= 365; i++) {
            const dateStr = format(subDays(now, i), 'yyyy-MM-dd');
            const percent = getDailyPercent(dateStr);
            // We use the streak count AT THAT MOMENT to determine requirement.
            // Simplified: Use current streak calculation logic
            // If yesterday met the requirement for "Day 1", streak is 1.
            // If day before met requirement for "Day 1", and yesterday for "Day 2"...
            // This logic is complex. For now, let's trust the input logic or simplify.
            // RE-IMPLEMENTING SIMPLE STREAK LOGIC:
            // A streak is broken if a day is missed.
            // We check from yesterday backwards.
            const req = getRequiredPercentForDay(streak + 1);
            if (percent >= req) {
                streak++;
            } else {
                break;
            }
        }

        // Check Today
        const todayCount = getCompletionCount(todayStr);
        const todayPercent = total > 0 ? Math.round((todayCount / total) * 100) : 0;
        const requiredToday = getRequiredPercentForDay(streak + 1);
        
        // Active Day is always streak + 1 (The day we are working on)
        const currentActiveDay = streak + 1;
        
        // Visual Progress for the line (includes today if done)
        // If today is done, we want the line to extend towards tomorrow but stop just before it.
        // streak + 0.85 gives us that "almost there" look.
        const visualProgress = todayPercent >= requiredToday ? streak + 0.85 : streak;

        const nodes: RoadmapNode[] = Array.from({ length: TOTAL_DAYS }, (_, i) => {
            const day = i + 1;
            let status: 'done' | 'current' | 'locked' = 'locked';
            
            if (day < currentActiveDay) {
                status = 'done';
            } else if (day === currentActiveDay) {
                status = todayPercent >= requiredToday ? 'done' : 'current';
            } else {
                status = 'locked';
            }

            return {
                day,
                requiredPercent: getRequiredPercentForDay(day),
                status,
                isMilestone: isMilestoneDay(day)
            };
        });

        return {
            currentStreak: currentActiveDay,
            visualProgress,
            roadmap: nodes,
            stats: {
                todayPercent,
                requiredToday,
                todayCount,
                totalHabits: total
            }
        };
    }, [habits]);

    // --- AUTO SCROLL ---
    useEffect(() => {
        if (scrollRef.current) {
            // Center the current active node
            const currentIndex = roadmap.findIndex(n => n.day === currentStreak);
            if (currentIndex !== -1) {
                const y = currentIndex * ITEM_HEIGHT - (window.innerHeight / 2) + (ITEM_HEIGHT / 2);
                scrollRef.current.scrollTo({ top: y, behavior: 'smooth' });
            }
        }
    }, [roadmap, currentStreak]);

    // --- PATH GENERATION ---
    const pathData = useMemo(() => {
        // ... (keep points logic)
        const points = roadmap.map((_, i) => {
            const y = i * ITEM_HEIGHT + ITEM_HEIGHT / 2;
            const isLeft = i % 2 === 0;
            const x = 200 + (isLeft ? -AMPLITUDE : AMPLITUDE); 
            return { x, y };
        });

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cp1x = p0.x;
            const cp1y = p0.y + ITEM_HEIGHT * 0.5;
            const cp2x = p1.x;
            const cp2y = p1.y - ITEM_HEIGHT * 0.5;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
        }
        return d;
    }, [roadmap]); // Removed unused dependencies if any

    return (
        <div className="fixed inset-0 bg-[#020204] z-[500] flex flex-col font-sans text-white overflow-hidden">
            {/* ... Background ... */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <GlowingOrb glowColor="rgba(99,102,241,0.35)" className="w-[500px] h-[500px] -top-20 -left-20" />
                <GlowingOrb glowColor="rgba(244,63,94,0.3)" className="w-[400px] h-[400px] bottom-0 right-0" delay={2} />
                <div className="absolute inset-0 opacity-[0.03]" 
                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
                />
            </div>

            {/* --- HEADER (HUD) --- */}
            <header className="relative z-50 flex-shrink-0 px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/5">
                <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 group"
                >
                    <ArrowLeft size={20} className="text-white/70 group-hover:text-white transition-colors" />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">El Camino</span>
                    <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                        Día {currentStreak} <span className="text-white/30">/ 60</span>
                    </h1>
                </div>

                <div className="w-10 h-10 flex items-center justify-center">
                    <Flame className={cn("transition-all duration-500", stats.todayPercent >= stats.requiredToday ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" : "text-white/10")} fill={stats.todayPercent >= stats.requiredToday ? "currentColor" : "none"} size={24} />
                </div>
            </header>
            
            {/* ... Stats Strip ... */}
            {/* ... (Keep existing stats strip) ... */}
            <div className="relative z-40 px-6 py-2 bg-black/30 backdrop-blur-md border-b border-white/5 grid grid-cols-2 gap-px">
                 <div className="flex flex-col items-center justify-center py-2 border-r border-white/5">
                     <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Meta Diaria</span>
                     <span className="text-2xl font-mono font-bold text-white">{stats.requiredToday}%</span>
                 </div>
                 <div className="flex flex-col items-center justify-center py-2">
                     <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Progreso Hoy</span>
                     <span className={cn("text-2xl font-mono font-bold", stats.todayPercent >= stats.requiredToday ? "text-emerald-400" : "text-white")}>
                         {stats.todayPercent}%
                     </span>
                 </div>
            </div>

            {/* --- SCROLLABLE MAP --- */}
            <div 
                ref={scrollRef}
                className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar"
                style={{ perspective: '1000px' }}
            >
                <div className="relative w-full max-w-lg mx-auto" style={{ height: TOTAL_DAYS * ITEM_HEIGHT + 200 }}>
                    
                    {/* SVG PATH LAYER */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
                        <defs>
                            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                                <stop offset={`${(visualProgress / TOTAL_DAYS) * 100}%`} stopColor="#10b981" />
                                <stop offset={`${(visualProgress / TOTAL_DAYS) * 100 + 5}%`} stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                            </linearGradient>
                        </defs>
                        
                        {/* Background Path (Dim) */}
                        <path 
                            d={pathData} 
                            fill="none" 
                            stroke="rgba(255,255,255,0.05)" 
                            strokeWidth="8" 
                            strokeLinecap="round"
                        />

                        {/* Active Path (Animated) */}
                        <motion.path 
                            d={pathData} 
                            fill="none" 
                            stroke="url(#pathGradient)" 
                            strokeWidth="4" 
                            strokeLinecap="round"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' }}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: visualProgress / TOTAL_DAYS }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </svg>

                    {/* NODES LAYER */}
                    <div className="relative z-10 w-full h-full">
                        {roadmap.map((node, index) => (
                            <NodeCard 
                                key={node.day} 
                                node={node} 
                                index={index} 
                                xOffset={index % 2 === 0 ? -AMPLITUDE : AMPLITUDE}
                                currentStreak={currentStreak}
                            />
                        ))}
                    </div>

                </div>
                
                {/* Bottom Spacer */}
                <div className="h-32" />
            </div>
        </div>
    );
};
