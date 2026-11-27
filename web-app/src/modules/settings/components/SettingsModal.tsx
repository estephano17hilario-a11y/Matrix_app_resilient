import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Search, Crown, SearchX, Sparkles, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useLux } from '@/context/LuxContext';
import { getAvatarConfig, getAvatarPath } from '../../../config/avatars';
import { openDeluxe } from '../../monetization/deluxe';
import { formatHours, formatMoney, loadSavedValue, VALUE_EVENT, type SavedValue } from '../../monetization/valueCalc';
import { THEMES } from '../../../config/themes';
import { GROUPS, PAGES, getPage, searchPages, type SettingsPage } from '../registry';

import { VisualsSection } from '../sections/VisualsSection';
import { SystemSection } from '../sections/SystemSection';
import { AccountSection } from '../sections/AccountSection';
import { NeuralSection } from '../sections/NeuralSection';

type Lang = 'es' | 'en';

const PageIcon = ({ page, size = 36 }: { page: SettingsPage; size?: number }) => {
  const Icon = page.icon;
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-[11px] border"
      style={{ width: size, height: size, background: `${page.tint}1f`, borderColor: `${page.tint}38`, color: page.tint }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  );
};

const Row = ({ page, lang, value, onOpen }: { page: SettingsPage; lang: Lang; value?: string; onOpen: (id: string) => void }) => (
  <button
    type="button"
    onClick={() => onOpen(page.id)}
    className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-white/[0.07] transition-colors"
  >
    <PageIcon page={page} />
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-semibold text-white leading-tight truncate">{page[lang].title}</span>
      <span className="block text-[11.5px] text-white/40 leading-snug mt-0.5 truncate">{page[lang].desc}</span>
    </span>
    {value && <span className="shrink-0 max-w-[88px] truncate text-[11px] font-semibold text-white/45">{value}</span>}
    <ChevronRight size={15} className="shrink-0 text-white/25" />
  </button>
);

