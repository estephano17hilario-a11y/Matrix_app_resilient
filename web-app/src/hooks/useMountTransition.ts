import { useEffect, useState } from 'react';

/**
 * Keeps an overlay mounted while it animates out, then removes it on a plain timer.
 *
 * Use this instead of AnimatePresence for full-screen overlays (sheets, modals): with
 * layout/reorder children, AnimatePresence can fail to finish its exit and leave an invisible,
 * full-screen element mounted that swallows every tap underneath ("the app stops responding").
 * A timer can't get stuck. While `open` is false the overlay must set `pointer-events: none`.
 */
export const useMountTransition = (open: boolean, ms = 300): boolean => {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(timer);
  }, [open, ms]);
  return mounted || open;
};
