import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Flame, Check, Coins, Calendar, X, AlertCircle } from 'lucide-react';
import { Habit, Project } from '../../../types';
import { toast } from 'react-hot-toast';

interface StreakRecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userGold: number;
    userStats: any;
    habits: Habit[];
    projects: Project[];
    onRestore: (category: 'HUD' | 'FLAME' | 'HABIT' | 'PROJECT', targetId?: string, cost?: number, streakValue?: number) => Promise<boolean>;
}

export const StreakRecoveryModal: React.FC<StreakRecoveryModalProps> = ({
    isOpen,
    onClose,
    userGold,
    userStats,
    habits,
    projects,
    onRestore
}) => {
    const [selectedCategory, setSelectedCategory] = useState<'HUD' | 'FLAME' | 'HABIT' | 'PROJECT' | null>(null);
    const [selectedItem, setSelectedItem] = useState<Habit | Project | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // Helper to check if a timestamp/iso string is within 3 days (72 hours)
    const isWithin3Days = (dateStr?: string | number): boolean => {
        if (!dateStr) return true; // Default allow if date untracked
        const dateMs = typeof dateStr === 'number' ? dateStr : new Date(dateStr).getTime();
        if (isNaN(dateMs)) return true;
        const nowMs = Date.now();
        const diffHours = (nowMs - dateMs) / (1000 * 60 * 60);
        return diffHours <= 72;
    };

    // Calculate lost streak values
    const hudLostStreak = userStats?.previousStreak || userStats?.longestStreak || 0;
    const hudLastLostDate = userStats?.lastStreakDate || userStats?.lastUpdatedDate;
    const hudEligible = (hudLostStreak > 0) && isWithin3Days(hudLastLostDate);

    const flameLostStreak = userStats?.previousFlameStreak || userStats?.flameStreak || 0;
    const flameLastLostDate = userStats?.lastFlameStreakDate;
    const flameEligible = (flameLostStreak > 0) && isWithin3Days(flameLastLostDate);

    const handleConfirmRestore = async () => {
        if (isSubmitting) return;

        let cost = 0;
        let streakValue = 0;
        let targetId: string | undefined = undefined;

        if (selectedCategory === 'HUD') {
            cost = 5000;
            streakValue = hudLostStreak;
        } else if (selectedCategory === 'FLAME') {
            cost = 3000;
            streakValue = flameLostStreak;
        } else if (selectedCategory === 'HABIT') {
            cost = 1800;
            if (!selectedItem) {
                toast.error('Selecciona un hábito para restaurar racha');
                return;
            }
            targetId = selectedItem.id;
            streakValue = (selectedItem as any).previousStreak || 1;
        } else if (selectedCategory === 'PROJECT') {
            cost = 1800;
            if (!selectedItem) {
                toast.error('Selecciona un proyecto para restaurar racha');
                return;
            }
            targetId = selectedItem.id;
            streakValue = (selectedItem as any).previousStreak || 1;
        }

        if (userGold < cost) {
            toast.error(`Necesitas ${cost} de oro. Tienes ${userGold}.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const ok = await onRestore(selectedCategory!, targetId, cost, streakValue);
            if (ok) {
                toast.success('¡Racha restaurada exitosamente!');
                onClose();
            }
        } catch (err: any) {
            toast.error(err.message || 'Error al restaurar racha');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[#16161e] border border-amber-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                <ShieldAlert size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">Restaurar Racha</h2>
                                <p className="text-[11px] text-white/50">Plazo máximo: 3 días posteriores a perderla</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-xl">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Category Selection Grid */}
                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 scrollbar-hide">
                        <div className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider">
                            Selecciona la racha a reactivar:
                        </div>

                        {/* 1. HUD STREAK */}
                        <div
                            onClick={() => {
                                setSelectedCategory('HUD');
                                setSelectedItem(null);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                selectedCategory === 'HUD'
                                    ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Flame className="text-orange-400" size={20} />
                                    <div>
                                        <div className="text-sm font-bold text-white">Racha del HUD (Matrix)</div>
                                        <div className="text-[11px] text-white/50">
                                            Racha a restaurar: <span className="text-amber-400 font-bold">{hudLostStreak} días</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-amber-300 font-black text-xs">
                                    <Coins size={12} />
                                    <span>5,000</span>
                                </div>
                            </div>
                            {!hudEligible && (
                                <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                                    <AlertCircle size={10} /> Plazo de 3 días vencido o no hay racha previa registrada
                                </div>
                            )}
                        </div>

                        {/* 2. FLAME PATH STREAK */}
                        <div
                            onClick={() => {
                                setSelectedCategory('FLAME');
                                setSelectedItem(null);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                selectedCategory === 'FLAME'
                                    ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Flame className="text-amber-400" size={20} />
                                    <div>
                                        <div className="text-sm font-bold text-white">Camino de la Llama</div>
                                        <div className="text-[11px] text-white/50">
                                            Racha a restaurar: <span className="text-amber-400 font-bold">{flameLostStreak} días</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-amber-300 font-black text-xs">
                                    <Coins size={12} />
                                    <span>3,000</span>
                                </div>
                            </div>
                            {!flameEligible && (
                                <div className="mt-2 text-[10px] text-amber-400/60 flex items-center gap-1">
                                    <AlertCircle size={10} /> Se restaurará a tu última racha previa
                                </div>
                            )}
                        </div>

                        {/* 3. HABIT STREAK */}
                        <div
                            onClick={() => setSelectedCategory('HABIT')}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                selectedCategory === 'HABIT'
                                    ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-cyan-400" size={20} />
                                    <div>
                                        <div className="text-sm font-bold text-white">Racha de un Hábito</div>
                                        <div className="text-[11px] text-white/50">Elige cuál hábito restaurar</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-amber-300 font-black text-xs">
                                    <Coins size={12} />
                                    <span>1,800</span>
                                </div>
                            </div>

                            {/* Habit Picker Sub-List */}
                            {selectedCategory === 'HABIT' && (
                                <div className="mt-3 space-y-2 pt-2 border-t border-white/10">
                                    {habits.length > 0 ? (
                                        habits.map(h => {
                                            const prevStreak = (h as any).previousStreak || 1;
                                            const isSelected = selectedItem?.id === h.id;
                                            return (
                                                <div
                                                    key={h.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItem(h);
                                                    }}
                                                    className={`p-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${
                                                        isSelected
                                                            ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                                                            : 'bg-black/30 border-white/10 text-white/80 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <span className="font-bold truncate max-w-[180px]">{h.title}</span>
                                                    <span className="font-mono text-amber-400 font-bold">Racha previa: {prevStreak} días</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-white/40 italic">No hay hábitos disponibles</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. PROJECT STREAK */}
                        <div
                            onClick={() => setSelectedCategory('PROJECT')}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                selectedCategory === 'PROJECT'
                                    ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Flame className="text-indigo-400" size={20} />
                                    <div>
                                        <div className="text-sm font-bold text-white">Racha de un Proyecto</div>
                                        <div className="text-[11px] text-white/50">Elige cuál proyecto restaurar</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full text-amber-300 font-black text-xs">
                                    <Coins size={12} />
                                    <span>1,800</span>
                                </div>
                            </div>

                            {/* Project Picker Sub-List */}
                            {selectedCategory === 'PROJECT' && (
                                <div className="mt-3 space-y-2 pt-2 border-t border-white/10">
                                    {projects.length > 0 ? (
                                        projects.map(p => {
                                            const prevStreak = (p as any).previousStreak || 1;
                                            const isSelected = selectedItem?.id === p.id;
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItem(p);
                                                    }}
                                                    className={`p-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${
                                                        isSelected
                                                            ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                                                            : 'bg-black/30 border-white/10 text-white/80 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <span className="font-bold truncate max-w-[180px]">{p.title}</span>
                                                    <span className="font-mono text-amber-400 font-bold">Racha previa: {prevStreak} días</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-white/40 italic">No hay proyectos disponibles</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-white/10 flex gap-3 mt-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmRestore}
                            disabled={!selectedCategory || isSubmitting}
                            className={`flex-1 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg ${
                                selectedCategory && !isSubmitting
                                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check size={16} /> Restaurar Ahora
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
