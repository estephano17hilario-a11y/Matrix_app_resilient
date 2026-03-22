import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, Edit3, Check, X, Trash2, Plus } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { TRAITS_LIST } from '../../dashboard/constants';

export const NeuralSection = () => {
  const { t } = useTranslation();
  const { attributes, updateAttribute, addAttribute, removeAttribute, isPro } = useSettings();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; color: string }>({ label: '', color: '' });

  const availableTraits = TRAITS_LIST.filter(trait => !attributes.find(a => a.id === trait.id));

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
    addAttribute(id);
  };

  return (
    <div className="space-y-8 pb-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">{t('settings.attributeEditor', 'Traits')}</h2>
        <p className="text-white/40 text-sm font-medium">{t('settings.attributeEditorDesc', 'Your core attributes and cognitive parameters.')}</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide">{t('settings.activeTraits', 'Active Traits')}</h3>
            <div className="h-px w-12 bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-white/50 bg-black/40 border border-white/5 px-2.5 py-1 rounded-full shadow-inner">
            {attributes.length} / {isPro ? '∞' : '5'}
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="sync">
            {attributes.map((attr) => (
              <motion.div
                key={attr.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="group flex items-center justify-between p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-[20px] border border-white/[0.05] hover:border-white/[0.1] transition-all relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
                  style={{ 
                    background: `radial-gradient(circle, ${attr.color} 0%, transparent 70%)`,
                    willChange: 'opacity'
                  }} 
                />
                
                {editingId === attr.id ? (
                  <div className="flex-1 flex items-center gap-3 relative z-10">
                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-inner"
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
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500/50 transition-colors shadow-inner"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEditing} className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors shadow-sm">
                        <Check size={16} strokeWidth={3} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2.5 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 transition-colors shadow-sm">
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 relative z-10">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500"
                        style={{ backgroundColor: `${attr.color}15`, color: attr.color, borderColor: `${attr.color}30` }}
                      >
                        {attr.icon ? <attr.icon size={20} /> : <Hexagon size={20} />}
                      </div>
                      <div>
                        <div className="text-base font-bold text-white tracking-tight">{t(attr.label, attr.label.replace('traits.', ''))}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">LVL {attr.level}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                      <button
                        onClick={() => startEditing(attr)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>

                      {attr.id === 'DISCIPLINA' || attributes.length <= 3 ? (
                        <div className="p-2 text-white/10 cursor-not-allowed">
                          <Trash2 size={16} />
                        </div>
                      ) : (
                        <button
                          onClick={() => removeAttribute(attr.id)}
                          className="p-2 text-rose-400/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
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
        </div>
      </div>

      {availableTraits.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide">{t('settings.availableTraits', 'Available Modules')}</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="bg-white/[0.03] border border-white/[0.05] rounded-[20px] p-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              {availableTraits.map(trait => (
                <button
                  key={trait.id}
                  onClick={() => handleAddAttribute(trait.id)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.05] transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.05] text-white/30 group-hover:text-white group-hover:bg-white/[0.08] transition-colors"
                  >
                    <Plus size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">
                      {t(trait.label, trait.label.replace('traits.', ''))}
                    </div>
                    <div className="text-[10px] text-white/20 font-mono">{trait.id}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
