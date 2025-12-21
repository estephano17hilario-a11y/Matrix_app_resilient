import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Hexagon, BarChart3, HelpCircle } from 'lucide-react';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { LiquidProgressBar } from '../../components/ui/LiquidProgressBar';
import { cn } from '../../utils/cn';
import { TraitRadarChart } from './components/TraitRadarChart';
import { TRAITS_LIST } from './constants';
import { Attribute } from '../../types';

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

const TraitBar = ({ attribute, mini = false }: { attribute: Attribute, mini?: boolean }) => {
    const { t } = useTranslation();
    // 🛡️ SAFE CALCULATION
    const safeXp = Number.isFinite(attribute.xp) ? Math.round(attribute.xp) : 0;
    const safeMax = (Number.isFinite(attribute.maxXp) && attribute.maxXp > 0) ? Math.round(attribute.maxXp) : 1;
    
    const Icon = attribute.icon || HelpCircle;
    const barColor = getTraitColor(attribute.id);
    
    return (
        <div className={cn("flex flex-col gap-1", mini ? "w-full" : "w-full")}>
            <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center bg-white/5",
                      `text-${barColor}-400`
                    )}>
                        <Icon size={12} />
                    </div>
                    {!mini && <span className="font-medium text-white/80">{t(attribute.label)}</span>}
                </div>
                <div className="flex flex-col items-end leading-none gap-0.5">
                    <span className="font-mono text-[9px] text-white/50">{safeXp}/{safeMax}</span>
                    <span className="font-mono text-[10px] opacity-60 font-bold">{t('dashboard.level')} {attribute.level}</span>
                </div>
            </div>
            {!mini && (
                <LiquidProgressBar 
                  value={safeXp} 
                  max={safeMax} 
                  color={barColor}
                  size="sm"
                />
            )}
        </div>
    );
};

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  attributes = [],
  className,
  defaultChartMode = 'RADAR'
}) => {
  const [chartMode, setChartMode] = useState<'RADAR' | 'BAR'>(defaultChartMode);

  useEffect(() => {
    setChartMode(defaultChartMode);
  }, [defaultChartMode]);

  const orderedAttributes = useMemo(() => {
    const orderMap = new Map(TRAITS_LIST.map((t, index) => [t.id, index] as const));
    return [...attributes].sort((a, b) => {
      const ai = orderMap.get(a.id) ?? 0;
      const bi = orderMap.get(b.id) ?? 0;
      return ai - bi;
    });
  }, [attributes]);

  return (
    <GlassPanel className={cn("p-2 flex flex-col gap-1", className)}>
      {/* SYSTEM METRICS - TRAIT ANALYSIS */}
      {orderedAttributes.length > 0 && (
          <div className="flex flex-col gap-0">
             <div className="flex items-center justify-between px-1">
                 <h3 className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={10} className="text-indigo-400" /> System Metrics
                </h3>
                
                {/* CHART TOGGLE */}
                <div className="flex bg-white/5 p-0.5 rounded-md border border-white/5 scale-75 origin-right">
                    <button 
                        onClick={() => setChartMode('RADAR')}
                        className={cn(
                            "p-1.5 rounded-md transition-all", 
                            chartMode === 'RADAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        <Hexagon size={12} />
                    </button>
                    <button 
                        onClick={() => setChartMode('BAR')}
                        className={cn(
                            "p-1.5 rounded-md transition-all", 
                            chartMode === 'BAR' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        <BarChart3 size={12} />
                    </button>
                </div>
             </div>

             <div className="mt-2 relative min-h-[180px] flex items-center justify-center">
                 <AnimatePresence mode="wait">
                    {chartMode === 'RADAR' ? (
                        <motion.div 
                            key="radar"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <TraitRadarChart attributes={orderedAttributes} />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="bar"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full flex flex-col gap-3 px-1 py-2 overflow-y-auto max-h-[200px] scrollbar-hide"
                        >
                            {orderedAttributes.map(attr => (
                                <TraitBar key={attr.id} attribute={attr} />
                            ))}
                        </motion.div>
                    )}
                 </AnimatePresence>
             </div>
          </div>
      )}
      
      {orderedAttributes.length === 0 && (
          <div className="h-40 flex items-center justify-center text-white/20 text-xs">
              No metrics available
          </div>
      )}
    </GlassPanel>
  );
};
