// DOM helpers for El Monitor: find the visible copy of an anchor and read
// the state of the real UI (wizard step, editor open, input values).

/** First element matching `selector` that is actually visible on screen. */
export const findVisible = (selector: string | null | undefined): HTMLElement | null => {
  if (!selector) return null;
  const list = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of list) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < -40 || r.top > window.innerHeight + 40 || r.right < 0 || r.left > window.innerWidth) {
      // Off screen but laid out: still usable (we scroll it into view).
      if (isShown(el)) return el;
      continue;
    }
    if (isShown(el)) return el;
  }
  return null;
};

const isShown = (el: HTMLElement) => {
  const anyEl = el as HTMLElement & { checkVisibility?: (o?: Record<string, boolean>) => boolean };
  if (typeof anyEl.checkVisibility === 'function') {
    return anyEl.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
  }
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
};

export interface WizardInfo {
  el: HTMLElement;
  kind: string;
  step: string;
  index: number;
  valid: boolean;
  last: boolean;
  sub: boolean;
  closing: boolean;
}

export const readWizard = (): WizardInfo | null => {
  const el = document.querySelector<HTMLElement>('[data-tour="wiz"]');
  if (!el) return null;
  const d = el.dataset;
  return {
    el,
    kind: d.wizKind || '',
    step: d.wizStep || '',
    index: Number(d.wizIndex || 0),
    valid: d.wizValid === '1',
    last: d.wizLast === '1',
    sub: d.wizSub === '1',
    closing: el.hasAttribute('data-closing'),
  };
};

export const readEditor = (): { el: HTMLElement; mode: string } | null => {
  const el = document.querySelector<HTMLElement>('[data-tour="editor"]');
  return el ? { el, mode: el.dataset.editorMode || '' } : null;
};

export const inputValue = (selector: string): string => {
  const el = findVisible(selector) as HTMLInputElement | null;
  return (el && 'value' in el ? String(el.value) : '').trim();
};

export const editorHasText = (): boolean => {
  const body = document.querySelector<HTMLElement>('[data-tour="ed-body"]');
  return !!body && (body.innerText || '').trim().length > 0;
};
