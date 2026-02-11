import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull } from 'lucide-react';
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
    isActive?: boolean;
    currentSection?: 'PROTOCOLS' | 'VICES';
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
    isActive = true,
    currentSection
}) => {
    const { t } = useTranslation();
    const { setVicesMode } = useTheme();
    const [section, setSection] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');

    // Sync section with external prop
    useEffect(() => {
        if (currentSection) {
            setSection(currentSection);
        }
    }, [currentSection]);

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

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

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
                    {section === 'PROTOCOLS' && (
                        <motion.div
                            key="chart"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                        >
                            <HabitConsistencyChart habits={habits} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-3 relative">
                <AnimatePresence mode="wait" initial={false}>
                    {section === 'PROTOCOLS' ? (
                        <motion.div
                            key="protocols"
                            variants={contentVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={transitionConfig}
                            className="w-full grid gap-3"
                        >
                            {habits.map(habit => (
                                <HabitItem
                                    key={habit.id}
                                    habit={habit}
                                    attribute={attributes.find(a => a.id === habit.attribute)}
                                    onComplete={onCompleteHabit}
                                    onEdit={onEditHabit}
                                    onUpdate={onUpdateHabit}
                                />
                            ))}
                            {habits.length === 0 && (
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
                                    attribute={attributes.find(a => a.id === habit.attribute)}
                                    onRelapse={onRelapseBadHabit}
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
