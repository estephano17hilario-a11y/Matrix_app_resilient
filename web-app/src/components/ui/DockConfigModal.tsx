import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useMountTransition } from '../../hooks/useMountTransition';
import { X, GripVertical, Check, ClipboardList, Flame, Target, Brain, Map, Trophy, Plus, Settings2, PenLine, Activity, AlertCircle, Medal, Users, CalendarClock, Swords } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

export type DockItemId = 'TASKS' | 'HABITS' | 'FOCUS' | 'NOTES' | 'STRATEGY' | 'STORE' | 'ACHIEVEMENTS' | 'FEED' | 'SETTINGS' | 'RANKS' | 'FRIENDS' | 'ROUTINE' | 'RIVALS';

export interface DockItemConfig {
  id: DockItemId;
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isSystem?: boolean;
}

export const DOCK_ITEMS: DockItemConfig[] = [
  { id: 'TASKS', icon: ClipboardList, label: 'TASKS', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/20' },
  { id: 'HABITS', icon: Flame, label: 'HABITS', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/20' },
  { id: 'FOCUS', icon: Target, label: 'FOCUS', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/20' },
  { id: 'NOTES', icon: Brain, label: 'STATS', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/20' },
  { id: 'STRATEGY', icon: Map, label: 'STRATEGY', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', borderColor: 'border-indigo-500/20' },
  { id: 'STORE', icon: PenLine, label: 'NOTA', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/20' },
  { id: 'ACHIEVEMENTS', icon: Trophy, label: 'LEGACY', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/20' },
  { id: 'FEED', icon: Activity, label: 'FEED', color: 'text-teal-400', bgColor: 'bg-teal-500/20', borderColor: 'border-teal-500/20' },
  { id: 'ROUTINE', icon: CalendarClock, label: 'RUTINA', color: 'text-sky-400', bgColor: 'bg-sky-500/20', borderColor: 'border-sky-500/20' },
  { id: 'RIVALS', icon: Swords, label: 'DUELOS', color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/20' },
  { id: 'SETTINGS', icon: Settings2, label: 'SETTINGS', color: 'text-slate-300', bgColor: 'bg-slate-500/20', borderColor: 'border-slate-500/20' },
  // Overlays (not sections): opened through window events, see Dock.openOverlay
  { id: 'RANKS', icon: Medal, label: 'RANGOS', color: 'text-amber-300', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/20' },
  { id: 'FRIENDS', icon: Users, label: 'AMIGOS', color: 'text-sky-300', bgColor: 'bg-sky-500/20', borderColor: 'border-sky-500/20' }
];

export interface DockConfig {
  enabledItems: DockItemId[];
  order: DockItemId[];
  expandedItems?: DockItemId[];
}

export const DEFAULT_DOCK_CONFIG: DockConfig = {
  enabledItems: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'],
  order: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'],
  expandedItems: ['HABITS', 'FOCUS', 'STORE', 'ACHIEVEMENTS', 'FEED', 'ROUTINE', 'SETTINGS', 'RANKS', 'FRIENDS', 'RIVALS'],
};

interface DockConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DockConfig;
  onSave: (config: DockConfig) => void;
}

const KNOWN_DOCK_IDS = new Set<string>(DOCK_ITEMS.map(i => i.id));

/**
 * A stored config can hold ids that no longer exist or repeat an id. Either one crashes the
 * reorder lists (an unknown id has no icon; duplicate values freeze framer's Reorder), so every
 * config is cleaned before it is edited.
 */
const sanitizeDockIds = (ids: DockItemId[] | undefined, fallback: DockItemId[]): DockItemId[] => {
  const seen = new Set<string>();
  const out: DockItemId[] = [];
  for (const id of ids && ids.length ? ids : fallback) {
    if (!KNOWN_DOCK_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

/** Quick actions of the top HUD (header). Settings sits there by default, so it is always reachable. */
const settingsInTopHud = (): boolean => {
  try {
    const raw = localStorage.getItem('matrix_top_quick_actions');
    const list = raw ? JSON.parse(raw) : ['SETTINGS', 'STORE'];
    return Array.isArray(list) ? list.includes('SETTINGS') : true;
  } catch {
    return true;
  }
};

/**
 * Settings must be reachable somewhere: the top HUD, the dock's main bar or the "+" menu.
 * The old check ignored the top HUD, so removing Settings from "+" was refused even when the HUD
 * had it.
 */
const isSettingsReachable = (c: DockConfig): boolean =>
  c.order.slice(0, 4).includes('SETTINGS') || (c.expandedItems || DEFAULT_DOCK_CONFIG.expandedItems!).includes('SETTINGS') || settingsInTopHud();

const SETTINGS_WARNING = 'Configuraciones debe estar en el HUD de arriba, en la barra principal o en el menú (+). Activa uno antes de quitarlo.';

export const sanitizeDockConfig = (config: DockConfig): DockConfig => {
  const order = sanitizeDockIds(config?.order, DEFAULT_DOCK_CONFIG.order);
  // The main bar always has 4 slots: top it up from the defaults when ids were dropped.
  for (const id of DEFAULT_DOCK_CONFIG.order) if (order.length < 4 && !order.includes(id)) order.push(id);
  const expanded = sanitizeDockIds(config?.expandedItems, DEFAULT_DOCK_CONFIG.expandedItems!);
  return { ...config, order, enabledItems: order.slice(0, 4), expandedItems: expanded };
};

export const DockConfigModal = ({ isOpen, onClose, config, onSave }: DockConfigModalProps) => {
  const { t } = useTranslation();
  const mounted = useMountTransition(isOpen, 300);
  const [localConfig, setLocalConfig] = useState<DockConfig>(() => sanitizeDockConfig(config));
  const [activeTab, setActiveTab] = useState<'organize' | 'expanded'>('organize');
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Load the saved config only when the modal OPENS. Depending on `config` itself reset the edits
  // in progress every time the parent re-rendered with a new object, so a section the user had just
  // added (e.g. Settings in the "+" menu) vanished before saving and was reported as missing.
  const configRef = React.useRef(config);
  configRef.current = config;
  useEffect(() => {
    if (!isOpen) return;
    setLocalConfig(sanitizeDockConfig(configRef.current));
    setReplacingIndex(null);
    setWarningMessage(null);
  }, [isOpen]);

  const handleToggleItem = (id: DockItemId) => {
    if (replacingIndex !== null) {
      setLocalConfig(prev => {
        const newOrder = [...prev.order];
        const oldId = newOrder[replacingIndex];
        newOrder[replacingIndex] = id;
        
        const newEnabledItems = [...prev.enabledItems.filter(i => i !== oldId), id];

        return {
          ...prev,
          order: newOrder,
          enabledItems: newEnabledItems
        };
      });
      setReplacingIndex(null);
      setWarningMessage(null);
      return;
    }
  };

  const handleReorderMainBar = (newOrder: DockItemId[]) => {
    setLocalConfig(prev => ({ ...prev, order: newOrder }));
    setWarningMessage(null);
  };

  const handleToggleExpandedItem = (id: DockItemId) => {
    const items = localConfig.expandedItems || DEFAULT_DOCK_CONFIG.expandedItems!;
    if (items.includes(id)) {
      const next = { ...localConfig, expandedItems: items.filter(i => i !== id) };
      // Settings may only leave the "+" menu if it is still reachable from the HUD / main bar.
      if (id === 'SETTINGS' && !isSettingsReachable(next)) {
        setWarningMessage(SETTINGS_WARNING);
        return;
      }
      setWarningMessage(null);
      setLocalConfig(next);
    } else {
      setWarningMessage(null);
      setLocalConfig({ ...localConfig, expandedItems: [...items, id] });
    }
  };

  const handleReorderExpanded = (newOrder: DockItemId[]) => {
    setLocalConfig(prev => ({ ...prev, expandedItems: newOrder }));
    setWarningMessage(null);
  };

  const handleSave = () => {
    const activeOrder = localConfig.order.slice(0, 4);
    const expanded = localConfig.expandedItems || DEFAULT_DOCK_CONFIG.expandedItems!;

    // Mandatory rule: Settings reachable from the top HUD, the main bar or the "+" menu.
    if (!isSettingsReachable({ ...localConfig, order: activeOrder, expandedItems: expanded })) {
      setWarningMessage(SETTINGS_WARNING);
      return;
    }

    const finalConfig: DockConfig = sanitizeDockConfig({
      ...localConfig,
      order: activeOrder,
      enabledItems: activeOrder
    });
    onSave(finalConfig);
    onClose();
  };

  const resetToDefault = () => {
    setLocalConfig(DEFAULT_DOCK_CONFIG);
    setWarningMessage(null);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/90 cursor-pointer"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: isOpen ? 1 : 0.9, opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-md overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Settings2 size={16} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{t('dockConfig.title', 'Dock Configuration')}</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('dockConfig.subtitle', 'Organize your navigation')}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* WARNING ALERT BANNER */}
            {warningMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-4 mt-3 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-medium flex items-center justify-between gap-2 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-amber-400" />
                  <span>{warningMessage}</span>
                </div>
                <button onClick={() => setWarningMessage(null)} className="text-amber-400 hover:text-white p-1">
                  <X size={14} />
                </button>
              </motion.div>
            )}

            <div className="flex border-b border-white/5">
              <button
                onClick={() => setActiveTab('organize')}
                className={cn(
                  "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
                  activeTab === 'organize' ? 'text-white bg-white/5 border-b-2 border-indigo-500' : 'text-white/40 hover:text-white/60'
                )}
              >
                {t('dockConfig.dockBar', 'Dock Bar')}
              </button>
              <button
                onClick={() => setActiveTab('expanded')}
                className={cn(
                  "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
                  activeTab === 'expanded' ? 'text-white bg-white/5 border-b-2 border-indigo-500' : 'text-white/40 hover:text-white/60'
                )}
              >
                {t('dockConfig.plusMenu', 'Plus Menu')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'organize' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
                      <span>{t('dockConfig.activeItems', 'Active Items (drag to reorder)')}</span>
                      <span className="text-indigo-400">4 / 4</span>
                    </div>
                    <Reorder.Group 
                      axis="y" 
                      values={localConfig.order.slice(0, 4)} 
                      onReorder={handleReorderMainBar}
                      className="space-y-2"
                    >
                      {localConfig.order.slice(0, 4).map((id, index) => {
                        const item = DOCK_ITEMS.find(i => i.id === id);
                        if (!item) return null;
                        const Icon = item.icon;
                        const isReplacing = replacingIndex === index;
                        return (
                          <Reorder.Item 
                            key={`${id}-${index}`} 
                            value={id}
                            className={cn(
                              "bg-white/5 border rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-colors select-none",
                              isReplacing ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-white/5 hover:bg-white/10"
                            )}
                            whileDrag={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,0,0,0.5)", zIndex: 50 }}
                          >
                            <div className="text-white/30">
                              <GripVertical size={18} />
                            </div>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border", item.bgColor, item.color, item.borderColor)}>
                              <Icon size={14} />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-bold text-white">{item.label}</span>
                              {isReplacing && (
                                <span className="block text-[9px] text-indigo-300">{t('dockConfig.selectToReplace', 'Select an item below to replace')}</span>
                              )}
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                              index < 2 ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"
                            )}>
                              {index < 2 ? "L" : "R"}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplacingIndex(isReplacing ? null : index);
                              }}
                              className={cn(
                                "px-2 py-1 text-[10px] font-bold rounded-lg transition-colors border",
                                isReplacing ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10"
                              )}
                            >
                              {isReplacing ? "CANCEL" : "REPLACE"}
                            </button>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
                      <span>{t('dockConfig.availableReplace', 'Available Items to Replace')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {DOCK_ITEMS.filter(item => !localConfig.order.slice(0, 4).includes(item.id)).map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (replacingIndex !== null) {
                                handleToggleItem(item.id);
                              }
                            }}
                            disabled={replacingIndex === null}
                            className={cn(
                              "bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-2 transition-colors",
                              replacingIndex !== null ? "hover:bg-white/10 cursor-pointer hover:border-indigo-500/30" : "opacity-40 cursor-not-allowed"
                            )}
                          >
                            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center border", item.bgColor, item.color, item.borderColor)}>
                              <Icon size={12} />
                            </div>
                            <span className="text-xs font-bold text-white/60">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={resetToDefault}
                    className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors underline"
                  >
                    {t('dockConfig.reset', 'Reset to default')}
                  </button>
                </div>
              )}

              {activeTab === 'expanded' && (() => {
                const currentExpandedItems = localConfig.expandedItems || DEFAULT_DOCK_CONFIG.expandedItems!;
                const availableExpandedItems = DOCK_ITEMS.filter(item => !currentExpandedItems.includes(item.id));

                return (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
                        <span>{t('dockConfig.plusItems', 'Plus Menu Items (drag to reorder)')}</span>
                        <span className="text-indigo-400">{currentExpandedItems.length}</span>
                      </div>
                      <Reorder.Group 
                        axis="y" 
                        values={currentExpandedItems} 
                        onReorder={handleReorderExpanded}
                        className="space-y-2"
                      >
                        {currentExpandedItems.map((id) => {
                          const item = DOCK_ITEMS.find(i => i.id === id);
                          if (!item) return null;
                          const Icon = item.icon;
                          return (
                            <Reorder.Item 
                              key={id} 
                              value={id}
                              className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors select-none"
                              whileDrag={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,0,0,0.5)", zIndex: 50 }}
                            >
                              <div className="text-white/30">
                                <GripVertical size={18} />
                              </div>
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border", item.bgColor, item.color, item.borderColor)}>
                                <Icon size={14} />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-bold text-white">{id === 'ACHIEVEMENTS' ? 'LEGACY' : (id === 'FOCUS' ? 'PROYECTO' : (id === 'HABITS' ? 'HABIT' : item.label))}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleExpandedItem(id);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </Reorder.Item>
                          );
                        })}
                      </Reorder.Group>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
                        <span>{t('dockConfig.availableItems', 'Available Items')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {availableExpandedItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleToggleExpandedItem(item.id)}
                              className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-2 hover:bg-white/10 transition-colors"
                            >
                              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center border", item.bgColor, item.color, item.borderColor)}>
                                <Icon size={12} />
                              </div>
                              <span className="text-xs font-bold text-white/60">{item.id === 'ACHIEVEMENTS' ? 'LEGACY' : (item.id === 'FOCUS' ? 'PROYECTO' : (item.id === 'HABITS' ? 'HABIT' : item.label))}</span>
                              <Plus size={12} className="ml-auto text-white/30" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={resetToDefault}
                      className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors underline"
                    >
                      {t('dockConfig.reset', 'Reset to default')}
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-white/5 bg-white/5">
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} />
                {t('dockConfig.save', 'Save Configuration')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>,
    document.body
  );
};
