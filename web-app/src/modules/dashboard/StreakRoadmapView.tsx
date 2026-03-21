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
    if (day <= 7) return 50;
    if (day <= 14) return 60;
    if (day <= 30) return 67;
    if (day <= 60) return 75;
    if (day <= 90) return 80;
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
    const { currentStreak, todayProgress, roadmapData } = useMemo(() => {
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
        
        // 2. Calculate Streak (Simplified for UI Demo)
        // Assume streak is stored or calculated based on consecutive days
        // For this demo, let's derive it or use a mock if 0 to show the UI
        let streak = 0;
        // Mock streak calculation logic would go here based on history
        // Using a hardcoded value or derived value for visual consistency
        // Let's assume the user has a streak if they completed habits yesterday
        // For the visual requested: "Día 1 / 60" implies we are on Day 1 or Day X
        // Let's simulate a streak based on habits completion
        streak = 1; // Default to Day 1 for new users

        // 3. Generate Roadmap Nodes
        const nodes = Array.from({ length: TOTAL_DAYS }, (_, i) => {
            const dayNum = i + 1;
            const date = addDays(today, i); // Day 1 is Today, Day 2 is Tomorrow... OR Day 1 was start?
            // "El Camino" usually implies a journey. 
            // If "Día 1/60", Day 1 is the start. 
            // If user is on Day 5, then 1-4 are past.
            
            // Let's assume the roadmap tracks the *User's Journey*
            // So Day 1 is the first day they started using the app (or this challenge).
            // However, the image shows "HOY" on a specific node.
            // Let's align: 
            // If User is on Day X of the challenge.
            
            // MOCK STATE FOR UI REPLICATION:
            // Let's say we are on Day 1 for the demo, or match the screenshot where "HOY" is prominent.
            // If we want to replicate the screenshot exactly:
            // The screenshot shows "HOY" as a node.
            
            // Dynamic Logic:
            // We need to know which "Day" of the 60-day challenge is "Today".
            // Let's assume currentStreak represents the day we are on.
            const isTodayNode = dayNum === streak;
            const isPast = dayNum < streak;
            
            let status: 'completed' | 'current' | 'locked' = 'locked';
            if (isPast) status = 'completed';
            if (isTodayNode) status = 'current';
            
            // Label Logic
            let label = `DÍA ${dayNum}`;
            if (isTodayNode) label = "HOY";
            else if (dayNum === streak + 1) label = "MAÑANA";
            else if (dayNum === streak + 2) label = "EN 2 DÍAS";
            else if (dayNum === streak + 3) label = "EN 3 DÍAS";
            else if (dayNum === streak + 4) label = "EN 4 DÍAS";
            else label = `EN ${dayNum - streak} DÍAS`; // Fallback

            return {
                day: dayNum,
                status,
                label,
                date,
                side: i % 2 === 0 ? 'left' : 'right' // Zigzag
            };
        });

        return {
            currentStreak: streak,
            todayProgress: progressPercent,
            roadmapData: nodes
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
                        <HeaderStat label={t('dashboard.dailyGoal', 'DAILY GOAL')} value={`${getTargetPercentage(currentStreak)}%`} />
                        <HeaderStat label={t('dashboard.todayProgress', 'TODAY PROGRESS')} value={`${todayProgress}%`} colorClass={todayProgress >= getTargetPercentage(currentStreak) ? "text-emerald-400" : "text-cyan-400"} />
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
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="50%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                            
                            {/* Background Track */}
                            <path 
                                d={pathD} 
                                fill="none" 
                                stroke="rgba(255,255,255,0.03)" 
                                strokeWidth="6" 
                                strokeLinecap="round"
                            />

                            {/* Active Progress Path */}
                             <path 
                                d={pathD} 
                                fill="none" 
                                stroke="url(#pathGradient)" 
                                strokeWidth="6" 
                                strokeLinecap="round"
                                strokeDasharray="10 12"
                                className="opacity-50"
                                style={{ filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))' }}
                            />
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
    const { t } = useTranslation();
    const isCurrent = node.status === 'current';
    const isLocked = node.status === 'locked';
    const isMilestone = [7, 14, 30, 60, 90].includes(node.day);
    const targetPercentage = getTargetPercentage(node.day);

    // ANIMATIONS
    const variants: Variants = {
        hidden: { scale: 0, opacity: 0 },
        visible: { 
            scale: 1, 
            opacity: 1,
            transition: { type: 'spring', stiffness: 260, damping: 20 } 
        }
    };

    if (isCurrent) {
        return (
            <motion.div
                initial="hidden"
                animate="visible"
                variants={variants}
                className={cn("relative group z-30", isMilestone ? "scale-110" : "")}
            >
                {/* Glow Effect - Optimized: Removed radial-gradient background for simple box-shadow or solid colors to save GPU */}
                <div className="absolute -inset-1 rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-300" style={{ boxShadow: isMilestone ? '0 0 20px rgba(245,158,11,0.3)' : '0 0 20px rgba(16,185,129,0.2)' }} />
                
                {/* Main Pill */}
                <div className={cn(
                    "relative flex items-center gap-4 pl-2 pr-6 py-3 bg-[#111] border rounded-[2rem] shadow-lg group-hover:bg-[#1a1a1a] transition-colors duration-300",
                    isMilestone ? "border-amber-500/50" : "border-emerald-500/30"
                )}>
                    <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-2xl border",
                        isMilestone ? "bg-[#2a1a05] border-amber-500/50 text-amber-400" : "bg-[#051a10] border-emerald-500/40 text-emerald-400"
                    )}>
                        {progress >= targetPercentage ? (
                            <CheckCircle2 className="w-7 h-7" />
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Circle className="w-7 h-7 opacity-80" />
                                <div className={cn("absolute inset-0 rounded-full opacity-20", isMilestone ? "bg-amber-500" : "bg-emerald-500")} />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] mb-0.5",
                            isMilestone ? "text-amber-500" : "text-emerald-500"
                        )}>
                            {isMilestone ? "HOY (META ALTA)" : "HOY"}
                        </span>
                        <span className={cn(
                            "text-base font-black tracking-tight",
                            progress >= targetPercentage 
                                ? (isMilestone ? "text-amber-400" : "text-emerald-400") 
                                : "text-white"
                        )}>
                            {progress >= targetPercentage ? t('common.completed', 'Completed') : `${targetPercentage}% REQUERIDO`}
                        </span>
                    </div>

                    {/* Indicator Dot */}
                    <div className={cn(
                        "absolute -right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[3px] border-[#020204]",
                        isMilestone ? "bg-amber-500" : "bg-emerald-500"
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
                    className="relative flex items-center gap-4 p-4 bg-[#1a1005] border border-amber-500/40 rounded-3xl shadow-lg transition-transform duration-300 hover:scale-105 z-20"
                >
                    {/* Number Circle */}
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-[#2a1a05] border border-amber-500/50 text-amber-300 font-black text-xl">
                        <span className="text-[10px] uppercase tracking-widest opacity-80 mb-[-4px]">Día</span>
                        {node.day}
                    </div>

                    <div className="flex flex-col min-w-[100px]">
                        <span className="text-xs font-black text-amber-400/80 uppercase tracking-[0.2em] mb-1">
                            NUEVO NIVEL
                        </span>
                        <div className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-amber-400" />
                            <span className="text-lg font-black text-amber-400 tracking-tight">{targetPercentage}%</span>
                        </div>
                    </div>

                    {/* Connector Dot */}
                    <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-amber-500 bg-amber-200",
                        node.side === 'left' ? "-right-1.5" : "-left-1.5"
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
                className="relative flex items-center gap-4 pl-3 pr-6 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-2xl opacity-80 hover:opacity-100 transition-opacity duration-300 shadow-sm"
            >
                {/* Number Circle */}
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#111] border border-white/10 text-white/60 font-mono font-black text-sm">
                    {node.day}
                </div>

                <div className="flex flex-col min-w-[80px]">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">
                        {node.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-white/20" />
                        <span className="text-xs font-black text-white/50 tracking-tight">{targetPercentage}%</span>
                    </div>
                </div>

                {/* Connector Dot */}
                <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/20 bg-white/10",
                    node.side === 'left' ? "-right-1" : "-left-1"
                )} />
            </motion.div>
        );
    }

    // COMPLETED / PAST
    if (isMilestone) {
        return (
            <motion.div
                initial="hidden"
                animate="visible"
                variants={variants}
                className="w-14 h-14 rounded-2xl bg-[#1a1005] border border-amber-500/40 flex items-center justify-center shadow-lg opacity-90 hover:opacity-100 transition-opacity duration-300 z-10"
            >
                <CheckCircle2 className="w-8 h-8 text-amber-400" />
            </motion.div>
        );
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={variants}
            className="w-10 h-10 rounded-xl bg-[#051a10] border border-emerald-500/20 flex items-center justify-center grayscale-[0.5] opacity-60 hover:opacity-100 transition-opacity duration-300"
        >
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </motion.div>
    );
};
