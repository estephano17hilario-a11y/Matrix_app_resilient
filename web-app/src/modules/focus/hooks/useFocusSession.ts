import { useState, useEffect, useRef, useCallback } from 'react';
import type { Project } from '../../../types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import FocusSession from '../../../plugins/FocusPlugin';

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

export const useFocusSession = (project: Project, onComplete?: (duration: number, mode: 'POMO' | 'STOPWATCH', subTraitId?: string) => void, projectIcon?: string) => {
    const [mode, setMode] = useState<'POMO' | 'STOPWATCH'>('POMO');

    // Resolve active routine steps based on active settings (TEMP, WEEKDAY or DEFAULT)
    const resolveActiveRoutineSteps = useCallback((proj: Project) => {
        if (proj.id === QUICK_FOCUS_PROJECT_ID) return [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekdayIndex = today.getDay(); // 0 is Sunday, 1 is Monday...

        const rMode = localStorage.getItem(`matrix_project_routine_mode_${proj.id}`) || 'DEFAULT';
        if (rMode === 'TEMP') {
            const tempSaved = localStorage.getItem(`matrix_temp_routine_${proj.id}_${todayStr}`);
            if (tempSaved) {
                try {
                    return JSON.parse(tempSaved);
                } catch (e) {
                    console.error("Failed to parse temp routine", e);
                }
            }
        }

        if (rMode === 'WEEKDAY') {
            const weekdaySaved = localStorage.getItem(`matrix_project_routine_${proj.id}_weekday_${weekdayIndex}`);
            if (weekdaySaved) {
                try {
                    return JSON.parse(weekdaySaved);
                } catch (e) {
                    console.error("Failed to parse weekday routine", e);
                }
            }
        }

        // Fallback to project default focusRoutine if today matches the active days
        if (proj.focusRoutineDays && proj.focusRoutineDays.includes(weekdayIndex)) {
            return proj.focusRoutine || [];
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

    const resetSession = useCallback((customMode?: 'POMO' | 'STOPWATCH') => {
        const nextMode = customMode || mode;
        setMode(nextMode);
        
        const steps = resolveActiveRoutineSteps(project);
        setRoutineSteps(steps);
        setCurrentStepIdx(0);

        if (nextMode === 'POMO') {
            const initial = steps.length > 0 ? steps[0].duration * 60 : project.pomoDuration * 60;
            setTimeLeft(initial);
            setTotalDuration(initial);
        } else {
            setTimeLeft(0);
            setTotalDuration(0);
        }
        setIsActive(false);
        setIsPaused(false);
        localStorage.removeItem(STORAGE_KEY);
        cancelLocalNotification();
        cancelOngoingNotification();
    }, [project, STORAGE_KEY, mode, resolveActiveRoutineSteps]);

    const toggleTimer = useCallback(() => {
        if (!isActive) {
            setIsActive(true);
            setIsPaused(false);
        } else {
            setIsPaused(prev => !prev);
        }
    }, [isActive]);

    const stopSession = useCallback(() => {
        resetSession(mode);
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
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (isActive && !isPaused) {
            lastTickRef.current = Date.now();
            
            intervalId = setInterval(() => {
                const now = Date.now();
                const delta = Math.floor((now - lastTickRef.current) / 1000);
                
                if (delta >= 1) {
                    setTimeLeft(prev => {
                        if (mode === 'POMO') {
                            const next = prev - delta;
                            if (next <= 0) {
                                console.log("✅ Timer Finished (0s reached)", { currentStepIdx, mode });
                                
                                const steps = resolveActiveRoutineSteps(project);
                                const currentStep = steps[currentStepIdx];
                                
                                // Complete segment: If it's a FOCUS step, log it and earn XP
                                if (currentStep && currentStep.type === 'FOCUS') {
                                    if (onCompleteRef.current) {
                                        onCompleteRef.current(currentStep.duration * 60, 'POMO', currentStep.subAttribute);
                                    }
                                }

                                // Transition to next step if available
                                if (steps.length > 0 && currentStepIdx < steps.length - 1) {
                                    const nextIdx = currentStepIdx + 1;
                                    setCurrentStepIdx(nextIdx);
                                    const nextStep = steps[nextIdx];
                                    const nextDuration = nextStep.duration * 60;
                                    
                                    setTimeLeft(nextDuration);
                                    setTotalDuration(nextDuration);
                                    setIsActive(true);
                                    setIsPaused(false);
                                    
                                    // Return next duration to continue the countdown timer
                                    return nextDuration;
                                } else {
                                    // Finished entire routine
                                    setIsActive(false);
                                    setIsPaused(false);
                                    
                                    if (steps.length === 0 && onCompleteRef.current) {
                                        onCompleteRef.current(totalDuration, 'POMO');
                                    }
                                    return 0;
                                }
                            }
                            return next;
                        } else {
                            return prev + delta;
                        }
                    });
                    lastTickRef.current += delta * 1000; 
                }
            }, 1000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isActive, isPaused, mode, totalDuration, project.id, currentStepIdx, routineSteps]);

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
    const isFirstMountRef = useRef(true);
    const lastSyncedStateRef = useRef<{ isActive: boolean, isPaused: boolean }>({ isActive: false, isPaused: false });

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        if (isFirstMountRef.current) {
            isFirstMountRef.current = false;
            lastSyncedStateRef.current = { isActive, isPaused };
            return;
        }

        const syncNative = async () => {
            try {
                const prev = lastSyncedStateRef.current;
                if (prev.isActive !== isActive || prev.isPaused !== isPaused) {
                    if (isActive) {
                        if (prev.isActive !== isActive) {
                            console.log("Starting native FocusSession...", { timeLeft: timeLeftRef.current, mode });
                            if (Capacitor.isNativePlatform()) {
                                try {
                                    const perm = await LocalNotifications.checkPermissions();
                                    if (perm.display !== 'granted') {
                                        await LocalNotifications.requestPermissions();
                                    }
                                } catch (err) {
                                    console.error("Failed to check/request notifications permissions", err);
                                }
                            }
                            await FocusSession.start({
                                duration: mode === 'POMO' ? timeLeftRef.current : 0,
                                mode: mode,
                                projectName: project.title,
                                projectColor: project.color,
                                projectIcon: projectIcon || '✨'
                            });
                        } else if (prev.isPaused !== isPaused) {
                            if (isPaused) {
                                console.log("Pausing native FocusSession...");
                                await FocusSession.pause();
                            } else {
                                console.log("Resuming native FocusSession...");
                                await FocusSession.resume();
                            }
                        }
                    } else {
                        if (prev.isActive !== isActive) {
                            console.log("Stopping native FocusSession...");
                            await FocusSession.stop();
                        }
                    }
                    lastSyncedStateRef.current = { isActive, isPaused };
                }
            } catch (e) {
                console.error("Failed to sync state with native FocusSession", e);
            }
        };

        syncNative();
    }, [isActive, isPaused, mode, project.title, project.color, projectIcon]);

    // Native Focus Service Action Listeners
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let pauseListener: any = null;
        let resumeListener: any = null;
        let stopListener: any = null;

        const setupListeners = async () => {
            try {
                pauseListener = await FocusSession.addListener('onPause', () => {
                    console.log("Native event: onPause");
                    setIsPaused(true);
                    lastSyncedStateRef.current = { isActive: true, isPaused: true };
                });

                resumeListener = await FocusSession.addListener('onResume', () => {
                    console.log("Native event: onResume");
                    setIsPaused(false);
                    lastSyncedStateRef.current = { isActive: true, isPaused: false };
                });

                stopListener = await FocusSession.addListener('onStop', () => {
                    console.log("Native event: onStop");
                    setIsActive(false);
                    setIsPaused(false);
                    lastSyncedStateRef.current = { isActive: false, isPaused: false };
                    stopSession();
                });
            } catch (e) {
                console.error("Failed to register native listeners", e);
            }
        };

        setupListeners();

        return () => {
            if (pauseListener) pauseListener.then((l: any) => l.remove()).catch(console.error);
            if (resumeListener) resumeListener.then((l: any) => l.remove()).catch(console.error);
            if (stopListener) stopListener.then((l: any) => l.remove()).catch(console.error);
        };
    }, [stopSession]);

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
        resolveActiveRoutineSteps
    };
};

