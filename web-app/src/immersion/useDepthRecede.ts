import { RefObject, useLayoutEffect } from 'react';

// When something comes forward (a modal, the expanded dock), the interface
// behind it recedes into the world: it scales back and dims, iOS-sheet style.
//
// Only elements marked `.lux-depth-layer` inside `containerRef` move. They are
// siblings of the modals, never ancestors, so fixed-position modals are not
// affected by the transform. Each layer scales around the center of the
// viewport rather than its own box, so they recede together as one plane.
export const useDepthRecede = (containerRef: RefObject<HTMLElement>, active: boolean) => {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (active) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      container.querySelectorAll<HTMLElement>('.lux-depth-layer').forEach(el => {
        const r = el.getBoundingClientRect();
        el.style.transformOrigin = `${(cx - r.left).toFixed(1)}px ${(cy - r.top).toFixed(1)}px`;
      });
    }
    container.dataset.luxRecede = active ? 'true' : 'false';
  }, [containerRef, active]);
};
