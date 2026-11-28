import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ChevronRight, Clock } from 'lucide-react';
import { LostStreak, openStreakRecovery, RestoreCategory } from './recovery';
import './streaks.css';

interface StreakLossBannerProps {
  losses: LostStreak[];
  category: RestoreCategory;
  /** The section that hosts the banner is the one on screen right now. */
  active: boolean;
}

/** The banner lives this long after the first time the user walks into the section; then the offer only stays in the store. */
export const LOSS_BANNER_HOURS = 12;
const WINDOW_MS = LOSS_BANNER_HOURS * 3600_000;
const FIRST_SEEN_KEY = 'lux-loss-banner-first';

const readFirstSeen = (): Record<string, number> => {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRST_SEEN_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
};

const writeFirstSeen = (map: Record<string, number>) => {
  try {
    const keys = Object.keys(map);
    // Keep the file small: only the newest entries matter.
    const trimmed = keys.length > 60 ? Object.fromEntries(keys.sort((a, b) => map[a] - map[b]).slice(-60).map(k => [k, map[k]])) : map;
    localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(trimmed));
  } catch { /* storage unavailable */ }
};

/**
 * A compact reminder inside a section (habits) about a lost streak. It never appears the moment the streak breaks:
 * it shows up when the user enters the section for the first time after the loss, stays for 12 hours from then
 * and goes away. The offer lives on in the store afterwards.
 */
export const StreakLossBanner = React.memo(({ losses, category, active }: StreakLossBannerProps) => {
  const mine = useMemo(() => losses.filter(l => l.category === category), [losses, category]);
  const [first, setFirst] = useState<Record<string, number>>(readFirstSeen);
  const [now, setNow] = useState(() => Date.now());

  // First visit to the section with this loss pending: start its 12 hours.
  useEffect(() => {
    if (!active || !mine.length) return;
    const stored = readFirstSeen();
    const stamp = Date.now();
    let changed = false;
    for (const l of mine) if (!stored[l.key]) { stored[l.key] = stamp; changed = true; }
    if (changed) { writeFirstSeen(stored); setFirst(stored); }
    setNow(stamp);
  }, [active, mine]);

  const live = useMemo(() => mine.filter(l => first[l.key] && now - first[l.key] < WINDOW_MS), [mine, first, now]);

  // Hide it by itself when its 12 hours are up.
  useEffect(() => {
    if (!live.length) return;
    const left = Math.min(...live.map(l => first[l.key] + WINDOW_MS - Date.now()));
    const id = window.setTimeout(() => setNow(Date.now()), Math.max(1000, Math.min(left + 500, 2 ** 31 - 1)));
    return () => window.clearTimeout(id);
  }, [live, first]);

  const head = live[0];
  const minDays = live.reduce((m, l) => Math.min(m, l.daysLeft), 9);
  return (
    <AnimatePresence>
      {head && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          onClick={() => openStreakRecovery({ category, targetId: live.length === 1 ? head.targetId : undefined })}
          className="sk-sheen mx-4 mt-2 mb-1 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-amber-400/25 px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(110deg, rgba(245,158,11,0.16), rgba(244,63,94,0.08) 55%, rgba(10,10,12,0.6))' }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/15">
            <RotateCcw size={16} className="text-amber-300" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-black text-white">
              {live.length === 1 ? `Perdiste la racha de “${head.title}” (${head.lost} días)` : `Perdiste ${live.length} rachas de hábitos`}
            </span>
            <span className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-200/70">
              <Clock size={10} /> {minDays <= 1 ? 'Último día para restaurar' : `Restaurable ${minDays} días más`} · desde {head.price.toLocaleString()} de oro
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-white/35" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});
