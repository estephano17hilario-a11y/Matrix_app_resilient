import React, { useState } from 'react';
import { ListTodo, ImageIcon, Type, Heading1, Heading2, Quote, Code, AlertCircle, Binary, Plus } from 'lucide-react';
import { NoteBlock } from '../../../types';

interface EditorToolbarProps {
  onAdd: (type: NoteBlock['type']) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
      {isOpen && (
        <div className="mb-2 p-2 rounded-2xl bg-[#14141c]/95 border border-white/15 shadow-2xl backdrop-blur-xl flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[90vw] animate-in slide-in-from-bottom-3 duration-200">
          <button 
            onClick={() => { onAdd('text'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium shrink-0" 
            title="Texto"
          >
            <Type size={16} />
            <span className="hidden sm:inline">Texto</span>
          </button>
          
          <button 
            onClick={() => { onAdd('h1'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0" 
            title="Título Grande (H1)"
          >
            <Heading1 size={16} />
            <span className="hidden sm:inline">H1</span>
          </button>

          <button 
            onClick={() => { onAdd('h2'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0" 
            title="Subtítulo (H2)"
          >
            <Heading2 size={16} />
            <span className="hidden sm:inline">H2</span>
          </button>

          <button 
            onClick={() => { onAdd('quote'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-all flex items-center gap-1.5 text-xs font-medium shrink-0" 
            title="Cita"
          >
            <Quote size={16} />
            <span className="hidden sm:inline">Cita</span>
          </button>

          <button 
            onClick={() => { onAdd('code'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 transition-all flex items-center gap-1.5 text-xs font-mono shrink-0" 
            title="Código"
          >
            <Code size={16} />
            <span className="hidden sm:inline">Código</span>
          </button>

          <button 
            onClick={() => { onAdd('latex'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-pink-500/20 text-slate-300 hover:text-pink-300 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0" 
            title="Fórmula LaTeX"
          >
            <Binary size={16} />
            <span className="hidden sm:inline">Math</span>
          </button>

          <button 
            onClick={() => { onAdd('callout'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 transition-all flex items-center gap-1.5 text-xs font-medium shrink-0" 
            title="Nota Destacada / Callout"
          >
            <AlertCircle size={16} />
            <span className="hidden sm:inline">Callout</span>
          </button>

          <button 
            onClick={() => { onAdd('check'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-all flex items-center gap-1.5 text-xs font-medium shrink-0" 
            title="Tarea / Checkbox"
          >
            <ListTodo size={16} />
            <span className="hidden sm:inline">Check</span>
          </button>

          <button 
            onClick={() => { onAdd('image'); setIsOpen(false); }} 
            className="p-2.5 rounded-xl hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 transition-all flex items-center gap-1.5 text-xs font-medium shrink-0" 
            title="Imagen"
          >
            <ImageIcon size={16} />
            <span className="hidden sm:inline">Imagen</span>
          </button>
        </div>
      )}

      {/* Main Bar / Trigger */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#181820]/90 border border-white/15 shadow-2xl backdrop-blur-md">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold transition-all ${
            isOpen ? 'bg-cyan-500 text-black scale-105' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <Plus size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
          <span>Insertar Bloque</span>
        </button>

        <button 
          onClick={() => onAdd('text')} 
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors" 
          title="Texto Rápido"
        >
          <Type size={16} />
        </button>

        <button 
          onClick={() => onAdd('check')} 
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors" 
          title="Tarea Rápida"
        >
          <ListTodo size={16} />
        </button>
      </div>
    </div>
  );
};
