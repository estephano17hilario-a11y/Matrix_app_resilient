import { useState } from 'react';
import { 
  Brain, 
  Hexagon, 
  BarChart3, 
  User, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../utils/cn';
import { Attribute } from '../../../../types';
import { TRAITS_LIST } from '../../constants';
import { GlassInput } from '../../../../components/ui/GlassInput';
import { useTranslation } from 'react-i18next';

interface NeuralSectionProps {
  defaultChartMode: 'RADAR' | 'BAR';
  onSetDefaultChartMode: (mode: 'RADAR' | 'BAR') => void;
  showProfile: boolean;
  onToggleProfile: (show: boolean) => void;
  attributes?: Attribute[];
  onUpdateAttribute?: (id: string, updates: Partial<Attribute>) => void;
  onAddAttribute?: (id: string) => void;
  onRemoveAttribute?: (id: string) => void;
}

export const NeuralSection = ({
  defaultChartMode,
  onSetDefaultChartMode,
  showProfile,
  onToggleProfile,
  attributes = [],
  onUpdateAttribute,
  onAddAttribute,
  onRemoveAttribute
}: NeuralSectionProps) => {
  const { t } = useTranslation();
  const [editingTraitId, setEditingTraitId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; color: string }>({ label: '', color: '' });

  const startEditing = (attr: Attribute) => {
    setEditingTraitId(attr.id);
    setEditForm({ label: t(attr.label, attr.label), color: attr.color });
  };

  const saveEditing = () => {
    if (editingTraitId && onUpdateAttribute) {
      onUpdateAttribute(editingTraitId, editForm);
      setEditingTraitId(null);
    }
  };

  const cancelEditing = () => {
    setEditingTraitId(null);
  };

  const availableTraits = TRAITS_LIST.filter(t => !attributes.find(a => a.id === t.id));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Brain className="text-purple-400" size={32} />
          Neural Net
        </h2>
        <p className="text-white/40 text-lg max-w-2xl">
          Calibrate your psychological model. Define attributes, visualization modes, and HUD telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* HUD TELEMETRY */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            HUD Telemetry
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            
            {/* Chart Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
              <div className="space-y-1">
                <span className="text-white font-medium flex items-center gap-2">
                  <BarChart3 size={16} className="text-purple-400" />
                  Data Visualization
                </span>
                <p className="text-xs text-white/40">Select primary metric rendering mode</p>
              </div>
              
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-full sm:w-auto">
                <button 
                  onClick={() => onSetDefaultChartMode('RADAR')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2", 
                    defaultChartMode === 'RADAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <Hexagon size={14} />
                  RADAR
                </button>
                <button 
                  onClick={() => onSetDefaultChartMode('BAR')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2", 
                    defaultChartMode === 'BAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <BarChart3 size={14} />
                  LIST
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5" />

            {/* Profile Visibility */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-white font-medium flex items-center gap-2">
                  <User size={16} className="text-purple-400" />
                  Profile HUD
                </span>
                <p className="text-xs text-white/40">Toggle attribute panel visibility</p>
              </div>
              
              <button 
                onClick={() => onToggleProfile(!showProfile)}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative shrink-0",
                  showProfile ? "bg-purple-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  showProfile ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

          </div>
        </div>

        {/* ATTRIBUTE EDITOR */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-purple-400" />
               Attribute Definitions
            </div>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/40">{attributes.length} Active</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
             {attributes.map((attr) => (
               <motion.div 
                 key={attr.id}
                 layout
                 className="group relative flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
               >
                 {editingTraitId === attr.id ? (
                    <div className="flex items-center gap-2 w-full">
                       <input 
                         type="color" 
                         value={editForm.color}
                         onChange={(e) => setEditForm({...editForm, color: e.target.value})}
                         className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                       />
                       <GlassInput 
                         value={editForm.label}
                         onChange={(e) => setEditForm({...editForm, label: e.target.value})}
                         className="h-8 text-sm flex-1"
                         autoFocus
                       />
                       <button onClick={saveEditing} className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg">
                         <Check size={16} />
                       </button>
                       <button onClick={cancelEditing} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                         <X size={16} />
                       </button>
                    </div>
                 ) : (
                    <>
                       <div className="flex items-center gap-3">
                          <div 
                             className="w-3 h-3 rounded-full shadow-[0_0_10px]"
                             style={{ backgroundColor: attr.color, boxShadow: `0 0 10px ${attr.color}` }}
                          />
                         <span className="font-medium text-white">{t(attr.label, attr.label)}</span>
                          <span className="text-xs text-white/30 font-mono">Lvl {attr.level}</span>
                       </div>

                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                             onClick={() => startEditing(attr)}
                             className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                             <Edit3 size={14} />
                          </button>
                          {attributes.length > 3 && (
                              <button 
                                onClick={() => onRemoveAttribute && onRemoveAttribute(attr.id)}
                                className="p-2 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                          )}
                       </div>
                    </>
                 )}
               </motion.div>
             ))}

             {/* Add New Attribute */}
             {availableTraits.length > 0 && (
                <div className="pt-2">
                   <h4 className="text-xs font-bold text-white/40 mb-2 uppercase">{t('settings.availableTraits', 'Available Traits')}</h4>
                   <div className="flex flex-wrap gap-2">
                      {availableTraits.map(trait => (
                         <button
                            key={trait.id}
                            onClick={() => onAddAttribute && onAddAttribute(trait.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-medium text-white/60 transition-all"
                         >
                            <Plus size={12} />
                            {t(trait.label, trait.label)}
                         </button>
                      ))}
                   </div>
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
