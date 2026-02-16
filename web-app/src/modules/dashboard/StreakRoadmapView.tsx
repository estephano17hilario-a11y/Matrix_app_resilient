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

// --- COMPONENT: GLOWING ORB ---
const GlowingOrb = ({ color, delay = 0 }: { color: string, delay?: number }) => (
    <motion.div
        animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
            duration: 4, 
            repeat: Infinity, 
            delay,
            ease: "easeInOut" 
        }}
        className={cn("absolute rounded-full blur-[80px] pointer-events-none", color)}
    />
);

// --- COMPONENT: NODE CARD ---
const NodeCard = ({ node, index, xOffset, currentStreak }: { node: RoadmapNode; index: number; xOffset: number; currentStreak: number }) => {
    const isLeft = index % 2 === 0;
    
    // Milestones have special icons
    const getIcon = () => {
        // CHANGED: Show day number instead of Lock icon for locked days
        if (node.status === 'locked') return <span className="font-bold text-sm text-white/30">{node.day}</span>;
        if (node.day === 60) return <Crown size={20} className="text-amber-300" />;
        if (node.day === 30) return <Trophy size={18} className="text-purple-300" />;
        if (node.day % 7 === 0) return <Gift size={18} className="text-cyan-300" />;
        return <span className="font-bold text-sm">{node.day}</span>;
    };

    const handleMilestoneClick = () => {
        if (!node.isMilestone) return;
        
        // Example rewards based on milestone day
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
                    background: 'rgba(20, 20, 20, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                },
                icon: '🎁'
            }
        );
    };

    // Calculate text for day label
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

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 20, 
                delay: index * 0.05 
            }}
            className="absolute flex items-center justify-center w-full"
            style={{ 
                top: index * ITEM_HEIGHT, 
                height: ITEM_HEIGHT,
                paddingLeft: isLeft ? 0 : `${Math.abs(xOffset) * 2}px`,
                paddingRight: isLeft ? `${Math.abs(xOffset) * 2}px` : 0,
            }}
        >
            {/* The Card */}
            <motion.div 
                onClick={handleMilestoneClick}
                whileHover={node.isMilestone ? { scale: 1.05 } : { scale: 1.02 }}
                animate={node.isMilestone && node.status !== 'done' ? { 
                    scale: [1, 1.03, 1],
                    boxShadow: [
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        "0 10px 15px -3px rgba(245, 158, 11, 0.1), 0 4px 6px -2px rgba(245, 158, 11, 0.05)",
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                    ]
                } : {}}
                transition={node.isMilestone ? {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                } : { duration: 0.2 }}
                className={cn(
                "relative group rounded-3xl border transition-colors duration-300 flex items-center gap-3 cursor-pointer",
                node.isMilestone ? "w-64 py-5 px-5 z-20 border-amber-500/20" : "w-40 py-2 px-3 opacity-90 hover:opacity-100",
                node.status === 'current' 
                    ? "bg-slate-800/80 border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.25)] scale-105 z-30 backdrop-blur-md"
                    : node.status === 'done'
                        ? cn(
                            "bg-emerald-900/40 border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] hover:bg-emerald-900/50 backdrop-blur-sm",
                            isActiveCompleted && "bg-emerald-500/20 border-emerald-400/50 border-b-emerald-300/50 shadow-[0_0_25px_-5px_rgba(16,185,129,0.4)]"
                        )
                        : node.isMilestone
                            ? "bg-[#121212]/80 backdrop-blur-md border-white/10"
                            : cn(
                                "bg-[#121212] border-white/5 opacity-60 hover:opacity-100",
                                index === currentStreak && node.status === 'locked' && "border-b-indigo-500/30 shadow-[0_4px_10px_-4px_rgba(99,102,241,0.15)] opacity-80"
                            )
            )}>
                {isActiveCompleted && (
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-emerald-400/25 to-transparent pointer-events-none" />
                )}
                {/* Current Day Pulse */}
                {node.status === 'current' && (
                    <div className="absolute inset-0 rounded-3xl border border-indigo-500/30 animate-pulse" />
                )}

                {/* Circle Icon */}
                <div className={cn(
                    "rounded-2xl flex items-center justify-center shadow-lg border shrink-0 transition-transform duration-500",
                    node.isMilestone ? "w-12 h-12 group-hover:rotate-[360deg]" : "w-10 h-10",
                    node.status === 'current' 
                        ? "bg-indigo-500 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                        : node.status === 'done'
                            ? isActiveCompleted 
                                ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-white/5 text-white/30 border-white/10"
                )}>
                    {node.status === 'done' ? <CheckCircle2 size={node.isMilestone ? 20 : 16} /> : getIcon()}
                </div>

                {/* Text Info */}
                <div className="flex flex-col">
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                        node.status === 'current' ? "text-indigo-300" : "text-white/50"
                    )}>
                        {getDayLabel()}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {node.status === 'done' ? (
                            <span className="text-xs font-bold text-emerald-400">Completado</span>
                        ) : (
                            <>
                                <Target size={12} className={node.status === 'current' ? "text-white" : "text-white/30"} />
                                <span className={cn(
                                    "text-xs font-bold",
                                    node.status === 'current' ? "text-white" : "text-white/40",
                                    // Special color for milestone percentages as requested
                                    node.isMilestone && "text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] text-sm"
                                )}>
                                    {node.requiredPercent}%
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {node.isMilestone && (
                    <div className="ml-auto flex items-center gap-2">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-pulse" />
                            <Gift size={22} className={cn("relative", node.status === 'locked' ? "text-amber-300/50" : "text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]")} />
                        </div>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
                            node.status === 'locked' ? "text-amber-300/40 border-amber-300/20 bg-amber-500/5" : "text-amber-200 border-amber-400/40 bg-amber-500/15"
                        )}>
                            Regalo
                        </span>
                    </div>
                )}
                
                {/* Connector Dot (Visual anchor for the path) */}
                <div className={cn(
                    "absolute top-1/2 w-3 h-3 rounded-full border-2 transform -translate-y-1/2 z-20",
                    isLeft ? "-right-1.5 translate-x-0" : "-left-1.5 -translate-x-0", // Adjusted slightly
                    node.status === 'current' ? "bg-indigo-500 border-indigo-300 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" : 
                    node.status === 'done' ? "bg-emerald-500 border-emerald-300" : "bg-black border-white/20"
                )} />
            </motion.div>
        </motion.div>
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
                <GlowingOrb color="bg-indigo-600/20 w-[500px] h-[500px] -top-20 -left-20" />
                <GlowingOrb color="bg-rose-600/20 w-[400px] h-[400px] bottom-0 right-0" delay={2} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
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
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
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
                            filter="url(#glow)"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: visualProgress / TOTAL_DAYS }}
                            transition={{ duration: 2, ease: "easeOut" }}
                        />
                    </svg>

                    {/* NODES LAYER */}
                    <div className="relative z-10 w-full h-full">
                        {roadmap.map((node, index) => (
                            <NodeCard 
                                key={node.day} 
                                node={node} 
                                index={index} 
                                xOffset={index % 2 === 0 ? -1 : 1}
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
