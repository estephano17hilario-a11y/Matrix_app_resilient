import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { LiquidProgressBar } from '@/components/ui/LiquidProgressBar';
import { cn } from '@/utils/cn';
import { TraitRadarChart } from './components/TraitRadarChart';
import { TRAITS_LIST } from './constants';
import { Attribute } from '@/types';
import { calculateSubTraitMaxXp } from '@/utils/leveling';

interface PlayerHUDProps {
 attributes?: Attribute[];
 className?: string;
 defaultChartMode?: 'RADAR' | 'BAR';
 onAddSubTrait?: (parentAttrId: string, name: string, iconName: string) => Promise<void> | void;
 onUpdateSubTrait?: (parentAttrId: string, subTraitId: string, updates: any) => Promise<void> | void;
 onDeleteSubTrait?: (parentAttrId: string, subTraitId: string) => Promise<void> | void;
 onOpenProgress?: () => void;
}

const getTraitColor = (traitId: string): 'indigo' | 'cyan' | 'emerald' | 'rose' | 'amber' | 'blue' | 'pink' | 'violet' | 'gray' => {
 const map: Record<string, 'indigo' | 'cyan' | 'emerald' | 'rose' | 'amber' | 'blue' | 'pink' | 'violet' | 'gray'> = {
 'DISCIPLINA': 'blue',
 'FISICO': 'rose',
 'MENTAL': 'cyan',
 'SOCIAL': 'pink',
 'ESPIRITU': 'violet',
 'FINANZAS': 'emerald',
 'CREATIVIDAD': 'amber',
 'ORDEN': 'gray',
 'LIDERAZGO': 'indigo',
 'RESILIENCIA': 'amber',
 'VITALIDAD': 'emerald',
 'ESTILO': 'pink',
 };
 return map[traitId] || 'indigo';
};

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

const renderLucideIcon = (iconName: string, size = 12, className = '') => {
 const IconComponent = (LucideIcons as any)[iconName];
 if (IconComponent) {
   return <IconComponent size={size} className={className} />;
 }
 return <LucideIcons.Hexagon size={size} className={className} />;
};

