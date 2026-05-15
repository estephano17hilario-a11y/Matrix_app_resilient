import { useState, useEffect, useRef, useCallback } from 'react';
import type { Project } from '../../../types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

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
}

const STORAGE_PREFIX = 'matrix_focus_session_';
const NOTIFICATION_ID = 9999; // Fixed ID to easily cancel the focus notification

export const useFocusSession = (project: Project, onComplete?: (duration: number, mode: 'POMO' | 'STOPWATCH') => void, projectIcon?: string) => {
    // Initialize state from props first
    const [mode, setMode] = useState<'POMO' | 'STOPWATCH'>('POMO');
    const [timeLeft, setTimeLeft] = useState(project.pomoDuration * 60);
    const [totalDuration, setTotalDuration] = useState(project.pomoDuration * 60);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    
    const lastTickRef = useRef<number>(0);
    const onCompleteRef = useRef(onComplete);

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

    const scheduleLocalNotification = async (targetTimeMs: number) => {
        if (Capacitor.isNativePlatform()) {
            try {
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') {
                    const req = await LocalNotifications.requestPermissions();
                    if (req.display !== 'granted') return;
                }
                
                await cancelLocalNotification(); // Clear previous ones just in case
                
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            id: NOTIFICATION_ID,
                            title: 'Focus Complete! 🎯',
                            body: `Your session for ${project.title} has finished. Claim your victory!`,
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

    const resetSession = useCallback(() => {
        setMode('POMO');
        setTimeLeft(project.pomoDuration * 60);
        setTotalDuration(project.pomoDuration * 60);
        setIsActive(false);
        setIsPaused(false);
        localStorage.removeItem(STORAGE_KEY);
        cancelLocalNotification();
    }, [project.pomoDuration, STORAGE_KEY]);

    // 1. Load State on Mount (or Project Change)
    useEffect(() => {
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

    // 2. Listen to App State Change (Foreground/Background)
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
                            if (session.mode === 'POMO') {
                                const target = session.targetTime || (now + session.timeLeft * 1000);
                                const remaining = Math.max(0, Math.ceil((target - now) / 1000));
                                setTimeLeft(remaining);
                                
                                // Check if it finished while in background
                                if (remaining <= 0) {
                                    setIsActive(false);
                                    setIsPaused(false);
                                    if (onCompleteRef.current) {
                                        onCompleteRef.current(session.totalDuration, 'POMO');
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
                totalDuration,
                startTime,
                targetTime,
                lastUpdated: now
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

            // Sync Notifications
            if (isActive && !isPaused && mode === 'POMO' && targetTime) {
                scheduleLocalNotification(targetTime);
            } else {
                cancelLocalNotification();
            }
        };

        syncState();
    }, [isActive, isPaused, mode, totalDuration, project.id, projectIcon]);

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
                                console.log("✅ Timer Finished (0s reached)", { totalDuration, mode });
                                setIsActive(false);
                                setIsPaused(false);
                                if (onCompleteRef.current) {
                                    console.log("📞 Calling onComplete callback");
                                    onCompleteRef.current(totalDuration, 'POMO');
                                } else {
                                    console.warn("⚠️ onComplete callback is missing!");
                                }
                                return 0;
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
    }, [isActive, isPaused, mode, totalDuration, project.id]);

    const toggleTimer = useCallback(() => {
        if (!isActive) {
            setIsActive(true);
            setIsPaused(false);
        } else {
            setIsPaused(prev => !prev);
        }
    }, [isActive]);

    const stopSession = useCallback(() => {
        resetSession();
    }, [resetSession]);

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
    };
};
