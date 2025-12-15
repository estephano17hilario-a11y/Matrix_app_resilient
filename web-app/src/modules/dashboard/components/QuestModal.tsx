import React, { useState, useMemo } from 'react';
import { X, Crosshair, Plus, Star, Circle, Square, Triangle, Diamond, Brain, ArrowRight, ChevronLeft, Calendar } from 'lucide-react';
import { Attribute, Quest } from '../../../types';
import { Difficulty, calculateTaskRewards } from '../../../utils/rewardCalculator';
import { RewardPredictionPill } from './RewardPredictionPill';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartDurationPicker } from './SmartDurationPicker';
import { FractalStructure, TimeUnit } from '../../../utils/fractalTimeEngine';

export const QuestModal = React.memo(({ isOpen, onClose, attributes, onConfirm }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], onConfirm: (data: Partial<Quest>) => void }) => {
    // Common State
    const [mode, setMode] = useState<'SIMPLE' | 'SMART'>('SIMPLE');
    const [title, setTitle] = useState(''); // Main Goal
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('D');
    const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);

    // Smart Mode State
    const [smartStep, setSmartStep] = useState<'SETUP' | 'QUESTIONS'>('SETUP');
    const [smartStructure, setSmartStructure] = useState<FractalStructure | null>(null);
    const [smartAnswers, setSmartAnswers] = useState<string[]>([]); // Index 0 is Main Goal (title)
    const [questionIndex, setQuestionIndex] = useState(0); // 0 = Main, 1 = First Drill Down...

    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#333333';
    const SelectedIcon = selectedAttr?.icon || Star;
    const activeLabel = selectedAttr?.label || 'Trait';

    const prediction = useMemo(() => {
        return calculateTaskRewards(difficulty, deadline);
    }, [difficulty, deadline]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (mode === 'SIMPLE') {
            onConfirm({ 
                title, 
                description: desc, 
                attribute: attrId, 
                difficulty, 
                deadline,
                xpReward: prediction.xp,
                gold: prediction.coins
            });
        } else {
            // Construct Smart Quest
            // Title is smartAnswers[0]
            // We can store the structure in description or a special field
            const smartData = {
                structure: smartStructure,
                answers: smartAnswers
            };
            
            onConfirm({
                title: smartAnswers[0] || title,
                description: JSON.stringify(smartData), // Storing in description for now or specific field if supported
                attribute: attrId,
                difficulty, // Maybe calculate based on duration?
                deadline,
                xpReward: prediction.xp * 2, // Bonus for smart planning
                gold: prediction.coins * 2,
                fractalStructure: smartData // Using the new field
            });
        }
    };

    const handleSmartDateChange = (structure: FractalStructure, endDate: Date) => {
        setSmartStructure(structure);
        setDeadline(endDate.toISOString().split('T')[0]);
    };

    const startQuestions = () => {
        if (!smartStructure) return;
        setSmartStep('QUESTIONS');
        setQuestionIndex(0);
        setSmartAnswers([title]); // Initialize with current title if any
    };

    const nextQuestion = () => {
        if (!smartStructure) return;
        const maxQuestions = smartStructure.drillDownPath.length + 1; // +1 for Main Goal
        
        if (questionIndex < maxQuestions - 1) {
            setQuestionIndex(prev => prev + 1);
        } else {
            handleConfirm();
        }
    };

    const prevQuestion = () => {
        if (questionIndex > 0) {
            setQuestionIndex(prev => prev - 1);
        } else {
            setSmartStep('SETUP');
        }
    };

    const updateAnswer = (val: string) => {
        const newAnswers = [...smartAnswers];
        newAnswers[questionIndex] = val;
        setSmartAnswers(newAnswers);
        if (questionIndex === 0) setTitle(val);
    };

    const getQuestionLabel = () => {
        if (questionIndex === 0) return `Objetivo Principal para ${new Date(deadline).toLocaleDateString('es-ES')}`;
        const unit = smartStructure?.drillDownPath[questionIndex - 1];
        const unitLabel = getUnitName(unit);
        return `Para lograr eso, definamos el objetivo del primer [${unitLabel}]`;
    };
    
    const getUnitName = (u?: TimeUnit) => {
        switch(u) {
            case '10_YEARS': return 'DÉCADA';
            case '5_YEARS': return 'LUSTRO';
            case '1_YEAR': return 'AÑO';
            case 'SEMESTER': return 'SEMESTRE';
            case 'QUARTER': return 'TRIMESTRE';
            case 'MONTH': return 'MES';
            case 'WEEK': return 'SEMANA';
            case 'DAY': return 'DÍA';
            default: return 'BLOQUE';
        }
    };

    const difficulties: { id: Difficulty, label: string, icon: React.ElementType, color: string }[] = [
        { id: 'E', label: 'E', icon: Circle, color: 'text-slate-400' },
        { id: 'D', label: 'D', icon: Square, color: 'text-emerald-400' },
        { id: 'C', label: 'C', icon: Triangle, color: 'text-cyan-400' },
        { id: 'B', label: 'B', icon: Diamond, color: 'text-yellow-400' },
        { id: 'A', label: 'A', icon: Star, color: 'text-rose-500' },
        { id: 'S', label: 'S', icon: Crosshair, color: 'text-purple-500' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px] animate-modal-enter">
                <div className="glass-panel rounded-[2.5rem] p-5 overflow-visible relative transition-all duration-500" style={{
                    background: 'rgba(20, 20, 25, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    {/* Header with Mode Switch */}
                    <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : '#333' }}>
                                {mode === 'SIMPLE' ? <Crosshair size={18} className="text-white" /> : <Brain size={18} className="text-white" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">
                                    {mode === 'SIMPLE' ? 'New Mission' : 'Smart Task'}
                                </h2>
                                <button 
                                    onClick={() => setMode(m => m === 'SIMPLE' ? 'SMART' : 'SIMPLE')}
                                    className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider hover:text-indigo-300 transition-colors flex items-center gap-1 mt-1"
                                >
                                    {mode === 'SIMPLE' ? 'Switch to Smart' : 'Back to Simple'} <ArrowRight size={10} />
                                </button>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:bg-white/20 transition-colors hover:bg-white/10">
                            <X size={16} className="text-white/70" />
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {mode === 'SIMPLE' ? (
                            <motion.div 
                                key="SIMPLE"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                {/* Title & Attribute */}
                                <div className="flex gap-2">
                                     <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-colors">
                                         <input 
                                            type="text" 
                                            value={title} 
                                            onChange={(e) => setTitle(e.target.value)} 
                                            placeholder="Objective Name..." 
                                            className="w-full bg-transparent px-5 py-4 text-[17px] font-bold text-white placeholder:text-white/20 outline-none" 
                                            autoFocus 
                                        />
                                     </div>
                                     <div onClick={() => setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`}>
                                         {attrId ? (<SelectedIcon size={22} style={{ color: activeColor }} />) : <Plus size={22} className="text-white/30" />}
                                         {isAttrPickerOpen && (
                                             <>
                                                 <div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} />
                                                 <div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                     {attributes.map((attr) => {
                                                         const Icon = attr.icon;
                                                         return (
                                                             <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                                 <Icon size={16} style={{ color: attr.color }} />
                                                                 <span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span>
                                                             </button>
                                                         )
                                                     })}
                                                 </div>
                                             </>
                                         )}
                                     </div>
                                </div>

                                {/* Description */}
                                <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4">
                                    <input 
                                        type="text" 
                                        value={desc} 
                                        onChange={(e) => setDesc(e.target.value)} 
                                        placeholder="Briefing (Optional)..." 
                                        className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" 
                                    />
                                </div>

                                {/* Difficulty Selector (Liquid UI) */}
                                <div className="bg-black/20 rounded-[1.5rem] p-1 flex justify-between relative">
                                    {difficulties.map((diff) => {
                                        const isSelected = difficulty === diff.id;
                                        const DiffIcon = diff.icon;
                                        return (
                                            <button
                                                key={diff.id}
                                                onClick={() => setDifficulty(diff.id)}
                                                className="relative flex-1 h-10 flex items-center justify-center rounded-[1.2rem] transition-all duration-300 z-10"
                                            >
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="activeDiff"
                                                        className="absolute inset-0 bg-white/10 shadow-lg rounded-[1.2rem] border border-white/5"
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    />
                                                )}
                                                <div className={`flex items-center gap-1.5 ${isSelected ? 'scale-105' : 'opacity-50 grayscale scale-95'} transition-all duration-300`}>
                                                    <DiffIcon size={12} className={diff.color} fill={isSelected ? "currentColor" : "none"} />
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${diff.color}`}>
                                                        {diff.label}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Date Picker */}
                                <div className="rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-between px-5 py-3 relative overflow-hidden">
                                     <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                                     <span className="text-[10px] font-black text-white/30 uppercase">Due Date</span>
                                     <div className="flex items-baseline gap-1 pointer-events-none">
                                         <span className="text-lg font-bold text-white">{new Date(deadline).getDate()}</span>
                                         <span className="text-xs font-bold text-white/50 uppercase">{new Date(deadline).toLocaleDateString('en-US', { month: 'short' })}</span>
                                     </div>
                                </div>

                                {/* Reward Prediction Pill */}
                                <RewardPredictionPill 
                                    prediction={prediction} 
                                    attributeColor={activeColor} 
                                    AttributeIcon={SelectedIcon}
                                    attributeLabel={activeLabel}
                                />

                                <button 
                                    onClick={handleConfirm} 
                                    disabled={!title || !attrId} 
                                    className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-white/10 text-white shadow-lg active:scale-95 hover:shadow-xl hover:border-white/20'}`}
                                >
                                    Confirm Mission
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="SMART"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <AnimatePresence mode="wait">
                                    {smartStep === 'SETUP' ? (
                                        <motion.div
                                            key="SETUP"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-4"
                                        >
                                            <div className="text-sm text-white/60 font-medium">
                                                Define tu horizonte temporal.
                                            </div>
                                            
                                            <SmartDurationPicker 
                                                startDate={new Date()} 
                                                onStructureChange={handleSmartDateChange} 
                                            />

                                            {/* Attribute Picker for Smart Mode too */}
                                            <div onClick={() => setAttrPickerOpen(true)} className={`w-full h-14 rounded-[1.5rem] border flex items-center justify-center gap-2 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`}>
                                                 {attrId ? (
                                                    <>
                                                        <SelectedIcon size={22} style={{ color: activeColor }} />
                                                        <span className="text-sm font-bold text-white">{activeLabel}</span>
                                                    </>
                                                 ) : (
                                                    <>
                                                        <Plus size={22} className="text-white/30" />
                                                        <span className="text-sm font-bold text-white/30">Seleccionar Atributo</span>
                                                    </>
                                                 )}
                                                 {isAttrPickerOpen && (
                                                     <>
                                                         <div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} />
                                                         <div className="absolute bottom-full mb-2 left-0 right-0 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                             {attributes.map((attr) => {
                                                                 const Icon = attr.icon;
                                                                 return (
                                                                     <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                                                         <Icon size={16} style={{ color: attr.color }} />
                                                                         <span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span>
                                                                     </button>
                                                                 )
                                                             })}
                                                         </div>
                                                     </>
                                                 )}
                                             </div>

                                            <button 
                                                onClick={startQuestions}
                                                disabled={!smartStructure || !attrId}
                                                className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all ${(!smartStructure || !attrId) ? 'bg-white/5 text-white/20' : 'bg-indigo-600 text-white shadow-lg active:scale-95'}`}
                                            >
                                                Comenzar Planificación
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="QUESTIONS"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.05 }}
                                            className="space-y-4"
                                        >
                                            {/* Progress Header */}
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                                                <span>Paso {questionIndex + 1} / {smartStructure!.drillDownPath.length + 1}</span>
                                                <span>{questionIndex === 0 ? 'Meta Final' : getUnitName(smartStructure!.drillDownPath[questionIndex - 1])}</span>
                                            </div>

                                            {/* Question Card */}
                                            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                                    <Brain size={100} />
                                                </div>
                                                
                                                <h3 className="text-lg font-bold text-white mb-4 relative z-10 leading-tight">
                                                    {getQuestionLabel()}
                                                </h3>
                                                
                                                <textarea
                                                    value={smartAnswers[questionIndex] || ''}
                                                    onChange={(e) => updateAnswer(e.target.value)}
                                                    placeholder="Escribe tu objetivo aquí..."
                                                    className="w-full h-24 bg-black/20 rounded-xl p-4 text-white text-sm focus:outline-none resize-none relative z-10"
                                                    autoFocus
                                                />
                                            </div>

                                            {/* Navigation */}
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={prevQuestion}
                                                    className="h-14 w-14 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <button 
                                                    onClick={nextQuestion}
                                                    disabled={!smartAnswers[questionIndex]}
                                                    className="flex-1 h-14 rounded-[1.5rem] bg-white text-black font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                                >
                                                    {questionIndex === smartStructure!.drillDownPath.length ? 'Finalizar' : 'Siguiente'}
                                                    <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
});
