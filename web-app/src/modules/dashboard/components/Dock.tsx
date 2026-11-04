import React from 'react';
import { Crosshair, Plus, ChevronDown, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DockConfig, DockItemConfig, DOCK_ITEMS, DockItemId } from '@/components/ui/DockConfigModal';
import { onPress } from '@/immersion/press';
import { LuxSheen } from '@/immersion/LuxSheen';

interface DockProps {
 currentView: string;
 onChangeView: (v: string) => void;
 onOpenModal: (m: string) => void;
 isOpen: boolean;
 onToggle: (open: boolean) => void;
 isHidden: boolean;
 dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA';
 taskViewMode: 'LIST' | 'STRATEGY';
 habitViewMode: 'PROTOCOLS' | 'VICES';
 noteViewMode: 'NOTES' | 'JOURNAL';
 dockConfig?: DockConfig;
 pointerEvents?: 'none' | 'auto';
}

export const Dock = React.memo(({ currentView, onChangeView, onOpenModal, isOpen: propIsOpen, onToggle: propOnToggle, isHidden, dashboardStyle = 'BORDER', taskViewMode, habitViewMode, noteViewMode, dockConfig, pointerEvents = 'auto' }: DockProps) => {
 const { t } = useTranslation();

 const [localIsOpen, setLocalIsOpen] = React.useState(false);
 const isOpen = localIsOpen;

 // Opening/closing only re-renders the dock. The interface recedes on the
 // same frame (lux:dock event → useDepthRecede), and the parent learns about
 // it once the animation is over, so its (much bigger) render never lands in
 // the middle of the motion.
 const propagateTimer = React.useRef(0);
 const onToggle = React.useCallback((open: boolean) => {
   setLocalIsOpen(open);
   window.dispatchEvent(new CustomEvent('lux:dock', { detail: open }));
   if (propOnToggle) {
     window.clearTimeout(propagateTimer.current);
     propagateTimer.current = window.setTimeout(() => propOnToggle(open), 320);
   }
 }, [propOnToggle]);
 React.useEffect(() => () => window.clearTimeout(propagateTimer.current), []);

  React.useEffect(() => {
    if (propIsOpen !== undefined) {
      console.log(`➕ [Dock UI] propIsOpen updated: ${propIsOpen}. Updating localIsOpen.`);
      setLocalIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  React.useEffect(() => {
    if (isHidden || pointerEvents === 'none' || !propIsOpen) {
      console.log(`➕ [Dock UI] Dock isHidden, pointerEvents none, or propIsOpen false. Auto-closing Dock.`);
      setLocalIsOpen(false);
      if (propOnToggle && propIsOpen) {
        propOnToggle(false);
      }
    }
  }, [isHidden, pointerEvents, propIsOpen, propOnToggle]);

 // Close first: the section change commits synchronously and takes this
 // update with it, so a tap costs one render instead of two.
 // Ranks and Friends are full-screen overlays, not sections.
 const openOverlay = (v: string) => {
   if (v === 'RANKS') window.dispatchEvent(new CustomEvent('open-progression-screen', { detail: { tab: 'LADDER' } }));
   else if (v === 'FRIENDS') window.dispatchEvent(new CustomEvent('open-friends'));
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
    console.log(`➕ [Dock UI] handleModal called for: "${m}"`);
    if (e) {
      console.log(`➕ [Dock UI] Stopping propagation and preventing default for click event.`);
      e.preventDefault();
      e.stopPropagation();
    }
    console.log(`➕ [Dock UI] Invoking onOpenModal("${m}") and closing Dock.`);
    onOpenModal(m);
    onToggle(false);
  };

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

 const Backdrop = () => (
      <AnimatePresence>
        {isOpen && !isHidden && pointerEvents !== 'none' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[350] bg-black/55 backdrop-blur-sm pointer-events-auto"
            onClick={() => {
              console.log("➕ [Dock UI] Backdrop clicked. Closing Dock.");
              onToggle(false);
            }}
          />
        )}
      </AnimatePresence>
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
    const hasExclamation = (id === 'FEED' && hasFeedUnread) || (id === 'FOCUS' && hasRivalsUnread);

    return (
      <button 
        key={id}
        onClick={(e) => {
          if (id === 'FEED') {
            try { localStorage.setItem('matrix_feed_opened_date', todayDateStr); } catch (err) {}
            setHasFeedUnread(false);
          } else if (id === 'FOCUS') {
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
 
  let action = (_e?: React.MouseEvent) => handleView(id);
  let label = item.label;
  let Icon = item.icon;
  let color = item.color;
  let bgColor = item.bgColor;
  let borderColor = item.borderColor;

  if (id === 'HABITS') { action = (e) => handleModal('HABIT', e); label = 'Habit'; }
  else if (id === 'FOCUS') { 
    action = (e) => handleModal('RIVALS', e); 
    label = 'Duelos'; 
    Icon = Swords; 
    color = 'text-amber-400'; 
    bgColor = 'bg-amber-500/20'; 
    borderColor = 'border-amber-500/20'; 
  }
  else if (id === 'ACHIEVEMENTS') { label = 'Legacy'; }
  else if (id === 'STORE') { action = () => { handleView('NOTES'); setTimeout(() => window.dispatchEvent(new Event('open-note-editor')), 100); }; label = 'Note'; }
  else if (id === 'FEED') { label = 'Feed'; }
  else if (id === 'SETTINGS') { action = (e) => handleModal('SETTINGS', e); label = 'Config'; }

 return renderExpandedMenuButton(id, label, Icon, color, bgColor, borderColor, action, isFullWidth);
 };

 const renderLegacyExpandedButton = (id: DockItemId, isLastOdd: boolean) => {
 const item = DOCK_ITEMS.find(i => i.id === id);
 if (!item) return null;
 
  let action = (_e?: React.MouseEvent) => handleView(id);
  let label = item.label;
  let Icon = item.icon;
  let color = item.color;
  let bgColor = item.bgColor;
  let borderColor = item.borderColor;

  if (id === 'HABITS') { action = (e) => handleModal('HABIT', e); label = t('dock.habit'); }
  else if (id === 'FOCUS') { 
    action = (e) => handleModal('RIVALS', e); 
    label = 'Duelos'; 
    Icon = Swords; 
    color = 'text-amber-400'; 
    bgColor = 'bg-amber-500/20'; 
    borderColor = 'border-amber-500/20'; 
  }
  else if (id === 'ACHIEVEMENTS') { label = 'LEGACY'; }
  else if (id === 'STORE') { action = () => { handleView('NOTES'); setTimeout(() => window.dispatchEvent(new Event('open-note-editor')), 100); }; label = t('dock.note', 'Note'); }
  else if (id === 'FEED') { label = t('dock.feed', 'Feed'); }
  else if (id === 'SETTINGS') { action = (e) => handleModal('SETTINGS', e); label = 'Config'; }

  const hasExclamation = (id === 'FEED' && hasFeedUnread) || (id === 'FOCUS' && hasRivalsUnread);

 return (
 <button 
 key={id}
 onClick={(e) => {
   if (id === 'FEED') {
     try { localStorage.setItem('matrix_feed_opened_date', todayDateStr); } catch (err) {}
     setHasFeedUnread(false);
   } else if (id === 'FOCUS') {
     try { localStorage.setItem('matrix_rivals_opened_date', todayDateStr); } catch (err) {}
     setHasRivalsUnread(false);
   }
   action(e);
 }} 
 className={`relative h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-sm ${isLastOdd ? 'col-span-2' : ''}`}
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
 
 // --- GLASS STYLE (VISION OS) ---
 if (isGlass) {
 return (
 <>
 <Backdrop />
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

 <div
 className="absolute inset-x-0 top-0 p-4 grid grid-cols-2 gap-2"
 style={{
 opacity: isOpen ? 1 : 0,
 transform: isOpen ? 'translate3d(0,0,0)' : 'translate3d(0,-16px,0)',
 pointerEvents: isOpen ? 'auto' : 'none',
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
 
 {expandedItems.map((id, index) => {
 const isLastOdd = index === expandedItems.length - 1 && expandedItems.length % 2 !== 0;
 return (
 <div key={id} className={isLastOdd ? 'col-span-2' : 'col-span-1'}>
 {renderGlassExpandedButton(id as DockItemId, isLastOdd)}
 </div>
 );
 })}
 </div>
 
 <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[72px] px-6 flex items-center justify-between gap-2 z-20">
 {leftItems.map(id => renderDockButton(id))}

 <div className="px-0 relative z-10 shrink-0 flex items-center justify-center">
 <button
 data-tour="dock-main-btn"
 {...onPress(() => onToggle(!isOpen))}
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
 <Backdrop />
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
 
 {/* ELEMENTOS INTERNOS (Aparecen al expandir) */} 
 <div className={` 
 absolute bottom-[80px] left-0 right-0 px-4 grid grid-cols-2 gap-2 
 transition-all duration-300 ease-out transform-gpu
 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'} 
 `}> 
 <button onClick={(e) => { handleModal('QUEST', e); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-md">
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

 {expandedItems.map((id, index) => {
 const isLastOdd = index === expandedItems.length - 1 && expandedItems.length % 2 !== 0;
 return renderLegacyExpandedButton(id as DockItemId, isLastOdd);
 })} 
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
 {...onPress(() => onToggle(!isOpen))}
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
 
 const baseClass = "pointer-events-none relative box-border mx-auto";
 
 const styleClass = isLiquid
 ? "border border-white/[0.10] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)]"
 : "glass-panel !shadow-none rgb-border-container rgb-border-active !bg-none";

 const containerClass = `${baseClass} ${styleClass}`;

 const liquidSpring = { type: "spring" as const, stiffness: 300, damping: 30 };

 return (
 <>
 <Backdrop />
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
 className={containerClass}
 style={{ 
   overflow: 'visible', 
   height: isOpen ? `${dynamicHeight}px` : '72px',
   borderRadius: isOpen ? '32px' : '36px',
   transition: 'height 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
   willChange: 'height, border-radius' 
 }}
 >
   <div 
   className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
   style={{ 
     borderRadius: isOpen ? '32px' : '36px',
     transition: 'border-radius 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
     willChange: 'border-radius'
   }}
   >
      {/* Frosted glass base */}
      <div 
        className="absolute inset-0 !border-0 backdrop-blur-xl bg-black/50"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      />
      {/* Specular sheen: glides as the phone tilts */}
      <LuxSheen intensity={0.9} />
      {/* Fake-glass: top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-0" />
      {/* Fake-glass: sheen overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/[0.04] pointer-events-none z-0" />
      <div className="relative w-full h-full pointer-events-auto">
  <div
  className="absolute bottom-[80px] left-0 right-0 px-4 grid grid-cols-2 gap-2"
  style={{
  opacity: isOpen ? 1 : 0,
  transform: isOpen ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0,15px,0) scale(0.98)',
  pointerEvents: isOpen ? 'auto' : 'none',
  transition: isOpen
    ? 'opacity 0.22s ease 0.06s, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1) 0.06s'
    : 'opacity 0.08s ease, transform 0.08s ease',
  }}
  >
  
  <button onClick={(e) => { handleModal('QUEST', e); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-sm">
  <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)] group-hover:scale-110 transition-transform"><Crosshair size={18} /></div><div className="text-left"><span className="block text-white font-bold text-[14px] tracking-tight">{t('dock.newMission')}</span><span className="block text-white/40 text-[9px] font-bold uppercase tracking-wider">{t('dock.singleTask')}</span></div></div><Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
  </button>
  {expandedItems.map((id, index) => {
  const isLastOdd = index === expandedItems.length - 1 && expandedItems.length % 2 !== 0;
  return renderLegacyExpandedButton(id as DockItemId, isLastOdd);
  })}
  </div>
  <div className={`pointer-events-auto absolute bottom-0 left-0 right-0 h-[70px] grid grid-cols-5 items-center px-2 sm:px-6 z-20`}>
  
  <div className="col-span-2 flex items-center justify-around h-full">
  {leftItems.map(id => renderLegacyDockButton(id))}
  </div>
 
  {/* BOTÓN "+" CENTRAL ANIMADO INTEGRADO EN LEGACY UI */} 
  <div className="col-span-1 flex items-center justify-center h-full z-30">
  <button 
 data-tour="dock-main-btn"
 {...onPress(() => onToggle(!isOpen))}
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
