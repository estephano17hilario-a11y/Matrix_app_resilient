import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShieldAlert, Skull, ChevronRight, ChevronLeft, AlertTriangle, Flame } from 'lucide-react';
import { Attribute, BadHabit } from '../../../types';

interface BadHabitWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<BadHabit>) => void;
    attributes: Attribute[];
}

// --- OPTIMIZED AURORA BACKGROUND (Zero Cost) ---
// Uses radial gradients instead of CSS Blur filters for 60 FPS
const AmbientBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,_rgba(99,102,241,0.15)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,_rgba(244,63,94,0.15)_0%,_transparent_50%)]" />
    </div>
);

// --- SPRING CONFIGURATION (iOS "Fluid" Physics) ---
const springConfig = { type: "spring" as const, stiffness: 400, damping: 30, mass: 1 };
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 20 : -20, // Reduced distance for faster feel
        opacity: 0,
        scale: 0.99
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 20 : -20,
        opacity: 0,
        scale: 0.99
    })
};

export const BadHabitWizard: React.FC<BadHabitWizardProps> = ({
    isOpen,
    onClose,
    onConfirm,
    attributes
}) => {
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(0);
    
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
            const timer = setTimeout(() => {
                setStep(1);
                setTitle('');
                setAttribute('');
                setReason('');
                setNegativeImpact('');
                setTimeConsumed(0);
                setDirection(0);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        const timePenalty = Math.floor(timeConsumed / 10);
        const totalHp = 10 + timePenalty;
        const totalXp = 50 + (timeConsumed * 2);
        const goldCost = totalXp * 2;
        setPenalties({ hp: totalHp, xp: totalXp, gold: goldCost });
    }, [timeConsumed]);

    const handleNext = () => {
        if (step < 3) {
            setDirection(1);
            setStep(s => s + 1);
        } else {
            handleConfirm();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setDirection(-1);
            setStep(s => s - 1);
        }
    };

    const handleConfirm = () => {
        // Dopamine Trigger could go here (Haptic/Sound)
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

    const isStepValid = () => {
        if (step === 1) return title.length > 2 && attribute;
        if (step === 2) return reason.length > 5;
        return true;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 font-sans">
                    {/* 1. BACKDROP - Optimized: Reduced Opacity, No Blur needed if BG is dark enough */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-[#050505]/60 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* 2. MODAL - "Sentient Glass" */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={springConfig}
                        className="relative w-full max-w-lg bg-[#0f0f11] rounded-[32px] shadow-2xl overflow-hidden border border-white/10 ring-1 ring-white/5"
                    >
                        {/* Fake Glass Highlights */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-100" />
                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
                        <AmbientBackground />

                        <div className="relative flex flex-col min-h-[580px]">
                            
                            {/* Header - Apple Style */}
                            <div className="px-8 pt-8 pb-2 flex justify-between items-center z-10">
                                <div>
                                    <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 mb-1"
                                    >
                                        <div className="p-1 bg-rose-500/20 rounded-md">
                                            <Skull size={14} className="text-rose-400" />
                                        </div>
                                        <span className="text-xs font-bold text-rose-400 tracking-wider uppercase">Protocolo de Purga</span>
                                    </motion.div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">
                                        {step === 1 && "Identificar Anomalía"}
                                        {step === 2 && "Diagnóstico del Fallo"}
                                        {step === 3 && "Ejecutar Eliminación"}
                                    </h2>
                                </div>
                                <motion.button 
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose} 
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors border border-white/5"
                                >
                                    <X size={18} />
                                </motion.button>
                            </div>

                            {/* Minimal Progress */}
                            <div className="px-8 mt-4 mb-8">
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden flex">
                                    <motion.div 
                                        initial={{ width: "33%" }}
                                        animate={{ width: `${(step / 3) * 100}%` }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                    />
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 px-8 relative overflow-hidden">
                                <AnimatePresence initial={false} custom={direction} mode="wait">
                                    {step === 1 && (
                                        <motion.div
                                            key="step1"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={springConfig}
                                            className="space-y-8 h-full"
                                        >
                                            <div className="space-y-4">
                                                <label className="text-sm font-medium text-white/60 ml-1">
                                                    ¿Qué hábito deseas eliminar?
                                                </label>
                                                <div className="relative group">
                                                    <input 
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        placeholder="Ej: Fumar, TikTok..."
                                                        className="w-full bg-transparent border-b-2 border-white/10 px-2 py-4 text-3xl font-bold text-white placeholder-white/10 focus:outline-none focus:border-rose-500 transition-colors"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-sm font-medium text-white/60 ml-1">
                                                    Afecta a tu atributo:
                                                </label>
                                                <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {attributes.map(attr => (
                                                        <motion.button
                                                            key={attr.id}
                                                            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => setAttribute(attr.id)}
                                                            className={`relative p-4 rounded-xl border text-left transition-all duration-200 group ${
                                                                attribute === attr.id 
                                                                ? 'bg-rose-500/10 border-rose-500/50 ring-1 ring-rose-500/20' 
                                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg transition-colors ${attribute === attr.id ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 text-white/40 group-hover:bg-white/10'}`}>
                                                                    <Zap size={18} />
                                                                </div>
                                                                <span className={`text-sm font-medium ${attribute === attr.id ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                                                                    {attr.label}
                                                                </span>
                                                            </div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div
                                            key="step2"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={springConfig}
                                            className="space-y-6 h-full"
                                        >
                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-white/60 ml-1">
                                                    ¿Por qué quieres dejarlo?
                                                </label>
                                                <textarea 
                                                    value={reason}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    placeholder="Escribe tu razón principal..."
                                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all resize-none"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-rose-400 ml-1 flex items-center gap-2">
                                                    <AlertTriangle size={14} />
                                                    Impacto Negativo (Visualízalo)
                                                </label>
                                                <textarea 
                                                    value={negativeImpact}
                                                    onChange={(e) => setNegativeImpact(e.target.value)}
                                                    placeholder="¿Qué pasará si no te detienes?"
                                                    className="w-full h-32 bg-rose-500/5 border border-rose-500/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:bg-rose-500/10 focus:border-rose-500/30 transition-all resize-none"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div
                                            key="step3"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={springConfig}
                                            className="h-full flex flex-col"
                                        >
                                            <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-6 mb-6">
                                                <h3 className="text-lg font-semibold text-rose-200 mb-4 flex items-center gap-2">
                                                    <Flame className="text-rose-500" size={20} />
                                                    Penalización por Recaída
                                                </h3>
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-white/60">Tiempo perdido por sesión</span>
                                                            <span className="text-white font-mono">{timeConsumed} min</span>
                                                        </div>
                                                        <input 
                                                            type="range" 
                                                            min="0" 
                                                            max="120" 
                                                            step="5"
                                                            value={timeConsumed}
                                                            onChange={(e) => setTimeConsumed(parseInt(e.target.value))}
                                                            className="w-full accent-rose-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                                                            <div className="text-xs text-white/40 mb-1">Daño HP</div>
                                                            <div className="text-xl font-bold text-rose-500">-{penalties.hp}</div>
                                                        </div>
                                                        <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                                                            <div className="text-xs text-white/40 mb-1">Pérdida XP</div>
                                                            <div className="text-xl font-bold text-orange-500">-{penalties.xp}</div>
                                                        </div>
                                                        <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                                                            <div className="text-xs text-white/40 mb-1">Costo Oro</div>
                                                            <div className="text-xl font-bold text-yellow-500">-{penalties.gold}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center space-y-2 mt-auto mb-4">
                                                <p className="text-sm text-white/40">
                                                    "La única forma de ganar es no jugar."
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Footer / Navigation */}
                            <div className="p-8 pt-4 flex justify-between items-center bg-gradient-to-t from-[#0f0f11] to-transparent">
                                {step > 1 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleBack}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                        <span className="font-medium">Atrás</span>
                                    </motion.button>
                                ) : <div />}

                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(244,63,94,0.3)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleNext}
                                    disabled={!isStepValid()}
                                    className={`
                                        flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
                                        ${isStepValid() 
                                            ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-rose-900/20' 
                                            : 'bg-white/10 text-white/20 cursor-not-allowed'}
                                    `}
                                >
                                    <span>{step === 3 ? 'Activar Protocolo' : 'Continuar'}</span>
                                    {step < 3 && <ChevronRight size={20} />}
                                    {step === 3 && <ShieldAlert size={20} />}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