export const SettingsModal = () => {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('es') ? 'es' : 'en';
  const { closeSettings, page, openPage, goHome, currentTheme, attributes, isPro } = useSettings();
  const { profile } = useAuth();
  const { user: lux } = useLux();
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const current = getPage(page);

  // Android "back" inside a page returns to the home list before closing.
  useEffect(() => {
    const onBack = (e: Event) => {
      if (page) {
        e.preventDefault();
        goHome();
      }
    };
    window.addEventListener('settings-back', onBack);
    return () => window.removeEventListener('settings-back', onBack);
  }, [page, goHome]);

  // Each page starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  const results = useMemo(() => (query.trim() ? searchPages(query, lang) : null), [query, lang]);

  const valueOf = (id: string): string | undefined => {
    if (id === 'themes') return (THEMES as any)[currentTheme as string]?.name;
    if (id === 'language') return lang === 'es' ? 'Español' : 'English';
    if (id === 'traits') return `${attributes.length}/${isPro ? '∞' : 5}`;
    return undefined;
  };

  const open = (id: string) => {
    setQuery('');
    openPage(id);
  };

  const avatarId = profile?.avatarId || (lux as any)?.avatarId;
  const avatarPath = avatarId ? getAvatarPath(avatarId) : undefined;
  const accent = getAvatarConfig(avatarId)?.themeColor || '#818cf8';
  const [value, setValue] = useState<SavedValue | null>(loadSavedValue);
  useEffect(() => {
    const on = () => setValue(loadSavedValue());
    window.addEventListener(VALUE_EVENT, on);
    return () => window.removeEventListener(VALUE_EVENT, on);
  }, []);
  const gain = value?.result
    ? (value.result.moneyPerMonth != null
      ? `${formatMoney(value.result.moneyPerMonth, value.answers.currency, lang)}/${lang === 'es' ? 'mes' : 'mo'}`
      : `${formatHours(value.result.hoursPerMonth)}/${lang === 'es' ? 'mes' : 'mo'}`)
    : null;
  const displayName = profile?.displayName || (lux as any)?.displayName || (profile?.email ? profile.email.split('@')[0] : (lang === 'es' ? 'Operativo' : 'Operative'));

  const renderPage = () => {
    switch (current?.section) {
      case 'visuals': return <VisualsSection />;
      case 'system': return <SystemSection />;
      case 'account': return <AccountSection />;
      case 'neural': return <NeuralSection />;
      default: return null;
    }
  };

  const renderHome = () => {
    if (results) {
      if (!results.length) {
        return (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <SearchX size={30} className="text-white/20 mb-3" />
            <div className="text-sm font-bold text-white/70">
              {lang === 'es' ? 'Sin resultados' : 'No results'}
            </div>
            <div className="text-xs text-white/35 mt-1">
              {lang === 'es' ? `No encontramos ajustes para «${query.trim()}»` : `No settings match “${query.trim()}”`}
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
          {results.map(p => (
            <Row key={p.id} page={p} lang={lang} value={valueOf(p.id)} onOpen={open} />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => open('profile')}
          className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left active:scale-[0.99] transition-transform"
          style={{ background: `linear-gradient(135deg, ${accent}26, rgba(255,255,255,0.02) 60%)`, borderColor: `${accent}40` }}
        >
          <span className="w-12 h-12 rounded-2xl overflow-hidden bg-black/40 shrink-0 flex items-center justify-center" style={{ boxShadow: `0 0 0 2px ${accent}, 0 0 18px -2px ${accent}99` }}>
            {avatarPath ? <img src={avatarPath} alt="" className="w-full h-full object-cover object-[50%_20%]" /> : <UserIcon size={22} className="text-white/25" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold text-white truncate">{displayName}</span>
              {isPro && <Crown size={13} className="text-amber-400 shrink-0" />}
            </span>
            <span className="block text-[11.5px] text-white/40 truncate mt-0.5">{profile?.email || ''}</span>
          </span>
          <ChevronRight size={15} className="shrink-0 text-white/25" />
        </button>

        {!isPro && (
          <motion.button
            type="button"
            onClick={openDeluxe}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            className="relative -mt-2 w-full overflow-hidden rounded-2xl p-[1.5px] text-left"
            style={{ background: 'linear-gradient(110deg, #f59e0b, #ec4899 50%, #8b5cf6)' }}
          >
            <span className="relative flex items-center gap-3 rounded-[15px] bg-[#130b1c] px-3.5 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]">
                <Crown size={20} className="text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-black text-white">{lang === 'es' ? 'Hazte Deluxe' : 'Go Deluxe'}</span>
                <span className="block truncate text-[11.5px] font-semibold text-white/55">
                  {gain
                    ? (lang === 'es' ? `Recupera ${gain} · oferta hasta el 31 dic` : `Recover ${gain} · offer until Dec 31`)
                    : (lang === 'es' ? 'Descubre cuánto vale tu tiempo · oferta hasta el 31 dic' : 'Find out what your time is worth · until Dec 31')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-1.5 text-[11.5px] font-black text-black">
                <Sparkles size={13} /> {lang === 'es' ? 'Ver' : 'See'}
              </span>
              <motion.span aria-hidden className="absolute inset-y-0 w-1/4" style={{ background: 'linear-gradient(100deg,transparent,rgba(255,255,255,0.12),transparent)', pointerEvents: 'none' }}
                initial={{ x: '-150%' }} animate={{ x: '500%' }} transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }} />
            </span>
          </motion.button>
        )}

        {GROUPS.map(group => {
          const pages = PAGES.filter(p => p.group === group.id && p.id !== 'profile');
          if (!pages.length) return null;
          return (
            <section key={group.id}>
              <h3 className="px-1 mb-1.5 text-[10.5px] font-black uppercase tracking-[0.16em] text-white/35">{group[lang]}</h3>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
                {pages.map(p => (
                  <Row key={p.id} page={p} lang={lang} value={valueOf(p.id)} onOpen={open} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, pointerEvents: 'auto' }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6"
    >
      <div
        className="absolute inset-0 bg-black/80"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeSettings();
        }}
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 14 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-2xl h-[88vh] sm:h-[80vh] flex flex-col overflow-hidden rounded-[26px]"
        style={{
          border: '1.5px solid transparent',
          background: `linear-gradient(160deg, #141414, #060606) padding-box, linear-gradient(150deg, ${accent} 0%, ${accent}66 22%, rgba(255,255,255,0.07) 48%, rgba(255,255,255,0.05) 70%, ${accent}aa 100%) border-box`,
          boxShadow: `0 24px 70px -18px rgba(0,0,0,0.9), 0 0 50px -18px ${accent}99`,
        }}
      >
        {/* Soft accent light in the top corner */}
        <span aria-hidden className="absolute -top-24 -left-16 h-56 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${accent}2e, transparent 70%)`, pointerEvents: 'none' }} />
        {/* Header */}
        <div className="relative shrink-0 px-4 pt-4 pb-3 border-b" style={{ borderColor: `${accent}22` }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {current ? (
              <button
                type="button"
                onClick={goHome}
                className="justify-self-start h-9 pl-1.5 pr-3 -ml-1 rounded-full flex items-center gap-0.5 text-[13px] font-semibold text-white/70 hover:text-white active:bg-white/[0.08] transition-colors"
              >
                <ChevronLeft size={18} />
                {lang === 'es' ? 'Ajustes' : 'Settings'}
              </button>
            ) : (
              <h2 className="col-span-2 text-[22px] font-black text-white tracking-tight pl-1">
                {lang === 'es' ? 'Configuración' : 'Settings'}
              </h2>
            )}
            {current && (
              <div className="min-w-0 max-w-[56vw] flex items-center justify-center gap-2">
                <span className="text-[15px] font-bold text-white truncate">{current[lang].title}</span>
              </div>
            )}
            <button
              type="button"
              onClick={closeSettings}
              aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
              className="justify-self-end w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white bg-white/[0.04] border border-white/[0.06] active:scale-95 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {!current && (
            <div className="relative mt-3">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results?.length) open(results[0].id);
                  if (e.key === 'Escape' && query) { e.stopPropagation(); setQuery(''); }
                }}
                placeholder={lang === 'es' ? 'Buscar ajustes…' : 'Search settings…'}
                enterKeyHint="search"
                autoComplete="off"
                className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] pl-10 pr-9 text-[13.5px] text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={lang === 'es' ? 'Borrar' : 'Clear'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center bg-white/10 text-white/60 active:scale-90"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black/20 overscroll-contain">
          <motion.div
            key={page ?? 'home'}
            initial={{ opacity: 0, x: page ? 14 : -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="p-4 sm:p-5 min-h-full"
          >
            {current ? renderPage() : renderHome()}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
