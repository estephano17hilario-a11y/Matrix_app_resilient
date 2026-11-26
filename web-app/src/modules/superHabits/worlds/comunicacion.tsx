import React, { useEffect, useRef } from 'react';
import { SUPER_MILESTONES } from '../engine';
import { BadgeEmblem } from '../BadgeEmblem';
import type { WorldDef, WorldCtx } from './types';

// COMUNICACIÓN — your roadmap is a conversation. Earned milestones are delivered
// messages (read ✓✓), the next one is being typed, the rest are still silent.

const Scene: React.FC<WorldCtx> = (ctx) => {
  const { theme, streak } = ctx;
  const { primary, secondary, deep } = theme.colors;
  const Icon = theme.icon;
  const nextRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-full px-4 pb-8 pt-1 max-w-[460px] mx-auto">
      {[8, 30, 56, 82].map((l, i) => (
        <span key={l} className="absolute rounded-full w-anim w-float pointer-events-none"
          style={{ left: `${l}%`, top: `${12 + i * 24}%`, width: 36 + i * 14, height: 36 + i * 14, background: `radial-gradient(circle at 30% 30%, ${secondary}33, transparent 70%)`, ['--d' as any]: `${6 + i}s`, ['--dl' as any]: `${i}s` }} />
      ))}

      <div className="relative flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <Icon size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-black leading-tight">Tu voz</div>
          <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> en línea · {ctx.earned.length}/8 mensajes entregados</div>
        </div>
        <div className="flex items-end gap-[3px] h-6" aria-hidden>
          {[0, 0.25, 0.5, 0.1, 0.4].map((d, i) => <span key={i} className="w-[3px] h-full rounded-full w-anim w-eq" style={{ background: secondary, ['--d' as any]: '1s', ['--dl' as any]: `${d}s` }} />)}
        </div>
      </div>

      <div className="relative flex flex-col gap-3">
        {SUPER_MILESTONES.map((m, i) => {
          const st = ctx.stateOf(i);
          const mine = i % 2 === 1;
          const sel = ctx.selected === i;
          return (
            <div key={m} ref={st === 'next' ? nextRef : undefined} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <button
                type="button"
                onClick={() => ctx.select(i)}
                className="text-left max-w-[84%] rounded-[20px] px-3 py-2.5 border active:scale-[0.98] transition-transform"
                style={{
                  borderTopLeftRadius: mine ? 20 : 6, borderTopRightRadius: mine ? 6 : 20,
                  background: st === 'earned'
                    ? (mine ? `linear-gradient(135deg, ${primary}, ${secondary})` : 'rgba(255,255,255,0.1)')
                    : 'rgba(255,255,255,0.04)',
                  borderColor: sel ? secondary : st === 'earned' ? `${primary}66` : 'rgba(255,255,255,0.08)',
                  boxShadow: sel ? `0 0 0 1px ${secondary}` : 'none',
                  color: st === 'earned' && mine ? deep : '#fff',
                }}
              >
                {st === 'locked' ? (
                  <div className="flex items-center gap-2 opacity-60">
                    <BadgeEmblem level={i} icon={Icon} size={30} state="locked" animate={false} />
                    <div>
                      <div className="text-[10px] font-black tracking-widest uppercase">Día {m}</div>
                      <div className="text-[13px] font-bold">Mensaje sin enviar…</div>
                    </div>
                  </div>
                ) : st === 'next' ? (
                  <div className="flex items-center gap-3">
                    <BadgeEmblem level={i} icon={Icon} size={38} state="next" accent={primary} animate={false} />
                    <div>
                      <div className="text-[10px] font-black tracking-widest uppercase" style={{ color: secondary }}>Día {m} · faltan {m - streak}</div>
                      <div className="flex items-center gap-1 mt-1.5" aria-label="escribiendo">
                        {[0, 0.2, 0.4].map(d => <span key={d} className="w-2 h-2 rounded-full bg-white w-anim w-twinkle" style={{ ['--d' as any]: '1.1s', ['--dl' as any]: `${d}s` }} />)}
                        <span className="ml-1 text-[11px] font-bold text-white/70">escribiendo…</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <BadgeEmblem level={i} icon={Icon} size={40} state="earned" accent={mine ? deep : primary} animate={false} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-black tracking-widest uppercase" style={{ opacity: 0.75 }}>Día {m}</div>
                      <div className="text-[15px] font-black leading-tight">{theme.badges[i]}</div>
                      <div className="text-[12px] leading-snug font-medium" style={{ opacity: 0.85 }}>{theme.lines[i]}</div>
                      <div className="text-right text-[10px] font-black mt-1" style={{ color: mine ? deep : '#7dd3fc', opacity: 0.9 }}>✓✓ leído</div>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const COMUNICACION: WorldDef = {
  bg: 'radial-gradient(110% 60% at 70% 0%, #3b0b4a 0%, #170a2b 55%, #08040f 100%)',
  headline: (c) => `${c.earned.length}/8 mensajes entregados`,
  Scene,
  sheet: false,
  scroll: true,
};
