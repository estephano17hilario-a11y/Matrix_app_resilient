import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Archive, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isSameDay, isLastDayOfMonth } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { Habit, Attribute, BadHabit } from '../../types';
import { RelapseChart } from './components/RelapseChart';
import { BadHabitItem } from './components/BadHabitItem';
import { HabitItem } from './components/HabitItem';
import { HabitConsistencyChart } from './components/HabitConsistencyChart';
import { ViewMode } from './components/HabitViewHeader';
import { DateSelectionModal } from './components/DateSelectionModal';
import { ReorderModal } from '../../components/ui/ReorderModal';
import { useLongPress } from '../../hooks/useLongPress';

interface HabitVisualViewProps {
    habits: Habit[];
    badHabits: BadHabit[];
    attributes: Attribute[];
    onCompleteHabit: (e: React.MouseEvent, h: Habit) => void;
    onToggleHabitDay?: (habitId: string, date: string) => void;
    onCreateHabit: () => void;
    onCreateBadHabit: () => void;
    onDeleteHabit?: (habitId: string) => void;
    onEditHabit?: (habit: Habit) => void;
    onUpdateHabit?: (habitId: string, data: Partial<Habit>) => void;
    onRelapseBadHabit: (habit: BadHabit) => void;
    onShowActions?: (habit: Habit) => void;
    isActive?: boolean;
    currentSection?: 'PROTOCOLS' | 'VICES';
    onOpenStreak?: () => void;
    onReorder?: (habits: Habit[]) => void;
    isPro?: boolean;
    onOpenPro?: () => void;
}

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
    isActive = true,
    currentSection,
    onOpenStreak,
    onReorder,
    isPro,
    onOpenPro
}) => {
    const { t } = useTranslation();
    const { setVicesMode } = useTheme();
    const [section, setSection] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');
    const [showArchived, setShowArchived] = useState(false);
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    
    // Header State
    const [viewMode] = useState<ViewMode>('DAY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);

    // Split habits into active and archived
    const { activeHabits, archivedHabits } = useMemo(() => {
        return {
            activeHabits: habits.filter(h => !h.archived),
            archivedHabits: habits.filter(h => h.archived)
        };
    }, [habits]);

    const attributeMap = useMemo(() => new Map(attributes.map(attr => [attr.id, attr])), [attributes]);

    const displayedHabits = useMemo(() => {
        const list = showArchived ? archivedHabits : activeHabits;
        
        // Sort by order first
        const sortedList = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));

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
    }, [showArchived, archivedHabits, activeHabits, currentDate]);

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

    const contentVariants = {
        initial: { opacity: 0, x: 0, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: 0, scale: 0.95 }
    };

    const transitionConfig = { type: "spring" as const, stiffness: 350, damping: 25, mass: 1 };

    // Long Press Handler
    const longPressHandlers = useLongPress(() => {
        if (!showArchived && onReorder) {
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
            className="min-h-screen pb-32"
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
                <AnimatePresence mode="wait" initial={false}>
                    {section === 'PROTOCOLS' ? (
                        <motion.div
                            key={showArchived ? "archived" : "protocols"}
                            variants={contentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={transitionConfig}
                            className="w-full flex flex-col items-center gap-3 relative px-4 sm:px-6"
                        >
                            {/* Habit Consistency Chart (Moved inside to prevent layout shifts during exit animation) */}
                            {!showArchived && (
                                <div className="w-full max-w-[600px] mb-1 pt-1">
                                    <HabitConsistencyChart 
                                        habits={habits} 
                                        onOpenStreak={onOpenStreak} 
                                        isActive={isActive} 
                                        isPro={isPro}
                                        onOpenPro={onOpenPro}
                                    />
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
                            {displayedHabits.map(habit => {
                                const isDue = habit.frequency === 'DAILY' || 
                                              (habit.frequency === 'WEEKLY' && 
                                               (!habit.frequencyDays || habit.frequencyDays.length === 0 || habit.frequencyDays.includes(currentDate.getDay()))) ||
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
                                        {...longPressHandlers}
                                        onContextMenu={(e) => {
                                            if (!showArchived && onReorder) {
                                                e.preventDefault();
                                                setIsReorderModalOpen(true);
                                            }
                                        }}
                                        className="touch-manipulation w-full max-w-[600px]"
                                    >
                                        <HabitItem
                                            habit={habit}
                                            attribute={attributeMap.get(habit.attribute)}
                                            onComplete={onCompleteHabit}
                                            onEdit={onEditHabit}
                                            onUpdate={onUpdateHabit}
                                            onShowActions={onShowActions}
                                            reduceMotion={reduceMotion}
                                            isDue={isDue}
                                        />
                                    </div>
                                );
                            })}

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
                        </motion.div>
                    ) : (
                        <motion.div
                            key="vices"
                            variants={contentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={transitionConfig}
                            className="w-full flex flex-col items-center gap-3 relative px-4 sm:px-6"
                        >
                            {/* Floating Mini Action */}
                            {/* REMOVED: Create button */}

                            {/* Relapse History Chart */}
                            {badHabits.length > 0 && (
                                <div className="w-full max-w-[600px]">
                                    <RelapseChart badHabits={badHabits} />
                                </div>
                            )}

                            {badHabits.map(habit => (
                                <div className="w-full max-w-[600px]" key={habit.id}>
                                    <BadHabitItem
                                        habit={habit}
                                        attribute={attributeMap.get(habit.attribute)}
                                        onRelapse={onRelapseBadHabit}
                                        reduceMotion={reduceMotion}
                                    />
                                </div>
                            ))}
                            {badHabits.length === 0 && (
                                <div className="col-span-full min-h-[70vh] flex flex-col items-center justify-center gap-8 text-center -mt-20">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-rose-500/20 blur-md rounded-full animate-pulse-slow" />
                                        <div className="w-24 h-24 rounded-full bg-[#1a1a1c] border border-white/10 flex items-center justify-center relative z-10 shadow-2xl">
                                            <Skull className="text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" size={40} />
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
                                        className="group relative px-8 py-4 bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_40px_rgba(225,29,72,0.5)] hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        <Skull size={18} className="relative z-10" />
                                        <span className="relative z-10">{t('habits.identifyEnemy')}</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {onReorder && isReorderModalOpen && (
                <ReorderModal
                    isOpen={isReorderModalOpen}
                    onClose={() => setIsReorderModalOpen(false)}
                    items={[...activeHabits].sort((a, b) => (a.order || 0) - (b.order || 0))}
                    onSave={(newItems) => onReorder(newItems)}
                    title={t('habits.reorderTitle', 'Reordenar Hábitos')}
                    getItemColor={(h) => attributeMap.get(h.attribute)?.color || '#fff'}
                />
            )}
        </motion.div>
    );
});
