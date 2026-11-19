import { describe, expect, it } from 'vitest';
import { escapeAttr, escapeHtml, isSafeImageUrl } from './sanitizeHtml';

describe('sanitizeHtml helpers', () => {
  it('escapes text for HTML bodies', () => {
    expect(escapeHtml('a < b && c > d')).toBe('a &lt; b &amp;&amp; c &gt; d');
  });
  it('escapes quotes for attributes', () => {
    expect(escapeAttr('x" onerror="1')).toBe('x&quot; onerror=&quot;1');
  });
  it('accepts only safe image URLs', () => {
    expect(isSafeImageUrl('https://a.com/x.png')).toBe(true);
    expect(isSafeImageUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:text/html;base64,AAAA')).toBe(false);
    expect(isSafeImageUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
  });
});
