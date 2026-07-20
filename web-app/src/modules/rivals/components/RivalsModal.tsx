import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Lock, CheckCircle, Swords, Clock, Target, Zap, Shield, Flame, Star, Award } from 'lucide-react';
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
    rivalLiveState,
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
        className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-xl flex flex-col justify-between overflow-y-auto"
      >
        {/* Top Header */}
        <div className="sticky top-0 z-30 px-4 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
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
                Supera la jornada de las leyendas para dominar la Matrix
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
          
          {/* Level Selector Carousel / Grid */}
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

            {/* Horizontal 30-Level Scroll */}
            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
              {RIVAL_LEVELS.map((rival) => {
                const isUnlocked = rival.level <= progress.unlockedLevel;
                const isDone = progress.completedLevels.includes(rival.level);
                const isSelected = rival.level === selectedLevel;

                return (
                  <button
                    key={rival.level}
                    onClick={() => setSelectedLevel(rival.level)}
                    className={`
                      snap-start shrink-0 w-24 p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 relative overflow-hidden group
                      ${isSelected
                        ? 'bg-gradient-to-b from-white/15 to-white/5 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-105'
                        : isUnlocked
                          ? 'bg-zinc-900/60 border-white/10 hover:border-white/20 text-white/70'
                          : 'bg-zinc-950/40 border-white/5 opacity-40 grayscale cursor-not-allowed'
                      }
                    `}
                  >
                    {/* Badge Top Left */}
                    <div className="absolute top-1.5 left-1.5 text-[9px] font-black font-mono text-white/50">
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

                    <div className="text-2xl mt-3">{rival.avatar}</div>
                    <span className="text-[10px] font-bold text-white truncate w-full text-center">
                      {rival.name.split(' ')[0]}
                    </span>
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Rival Battle Card */}
          <div
            className="rounded-3xl border p-6 relative overflow-hidden backdrop-blur-xl transition-all shadow-2xl"
            style={{
              backgroundColor: 'rgba(18, 18, 20, 0.85)',
              borderColor: `${currentLevelData.color}40`,
              boxShadow: `0 0 40px -10px ${currentLevelData.color}25`
            }}
          >
            {/* Background Accent Glow */}
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ backgroundColor: currentLevelData.color }}
            />

            {/* Rival Banner Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border shadow-xl relative"
                  style={{
                    backgroundColor: `${currentLevelData.color}20`,
                    borderColor: `${currentLevelData.color}50`
                  }}
                >
                  {currentLevelData.avatar}
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-full border border-white/20">
                    Lvl {currentLevelData.level}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-black text-xl tracking-tight">
                      {currentLevelData.name}
                    </h3>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
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

              {/* Workday Schedule Status Badge */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-1.5 w-full md:w-auto min-w-[220px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Clock size={12} className="text-orange-400" />
                    Jornada Rival
                  </span>
                  <span className="text-white font-mono font-bold">
                    {currentLevelData.workStartHour}:00 - {currentLevelData.workEndHour}:00
                  </span>
                </div>

                {/* Progress bar of workday */}
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(rivalLiveState.progressRatio * 100)}%`,
                      backgroundColor: currentLevelData.color
                    }}
                  />
                </div>

                <span className="text-[10px] font-medium text-white/60 text-center">
                  {rivalLiveState.message}
                </span>
              </div>
            </div>

            {/* Duel Stats Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              
              {/* TAREAS */}
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={14} className="text-blue-400" />
                    Tareas
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

                <div className="my-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{userTasksCompleted}</span>
                    <span className="text-white/40 text-xs font-bold"> / {currentLevelData.targetTasks} objetivo</span>
                  </div>
                  <div className="text-right font-mono text-xs text-white/40">
                    Rival hoy: {rivalLiveState.simulatedTasks}
                  </div>
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
                    Enfoque
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

                <div className="my-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{Math.round(userFocusMinutes / 60 * 10) / 10}h</span>
                    <span className="text-white/40 text-xs font-bold"> / {currentLevelData.targetFocusMinutes / 60}h objetivo</span>
                  </div>
                  <div className="text-right font-mono text-xs text-white/40">
                    Rival hoy: {Math.round(rivalLiveState.simulatedFocusMinutes / 60 * 10) / 10}h
                  </div>
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
                    Hábitos
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

                <div className="my-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{Math.round(userHabitPct)}%</span>
                    <span className="text-white/40 text-xs font-bold"> / {currentLevelData.targetHabitPct}% objetivo</span>
                  </div>
                  <div className="text-right font-mono text-xs text-white/40">
                    Rival hoy: {rivalLiveState.simulatedHabitPct}%
                  </div>
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

            {/* Action Bar & Victory Claim */}
            <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
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
    </AnimatePresence>
  );
};
