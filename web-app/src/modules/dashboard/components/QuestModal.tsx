import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Crosshair, Plus, Flame, Star } from 'lucide-react';
import { Attribute, Quest } from '../../../types';

export const QuestModal = React.memo(({ isOpen, onClose, attributes, onConfirm }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], onConfirm: (data: Partial<Quest>) => void }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [impact, setImpact] = useState(1);
    const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    const handleSlider = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const clientY = 'touches' in e ? (e as unknown as TouchEvent).touches[0].clientY : (e as unknown as MouseEvent).clientY;
        let percentage = 1 - ((clientY - rect.top) / rect.height);
        percentage = Math.max(0, Math.min(1, percentage));
        if (percentage < 0.25) setImpact(1); else if (percentage < 0.50) setImpact(2); else if (percentage < 0.75) setImpact(3); else setImpact(4);
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) { window.addEventListener('mousemove', handleSlider); window.addEventListener('mouseup', () => setIsDragging(false)); window.addEventListener('touchmove', handleSlider, { passive: false }); window.addEventListener('touchend', () => setIsDragging(false)); }
        return () => { window.removeEventListener('mousemove', handleSlider); window.removeEventListener('mouseup', () => setIsDragging(false)); window.removeEventListener('touchmove', handleSlider); window.removeEventListener('touchend', () => setIsDragging(false)); };
    }, [isDragging, handleSlider]);

    if (!isOpen) return null;

    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#333333';
    const SelectedIcon = selectedAttr?.icon || Star;
    const projectedStats = (() => {
        const base = 20; const imp = impact === 1 ? 1 : impact === 2 ? 1.5 : impact === 3 ? 3 : 5; 
        return { xp: Math.round(base * imp), rank: (impact === 1 ? 'C' : impact === 2 ? 'B' : impact === 3 ? 'A' : 'S') as Quest['difficulty'] };
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px] animate-modal-enter">
                <div className="glass-panel rounded-[2.5rem] p-5 overflow-visible relative transition-all duration-500" style={{ background: activeColor !== '#3b82f6' ? `linear-gradient(135deg, ${activeColor}40, ${activeColor}10 40%, rgba(20,20,25,0.9) 100%)` : 'rgba(20, 20, 25, 0.9)', borderColor: activeColor !== '#3b82f6' ? `${activeColor}50` : 'rgba(255, 255, 255, 0.1)', boxShadow: activeColor !== '#3b82f6' ? `0 25px 50px -12px ${activeColor}30` : '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : '#333' }}><Crosshair size={18} className="text-white" /></div>New Mission</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:bg-white/20"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-4 flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-colors"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objective Name..." className="w-full bg-transparent px-5 py-4 text-[17px] font-bold text-white placeholder:text-white/20 outline-none" autoFocus /></div>
                             <div onClick={() => setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`} style={attrId ? { backgroundColor: `${activeColor}15`, borderColor: activeColor } : {}}>
                                 {attrId ? (<SelectedIcon size={22} style={{ color: activeColor }} />) : <Plus size={22} className="text-white/30" />}
                                 {isAttrPickerOpen && (<><div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} /><div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>{attributes.map((attr) => {
                                     const Icon = attr.icon;
                                     return (
                                         <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10"><Icon size={16} style={{ color: attr.color }} /><span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span></button>
                                     )
                                 })}</div></>)}
                             </div>
                        </div>
                        <div className="col-span-4 bg-white/5 rounded-[1.5rem] border border-white/5 p-4"><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Briefing (Optional)..." className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" /></div>
                        <div className="col-span-2 rounded-[1.5rem] bg-white/5 border border-white/5 relative overflow-hidden h-24">
                             <div ref={sliderRef} className="absolute inset-0 z-10 cursor-ns-resize" onMouseDown={() => setIsDragging(true)} onTouchStart={() => setIsDragging(true)} />
                             <div className="absolute inset-0 top-auto transition-transform duration-100 ease-linear origin-bottom" style={{ height: '100%', transform: `scaleY(${impact * 0.25})`, backgroundColor: impact === 1 ? '#10b981' : impact === 2 ? '#3b82f6' : impact === 3 ? '#ef4444' : '#eab308' }} />
                             <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-3 text-white mix-blend-difference"><Flame size={16} className={isDragging ? 'scale-125' : ''} fill="currentColor" /><span className="text-[9px] font-black mt-1 uppercase">{projectedStats.rank}</span></div>
                        </div>
                        <div className="col-span-2 rounded-[1.5rem] bg-white/5 border border-white/5 flex flex-col items-center justify-center relative h-24"><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="absolute inset-0 opacity-0 z-10" /><span className="text-[9px] font-black text-white/30 uppercase">Due</span><span className="text-xl font-bold">{new Date(deadline).getDate()}</span><span className="text-[9px] font-bold text-white/50 uppercase">{new Date(deadline).toLocaleDateString('en-US', { month: 'short' })}</span></div>
                        <button onClick={() => onConfirm({ title, description: desc, attribute: attrId, xpReward: projectedStats.xp, difficulty: projectedStats.rank, deadline })} disabled={!title || !attrId} className={`col-span-4 h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'text-white shadow-lg active:scale-95'}`} style={(title && attrId) ? { background: `linear-gradient(to right, ${activeColor}, ${activeColor}dd)`, boxShadow: `0 10px 30px -10px ${activeColor}80` } : {}}>Confirm Mission</button>
                    </div>
                </div>
            </div>
        </div>
    );
});
