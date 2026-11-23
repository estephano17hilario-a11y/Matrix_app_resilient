import { RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// When something comes forward (a modal, the expanded dock), the interface
// behind it recedes into the world: it scales back and dims, iOS-sheet style.
//
// Only elements marked `.lux-depth-layer` inside `containerRef` move. They are
// siblings of the modals, never ancestors, so fixed-position modals are not
// affected by the transform. Each layer scales around the center of the
// viewport rather than its own box, so they recede together as one plane.
//
// The dock announces itself (`lux:dock`) the moment it opens or closes, so the
// recede starts on the same frame; the Dashboard never needs to re-render for it.
export const useDepthRecede = (containerRef: RefObject<HTMLElement>, modal: boolean) => {
  const state = useRef({ modal, dock: false, on: false });

  const apply = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const on = state.current.modal || state.current.dock;
    if (on === state.current.on && container.dataset.luxRecede !== undefined) return;
    state.current.on = on;
    if (on) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      container.querySelectorAll<HTMLElement>('.lux-depth-layer').forEach(el => {
        const r = el.getBoundingClientRect();
        el.style.transformOrigin = `${(cx - r.left).toFixed(1)}px ${(cy - r.top).toFixed(1)}px`;
      });
    }
    container.dataset.luxRecede = on ? 'true' : 'false';
  }, [containerRef]);

  useLayoutEffect(() => {
    state.current.modal = modal;
    apply();
  }, [modal, apply]);

  useEffect(() => {
    const onDock = (e: Event) => {
      state.current.dock = !!(e as CustomEvent<boolean>).detail;
      apply();
    };
    window.addEventListener('lux:dock', onDock);
    return () => window.removeEventListener('lux:dock', onDock);
  }, [apply]);
};
