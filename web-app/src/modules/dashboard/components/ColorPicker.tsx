import { useState } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

interface ColorPickerProps {
    selectedColor: string | undefined;
    onSelectColor: (color: string | undefined) => void;
    onToggle?: (isOpen: boolean) => void;
}

const COLOR_PALETTE = {
    'Rojos': ['#ef4444', '#f87171', '#dc2626', '#b91c1c', '#991b1b'],
    'Rosas': ['#ec4899', '#f472b6', '#db2777', '#be185d', '#831843'],
    'Naranjas': ['#f97316', '#fb923c', '#ea580c', '#c2410c', '#7c2d12'],
    'Amarillos': ['#eab308', '#facc15', '#ca8a04', '#a16207', '#713f12'],
    'Marrones': ['#78350f', '#92400e', '#b45309', '#d97706', '#5d4037', '#795548', '#8d6e63', '#a1887f', '#4e342e'],
    'Verdes': ['#22c55e', '#4ade80', '#16a34a', '#15803d', '#14532d', '#84cc16', '#65a30d', '#3f6212'],
    'Cianes': ['#06b6d4', '#22d3ee', '#0891b2', '#0e7490', '#155e75', '#38bdf8', '#0ea5e9', '#0284c7'],
    'Azules': ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af', '#6366f1', '#818cf8', '#4f46e5'],
    'Violetas': ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#5b21b6', '#d946ef', '#e879f9', '#c026d3'],
    'Grises': ['#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b']
};

export const ColorPicker = ({ selectedColor, onSelectColor, onToggle }: ColorPickerProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/30 uppercase pl-1">{t('habits.customizationOptional', 'Customization (Optional)')}</span>
                {selectedColor && (
                    <button 
                        onClick={() => { onSelectColor(undefined); setIsOpen(false); onToggle?.(false); }}
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* Trigger Button */}
            <button
                onClick={() => {
                    const newState = !isOpen;
                    setIsOpen(newState);
                    onToggle?.(newState);
                }}
                className={cn(
                    "w-full h-14 rounded-xl border flex items-center justify-between px-4 transition-all relative group",
                    selectedColor || isOpen ? "bg-white/5 border-white/10" : "bg-black/20 border-dashed border-white/10 hover:border-white/30"
                )}
            >
                <div className="flex items-center gap-4">
                    <div 
                        className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            selectedColor ? "border border-white/5" : "bg-white/5 text-white/20"
                        )}
                        style={selectedColor ? { backgroundColor: selectedColor } : undefined}
                    >
                        {!selectedColor && <Palette size={20} />}
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                        <span className={cn("text-sm font-bold", selectedColor ? "text-white" : "text-white/30")}>
                            {selectedColor ? t('common.colorSelected', 'Color Selected') : t('common.selectColor', 'Select Color')}
                        </span>
                        <span className="text-[10px] text-white/40 font-medium">
                            {selectedColor ? t('common.clickToChange', 'Click to change') : t('common.customizeColor', 'Customize project color')}
                        </span>
                    </div>
                </div>
                <ChevronDown size={18} className={cn("text-white/30 transition-transform", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className="relative z-10"
                    >
                        <div className="p-4 bg-[#151516] rounded-2xl border border-white/10 shadow-md space-y-4 mt-2">
                            <div className="h-[250px] overflow-y-auto p-1 space-y-6 no-scrollbar">
                                {Object.entries(COLOR_PALETTE).map(([groupName, colors]) => (
                                    <div key={groupName} className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">{t(`habits.categories.${groupName.toLowerCase()}`, groupName)}</h4>
                                        <div className="grid grid-cols-8 gap-2">
                                            {colors.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => onSelectColor(color)}
                                                    className={cn(
                                                        "w-full aspect-square rounded-full transition-all hover:scale-110 flex items-center justify-center",
                                                        selectedColor === color ? "ring-2 ring-white scale-110 z-10" : "opacity-70 hover:opacity-100"
                                                    )}
                                                    style={{ 
                                                        background: color, 
                                                        boxShadow: selectedColor === color ? `0 0 15px ${color}80` : 'none' 
                                                    }}
                                                >
                                                    {selectedColor === color && <Check size={12} className="text-white drop-shadow-md" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};