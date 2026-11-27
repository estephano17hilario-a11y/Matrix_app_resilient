import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Crown, Lock, MapPin, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROGRESSION_CONFIG } from '../engine/config';
import { LEGEND_INDEX, divisionStart } from '../engine/ranks';
import type { Standing } from '../engine/ranks';
import { RankBadge } from './RankBadge';
import { MOTION, rankStyle } from './tokens';
import { DIVISION_ART } from './rankTheme';

const { RANKS, DIVISIONS_PER_RANK } = PROGRESSION_CONFIG;
const ROMAN = ['I', 'II', 'III'];
const GAP = 12;

export interface LadderPreview { rank: number; division: number | null }

/**
 * Rank explorer. A coverflow of the 8 ranks (swipe, or tap the map above), and under it the three sub-ranks
 * of the one in the middle. Whatever you look at paints the whole screen (`onPreview` → theme), so the climb is
 * something you see, not a table you read. Starts on your own rank and sub-rank.
 */
export const RankLadderFull: React.FC<{ standing: Standing; elo: number; onPreview?: (p: LadderPreview | null) => void }> = memo(({ standing, elo, onPreview }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [sel, setSel] = useState(standing.rankIndex);
  const [div, setDiv] = useState<number>(standing.division ?? 0);
  const flowRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const selRef = useRef(sel);
  selRef.current = sel;
  const raf = useRef(0);

  const rank = RANKS[sel];
  const isLegend = sel === LEGEND_INDEX;
  const mine = standing.rankIndex;
  const reached = (r: number, d: number) => mine > r || (mine === r && (standing.division ?? DIVISIONS_PER_RANK - 1) >= d);

  // Theme follows what is on screen.
  useEffect(() => { onPreview?.({ rank: sel, division: isLegend ? null : div }); }, [sel, div, isLegend, onPreview]);
  useEffect(() => () => onPreview?.(null), [onPreview]);

  /** Scale / fade the slides by their distance to the centre, straight on the DOM (no React work per scroll frame). */
  const paint = useCallback(() => {
    const el = flowRef.current;
    if (!el) return;
    const centre = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    slideRefs.current.forEach((s, i) => {
      if (!s) return;
      const c = s.offsetLeft + s.offsetWidth / 2;
      const dist = Math.abs(c - centre);
      const k = Math.min(1, dist / (s.offsetWidth + GAP));
      s.style.transform = `scale(${1 - 0.17 * k})`;
      s.style.opacity = String(1 - 0.6 * k);
      if (dist < bestD) { bestD = dist; best = i; }
    });
    if (best !== selRef.current) { setSel(best); }
  }, []);

  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => { raf.current = 0; paint(); });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = flowRef.current;
    const s = slideRefs.current[i];
    if (!el || !s) return;
    el.scrollTo({ left: s.offsetLeft + s.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }, [reduce]);

  useLayoutEffect(() => { goTo(standing.rankIndex, false); paint(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const climb = isLegend && mine === LEGEND_INDEX ? 1
    : Math.min(1, (mine + (mine === LEGEND_INDEX ? 0 : (((standing.division ?? 0) + (standing.progress ?? 0)) / DIVISIONS_PER_RANK))) / (RANKS.length - 1));

  const selStart = isLegend ? rank.entry : divisionStart(sel, div);
  const selReached = isLegend ? mine === LEGEND_INDEX : reached(sel, div);
  const missing = Math.max(0, selStart - elo);
  const statusKind: 'current' | 'conquered' | 'locked' = sel === mine ? 'current' : sel < mine ? 'conquered' : 'locked';

  return (
    <div className="space-y-4">
      {/* Where you are, in one glance */}
      <div className="flex items-center gap-2 px-1">
        <span className="arena-chip" style={{ ...rankStyle(mine), background: 'rgb(var(--rank) / 0.16)', color: 'rgb(var(--rank))' }}><MapPin size={12} /> {standing.label}</span>
        <span className="arena-chip tabular-nums">{elo} ELO</span>
        {standing.eloToNext !== null && <span className="text-[12px] prog-text-3 truncate">{t('progression.vp.nextIn', '{{n}} para {{label}}', { n: standing.eloToNext, label: standing.nextLabel })}</span>}
      </div>

      {/* The map: eight stops from Bronze to Legend; tap one to fly there */}
      <section aria-label={t('progression.ladderView.title', 'La ruta de los rangos')} className="px-1">
        <div className="vp-minimap">
          <div className="vp-minimap__line" style={{ left: 19, right: 19 }} />
          <motion.div className="vp-minimap__fill" style={{ left: 19, right: 19, width: 'auto', transformOrigin: 'left center' }}
            initial={{ scaleX: reduce ? climb : 0 }} animate={{ scaleX: climb }} transition={{ duration: reduce ? 0 : 1, ease: MOTION.easeOut }} />
          {RANKS.map((r, i) => (
            <button key={r.id} type="button" onClick={() => goTo(i)} className="vp-node prog-tap" style={{ ...rankStyle(i), minWidth: 38, minHeight: 38 }}
              data-sel={i === sel} data-locked={i > mine} aria-label={r.name} aria-current={i === sel}>
              <RankBadge rankIndex={i} division={i === LEGEND_INDEX ? null : 0} size={22} />
              {i === mine && <span className="vp-node__me" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </section>

      {/* Coverflow */}
      <section className="-mx-4" aria-roledescription="carousel" aria-label={t('progression.vp.ranks', 'Rangos')}>
        <div ref={flowRef} onScroll={onScroll} className="vp-flow" style={{ ['--vp-slide' as string]: 'min(62vw, 240px)', position: 'relative' }}>
          <div className="vp-flow__pad" aria-hidden="true" />
          {RANKS.map((r, i) => {
            const locked = i > mine;
            const here = i === mine;
            const conquered = i < mine;
            const showDiv = i === LEGEND_INDEX ? null : div;
            return (
              <div key={r.id} ref={el => { slideRefs.current[i] = el; }} className={`vp-slide arena-card ${i === sel ? 'arena-card--glow' : ''}`} style={rankStyle(i)}
                role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${RANKS.length}: ${r.name}`}
                onClick={() => i !== sel && goTo(i)}>
                <div className="vp-slide__stage">
                  {!locked && <div className="vp-slide__halo" aria-hidden="true" />}
                  <div className="relative" style={{ filter: locked ? 'grayscale(0.6) brightness(0.8)' : undefined }}>
                    <RankBadge rankIndex={i} division={showDiv} size={showDiv === null ? 128 : 116} animate={i === sel && !reduce} />
                  </div>
                  {locked && <span className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--p-surface-2))', color: 'rgb(var(--p-text-2))' }}><Lock size={14} /></span>}
                </div>
                <h3 className={`mt-1 text-[24px] font-bold leading-none ${i === LEGEND_INDEX ? 'arena-rainbow-text' : ''}`} style={i === LEGEND_INDEX ? undefined : { color: 'rgb(var(--rank))' }}>{r.name}</h3>
                <p className="mt-1.5 text-[12.5px] prog-text-3 tabular-nums">{i === LEGEND_INDEX ? `${r.entry}+ ELO` : `${r.entry} – ${r.entry + (r.cost ?? 0) - 1} ELO`}</p>
                <div className="mt-3">
                  {here ? (
                    <span className="arena-chip" style={{ background: 'rgb(var(--rank) / 0.2)', color: 'rgb(var(--rank))' }}><MapPin size={11} /> {t('progression.vp.youAreHere', 'Tú estás aquí')}</span>
                  ) : conquered ? (
                    <span className="arena-chip" style={{ background: 'rgb(var(--p-positive) / 0.14)', color: 'rgb(var(--p-positive))' }}><Check size={11} strokeWidth={3} /> {t('progression.ladderView.conquered', 'Conquistado')}</span>
                  ) : (
                    <span className="arena-chip"><Lock size={11} /> {t('progression.ladderView.missing', 'Faltan {{n}} ELO', { n: Math.max(0, r.entry - elo) })}</span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="vp-flow__pad" aria-hidden="true" />
        </div>
      </section>

      {/* Sub-ranks of the rank in the middle */}
      <motion.section key={sel} className="arena-card p-4" style={rankStyle(sel)} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: MOTION.short, ease: MOTION.easeOut }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="arena-kicker">{isLegend ? t('progression.vp.top', 'La cima') : t('progression.vp.subranks', 'Subrangos')}</p>
            <h3 className="text-[20px] font-bold leading-tight">{isLegend ? rank.name : `${rank.name} ${ROMAN[div]}`}</h3>
          </div>
          <StatusPill kind={statusKind} />
        </div>

        {isLegend ? (
          <p className="mt-3 text-[13px] leading-relaxed prog-text-2">
            <Crown size={14} className="inline -mt-0.5 mr-1" style={{ color: '#FDE68A' }} />
            {t('progression.ladderView.legend', 'Un único rango sin subrangos. Se muestra tu puesto entre todas las Leyendas.')}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('progression.vp.subranks', 'Subrangos')}>
            {Array.from({ length: DIVISIONS_PER_RANK }, (_, d) => {
              const start = divisionStart(sel, d);
              const end = divisionStart(sel, d + 1);
              const isNow = mine === sel && standing.division === d;
              const got = reached(sel, d);
              const p = isNow ? (standing.progress ?? 0) : got ? 1 : 0;
              return (
                <button key={d} type="button" role="radio" aria-checked={div === d} data-sel={div === d} onClick={() => setDiv(d)} className="vp-div prog-tap">
                  <div className="flex items-center justify-center" style={{ height: 62, opacity: got || div === d ? 1 : 0.5, filter: got || div === d ? undefined : 'grayscale(0.6)' }}>
                    <RankBadge rankIndex={sel} division={d} size={d === 0 ? 52 : 42} animate={false} />
                  </div>
                  <span className="mt-1 text-[14px] font-bold leading-none">{ROMAN[d]}</span>
                  <span className="mt-1 text-[10.5px] prog-text-3 tabular-nums">{start}–{end - 1}</span>
                  <span className="mt-2 w-[72%] h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--p-line) / 0.1)' }}>
                    <span className="block h-full rounded-full origin-left" style={{ transform: `scaleX(${p})`, background: 'linear-gradient(90deg, var(--rank-from), var(--rank-to))' }} />
                  </span>
                  {isNow && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-[1px] text-[9.5px] font-bold uppercase tracking-[0.06em]" style={{ background: 'rgb(var(--rank))', color: '#0b0b10' }}>{t('progression.ladderView.here', 'Estás aquí')}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* What the selection means */}
        <div className="mt-3 flex items-center gap-3 rounded-[20px] px-3.5 py-3 arena-inset">
          <span className="w-9 h-9 shrink-0 rounded-[12px] flex items-center justify-center" style={{ background: 'rgb(var(--rank) / 0.16)', color: 'rgb(var(--rank))' }}>
            {selReached ? <Check size={17} strokeWidth={3} /> : <Sparkles size={17} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold leading-tight">
              {selReached
                ? t('progression.vp.reached', 'Ya lo alcanzaste')
                : t('progression.vp.missingFor', 'Te faltan {{n}} ELO', { n: missing })}
            </p>
            <p className="mt-0.5 text-[12px] prog-text-3">
              {isLegend
                ? t('progression.vp.legendInfo', 'Entras al llegar a {{n}} ELO.', { n: rank.entry })
                : t('progression.vp.artInfo', 'Insignia: {{art}} · desde {{n}} ELO', { art: t(`progression.vp.art.${div}`, DIVISION_ART[div]), n: selStart })}
            </p>
          </div>
        </div>
        <p className="mt-2.5 px-1 text-[11.5px] leading-relaxed prog-text-3">
          {t('progression.vp.frameHint', 'Al llegar a {{rank}} ganas su marco de perfil. La insignia evoluciona: I escudo, II aletas, III alas y corona.', { rank: rank.name })}
        </p>

        {sel !== mine && (
          <button type="button" onClick={() => { setDiv(standing.division ?? 0); goTo(mine); }} className="prog-tap mt-3 w-full h-11 rounded-[16px] arena-inset flex items-center justify-center gap-1.5 text-[13.5px] font-semibold" style={{ color: 'rgb(var(--rank))' }}>
            <MapPin size={15} /> {t('progression.vp.backToMine', 'Volver a mi rango')} <ChevronRight size={15} />
          </button>
        )}
      </motion.section>
    </div>
  );
});
RankLadderFull.displayName = 'RankLadderFull';

const StatusPill: React.FC<{ kind: 'current' | 'conquered' | 'locked' }> = ({ kind }) => {
  const { t } = useTranslation();
  if (kind === 'current') return <span className="arena-chip shrink-0" style={{ background: 'rgb(var(--rank) / 0.2)', color: 'rgb(var(--rank))' }}><MapPin size={11} /> {t('progression.ladderView.current', 'Rango actual')}</span>;
  if (kind === 'conquered') return <span className="arena-chip shrink-0" style={{ background: 'rgb(var(--p-positive) / 0.14)', color: 'rgb(var(--p-positive))' }}><Check size={11} strokeWidth={3} /> {t('progression.ladderView.conquered', 'Conquistado')}</span>;
  return <span className="arena-chip shrink-0"><Lock size={11} /> {t('progression.vp.locked', 'Por conquistar')}</span>;
};
