// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR LAYOUT — turns the routine items of one or more days into a Google-Calendar-style time grid:
// a true linear time scale, one block per item whose height is its duration, side-by-side lanes when blocks
// overlap, and bands that follow the way the user divided the day in the routine settings.
//
//  - Hour blocks on  → bands every `hourBlock` hours (08:00 – 10:00 …), each with its own progress.
//  - Hour blocks off + Mañana/Tarde/Noche on → three bands (before 12:00, until 19:00, from 19:00).
//  - Neither → a plain time grid.
// Pure functions: no React, no storage. (The Android widget has its own renderer of the same idea.)
// ─────────────────────────────────────────────────────────────────────────────

import { dayPartOf, hourBlockOf, type DayPart, type RoutineConfig, type RoutineItem } from './routineEngine';

export interface CalendarBand {
  id: string;
  kind: 'BLOCK' | 'PART';
  part: DayPart;
  startHour: number;
  endHour: number;
}

export interface CalendarBandBox {
  band: CalendarBand;
  top: number;
  height: number;
  /** Timed items of the band (all days shown) and how many are done. */
  done: number;
  total: number;
}

export interface CalendarEvent {
  item: RoutineItem;
  /** Index into the days passed in. */
  day: number;
  /** Minutes since midnight. */
  start: number;
  end: number;
  top: number;
  height: number;
  /** Position among the blocks that start (almost) together with it, side by side, and how many share that row. */
  lane: number;
  lanes: number;
  /** How many earlier blocks still running it sits on top of: drawn shifted right by that many steps (Google style). */
  indent: number;
  /** Paint order inside its day: later blocks go on top. */
  order: number;
}

export interface CalendarDayInput {
  key: string;
  isToday: boolean;
  items: RoutineItem[];
}

export interface CalendarLayout {
  events: CalendarEvent[];
  bands: CalendarBandBox[];
  /** Height of the whole 24 h grid in px. */
  height: number;
  pxPerMin: number;
  /** y of the "now" marker and the day column it belongs to (-1 when today is not shown). */
  nowY: number | null;
  nowDay: number;
  /** Items with no hour, or overdue tasks, per day: they live in the strip above the grid. */
  allDay: RoutineItem[][];
  /** No timed item in any day. */
  empty: boolean;
}

export interface BuildCalendarInput {
  days: CalendarDayInput[];
  config: Pick<RoutineConfig, 'divideByHour' | 'hourBlock' | 'groupByPart'>;
  /** Minutes since midnight for the column that is today, else null. */
  nowMinutes: number | null;
  pxPerHour?: number;
  /** A block is never drawn shorter than this many px (so a 5-minute habit is still tappable). */
  minBlockPx?: number;
  /** Height of a block's title line: blocks starting closer than this go side by side, later ones nest on top. */
  titlePx?: number;
}

export const DAY_MINUTES = 24 * 60;
export const DEFAULT_PX_PER_HOUR = 60;

const PART_BOUNDS: Record<DayPart, [number, number]> = { MORNING: [0, 12], AFTERNOON: [12, 19], NIGHT: [19, 24] };

/** The band an hour belongs to under the user's division, or null for a plain grid. */
export const bandOfHour = (hour: number, config: Pick<RoutineConfig, 'divideByHour' | 'hourBlock' | 'groupByPart'>): CalendarBand | null => {
  if (config.divideByHour) {
    const { startHour, endHour } = hourBlockOf(hour * 60, config.hourBlock);
    return { id: `block-${startHour}`, kind: 'BLOCK', part: dayPartOf(startHour * 60), startHour, endHour };
  }
  if (config.groupByPart) {
    const part = dayPartOf(hour * 60);
    const [startHour, endHour] = PART_BOUNDS[part];
    return { id: `part-${part}`, kind: 'PART', part, startHour, endHour };
  }
  return null;
};

const isTimed = (it: RoutineItem) => !it.overdue && it.minutes !== null;

