import { useState, useEffect, useRef, useCallback } from 'react';
import type { Project } from '../../../types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import FocusSession from '../../../plugins/FocusPlugin';
import { focusBus } from '../../progression/focusBus';

export interface FocusSessionState {
    projectId: string;
    mode: 'POMO' | 'STOPWATCH';
    isActive: boolean;
    isPaused: boolean;
    timeLeft: number;
    totalDuration: number;
    startTime: number | null; // For Stopwatch reference
    targetTime: number | null; // For Pomo reference
    lastUpdated: number;
    currentStepIdx?: number;
}

const STORAGE_PREFIX = 'matrix_focus_session_';
const NOTIFICATION_ID = 9999; // Fixed ID to easily cancel the focus notification
const QUICK_FOCUS_PROJECT_ID = 'quick-focus-v1';

export interface UseFocusSessionOptions {
    /** Called when the user presses Stop on the native notification, so the view can save progress. */
    onNativeStop?: () => void;
}

/** True if any project still has a live (active) session persisted. */
const hasAnyActiveSavedSession = (): boolean => {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
            const parsed = JSON.parse(localStorage.getItem(key) || 'null');
            if (parsed && parsed.isActive) return true;
        }
    } catch {
        /* unreadable storage: assume nothing is active */
    }
    return false;
};

