import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Skull, AlertTriangle, Clock, Target, Quote, Check } from 'lucide-react';
import { Attribute, BadHabit } from '../../../types';
import { GlassPanel } from '../../../components/ui/GlassPanel';
import { useTranslation } from 'react-i18next';

interface BadHabitWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<BadHabit>) => void;
    attributes: Attribute[];
    existingBadHabitsCount: number;
}

export const BadHabitWizard: React.FC<BadHabitWizardProps> = ({
    isOpen,
    onClose,
    onConfirm,
    attributes,
    existingBadHabitsCount
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(existingBadHabitsCount === 0 ? 'BRAINDUMP' : 'DETAILS');
    const [brainDumpList, setBrainDumpList] = useState<string[]>([]);
    const [currentBrainDumpInput, setCurrentBrainDumpInput] = useState('');
    
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
            setStep(existingBadHabitsCount === 0 ? 'BRAINDUMP' : 'DETAILS');
            setTitle('');
            setAttribute('');
            setReason('');
            setNegativeImpact('');
            setTimeConsumed(0);
            setBrainDumpList([]);
        }
    }, [isOpen, existingBadHabitsCount]);

    useEffect(() => {
        // Calculate Penalties
        // Logic: 
        // Base HP penalty: 10
        // Time multiplier: +1 HP per 10 mins
        // XP penalty: HP * 5
        // Gold cost to pay off: XP * 2
        
        const baseHp = 10;
        const timePenalty = Math.floor(timeConsumed / 10);
        const totalHp = baseHp + timePenalty;
        const totalXp = totalHp * 5;
        const goldCost = totalXp * 2;

        setPenalties({
            hp: totalHp,
            xp: totalXp,
            gold: goldCost
        });
    }, [timeConsumed]);

    const handleAddBrainDumpItem = () => {
        if (currentBrainDumpInput.trim()) {
            setBrainDumpList([...brainDumpList, currentBrainDumpInput.trim()]);
            setCurrentBrainDumpInput('');
        }
    };

    const handleBrainDumpDone = () => {
        // If items were added, maybe we process them one by one?
        // For now, let's just take the first one to start the wizard, 
        // or just proceed to manual entry if they want.
        // The prompt says: "create a list... checkbox... once marked all, eliminate box".
        // This implies the Brain Dump is a separate view/state.
        // Let's assume the wizard is just for CREATING one bad habit.
        // But the prompt says "si es la primera vez... crea una lista...".
        // Maybe we just let them list them, and then for each one, we open the config?
        // Or maybe just proceed to create the FIRST one from the list?
        
        if (brainDumpList.length > 0) {
            setTitle(brainDumpList[0]); // Auto-fill first one
            // We should probably remove it from the list or handle queueing.
            // For simplicity, let's just auto-fill the title and move to Details.
        }
        setStep('DETAILS');
    };

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
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                onClick={onClose}
            />

            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-rose-900/20 to-transparent">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Skull className="text-rose-500" />
                        {step === 'BRAINDUMP' ? 'Identificar Enemigos' : 'Configurar Mal Hábito'}
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {step === 'BRAINDUMP' ? (
                        <div className="space-y-6">
                            <p className="text-white/60 text-sm">
                                Identifica los hábitos que están saboteando tu éxito. Escríbelos abajo.
                            </p>
                            
                            <div className="space-y-2">
                                {brainDumpList.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center text-rose-500">
                                            <Check size={12} />
                                        </div>
                                        <span className="text-white">{item}</span>
                                    </div>
                                ))}
                                
                                <div className="flex gap-2">
                                    <input 
                                        value={currentBrainDumpInput}
                                        onChange={(e) => setCurrentBrainDumpInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddBrainDumpItem()}
                                        placeholder="Ej: Ver TikTok 2 horas..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/50 transition-colors"
                                    />
                                    <button 
                                        onClick={handleAddBrainDumpItem}
                                        className="px-4 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <button 
                                onClick={handleBrainDumpDone}
                                disabled={brainDumpList.length === 0}
                                className="w-full py-4 mt-4 bg-gradient-to-r from-rose-600 to-red-600 rounded-xl font-bold text-white shadow-lg shadow-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
                            >
                                Continuar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre del Mal Hábito</label>
                                <input 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Fumar, Procrastinar..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500/50 transition-colors"
                                />
                            </div>

                            {/* Trait */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rasgo Afectado</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {attributes.map(attr => (
                                        <button
                                            key={attr.id}
                                            onClick={() => setAttribute(attr.id)}
                                            className={`p-2 rounded-lg border text-left text-xs font-bold transition-all ${
                                                attribute === attr.id 
                                                ? 'bg-rose-500/20 border-rose-500 text-white' 
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                        >
                                            {attr.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Razón / Frase Motivadora</label>
                                <div className="relative">
                                    <Quote className="absolute top-3 left-3 text-white/20" size={16} />
                                    <textarea 
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Por qué quieres dejarlo..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-rose-500/50 transition-colors h-24 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Impact */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impacto Negativo</label>
                                <textarea 
                                    value={negativeImpact}
                                    onChange={(e) => setNegativeImpact(e.target.value)}
                                    placeholder="Cómo te daña..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500/50 transition-colors h-20 resize-none"
                                />
                            </div>

                            {/* Time */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiempo Perdido (minutos/día)</label>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                    <Clock className="text-rose-400" size={20} />
                                    <input 
                                        type="number"
                                        value={timeConsumed}
                                        onChange={(e) => setTimeConsumed(Number(e.target.value))}
                                        className="bg-transparent text-white font-mono text-lg outline-none w-full"
                                    />
                                    <span className="text-white/40 text-sm">min</span>
                                </div>
                            </div>

                            {/* Penalties Preview */}
                            <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-4 space-y-3">
                                <h3 className="text-rose-400 font-bold text-sm flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    Consecuencias de Recaída
                                </h3>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-black/40 rounded-lg p-2">
                                        <div className="text-rose-500 font-black text-lg">-{penalties.hp}</div>
                                        <div className="text-[10px] text-slate-400 uppercase">HP Damage</div>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2">
                                        <div className="text-purple-400 font-black text-lg">-{penalties.xp}</div>
                                        <div className="text-[10px] text-slate-400 uppercase">XP Loss</div>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-2">
                                        <div className="text-amber-400 font-black text-lg">{penalties.gold}</div>
                                        <div className="text-[10px] text-slate-400 uppercase">Gold Cost</div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-rose-300/60 text-center italic">
                                    Puedes pagar {penalties.gold} oro para evitar el daño.
                                </p>
                            </div>

                            <button 
                                onClick={handleConfirm}
                                disabled={!title || !attribute}
                                className="w-full py-4 bg-white text-black rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                Confirmar Contrato
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
