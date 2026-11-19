// Minimal allow-list HTML sanitizer for the rich-text note editor.
//
// Note blocks are stored as HTML and re-injected with innerHTML, so anything that
// reaches storage (an imported backup, a synced device, a pasted snippet) could
// carry <img onerror=…> or <script>. The input is parsed with DOMParser (inert: no
// script runs and no resource loads), unknown tags are unwrapped, dangerous ones are
// dropped with their content, and every attribute outside the allow-list is removed.

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'FONT', 'H1', 'H2', 'H3', 'H4', 'I', 'IMG', 'INPUT', 'LI',
  'MARK', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRIKE', 'STRONG', 'SUB', 'SUP', 'U', 'UL',
]);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'SVG', 'MATH', 'FORM', 'TEXTAREA', 'SELECT', 'TEMPLATE', 'NOSCRIPT', 'FRAME', 'FRAMESET', 'APPLET']);
const ALLOWED_ATTRS = new Set(['class', 'style', 'href', 'src', 'alt', 'type', 'checked', 'color', 'face', 'size', 'dir', 'contenteditable', 'title']);

const SAFE_LINK = /^(https?:|mailto:|tel:|#)/i;
const SAFE_IMAGE = /^(https:|http:|blob:|data:image\/(png|jpe?g|gif|webp|avif);base64,|capacitor:|\/)/i;

/** Only keeps harmless CSS (colour, font, spacing…): drops url(), expression(), @import, behaviours. */
const safeStyle = (css: string) =>
  css.split(';').map(s => s.trim()).filter(decl => decl && !/url\s*\(|expression\s*\(|@import|javascript:|behavior|-moz-binding/i.test(decl)).join('; ');

/** Escapes text for use between tags (the editor shows stored content as HTML). */
export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Escapes text for use inside a double-quoted attribute. */
export const escapeAttr = (text: string): string => escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** True for URLs that are safe to put in an <img src>. */
export const isSafeImageUrl = (url: string): boolean => SAFE_IMAGE.test(url.trim());

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return escapeHtml(html);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

  const clean = (parent: Element) => {
    for (const el of Array.from(parent.children)) {
      const tag = el.tagName.toUpperCase();
      if (DROP_WITH_CONTENT.has(tag)) { el.remove(); continue; }
      if (!ALLOWED_TAGS.has(tag)) {
        clean(el);
        el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        const keep = ALLOWED_ATTRS.has(name) || name.startsWith('data-');
        if (!keep || name.startsWith('on')) { el.removeAttribute(attr.name); continue; }
        if (name === 'href' && !SAFE_LINK.test(value.trim())) el.removeAttribute(attr.name);
        else if (name === 'src' && !(tag === 'IMG' && isSafeImageUrl(value))) el.removeAttribute(attr.name);
        else if (name === 'style') {
          const s = safeStyle(value);
          if (s) el.setAttribute('style', s); else el.removeAttribute('style');
        } else if (name === 'type' && !(tag === 'INPUT' && value.toLowerCase() === 'checkbox')) el.removeAttribute(attr.name);
      }
      if (tag === 'INPUT' && el.getAttribute('type') !== 'checkbox') { el.remove(); continue; }
      if (tag === 'A') { el.setAttribute('rel', 'noopener noreferrer'); el.setAttribute('target', '_blank'); }
      clean(el);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
};
