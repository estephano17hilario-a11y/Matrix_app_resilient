import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ShieldAlert, Skull, ChevronRight, ChevronLeft, AlertTriangle, Flame, Sparkles, Brain, Calendar, RotateCcw, Check, Info, ChevronDown, Hexagon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Attribute, BadHabit } from '../../../types';
import { useTranslation } from 'react-i18next';
import { IconPicker } from './IconPicker';

interface BadHabitWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<BadHabit>) => void;
    attributes: Attribute[];
    isFirstIdentify?: boolean;
    onSwitchToHabit?: () => void;
    initialData?: BadHabit;
}

const STREAK_TARGETS = [1, 3, 7, 14, 30, 60, 90, 130, 180, 240, 310, 365];

const AmbientBackground = ({ isIntelligent }: { isIntelligent?: boolean }) => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-200">
        {!isIntelligent ? (
            <>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,_rgba(99,102,241,0.12)_0%,_transparent_50%)] transition-opacity duration-200" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,_rgba(244,63,94,0.12)_0%,_transparent_50%)] transition-opacity duration-200" />
            </>
        ) : (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
            >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.12)_0%,_rgba(15,23,42,0)_80%)] animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[radial-gradient(circle_at_center,_rgba(192,132,252,0.15)_0%,_transparent_70%)]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.1)_0%,_transparent_70%)]" />
                
                {/* Estrellas cosmicas ligeras para evitar lag, sin blur para 0% impacto en GPU */}
                <div className="absolute top-[20%] left-[30%] w-1 h-1 bg-white rounded-full opacity-60 animate-ping" style={{ animationDuration: '8s' }} />
                <div className="absolute top-[60%] left-[80%] w-1.5 h-1.5 bg-violet-300 rounded-full opacity-40 animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute top-[80%] left-[20%] w-0.5 h-0.5 bg-cyan-200 rounded-full opacity-80 animate-ping" style={{ animationDuration: '12s' }} />
            </motion.div>
        )}
    </div>
);

const springConfig = { type: "spring" as const, stiffness: 400, damping: 25, mass: 0.8 };
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 15 : -15,
        opacity: 0,
        scale: 0.98
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (direction: number) => ({
        x: direction < 0 ? 15 : -15,
        opacity: 0,
        scale: 0.98
    })
};

