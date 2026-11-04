// Metrics + rule-based insight candidates + relevance scoring.
// Deterministic: same input → same insights, in the same order.

import { getDayKey, daysBetween, weekdayOfKey } from '../engine/dayKey';
import { PROGRESSION_CONFIG } from '../engine/config';
import { REPORT_CONFIG as R } from './config';
import { linearRegression, mean, roundTo, variation } from './stats';
import { slotOf } from './language';
import type {
  FocusRecord, Insight, InsightData, InsightType, Moment, ReportInput, ReportMetric, Tone,
} from './types';

const DAY_MS = 86_400_000;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (a: number, b: number) => (b > 0 ? (a / b - 1) * 100 : 0);

const make = <T extends InsightType>(
  type: T, role: Insight['role'], polarity: Insight['polarity'], magnitude: number, data: InsightData[T],
): Insight<T> => ({ type, role, polarity, magnitude: clamp01(magnitude), data });

export const momentOf = (at: number): Moment => {
  const h = new Date(at).getHours();
  if (h < 5) return 'DAWN';
  return slotOf(h);
};

// ── Metrics shown as chips ───────────────────────────────────────────────────

export const computeMetrics = (input: ReportInput): ReportMetric[] => {
  const out: ReportMetric[] = [];
  const { focus, habit, task } = input;

  if (focus) {
    out.push({ id: 'minutes', label: 'Duración', value: Math.round(focus.minutes), display: `${Math.round(focus.minutes)} min` });
    if (focus.plannedMinutes) {
      const p = Math.round((100 * focus.minutes) / focus.plannedMinutes);
      out.push({ id: 'vsPlan', label: 'Vs. plan', value: p, display: `${p} %` });
    }
    const avg = projectAverage(input);
    if (avg !== null) {
      const d = Math.round(pct(focus.minutes, avg));
      out.push({ id: 'vsAvg', label: 'Vs. promedio 7', value: d, display: `${d > 0 ? '+' : ''}${d} %` });
    }
    out.push({ id: 'pauses', label: 'Pausas', value: focus.pauses, display: String(focus.pauses) });
    if (focus.projectGoalMinutes) {
      out.push({
        id: 'today', label: 'Hoy vs. meta', value: Math.round(focus.projectMinutesToday),
        display: `${Math.round(focus.projectMinutesToday)}/${focus.projectGoalMinutes} min`,
      });
    }
  }

  if (habit) {
    out.push({ id: 'streak', label: 'Racha', value: habit.streak, display: `${habit.streak} ${habit.streak === 1 ? 'día' : 'días'}` });
    out.push({ id: 'rate7', label: 'Últimos 7 días', value: Math.round(habit.rate7 * 100), display: `${Math.round(habit.rate7 * 100)} %` });
    out.push({ id: 'rate30', label: 'Últimos 30 días', value: Math.round(habit.rate30 * 100), display: `${Math.round(habit.rate30 * 100)} %` });
    const prog = habit.scheduledToday > 0 ? Math.round((100 * (100 * habit.doneToday) / habit.scheduledToday) / habit.goalPct) : 0;
    out.push({ id: 'goal', label: 'Meta diaria', value: prog, display: `${prog} %` });
  }

  if (task) {
    out.push({ id: 'done', label: 'Hoy', value: task.doneToday, display: `${task.doneToday} de ${task.totalToday}` });
    if (task.actualMinutes && task.estimatedMinutes) {
      out.push({
        id: 'estimate', label: 'Real vs. estimado', value: Math.round(task.actualMinutes),
        display: `${Math.round(task.actualMinutes)}/${task.estimatedMinutes} min`,
      });
    }
  }

  return out;
};

const sameProject = (input: ReportInput): FocusRecord[] =>
  input.history.focus
    .filter(s => s.projectId === (input.focus?.projectId ?? null))
    .sort((a, b) => b.endedAt - a.endedAt);

/** Average of the last 7 sessions of the same project, null with < 3 records. */
export const projectAverage = (input: ReportInput): number | null => {
  const prev = sameProject(input).slice(0, 7);
  return prev.length >= R.MIN_HISTORY ? mean(prev.map(s => s.minutes)) : null;
};

// ── Tone ────────────────────────────────────────────────────────────────────