const TraitBar = ({ 
 attribute, 
 mini = false,
 onAddSubTrait,
 onUpdateSubTrait,
 onDeleteSubTrait,
}: { 
 attribute: Attribute, 
 mini?: boolean,
 onAddSubTrait?: (parentAttrId: string, name: string, iconName: string) => Promise<void> | void;
 onUpdateSubTrait?: (parentAttrId: string, subTraitId: string, updates: any) => Promise<void> | void;
 onDeleteSubTrait?: (parentAttrId: string, subTraitId: string) => Promise<void> | void;
}) => {
 const { t } = useTranslation();
 const [isExpanded, setIsExpanded] = useState(false);
 
 // Creation state
 const [isAdding, setIsAdding] = useState(false);
 const [newSubName, setNewSubName] = useState('');
 const [newSubIcon, setNewSubIcon] = useState('Hexagon');

 // Editing state
 const [editingSubId, setEditingSubId] = useState<string | null>(null);
 const [editSubName, setEditSubName] = useState('');
 const [editSubIcon, setEditSubIcon] = useState('Hexagon');

 // 🛡️ SAFE CALCULATION
 const safeXp = Number.isFinite(attribute.xp) ? Math.round(attribute.xp) : 0;
 const safeMax = (Number.isFinite(attribute.maxXp) && attribute.maxXp > 0) ? Math.round(attribute.maxXp) : 1;
 
 const Icon = attribute.icon || HelpCircle;
 const barColor = getTraitColor(attribute.id);

 const presets = SUBTRAIT_PRESETS[attribute.id] || [];

 const handleAddSubmit = (e: React.FormEvent) => {
   e.preventDefault();
   if (!newSubName.trim() || !onAddSubTrait) return;
   onAddSubTrait(attribute.id, newSubName.trim(), newSubIcon);
   setNewSubName('');
   setNewSubIcon('Hexagon');
   setIsAdding(false);
 };

 const handleEditSubmit = (subId: string) => {
   if (!editSubName.trim() || !onUpdateSubTrait) return;
   onUpdateSubTrait(attribute.id, subId, { name: editSubName.trim(), iconName: editSubIcon });
   setEditingSubId(null);
 };

 const hasSubTraits = !!(attribute.subTraits && attribute.subTraits.length > 0);

 return (
   <div className="flex flex-col gap-1 w-full">
     <div 
       onClick={() => !mini && hasSubTraits && setIsExpanded(!isExpanded)}
       className={cn(
         "flex flex-col gap-1 w-full",
         !mini && hasSubTraits && "cursor-pointer"
       )}
     >
      {/* Single Row: [Chevron] [Icon] [Name]  ...  [xp/max] [Lvl N] */}
      <div className="flex items-center justify-between text-[10px] mb-0.5">
       <div className="flex items-center gap-1.5 overflow-hidden">
        {/* Chevron: only shows when trait has sub-traits */}
        {!mini && hasSubTraits && (
         <div
           className="text-white/30 transition-transform duration-200 shrink-0"
           style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
         >
          <LucideIcons.ChevronRight size={11} />
         </div>
        )}
        <div className={cn(
         "w-4 h-4 rounded-md flex items-center justify-center bg-white/5 shrink-0",
         `text-${barColor}-400`
        )}>
         <Icon size={10} />
        </div>
        {!mini && (
          <span className="font-medium text-white/80 truncate">{t(attribute.label, attribute.label.replace('traits.', ''))}</span>
        )}
       </div>
       <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[8px] text-white/30">{safeXp}/{safeMax}</span>
        <span className="font-mono text-[9px] opacity-60 font-bold text-white/70">Lvl {attribute.level}</span>
       </div>
      </div>
      {!mini && (
        <LiquidProgressBar 
         value={safeXp} 
         max={safeMax} 
         color={barColor as any}
         size="sm"
        />
      )}
     </div>

   <AnimatePresence>
    {isExpanded && !mini && (
     <motion.div
       initial={{ opacity: 0, height: 0 }}
       animate={{ opacity: 1, height: "auto" }}
       exit={{ opacity: 0, height: 0 }}
       transition={{ duration: 0.2 }}
       className="overflow-hidden mt-2 px-1 pb-1 space-y-2 border-t border-white/5 pt-2"
     >
      {/* List of sub-traits */}
      {attribute.subTraits && attribute.subTraits.length > 0 ? (
       <div className="space-y-2">
        {attribute.subTraits.map(st => {
         const isEditing = editingSubId === st.id;
         const stMaxXp = st.maxXp || calculateSubTraitMaxXp(st.level);
         const stXp = Math.round(st.xp);
         const percent = Math.min(100, Math.max(0, (stXp / stMaxXp) * 100));
         
         if (isEditing) {
          return (
           <div key={st.id} className="bg-black/40 rounded-xl p-2 border border-white/10 space-y-2">
            <div className="flex gap-2">
             <input 
               type="text"
               value={editSubName}
               onChange={(e) => setEditSubName(e.target.value)}
               maxLength={15}
               placeholder="Nombre..."
               className="flex-1 h-7 bg-white/5 rounded-lg px-2 text-[10px] font-bold text-white outline-none border border-white/10 focus:border-white/20"
             />
             <div className="flex gap-1 shrink-0">
              <button
                onClick={() => handleEditSubmit(st.id)}
                className="w-7 h-7 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
              >
                <LucideIcons.Check size={12} />
              </button>
              <button
                onClick={() => setEditingSubId(null)}
                className="w-7 h-7 bg-white/5 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <LucideIcons.X size={12} />
              </button>
             </div>
            </div>

            <div className="grid grid-cols-6 gap-1">
             {['Target', 'Dumbbell', 'Brain', 'Heart', 'Code', 'BookOpen', 'Languages', 'Palette', 'Music', 'TrendingUp', 'Compass', 'Flame'].map(icon => (
              <button
                key={icon}
                onClick={() => setEditSubIcon(icon)}
                className={cn(
                  "h-6 rounded-md flex items-center justify-center transition-all border",
                  editSubIcon === icon 
                    ? "bg-white/10 border-white/20 text-white" 
                    : "bg-transparent border-transparent text-white/30 hover:bg-white/5 hover:text-white/60"
                )}
              >
                {renderLucideIcon(icon, 12)}
              </button>
             ))}
            </div>
           </div>
          );
         }

         return (
          <div key={st.id} className="group flex flex-col gap-1 p-2 rounded-xl bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.02] transition-colors relative">
           <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
             <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
              {renderLucideIcon(st.iconName || 'Hexagon', 10)}
             </div>
             <span className="font-bold text-white/80">{st.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
             <span className="font-mono text-[8px] text-white/30">{stXp}/{stMaxXp} XP</span>
             <span className="font-mono text-[9px] font-bold text-cyan-400/80">Lvl {st.level}</span>
             
             {/* Edit / Delete Actions */}
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-1">
              <button
                onClick={(e) => {
                 e.stopPropagation();
                 setEditingSubId(st.id);
                 setEditSubName(st.name);
                 setEditSubIcon(st.iconName || 'Hexagon');
                }}
                className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                title="Editar"
              >
                <LucideIcons.Edit2 size={10} />
              </button>
              <button
                onClick={(e) => {
                 e.stopPropagation();
                 if (onDeleteSubTrait && confirm(`¿Estás seguro de eliminar el sub-rasgo "${st.name}"?`)) {
                   onDeleteSubTrait(attribute.id, st.id);
                 }
                }}
                className="w-5 h-5 rounded hover:bg-red-500/10 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                title="Eliminar"
              >
                <LucideIcons.Trash2 size={10} />
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
       <div className="text-[10px] text-white/20 text-center py-2 italic">
        Sin sub-rasgos. Crea uno para especializarte.
       </div>
      )}

      {(!attribute.subTraits || attribute.subTraits.length === 0) && (
       isAdding ? (
        <form onSubmit={handleAddSubmit} className="bg-black/30 rounded-xl p-2 border border-white/5 space-y-2 mt-2">
         <div className="flex gap-2">
          <input
            type="text"
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            maxLength={15}
            placeholder="Nuevo sub-rasgo (ej. Cardio)..."
            className="flex-1 h-7 bg-white/5 rounded-lg px-2 text-[10px] font-bold text-white placeholder:text-white/20 outline-none border border-white/10 focus:border-white/20"
            autoFocus
          />
          <div className="flex gap-1 shrink-0">
           <button
             type="submit"
             disabled={!newSubName.trim()}
             className="w-7 h-7 bg-white text-black disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center hover:scale-105 transition-transform"
           >
             <LucideIcons.Check size={12} />
           </button>
           <button
             type="button"
             onClick={() => {
               setIsAdding(false);
               setNewSubName('');
               setNewSubIcon('Hexagon');
             }}
             className="w-7 h-7 bg-white/5 text-white/50 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
           >
             <LucideIcons.X size={12} />
           </button>
          </div>
         </div>

         {presets.length > 0 && (
          <div className="space-y-1">
           <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider block">Sugerencias:</span>
           <div className="flex flex-wrap gap-1">
            {presets.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setNewSubName(p.name);
                  setNewSubIcon(p.iconName);
                }}
                className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 text-[9px] font-semibold border border-white/[0.03] transition-colors"
              >
               {p.name}
              </button>
            ))}
           </div>
          </div>
         )}

         <div className="space-y-1">
          <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider block">Icono:</span>
          <div className="grid grid-cols-6 gap-1">
           {['Target', 'Dumbbell', 'Brain', 'Heart', 'Code', 'BookOpen', 'Languages', 'Palette', 'Music', 'TrendingUp', 'Compass', 'Flame'].map(icon => (
             <button
               key={icon}
               type="button"
               onClick={() => setNewSubIcon(icon)}
               className={cn(
                 "h-6 rounded-md flex items-center justify-center transition-all border",
                 newSubIcon === icon 
                   ? "bg-white/10 border-white/20 text-white" 
                   : "bg-transparent border-transparent text-white/30 hover:bg-white/5 hover:text-white/60"
               )}
             >
               {renderLucideIcon(icon, 12)}
             </button>
           ))}
          </div>
         </div>
        </form>
       ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full h-7 rounded-lg border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20 transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/50 hover:text-white/80 mt-2"
        >
         <LucideIcons.Plus size={10} />
         Añadir Sub-Rasgo
        </button>
       )
      )}
     </motion.div>
    )}
    </AnimatePresence>
  </div>
 );
};

export const PlayerHUD: React.FC<PlayerHUDProps> = React.memo(({
 attributes = [],
 className,
 defaultChartMode = 'RADAR',
 onAddSubTrait,
 onUpdateSubTrait,
 onDeleteSubTrait,
 onOpenProgress,
}) => {
 const [chartMode, setChartMode] = useState<'RADAR' | 'BAR'>(defaultChartMode);

 useEffect(() => {
   setChartMode(defaultChartMode);
 }, [defaultChartMode]);

 const mainAttributes = useMemo(() => {
   return attributes.filter(a => a.id !== 'DISCIPLINA' && a.id !== 'RESILIENCIA');
 }, [attributes]);

 const orderedAttributes = useMemo(() => {
   return [...mainAttributes].sort((a, b) => {
     if (b.level !== a.level) {
       return b.level - a.level;
     }
     const aXpPct = a.maxXp > 0 ? a.xp / a.maxXp : 0;
     const bXpPct = b.maxXp > 0 ? b.xp / b.maxXp : 0;
     if (bXpPct !== aXpPct) {
       return bXpPct - aXpPct;
     }
     const orderMap = new Map(TRAITS_LIST.map((t, index) => [t.id, index] as const));
     const ai = orderMap.get(a.id) ?? 999;
     const bi = orderMap.get(b.id) ?? 999;
     return ai - bi;
   });
 }, [mainAttributes]);

 return (
  <GlassPanel className={cn("w-full p-3 flex flex-col gap-2 relative", className)}>
   <div className="flex flex-col relative">
    
    {/* Top Header Bar */}
    <div className="flex items-center justify-between px-1 mb-2 w-full z-10">
      {/* Left: Ver Progreso Button */}
      <button
        type="button"
        onClick={onOpenProgress}
        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-bold text-white/70 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
      >
        <LucideIcons.TrendingUp size={11} className="text-cyan-400" />
        <span>Ver Progreso</span>
      </button>

      {/* Right: Radar/Bar toggles */}
      <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
        <button 
          type="button"
          onClick={() => setChartMode('RADAR')}
          className={cn(
            "p-1.5 rounded-md transition-all",
            chartMode === 'RADAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
          )}
        >
          <LucideIcons.Hexagon size={14} />
        </button>
        <button 
          type="button"
          onClick={() => setChartMode('BAR')}
          className={cn(
            "p-1.5 rounded-md transition-all",
            chartMode === 'BAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
          )}
        >
          <LucideIcons.BarChart3 size={14} />
        </button>
      </div>
    </div>

    <div className={cn(
     "relative flex items-center justify-center transition-all duration-500",
     chartMode === 'RADAR' ? "min-h-[160px]" : "min-h-0"
    )}>
     <AnimatePresence mode="wait">
      {chartMode === 'RADAR' ? (
       <motion.div 
         key="radar"
         initial={{ opacity: 0, y: 10, scale: 0.98 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: -10, scale: 0.98 }}
         transition={{ type: "spring", stiffness: 300, damping: 30 }}
         className="w-full h-full flex items-center justify-center"
       >
        <TraitRadarChart attributes={orderedAttributes} />
       </motion.div>
      ) : (
       <motion.div 
         key="bar"
         initial={{ opacity: 0, y: 10, scale: 0.98 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: -10, scale: 0.98 }}
         transition={{ type: "spring", stiffness: 300, damping: 30 }}
         className={cn(
           "w-full grid gap-x-4 gap-y-3 px-1 py-1",
           orderedAttributes.length > 5 ? "grid-cols-2" : "grid-cols-1"
         )}
       >
        {orderedAttributes.map(attr => (
         <TraitBar 
           key={attr.id} 
           attribute={attr} 
           onAddSubTrait={onAddSubTrait}
           onUpdateSubTrait={onUpdateSubTrait}
           onDeleteSubTrait={onDeleteSubTrait}
         />
        ))}
       </motion.div>
      )}
     </AnimatePresence>
    </div>
   </div>
   
   {orderedAttributes.length === 0 && (
    <div className="h-40 flex items-center justify-center text-white/20 text-xs">
     No metrics available
    </div>
   )}
  </GlassPanel>
 );
});
