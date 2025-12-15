import React from 'react';

export const AvatarWidget = React.memo(({ level, xp, nextXp }: { level: number, xp: number, nextXp: number }) => (
    <div className="flex items-center gap-4 overflow-hidden opacity-100 translate-x-0 w-auto">
        <div className="relative group active:scale-95 transition-transform shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 p-[1px] border border-white/10 shadow-2xl">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Avatar" className="w-full h-full rounded-[10px] object-cover opacity-90" />
            </div>
        </div>
        <div className="whitespace-nowrap">
            <h1 className="text-[17px] font-bold text-white tracking-tight leading-none mb-1.5">Level {Math.floor(level)}</h1>
            <div className="h-1.5 w-32 liquid-bar">
                <div className="liquid-bar-fill bg-gradient-to-r from-cyan-400 to-blue-500 origin-left" style={{ width: `${(xp / nextXp) * 100}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wide">{xp} / {nextXp} XP</p>
        </div>
    </div>
));
