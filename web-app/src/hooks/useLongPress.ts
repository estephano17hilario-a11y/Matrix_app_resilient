import { useCallback, useRef } from 'react';

type LongPressEvent = React.TouchEvent | React.MouseEvent;

export const useLongPress = (
  callback: (e: LongPressEvent) => void,
  options: { threshold?: number; onStart?: () => void; onFinish?: () => void; onCancel?: () => void } = {}
) => {
  const { threshold = 500, onStart, onFinish, onCancel } = options;
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: LongPressEvent) => {
      // Prevent context menu on long press
      if (event.type === 'touchstart') {
         // event.preventDefault(); // Don't prevent default immediately to allow scrolling
      }
      
      if (onStart) onStart();
      
      target.current = event.target;
      timeout.current = setTimeout(() => {
        callback(event);
        if (onFinish) onFinish();
      }, threshold);
    },
    [callback, threshold, onStart, onFinish]
  );

  const clear = useCallback(
    (_event: LongPressEvent) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
        if (onCancel) onCancel();
      }
    },
    [onCancel]
  );

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    // Mobile specific: cancel on move to allow scrolling
    onTouchMove: (e: React.TouchEvent) => clear(e) 
  };
};
