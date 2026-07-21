import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Lock, CheckCircle, Swords, Target, Zap, Flame, Star, Award } from 'lucide-react';
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

  if (!isOpen) return null;

  const isLevelUnlocked = selectedLevel <= progress.unlockedLevel;
  const isLevelCompleted = progress.completedLevels.includes(selectedLevel);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        {/* Centered Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950/95 border border-white/15 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] my-auto"
        >
          {/* Top Header */}
          <div className="px-5 py-4 bg-zinc-900/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <Swords size={20} />
              </div>
              <div>
                <h2 className="text-white font-black text-lg tracking-wider uppercase flex items-center gap-2">
                  Duelos de Productividad
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
                    30 Niveles
                  </span>
                </h2>
                <p className="text-white/40 text-xs font-mono">
                  Supera los estándares de las leyendas para dominar la Matrix
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

          {/* Scrollable Modal Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
            
            {/* Level Selector Carousel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                  <Trophy size={14} className="text-amber-400" />
                  Nivel Actual: <span className="text-white">{progress.unlockedLevel} / 30</span>
                </span>
                <span className="text-xs font-mono text-white/40">
                  Completados: {progress.completedLevels.length}
                </span>
              </div>

              {/* 30 Level Horizontal Scroll */}
              <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
                {RIVAL_LEVELS.map((rival) => {
                  const isUnlocked = rival.level <= progress.unlockedLevel;
                  const isDone = progress.completedLevels.includes(rival.level);
                  const isSelected = rival.level === selectedLevel;

                  return (
                    <button
                      key={rival.level}
                      onClick={() => setSelectedLevel(rival.level)}
                      className={`
                        snap-start shrink-0 w-28 p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 relative overflow-hidden group text-center
                        ${isSelected
                          ? 'bg-gradient-to-b from-white/15 to-white/5 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-105'
                          : isUnlocked
                            ? 'bg-zinc-900/60 border-white/10 hover:border-white/20 text-white/70'
                            : 'bg-zinc-950/40 border-white/5 opacity-40 grayscale cursor-not-allowed'
                        }
                      `}
                    >
                      {/* Badge Top Left */}
                      <div className="absolute top-1.5 left-1.5 text-[9px] font-black font-mono text-white/40">
                        #{rival.level}
                      </div>

                      {/* Check or Lock Badge Top Right */}
                      <div className="absolute top-1.5 right-1.5">
                        {isDone ? (
                          <CheckCircle size={12} className="text-emerald-400" />
                        ) : !isUnlocked ? (
                          <Lock size={12} className="text-zinc-500" />
                        ) : null}
                      </div>

                      <div className="text-2xl mt-2">{rival.avatar}</div>
                      <span className="text-[10px] font-bold text-white truncate w-full px-1">
                        {rival.name}
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-md border mt-0.5"
                        style={{
                          backgroundColor: `${rival.color}15`,
                          borderColor: `${rival.color}40`,
                          color: rival.color
                        }}
                      >
                        {rival.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Rival Details Card */}
            <div
              className="rounded-3xl border p-5 sm:p-6 relative overflow-hidden transition-all shadow-2xl"
              style={{
                backgroundColor: 'rgba(18, 18, 22, 0.9)',
                borderColor: `${currentLevelData.color}35`
              }}
            >
              {/* Soft Organic Ambient Glow (No Vector Lines) */}
              <div
                className="absolute inset-0 pointer-events-none opacity-25 blur-[100px] transition-all"
                style={{
                  background: `radial-gradient(circle at 80% 20%, ${currentLevelData.color}, transparent 65%)`
                }}
              />

              {/* Rival Info Header */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl border shadow-xl relative shrink-0"
                    style={{
                      backgroundColor: `${currentLevelData.color}20`,
                      borderColor: `${currentLevelData.color}50`
                    }}
                  >
                    {currentLevelData.avatar}
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full border border-white/20">
                      Lvl {currentLevelData.level}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-black text-lg sm:text-xl tracking-tight">
                        {currentLevelData.name}
                      </h3>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${currentLevelData.color}20`,
                          borderColor: `${currentLevelData.color}40`,
                          color: currentLevelData.color
                        }}
                      >
                        {currentLevelData.difficulty}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs font-medium">
                      {currentLevelData.title}
                    </p>
                    <p className="text-white/40 italic text-xs mt-1">
                      "{currentLevelData.quote}"
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
                    {duelEvaluation.isTaskWon ? (
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
                    <span className="text-white/40 text-xs font-bold"> / {currentLevelData.targetTasks} meta hoy</span>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (userTasksCompleted / currentLevelData.targetTasks) * 100)}%`
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
                    {duelEvaluation.isFocusWon ? (
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
                    <span className="text-white/40 text-xs font-bold"> / {currentLevelData.targetFocusMinutes / 60}h meta hoy</span>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (userFocusMinutes / currentLevelData.targetFocusMinutes) * 100)}%`
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
                    {duelEvaluation.isHabitWon ? (
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
                    <span className="text-white/40 text-xs font-bold"> / {currentLevelData.targetHabitPct}% meta hoy</span>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (userHabitPct / currentLevelData.targetHabitPct) * 100)}%`
                      }}
                    />
                  </div>
                </div>

              </div>

              {/* Reward & Victory Action Bar */}
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

                {isLevelCompleted ? (
                  <button
                    disabled
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 cursor-default"
                  >
                    <CheckCircle size={18} />
                    <span>Nivel Completado</span>
                  </button>
                ) : isLevelUnlocked ? (
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
};