export const BadHabitWizard: React.FC<BadHabitWizardProps> = ({
    isOpen,
    onClose,
    onConfirm,
    attributes,
    isFirstIdentify,
    onSwitchToHabit,
    initialData
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(0);

    const [title, setTitle] = useState(initialData?.title || '');
    const [iconName, setIconName] = useState<string>('Skull');
    const [customColor, setCustomColor] = useState<string>('#f43f5e');
    const [selectedAttributes, setSelectedAttributes] = useState<string[]>(() => {
        if (initialData?.attribute) {
            return initialData.attribute.split(',').map(s => s.trim()).filter(Boolean);
        }
        return [];
    });
    const attribute = selectedAttributes[0] || '';
    const [subAttribute, setSubAttribute] = useState(initialData?.subAttribute || '');
    const [isSubAttrPickerOpen, setSubAttrPickerOpen] = useState(false);
    const [reason, setReason] = useState(initialData?.reason || '');
    const [impactLevel, setImpactLevel] = useState(() => {
        if (initialData?.negativeImpact) {
            const match = initialData.negativeImpact.match(/\d+/);
            if (match) return parseInt(match[0], 10);
        }
        return 3;
    });
    const [timeIndex, setTimeIndex] = useState(() => {
        if (initialData?.timeConsumed) {
            const timeMap: Record<number, number> = { 15: 0, 30: 1, 60: 2, 120: 3, 180: 4, 240: 5 };
            return timeMap[initialData.timeConsumed] ?? 4;
        }
        return 4;
    });
    const [inputMode, setInputMode] = useState<'LIST' | 'CUSTOM'>('CUSTOM');
    const [viceList, setViceList] = useState<string[]>([
        t('badHabits.tags.procrastinate', 'Procrastinar'),
        t('badHabits.tags.socialMedia', 'Redes sociales'),
        t('badHabits.tags.junkFood', 'Comida chatarra'),
        t('badHabits.tags.fap', 'Fap')
    ]);
    const [listDraft, setListDraft] = useState('');
    const [intelligentStreak, setIntelligentStreak] = useState(initialData?.intelligentStreak || false);
    const [showIntelligentInfo, setShowIntelligentInfo] = useState(false);

    const selectedAttr = React.useMemo(() => attributes.find(a => a.id === attribute), [attributes, attribute]);

    const getMinutesFromIndex = (index: number) => {
        if (index <= 7) return (index + 1) * 15;
        return 120 + ((index - 7) * 60);
    };

    const minutes = getMinutesFromIndex(timeIndex);
    const SelectedIconComponent = iconName && (LucideIcons as any)[iconName]
        ? (LucideIcons as any)[iconName]
        : null;

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setDirection(0);
            if (initialData) {
                setTitle(initialData.title || '');
                const initialAttrs = initialData.attribute ? initialData.attribute.split(',').map(s => s.trim()).filter(Boolean) : [];
                setSelectedAttributes(initialAttrs);
                setSubAttribute(initialData.subAttribute || '');
                setReason(initialData.reason || '');
                setIntelligentStreak(initialData.intelligentStreak || false);
                if (initialData.negativeImpact) {
                    const match = initialData.negativeImpact.match(/\d+/);
                    if (match) setImpactLevel(parseInt(match[0], 10));
                } else {
                    setImpactLevel(3);
                }
                if (initialData.timeConsumed) {
                    const timeMap: Record<number, number> = { 15: 0, 30: 1, 60: 2, 120: 3, 180: 4, 240: 5 };
                    setTimeIndex(timeMap[initialData.timeConsumed] ?? 4);
                } else {
                    setTimeIndex(4);
                }
                setIconName(initialData.iconName || 'Skull');
                setCustomColor(initialData.customColor || '#f43f5e');
            } else {
                setTitle('');
                setSelectedAttributes([]);
                setSubAttribute('');
                setReason('');
                setImpactLevel(3);
                setTimeIndex(4);
                setIntelligentStreak(false);
                setIconName('Skull');
                setCustomColor('#f43f5e');
            }
            setInputMode(isFirstIdentify ? 'LIST' : 'CUSTOM');
            setViceList([
                t('badHabits.tags.procrastinate', 'Procrastinar'),
                t('badHabits.tags.socialMedia', 'Redes sociales'),
                t('badHabits.tags.junkFood', 'Comida chatarra'),
                t('badHabits.tags.fap', 'Fap')
            ]);
            setListDraft('');
        }
    }, [isOpen, initialData, isFirstIdentify, t]);

    // Reset subAttribute only when attribute is manually changed, not on mount/populate

    const handleNext = () => {
        if (step < (intelligentStreak ? 4 : 3)) {
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
        const calculatedHp = impactLevel * 5;
        const calculatedXp = impactLevel * 10;
        const calculatedGold = impactLevel * 20;

        onConfirm({
            ...(initialData || {}),
            title,
            attribute: selectedAttributes.join(','),
            subAttribute: selectedAttributes.length === 1 ? (subAttribute || undefined) : undefined,
            reason,
            negativeImpact: `Nivel de Impacto: ${impactLevel}/5`,
            timeConsumed: minutes,
            intelligentStreak,
            iconName,
            customColor,
            currentTarget: initialData ? (intelligentStreak ? (initialData.currentTarget || 1) : undefined) : (intelligentStreak ? 1 : undefined),
            reachedDays: initialData ? (intelligentStreak ? (initialData.reachedDays || 0) : undefined) : 0,
            penalties: {
                hp: calculatedHp,
                xp: calculatedXp,
                gold: calculatedGold
            }
        });
        onClose();
        
        // Dispatch event for TourGuide
        window.dispatchEvent(new CustomEvent('bad-habit-created'));
    };

    const handleClose = () => {
        onClose();
    };

    const handleAddListItems = () => {
        const items = listDraft.split(/[\n,]+/).map(item => item.trim()).filter(Boolean);
        if (items.length === 0) return;
        setViceList(prev => {
            const existing = new Set(prev.map(item => item.toLowerCase()));
            const merged = [...prev];
            items.forEach(item => {
                if (!existing.has(item.toLowerCase())) merged.push(item);
            });
            return merged;
        });
        setTitle(items[0]);
        setListDraft('');
    };

    const isStepValid = () => {
        if (step === 1) return title.length > 2 && attribute;
        if (step === 2) return reason.length > 5;
        return true;
    };

    const getStepCount = () => intelligentStreak ? 4 : 3;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 font-sans"
                >
                    <div
                        className="absolute inset-0 bg-[#030303]/80"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={springConfig}
                        className="relative w-full max-w-lg bg-[#0d0d0f] rounded-[28px] sm:rounded-[32px] shadow-md overflow-hidden border border-white/[0.06] max-h-[90vh] flex flex-col"
                    >
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                        <AmbientBackground isIntelligent={intelligentStreak} />

                        <div className="relative flex flex-col h-full overflow-hidden">
                            <div className="px-5 pt-5 pb-2 sm:px-8 sm:pt-7 flex justify-between items-center z-10 shrink-0">
                                <div>
                                    <motion.div
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2 mb-1"
                                    >
                                        <div className="p-1 bg-rose-500/15 rounded-md">
                                            <Skull size={13} className="text-rose-400" />
                                        </div>
                                        <span className="text-[11px] font-bold text-rose-400 tracking-wider uppercase">{t('badHabits.purgeProtocol', 'Purge Protocol')}</span>
                                        {intelligentStreak && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 rounded-full ml-1"
                                            >
                                                <Sparkles size={10} className="text-violet-400" />
                                                <span className="text-[9px] font-bold text-violet-400 uppercase">{t('badHabits.intelligent', 'Intelligent')}</span>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                        {step === 1 && t('badHabits.wizard.step1', 'Identificar Anomalía')}
                                        {step === 2 && t('badHabits.wizard.step2', 'Diagnóstico del Fallo')}
                                        {step === 3 && !intelligentStreak && t('badHabits.wizard.step3Normal', 'Ejecutar Eliminación')}
                                        {step === 3 && intelligentStreak && t('badHabits.wizard.step3Intelligent', 'Sistema Inteligente')}
                                        {step === 4 && t('badHabits.wizard.step4', 'Ejecutar Eliminación')}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    {onSwitchToHabit && (
                                        <div className="flex p-0.5 rounded-full bg-white/5 border border-white/10">
                                            <button 
                                                onClick={onSwitchToHabit}
                                                className="px-3 py-1 rounded-full text-white/40 text-[10px] font-bold hover:text-white transition-colors"
                                            >
                                                {t('habits.habit', 'Hábito')}
                                            </button>
                                            <div className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold shadow-sm">
                                                {t('habits.vice', 'Vicio')}
                                            </div>
                                        </div>
                                    )}
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleClose}
                                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors border border-white/5"
                                    >
                                        <X size={17} />
                                    </motion.button>
                                </div>
                            </div>

                            <div className="px-5 sm:px-8 mt-3 mb-4 shrink-0">
                                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden flex">
                                    <motion.div
                                        animate={{ width: `${(step / getStepCount()) * 100}%` }}
                                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                        className="h-full bg-gradient-to-r from-indigo-500 to-rose-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 px-5 sm:px-8 relative overflow-hidden min-h-[420px]">
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
                                            ref={(el: HTMLDivElement | null) => { if (el) el.scrollTop = 0; }}
                                            className="absolute inset-x-5 sm:inset-x-8 top-0 bottom-0 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-24"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{t('badHabits.mode', 'Mode')}</span>
                                                    <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                                                        <button
                                                            onClick={() => setInputMode('LIST')}
                                                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                                inputMode === 'LIST' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                                                            }`}
                                                        >
                                                            {t('badHabits.list', 'List')}
                                                        </button>
                                                        <button
                                                            onClick={() => setInputMode('CUSTOM')}
                                                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                                inputMode === 'CUSTOM' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                                                            }`}
                                                        >
                                                            {t('badHabits.manual', 'Manual')}
                                                        </button>
                                                    </div>
                                                </div>

                                                {inputMode === 'LIST' && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                value={listDraft}
                                                                onChange={(e) => setListDraft(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleAddListItems();
                                                                    }
                                                                }}
                                                                placeholder={t('badHabits.addVicesPlaceholder', 'Add vices (comma or line break)')}
                                                                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/30 focus:ring-1 focus:ring-rose-500/20 transition-all"
                                                            />
                                                            <button
                                                                onClick={handleAddListItems}
                                                                disabled={!listDraft.trim()}
                                                                className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                                    listDraft.trim()
                                                                        ? 'bg-rose-500/15 text-rose-200 border border-rose-500/25'
                                                                        : 'bg-white/[0.03] text-white/20 border border-white/5 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {t('common.add', 'Agregar')}
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar pb-1">
                                                            {viceList.map(item => (
                                                                <button
                                                                    key={item}
                                                                    onClick={() => setTitle(item)}
                                                                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                                                                        title === item
                                                                            ? 'bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                                                            : 'bg-white/[0.04] text-white/60 border-white/[0.08] hover:bg-white/[0.08] hover:text-white hover:border-white/20'
                                                                    }`}
                                                                >
                                                                    {item}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[12px] sm:text-sm font-medium text-white/60 ml-1">
                                                    {t('badHabits.wizard.selectHabitToRemove', 'What habit do you want to remove?')}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        placeholder={t('badHabits.viceExamplePlaceholder', 'E.g. Smoking, TikTok...')}
                                                        className="w-full bg-transparent border-b-2 border-white/10 px-1 py-3 text-xl sm:text-2xl font-bold text-white placeholder-white/10 focus:outline-none focus:border-rose-500/50 transition-colors"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <IconPicker
                                                    selectedIcon={iconName || null}
                                                    onSelectIcon={(icon) => setIconName(icon || 'Skull')}
                                                    selectedColor={customColor}
                                                    onSelectColor={(color) => setCustomColor(color || '#f43f5e')}
                                                />
                                            </div>

                                            <div className="space-y-3 pb-2">
                                                <label className="text-[12px] sm:text-sm font-medium text-white/60 ml-1">
                                                    {t('badHabits.wizard.affectsAttribute', 'Afecta a tu atributo:')}
                                                </label>
                                                <div className="grid grid-cols-2 gap-2 pr-1">
                                                    {attributes.map(attr => {
                                                        const isSelected = selectedAttributes.includes(attr.id);
                                                        return (
                                                            <motion.button
                                                                key={attr.id}
                                                                type="button"
                                                                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.06)" }}
                                                                whileTap={{ scale: 0.98 }}
                                                                onClick={() => {
                                                                    setSelectedAttributes(prev => {
                                                                        if (prev.includes(attr.id)) {
                                                                            return prev.filter(id => id !== attr.id);
                                                                        } else {
                                                                            if (prev.length < 3) {
                                                                                return [...prev, attr.id];
                                                                            }
                                                                            return prev;
                                                                        }
                                                                    });
                                                                    setSubAttribute('');
                                                                }}
                                                                className={`relative p-3 rounded-xl border text-left transition-all duration-200 group ${
                                                                    isSelected
                                                                        ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/15'
                                                                        : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={`p-1.5 rounded-lg transition-colors ${
                                                                        isSelected ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'bg-white/[0.05] text-white/40 group-hover:bg-white/10'
                                                                    }`}>
                                                                        <Zap size={13} />
                                                                    </div>
                                                                    <span className={`text-[12px] sm:text-sm font-medium ${
                                                                        isSelected ? 'text-white' : 'text-white/50 group-hover:text-white/70'
                                                                    }`}>
                                                                        {t(attr.label, attr.label.replace('traits.', ''))}
                                                                    </span>
                                                                </div>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Info banner about splitting penalty */}
                                                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-2.5 mt-2 select-none">
                                                    <Info size={14} className="text-rose-400 shrink-0 mt-0.5" />
                                                    <span className="text-[11px] text-white/50 leading-normal">
                                                        Puedes seleccionar hasta 3 atributos. La penalización de TP por recaídas se repartirá equitativamente entre los atributos elegidos.
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Sub-Trait Picker */}
                                            {selectedAttributes.length === 1 && selectedAttr?.subTraits && selectedAttr.subTraits.length > 0 && (
                                                <div className="space-y-1.5 animate-in slide-in-from-top-1 fade-in">
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block px-1">
                                                        Sub-Rasgo (Opcional)
                                                    </span>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSubAttrPickerOpen(!isSubAttrPickerOpen)}
                                                            className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between px-4 text-xs font-medium text-white transition-colors hover:bg-white/[0.06]"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {subAttribute ? (
                                                                    <span className="text-white font-bold">
                                                                        {selectedAttr.subTraits.find(st => st.id === subAttribute)?.name || subAttribute}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-white/30">Vincular a un sub-rasgo (Opcional)</span>
                                                                )}
                                                            </div>
                                                            <ChevronDown size={14} className="text-white/30" />
                                                        </button>
                                                        
                                                        {isSubAttrPickerOpen && (
                                                            <>
                                                                <div className="fixed inset-0 z-[998] bg-transparent" onClick={() => setSubAttrPickerOpen(false)} />
                                                                <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-[#141416] rounded-xl flex flex-col gap-1 z-[999] shadow-md border border-white/10 max-h-[160px] overflow-y-auto custom-scrollbar">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setSubAttribute(''); setSubAttrPickerOpen(false); }}
                                                                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left text-xs font-bold text-white/50"
                                                                    >
                                                                        Ninguno
                                                                    </button>
                                                                    {selectedAttr.subTraits.map(st => (
                                                                        <button
                                                                            key={st.id}
                                                                            type="button"
                                                                            onClick={() => { setSubAttribute(st.id); setSubAttrPickerOpen(false); }}
                                                                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                                                                        >
                                                                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                                                                {st.iconName && (LucideIcons as any)[st.iconName] ? React.createElement((LucideIcons as any)[st.iconName], { size: 12 }) : <Hexagon size={12} />}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs font-bold text-white">{st.name}</span>
                                                                                <span className="text-[9px] font-bold text-slate-500">Lvl {st.level}</span>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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
                                            ref={(el: HTMLDivElement | null) => { if (el) el.scrollTop = 0; }}
                                            className="absolute inset-x-5 sm:inset-x-8 top-0 bottom-0 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-24"
                                        >
                                            <div className="space-y-3">
                                                <label className="text-[12px] sm:text-sm font-medium text-white/60 ml-1">
                                                    {t('badHabits.wizard.reasonLabel', 'Why do you want to quit?')}
                                                </label>
                                                <textarea
                                                    value={reason}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    placeholder={t('badHabits.wizard.reasonPlaceholder', 'Write your main reason for quitting this vice...')}
                                                    className="w-full h-28 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-white placeholder-white/15 focus:outline-none focus:bg-white/[0.05] focus:border-rose-500/30 focus:ring-1 focus:ring-rose-500/15 transition-all resize-none text-[13px]"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[12px] sm:text-sm font-medium text-rose-400 ml-1 flex items-center gap-1.5">
                                                    <AlertTriangle size={13} />
                                                    {t('badHabits.wizard.negativeImpact', 'Impacto Negativo')}
                                                </label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {[1, 2, 3, 4, 5].map((level) => (
                                                        <button
                                                            key={level}
                                                            onClick={() => setImpactLevel(level)}
                                                            className={`
                                                                h-11 rounded-xl font-bold text-base transition-all border
                                                                ${impactLevel === level
                                                                    ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)] scale-105 z-10'
                                                                    : 'bg-white/[0.03] text-white/20 border-white/[0.05] hover:bg-white/[0.06] hover:text-white/60 hover:border-white/10'}
                                                            `}
                                                        >
                                                            {level}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="text-center text-[12px] font-medium text-rose-200/50 h-5 tracking-wide">
                                                    {impactLevel === 1 && t('badHabits.wizard.impactLevel1', 'Leve - Molestia menor')}
                                                    {impactLevel === 2 && t('badHabits.wizard.impactLevel2', 'Bajo - Interferencia ocasional')}
                                                    {impactLevel === 3 && t('badHabits.wizard.impactLevel3', 'Moderado - Afecta el rendimiento')}
                                                    {impactLevel === 4 && t('badHabits.wizard.impactLevel4', 'Alto - Daño significativo')}
                                                    {impactLevel === 5 && t('badHabits.wizard.impactLevel5', 'CRÍTICO - Colapso inminente')}
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center justify-between ml-1">
                                                    <label className="text-[12px] sm:text-sm font-medium text-white/60 flex items-center gap-1.5">
                                                        <Brain size={13} className="text-violet-400" />
                                                        {t('badHabits.wizard.aiMode', 'Modo Inteligencia Artificial')}
                                                    </label>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setShowIntelligentInfo(!showIntelligentInfo)}
                                                        className="text-violet-400/70 hover:text-violet-300 transition-colors p-1"
                                                    >
                                                        <Info size={14} />
                                                    </motion.button>
                                                </div>

                                                <AnimatePresence>
                                                    {showIntelligentInfo && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            transition={{ duration: 0.15, ease: "easeInOut" }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border border-violet-500/20 mb-3 relative overflow-hidden group">
                                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.1)_0%,_transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                                                <h4 className="text-[13px] font-bold text-violet-200 mb-2 flex items-center gap-2">
                                                                    <Sparkles size={14} className="text-violet-400 animate-pulse" />
                                                                    {t('badHabits.wizard.whatIsIntelligentStreak', '¿Qué es la Racha Inteligente?')}
                                                                </h4>
                                                                <p className="text-[11px] text-violet-100/70 leading-relaxed mb-2">
                                                                    {t('badHabits.wizard.intelligentStreakDesc1', 'Es un sistema revolucionario que entiende que somos humanos. En lugar de castigarte brutalmente por un error y volver a cero (lo cual destruye la motivación), utiliza un ')}<span className="font-semibold text-violet-300">{t('badHabits.wizard.intelligentStreakDesc2', 'algoritmo de progreso escalonado')}</span>.
                                                                </p>
                                                                <ul className="text-[11px] text-violet-100/60 space-y-1.5 list-disc pl-4 mb-2">
                                                                    <li><strong className="text-violet-200">{t('badHabits.wizard.gradualGoals', 'Metas Graduales:')}</strong> {t('badHabits.wizard.gradualGoalsDesc', 'Empiezas con 1 día, luego 3, 7, 14, 30...')}</li>
                                                                    <li><strong className="text-emerald-300">{t('badHabits.wizard.opportunityDays', 'Días de Oportunidad:')}</strong> {t('badHabits.wizard.opportunityDaysDesc', 'Al cumplir una meta, ganas un día donde puedes cometer el vicio SIN perder tu racha.')}</li>
                                                                    <li><strong className="text-rose-300">{t('badHabits.wizard.softFall', 'Caída Suave:')}</strong> {t('badHabits.wizard.softFallDesc', 'Si fallas, no vuelves a cero. Solo retrocedes a la meta anterior.')}</li>
                                                                </ul>
                                                                <p className="text-[11px] text-violet-300/80 font-medium italic mt-2 border-t border-violet-500/20 pt-2">
                                                                    {t('badHabits.wizard.intelligentStreakQuote', '"Perfecto para vicios difíciles de dejar de golpe, creando un camino realista hacia la libertad."')}
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setIntelligentStreak(!intelligentStreak)}
                                                    className={`w-full p-4 rounded-2xl border transition-all duration-200 text-left ${
                                                        intelligentStreak
                                                            ? 'bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                                                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2.5 rounded-xl ${intelligentStreak ? 'bg-violet-500/20 text-violet-400' : 'bg-white/[0.05] text-white/40'}`}>
                                                                <Sparkles size={18} />
                                                            </div>
                                                            <div>
                                                                <div className={`text-[13px] font-semibold ${intelligentStreak ? 'text-violet-200' : 'text-white/80'}`}>
                                                                    {t('badHabits.wizard.intelligentStreak', 'Racha Inteligente')}
                                                                </div>
                                                                <div className="text-[11px] text-white/40 mt-0.5">
                                                                    {t('badHabits.wizard.gradualProcessNoPenalty', 'Proceso gradual sin penalización')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 ${intelligentStreak ? 'bg-violet-500' : 'bg-white/10'}`}>
                                                            <motion.div
                                                                animate={{ x: intelligentStreak ? 20 : 0 }}
                                                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                                                className="w-5 h-5 rounded-full bg-white shadow-md"
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 3 && intelligentStreak && (
                                        <motion.div
                                            key="step3-intelligent"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={springConfig}
                                            ref={(el: HTMLDivElement | null) => { if (el) el.scrollTop = 0; }}
                                            className="absolute inset-x-5 sm:inset-x-8 top-0 bottom-0 overflow-y-auto custom-scrollbar pr-2 pb-24"
                                        >
                                            <div className="bg-gradient-to-br from-violet-950/20 to-indigo-950/20 border border-violet-500/15 rounded-2xl p-5 mb-5">
                                                <div className="flex items-center gap-2.5 mb-4">
                                                    <div className="p-2 bg-violet-500/15 rounded-xl">
                                                        <Brain size={18} className="text-violet-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[15px] font-bold text-violet-200">{t('badHabits.intelligentStreakSystem', 'Intelligent Streak System')}</h3>
                                                        <p className="text-[11px] text-violet-300/50">{t('badHabits.learnFromRelapses', 'Learns from your relapses, does not penalize them')}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 mb-5">
                                                    <div className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                                                        <div className="p-1.5 bg-emerald-500/15 rounded-lg mt-0.5">
                                                            <Calendar size={14} className="text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[12px] font-semibold text-emerald-200 mb-1">{t('badHabits.wizard.gradualProcess', 'Gradual Process')}</div>
                                                            <div className="text-[11px] text-white/50 leading-relaxed">
                                                                {t('badHabits.wizard.gradualDesc', 'Goals increase gradually: 1 → 3 → 7 → 14 → 30 → 60 → 90 → 130 → 180 → 240 → 310 → 365 days')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                                                        <div className="p-1.5 bg-amber-500/15 rounded-lg mt-0.5">
                                                            <Check size={14} className="text-amber-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[12px] font-semibold text-amber-200 mb-1">{t('badHabits.wizard.opportunityDay', 'Opportunity Day')}</div>
                                                            <div className="text-[11px] text-white/50 leading-relaxed">
                                                                {t('badHabits.wizard.opportunityDesc', 'When you reach the goal, you have 1 day to indulge in the vice WITHOUT penalty. Your streak is maintained.')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                                                        <div className="p-1.5 bg-rose-500/15 rounded-lg mt-0.5">
                                                            <RotateCcw size={14} className="text-rose-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[12px] font-semibold text-rose-200 mb-1">{t('badHabits.wizard.returnNoPenalty', 'Regresa, no penaliza')}</div>
                                                            <div className="text-[11px] text-white/50 leading-relaxed">
                                                                {t('badHabits.wizard.returnNoPenaltyDesc', 'Si fallas, vuelves a la meta anterior. No pierdes todo, solo retrocedes un nivel.')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                                    <div className="text-[11px] text-white/40 mb-3 uppercase tracking-wider font-semibold">{t('badHabits.visualExample', 'Visual Example')}</div>
                                                    <div className="flex items-center justify-between">
                                                        {STREAK_TARGETS.slice(0, 5).map((target, i) => (
                                                            <div key={target} className="flex flex-col items-center">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                                                    i === 0
                                                                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                                                                        : 'bg-white/5 text-white/30 border border-white/10'
                                                                }`}>
                                                                    {target}
                                                                </div>
                                                                <div className="text-[9px] text-white/30 mt-1">{t('common.days', 'days')}</div>
                                                                {i < 4 && (
                                                                    <div className="absolute left-1/2 w-full h-px bg-gradient-to-r from-violet-500/50 to-transparent" style={{ display: 'none' }} />
                                                                )}
                                                            </div>
                                                        ))}
                                                        <div className="text-[10px] text-violet-400/60">...</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-amber-950/15 border border-amber-500/15 rounded-xl p-4">
                                                <div className="flex items-start gap-2.5">
                                                    <Info size={15} className="text-amber-400 mt-0.5 shrink-0" />
                                                    <p className="text-[11px] text-amber-200/70 leading-relaxed">
                                                        {t('badHabits.wizard.intelligentStreakExample', 'Si estás en la meta de 14 días y fallas el día 10, volverás a la meta de 7 días. ¡No se reinicia a 0!')}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 3 && !intelligentStreak && (
                                        <motion.div
                                            key="step3-normal"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={springConfig}
                                            ref={(el: HTMLDivElement | null) => { if (el) el.scrollTop = 0; }}
                                            className="absolute inset-x-5 sm:inset-x-8 top-0 bottom-0 overflow-y-auto custom-scrollbar pr-2 pb-24 flex flex-col"
                                        >
                                            <div className="bg-rose-950/15 border border-rose-500/15 rounded-2xl p-5 mb-5">
                                                <h3 className="text-[14px] font-semibold text-rose-200 mb-3 flex items-center gap-2">
                                                    <Flame size={16} className="text-rose-500" />
                                                    {t('badHabits.wizard.timePerSession', 'Tiempo por Sesión')}
                                                </h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm items-end">
                                                        <span className="text-white/50">{t('common.estimatedDuration', 'Estimated Duration')}</span>
                                                        <span className="font-mono font-bold text-lg text-rose-400">
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
                                                        className="w-full accent-rose-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                    />
                                                    <div className="flex justify-between text-[10px] text-white/25 font-mono px-1">
                                                        <span>15m</span>
                                                        <span>2h</span>
                                                        <span>12h</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-5 flex-1">
                                                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                    <span className="text-[12px] text-white/50">{t('badHabits.reason', 'Reason')}</span>
                                                    <span className="text-[12px] text-white/80 font-medium truncate max-w-[200px] text-right">{reason}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                    <span className="text-[12px] text-white/50">{t('badHabits.impact', 'Impact')}</span>
                                                    <span className="text-[12px] text-rose-400 font-medium">Nivel {impactLevel}/5</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                    <span className="text-[12px] text-white/50">{t('badHabits.attribute', 'Attribute')}</span>
                                                    <span className="text-[12px] text-white/80 font-medium">
                                                        {attributes.find(a => a.id === attribute)?.label.replace('traits.', '') || 'General'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-center space-y-2 mt-auto mb-4">
                                                <p className="text-[13px] text-white/35 italic">
                                                    {t('badHabits.wizard.quote', 'The only way to win is not to play.')}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 4 && (
                                        <motion.div
                                            key="step4"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={springConfig}
                                            ref={(el: HTMLDivElement | null) => { if (el) el.scrollTop = 0; }}
                                            className="absolute inset-x-5 sm:inset-x-8 top-0 bottom-0 overflow-y-auto custom-scrollbar pr-2 pb-24 flex flex-col"
                                        >
                                            <div className={`border rounded-2xl p-6 mb-6 text-center transition-colors duration-200 ${intelligentStreak ? 'bg-gradient-to-br from-violet-900/40 via-indigo-900/20 to-fuchsia-900/30 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]' : 'bg-gradient-to-br from-rose-950/20 to-violet-950/15 border-white/5'}`}>
                                                <div 
                                                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl border flex items-center justify-center transition-colors duration-200 ${intelligentStreak ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.3)]' : 'bg-gradient-to-br from-rose-500/20 to-violet-500/20 border-white/10'}`}
                                                    style={{ color: customColor }}
                                                >
                                                    {SelectedIconComponent ? (
                                                        <SelectedIconComponent size={28} />
                                                    ) : intelligentStreak ? (
                                                        <Sparkles size={28} className="text-violet-300" />
                                                    ) : (
                                                        <Skull size={28} />
                                                    )}
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                                                <p className="text-[12px] text-white/40">{t('badHabits.wizard.readyToActivate', 'Protocol ready to activate')}</p>

                                                {intelligentStreak && (
                                                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full">
                                                        <Sparkles size={14} className="text-violet-400" />
                                                        <span className="text-[11px] font-semibold text-violet-300">{t('badHabits.intelligentStreakActivated', 'Intelligent Streak Activated')}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                    <span className="text-[12px] text-white/50">{t('badHabits.reason', 'Reason')}</span>
                                                    <span className="text-[12px] text-white/80 font-medium truncate max-w-[200px]">{reason}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                    <span className="text-[12px] text-white/50">{t('badHabits.impact', 'Impact')}</span>
                                                    <span className="text-[12px] text-rose-400 font-medium">Nivel {impactLevel}/5</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                    <span className="text-[12px] text-white/50">{t('badHabits.attribute', 'Attribute')}</span>
                                                    <span className="text-[12px] text-white/80 font-medium">
                                                        {attributes.find(a => a.id === attribute)?.label.replace('traits.', '') || 'General'}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="p-5 sm:p-7 pt-3 flex justify-between items-center bg-gradient-to-t from-[#0d0d0f] to-transparent shrink-0">
                                {step > 1 ? (
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={handleBack}
                                        className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors text-[12px] sm:text-[13px]"
                                    >
                                        <ChevronLeft size={16} />
                                        <span className="font-medium">{t('common.back', 'Back')}</span>
                                    </motion.button>
                                ) : <div />}

                                <motion.button
                                    whileHover={{ scale: 1.04, boxShadow: "0 0 25px rgba(244,63,94,0.25)" }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleNext}
                                    disabled={!isStepValid()}
                                    className={`
                                        flex items-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full font-bold text-[13px] sm:text-[14px] shadow-lg transition-all
                                        ${isStepValid()
                                            ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-rose-900/20'
                                            : 'bg-white/8 text-white/20 cursor-not-allowed'}
                                    `}
                                >
                                    <span>{step === getStepCount() ? t('common.activate', 'Activar') : t('common.continue', 'Continuar')}</span>
                                    {step < getStepCount() && <ChevronRight size={16} />}
                                    {step === getStepCount() && <ShieldAlert size={15} />}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
