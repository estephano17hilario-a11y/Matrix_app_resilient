import React from 'react';
import { motion } from 'framer-motion';
import { Skull, Coins, Heart, AlertTriangle } from 'lucide-react';
import { BadHabit } from '../../../types';

interface RelapseModalProps {
    isOpen: boolean;
    onClose: () => void;
    habit: BadHabit;
    onConfirm: (method: 'GOLD' | 'HP') => void;
    userGold: number;
    userHp: number;
}

export const RelapseModal: React.FC<RelapseModalProps> = ({
    isOpen,
    onClose,
    habit,
    onConfirm,
    userGold,
    userHp
}) => {
    if (!isOpen) return null;

    const { penalties } = habit;
    const canAffordGold = userGold >= penalties.gold;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-rose-950/80 backdrop-blur-md" 
                onClick={onClose}
            />

            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="relative w-full max-w-md bg-[#0a0a0a] border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="p-8 text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
                        <Skull className="text-rose-500" size={40} />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                            ¿Recaída Detectada?
                        </h2>
                        <p className="text-rose-200/60 font-medium">
                            Has roto el contrato de "{habit.title}".
                            <br/>
                            Debes pagar el precio.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Option 1: Gold */}
                        <button
                            onClick={() => onConfirm('GOLD')}
                            disabled={!canAffordGold}
                            className={`relative p-4 rounded-2xl border transition-all group ${
                                canAffordGold 
                                ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' 
                                : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            <div className="absolute top-2 right-2">
                                <Coins size={16} className={canAffordGold ? "text-amber-400" : "text-slate-500"} />
                            </div>
                            <div className="text-amber-400 font-black text-2xl mb-1">
                                {penalties.gold}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-amber-200/60 tracking-wider">
                                Pagar con Oro
                            </div>
                            {!canAffordGold && (
                                <div className="text-[10px] text-rose-400 mt-2 font-bold">Insuficiente</div>
                            )}
                        </button>

                        {/* Option 2: HP */}
                        <button
                            onClick={() => onConfirm('HP')}
                            className="relative p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all group"
                        >
                            <div className="absolute top-2 right-2">
                                <Heart size={16} className="text-rose-500" />
                            </div>
                            <div className="text-rose-500 font-black text-2xl mb-1">
                                -{penalties.hp}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-rose-200/60 tracking-wider">
                                Pagar con Sangre
                            </div>
                            <div className="text-[10px] text-rose-400 mt-2 font-medium">
                                + XP Loss (-{penalties.xp})
                            </div>
                        </button>
                    </div>

                    <button 
                        onClick={onClose}
                        className="text-white/40 text-sm hover:text-white transition-colors underline decoration-white/20"
                    >
                        Cancelar (Fue un error)
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
