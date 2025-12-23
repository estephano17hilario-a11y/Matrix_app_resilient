import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Habit, Attribute } from '../../types';
import { HabitVisualCard } from './components/HabitVisualCard';

interface HabitVisualViewProps {
    habits: Habit[];
    attributes: Attribute[];
    onCompleteHabit: (e: React.MouseEvent, h: Habit) => void;
    onToggleHabitDay: (h: Habit, date: string) => void;
    onCreateHabit: () => void;
    onDeleteHabit?: (id: string) => void;
    onEditHabit?: (habit: Habit) => void;
}

export const HabitVisualView: React.FC<HabitVisualViewProps> = ({ 
    habits, 
    attributes, 
    onCompleteHabit,
    onToggleHabitDay,
    onCreateHabit,
    onDeleteHabit,
    onEditHabit
}) => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'GRID' | 'WEEK'>('GRID');

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
            {/* Header Section - Cleaner, Apple-style */}
            <div className="flex flex-col gap-4 mb-6 px-2 pt-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        {t('habits.title')}
                    </h1>

                    <button 
                        onClick={onCreateHabit}
                        className="group flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium text-xs transition-all backdrop-blur-md border border-white/10"
                    >
                        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                        {t('habits.newHabit')}
                    </button>
                </div>

                {/* View Toggle - Liquid Style */}
                <div className="flex items-center justify-center">
                    <div className="flex p-1 rounded-full backdrop-blur-2xl bg-white/5 border border-white/10 shadow-lg">
                        <button 
                            onClick={() => setViewMode('GRID')}
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${viewMode === 'GRID' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutGrid size={12} />
                            {t('habits.viewGrid') || 'Grilla'}
                        </button>
                        <button 
                            onClick={() => setViewMode('WEEK')}
                            className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${viewMode === 'WEEK' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <Calendar size={12} />
                            {t('habits.viewWeek') || 'Semana'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Habits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
            </div>
        </motion.div>
    );
};
