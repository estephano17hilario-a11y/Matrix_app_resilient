import type React from 'react';

// Tab-like controls (section switchers) act the moment the finger lands, not
// when it lifts: `click` only fires on release, which added the whole press
// time (~80–150ms) before anything moved. The click that follows a press is
// swallowed; keyboard activation (a click with no press) still works.
//
// The press time is kept on the element itself, so it survives the re-render
// that the action causes between pointerdown and click.
const SWALLOW_MS = 1500;

export const onPress = (action: () => void) => ({
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    e.currentTarget.dataset.pressedAt = String(performance.now());
    action();
  },
  onClick: (e: React.MouseEvent<HTMLElement>) => {
    const at = Number(e.currentTarget.dataset.pressedAt || 0);
    delete e.currentTarget.dataset.pressedAt;
    if (at && performance.now() - at < SWALLOW_MS) return;
    action();
  },
});
