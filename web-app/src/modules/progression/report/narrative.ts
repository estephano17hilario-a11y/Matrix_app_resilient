// Composes the report paragraph: opening (tone + time of day) → 2-3 insights
// joined by natural connectors → closing (suggestion, prediction or generic).
//
// Variant choice uses a seeded PRNG (day + item id) so tests are reproducible,
// and skips any variant used in the last 10 reports.

import { REPORT_CONFIG as R } from './config';
import { capitalize, lowerFirst, sentence } from './language';
import { createRng, hashSeed, type Rng } from './stats';
import { CLOSINGS, CONNECTORS, INSIGHTS, OPENINGS, type Ctx, type Template } from './templates';
import type { Insight, InsightData, InsightType, Polarity, ReportMemory, Tone } from './types';

export class VariantPicker {
  /** Variant id → how many reports ago it was last used (0 = previous report). */
  private age = new Map<string, number>();
  readonly picked: string[] = [];

  constructor(private rng: Rng, memory: ReportMemory) {
    memory.recentVariants.slice(0, R.NO_REPEAT_REPORTS).forEach((ids, i) => {
      for (const id of ids) if (!this.age.has(id)) this.age.set(id, i);
    });
  }

  /**
   * Picks a variant of `bank` not used in the last 10 reports. When the bank
   * is smaller than that, falls back to the least recently used variants.
   */
  pick<T>(bank: string, variants: readonly T[]): T {
    const ids = variants.map((_, i) => `${bank}:${i}`).filter(id => !this.picked.includes(id));
    const all = ids.length ? ids : variants.map((_, i) => `${bank}:${i}`);
    let pool = all.filter(id => !this.age.has(id));
    if (!pool.length) {
      const oldest = Math.max(...all.map(id => this.age.get(id) ?? 0));
      pool = all.filter(id => this.age.get(id) === oldest);
    }
    const id = pool[Math.floor(this.rng() * pool.length)];
    this.picked.push(id);
    return variants[Number(id.slice(bank.length + 1))];
  }

  chance(p: number): boolean {
    return this.rng() < p;
  }
}

export const seedFor = (dayKey: string, itemId: string) => hashSeed(`${dayKey}:${itemId}`);

const render = <K extends InsightType>(picker: VariantPicker, insight: Insight<K>, ctx: Ctx): string => {
  const variants = INSIGHTS[insight.type] as Template<InsightData[K]>[];
  return picker.pick(`ins:${insight.type}`, variants)(insight.data, ctx);
};

const connectorFor = (prev: Polarity, next: Polarity) =>
  next === 'positive' && prev !== 'negative' ? 'POSITIVE' : next === 'negative' || (prev === 'positive' && next !== 'positive') ? 'CONTRAST' : 'NEUTRAL';

/** Final clean-up: Spanish contractions, spacing, stray punctuation. */
export const polish = (text: string): string =>
  text
    .replace(/\bde el\b/g, 'del')
    .replace(/\ba el\b/g, 'al')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\.\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

export interface ComposeInput {
  tone: Tone;
  insights: Insight[];
  ctx: Ctx;
  userName?: string | null;
  seed: number;
  memory: ReportMemory;
}

export const compose = ({ tone, insights, ctx, userName, seed, memory }: ComposeInput) => {
  const picker = new VariantPicker(createRng(seed), memory);
  const parts: string[] = [];

  // Opening (+ the user's name now and then)
  let opening = picker.pick(`open:${tone}`, OPENINGS[tone])(undefined, ctx);
  const name = userName?.trim().split(/\s+/)[0];
  if (name && picker.chance(R.NAME_PROBABILITY)) opening = `${opening}, ${name}`;
  parts.push(sentence(opening));

  // Body
  const body = insights.filter(i => i.role === 'body');
  let prev: Polarity | null = null;
  for (const insight of body) {
    const text = render(picker, insight, ctx);
    if (prev === null) {
      parts.push(sentence(text));
    } else {
      const c = picker.pick(`con:${connectorFor(prev, insight.polarity)}`, CONNECTORS[connectorFor(prev, insight.polarity)]);
      const lead = capitalize(c.text) + (c.colon ? ':' : ',');
      parts.push(sentence(`${lead} ${lowerFirst(text)}`));
    }
    prev = insight.polarity;
  }

  // Closing
  const suggestion = insights.find(i => i.role === 'suggestion');
  parts.push(sentence(suggestion ? render(picker, suggestion, ctx) : picker.pick(`close:${tone}`, CLOSINGS[tone])(undefined, ctx)));

  return { text: polish(parts.join(' ')), variantIds: picker.picked };
};
