import { useState, useEffect, useMemo, useCallback } from 'react';
import { RIVAL_LEVELS, RivalLevel } from '../config/rivalsConfig';
import { RivalNotificationService } from '../services/rivalNotificationService';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import WidgetAuthBridge from '@/plugins/WidgetBridgePlugin';

export interface RivalsProgressData {
  unlockedLevel: number;
  completedLevels: number[];
  lastEvaluationDate?: string; // YYYY-MM-DD
}

export function useRivalsLogic(
  userTasksCompleted: number = 0,
  userFocusMinutes: number = 0,
  userHabitPct: number = 0
) {
  const { user, profile, updateProfileLocally } = useAuth();
  const [progress, setProgress] = useState<RivalsProgressData>(() => {
    try {
      const saved = localStorage.getItem('matrix_rivals_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse local rivals progress:', e);
    }
    return { unlockedLevel: 1, completedLevels: [] };
  });

  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  // Sync state from profile preferences when available
  useEffect(() => {
    const prefs = profile?.preferences as any;
    if (prefs?.rivalsProgress) {
      const remote = prefs.rivalsProgress as RivalsProgressData;
      setProgress(remote);
      setSelectedLevel(remote.unlockedLevel || 1);
    }
  }, [profile?.preferences]);

  // Active level config
  const currentLevelData = useMemo(() => {
    return RIVAL_LEVELS.find(r => r.level === selectedLevel) || RIVAL_LEVELS[0];
  }, [selectedLevel]);

  const activeUnlockedRival = useMemo(() => {
    return RIVAL_LEVELS.find(r => r.level === progress.unlockedLevel) || RIVAL_LEVELS[0];
  }, [progress.unlockedLevel]);

  // Schedule notifications when active unlocked rival changes
  useEffect(() => {
    RivalNotificationService.scheduleRivalWorkdayEvents(activeUnlockedRival);
  }, [activeUnlockedRival]);

  // Live real-time workday status of selected rival
  const rivalLiveState = useMemo(() => {
    const rival = currentLevelData;
    const workStartHour = rival.workStartHour ?? 9;
    const workEndHour = rival.workEndHour ?? 18;
    const workStartMinute = rival.workStartMinute ?? 0;
    const now = new Date();
    
    const startTime = new Date(now);
    startTime.setHours(workStartHour, workStartMinute, 0, 0);

    const endTime = new Date(now);
    endTime.setHours(workEndHour, rival.workEndMinute || 0, 0, 0);

    if (now < startTime) {
      return {
        status: 'WAITING' as const,
        progressRatio: 0,
        simulatedTasks: 0,
        simulatedFocusMinutes: 0,
        simulatedHabitPct: 0,
        message: `El rival iniciará su jornada a las ${workStartHour}:${workStartMinute.toString().padStart(2, '0')}.`,
        currentActivity: `Preparando bloques de trabajo para su jornada.`
      };
    }

    if (now >= endTime) {
      return {
        status: 'SHIFT_ENDED' as const,
        progressRatio: 1,
        simulatedTasks: rival.targetTasks,
        simulatedFocusMinutes: rival.targetFocusMinutes,
        simulatedHabitPct: rival.targetHabitPct,
        message: `Jornada finalizada (${workStartHour}:00 - ${workEndHour}:00).`,
        currentActivity: `Ha completado su jornada del día. ¡Tienes hasta las 11:59 PM para superarlo!`
      };
    }

    // Currently in active work window
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    const ratio = Math.min(1, Math.max(0, elapsed / totalDuration));

    const simulatedTasks = Math.floor(rival.targetTasks * ratio);
    const simulatedFocusMinutes = Math.floor(rival.targetFocusMinutes * ratio);
    const simulatedHabitPct = Math.floor(rival.targetHabitPct * ratio);

    let currentActivity = `Realizando sesión de Enfoque Profundo.`;
    if (ratio < 0.25) {
      currentActivity = `Ejecutando su 1er bloque de Enfoque Profundo y planeación diaria.`;
    } else if (ratio < 0.50) {
      currentActivity = `Completando hábitos estratégicos matutinos y rutina de disciplina.`;
    } else if (ratio < 0.75) {
      currentActivity = `Procesando Tarea Compleja Hardcore (+${simulatedTasks} tarea(s) acumulada(s)).`;
    } else {
      currentActivity = `En sprint final de productividad antes de cerrar su jornada.`;
    }

    return {
      status: 'WORKING' as const,
      progressRatio: ratio,
      simulatedTasks,
      simulatedFocusMinutes,
      simulatedHabitPct,
      message: `En jornada activa (${workStartHour}:00 - ${workEndHour}:00)`,
      currentActivity
    };
  }, [currentLevelData]);

  // Evaluate duel vs active unlocked rival
  const duelEvaluation = useMemo(() => {
    const rival = currentLevelData;
    const isTaskWon = userTasksCompleted >= rival.targetTasks;
    const isFocusWon = userFocusMinutes >= rival.targetFocusMinutes;
    const isHabitWon = userHabitPct >= rival.targetHabitPct;
    const isVictor = isTaskWon && isFocusWon && isHabitWon;

    return {
      isTaskWon,
      isFocusWon,
      isHabitWon,
      isVictor,
      taskDiff: userTasksCompleted - rival.targetTasks,
      focusDiff: userFocusMinutes - rival.targetFocusMinutes,
      habitDiff: userHabitPct - rival.targetHabitPct
    };
  }, [currentLevelData, userTasksCompleted, userFocusMinutes, userHabitPct]);

  // Auto-sync native Rivals Widget SharedPreferences
  useEffect(() => {
    try {
      WidgetAuthBridge.updateRivalsData({
        rivalName: activeUnlockedRival.name,
        rivalAvatar: activeUnlockedRival.avatar,
        rivalLevel: activeUnlockedRival.level,
        rivalActivity: rivalLiveState.currentActivity,
        userTasks: userTasksCompleted,
        targetTasks: activeUnlockedRival.targetTasks,
        userFocus: userFocusMinutes / 60,
        targetFocus: activeUnlockedRival.targetFocusMinutes / 60,
        userHabits: userHabitPct,
        targetHabits: activeUnlockedRival.targetHabitPct,
        isVictory: duelEvaluation.isVictor
      }).catch(e => console.error('Failed to sync native rivals widget:', e));
    } catch (e) {
      console.error('Error syncing native rivals widget:', e);
    }
  }, [activeUnlockedRival, rivalLiveState, userTasksCompleted, userFocusMinutes, userHabitPct, duelEvaluation]);

  // Save progress helper
  const saveProgress = useCallback(async (newProgress: RivalsProgressData) => {
    setProgress(newProgress);
    localStorage.setItem('matrix_rivals_progress', JSON.stringify(newProgress));

    const targetId = user?.id || profile?.id || profile?.uid;
    if (targetId) {
      try {
        const newPrefs = {
          ...(profile?.preferences || {}),
          rivalsProgress: newProgress
        };
        await supabase
          .from('users')
          .update({ preferences: newPrefs })
          .eq('id', targetId);

        updateProfileLocally({ preferences: newPrefs });
      } catch (err) {
        console.warn('[Rivals] Failed to persist progress to Supabase:', err);
      }
    }
  }, [user, profile, updateProfileLocally]);

  // Claim victory and advance to next level
  const claimLevelVictory = useCallback(async (levelToClaim: number) => {
    const rival = RIVAL_LEVELS.find(r => r.level === levelToClaim);
    if (!rival) return;

    const isAlreadyCompleted = progress.completedLevels.includes(levelToClaim);
    const nextUnlocked = Math.min(30, Math.max(progress.unlockedLevel, levelToClaim + 1));
    const newCompleted = isAlreadyCompleted ? progress.completedLevels : [...progress.completedLevels, levelToClaim];

    const updatedProgress: RivalsProgressData = {
      ...progress,
      unlockedLevel: nextUnlocked,
      completedLevels: newCompleted
    };

    await saveProgress(updatedProgress);

    // Award gold and XP locally and in DB
    const currentGold = profile?.stats?.gold || 0;
    const currentXp = profile?.stats?.xp || 0;
    const newGold = currentGold + rival.rewardGold;
    const newXp = currentXp + rival.rewardXp;

    const newStats = {
      ...(profile?.stats || { hp: 100, maxHp: 100, level: 1, streak: 0 }),
      gold: newGold,
      xp: newXp
    };

    updateProfileLocally({ stats: newStats });

    const targetId = user?.id || profile?.id || profile?.uid;
    if (targetId) {
      try {
        await supabase.from('users').update({ stats: newStats }).eq('id', targetId);
      } catch (err) {
        console.warn('[Rivals] Failed to update stats in DB:', err);
      }
    }

    toast.success(`⚔️ ¡VICTORIA! Derrotaste a ${rival.name}. Recompensa: +${rival.rewardGold} Oro, +${rival.rewardXp} XP`);
  }, [progress, profile, user, saveProgress, updateProfileLocally]);

  return {
    progress,
    selectedLevel,
    setSelectedLevel,
    currentLevelData,
    activeUnlockedRival,
    rivalLiveState,
    duelEvaluation,
    claimLevelVictory
  };
}