export const computeTone = (input: ReportInput, insights: Insight[]): Tone => {
  if (insights.some(i => i.type === 'RECORD' || i.type === 'STREAK_MILESTONE')) return 'EXCELLENT';
  let ratio = 1;
  if (input.focus) {
    const avg = projectAverage(input);
    ratio = input.focus.plannedMinutes ? input.focus.minutes / input.focus.plannedMinutes : avg ? input.focus.minutes / avg : 1;
  } else if (input.habit && input.habit.scheduledToday > 0) {
    // Completing a habit is never a "difficult" moment; it only gets better as the day fills up.
    const r = ((100 * input.habit.doneToday) / input.habit.scheduledToday) / input.habit.goalPct;
    ratio = r >= 1.2 ? 1.2 : r >= 0.6 ? 1 : 0.7;
  } else if (input.task) {
    const allDone = input.task.totalToday > 0 && input.task.doneToday >= input.task.totalToday;
    ratio = allDone ? 1.2 : 1;
    if (input.task.actualMinutes && input.task.estimatedMinutes && input.task.actualMinutes > 1.5 * input.task.estimatedMinutes) ratio = 0.7;
  }
  if (ratio >= 1.1) return 'EXCELLENT';
  if (ratio >= 0.9) return 'GOOD';
  if (ratio >= 0.6) return 'REGULAR';
  return 'DIFFICULT';
};

// ── Insight candidates ──────────────────────────────────────────────────────

