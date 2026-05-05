import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Hexagon, BarChart3, HelpCircle } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { LiquidProgressBar } from '@/components/ui/LiquidProgressBar';
import { cn } from '@/utils/cn';
import { TraitRadarChart } from './components/TraitRadarChart';
import { TRAITS_LIST } from './constants';
import { Attribute } from '@/types';

interface PlayerHUDProps {
 attributes?: Attribute[];
 className?: string;
 defaultChartMode?: 'RADAR' | 'BAR';
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

const TraitBar = ({ 
 attribute, 
 mini = false,
}: { 
 attribute: Attribute, 
 mini?: boolean,
}) => {
 const { t } = useTranslation();
 // 🛡️ SAFE CALCULATION
 const safeXp = Number.isFinite(attribute.xp) ? Math.round(attribute.xp) : 0;
 const safeMax = (Number.isFinite(attribute.maxXp) && attribute.maxXp > 0) ? Math.round(attribute.maxXp) : 1;
 
 const Icon = attribute.icon || HelpCircle;
 const barColor = getTraitColor(attribute.id);
 
 return (
 <div className={cn("flex flex-col gap-1", mini ? "w-full" : "w-full")}>
 <div className="flex items-center justify-between text-[10px] mb-0.5">
 <div className="flex items-center gap-1.5 overflow-hidden">
 <div className={cn(
 "w-4 h-4 rounded-md flex items-center justify-center bg-white/5 shrink-0",
 `text-${barColor}-400`
 )}>
 <Icon size={10} />
 </div>
 {!mini && <span className="font-medium text-white/80 truncate">{t(attribute.label, attribute.label.replace('traits.', ''))}</span>}
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <span className="font-mono text-[8px] text-white/30">{safeXp}/{safeMax}</span>
 <span 
 className="font-mono text-[9px] opacity-60 font-bold text-white/70"
 >
 Lvl {attribute.level}
 </span>
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
 );
};

export const PlayerHUD: React.FC<PlayerHUDProps> = React.memo(({
 attributes = [],
 className,
 defaultChartMode = 'RADAR',
}) => {
 const [chartMode, setChartMode] = useState<'RADAR' | 'BAR'>(defaultChartMode);

 useEffect(() => {
 setChartMode(defaultChartMode);
 }, [defaultChartMode]);

 const orderedAttributes = useMemo(() => {
 return [...attributes].sort((a, b) => {
 // Primary sort: Level (Highest first)
 if (b.level !== a.level) {
 return b.level - a.level;
 }
 // Secondary sort: XP percentage (Highest first)
 const aXpPct = a.maxXp > 0 ? a.xp / a.maxXp : 0;
 const bXpPct = b.maxXp > 0 ? b.xp / b.maxXp : 0;
 if (bXpPct !== aXpPct) {
 return bXpPct - aXpPct;
 }
 // Tertiary sort: Original order from TRAITS_LIST
 const orderMap = new Map(TRAITS_LIST.map((t, index) => [t.id, index] as const));
 const ai = orderMap.get(a.id) ?? 999;
 const bi = orderMap.get(b.id) ?? 999;
 return ai - bi;
 });
 }, [attributes]);

 return (
 <GlassPanel className={cn("p-3 flex flex-col gap-2", className)}>
 {/* SYSTEM METRICS - TRAIT ANALYSIS */}
 <div className="flex flex-col relative">
 
 {chartMode === 'BAR' ? (
 <div className="flex items-center justify-end px-1 mb-2">
 {/* CHART TOGGLE */}
 <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
 <button 
 onClick={() => setChartMode('RADAR')}
 className="p-1.5 rounded-md transition-all text-white/40 hover:text-white/60"
 >
 <Hexagon size={14} />
 </button>
 <button 
 onClick={() => setChartMode('BAR')}
 className="p-1.5 rounded-md transition-all bg-white/10 text-white shadow-sm"
 >
 <BarChart3 size={14} />
 </button>
 </div>
 </div>
 ) : (
 <div className="absolute top-0 right-0 z-10">
 <div className="flex bg-black/60 p-0.5 rounded-lg border border-white/5">
 <button 
 onClick={() => setChartMode('RADAR')}
 className="p-1.5 rounded-md transition-all bg-white/10 text-white shadow-sm"
 >
 <Hexagon size={14} />
 </button>
 <button 
 onClick={() => setChartMode('BAR')}
 className="p-1.5 rounded-md transition-all text-white/40 hover:text-white/60"
 >
 <BarChart3 size={14} />
 </button>
 </div>
 </div>
 )}

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
