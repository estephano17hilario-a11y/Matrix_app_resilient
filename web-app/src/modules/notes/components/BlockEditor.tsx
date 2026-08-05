import React, { useRef, useState } from 'react';
import { 
  Trash2, Check, ImageIcon, Bold, Italic, Underline, Strikethrough, 
  Sigma, Type, Sparkles, Heading1, Heading2, Heading3, 
  MessageSquareQuote, Terminal, ChevronDown
} from 'lucide-react';
import { NoteBlock } from '../../../types';
import { useTranslation } from 'react-i18next';

const TEXT_COLORS = [
  { id: 'default', color: '#f8fafc', label: 'Blanco / Normal' },
  { id: 'cyan', color: '#06b6d4', label: 'Cian Neón' },
  { id: 'emerald', color: '#10b981', label: 'Esmeralda' },
  { id: 'amber', color: '#f59e0b', label: 'Ámbar' },
  { id: 'rose', color: '#f43f5e', label: 'Rosa Neón' },
  { id: 'purple', color: '#a855f7', label: 'Púrpura' },
  { id: 'blue', color: '#3b82f6', label: 'Azul Eléctrico' },
  { id: 'yellow', color: '#eab308', label: 'Amarillo Sol' },
  { id: 'slate', color: '#94a3b8', label: 'Gris Atenuado' }
];

const FONT_FAMILIES = [
  { id: 'sans', label: 'Sans (Inter)', css: 'font-sans' },
  { id: 'serif', label: 'Serif (Georgia)', css: 'font-serif' },
  { id: 'mono', label: 'Mono (Code)', css: 'font-mono' },
  { id: 'display', label: 'Display (Cyber)', css: 'font-mono tracking-wider font-extrabold uppercase' },
  { id: 'handwriting', label: 'Cursa (Handwritten)', css: 'font-serif italic' }
];

