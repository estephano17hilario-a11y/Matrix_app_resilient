import React from 'react';
import { Crosshair, Plus, ChevronDown, Swords, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DockConfig, DockItemConfig, DOCK_ITEMS, DockItemId } from '@/components/ui/DockConfigModal';
import { LuxSheen } from '@/immersion/LuxSheen';
import { publishDockOpen } from '../dockState';
import { getHoldMs, getHoldTarget } from '@/utils/startupPrefs';

/** Height of each rounded cap of the dock skin (closed dock = two caps = 72px). */
const DOCK_CAP = 36;
const DOCK_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const RIM = '#06b6d4, #3b82f6, #8b5cf6, #ec4899, #06b6d4';
const DOCK_SKIN_CSS = `
.dock-skin { left: 0; right: 0; overflow: visible !important; will-change: transform; transition: transform 0.28s ${DOCK_EASE}; }
.dock-skin-bottom { bottom: 0; height: ${DOCK_CAP}px; border-radius: 0 0 34px 34px; }
.dock-skin-mid { bottom: ${DOCK_CAP}px; transform-origin: 50% 100%; border-radius: 0; }
.dock-skin-top { bottom: ${DOCK_CAP}px; height: ${DOCK_CAP}px; border-radius: 34px 34px 0 0; }
.dock-skin-fill { border-radius: inherit; }
[data-tour="dock"] .dock-skin .dock-skin-fill { border: 0 !important; }
[data-tour="dock"] .dock-skin-bottom { border-top-width: 0 !important; }
[data-tour="dock"] .dock-skin-top { border-bottom-width: 0 !important; }
[data-tour="dock"] .dock-skin-mid { border-top-width: 0 !important; border-bottom-width: 0 !important; }
.dock-skin-top::before, .dock-skin-top::after { padding-bottom: 0 !important; background: conic-gradient(from var(--angle) at 50% 100%, ${RIM}) !important; }
.dock-skin-bottom::before, .dock-skin-bottom::after { padding-top: 0 !important; background: conic-gradient(from var(--angle) at 50% 0%, ${RIM}) !important; }
.dock-skin-mid::before, .dock-skin-mid::after { padding-top: 0 !important; padding-bottom: 0 !important; background: conic-gradient(from var(--angle) at 50% 100%, ${RIM}) !important; }
@media (prefers-reduced-motion: reduce) { .dock-skin { transition: none; } }
`;

interface DockProps {
 currentView: string;
 onChangeView: (v: string) => void;
 onOpenModal: (m: string) => void;
 isHidden: boolean;
 dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA';
 taskViewMode: 'LIST' | 'STRATEGY';
 habitViewMode: 'PROTOCOLS' | 'VICES';
 noteViewMode: 'NOTES' | 'JOURNAL';
 dockConfig?: DockConfig;
 pointerEvents?: 'none' | 'auto';
}

