import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, Edit3, Check, X, Trash2, Plus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { TRAITS_LIST } from '../../dashboard/constants';
import { IconPicker } from '../../dashboard/components/IconPicker';
import { supabase } from '../../../services/supabase';
import { calculateSubTraitMaxXp } from '../../../utils/leveling';

const COLORS = ['#3b82f6', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#64748b', '#6366f1', '#f97316', '#84cc16', '#d946ef', '#eab308'];

const SUBTRAIT_PRESETS: Record<string, { name: string; iconName: string }[]> = {
  FISICO: [
    { name: 'Cardio', iconName: 'Heart' },
    { name: 'Fuerza', iconName: 'Dumbbell' },
    { name: 'Flexibilidad', iconName: 'Wind' },
    { name: 'Resistencia', iconName: 'Zap' },
  ],
  MENTAL: [
    { name: 'Estudio', iconName: 'BookOpen' },
    { name: 'Programación', iconName: 'Code' },
    { name: 'Lectura', iconName: 'Book' },
    { name: 'Idiomas', iconName: 'Languages' },
  ],
  CREATIVIDAD: [
    { name: 'Dibujo', iconName: 'Palette' },
    { name: 'Música', iconName: 'Music' },
    { name: 'Fotografía', iconName: 'Camera' },
    { name: 'Edición', iconName: 'Video' },
  ],
  SOCIAL: [
    { name: 'Oratoria', iconName: 'Mic' },
    { name: 'Empatía', iconName: 'HeartHandshake' },
    { name: 'Idiomas', iconName: 'Languages' },
    { name: 'Carisma', iconName: 'Sparkles' },
  ],
  ESPIRITU: [
    { name: 'Meditación', iconName: 'Smile' },
    { name: 'Yoga', iconName: 'Flower2' },
    { name: 'Mindfulness', iconName: 'Compass' },
    { name: 'Estoicismo', iconName: 'Shield' },
  ],
  FINANZAS: [
    { name: 'Ahorro', iconName: 'PiggyBank' },
    { name: 'Inversión', iconName: 'TrendingUp' },
    { name: 'Presupuesto', iconName: 'Coins' },
    { name: 'Negocios', iconName: 'Briefcase' },
  ],
  ORDEN: [
    { name: 'Limpieza', iconName: 'Trash2' },
    { name: 'Organización', iconName: 'Grid' },
    { name: 'Rutinas', iconName: 'Calendar' },
    { name: 'Minimalismo', iconName: 'Minimize2' },
  ],
  VITALIDAD: [
    { name: 'Nutrición', iconName: 'Apple' },
    { name: 'Sueño', iconName: 'Moon' },
    { name: 'Hidratación', iconName: 'Droplet' },
    { name: 'Descanso', iconName: 'Sun' },
  ],
  LIDERAZGO: [
    { name: 'Oratoria', iconName: 'Mic' },
    { name: 'Gestión', iconName: 'FolderKanban' },
    { name: 'Negociación', iconName: 'Briefcase' },
    { name: 'Delegación', iconName: 'Share2' },
  ],
  RESILIENCIA: [
    { name: 'Estoicismo', iconName: 'ShieldAlert' },
    { name: 'Paciencia', iconName: 'Hourglass' },
    { name: 'Adaptabilidad', iconName: 'RefreshCw' },
  ],
  ESTILO: [
    { name: 'Moda', iconName: 'Shirt' },
    { name: 'Higiene', iconName: 'Sparkles' },
    { name: 'Postura', iconName: 'Accessibility' },
  ],
  DISCIPLINA: [
    { name: 'Foco', iconName: 'Target' },
    { name: 'Puntualidad', iconName: 'Clock' },
    { name: 'Consistencia', iconName: 'Flame' },
  ],
};

export const NeuralSection = () => {
  const { t } = useTranslation();
  const { profile: user, updateProfileLocally } = useAuth();
  const { 
    attributes, 
    updateAttribute, 
    addAttribute, 
    addCustomAttribute, 
    removeAttribute, 
    isPro, 
    showProModal,
    addSubTrait,
    updateSubTrait,
    deleteSubTrait 
  } = useSettings();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<{ label: string; color: string; icon?: any; iconName?: string }>({ label: '', color: COLORS[0], icon: Hexagon, iconName: 'Hexagon' });

  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('Hexagon');
  const [showIconGrid, setShowIconGrid] = useState(false);

  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubIcon, setEditSubIcon] = useState('Hexagon');
  const [showEditIconGrid, setShowEditIconGrid] = useState(false);

  const handleAddSubTraitSubmit = async (e: React.FormEvent | React.MouseEvent | React.KeyboardEvent, parentAttrId: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("handleAddSubTraitSubmit called:", { parentAttrId, newSubName: newSubName.trim(), hasAddSubTrait: !!addSubTrait });
    if (!newSubName.trim() || !addSubTrait) {
      console.warn("Skipping addSubTrait call: empty name or addSubTrait is missing.");
      return;
    }
    try {
      await addSubTrait(parentAttrId, newSubName.trim(), newSubIcon);
      setNewSubName('');
      setNewSubIcon('Hexagon');
      setIsAddingSub(false);
      setShowIconGrid(false);
    } catch (err) {
      console.error("Error inside handleAddSubTraitSubmit:", err);
    }
  };

  const handleEditSubTraitSubmit = async (e: React.FormEvent | React.MouseEvent | React.KeyboardEvent, parentAttrId: string, subId: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editSubName.trim() || !updateSubTrait) return;
    try {
      await updateSubTrait(parentAttrId, subId, { name: editSubName.trim(), iconName: editSubIcon });
      setEditingSubId(null);
      setShowEditIconGrid(false);
    } catch (err) {
      console.error("Error inside handleEditSubTraitSubmit:", err);
    }
  };

  // Merge default traits and custom archived traits
  const allTraits = [...TRAITS_LIST];
  if (user?.archivedTraits) {
    Object.entries(user.archivedTraits).forEach(([id, data]) => {
      if (!allTraits.find(t => t.id === id) && data.label) {
        allTraits.push({
          id,
          label: data.label,
          color: data.color || '#3b82f6',
          icon: (LucideIcons as any)[data.iconName || 'Hexagon'] || Hexagon,
          desc: ''
        });
      }
    });
  }

  const availableTraits = allTraits.filter(trait => !attributes.find(a => a.id === trait.id));

  const startEditing = (attr: any) => {
    setEditingId(attr.id);
    setIsCreating(false);
    setIsAddingSub(false);
    setEditingSubId(null);
    setNewSubName('');
    setNewSubIcon('Hexagon');
    setEditForm({
      label: String(t(attr.label, attr.label.replace('traits.', ''))),
      color: attr.color,
      icon: attr.icon || Hexagon,
      iconName: attr.iconName || 'Hexagon'
    });
  };

  const saveEditing = () => {
    if (editingId) {
      updateAttribute(editingId, { label: editForm.label, color: editForm.color });
      setEditingId(null);
      setIsAddingSub(false);
      setEditingSubId(null);
    } else if (isCreating) {
      if (!isPro) {
        showProModal();
        return;
      }
      addCustomAttribute({ label: editForm.label || 'Custom', color: editForm.color, icon: editForm.icon, iconName: editForm.iconName });
      setIsCreating(false);
    }
  };

  const handleAddAttribute = (id: string) => {
    addAttribute(id);
  };

  const handlePermanentDelete = async (id: string) => {
    if (!user?.id) return;
    try {
      const newArchived = { ...(user.archivedTraits || {}) };
      delete newArchived[id];
      
      // Update Supabase
      await supabase.from('users').update({ 
        preferences: { 
            ...(user.preferences || {}), 
            archivedTraits: newArchived 
        } 
      }).eq('id', user.id);

      // Optimistic update locally
      updateProfileLocally({ archivedTraits: newArchived });

      setDeletingId(null);
    } catch (e) {
      console.error("Error permanently deleting trait:", e);
    }
  };

  const handleCreateCustom = () => {
    if (!isPro) {
      showProModal();
      return;
    }
    setEditingId(null);
    setIsCreating(true);
    setEditForm({ label: 'New Trait', color: COLORS[0], icon: Hexagon, iconName: 'Hexagon' });
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
          <span className="text-[10px] font-bold tracking-widest text-white/50 bg-black/40 border border-white/5 px-2.5 py-1 rounded-full shadow-md">
            {attributes.length} / {isPro ? '∞' : '5'}
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="sync">
            {isCreating && (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="group flex flex-col gap-4 p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-[20px] border border-white/[0.05] relative overflow-hidden"
              >
                <div 
                  className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none" 
                  style={{ background: `radial-gradient(circle, ${editForm.color} 0%, transparent 70%)` }} 
                />
                
                <div className="flex items-center gap-3 relative z-10 w-full">
                  <div
                    className="w-12 h-12 rounded-2xl border-2 shadow-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${editForm.color}20`, borderColor: `${editForm.color}50`, color: editForm.color }}
                  >
                    {editForm.icon && <editForm.icon size={20} />}
                  </div>
                  <input
                    autoFocus
                    value={editForm.label}
                    onChange={e => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Trait Name"
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500/50 transition-colors shadow-md w-full"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button onClick={saveEditing} className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors shadow-sm">
                      <Check size={16} strokeWidth={3} />
                    </button>
                    <button onClick={() => setIsCreating(false)} className="p-2.5 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 transition-colors shadow-sm">
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 relative z-10">
                  <IconPicker 
                    selectedIcon={editForm.iconName || 'Hexagon'} 
                    onSelectIcon={(iconName) => {
                      if (iconName && (LucideIcons as any)[iconName]) {
                        setEditForm(prev => ({ ...prev, iconName, icon: (LucideIcons as any)[iconName] }));
                      }
                    }} 
                    selectedColor={editForm.color} 
                    onSelectColor={(color) => {
                      if (color) setEditForm(prev => ({ ...prev, color }));
                    }} 
                  />
                </div>
              </motion.div>
            )}

            {attributes.map((attr) => (
              <motion.div
                key={attr.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                  <div className="flex-1 flex flex-col gap-4 relative z-10 w-full">
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className="w-12 h-12 rounded-2xl border-2 shadow-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${editForm.color}20`, borderColor: `${editForm.color}50`, color: editForm.color }}
                      >
                        {attr.icon ? <attr.icon size={20} /> : <Hexagon size={20} />}
                      </div>
                      <input
                        autoFocus
                        value={editForm.label}
                        onChange={e => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500/50 transition-colors shadow-md w-full"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button onClick={saveEditing} className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors shadow-sm">
                          <Check size={16} strokeWidth={3} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2.5 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 transition-colors shadow-sm">
                          <X size={16} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3 relative z-10 w-full mt-2">
                      <IconPicker 
                        selectedIcon={editForm.iconName || 'Hexagon'} 
                        onSelectIcon={(iconName) => {
                          if (iconName && (LucideIcons as any)[iconName]) {
                            setEditForm(prev => ({ ...prev, iconName, icon: (LucideIcons as any)[iconName] }));
                          }
                        }} 
                        selectedColor={editForm.color} 
                        onSelectColor={(color) => {
                          if (color) setEditForm(prev => ({ ...prev, color }));
                        }} 
                      />
                    </div>

                    {/* Sub-traits Section */}
                    <div className="border-t border-white/5 pt-4 mt-4 space-y-4 relative z-10 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/50 uppercase tracking-wider block">Sub-Rasgos</span>
                          {attr.subTraits && attr.subTraits.length > 0 && (
                            <span className="text-[10px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full font-bold">
                              {attr.subTraits.length}
                            </span>
                          )}
                        </div>
                        
                        {!isAddingSub && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingSub(true);
                              setNewSubName('');
                              setNewSubIcon('Hexagon');
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/25 rounded-lg text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all shadow-sm"
                          >
                            <Plus size={10} />
                            Añadir Sub-Rasgo
                          </button>
                        )}
                      </div>

                      {/* Adding Sub-trait Form */}
                      {isAddingSub && (
                        <div className="bg-black/40 rounded-xl p-3 border border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddSubTraitSubmit(e, attr.id);
                                }
                              }}
                              maxLength={15}
                              placeholder="Nombre (ej. Cardio)..."
                              className="flex-1 h-8 bg-black/60 border border-white/10 rounded-lg px-3 text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50"
                              autoFocus
                            />
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={!newSubName.trim()}
                                onClick={(e) => handleAddSubTraitSubmit(e, attr.id)}
                                className="w-8 h-8 bg-emerald-500/20 text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                                title="Crear sub-rasgo (Enter)"
                              >
                                <Check size={14} strokeWidth={3} className="pointer-events-none" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsAddingSub(false);
                                  setNewSubName('');
                                  setNewSubIcon('Hexagon');
                                  setShowIconGrid(false);
                                }}
                                className="w-8 h-8 bg-white/5 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                              >
                                <X size={14} strokeWidth={3} className="pointer-events-none" />
                              </button>
                            </div>
                          </div>

                          {/* Suggestions/Presets (Instant 1-Click Add) */}
                          {SUBTRAIT_PRESETS[attr.id] && SUBTRAIT_PRESETS[attr.id].length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Sugerencias (Añadir al instante):</span>
                              <div className="flex flex-wrap gap-1.5">
                                {SUBTRAIT_PRESETS[attr.id].map(p => (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      try {
                                        if (addSubTrait) {
                                          await addSubTrait(attr.id, p.name, p.iconName);
                                        }
                                        setIsAddingSub(false);
                                        setShowIconGrid(false);
                                      } catch (err) {
                                        console.error("Error adding preset sub-trait:", err);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-semibold border border-white/[0.03] transition-colors"
                                  >
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Optional Icon Picker */}
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowIconGrid(!showIconGrid);
                              }}
                              className="text-[10px] font-bold text-cyan-400/80 hover:text-cyan-400 transition-colors flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5"
                            >
                              <span>Icono: {newSubIcon}</span>
                              <span className="text-[8px] text-white/35">(hacer clic para cambiar)</span>
                            </button>
                            
                            {showIconGrid && (
                              <div className="grid grid-cols-6 gap-1 p-1 bg-black/35 rounded-lg border border-white/5 animate-fadeIn">
                                {['Target', 'Dumbbell', 'Brain', 'Heart', 'Code', 'BookOpen', 'Languages', 'Palette', 'Music', 'TrendingUp', 'Compass', 'Flame'].map(icon => {
                                  const IconComp = (LucideIcons as any)[icon] || Hexagon;
                                  return (
                                    <button
                                      key={icon}
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setNewSubIcon(icon);
                                        setShowIconGrid(false);
                                      }}
                                      className={`h-7 rounded-md flex items-center justify-center transition-all border ${
                                        newSubIcon === icon 
                                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" 
                                          : "bg-transparent border-transparent text-white/30 hover:bg-white/5 hover:text-white/60"
                                      }`}
                                    >
                                      <IconComp size={14} />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-traits list */}
                      {attr.subTraits && attr.subTraits.length > 0 ? (
                        <div className="space-y-2">
                          {attr.subTraits.map((st: any) => {
                            const isEditingSub = editingSubId === st.id;
                            const stMaxXp = calculateSubTraitMaxXp(st.level);
                            const stXp = Math.round(st.xp);
                            const percent = Math.min(100, Math.max(0, (stXp / stMaxXp) * 100));
                            
                            if (isEditingSub) {
                              return (
                                <div key={st.id} className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editSubName}
                                      onChange={(e) => setEditSubName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleEditSubTraitSubmit(e, attr.id, st.id);
                                        }
                                      }}
                                      maxLength={15}
                                      placeholder="Nombre..."
                                      className="flex-1 h-8 bg-black/60 border border-white/10 rounded-lg px-3 text-xs font-bold text-white outline-none focus:border-cyan-500/50"
                                      autoFocus
                                    />
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleEditSubTraitSubmit(e, attr.id, st.id)}
                                        className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                                      >
                                        <Check size={14} strokeWidth={3} className="pointer-events-none" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingSubId(null);
                                          setShowEditIconGrid(false);
                                        }}
                                        className="w-8 h-8 bg-white/5 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                      >
                                        <X size={14} strokeWidth={3} className="pointer-events-none" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Optional Edit Icon Picker */}
                                  <div className="space-y-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowEditIconGrid(!showEditIconGrid);
                                      }}
                                      className="text-[10px] font-bold text-cyan-400/80 hover:text-cyan-400 transition-colors flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5"
                                    >
                                      <span>Icono: {editSubIcon}</span>
                                      <span className="text-[8px] text-white/35">(hacer clic para cambiar)</span>
                                    </button>
                                    
                                    {showEditIconGrid && (
                                      <div className="grid grid-cols-6 gap-1 p-1 bg-black/35 rounded-lg border border-white/5 animate-fadeIn">
                                        {['Target', 'Dumbbell', 'Brain', 'Heart', 'Code', 'BookOpen', 'Languages', 'Palette', 'Music', 'TrendingUp', 'Compass', 'Flame'].map(icon => {
                                          const IconComp = (LucideIcons as any)[icon] || Hexagon;
                                          return (
                                            <button
                                              key={icon}
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditSubIcon(icon);
                                                setShowEditIconGrid(false);
                                              }}
                                              className={`h-7 rounded-md flex items-center justify-center transition-all border ${
                                                editSubIcon === icon 
                                                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" 
                                                  : "bg-transparent border-transparent text-white/30 hover:bg-white/5 hover:text-white/60"
                                              }`}
                                            >
                                              <IconComp size={14} />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            const SubIcon = (LucideIcons as any)[st.iconName || 'Hexagon'] || Hexagon;

                            return (
                              <div key={st.id} className="group flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-colors relative">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/70">
                                      <SubIcon size={12} />
                                    </div>
                                    <span className="font-bold text-white/80">{st.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono text-[9px] text-white/35">{stXp}/{stMaxXp} XP</span>
                                    <span className="font-mono text-[10px] font-bold text-cyan-400/90 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">Lvl {st.level}</span>
                                    
                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setEditingSubId(st.id);
                                          setEditSubName(st.name);
                                          setEditSubIcon(st.iconName || 'Hexagon');
                                          setShowEditIconGrid(false);
                                        }}
                                        className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                                        title="Editar"
                                      >
                                        <LucideIcons.Edit2 size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          if (deleteSubTrait && confirm(`¿Estás seguro de eliminar el sub-rasgo "${st.name}"?`)) {
                                            deleteSubTrait(attr.id, st.id);
                                          }
                                        }}
                                        className="w-6 h-6 rounded hover:bg-rose-500/10 flex items-center justify-center text-white/40 hover:text-rose-400 transition-colors"
                                        title="Eliminar"
                                      >
                                        <LucideIcons.Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
                                  <div 
                                    className="h-full bg-cyan-500/60 rounded-full transition-all duration-300"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/20 text-center py-3 italic bg-black/10 rounded-xl border border-dashed border-white/5">
                          Sin sub-rasgos. Crea uno para especializarte.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 relative z-10">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-200"
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

                      {attr.id === 'DISCIPLINA' || attr.id === 'RESILIENCIA' || attributes.length <= 3 ? (
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

          <div className="bg-white/[0.03] border border-white/[0.05] rounded-[20px] p-3">
            <div className="space-y-2">
              {availableTraits.map(trait => {
                // Allow permanent delete for all traits (resets default traits, deletes custom ones)
                return (
                <div key={trait.id} className="relative group overflow-hidden rounded-xl">
                  {deletingId === trait.id ? (
                    <div className="flex flex-col gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                      <p className="text-xs text-rose-300 font-bold uppercase tracking-wider">
                        ¿Eliminar este rasgo DEFINITIVAMENTE?
                      </p>
                      <p className="text-[10px] text-white/50">NO PODRÁS RECUPERARLO.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={() => handlePermanentDelete(trait.id)}
                          className="flex-1 p-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors"
                        >
                          Sí, eliminar
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="flex-1 p-2 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center w-full bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.05] transition-all">
                      <button
                        onClick={() => handleAddAttribute(trait.id)}
                        className="flex-1 flex items-center gap-4 p-3 text-left relative"
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
                      
                      <button
                        onClick={() => setDeletingId(trait.id)}
                        className="p-3 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors z-10 h-full"
                        title="Eliminar definitivamente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>
      )}

      <div className="pt-4">
        <button
          onClick={handleCreateCustom}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/20 transition-all group"
        >
          <Plus size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-cyan-400 tracking-wide uppercase">
            {t('settings.createCustomTrait', 'Create Custom Trait')}
          </span>
          {!isPro && (
            <span className="ml-2 text-[9px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded uppercase tracking-widest">
              PRO
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
