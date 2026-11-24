// ─────────────────────────────────────────────────────────────────────────────
// ROUTINE WIDGET SYNC — the native Android "Lux · Rutina" widget rebuilds the day from the cached
// habits / tasks itself, but it cannot read localStorage. The Routine settings and the journal
// reminder times live there, so they are pushed to the native side whenever they change.
// ─────────────────────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';
import WidgetAuthBridge from '../../plugins/WidgetBridgePlugin';
import type { RoutineConfig } from './routineEngine';

let lastSent = '';

export const syncRoutineWidget = (config: RoutineConfig, journalTimes: string[]): void => {
  if (!Capacitor.isNativePlatform()) return;
  const payload = JSON.stringify({ config, journalTimes });
  if (payload === lastSent) return;
  lastSent = payload;
  // Older native builds do not have this method: ignore the rejection.
  WidgetAuthBridge.updateRoutineConfig?.({ config: { ...config }, journalTimes }).catch(() => { lastSent = ''; });
};
