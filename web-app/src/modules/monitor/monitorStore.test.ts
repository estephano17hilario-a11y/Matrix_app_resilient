import { beforeEach, describe, expect, it, vi } from 'vitest';

let platform = 'android';
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, String(v)); },
  clear: () => mem.clear(),
});
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => platform } }));

const load = async () => { vi.resetModules(); return (await import('./monitorStore')).monitor; };

describe('widgets showcase after the first-run tutorial', () => {
  beforeEach(() => { platform = 'android'; localStorage.clear(); });

  it('opens once on Android when the tutorial reached its end', async () => {
    const m = await load();
    m.intro('tour'); m.run('tour'); m.markEnd(); m.close();
    expect(m.get().kind).toBe('widgets');
    m.close();
    expect(m.get().kind).toBe('idle');
    // a second tutorial never shows it again
    m.intro('tour'); m.markEnd(); m.close();
    expect(m.get().kind).toBe('idle');
  });

  it('does not open when the tutorial was skipped before the end', async () => {
    const m = await load();
    m.intro('tour'); m.close();
    expect(m.get().kind).toBe('idle');
    // a later lightbulb tour must not leak into the first-run flow
    m.run('live-tasks'); m.markEnd(); m.close();
    expect(m.get().kind).toBe('idle');
  });

  it('does not open outside Android', async () => {
    platform = 'web';
    const m = await load();
    m.intro('tour'); m.markEnd(); m.close();
    expect(m.get().kind).toBe('idle');
  });
});
