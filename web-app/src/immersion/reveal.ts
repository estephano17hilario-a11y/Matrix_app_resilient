import { immersionActive } from './immersionPrefs';

// Content that rises out of depth the first time it comes into view.
//
// Any element with the `lux-reveal` class is picked up automatically. It is
// only hidden once this manager has armed it, so if anything here fails the
// content simply stays visible. Elements entering together cascade with a
// short stagger. The animation is one-shot and time-based (no persistent
// compositor layers per list item).

const STAGGER_MS = 45;
const MAX_STAGGER = 8;
const RETRY_MS = 450;

let io: IntersectionObserver | null = null;
let mo: MutationObserver | null = null;

// In view but painted invisible (behind the boot splash, or under a hidden
// stage while settings are open). IntersectionObserver won't fire again while
// they stay in view, so they are re-checked until they can actually be seen.
const waiting = new Set<Element>();
let retryTimer = 0;

const retryWaiting = () => {
  retryTimer = 0;
  const pending = Array.from(waiting);
  waiting.clear();
  pending.forEach(el => {
    if (!el.isConnected) return;
    io?.unobserve(el);
    io?.observe(el); // observing again delivers a fresh initial entry
  });
};

const scheduleRetry = () => {
  if (!retryTimer) retryTimer = window.setTimeout(retryWaiting, RETRY_MS);
};

const arm = (el: Element) => {
  if (!io || el.classList.contains('lux-reveal-armed') || el.classList.contains('lux-in')) return;
  el.classList.add('lux-reveal-armed');
  io.observe(el);
};

const scan = (root: ParentNode) => {
  if (root instanceof Element && root.classList.contains('lux-reveal')) arm(root);
  root.querySelectorAll?.('.lux-reveal:not(.lux-reveal-armed)').forEach(arm);
};

export const startReveal = () => {
  if (io || typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined') return;

  io = new IntersectionObserver(entries => {
    let i = 0;
    entries.forEach(entry => {
      const el = entry.target as HTMLElement;
      if (!entry.isIntersecting) { waiting.delete(el); return; }
      if ((el as any).checkVisibility && !(el as any).checkVisibility({ visibilityProperty: true })) {
        waiting.add(el);
        scheduleRetry();
        return;
      }
      io?.unobserve(el);
      waiting.delete(el);
      if (immersionActive()) {
        el.style.setProperty('--lux-delay', `${Math.min(i++, MAX_STAGGER) * STAGGER_MS}ms`);
      }
      el.classList.add('lux-in');
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

  mo = new MutationObserver(records => {
    records.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n as Element); }));
  });
  mo.observe(document.body, { childList: true, subtree: true });
  scan(document);
};
