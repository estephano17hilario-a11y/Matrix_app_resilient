import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, GripVertical, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ReorderItemBase {
 id: string;
 title: string;
 order?: number;
}

interface ReorderModalProps<T extends ReorderItemBase> {
 isOpen: boolean;
 onClose: () => void;
 items: T[];
 onSave: (items: T[]) => void;
 title: string;
 getItemColor?: (item: T) => string;
}

export const ReorderModal = <T extends ReorderItemBase>({ 
 isOpen, 
 onClose, 
 items, 
 onSave,
 title,
 getItemColor
}: ReorderModalProps<T>) => {
 const [orderedItems, setOrderedItems] = useState<T[]>(items);

 useEffect(() => {
 setOrderedItems(items);
 }, [items, isOpen]);

 const handleSave = () => {
 onSave(orderedItems);
 onClose();
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
 className="absolute inset-0 bg-black/60 backdrop-blur-sm "
 onClick={onClose}
 />
 
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-md overflow-hidden max-h-[80vh] flex flex-col"
 >
 {/* Header */}
 <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
 <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
 <button 
 onClick={onClose}
 className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 {/* List */}
 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
 <Reorder.Group 
 axis="y" 
 values={orderedItems} 
 onReorder={setOrderedItems}
 className="space-y-2"
 >
 {orderedItems.map((item) => {
 const color = getItemColor ? getItemColor(item) : undefined;
 return (
 <Reorder.Item 
 key={item.id} 
 value={item}
 className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors select-none relative overflow-hidden"
 whileDrag={{ scale: 1.05, boxShadow: "0 0 20px rgba(0,0,0,0.5)", zIndex: 50 }}
 >
 {color && (
 <div 
 className="absolute left-0 top-0 bottom-0 w-1 opacity-80" 
 style={{ backgroundColor: color }}
 />
 )}
 <div className="text-white/30 pl-1">
 <GripVertical size={18} />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
 </div>
 </Reorder.Item>
 );
 })}
 </Reorder.Group>
 </div>

 {/* Footer */}
 <div className="p-4 border-t border-white/5 bg-white/5 flex gap-3">
 <button 
 onClick={onClose}
 className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 transition-colors"
 >
 Cancel
 </button>
 <button 
 onClick={handleSave}
 className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
 >
 <Check size={16} />
 Save Order
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 );
};
