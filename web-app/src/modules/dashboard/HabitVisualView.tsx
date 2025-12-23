import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid, Calendar, Skull, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Habit, Attribute, BadHabit } from '../../types';
import { HabitVisualCard } from './components/HabitVisualCard';
import { BadHabitItem } from './components/BadHabitItem';

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
}

export const HabitVisualView: React.FC<HabitVisualViewProps> = ({ 
    habits, 
    badHabits,
    attributes, 
    onCompleteHabit,
    onToggleHabitDay,
    onCreateHabit,
    onCreateBadHabit,
    onDeleteHabit,
    onEditHabit,
    onRelapseBadHabit
}) => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'GRID' | 'WEEK'>('GRID');
    const [section, setSection] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');

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
            <div className="flex flex-col gap-4 mb-6 px-2 pt-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        {section === 'PROTOCOLS' ? t('habits.title') : 'Vices & Bad Habits'}
                    </h1>

                    <button 
                        onClick={section === 'PROTOCOLS' ? onCreateHabit : onCreateBadHabit}
                        className={`group flex items-center gap-2 px-4 py-2 text-white rounded-full font-medium text-xs transition-all border ${
                            section === 'PROTOCOLS' 
                            ? 'bg-[#1a1a1a]/95 hover:bg-[#252525] border-white/10' 
                            : 'bg-rose-950/80 hover:bg-rose-900 border-rose-500/30'
                        }`}
                    >
                        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                        {section === 'PROTOCOLS' ? t('habits.newHabit') : 'New Vice'}
                    </button>
                </div>

                {/* Section Toggle */}
                <div className="flex items-center justify-center mb-2">
                    <div className="flex p-1 rounded-full bg-black/5 backdrop-blur-[2px] border border-white/10 shadow-lg relative transform-gpu">
                         <button 
                            onClick={() => setSection('PROTOCOLS')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 relative z-10 ${
                                section === 'PROTOCOLS' 
                                ? 'text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]' 
                                : 'text-white/40 hover:text-white'
                            }`}
                        >
                            <Shield size={12} />
                            Protocols
                        </button>
                        <button 
                            onClick={() => setSection('VICES')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 relative z-10 ${
                                section === 'VICES' 
                                ? 'text-white bg-gradient-to-r from-rose-600 to-red-600 shadow-[0_0_20px_rgba(225,29,72,0.4)]' 
                                : 'text-white/40 hover:text-white'
                            }`}
                        >
                            <Skull size={12} />
                            Vices
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle (Only for Protocols for now) */}
                {section === 'PROTOCOLS' && (
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
                )}
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
                                <p>No vices recorded. Stay clean.</p>
                                <button 
                                    onClick={onCreateBadHabit}
                                    className="px-6 py-2 bg-rose-500/20 text-rose-400 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-rose-500/30 transition-colors"
                                >
                                    Identify Enemy
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
};
