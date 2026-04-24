import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Skull, Archive, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isSameDay, isLastDayOfMonth } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { Habit, Attribute, BadHabit } from '../../types';
import { RelapseChart } from './components/RelapseChart';
import { BadHabitItem } from './components/BadHabitItem';
import * as LucideIcons from 'lucide-react';
import { Check } from 'lucide-react';
import { HabitItem } from './components/HabitItem';
import { QuantityUpdateModal } from './components/QuantityUpdateModal';
import { HabitConsistencyChart } from './components/HabitConsistencyChart';
import { ViewMode } from './components/HabitViewHeader';
import { DateSelectionModal } from './components/DateSelectionModal';
import { ReorderModal } from '../../components/ui/ReorderModal';
import { useLongPress } from '../../hooks/useLongPress';
import { BadHabitDetailModal } from './components/BadHabitDetailModal';
import { HabitMasteryModal } from './components/HabitMasteryModal';
import { cn } from '../../utils/cn';

interface HabitVisualViewProps {
    habits: Habit[];
    badHabits: BadHabit[];
    attributes: Attribute[];
    onCompleteHabit: (e: React.MouseEvent, h: Habit) => void;
    onToggleHabitDay?: (habitId: string, date: string) => void;
    onCreateHabit: () => void;
    onCreateBadHabit: () => void;
    onDeleteHabit?: (habitId: string) => void;
    onEditHabit?: (habit: Habit & { _initialTab?: 'alarm' | 'checklist', _targetSubtaskId?: string }) => void;
    onUpdateHabit?: (habitId: string, data: Partial<Habit>) => void;
    onRelapseBadHabit: (habit: BadHabit) => void;
    onShowActions?: (habit: Habit) => void;
    onShowBadHabitActions?: (habit: BadHabit) => void;
    isActive?: boolean;
    currentSection?: 'PROTOCOLS' | 'VICES';
    onOpenStreak?: () => void;
    onReorder?: (habits: Habit[]) => void;
    onReorderBadHabits?: (habits: BadHabit[]) => void;
    isPro?: boolean;
    onOpenPro?: () => void;
    defaultViewPreference?: 'DEFAULT' | 'CHRONOLOGICAL';
    weekStartDay?: 0 | 1;
    defaultChartViews?: any;
}

interface BadHabitWrapperProps {
    habit: BadHabit;
    attributeMap: Map<string, Attribute>;
    onShowBadHabitActions?: (habit: BadHabit) => void;
    onOpenDetail?: (habit: BadHabit) => void;
    onRelapseBadHabit: (habit: BadHabit) => void;
    onReorderRequest?: () => void;
}

const BadHabitWrapper: React.FC<BadHabitWrapperProps> = ({
    habit,
    attributeMap,
    onShowBadHabitActions,
    onOpenDetail,
    onRelapseBadHabit,
    onReorderRequest
}) => {
    const badHabitLongPress = useLongPress(() => {
        if (onReorderRequest) {
            if (navigator.vibrate) navigator.vibrate(50);
            onReorderRequest();
        }
    }, { threshold: 600 });

    return (
        <div className="w-full max-w-[600px] pr-3">
            <div 
                role="button"
                tabIndex={0}
                className="w-full touch-manipulation cursor-pointer active:scale-95 transition-transform duration-75 clickable" 
                {...badHabitLongPress}
                onContextMenu={(e) => {
                    e.preventDefault();
                    if (onReorderRequest) {
                        onReorderRequest();
                    }
                }}
                onClick={() => {
                    if (onOpenDetail) onOpenDetail(habit);
                }}
            >
                <BadHabitItem
                    habit={habit}
                    attribute={attributeMap.get(habit.attribute)}
                    onRelapse={onRelapseBadHabit}
                    onShowActions={onShowBadHabitActions}
                />
            </div>
        </div>
    );
};

