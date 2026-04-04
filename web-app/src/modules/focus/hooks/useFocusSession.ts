import { useState, useEffect, useRef, useCallback } from 'react';
import type { Project } from '../../../types';
import FocusSession from '../../../plugins/FocusPlugin';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

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

    // 2. Persist State on Critical Changes (Not every tick)
    useEffect(() => {
        const syncNative = async () => {
            const now = Date.now();
            const state: FocusSessionState = {
                projectId: project.id,
                mode,
                isActive,
                isPaused,
                timeLeft, 
                totalDuration,
                startTime: mode === 'STOPWATCH' ? now - (timeLeft * 1000) : null,
                targetTime: mode === 'POMO' ? now + (timeLeft * 1000) : null,
                lastUpdated: now
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

            // Sync with Native Notification
            if (isActive) {
                if (isPaused) {
                    await FocusSession.pause().catch(console.error);
                } else {
                    // 🛡️ AGGRESSIVE PERMISSION REQUEST
                    if (Capacitor.isNativePlatform()) {
                        try {
                            const perm = await LocalNotifications.checkPermissions();
                            if (perm.display !== 'granted') {
                                 console.log("⚠️ Requesting Notification Permission (Local)...");
                                 const req = await LocalNotifications.requestPermissions();
                                 if (req.display !== 'granted') {
                                     console.warn("🚫 Notification Permission Denied by User");
                                 }
                            }
                        } catch (e) {
                            console.error("Error checking permissions", e);
                        }
                    }

                    await FocusSession.start({ 
                        duration: timeLeft, 
                        mode: mode,
                        projectName: project.title,
                        projectColor: project.color || '#FFFFFF',
                        projectIcon: projectIcon || '⚡'
                    }).catch(console.error);
                }
            } else {
                await FocusSession.stop().catch(console.error);
            }
        };

        syncNative();

    }, [isActive, isPaused, mode, totalDuration, project.id, projectIcon]);

    // 3. Timer Logic
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (isActive && !isPaused) {
            console.log("▶️ Timer Started", { projectId: project.id, mode, timeLeft });
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
        } else {
            console.log("⏸️ Timer Stopped/Paused", { isActive, isPaused });
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isActive, isPaused, mode, totalDuration, project.id]); // Added project.id for safety

    const resetSession = useCallback(() => {
        setMode('POMO');
        setTimeLeft(project.pomoDuration * 60);
        setTotalDuration(project.pomoDuration * 60);
        setIsActive(false);
        setIsPaused(false);
        localStorage.removeItem(STORAGE_KEY);
    }, [project.pomoDuration, STORAGE_KEY]);

    const toggleTimer = useCallback(() => {
        console.log("🔘 toggleTimer called", { currentIsActive: isActive, currentIsPaused: isPaused });
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
