import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgePlugin {
  shareSession(options: { userId: string; accessToken: string; refreshToken?: string }): Promise<void>;
  clearSession(): Promise<void>;
  refreshWidgets(): Promise<void>;
  /** Re-renders the friend duel and shared-streak widgets (they fetch their own data). */
  refreshSocialWidgets?(): Promise<void>;
  updateScore(options: { score: number }): Promise<void>;
  /** Whether the account is Deluxe (PRO): Routine / Calendar / Journal-calendar widgets lock for free accounts. */
  updateProStatus?(options: { isPro: boolean }): Promise<void>;
  /** Routine screen settings + journal reminder times, so the native Routine widget draws the same day. */
  updateRoutineConfig?(options: { config?: Record<string, unknown>; journalTimes?: string[]; reminders?: Record<string, unknown>[] }): Promise<void>;
  updateRivalsData(options: {
    rivalName: string;
    rivalAvatar: string;
    rivalLevel: number;
    rivalActivity: string;
    rivalTasks?: number;
    targetTasks: number;
    rivalFocus?: number;
    targetFocus: number;
    rivalHabits?: number;
    targetHabits: number;
    userTasks: number;
    userFocus: number;
    userHabits: number;
    isVictory: boolean;
  }): Promise<void>;
}

const WidgetAuthBridge = registerPlugin<WidgetBridgePlugin>('WidgetAuthBridge');

export default WidgetAuthBridge;
