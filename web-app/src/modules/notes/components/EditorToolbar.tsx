import { ListTodo, ImageIcon, PenTool } from 'lucide-react';

export const EditorToolbar = ({ onAdd }: { onAdd: (type: 'text' | 'check' | 'image') => void }) => (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-2xl bg-[#1c1c1e]/90 backdrop-blur-md border border-white/10 shadow-2xl z-40 animate-in slide-in-from-bottom-4">
        <button onClick={() => onAdd('check')} className="p-3 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"><ListTodo size={20} strokeWidth={1.5} /></button>
        <div className="w-[1px] h-6 bg-white/10" />
        <button onClick={() => onAdd('image')} className="p-3 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"><ImageIcon size={20} strokeWidth={1.5} /></button>
        <div className="w-[1px] h-6 bg-white/10" />
        <button onClick={() => onAdd('text')} className="p-3 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"><PenTool size={20} strokeWidth={1.5} /></button>
    </div>
);
