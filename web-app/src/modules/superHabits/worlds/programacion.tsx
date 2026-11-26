import React, { useEffect, useRef } from 'react';
import { SUPER_MILESTONES } from '../engine';
import '../superHabits.css';
import type { WorldDef, WorldCtx } from './types';

// PROGRAMACIÓN — your repo. Each milestone is a commit on the history graph; earned
// ones passed CI, the next one is building (with a live percentage), the rest are queued.

const HASH = ['a3f9c21', '7be04d8', 'c19a7f3', '5d2e8b0', 'e84c1a6', '2f7d93b', '9a06e5c', 'b71f4d2'];
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, streak } = ctx;
  const { primary, secondary } = theme.colors;
  const building = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = setTimeout(() => building.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
    return () => clearTimeout(t);
  }, []);
  const rows = [...SUPER_MILESTONES.keys()].reverse();
  const head = ctx.earned.length - 1;

  return (
    <div className="relative min-h-full px-3 pb-8 pt-1 max-w-[480px] mx-auto" style={{ fontFamily: MONO }}>
      <div className="absolute inset-0 sh-rain pointer-events-none" style={{ ['--sh-line' as any]: `${primary}66` }} />
      <div className="relative rounded-2xl overflow-hidden border" style={{ background: 'rgba(3,10,6,0.88)', borderColor: `${primary}55`, boxShadow: `0 0 40px -12px ${primary}88` }}>
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-white/[0.04]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="ml-2 text-[10px] text-white/50">~/vida — zsh</span>
        </div>
        <div className="px-3 pt-3 pb-4 text-[12px] leading-[1.45]">
          <div><span style={{ color: secondary }}>$</span> <span className="text-white/90">npm run build -- --day={streak}</span></div>
          <div className="text-white/45 mb-2">› {ctx.earned.length}/8 checks passed · racha {streak}d</div>
          <div><span style={{ color: secondary }}>$</span> <span className="text-white/90">git log --graph --oneline</span></div>

          <div className="mt-2">
            {rows.map((i) => {
              const st = ctx.stateOf(i);
              const m = SUPER_MILESTONES[i];
              const prev = i === 0 ? 0 : SUPER_MILESTONES[i - 1];
              const pct = Math.max(0, Math.min(99, Math.round(((streak - prev) / (m - prev)) * 100)));
              const side = i % 2 === 1;
              const col = st === 'earned' ? primary : st === 'next' ? secondary : '#3f4a45';
              const sel = ctx.selected === i;
              return (
                <button key={i} ref={st === 'next' ? building : undefined} type="button" onClick={() => ctx.select(i)}
                  className="w-full flex items-stretch text-left active:opacity-80" style={{ background: sel ? `${primary}14` : 'transparent', borderRadius: 8 }}>
                  <svg width="44" height="84" viewBox="0 0 44 84" className="shrink-0">
                    <line x1="12" y1="0" x2="12" y2="84" stroke={col} strokeWidth="2" strokeOpacity={st === 'locked' ? 0.5 : 1} />
                    {side ? (
                      <>
                        <path d="M12 0C12 14 30 14 30 28V56C30 70 12 70 12 84" fill="none" stroke={col} strokeWidth="2" strokeOpacity={st === 'locked' ? 0.5 : 1} />
                        <circle cx="30" cy="42" r="6" fill={st === 'locked' ? '#0b130e' : col} stroke={col} strokeWidth="2" />
                      </>
                    ) : (
                      <circle cx="12" cy="42" r="6" fill={st === 'locked' ? '#0b130e' : col} stroke={col} strokeWidth="2" />
                    )}
                    {st === 'next' && <circle cx={side ? 30 : 12} cy="42" r="10" fill="none" stroke={secondary} className="w-anim w-pulse" style={{ ['--d' as any]: '1.6s' }} />}
                  </svg>
                  <div className="flex-1 min-w-0 py-2 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-300">{HASH[i]}</span>
                      {i === head && <span className="px-1 rounded text-[10px]" style={{ background: `${secondary}33`, color: secondary }}>HEAD → main</span>}
                      <span className="text-[10px] text-white/40">día {m}</span>
                    </div>
                    <div style={{ color: st === 'locked' ? 'rgba(255,255,255,0.4)' : '#fff' }} className="font-bold">feat: {theme.badges[i]}</div>
                    <div className="text-[11px] text-white/45 truncate">{st === 'locked' ? '// pendiente de merge' : `// ${theme.lines[i]}`}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: st === 'earned' ? '#4ade80' : st === 'next' ? secondary : 'rgba(255,255,255,0.35)' }}>
                      {st === 'earned' && '✔ build passed'}
                      {st === 'next' && (
                        <span className="flex items-center gap-2">⟳ building… {pct}%
                          <span className="flex-1 h-1.5 rounded bg-white/10 overflow-hidden max-w-[120px]"><span className="block h-full" style={{ width: `${pct}%`, background: secondary }} /></span>
                        </span>
                      )}
                      {st === 'locked' && '○ queued'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2"><span style={{ color: secondary }}>$</span> <span className="w-anim w-blink inline-block w-2 h-3.5 align-middle" style={{ background: secondary, ['--d' as any]: '1s' }} /></div>
        </div>
      </div>
    </div>
  );
};

export const PROGRAMACION: WorldDef = {
  bg: 'radial-gradient(110% 60% at 50% 0%, #053f1c 0%, #04140a 55%, #010603 100%)',
  headline: (c) => `build ${c.earned.length}/8 · racha ${c.streak}d`,
  Scene,
  sheet: false,
  scroll: true,
};
