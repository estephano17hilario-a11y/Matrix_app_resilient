import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, Trash2, Edit2, Target, Coins, Zap, Calendar, Play } from 'lucide-react';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Quest, Attribute, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { cn } from '../../../utils/cn';
import { parseLocalDate } from '../../../utils/dateUtils';
import { SubtaskManager } from './SubtaskManager';
import { triggerFlyingIcon } from '../../dashboard/components/FlyingIcon';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { hapticService } from '../../../services/hapticService';

interface QuestItemProps {
  quest: Quest;
  attribute?: Attribute;
  project?: Project;
  smartProject?: SmartProject;
  onComplete: (e: React.MouseEvent, q: Quest) => void;
  onDelete?: (id: string) => void;
  onEdit?: (quest: Quest) => void;
  onFocusProject?: (projectId: string, taskId?: string) => void;
  isLite?: boolean;
}

export const QuestItem = React.memo(({ quest, attribute, project, smartProject, onComplete, onDelete, onEdit, onFocusProject, isLite }: QuestItemProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const Icon = attribute?.icon;


  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quest.completed) {
      const rect = e.currentTarget.getBoundingClientRect();

      // 🔊 Haptic: heavy vibration for task complete
      hapticService.taskComplete();

      // Coins
      if (coins > 0) {
        triggerFlyingIcon(rect, "gold-counter-pill", <Coins size={24} className="text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,1)]" />, 0);
      }
      
      // XP
      triggerFlyingIcon(rect, "xp-bar-container", <Zap size={24} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,1)]" />, 0.15);
      
      // Trait
      if (attribute && Icon) {
        triggerFlyingIcon(rect, "xp-bar-container", <Icon size={24} style={{ color: themeColor }} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />, 0.3);
      }

      setIsCompleting(true);
      // Wait for animation to float up before actually completing
      setTimeout(() => {
        onComplete(e, quest);
        // We don't reset isCompleting to prevent flickering before unmount
      }, 800); 
    } else {
      onComplete(e, quest);
    }
  };

  const difficultyColors: Record<string, string> = {
    S: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
    A: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    B: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
    C: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10', 
  };

  const diffColor = difficultyColors[quest.difficulty] || 'text-slate-400 border-slate-400/20';
  const xp = quest.xpReward;
  const coins = quest.gold || 0;
  const isSmart = quest.isSmartQuest;
  const themeColor = attribute?.color || '#ffffff';
  const subTrait = attribute?.subTraits?.find(st => st.id === quest.subAttribute);

  const getDeadlineInfo = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = parseLocalDate(dateStr);
    const today = new Date();
    
    if (isToday(date)) return { key: 'today', days: 0 };
    if (isTomorrow(date)) return { key: 'tomorrow', days: 1 };
    
    const days = differenceInDays(date, today);
    
    if (days > 0 && days <= 7) return { key: 'inDays', days };
    if (days < 0) return { key: 'overdue', days };
    
    return { key: 'date', days, text: format(date, 'd MMM', { locale: i18n.language === 'es' ? es : undefined }) };
  };

  const deadlineInfo = getDeadlineInfo(quest.deadline);
  const getDeadlineText = () => {
    if (!deadlineInfo) return null;
    if (deadlineInfo.key === 'today') return t('dashboard.today');
    if (deadlineInfo.key === 'tomorrow') return t('tomorrow');
    if (deadlineInfo.key === 'inDays') return t('common.inDays', { days: deadlineInfo.days });
    if (deadlineInfo.key === 'overdue') return t('overdue');
    return deadlineInfo.text;
  };
  const deadlineText = getDeadlineText();

  const Container: any = isLite ? 'div' : motion.div;

  return (
    <Container
      {...(isLite ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, scale: 0.95 } })}
      className={cn(
        "relative rounded-[1.25rem] transition-all duration-200 mb-3 group overflow-hidden clickable",
        expanded ? "z-10" : "hover:z-10"
      )}
      style={{ 
        // VisionOS "Hyper-Glass" Base
        background: 'rgba(20, 20, 25, 0.7)', // Slightly darker for better contrast and less blur need
        border: isSmart
            ? quest.completed
                ? '1.5px solid rgba(16, 185, 129, 0.45)' // Emerald green
                : '1.5px solid rgba(244, 63, 94, 0.5)'   // Rose red
            : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: expanded 
            ? `0 0 0 1px ${themeColor}40, 0 20px 40px -10px rgba(0,0,0,0.5)` // Active state glow
            : `inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` // Idle state
      }}
    >
      {/* Dynamic Attribute Glow Gradient (Top Left) - OPTIMIZED: Using radial gradient for zero GPU blur cost */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-200"
        style={{ background: `radial-gradient(circle at 0% 0%, ${themeColor}, transparent 70%)` }}
      />
      
      {/* Smart Quest Special Glow - OPTIMIZED */}
      {isSmart && (
         <div 
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: `radial-gradient(circle at 100% 100%, #6366f1, transparent 70%)` }}
         />
      )}

      <div 
        className="relative z-10 p-3 cursor-pointer" 
        onClick={() => {
          setExpanded(!expanded);
        }}
      >
        <div className="flex items-center gap-3.5">
          {/* VISIONOS CHECKBOX / ICON CONTAINER */}
          <button 
            onClick={handleComplete} 
            disabled={isCompleting}
            className={cn(
              "w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 transition-all duration-200 relative overflow-hidden group/icon",
              quest.completed ? "bg-emerald-500/20" : "bg-white/5 hover:bg-white/10"
            )}
            style={{
                borderColor: quest.completed ? 'transparent' : 'rgba(255,255,255,0.1)',
                borderWidth: '1px',
                boxShadow: quest.completed 
                    ? `inset 0 0 15px rgba(16,185,129,0.2)` 
                    : 'inset 0 1px 0 0 rgba(255,255,255,0.05)'
            }}
          >
             {/* Background glow for icon */}
             {!quest.completed && (
                <div 
                    className="absolute inset-0 opacity-0 group-hover/icon:opacity-20 transition-opacity duration-200" 
                    style={{ background: themeColor }}
                />
             )}

             {quest.completed ? (
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                >
                    <CheckCircle2 size={22} strokeWidth={3} />
                </motion.div>
             ) : (
                 Icon ? (
                    <Icon 
                        size={20} 
                        style={{ color: themeColor }} 
                        className="opacity-90 group-hover/icon:scale-110 transition-transform duration-200 drop-shadow-lg"
                        strokeWidth={2}
                    />
                 ) : (
                    <div className={cn("w-3.5 h-3.5 rounded-full border-2", isSmart ? "border-indigo-400" : "border-white/20")} />
                 )
             )}
          </button>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 mr-1">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <h3 className={cn(
                "text-[15px] font-semibold leading-tight tracking-tight transition-all duration-200 flex-1 min-w-0",
                expanded ? "line-clamp-2 break-words" : "truncate",
                quest.completed ? "text-white/30 line-through" : "text-white/95 drop-shadow-md"
              )}>
                {quest.title}
              </h3>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Subtasks Progress Counter Badge (e.g. 0/3) */}
                {quest.subtasks && quest.subtasks.length > 0 && (
                  <span 
                    className="text-[9px] px-1.5 py-[2px] rounded-md font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono tracking-tight shrink-0"
                    title={`${quest.subtasks.filter(s => s.isCompleted || (s as any).completed).length} de ${quest.subtasks.length} subtareas completadas`}
                  >
                    {quest.subtasks.filter(s => s.isCompleted || (s as any).completed).length}/{quest.subtasks.length}
                  </span>
                )}

                {/* Difficulty Badge */}
                <span className={cn("text-[9px] px-1.5 py-[2px] rounded-md font-bold border uppercase tracking-wide opacity-80 shrink-0", diffColor)}>
                  {quest.difficulty}
                </span>
              </div>
            </div>
            
            {/* Pomodoro target circles indicator */}
            {quest.pomodoroTarget ? (
              <div className="flex items-center gap-1.5 mb-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-0.5 flex-wrap max-w-[120px]">
                  {Array.from({ length: quest.pomodoroTarget }).map((_, idx) => {
                    const isCompleted = idx < (quest.pomodoroCompleted || 0);
                    return (
                      <svg
                        key={idx}
                        width="14" height="15"
                        viewBox="0 0 10 11"
                        fill="none"
                        className={cn("transition-all duration-300", isCompleted ? "drop-shadow-[0_0_4px_rgba(239,68,68,0.7)]" : "opacity-25")}
                      >
                        {/* Stem / leaf */}
                        <path d="M5 2.5 C5 2.5 4.2 0.8 3 1 C3 1 4 2 5 2.5Z" fill={isCompleted ? "#4ade80" : "#6b7280"} />
                        <path d="M5 2.5 C5 2.5 5.8 0.8 7 1 C7 1 6 2 5 2.5Z" fill={isCompleted ? "#22c55e" : "#4b5563"} />
                        {/* Body */}
                        <ellipse cx="5" cy="6.5" rx="4" ry="4" fill={isCompleted ? "#ef4444" : "#374151"} />
                        {/* Shine */}
                        <ellipse cx="3.5" cy="4.5" rx="1" ry="0.7" fill={isCompleted ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.05)"} transform="rotate(-20 3.5 4.5)" />
                        {/* Vertical crease */}
                        <path d="M5 3.5 Q4.5 6.5 5 9.5" stroke={isCompleted ? "#dc2626" : "#1f2937"} strokeWidth="0.5" strokeLinecap="round" />
                      </svg>
                    );
                  })}
                </div>
                <span className="text-[9px] font-bold text-rose-400 font-mono">
                  {quest.pomodoroCompleted || 0}/{quest.pomodoroTarget}
                </span>
              </div>
            ) : null}
            
            <div className="flex items-center gap-3 shrink-0">
                 {/* Trait / Strategy Badge - Row 2 */}
                {(attribute || smartProject) && (
                    <div 
                        className="flex items-center gap-1 px-1.5 py-[2px] rounded-md bg-white/5 border border-white/5"
                        style={{ borderColor: `${themeColor}20` }}
                    >
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-90" style={{ color: themeColor }}>
                            {smartProject 
                                ? smartProject.mainGoal 
                                : `${t(attribute?.label || '', (attribute?.label || '').replace('traits.', ''))}${subTrait ? ` › ${subTrait.name}` : ''}`
                            }
                        </span>
                    </div>
                )}
                
                 {/* Deadline - Row 2 */}
                 {deadlineInfo && !quest.completed && (
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wide transition-colors",
                        deadlineInfo.key === 'today' || deadlineInfo.key === 'overdue' 
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-300" 
                            : deadlineInfo.key === 'tomorrow' 
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                : "bg-white/5 border-white/10 text-slate-400"
                    )}>
                        <Calendar size={10} className={deadlineInfo.key === 'today' || deadlineInfo.key === 'overdue' ? "text-rose-400" : "text-slate-500"} />
                        {deadlineText}
                    </div>
                )}
            </div>
          </div>
          
          {/* RIGHT SIDE: Actions Only */}
          <div className="flex items-center gap-2 shrink-0">
             <div className={cn(
                 "flex items-center gap-1 transition-all duration-200",
                 expanded ? "opacity-100" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
             )}>
                {/* EDIT */}
                {onEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(quest); }}
                        className="p-1.5 rounded-lg text-white/40 hover:text-indigo-300 hover:bg-white/5 transition-colors"
                    >
                        <Edit2 size={14} />
                    </button>
                )}

                {/* DELETE */}
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(quest.id); }}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
             </div>

             {/* Play Button to start Focus on the associated project */}
             {quest.projectId && !quest.completed && (
                 <button
                     onClick={(e) => {
                         e.stopPropagation();
                         if (onFocusProject) {
                             onFocusProject(quest.projectId!, quest.id);
                         }
                     }}
                     className="w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 shadow-md shadow-rose-600/20 shrink-0"
                     title="Iniciar Enfoque"
                 >
                     <Play size={10} fill="currentColor" className="ml-[1.5px]" />
                 </button>
             )}

             <ChevronDown 
                size={16} 
                className={cn(
                "text-white/20 transition-transform duration-200",
                expanded ? "rotate-180 text-white/60" : ""
                )} 
            />
          </div>
        </div>
      </div>

        <div className="overflow-hidden">
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="expanded-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pb-4 pl-4 pr-4 sm:pl-[3.75rem] sm:pr-4"> {/* Responsive Padding */}
                
                {/* Rewards - Only Visible when Expanded */}
                {!quest.completed && (
                     <div className="flex flex-wrap items-center gap-3 mb-4">
                        {/* XP Reward */}
                        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <Zap size={12} />
                            <span className="text-xs font-bold">+{Math.floor(xp)} {t('common.xp', 'XP')}</span>
                        </div>

                        {/* Attribute Points Reward (New) */}
                        {attribute && (
                            <div 
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                                style={{ 
                                    color: attribute.color,
                                    backgroundColor: `${attribute.color}15`, // 10% opacity
                                    borderColor: `${attribute.color}30`
                                }}
                            >
                                {attribute.icon && <attribute.icon size={12} />}
                                <span className="text-xs font-bold">+{Math.floor(xp)} {t(attribute.label, attribute.label.replace('traits.', ''))}</span>
                            </div>
                        )}

                        {/* Gold Reward */}
                        {coins > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                <Coins size={12} />
                                <span className="text-xs font-bold">+{coins} {t('common.gold', 'Gold')}</span>
                            </div>
                        )}
                     </div>
                )}

                {/* Description */}
                {quest.description && (
                  <div className="text-[13px] text-white/60 leading-relaxed font-medium mb-4 border-l-2 border-white/10 pl-3">
                    {quest.description}
                  </div>
                )}

                {project && onFocusProject && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onFocusProject(project.id); 
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-500/20 transition-colors"
                    >
                        <Target size={12} />
                        {t('tasks.focusMode', 'Focus Mode')}
                    </button>
                )}

                <SubtaskManager 
                  taskId={quest.id} 
                  initialSubtasks={quest.subtasks} 
                  onSubtasksChange={(newSubtasks) => {
                    // MUTATE the quest object so Dashboard doesn't overwrite it on next render
                    quest.subtasks = newSubtasks;
                  }}
                />

                {quest.deadline && (
                   <div className={cn(
                      "flex items-center gap-2 mt-3 font-mono text-[10px]",
                      isSmart ? "text-indigo-400" : "text-rose-400"
                   )}>
                      <span className="opacity-50 uppercase tracking-widest">{t('tasks.deadline', 'Deadline')}</span>
                      <span className="font-bold">{quest.deadline}</span>
                   </div>
                )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

    </Container>
  );
});
