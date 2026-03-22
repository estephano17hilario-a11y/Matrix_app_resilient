import React, { useMemo, useRef, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
    ArrowLeft, 
    Flame, 
    CheckCircle2, 
    Trophy,
    Circle
} from 'lucide-react';
import { isSameDay, addDays } from 'date-fns';
import { Habit } from '../../types';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

// --- CONFIGURATION ---
const TOTAL_DAYS = 90;
const NODE_HEIGHT = 140; // Vertical distance between nodes
const X_OFFSET = 80;     // Horizontal amplitude from center
const VIEWBOX_WIDTH = 320;
const CENTER_X = VIEWBOX_WIDTH / 2;
const TOP_PADDING = 60;  // Padding for the first node

export const getTargetPercentage = (day: number) => {
    if (day <= 7) return 60;
    if (day <= 14) return 67;
    if (day <= 30) return 75;
    if (day <= 60) return 80;
    if (day <= 90) return 80;
    return 85;
};

export const getNextLevelPercentage = (day: number) => {
    if (day < 7) return 67;
    if (day < 14) return 75;
    if (day < 30) return 80;
    if (day < 60) return 80;
    if (day < 90) return 85;
    return 85;
};

interface StreakRoadmapViewProps {
    habits: Habit[];
    onClose: () => void;
}

// --- COMPONENTS ---

const HeaderStat = ({ label, value, colorClass = "text-white" }: { label: string, value: string, colorClass?: string }) => (
    <div className="flex flex-col items-center justify-center py-4">
        <span className="text-[9px] font-black text-white/30 tracking-[0.2em] mb-1 uppercase">{label}</span>
        <span className={cn("text-xl font-black tracking-tight", colorClass)}>{value}</span>
    </div>
);

