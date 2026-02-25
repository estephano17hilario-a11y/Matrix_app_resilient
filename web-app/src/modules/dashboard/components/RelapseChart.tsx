import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BadHabit } from '../../../types';
import { format, subDays } from 'date-fns';

interface RelapseChartProps {
    badHabits: BadHabit[];
}

export const RelapseChart: React.FC<RelapseChartProps> = ({ badHabits }) => {
    // Calculate total relapses per day for the last 14 days
    const data = React.useMemo(() => {
        const counts = new Map<string, number>();

        badHabits.forEach(h => {
            h.history?.forEach(relapseDate => {
                const key = format(new Date(relapseDate), 'yyyy-MM-dd');
                counts.set(key, (counts.get(key) || 0) + 1);
            });
        });

        const days = [];
        for (let i = 13; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const key = format(date, 'yyyy-MM-dd');
            days.push({
                date: format(date, 'MMM dd'),
                count: counts.get(key) || 0
            });
        }
        return days;
    }, [badHabits]);

    if (badHabits.length === 0) return null;

    const RContainer = ResponsiveContainer as any;
    const AChart = AreaChart as any;
    const XAx = XAxis as any;
    const Ar = Area as any;

    return (
        <div className="w-full h-48 bg-[#0b0b0d]/80 rounded-2xl p-4 border border-white/5 shadow-sm mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-70 pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Relapse History</h3>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                    <span className="text-[10px] text-rose-400 font-medium">Last 14 Days</span>
                </div>
            </div>
            <RContainer width="100%" height="80%">
                <AChart data={data}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAx 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#ffffff50', fontSize: 10 }} 
                        interval={2}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#000000cc', borderRadius: '8px', border: '1px solid #ffffff20' }}
                        itemStyle={{ color: '#f43f5e' }}
                        animationDuration={400}
                    />
                    <Ar 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#f43f5e" 
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                        strokeWidth={2}
                        animationDuration={500}
                    />
                </AChart>
            </RContainer>
        </div>
    );
};
