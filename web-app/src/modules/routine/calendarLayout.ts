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
  /** Column among the blocks that overlap it, and how many columns that group has. */
  lane: number;
  lanes: number;
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
  const { days, config, nowMinutes, pxPerHour = DEFAULT_PX_PER_HOUR, minBlockPx = 22 } = input;
  const pxPerMin = pxPerHour / 60;
  const minBlockMin = minBlockPx / pxPerMin;

  const allDay = days.map(d => d.items.filter(it => !isTimed(it)));
  const events: CalendarEvent[] = [];

  days.forEach((d, day) => {
    const day_events: CalendarEvent[] = d.items.filter(isTimed).map(item => {
      const start = item.minutes!;
      const end = Math.min(DAY_MINUTES, start + item.durationMin);
      return {
        item, day, start, end,
        top: start * pxPerMin,
        height: Math.max((end - start) * pxPerMin, minBlockPx),
        lane: 0, lanes: 1,
      };
    });
    // Longest first on equal starts so the big block takes the first lane.
    day_events.sort((a, b) => a.start - b.start || b.end - a.end || a.item.title.localeCompare(b.item.title));

    // Lanes: a group is a run of blocks that keep overlapping (by what is drawn, not by the clock).
    let group: CalendarEvent[] = [];
    let groupEnd = -1;
    const laneEnds: number[] = [];
    const flush = () => {
      for (const e of group) e.lanes = laneEnds.length;
      group = []; laneEnds.length = 0; groupEnd = -1;
    };
    for (const e of day_events) {
      const visualEnd = e.start + Math.max(e.end - e.start, minBlockMin);
      if (group.length && e.start >= groupEnd) flush();
      let lane = laneEnds.findIndex(end => end <= e.start);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(visualEnd); } else laneEnds[lane] = visualEnd;
      e.lane = lane;
      groupEnd = Math.max(groupEnd, visualEnd);
      group.push(e);
    }
    flush();
    events.push(...day_events);
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
