import { describe, expect, it } from 'vitest';
import type { Habit, Quest } from '../../types';
import type { RoutineItem } from './routineEngine';
import { applyTrims, buildTrimPatches, countOverlapping, scanBunches, trimKey } from './unbunch';

let n = 0;
const item = (time: string | null, durationMin = 30, over: Partial<RoutineItem> = {}): RoutineItem => {
  const minutes = time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null;
  n += 1;
  return {
    id: `i${n}`, kind: 'HABIT', title: `x${n}`, time, minutes, done: false, color: '#fff', durationMin,
    colorOwn: '', colorTrait: '', importance: 0, ...over,
  };
};
const habit = (over: Partial<Habit> = {}): Habit => ({ id: `h${++n}`, title: 'h', ...over } as Habit);

describe('tareas abultadas', () => {
  it('counts only real (clock) overlaps', () => {
    expect(countOverlapping([item('07:40', 20), item('07:50', 10)])).toBe(2);
    expect(countOverlapping([item('07:40', 10), item('07:50', 10)])).toBe(0);
    expect(countOverlapping([item(null), item('07:40', 10, { overdue: true }), item('07:45')])).toBe(0);
  });

  it('shortens the first block so it ends where the next one starts, never moving start times', () => {
    // The example: 07:40 lasting 20 min steps 10 min on 07:50 → it now lasts 10 min.
    const a = item('07:40', 20); const b = item('07:50', 10);
    const scan = scanBunches([{ key: 'd1', items: [a, b] }]);
    expect(scan.bunched).toBe(2);
    expect(scan.trims).toEqual([{ item: a, dayKey: 'd1', from: 20, to: 10 }]);
    expect(scan.stuck).toBe(0);
  });

  it('leaves blocks that start at the same minute bunched (stuck)', () => {
    const a = item('09:00', 30); const b = item('09:00', 15); const c = item('09:20', 10);
    const scan = scanBunches([{ key: 'd', items: [a, b, c] }]);
    expect(scan.trims.map(t => [t.item.id, t.to])).toEqual([[a.id, 20]]);
    expect(scan.stuck).toBe(2);
  });

  it('does not trim below the 5-minute minimum', () => {
    const scan = scanBunches([{ key: 'd', items: [item('09:00', 30), item('09:03', 10)] }]);
    expect(scan.trims).toHaveLength(0);
    expect(scan.stuck).toBe(2);
  });

  it('applies temporary trims only to the day they belong to', () => {
    const a = item('07:40', 20);
    const trims = new Map([[trimKey('d1', a.id), 10]]);
    expect(applyTrims([a], 'd1', trims)[0].durationMin).toBe(10);
    expect(applyTrims([a], 'd2', trims)[0]).toBe(a);
  });

  it('merges every sub-habit of one habit into a single permanent patch', () => {
    const h = habit({ checklist: [{ id: 's1', text: 'a', completed: false, calendarDuration: 20 }, { id: 's2', text: 'b', completed: false }] } as Partial<Habit>);
    const s1 = item('07:00', 20, { kind: 'SUBHABIT', habit: h, subtaskId: 's1' });
    const s2 = item('07:10', 15, { kind: 'SUBHABIT', habit: h, subtaskId: 's2' });
    const next = item('07:20', 10, { kind: 'PROJECT' });
    const patches = buildTrimPatches(scanBunches([{ key: 'd', items: [s1, s2, next] }]).trims);
    expect(patches).toHaveLength(1);
    const data = (patches[0] as { data: Partial<Habit> }).data;
    expect(data.checklist!.map(s => s.calendarDuration)).toEqual([10, 10]);
  });

  it('writes a one-day length back to that day only, and base lengths only get shorter', () => {
    const h = habit({ calendarDuration: 30, dayOverrides: { d1: { duration: 45 } } } as Partial<Habit>);
    const onOverride = buildTrimPatches([{ item: item('08:00', 45, { habit: h }), dayKey: 'd1', from: 45, to: 20 }]);
    expect((onOverride[0] as { data: Partial<Habit> }).data).toEqual({ id: h.id, dayOverrides: { d1: { duration: 20 } } });
    const twoDays = buildTrimPatches([
      { item: item('08:00', 30, { habit: h }), dayKey: 'd2', from: 30, to: 25 },
      { item: item('08:00', 30, { habit: h }), dayKey: 'd3', from: 30, to: 15 },
    ]);
    expect((twoDays[0] as { data: Partial<Habit> }).data.calendarDuration).toBe(15);
  });

  it('changes tasks and reminders, and skips focus sessions and the journal habit', () => {
    const q = { id: 'q1' } as Quest;
    const patches = buildTrimPatches([
      { item: item('08:00', 30, { kind: 'TASK', quest: q }), dayKey: 'd', from: 30, to: 10 },
      { item: item('09:00', 30, { kind: 'JOURNAL', reminderId: 'r1' }), dayKey: 'd', from: 30, to: 10 },
      { item: item('10:00', 45, { kind: 'PROJECT' }), dayKey: 'd', from: 45, to: 10 },
      { item: item('11:00', 20, { kind: 'JOURNAL' }), dayKey: 'd', from: 20, to: 10 },
    ]);
    expect(patches).toEqual([
      { kind: 'quest', questId: 'q1', data: { id: 'q1', calendarDuration: 10 } },
      { kind: 'reminder', reminderId: 'r1', data: { duration: 10 } },
    ]);
  });
});