export const BlockEditor = React.memo(({ blocks, onChange, readOnly = false }: { blocks: NoteBlock[], onChange: (blocks: NoteBlock[]) => void, readOnly?: boolean }) => {
    const { t } = useTranslation();
    const heightRaf = useRef<number | null>(null);
    const [activeBlockMenu, setActiveBlockMenu] = useState<string | null>(null);

    const updateBlock = (id: string, updates: Partial<NoteBlock>) => {
        onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeBlock = (id: string) => {
        onChange(blocks.filter(b => b.id !== id));
    };

    const scheduleAdjustHeight = (el: HTMLTextAreaElement) => {
        if (heightRaf.current) cancelAnimationFrame(heightRaf.current);
        heightRaf.current = requestAnimationFrame(() => {
            el.style.height = 'auto';
            el.style.height = (el.scrollHeight || 32) + 'px';
        });
    };

    if (blocks.length === 0 && !readOnly) {
        return (
             <div 
               className="h-40 flex items-center justify-center text-white/30 italic cursor-text rounded-2xl border border-dashed border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.02] transition-all" 
               onClick={() => onChange([{ id: Date.now().toString(), type: 'text', content: '' }])}
             >
                 {t('components.blockEditor.tapToWrite', 'Haz toque aquí para comenzar a escribir...')}
             </div>
        );
    }

    const renderFormattedTextarea = (block: NoteBlock, placeholder: string, defaultClass = '') => {
        const fontFamilyClass = FONT_FAMILIES.find(f => f.id === block.fontFamily)?.css || 'font-sans';
        const colorStyle = block.color && block.color !== 'default' ? { color: block.color } : undefined;

        let styleClasses = `${defaultClass} ${fontFamilyClass} `;
        if (block.isBold) styleClasses += 'font-extrabold ';
        if (block.isItalic) styleClasses += 'italic ';
        if (block.isUnderline) styleClasses += 'underline decoration-cyan-400 decoration-2 ';
        if (block.isStrikethrough) styleClasses += 'line-through opacity-60 ';
        if (block.hasShadow) styleClasses += 'drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] ';

        return (
            <textarea 
                ref={el => { if (el) scheduleAdjustHeight(el) }}
                value={block.content} 
                onChange={(e) => { 
                    updateBlock(block.id, { content: e.target.value });
                    scheduleAdjustHeight(e.target);
                }}  
                onInput={(e) => scheduleAdjustHeight(e.target as HTMLTextAreaElement)}
                placeholder={placeholder} 
                className={`w-full bg-transparent text-slate-100 placeholder:text-slate-600 resize-none outline-none leading-relaxed transition-all ${styleClasses}`}
                style={{ minHeight: '1.8em', overflow: 'hidden', ...colorStyle }}
                readOnly={readOnly}
                rows={1}
            />
        );
    };

    return (
        <div className="flex flex-col gap-3 w-full pb-24">
            {blocks.map((block) => {
                const isMenuOpen = activeBlockMenu === block.id;

                return (
                    <div key={block.id} className="group relative flex flex-col gap-1.5 editor-line p-2 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                        
                        {/* Formatting Quick Bar for Active Block (Only when editing) */}
                        {!readOnly && (
                            <div className="flex items-center justify-between gap-1 opacity-80 group-hover:opacity-100 transition-opacity bg-white/[0.04] backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs shadow-sm mb-1 overflow-x-auto no-scrollbar">
                                <div className="flex items-center gap-1">
                                    {/* Block Type Dropdown Toggle */}
                                    <button 
                                      type="button"
                                      onClick={() => setActiveBlockMenu(isMenuOpen ? null : block.id)}
                                      className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] flex items-center gap-1 border border-cyan-500/30"
                                      title="Cambiar tipo de bloque"
                                    >
                                        <span className="capitalize">{block.type === 'heading1' ? 'Título H1' : block.type === 'heading2' ? 'Subtítulo H2' : block.type === 'heading3' ? 'Encabezado H3' : block.type === 'quote' ? 'Cita' : block.type === 'code' ? 'Código' : block.type === 'latex' ? 'LaTeX' : block.type === 'callout' ? 'Callout' : block.type === 'check' ? 'Lista Check' : 'Texto'}</span>
                                        <ChevronDown size={12} />
                                    </button>

                                    <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                    {/* Format Toggles */}
                                    <button 
                                      type="button"
                                      onClick={() => updateBlock(block.id, { isBold: !block.isBold })}
                                      className={`p-1.5 rounded-md transition-colors ${block.isBold ? 'bg-white/20 text-cyan-400 font-black' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                      title="Negrita (Bold)"
                                    >
                                        <Bold size={13} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => updateBlock(block.id, { isItalic: !block.isItalic })}
                                      className={`p-1.5 rounded-md transition-colors ${block.isItalic ? 'bg-white/20 text-cyan-400' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                      title="Cursiva (Italic)"
                                    >
                                        <Italic size={13} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => updateBlock(block.id, { isUnderline: !block.isUnderline })}
                                      className={`p-1.5 rounded-md transition-colors ${block.isUnderline ? 'bg-white/20 text-cyan-400' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                      title="Subrayado (Underline)"
                                    >
                                        <Underline size={13} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => updateBlock(block.id, { isStrikethrough: !block.isStrikethrough })}
                                      className={`p-1.5 rounded-md transition-colors ${block.isStrikethrough ? 'bg-white/20 text-cyan-400' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                      title="Tachado (Strikethrough)"
                                    >
                                        <Strikethrough size={13} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => updateBlock(block.id, { hasShadow: !block.hasShadow })}
                                      className={`p-1.5 rounded-md transition-colors ${block.hasShadow ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-400/50' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                      title="Efecto Sombra Neón (Neon Glow)"
                                    >
                                        <Sparkles size={13} />
                                    </button>

                                    <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                    {/* Text Color Picker */}
                                    <div className="flex items-center gap-1">
                                        {TEXT_COLORS.slice(0, 6).map(tc => (
                                            <button
                                              key={tc.id}
                                              type="button"
                                              onClick={() => updateBlock(block.id, { color: tc.color })}
                                              className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${block.color === tc.color ? 'ring-2 ring-white scale-110 border-white' : 'border-white/20'}`}
                                              style={{ backgroundColor: tc.color }}
                                              title={tc.label}
                                            />
                                        ))}
                                    </div>

                                    <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                    {/* Font Picker */}
                                    <select
                                      value={block.fontFamily || 'sans'}
                                      onChange={(e) => updateBlock(block.id, { fontFamily: e.target.value as any })}
                                      className="bg-black/40 text-white/80 border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] outline-none cursor-pointer"
                                    >
                                        {FONT_FAMILIES.map(ff => (
                                            <option key={ff.id} value={ff.id} className="bg-slate-900 text-white">{ff.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <button 
                                  type="button"
                                  onClick={() => removeBlock(block.id)} 
                                  className="text-white/40 hover:text-red-400 p-1 transition-colors ml-auto"
                                  title="Eliminar bloque"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        )}

                        {/* Block Type Switcher Popup Modal / Menu */}
                        {isMenuOpen && !readOnly && (
                            <div className="p-3 bg-[#13131c] border border-white/15 rounded-2xl shadow-2xl grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs mb-2 z-20 animate-in zoom-in-95 duration-150">
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'text' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Type size={16} className="text-cyan-400" />
                                    <span className="text-[10px] font-bold">Texto</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'heading1' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Heading1 size={16} className="text-blue-400" />
                                    <span className="text-[10px] font-bold">Título H1</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'heading2' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Heading2 size={16} className="text-purple-400" />
                                    <span className="text-[10px] font-bold">Subtítulo H2</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'heading3' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Heading3 size={16} className="text-pink-400" />
                                    <span className="text-[10px] font-bold">Encabezado H3</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'quote' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <MessageSquareQuote size={16} className="text-amber-400" />
                                    <span className="text-[10px] font-bold">Cita</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'code' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Terminal size={16} className="text-emerald-400" />
                                    <span className="text-[10px] font-bold">Código</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'latex' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Sigma size={16} className="text-rose-400" />
                                    <span className="text-[10px] font-bold">LaTeX</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'callout' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Sparkles size={16} className="text-yellow-400" />
                                    <span className="text-[10px] font-bold">Callout</span>
                                </button>
                                <button type="button" onClick={() => { updateBlock(block.id, { type: 'check' }); setActiveBlockMenu(null); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex flex-col items-center gap-1">
                                    <Check size={16} className="text-emerald-400" />
                                    <span className="text-[10px] font-bold">Checklist</span>
                                </button>
                            </div>
                        )}

                        {/* Render Block by Type */}
                        {block.type === 'text' && renderFormattedTextarea(block, t('components.blockEditor.typeSomething', 'Escribe tu nota aquí...'), 'text-[17px]')}

                        {block.type === 'heading1' && renderFormattedTextarea(block, 'Título Grande (H1)...', 'text-3xl font-black tracking-tight text-white')}

                        {block.type === 'heading2' && renderFormattedTextarea(block, 'Subtítulo (H2)...', 'text-2xl font-bold tracking-tight text-white/90')}

                        {block.type === 'heading3' && renderFormattedTextarea(block, 'Encabezado (H3)...', 'text-xl font-semibold tracking-wide text-white/80')}

                        {block.type === 'quote' && (
                            <div className="pl-4 border-l-4 border-cyan-400/80 bg-white/[0.02] py-2 px-3 rounded-r-2xl italic">
                                {renderFormattedTextarea(block, 'Escribe una cita inspiradora...', 'text-lg italic text-cyan-200/90')}
                            </div>
                        )}

                        {block.type === 'code' && (
                            <div className="bg-[#0b0c10] border border-white/10 rounded-2xl p-3 font-mono text-xs text-cyan-300 shadow-inner">
                                <div className="flex items-center justify-between text-[10px] text-white/40 border-b border-white/5 pb-1.5 mb-2 font-sans">
                                    <span className="flex items-center gap-1"><Terminal size={12} className="text-emerald-400" /> CÓDIGO</span>
                                    <span>UTF-8</span>
                                </div>
                                {renderFormattedTextarea(block, '// Código Javascript, Python, CSS...', 'font-mono text-sm text-emerald-300')}
                            </div>
                        )}

                        {block.type === 'latex' && (
                            <div className="bg-gradient-to-r from-purple-950/40 to-slate-900/60 border border-purple-500/30 rounded-2xl p-4 shadow-lg space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-widest border-b border-purple-500/20 pb-2">
                                    <Sigma size={16} className="text-rose-400" />
                                    <span>Fórmula Matemática (LaTeX)</span>
                                </div>
                                {renderFormattedTextarea(block, 'E=mc^2 o \\int_0^\\infty f(x)dx', 'font-mono text-base text-rose-200')}
                                {block.content && (
                                    <div className="p-3 rounded-xl bg-black/40 border border-purple-500/20 text-center font-serif text-lg text-amber-300 tracking-widest shadow-inner">
                                        <span className="text-[10px] text-white/30 font-sans block mb-1">PREVIEW MATEMÁTICO</span>
                                        $$\ {block.content}\ $$
                                    </div>
                                )}
                            </div>
                        )}

                        {block.type === 'callout' && (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 shadow-md">
                                <span className="text-2xl shrink-0 select-none">💡</span>
                                <div className="flex-1 min-w-0">
                                    {renderFormattedTextarea(block, 'Nota destacada o idea clave...', 'text-base font-semibold text-amber-200')}
                                </div>
                            </div>
                        )}

                        {block.type === 'check' && (
                            <div className="flex items-start gap-3 w-full group/check pt-1">
                                <button 
                                  onClick={() => !readOnly && updateBlock(block.id, { checked: !block.checked })} 
                                  className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all mt-1 flex-shrink-0 ${block.checked ? 'bg-cyan-500 border-cyan-500' : 'border-white/30 bg-transparent group-hover/check:border-white/60'}`}
                                >
                                    {block.checked && <Check size={12} className="text-black" strokeWidth={3} />}
                                </button>
                                <div className="flex-1">
                                    {renderFormattedTextarea(block, t('components.blockEditor.todoItem', 'Elemento de lista...'), block.checked ? 'line-through text-white/40' : 'text-slate-100')}
                                </div>
                            </div>
                        )}

                        {block.type === 'image' && (
                            <div className="w-full rounded-2xl overflow-hidden bg-black/20 border border-white/10 relative group/img aspect-video shadow-sm mt-2 mb-2">
                                {block.content ? (
                                    <img src={block.content} alt="Attachment" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50">
                                        <ImageIcon size={32} className="mb-2" />
                                        <span className="text-xs font-bold uppercase tracking-wider">{t('components.blockEditor.imagePlaceholder')}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
