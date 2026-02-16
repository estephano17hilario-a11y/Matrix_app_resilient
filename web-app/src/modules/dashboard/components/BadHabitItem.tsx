import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Skull } from 'lucide-react';
import { BadHabit, Attribute } from '../../../types';

interface BadHabitItemProps {
    habit: BadHabit;
    attribute?: Attribute;
    onRelapse: (habit: BadHabit) => void;
    reduceMotion?: boolean;
}

export const BadHabitItem: React.FC<BadHabitItemProps> = ({
    habit,
    attribute,
    onRelapse,
    reduceMotion
}) => {
    const isRelapsed = habit.relapsedToday;
    const color = attribute?.color || '#10b981'; // Default Emerald if no attribute

    const Wrapper: React.ElementType = reduceMotion ? 'div' : motion.div;

    const wrapperStyle: React.CSSProperties = {
        backgroundColor: isRelapsed ? undefined : `${color}10`,
        borderColor: isRelapsed ? undefined : `${color}30`,
        boxShadow: isRelapsed ? undefined : `0 0 12px ${color}05`,
        contentVisibility: 'auto',
        containIntrinsicSize: '120px'
    };

    const wrapperProps = reduceMotion
        ? {
            className: `group relative border shadow-sm rounded-[1.5rem] p-1 transition-all duration-300 active:scale-95 ${
                isRelapsed 
                ? 'bg-rose-950/40 border-rose-500/20 opacity-60' 
                : 'bg-[#0b0b0d]/80 hover:bg-[#15151a]/80'
            }`,
            style: wrapperStyle
        }
        : {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            className: `group relative border shadow-sm rounded-[1.5rem] p-1 transition-all duration-300 ${
                isRelapsed 
                ? 'bg-rose-950/40 border-rose-500/20 opacity-60' 
                : 'bg-[#0b0b0d]/80 hover:bg-[#15151a]/80'
            }`,
            style: wrapperStyle
        };

    return (
        <Wrapper
            {...wrapperProps}
        >
            <div className="relative flex items-center p-3 gap-4">
                {/* Icon Box */}
                <div 
                    style={{
                        backgroundColor: isRelapsed ? undefined : `${color}20`,
                        borderColor: isRelapsed ? undefined : `${color}30`,
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105 ${
                        isRelapsed 
                        ? 'bg-rose-500/10 border-rose-500/20' 
                        : ''
                    }`}
                >
                    {isRelapsed ? (
                        <Skull size={22} className="text-rose-500" />
                    ) : (
                        <div 
                            className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" 
                            style={{ backgroundColor: color, color: color }}
                        />
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-[15px] mb-1 tracking-tight truncate ${isRelapsed ? 'text-rose-400 line-through' : 'text-white'}`}>
                        {habit.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                        <div 
                            style={{ 
                                borderColor: isRelapsed ? undefined : `${color}20`,
                                backgroundColor: isRelapsed ? undefined : `${color}10`,
                                color: isRelapsed ? undefined : '#94a3b8' // Slate-400
                            }}
                            className="flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md border border-white/5 bg-white/5 text-slate-500"
                        >
                            {attribute?.label || 'HABIT'}
                        </div>
                        <div 
                            style={{
                                color: isRelapsed ? undefined : color,
                                backgroundColor: isRelapsed ? undefined : `${color}15`
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isRelapsed ? 'text-rose-500 bg-rose-500/10' : ''}`}
                        >
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
        </Wrapper>
    );
};
