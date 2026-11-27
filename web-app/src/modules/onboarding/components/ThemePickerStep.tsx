import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Eye, Palette, X } from 'lucide-react';
import { THEMES, type ThemeConfig, type ThemeId } from '../../../config/themes';

/**
 * Themes offered for free during onboarding: the whole "Gradients" family
 * (flow + nature) plus Ether, Nebula and Dorado. No prices or classes are
 * shown here on purpose — the user just picks the one they like.
 */
const FEATURED: ThemeId[] = ['ether', 'nebula', 'dorado'];

export const ONBOARDING_THEME_IDS: ThemeId[] = [
  ...FEATURED,
  ...(Object.values(THEMES)
    .filter(t => (t.category === 'flow' || t.category === 'nature') && !FEATURED.includes(t.id))
    .map(t => t.id)),
];

export const DEFAULT_ONBOARDING_THEME: ThemeId = 'ether';

const rgb = (triplet: string, alpha = 1) => `rgb(${triplet.replace(/,/g, ' ')} / ${alpha})`;

interface ThemePickerStepProps {
  selected: ThemeId;
  onSelect: (id: ThemeId) => void;
}

export function ThemePickerStep({ selected, onSelect }: ThemePickerStepProps) {
  const [previewId, setPreviewId] = useState<ThemeId | null>(null);

  const previewTheme = previewId ? THEMES[previewId] : null;

  return (
    <>
      <div className="min-h-full w-full flex flex-col items-center justify-start max-w-4xl mx-auto px-4 py-20 pb-32">
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold mb-3 uppercase tracking-widest">
            <Palette size={14} /> Tema
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Elige tu tema</h1>
          <p className="text-white/60 text-sm font-medium">
            Es un regalo de bienvenida: escoge el que más te guste. Toca el ojo para previsualizarlo.
          </p>
        </div>

        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5">
          {ONBOARDING_THEME_IDS.map(id => {
            const theme = THEMES[id];
            const isSelected = selected === id;
            return (
              <div key={id} className="flex flex-col">
                <motion.div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); } }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative aspect-[16/11] rounded-[16px] overflow-hidden border cursor-pointer transition-all shadow-md ${
                    isSelected
                      ? 'border-white/60 ring-2 ring-white/25 shadow-[0_0_22px_rgba(255,255,255,0.18)]'
                      : 'border-white/10'
                  }`}
                >
                  <div className="absolute inset-0" style={{ background: theme.gradient }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  <button
                    type="button"
                    aria-label={`Previsualizar ${theme.name}`}
                    onClick={e => { e.stopPropagation(); setPreviewId(id); }}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center active:scale-90 transition-transform z-10"
                  >
                    <Eye size={14} className="text-white" />
                  </button>

                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-[0_2px_5px_rgba(0,0,0,0.5)] z-10"
                    >
                      <Check size={12} strokeWidth={4} className="text-black" />
                    </motion.div>
                  )}
                </motion.div>
                <span className={`mt-2 px-1 text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-white/70'}`}>
                  {theme.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {previewTheme && (
            <ThemePreviewOverlay
              key={previewTheme.id}
              theme={previewTheme}
              onClose={() => setPreviewId(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/** Background-only preview: just the theme's backdrop and an exit button. */
function ThemePreviewOverlay({ theme, onClose }: { theme: ThemeConfig; onClose: () => void }) {
  const { colors } = theme;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[100000] overflow-hidden"
      style={{ background: theme.bgStyle || rgb(colors.bgDepth) }}
      role="dialog"
      aria-label={`Vista previa del fondo ${theme.name}`}
    >
      {!theme.isSolid && (
        <>
          <div className="absolute -top-24 -left-24 w-[22rem] h-[22rem] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${rgb(colors.primaryGlow, 0.55)} 0%, transparent 70%)` }} />
          <div className="absolute -bottom-28 -right-24 w-[24rem] h-[24rem] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${rgb(colors.secondaryGlow, 0.5)} 0%, transparent 70%)` }} />
        </>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute left-1/2 -translate-x-1/2 bottom-10 flex items-center gap-2 px-6 py-3.5 rounded-full bg-black/70 border border-white/25 text-white text-xs font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-transform"
        style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      >
        <X size={16} /> Salir de la vista previa
      </button>
    </motion.div>
  );
}
