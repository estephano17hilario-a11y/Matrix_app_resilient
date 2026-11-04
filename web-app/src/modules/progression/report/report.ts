// Entry point: ReportInput → CompletionReport. Pure and deterministic.

import { REPORT_CONFIG as R } from './config';
import { buildInsights, computeMetrics, computeTone, momentOf, scoreInsights, selectInsights } from './analysis';
import { compose, seedFor } from './narrative';
import type { CompletionReport, ReportInput, ReportMemory } from './types';

export const generateReport = (input: ReportInput, seed = seedFor(input.dayKey, input.itemId)): CompletionReport => {
  const candidates = buildInsights(input);
  const insights = selectInsights(scoreInsights(candidates, input.memory));
  const tone = computeTone(input, insights);
  const { text, variantIds } = compose({
    tone,
    insights,
    ctx: { moment: momentOf(input.at), kind: input.kind, itemName: input.itemName },
    userName: input.userName,
    seed,
    memory: input.memory,
  });
  return {
    kind: input.kind,
    itemName: input.itemName,
    at: input.at,
    tone,
    metrics: computeMetrics(input),
    insights,
    narrative: text,
    variantIds,
    insightTypes: insights.map(i => i.type),
  };
};

/** Memory after showing a report (keep the last NO_REPEAT_REPORTS entries). */
export const rememberReport = (memory: ReportMemory, report: Pick<CompletionReport, 'variantIds' | 'insightTypes'>): ReportMemory => {
  const shownCounts = { ...memory.shownCounts };
  for (const t of report.insightTypes) shownCounts[t] = (shownCounts[t] ?? 0) + 1;
  return {
    recentVariants: [report.variantIds, ...memory.recentVariants].slice(0, R.NO_REPEAT_REPORTS),
    recentInsightTypes: [report.insightTypes, ...memory.recentInsightTypes].slice(0, R.NO_REPEAT_REPORTS),
    shownCounts,
  };
};
