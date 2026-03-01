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

// --- CONFIGURATION ---
const TOTAL_DAYS = 60;
const NODE_HEIGHT = 140; // Vertical distance between nodes
const X_OFFSET = 80;     // Horizontal amplitude from center
const VIEWBOX_WIDTH = 320;
const CENTER_X = VIEWBOX_WIDTH / 2;
const TOP_PADDING = 60;  // Padding for the first node

interface StreakRoadmapViewProps {
    habits: Habit[];
    onClose: () => void;
}

// --- COMPONENTS ---

const HeaderStat = ({ label, value, colorClass = "text-white" }: { label: string, value: string, colorClass?: string }) => (
    <div className="flex flex-col items-center justify-center p-4">
        <span className="text-xs font-medium text-gray-400 tracking-wider mb-1">{label}</span>
        <span className={cn("text-2xl font-bold font-mono", colorClass)}>{value}</span>
    </div>
);

export const StreakRoadmapView: React.FC<StreakRoadmapViewProps> = ({ habits, onClose }) => {
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
            {/* Background Ambience (Fixed) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse-slow delay-700" />
                <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full bg-pink-500/10 blur-[120px] animate-pulse-slow delay-1000" />
            </div>

            {/* --- HEADER --- */}
                <div className="flex-none z-20 bg-[#020204]/15 backdrop-blur-sm border-b border-white/5">
                    <div className="flex items-center justify-between px-4 py-4">
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors active:scale-95"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-300" />
                        </button>
                        
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">El Camino</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-white">Día {currentStreak}</span>
                                <span className="text-sm text-gray-500 font-medium">/ {TOTAL_DAYS}</span>
                            </div>
                        </div>

                        <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                            <Flame className="w-6 h-6 text-amber-500 fill-amber-500/50 animate-pulse-slow" />
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 divide-x divide-white/5 border-t border-white/5">
                        <HeaderStat label="META DIARIA" value="50%" />
                        <HeaderStat label="PROGRESO HOY" value={`${todayProgress}%`} colorClass={todayProgress >= 100 ? "text-emerald-400" : "text-cyan-400"} />
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT --- */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto relative scrollbar-hide"
                    style={{ perspective: '1000px' }}
                >


                    <div className="relative min-h-[2000px] w-full flex justify-center pb-20 pt-10">
                        {/* SVG PATH LAYER */}
                        <svg 
                            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
                            preserveAspectRatio="xMidYMin meet"
                            viewBox={`0 0 ${VIEWBOX_WIDTH} ${roadmapData.length * NODE_HEIGHT + 200}`}
                        >
                            <defs>
                                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" /> {/* emerald-500 */}
                                    <stop offset="50%" stopColor="#06b6d4" /> {/* cyan-500 */}
                                    <stop offset="100%" stopColor="#3b82f6" /> {/* blue-500 */}
                                </linearGradient>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            
                            {/* Background Track */}
                            <path 
                                d={pathD} 
                                fill="none" 
                                stroke="rgba(255,255,255,0.05)" 
                                strokeWidth="4" 
                                strokeLinecap="round"
                            />

                            {/* Active Progress Path (Simulated - masking could be better but this works for demo) */}
                            {/* For now, just color the whole path or up to current index? 
                                Implementing partial path progress is complex without pathLength.
                                Let's just use a gradient that fades out at the bottom or simulate segments.
                            */}
                             <path 
                                d={pathD} 
                                fill="none" 
                                stroke="url(#pathGradient)" 
                                strokeWidth="4" 
                                strokeLinecap="round"
                                strokeDasharray="10 10"
                                className="opacity-30"
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
    const isCurrent = node.status === 'current';
    const isLocked = node.status === 'locked';

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
                className="relative group"
            >
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                
                {/* Main Pill */}
                <div className="relative flex items-center gap-3 pl-2 pr-6 py-3 bg-[#0a0a0a] border border-emerald-500/30 rounded-full shadow-xl shadow-emerald-900/20 backdrop-blur-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/50 text-emerald-400">
                        {progress >= 100 ? (
                            <CheckCircle2 className="w-6 h-6" />
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {/* Circular Progress could go here */}
                                <Circle className="w-6 h-6 animate-pulse" />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                            HOY
                        </span>
                        <span className={cn(
                            "text-sm font-bold",
                            progress >= 100 ? "text-emerald-400" : "text-white"
                        )}>
                            {progress >= 100 ? "Completado" : "En Progreso"}
                        </span>
                    </div>

                    {/* Right Dot Indicator */}
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </div>
            </motion.div>
        );
    }

    if (isLocked) {
        return (
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={variants}
                className="relative flex items-center gap-3 pl-3 pr-5 py-2.5 bg-white/5 border border-white/5 rounded-full backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity"
            >
                {/* Number Circle */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono font-bold text-sm">
                    {node.day}
                </div>

                <div className="flex flex-col min-w-[80px]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {node.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-gray-600" />
                        <span className="text-xs font-medium text-gray-400">50%</span>
                    </div>
                </div>

                {/* Connector Dot */}
                <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/20 bg-[#020204]",
                    node.side === 'left' ? "-right-1" : "-left-1"
                )} />
            </motion.div>
        );
    }

    // COMPLETED / PAST
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={variants}
            className="w-12 h-12 rounded-full bg-gray-800/50 border border-white/10 flex items-center justify-center backdrop-blur-sm grayscale opacity-50"
        >
            <CheckCircle2 className="w-5 h-5 text-gray-500" />
        </motion.div>
    );
};
