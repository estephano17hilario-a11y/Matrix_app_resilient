import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, Flame, ListChecks, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

interface DayScore {
  date: string;
  label: string;
  tasks: number;
  habits: number;
  focus: number;
  subHabits: number;
  total: number;
}

interface FeedScoreBreakdownChartProps {
  days: DayScore[];
  delay?: number;
  weekRangeText?: string;
  isCurrentWeek?: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  consistencyAssistant?: {
    prevWeekTotal: number;
    accumulatedDeficit: number;
    remainingDays: number;
    deficitShare: number;
    prevWeekTodayScore: number;
    todayTargetScore: number;
    todayIdx: number;
    hasDrop: boolean;
  } | null;
}

type ChartViewMode = 'general' | 'tasks' | 'habits' | 'focus' | 'subHabits';

const CATEGORIES = [
  { key: 'tasks' as const, label: 'Tareas', color: '#f97316', gradientEnd: '#fb923c', icon: CheckCircle2 },
  { key: 'habits' as const, label: 'Hábitos', color: '#22c55e', gradientEnd: '#4ade80', icon: Flame },
  { key: 'focus' as const, label: 'Focus', color: '#6366f1', gradientEnd: '#818cf8', icon: Clock },
  { key: 'subHabits' as const, label: 'Sub-hab', color: '#06b6d4', gradientEnd: '#22d3ee', icon: ListChecks },
];

