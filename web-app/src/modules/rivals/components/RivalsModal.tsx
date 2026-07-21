import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Lock, CheckCircle, Swords, Target, Zap, Flame, Star, Award, Sparkles } from 'lucide-react';
import { RIVAL_LEVELS, RivalLevel } from '../config/rivalsConfig';
import { useRivalsLogic } from '../hooks/useRivalsLogic';

interface RivalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTasksCompleted?: number;
  userFocusMinutes?: number;
  userHabitPct?: number;
}

export const RivalsModal: React.FC<RivalsModalProps> = ({
  isOpen,
  onClose,
  userTasksCompleted = 0,
  userFocusMinutes = 0,
  userHabitPct = 0
}) => {
  const {
    progress,
    selectedLevel,
    setSelectedLevel,
    currentLevelData,
    duelEvaluation,
    claimLevelVictory
  } = useRivalsLogic(userTasksCompleted, userFocusMinutes, userHabitPct);

  if (!isOpen || typeof document === 'undefined') return null;

  const isSelectedUnlocked = selectedLevel <= progress.unlockedLevel;
  const isSelectedCompleted = progress.completedLevels.includes(selectedLevel);

  // Mask locked rival details (Punto 4)
  const displayRival = isSelectedUnlocked ? currentLevelData : {
    ...currentLevelData,
    name: 'Rival Misterioso',
    title: `Supera el Nivel ${currentLevelData.level - 1} para revelar`,
    avatar: '🔒',
    quote: 'La identidad y virtudes de esta leyenda se revelarán al alcanzar este nivel.'
  };

  const modalJSX = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        {/* Centered Modal Content Window (Punto 2: Always centered Y-axis in viewport) */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[88vh] bg-zinc-950/95 border border-white/15 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] my-auto"
        >
          {/* Top Header */}
          <div className="px-5 py-4 bg-zinc-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <Swords size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-black text-lg tracking-wider uppercase">
                    Duelos de Productividad
                  </h2>
                  {/* Punto 3: Sleek compact pill badge */}
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    30 Niveles
                  </span>
                </div>
                <p className="text-white/40 text-xs font-mono">
                  Supera a las leyendas para dominar la Matrix
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
            
            {/* Level Roadmap Selector Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                  <Trophy size={14} className="text-amber-400" />
                  Roadmap de Niveles: <span className="text-white">Nivel {progress.unlockedLevel} de 30</span>
                </span>
                <span className="text-xs font-mono text-white/40">
                  Derrotados: {progress.completedLevels.length} / 30
                </span>
              </div>

              {/* 30 Level Roadmap Carousel */}
              <div className="relative flex gap-3 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x px-1">
                {RIVAL_LEVELS.map((rival) => {
                  const isUnlocked = rival.level <= progress.unlockedLevel;
                  const isCurrentActive = rival.level === progress.unlockedLevel;
                  const isDone = progress.completedLevels.includes(rival.level);
                  const isSelected = rival.level === selectedLevel;

                  return (
                    <button
                      key={rival.level}
                      onClick={() => setSelectedLevel(rival.level)}
                      className={`
                        snap-start shrink-0 w-28 p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 relative overflow-hidden group text-center
                        ${isSelected
                          ? 'bg-gradient-to-b from-white/15 to-white/5 border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.25)] scale-105 z-10'
                          : isCurrentActive
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                            : isUnlocked
                              ? 'bg-zinc-900/60 border-white/10 hover:border-white/25 text-white/70'
                              : 'bg-zinc-950/50 border-white/5 opacity-50 cursor-not-allowed'
                        }
                      `}
                    >
                      {/* Level Number */}
                      <div className="absolute top-1.5 left-2 text-[9px] font-black font-mono text-white/40">
                        #{rival.level}
                      </div>

                      {/* Status Icon */}
                      <div className="absolute top-1.5 right-2">
                        {isDone ? (
                          <CheckCircle size={13} className="text-emerald-400" />
                        ) : isCurrentActive ? (
                          <Sparkles size={13} className="text-amber-400 animate-pulse" />
                        ) : !isUnlocked ? (
                          <Lock size={12} className="text-zinc-600" />
                        ) : null}
                      </div>

                      {/* Avatar or Lock Icon */}
                      <div className="text-2xl mt-2.5">
                        {isUnlocked ? rival.avatar : '🔒'}
                      </div>

                      {/* Masked Name for Locked Levels (Punto 4) */}
                      <span className="text-[10px] font-bold text-white truncate w-full px-1">
                        {isUnlocked ? rival.name : 'Rival Misterioso'}
                      </span>

                      {/* Active Level Badge */}
                      {isCurrentActive && (
                        <span className="text-[7px] font-black tracking-widest uppercase bg-amber-500 text-black px-1.5 py-0.5 rounded-full shadow-sm">
                          ACTUAL
                        </span>
                      )}
                      {!isCurrentActive && isUnlocked && (
                        <span
                          className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${rival.color}15`,
                            borderColor: `${rival.color}40`,
                            color: rival.color
                          }}
                        >
                          {rival.difficulty}
                        </span>
                      )}
                      {!isUnlocked && (
                        <span className="text-[8px] font-mono uppercase text-zinc-500">
                          Bloqueado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Rival Battle Card */}
            <div
              className="rounded-3xl border p-5 sm:p-6 relative overflow-hidden transition-all shadow-2xl"
              style={{
                backgroundColor: 'rgba(18, 18, 22, 0.9)',
                borderColor: `${displayRival.color}35`
              }}
            >
              {/* Soft Organic Ambient Glow (Punto 1) */}
              <div
                className="absolute inset-0 pointer-events-none opacity-25 blur-[100px] transition-all"
                style={{
                  background: `radial-gradient(circle at 80% 20%, ${displayRival.color}, transparent 65%)`
                }}
              />

              {/* Rival Header */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl border shadow-xl relative shrink-0"
                    style={{
                      backgroundColor: `${displayRival.color}20`,
                      borderColor: `${displayRival.color}50`
                    }}
                  >
                    {displayRival.avatar}
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full border border-white/20">
                      Lvl {displayRival.level}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-black text-lg sm:text-xl tracking-tight">
                        {displayRival.name}
                      </h3>
                      {isSelectedUnlocked && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${displayRival.color}20`,
                            borderColor: `${displayRival.color}40`,
                            color: displayRival.color
                          }}
                        >
                          {displayRival.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-xs font-medium">
                      {displayRival.title}
                    </p>
                    <p className="text-white/40 italic text-xs mt-1">
                      "{displayRival.quote}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Duel Target Stats Grid */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
                
                {/* TAREAS */}
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Target size={14} className="text-blue-400" />
                      Tareas Hoy
                    </span>
                    {!isSelectedUnlocked ? (
                      <span className="text-zinc-500 font-bold text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                        🔒 Bloqueado
                      </span>
                    ) : duelEvaluation.isTaskWon ? (
                      <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ✓ Superado
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        En progreso
                      </span>
                    )}
                  </div>

                  <div className="my-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{userTasksCompleted}</span>
                    <span className="text-white/40 text-xs font-bold">
                      {isSelectedUnlocked ? ` / ${currentLevelData.targetTasks} meta hoy` : ' / ? meta'}
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${isSelectedUnlocked ? Math.min(100, (userTasksCompleted / currentLevelData.targetTasks) * 100) : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* FOCO / ENFOQUE */}
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={14} className="text-purple-400" />
                      Enfoque Hoy
                    </span>
                    {!isSelectedUnlocked ? (
                      <span className="text-zinc-500 font-bold text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                        🔒 Bloqueado
                      </span>
                    ) : duelEvaluation.isFocusWon ? (
                      <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ✓ Superado
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        En progreso
                      </span>
                    )}
                  </div>

                  <div className="my-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{Math.round(userFocusMinutes / 60 * 10) / 10}h</span>
                    <span className="text-white/40 text-xs font-bold">
                      {isSelectedUnlocked ? ` / ${currentLevelData.targetFocusMinutes / 60}h meta hoy` : ' / ? meta'}
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{
                        width: `${isSelectedUnlocked ? Math.min(100, (userFocusMinutes / currentLevelData.targetFocusMinutes) * 100) : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* HÁBITOS */}
                <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Flame size={14} className="text-orange-400" />
                      Hábitos Hoy
                    </span>
                    {!isSelectedUnlocked ? (
                      <span className="text-zinc-500 font-bold text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                        🔒 Bloqueado
                      </span>
                    ) : duelEvaluation.isHabitWon ? (
                      <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ✓ Superado
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        En progreso
                      </span>
                    )}
                  </div>

                  <div className="my-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{Math.round(userHabitPct)}%</span>
                    <span className="text-white/40 text-xs font-bold">
                      {isSelectedUnlocked ? ` / ${currentLevelData.targetHabitPct}% meta hoy` : ' / ? meta'}
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{
                        width: `${isSelectedUnlocked ? Math.min(100, (userHabitPct / currentLevelData.targetHabitPct) * 100) : 0}%`
                      }}
                    />
                  </div>
                </div>

              </div>

              {/* Action & Rewards Footer */}
              <div className="relative z-10 mt-5 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                    <Award size={16} />
                    Recompensa: +{currentLevelData.rewardGold} Oro
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-sm">
                    <Star size={16} />
                    +{currentLevelData.rewardXp} XP
                  </div>
                </div>

                {isSelectedCompleted ? (
                  <button
                    disabled
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 cursor-default"
                  >
                    <CheckCircle size={18} />
                    <span>Nivel Completado</span>
                  </button>
                ) : isSelectedUnlocked ? (
                  <button
                    onClick={() => claimLevelVictory(selectedLevel)}
                    disabled={!duelEvaluation.isVictor}
                    className={`
                      w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all
                      ${duelEvaluation.isVictor
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 cursor-pointer'
                        : 'bg-zinc-800/80 border border-white/10 text-white/30 cursor-not-allowed'
                      }
                    `}
                  >
                    <Trophy size={18} />
                    <span>
                      {duelEvaluation.isVictor ? 'Reclamar Victoria y Avanzar' : 'Alcanza los objetivos para Vencer'}
                    </span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-zinc-900 border border-white/10 text-white/30 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <Lock size={18} />
                    <span>Nivel Bloqueado (Supera el Nivel {selectedLevel - 1})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalJSX, document.body);
};
