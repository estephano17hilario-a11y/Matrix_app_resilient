import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useMountTransition } from '../../../hooks/useMountTransition';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Check, Download, Share2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { THEMES, ThemeId } from '../../../config/themes';
import {
  DEFAULT_SHARE_OPTIONS, QUOTE_MAX, SHARE_STYLES, renderShareCard, CARD_H, CARD_W,
  type ShareCopy, type ShareData, type ShareOptions, type ShareStyle,
} from './shareProgressRenderer';

interface ShareProgressSheetProps {
  open: boolean;
  onClose: () => void;
  data: ShareData;
  /** Theme ids the user owns (already includes the defaults). */
  ownedThemes: ThemeId[];
  /** Theme currently equipped in the app: the initial background. */
  currentTheme: ThemeId;
  /** Whether a HUD can be shown at all (needs a signed-in profile). */
  hudAvailable: boolean;
}

const OPTIONS_KEY = 'feed_share_options_v1';
const THEME_KEY = 'feed_share_theme_v1';

const COPY: Record<'es' | 'en', ShareCopy & Record<string, any>> = {
  es: {
    brand: 'Lux', title: 'Mi progreso de hoy',
    focus: 'Tiempo de foco', focusSub: 'enfocado hoy', tasks: 'Tareas', tasksSub: 'completadas',
    habits: 'Hábitos', accuracy: 'Acierto', score: 'Score hoy',
    projects: 'Proyectos', project: 'Proyecto', more: (n: number) => `+${n} más`,
    sheetTitle: 'Compartir progreso', sheetSub: 'Una sola imagen con lo que elijas mostrar',
    show: 'Mostrar', names: 'Nombres', background: 'Fondo', onlyYours: 'Solo tus temas',
    layout: 'Estilo', transparent: 'Fondo transparente',
    styleNames: { cards: 'Tarjetas', list: 'Lista', spotlight: 'Destacado' },
    phrase: 'Frase corta', phrasePh: 'Ej: Un paso más cada día', hud: 'HUD (rango, nivel y HP)',
    share: 'Compartir', save: 'Guardar', saved: 'Imagen guardada', failed: 'No se pudo compartir',
    focusT: 'Foco', tasksT: 'Tareas', habitsT: 'Hábitos', accuracyT: '% acierto', scoreT: 'Score', projectsT: 'Proyectos',
    shareText: 'Mi progreso de hoy en Lux',
  },
  en: {
    brand: 'Lux', title: "Today's progress",
    focus: 'Focus time', focusSub: 'focused today', tasks: 'Tasks', tasksSub: 'completed',
    habits: 'Habits', accuracy: 'Accuracy', score: "Today's score",
    projects: 'Projects', project: 'Project', more: (n: number) => `+${n} more`,
    sheetTitle: 'Share progress', sheetSub: 'One image with whatever you choose to show',
    show: 'Show', names: 'Names', background: 'Background', onlyYours: 'Only your themes',
    layout: 'Style', transparent: 'Transparent background',
    styleNames: { cards: 'Cards', list: 'List', spotlight: 'Spotlight' },
    phrase: 'Short phrase', phrasePh: 'E.g. One more step every day', hud: 'HUD (rank, level & HP)',
    share: 'Share', save: 'Save', saved: 'Image saved', failed: "Couldn't share",
    focusT: 'Focus', tasksT: 'Tasks', habitsT: 'Habits', accuracyT: '% accuracy', scoreT: 'Score', projectsT: 'Projects',
    shareText: "My progress today on Lux",
  },
};

