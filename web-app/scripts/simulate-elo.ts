// Dev tool: how many perfect days does it take to reach each rank? Bundle + run: npx esbuild scripts/simulate-elo.ts --bundle --platform=node --format=cjs --outfile=sim.cjs && node sim.cjs
import { PROGRESSION_CONFIG } from '../src/modules/progression/engine/config';
import { addDaysToKey } from '../src/modules/progression/engine/dayKey';
import { awardFocus, closeDay, createProgressionState, replay } from '../src/modules/progression/engine/progression';

const START_DAY = '2026-11-28';
const RANKS = PROGRESSION_CONFIG.RANKS;

interface Scenario { name: string; habits: boolean; tasks: boolean; focusHours: number }
const scenarios: Scenario[] = [
  { name: 'Hábitos perfectos', habits: true, tasks: false, focusHours: 0 },
  { name: 'Hábitos + tareas perfectos', habits: true, tasks: true, focusHours: 0 },
  { name: 'Hábitos + tareas + 2 h foco', habits: true, tasks: true, focusHours: 2 },
  { name: 'Hábitos + tareas + 4 h foco', habits: true, tasks: true, focusHours: 4 },
  { name: 'Hábitos + tareas + 8 h foco (máx.)', habits: true, tasks: true, focusHours: 8 },
];

const run = (sc: Scenario) => {
  let s = createProgressionState(START_DAY);
  const reached: Record<string, number> = {};
  const targets: [string, number][] = RANKS.map(r => [r.name, r.entry] as [string, number]).filter(([, e]) => e > 0);
  let day = START_DAY;
  for (let n = 1; n <= 3000; n++) {
    if (sc.focusHours > 0) s = awardFocus(s, day, sc.focusHours * 60, 0).state;
    const res = closeDay(s, {
      dayKey: day,
      habits: { scheduled: 5, completed: sc.habits ? 5 : 0 }, habitGoalPct: 80,
      tasks: { planned: sc.tasks ? 3 : 0, completed: sc.tasks ? 3 : 0 },
      closedAt: 0,
    });
    if (res.status === 'CLOSED') s = res.state;
    const elo = replay(s).elo;
    for (const [name, entry] of targets) if (elo >= entry && !(name in reached)) reached[name] = n;
    day = addDaysToKey(day, 1);
    if ('Leyenda' in reached) break;
  }
  return reached;
};

for (const sc of scenarios) {
  const r = run(sc);
  console.log(`\n${sc.name}`);
  for (const [name, d] of Object.entries(r)) console.log(`  ${name.padEnd(14)} día ${String(d).padStart(4)}  (~${(d / 30).toFixed(1)} meses)`);
  if (!('Leyenda' in r)) console.log('  Leyenda       no alcanzada en 3000 días');
}