export const StreakRoadmapView: React.FC<StreakRoadmapViewProps> = ({ habits, onClose }) => {
    const { t } = useTranslation();

    const scrollRef = useRef<HTMLDivElement>(null);

    // --- LOGIC: Calculate Streak & Progress ---
    const { currentStreak, todayProgress, roadmapData, completedDays } = useMemo(() => {
        const activeHabits = habits.filter(h => !h.archived);
        
        // 1. Calculate Today's Progress
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let completedTodayCount = 0;
        let totalDueToday = 0;

        activeHabits.forEach(h => {
            // Simplified due check for demo purposes
            // In a real app, use complex frequency logic
            const isDue = h.frequency === 'DAILY' || (h.frequency === 'WEEKLY' && (!h.frequencyDays?.length || h.frequencyDays.includes(today.getDay())));
            
            if (isDue) {
                totalDueToday++;
                // Check if completed today
                const isCompleted = h.completedToday || (h.history && h.history.some(d => isSameDay(new Date(d), today)));
                if (isCompleted) completedTodayCount++;
            }
        });

        const progressPercent = totalDueToday > 0 ? Math.round((completedTodayCount / totalDueToday) * 100) : 0;
        const todayProgress = progressPercent;
        const streak = 1;
        const completedDays = streak > 0 ? streak - 1 : 0;

        // 3. Generate Roadmap Nodes
        const nodes = Array.from({ length: TOTAL_DAYS }, (_, i) => {
            const dayNum = i + 1;
            const date = addDays(today, i);
            const isTodayNode = dayNum === streak;
            const isPast = dayNum < streak;
            const isCompleted = isPast;
            
            let status: 'completed' | 'current' | 'locked' = 'locked';
            if (isPast) status = 'completed';
            if (isTodayNode) status = 'current';
            
            let label = `DÍA ${dayNum}`;
            if (isTodayNode) label = "HOY";
            else if (dayNum === streak + 1) label = "MAÑANA";
            else if (dayNum === streak + 2) label = "EN 2 DÍAS";
            else if (dayNum === streak + 3) label = "EN 3 DÍAS";
            else if (dayNum === streak + 4) label = "EN 4 DÍAS";
            else label = `EN ${dayNum - streak} DÍAS`;

            return {
                day: dayNum,
                status,
                label,
                date,
                side: i % 2 === 0 ? 'left' : 'right',
                isCompleted
            };
        });

        return {
            currentStreak: streak,
            todayProgress,
            roadmapData: nodes,
            completedDays
        };
    }, [habits]);

    // --- SVG PATH CALCULATION ---
    // Generate a smooth cubic bezier curve connecting the nodes
    const pathD = useMemo(() => {
        let d = "";
        roadmapData.forEach((node, i) => {
            const x = node.side === 'left' ? CENTER_X - X_OFFSET : CENTER_X + X_OFFSET;
            const y = TOP_PADDING + (i * NODE_HEIGHT);

            if (i === 0) {
                d += `M ${x} ${y}`;
            } else {
                const prevNode = roadmapData[i-1];
                const prevX = prevNode.side === 'left' ? CENTER_X - X_OFFSET : CENTER_X + X_OFFSET;
                const prevY = TOP_PADDING + ((i-1) * NODE_HEIGHT);
                
                // Control points for smooth S-curve
                const cp1y = prevY + (NODE_HEIGHT * 0.5);
                const cp2y = y - (NODE_HEIGHT * 0.5);
                
                d += ` C ${prevX} ${cp1y}, ${x} ${cp2y}, ${x} ${y}`;
            }
        });
        return d;
    }, [roadmapData]);

    // Calculate length of the path that should be "lit up" (progress)
    // For now, we just light up until the current node
    // In a real app, we could calculate precise percentage
    
    // Auto-scroll to current node on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentElement = document.getElementById('node-current');
            if (currentElement && scrollRef.current) {
                currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020204] text-white flex flex-col h-full w-full overflow-hidden font-sans"
        >
            {/* Background Ambience (Ultra-Elegant Mesh Gradient - Static & High Perf) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Primary Mesh Layer */}
                <div 
                    className="absolute inset-0 opacity-80"
                    style={{
                        background: `
                            radial-gradient(at 0% 0%, #1e1b4b 0%, transparent 50%),
                            radial-gradient(at 100% 0%, #312e81 0%, transparent 50%),
                            radial-gradient(at 100% 100%, #1e3a8a 0%, transparent 50%),
                            radial-gradient(at 0% 100%, #172554 0%, transparent 50%),
                            radial-gradient(at 50% 50%, #1e1b4b 0%, transparent 50%)
                        `
                    }}
                />
                {/* Secondary Accent Layer (Mesh Style) */}
                <div 
                    className="absolute inset-0 opacity-40 mix-blend-screen"
                    style={{
                        background: `
                            radial-gradient(circle at 10% 20%, rgba(79, 70, 229, 0.2) 0%, transparent 40%),
                            radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 40%),
                            radial-gradient(circle at 80% 10%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
                            radial-gradient(circle at 20% 90%, rgba(236, 72, 153, 0.1) 0%, transparent 40%)
                        `
                    }}
                />
                {/* Subtle Grain Texture for high-end feel */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
            </div>

            {/* --- HEADER --- */}
                <div className="flex-none z-20 pt-safe relative">
                    {/* Header Ambient Glow (Truly Integrated) */}
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                    
                    <div className="relative flex items-center justify-between px-4 py-4">
                        <button 
                            onClick={onClose}
                            className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all active:scale-95 backdrop-blur-xl"
                        >
                            <ArrowLeft className="w-6 h-6 text-white/90" />
                        </button>
                        
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-white/30 tracking-[0.3em] uppercase mb-0.5">{t('dashboard.thePath')}</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-white tracking-tight drop-shadow-lg">{t('dashboard.day')} {currentStreak}</span>
                                <span className="text-xs text-white/30 font-bold">/ {TOTAL_DAYS}</span>
                            </div>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-xl">
                            <Flame className="w-6 h-6 text-amber-500 fill-amber-500/40" />
                        </div>
                    </div>

                    {/* Stats Row (No more black boxes - Pure transparency) */}
                    <div className="relative grid grid-cols-2 divide-x divide-white/5 border-y border-white/5">
                        <HeaderStat label={t('dashboard.dailyGoal', 'DAILY GOAL')} value={`${getNextLevelPercentage(currentStreak)}%`} />
                        <HeaderStat label={t('dashboard.todayProgress', 'TODAY PROGRESS')} value={`${todayProgress}%`} colorClass={todayProgress >= getNextLevelPercentage(currentStreak) ? "text-orange-400" : "text-cyan-400"} />
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT --- */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto relative scrollbar-hide"
                    style={{ perspective: '1000px' }}
                >
                    <div className="relative w-full flex justify-center pb-32 pt-10" style={{ minHeight: `${roadmapData.length * NODE_HEIGHT + 200}px` }}>
                        {/* SVG PATH LAYER */}
                        <svg 
                            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
                            preserveAspectRatio="xMidYMin meet"
                            viewBox={`0 0 ${VIEWBOX_WIDTH} ${roadmapData.length * NODE_HEIGHT + 200}`}
                        >
                            <defs>
                                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#f97316" />
                                    <stop offset="50%" stopColor="#fb923c" />
                                    <stop offset="100%" stopColor="#fbbf24" />
                                </linearGradient>
                                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
                                </linearGradient>
                                <filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            
                            {/* Background Track - Dim */}
                            <path 
                                d={pathD} 
                                fill="none" 
                                stroke="rgba(255,255,255,0.03)" 
                                strokeWidth="4" 
                                strokeLinecap="round"
                            />

                            {/* Illuminated Progress Path - Progressive */}
                            {completedDays > 0 && (
                                <motion.path 
                                    d={pathD} 
                                    fill="none" 
                                    stroke="url(#pathGradient)" 
                                    strokeWidth="4" 
                                    strokeLinecap="round"
                                    filter="url(#pathGlow)"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            )}

                            {/* Milestone Markers on Path */}
                            {[7, 14, 30, 60, 90].map(milestone => {
                                const milestoneIndex = milestone - 1;
                                const milestoneNode = roadmapData[milestoneIndex];
                                if (!milestoneNode) return null;
                                const x = milestoneNode.side === 'left' ? CENTER_X - X_OFFSET : CENTER_X + X_OFFSET;
                                const y = TOP_PADDING + (milestoneIndex * NODE_HEIGHT);
                                const isPassed = milestone < currentStreak;
                                return (
                                    <circle
                                        key={milestone}
                                        cx={x}
                                        cy={y}
                                        r={isPassed ? 8 : 6}
                                        fill={isPassed ? '#f97316' : 'rgba(251,191,36,0.3)'}
                                        stroke={isPassed ? '#fed7aa' : 'rgba(251,191,36,0.5)'}
                                        strokeWidth="2"
                                    />
                                );
                            })}
                        </svg>

                        {/* NODES LAYER */}
                        <div className="relative z-10 w-full max-w-[320px]">
                            {roadmapData.map((node, index) => {
                                const isLeft = node.side === 'left';
                                const y = TOP_PADDING + (index * NODE_HEIGHT);
                                // We position absolutely based on the same logic as SVG to ensure alignment
                                // Center is 50% of container.
                                // Left is 50% - X_OFFSET
                                // Right is 50% + X_OFFSET
                                
                                return (
                                    <div
                                        key={node.day}
                                        id={node.status === 'current' ? 'node-current' : undefined}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                        style={{
                                            top: y,
                                            left: isLeft ? `calc(50% - ${X_OFFSET}px)` : `calc(50% + ${X_OFFSET}px)`
                                        }}
                                    >
                                        <RoadmapNode node={node} progress={todayProgress} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>
    );
};

// --- SUB-COMPONENT: NODE ---
const RoadmapNode = ({ node, progress }: { node: any, progress: number }) => {
    const isCurrent = node.status === 'current';
    const isLocked = node.status === 'locked';
    const isCompleted = node.status === 'completed';
    const isMilestone = [7, 14, 30, 60, 90].includes(node.day);
    const targetPercentage = getTargetPercentage(node.day);
    const nextLevelPercentage = getNextLevelPercentage(node.day);

    const variants: Variants = {
        hidden: { scale: 0.8, opacity: 0 },
        visible: { 
            scale: 1, 
            opacity: 1,
            transition: { type: 'spring', stiffness: 300, damping: 22 } 
        }
    };

    if (isCompleted) {
        if (isMilestone) {
            return (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                    className="relative group z-20"
                >
                    <div 
                        className="absolute -inset-1 rounded-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-300"
                        style={{ boxShadow: '0 0 15px rgba(249,115,22,0.25)' }}
                    />
                    <div className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/40 shadow-lg">
                        <CheckCircle2 className="w-7 h-7 text-orange-400" />
                        <span className="text-[8px] font-black text-orange-400/80 uppercase tracking-wider mt-0.5">OK</span>
                    </div>
                </motion.div>
            );
        }

        return (
            <motion.div
                initial="hidden"
                animate="visible"
                variants={variants}
                className="relative group"
            >
                <div 
                    className="absolute -inset-1 rounded-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                    style={{ boxShadow: '0 0 10px rgba(249,115,22,0.2)' }}
                />
                <div className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 border border-orange-500/30">
                    <CheckCircle2 className="w-5 h-5 text-orange-400" />
                </div>
            </motion.div>
        );
    }

    if (isCurrent) {
        const displayPercentage = isMilestone ? nextLevelPercentage : targetPercentage;
        const isAchieved = progress >= displayPercentage;

        return (
            <motion.div
                initial="hidden"
                animate="visible"
                variants={variants}
                className={cn("relative group z-30", isMilestone ? "scale-110" : "")}
            >
                <div 
                    className="absolute -inset-1 rounded-full opacity-70 group-hover:opacity-90 transition-opacity duration-300"
                    style={{ 
                        boxShadow: isAchieved 
                            ? '0 0 25px rgba(249,115,22,0.4)' 
                            : '0 0 20px rgba(16,185,129,0.3)'
                    }}
                />
                
                <div className={cn(
                    "relative flex items-center gap-3 pl-2 pr-5 py-2.5 bg-[#0f0f0f] border rounded-[1.8rem] shadow-lg transition-colors duration-300",
                    isMilestone 
                        ? (isAchieved ? "border-orange-500/60" : "border-amber-500/50") 
                        : (isAchieved ? "border-orange-500/40" : "border-emerald-500/30")
                )}>
                    <div className={cn(
                        "flex items-center justify-center w-11 h-11 rounded-xl border",
                        isMilestone 
                            ? (isAchieved ? "bg-orange-500/20 border-orange-500/50" : "bg-amber-500/20 border-amber-500/50") 
                            : (isAchieved ? "bg-orange-500/20 border-orange-500/40" : "bg-emerald-500/20 border-emerald-500/40")
                    )}>
                        {isAchieved ? (
                            <CheckCircle2 className={cn("w-6 h-6", isMilestone ? "text-orange-400" : "text-orange-400")} />
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Circle className="w-6 h-6 opacity-80" />
                                <div className={cn("absolute inset-0 rounded-lg opacity-25", isMilestone ? "bg-amber-500" : "bg-emerald-500")} />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-[0.15em] mb-0.5",
                            isMilestone ? "text-amber-400" : "text-emerald-500"
                        )}>
                            {isMilestone ? "HOY - NUEVO NIVEL" : "HOY"}
                        </span>
                        <span className={cn(
                            "text-sm font-black tracking-tight",
                            isAchieved ? "text-orange-400" : "text-white"
                        )}>
                            {isAchieved ? "Completado" : `${displayPercentage}% Requerido`}
                        </span>
                    </div>

                    <div className={cn(
                        "absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[2px] border-[#020204]",
                        isAchieved ? "bg-orange-500" : (isMilestone ? "bg-amber-500" : "bg-emerald-500")
                    )} />
                </div>
            </motion.div>
        );
    }

    if (isLocked) {
        if (isMilestone) {
            return (
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={variants}
                    className="relative flex items-center gap-3 p-3 bg-[#0a0805] border border-amber-500/30 rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02] z-20"
                >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#1a1205] border border-amber-500/40 text-amber-300 font-black text-lg">
                        <span className="text-[8px] uppercase tracking-widest opacity-70 mb-[-2px]">Día</span>
                        {node.day}
                    </div>

                    <div className="flex flex-col min-w-[90px]">
                        <span className="text-[10px] font-black text-amber-400/70 uppercase tracking-[0.15em] mb-0.5">
                            NUEVO NIVEL
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <span className="text-base font-black text-amber-400 tracking-tight">{nextLevelPercentage}%</span>
                        </div>
                    </div>

                    <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-amber-500/50 bg-amber-500/30",
                        node.side === 'left' ? "-right-1" : "-left-1"
                    )} />
                </motion.div>
            );
        }

        return (
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={variants}
                className="relative flex items-center gap-3 pl-2.5 pr-5 py-2 bg-[#080808] border border-white/[0.06] rounded-xl opacity-60 hover:opacity-80 transition-opacity duration-300"
            >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111] border border-white/10 text-white/50 font-mono font-black text-xs">
                    {node.day}
                </div>

                <div className="flex flex-col min-w-[70px]">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.1em] mb-0.5">
                        {node.label}
                    </span>
                    <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-white/15" />
                        <span className="text-[10px] font-black text-white/40 tracking-tight">{targetPercentage}%</span>
                    </div>
                </div>

                <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-white/15 bg-white/10",
                    node.side === 'left' ? "-right-0.5" : "-left-0.5"
                )} />
            </motion.div>
        );
    }

    return null;
};
