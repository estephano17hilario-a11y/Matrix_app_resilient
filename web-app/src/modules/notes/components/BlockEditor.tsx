import React, { useRef, useState } from 'react';
import { Trash2, Check, ImageIcon, Bold, Italic, Underline, Strikethrough, Sparkles, ChevronUp, ChevronDown, Type, Heading1, Heading2, Quote, Code, AlertCircle, Binary, Palette } from 'lucide-react';
import { NoteBlock } from '../../../types';
import { useTranslation } from 'react-i18next';

const TEXT_COLORS = [
  { label: 'Blanco', value: '#ffffff' },
  { label: 'Cian', value: '#38bdf8' },
  { label: 'Esmeralda', value: '#34d399' },
  { label: 'Ámbar', value: '#fbbf24' },
  { label: 'Rosa', value: '#f472b6' },
  { label: 'Púrpura', value: '#c084fc' },
  { label: 'Rojo', value: '#f87171' },
  { label: 'Dorado', value: '#ffd700' },
];

const FONTS = [
  { label: 'Sans', value: 'font-sans' },
  { label: 'Serif', value: 'font-serif' },
  { label: 'Mono', value: 'font-mono' },
];

export const BlockEditor = React.memo(({ blocks, onChange, readOnly = false }: { blocks: NoteBlock[], onChange: (blocks: NoteBlock[]) => void, readOnly?: boolean }) => {
    const { t } = useTranslation();
    const heightRaf = useRef<number | null>(null);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    const updateBlock = (id: string, updates: Partial<NoteBlock>) => {
        onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeBlock = (id: string) => {
        onChange(blocks.filter(b => b.id !== id));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= blocks.length) return;
      const newBlocks = [...blocks];
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[targetIndex];
      newBlocks[targetIndex] = temp;
      onChange(newBlocks);
    };

    const scheduleAdjustHeight = (el: HTMLTextAreaElement) => {
        if (heightRaf.current) cancelAnimationFrame(heightRaf.current);
        heightRaf.current = requestAnimationFrame(() => {
            el.style.height = 'auto';
            el.style.height = (el.scrollHeight || 30) + 'px';
        });
    };

    if (blocks.length === 0 && !readOnly) {
        return (
             <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-6 text-white/40 italic cursor-text hover:border-cyan-500/40 transition-colors" onClick={() => onChange([{ id: Date.now().toString(), type: 'text', content: '' }])}>
                 <span className="text-sm font-medium mb-1">✍️ Presiona para empezar a escribir tu nota...</span>
                 <span className="text-[11px] text-white/30 font-sans">Soporta títulos, citas, fórmulas LaTeX, bloques de código y más.</span>
             </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 w-full pb-24">
            {blocks.map((block, index) => {
                const isActive = activeBlockId === block.id && !readOnly;
                const fontClass = block.fontFamily || 'font-sans';
                const styleClasses = [
                  fontClass,
                  block.bold ? 'font-bold' : '',
                  block.italic ? 'italic' : '',
                  block.underline ? 'underline' : '',
                  block.strikethrough ? 'line-through' : '',
                  block.shadow ? 'drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]' : ''
                ].join(' ');

                return (
                <div 
                  key={block.id} 
                  onFocus={() => setActiveBlockId(block.id)}
                  className="group relative flex flex-col gap-1 w-full p-1.5 rounded-2xl transition-all border border-transparent hover:border-white/5"
                >
                    {/* Floating Rich Formatting Toolbar when active block */}
                    {isActive && (
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#14141c]/95 border border-white/15 shadow-xl backdrop-blur-md overflow-x-auto no-scrollbar mb-1 animate-in fade-in duration-150 z-30">
                        {/* Block Type Selector */}
                        <div className="flex items-center gap-0.5 border-r border-white/10 pr-1 mr-1">
                          <button onClick={() => updateBlock(block.id, { type: 'text' })} className={`p-1.5 rounded-lg text-xs font-bold ${block.type === 'text' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/60 hover:text-white'}`} title="Texto"><Type size={13} /></button>
                          <button onClick={() => updateBlock(block.id, { type: 'h1' })} className={`p-1.5 rounded-lg text-xs font-bold ${block.type === 'h1' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/60 hover:text-white'}`} title="H1"><Heading1 size={13} /></button>
                          <button onClick={() => updateBlock(block.id, { type: 'h2' })} className={`p-1.5 rounded-lg text-xs font-bold ${block.type === 'h2' ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/60 hover:text-white'}`} title="H2"><Heading2 size={13} /></button>
                          <button onClick={() => updateBlock(block.id, { type: 'quote' })} className={`p-1.5 rounded-lg text-xs font-bold ${block.type === 'quote' ? 'bg-amber-500/20 text-amber-300' : 'text-white/60 hover:text-white'}`} title="Cita"><Quote size={13} /></button>
                          <button onClick={() => updateBlock(block.id, { type: 'code' })} className={`p-1.5 rounded-lg text-xs font-bold ${block.type === 'code' ? 'bg-purple-500/20 text-purple-300' : 'text-white/60 hover:text-white'}`} title="Código"><Code size={13} /></button>
                          <button onClick={() => updateBlock(block.id, { type: 'latex' })} className={`p-1.5 rounded-lg text-xs font-bold ${block.type === 'latex' ? 'bg-pink-500/20 text-pink-300' : 'text-white/60 hover:text-white'}`} title="LaTeX"><Binary size={13} /></button>
                          <button onClick={() => updateBlock(block.id, { type: 'callout' })} className={`p-1.5 rounded-lg text-xs font-bold ${block.type === 'callout' ? 'bg-blue-500/20 text-blue-300' : 'text-white/60 hover:text-white'}`} title="Callout"><AlertCircle size={13} /></button>
                        </div>

                        {/* Text Styling Toggles */}
                        <button onClick={() => updateBlock(block.id, { bold: !block.bold })} className={`p-1.5 rounded-lg text-xs ${block.bold ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`} title="Negrita"><Bold size={13} /></button>
                        <button onClick={() => updateBlock(block.id, { italic: !block.italic })} className={`p-1.5 rounded-lg text-xs ${block.italic ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`} title="Cursiva"><Italic size={13} /></button>
                        <button onClick={() => updateBlock(block.id, { underline: !block.underline })} className={`p-1.5 rounded-lg text-xs ${block.underline ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`} title="Subrayado"><Underline size={13} /></button>
                        <button onClick={() => updateBlock(block.id, { strikethrough: !block.strikethrough })} className={`p-1.5 rounded-lg text-xs ${block.strikethrough ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`} title="Tachado"><Strikethrough size={13} /></button>
                        <button onClick={() => updateBlock(block.id, { shadow: !block.shadow })} className={`p-1.5 rounded-lg text-xs ${block.shadow ? 'bg-amber-500/20 text-amber-300' : 'text-white/50 hover:text-white'}`} title="Sombra / Brillo"><Sparkles size={13} /></button>

                        {/* Color Picker palette */}
                        <div className="flex items-center gap-1 border-l border-white/10 pl-1 ml-1">
                          {TEXT_COLORS.map(c => (
                            <button
                              key={c.value}
                              onClick={() => updateBlock(block.id, { color: c.value })}
                              className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>

                        {/* Font Selector */}
                        <div className="flex items-center gap-1 border-l border-white/10 pl-1 ml-1">
                          {FONTS.map(f => (
                            <button
                              key={f.value}
                              onClick={() => updateBlock(block.id, { fontFamily: f.value })}
                              className={`px-1.5 py-0.5 rounded text-[10px] ${block.fontFamily === f.value ? 'bg-cyan-500/30 text-cyan-300' : 'text-white/40 hover:text-white'}`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        {/* Block Reordering & Delete */}
                        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1 ml-auto shrink-0">
                          <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 rounded text-white/40 hover:text-white disabled:opacity-20"><ChevronUp size={13} /></button>
                          <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-1 rounded text-white/40 hover:text-white disabled:opacity-20"><ChevronDown size={13} /></button>
                          <button onClick={() => removeBlock(block.id)} className="p-1 rounded text-red-400/60 hover:text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 w-full">
                      {/* Block Renderer */}
                      {block.type === 'text' && (
                          <textarea 
                              ref={el => { if (el) scheduleAdjustHeight(el) }}
                              value={block.content} 
                              onChange={(e) => { 
                                  updateBlock(block.id, { content: e.target.value });
                                  scheduleAdjustHeight(e.target);
                              }}  
                              placeholder="Escribe algo..." 
                              className={`w-full bg-transparent placeholder:text-white/20 resize-none outline-none leading-relaxed text-base sm:text-lg ${styleClasses}`} 
                              style={{ color: block.color || '#e2e8f0', minHeight: '1.8em', overflow: 'hidden' }}
                              readOnly={readOnly}
                          />
                      )}

                      {block.type === 'h1' && (
                          <textarea 
                              ref={el => { if (el) scheduleAdjustHeight(el) }}
                              value={block.content} 
                              onChange={(e) => { 
                                  updateBlock(block.id, { content: e.target.value });
                                  scheduleAdjustHeight(e.target);
                              }}  
                              placeholder="Título Principal..." 
                              className={`w-full bg-transparent font-black text-2xl sm:text-3xl placeholder:text-white/20 resize-none outline-none leading-tight tracking-tight ${styleClasses}`} 
                              style={{ color: block.color || '#ffffff', minHeight: '1.8em', overflow: 'hidden' }}
                              readOnly={readOnly}
                          />
                      )}

                      {block.type === 'h2' && (
                          <textarea 
                              ref={el => { if (el) scheduleAdjustHeight(el) }}
                              value={block.content} 
                              onChange={(e) => { 
                                  updateBlock(block.id, { content: e.target.value });
                                  scheduleAdjustHeight(e.target);
                              }}  
                              placeholder="Subtítulo..." 
                              className={`w-full bg-transparent font-bold text-xl sm:text-2xl placeholder:text-white/20 resize-none outline-none leading-tight ${styleClasses}`} 
                              style={{ color: block.color || '#f1f5f9', minHeight: '1.8em', overflow: 'hidden' }}
                              readOnly={readOnly}
                          />
                      )}

                      {block.type === 'h3' && (
                          <textarea 
                              ref={el => { if (el) scheduleAdjustHeight(el) }}
                              value={block.content} 
                              onChange={(e) => { 
                                  updateBlock(block.id, { content: e.target.value });
                                  scheduleAdjustHeight(e.target);
                              }}  
                              placeholder="Encabezado 3..." 
                              className={`w-full bg-transparent font-semibold text-lg sm:text-xl placeholder:text-white/20 resize-none outline-none leading-tight ${styleClasses}`} 
                              style={{ color: block.color || '#cbd5e1', minHeight: '1.8em', overflow: 'hidden' }}
                              readOnly={readOnly}
                          />
                      )}

                      {block.type === 'quote' && (
                          <div className="w-full border-l-4 border-amber-400 pl-4 py-1.5 bg-amber-500/5 rounded-r-2xl my-1">
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { 
                                    updateBlock(block.id, { content: e.target.value });
                                    scheduleAdjustHeight(e.target);
                                }}  
                                placeholder="Escribe una cita inspiradora..." 
                                className={`w-full bg-transparent italic text-amber-200/90 placeholder:text-amber-300/30 resize-none outline-none leading-relaxed text-base sm:text-lg ${styleClasses}`} 
                                style={{ color: block.color || undefined, minHeight: '1.8em', overflow: 'hidden' }}
                                readOnly={readOnly}
                            />
                          </div>
                      )}

                      {block.type === 'code' && (
                          <div className="w-full bg-[#0b0b10] border border-purple-500/30 rounded-2xl p-3 font-mono my-1 shadow-inner relative group/code">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400/60 mb-1 flex items-center justify-between select-none">
                              <span>💻 BLOQUE DE CÓDIGO</span>
                            </div>
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { 
                                    updateBlock(block.id, { content: e.target.value });
                                    scheduleAdjustHeight(e.target);
                                }}  
                                placeholder="// Escribe código o scripts aquí..." 
                                className={`w-full bg-transparent font-mono text-cyan-300 placeholder:text-purple-300/20 resize-none outline-none leading-relaxed text-xs sm:text-sm ${styleClasses}`} 
                                style={{ minHeight: '2.5em', overflow: 'hidden' }}
                                readOnly={readOnly}
                            />
                          </div>
                      )}

                      {block.type === 'latex' && (
                          <div className="w-full bg-[#0d0914] border border-pink-500/30 rounded-2xl p-3 font-mono my-1 shadow-inner relative">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-pink-400/60 mb-1 select-none flex items-center gap-1">
                              <Binary size={12} />
                              <span>FÓRMULA / FÍSICA / MATH (LaTeX)</span>
                            </div>
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { 
                                    updateBlock(block.id, { content: e.target.value });
                                    scheduleAdjustHeight(e.target);
                                }}  
                                placeholder="E = mc^2  ó  \int_0^\infty f(x) dx" 
                                className={`w-full bg-transparent font-mono text-pink-200 placeholder:text-pink-400/20 resize-none outline-none leading-relaxed text-sm sm:text-base ${styleClasses}`} 
                                style={{ minHeight: '2em', overflow: 'hidden' }}
                                readOnly={readOnly}
                            />
                          </div>
                      )}

                      {block.type === 'callout' && (
                          <div className="w-full bg-blue-500/10 border border-blue-500/25 rounded-2xl p-3.5 my-1 flex items-start gap-3 shadow-md">
                            <span className="text-xl shrink-0 select-none">💡</span>
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { 
                                    updateBlock(block.id, { content: e.target.value });
                                    scheduleAdjustHeight(e.target);
                                }}  
                                placeholder="Escribe un punto clave o aviso relevante..." 
                                className={`w-full bg-transparent text-blue-100 placeholder:text-blue-300/30 resize-none outline-none leading-relaxed text-sm sm:text-base font-medium ${styleClasses}`} 
                                style={{ color: block.color || undefined, minHeight: '1.8em', overflow: 'hidden' }}
                                readOnly={readOnly}
                            />
                          </div>
                      )}

                      {block.type === 'check' && (
                          <div className="flex items-start gap-3 w-full pt-1">
                              <button 
                                onClick={() => !readOnly && updateBlock(block.id, { checked: !block.checked })} 
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all mt-1 shrink-0 ${
                                  block.checked ? 'bg-cyan-500 border-cyan-400 text-black shadow-md' : 'border-white/30 bg-white/5 hover:border-white/60'
                                }`}
                              >
                                  {block.checked && <Check size={13} strokeWidth={3} />}
                              </button>
                              <textarea 
                                  ref={el => { if (el) scheduleAdjustHeight(el) }}
                                  value={block.content} 
                                  onChange={(e) => {
                                      updateBlock(block.id, { content: e.target.value });
                                      scheduleAdjustHeight(e.target);
                                  }} 
                                  className={`w-full bg-transparent resize-none outline-none text-base sm:text-lg transition-all leading-relaxed ${
                                    block.checked ? 'text-white/40 line-through' : 'text-white'
                                  } ${styleClasses}`}
                                  placeholder="Tarea o pendiente..."
                                  style={{ color: !block.checked && block.color ? block.color : undefined, minHeight: '1.8em', overflow: 'hidden' }}
                                  readOnly={readOnly}
                              />
                          </div>
                      )}

                      {block.type === 'image' && (
                          <div className="w-full rounded-2xl overflow-hidden bg-black/30 border border-white/10 relative group/img aspect-video shadow-md mt-1 mb-1">
                              {block.content ? (
                                  <img src={block.content} alt="Attachment" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                      <ImageIcon size={32} className="mb-2 opacity-50" />
                                      <span className="text-xs font-bold uppercase tracking-wider">URL / Imagen</span>
                                  </div>
                              )}
                          </div>
                      )}
                    </div>
                </div>
              );
            })}
        </div>
    );
});
