import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Hexagon, BarChart3 } from 'lucide-react';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { cn } from '../../utils/cn';
import { TraitRadarChart } from './components/TraitRadarChart';
import { TRAITS_LIST } from './constants';

interface Attribute {
  id: string;
  label: string;
  level: number;
  xp: number;
  maxXp: number;
  color: string;
  icon: React.ElementType;
}

interface PlayerHUDProps {
  attributes?: Attribute[];
  className?: string;
}

const TraitBar = ({ attribute, mini = false }: { attribute: Attribute, mini?: boolean }) => {
    const percent = Math.min(100, Math.max(0, (attribute.xp / attribute.maxXp) * 100));
    const Icon = attribute.icon;
    
    return (
        <div className={cn("flex flex-col gap-1", mini ? "w-full" : "w-full")}>
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-white/5" style={{ color: attribute.color }}>
                        <Icon size={12} />
                    </div>
                    {!mini && <span className="font-medium text-white/80">{attribute.label}</span>}
                </div>
                <span className="font-mono text-[10px] opacity-60">Lvl {attribute.level}</span>
            </div>
            {!mini && (
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: attribute.color }}
                    />
                </div>
            )}
        </div>
    );
};

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  attributes = [],
  className
}) => {
  const [chartMode, setChartMode] = useState<'RADAR' | 'BAR'>('RADAR');
  const orderedAttributes = useMemo(() => {
    const orderMap = new Map(TRAITS_LIST.map((t, index) => [t.id, index] as const));
    return [...attributes].sort((a, b) => {
      const ai = orderMap.get(a.id) ?? 0;
      const bi = orderMap.get(b.id) ?? 0;
      return ai - bi;
    });
  }, [attributes]);

  const sortedAttributes = useMemo(
    () => [...orderedAttributes].sort((a, b) => b.xp - a.xp).slice(0, 3),
    [orderedAttributes]
  );

  return (
    <GlassPanel className={cn("p-5 flex flex-col gap-6", className)}>
      {/* SYSTEM METRICS - TRAIT ANALYSIS */}
      {orderedAttributes.length > 0 && (
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                 <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} className="text-indigo-400" /> System Metrics
                </h3>
                
                {/* CHART TOGGLE */}
                <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button 
                        onClick={() => setChartMode('RADAR')}
                        className={cn(
                            "p-1.5 rounded-md transition-all", 
                            chartMode === 'RADAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                        )}
                        title="Radar Analysis"
                    >
                        <Hexagon size={14} />
                    </button>
                    <button 
                        onClick={() => setChartMode('BAR')}
                        className={cn(
                            "p-1.5 rounded-md transition-all", 
                            chartMode === 'BAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                        )}
                        title="List View"
                    >
                        <BarChart3 size={14} />
                    </button>
                </div>
            </div>

            <div className="min-h-[200px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {chartMode === 'RADAR' ? (
                        <motion.div 
                            key="RADAR"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full flex justify-center py-2"
                        >
                            <TraitRadarChart attributes={orderedAttributes} />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="BAR"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full flex flex-col gap-4"
                        >
                            {/* TOP ATTRIBUTES */}
                            <div className="grid grid-cols-3 gap-2">
                                {sortedAttributes.map(attr => (
                                    <div key={attr.id} className="bg-white/5 rounded-xl p-2 flex flex-col items-center gap-1 border border-white/5">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 mb-1" style={{ color: attr.color }}>
                                            <attr.icon size={16} />
                                        </div>
                                        <span className="text-[10px] font-bold text-white/90">{attr.label}</span>
                                        <span className="text-[9px] font-mono text-white/50">Lvl {attr.level}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* ALL LIST */}
                            <div className="grid grid-cols-2 gap-3">
                                {orderedAttributes.map(attr => (
                                    <TraitBar key={attr.id} attribute={attr} />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </div>
      )}
    </GlassPanel>
  );
};
