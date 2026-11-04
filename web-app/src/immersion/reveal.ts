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

// While a scene arrives, content is shown with it, not after it. Some of it
// mounts a render or two after the scene commits (state set from effects), so
// arrival stays open for a short window.
const ARRIVAL_MS = 650;
let arrivalUntil = 0;
const arriving = () => performance.now() < arrivalUntil;

const isShown = (el: Element) =>
  (el as any).checkVisibility ? (el as any).checkVisibility() : el.getClientRects().length > 0;

const showInstantly = (el: Element) => {
  io?.unobserve(el);
  waiting.delete(el);
  el.classList.add('lux-reveal-armed', 'lux-instant', 'lux-in');
};

const arm = (el: Element) => {
  if (!io || el.classList.contains('lux-reveal-armed') || el.classList.contains('lux-in')) return;
  if (arriving() && isShown(el)) { showInstantly(el); return; }
  el.classList.add('lux-reveal-armed');
  io.observe(el);
};

const scan = (root: ParentNode) => {
  if (root instanceof Element && root.classList.contains('lux-reveal')) arm(root);
  root.querySelectorAll?.('.lux-reveal:not(.lux-reveal-armed)').forEach(arm);
};

/**
 * A whole scene arrives (section change): everything displayed in it is shown
 * at once, so the content comes with the scene instead of trickling in after
 * it. Called synchronously after the new scene is committed, before the view
 * transition captures it. Content added later still rises as usual.
 */
export const revealNow = (root: ParentNode = document) => {
  arrivalUntil = performance.now() + ARRIVAL_MS;
  root.querySelectorAll('.lux-reveal:not(.lux-instant)').forEach(el => {
    // Skip what isn't displayed (the other sections are display:none).
    // Cards that already rose are pinned too: coming back from display:none
    // would otherwise replay their rise every time the section is shown.
    if (isShown(el)) showInstantly(el);
  });
};

// A card rises once. When its rise ends (or is cut short because its section
// was hidden), it is pinned, so showing the section again never replays it.
const settle = (e: Event) => {
  const a = e as AnimationEvent;
  if (a.animationName !== 'lux-rise') return;
  (a.target as Element).classList?.add('lux-instant');
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
      if (arriving()) { showInstantly(el); return; }
      io?.unobserve(el);
      waiting.delete(el);
      if (immersionActive()) {
        el.style.setProperty('--lux-delay', `${Math.min(i++, MAX_STAGGER) * STAGGER_MS}ms`);
      }
      el.classList.add('lux-in');
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

  document.addEventListener('animationend', settle, true);
  document.addEventListener('animationcancel', settle, true);

  mo = new MutationObserver(records => {
    records.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n as Element); }));
  });
  mo.observe(document.body, { childList: true, subtree: true });
  scan(document);
};
