import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Lock, CheckCircle, Swords, Target, Zap, Flame, Star, Award, Sparkles, Crown, Compass, Clock } from 'lucide-react';
import { RIVAL_LEVELS } from '../config/rivalsConfig';
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
        {/* Centered Modal Content Window (Always centered Y-axis in viewport) */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950/95 border border-white/15 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] my-auto"
        >
          {/* Top Header */}
          <div className="px-5 py-4 bg-zinc-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
                <Swords size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-black text-lg tracking-wider uppercase flex items-center gap-2">
                    Duelos de Productividad
                  </h2>
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    30 Niveles
                  </span>
                </div>
                <p className="text-white/40 text-xs font-mono">
                  Mapa de Batallas & Enfréntate a las Leyendas
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
            
            {/* Structured Game World Map Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                  <Compass size={15} className="text-amber-400 animate-spin-slow" />
                  Mapa de Niveles: <span className="text-white font-mono font-black">Nivel {progress.unlockedLevel} / 30</span>
                </span>
                <span className="text-xs font-mono text-amber-400/90 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Derrotados: {progress.completedLevels.length} / 30
                </span>
              </div>

              {/* 30-Level Game Boss Roadmap Container */}
              <div className="relative bg-zinc-900/50 border border-white/10 rounded-3xl p-4 overflow-hidden shadow-inner">
                {/* Glowing Map Path Line */}
                <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 -translate-y-1/2 opacity-25 rounded-full pointer-events-none" />

                {/* 30 Level Horizontal Connected Path */}
                <div className="relative z-10 flex gap-4 overflow-x-auto pb-4 pt-6 scrollbar-none snap-x px-2">
                  {RIVAL_LEVELS.map((rival) => {
                    const isUnlocked = rival.level <= progress.unlockedLevel;
                    const isCurrentActive = rival.level === progress.unlockedLevel;
                    const isDone = progress.completedLevels.includes(rival.level);
                    const isSelected = rival.level === selectedLevel;
                    const isBossLevel = rival.level % 5 === 0;
                    const isFinalBoss = rival.level === 30;

                    return (
                      <div key={rival.level} className="relative flex flex-col items-center shrink-0">
                        
                        {/* Player "TÚ ESTÁS AQUÍ" Floating Indicator */}
                        {isCurrentActive && (
                          <motion.div
                            initial={{ y: -8, opacity: 0 }}
                            animate={{ y: [ -4, 0, -4 ], opacity: 1 }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                            className="absolute -top-6 z-20 flex flex-col items-center pointer-events-none"
                          >
                            <span className="text-[8px] font-black text-black bg-amber-400 px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)] uppercase tracking-wider whitespace-nowrap">
                              TÚ ESTÁS AQUÍ
                            </span>
                            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-amber-400 -mt-0.5" />
                          </motion.div>
                        )}

                        <button
                          onClick={() => setSelectedLevel(rival.level)}
                          className={`
                            snap-start shrink-0 p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 relative overflow-hidden group text-center
                            ${isFinalBoss
                              ? isSelected
                                ? 'w-36 bg-gradient-to-b from-purple-900/60 via-red-950/60 to-black border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-105 z-10'
                                : 'w-36 bg-gradient-to-b from-purple-950/40 to-zinc-950 border-red-500/40 text-red-300'
                              : isBossLevel
                                ? isSelected
                                  ? 'w-32 bg-gradient-to-b from-amber-500/20 to-orange-950/60 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)] scale-105 z-10'
                                  : 'w-32 bg-zinc-900/90 border-amber-500/40 text-amber-200'
                                : isSelected
                                  ? 'w-28 bg-gradient-to-b from-white/15 to-white/5 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.2)] scale-105 z-10'
                                  : isCurrentActive
                                    ? 'w-28 bg-amber-500/10 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                                    : isUnlocked
                                      ? 'w-28 bg-zinc-900/60 border-white/10 hover:border-white/25 text-white/70'
                                      : 'w-28 bg-zinc-950/50 border-white/5 opacity-50 cursor-not-allowed'
                            }
                          `}
                        >
                          {/* Level Tag Top Left */}
                          <div className="absolute top-1.5 left-2 text-[9px] font-black font-mono text-white/50">
                            #{rival.level}
                          </div>

                          {/* Status / Crown Badge Top Right */}
                          <div className="absolute top-1.5 right-2">
                            {isDone ? (
                              <CheckCircle size={13} className="text-emerald-400" />
                            ) : isFinalBoss ? (
                              <Crown size={14} className="text-red-400 animate-pulse" />
                            ) : isBossLevel ? (
                              <Crown size={13} className="text-amber-400" />
                            ) : isCurrentActive ? (
                              <Sparkles size={13} className="text-amber-400 animate-pulse" />
                            ) : !isUnlocked ? (
                              <Lock size={12} className="text-zinc-600" />
                            ) : null}
                          </div>

                          {/* Node Avatar Icon */}
                          <div className="text-2xl mt-3">
                            {isUnlocked ? rival.avatar : '🔒'}
                          </div>

                          {/* Level Name */}
                          <span className="text-[10px] font-bold text-white truncate w-full px-1 mt-0.5">
                            {isUnlocked ? rival.name : 'Rival Misterioso'}
                          </span>

                          {/* Boss Badge or Level Status */}
                          {isFinalBoss ? (
                            <span className="text-[7px] font-black tracking-widest uppercase bg-gradient-to-r from-red-600 to-purple-600 text-white px-2 py-0.5 rounded-full shadow-md">
                              BOSS FINAL 💎
                            </span>
                          ) : isBossLevel ? (
                            <span className="text-[7px] font-black tracking-widest uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full">
                              BOSS ARENA 👑
                            </span>
                          ) : isCurrentActive ? (
                            <span className="text-[7px] font-black tracking-widest uppercase bg-amber-500 text-black px-1.5 py-0.5 rounded-full shadow-sm">
                              ENFRENTAR
                            </span>
                          ) : isUnlocked ? (
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
                          ) : (
                            <span className="text-[8px] font-mono uppercase text-zinc-500">
                              Bloqueado
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Rival Battle Arena Card */}
            <div
              className="rounded-3xl border p-5 sm:p-6 relative overflow-hidden transition-all shadow-2xl"
              style={{
                backgroundColor: 'rgba(18, 18, 22, 0.9)',
                borderColor: `${displayRival.color}35`
              }}
            >
              {/* Soft Organic Ambient Glow */}
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

                {/* Workday Schedule Status Badge */}
                {isSelectedUnlocked && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-1.5 w-full sm:w-auto min-w-[240px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                        <Clock size={12} className="text-orange-400" />
                        Jornada Rival
                      </span>
                      <span className="text-white font-mono font-bold text-xs">
                        {currentLevelData.workStartHour ?? 9}:00 - {currentLevelData.workEndHour ?? 18}:00
                      </span>
                    </div>

                    {/* Progress bar of workday */}
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(rivalLiveState.progressRatio * 100)}%`,
                          backgroundColor: currentLevelData.color
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span className="truncate">{rivalLiveState.currentActivity}</span>
                    </div>
                  </div>
                )}
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

                  <div className="my-3 flex flex-col gap-1 text-left">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Tú:</span>
                      <span className="text-2xl font-black text-white">{userTasksCompleted}</span>
                      <span className="text-white/40 text-xs font-medium">completadas</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Rival:</span>
                      <span className="text-sm font-black text-orange-400">
                        {!isSelectedUnlocked ? '?' : (rivalLiveState.status === 'WAITING' ? 0 : rivalLiveState.simulatedTasks)}
                      </span>
                      <span className="text-white/30 text-[10px] font-bold">
                        {isSelectedUnlocked
                          ? (rivalLiveState.status === 'WAITING' ? ' / ? (meta)' : ` / ${currentLevelData.targetTasks} (meta)`)
                          : ' / ?'
                        }
                      </span>
                    </div>
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

                  <div className="my-3 flex flex-col gap-1 text-left">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Tú:</span>
                      <span className="text-2xl font-black text-white">{Math.round(userFocusMinutes / 60 * 10) / 10}h</span>
                      <span className="text-white/40 text-xs font-medium">enfocado</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Rival:</span>
                      <span className="text-sm font-black text-purple-400">
                        {!isSelectedUnlocked ? '?' : (rivalLiveState.status === 'WAITING' ? '0h' : `${Math.round(rivalLiveState.simulatedFocusMinutes / 60 * 10) / 10}h`)}
                      </span>
                      <span className="text-white/30 text-[10px] font-bold">
                        {isSelectedUnlocked
                          ? (rivalLiveState.status === 'WAITING' ? ' / ? (meta)' : ` / ${currentLevelData.targetFocusMinutes / 60}h (meta)`)
                          : ' / ?'
                        }
                      </span>
                    </div>
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

                  <div className="my-3 flex flex-col gap-1 text-left">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Tú:</span>
                      <span className="text-2xl font-black text-white">{Math.round(userHabitPct)}%</span>
                      <span className="text-white/40 text-xs font-medium">de hábitos</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Rival:</span>
                      <span className="text-sm font-black text-orange-400">
                        {!isSelectedUnlocked ? '?' : (rivalLiveState.status === 'WAITING' ? '0%' : `${Math.round(rivalLiveState.simulatedHabitPct)}%`)}
                      </span>
                      <span className="text-white/30 text-[10px] font-bold">
                        {isSelectedUnlocked
                          ? (rivalLiveState.status === 'WAITING' ? ' / ? (meta)' : ` / ${currentLevelData.targetHabitPct}% (meta)`)
                          : ' / ?'
                        }
                      </span>
                    </div>
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
