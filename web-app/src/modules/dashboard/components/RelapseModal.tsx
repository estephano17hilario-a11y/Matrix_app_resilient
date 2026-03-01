import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Skull, Coins, Heart, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BadHabit } from '../../../types';

interface RelapseModalProps {
    isOpen: boolean;
    onClose: () => void;
    habit: BadHabit;
    onConfirm: (method: 'GOLD' | 'HP') => void;
    userGold: number;
}

const AuroraBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-rose-600/20 rounded-full blur-lg animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-red-900/20 rounded-full blur-lg animate-pulse-slow delay-1000" />
    </div>
);

export const RelapseModal: React.FC<RelapseModalProps> = ({
    isOpen,
    onClose,
    habit,
    onConfirm,
    userGold
}) => {
    if (!isOpen) return null;

    if (typeof document === 'undefined') return null;

    const { penalties } = habit;
    const canAffordGold = userGold >= penalties.gold;

    return createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#020204]/90" 
                onClick={onClose}
            />

            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-rose-500/20 shadow-[0_20px_50px_-12px_rgba(225,29,72,0.3)]"
            >
                {/* Glass Layer */}
                <div className="absolute inset-0 bg-gray-900/60" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-70 pointer-events-none" />
                <AuroraBackground />

                <div className="relative p-8 text-center space-y-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-rose-500/20 to-red-900/20 rounded-full flex items-center justify-center border border-rose-500/30 shadow-[0_0_30px_rgba(225,29,72,0.3)] relative">
                        <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20" />
                        <Skull className="text-rose-500 drop-shadow-[0_0_10px_rgba(225,29,72,0.8)]" size={40} />
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight mb-2 drop-shadow-md">
                            Fallo en Protocolo
                        </h2>
                        <p className="text-rose-200/80 font-medium text-lg">
                            Has sucumbido a "{habit.title}".
                        </p>
                        <p className="text-white/40 text-sm mt-1">
                            El sistema exige una compensación.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Option 1: Gold */}
                        <button
                            onClick={() => onConfirm('GOLD')}
                            disabled={!canAffordGold}
                            className={`relative p-5 rounded-2xl border transition-all group overflow-hidden ${
                                canAffordGold 
                                ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-500/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                                : 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed grayscale'
                            }`}
                        >
                            <div className="absolute top-3 right-3">
                                <Coins size={18} className={canAffordGold ? "text-amber-400" : "text-slate-500"} />
                            </div>
                            <div className="text-amber-400 font-black text-3xl mb-1 tracking-tight">
                                {penalties.gold}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-amber-200/60 tracking-wider mb-2">
                                Soborno (Gold)
                            </div>
                            
                            {canAffordGold ? (
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                    <ShieldCheck size={10} />
                                    NO DAMAGE
                                </div>
                            ) : (
                                <div className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded-full inline-block">
                                    INSUFICIENTE
                                </div>
                            )}
                        </button>

                        {/* Option 2: HP */}
                        <button
                            onClick={() => onConfirm('HP')}
                            className="relative p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 hover:scale-[1.02] transition-all group hover:shadow-[0_0_20px_rgba(225,29,72,0.2)]"
                        >
                            <div className="absolute top-3 right-3">
                                <Heart size={18} className="text-rose-500" />
                            </div>
                            <div className="text-rose-500 font-black text-3xl mb-1 tracking-tight">
                                -{penalties.hp}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-rose-200/60 tracking-wider mb-2">
                                Sacrificio (HP)
                            </div>
                            
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
                                <AlertTriangle size={10} />
                                -{penalties.xp} XP LOSS
                            </div>
                        </button>
                    </div>

                    <button 
                        onClick={onClose}
                        className="text-white/30 text-xs hover:text-white transition-colors py-2 px-4 rounded-full hover:bg-white/5"
                    >
                        Cancelar (Falsa Alarma)
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