export const Dock = React.memo(({ currentView, onChangeView, onOpenModal, isHidden, dashboardStyle = 'BORDER', taskViewMode, habitViewMode, noteViewMode, dockConfig, pointerEvents = 'auto' }: DockProps) => {
 const { t } = useTranslation();

 // The dock owns its open state. Opening/closing re-renders only the dock; the
 // interface recedes on the same frame through the `lux:dock` event
 // (useDepthRecede). The Dashboard is never re-rendered for it (see dockState.ts).
 const [isOpen, setLocalIsOpen] = React.useState(false);
 const openRef = React.useRef(false);
 const onToggle = React.useCallback((open: boolean) => {
   if (openRef.current === open) return;
   openRef.current = open;
   setLocalIsOpen(open);
   publishDockOpen(open);
 }, []);

 // Closed from outside: the back button, a modal opening, a navigation…
 React.useEffect(() => {
   const close = () => onToggle(false);
   window.addEventListener('lux:dock-close', close);
   return () => window.removeEventListener('lux:dock-close', close);
 }, [onToggle]);

 // The dock disappears (a modal, settings, a full-screen mode…): close the menu with it.
 React.useEffect(() => {
   if (isHidden || pointerEvents === 'none') onToggle(false);
 }, [isHidden, pointerEvents, onToggle]);

 // Close first: the section change commits synchronously and takes this
 // update with it, so a tap costs one render instead of two.
 // Ranks and Friends are full-screen overlays, not sections.
 const openOverlay = (v: string) => {
   if (v === 'RANKS') window.dispatchEvent(new CustomEvent('open-progression-screen', { detail: { tab: 'LADDER' } }));
   else if (v === 'FRIENDS') window.dispatchEvent(new CustomEvent('open-friends'));
   else if (v === 'RIVALS') onOpenModal('RIVALS');
   else return false;
   onToggle(false);
   return true;
 };

 const handleView = (v: string) => { if (openOverlay(v)) return; onToggle(false); onChangeView(v); };
 
  const handleSmartNav = (v: string) => {
    if (openOverlay(v)) return;
    if (v === 'SETTINGS') {
      onOpenModal('SETTINGS');
      onToggle(false);
      return;
    }
    onToggle(false);
    onChangeView(v);
  };

 const handleModal = (m: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onOpenModal(m);
    onToggle(false);
  };

 // The expanded menu is memoized (it doesn't change when "+" is tapped), so its
 // buttons reach the latest handlers through this ref instead of closing over a
 // stale render.
 const act = React.useRef({ handleView, handleModal });
 act.current = { handleView, handleModal };

 // Opens the "which sections show in the dock and the + menu" editor.
 const openDockConfig = () => {
   onToggle(false);
   window.dispatchEvent(new CustomEvent('open-dock-config'));
 };

 // Holding "+" runs the action chosen in Settings (default: that editor) after the
 // chosen time. The tap itself still toggles the menu as usual.
 const runHoldAction = () => {
   const target = getHoldTarget();
   if (target === 'DOCK_CONFIG') { openDockConfig(); return; }
   if (target === 'QUEST') { onToggle(false); onOpenModal('QUEST'); return; }
   // Already there: just close the menu (re-selecting the active section would flip its sub-mode).
   if (target === currentView) { onToggle(false); return; }
   handleSmartNav(target);
 };
 const longTimer = React.useRef<number | null>(null);
 const longFired = React.useRef(false);
 const clearLong = () => { if (longTimer.current !== null) { window.clearTimeout(longTimer.current); longTimer.current = null; } };
 React.useEffect(() => clearLong, []);
  // "+" toggles when the finger is LIFTED (a tap). Holding it never opens the menu: it only runs
 // the hold action. Keyboard / accessibility clicks (no pointer) still toggle through onClick.
 const pointerHandled = React.useRef(false);
 const plusProps = {
   onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
     longFired.current = false;
     pointerHandled.current = false;
     clearLong();
     if (e.isPrimary && e.button === 0) {
       longTimer.current = window.setTimeout(() => {
         longTimer.current = null;
         longFired.current = true;
         try { navigator.vibrate?.(40); } catch { /* no haptics */ }
         runHoldAction();
       }, getHoldMs());
     }
   },
   onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
     const wasTap = longTimer.current !== null && !longFired.current;
     clearLong();
     if (wasTap && e.isPrimary && e.button === 0) {
       pointerHandled.current = true;
       onToggle(!openRef.current);
     }
   },
   onPointerLeave: clearLong,
   onPointerCancel: clearLong,
   onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
   onClick: () => {
     // The click that follows a pointer tap or a long press was already handled.
     if (pointerHandled.current || longFired.current) { pointerHandled.current = false; longFired.current = false; return; }
     onToggle(!openRef.current);
   },
 };

 const configGear = (
   <button
     type="button"
     aria-label={t('dock.configureSections', 'Configurar secciones')}
     title={t('dock.configureSections', 'Configurar secciones')}
     onClick={(e) => { e.stopPropagation(); openDockConfig(); }}
     style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.2s ease 0.1s' }}
     className="absolute top-1.5 right-3 z-[40] w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white active:scale-90"
   >
     <Settings2 size={14} />
   </button>
 );

 const isLiquid = dashboardStyle === 'LIQUID';
 const isGlass = dashboardStyle === 'GLASS';
 const isAura = dashboardStyle === 'AURA';
 const taskIndicator = taskViewMode === 'LIST' ? '1/2' : '2/2';
 const habitIndicator = habitViewMode === 'PROTOCOLS' ? '1/2' : '2/2';
 const noteIndicator = noteViewMode === 'NOTES' ? '1/2' : '2/2';

 const effectiveConfig = dockConfig || {
 enabledItems: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'] as DockItemId[],
 order: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'] as DockItemId[],
 expandedItems: ['HABITS', 'FOCUS', 'STORE', 'ACHIEVEMENTS', 'FEED', 'RANKS', 'FRIENDS'] as DockItemId[],
 };

 const activeOrder = effectiveConfig.order.slice(0, 4);
 const leftItems = activeOrder.slice(0, 2);
 const rightItems = activeOrder.slice(2, 4);

 const rawExpandedItems = effectiveConfig.expandedItems || ['HABITS', 'FOCUS', 'STORE', 'ACHIEVEMENTS', 'FEED', 'RANKS', 'FRIENDS'];
 
 // Dynamically swap FEED and STORE if FEED is placed before STORE
 const mappedItems = rawExpandedItems.map(id => id === 'STRATEGY' ? 'FEED' : id);
 const feedIdx = mappedItems.indexOf('FEED');
 const storeIdx = mappedItems.indexOf('STORE');
 if (feedIdx !== -1 && storeIdx !== -1 && feedIdx < storeIdx) {
    mappedItems[feedIdx] = 'STORE';
    mappedItems[storeIdx] = 'FEED';
 }

 const expandedItems = Array.from(new Set(mappedItems)) as DockItemId[];
 // Reducir la altura base (espacio extra) para eliminar el sobrante
 const dynamicHeight = 175 + Math.ceil(expandedItems.length / 2) * 88;

 const getIndicator = (id: DockItemId) => {
 if (id === 'TASKS') return taskIndicator;
 if (id === 'HABITS') return habitIndicator;
 if (id === 'NOTES') return noteIndicator;
 return null;
 };

 // Sections switch the moment the finger lands (pointerdown), not when it
 // lifts: a click only fires on release, which added the whole press time
 // (~80–150ms) before anything happened. The click that follows the press is
 // swallowed; keyboard activation still goes through onClick.
 const pressedNav = React.useRef<{ id: DockItemId; at: number } | null>(null);
 const navPress = (id: DockItemId) => ({
  onPointerDown: (e: React.PointerEvent) => {
   if (!e.isPrimary || e.button !== 0 || id === 'SETTINGS') return;
   pressedNav.current = { id, at: performance.now() };
   handleSmartNav(id);
  },
  onClick: () => {
   const p = pressedNav.current;
   pressedNav.current = null;
   if (p && p.id === id && performance.now() - p.at < 1500) return;
   handleSmartNav(id);
  },
 });

 const renderDockButton = (id: DockItemId) => {
  const item = DOCK_ITEMS.find((item: DockItemConfig) => item.id === id);
  if (!item) return null;
  const Icon = item.icon;
  const isActive = currentView === id;

  return (
  <button
  key={id}
  {...navPress(id)}
  className="group relative z-10 flex flex-col items-center gap-0.5 min-w-[40px] w-full"
  >
  <div className={`relative transition-all duration-300 ${isActive ? 'scale-110' : 'text-white/40 group-hover:text-white/80'}`}>
  {isActive && <div className={`absolute inset-0 ${item.bgColor} rounded-full blur-sm `} />}
  <span className="lux-dock-light" data-on={isActive ? 'true' : 'false'} aria-hidden="true" />
  <Icon size={22} className={isActive ? item.color : ''} strokeWidth={isActive ? 2.5 : 2} />
  </div>
  <span className={`text-[9px] font-bold tracking-widest transition-colors ${isActive ? 'text-white' : 'text-white/30'}`}>{item.label}</span>
  {getIndicator(id) ? (
  <span className={`text-[8px] font-mono tracking-widest ${isActive ? 'text-white/70' : 'text-white/30'}`}>{getIndicator(id)}</span>
  ) : (
  <span className="text-[8px] font-mono tracking-widest opacity-0 select-none pointer-events-none">1/2</span>
  )}
  </button>
  );
  };

  const renderLegacyDockButton = (id: DockItemId) => {
  const item = DOCK_ITEMS.find((item: DockItemConfig) => item.id === id);
  if (!item) return null;
  const Icon = item.icon;
  const isActive = currentView === id;
  const indicator = getIndicator(id);

  return (
  <button 
  key={id}
  {...navPress(id)}
  className={`group relative flex flex-col items-center gap-0.5 transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
  >
  {/* A light that glides between sections instead of blinking on/off */}
  <span className="lux-dock-light" data-on={isActive ? 'true' : 'false'} aria-hidden="true" />
  <Icon size={22} className={`relative transition-transform group-active:scale-75 duration-300 ${isActive ? item.color : ''}`} strokeWidth={isActive ? 2.5 : 2} />
  {indicator ? (
  <span className={`text-[8px] font-mono tracking-widest ${isActive ? 'text-white/70' : 'text-white/30'}`}>{indicator}</span>
  ) : (
  <span className="text-[8px] font-mono tracking-widest opacity-0 select-none pointer-events-none">1/2</span>
  )}
  </button>
  );
  };

 // The dim layer behind the open menu stays mounted and only fades. Inserting
 // or removing a node in <body> made the browser restyle ~800 elements on the
 // tap frame (~35ms on a phone), and as a component declared inside render it
 // was also re-mounted on every Dock render. Opacity is composited; visibility
 // drops it from paint (and from the backdrop blur) once it has faded out.
 const backdropOn = isOpen && !isHidden && pointerEvents !== 'none';
 const backdrop = (
   <div
     aria-hidden="true"
     className="fixed inset-0 z-[350] bg-black/55 backdrop-blur-sm"
     style={{
       opacity: backdropOn ? 1 : 0,
       visibility: backdropOn ? 'visible' : 'hidden',
       pointerEvents: backdropOn ? 'auto' : 'none',
       transition: backdropOn ? 'opacity 0.2s ease, visibility 0s' : 'opacity 0.2s ease, visibility 0s linear 0.2s',
       willChange: 'opacity',
     }}
     onClick={() => onToggle(false)}
   />
 );
 
  const todayDateStr = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [hasFeedUnread, setHasFeedUnread] = React.useState(() => {
    try { return localStorage.getItem('matrix_feed_opened_date') !== todayDateStr; } catch (e) { return true; }
  });
  const [hasRivalsUnread, setHasRivalsUnread] = React.useState(() => {
    try { return localStorage.getItem('matrix_rivals_opened_date') !== todayDateStr; } catch (e) { return true; }
  });

  React.useEffect(() => {
    const handleFeedRead = () => {
      try { localStorage.setItem('matrix_feed_opened_date', todayDateStr); } catch (e) {}
      setHasFeedUnread(false);
    };
    const handleRivalsRead = () => {
      try { localStorage.setItem('matrix_rivals_opened_date', todayDateStr); } catch (e) {}
      setHasRivalsUnread(false);
    };
    window.addEventListener('feed-read', handleFeedRead);
    window.addEventListener('rivals-read', handleRivalsRead);
    return () => {
      window.removeEventListener('feed-read', handleFeedRead);
      window.removeEventListener('rivals-read', handleRivalsRead);
    };
  }, [todayDateStr]);

  const renderExpandedMenuButton = (id: string, label: string, IconComponent: React.ElementType, color: string, bg: string, border: string, action: (e?: React.MouseEvent) => void, isFullWidth?: boolean) => {
    const hasExclamation = (id === 'FEED' && hasFeedUnread) || (id === 'RIVALS' && hasRivalsUnread);

    return (
      <button 
        key={id}
        onClick={(e) => {
          if (id === 'FEED') {
            try { localStorage.setItem('matrix_feed_opened_date', todayDateStr); } catch (err) {}
            setHasFeedUnread(false);
          } else if (id === 'RIVALS') {
            try { localStorage.setItem('matrix_rivals_opened_date', todayDateStr); } catch (err) {}
            setHasRivalsUnread(false);
          }
          action(e);
        }}
        className={`relative z-10 h-24 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex flex-col items-center justify-center gap-2 group ${isFullWidth ? 'w-full' : ''}`}
      >
        <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center ${color} border ${border} group-hover:scale-110 transition-transform relative`}>
          <IconComponent size={16} />
          {hasExclamation && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse pointer-events-none z-30 border border-white/30">
              !
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-white/80">{label}</span>
      </button>
    );
  };

 const renderGlassExpandedButton = (id: DockItemId, isFullWidth?: boolean) => {
 const item = DOCK_ITEMS.find(i => i.id === id);
 if (!item) return null;
 
  let action = (_e?: React.MouseEvent) => act.current.handleView(id);
  let label = item.label;
  let Icon = item.icon;
  let color = item.color;
  let bgColor = item.bgColor;
  let borderColor = item.borderColor;

  if (id === 'HABITS') { action = (e) => act.current.handleModal('HABIT', e); label = 'Habit'; }
  else if (id === 'FOCUS') { action = (e) => act.current.handleModal('PROJECT', e); label = 'Proyecto'; }
  else if (id === 'RIVALS') { action = (e) => act.current.handleModal('RIVALS', e); label = 'Duelos'; Icon = Swords; color = 'text-amber-400'; bgColor = 'bg-amber-500/20'; borderColor = 'border-amber-500/20'; }
  else if (id === 'ACHIEVEMENTS') { label = 'Legacy'; }
  else if (id === 'STORE') { action = () => { act.current.handleView('NOTES'); setTimeout(() => window.dispatchEvent(new Event('open-note-editor')), 100); }; label = 'Note'; }
  else if (id === 'FEED') { label = 'Feed'; }
  else if (id === 'SETTINGS') { action = (e) => act.current.handleModal('SETTINGS', e); label = 'Config'; }

 return renderExpandedMenuButton(id, label, Icon, color, bgColor, borderColor, action, isFullWidth);
 };

 const renderLegacyExpandedButton = (id: DockItemId, isLastOdd: boolean) => {
 const item = DOCK_ITEMS.find(i => i.id === id);
 if (!item) return null;
 
  let action = (_e?: React.MouseEvent) => act.current.handleView(id);
  let label = item.label;
  let Icon = item.icon;
  let color = item.color;
  let bgColor = item.bgColor;
  let borderColor = item.borderColor;

  if (id === 'HABITS') { action = (e) => act.current.handleModal('HABIT', e); label = t('dock.habit'); }
  else if (id === 'FOCUS') { action = (e) => act.current.handleModal('PROJECT', e); label = 'Proyecto'; }
  else if (id === 'RIVALS') { action = (e) => act.current.handleModal('RIVALS', e); label = 'Duelos'; Icon = Swords; color = 'text-amber-400'; bgColor = 'bg-amber-500/20'; borderColor = 'border-amber-500/20'; }
  else if (id === 'ACHIEVEMENTS') { label = 'LEGACY'; }
  else if (id === 'STORE') { action = () => { act.current.handleView('NOTES'); setTimeout(() => window.dispatchEvent(new Event('open-note-editor')), 100); }; label = t('dock.note', 'Note'); }
  else if (id === 'FEED') { label = t('dock.feed', 'Feed'); }
  else if (id === 'SETTINGS') { action = (e) => act.current.handleModal('SETTINGS', e); label = 'Config'; }

  const hasExclamation = (id === 'FEED' && hasFeedUnread) || (id === 'RIVALS' && hasRivalsUnread);

 return (
 <button 
 key={id}
 onClick={(e) => {
   if (id === 'FEED') {
     try { localStorage.setItem('matrix_feed_opened_date', todayDateStr); } catch (err) {}
     setHasFeedUnread(false);
   } else if (id === 'RIVALS') {
     try { localStorage.setItem('matrix_rivals_opened_date', todayDateStr); } catch (err) {}
     setHasRivalsUnread(false);
   }
   action(e);
 }} 
 className={`relative h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-[background-color,transform] rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm ${isLastOdd ? 'col-span-2' : ''}`}
 >
 <div className={`w-8 h-8 rounded-full ${bgColor} border ${borderColor} flex items-center justify-center ${color} group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.05)] relative`}>
 <Icon size={18} />
 {hasExclamation && (
   <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse pointer-events-none z-30 border border-white/30">
     !
   </span>
 )}
 </div>
 <span className="text-white/90 font-bold text-[11px] tracking-tight">{label}</span>
 </button>
 );
 };

 // Tapping "+" re-renders the Dock; the menu items don't change with it, so
 // they are built once per real change instead of on every tap (the tap frame
 // is where every millisecond shows as delay).
 const expandedKey = expandedItems.join('|');
 const menuItems = React.useMemo(() => expandedItems.map((id, index) => {
   const isLastOdd = index === expandedItems.length - 1 && expandedItems.length % 2 !== 0;
   if (isGlass) {
     return (
       <div key={id} className={isLastOdd ? 'col-span-2' : 'col-span-1'}>
         {renderGlassExpandedButton(id as DockItemId, isLastOdd)}
       </div>
     );
   }
   return renderLegacyExpandedButton(id as DockItemId, isLastOdd);
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }), [expandedKey, isGlass, hasFeedUnread, hasRivalsUnread, t]);

 // --- GLASS STYLE (VISION OS) ---
 if (isGlass) {
 return (
 <>
 {backdrop}
 <motion.div 
 data-tour="dock"
 data-lux-dock
 initial={false}
 animate={{ y: isHidden ? '200%' : '0%' }}
 transition={{ type: "spring", stiffness: 300, damping: 28 }}
 className="fixed bottom-[42px] left-0 right-0 z-[400] flex justify-center pointer-events-none"
 style={{ willChange: "transform", pointerEvents }}
 >
 <motion.div 
 initial={false}
 animate={{ 
 width: '92vw',
 maxWidth: 380
 }}
  className="pointer-events-none relative border border-white/[0.10] shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] overflow-hidden backdrop-blur-xl bg-black/50"
  style={{ 
    height: isOpen ? `${dynamicHeight}px` : '72px',
    borderRadius: '36px',
    transition: 'height 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'height, border-radius, transform', 
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    backdropFilter: 'blur(16px)', 
    WebkitBackdropFilter: 'blur(16px)' 
  }}
  >
  {/* Specular sheen: glides as the phone tilts */}
  <LuxSheen intensity={0.9} />
  {/* Fake-glass: top highlight line */}
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-0" />
  {/* Fake-glass: subtle sheen overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/[0.04] pointer-events-none z-0" />

 {configGear}
 <div
 className="absolute inset-x-0 top-0 p-4 grid grid-cols-2 gap-2"
 style={{
 opacity: isOpen ? 1 : 0,
 transform: isOpen ? 'translate3d(0,0,0)' : 'translate3d(0,-16px,0)',
 pointerEvents: isOpen ? 'auto' : 'none',
 willChange: 'transform, opacity',
 transition: isOpen
   ? 'opacity 0.22s ease 0.05s, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1) 0.05s'
   : 'opacity 0.1s ease, transform 0.1s ease',
 }}
 >
 <button onClick={(e) => handleModal('QUEST', e)} className="relative z-10 col-span-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-between group">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(249,115,22,0.2)]">
 <Crosshair size={20} />
 </div>
 <div className="text-left">
 <span className="block text-white font-bold text-sm">{t('dock.newMission', 'New Mission')}</span>
 <span className="text-[10px] text-white/40 uppercase tracking-wider">{t('dock.singleTask', 'Single Task')}</span>
 </div>
 </div>
 <Plus size={18} className="text-white/20 group-hover:text-white transition-colors" />
 </button>
 
 {menuItems}
 </div>
 
 <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[72px] px-6 flex items-center justify-between gap-2 z-20">
 {leftItems.map(id => renderDockButton(id))}

 <div className="px-0 relative z-10 shrink-0 flex items-center justify-center">
 <button
 data-tour="dock-main-btn"
 {...plusProps}
 style={{ transform: `rotate(${isOpen ? 45 : 0}deg)`, transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)' }}
 className={`
 w-12 h-12 rounded-full flex items-center justify-center ${isOpen
 ? 'bg-zinc-800/80 border border-white/10 text-white hover:bg-zinc-700'
 : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]'
 }
 `}
 >
 <Plus size={24} strokeWidth={2.5} />
 </button>
 </div>

 {rightItems.map(id => renderDockButton(id))}
 </div>
 </motion.div>
 </motion.div>
 </>
 );
 }

 // --- ANIMATED AURA DOCK (User Requested) ---
 if (isAura) {
 return (
 <>
 {backdrop}
 <motion.div 
 initial={false}
 animate={{ y: isHidden ? '200%' : '0%' }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 data-lux-dock
 className="fixed bottom-[26px] left-0 right-0 z-[400] flex justify-center" 
 style={{ pointerEvents, willChange: "transform" }}
 >
 {/* Contenedor Animado */} 
 <motion.div 
    initial={false}
    className={` 
    pointer-events-auto relative aura-container box-border w-[85vw] max-w-[320px] shadow-2xl 
    border border-white/[0.10] overflow-hidden backdrop-blur-xl bg-black/50
    ${isOpen ? 'aura-active' : ''} 
    `}
    style={{ 
      height: isOpen ? `${dynamicHeight}px` : '70px',
      borderRadius: isOpen ? '32px' : '34px',
      transition: 'height 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      willChange: 'height, border-radius, transform', 
      transform: 'translate3d(0, 0, 0)',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      backgroundColor: 'rgba(0,0,0,0.07)' 
    }}
  > 
  {/* Specular sheen: glides as the phone tilts */} 
  <LuxSheen intensity={0.9} /> 
  {/* Fake-glass: top highlight line */}
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-0" />
  {/* Fake-glass: sheen overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/[0.04] pointer-events-none z-0" />
  <div className="relative w-full h-full z-10"> 
 
 {configGear}
 {/* ELEMENTOS INTERNOS (Aparecen al expandir) */} 
 <div className={` 
 absolute bottom-[80px] left-0 right-0 px-4 grid grid-cols-2 gap-2 
 transition-[opacity,transform] duration-300 ease-out transform-gpu will-change-[transform,opacity]
 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'} 
 `}> 
 <button onClick={(e) => { handleModal('QUEST', e); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-[background-color,transform] rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-md">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
 <Crosshair size={18} />
 </div>
 <div className="text-left">
 <span className="block text-white font-bold text-[14px] tracking-tight">{t('dock.newMission') || 'Nueva Misión'}</span>
 </div>
 </div>
 <Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
 </button>

 {menuItems}
 </div> 

 {/* BARRA INFERIOR (Siempre visible) */} 
 <div className="absolute bottom-0 left-0 right-0 h-[70px] grid grid-cols-5 items-center px-2 sm:px-6 z-20"> 
 <div className="col-span-2 flex items-center justify-around h-full pr-1 sm:pr-2"> 
 {leftItems.map(id => renderLegacyDockButton(id))}
 </div> 
 
 {/* BOTÓN "+" CENTRAL ANIMADO */} 
 <div className="col-span-1 flex items-center justify-center h-full z-20"> 
 <button 
 data-tour="dock-main-btn"
 {...plusProps}
 className={` 
 relative transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
 flex items-center justify-center gap-2 rounded-full font-bold shadow-2xl z-20 overflow-hidden btn-orb-glow transform-gpu
 ${isOpen ? 'w-16 h-12 bg-white/10 !shadow-none !border-white/5 translate-y-[2px]' : 'w-14 h-14 active:scale-90 hover:scale-105'} 
 `} 
 > 
 {isOpen 
 ? <ChevronDown size={28} className="text-white" strokeWidth={2.5} />
 : <Plus size={28} strokeWidth={3} className="text-white drop-shadow-md" /> 
 } 
 </button> 
 </div> 

 <div className="col-span-2 flex items-center justify-around h-full pl-1 sm:pl-2"> 
 {rightItems.map(id => renderLegacyDockButton(id))}
 </div> 
 </div> 

 </div> 
 </motion.div> 
 </motion.div> 
 </>
 );
 }

 // --- LEGACY STYLES (BORDER / LIQUID) WITH NEW ANIMATED BUTTON ---
 
 
 const styleClass = isLiquid
 ? "border border-white/[0.10] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)]"
 : "glass-panel !shadow-none rgb-border-container rgb-border-active !bg-none";


 const liquidSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

 return (
 <>
 {backdrop}
 <motion.div 
 data-tour="dock"
 data-lux-dock
 initial={false}
 animate={{ y: isHidden ? '200%' : '0%' }}
 transition={liquidSpring}
 className="fixed bottom-[26px] left-0 right-0 z-[400] flex justify-center transform-gpu"
 style={{ pointerEvents }}
 >
  <motion.div
 initial={false}
 animate={{
 width: '85vw',
 maxWidth: 320
}}
 className="pointer-events-none box-border mx-auto"
 style={{ position: 'relative', overflow: 'visible', height: `${dynamicHeight}px` }}
 >
   {/* Skin in three pieces: the bottom cap stays, the middle stretches (scaleY) and the top cap
       slides (translateY). Opening/closing only moves layers on the compositor — no height,
       border-radius, mask or backdrop re-layout per frame. The box itself has its final height. */}
   <style>{DOCK_SKIN_CSS}</style>
   <div className={`dock-skin dock-skin-bottom ${styleClass}`} style={{ position: 'absolute' }}>
      <div className="absolute inset-0 !border-0 backdrop-blur-xl bg-black/50 dock-skin-fill" />
      <LuxSheen intensity={0.9} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.04] pointer-events-none z-0" style={{ borderRadius: 'inherit' }} />
   </div>
   <div className={`dock-skin dock-skin-mid ${styleClass}`}
     style={{ position: 'absolute', height: `${dynamicHeight - 2 * DOCK_CAP}px`, transform: `scaleY(${isOpen ? 1 : 0})` }}>
      <div className="absolute inset-0 !border-0 backdrop-blur-xl bg-black/50 dock-skin-fill" />
   </div>
   <div className={`dock-skin dock-skin-top ${styleClass}`}
     style={{ position: 'absolute', transform: `translate3d(0, ${isOpen ? -(dynamicHeight - 2 * DOCK_CAP) : 0}px, 0)` }}>
      <div className="absolute inset-0 !border-0 backdrop-blur-xl bg-black/50 dock-skin-fill" />
      {/* Fake-glass: top highlight line + sheen */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none z-0" style={{ borderRadius: 'inherit' }} />
   </div>
   <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
      <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
  {configGear}
  <div
  className="absolute bottom-[80px] left-0 right-0 px-4 grid grid-cols-2 gap-2"
  style={{
  opacity: isOpen ? 1 : 0,
  transform: isOpen ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0,15px,0) scale(0.98)',
  pointerEvents: isOpen ? 'auto' : 'none',
  willChange: 'transform, opacity',
  transition: isOpen
    ? 'opacity 0.22s ease 0.06s, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1) 0.06s'
    : 'opacity 0.08s ease, transform 0.08s ease',
  }}
  >
  
  <button onClick={(e) => { handleModal('QUEST', e); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-[background-color,transform] rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-sm">
  <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)] group-hover:scale-110 transition-transform"><Crosshair size={18} /></div><div className="text-left"><span className="block text-white font-bold text-[14px] tracking-tight">{t('dock.newMission')}</span><span className="block text-white/40 text-[9px] font-bold uppercase tracking-wider">{t('dock.singleTask')}</span></div></div><Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
  </button>
  {menuItems}
  </div>
  <div className={`pointer-events-auto absolute bottom-0 left-0 right-0 h-[70px] grid grid-cols-5 items-center px-2 sm:px-6 z-20`}>
  
  <div className="col-span-2 flex items-center justify-around h-full">
  {leftItems.map(id => renderLegacyDockButton(id))}
  </div>
 
  {/* BOTÓN "+" CENTRAL ANIMADO INTEGRADO EN LEGACY UI */} 
  <div className="col-span-1 flex items-center justify-center h-full z-30">
  <button 
 data-tour="dock-main-btn"
 {...plusProps}
  className={` 
 relative transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
 flex items-center justify-center gap-2 rounded-full font-bold shadow-2xl z-[450] overflow-hidden btn-orb-glow pointer-events-auto transform-gpu
  ${isOpen ? 'w-16 h-12 bg-white/10 !shadow-none !border-white/5 translate-y-[2px]' : 'w-14 h-14 active:scale-90 hover:scale-105'} 
  `} 
  > 
  {isOpen 
 ? <ChevronDown size={28} className="text-white" strokeWidth={2.5} />
  : <Plus size={28} strokeWidth={3} className="text-white drop-shadow-md" /> 
  } 
  </button> 
  </div>
 
  <div className="col-span-2 flex items-center justify-around h-full">
  {rightItems.map(id => renderLegacyDockButton(id))}
  </div>
  </div>
  </div>
  </div>
 </motion.div>
 </motion.div>
 </>
 );
});