/** Rounds to the nearest `step` minutes. */
export const snapMinutes = (m: number, step = 5) => Math.round(m / step) * step;

export const minutesToTime = (m: number) => {
  const c = Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(m)));
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
};

export const buildCalendarLayout = (input: BuildCalendarInput): CalendarLayout => {
  const { days, config, nowMinutes, pxPerHour = DEFAULT_PX_PER_HOUR, minBlockPx = 20 } = input;
  const titlePx = input.titlePx ?? minBlockPx;
  const pxPerMin = pxPerHour / 60;
  const minBlockMin = minBlockPx / pxPerMin;
  const titleMin = titlePx / pxPerMin;

  const allDay = days.map(d => d.items.filter(it => !isTimed(it)));
  const events: CalendarEvent[] = [];

  // Google-Calendar placement. Blocks that start within one title line of each other share a ROW and sit side
  // by side; a block that starts later than that is drawn on top of the ones still running, shifted right one
  // step (so every title stays readable instead of splitting the column into dozens of slivers). A block that
  // only *looks* long because of the minimum height is cut where the next one starts.
  interface Row { first: number; indent: number; members: { e: CalendarEvent; visEnd: number }[] }
  days.forEach((d, day) => {
    const dayEvents: CalendarEvent[] = d.items.filter(isTimed).map(item => {
      const start = item.minutes!;
      const end = Math.min(DAY_MINUTES, start + item.durationMin);
      return { item, day, start, end, top: start * pxPerMin, height: 0, lane: 0, lanes: 1, indent: 0, order: 0 };
    });
    // Longest first on equal starts so the big block takes the first place of its row.
    dayEvents.sort((a, b) => a.start - b.start || b.end - a.end || a.item.title.localeCompare(b.item.title));

    const rows: Row[] = [];
    dayEvents.forEach((e, order) => {
      e.order = order;
      const member = { e, visEnd: e.start + Math.max(e.end - e.start, minBlockMin) };
      const live = rows.filter(r => r.members.some(m => m.visEnd > e.start));
      const join = [...live].reverse().find(r => e.start - r.first < titleMin);
      if (join) { join.members.push(member); e.indent = join.indent; return; }
      const running = live.filter(r => r.members.some(m => m.e.end > e.start));
      const indent = running.length ? Math.max(...running.map(r => r.indent)) + 1 : 0;
      // Rows at this depth or deeper are not really running any more (else the depth would be higher): their
      // stretched minimum height stops where this block starts.
      for (const r of live) if (r.indent >= indent) for (const m of r.members) m.visEnd = Math.min(m.visEnd, Math.max(e.start, m.e.end));
      e.indent = indent;
      rows.push({ first: e.start, indent, members: [member] });
    });
    for (const r of rows) {
      r.members.forEach((m, i) => {
        m.e.lane = i;
        m.e.lanes = r.members.length;
        m.e.height = Math.max(4, (m.visEnd - m.e.start) * pxPerMin);
      });
    }
    events.push(...dayEvents);
  });

  // Bands over the whole day (only when the user divided it).
  const bands: CalendarBandBox[] = [];
  if (config.divideByHour || config.groupByPart) {
    for (let h = 0; h < 24;) {
      const band = bandOfHour(h, config)!;
      const inBand = events.filter(e => Math.floor(e.start / 60) >= band.startHour && Math.floor(e.start / 60) < band.endHour);
      bands.push({
        band,
        top: band.startHour * pxPerHour,
        height: (band.endHour - band.startHour) * pxPerHour,
        done: inBand.filter(e => e.item.done).length,
        total: inBand.length,
      });
      h = band.endHour;
    }
  }

  const nowDay = nowMinutes === null ? -1 : days.findIndex(d => d.isToday);
  return {
    events, bands, height: 24 * pxPerHour, pxPerMin, allDay,
    nowY: nowMinutes !== null && nowDay >= 0 ? nowMinutes * pxPerMin : null,
    nowDay,
    empty: events.length === 0,
  };
};
