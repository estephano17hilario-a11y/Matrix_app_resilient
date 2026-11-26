import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Tailwind v3 only generates sizing utilities for its fixed spacing scale. A class such as
// `w-13` is silently dropped, so the element loses its size and the layout collapses (this is
// what broke the bad-habit card icon). Use the arbitrary form instead: `w-[52px]`.
const SCALE = new Set([
  '0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96',
]);

const SIZED = /(?:^|[\s"'`])(?:(?:min-|max-)?(?:w|h)|size|gap(?:-[xy])?|p[xytblr]?|m[xytblr]?|space-[xy])-(\d+(?:\.\d+)?)(?=[\s"'`])/g;

const walk = (dir: string, out: string[] = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'lab') continue;
      walk(full, out);
    } else if (/\.tsx$/.test(name)) out.push(full);
  }
  return out;
};

describe('tailwind spacing scale', () => {
  it('uses no sizing class outside the default scale', () => {
    const root = join(process.cwd(), 'src');
    const offenders: string[] = [];
    for (const file of walk(root)) {
      const text = readFileSync(file, 'utf8')
        // comments may mention a bad class on purpose
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const m of text.matchAll(SIZED)) {
        if (!SCALE.has(m[1])) offenders.push(`${file.replace(root, 'src')}: ${m[0].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
