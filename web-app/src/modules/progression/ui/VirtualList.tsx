import React, { useEffect, useRef, useState } from 'react';

/**
 * Minimal fixed-row-height virtual list: only the visible window (+ overscan)
 * is mounted, so long leaderboards/histories stay cheap to scroll.
 */
export function VirtualList<T>({
  items, rowHeight, height, overscan = 6, renderRow, getKey, className, ariaLabel,
}: {
  items: T[];
  rowHeight: number;
  height: number;
  overscan?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollTop(el.scrollTop));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);

  return (
    <div ref={ref} className={`prog-scroll ${className ?? ''}`} style={{ height: Math.min(height, items.length * rowHeight) }} role="list" aria-label={ariaLabel}>
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {items.slice(first, last).map((item, i) => (
          <div key={getKey(item, first + i)} role="listitem" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rowHeight, transform: `translateY(${(first + i) * rowHeight}px)` }}>
            {renderRow(item, first + i)}
          </div>
        ))}
      </div>
    </div>
  );
}
