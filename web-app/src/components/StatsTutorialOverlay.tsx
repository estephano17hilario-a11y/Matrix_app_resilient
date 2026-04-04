import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, Heart, Skull, Dna, ArrowRight, X, Sparkles, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatsTutorialOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const StatsTutorialOverlay: React.FC<StatsTutorialOverlayProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);

    // Reset step when opened
    useEffect(() => {
        if (isOpen) setStep(0);
    }, [isOpen]);

    if (!isOpen) return null;

    const nextStep = () => {
        if (step < tutorialSteps.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    const skipTutorial = () => {
        onClose();
    };

    const tutorialSteps = [
        {
            title: t('tour.stats.xp.title', "El Sistema de Energía (XP)"),
            icon: Zap,
            color: "#f472b6", // fuchsia-400
            content: (
                <div className="space-y-3 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.xp.desc1', "La <strong>Experiencia (XP)</strong> mide tu progreso general. Ganas XP completando Hábitos, Tareas y Sesiones de Enfoque.") }} />
                    <div className="bg-black/30 p-3 rounded-xl border border-fuchsia-500/20">
                        <p className="font-bold text-fuchsia-300 mb-2 flex items-center gap-2">
                            <Sparkles size={14} className="text-fuchsia-400" />
                            {t('tour.stats.xp.levelsHeader', "XP para completar cada Nivel:")}
                        </p>
                        <ul className="space-y-1.5 text-xs">
                            <li className="flex justify-between items-center bg-fuchsia-500/10 px-2 py-1 rounded-md border border-fuchsia-500/10">
                                <span>{t('tour.stats.xp.level', "Nivel")} 1</span> <span className="font-black text-fuchsia-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]">80 XP</span>
                            </li>
                            <li className="flex justify-between items-center bg-fuchsia-500/10 px-2 py-1 rounded-md border border-fuchsia-500/10">
                                <span>{t('tour.stats.xp.level', "Nivel")} 2</span> <span className="font-black text-fuchsia-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]">100 XP</span>
                            </li>
                            <li className="flex justify-between items-center bg-fuchsia-500/10 px-2 py-1 rounded-md border border-fuchsia-500/10">
                                <span>{t('tour.stats.xp.level', "Nivel")} 5</span> <span className="font-black text-fuchsia-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]">220 XP</span>
                            </li>
                            <li className="flex justify-between items-center bg-fuchsia-500/10 px-2 py-1 rounded-md border border-fuchsia-500/10">
                                <span>{t('tour.stats.xp.level', "Nivel")} 10</span> <span className="font-black text-fuchsia-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]">420 XP</span>
                            </li>
                            <li className="flex justify-between items-center bg-fuchsia-500/10 px-2 py-1 rounded-md border border-fuchsia-500/10">
                                <span>{t('tour.stats.xp.level', "Nivel")} 20</span> <span className="font-black text-fuchsia-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]">820 XP</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: t('tour.stats.tp.title', "Puntos de Rasgo (TP)"),
            icon: Dna,
            color: "#22d3ee", // cyan-400
            content: (
                <div className="space-y-3 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.tp.desc1', "Los <strong>Puntos de Rasgo (TP)</strong> te permiten mejorar tus atributos específicos (Fuerza, Inteligencia, Disciplina, etc.).") }} />
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.tp.desc2', "Existen múltiples <strong>Rasgos</strong> que puedes desarrollar. Puedes cambiarlos y gestionarlos en la <strong>Zona de Atributos</strong> para enfocarte en lo que más necesitas mejorar en tu vida actual.") }} />
                    <div className="flex items-center gap-2 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-200 text-xs">
                        <Sparkles size={14} />
                        <span>{t('tour.stats.tp.tip', "Asigna tareas a diferentes rasgos para subirlos de nivel.")}</span>
                    </div>
                </div>
            )
        },
        {
            title: t('tour.stats.gold.title', "La Economía (Oro)"),
            icon: Coins,
            color: "#fbbf24", // amber-400
            content: (
                <div className="space-y-3 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.gold.desc1', "El <strong>Oro</strong> es la moneda de LUX. Lo obtienes como recompensa por tu esfuerzo diario y al completar misiones.") }} />
                    <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        <p className="font-bold text-amber-300 mb-1">{t('tour.stats.gold.whatFor', "¿Para qué sirve?")}</p>
                        <ul className="list-disc list-inside pl-4 space-y-1 text-xs">
                            <li dangerouslySetInnerHTML={{ __html: t('tour.stats.gold.point1', "Comprar mejoras y recompensas en la <strong>Tienda</strong>.") }} />
                            <li dangerouslySetInnerHTML={{ __html: t('tour.stats.gold.point2', "<strong>Pagar por tus Malos Hábitos:</strong> Si recaes, puedes usar Oro para mitigar el daño a tu HP.") }} />
                        </ul>
                    </div>
                </div>
            )
        },
        {
            title: t('tour.stats.hp.title', "Vitalidad (HP) y Castigos"),
            icon: Heart,
            color: "#fb7185", // rose-400
            content: (
                <div className="space-y-3 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.hp.desc1', "Tu <strong>HP (Health Points)</strong> es tu vitalidad. Si cometes <strong>Malos Hábitos</strong> y decides no usar Oro para pagar la penalización, perderás HP.") }} />
                    <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                        <div className="flex items-center gap-2 font-bold text-rose-400 mb-2">
                            <Skull size={16} />
                            <span>{t('tour.stats.hp.warning', "¡CUIDADO CON LLEGAR A 0!")}</span>
                        </div>
                        <p className="text-xs" dangerouslySetInnerHTML={{ __html: t('tour.stats.hp.desc2', "Si tu HP llega a 0, sufrirás una falla en el sistema: <strong>Tu Nivel de Cuenta y los Niveles de TODOS tus Atributos se reducirán a la mitad.</strong>") }} />
                    </div>
                </div>
            )
        },
        {
            title: t('tour.stats.tips.title', "Tips en cada sección"),
            icon: Lightbulb,
            color: "#fbbf24", // yellow-400
            content: (
                <div className="space-y-3 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.tips.desc1', "En varias partes de la aplicación encontrarás un pequeño <strong>foquito</strong>. ¡No dudes en pulsarlo!") }} />
                    
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 mt-4 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Interactive pulsing button preview */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-400/20 blur-md rounded-full animate-pulse" style={{ opacity: 0.8 }} />
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-yellow-400/30 text-yellow-300 relative z-10 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                                <Lightbulb size={20} className="drop-shadow-lg" />
                            </div>
                        </div>

                        <div className="flex-1 text-xs">
                            <p className="font-bold text-yellow-300 mb-1">{t('tour.stats.tips.buttonTitle', "Tutorial Interactivo")}</p>
                            <p className="text-white/60">{t('tour.stats.tips.buttonDesc', "Al presionarlo, activará un recorrido visual explicándote exactamente cómo funciona la pantalla en la que te encuentras.")}</p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentData = tutorialSteps[step];
    const Icon = currentData.icon;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-[#121214]/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,1)] relative"
            >
                {/* Dynamic Gradient Background */}
                <motion.div 
                    className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-500"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${currentData.color}, transparent 70%)` }}
                />

                {/* Header Pattern */}
                <div 
                    className="h-28 w-full relative overflow-hidden flex items-center justify-center transition-colors duration-500"
                    style={{ backgroundColor: `${currentData.color}15` }}
                >
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:12px_12px]" />
                    <motion.div 
                        key={step}
                        initial={{ scale: 0, rotate: -180, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl relative z-10 border border-white/20"
                        style={{ backgroundColor: currentData.color, boxShadow: `0 0 40px ${currentData.color}50` }}
                    >
                        <Icon size={32} className="text-[#121214]" />
                    </motion.div>
                </div>

                {/* Close Button */}
                <button 
                    onClick={skipTutorial}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/50 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all z-20 hover:scale-110 active:scale-95"
                >
                    <X size={16} />
                </button>

                {/* Content */}
                <div className="p-7 relative z-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <h2 className="text-2xl font-black text-white mb-4 tracking-tight transition-colors duration-500" style={{ color: currentData.color }}>
                                {currentData.title}
                            </h2>
                            <div className="leading-relaxed">
                                {currentData.content}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer / Controls */}
                    <div className="mt-8 flex items-center justify-between">
                        <div className="flex gap-2">
                            {tutorialSteps.map((_, i) => (
                                <motion.div 
                                    key={i} 
                                    animate={{ 
                                        width: i === step ? 24 : 8,
                                        backgroundColor: i === step ? currentData.color : '#ffffff30'
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="h-2 rounded-full"
                                />
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={nextStep}
                            className="px-6 py-3 rounded-xl font-bold text-sm text-[#121214] flex items-center gap-2 shadow-lg transition-colors duration-500"
                            style={{ backgroundColor: currentData.color, boxShadow: `0 4px 20px ${currentData.color}40` }}
                        >
                            {step < tutorialSteps.length - 1 ? t('tour.stats.next', 'Siguiente') : t('tour.stats.start', 'Comenzar')}
                            {step < tutorialSteps.length - 1 && <ArrowRight size={18} />}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
