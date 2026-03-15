import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShieldAlert, Skull, ChevronRight, ChevronLeft, AlertTriangle, Flame } from 'lucide-react';
import { Attribute, BadHabit } from '../../../types';
import { useTranslation } from 'react-i18next';

interface BadHabitWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<BadHabit>) => void;
    attributes: Attribute[];
    isFirstIdentify?: boolean;
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
    attributes,
    isFirstIdentify
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(0);
    
    // Form Data
    const [title, setTitle] = useState('');
    const [attribute, setAttribute] = useState('');
    const [reason, setReason] = useState('');
    const [impactLevel, setImpactLevel] = useState(3);
    const [timeIndex, setTimeIndex] = useState(4); // Default to 1 hour (index 4 -> 60min)
    const [inputMode, setInputMode] = useState<'LIST' | 'CUSTOM'>('CUSTOM');
    const [viceList, setViceList] = useState<string[]>([
        'Procrastinación',
        'Redes sociales',
        'Pornografía',
        'Azúcar',
        'Comida chatarra',
        'Tabaco',
        'Alcohol',
        'Videojuegos',
        'Compras impulsivas',
        'Desvelarse'
    ]);
    const [listDraft, setListDraft] = useState('');

    // Calculated Penalties
    const [penalties, setPenalties] = useState({ hp: 0, xp: 0, gold: 0 });

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setStep(1);
                setTitle('');
                setAttribute('');
                setReason('');
                setImpactLevel(3);
                setTimeIndex(4);
                setDirection(0);
            }, 300);
            return () => clearTimeout(timer);
        }
        setInputMode(isFirstIdentify ? 'LIST' : 'CUSTOM');
        setViceList([
            'Procrastinación',
            'Redes sociales',
            'Pornografía',
            'Azúcar',
            'Comida chatarra',
            'Tabaco',
            'Alcohol',
            'Videojuegos',
            'Compras impulsivas',
            'Desvelarse'
        ]);
        setListDraft('');
    }, [isOpen, isFirstIdentify]);

    const getMinutesFromIndex = (index: number) => {
        if (index <= 8) return (index + 1) * 15; // 15, 30, 45, 60, 75, 90, 105, 120, 135
        // After 135 (index 8), we want to jump to hours?
        // User requested: 15 min increments up to 2 hours (120 min).
        // Then 1 hour increments up to 12 hours.
        
        // 0 -> 15
        // 1 -> 30
        // ...
        // 7 -> 120 (2h)
        
        if (index <= 7) return (index + 1) * 15;
        
        // Index 8 starts at 3 hours? Or 2h + 1h = 3h?
        // 8 -> 180 (3h)
        // ...
        // 17 -> 720 (12h)
        return 120 + ((index - 7) * 60);
    };

    const minutes = getMinutesFromIndex(timeIndex);

    useEffect(() => {
        // Penalty Formula
        // Impact Level: 1-5
        // Time: minutes
        
        const timeMultiplier = Math.max(1, minutes / 30);
        
        // HP Damage: Base + (Impact * TimeFactor)
        // Ex: Impact 3, 60min (Factor 2) -> 5 + (3 * 2) = 11 HP
        // Ex: Impact 5, 120min (Factor 4) -> 5 + (5 * 4) = 25 HP
        const totalHp = Math.floor(5 + (impactLevel * timeMultiplier));
        
        // XP Loss: Base + (Minutes * Impact)
        // Ex: 60min * 3 = 180 XP
        const totalXp = Math.floor(50 + (minutes * (1 + impactLevel * 0.2)));
        
        // Gold Cost
        const goldCost = Math.floor(totalXp * 1.5);
        
        setPenalties({ hp: totalHp, xp: totalXp, gold: goldCost });
    }, [timeIndex, impactLevel]);

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
            negativeImpact: `Nivel de Impacto: ${impactLevel}/5`, // Storing level in description for now or could add new field
            timeConsumed: minutes,
            penalties
        });
        onClose();
    };

    const handleAddListItems = () => {
        const items = listDraft
            .split(/[\n,]+/)
            .map(item => item.trim())
            .filter(Boolean);
        if (items.length === 0) return;
        setViceList(prev => {
            const existing = new Set(prev.map(item => item.toLowerCase()));
            const merged = [...prev];
            items.forEach(item => {
                if (!existing.has(item.toLowerCase())) merged.push(item);
            });
            return merged;
        });
        setListDraft('');
    };

    const isStepValid = () => {
        if (step === 1) return title.length > 2 && attribute;
        if (step === 2) return reason.length > 5;
        return true;
    };

    if (!isOpen) return null;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 font-sans">
                    {/* 1. BACKDROP - Optimized: Reduced Opacity, No Blur needed if BG is dark enough */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-[#050505]/70"
                        onClick={onClose}
                    />

                    {/* 2. MODAL - "Sentient Glass" */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={springConfig}
                        className="relative w-full max-w-lg bg-[#0f0f11] rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-white/10 ring-1 ring-white/5 max-h-[90vh] flex flex-col"
                    >
                        {/* Fake Glass Highlights */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-100" />
                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
                        <AmbientBackground />

                        <div className="relative flex flex-col h-full overflow-hidden">
                            
                            {/* Header - Apple Style */}
                            <div className="px-5 pt-5 pb-2 sm:px-8 sm:pt-8 flex justify-between items-center z-10 shrink-0">
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
                            <div className="px-5 sm:px-8 mt-3 mb-4 shrink-0">
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
                            <div className="flex-1 px-5 sm:px-8 relative overflow-hidden min-h-0">
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
                                            className="space-y-4 sm:space-y-8 h-full overflow-y-auto custom-scrollbar pr-1 pb-4"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Modo</span>
                                                    <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
                                                        <button
                                                            onClick={() => setInputMode('LIST')}
                                                            className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                                inputMode === 'LIST'
                                                                    ? 'bg-white/10 text-white'
                                                                    : 'text-white/40 hover:text-white/70'
                                                            }`}
                                                        >
                                                            Lista
                                                        </button>
                                                        <button
                                                            onClick={() => setInputMode('CUSTOM')}
                                                            className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                                inputMode === 'CUSTOM'
                                                                    ? 'bg-white/10 text-white'
                                                                    : 'text-white/40 hover:text-white/70'
                                                            }`}
                                                        >
                                                            Manual
                                                        </button>
                                                    </div>
                                                </div>

                                                {inputMode === 'LIST' && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                value={listDraft}
                                                                onChange={(e) => setListDraft(e.target.value)}
                                                                placeholder="Agrega vicios (coma o salto de línea)"
                                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all"
                                                            />
                                                            <button
                                                                onClick={handleAddListItems}
                                                                disabled={!listDraft.trim()}
                                                                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                                                    listDraft.trim()
                                                                        ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
                                                                        : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                Agregar
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-[80px] sm:max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                                            {viceList.map(item => (
                                                                <button
                                                                    key={item}
                                                                    onClick={() => setTitle(item)}
                                                                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all border ${
                                                                        title === item
                                                                            ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                                                                            : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:border-white/20'
                                                                    }`}
                                                                >
                                                                    {item}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3 sm:space-y-4">
                                                <label className="text-xs sm:text-sm font-medium text-white/60 ml-1">
                                                    ¿Qué hábito deseas eliminar?
                                                </label>
                                                <div className="relative group">
                                                    <input 
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        placeholder="Ej: Fumar, TikTok..."
                                                        className="w-full bg-transparent border-b-2 border-white/10 px-1 py-2 sm:px-2 sm:py-4 text-xl sm:text-3xl font-bold text-white placeholder-white/10 focus:outline-none focus:border-rose-500 transition-colors"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3 sm:space-y-4">
                                                <label className="text-xs sm:text-sm font-medium text-white/60 ml-1">
                                                    Afecta a tu atributo:
                                                </label>
                                                <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-[180px] sm:max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {attributes.map(attr => (
                                                        <motion.button
                                                            key={attr.id}
                                                            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => setAttribute(attr.id)}
                                                            className={`relative p-2.5 sm:p-4 rounded-xl border text-left transition-all duration-200 group ${
                                                                attribute === attr.id 
                                                                ? 'bg-rose-500/10 border-rose-500/50 ring-1 ring-rose-500/20' 
                                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 sm:gap-3">
                                                                <div className={`p-1.5 sm:p-2 rounded-lg transition-colors ${attribute === attr.id ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 text-white/40 group-hover:bg-white/10'}`}>
                                                                    <Zap size={14} className="sm:w-[18px] sm:h-[18px]" />
                                                                </div>
                                                                <span className={`text-xs sm:text-sm font-medium ${attribute === attr.id ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                                                                    {t(attr.label, attr.label.replace('traits.', ''))}
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
                                            className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-1 pb-4"
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

                                            <div className="space-y-4">
                                                <label className="text-sm font-medium text-rose-400 ml-1 flex items-center gap-2">
                                                    <AlertTriangle size={14} />
                                                    Impacto Negativo (Nivel de Severidad)
                                                </label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {[1, 2, 3, 4, 5].map((level) => (
                                                        <button
                                                            key={level}
                                                            onClick={() => setImpactLevel(level)}
                                                            className={`
                                                                h-12 rounded-xl font-bold text-lg transition-all border
                                                                ${impactLevel === level 
                                                                    ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] scale-105 z-10' 
                                                                    : 'bg-white/5 text-white/20 border-white/5 hover:bg-white/10 hover:text-white/60 hover:border-white/10'}
                                                            `}
                                                        >
                                                            {level}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="text-center text-sm font-medium text-rose-200/60 h-5 tracking-wide">
                                                    {impactLevel === 1 && "Leve - Molestia menor"}
                                                    {impactLevel === 2 && "Bajo - Interferencia ocasional"}
                                                    {impactLevel === 3 && "Moderado - Afecta el rendimiento"}
                                                    {impactLevel === 4 && "Alto - Daño significativo"}
                                                    {impactLevel === 5 && "CRÍTICO - Colapso inminente"}
                                                </div>
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
                                                        <div className="flex justify-between text-sm items-end">
                                                            <span className="text-white/60">Tiempo perdido por sesión</span>
                                                            <span className="font-mono font-bold text-xl text-rose-400">
                                                                {minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)}h ${minutes%60 > 0 ? minutes%60 + 'm' : ''}`}
                                                            </span>
                                                        </div>
                                                        <input 
                                                            type="range" 
                                                            min="0" 
                                                            max="17" 
                                                            step="1"
                                                            value={timeIndex}
                                                            onChange={(e) => setTimeIndex(parseInt(e.target.value))}
                                                            className="w-full accent-rose-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                        />
                                                        <div className="flex justify-between text-[10px] text-white/20 font-mono px-1">
                                                            <span>15m</span>
                                                            <span>2h</span>
                                                            <span>12h</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5 flex flex-col justify-between">
                                                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Daño HP</div>
                                                            <div className="text-xl font-black text-rose-500">-{penalties.hp}</div>
                                                        </div>
                                                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider truncate px-1">
                                                                XP {(() => {
                                                                    const a = attributes.find(a => a.id === attribute);
                                                                    return a ? t(a.label, a.label.replace('traits.', '')) : 'General';
                                                                })()}
                                                            </div>
                                                        <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5 flex flex-col justify-between">
                                                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Costo Oro</div>
                                                            <div className="text-xl font-black text-yellow-500">-{penalties.gold}</div>
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
                            <div className="p-5 sm:p-8 pt-4 flex justify-between items-center bg-gradient-to-t from-[#0f0f11] to-transparent shrink-0">
                                {step > 1 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleBack}
                                        className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <ChevronLeft size={18} className="sm:w-[20px] sm:h-[20px]" />
                                        <span className="font-medium text-xs sm:text-base">Atrás</span>
                                    </motion.button>
                                ) : <div />}

                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(244,63,94,0.3)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleNext}
                                    disabled={!isStepValid()}
                                    className={`
                                        flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full font-bold text-sm sm:text-lg shadow-lg transition-all
                                        ${isStepValid() 
                                            ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-rose-900/20' 
                                            : 'bg-white/10 text-white/20 cursor-not-allowed'}
                                    `}
                                >
                                    <span>{step === 3 ? 'Activar Protocolo' : 'Continuar'}</span>
                                    {step < 3 && <ChevronRight size={18} className="sm:w-[20px] sm:h-[20px]" />}
                                    {step === 3 && <ShieldAlert size={18} className="sm:w-[20px] sm:h-[20px]" />}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
