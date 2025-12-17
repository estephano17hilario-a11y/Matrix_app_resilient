import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Habit, Attribute } from '../../types';
import { HabitVisualCard } from './components/HabitVisualCard';

interface HabitVisualViewProps {
    habits: Habit[];
    attributes: Attribute[];
    onCompleteHabit: (e: React.MouseEvent, h: Habit) => void;
    onCreateHabit: () => void;
}

export const HabitVisualView: React.FC<HabitVisualViewProps> = ({ 
    habits, 
    attributes, 
    onCompleteHabit,
    onCreateHabit
}) => {
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-2">
                <div>
                    <h1 className="text-4xl font-semibold text-white tracking-tight mb-2">
                        Habits
                    </h1>
                    <p className="text-slate-400 font-medium text-base">
                        Design your life, one day at a time.
                    </p>
                </div>

                <button 
                    onClick={onCreateHabit}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium text-sm transition-all backdrop-blur-md border border-white/10"
                >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    New Habit
                </button>
            </div>

            {/* Habits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {habits.map(habit => (
                    <HabitVisualCard
                        key={habit.id}
                        habit={habit}
                        attribute={attributes.find(a => a.id === habit.attribute)}
                        onComplete={onCompleteHabit}
                    />
                ))}
                
                {habits.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-500">
                        <p>No habits yet. Start by creating one.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
