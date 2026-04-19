import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, GripVertical, Check, ClipboardList, Flame, Target, Brain, Map, ShoppingBag, Trophy, Plus, Settings2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

export type DockItemId = 'TASKS' | 'HABITS' | 'FOCUS' | 'NOTES' | 'STRATEGY' | 'STORE' | 'ACHIEVEMENTS';

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
 { id: 'TASKS', icon: ClipboardList, label: 'TASKS', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/20', isSystem: true },
 { id: 'HABITS', icon: Flame, label: 'HABITS', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/20', isSystem: true },
 { id: 'FOCUS', icon: Target, label: 'FOCUS', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/20', isSystem: true },
 { id: 'NOTES', icon: Brain, label: 'STATS', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/20', isSystem: true },
 { id: 'STRATEGY', icon: Map, label: 'STRATEGY', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', borderColor: 'border-indigo-500/20' },
 { id: 'STORE', icon: ShoppingBag, label: 'STORE', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/20' },
 { id: 'ACHIEVEMENTS', icon: Trophy, label: 'LEGACY', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/20' }
];

export interface DockConfig {
 enabledItems: DockItemId[];
 order: DockItemId[];
 expandedItems?: DockItemId[];
}

export const DEFAULT_DOCK_CONFIG: DockConfig = {
 enabledItems: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'],
 order: ['TASKS', 'HABITS', 'FOCUS', 'NOTES'],
 expandedItems: ['HABITS', 'FOCUS', 'STRATEGY', 'ACHIEVEMENTS', 'STORE'],
};

interface DockConfigModalProps {
 isOpen: boolean;
 onClose: () => void;
 config: DockConfig;
 onSave: (config: DockConfig) => void;
}

export const DockConfigModal = ({ isOpen, onClose, config, onSave }: DockConfigModalProps) => {
 const [localConfig, setLocalConfig] = useState<DockConfig>(config);
 const [activeTab, setActiveTab] = useState<'organize' | 'expanded'>('organize');
 const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

 useEffect(() => {
 // Ensure expandedItems is always defined in local state for backward compatibility
 setLocalConfig({
 ...config,
 expandedItems: config.expandedItems || DEFAULT_DOCK_CONFIG.expandedItems
 });
 setReplacingIndex(null);
 }, [config, isOpen]);

 const handleToggleItem = (id: DockItemId) => {
 // En modo reemplazar, no agregamos/quitamos, solo sustituimos el slot seleccionado
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
 return;
 }
 };

 const handleReorderMainBar = (newOrder: DockItemId[]) => {
 setLocalConfig(prev => ({ ...prev, order: newOrder }));
 };

 const handleToggleExpandedItem = (id: DockItemId) => {
 if (id === 'ACHIEVEMENTS') return; // LEGACY cannot be removed
 
 setLocalConfig(prev => {
 const items = prev.expandedItems || DEFAULT_DOCK_CONFIG.expandedItems!;
 const isEnabled = items.includes(id);

 if (isEnabled) {
 return {
 ...prev,
 expandedItems: items.filter(i => i !== id)
 };
 } else {
 return {
 ...prev,
 expandedItems: [...items, id]
 };
 }
 });
 };

 const handleReorderExpanded = (newOrder: DockItemId[]) => {
 setLocalConfig(prev => ({ ...prev, expandedItems: newOrder }));
 };

 const handleSave = () => {
 // Automatically compute left/right based on order (first 2 left, next 2 right)
 const activeOrder = localConfig.order.slice(0, 4);

 const finalConfig: DockConfig = {
 ...localConfig,
 order: activeOrder,
 enabledItems: activeOrder
 };
 onSave(finalConfig);
 onClose();
 };

 const resetToDefault = () => {
 setLocalConfig(DEFAULT_DOCK_CONFIG);
 };

 if (!isOpen) return null;

 return createPortal(
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 bg-black/70 backdrop-blur-sm transform-gpu "
 onClick={onClose}
 />
 
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
 >
 <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
 <Settings2 size={16} />
 </div>
 <div>
 <h2 className="text-lg font-bold text-white tracking-tight">Dock Configuration</h2>
 <p className="text-[10px] text-white/40 uppercase tracking-wider">Organize your navigation</p>
 </div>
 </div>
 <button 
 onClick={onClose}
 className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 <div className="flex border-b border-white/5">
 <button
 onClick={() => setActiveTab('organize')}
 className={cn(
 "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
 activeTab === 'organize' ? 'text-white bg-white/5 border-b-2 border-indigo-500' : 'text-white/40 hover:text-white/60'
 )}
 >
 Dock Bar
 </button>
 <button
 onClick={() => setActiveTab('expanded')}
 className={cn(
 "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
 activeTab === 'expanded' ? 'text-white bg-white/5 border-b-2 border-indigo-500' : 'text-white/40 hover:text-white/60'
 )}
 >
 Plus Menu
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
 {activeTab === 'organize' && (
 <div className="space-y-4">
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
 <span>Active Items (drag to reorder)</span>
 <span className="text-indigo-400">4 / 4</span>
 </div>
 <Reorder.Group 
 axis="y" 
 values={localConfig.order.slice(0, 4)} 
 onReorder={handleReorderMainBar}
 className="space-y-2"
 >
 {localConfig.order.slice(0, 4).map((id, index) => {
 const item = DOCK_ITEMS.find(i => i.id === id)!;
 const Icon = item.icon;
 const isReplacing = replacingIndex === index;
 return (
 <Reorder.Item 
 key={`${id}-${index}`} 
 value={id}
 className={cn(
 "bg-white/5 border rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-colors select-none",
 item.isSystem && "opacity-60",
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
 {item.isSystem && (
 <span className="ml-2 text-[8px] text-white/30 uppercase">(Required)</span>
 )}
 {isReplacing && (
 <span className="block text-[9px] text-indigo-300">Select an item below to replace</span>
 )}
 </div>
 <div className={cn(
 "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
 index < 2 ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"
 )}>
 {index < 2 ? "L" : "R"}
 </div>
 {!item.isSystem && (
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
 )}
 </Reorder.Item>
 );
 })}
 </Reorder.Group>
 </div>

 <div className="space-y-2 pt-2">
 <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
 <span>Available Items to Replace</span>
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
 Reset to default
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
 <span>Plus Menu Items (drag to reorder)</span>
 <span className="text-indigo-400">{currentExpandedItems.length}</span>
 </div>
 <Reorder.Group 
 axis="y" 
 values={currentExpandedItems} 
 onReorder={handleReorderExpanded}
 className="space-y-2"
 >
 {currentExpandedItems.map((id) => {
 const item = DOCK_ITEMS.find(i => i.id === id)!;
 const Icon = item.icon;
 const isMandatory = id === 'ACHIEVEMENTS';
 return (
 <Reorder.Item 
 key={id} 
 value={id}
 className={cn(
 "bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors select-none",
 isMandatory && "opacity-80"
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
 <span className="text-sm font-bold text-white">{id === 'ACHIEVEMENTS' ? 'LEGACY' : (id === 'FOCUS' ? 'FOCUS (PROJECT)' : (id === 'HABITS' ? 'HABIT' : item.label))}</span>
 {isMandatory && (
 <span className="ml-2 text-[8px] text-white/30 uppercase">(Required)</span>
 )}
 </div>
 {!isMandatory && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleToggleExpandedItem(id);
 }}
 className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
 >
 <X size={12} />
 </button>
 )}
 </Reorder.Item>
 );
 })}
 </Reorder.Group>
 </div>

 <div className="space-y-2 pt-2">
 <div className="flex items-center justify-between text-xs text-white/40 uppercase tracking-wider px-1">
 <span>Available Items</span>
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
 <span className="text-xs font-bold text-white/60">{item.id === 'ACHIEVEMENTS' ? 'LEGACY' : (item.id === 'FOCUS' ? 'FOCUS (PROJECT)' : (item.id === 'HABITS' ? 'HABIT' : item.label))}</span>
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
 Reset to default
 </button>
 </div>
 );
 })()}

 {/* Removed assign tab code */}
 </div>

 <div className="p-4 border-t border-white/5 bg-white/5">
 <button
 onClick={handleSave}
 className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
 >
 <Check size={16} />
 Save Configuration
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 );
};
