import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import { 
    Trophy, Calendar, Zap, ChevronRight, ChevronLeft,
    Brain, Flame, Award, Flag, Layers, CheckCircle2,
    Rocket, Crown, Sparkles, ArrowRight, BarChart3
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';

const springTransition: Transition = {
    type: "spring",
    stiffness: 400,
    damping: 25,
    mass: 0.5
};

const fastSwipeTransition: Transition = {
    duration: 0.25,
    ease: [0.25, 1, 0.5, 1]
};

const swipeVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 30 : -30,
        opacity: 0,
        scale: 0.98
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 30 : -30,
        opacity: 0,
        scale: 0.98
    })
};

interface StrategyTutorialProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: (selectedDays?: number) => void;
}

interface ChallengeExample {
    id: 'ANNUAL' | 'SEMESTER' | 'TRIMESTER' | 'MONTHLY' | 'WEEKLY' | 'TODAY' | 'CUSTOM';
    title: string;
    titleEn: string;
    description: string;
    descEn: string;
    icon: React.ReactNode;
    color: string;
    example: string;
    exampleEn: string;
    duration: string;
    durationEn: string;
    days?: number;
    difficulty: 1 | 2 | 3 | 4 | 5;
}

const challengeExamples: ChallengeExample[] = [
    {
        id: 'ANNUAL',
        title: 'Reto Anual',
        titleEn: 'Annual Challenge',
        description: 'Tu meta final. El objetivo que te transformará completamente.',
        descEn: 'Your final goal. The objective that will transform you completely.',
        icon: <Trophy className="w-8 h-8" />,
        color: '#fbbf24',
        example: '"Correr una marathon completa (42km)"',
        exampleEn: '"Run a complete marathon (42km)"',
        duration: '365 días',
        durationEn: '365 days',
        days: 365,
        difficulty: 5
    },
    {
        id: 'SEMESTER',
        title: 'Reto Semestral',
        titleEn: 'Semester Challenge',
        description: 'Divide tu año en dos mega-etapas de conquista.',
        descEn: 'Divide your year into two mega-stages of conquest.',
        icon: <Crown className="w-7 h-7" />,
        color: '#f59e0b',
        example: '"Correr 30km sin parar"',
        exampleEn: '"Run 30km without stopping"',
        duration: '180 días',
        durationEn: '180 days',
        days: 180,
        difficulty: 4
    },
    {
        id: 'TRIMESTER',
        title: 'Reto Trimestral',
        titleEn: 'Quarterly Challenge',
        description: 'Un cuarto de año para demostrar tu compromiso.',
        descEn: 'A quarter of a year to prove your commitment.',
        icon: <Award className="w-7 h-7" />,
        color: '#d97706',
        example: '"Correr mi primera carrera de 15km"',
        exampleEn: '"Run my first 15km race"',
        duration: '90 días',
        durationEn: '90 days',
        days: 90,
        difficulty: 3
    },
    {
        id: 'MONTHLY',
        title: 'Reto Mensual',
        titleEn: 'Monthly Challenge',
        description: 'El sprint mensual que te acerca a tu meta.',
        descEn: 'The monthly sprint that brings you closer to your goal.',
        icon: <Flag className="w-7 h-7" />,
        color: '#0ea5e9',
        example: '"Correr 100km en el mes"',
        exampleEn: '"Run 100km in the month"',
        duration: '30 días',
        durationEn: '30 days',
        days: 30,
        difficulty: 2
    },
    {
        id: 'WEEKLY',
        title: 'Reto Semanal',
        titleEn: 'Weekly Challenge',
        description: 'La semana es tu unidad de progreso constante.',
        descEn: 'The week is your unit of constant progress.',
        icon: <BarChart3 className="w-7 h-7" />,
        color: '#22c55e',
        example: '"Correr 20km esta semana"',
        exampleEn: '"Run 20km this week"',
        duration: '7 días',
        durationEn: '7 days',
        days: 7,
        difficulty: 2
    },
    {
        id: 'CUSTOM',
        title: 'Tiempo Personalizado',
        titleEn: 'Custom Timeframe',
        description: 'Elige la fecha exacta en la que quieres cumplir tu meta.',
        descEn: 'Choose the exact date you want to achieve your goal.',
        icon: <Calendar className="w-7 h-7" />,
        color: '#ec4899',
        example: '"Terminar mi tesis para el 15 de Noviembre"',
        exampleEn: '"Finish my thesis by November 15th"',
        duration: 'Tu eliges',
        durationEn: 'You choose',
        difficulty: 3
    }
];

const ForwardEngineeringStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
    const { i18n } = useTranslation();
    const isSpanish = i18n.language === 'es';
    
    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, ...springTransition }}
                    className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center"
                >
                    <ArrowRight className="w-10 h-10 text-blue-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-3">
                    {isSpanish ? 'Ingeniería Normal (Directa)' : 'Forward Engineering (Normal)'}
                </h2>
                <p className="text-white/60 text-sm leading-relaxed">
                    {isSpanish 
                        ? 'Este es el enfoque tradicional: defines un objetivo y trabajas hacia él.'
                        : 'This is the traditional approach: you define an objective and work towards it.'}
                </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 mb-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-white/40">1</span>
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">
                                {isSpanish ? '"Quiero estar en forma"' : '"I want to be fit"'}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                                {isSpanish ? 'Objetivo vago, sin plan' : 'Vague objective, no plan'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-white/40">2</span>
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">
                                {isSpanish ? '"Voy a correr más"' : '"I will run more"'}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                                {isSpanish ? 'Aún sin specifics, sin métricas' : 'Still no specifics, no metrics'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-white/40">3</span>
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">
                                {isSpanish ? '"Algún día lo lograré"' : '"Someday I will achieve it"'}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                                {isSpanish ? 'Sin deadline = sin responsabilidad' : 'No deadline = no accountability'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
                <p className="text-red-300/80 text-sm font-medium text-center">
                    {isSpanish 
                        ? '⚠️  Este método tiene un 92% de tasa de fracaso'
                        : '⚠️  This method has a 92% failure rate'}
                </p>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 h-12 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={18} />
                    {isSpanish ? 'Volver' : 'Back'}
                </button>
                <button
                    onClick={onNext}
                    className="flex-1 h-12 rounded-xl bg-white text-black font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                    {isSpanish ? 'Ingeniería Inversa' : 'Reverse Engineering'}
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

const ReverseEngineeringStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
    const { i18n } = useTranslation();
    const isSpanish = i18n.language === 'es';
    
    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, ...springTransition }}
                    className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center"
                >
                    <ArrowRight className="w-10 h-10 text-emerald-400" style={{ transform: 'rotate(180deg)' }} />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-3">
                    {isSpanish ? 'Ingeniería Inversa 🔄' : 'Reverse Engineering 🔄'}
                </h2>
                <p className="text-white/60 text-sm leading-relaxed">
                    {isSpanish 
                        ? 'Empieza desde el FIN. Trabaja hacia atrás para crear un plan imparable.'
                        : 'Start from the END. Work backwards to create an unstoppable plan.'}
                </p>
            </div>

            <div className="space-y-3 mb-6">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-amber-300 font-bold text-sm">🎯 {isSpanish ? 'PASO 1: Define la META' : 'STEP 1: Define the GOAL'}</p>
                            <p className="text-white/60 text-xs mt-1">
                                {isSpanish ? '"Quiero correr una marathon en 12 meses"' : '"I want to run a marathon in 12 months"'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-cyan-300 font-bold text-sm">📊 {isSpanish ? 'PASO 2: Descompón en bloques' : 'STEP 2: Break into blocks'}</p>
                            <p className="text-white/60 text-xs mt-1">
                                {isSpanish ? 'Anual → Semestral → Trimestral → Mensual → Semanal → Diario' 
                                    : 'Annual → Semester → Quarterly → Monthly → Weekly → Daily'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-emerald-300 font-bold text-sm">✅ {isSpanish ? 'PASO 3: Conquista cada capa' : 'STEP 3: Conquer each layer'}</p>
                            <p className="text-white/60 text-xs mt-1">
                                {isSpanish ? 'Cada mini-reto completado te acerca a tu meta final' 
                                    : 'Each mini-challenge completed brings you closer to your final goal'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-8">
                <p className="text-emerald-300/80 text-sm font-medium text-center">
                    {isSpanish 
                        ? '✨ Este método tiene un 76% de tasa de éxito'
                        : '✨ This method has a 76% success rate'}
                </p>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 h-12 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={18} />
                    {isSpanish ? 'Volver' : 'Back'}
                </button>
                <button
                    onClick={onNext}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                    {isSpanish ? 'Ver Retos' : 'See Challenges'}
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

const MarathonExampleStep = ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => {
    const { i18n } = useTranslation();
    const isSpanish = i18n.language === 'es';
    
    const stages = useMemo(() => [
        { 
            label: isSpanish ? 'Meta Final (1 Año)' : 'Final Goal (1 Year)', 
            desc: isSpanish ? 'Completar una marathon oficial' : 'Complete an official marathon',
            value: '42km', 
            color: '#fbbf24', 
            icon: <Trophy size={14} /> 
        },
        { 
            label: isSpanish ? 'Semestral (6 Meses)' : 'Semester (6 Months)', 
            desc: isSpanish ? 'Resistencia para 3/4 de la carrera' : 'Endurance for 3/4 of the race',
            value: '30km', 
            color: '#f59e0b', 
            icon: <Crown size={14} /> 
        },
        { 
            label: isSpanish ? 'Trimestral (3 Meses)' : 'Quarter (3 Months)', 
            desc: isSpanish ? 'Correr sin parar una distancia media' : 'Run non-stop a medium distance',
            value: '15km', 
            color: '#d97706', 
            icon: <Award size={14} /> 
        },
        { 
            label: isSpanish ? 'Mensual (Este Mes)' : 'Monthly (This Month)', 
            desc: isSpanish ? 'Volumen total acumulado en 30 días' : 'Total accumulated volume in 30 days',
            value: '100km total', 
            color: '#0ea5e9', 
            icon: <Flag size={14} /> 
        },
        { 
            label: isSpanish ? 'Semanal (Esta Semana)' : 'Weekly (This Week)', 
            desc: isSpanish ? 'Rutina base (ej: 4 días x 5km)' : 'Base routine (e.g., 4 days x 5km)',
            value: '20km total', 
            color: '#22c55e', 
            icon: <BarChart3 size={14} /> 
        },
        { 
            label: isSpanish ? 'Hoy (Acción Diaria)' : 'Today (Daily Action)', 
            desc: isSpanish ? 'Tu única tarea real para hoy' : 'Your only real task for today',
            value: 'Correr 5km', 
            color: '#a855f7', 
            icon: <Zap size={14} /> 
        },
    ], [isSpanish]);
    
    return (
        <div className="w-full max-w-lg mx-auto flex flex-col h-full max-h-[85vh]">
            <div className="text-center mb-4 shrink-0">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, ...springTransition }}
                    className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center"
                >
                    <Rocket className="w-6 h-6 text-amber-400" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-1">
                    {isSpanish ? 'Ingeniería Inversa: La Marathon' : 'Reverse Engineering: The Marathon'}
                </h2>
                <p className="text-white/50 text-[11px] px-4 leading-tight">
                    {isSpanish 
                        ? 'En lugar de pensar en 42km, divídelo hasta llegar a lo que debes hacer HOY.'
                        : 'Instead of thinking about 42km, divide it until you reach what you must do TODAY.'}
                </p>
            </div>

            <div className="relative flex-1 mb-3 px-2">
                {/* Línea conectora */}
                <div className="absolute left-[1.75rem] top-4 bottom-4 w-0.5 bg-gradient-to-b from-amber-500/30 via-cyan-500/30 to-purple-500/30 rounded-full" />
                
                <div className="space-y-2 relative z-10">
                    {stages.map((stage, index) => (
                        <motion.div
                            key={stage.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 + index * 0.05 }}
                            className="flex items-stretch gap-3 group"
                        >
                            {/* Icono circular */}
                            <div className="py-1">
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg relative z-10 transition-transform group-hover:scale-110"
                                    style={{ 
                                        backgroundColor: '#0d0d0f',
                                        borderWidth: 2, 
                                        borderColor: stage.color,
                                        boxShadow: `0 0 10px ${stage.color}30`
                                    }}
                                >
                                    <span style={{ color: stage.color }}>{stage.icon}</span>
                                </div>
                            </div>
                            
                            {/* Tarjeta de contenido super compacta */}
                            <div 
                                className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between transition-all group-hover:border-white/15 group-hover:bg-white/[0.04]"
                            >
                                <div className="min-w-0 pr-2">
                                    <p className="text-white font-bold text-xs tracking-wide truncate">{stage.label}</p>
                                    <p className="text-white/40 text-[10px] truncate leading-tight mt-0.5">{stage.desc}</p>
                                </div>
                                <div 
                                    className="px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap shrink-0 border"
                                    style={{ 
                                        backgroundColor: `${stage.color}15`, 
                                        color: stage.color,
                                        borderColor: `${stage.color}30`
                                    }}
                                >
                                    {stage.value}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="shrink-0 space-y-3 pt-1">
                <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-white/10 rounded-xl p-3">
                    <p className="text-white/80 text-[11px] text-center leading-snug">
                        💡 {isSpanish
                            ? 'Tu cerebro se abruma con "42km". Pero "Correr 5km hoy" es fácil. Si conquistas hoy, conquistas el año.'
                            : 'Your brain is overwhelmed by "42km". But "Run 5km today" is easy. Conquer today, conquer the year.'}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onBack}
                        className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 font-bold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <ChevronLeft size={16} />
                        {isSpanish ? 'Volver' : 'Back'}
                    </button>
                    <button
                        onClick={onNext}
                        className="flex-1 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20"
                    >
                        {isSpanish ? 'Ver Tipos de Retos' : 'See Challenge Types'}
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ChallengesOverviewStep = ({ onSelectChallenge, onBack }: { onSelectChallenge: (id: ChallengeExample['id']) => void; onBack: () => void }) => {
    const { i18n } = useTranslation();
    const isSpanish = i18n.language === 'es';
    const [hoveredId, setHoveredId] = useState<ChallengeExample['id'] | null>(null);
    
    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                    {isSpanish ? '🎯 Elige tu Horizontes de Reto' : '🎯 Choose Your Challenge Horizons'}
                </h2>
                <p className="text-white/50 text-xs">
                    {isSpanish 
                        ? 'Cada horizonte te acerca más a tu meta. Toca uno para saber más.'
                        : 'Each horizon brings you closer to your goal. Tap one to learn more.'}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                {challengeExamples.map((challenge, index) => (
                    <motion.button
                        key={challenge.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 + index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onHoverStart={() => setHoveredId(challenge.id)}
                        onHoverEnd={() => setHoveredId(null)}
                        onClick={() => onSelectChallenge(challenge.id)}
                        className={cn(
                            "relative p-3 rounded-2xl border transition-all duration-200 text-left",
                            hoveredId === challenge.id 
                                ? "bg-white/[0.08] border-white/20" 
                                : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
                        )}
                        style={{
                            transform: hoveredId === challenge.id ? `scale(1.02)` : undefined
                        }}
                    >
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                            style={{ backgroundColor: `${challenge.color}20` }}
                        >
                            <span style={{ color: challenge.color }}>{challenge.icon}</span>
                        </div>
                        <p className="text-white font-bold text-xs mb-1">
                            {isSpanish ? challenge.title : challenge.titleEn}
                        </p>
                        <p className="text-white/40 text-[10px]">
                            {challenge.duration} / {challenge.durationEn}
                        </p>
                        
                        <div className="flex gap-0.5 mt-2">
                            {[1, 2, 3, 4, 5].map((level) => (
                                <div
                                    key={level}
                                    className={cn(
                                        "h-1 flex-1 rounded-full transition-colors",
                                        level <= challenge.difficulty ? '' : 'bg-white/10'
                                    )}
                                    style={{
                                        backgroundColor: level <= challenge.difficulty ? challenge.color : undefined,
                                        opacity: level <= challenge.difficulty ? 0.6 + (level * 0.08) : undefined
                                    }}
                                />
                            ))}
                        </div>
                    </motion.button>
                ))}
            </div>

            <button
                onClick={onBack}
                className="w-full h-10 rounded-xl bg-white/5 text-white/60 font-bold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
                <ChevronLeft size={16} />
                {isSpanish ? 'Volver al ejemplo' : 'Back to example'}
            </button>
        </div>
    );
};

const ChallengeDetailModal = ({ 
    challenge, 
    isActive, 
    onClose, 
    onCreateProject 
}: { 
    challenge: ChallengeExample; 
    isActive: boolean; 
    onClose: () => void; 
    onCreateProject: (days?: number) => void;
}) => {
    const { i18n } = useTranslation();
    const isSpanish = i18n.language === 'es';
    
    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505]/95 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={springTransition}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#0d0d0f] rounded-3xl border border-white/10 overflow-hidden"
                    >
                        <div 
                            className="h-32 relative flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${challenge.color}30 0%, transparent 100%)` }}
                        >
                            <div 
                                className="w-20 h-20 rounded-3xl flex items-center justify-center border border-white/20"
                                style={{ backgroundColor: `${challenge.color}20` }}
                            >
                                <span style={{ color: challenge.color }}>{challenge.icon}</span>
                            </div>
                            <div className="absolute top-4 right-4">
                                <div 
                                    className="px-3 py-1 rounded-full text-xs font-bold"
                                    style={{ backgroundColor: `${challenge.color}20`, color: challenge.color }}
                                >
                                    {challenge.duration}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">
                                {isSpanish ? challenge.title : challenge.titleEn}
                            </h3>
                            <p className="text-white/60 text-sm mb-4">
                                {isSpanish ? challenge.description : challenge.descEn}
                            </p>
                            
                            <div className="bg-white/[0.03] rounded-2xl p-4 mb-6 border border-white/[0.05]">
                                <p className="text-white/40 text-xs mb-2 uppercase tracking-wider font-bold">
                                    {isSpanish ? '📋 Ejemplo concreto' : '📋 Concrete example'}
                                </p>
                                <p className="text-white font-medium text-sm">
                                    {isSpanish ? challenge.example : challenge.exampleEn}
                                </p>
                            </div>
                            
                            <div className="mb-6">
                                <p className="text-white/40 text-xs mb-2 uppercase tracking-wider font-bold">
                                    {isSpanish ? '🔥 Dificultad' : '🔥 Difficulty'}
                                </p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className="h-2 flex-1 rounded-full"
                                            style={{
                                                backgroundColor: level <= challenge.difficulty ? challenge.color : '#ffffff10'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 h-12 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 transition-colors"
                                >
                                    {isSpanish ? 'Volver' : 'Back'}
                                </button>
                                <button
                                    onClick={() => onCreateProject(challenge.id === 'CUSTOM' ? undefined : challenge.days)}
                                    className="flex-1 h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 hover:opacity-90"
                                    style={{
                                        background: `linear-gradient(135deg, ${challenge.color}, ${challenge.color}dd)`,
                                        color: 'white',
                                        boxShadow: `0 8px 20px -4px ${challenge.color}60`
                                    }}
                                >
                                    <Rocket size={16} />
                                    {isSpanish ? 'Crear Estrategia' : 'Create Strategy'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const SummaryStep = ({ onComplete, onBack }: { onComplete: (days?: number) => void; onBack: () => void }) => {
    const { i18n } = useTranslation();
    const isSpanish = i18n.language === 'es';
    
    const principles = useMemo(() => [
        { 
            icon: <Brain className="w-5 h-5" />, 
            title: isSpanish ? 'Piensa en Reverse' : 'Think in Reverse', 
            desc: isSpanish ? 'Empieza desde la meta, trabaja hacia atrás' : 'Start from the goal, work backwards' 
        },
        { 
            icon: <Layers className="w-5 h-5" />, 
            title: isSpanish ? 'Descompón en Capas' : 'Break into Layers', 
            desc: isSpanish ? 'Cada horizonte es un paso hacia el éxito' : 'Each horizon is a step towards success' 
        },
        { 
            icon: <Flame className="w-5 h-5" />, 
            title: isSpanish ? 'Menos es Más' : 'Less is More', 
            desc: isSpanish ? 'Un proyecto enfocado supera a diez abandonados' : 'One focused project beats ten abandoned ones' 
        },
        { 
            icon: <Trophy className="w-5 h-5" />, 
            title: isSpanish ? 'Celebra Cada Paso' : 'Celebrate Each Step', 
            desc: isSpanish ? 'Cada mini-victoria alimenta tu motivación' : 'Each mini-victory fuels your motivation' 
        },
    ], [isSpanish]);
    
    return (
        <div className="w-full max-w-lg mx-auto text-center">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, ...springTransition }}
                className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center"
            >
                <Sparkles className="w-10 h-10 text-emerald-400" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
                {isSpanish ? '¿Listo para comenzar?' : 'Ready to begin?'}
            </h2>
            <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
                {isSpanish 
                    ? 'Recuerda: los grandes logros se construyen capa por capa. Cada día cuenta.'
                    : 'Remember: great achievements are built layer by layer. Every day counts.'}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
                {principles.map((p, index) => (
                    <motion.div
                        key={p.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + index * 0.05 }}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-left"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 mb-3">
                            {p.icon}
                        </div>
                        <p className="text-white font-bold text-sm mb-1">{p.title}</p>
                        <p className="text-white/40 text-xs">{p.desc}</p>
                    </motion.div>
                ))}
            </div>
            
            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 h-12 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={18} />
                    {isSpanish ? 'Volver' : 'Back'}
                </button>
                <button
                    onClick={() => onComplete()}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                    <Rocket size={18} />
                    {isSpanish ? 'Crear mi Estrategia' : 'Create my Strategy'}
                </button>
            </div>
        </div>
    );
};

export const StrategyTutorial: React.FC<StrategyTutorialProps> = ({ isOpen, onClose, onProceed }) => {
    const { i18n } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [selectedChallenge, setSelectedChallenge] = useState<ChallengeExample['id'] | null>(null);
    
    const steps = ['forward', 'reverse', 'marathon', 'challenges', 'summary'] as const;
    
    const currentStepKey = steps[currentStep];
    
    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep, steps.length]);
    
    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);
    
    const handleSelectChallenge = useCallback((id: ChallengeExample['id']) => {
        setSelectedChallenge(id);
    }, []);
    
    const handleClose = useCallback(() => {
        setCurrentStep(0);
        setSelectedChallenge(null);
        onClose();
    }, [onClose]);
    
    const handleProceed = useCallback((days?: number) => {
        setCurrentStep(0);
        setSelectedChallenge(null);
        onProceed(days);
    }, [onProceed]);
    
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setSelectedChallenge(null);
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    
    const activeChallenge = useMemo(() => 
        selectedChallenge ? challengeExamples.find(c => c.id === selectedChallenge) : null,
        [selectedChallenge]
    );
    
    const progressPercent = useMemo(() => 
        ((currentStep + 1) / steps.length) * 100,
        [currentStep]
    );
    
    if (typeof document === 'undefined' || !isOpen) return null;
    
    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#050505]"
            style={{ 
                willChange: 'opacity'
            }}
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                    className="absolute top-0 left-0 w-full h-full opacity-10"
                    style={{
                        background: 'radial-gradient(circle at 20% 30%, rgba(99,102,241,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(16,185,129,0.2) 0%, transparent 50%)',
                    }}
                />
            </div>
            
            <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-50 border border-white/5"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
            
            <div className="w-full max-w-xl px-6 relative z-10">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                            {currentStep + 1} / {steps.length}
                        </span>
                        <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                            {currentStepKey === 'forward' && (i18n.language === 'es' ? 'Fundamentos' : 'Fundamentals')}
                            {currentStepKey === 'reverse' && (i18n.language === 'es' ? 'Método' : 'Method')}
                            {currentStepKey === 'marathon' && (i18n.language === 'es' ? 'Ejemplo' : 'Example')}
                            {currentStepKey === 'challenges' && (i18n.language === 'es' ? 'Retos' : 'Challenges')}
                            {currentStepKey === 'summary' && (i18n.language === 'es' ? 'Listo' : 'Ready')}
                        </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full rounded-full"
                            style={{ 
                                background: currentStep < 2 
                                    ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' 
                                    : currentStep < 4 
                                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                                        : 'linear-gradient(90deg, #22c55e, #10b981)'
                            }}
                            
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                        />
                    </div>
                </div>
                
                <AnimatePresence custom={direction} initial={false}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={swipeVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={fastSwipeTransition}
                        className="w-full"
                    >
                        {currentStepKey === 'forward' && (
                            <ForwardEngineeringStep onNext={handleNext} onBack={handleClose} />
                        )}
                        {currentStepKey === 'reverse' && (
                            <ReverseEngineeringStep onNext={handleNext} onBack={handleBack} />
                        )}
                        {currentStepKey === 'marathon' && (
                            <MarathonExampleStep onNext={handleNext} onBack={handleBack} />
                        )}
                        {currentStepKey === 'challenges' && (
                            <ChallengesOverviewStep onSelectChallenge={handleSelectChallenge} onBack={handleBack} />
                        )}
                        {currentStepKey === 'summary' && (
                            <SummaryStep onComplete={handleProceed} onBack={handleBack} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            
            <ChallengeDetailModal 
                challenge={activeChallenge!}
                isActive={!!selectedChallenge && !!activeChallenge}
                onClose={() => setSelectedChallenge(null)}
                onCreateProject={(days?: number) => {
                    setSelectedChallenge(null);
                    handleProceed(days);
                }}
            />
        </div>,
        document.body
    );
};
