import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, Calendar, Skull, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Habit, Attribute, BadHabit } from '../../types';
import { RelapseChart } from './components/RelapseChart';
import { BadHabitItem } from './components/BadHabitItem';
import { HabitVisualCard } from './components/HabitVisualCard';
import { HabitConsistencyChart } from './components/HabitConsistencyChart';

interface HabitVisualViewProps {
    habits: Habit[];
    badHabits: BadHabit[];
    attributes: Attribute[];
    onCompleteHabit: (e: React.MouseEvent, h: Habit) => void;
    onToggleHabitDay: (h: Habit, date: string) => void;
    onCreateHabit: () => void;
    onCreateBadHabit: () => void;
    onDeleteHabit?: (id: string) => void;
    onEditHabit?: (habit: Habit) => void;
    onRelapseBadHabit: (habit: BadHabit) => void;
    isActive?: boolean;
}

export const HabitVisualView: React.FC<HabitVisualViewProps> = React.memo(({ 
    habits, 
    badHabits,
    attributes, 
    onCompleteHabit,
    onToggleHabitDay,
    onCreateHabit,
    onCreateBadHabit,
    onDeleteHabit,
    onEditHabit,
    onRelapseBadHabit,
    isActive = true
}) => {
    const { t } = useTranslation();
    const { setVicesMode } = useTheme();
    const [viewMode, setViewMode] = useState<'GRID' | 'WEEK'>('GRID');
    const [section, setSection] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');

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

    return (
        <motion.div 
            initial="hidden"
            animate="show"
            variants={container}
            className="min-h-screen pb-32"
        >
            {/* Header Section */}
            <div className="flex flex-col gap-4 mb-4 px-4 sm:px-6 pt-2">
                
                {/* Unified Control Bar - High Density Matrix */}
                <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl bg-[#0a0a0a]/80 border border-white/5 backdrop-blur-md shadow-2xl">
                    
                    {/* 1. Mode Switcher (Protocols / Vices) - Grows to fill space */}
                    <div className="relative flex-1 grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl border border-white/5 z-0">
                        {/* Animated Background Slider */}
                        <motion.div
                            layoutId="activeTab"
                            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-sm z-0 ${
                                section === 'PROTOCOLS' ? 'bg-white/10 border border-white/10' : 'bg-rose-500/20 border border-rose-500/20'
                            }`}
                            initial={false}
                            animate={{
                                x: section === 'PROTOCOLS' ? '0%' : 'calc(100% + 4px)'
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        
                        <button
                            onClick={() => { setSection('PROTOCOLS'); setVicesMode(false); }}
                            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors w-full rounded-lg ${
                                section === 'PROTOCOLS' ? 'text-white' : 'text-white/40 hover:text-white/60'
                            }`}
                        >
                            <Shield size={12} className={section === 'PROTOCOLS' ? 'text-emerald-400' : 'opacity-50'} />
                            <span className="truncate">{t('habits.protocols')}</span>
                        </button>

                        <button
                            onClick={() => { setSection('VICES'); setVicesMode(true); }}
                            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors w-full rounded-lg ${
                                section === 'VICES' ? 'text-white' : 'text-white/40 hover:text-white/60'
                            }`}
                        >
                            <Skull size={12} className={section === 'VICES' ? 'text-rose-500' : 'opacity-50'} />
                            <span className="truncate">{t('habits.vices')}</span>
                        </button>
                    </div>

                    {/* 2. Tools & Actions - Compact Group */}
                    <div className="flex items-center justify-center gap-2 h-10 sm:h-auto w-full sm:w-auto">
                        {/* View Toggles (Only visible in Protocols) */}
                        <AnimatePresence mode="popLayout">
                            {section === 'PROTOCOLS' && (
                                <motion.div 
                                    key="view-toggles"
                                    initial={{ opacity: 0, width: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, width: 'auto', scale: 1 }}
                                    exit={{ opacity: 0, width: 0, scale: 0.9 }}
                                    className="flex p-1 bg-white/5 rounded-xl border border-white/5 overflow-hidden h-full sm:h-auto"
                                >
                                    <button
                                        onClick={() => setViewMode('GRID')}
                                        className={`px-4 h-full rounded-lg transition-all flex items-center justify-center ${
                                            viewMode === 'GRID' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white'
                                        }`}
                                        title={t('habits.viewGrid')}
                                    >
                                        <LayoutGrid size={14} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('WEEK')}
                                        className={`px-4 h-full rounded-lg transition-all flex items-center justify-center ${
                                            viewMode === 'WEEK' ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white'
                                        }`}
                                        title={t('habits.viewWeek')}
                                    >
                                        <Calendar size={14} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Add Button - Centered & Balanced */}
                        <button
                            onClick={section === 'PROTOCOLS' ? onCreateHabit : onCreateBadHabit}
                            className={`flex items-center justify-center gap-2 px-8 h-full sm:h-auto sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shadow-lg active:scale-95 whitespace-nowrap ${
                                section === 'PROTOCOLS'
                                    ? 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40 shadow-white/5'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 shadow-rose-900/20'
                            }`}
                        >
                            <Plus size={14} />
                            <span>{section === 'PROTOCOLS' ? t('habits.newHabit') : t('habits.newVice')}</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {section === 'PROTOCOLS' && (
                        <motion.div
                            key="chart"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <HabitConsistencyChart habits={habits} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {section === 'PROTOCOLS' ? (
                    <>
                        {habits.map(habit => (
                            <HabitVisualCard
                                key={habit.id}
                                habit={habit}
                                viewMode={viewMode}
                                attribute={attributes.find(a => a.id === habit.attribute)}
                                onComplete={onCompleteHabit}
                                onToggleDay={onToggleHabitDay}
                                onDelete={onDeleteHabit}
                                onEdit={onEditHabit}
                            />
                        ))}
                        {habits.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-500">
                                <p>{t('habits.empty')}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </motion.div>
    );
});
