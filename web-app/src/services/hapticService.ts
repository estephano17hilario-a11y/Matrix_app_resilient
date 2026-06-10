/**
 * HapticService — Centralized vibration/haptic feedback for Matrix app
 * Uses standard Web Vibration API (navigator.vibrate) to avoid external build-time dependencies
 * and allow offline builds. This is fully supported by Android WebViews when VIBRATE permission is present.
 */

const webVibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch { /* ignore */ }
};

export const hapticService = {
  /** Short vibration — subtask completed */
  subtaskComplete() {
    webVibrate(30);
  },

  /** Medium vibration — habit completed or project daily goal met */
  habitComplete() {
    webVibrate(75);
  },

  /** Long vibration — task completed */
  taskComplete() {
    webVibrate(150);
  },

  /** Double pulse — streak activated */
  streakActivated() {
    webVibrate([60, 50, 120]);
  },
};
