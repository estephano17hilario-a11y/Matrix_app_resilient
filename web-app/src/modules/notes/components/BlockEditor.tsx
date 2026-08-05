import React, { useRef, useState } from 'react';
import { 
  Trash2, Check, ImageIcon, Bold, Italic, Underline, Strikethrough, 
  Sigma, Type, Sparkles, Heading1, Heading2, Heading3, 
  MessageSquareQuote, Terminal, ListTodo, Image as ImageLucide, PenTool, X
} from 'lucide-react';
import { NoteBlock } from '../../../types';
import { useTranslation } from 'react-i18next';

const TEXT_COLORS = [
  { id: 'default', color: '#f8fafc', label: 'Blanco' },
  { id: 'cyan', color: '#06b6d4', label: 'Cian Neón' },
  { id: 'emerald', color: '#10b981', label: 'Esmeralda' },
  { id: 'amber', color: '#f59e0b', label: 'Ámbar' },
  { id: 'rose', color: '#f43f5e', label: 'Rosa Neón' },
  { id: 'purple', color: '#a855f7', label: 'Púrpura' },
  { id: 'blue', color: '#3b82f6', label: 'Azul' },
  { id: 'yellow', color: '#eab308', label: 'Amarillo' },
  { id: 'slate', color: '#94a3b8', label: 'Gris' }
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
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);

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

    const handleSelectText = (e: React.SyntheticEvent<HTMLTextAreaElement>, blockId: string) => {
        const target = e.currentTarget;
        if (target.selectionStart !== target.selectionEnd) {
            setSelectedBlockId(blockId);
            setShowSelectionToolbar(true);
        }
    };

    if (blocks.length === 0 && !readOnly) {
        return (
             <div 
               className="min-h-[140px] flex items-start text-white/30 italic cursor-text pt-2" 
               onClick={() => onChange([{ id: Date.now().toString(), type: 'text', content: '' }])}
             >
                 {t('components.blockEditor.tapToWrite', 'Escribe algo...')}
             </div>
        );
    }

    const currentActiveBlock = blocks.find(b => b.id === selectedBlockId) || blocks[0];

    return (
        <div className="relative flex flex-col gap-2 w-full pb-16">
            
            {/* FLOATING TEXT SELECTION FORMATTING TOOLBAR (Appears ONLY when text is highlighted/selected) */}
            {showSelectionToolbar && currentActiveBlock && !readOnly && (
                <div className="sticky top-2 z-[90] self-center my-2 bg-[#12121e]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5 flex-wrap animate-in zoom-in-95 duration-150 text-white max-w-full overflow-x-auto">
                    {/* Style selector */}
                    <select
                      value={currentActiveBlock.type}
                      onChange={(e) => updateBlock(currentActiveBlock.id, { type: e.target.value as any })}
                      className="bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 rounded-lg px-2 py-1 text-[11px] outline-none cursor-pointer"
                    >
                        <option value="text" className="bg-slate-900 text-white">Texto</option>
                        <option value="heading1" className="bg-slate-900 text-white">Título H1</option>
                        <option value="heading2" className="bg-slate-900 text-white">Subtítulo H2</option>
                        <option value="heading3" className="bg-slate-900 text-white">Encabezado H3</option>
                        <option value="quote" className="bg-slate-900 text-white">Cita</option>
                        <option value="code" className="bg-slate-900 text-white">Código</option>
                        <option value="latex" className="bg-slate-900 text-white">LaTeX</option>
                        <option value="check" className="bg-slate-900 text-white">Checklist</option>
                    </select>

                    <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                    {/* Bold, Italic, Underline, Strikethrough, Glow */}
                    <button 
                      type="button"
                      onClick={() => updateBlock(currentActiveBlock.id, { isBold: !currentActiveBlock.isBold })}
                      className={`p-1.5 rounded-lg transition-colors ${currentActiveBlock.isBold ? 'bg-cyan-500/30 text-cyan-300 font-extrabold' : 'text-white/60 hover:text-white'}`}
                      title="Negrita"
                    >
                        <Bold size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateBlock(currentActiveBlock.id, { isItalic: !currentActiveBlock.isItalic })}
                      className={`p-1.5 rounded-lg transition-colors ${currentActiveBlock.isItalic ? 'bg-cyan-500/30 text-cyan-300' : 'text-white/60 hover:text-white'}`}
                      title="Cursiva"
                    >
                        <Italic size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateBlock(currentActiveBlock.id, { isUnderline: !currentActiveBlock.isUnderline })}
                      className={`p-1.5 rounded-lg transition-colors ${currentActiveBlock.isUnderline ? 'bg-cyan-500/30 text-cyan-300' : 'text-white/60 hover:text-white'}`}
                      title="Subrayado"
                    >
                        <Underline size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateBlock(currentActiveBlock.id, { isStrikethrough: !currentActiveBlock.isStrikethrough })}
                      className={`p-1.5 rounded-lg transition-colors ${currentActiveBlock.isStrikethrough ? 'bg-cyan-500/30 text-cyan-300' : 'text-white/60 hover:text-white'}`}
                      title="Tachado"
                    >
                        <Strikethrough size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateBlock(currentActiveBlock.id, { hasShadow: !currentActiveBlock.hasShadow })}
                      className={`p-1.5 rounded-lg transition-colors ${currentActiveBlock.hasShadow ? 'bg-cyan-500 text-black font-bold' : 'text-white/60 hover:text-white'}`}
                      title="Efecto Neón"
                    >
                        <Sparkles size={14} />
                    </button>

                    <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                    {/* Color palette */}
                    <div className="flex items-center gap-1">
                        {TEXT_COLORS.map(tc => (
                            <button
                              key={tc.id}
                              type="button"
                              onClick={() => updateBlock(currentActiveBlock.id, { color: tc.color })}
                              className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 border ${currentActiveBlock.color === tc.color ? 'ring-2 ring-white scale-110 border-white' : 'border-white/20'}`}
                              style={{ backgroundColor: tc.color }}
                              title={tc.label}
                            />
                        ))}
                    </div>

                    <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                    {/* Font Family */}
                    <select
                      value={currentActiveBlock.fontFamily || 'sans'}
                      onChange={(e) => updateBlock(currentActiveBlock.id, { fontFamily: e.target.value as any })}
                      className="bg-black/40 text-white/80 border border-white/10 rounded-lg px-2 py-1 text-[10px] outline-none cursor-pointer"
                    >
                        {FONT_FAMILIES.map(ff => (
                            <option key={ff.id} value={ff.id} className="bg-slate-900 text-white">{ff.label}</option>
                        ))}
                    </select>

                    <button 
                      type="button"
                      onClick={() => removeBlock(currentActiveBlock.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 ml-1"
                      title="Eliminar este texto"
                    >
                        <Trash2 size={14} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => setShowSelectionToolbar(false)}
                      className="p-1 text-white/40 hover:text-white ml-1"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* SEAMLESS CONTINUOUS WRITING CANVAS */}
            {blocks.map((block) => {
                const fontFamilyClass = FONT_FAMILIES.find(f => f.id === block.fontFamily)?.css || 'font-sans';
                const colorStyle = block.color && block.color !== 'default' ? { color: block.color } : undefined;

                let styleClasses = `${fontFamilyClass} `;
                if (block.isBold) styleClasses += 'font-extrabold ';
                if (block.isItalic) styleClasses += 'italic ';
                if (block.isUnderline) styleClasses += 'underline decoration-cyan-400 decoration-2 ';
                if (block.isStrikethrough) styleClasses += 'line-through opacity-60 ';
                if (block.hasShadow) styleClasses += 'drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] ';

                return (
                    <div key={block.id} className="w-full relative group">
                        {block.type === 'text' && (
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { 
                                    updateBlock(block.id, { content: e.target.value });
                                    scheduleAdjustHeight(e.target);
                                }}  
                                onSelect={(e) => handleSelectText(e, block.id)}
                                onInput={(e) => scheduleAdjustHeight(e.target as HTMLTextAreaElement)}
                                placeholder={t('components.blockEditor.typeSomething', 'Escribe algo...')} 
                                className={`w-full bg-transparent text-slate-100 placeholder:text-slate-600 resize-none outline-none leading-relaxed transition-all text-base sm:text-lg ${styleClasses}`}
                                style={{ minHeight: '1.8em', overflow: 'hidden', ...colorStyle }}
                                readOnly={readOnly}
                                rows={1}
                            />
                        )}

                        {block.type === 'heading1' && (
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { updateBlock(block.id, { content: e.target.value }); scheduleAdjustHeight(e.target); }}
                                onSelect={(e) => handleSelectText(e, block.id)}
                                placeholder="Título H1..." 
                                className={`w-full bg-transparent text-2xl sm:text-3xl font-black text-white leading-tight outline-none resize-none ${styleClasses}`}
                                style={{ minHeight: '1.8em', overflow: 'hidden', ...colorStyle }}
                                readOnly={readOnly}
                                rows={1}
                            />
                        )}

                        {block.type === 'heading2' && (
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { updateBlock(block.id, { content: e.target.value }); scheduleAdjustHeight(e.target); }}
                                onSelect={(e) => handleSelectText(e, block.id)}
                                placeholder="Subtítulo H2..." 
                                className={`w-full bg-transparent text-xl sm:text-2xl font-bold text-white/90 leading-tight outline-none resize-none ${styleClasses}`}
                                style={{ minHeight: '1.8em', overflow: 'hidden', ...colorStyle }}
                                readOnly={readOnly}
                                rows={1}
                            />
                        )}

                        {block.type === 'heading3' && (
                            <textarea 
                                ref={el => { if (el) scheduleAdjustHeight(el) }}
                                value={block.content} 
                                onChange={(e) => { updateBlock(block.id, { content: e.target.value }); scheduleAdjustHeight(e.target); }}
                                onSelect={(e) => handleSelectText(e, block.id)}
                                placeholder="Encabezado H3..." 
                                className={`w-full bg-transparent text-lg sm:text-xl font-semibold text-white/80 outline-none resize-none ${styleClasses}`}
                                style={{ minHeight: '1.8em', overflow: 'hidden', ...colorStyle }}
                                readOnly={readOnly}
                                rows={1}
                            />
                        )}

                        {block.type === 'quote' && (
                            <div className="pl-4 border-l-4 border-cyan-400 bg-white/[0.02] py-2 px-3 rounded-r-2xl italic my-1">
                                <textarea 
                                    ref={el => { if (el) scheduleAdjustHeight(el) }}
                                    value={block.content} 
                                    onChange={(e) => { updateBlock(block.id, { content: e.target.value }); scheduleAdjustHeight(e.target); }}
                                    onSelect={(e) => handleSelectText(e, block.id)}
                                    placeholder="Cita..." 
                                    className={`w-full bg-transparent text-lg italic text-cyan-200 outline-none resize-none ${styleClasses}`}
                                    style={{ minHeight: '1.8em', overflow: 'hidden', ...colorStyle }}
                                    readOnly={readOnly}
                                    rows={1}
                                />
                            </div>
                        )}

                        {block.type === 'code' && (
                            <div className="bg-[#0b0c10] border border-white/10 rounded-2xl p-3 font-mono text-xs text-emerald-300 my-1">
                                <textarea 
                                    ref={el => { if (el) scheduleAdjustHeight(el) }}
                                    value={block.content} 
                                    onChange={(e) => { updateBlock(block.id, { content: e.target.value }); scheduleAdjustHeight(e.target); }}
                                    onSelect={(e) => handleSelectText(e, block.id)}
                                    placeholder="// Código..." 
                                    className="w-full bg-transparent font-mono text-sm text-emerald-300 outline-none resize-none"
                                    style={{ minHeight: '1.8em', overflow: 'hidden' }}
                                    readOnly={readOnly}
                                    rows={1}
                                />
                            </div>
                        )}

                        {block.type === 'latex' && (
                            <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-3 font-mono text-xs text-rose-300 my-1 space-y-2">
                                <textarea 
                                    ref={el => { if (el) scheduleAdjustHeight(el) }}
                                    value={block.content} 
                                    onChange={(e) => { updateBlock(block.id, { content: e.target.value }); scheduleAdjustHeight(e.target); }}
                                    onSelect={(e) => handleSelectText(e, block.id)}
                                    placeholder="E=mc^2" 
                                    className="w-full bg-transparent font-mono text-sm text-rose-200 outline-none resize-none"
                                    style={{ minHeight: '1.8em', overflow: 'hidden' }}
                                    readOnly={readOnly}
                                    rows={1}
                                />
                                {block.content && (
                                    <div className="p-2 rounded-xl bg-black/40 text-center font-serif text-base text-amber-300 tracking-widest">
                                        $$\ {block.content}\ $$
                                    </div>
                                )}
                            </div>
                        )}

                        {block.type === 'check' && (
                            <div className="flex items-start gap-3 w-full my-1">
                                <button 
                                  type="button"
                                  onClick={() => !readOnly && updateBlock(block.id, { checked: !block.checked })} 
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-1 shrink-0 ${block.checked ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-white/30 bg-transparent'}`}
                                >
                                    {block.checked && <Check size={12} strokeWidth={3} />}
                                </button>
                                <textarea 
                                    ref={el => { if (el) scheduleAdjustHeight(el) }}
                                    value={block.content} 
                                    onChange={(e) => { updateBlock(block.id, { content: e.target.value }); scheduleAdjustHeight(e.target); }}
                                    onSelect={(e) => handleSelectText(e, block.id)}
                                    placeholder="Lista de tarea..." 
                                    className={`w-full bg-transparent text-base outline-none resize-none ${block.checked ? 'line-through text-white/40' : 'text-slate-100'} ${styleClasses}`}
                                    style={{ minHeight: '1.8em', overflow: 'hidden', ...colorStyle }}
                                    readOnly={readOnly}
                                    rows={1}
                                />
                            </div>
                        )}

                        {block.type === 'image' && (
                            <div className="w-full rounded-2xl overflow-hidden bg-black/20 border border-white/10 relative aspect-video my-2">
                                {block.content ? (
                                    <img src={block.content} alt="Attachment" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
                                        <ImageIcon size={32} className="mb-1" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Imagen</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* FLOATING CARD BOTTOM CONTROL PILL (Matching the exact floating bottom pill in the user's screenshot: list, image, pen) */}
            {!readOnly && (
                <div className="sticky bottom-2 z-[80] self-center mt-4 bg-[#141420]/90 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 shadow-2xl flex items-center gap-4 text-white/70">
                    <button
                      type="button"
                      onClick={() => onChange([...blocks, { id: Date.now().toString(), type: 'check', content: '' }])}
                      className="hover:text-cyan-400 p-1.5 transition-colors"
                      title="Agregar Lista de Tareas"
                    >
                        <ListTodo size={18} />
                    </button>
                    <div className="w-[1px] h-4 bg-white/15" />
                    <button
                      type="button"
                      onClick={() => onChange([...blocks, { id: Date.now().toString(), type: 'image', content: '' }])}
                      className="hover:text-cyan-400 p-1.5 transition-colors"
                      title="Agregar Imagen"
                    >
                        <ImageLucide size={18} />
                    </button>
                    <div className="w-[1px] h-4 bg-white/15" />
                    <button
                      type="button"
                      onClick={() => setShowSelectionToolbar(!showSelectionToolbar)}
                      className={`p-1.5 transition-colors ${showSelectionToolbar ? 'text-cyan-400' : 'hover:text-cyan-400'}`}
                      title="Barra de Formato de Texto"
                    >
                        <PenTool size={18} />
                    </button>
                </div>
            )}
        </div>
    );
});
