import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Project } from '../../../types';
import { useTranslation } from 'react-i18next';

// Moved constants here or import them if they are shared
export const NOTE_THEMES = [
 { id: 'slate', color: '#64748b' },
 { id: 'red', color: '#ef4444' },
 { id: 'orange', color: '#f97316' },
 { id: 'amber', color: '#f59e0b' },
 { id: 'green', color: '#10b981' },
 { id: 'cyan', color: '#06b6d4' },
 { id: 'blue', color: '#3b82f6' },
 { id: 'indigo', color: '#6366f1' },
 { id: 'purple', color: '#8b5cf6' },
 { id: 'pink', color: '#ec4899' },
];

export const DropdownThemePicker = ({ currentTheme, onSelect, projects, activeProject, onSelectProject }: { currentTheme: string, onSelect: (id: string) => void, projects: Project[] | null, activeProject: string | undefined, onSelectProject: (id: string | undefined) => void }) => {
 const { t } = useTranslation();
 const [isOpen, setIsOpen] = useState(false);
 const activeColor = NOTE_THEMES.find(t => t.id === currentTheme)?.color || '#fff';
 
 return (
 <div className="relative z-50 shrink-0">
 <button 
   onClick={() => setIsOpen(!isOpen)} 
   className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 transition-all flex items-center justify-center shrink-0 active:scale-95"
   title="Seleccionar Color de la Nota"
 >
   <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeColor, color: activeColor }} />
 </button>
 
 {createPortal(
 <AnimatePresence>
 {isOpen && (
 <>
 <motion.div 
 key="backdrop"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs"
 onClick={() => setIsOpen(false)} 
 />
 <motion.div 
 key="modal"
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ type: "spring", stiffness: 450, damping: 25 }}
 className="
 fixed inset-0 m-auto w-72 h-fit origin-center
 bg-[#111]/95 border border-white/10 shadow-2xl
 rounded-2xl p-4 z-[2010] flex flex-col gap-4
 "
 >
 <div>
 <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block">{t('notes.colorTag', 'Color Tag')}</span>
 <div className="grid grid-cols-5 gap-2 justify-items-center">
 {NOTE_THEMES.map(t => (
 <button 
 key={t.id} 
 onClick={() => { onSelect(t.id); }} 
 className={`
 w-9 h-9 rounded-full transition-all duration-200 relative flex items-center justify-center
 ${currentTheme === t.id ? 'scale-110 ring-2 ring-white/20 shadow-lg' : 'hover:scale-110 opacity-70 hover:opacity-100'}
 `} 
 style={{ backgroundColor: t.color }} 
 >
 {currentTheme === t.id && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
 </button>
 ))}
 </div>
 </div>
 {projects && (
 <div>
 <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block">{t('notes.linkProject', 'Link Project')}</span>
 <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar pr-1">
 <button onClick={() => { onSelectProject(undefined); setIsOpen(false); }} className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-3 ${!activeProject ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
 <div className="w-2 h-2 rounded-full bg-slate-500" /> {t('common.none', 'None')}
 </button>
 {projects.map((p) => (
 <button key={p.id} onClick={() => { onSelectProject(p.id); setIsOpen(false); }} className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-3 ${activeProject === p.id ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
 <div className="w-2 h-2 rounded-full bg-blue-500" /> {p.title}
 </button>
 ))}
 </div>
 </div>
 )}
 </motion.div>
 </>
 )}
 </AnimatePresence>,
 document.body
 )}
 </div>
 );
};