export const useFocusSession = (project: Project, onComplete?: (duration: number, mode: 'POMO' | 'STOPWATCH', subTraitId?: string) => void, projectIcon?: string, options?: UseFocusSessionOptions) => {
    const [mode, setMode] = useState<'POMO' | 'STOPWATCH'>('POMO');

    // Resolve active routine steps based on active settings (TEMP -> WEEKDAY -> DEFAULT)
    const resolveActiveRoutineSteps = useCallback((proj: Project) => {
        if (proj.id === QUICK_FOCUS_PROJECT_ID) return [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekdayIndex = today.getDay(); // 0 is Sunday, 1 is Monday...

        // Cleanup: Reset daily temporal routines that belong to previous days (past 24:00 hours)
        try {
            const tempPrefix = `matrix_temp_routine_${proj.id}_`;
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(tempPrefix) && !key.endsWith(todayStr)) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.error("Failed to clean up yesterday's temp routines", e);
        }

        // Priority 1: Temporary daily routine (Solo Hoy) - MAX PRIORITY
        const tempSaved = localStorage.getItem(`matrix_temp_routine_${proj.id}_${todayStr}`);
        if (tempSaved) {
            try {
                const parsed = JSON.parse(tempSaved);
                if (parsed && parsed.length > 0) {
                    return parsed;
                }
            } catch (e) {
                console.error("Failed to parse temp routine", e);
            }
        }

        // Priority 2: Weekday override routine (e.g. Saturday custom routine)
        const weekdaySaved = localStorage.getItem(`matrix_project_routine_${proj.id}_weekday_${weekdayIndex}`);
        if (weekdaySaved) {
            try {
                const parsed = JSON.parse(weekdaySaved);
                if (parsed && parsed.length > 0) {
                    return parsed;
                }
            } catch (e) {
                console.error("Failed to parse weekday routine", e);
            }
        }

        // Priority 3: Fallback default project routine if current day matches default active days (or if routine exists)
        if (proj.focusRoutine && proj.focusRoutine.length > 0) {
            if (!proj.focusRoutineDays || proj.focusRoutineDays.length === 0 || proj.focusRoutineDays.includes(weekdayIndex)) {
                return proj.focusRoutine;
            }
        }

        return [];
    }, []);

    const [routineSteps, setRoutineSteps] = useState<any[]>(() => resolveActiveRoutineSteps(project));
    const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

    // Set initial timer values
    const [timeLeft, setTimeLeft] = useState(() => {
        const steps = resolveActiveRoutineSteps(project);
        return steps.length > 0 ? steps[0].duration * 60 : project.pomoDuration * 60;
    });
    const [totalDuration, setTotalDuration] = useState(() => {
        const steps = resolveActiveRoutineSteps(project);
        return steps.length > 0 ? steps[0].duration * 60 : project.pomoDuration * 60;
    });

    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    
    const lastTickRef = useRef<number>(0);

    // Progression: segment start/pauses (report) and live elapsed time (immediate focus ELO).
    useEffect(() => {
        if (!isActive) return;
        if (isPaused) focusBus.pause(project.id);
        else focusBus.start(project.id, mode === 'POMO' ? totalDuration : null);
    }, [isActive, isPaused, project.id, mode, totalDuration]);

    useEffect(() => {
        if (!isActive || isPaused) return;
        focusBus.tick(project.id, mode === 'POMO' ? Math.max(0, totalDuration - timeLeft) : timeLeft);
    }, [timeLeft, isActive, isPaused, project.id, mode, totalDuration]);
    const onCompleteRef = useRef(onComplete);
    const timeLeftRef = useRef(timeLeft);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    // Update ref on prop change without triggering timer effect
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Key for this specific project
    const STORAGE_KEY = `${STORAGE_PREFIX}${project.id}`;

    const cancelLocalNotification = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
            } catch (e) {
                console.error("Failed to cancel local notification", e);
            }
        }
    };

    const ONGOING_NOTIFICATION_ID = 9998;

    const cancelOngoingNotification = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                await LocalNotifications.cancel({ notifications: [{ id: ONGOING_NOTIFICATION_ID }] });
            } catch (e) {
                console.error("Failed to cancel ongoing notification", e);
            }
        }
    };

    const updateOngoingNotification = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                if (isActive) {
                    const formatTimeStr = (seconds: number) => {
                        const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
                        const m = Math.floor(safeSeconds / 60);
                        const s = safeSeconds % 60;
                        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    };
                    const timeStr = formatTimeStr(timeLeft);
                    
                    let titleText = isPaused 
                        ? `Enfoque Pausado: ${project.title} ⏸️`
                        : `Enfoque Activo: ${project.title} ⏱️`;
                    
                    const steps = resolveActiveRoutineSteps(project);
                    const currentStep = steps[currentStepIdx];
                    if (steps.length > 0 && currentStep) {
                        const stepTypeLabel = currentStep.type === 'FOCUS' ? 'Enfoque' : 'Descanso';
                        titleText = `${stepTypeLabel} [Paso ${currentStepIdx + 1}/${steps.length}]: ${project.title}`;
                    }

                    const bodyText = mode === 'POMO' 
                        ? `Tiempo restante: ${timeStr}`
                        : `Tiempo transcurrido: ${timeStr}`;

                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                id: ONGOING_NOTIFICATION_ID,
                                title: titleText,
                                body: bodyText,
                                schedule: { at: new Date(Date.now() + 50) },
                                ongoing: true,
                                autoCancel: false,
                                channelId: 'lux_focus',
                                smallIcon: 'ic_stat_lux',
                                iconColor: project.color || '#a855f7',
                                actionTypeId: '',
                                extra: null
                            }
                        ]
                    });
                } else {
                    await cancelOngoingNotification();
                }
            } catch (e) {
                console.error("Failed to update ongoing notification", e);
            }
        }
    };

    const scheduleLocalNotification = async (targetTimeMs: number) => {
        if (Capacitor.isNativePlatform()) {
            try {
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') {
                    const req = await LocalNotifications.requestPermissions();
                    if (req.display !== 'granted') return;
                }
                
                await cancelLocalNotification(); // Clear previous ones just in case
                
                const steps = resolveActiveRoutineSteps(project);
                const currentStep = steps[currentStepIdx];
                const notifBody = steps.length > 0 && currentStep
                    ? `Tu paso de ${currentStep.type === 'FOCUS' ? 'Enfoque' : 'Descanso'} en ${project.title} ha finalizado.`
                    : `Your session for ${project.title} has finished. Claim your victory!`;

                await LocalNotifications.schedule({
                    notifications: [
                        {
                            id: NOTIFICATION_ID,
                            title: 'Focus Complete! 🎯',
                            body: notifBody,
                            schedule: { at: new Date(targetTimeMs) },
                            sound: 'beep.wav',
                            smallIcon: 'ic_stat_lux',
                            iconColor: '#a855f7',
                            actionTypeId: '',
                            extra: null
                        }
                    ]
                });
            } catch (e) {
                console.error("Failed to schedule local notification", e);
            }
        }
    };

    const resetSession = useCallback((customMode?: 'POMO' | 'STOPWATCH', resetRoutine = true) => {
        const nextMode = customMode || mode;
        setMode(nextMode);
        
        const steps = resolveActiveRoutineSteps(project);
        setRoutineSteps(steps);
        
        if (resetRoutine) {
            setCurrentStepIdx(0);
        }

        if (nextMode === 'POMO') {
            const stepIdx = resetRoutine ? 0 : currentStepIdx;
            const initial = steps.length > 0 ? (steps[stepIdx]?.duration || project.pomoDuration) * 60 : project.pomoDuration * 60;
            setTimeLeft(initial);
            setTotalDuration(initial);
        } else {
            setTimeLeft(0);
            setTotalDuration(0);
        }
        setIsActive(false);
        setIsPaused(false);

        if (resetRoutine) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            // Save state but preserve currentStepIdx
            const now = Date.now();
            const state: FocusSessionState = {
                projectId: project.id,
                mode: nextMode,
                isActive: false,
                isPaused: false,
                timeLeft: nextMode === 'POMO' ? (steps[currentStepIdx]?.duration || project.pomoDuration) * 60 : 0,
                totalDuration: nextMode === 'POMO' ? (steps[currentStepIdx]?.duration || project.pomoDuration) * 60 : 0,
                startTime: null,
                targetTime: null,
                lastUpdated: now,
                currentStepIdx
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        cancelLocalNotification();
        cancelOngoingNotification();
    }, [project, STORAGE_KEY, mode, resolveActiveRoutineSteps, currentStepIdx]);

    const changeStep = useCallback((idx: number) => {
        const steps = resolveActiveRoutineSteps(project);
        if (idx < 0 || idx >= steps.length) return;
        
        setCurrentStepIdx(idx);
        if (mode === 'POMO') {
            const duration = steps[idx].duration * 60;
            setTimeLeft(duration);
            setTotalDuration(duration);
        }
        
        // Sync to localStorage
        const now = Date.now();
        const state: FocusSessionState = {
            projectId: project.id,
            mode,
            isActive: false,
            isPaused: false,
            timeLeft: mode === 'POMO' ? steps[idx].duration * 60 : 0,
            totalDuration: mode === 'POMO' ? steps[idx].duration * 60 : 0,
            startTime: null,
            targetTime: null,
            lastUpdated: now,
            currentStepIdx: idx
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setIsActive(false);
        setIsPaused(false);
        cancelLocalNotification();
        cancelOngoingNotification();
    }, [project, mode, STORAGE_KEY, resolveActiveRoutineSteps]);

    const toggleTimer = useCallback(() => {
        if (!isActive) {
            setIsActive(true);
            setIsPaused(false);
        } else {
            setIsPaused(prev => !prev);
        }
    }, [isActive]);

    const stopSession = useCallback(() => {
        resetSession(mode, false);
    }, [resetSession, mode]);

    // 1. Load State on Mount (or Project Change)
    useEffect(() => {
        const steps = resolveActiveRoutineSteps(project);
        setRoutineSteps(steps);
        setCurrentStepIdx(0);

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const session: FocusSessionState = JSON.parse(saved);
                const now = Date.now();
                
                // Validate if session is too old (e.g. > 24h)
                if (now - session.lastUpdated > 24 * 60 * 60 * 1000) {
                    localStorage.removeItem(STORAGE_KEY);
                    resetSession();
                    return;
                }

                if (session.currentStepIdx !== undefined) {
                    setCurrentStepIdx(session.currentStepIdx);
                }

                if (session.isActive && !session.isPaused) {
                    if (session.mode === 'POMO') {
                        // Calculate remaining time based on target
                        const target = session.targetTime || (now + session.timeLeft * 1000);
                        const remaining = Math.max(0, Math.ceil((target - now) / 1000));
                        setTimeLeft(remaining);
                    } else {
                        // Calculate elapsed time based on start
                        const start = session.startTime || (now - session.timeLeft * 1000);
                        const elapsed = Math.floor((now - start) / 1000);
                        setTimeLeft(elapsed);
                    }
                } else {
                    setTimeLeft(session.timeLeft);
                }

                setMode(session.mode);
                setTotalDuration(session.totalDuration);
                setIsActive(session.isActive);
                setIsPaused(session.isPaused);
            } catch (e) {
                console.error("Failed to restore focus session", e);
                resetSession();
            }
        } else {
            // New session for this project
            resetSession();
        }
    }, [project.id]);

    // 2. Listen to App State Change (Foreground/Background Catch-Up)
    useEffect(() => {
        const appStateListener = App.addListener('appStateChange', ({ isActive: isAppActive }) => {
            if (isAppActive) {
                // App came to foreground: catch up time using Optimistic UI
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    try {
                        const session: FocusSessionState = JSON.parse(saved);
                        const now = Date.now();
                        
                        if (session.isActive && !session.isPaused) {
                            lastTickRef.current = now; // Reset lastTickRef to prevent double-counting background duration on next interval tick!
                            
                            if (session.mode === 'POMO') {
                                const target = session.targetTime || (now + session.timeLeft * 1000);
                                const remaining = Math.max(0, Math.ceil((target - now) / 1000));
                                
                                if (remaining > 0) {
                                    setTimeLeft(remaining);
                                } else {
                                    // Segment or routine expired in background
                                    const steps = resolveActiveRoutineSteps(project);
                                    if (steps.length === 0) {
                                        setTimeLeft(0);
                                        setIsActive(false);
                                        setIsPaused(false);
                                        if (onCompleteRef.current) {
                                            onCompleteRef.current(session.totalDuration, 'POMO');
                                        }
                                    } else {
                                        // We have focus routine steps! We calculate how much elapsed time occurred and step forward
                                        const totalElapsed = session.totalDuration - session.timeLeft + Math.floor((now - session.lastUpdated) / 1000);
                                        let tempStepIdx = session.currentStepIdx || 0;
                                        let remainingElapsed = totalElapsed;
                                        
                                        while (tempStepIdx < steps.length) {
                                            const stepDuration = steps[tempStepIdx].duration * 60;
                                            if (remainingElapsed >= stepDuration) {
                                                remainingElapsed -= stepDuration;
                                                // Log focus step completion
                                                if (steps[tempStepIdx].type === 'FOCUS') {
                                                    if (onCompleteRef.current) {
                                                        onCompleteRef.current(stepDuration, 'POMO', steps[tempStepIdx].subAttribute);
                                                    }
                                                }
                                                tempStepIdx++;
                                            } else {
                                                // Catch up and land on this step index
                                                setCurrentStepIdx(tempStepIdx);
                                                const stepRemaining = stepDuration - remainingElapsed;
                                                setTimeLeft(stepRemaining);
                                                setTotalDuration(stepDuration);
                                                setIsActive(true);
                                                setIsPaused(false);
                                                return;
                                            }
                                        }
                                        
                                        // Completed all timeline steps in background
                                        setCurrentStepIdx(steps.length - 1);
                                        setTimeLeft(0);
                                        setIsActive(false);
                                        setIsPaused(false);
                                    }
                                }
                            } else {
                                const start = session.startTime || (now - session.timeLeft * 1000);
                                const elapsed = Math.floor((now - start) / 1000);
                                setTimeLeft(elapsed);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse focus session state on app resume", e);
                    }
                }
            }
        });

        return () => {
            appStateListener.then(listener => listener.remove()).catch(console.error);
        };
    }, [STORAGE_KEY]);

    // 3. Persist State on Critical Changes (Not every tick)
    useEffect(() => {
        const syncState = async () => {
            const now = Date.now();
            const targetTime = mode === 'POMO' ? now + (timeLeft * 1000) : null;
            const startTime = mode === 'STOPWATCH' ? now - (timeLeft * 1000) : null;

            const state: FocusSessionState = {
                projectId: project.id,
                mode,
                isActive,
                isPaused,
                timeLeft, 
                totalDuration: mode === 'STOPWATCH' ? 0 : totalDuration,
                startTime,
                targetTime,
                lastUpdated: now,
                currentStepIdx
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

            // Sync Notifications (Web only)
            if (!Capacitor.isNativePlatform()) {
                if (isActive && !isPaused && mode === 'POMO' && targetTime) {
                    scheduleLocalNotification(targetTime);
                } else {
                    cancelLocalNotification();
                }
            }
        };

        syncState();
    }, [isActive, isPaused, mode, totalDuration, project.id, projectIcon, currentStepIdx]);

    // 4. Timer Logic
    // The clock is anchored to an absolute instant (end time for POMO, start time for STOPWATCH)
    // instead of being decremented tick by tick, so throttled timers or a slow tick can never drift.
    const anchorRef = useRef<number>(0);
    const finishedRef = useRef(false);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (isActive && !isPaused) {
            const startedAt = Date.now();
            lastTickRef.current = startedAt;
            anchorRef.current = mode === 'POMO'
                ? startedAt + timeLeftRef.current * 1000
                : startedAt - timeLeftRef.current * 1000;
            const hasRoutine = resolveActiveRoutineSteps(project).length > 0;

            intervalId = setInterval(() => {
                const now = Date.now();
                // We were suspended (app in background). With a routine, the foreground catch-up walks
                // through every step that elapsed; don't race it with a single-step update.
                if (hasRoutine && now - lastTickRef.current > 5000) {
                    lastTickRef.current = now;
                    return;
                }
                lastTickRef.current = now;

                const next = mode === 'POMO'
                    ? Math.max(0, Math.ceil((anchorRef.current - now) / 1000))
                    : Math.max(0, Math.floor((now - anchorRef.current) / 1000));
                setTimeLeft(prev => (prev === next ? prev : next));
            }, 250);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isActive, isPaused, mode, totalDuration, project.id, currentStepIdx, routineSteps]);

    // 4b. Completion. Kept out of the state updater so side effects (logging XP, advancing the
    // routine) run exactly once per finished step, even in StrictMode.
    useEffect(() => {
        if (!isActive || isPaused || mode !== 'POMO' || timeLeft > 0) {
            if (!isActive || timeLeft > 0) finishedRef.current = false;
            return;
        }
        if (finishedRef.current) return;
        finishedRef.current = true;
        console.log("✅ Timer Finished (0s reached)", { currentStepIdx, mode });

        const steps = resolveActiveRoutineSteps(project);
        const currentStep = steps[currentStepIdx];

        // Complete segment: if it's a FOCUS step, log it and earn XP
        if (currentStep && currentStep.type === 'FOCUS') {
            onCompleteRef.current?.(currentStep.duration * 60, 'POMO', currentStep.subAttribute);
        }

        if (steps.length > 0 && currentStepIdx < steps.length - 1) {
            // Roll into the next step of the routine.
            const nextIdx = currentStepIdx + 1;
            const nextDuration = steps[nextIdx].duration * 60;
            setCurrentStepIdx(nextIdx);
            setTotalDuration(nextDuration);
            setTimeLeft(nextDuration);
        } else {
            // Finished the entire routine / single pomodoro.
            setIsActive(false);
            setIsPaused(false);
            if (steps.length === 0) {
                onCompleteRef.current?.(totalDuration, 'POMO');
            }
        }
    }, [timeLeft, isActive, isPaused, mode, currentStepIdx, totalDuration]);

    // Sync ongoing notification on tick/state change (Web only)
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            if (isActive) {
                updateOngoingNotification();
            } else {
                cancelOngoingNotification();
            }
        }
        return () => {
            if (!Capacitor.isNativePlatform()) {
                cancelOngoingNotification();
            }
        };
    }, [timeLeft, isActive, isPaused, mode, project.title, project.color]);

    // Sync React state to Native Focus Service
    const nativeStateRef = useRef<{ active: boolean; paused: boolean; stepKey: string }>({ active: false, paused: false, stepKey: '' });

    const nativeLabel = useCallback(() => {
        const steps = resolveActiveRoutineSteps(project);
        const step = steps[currentStepIdx];
        if (steps.length === 0 || !step) return '';
        return `${step.type === 'FOCUS' ? 'Enfoque' : 'Descanso'} · Paso ${currentStepIdx + 1}/${steps.length}`;
    }, [project, currentStepIdx, resolveActiveRoutineSteps]);

    // On mount: if no project has a live session, any leftover native notification is a ghost
    // from an old session (app killed, crash, finished while closed). Clear it silently.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        if (!hasAnyActiveSavedSession()) {
            FocusSession.stop().catch(() => { /* service may simply not exist */ });
        }
    }, []);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const prev = nativeStateRef.current;
        const stepKey = `${currentStepIdx}:${mode}:${totalDuration}`;
        nativeStateRef.current = { active: isActive, paused: isPaused, stepKey };

        const startNative = async () => {
            try {
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
            } catch (err) {
                console.error("Failed to check/request notifications permissions", err);
            }
            await FocusSession.start({
                duration: timeLeftRef.current,
                mode,
                projectName: project.title,
                projectColor: project.color,
                projectIcon: projectIcon || '✨',
                label: nativeLabel()
            });
        };

        const run = async () => {
            try {
                if (isActive && !prev.active) {
                    console.log("Starting native FocusSession...", { timeLeft: timeLeftRef.current, mode });
                    await startNative();
                } else if (isActive && prev.active && prev.paused !== isPaused) {
                    if (isPaused) {
                        console.log("Pausing native FocusSession...");
                        await FocusSession.pause({ timeLeft: timeLeftRef.current });
                    } else {
                        console.log("Resuming native FocusSession...");
                        await FocusSession.resume({ timeLeft: timeLeftRef.current });
                    }
                } else if (isActive && prev.active && !isPaused && prev.stepKey !== stepKey) {
                    // Next routine step (or edited duration): re-arm the native clock and alarm so the
                    // notification never keeps showing the previous step.
                    console.log("Re-syncing native FocusSession for new step...", { stepKey });
                    await startNative();
                } else if (!isActive && prev.active) {
                    console.log("Stopping native FocusSession...");
                    await FocusSession.stop();
                }
            } catch (e) {
                console.error("Failed to sync state with native FocusSession", e);
            }
        };

        run();
    }, [isActive, isPaused, mode, totalDuration, currentStepIdx, project.title, project.color, projectIcon]);

    // Native Focus Service Action Listeners (only the notification buttons echo back to JS)
    const onNativeStopRef = useRef(options?.onNativeStop);
    useEffect(() => {
        onNativeStopRef.current = options?.onNativeStop;
    }, [options?.onNativeStop]);
    const stopSessionRef = useRef(stopSession);
    useEffect(() => {
        stopSessionRef.current = stopSession;
    }, [stopSession]);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let pauseListener: any = null;
        let resumeListener: any = null;
        let stopListener: any = null;
        let cancelled = false;

        const setupListeners = async () => {
            try {
                const pl = await FocusSession.addListener('onPause', () => {
                    console.log("Native event: onPause");
                    nativeStateRef.current = { ...nativeStateRef.current, paused: true };
                    setIsPaused(true);
                });
                const rl = await FocusSession.addListener('onResume', () => {
                    console.log("Native event: onResume");
                    nativeStateRef.current = { ...nativeStateRef.current, paused: false };
                    setIsPaused(false);
                });
                const sl = await FocusSession.addListener('onStop', () => {
                    console.log("Native event: onStop");
                    // Same path as the in-app Stop button, so the time already focused is saved.
                    if (onNativeStopRef.current) onNativeStopRef.current();
                    else stopSessionRef.current();
                });
                if (cancelled) {
                    [pl, rl, sl].forEach(l => { try { l.remove(); } catch { /* noop */ } });
                    return;
                }
                pauseListener = pl;
                resumeListener = rl;
                stopListener = sl;
            } catch (e) {
                console.error("Failed to register native listeners", e);
            }
        };

        setupListeners();

        // These are already-resolved PluginListenerHandles (we `await`ed addListener above),
        // not promises — calling `.then` on them threw "m.then is not a function" on exit.
        return () => {
            cancelled = true;
            [pauseListener, resumeListener, stopListener].forEach((l) => {
                try { l?.remove(); } catch (e) { console.error(e); }
            });
        };
    }, []);

    // Listen to custom window routine updates to refresh steps dynamically
    useEffect(() => {
        const handleRoutineUpdate = () => {
            console.log("🔄 Reloading routine steps dynamically...");
            const steps = resolveActiveRoutineSteps(project);
            setRoutineSteps(steps);
            
            // If session is NOT running, sync initial duration to the first step
            if (!isActive && !isPaused) {
                const initial = steps.length > 0 ? steps[0].duration * 60 : project.pomoDuration * 60;
                setTimeLeft(initial);
                setTotalDuration(initial);
            }
        };

        window.addEventListener(`matrix_focus_routine_updated_${project.id}`, handleRoutineUpdate);
        return () => {
            window.removeEventListener(`matrix_focus_routine_updated_${project.id}`, handleRoutineUpdate);
        };
    }, [project.id, isActive, isPaused, resolveActiveRoutineSteps]);

    return {
        mode,
        setMode,
        timeLeft,
        setTimeLeft,
        totalDuration,
        setTotalDuration,
        isActive,
        isPaused,
        toggleTimer,
        stopSession,
        resetSession,
        routineSteps,
        currentStepIdx,
        setCurrentStepIdx,
        setRoutineSteps,
        resolveActiveRoutineSteps,
        changeStep
    };
};

