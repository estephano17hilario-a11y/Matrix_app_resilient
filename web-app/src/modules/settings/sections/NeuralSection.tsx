import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Hexagon, Edit3, Check, X, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { TRAITS_LIST } from '../../dashboard/constants';

export const NeuralSection = () => {
  const { t } = useTranslation();
  const { 
    attributes, 
    updateAttribute, 
    addAttribute, 
    removeAttribute,
    isPro
  } = useSettings();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; color: string }>({ label: '', color: '' });
  const [openPanels, setOpenPanels] = useState({ active: true, available: true });

  const togglePanel = (key: 'active' | 'available') => {
    setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter out attributes that are already active
  const availableTraits = TRAITS_LIST.filter(t => !attributes.find(a => a.id === t.id));

  const startEditing = (attr: any) => {
    setEditingId(attr.id);
    setEditForm({ 
        label: String(t(attr.label, attr.label.replace('traits.', ''))), 
        color: attr.color 
    });
  };

  const saveEditing = () => {
    if (editingId) {
      updateAttribute(editingId, editForm);
      setEditingId(null);
    }
  };

  const handleAddAttribute = (id: string) => {
      // Check limits if needed (handled by hook usually, but visual feedback is good)
      addAttribute(id);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-1 md:space-y-2">
        <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Brain className="text-cyan-400" size={24} />
          Neural Architecture
        </h2>
        <p className="text-white/40 text-xs md:text-base max-w-2xl">
          Define your core attributes and cognitive parameters. These traits shape your progression system.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => togglePanel('active')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Hexagon size={16} className="text-cyan-400" />
            Active Traits
          </div>
          <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-1 rounded">
            {attributes.length} / {isPro ? '∞' : '5'}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {openPanels.active && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {attributes.map((attr) => (
                  <motion.div
                    key={attr.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="group flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
                  >
                     {editingId === attr.id ? (
                        <div className="flex-1 flex items-center gap-3">
                             <div className="relative">
                                <div 
                                    className="w-10 h-10 rounded-xl border border-white/20" 
                                    style={{ backgroundColor: editForm.color }}
                                />
                                <input 
                                    type="color"
                                    value={editForm.color}
                                    onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                             </div>

                             <input 
                                autoFocus
                                value={editForm.label}
                                onChange={e => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                placeholder="Trait Name"
                             />
                             
                             <div className="flex gap-2">
                                <button onClick={saveEditing} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-2 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 transition-colors">
                                    <X size={18} />
                                </button>
                             </div>
                        </div>
                     ) : (
                        <>
                           <div className="flex items-center gap-4">
                                <div 
                                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/5 shadow-inner" 
                                    style={{ color: attr.color }}
                                >
                                    {attr.icon ? <attr.icon size={18} /> : <Hexagon size={18} />}
                                </div>
                                <div>
                                    <div className="text-base font-bold text-white tracking-tight">{t(attr.label, attr.label.replace('traits.', ''))}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-white/30 font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">LVL {attr.level}</span>
                                        <span className="text-[10px] text-white/20 font-mono">{attr.id}</span>
                                    </div>
                                </div>
                           </div>

                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => startEditing(attr)}
                                    className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                    title="Edit Trait"
                                >
                                    <Edit3 size={16} />
                                </button>
                                
                                {['DISCIPLINA', 'FISICO', 'MENTAL'].includes(attr.id) ? (
                                    <div className="p-2 text-white/10 cursor-not-allowed" title="Core Trait (Locked)">
                                        <Trash2 size={16} />
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => removeAttribute(attr.id)}
                                        className="p-2 text-rose-400/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                                        title="Remove Trait"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                           </div>
                        </>
                     )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => togglePanel('available')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plus size={16} className="text-white/50" />
            Available Modules
          </div>
          {openPanels.available ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence initial={false}>
          {openPanels.available && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 max-h-[50vh] overflow-y-auto custom-scrollbar"
            >
                {availableTraits.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-sm">
                        All modules installed.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {availableTraits.map(trait => (
                            <button
                                key={trait.id}
                                onClick={() => handleAddAttribute(trait.id)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/5"
                            >
                                <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 group-hover:text-white group-hover:bg-white/10 transition-colors"
                                >
                                    <Plus size={14} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-medium text-sm group-hover:text-cyan-400 transition-colors">{t(trait.label, trait.label.replace('traits.', ''))}</div>
                                    <div className="text-white/20 text-xs font-mono">{trait.id}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
