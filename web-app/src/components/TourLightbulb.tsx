import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { monitor, type SectionId } from '@/modules/monitor/monitorStore';

interface TourLightbulbProps {
  tourId: string;
  className?: string;
  size?: number;
}

const SECTIONS: SectionId[] = ['tasks', 'habits', 'focus', 'notes', 'routine', 'store'];
const seenKey = (section: SectionId) => `lux_bulb_seen_${section}`;
const wasSeen = (section: SectionId) => {
  try { return localStorage.getItem(seenKey(section)) === '1'; } catch { return true; }
};

const BULB_CSS = `
@keyframes bulb-flicker {
  0%, 18%, 22%, 25%, 53%, 57%, 100% { opacity: 1; filter: drop-shadow(0 0 6px rgba(253,224,71,0.95)); }
  20%, 24%, 55% { opacity: 0.25; filter: none; }
}
@keyframes bulb-halo { 0% { transform: scale(0.7); opacity: 0.85 } 100% { transform: scale(2.1); opacity: 0 } }
@keyframes bulb-core { 0%,100% { opacity: 0.35; transform: scale(0.9) } 50% { opacity: 0.9; transform: scale(1.12) } }
.bulb-flicker { animation: bulb-flicker 1.6s linear infinite; }
.bulb-halo { animation: bulb-halo 1.15s ease-out infinite; }
.bulb-core { animation: bulb-core 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .bulb-flicker, .bulb-halo, .bulb-core { animation: none; } }
`;

/**
 * The "foco" (lightbulb) of each section: opens El Monitor for that section.
 * Until it is tapped for the first time in that section it flickers and glows; after that it is calm.
 */
export const TourLightbulb: React.FC<TourLightbulbProps> = ({ tourId, className = '', size = 14 }) => {
  const { i18n } = useTranslation();
  const section = (SECTIONS.includes(tourId as SectionId) ? tourId : 'tasks') as SectionId;
  const es = !(i18n.language || 'es').startsWith('en');
  const [seen, setSeen] = useState(() => wasSeen(section));

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!seen) {
      try { localStorage.setItem(seenKey(section), '1'); } catch { /* ignore */ }
      setSeen(true);
    }
    monitor.openSection(section);
  };

  return (
    <button
      type="button"
      data-tour="monitor-bulb"
      onClick={open}
      className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-colors ${seen ? 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-300/80' : 'bg-amber-400/20 text-amber-200'} ${className}`}
      title={es ? 'El Monitor: guía de esta zona' : 'El Monitor: guide for this zone'}
      aria-label={es ? 'Abrir El Monitor' : 'Open El Monitor'}
    >
      {!seen && (
        <>
          <style>{BULB_CSS}</style>
          <span aria-hidden className="bulb-halo absolute inset-0 rounded-full border-2 border-amber-300/80" style={{ pointerEvents: 'none' }} />
          <span aria-hidden className="bulb-halo absolute inset-0 rounded-full border border-amber-200/60" style={{ pointerEvents: 'none', animationDelay: '0.55s' }} />
          <span aria-hidden className="bulb-core absolute inset-[3px] rounded-full bg-amber-300/40" style={{ pointerEvents: 'none' }} />
        </>
      )}
      <Lightbulb size={size} className={`relative ${seen ? '' : 'bulb-flicker'}`} fill={seen ? 'none' : 'currentColor'} fillOpacity={seen ? 0 : 0.35} />
    </button>
  );
};