export const FeedScoreBreakdownChart: React.FC<FeedScoreBreakdownChartProps> = ({ 
  days, 
  delay = 0,
  weekRangeText,
  isCurrentWeek = false,
  onPrevWeek,
  onNextWeek,
  consistencyAssistant
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('general');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartHeight = 120;

  // Dynamic limits and Y-axis labels depending on the selected mode
  const currentMax = useMemo(() => {
    switch (viewMode) {
      case 'tasks': return 20;
      case 'habits': return 40;
      case 'focus': return 40;
      case 'subHabits': return 12;
      default: return 100;
    }
  }, [viewMode]);

  const yLabels = useMemo(() => {
    switch (viewMode) {
      case 'tasks': return ['20', '15', '10', '5', '0'];
      case 'habits': return ['40', '30', '20', '10', '0'];
      case 'focus': return ['40', '30', '20', '10', '0'];
      case 'subHabits': return ['12', '9', '6', '3', '0'];
      default: return ['100', '75', '50', '25', '0'];
    }
  }, [viewMode]);

  return (
    <motion.div
      className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0c0d1b] via-[#050610] to-[#080918] p-4 shadow-lg relative overflow-hidden flex flex-col"
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top glow accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500/60 via-emerald-500/60 via-indigo-500/60 to-cyan-500/60" />
      
      {/* Ambient glows */}
      <div 
        className="absolute -top-8 right-8 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', transform: 'translateZ(0)' }}
      />
      <div 
        className="absolute -bottom-6 left-6 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', transform: 'translateZ(0)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-indigo-400 animate-pulse" />
          <span className="text-[10px] font-black text-white/45 uppercase tracking-[0.15em]">
            Score por Categoría
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[9px] font-black uppercase text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
        >
          {isExpanded ? 'Minimizar' : 'Maximizar'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            {/* Integrated Week Switcher */}
            {weekRangeText && onPrevWeek && onNextWeek && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/[0.03] mb-3">
                <button
                  onClick={onPrevWeek}
                  className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                  title="Semana Anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                
                <div className="text-center">
                  <span className="text-[10px] font-black text-white tracking-wide">
                    {weekRangeText}
                  </span>
                  {isCurrentWeek && (
                    <span className="ml-1.5 text-[7px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1 py-0.5 rounded">
                      Actual
                    </span>
                  )}
                </div>

                <button
                  onClick={onNextWeek}
                  disabled={isCurrentWeek}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isCurrentWeek 
                      ? 'opacity-20 cursor-not-allowed bg-transparent text-white/20' 
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08]'
                  }`}
                  title="Siguiente Semana"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Dynamic Selector Switch Tabs */}
            <div className="flex p-[2px] bg-white/[0.02] rounded-xl border border-white/[0.04] mb-4 overflow-x-auto scrollbar-none gap-0.5 relative z-10 shrink-0">
              {(['general', 'tasks', 'habits', 'focus', 'subHabits'] as ChartViewMode[]).map((mode) => {
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`relative flex-1 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 whitespace-nowrap text-center ${
                      isActive ? 'text-black font-black shadow-md' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={`active-chart-tab-${delay}`}
                        className="absolute inset-0 bg-white rounded-lg"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">
                      {mode === 'general' ? 'General' :
                       mode === 'tasks' ? 'Tareas' :
                       mode === 'habits' ? 'Hábitos' :
                       mode === 'focus' ? 'Focus' : 'Sub-hab'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Y-axis labels + Chart Plot Area */}
            <div className="flex gap-2 relative z-10" style={{ height: chartHeight }}>
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between text-[7px] font-bold text-white/20 w-5 shrink-0 tabular-nums pb-0.5">
                <span>{yLabels[0]}</span>
                <span>{yLabels[1]}</span>
                <span>{yLabels[2]}</span>
                <span>{yLabels[3]}</span>
                <span>{yLabels[4]}</span>
              </div>

              {/* Bars container */}
              <div className="flex-1 flex items-end justify-around relative">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                  <div className="w-full h-px bg-white/[0.04]" />
                  <div className="w-full h-px bg-white/[0.03]" />
                  <div className="w-full h-px bg-white/[0.03]" />
                  <div className="w-full h-px bg-white/[0.03]" />
                  <div className="w-full h-px bg-white/[0.06]" />
                </div>

                {days.map((day, dayIdx) => {
                  // Compute heights of each category
                  let totalHeight = 0;
                  const categoryHeights = CATEGORIES.map(cat => {
                    const isVisible = viewMode === 'general' || viewMode === cat.key;
                    const val = day[cat.key];
                    const rawHeight = isVisible ? (val / (viewMode === 'general' ? 100 : currentMax)) * chartHeight : 0;
                    const height = Math.max(rawHeight, 0);
                    totalHeight += height;
                    return { ...cat, height, value: val };
                  });

                  const todayStr = (() => {
                    const d = new Date();
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const date = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${date}`;
                  })();
                  const isToday = day.date === todayStr;

                  return (
                    <div 
                      key={dayIdx} 
                      className="flex-1 flex items-end justify-center relative" 
                      style={{ maxWidth: 32, height: '100%' }}
                      onMouseEnter={() => setActiveIndex(dayIdx)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onTouchStart={() => setActiveIndex(dayIdx)}
                      onTouchEnd={() => setActiveIndex(null)}
                    >
                      {/* Dotted target line overlay for consistency meta */}
                      {isToday && viewMode === 'general' && isCurrentWeek && consistencyAssistant && consistencyAssistant.todayTargetScore > 0 && (
                        <div 
                          className="absolute left-0 right-0 h-px border-t border-dashed border-amber-400/80 z-20 pointer-events-none"
                          style={{ 
                            bottom: Math.min((consistencyAssistant.todayTargetScore / 100) * chartHeight, chartHeight - 2),
                          }}
                          title={`Meta de Hoy: ${consistencyAssistant.todayTargetScore.toFixed(0)}%`}
                        >
                          <span className="absolute -top-3.5 right-0.5 text-[6px] font-black text-amber-400 bg-[#0c0d1b] px-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                            Meta {consistencyAssistant.todayTargetScore.toFixed(0)}%
                          </span>
                        </div>
                      )}

                      {/* Exact score bubble */}
                      <div 
                        className={`absolute left-1/2 -translate-x-1/2 bg-white text-[#0a0c1a] text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_2px_8px_rgba(0,0,0,0.35)] pointer-events-none transition-all duration-200 z-40 ${
                          activeIndex === dayIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                        style={{ 
                          bottom: Math.max(totalHeight + 4, 8),
                        }}
                      >
                        {viewMode === 'general' 
                          ? `${day.total.toFixed(0)}%` 
                          : `${(categoryHeights.find(c => c.key === viewMode)?.value || 0).toFixed(0)}`
                        }
                      </div>

                      {/* Tooltip Detailed Breakdown */}
                      <div 
                        className={`absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200 z-30 ${
                          activeIndex === dayIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                        style={{ 
                          bottom: Math.max(totalHeight + 24, 28),
                        }}
                      >
                        <div className="bg-[#10121d]/95 border border-white/[0.08] backdrop-blur-md rounded-xl p-2.5 shadow-2xl whitespace-nowrap text-left">
                          <div className="text-[9px] font-black text-white/50 uppercase tracking-wider mb-1.5 border-b border-white/[0.05] pb-1 font-mono">
                            {day.label} &middot; Detalle
                          </div>
                          
                          {viewMode === 'general' ? (
                            <div className="space-y-1">
                              {categoryHeights.filter(s => s.value > 0).map(s => (
                                <div key={s.key} className="flex items-center gap-2 text-[9px]">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                  <span className="text-white/40 font-bold uppercase tracking-wider">{s.label}:</span>
                                  <span className="font-black text-white ml-auto tabular-nums">{s.value.toFixed(1)}%</span>
                                </div>
                              ))}
                              <div className="border-t border-white/[0.06] mt-1.5 pt-1 flex items-center justify-between text-[9px] font-black text-white">
                                <span>Total:</span>
                                <span className="tabular-nums" style={{ color: day.total >= 75 ? '#22c55e' : day.total >= 50 ? '#6366f1' : '#f59e0b' }}>
                                  {day.total.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const seg = categoryHeights.find(c => c.key === viewMode);
                              if (!seg) return <div className="text-[9px] text-white/40">Sin datos</div>;
                              return (
                                <div className="text-[9px] flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                                  <span className="text-white/40 font-bold uppercase tracking-wider">{seg.label}:</span>
                                  <span className="font-black text-white tabular-nums">{seg.value.toFixed(1)} / {currentMax}</span>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>

                      {/* Bar wrapper with smooth 60fps height transition */}
                      <motion.div
                        className="w-full flex flex-col-reverse rounded-t-md overflow-hidden relative group cursor-pointer hover:scale-y-[1.03] origin-bottom transition-transform duration-200"
                        style={{ 
                          height: Math.max(totalHeight, 2),
                          willChange: 'height',
                        }}
                        animate={{ height: Math.max(totalHeight, 2) }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      >
                        {categoryHeights.map((seg) => (
                          <motion.div
                            key={seg.key}
                            className="w-full relative first:rounded-b-sm last:rounded-t-md"
                            style={{
                              background: `linear-gradient(to top, ${seg.color}dd, ${seg.gradientEnd})`,
                              minHeight: seg.height > 0 ? 1 : 0,
                              willChange: 'height',
                            }}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ 
                              height: seg.height, 
                              opacity: seg.height > 0 ? 1 : 0 
                            }}
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          >
                            {/* Shimmer line overlay */}
                            <div className="absolute inset-0 bg-white/[0.04] pointer-events-none" />
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis Day labels row */}
            <div className="flex gap-2 mt-2 relative z-10 shrink-0">
              <div className="w-5 shrink-0" />
              <div className="flex-1 flex justify-around">
                {days.map((day, dayIdx) => (
                  <motion.span
                    key={dayIdx}
                    className={`text-[8px] font-bold tabular-nums text-center ${day.total > 0 ? 'text-white/35' : 'text-white/15'}`}
                    style={{ width: 32 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: delay + 0.3 + dayIdx * 0.04 }}
                  >
                    {day.label}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Legend */}
            <motion.div
              className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-t-white/[0.04] relative z-10 shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.6, duration: 0.5 }}
            >
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isDimmed = viewMode !== 'general' && viewMode !== cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setViewMode(cat.key)}
                    className={`flex items-center gap-1 transition-all duration-300 hover:brightness-125 ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
                  >
                    <Icon size={9} style={{ color: cat.color }} />
                    <span className="text-[8px] font-bold text-white/35 uppercase tracking-wider">{cat.label}</span>
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
