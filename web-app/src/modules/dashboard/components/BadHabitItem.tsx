import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Skull } from 'lucide-react';
import { BadHabit, Attribute } from '../../../types';

interface BadHabitItemProps {
    habit: BadHabit;
    attribute?: Attribute;
    onRelapse: (habit: BadHabit) => void;
}

export const BadHabitItem: React.FC<BadHabitItemProps> = ({
    habit,
    attribute,
    onRelapse
}) => {
    const isRelapsed = habit.relapsedToday;

    return (
        <motion.div
            layout
            className={`group relative backdrop-blur-md border shadow-lg rounded-[1.5rem] p-1 transition-all duration-300 ${
                isRelapsed 
                ? 'bg-rose-950/40 border-rose-500/20 opacity-60' 
                : 'bg-[#111]/40 border-white/10 hover:bg-[#1a1a20]/60'
            }`}
        >
            <div className="relative flex items-center p-3 gap-4">
                {/* Icon Box */}
                <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105 ${
                        isRelapsed 
                        ? 'bg-rose-500/10 border-rose-500/20' 
                        : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}
                >
                    {isRelapsed ? (
                        <Skull size={22} className="text-rose-500" />
                    ) : (
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-[15px] mb-1 tracking-tight truncate ${isRelapsed ? 'text-rose-400 line-through' : 'text-white'}`}>
                        {habit.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md border border-white/5 bg-white/5 text-slate-500">
                            {attribute?.label || 'HABIT'}
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isRelapsed ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                            {isRelapsed ? 'RELAPSED' : `${habit.streak} DAY STREAK`}
                        </div>
                    </div>
                </div>

                {/* Cut Button */}
                {!isRelapsed && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRelapse(habit);
                        }}
                        className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg hover:shadow-rose-500/30 group/cut"
                        title="Cut Streak (Relapse)"
                    >
                        <Scissors size={18} className="group-hover/cut:rotate-90 transition-transform duration-300" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};
