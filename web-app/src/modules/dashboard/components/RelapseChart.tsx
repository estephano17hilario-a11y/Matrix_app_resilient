import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BadHabit } from '../../../types';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

interface RelapseChartProps {
    badHabits: BadHabit[];
}

export const RelapseChart: React.FC<RelapseChartProps> = ({ badHabits }) => {
    // Calculate total relapses per day for the last 14 days
    const data = React.useMemo(() => {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const date = subDays(new Date(), i);
            let count = 0;
            badHabits.forEach(h => {
                if (h.history) {
                    h.history.forEach(relapseDate => {
                        if (isSameDay(new Date(relapseDate), date)) {
                            count++;
                        }
                    });
                }
            });
            days.push({
                date: format(date, 'MMM dd'),
                count: count
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
        <div className="w-full h-48 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md mb-4">
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
                    />
                    <Ar 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#f43f5e" 
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                        strokeWidth={2}
                    />
                </AChart>
            </RContainer>
        </div>
    );
};