export const buildInsights = (input: ReportInput): Insight[] => {
  const out: Insight[] = [];
  const { focus, habit, task, history, dayKey, at } = input;
  const building = input.priorRecords < R.MIN_HISTORY;

  if (building) {
    out.push(make('BUILDING_HISTORY', 'body', 'neutral', 0.5, { remaining: R.MIN_HISTORY - input.priorRecords }));
  }

  // ── Focus ──
  if (focus) {
    const prev = sameProject(input);
    const all = [...history.focus].sort((a, b) => b.endedAt - a.endedAt);

    if (!building) {
      const avg = projectAverage(input);
      if (avg !== null && focus.minutes >= R.ABOVE_AVG_RATIO * avg) {
        const d = pct(focus.minutes, avg);
        out.push(make('ABOVE_AVERAGE', 'body', 'positive', d / 100, {
          minutes: focus.minutes, avgMinutes: avg, pctDiff: d, projectName: focus.projectName ?? null,
        }));
      }

      const scopes: { scope: 'ALL' | 'MONTH' | 'WEEK'; days: number }[] = [
        { scope: 'ALL', days: Infinity }, { scope: 'MONTH', days: 30 }, { scope: 'WEEK', days: 7 },
      ];
      let record: 'ALL' | 'MONTH' | 'WEEK' | null = null;
      for (const s of scopes) {
        const inWindow = all.filter(x => at - x.endedAt <= s.days * DAY_MS);
        if (inWindow.length >= R.MIN_HISTORY && focus.minutes > Math.max(...inWindow.map(x => x.minutes))) {
          record = s.scope;
          break;
        }
      }
      if (record) {
        out.push(make('RECORD', 'body', 'positive', record === 'ALL' ? 1 : record === 'MONTH' ? 0.75 : 0.5, { scope: record, minutes: focus.minutes }));
      } else {
        // "Your best session since …": the last time you did at least this much.
        const better = all.find(x => x.minutes >= focus.minutes);
        if (better) {
          const since = getDayKey(better.endedAt);
          const between = all.filter(x => x.endedAt > better.endedAt).length;
          if (daysBetween(since, dayKey) >= 7 && between >= R.MIN_HISTORY) {
            out.push(make('BEST_SINCE', 'body', 'positive', clamp01(daysBetween(since, dayKey) / 60), {
              minutes: focus.minutes, sinceDayKey: since, todayKey: dayKey,
            }));
          }
        }
      }

      // Same weekday comparison
      const wd = weekdayOfKey(dayKey);
      const sameWd = all.filter(x => weekdayOfKey(getDayKey(x.endedAt)) === wd).map(x => x.minutes);
      if (sameWd.length >= R.MIN_HISTORY) {
        const d = pct(focus.minutes, mean(sameWd));
        if (Math.abs(d) >= R.SAME_WEEKDAY_MIN_PCT) {
          out.push(make('SAME_WEEKDAY', 'body', d > 0 ? 'positive' : 'neutral', Math.abs(d) / 100, { weekday: wd, pctDiff: d }));
        }
      }

      // Consistency: is the spread of recent sessions shrinking?
      if (prev.length >= 2 * R.CONSISTENCY_WINDOW) {
        const recent = [focus.minutes, ...prev.slice(0, R.CONSISTENCY_WINDOW - 1).map(x => x.minutes)];
        const older = prev.slice(R.CONSISTENCY_WINDOW - 1, 2 * R.CONSISTENCY_WINDOW - 1).map(x => x.minutes);
        const vr = variation(recent);
        const vo = variation(older);
        if (vo > 0 && vr <= vo * (1 - R.CONSISTENCY_DROP)) {
          out.push(make('CONSISTENCY', 'body', 'positive', clamp01((vo - vr) / vo), { improving: true }));
        }
      }
    }

    // Best weekday by duration × rating (needs 3+ sessions on 3+ weekdays)
    const byWd = new Map<number, FocusRecord[]>();
    for (const s of history.focus) {
      const w = weekdayOfKey(getDayKey(s.endedAt));
      byWd.set(w, [...(byWd.get(w) ?? []), s]);
    }
    const eligible = [...byWd.entries()].filter(([, xs]) => xs.length >= R.MIN_HISTORY);
    if (eligible.length >= 3) {
      const scoreOf = (xs: FocusRecord[]) => {
        const rated = xs.filter(x => x.rating);
        return mean(xs.map(x => x.minutes)) * (rated.length ? mean(rated.map(x => x.rating as number)) / 3 : 1);
      };
      const ranked = eligible.map(([w, xs]) => ({ w, score: scoreOf(xs) })).sort((a, b) => b.score - a.score || a.w - b.w);
      const best = ranked[0];
      const others = mean(ranked.slice(1).map(r => r.score));
      if (others > 0 && best.score >= others * 1.15) {
        out.push(make('BEST_WEEKDAY', 'body', 'neutral', clamp01(best.score / others - 1), { weekday: best.w, isToday: best.w === weekdayOfKey(dayKey) }));
      }
    }

    // Project goal today
    if (focus.projectGoalMinutes) {
      const met = focus.projectMinutesToday >= focus.projectGoalMinutes;
      out.push(make('PROJECT_GOAL', 'body', met ? 'positive' : 'neutral', met ? 0.6 : 0.3, {
        minutesToday: focus.projectMinutesToday, goal: focus.projectGoalMinutes, met, projectName: focus.projectName ?? null,
      }));
    }

    // 3 sessions in a row under 70% of their planned length → lower the goal.
    const planned = [
      { minutes: focus.minutes, plannedMinutes: focus.plannedMinutes },
      ...prev.filter(x => x.plannedMinutes).slice(0, 2),
    ];
    if (focus.plannedMinutes && planned.length === 3 && planned.every(x => x.minutes < R.LOW_SESSION_RATIO * (x.plannedMinutes as number))) {
      const suggested = roundTo(mean(planned.map(x => x.minutes)), 5);
      if (suggested < focus.plannedMinutes) {
        out.push(make('LOWER_GOAL', 'suggestion', 'negative', 0.8, { current: focus.plannedMinutes, suggested }));
      }
    }

    // 5 days in a row hitting the project goal → raise it 10%.
    const goalDays = history.projectGoalDays.slice(-R.RAISE_GOAL_DAYS);
    if (focus.projectGoalMinutes && goalDays.length === R.RAISE_GOAL_DAYS && goalDays.every(d => d.met)) {
      out.push(make('RAISE_GOAL', 'suggestion', 'positive', 0.7, {
        current: focus.projectGoalMinutes, suggested: roundTo(focus.projectGoalMinutes * (1 + R.RAISE_GOAL_PCT / 100), 5), target: 'PROJECT',
      }));
    }

    // 150+ minutes chained without a 15-minute break.
    const chain = continuousFocus(input);
    if (chain >= R.BREAK_AFTER_MINUTES) {
      out.push(make('TAKE_BREAK', 'suggestion', 'neutral', 0.9, { minutes: chain }));
    }
  }

  // ── Habit ──
  if (habit) {
    if ((R.STREAK_MILESTONES as readonly number[]).includes(habit.streak)) {
      out.push(make('STREAK_MILESTONE', 'body', 'positive', clamp01(habit.streak / 30 + 0.4), { days: habit.streak, itemName: input.itemName }));
    }
    if (!building && Math.abs(habit.rate7 - habit.rate30) >= 0.1) {
      out.push(make('HABIT_RATE', 'body', habit.rate7 > habit.rate30 ? 'positive' : 'neutral', Math.abs(habit.rate7 - habit.rate30), { rate7: habit.rate7, rate30: habit.rate30 }));
    }
    if (habit.scheduledToday > 0) {
      out.push(make('DAY_PROGRESS', 'body', 'neutral', 0.3, { done: habit.doneToday, total: habit.scheduledToday, noun: 'HABITS', goalPct: habit.goalPct }));
    }
    const days = history.habitGoalDays.slice(-R.RAISE_GOAL_DAYS);
    if (habit.goalPct < PROGRESSION_CONFIG.ELO.HABIT_GOAL_MAX_PCT && days.length === R.RAISE_GOAL_DAYS && days.every(d => d.ratio >= 1)) {
      out.push(make('RAISE_GOAL', 'suggestion', 'positive', 0.7, {
        current: habit.goalPct,
        suggested: Math.min(PROGRESSION_CONFIG.ELO.HABIT_GOAL_MAX_PCT, roundTo(habit.goalPct * (1 + R.RAISE_GOAL_PCT / 100), 5)),
        target: 'HABITS',
      }));
    }
  }

  // ── Task / subtask ──
  if (task) {
    if (task.totalToday > 0) {
      out.push(make('DAY_PROGRESS', 'body', task.doneToday >= task.totalToday ? 'positive' : 'neutral', task.doneToday / task.totalToday * 0.6, {
        done: task.doneToday, total: task.totalToday, noun: 'TASKS', goalPct: null,
      }));
    }
    if (task.actualMinutes && task.estimatedMinutes) {
      const d = pct(task.actualMinutes, task.estimatedMinutes);
      if (Math.abs(d) >= 15) {
        out.push(make('TASK_ESTIMATE', 'body', d < 0 ? 'positive' : 'neutral', Math.abs(d) / 100, { actual: task.actualMinutes, estimated: task.estimatedMinutes, pctDiff: d }));
      }
    }
  }

  // ── Cross-kind: ratings, trend, notes, prediction ──
  const ratings = [...history.ratings].sort((a, b) => b.at - a.at);
  const last5 = ratings.slice(0, 5);
  if (last5.length === 5 && mean(last5.map(r => r.rating)) < R.LOW_FOCUS_AVG) {
    out.push(make('LOW_FOCUS', 'suggestion', 'negative', 0.85, { avg: mean(last5.map(r => r.rating)) }));
  }

  const slots = new Map<string, number[]>();
  for (const r of ratings) {
    const s = slotOf(new Date(r.at).getHours());
    slots.set(s, [...(slots.get(s) ?? []), r.rating]);
  }
  const slotRank = [...slots.entries()].filter(([, xs]) => xs.length >= R.SLOT_MIN_RECORDS)
    .map(([slot, xs]) => ({ slot, avg: mean(xs) })).sort((a, b) => b.avg - a.avg || a.slot.localeCompare(b.slot));
  if (slotRank.length >= 1) {
    const overall = mean(ratings.map(r => r.rating));
    const best = slotRank[0];
    if (slotRank.length >= 2 ? best.avg - overall >= 0.2 : best.avg >= 4) {
      out.push(make('BEST_SLOT', 'body', 'neutral', clamp01((best.avg - overall) / 2 + 0.2), {
        slot: best.slot as 'MORNING' | 'AFTERNOON' | 'NIGHT', avg: best.avg, isNow: slotOf(new Date(at).getHours()) === best.slot,
      }));
    }
  }

  if (!building) {
    const series = focus
      ? history.dailyFocusMinutes.slice(-R.TREND_DAYS).map(d => d.minutes)
      : habit ? history.habitGoalDays.slice(-R.TREND_DAYS).map(d => d.ratio) : [];
    if (series.length >= R.TREND_DAYS && mean(series) > 0) {
      const { slope, r2 } = linearRegression(series);
      const relative = (slope * series.length) / mean(series);
      if (Math.abs(relative) >= R.TREND_MIN_CHANGE && r2 >= R.TREND_MIN_R2) {
        out.push(make('TREND', 'body', relative > 0 ? 'positive' : 'negative', clamp01(Math.abs(relative)), {
          direction: relative > 0 ? 'UP' : 'DOWN', subject: focus ? 'FOCUS' : 'HABITS',
        }));
      }
    }
  }

  const similar = [...history.notes]
    .filter(n => (focus ? n.kind === 'FOCUS' && n.projectId === (focus.projectId ?? null) : n.itemId === input.itemId))
    .sort((a, b) => b.at - a.at)[0];
  if (similar && at - similar.at <= R.NOTE_RECALL_DAYS * DAY_MS && similar.note.trim()) {
    const contrast = focus && (similar.pauses ?? 0) > 0 && focus.pauses === 0 ? 'NO_PAUSES'
      : focus && similar.minutes && focus.minutes > similar.minutes * 1.1 ? 'LONGER' : null;
    out.push(make('NOTE_RECALL', 'body', 'neutral', 0.6, {
      quote: similar.note, dayKey: getDayKey(similar.at), todayKey: dayKey, contrast,
      extraMinutes: focus && similar.minutes ? Math.round(focus.minutes - similar.minutes) : 0,
    }));
  }

  const avgElo = mean(history.dailyElo);
  const { standing } = input.elo;
  if (history.dailyElo.length >= 3 && avgElo >= 0.5 && standing.eloToNext && standing.nextLabel) {
    const days = Math.ceil(standing.eloToNext / avgElo);
    if (days <= R.PREDICTION_MAX_DAYS) {
      out.push(make('PREDICTION', 'suggestion', 'positive', clamp01(1 - days / R.PREDICTION_MAX_DAYS + 0.2), { days, nextLabel: standing.nextLabel }));
    }
  }

  return out;
};

