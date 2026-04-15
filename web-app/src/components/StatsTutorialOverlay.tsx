import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, Heart, Skull, Dna, ArrowRight, X, Sparkles, Lightbulb, Flame } from 'lucide-react';
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
            title: t('tour.stats.xp.title', "Energy System (XP)"),
            icon: Zap,
            color: "#f472b6", // fuchsia-400
            content: (
                <div className="space-y-4 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.xp.desc1', "<strong>Experience (XP)</strong> measures your overall progress. Earn XP by completing Habits, Tasks, and Focus Sessions.") }} />
                    
                    <div className="bg-fuchsia-500/5 p-4 rounded-2xl border border-fuchsia-500/10 backdrop-blur-sm transform-gpu">
                        <p className="font-bold text-fuchsia-300 mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] opacity-60">
                            <Sparkles size={14} className="text-fuchsia-400" />
                            {t('tour.stats.xp.levelsHeader', "XP per Level:")}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {[
                                { lvl: 1, xp: 80 },
                                { lvl: 2, xp: 100 },
                                { lvl: 5, xp: 220 },
                                { lvl: 10, xp: 420 }
                            ].map((item) => (
                                <div key={item.lvl} className="flex justify-between items-center bg-fuchsia-500/10 px-3 py-2 rounded-xl border border-fuchsia-500/10">
                                    <span className="opacity-60">{t('tour.stats.xp.level', "Lvl")} {item.lvl}</span>
                                    <span className="font-black text-fuchsia-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.3)]">{item.xp} XP</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: t('tour.stats.tp.title', "Trait Points (TP)"),
            icon: Dna,
            color: "#22d3ee", // cyan-400
            content: (
                <div className="space-y-4 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.tp.desc1', "<strong>Trait Points (TP)</strong> allow you to improve your specific attributes (Strength, Intelligence, Discipline, etc.).") }} />
                    
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 flex items-start gap-3"
                    >
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                            <Sparkles size={18} className="text-cyan-400" />
                        </div>
                        <p className="text-[13px] leading-relaxed py-1">
                            {t('tour.stats.tp.tip', "Assign tasks to different traits to level them up and unlock new abilities.")}
                        </p>
                    </motion.div>
                </div>
            )
        },
        {
            title: t('tour.stats.gold.title', "The Economy (Gold)"),
            icon: Coins,
            color: "#fbbf24", // amber-400
            content: (
                <div className="space-y-4 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.gold.desc1', "<strong>Gold</strong> is the currency of LUX, earned through daily effort and missions.") }} />
                    
                    <div className="space-y-2">
                        <p className="font-bold text-amber-300 text-[10px] uppercase tracking-[0.1em] opacity-60">{t('tour.stats.gold.whatFor', "What is it used for?")}</p>
                        
                        <div className="grid gap-2.5">
                            <motion.div 
                                whileHover={{ x: 5 }}
                                className="bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10 flex items-start gap-3 group transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-500/20"
                            >
                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.1)] group-hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] transition-all">
                                    <Sparkles size={18} className="text-amber-400" />
                                </div>
                                <p className="text-[13px] leading-relaxed py-1" dangerouslySetInnerHTML={{ __html: t('tour.stats.gold.point1', "Buy <strong>Cosmetics</strong>, <strong>Power-ups</strong>, and upgrades in the <strong>Store</strong>.") }} />
                            </motion.div>

                            <motion.div 
                                whileHover={{ x: 5 }}
                                className="bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10 flex items-start gap-3 group transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-500/20"
                            >
                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.1)] group-hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] transition-all">
                                    <Flame size={18} className="text-amber-400" />
                                </div>
                                <p className="text-[13px] leading-relaxed py-1" dangerouslySetInnerHTML={{ __html: t('tour.stats.gold.point2', "<strong>Pay Penalties:</strong> Use Gold when you relapse to avoid losing HP.") }} />
                            </motion.div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: t('tour.stats.hp.title', "Vitality (HP) & Penalties"),
            icon: Heart,
            color: "#fb7185", // rose-400
            content: (
                <div className="space-y-4 text-sm text-white/80">
                    <p dangerouslySetInnerHTML={{ __html: t('tour.stats.hp.desc1', "Your <strong>HP (Health Points)</strong> is your vitality. If you commit <strong>Bad Habits</strong> and choose not to use Gold to pay the penalty, you will lose HP.") }} />
                    
                    <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 relative overflow-hidden">
                        <div className="flex items-center gap-2 font-bold text-rose-400 mb-3 text-[10px] uppercase tracking-[0.1em]">
                            <Skull size={16} className="animate-pulse" />
                            <span>{t('tour.stats.hp.warning', "BEWARE OF REACHING 0!")}</span>
                        </div>
                        <p className="text-[12px] leading-relaxed opacity-90" dangerouslySetInnerHTML={{ __html: t('tour.stats.hp.desc2', "If your HP reaches 0, you will suffer a system failure: <strong>Your Account Level and ALL Attribute Levels will be reduced by half.</strong>") }} />
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transform-gpu">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-[#121214]/90 backdrop-blur-sm transform-gpu border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,1)] relative"
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
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm transform-gpu border border-white/10 text-white/50 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all z-20 hover:scale-110 active:scale-95"
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
