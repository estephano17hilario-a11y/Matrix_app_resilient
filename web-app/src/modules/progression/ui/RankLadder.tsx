import React, { memo, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Crown, Lock, MapPin, Mountain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROGRESSION_CONFIG } from '../engine/config';
import { LEGEND_INDEX, divisionLabel, divisionStart } from '../engine/ranks';
import type { Standing } from '../engine/ranks';
import { RankBadge } from './RankBadge';
import { MOTION, rankStyle } from './tokens';

const { RANKS, DIVISIONS_PER_RANK } = PROGRESSION_CONFIG;
const LEGEND_ENTRY = RANKS[LEGEND_INDEX].entry;

/**
 * The climb: every rank from Legend (top) down to Bronze, each with its three
 * sub-ranks, entry ELO and where the user stands. Scrolls to the current rank.
 */
export const RankLadderFull: React.FC<{ standing: Standing; elo: number }> = memo(({ standing, elo }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const currentRef = useRef<HTMLLIElement>(null);
  const order = RANKS.map((_, i) => i).reverse();
  const climb = Math.min(1, elo / LEGEND_ENTRY);

  useEffect(() => {
    const timer = setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }), 260);
    return () => clearTimeout(timer);
  }, [reduce]);

  return (
    <div className="space-y-4">
      {/* Summit progress */}
      <section className="arena-card arena-card--glow p-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: 'rgb(var(--rank) / 0.16)', color: 'rgb(var(--rank))' }}><Mountain size={22} /></span>
          <div className="flex-1 min-w-0">
            <p className="arena-kicker">{t('progression.ladderView.kicker', 'Camino a Leyenda')}</p>
            <p className="text-[16px] font-black leading-tight">{t('progression.ladderView.title', 'La ruta de los rangos')}</p>
          </div>
          <div className="text-right">
            <p className="text-[20px] font-black tabular-nums leading-none arena-grad-text">{Math.round(climb * 100)}%</p>
            <p className="text-[10.5px] prog-text-3">{t('progression.ladderView.climbed', 'escalado')}</p>
          </div>
        </div>
        <div className="mt-3 relative h-2.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.08)' }}>
          <motion.div className="absolute inset-0 rounded-full origin-left" style={{ background: 'linear-gradient(90deg, #C98A5B, #B8C4D0, #F2C14E, #4FD1C5, #6EA8FE, #C084FC, #F87171, #FDE68A)' }}
            initial={{ scaleX: reduce ? climb : 0 }} animate={{ scaleX: climb }} transition={{ duration: reduce ? 0 : 1, ease: MOTION.easeOut }} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed prog-text-3">
          {t('progression.ladderView.hint', 'Cada rango tiene 3 subrangos. Las insignias evolucionan: I escudo, II aletas, III alas y corona.')}
        </p>
      </section>

      <ol className="relative">
        {order.map((r, idx) => {
          const rank = RANKS[r];
          const isLegend = r === LEGEND_INDEX;
          const isCurrent = standing.rankIndex === r;
          const conquered = standing.rankIndex > r;
          const locked = standing.rankIndex < r;
          const missing = Math.max(0, rank.entry - elo);
          const last = idx === order.length - 1;
          return (
            <motion.li
              key={rank.id}
              ref={isCurrent ? currentRef : undefined}
              className="relative flex gap-3 pb-4"
              style={rankStyle(r)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: MOTION.short, delay: reduce ? 0 : idx * 0.05, ease: MOTION.easeOut }}
            >
              {/* Spine */}
              <div className="relative w-7 shrink-0 flex flex-col items-center">
                <span
                  className="relative z-[1] mt-5 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: locked ? 'rgb(var(--p-surface-2))' : 'linear-gradient(140deg, var(--rank-from), var(--rank-to))',
                    color: locked ? 'rgb(var(--p-text-3))' : '#0b0b10',
                    boxShadow: isCurrent ? '0 0 0 5px rgb(var(--rank) / 0.22), 0 0 22px rgb(var(--rank) / 0.7)' : '0 0 0 3px rgb(var(--p-bg))',
                  }}
                >
                  {isCurrent ? <MapPin size={14} /> : conquered ? <Check size={14} strokeWidth={3} /> : <Lock size={12} />}
                </span>
                {!last && (
                  <span className="absolute top-12 bottom-[-20px] w-[3px] rounded-full" style={{ background: conquered || isCurrent ? 'linear-gradient(to bottom, rgb(var(--rank) / 0.25), rgb(var(--rank)))' : 'rgb(var(--p-line) / 0.08)' }} />
                )}
              </div>

              {/* Chapter */}
              <div
                className={`flex-1 min-w-0 arena-card ${isCurrent ? 'arena-card--glow' : ''} overflow-hidden`}
                style={{ opacity: locked ? 0.82 : 1 }}
              >
                <div className="relative px-4 pt-3 pb-2.5" style={{ background: `linear-gradient(100deg, rgb(var(--rank) / ${locked ? 0.06 : 0.2}), transparent 75%)` }}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-[18px] font-black leading-tight ${isLegend ? 'arena-rainbow-text' : ''}`} style={isLegend ? undefined : { color: 'rgb(var(--rank))' }}>{rank.name}</h3>
                    <StatusChip current={isCurrent} conquered={conquered} missing={missing} />
                  </div>
                  <p className="text-[11.5px] prog-text-3 tabular-nums">
                    {isLegend ? `${rank.entry}+ ELO` : `${rank.entry} – ${rank.entry + (rank.cost ?? 0) - 1} ELO`}
                  </p>
                </div>

                {isLegend ? (
                  <div className="flex flex-col items-center gap-3 px-4 pb-4 pt-1 text-center">
                    <div className="relative shrink-0" style={{ filter: locked ? 'grayscale(0.5)' : undefined }}>
                      {!locked && <div className="arena-halo" style={{ inset: -14 }} />}
                      <RankBadge rankIndex={r} division={null} size={104} animate={!reduce} />
                    </div>
                    <p className="text-[12.5px] leading-relaxed prog-text-2 max-w-[260px]">
                      <Crown size={13} className="inline -mt-0.5 mr-1" style={{ color: '#FDE68A' }} />
                      {t('progression.ladderView.legend', 'Un único rango sin subrangos. Se muestra tu puesto entre todas las Leyendas.')}
                    </p>
                  </div>
                ) : (
                  <ul className="grid grid-cols-3 gap-1.5 px-2.5 pb-3 pt-1">
                    {Array.from({ length: DIVISIONS_PER_RANK }, (_, d) => {
                      const start = divisionStart(r, d);
                      const end = divisionStart(r, d + 1);
                      const isHere = isCurrent && standing.division === d;
                      const passed = conquered || (isCurrent && (standing.division ?? 0) > d);
                      const off = !passed && !isHere;
                      const p = isHere ? Math.max(0, Math.min(1, (elo - start) / Math.max(1, end - start))) : passed ? 1 : 0;
                      return (
                        <li
                          key={d}
                          className="relative flex flex-col items-center text-center rounded-[16px] pt-2 pb-2 px-1"
                          style={{ background: isHere ? 'rgb(var(--rank) / 0.16)' : 'rgb(var(--p-line) / 0.035)', boxShadow: isHere ? 'inset 0 0 0 1.5px rgb(var(--rank) / 0.6)' : undefined }}
                        >
                          <div className="flex items-center justify-center" style={{ height: 58, opacity: off ? 0.42 : 1, filter: off ? 'grayscale(0.65)' : undefined }}>
                            <RankBadge rankIndex={r} division={d} size={d === 0 ? 54 : 44} title={divisionLabel(r, d)} animate={isHere && !reduce} />
                          </div>
                          <span className="mt-1 text-[12px] font-black leading-tight">{['I', 'II', 'III'][d]}</span>
                          <span className="text-[10.5px] prog-text-3 tabular-nums">{start} ELO</span>
                          <div className="mt-1.5 w-[70%] h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.08)' }}>
                            <div className="h-full rounded-full origin-left" style={{ transform: `scaleX(${p})`, background: 'linear-gradient(90deg, var(--rank-from), var(--rank-to))' }} />
                          </div>
                          {isHere && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-[1px] text-[9.5px] font-black uppercase tracking-[0.08em]" style={{ background: 'rgb(var(--rank))', color: '#0b0b10' }}>
                              {t('progression.ladderView.here', 'Estás aquí')}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>

      <p className="text-center text-[12px] prog-text-3 tabular-nums">{t('progression.ladderView.yours', 'Tu ELO')}: <b style={{ color: 'rgb(var(--rank))' }}>{elo}</b></p>
    </div>
  );
});
RankLadderFull.displayName = 'RankLadderFull';

const StatusChip: React.FC<{ current: boolean; conquered: boolean; missing: number }> = ({ current, conquered, missing }) => {
  const { t } = useTranslation();
  if (current) return <span className="arena-chip shrink-0" style={{ background: 'rgb(var(--rank) / 0.2)', color: 'rgb(var(--rank))' }}><MapPin size={11} /> {t('progression.ladderView.current', 'Rango actual')}</span>;
  if (conquered) return <span className="arena-chip shrink-0" style={{ background: 'rgb(var(--p-positive) / 0.14)', color: 'rgb(var(--p-positive))' }}><Check size={11} strokeWidth={3} /> {t('progression.ladderView.conquered', 'Conquistado')}</span>;
  return <span className="arena-chip shrink-0"><Lock size={11} /> {t('progression.ladderView.missing', 'Faltan {{n}} ELO', { n: missing })}</span>;
};
