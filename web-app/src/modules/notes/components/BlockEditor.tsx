import React from 'react';
import { Trash2, Check, ImageIcon } from 'lucide-react';
import { NoteBlock } from '../../../types';

export const BlockEditor = React.memo(({ blocks, onChange, readOnly = false }: { blocks: NoteBlock[], onChange: (blocks: NoteBlock[]) => void, readOnly?: boolean }) => {
    // Removed synchronous useEffect to prevent rendering loops.
    // Initialization of empty blocks should be handled by the parent component.

    const updateBlock = (id: string, updates: Partial<NoteBlock>) => {
        onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeBlock = (id: string) => {
        onChange(blocks.filter(b => b.id !== id));
    };

    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    if (blocks.length === 0 && !readOnly) {
        return (
             <div className="h-40 flex items-center justify-center text-white/20 italic cursor-text" onClick={() => onChange([{ id: Date.now().toString(), type: 'text', content: '' }])}>
                 Tap to start writing...
             </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 w-full pb-20">
            {blocks.map((block, index) => (
                <div key={block.id} className="group relative flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300 editor-line">
                    {!readOnly && (
                        <div className="absolute -left-8 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => removeBlock(block.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors"><Trash2 size={14} /></button>
                        </div>
                    )}
                    
                    {block.type === 'text' && (
                        <textarea 
                            ref={el => { if(el) adjustHeight(el) }} // Initial adjustment
                            autoFocus={index === blocks.length - 1 && !block.content}
                            value={block.content} 
                            onChange={(e) => { 
                                updateBlock(block.id, { content: e.target.value });
                                adjustHeight(e.target);
                            }} 
                            placeholder="Type something..." 
                            className="w-full bg-transparent text-slate-100 placeholder:text-slate-600 resize-none outline-none leading-relaxed text-[17px] font-normal font-sans" 
                            style={{ minHeight: '1.5em', overflow: 'hidden' }}
                            readOnly={readOnly}
                        />
                    )}

                    {block.type === 'check' && (
                        <div className="flex items-center gap-3 w-full group/check">
                            <button onClick={() => !readOnly && updateBlock(block.id, { checked: !block.checked })} className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all ${block.checked ? 'bg-blue-500 border-blue-500' : 'border-white/30 bg-transparent group-hover/check:border-white/60'}`}>
                                {block.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                            </button>
                            <input 
                                type="text" 
                                value={block.content} 
                                onChange={(e) => updateBlock(block.id, { content: e.target.value })} 
                                className={`w-full bg-transparent outline-none text-[17px] transition-all ${block.checked ? 'text-slate-500 line-through' : 'text-slate-100'}`}
                                placeholder="To-do item"
                                readOnly={readOnly}
                            />
                        </div>
                    )}

                    {block.type === 'image' && (
                        <div className="w-full rounded-2xl overflow-hidden bg-black/20 border border-white/10 relative group/img aspect-video shadow-sm mt-2 mb-2">
                            {block.content ? (
                                <img src={block.content} alt="Attachment" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50">
                                    <ImageIcon size={32} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Image Placeholder</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
});
