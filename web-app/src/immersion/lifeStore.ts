import { useSyncExternalStore } from 'react';
import type { LifeReading } from './lifeState';

// The current life reading, shared between the Dashboard (which computes it),
// the world (which paints it) and Settings (which shows it).

let reading: LifeReading | null = null;
const listeners = new Set<() => void>();

export const getLifeReading = () => reading;

export const setLifeReading = (next: LifeReading | null) => {
  if (
    reading && next &&
    reading.mood === next.mood && reading.pending === next.pending &&
    reading.streak === next.streak && reading.eco === next.eco &&
    Math.abs(reading.progress - next.progress) < 0.001
  ) return;
  if (!reading && !next) return;
  reading = next;
  listeners.forEach(l => l());
};

export const subscribeLife = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export const useLifeReading = () => useSyncExternalStore(subscribeLife, getLifeReading, getLifeReading);

// ── Battery (part of the environment the world adapts to) ────────────────────

export type BatteryState = { level: number; charging: boolean } | null;

let battery: BatteryState = null;
const batteryListeners = new Set<() => void>();
let batteryStarted = false;

export const getBattery = () => battery;

export const subscribeBattery = (l: () => void) => {
  batteryListeners.add(l);
  if (!batteryStarted) {
    batteryStarted = true;
    const nav = navigator as Navigator & { getBattery?: () => Promise<any> };
    nav.getBattery?.().then(b => {
      const update = () => {
        battery = { level: b.level, charging: b.charging };
        batteryListeners.forEach(fn => fn());
      };
      update();
      b.addEventListener?.('levelchange', update);
      b.addEventListener?.('chargingchange', update);
    }).catch(() => { /* not available */ });
  }
  return () => { batteryListeners.delete(l); };
};

export const useBattery = () => useSyncExternalStore(subscribeBattery, getBattery, getBattery);
