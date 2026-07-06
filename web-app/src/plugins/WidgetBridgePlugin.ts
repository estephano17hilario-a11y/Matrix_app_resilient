import { registerPlugin } from '@capacitor/core';

export interface WidgetBridgePlugin {
  shareSession(options: { userId: string; accessToken: string; refreshToken?: string }): Promise<void>;
  clearSession(): Promise<void>;
  refreshWidgets(): Promise<void>;
}

const WidgetAuthBridge = registerPlugin<WidgetBridgePlugin>('WidgetAuthBridge');

export default WidgetAuthBridge;
