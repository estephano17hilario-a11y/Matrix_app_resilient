import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  Sigma, ListTodo, X, Palette,
  Heading1, Heading2, Heading3, MessageSquareQuote, Terminal, ChevronDown, AlignLeft, Sparkles
} from 'lucide-react';
import { NoteBlock } from '../../../types';

const EXPANDED_TEXT_COLORS = [
  { id: 'white', color: '#f8fafc', label: 'Blanco' },
  { id: 'cyan', color: '#06b6d4', label: 'Cian Neón' },
  { id: 'emerald', color: '#10b981', label: 'Esmeralda' },
  { id: 'amber', color: '#f59e0b', label: 'Ámbar' },
  { id: 'rose', color: '#f43f5e', label: 'Rosa Neón' },
  { id: 'purple', color: '#a855f7', label: 'Púrpura' },
  { id: 'blue', color: '#3b82f6', label: 'Azul Electrón' },
  { id: 'indigo', color: '#6366f1', label: 'Índigo' },
  { id: 'violet', color: '#8b5cf6', label: 'Violeta' },
  { id: 'yellow', color: '#eab308', label: 'Amarillo' },
  { id: 'orange', color: '#f97316', label: 'Naranja' },
  { id: 'red', color: '#ef4444', label: 'Rojo' },
  { id: 'lime', color: '#84cc16', label: 'Lima Neón' },
  { id: 'teal', color: '#14b8a6', label: 'Turquesa' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
  { id: 'slate', color: '#94a3b8', label: 'Gris Plata' }
];

const FONT_FAMILIES = [
  { id: 'Inter, sans-serif', label: 'Sans (Inter)' },
  { id: 'Georgia, serif', label: 'Serif (Georgia)' },
  { id: 'Courier New, monospace', label: 'Mono (Code)' },
  { id: 'Trebuchet MS, sans-serif', label: 'Display' },
  { id: 'cursive', label: 'Cursa (Handwritten)' }
];

export const BlockEditor = React.memo(({ blocks, onChange, readOnly = false }: { blocks: NoteBlock[], onChange: (blocks: NoteBlock[]) => void, readOnly?: boolean }) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
    const [showStyleMenu, setShowStyleMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeStyle, setActiveStyle] = useState<{ id: string, label: string }>({ id: 'text', label: 'Texto Normal' });
    const [customColor, setCustomColor] = useState('#06b6d4');
    const initializedRef = useRef(false);

    // Convert initial blocks to HTML string with clean markup & larger checkboxes
    const getInitialHtml = () => {
        if (!blocks || blocks.length === 0) return '<div><br></div>';
        return blocks.map(b => {
            const rawContent = b.content || '';
            if (b.type === 'check') {
                return `<div class="flex items-start gap-2.5 my-1.5 check-item"><input type="checkbox" class="w-5 h-5 rounded-md accent-cyan-400 cursor-pointer shrink-0 mt-0.5" ${b.checked ? 'checked' : ''} /><span>${rawContent || 'Nueva tarea'}</span></div>`;
            }
            if (b.type === 'image' && rawContent) {
                return `<div class="my-2 rounded-2xl overflow-hidden"><img src="${rawContent}" class="w-full rounded-2xl" /></div>`;
            }
            if (b.type === 'heading1') return `<h1>${rawContent || ''}</h1>`;
            if (b.type === 'heading2') return `<h2>${rawContent || ''}</h2>`;
            if (b.type === 'heading3') return `<h3>${rawContent || ''}</h3>`;
            if (b.type === 'quote') return `<blockquote class="pl-4 border-l-4 border-cyan-400 italic my-2 text-cyan-200/90">${rawContent || ''}</blockquote>`;
            if (b.type === 'code') return `<pre class="bg-black/60 p-3.5 rounded-xl border border-white/10 font-mono text-emerald-400 text-sm my-2 overflow-x-auto"><code>${rawContent || '// Escribe tu código aquí...'}</code></pre>`;
            if (b.type === 'latex') return `<div class="bg-purple-950/40 p-3 rounded-xl border border-purple-500/30 font-mono text-rose-300 my-2 latex-item flex items-center gap-2.5"><span class="px-2.5 py-1 rounded-md bg-purple-500/20 text-xs font-black text-rose-300 border border-purple-500/40 select-none shadow-sm">∑ LaTeX</span><span>${rawContent || 'E=mc^2'}</span></div>`;
            return `<div>${rawContent || ''}</div>`;
        }).join('');
    };

    // Initialize contentEditable DOM ONCE on mount
    useEffect(() => {
        if (editorRef.current && !initializedRef.current) {
            editorRef.current.innerHTML = getInitialHtml();
            initializedRef.current = true;
        }
    }, []);

    // Sync contentEditable edits back to blocks state without losing block types
    const handleContentChange = useCallback(() => {
        if (!editorRef.current) return;
        const currentHtml = editorRef.current.innerHTML;

        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHtml, 'text/html');
        const nodes = Array.from(doc.body.childNodes);

        const newBlocks: NoteBlock[] = nodes.map((node, index) => {
            const el = node as HTMLElement;
            const tag = el.tagName ? el.tagName.toUpperCase() : '';
            const isCheck = !!(el.querySelector?.('input[type="checkbox"]') || el.classList?.contains('check-item'));
            const isLatex = !!(el.classList?.contains('latex-item') || el.dataset?.type === 'latex' || (el.textContent && el.textContent.includes('∑ LaTeX')));

            let type: NoteBlock['type'] = 'text';
            if (isCheck) type = 'check';
            else if (isLatex) type = 'latex';
            else if (tag === 'H1') type = 'heading1';
            else if (tag === 'H2') type = 'heading2';
            else if (tag === 'H3') type = 'heading3';
            else if (tag === 'BLOCKQUOTE') type = 'quote';
            else if (tag === 'PRE' || tag === 'CODE') type = 'code';

            let content = el.innerHTML || el.textContent || '';
            if (isCheck) {
                const span = el.querySelector('span');
                content = span ? span.innerHTML : el.textContent?.replace(/[\r\n]+/g, '').trim() || '';
            } else if (isLatex) {
                const span = el.querySelector('span:last-child');
                content = span ? span.innerHTML : el.textContent?.replace('∑ LaTeX', '').trim() || '';
            } else if (type === 'code') {
                const codeEl = el.querySelector('code');
                content = codeEl ? codeEl.innerHTML : content;
            }

            return {
                id: (index + 1).toString(),
                type: type,
                content: content,
                checked: isCheck ? !!(el.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked : false
            };
        });

        onChange(newBlocks.length > 0 ? newBlocks : [{ id: Date.now().toString(), type: 'text', content: '' }]);
    }, [onChange]);

    // Helper to keep cursor (caret) active and visible at the end of an element
    const placeCaretAtEnd = (el: HTMLElement) => {
        el.focus();
        const sel = window.getSelection();
        if (!sel) return;
        const range = document.createRange();
        const target = el.querySelector('span') || el.querySelector('code') || el;
        range.selectNodeContents(target);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    };

    // Detect active block style of selected text / cursor position
    const updateActiveStyle = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        let node: Node | null = selection.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        
        let style = { id: 'text', label: 'Texto Normal' };
        while (node && node !== editorRef.current) {
            const el = node as HTMLElement;
            const tag = el.tagName ? el.tagName.toUpperCase() : '';
            if (tag === 'H1') { style = { id: 'h1', label: 'Título H1' }; break; }
            if (tag === 'H2') { style = { id: 'h2', label: 'Subtítulo H2' }; break; }
            if (tag === 'H3') { style = { id: 'h3', label: 'Encabezado H3' }; break; }
            if (tag === 'BLOCKQUOTE') { style = { id: 'quote', label: 'Cita Destacada' }; break; }
            if (tag === 'PRE' || tag === 'CODE') { style = { id: 'code', label: 'Bloque de Código' }; break; }
            if (el.querySelector?.('input[type="checkbox"]') || el.classList?.contains('check-item')) { style = { id: 'check', label: 'Lista de Tareas' }; break; }
            if (el.classList?.contains('latex-item')) { style = { id: 'latex', label: 'Fórmula (LaTeX)' }; break; }
            node = node.parentNode;
        }
        setActiveStyle(style);
    }, []);

    // Detect user text selection to trigger floating format bar
    const checkTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            setShowSelectionToolbar(true);
        } else {
            setShowSelectionToolbar(false);
        }
        updateActiveStyle();
    }, [updateActiveStyle]);

    // Inline format commands (bold, italic, color, etc.)
    const formatSelection = (command: string, value: string | null = null) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, value as any);
        handleContentChange();
    };

    // Clean block style replacement (Prevents stacking/accumulation of tags & preserves cursor)
    const applyBlockStyle = (targetType: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();

        const selection = window.getSelection();
        let selectedText = selection ? selection.toString().trim() : '';

        // Find parent block container element inside editorRef
        let targetNode: HTMLElement | null = null;
        if (selection && selection.rangeCount > 0) {
            let node: Node | null = selection.anchorNode;
            if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
            while (node && node !== editorRef.current && node.parentNode !== editorRef.current) {
                node = node.parentNode;
            }
            if (node && node !== editorRef.current) {
                targetNode = node as HTMLElement;
            }
        }

        if (!selectedText && targetNode) {
            selectedText = targetNode.textContent?.replace('∑ LaTeX', '').trim() || '';
        }

        const placeholderTexts = ['Nueva tarea', '// Escribe tu código aquí...', 'E=mc^2', 'Cita destacada...', 'Título H1', 'Subtítulo H2', 'Encabezado H3'];
        if (placeholderTexts.includes(selectedText)) {
            selectedText = '';
        }

        const contentText = selectedText || '';
        const tempDiv = document.createElement('div');

        if (targetType === 'text') {
            tempDiv.innerHTML = `<div>${contentText || '<br>'}</div>`;
        } else if (targetType === 'h1') {
            tempDiv.innerHTML = `<h1>${contentText || 'Título H1'}</h1>`;
        } else if (targetType === 'h2') {
            tempDiv.innerHTML = `<h2>${contentText || 'Subtítulo H2'}</h2>`;
        } else if (targetType === 'h3') {
            tempDiv.innerHTML = `<h3>${contentText || 'Encabezado H3'}</h3>`;
        } else if (targetType === 'quote') {
            tempDiv.innerHTML = `<blockquote class="pl-4 border-l-4 border-cyan-400 italic my-2 text-cyan-200/90">${contentText || 'Cita destacada...'}</blockquote>`;
        } else if (targetType === 'code') {
            tempDiv.innerHTML = `<pre class="bg-black/60 p-3.5 rounded-xl border border-white/10 font-mono text-emerald-400 text-sm my-2 overflow-x-auto"><code>${contentText || '// Escribe tu código aquí...'}</code></pre>`;
        } else if (targetType === 'check') {
            tempDiv.innerHTML = `<div class="flex items-start gap-2.5 my-1.5 check-item"><input type="checkbox" class="w-5 h-5 rounded-md accent-cyan-400 cursor-pointer shrink-0 mt-0.5" /><span>${contentText || 'Nueva tarea'}</span></div>`;
        } else if (targetType === 'latex') {
            tempDiv.innerHTML = `<div class="bg-purple-950/40 p-3 rounded-xl border border-purple-500/30 font-mono text-rose-300 my-2 latex-item flex items-center gap-2.5"><span class="px-2.5 py-1 rounded-md bg-purple-500/20 text-xs font-black text-rose-300 border border-purple-500/40 select-none shadow-sm">∑ LaTeX</span><span>${contentText || 'E=mc^2'}</span></div>`;
        }

        const newElement = tempDiv.firstElementChild as HTMLElement;

        if (targetNode && targetNode.parentNode === editorRef.current) {
            editorRef.current.replaceChild(newElement, targetNode);
        } else {
            document.execCommand('insertHTML', false, tempDiv.innerHTML);
        }

        handleContentChange();
        setShowStyleMenu(false);
        updateActiveStyle();
        
        // Preserve focus and caret cursor inside the new element
        if (newElement) {
            setTimeout(() => placeCaretAtEnd(newElement), 10);
        }
    };

    const applyTextColor = (color: string) => {
        formatSelection('foreColor', color);
    };

    const applyFontFamily = (font: string) => {
        formatSelection('fontName', font);
    };

    // Auto-select placeholder text on click so user can immediately replace it
    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const text = target.textContent?.trim();
        const placeholders = ['Nueva tarea', '// Escribe tu código aquí...', 'E=mc^2', 'Cita destacada...', 'Título H1', 'Subtítulo H2', 'Encabezado H3'];

        if (text && placeholders.includes(text)) {
            const range = document.createRange();
            range.selectNodeContents(target);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    };

    // KEY PRESS HANDLING (Enter inside checkbox creates NEW checkbox line directly below)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter') {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                let node: Node | null = selection.anchorNode;
                if (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
                let checkContainer: HTMLElement | null = null;
                while (node && node !== editorRef.current) {
                    const el = node as HTMLElement;
                    if (el.classList?.contains('check-item') || el.querySelector?.('input[type="checkbox"]')) {
                        checkContainer = el;
                        break;
                    }
                    node = node.parentNode;
                }

                if (checkContainer) {
                    e.preventDefault();
                    const newCheck = document.createElement('div');
                    newCheck.className = 'flex items-start gap-2.5 my-1.5 check-item';
                    newCheck.innerHTML = `<input type="checkbox" class="w-5 h-5 rounded-md accent-cyan-400 cursor-pointer shrink-0 mt-0.5" /><span><br></span>`;
                    
                    if (checkContainer.nextSibling) {
                        checkContainer.parentNode?.insertBefore(newCheck, checkContainer.nextSibling);
                    } else {
                        checkContainer.parentNode?.appendChild(newCheck);
                    }

                    const span = newCheck.querySelector('span');
                    if (span) {
                        placeCaretAtEnd(span);
                    }
                    handleContentChange();
                    return;
                }
            }

            setTimeout(() => {
                document.execCommand('removeFormat', false, undefined);
                document.execCommand('foreColor', false, '#f8fafc');
                handleContentChange();
            }, 10);
        }
    };

    return (
        <div className="relative flex flex-col gap-2 w-full min-h-[220px]">
            
            {/* FLOATING TEXT SELECTION FORMATTING TOOLBAR */}
            {showSelectionToolbar && !readOnly && (
                <div className="sticky top-2 z-[90] self-center my-2 bg-[#12121e]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-2 shadow-2xl flex items-center gap-2 flex-wrap animate-in zoom-in-95 duration-150 text-white max-w-full overflow-visible">
                    
                    {/* ACTIVE STYLE SWITCHER DROPDOWN */}
                    <div className="relative">
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setShowStyleMenu(prev => !prev); setShowColorPicker(false); }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black hover:bg-cyan-500/30 transition-colors"
                        >
                            <AlignLeft size={14} />
                            <span>{activeStyle.label}</span>
                            <ChevronDown size={12} />
                        </button>

                        {showStyleMenu && (
                            <div className="absolute left-0 top-full mt-1.5 w-52 bg-[#161626]/95 backdrop-blur-xl border border-white/20 rounded-2xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-[100] flex flex-col gap-1">
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('text'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left font-medium transition-colors ${activeStyle.id === 'text' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/10 text-white/90'}`}
                                >
                                    <AlignLeft size={14} className="text-white/60" />
                                    <span>Texto Normal</span>
                                </button>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('h1'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left font-bold transition-colors ${activeStyle.id === 'h1' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/10 text-white'}`}
                                >
                                    <Heading1 size={14} className="text-cyan-400" />
                                    <span>Título H1</span>
                                </button>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('h2'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left font-semibold transition-colors ${activeStyle.id === 'h2' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/10 text-white/90'}`}
                                >
                                    <Heading2 size={14} className="text-cyan-300" />
                                    <span>Subtítulo H2</span>
                                </button>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('h3'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left transition-colors ${activeStyle.id === 'h3' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/10 text-white/80'}`}
                                >
                                    <Heading3 size={14} className="text-cyan-200" />
                                    <span>Encabezado H3</span>
                                </button>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('check'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left transition-colors ${activeStyle.id === 'check' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/10 text-emerald-300'}`}
                                >
                                    <ListTodo size={14} className="text-emerald-400" />
                                    <span>Lista de Tareas (Check)</span>
                                </button>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('quote'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left italic transition-colors ${activeStyle.id === 'quote' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/10 text-cyan-200'}`}
                                >
                                    <MessageSquareQuote size={14} className="text-amber-400" />
                                    <span>Cita Destacada</span>
                                </button>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('code'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left font-mono transition-colors ${activeStyle.id === 'code' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/10 text-emerald-300'}`}
                                >
                                    <Terminal size={14} className="text-emerald-400" />
                                    <span>Bloque de Código</span>
                                </button>
                                <button 
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyBlockStyle('latex'); }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-left font-mono transition-colors ${activeStyle.id === 'latex' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/10 text-rose-300'}`}
                                >
                                    <Sigma size={14} className="text-rose-400" />
                                    <span>Fórmula (LaTeX)</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                    {/* Bold, Italic, Underline, Strikethrough */}
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('bold'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors font-bold"
                      title="Negrita"
                    >
                        <Bold size={14} />
                    </button>
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('italic'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors italic"
                      title="Cursiva"
                    >
                        <Italic size={14} />
                    </button>
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('underline'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors underline"
                      title="Subrayado"
                    >
                        <Underline size={14} />
                    </button>
                    <button 
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); formatSelection('strikeThrough'); }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors line-through"
                      title="Tachado"
                    >
                        <Strikethrough size={14} />
                    </button>

                    <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

                    {/* EXPANDED RICH COLOR SPECTRUM PICKER */}
                    <div className="relative">
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(prev => !prev); setShowStyleMenu(false); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-white/90 transition-colors"
                          title="Gama de Colores de Texto"
                        >
                            <Palette size={14} className="text-cyan-300" />
                            <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: customColor }} />
                            <ChevronDown size={10} />
                        </button>

                        {showColorPicker && (
                            <div className="absolute right-0 left-auto top-full mt-1.5 w-60 bg-[#161626]/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-[100] flex flex-col gap-2.5">
                                <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/40">Gama de Colores</div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {EXPANDED_TEXT_COLORS.map(tc => (
                                        <button
                                          key={tc.id}
                                          type="button"
                                          onMouseDown={(e) => { 
                                              e.preventDefault(); 
                                              setCustomColor(tc.color); 
                                              applyTextColor(tc.color);
                                              setShowColorPicker(false);
                                          }}
                                          className="flex flex-col items-center gap-1 p-1 rounded-xl hover:bg-white/10 transition-transform active:scale-95"
                                          title={tc.label}
                                        >
                                            <div className="w-5 h-5 rounded-full border border-white/30 shadow-md" style={{ backgroundColor: tc.color }} />
                                            <span className="text-[9px] text-white/60 truncate w-full text-center">{tc.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="w-full h-[1px] bg-white/10 my-0.5" />

                                {/* Custom Unlimited Spectrum Color Input */}
                                <label className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/10 text-xs font-bold text-cyan-300">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={13} />
                                        <span>Selector Personalizado</span>
                                    </div>
                                    <div className="relative w-6 h-6 rounded-full border border-white/40 shadow-inner overflow-hidden" style={{ backgroundColor: customColor }}>
                                        <input 
                                          type="color" 
                                          value={customColor} 
                                          onChange={(e) => {
                                              setCustomColor(e.target.value);
                                              applyTextColor(e.target.value);
                                          }}
                                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        />
                                    </div>
                                </label>
                            </div>
                        )}
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

            {/* CONTINUOUS WRITING CANVAS */}
            <div
                ref={editorRef}
                contentEditable={!readOnly}
                onInput={handleContentChange}
                onClick={handleEditorClick}
                onKeyDown={handleKeyDown}
                onMouseUp={checkTextSelection}
                onKeyUp={checkTextSelection}
                onTouchEnd={checkTextSelection}
                className="w-full min-h-[220px] bg-transparent text-slate-100 placeholder:text-slate-600 outline-none leading-relaxed text-base sm:text-lg custom-scrollbar selection:bg-cyan-500/30 selection:text-white [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-cyan-300 [&_h1]:my-3 [&_h1]:tracking-tight [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-cyan-200 [&_h2]:my-2.5 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-cyan-100 [&_h3]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:text-cyan-200/90 [&_pre]:bg-black/60 [&_pre]:p-3.5 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:font-mono [&_pre]:text-emerald-400 [&_pre]:text-sm [&_pre]:my-3"
                style={{ wordBreak: 'break-word' }}
            />
        </div>
    );
});