export const HabitVisualView: React.FC<HabitVisualViewProps> = React.memo(({ 
    habits, 
    badHabits,
    attributes, 
    onCompleteHabit,
    onCreateHabit,
    onCreateBadHabit,
    onEditHabit,
    onUpdateHabit,
    onRelapseBadHabit,
    onShowActions,
    onShowBadHabitActions,
    isActive = true,
    currentSection,
    onOpenStreak,
    onReorder,
    onReorderBadHabits,
    isPro,
    onOpenPro,
    defaultViewPreference = 'DEFAULT',
    weekStartDay = 1,
    defaultChartViews
}) => {
    const { t } = useTranslation();
    const { setVicesMode } = useTheme();
    const [section, setSection] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');
    const [showArchived, setShowArchived] = useState(false);
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [isBadHabitReorderModalOpen, setIsBadHabitReorderModalOpen] = useState(false);
    const [selectedDetailBadHabit, setSelectedDetailBadHabit] = useState<BadHabit | null>(null);
    const [quantityModalHabit, setQuantityModalHabit] = useState<Habit | null>(null);
    const [masteryHabit, setMasteryHabit] = useState<Habit | null>(null);
    
    // Header State
    const [viewMode] = useState<ViewMode>('DAY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [viewPreference, setViewPreference] = useState<'DEFAULT' | 'CHRONOLOGICAL'>(() => {
        const saved = localStorage.getItem('habitViewPreference');
        return (saved === 'CHRONOLOGICAL' || saved === 'DEFAULT') ? saved : (defaultViewPreference || 'DEFAULT');
    });
    const [hideCompletedChronological, setHideCompletedChronological] = useState(() => {
        const saved = localStorage.getItem('hideCompletedChronological');
        return saved === 'true';
    });

    useEffect(() => {
        if (defaultViewPreference && defaultViewPreference !== viewPreference && isActive) {
            setViewPreference(defaultViewPreference);
        }
    }, [defaultViewPreference]);

    useEffect(() => {
        localStorage.setItem('habitViewPreference', viewPreference);
    }, [viewPreference]);

    useEffect(() => {
        localStorage.setItem('hideCompletedChronological', hideCompletedChronological.toString());
    }, [hideCompletedChronological]);

    // Split habits into active and archived
    const { activeHabits, archivedHabits } = useMemo(() => {
        return {
            activeHabits: habits.filter(h => !h.archived),
            archivedHabits: habits.filter(h => h.archived)
        };
    }, [habits]);

    const { activeBadHabits, archivedBadHabits } = useMemo(() => {
        return {
            activeBadHabits: badHabits.filter(h => !h.archived).sort((a, b) => (a.order || 0) - (b.order || 0)),
            archivedBadHabits: badHabits.filter(h => h.archived).sort((a, b) => (a.order || 0) - (b.order || 0))
        };
    }, [badHabits]);

    const attributeMap = useMemo(() => new Map(attributes.map(attr => [attr.id, attr])), [attributes]);

    const displayedHabits = useMemo(() => {
        const list = showArchived ? archivedHabits : activeHabits;
        
        let sortedList = [...list];

        if (viewPreference === 'CHRONOLOGICAL') {
            const todayIndex = currentDate.getDay();
            sortedList.sort((a, b) => {
                const getEarliestTime = (habit: Habit) => {
                    let earliest = habit.reminderTime || '23:59';
                    if (habit.type === 'CHECKLIST' && habit.checklist) {
                        habit.checklist.forEach(item => {
                            const isSubtaskActiveToday = !item.days || item.days.length === 0 || item.days.includes(todayIndex);
                            if (isSubtaskActiveToday && item.reminderTime && item.reminderTime < earliest) {
                                earliest = item.reminderTime;
                            }
                        });
                    }
                    if (habit.type === 'QUANTITY' && habit.isDivided) {
                        if (habit.dividedMode === 'FIXED' && habit.dividedTimes && habit.dividedTimes.length > 0) {
                            const times = [...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time));
                            
                            // Find the first uncompleted time slot based on current value
                            let accumulated = 0;
                            let nextFixedTime: string | null = null;
                            for (const t of times) {
                                accumulated += t.amount;
                                if ((habit.currentValue || 0) < accumulated) {
                                    nextFixedTime = t.time;
                                    break;
                                }
                            }
                            
                            if (nextFixedTime && nextFixedTime < earliest) {
                                earliest = nextFixedTime;
                            }
                        } else if (habit.nextInstanceTime) {
                            const nextDate = new Date(habit.nextInstanceTime);
                            if (nextDate.getDate() === currentDate.getDate() && nextDate.getMonth() === currentDate.getMonth()) {
                                const hours = nextDate.getHours().toString().padStart(2, '0');
                                const minutes = nextDate.getMinutes().toString().padStart(2, '0');
                                const formattedTime = `${hours}:${minutes}`;
                                if (formattedTime < earliest) {
                                    earliest = formattedTime;
                                }
                            }
                        }
                    }
                    return earliest;
                };
                const timeA = getEarliestTime(a);
                const timeB = getEarliestTime(b);
                
                const parseTime = (timeStr: string) => {
                    if (!timeStr) return 24 * 60;
                    const parts = timeStr.split(':');
                    const hours = parseInt(parts[0], 10) || 0;
                    const minutes = parseInt(parts[1], 10) || 0;
                    return hours * 60 + minutes;
                };

                return parseTime(timeA) - parseTime(timeB);
            });
        } else {
            // Sort by order first
            sortedList.sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        // Date Logic Override
        return sortedList.map(habit => {
            const isCompleted = isSameDay(currentDate, new Date()) 
                ? habit.completedToday 
                : habit.history?.some(d => isSameDay(new Date(d), currentDate)) ?? false;
            
            return {
                ...habit,
                completedToday: isCompleted
            };
        });
    }, [showArchived, archivedHabits, activeHabits, currentDate, viewPreference]);

    const chronologicalItems = useMemo(() => {
        if (viewPreference !== 'CHRONOLOGICAL') return [];
        
        const items: any[] = [];
        const todayIndex = currentDate.getDay();

        displayedHabits.forEach(habit => {
            const isDue = habit.frequency === 'DAILY' || 
                (habit.frequency === 'WEEKLY' && 
                (!habit.frequencyDays || habit.frequencyDays.length === 0 || habit.frequencyDays.includes(todayIndex))) ||
                (habit.frequency === 'MONTHLY' && (
                    habit.monthlyType === 'FLEXIBLE_COUNT' ||
                    ((habit.monthlyType === 'SPECIFIC_DATES' || !habit.monthlyType) && (
                        (habit.frequencyDays && habit.frequencyDays.includes(currentDate.getDate())) ||
                        (habit.monthlyLastDay && isLastDayOfMonth(currentDate))
                    ))
                ));

            if (!isDue) return;

            const attribute = attributeMap.get(habit.attribute);
            const baseColor = habit.customColor || attribute?.color || '#6366f1';
            let Icon = attribute?.icon;
            if (habit.iconName && (LucideIcons as any)[habit.iconName]) {
                Icon = (LucideIcons as any)[habit.iconName];
            }

            if (habit.type === 'CHECKLIST' && habit.checklist && habit.checklist.length > 0) {
                habit.checklist.forEach(sub => {
                    const isSubtaskActiveToday = !sub.days || sub.days.length === 0 || sub.days.includes(todayIndex);
                    if (isSubtaskActiveToday) {
                        items.push({
                            id: `${habit.id}-sub-${sub.id}`,
                            habitId: habit.id,
                            type: 'SUBTASK',
                            habit: habit,
                            subtaskId: sub.id,
                            text: sub.text,
                            time: sub.reminderTime || habit.reminderTime || '23:59',
                            isCompleted: sub.completed,
                            color: sub.color || baseColor,
                            Icon: Icon
                        });
                    }
                });
            } else if (habit.type === 'QUANTITY' && habit.isDivided && habit.dividedMode === 'FIXED' && habit.dividedTimes && habit.dividedTimes.length > 0) {
                const times = [...habit.dividedTimes].sort((a, b) => a.time.localeCompare(b.time));
                
                let accumulated = 0;
                times.forEach((t, index) => {
                    const isCompleted = (habit.currentValue || 0) >= accumulated + t.amount || habit.completedToday;
                    items.push({
                        id: `${habit.id}-time-${index}`,
                        habitId: habit.id,
                        type: 'HABIT',
                        habit: habit,
                        text: habit.title,
                        subText: `${t.amount} ${habit.unit || ''}`.trim(),
                        time: t.time,
                        isCompleted: isCompleted,
                        color: baseColor,
                        Icon: Icon
                    });
                    accumulated += t.amount;
                });
            } else {
                let displayTime = habit.reminderTime || '23:59';
                let displayText = habit.title;
                let displaySubText = undefined;
                
                if (habit.type === 'QUANTITY' && habit.isDivided) {
                    const amount = habit.dividedQuantity || 1;
                    displaySubText = `${amount} ${habit.unit || ''}`.trim();
                    
                    if (habit.nextInstanceTime) {
                        const nextDate = new Date(habit.nextInstanceTime);
                        if (nextDate.getDate() === currentDate.getDate() && nextDate.getMonth() === currentDate.getMonth()) {
                            const hours = nextDate.getHours().toString().padStart(2, '0');
                            const minutes = nextDate.getMinutes().toString().padStart(2, '0');
                            displayTime = `${hours}:${minutes}`;
                        }
                    }
                }

                items.push({
                    id: habit.id,
                    habitId: habit.id,
                    type: 'HABIT',
                    habit: habit,
                    text: displayText,
                    subText: displaySubText,
                    time: displayTime,
                    isCompleted: habit.completedToday,
                    color: baseColor,
                    Icon: Icon
                });
            }
        });

        let sortedItems = items.sort((a, b) => {
            const parseTime = (timeStr: string) => {
                if (!timeStr) return 24 * 60;
                const parts = timeStr.split(':');
                const hours = parseInt(parts[0], 10) || 0;
                const minutes = parseInt(parts[1], 10) || 0;
                return hours * 60 + minutes;
            };
            return parseTime(a.time) - parseTime(b.time);
        });
        if (hideCompletedChronological) {
            sortedItems = sortedItems.filter(item => !item.isCompleted);
        }
        return sortedItems;
    }, [displayedHabits, currentDate, viewPreference, attributeMap, hideCompletedChronological]);

    const reduceMotion = useMemo(() => {
        return displayedHabits.length + badHabits.length > 20;
    }, [displayedHabits.length, badHabits.length]);

    // Sync section with external prop
    useEffect(() => {
        if (currentSection) {
            setSection(currentSection);
        }
    }, [currentSection]);

    // Reset archived view when switching sections
    useEffect(() => {
        setShowArchived(false);
    }, [section]);

    // Sync Vices Mode with visibility and section
    useEffect(() => {
        if (!isActive) {
            setVicesMode(false);
        } else {
            setVicesMode(section === 'VICES');
        }
    }, [isActive, section, setVicesMode]);

    // Ensure we reset the background when leaving this component entirely (unmount)
    useEffect(() => {
        return () => setVicesMode(false);
    }, []);

    const container = useMemo(() => ({
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: reduceMotion ? 0 : 0.05
            }
        }
    }), [reduceMotion]);

    // Long Press Handler
    const longPressHandlers = useLongPress(() => {
        if (!showArchived && onReorder && viewPreference === 'DEFAULT') {
            // Trigger vibration if available
            if (navigator.vibrate) navigator.vibrate(50);
            setIsReorderModalOpen(true);
        }
    }, { threshold: 600 });

    return (
        <motion.div 
            initial="hidden"
            animate="show"
            variants={container}
            className="min-h-[calc(100vh-200px)] pb-24"
        >
            <DateSelectionModal 
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={setCurrentDate}
                mode={viewMode === 'WEEK' ? 'WEEK' : viewMode === 'MONTH' ? 'MONTH' : 'DAY'} // Adapt mode
                currentDate={currentDate}
            />

            {/* Header Section REMOVED as per user request */}

            {/* Content */}
            <div className="grid grid-cols-1 gap-3 relative">
                {section === 'PROTOCOLS' ? (
                    <div
                        key={showArchived ? "archived" : "protocols"}
                        className="w-full flex flex-col items-center gap-3 relative px-4 sm:px-6 animate-fade-in-fast"
                    >
                            {/* Habit Consistency Chart (Moved inside to prevent layout shifts during exit animation) */}
                            {!showArchived && (
                                <div className="w-full max-w-[440px] pt-0">
                                    <HabitConsistencyChart 
                                        habits={habits} 
                                        onOpenStreak={onOpenStreak} 
                                        isActive={isActive} 
                                        isPro={isPro}
                                        onOpenPro={onOpenPro}
                                        weekStartDay={weekStartDay}
                                        initialTimeframe={defaultChartViews?.habits}
                                    />
                                    
                                    {/* View Switcher and Controls */}
                                    <div className="flex items-center justify-center gap-2 mt-1 -mb-1.5 mx-auto w-full max-w-[260px]">
                                        <div className="flex relative bg-[#111112] border border-white/5 rounded-xl p-0.5 flex-1">
                                            <button
                                                onClick={() => setViewPreference('DEFAULT')}
                                                className={cn(
                                                    "relative flex-1 z-10 px-2.5 py-1 rounded-[10px] text-[9px] font-bold uppercase tracking-wider transition-colors duration-200",
                                                    viewPreference === 'DEFAULT' 
                                                        ? "text-white" 
                                                        : "text-white/40 hover:text-white/60"
                                                )}
                                            >
                                                {viewPreference === 'DEFAULT' && (
                                                    <motion.div
                                                        layoutId="view-toggle"
                                                        className="absolute inset-0 bg-white/[0.03] rounded-[10px]"
                                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                    />
                                                )}
                                                <span className="relative z-20">{t('habits.viewPriority', 'Prioridad')}</span>
                                            </button>
                                            <button
                                                onClick={() => setViewPreference('CHRONOLOGICAL')}
                                                className={cn(
                                                    "relative flex-1 z-10 px-2.5 py-1 rounded-[10px] text-[9px] font-bold uppercase tracking-wider transition-colors duration-200",
                                                    viewPreference === 'CHRONOLOGICAL' 
                                                        ? "text-indigo-400" 
                                                        : "text-white/40 hover:text-white/60"
                                                )}
                                            >
                                                {viewPreference === 'CHRONOLOGICAL' && (
                                                    <motion.div
                                                        layoutId="view-toggle"
                                                        className="absolute inset-0 bg-indigo-500/5 rounded-[10px]"
                                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                    />
                                                )}
                                                <span className="relative z-20">{t('habits.viewChronological', 'Cronológico')}</span>
                                            </button>
                                        </div>
                                        
                                        {viewPreference === 'CHRONOLOGICAL' && (
                                            <button
                                                onClick={() => setHideCompletedChronological(!hideCompletedChronological)}
                                                className={cn(
                                                    "p-2 rounded-xl border transition-colors duration-200 flex items-center justify-center shrink-0",
                                                    hideCompletedChronological 
                                                        ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" 
                                                        : "bg-[#111112] border-white/5 text-white/40 hover:text-white/60"
                                                )}
                                                title={hideCompletedChronological ? t('habits.showCompleted', 'Mostrar completados') : t('habits.hideCompleted', 'Ocultar completados')}
                                            >
                                                {hideCompletedChronological ? <LucideIcons.EyeOff size={16} /> : <LucideIcons.Eye size={16} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Floating Mini Action for Protocols (Restored subtly) */}
                            {/* REMOVED: Create button */}

                            {/* ARCHIVED HEADER */}
                            {showArchived && (
                                <div className="flex items-center gap-2 mb-2 px-1 w-full max-w-[600px]">
                                    <button 
                                        onClick={() => setShowArchived(false)}
                                        className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-sm font-bold text-white/60 uppercase tracking-wider">
                                        Archivos ({archivedHabits.length})
                                    </span>
                                </div>
                            )}

                            {/* LIST */}
                            {viewPreference === 'CHRONOLOGICAL' && !showArchived ? (
                                chronologicalItems.map((item, idx) => (
                                    <div key={item.id} className="w-full max-w-[600px] pr-3">
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.15, delay: idx * 0.05, ease: "easeOut" }}
                                        className="w-full flex items-center gap-3 bg-[#050505]/90 border rounded-[14px] px-3.5 py-2 touch-manipulation cursor-pointer hover:bg-[#0a0a0a] transition-all relative overflow-hidden"
                                        style={{ borderColor: item.isCompleted ? 'rgba(255,255,255,0.05)' : `${item.color}42` }}
                                        onClick={() => setMasteryHabit(item.habit)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            if (onEditHabit) {
                                                const habitToEdit = {
                                                    ...item.habit,
                                                    _initialTab: item.type === 'SUBTASK' ? 'checklist' : 'alarm',
                                                    _targetSubtaskId: item.type === 'SUBTASK' ? item.subtaskId : undefined
                                                };
                                                onEditHabit(habitToEdit);
                                            }
                                        }}
                                    >
                                        {/* Color Glow */}
                                        <div 
                                            className={cn(
                                                "absolute inset-0 rounded-[14px] pointer-events-none transition-opacity",
                                                item.isCompleted ? "opacity-[0.04]" : "opacity-[0.11]"
                                            )}
                                            style={{ backgroundColor: item.color }}
                                        />

                                        <div 
                                            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-white/5 relative z-10"
                                            style={{ backgroundColor: `${item.color}15` }}
                                        >
                                            {item.Icon && <item.Icon size={18} style={{ color: item.color, opacity: 0.85 }} strokeWidth={2} />}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className={cn(
                                                    "text-[14px] font-semibold truncate transition-colors",
                                                    item.isCompleted ? "text-white/30 line-through" : "text-white/70"
                                                )}>
                                                    {item.text}
                                                </span>
                                                {item.subText && (
                                                    <span className={cn(
                                                        "text-[10px] font-medium shrink-0",
                                                        item.isCompleted ? "text-white/20" : "text-indigo-400/70"
                                                    )}>
                                                        {item.subText}
                                                    </span>
                                                )}
                                                {item.type === 'HABIT' && item.habit.type === 'QUANTITY' && !item.habit.isDivided && (
                                                    <span className={cn(
                                                        "text-[11px] font-medium shrink-0",
                                                        item.isCompleted ? "text-white/30" : "text-indigo-400/80"
                                                    )}>
                                                        {item.habit.currentValue || 0} / {item.habit.targetValue} {item.habit.unit || ''}
                                                    </span>
                                                )}
                                            </div>
                                            {item.type === 'SUBTASK' && (
                                                <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider truncate">
                                                    {item.habit.title}
                                                </span>
                                            )}
                                        </div>

                                        {item.time && item.time !== '23:59' && (
                                            <div 
                                                className="flex items-center gap-1 relative z-10 cursor-pointer hover:bg-white/5 rounded px-3 py-4 -mx-3 -my-4 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEditHabit) {
                                                        const habitToEdit = {
                                                            ...item.habit,
                                                            _initialTab: item.type === 'SUBTASK' ? 'checklist' : 'alarm',
                                                            _targetSubtaskId: item.type === 'SUBTASK' ? item.subtaskId : undefined
                                                        };
                                                        onEditHabit(habitToEdit);
                                                    }
                                                }}
                                                title="Cambiar alarma"
                                            >
                                                <LucideIcons.AlertCircle size={10} className={item.isCompleted ? "text-white/20" : "text-orange-400/80"} />
                                                <span className={cn(
                                                    "text-[10px] font-bold tracking-wider",
                                                    item.isCompleted ? "text-white/20" : "text-orange-400/80"
                                                )}>
                                                    {(() => {
                                                        const [h, m] = item.time.split(':');
                                                        const hour = parseInt(h, 10);
                                                        const ampm = hour >= 12 ? 'PM' : 'AM';
                                                        const formattedHour = hour % 12 || 12;
                                                        return `${formattedHour}:${m} ${ampm}`;
                                                    })()}
                                                </span>
                                            </div>
                                        )}

                                        <div 
                                            className={cn(
                                                "w-[38px] h-[38px] rounded-full border flex items-center justify-center transition-all relative z-10 ml-2 shrink-0 cursor-pointer",
                                                item.isCompleted 
                                                    ? "border-transparent text-white" 
                                                    : "bg-black/20"
                                            )}
                                            style={{
                                                backgroundColor: item.isCompleted ? item.color : undefined,
                                                borderColor: item.isCompleted ? item.color : `${item.color}78`
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (item.type === 'HABIT') {
                                                    if (item.habit.type === 'QUANTITY' && onUpdateHabit) {
                                                        setQuantityModalHabit(item.habit);
                                                    } else {
                                                        onCompleteHabit(e as any, item.habit);
                                                    }
                                                } else if (item.type === 'SUBTASK' && onUpdateHabit) {
                                                    const newChecklist = item.habit.checklist.map((sub: any) => 
                                                        sub.id === item.subtaskId ? { ...sub, completed: !sub.completed } : sub
                                                    );
                                                    
                                                    const todayIndex = currentDate.getDay();
                                                    const visibleItems = newChecklist.filter((i: any) => !i.days || i.days.length === 0 || i.days.includes(todayIndex));
                                                    const allCompleted = visibleItems.length > 0 && visibleItems.every((i: any) => i.completed);
                                                    
                                                    onUpdateHabit(item.habitId, { checklist: newChecklist });
                                                    
                                                    const updatedHabit = { ...item.habit, checklist: newChecklist };
                                                    if (allCompleted && !item.habit.completedToday) {
                                                        onCompleteHabit({ stopPropagation: () => {} } as any, updatedHabit);
                                                    } else if (!allCompleted && item.habit.completedToday) {
                                                        onCompleteHabit({ stopPropagation: () => {} } as any, updatedHabit);
                                                    }
                                                }
                                            }}
                                        >
                                            {item.isCompleted && <Check size={18} strokeWidth={3} />}
                                        </div>
                                        </motion.div>
                                    </div>
                                ))
                            ) : (
                                displayedHabits.map(habit => {
                                    const isDue = habit.frequency === 'DAILY' || 
                                                    (habit.frequency === 'WEEKLY' && 
                                                    (habit.weeklyType === 'FLEXIBLE_COUNT' || !habit.frequencyDays || habit.frequencyDays.length === 0 || habit.frequencyDays.includes(currentDate.getDay()))) ||
                                                    (habit.frequency === 'MONTHLY' && (
                                                    habit.monthlyType === 'FLEXIBLE_COUNT' ||
                                                    ((habit.monthlyType === 'SPECIFIC_DATES' || !habit.monthlyType) && (
                                                        (habit.frequencyDays && habit.frequencyDays.includes(currentDate.getDate())) ||
                                                        (habit.monthlyLastDay && isLastDayOfMonth(currentDate))
                                                    ))
                                                ));

                                    return (
                                        <div
                                            key={habit.id}
                                            className="w-full max-w-[600px] pr-3"
                                        >
                                            <div
                                                {...longPressHandlers}
                                                onContextMenu={(e) => {
                                                    if (!showArchived && onReorder && viewPreference === 'DEFAULT') {
                                                        e.preventDefault();
                                                        setIsReorderModalOpen(true);
                                                    }
                                                }}
                                                className="touch-manipulation w-full"
                                            >
                                                <HabitItem
                                                    habit={habit}
                                                    attribute={attributeMap.get(habit.attribute)}
                                                    onComplete={onCompleteHabit}
                                                    onClick={setMasteryHabit}
                                                    onUpdate={onUpdateHabit}
                                                    onEdit={onEditHabit}
                                                    onShowActions={onShowActions}
                                                    isDue={isDue}
                                                    reduceMotion={reduceMotion}
                                                    viewPreference={viewPreference}
                                                    weekStartDay={weekStartDay}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* EMPTY STATE */}
                            {!showArchived && activeHabits.length === 0 && (
                                <div className="col-span-full py-20 text-center text-slate-500 flex flex-col items-center gap-4">
                                    <p>{t('habits.empty')}</p>
                                    <button 
                                        onClick={onCreateHabit}
                                        className="px-6 py-2 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-500/30 transition-colors"
                                    >
                                        Crear Protocolo
                                    </button>
                                </div>
                            )}

                            {/* EMPTY ARCHIVED STATE */}
                            {showArchived && archivedHabits.length === 0 && (
                                <div className="col-span-full py-20 text-center text-slate-500 italic">
                                    {t('common.noArchivedHabits')}
                                </div>
                            )}

                            {/* ARCHIVED TOGGLE BUTTON */}
                            {!showArchived && archivedHabits.length > 0 && (
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={() => setShowArchived(true)}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-white/40 hover:text-white hover:bg-white/10 transition-all hover:scale-105"
                                    >
                                        <Archive size={12} />
                                        <span>Ver Archivados ({archivedHabits.length})</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            key="vices"
                            className="w-full flex flex-col items-center gap-3 relative px-4 sm:px-6 animate-fade-in-fast"
                        >
                            {/* Floating Mini Action */}
                            {/* REMOVED: Create button */}

                            {/* Relapse History Chart */}
                            {!showArchived && activeBadHabits.length > 0 && (
                                <div className="w-full max-w-[600px]">
                                    <RelapseChart 
                                        badHabits={activeBadHabits} 
                                        isActive={isActive}
                                        isPro={isPro}
                                        onOpenPro={onOpenPro}
                                        weekStartDay={weekStartDay || 1}
                                    />
                                </div>
                            )}

                            {(showArchived ? archivedBadHabits : activeBadHabits).map(habit => (
                                <BadHabitWrapper 
                                    key={habit.id}
                                    habit={habit}
                                    attributeMap={attributeMap}
                                    onShowBadHabitActions={onShowBadHabitActions}
                                    onOpenDetail={setSelectedDetailBadHabit}
                                    onRelapseBadHabit={onRelapseBadHabit}
                                    onReorderRequest={() => {
                                        if (!showArchived && onReorderBadHabits) {
                                            setIsBadHabitReorderModalOpen(true);
                                        }
                                    }}
                                />
                            ))}
                            {!showArchived && activeBadHabits.length === 0 && (
                                <div className="col-span-full min-h-[70vh] flex flex-col items-center justify-center gap-8 text-center -mt-20">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-rose-500/10 rounded-full" />
                                        <div className="w-24 h-24 rounded-full bg-[#1a1a1c] border border-white/10 flex items-center justify-center relative z-10">
                                            <Skull className="text-rose-500" size={40} />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 max-w-xs mx-auto">
                                        <h3 className="text-xl font-bold text-white tracking-tight">Zona Despejada</h3>
                                        <p className="text-sm text-white/40 leading-relaxed">
                                            {t('habits.emptyVices') || "No threats detected. Stay vigilant."}
                                        </p>
                                    </div>

                                    <button 
                                        onClick={onCreateBadHabit}
                                        className="group relative px-8 py-4 bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-2xl text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />
                                        <Skull size={18} className="relative z-10" />
                                        <span className="relative z-10">{t('habits.identifyEnemy')}</span>
                                    </button>
                                </div>
                            )}

                            {/* EMPTY ARCHIVED STATE FOR VICES */}
                            {showArchived && archivedBadHabits.length === 0 && (
                                <div className="col-span-full py-20 text-center text-slate-500 italic">
                                    No hay vicios archivados
                                </div>
                            )}

                            {/* ARCHIVED TOGGLE BUTTON FOR VICES */}
                            {!showArchived && archivedBadHabits.length > 0 && (
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={() => setShowArchived(true)}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-white/40 hover:text-white hover:bg-white/10 transition-all hover:scale-105"
                                    >
                                        <Archive size={12} />
                                        <span>Ver Archivados ({archivedBadHabits.length})</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
            </div>

            {onReorder && isReorderModalOpen && (
                <ReorderModal
                    isOpen={isReorderModalOpen}
                    onClose={() => setIsReorderModalOpen(false)}
                    items={[...activeHabits].sort((a, b) => (a.order || 0) - (b.order || 0))}
                    onSave={(newItems) => onReorder(newItems)}
                    title={t('habits.reorderTitle', 'Reorder Habits')}
                    getItemColor={(h) => attributeMap.get(h.attribute)?.color || '#fff'}
                />
            )}

            {onReorderBadHabits && isBadHabitReorderModalOpen && (
                <ReorderModal
                    isOpen={isBadHabitReorderModalOpen}
                    onClose={() => setIsBadHabitReorderModalOpen(false)}
                    items={[...activeBadHabits]}
                    onSave={(newItems) => onReorderBadHabits(newItems)}
                    title={t('badHabits.reorderTitle', 'Reorder Vices')}
                    getItemColor={(h) => attributeMap.get(h.attribute)?.color || '#f43f5e'}
                />
            )}

            <BadHabitDetailModal
                isOpen={!!selectedDetailBadHabit}
                onClose={() => setSelectedDetailBadHabit(null)}
                habit={selectedDetailBadHabit}
                attribute={selectedDetailBadHabit ? attributeMap.get(selectedDetailBadHabit.attribute) : undefined}
            />

            {quantityModalHabit && onUpdateHabit && (
                <QuantityUpdateModal 
                    habit={quantityModalHabit}
                    isOpen={!!quantityModalHabit}
                    onClose={() => setQuantityModalHabit(null)}
                    onUpdate={onUpdateHabit}
                />
            )}

            <HabitMasteryModal
                isOpen={!!masteryHabit}
                onClose={() => setMasteryHabit(null)}
                habit={masteryHabit}
                attribute={masteryHabit ? attributeMap.get(masteryHabit.attribute) : undefined}
            />
        </motion.div>
    );
});