/** Minutes focused today in a chain where no gap between sessions reached the break length. */
export const continuousFocus = (input: ReportInput): number => {
  if (!input.focus) return 0;
  const sessions = [
    ...input.history.focus.filter(s => !s.manual && getDayKey(s.endedAt) === input.dayKey),
    { endedAt: input.at, minutes: input.focus.minutes } as FocusRecord,
  ].sort((a, b) => a.endedAt - b.endedAt);
  let chain = 0;
  let lastEnd = -Infinity;
  for (const s of sessions) {
    const start = s.endedAt - s.minutes * 60_000;
    chain = start - lastEnd >= R.BREAK_MIN_MINUTES * 60_000 ? s.minutes : chain + s.minutes;
    lastEnd = s.endedAt;
  }
  return Math.round(chain);
};

// ── Scoring ─────────────────────────────────────────────────────────────────

/** score = weight × magnitude × rarity × novelty. Types shown in the previous report get novelty 0. */
export const scoreInsights = (insights: Insight[], memory: ReportInput['memory']): Insight[] => {
  const last = new Set(memory.recentInsightTypes[0] ?? []);
  const recent = new Set(memory.recentInsightTypes.slice(1, 4).flat());
  return insights
    .map(i => {
      const rarity = 1 / (1 + R.RARITY_DECAY * (memory.shownCounts[i.type] ?? 0));
      const novelty = i.type === 'BUILDING_HISTORY' ? 1 : last.has(i.type) ? 0 : recent.has(i.type) ? 0.5 : 1;
      const magnitude = 0.25 + 0.75 * i.magnitude;
      return { ...i, score: R.WEIGHTS[i.type] * magnitude * rarity * novelty };
    })
    .filter(i => (i.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.type.localeCompare(b.type));
};

/** Top insights, max 3, at most one suggestion and no duplicate types. */
export const selectInsights = (scored: Insight[]): Insight[] => {
  const picked: Insight[] = [];
  const types = new Set<string>();
  let suggestions = 0;
  for (const i of scored) {
    if (picked.length >= R.MAX_INSIGHTS) break;
    if (types.has(i.type)) continue;
    if (i.role === 'suggestion' && suggestions >= 1) continue;
    picked.push(i);
    types.add(i.type);
    if (i.role === 'suggestion') suggestions++;
  }
  return picked;
};

