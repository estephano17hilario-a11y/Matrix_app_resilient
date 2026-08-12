import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { 
    ArrowLeft, 
    Flame, 
    CheckCircle2, 
    Trophy,
    Circle
} from 'lucide-react';
import { addDays } from 'date-fns';
import { Habit } from '../../types';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

// --- CONFIGURATION ---
const TOTAL_DAYS = 80;
const NODE_HEIGHT = 140; // Vertical distance between nodes
const X_OFFSET = 80;     // Horizontal amplitude from center
const VIEWBOX_WIDTH = 320;
const CENTER_X = VIEWBOX_WIDTH / 2;
const TOP_PADDING = 60;  // Padding for the first node

export const getTargetPercentage = (day: number) => {
    if (day <= 6) return 40;
    if (day <= 13) return 50;
    if (day <= 29) return 60;
    if (day <= 49) return 72;
    if (day <= 79) return 80;
    return 85;
};

export const getNextLevelPercentage = (day: number) => {
    if (day <= 6) return 50;
    if (day <= 13) return 60;
    if (day <= 29) return 72;
    if (day <= 49) return 80;
    if (day <= 79) return 85;
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
    const [showRecordsModal, setShowRecordsModal] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // --- LOGIC: Calculate Streak & Progress ---
    const { currentStreak, todayProgress, roadmapData, completedDays } = useMemo(() => {
        const activeHabits = habits.filter(h => !h.archived);
        
        // 1. Calculate Today's Progress
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Helper to normalize a history date string to YYYY-MM-DD (local timezone)
        const normalizeDate = (d: string): string => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
            const parsed = new Date(d);
            if (!isNaN(parsed.getTime())) {
                const off = parsed.getTimezoneOffset();
                const local = new Date(parsed.getTime() - off * 60000);
                return local.toISOString().split('T')[0];
            }
            return d.split('T')[0];
        };

        // Local ISO string for a date
        const toLocalStr = (date: Date): string => {
            const off = date.getTimezoneOffset();
            const local = new Date(date.getTime() - off * 60000);
            return local.toISOString().split('T')[0];
        };

        // Build a map of completions per date
        const completionByDate = new Map<string, number>();
        activeHabits.forEach(h => {
            h.history?.forEach(hDate => {
                const normalized = normalizeDate(hDate);
                completionByDate.set(normalized, (completionByDate.get(normalized) || 0) + 1);
            });
        });

        // Get habits due on a specific day (simplified: DAILY + WEEKLY on that day)
        const getDailyTotal = (date: Date): number => {
            const dayOfWeek = date.getDay();
            return activeHabits.filter(h => {
                if (h.archived) return false;
                if (h.frequency === 'DAILY') return true;
                if (h.frequency === 'WEEKLY') {
                    if (!h.frequencyDays?.length) return true;
                    return h.frequencyDays.includes(dayOfWeek);
                }
                return false;
            }).length;
        };

        // 2. Calculate the real current streak (backwards from yesterday, then check today)
        let realStreak = 0;
        const todayDateCopy = new Date(today);
        
        // Check up to 365 days back
        for (let i = 365; i >= 1; i--) {
            const d = new Date(todayDateCopy);
            d.setDate(d.getDate() - i);
            const dateStr = toLocalStr(d);
            const dailyTotal = getDailyTotal(d);
            
            if (dailyTotal > 0) {
                const count = completionByDate.get(dateStr) || 0;
                const percent = Math.round((count / dailyTotal) * 100);
                const reqPercent = getTargetPercentage(realStreak + 1);
                if (percent >= reqPercent) {
                    realStreak++;
                } else {
                    realStreak = 0;
                }
            }
            // If dailyTotal=0 (rest day), skip without breaking streak
        }

        // Check today
        const todayStr = toLocalStr(new Date());
        const todayDailyTotal = getDailyTotal(today);
        let completedTodayCount = 0;
        let totalDueToday = todayDailyTotal;

        activeHabits.forEach(h => {
            const isDue = h.frequency === 'DAILY' || (h.frequency === 'WEEKLY' && (!h.frequencyDays?.length || h.frequencyDays.includes(today.getDay())));
            if (isDue) {
                const isCompleted = h.completedToday || (h.history && h.history.some(d => normalizeDate(d) === todayStr));
                if (isCompleted) completedTodayCount++;
            }
        });

        const progressPercent = totalDueToday > 0 ? Math.round((completedTodayCount / totalDueToday) * 100) : 0;
        const todayProgress = progressPercent;

        // Include today in streak if done
        const todayReqPercent = getTargetPercentage(realStreak + 1);
        if (todayDailyTotal > 0 && progressPercent >= todayReqPercent) {
            realStreak++;
        }

        const streak = Math.max(1, realStreak); // Minimum 1 so the user always sees Day 1
        const completedDays = streak > 0 ? streak - 1 : 0;

        // 3. Generate Roadmap Nodes
        const nodes = Array.from({ length: TOTAL_DAYS }, (_, i) => {
            const dayNum = i + 1;
            const date = addDays(today, i - (streak - 1)); // Offset so Day `streak` = today
            const isTodayNode = dayNum === streak;
            const isPast = dayNum < streak;
            const isCompleted = isPast;
            
            let status: 'completed' | 'current' | 'locked' = 'locked';
            if (isPast) status = 'completed';
            if (isTodayNode) status = 'current';
            
            let label = `DÍA ${dayNum}`;
            if (isTodayNode) label = 'HOY';
            else if (dayNum === streak + 1) label = 'MAÑANA';
            else if (dayNum === streak + 2) label = 'EN 2 DÍAS';
            else if (dayNum === streak + 3) label = 'EN 3 DÍAS';
            else if (dayNum === streak + 4) label = 'EN 4 DÍAS';
            else if (dayNum > streak) label = `EN ${dayNum - streak} DÍAS`;
            else label = `DÍA ${dayNum}`;

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

    const targetPercentage = getTargetPercentage(currentStreak);
    const isTodayCompleted = todayProgress >= targetPercentage;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, pointerEvents: "auto" }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            className="fixed inset-0 z-50 bg-[#020204] text-white flex flex-col h-full w-full overflow-hidden font-sans"
        >
            {/* Background Ambience (Optimized for Performance) */}
            <div className={cn("absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-200", isTodayCompleted ? "bg-[#040812]" : "bg-[#020204]")}>
                <div 
                    className={cn("absolute inset-0 transition-opacity duration-200", isTodayCompleted ? "opacity-100" : "opacity-40")}
                    style={{
                        background: isTodayCompleted ? `
                            radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15) 0%, transparent 70%),
                            radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.15) 0%, transparent 70%),
                            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 80%)
                        ` : `
                            radial-gradient(circle at 50% 0%, #1e1b4b 0%, transparent 70%),
                            radial-gradient(circle at 50% 100%, #172554 0%, transparent 70%)
                        `
                    }}
                />
            </div>

            {/* --- HEADER --- */}
                <div className="flex-none z-20 pt-safe relative">
                    {/* Header Ambient Glow (Truly Integrated) */}
                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                    
                    <div className="relative flex items-center justify-between px-4 py-4">
                        <button 
                            onClick={onClose}
                            className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all active:scale-95"
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

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowRecordsModal((prev: boolean) => !prev)}
                                className={`p-2.5 rounded-2xl border transition-all duration-200 ${
                                    showRecordsModal 
                                        ? "bg-amber-500/30 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                                        : "bg-white/5 border-white/10 text-amber-400 hover:bg-white/10"
                                }`}
                                title="Ver récords de racha"
                            >
                                <Trophy className="w-5 h-5 text-amber-400" />
                            </button>

                            <div className={cn("p-2.5 rounded-2xl border transition-all duration-200", isTodayCompleted ? "bg-amber-500/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "bg-white/5 border-white/10")}>
                                <Flame className={cn("w-6 h-6 transition-all duration-200", isTodayCompleted ? "text-amber-400 fill-amber-400/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] scale-110" : "text-white/20 fill-transparent scale-100")} />
                            </div>
                        </div>
                    </div>

                    {/* Records Modal Overlay inside El Camino de la Llama */}
                    {showRecordsModal && (
                        <div className="px-4 pb-3">
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="bg-[#0f0f18] border border-amber-500/30 rounded-2xl p-4 shadow-2xl space-y-3"
                            >
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <Trophy size={16} />
                                        <span className="text-xs font-black uppercase tracking-wider">Mis Récords de Racha</span>
                                    </div>
                                    <button onClick={() => setShowRecordsModal(false)} className="text-white/40 hover:text-white">
                                        ✕
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col">
                                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Racha Más Larga</span>
                                        <span className="text-2xl font-black text-amber-400 font-mono mt-1">
                                            {Math.max(currentStreak, (habits[0] as any)?.longestStreak || currentStreak)} <span className="text-xs font-bold text-white/50">días</span>
                                        </span>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col">
                                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Última Racha</span>
                                        <span className="text-2xl font-black text-orange-400 font-mono mt-1">
                                            {currentStreak} <span className="text-xs font-bold text-white/50">días</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="text-[10px] text-white/50 font-mono pt-1 flex justify-between">
                                    <span>📅 Fecha de Última Actividad:</span>
                                    <span className="text-white font-bold">{new Date().toLocaleDateString('es-ES')}</span>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Stats Row (No more black boxes - Pure transparency) */}
                    <div className="relative grid grid-cols-2 divide-x divide-white/5 border-y border-white/5">
                        <HeaderStat label={t('dashboard.dailyGoal', 'DAILY GOAL')} value={`${targetPercentage}%`} />
                        <HeaderStat label={t('dashboard.todayProgress', 'TODAY PROGRESS')} value={`${todayProgress}%`} colorClass={isTodayCompleted ? "text-orange-400" : "text-cyan-400"} />
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT --- */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto relative scrollbar-hide"
                    style={{ perspective: '1000px' }}
                >
                    <div className="relative w-full flex justify-center pb-24 pt-10" style={{ minHeight: `${roadmapData.length * NODE_HEIGHT + 200}px` }}>
                        {/* SVG PATH LAYER */}
                        <svg 
                            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
                            preserveAspectRatio="xMidYMin meet"
                            viewBox={`0 0 ${VIEWBOX_WIDTH} ${roadmapData.length * NODE_HEIGHT + 200}`}
                        >
                            <defs>
                                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#f59e0b" />
                                    <stop offset="50%" stopColor="#f97316" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                            
                            {/* Background Track - Dim */}
                            <path 
                                d={pathD} 
                                fill="none" 
                                stroke="rgba(255,255,255,0.05)" 
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
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                />
                            )}

                            {/* Milestone Markers on Path */}
                            {[7, 14, 30, 50, 80].map(milestone => {
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
    const { t } = useTranslation();
    const isCurrent = node.status === 'current';
    const isLocked = node.status === 'locked';
    const isCompleted = node.status === 'completed';
    const isMilestone = [7, 14, 30, 50, 80].includes(node.day);
    const targetPercentage = getTargetPercentage(node.day);
    const _nextLevelPercentage = getNextLevelPercentage(node.day);

    const variants: Variants = {
        hidden: { scale: 0.8, opacity: 0 },
        visible: { 
            scale: 1, 
            opacity: 1,
            transition: { type: 'spring', stiffness: 450, damping: 22 } 
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
                        className="absolute -inset-1 rounded-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-200"
                        style={{ boxShadow: '0 0 15px rgba(249,115,22,0.25)' }}
                    />
                    <div className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/40 shadow-lg">
                        <CheckCircle2 className="w-7 h-7 text-orange-400" />
                        <span className="text-[8px] font-black text-orange-400/80 uppercase tracking-wider mt-0.5">{t('common.ok', 'OK')}</span>
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
                    className="absolute -inset-1 rounded-xl opacity-30 group-hover:opacity-50 transition-opacity duration-200"
                    style={{ boxShadow: '0 0 10px rgba(249,115,22,0.2)' }}
                />
                <div className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 border border-orange-500/30">
                    <CheckCircle2 className="w-5 h-5 text-orange-400" />
                </div>
            </motion.div>
        );
    }

    if (isCurrent) {
        const isAchieved = progress >= targetPercentage;

        return (
            <motion.div
                initial="hidden"
                animate="visible"
                variants={variants}
                className={cn("relative group z-30", isMilestone ? "scale-110" : "")}
            >
                <div 
                    className="absolute -inset-1 rounded-full opacity-70 group-hover:opacity-90 transition-opacity duration-200"
                    style={{ 
                        boxShadow: isAchieved 
                            ? '0 0 25px rgba(16,185,129,0.4)' 
                            : '0 0 15px rgba(var(--color-avatar-accent), 0.15)'
                    }}
                />
                
                <div className={cn(
                    "relative flex items-center gap-3 pl-2 pr-5 py-2.5 bg-[#0f0f0f] border rounded-[1.8rem] shadow-lg transition-colors duration-200",
                    isAchieved ? "border-emerald-500/60" : "border-transparent"
                )}>
                    <div className={cn(
                        "flex items-center justify-center w-11 h-11 rounded-xl border",
                        isAchieved ? "bg-emerald-500/20 border-emerald-500/50" : "border-transparent"
                    )}
                    style={!isAchieved ? { backgroundColor: 'rgba(var(--color-avatar-accent), 0.05)' } : {}}
                    >
                        {isAchieved ? (
                            <CheckCircle2 className={cn("w-6 h-6", "text-emerald-400")} />
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <Circle className="w-6 h-6 opacity-60" style={{ color: 'rgb(var(--color-avatar-accent))' }} />
                                <div className="absolute inset-0 rounded-lg opacity-10" style={{ backgroundColor: 'rgb(var(--color-avatar-accent))' }} />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-[0.15em] mb-0.5",
                            isAchieved ? "text-emerald-400" : "opacity-80"
                        )}
                        style={!isAchieved ? { color: 'rgb(var(--color-avatar-accent))' } : {}}
                        >
                            {isMilestone ? "HOY - NUEVO NIVEL" : "HOY"}
                        </span>
                        <span className={cn(
                            "text-sm font-black tracking-tight",
                            isAchieved ? "text-emerald-400" : "text-white/90"
                        )}>
                            {isAchieved ? "Completado" : `${targetPercentage}% Requerido`}
                        </span>
                    </div>

                    <div className={cn(
                        "absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[2px] border-[#020204]",
                        isAchieved ? "bg-emerald-500" : "opacity-80"
                    )}
                    style={!isAchieved ? { backgroundColor: 'rgb(var(--color-avatar-accent))' } : {}}
                    />
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
                    className="relative flex items-center gap-3 p-3 bg-[#0a0805] border border-amber-500/30 rounded-2xl shadow-lg transition-transform duration-200 hover:scale-[1.02] z-20"
                >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#1a1205] border border-amber-500/40 text-amber-300 font-black text-lg">
                        <span className="text-[8px] uppercase tracking-widest opacity-70 mb-[-2px]">{t('common.day', 'Día')}</span>
                        {node.day}
                    </div>

                    <div className="flex flex-col min-w-[90px]">
                        <span className="text-[10px] font-black text-amber-400/70 uppercase tracking-[0.15em] mb-0.5">
                            {t('dashboard.newLevel', 'NUEVO NIVEL')}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <span className="text-base font-black text-amber-400 tracking-tight">{targetPercentage}%</span>
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
                className="relative flex items-center gap-3 pl-2.5 pr-5 py-2 bg-[#080808] border border-white/[0.06] rounded-xl opacity-60 hover:opacity-80 transition-opacity duration-200"
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
