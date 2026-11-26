import { describe, expect, it } from 'vitest';
import type { RoutineItem } from './routineEngine';
import { bandOfHour, buildCalendarLayout, minutesToTime, snapMinutes, type CalendarDayInput } from './calendarLayout';

const item = (time: string | null, durationMin = 30, over: Partial<RoutineItem> = {}): RoutineItem => {
  const minutes = time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null;
  return { id: `${time}-${Math.random()}`, kind: 'HABIT', title: 'x', time, minutes, done: false, color: '#fff', durationMin, ...over };
};

const day = (items: RoutineItem[], isToday = false): CalendarDayInput => ({ key: 'd', isToday, items });
const plain = { divideByHour: false, hourBlock: 2, groupByPart: false };
const build = (items: RoutineItem[], extra: Partial<Parameters<typeof buildCalendarLayout>[0]> = {}) =>
  buildCalendarLayout({ days: [day(items)], config: plain, nowMinutes: null, pxPerHour: 60, minBlockPx: 20, ...extra });

describe('calendar layout', () => {
  it('is empty when nothing has an hour, and keeps untimed / overdue items for the strip', () => {
    const l = build([item(null), item(null, 30, { overdue: true })]);
    expect(l.empty).toBe(true);
    expect(l.allDay[0]).toHaveLength(2);
  });

  it('places a block on a linear scale with its duration as height', () => {
    const l = build([item('08:30', 90)]);
    const e = l.events[0];
    expect(e.top).toBe(8.5 * 60);
    expect(e.height).toBe(90);
    expect(l.height).toBe(24 * 60);
  });

  it('never draws a block shorter than the minimum', () => {
    expect(build([item('08:00', 5)]).events[0].height).toBe(20);
  });

  it('puts overlapping blocks side by side', () => {
    const l = build([item('09:00', 60), item('09:30', 60), item('11:00', 30)]);
    const [a, b, c] = l.events;
    expect([a.lane, a.lanes]).toEqual([0, 2]);
    expect([b.lane, b.lanes]).toEqual([1, 2]);
    expect([c.lane, c.lanes]).toEqual([0, 1]);
  });

  it('treats blocks that only look overlapped (tiny ones close together) as overlapping', () => {
    // 5 minutes each, 5 minutes apart: drawn at the 20px minimum they would sit on top of each other.
    const l = build([item('08:00', 5), item('08:05', 5)]);
    expect(l.events.map(e => e.lane)).toEqual([0, 1]);
  });

  it('cuts a block at midnight', () => {
    const e = build([item('23:30', 120)]).events[0];
    expect(e.end).toBe(24 * 60);
  });

  it('builds hour-block bands with their own progress', () => {
    const cfg = { divideByHour: true, hourBlock: 2, groupByPart: true };
    const l = build([item('08:30', 30, { done: true }), item('08:45'), item('15:00')], { config: cfg });
    expect(l.bands).toHaveLength(12);
    const b8 = l.bands.find(b => b.band.id === 'block-8')!;
    expect([b8.done, b8.total]).toEqual([1, 2]);
    expect(b8.top).toBe(8 * 60);
    expect(b8.height).toBe(2 * 60);
  });

  it('builds Mañana / Tarde / Noche bands when there are no hour blocks', () => {
    const cfg = { divideByHour: false, hourBlock: 2, groupByPart: true };
    const l = build([item('07:00'), item('20:00')], { config: cfg });
    expect(l.bands.map(b => b.band.part)).toEqual(['MORNING', 'AFTERNOON', 'NIGHT']);
    expect(bandOfHour(13, plain)).toBeNull();
    expect(build([item('07:00')]).bands).toHaveLength(0);
  });

  it('puts the now marker on the real time of today', () => {
    const l = buildCalendarLayout({ days: [day([item('09:00')], true)], config: plain, nowMinutes: 9 * 60 + 10, pxPerHour: 60 });
    expect(l.nowY).toBe(9 * 60 + 10);
    expect(l.nowDay).toBe(0);
  });

  it('keeps days aligned on the same scale', () => {
    const l = buildCalendarLayout({ days: [day([item('08:00')]), day([item('08:00')])], config: plain, nowMinutes: null });
    expect(l.events[0].top).toBe(l.events[1].top);
  });

  it('snaps and formats minutes', () => {
    expect(snapMinutes(487)).toBe(485);
    expect(minutesToTime(9 * 60 + 5)).toBe('09:05');
    expect(minutesToTime(2000)).toBe('23:59');
  });
});
