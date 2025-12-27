import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Clock, ShieldAlert, Skull } from 'lucide-react';
import { Attribute, BadHabit } from '../../../types';

interface BadHabitWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<BadHabit>) => void;
    attributes: Attribute[];
}

// --- AURORA BACKGROUND COMPONENT ---
const AuroraBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[120px] animate-pulse-slow delay-2000" />
    </div>
);

// --- SPRING CONFIG ---
const springTransition = { type: "spring" as const, stiffness: 300, damping: 30, mass: 1 };

export const BadHabitWizard: React.FC<BadHabitWizardProps> = ({
    isOpen,
    onClose,
    onConfirm,
    attributes
}) => {
    const [step, setStep] = useState(1); // 1: Identity, 2: Reason, 3: Cost & Calculation
    
    // Form Data
    const [title, setTitle] = useState('');
    const [attribute, setAttribute] = useState('');
    const [reason, setReason] = useState('');
    const [negativeImpact, setNegativeImpact] = useState('');
    const [timeConsumed, setTimeConsumed] = useState(0);

    // Calculated Penalties
    const [penalties, setPenalties] = useState({ hp: 0, xp: 0, gold: 0 });

    useEffect(() => {
        if (!isOpen) {
            // Reset form
            setStep(1);
            setTitle('');
            setAttribute('');
            setReason('');
            setNegativeImpact('');
            setTimeConsumed(0);
        }
    }, [isOpen]);

    useEffect(() => {
        // Calculate Penalties Logic
        const baseHp = 10;
        const timePenalty = Math.floor(timeConsumed / 10);
        const totalHp = baseHp + timePenalty;
        
        // XP Penalty increases significantly with time to discourage long bad habits
        const totalXp = 50 + (timeConsumed * 2); 
        
        // Gold cost is high to make "paying it off" a luxury
        const goldCost = totalXp * 2;

        setPenalties({
            hp: totalHp,
            xp: totalXp,
            gold: goldCost
        });
    }, [timeConsumed]);

    const handleConfirm = () => {
        onConfirm({
            title,
            attribute,
            reason,
            negativeImpact,
            timeConsumed,
            penalties
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#020204]/90 backdrop-blur-md" 
                onClick={onClose}
            />

            {/* Main Modal - "Sentient Glass" */}
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                transition={springTransition}
                className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.15)]"
            >
                {/* Glass Layer */}
                <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-lg" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                
                <AuroraBackground />

                {/* Content Container */}
                <div className="relative p-8 flex flex-col h-full min-h-[500px]">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <motion.h2 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-3xl font-bold text-white tracking-tight drop-shadow-md"
                            >
                                Protocolo de Purga
                            </motion.h2>
                            <p className="text-white/60 font-medium mt-1">Identifica y neutraliza la anomalía.</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex gap-2 mb-8">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                        ))}
                    </div>

                    {/* Steps */}
                    <div className="flex-1">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div 
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={springTransition}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-indigo-300 ml-1">NOMBRE DE LA ANOMALÍA</label>
                                        <input 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Ej: Scroll Infinito, Fumar, Procrastinar..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-inner"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-indigo-300 ml-1">SISTEMA AFECTADO (RASGO)</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {attributes.map(attr => (
                                                <button
                                                    key={attr.id}
                                                    onClick={() => setAttribute(attr.id)}
                                                    className={`relative group overflow-hidden p-4 rounded-2xl border text-left transition-all ${
                                                        attribute === attr.id 
                                                        ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${attribute === attr.id ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60'}`}>
                                                            {/* Assuming Icon is component or we use generic */}
                                                            <Zap size={18} />
                                                        </div>
                                                        <span className={`font-bold ${attribute === attr.id ? 'text-white' : 'text-white/60'}`}>
                                                            {attr.label}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div 
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={springTransition}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-indigo-300 ml-1">RAZÓN DE PURGA</label>
                                        <textarea 
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="¿Por qué debes eliminar esto de tu sistema?"
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none shadow-inner"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-rose-300 ml-1">IMPACTO EN TU VIDA</label>
                                        <textarea 
                                            value={negativeImpact}
                                            onChange={(e) => setNegativeImpact(e.target.value)}
                                            placeholder="Describe el daño que causa..."
                                            className="w-full h-32 bg-rose-900/10 border border-rose-500/20 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:bg-rose-900/20 focus:ring-2 focus:ring-rose-500/30 transition-all resize-none shadow-inner"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div 
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={springTransition}
                                    className="space-y-8"
                                >
                                    <div className="space-y-4">
                                        <label className="text-sm font-medium text-indigo-300 ml-1 uppercase tracking-wider">Tiempo Perdido por Incidente</label>
                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-6">
                                            <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400">
                                                <Clock size={32} />
                                            </div>
                                            <div className="flex-1">
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="240" 
                                                    step="5"
                                                    value={timeConsumed}
                                                    onChange={(e) => setTimeConsumed(Number(e.target.value))}
                                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                />
                                                <div className="flex justify-between mt-2 text-xs text-white/40 font-mono">
                                                    <span>0m</span>
                                                    <span>120m</span>
                                                    <span>240m+</span>
                                                </div>
                                            </div>
                                            <div className="w-24 text-right">
                                                <span className="text-3xl font-mono font-bold text-white">{timeConsumed}</span>
                                                <span className="text-sm text-white/60 ml-1">min</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* The Calculation Result */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-medium text-rose-300 ml-1 uppercase tracking-wider flex items-center gap-2">
                                            <ShieldAlert size={14} />
                                            Análisis de Consecuencias
                                        </label>
                                        
                                        <div className="grid grid-cols-3 gap-4">
                                            {/* HP Penalty */}
                                            <motion.div 
                                                className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors" />
                                                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">HP Damage</span>
                                                <span className="text-3xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                                                    -{penalties.hp}
                                                </span>
                                            </motion.div>

                                            {/* XP Penalty */}
                                            <motion.div 
                                                className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">XP Loss</span>
                                                <span className="text-3xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                                                    -{penalties.xp}
                                                </span>
                                            </motion.div>

                                            {/* Gold Cost */}
                                            <motion.div 
                                                className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
                                                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Bail Cost</span>
                                                <span className="text-3xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                                    {penalties.gold}
                                                </span>
                                            </motion.div>
                                        </div>
                                        <p className="text-center text-xs text-white/40 italic">
                                            "El precio de la libertad es la vigilancia eterna."
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer / Navigation */}
                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/5">
                        {step > 1 && (
                            <button 
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-3 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
                            >
                                Atrás
                            </button>
                        )}
                        
                        {step < 3 ? (
                            <button 
                                onClick={() => {
                                    if (step === 1 && (!title || !attribute)) return;
                                    if (step === 2 && (!reason || !negativeImpact)) return;
                                    setStep(step + 1);
                                }}
                                disabled={
                                    (step === 1 && (!title || !attribute)) ||
                                    (step === 2 && (!reason || !negativeImpact))
                                }
                                className="px-8 py-3 bg-white text-black rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                Siguiente
                            </button>
                        ) : (
                            <button 
                                onClick={handleConfirm}
                                className="relative group overflow-hidden px-10 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full font-bold text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] hover:scale-105 active:scale-95 transition-all"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <Skull size={18} />
                                    Inicializar Protocolo
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

