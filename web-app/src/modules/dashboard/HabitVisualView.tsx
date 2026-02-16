import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Archive, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Habit, Attribute, BadHabit } from '../../types';
import { RelapseChart } from './components/RelapseChart';
import { BadHabitItem } from './components/BadHabitItem';
import { HabitItem } from './components/HabitItem';
import { HabitConsistencyChart } from './components/HabitConsistencyChart';

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
    onOpenStreak
}) => {
    const { t } = useTranslation();
    const { setVicesMode } = useTheme();
    const [section, setSection] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');
    const [showArchived, setShowArchived] = useState(false);

    // Split habits into active and archived
    const { activeHabits, archivedHabits } = useMemo(() => {
        return {
            activeHabits: habits.filter(h => !h.archived),
            archivedHabits: habits.filter(h => h.archived)
        };
    }, [habits]);

    const attributeMap = useMemo(() => new Map(attributes.map(attr => [attr.id, attr])), [attributes]);

    const displayedHabits = useMemo(() => {
        return showArchived ? archivedHabits : activeHabits;
    }, [showArchived, archivedHabits, activeHabits]);

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
        exit: { opacity: 0, x: 0, scale: 1.05 }
    };

    const transitionConfig = { type: "spring" as const, stiffness: 350, damping: 25, mass: 1 };

    return (
        <motion.div 
            initial="hidden"
            animate="show"
            variants={container}
            className="min-h-screen pb-32"
        >
            {/* Header Section Removed as per request */}
            <div className="flex flex-col gap-4 mb-4 px-4 sm:px-6 pt-2">
                 <AnimatePresence mode="wait">
                    {(section === 'PROTOCOLS' && !showArchived) && (
                        <motion.div
                            key="chart"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                        >
                            <HabitConsistencyChart habits={habits} onOpenStreak={onOpenStreak} isActive={isActive} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

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
                            className="w-full grid gap-3"
                        >
                            {/* ARCHIVED HEADER */}
                            {showArchived && (
                                <div className="flex items-center gap-2 mb-2 px-1">
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
                            {displayedHabits.map(habit => (
                                <HabitItem
                                    key={habit.id}
                                    habit={habit}
                                    attribute={attributeMap.get(habit.attribute)}
                                    onComplete={onCompleteHabit}
                                    onEdit={onEditHabit}
                                    onUpdate={onUpdateHabit}
                                    onShowActions={onShowActions}
                                    reduceMotion={reduceMotion}
                                />
                            ))}

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
                                    No hay hábitos archivados
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
                            className="w-full grid gap-3"
                        >
                            {/* Relapse History Chart */}
                            <div className="col-span-full">
                                <RelapseChart badHabits={badHabits} />
                            </div>

                            {badHabits.map(habit => (
                                <BadHabitItem
                                    key={habit.id}
                                    habit={habit}
                                    attribute={attributeMap.get(habit.attribute)}
                                    onRelapse={onRelapseBadHabit}
                                    reduceMotion={reduceMotion}
                                />
                            ))}
                            {badHabits.length === 0 && (
                                <div className="col-span-full py-20 text-center text-slate-500 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
                                        <Skull className="text-rose-500/50" size={32} />
                                    </div>
                                    <p>{t('habits.emptyVices')}</p>
                                    <button 
                                        onClick={onCreateBadHabit}
                                        className="px-6 py-2 bg-rose-500/20 text-rose-400 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-rose-500/30 transition-colors"
                                    >
                                        {t('habits.identifyEnemy')}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </motion.div>
    );
});
