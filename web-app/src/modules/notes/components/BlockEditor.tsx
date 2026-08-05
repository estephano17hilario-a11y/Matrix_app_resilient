import React, { useRef, useState, useEffect } from 'react';
import { 
  Trash2, Check, ImageIcon, Bold, Italic, Underline, Strikethrough, 
  Sigma, Sparkles, ListTodo, Image as ImageLucide, PenTool, X, Palette
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
  { id: 'red', color: '#ef4444', label: 'Rojo' },
  { id: 'slate', color: '#94a3b8', label: 'Gris' }
];

const FONT_FAMILIES = [
  { id: 'Inter, sans-serif', label: 'Sans (Inter)' },
  { id: 'Georgia, serif', label: 'Serif (Georgia)' },
  { id: 'Courier New, monospace', label: 'Mono (Code)' },
  { id: 'Trebuchet MS, sans-serif', label: 'Display' },
  { id: 'cursive', label: 'Cursa (Handwritten)' }
];

export const BlockEditor = React.memo(({ blocks, onChange, readOnly = false }: { blocks: NoteBlock[], onChange: (blocks: NoteBlock[]) => void, readOnly?: boolean }) => {
    const { t } = useTranslation();
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
    const [customColor, setCustomColor] = useState('#06b6d4');
    const initializedRef = useRef(false);

    // Convert initial blocks to HTML string
    const getInitialHtml = () => {
        if (!blocks || blocks.length === 0) return '<div><br></div>';
        return blocks.map(b => {
            if (b.type === 'check') {
                return `<div class="flex items-start gap-2 my-1"><input type="checkbox" ${b.checked ? 'checked' : ''} /><span>${b.content || ''}</span></div>`;
            }
            if (b.type === 'image' && b.content) {
                return `<div class="my-2 rounded-2xl overflow-hidden"><img src="${b.content}" class="w-full rounded-2xl" /></div>`;
            }
            return `<div>${b.content || ''}</div>`;
        }).join('');
    };

    // Initialize contentEditable DOM ONCE on mount (prevents caret jumping to start on typing)
    useEffect(() => {
        if (editorRef.current && !initializedRef.current) {
            editorRef.current.innerHTML = getInitialHtml();
            initializedRef.current = true;
        }
    }, []);

    // Sync contentEditable edits back to blocks state without resetting DOM
    const handleContentChange = () => {
        if (!editorRef.current) return;
        const currentHtml = editorRef.current.innerHTML;

        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHtml, 'text/html');
        const nodes = Array.from(doc.body.childNodes);

        const newBlocks: NoteBlock[] = nodes.map((node, index) => {
            const el = node as HTMLElement;
            const content = el.innerHTML || el.textContent || '';
            const isCheck = el.querySelector?.('input[type="checkbox"]');
            
            return {
                id: (index + 1).toString(),
                type: isCheck ? 'check' : 'text',
                content: content,
                checked: isCheck ? (isCheck as HTMLInputElement).checked : false
            };
        });

        onChange(newBlocks.length > 0 ? newBlocks : [{ id: Date.now().toString(), type: 'text', content: '' }]);
    };

    // Detect user text selection to trigger floating format bar ONLY on selection
    const checkTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            setShowSelectionToolbar(true);
        } else {
            setShowSelectionToolbar(false);
        }
    };

    // Format commands that apply ONLY to the selected text range
    const formatSelection = (command: string, value: string | null = null) => {
        document.execCommand(command, false, value as any);
        handleContentChange();
    };

    const applyTextColor = (color: string) => {
        formatSelection('foreColor', color);
    };

    const applyFontFamily = (font: string) => {
        formatSelection('fontName', font);
    };

    const addChecklistItem = () => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        formatSelection('insertHTML', '<div class="flex items-start gap-2 my-1"><input type="checkbox" /> <span>Elemento de lista</span></div><div><br></div>');
    };

    const addImageBlock = () => {
        const url = window.prompt('URL de la imagen:');
        if (url && editorRef.current) {
            editorRef.current.focus();
            formatSelection('insertHTML', `<div class="my-2 rounded-2xl overflow-hidden"><img src="${url}" class="w-full rounded-2xl" /></div><div><br></div>`);
        }
    };

    return (
        <div className="relative flex flex-col gap-2 w-full min-h-[220px]">
            
            {/* FLOATING TEXT SELECTION FORMATTING TOOLBAR (Appears ONLY when text is highlighted/selected) */}
            {showSelectionToolbar && !readOnly && (
                <div className="sticky top-2 z-[90] self-center my-2 bg-[#12121e]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5 flex-wrap animate-in zoom-in-95 duration-150 text-white max-w-full overflow-x-auto">
                    {/* Bold, Italic, Underline, Strikethrough */}
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('bold'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      title="Negrita"
                    >
                        <Bold size={14} />
                    </button>
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('italic'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      title="Cursiva"
                    >
                        <Italic size={14} />
                    </button>
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('underline'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      title="Subrayado"
                    >
                        <Underline size={14} />
                    </button>
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('strikeThrough'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      title="Tachado"
                    >
                        <Strikethrough size={14} />
                    </button>

                    <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                    {/* Quick Color Palette */}
                    <div className="flex items-center gap-1">
                        {TEXT_COLORS.map(tc => (
                            <button
                              key={tc.id}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); applyTextColor(tc.color); }}
                              className="w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 border border-white/20"
                              style={{ backgroundColor: tc.color }}
                              title={tc.label}
                            />
                        ))}

                        {/* Custom Color Picker Input */}
                        <label className="relative cursor-pointer p-1 hover:bg-white/10 rounded-lg flex items-center" title="Color personalizado">
                            <Palette size={13} className="text-cyan-300" />
                            <input 
                              type="color" 
                              value={customColor} 
                              onChange={(e) => { setCustomColor(e.target.value); applyTextColor(e.target.value); }}
                              className="absolute opacity-0 w-full h-full cursor-pointer" 
                            />
                        </label>
                    </div>

                    <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                    {/* Font Family Selector */}
                    <select
                      onChange={(e) => applyFontFamily(e.target.value)}
                      className="bg-black/40 text-white/80 border border-white/10 rounded-lg px-2 py-1 text-[10px] outline-none cursor-pointer"
                    >
                        {FONT_FAMILIES.map(ff => (
                            <option key={ff.id} value={ff.id} className="bg-slate-900 text-white">{ff.label}</option>
                        ))}
                    </select>

                    <button 
                      type="button"
                      onClick={() => setShowSelectionToolbar(false)}
                      className="p-1 text-white/40 hover:text-white ml-1"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* UNCONTROLLED CONTINUOUS WRITING CANVAS (Fixes caret positioning) */}
            <div
                ref={editorRef}
                contentEditable={!readOnly}
                onInput={handleContentChange}
                onMouseUp={checkTextSelection}
                onKeyUp={checkTextSelection}
                onTouchEnd={checkTextSelection}
                className="w-full min-h-[180px] bg-transparent text-slate-100 placeholder:text-slate-600 outline-none leading-relaxed text-base sm:text-lg custom-scrollbar selection:bg-cyan-500/30 selection:text-white"
                style={{ wordBreak: 'break-word' }}
            />

            {/* FLOATING CARD BOTTOM CONTROL PILL */}
            {!readOnly && (
                <div className="sticky bottom-2 z-[80] self-center mt-4 bg-[#141420]/90 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 shadow-2xl flex items-center gap-4 text-white/70">
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="hover:text-cyan-400 p-1.5 transition-colors"
                      title="Agregar Lista de Tareas"
                    >
                        <ListTodo size={18} />
                    </button>
                    <div className="w-[1px] h-4 bg-white/15" />
                    <button
                      type="button"
                      onClick={addImageBlock}
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