const loadOptions = (): ShareOptions => {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // The phrase is per-share, never carried over silently.
      return { ...DEFAULT_SHARE_OPTIONS, ...parsed, quote: '' };
    }
  } catch { /* storage unavailable */ }
  return { ...DEFAULT_SHARE_OPTIONS };
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const Chip: React.FC<{ active: boolean; label: string; onClick: () => void; small?: boolean; disabled?: boolean }> = ({ active, label, onClick, small, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 rounded-xl border font-bold transition-all active:scale-95 ${
      small ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-[11px]'
    } ${
      active
        ? 'bg-white text-black border-white'
        : 'bg-white/[0.04] text-white/55 border-white/10 hover:bg-white/[0.08]'
    } ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
  >
    {active && <Check size={small ? 10 : 12} strokeWidth={3} />}
    {label}
  </button>
);

export const ShareProgressSheet: React.FC<ShareProgressSheetProps> = ({
  open, onClose, data, ownedThemes, currentTheme, hudAvailable,
}) => {
  const { i18n } = useTranslation();
  const lang: 'es' | 'en' = i18n.language?.startsWith('es') ? 'es' : 'en';
  const copy = COPY[lang];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [options, setOptions] = useState<ShareOptions>(loadOptions);
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeId | null;
      if (saved && THEMES[saved]) return saved;
    } catch { /* storage unavailable */ }
    return currentTheme;
  });
  const [busy, setBusy] = useState(false);
  const mounted = useMountTransition(open, 300);

  // A saved theme the user no longer owns falls back to the equipped one.
  const owned = useMemo(() => {
    const set = new Set<ThemeId>(ownedThemes.filter(id => THEMES[id]));
    set.add(currentTheme);
    return Array.from(set);
  }, [ownedThemes, currentTheme]);
  const activeThemeId = owned.includes(themeId) ? themeId : currentTheme;
  const theme = THEMES[activeThemeId] || THEMES[currentTheme];

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_KEY, JSON.stringify({ ...options, quote: '' }));
    } catch { /* storage unavailable */ }
  }, [options]);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, activeThemeId); } catch { /* storage unavailable */ }
  }, [activeThemeId]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [open]);

  const opts = useMemo<ShareOptions>(() => ({ ...options, hud: options.hud && hudAvailable }), [options, hudAvailable]);

  // Redraw whenever anything the card shows changes.
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled || !canvasRef.current) return;
      renderShareCard(canvasRef.current, data, opts, theme, copy);
    };
    draw();
    // Fonts may finish loading after first paint; redraw once so the preview matches the export.
    (document as any).fonts?.ready?.then(draw).catch(() => {});
    return () => { cancelled = true; };
  }, [open, data, opts, theme, copy]);

  const set = <K extends keyof ShareOptions>(key: K, value: ShareOptions[K]) =>
    setOptions(prev => ({ ...prev, [key]: value }));
  const toggle = (key: Exclude<keyof ShareOptions, 'quote' | 'style'>) => set(key, !options[key] as any);

  const fileName = `lux-progreso-${new Date().toISOString().slice(0, 10)}.png`;

  const getBlob = useCallback(async (): Promise<Blob> => {
    if (!canvasRef.current) throw new Error('canvas missing');
    renderShareCard(canvasRef.current, data, opts, theme, copy);
    return new Promise<Blob>((resolve, reject) => {
      canvasRef.current!.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
  }, [data, opts, theme, copy]);

  const download = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(copy.saved);
    } catch (e) {
      console.error('[ShareProgress] download failed', e);
      toast.error(copy.failed);
    } finally {
      setBusy(false);
    }
  }, [getBlob, fileName, copy]);

  const share = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await getBlob();
      if (Capacitor.isNativePlatform()) {
        const written = await Filesystem.writeFile({
          path: fileName,
          data: await blobToBase64(blob),
          directory: Directory.Cache,
        });
        await Share.share({ title: copy.title, text: copy.shareText, files: [written.uri], dialogTitle: copy.sheetTitle });
      } else {
        const file = new File([blob], fileName, { type: 'image/png' });
        const nav: any = navigator;
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: copy.title, text: copy.shareText });
        } else {
          await download();
        }
      }
    } catch (e: any) {
      // Dismissing the share sheet is not an error.
      const msg = String(e?.message || e || '');
      if (!/cancel|abort|dismiss/i.test(msg)) {
        console.error('[ShareProgress] share failed', e);
        toast.error(copy.failed);
      }
    } finally {
      setBusy(false);
    }
  }, [getBlob, fileName, copy, download]);

  const hasAnyBlock = opts.focus || opts.tasks || opts.habits || opts.accuracy || opts.score || opts.projects || opts.hud || options.quote.trim().length > 0;

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {(
        <motion.div
          className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: open ? 'auto' : 'none' }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md max-h-[94dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-[#0b0b10] border border-white/10 shadow-2xl overflow-hidden"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: open ? 0 : 60, opacity: open ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">{copy.sheetTitle}</h2>
                <p className="text-[11px] text-white/40 font-medium">{copy.sheetSub}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/60 active:scale-95"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-4 space-y-5">
              {/* Live preview — this is the exact canvas that gets exported */}
              <div
                className="mx-auto w-full max-w-[300px] rounded-2xl overflow-hidden border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                style={{
                  aspectRatio: `${CARD_W} / ${CARD_H}`,
                  ...(options.transparent ? {
                    backgroundColor: '#2a2a33',
                    backgroundImage: 'conic-gradient(#3a3a45 25%, #23232b 0 50%, #3a3a45 0 75%, #23232b 0)',
                    backgroundSize: '20px 20px',
                  } : null),
                }}
              >
                <canvas ref={canvasRef} width={CARD_W} height={CARD_H} className="w-full h-full block" />
              </div>

              {/* Grouping style */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-2">{copy.layout}</h3>
                <div className="flex flex-wrap gap-2">
                  {SHARE_STYLES.map((id: ShareStyle) => (
                    <Chip key={id} active={options.style === id} label={copy.styleNames[id]} onClick={() => set('style', id)} />
                  ))}
                </div>
              </section>

              {/* What to show */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-2">{copy.show}</h3>
                <div className="flex flex-wrap gap-2">
                  <Chip active={options.score} label={copy.scoreT} onClick={() => toggle('score')} />
                  <Chip active={options.focus} label={copy.focusT} onClick={() => toggle('focus')} />
                  <Chip active={options.tasks} label={copy.tasksT} onClick={() => toggle('tasks')} />
                  <Chip active={options.habits} label={copy.habitsT} onClick={() => toggle('habits')} />
                  <Chip active={options.accuracy} label={copy.accuracyT} onClick={() => toggle('accuracy')} />
                  <Chip active={options.projects} label={copy.projectsT} onClick={() => toggle('projects')} />
                  {hudAvailable && <Chip active={options.hud} label={copy.hud} onClick={() => toggle('hud')} />}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">{copy.names}</span>
                  <Chip small active={options.projectNames} disabled={!options.projects} label={copy.projectsT} onClick={() => toggle('projectNames')} />
                  <Chip small active={options.habitNames} disabled={!options.habits} label={copy.habitsT} onClick={() => toggle('habitNames')} />
                </div>
              </section>

              {/* Phrase */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/35">{copy.phrase}</h3>
                  <span className={`text-[10px] font-bold tabular-nums ${options.quote.length >= QUOTE_MAX ? 'text-amber-400' : 'text-white/30'}`}>
                    {options.quote.length}/{QUOTE_MAX}
                  </span>
                </div>
                <input
                  type="text"
                  value={options.quote}
                  maxLength={QUOTE_MAX}
                  onChange={e => set('quote', e.target.value.slice(0, QUOTE_MAX))}
                  placeholder={copy.phrasePh}
                  className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/30"
                />
              </section>

              {/* Background */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/35">{copy.background}</h3>
                  <span className="text-[10px] font-medium text-white/25">{copy.onlyYours}</span>
                </div>
                <div className="mb-3">
                  <Chip active={options.transparent} label={copy.transparent} onClick={() => toggle('transparent')} />
                </div>
                <div className={`flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 transition-opacity ${options.transparent ? 'opacity-30 pointer-events-none' : ''}`}>
                  {owned.map(id => {
                    const t = THEMES[id];
                    const selected = id === activeThemeId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setThemeId(id)}
                        className="shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <span
                          className={`block w-12 h-12 rounded-2xl border-2 transition-all ${selected ? 'border-white scale-105' : 'border-white/10'}`}
                          style={{ background: t.gradient }}
                        />
                        <span className={`text-[9px] font-bold max-w-[56px] truncate ${selected ? 'text-white' : 'text-white/40'}`}>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="flex gap-2.5 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] border-t border-white/[0.06] bg-[#0b0b10]">
              {!Capacitor.isNativePlatform() && (
                <button
                  type="button"
                  onClick={download}
                  disabled={busy || !hasAnyBlock}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] border border-white/10 py-3.5 text-sm font-black text-white active:scale-95 disabled:opacity-40"
                >
                  <Download size={16} /> {copy.save}
                </button>
              )}
              <button
                type="button"
                onClick={share}
                disabled={busy || !hasAnyBlock}
                className="flex-[1.6] flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-black text-black active:scale-95 disabled:opacity-40"
              >
                <Share2 size={16} /> {copy.share}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>,
    document.body,
  );
};
