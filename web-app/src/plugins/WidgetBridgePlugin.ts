import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgePlugin {
  shareSession(options: { userId: string; accessToken: string; refreshToken?: string }): Promise<void>;
  clearSession(): Promise<void>;
  refreshWidgets(): Promise<void>;
  updateScore(options: { score: number }): Promise<void>;
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
