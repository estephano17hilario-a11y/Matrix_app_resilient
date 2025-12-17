import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, Layers, Lock, ChevronRight, Calendar, Check } from 'lucide-react';
import { useSmartTaskLogic } from './hooks/useSmartTaskLogic';
import { cn } from '../../utils/cn';
import { AuroraBackground } from '../../components/AuroraBackground';
import { SmartProject, TimeFrame } from '../../types/SmartGoal';
import { SmartTaskTutorial } from './components/SmartTaskTutorial';
import { getContextDates, formatDate } from '../../utils/dateUtils';
import { TRAITS_LIST } from '../dashboard/constants';
import { generateTimeBlocks, FractalStructure } from '../../utils/fractalTimeEngine';
import { differenceInDays } from 'date-fns';
import { Attribute } from '../../types';

interface SmartTaskWizardProps {
  onComplete: (project: SmartProject) => void;
  onCancel: () => void;
  availableTraits?: Attribute[];
}

export const SmartTaskWizard: React.FC<SmartTaskWizardProps> = ({ onComplete, onCancel, availableTraits }) => {
  const traits = availableTraits || TRAITS_LIST.map(t => ({ ...t, level: 1, xp: 0, maxXp: 100 }));
  
  const { 
    currentStep, 
    currentNode, 
    startProcess, 
    submitAnswer, 
    goBack, 
    jumpToLevel,
    generateProject,
    history,
    timeframeHierarchy
  } = useSmartTaskLogic();

  const [mainGoalInput, setMainGoalInput] = useState('');
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(null);
  // Start Date is always NOW. We don't need a state for it to be edited by user, 
  // but we keep the variable for logic.
  const [startDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(''); 
  const [multiInputs, setMultiInputs] = useState<string[]>([]);
  const [dateOverrides, setDateOverrides] = useState<Record<number, { start?: string, end?: string }>>({});
  const [isStarting, setIsStarting] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Fractal Preview State
  const [fractalPreview, setFractalPreview] = useState<FractalStructure | null>(null);

  // Input Mode State
  const [inputType, setInputType] = useState<'date' | 'duration'>('date');
  const [duration, setDuration] = useState<{years: number, months: number, days: number}>({ years: 0, months: 0, days: 0 });

  const [wizardStep, setWizardStep] = useState(0); // 0: Objective, 1: Trait, 2: Date, 3: Confirmation

  // Get active color based on trait
  const activeColor = selectedTraitId ? traits.find(t => t.id === selectedTraitId)?.color : '#6366f1';

  // Calculate fractal preview when endDate changes
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end > start) {
        const preview = generateTimeBlocks(start, end);
        setFractalPreview(preview);
      } else {
        setFractalPreview(null);
      }
    }
  }, [startDate, endDate]);

  // Handle Duration Changes
  useEffect(() => {
      if (inputType === 'duration') {
          const start = new Date(startDate);
          // Calculate end date based on duration
          // Simple addition: years, months, days
          const end = new Date(start);
          end.setFullYear(end.getFullYear() + (duration.years || 0));
          end.setMonth(end.getMonth() + (duration.months || 0));
          end.setDate(end.getDate() + (duration.days || 0));
          
          if (end > start) {
              setEndDate(end.toISOString().split('T')[0]);
          } else {
              setEndDate('');
          }
      }
  }, [duration, inputType, startDate]);

  // Determine how many inputs we need based on current node level (Dynamic/Greedy)
  const getRequiredInputs = () => {
      if (!currentNode) return 0;
      
      const currentLevelIndex = timeframeHierarchy.indexOf(currentNode.level);
      const nextLevel = timeframeHierarchy[currentLevelIndex + 1];
      
      if (!nextLevel) return 0;

      const start = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
      const end = currentNode.dueDate ? currentNode.dueDate.toDate() : new Date();
      const days = differenceInDays(end, start); // inclusive? differenceInDays is exclusive of start usually. +1?
      // differenceInDays(Jan 2, Jan 1) = 1.
      // If duration is 1 day, we need 1 input.
      // If duration is 30 days.
      
      switch (nextLevel) {
          case '5_YEARS':
              // ~1826 days
              return Math.ceil(days / 1826) || 2;
          case 'YEAR':
              // ~365 days
              return Math.ceil(days / 365) || 5;
          case 'SEMESTER': 
              // ~182 days
              return Math.ceil(days / 182) || 2; 
          case 'QUARTER': 
              // ~91 days
              return Math.ceil(days / 91) || 2;
          case 'MONTH': 
              // ~30 days
              return Math.ceil(days / 30) || 1;
          case 'WEEK': 
              // ~7 days
              return Math.ceil(days / 7) || 1;
          case 'DAY': 
              return days || 1;
          default: return 0;
      }
  };

  const requiredCount = getRequiredInputs();
  const completionStepIndex = timeframeHierarchy.length - 1;

  // Initialize inputs when node changes
  useEffect(() => {
      if (requiredCount > 0) {
          setMultiInputs(Array(requiredCount).fill(''));
          setDateOverrides({});
      }
  }, [currentNode, requiredCount]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (mainGoalInput.trim() && selectedTraitId) {
      const start = startDate ? new Date(startDate) : new Date();
      // If end date is not set, default to 1 year later
      // If user provides endDate (e.g. "2024-01-07"), it means "Include Jan 7".
      // So we set the internal end date to Jan 8 00:00:00 (Start of next day)
      // to ensure strictly exclusive logic (Jan 1 00:00 to Jan 8 00:00 = 7 days).
      let end: Date;
      
      if (endDate) {
          end = new Date(endDate);
          end.setDate(end.getDate() + 1); // Add 1 day for inclusive selection
      } else {
          end = new Date(start.getTime() + 31536000000);
      }
      
      startProcess(mainGoalInput, selectedTraitId, activeColor, start, end);
      setIsStarting(false);
      setShowTutorial(true);
    }
  };

  const handleTutorialComplete = () => {
      setShowTutorial(false);
  };

  const handleMultiSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (multiInputs.every(val => val.trim())) {
          const answers = multiInputs.map((title, idx) => {
              const override = dateOverrides[idx];
              if (override?.start && override?.end) {
                  return {
                      title,
                      startDate: new Date(override.start),
                      endDate: new Date(override.end)
                  };
              }
              return title;
          });
          submitAnswer(answers);
      }
  };

  const handleFinish = () => {
    const project = generateProject();
    if (project) {
      onComplete(project);
    }
  };

  const updateMultiInput = (index: number, value: string) => {
      const newInputs = [...multiInputs];
      newInputs[index] = value;
      setMultiInputs(newInputs);
  };

  // const updateDateOverride = (index: number, type: 'start' | 'end', value: string) => {
  //     setDateOverrides(prev => ({
  //         ...prev,
  //         [index]: {
  //             ...prev[index],
  //             [type]: value
  //         }
  //     }));
  // };

  const getPlaceholder = (index: number) => {
      if (!currentNode) return '';
      const startDate = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
      const endDate = currentNode.dueDate ? currentNode.dueDate.toDate() : new Date(startDate.getTime() + 31536000000);
      
      const { label, start, end } = getContextDates(startDate, endDate, currentNode.level, index, requiredCount);
      const dateRange = `${formatDate(start)} - ${formatDate(end)}`;
      
      return `${label} (${dateRange}) Objective...`;
  };

  const getStepTitle = () => {
      if (!currentNode) return '';
      switch (currentNode.level) {
          case 'YEAR': return 'Strategic Semesters';
          case 'SEMESTER': return 'Key Quarters';
          case 'QUARTER': return 'Monthly Tactics';
          case 'MONTH': return 'Weekly Execution';
          case 'WEEK': return 'Daily Actions';
          default: return '';
      }
  };

  const getStepDescription = () => {
       if (!currentNode) return '';
       if (currentNode.level === 'YEAR') return `Break down "${currentNode.title}" into 2 Key Semesters.`;
       if (currentNode.level === 'SEMESTER') return `Break down "${currentNode.title}" into 2 Quarters.`;
       return `Break down "${currentNode.title}" into ${requiredCount} steps.`;
  };

  // Apple Intelligence Animation Variants
  const containerVariants = {
      hidden: { opacity: 0 },
      visible: { 
          opacity: 1,
          transition: { staggerChildren: 0.1 }
      }
  };

  const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1 }
  };

  // Helper to determine roadmap state
  const getRoadmapState = (level: TimeFrame) => {
      const levelIndex = timeframeHierarchy.indexOf(level);
      
      // If we are starting (Year), and level is Year -> Active
      if (!currentNode && level === 'YEAR') return 'active';
      if (!currentNode) return 'future';

      const currentLevelIndex = timeframeHierarchy.indexOf(currentNode.level);
      const targetLevelIndex = currentLevelIndex + 1;

      if (levelIndex === targetLevelIndex) return 'active';
      if (levelIndex < targetLevelIndex) return 'past';
      return 'future';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-hidden">
      {/* Dynamic Background based on Trait - "VIAJE TOTAL" */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-in-out"
        style={{ 
            background: selectedTraitId 
                ? `radial-gradient(circle at 50% 50%, ${activeColor}40 0%, ${activeColor}10 40%, #000000 90%)`
                : 'radial-gradient(circle at 50% 50%, #6366f120 0%, transparent 70%)'
        }}
      />
      {/* Animated Shapes for Immersion */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
                rotate: 360, 
                scale: [1, 1.2, 1],
                opacity: selectedTraitId ? [0.3, 0.5, 0.3] : 0.1
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[url('/noise.png')] opacity-10 mix-blend-overlay" 
          />
          {selectedTraitId && (
              <>
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.4, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] mix-blend-screen"
                    style={{ backgroundColor: activeColor }}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.3, scale: 1.2 }}
                    transition={{ duration: 1.5, delay: 0.2 }}
                    className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] mix-blend-screen"
                    style={{ backgroundColor: activeColor }}
                />
              </>
          )}
      </div>
      
      <AuroraBackground className="absolute inset-0 opacity-10 pointer-events-none" />
      
      {/* CANCEL BUTTON */}
      <button 
        onClick={onCancel}
        className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-50"
      >
        <span className="sr-only">Close</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      <div className="w-full max-w-4xl px-6 relative z-10">
              <AnimatePresence mode="wait">
                {isStarting ? (
                  <motion.div
                    key="start"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    className="flex flex-col items-center text-center space-y-6 w-full"
                  >
                    {/* APPLE INTELLIGENCE HEADER - Always Visible */}
                    <div className="flex flex-col items-center mb-4">
                        <div className="relative mb-4">
                            <div 
                                className="absolute inset-0 blur-[60px] opacity-20 animate-pulse transition-colors duration-500" 
                                style={{ backgroundColor: activeColor }}
                            />
                            <Sparkles 
                                className="w-12 h-12 relative z-10 transition-colors duration-500" 
                                style={{ color: activeColor }}
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Apple Intelligence</h1>
                        <p className="text-sm text-white/50">Neural Engine Protocol v2.0</p>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()} className="w-full max-w-2xl flex flex-col gap-6 items-center">
                        
                        {/* STEP 0: OBJECTIVE */}
                        {wizardStep === 0 && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full space-y-8"
                            >
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-light text-white">What is your <span className="font-bold">Main Objective</span>?</h2>
                                    <p className="text-white/40 text-sm">Define the core mission clearly.</p>
                                </div>
                                
                                <div className="relative group w-full">
                                    <div 
                                        className="absolute -inset-1 rounded-2xl opacity-30 group-hover:opacity-60 blur transition duration-500" 
                                        style={{ background: `linear-gradient(to right, ${activeColor}, #4f46e5)` }}
                                    />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={mainGoalInput}
                                        onChange={(e) => setMainGoalInput(e.target.value)}
                                        placeholder="e.g. Launch Startup, Run Marathon..."
                                        className="relative w-full px-6 py-5 text-xl text-center text-white bg-black/80 rounded-2xl border border-white/10 focus:border-white/20 focus:outline-none placeholder:text-white/20 transition-all shadow-2xl"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && mainGoalInput.trim()) {
                                                e.preventDefault();
                                                setWizardStep(1);
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex justify-center pt-4">
                                    <button
                                        type="button"
                                        disabled={!mainGoalInput.trim()}
                                        onClick={() => setWizardStep(1)}
                                        className="px-8 py-3 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 1: TRAIT SELECTION (GRID) */}
                        {wizardStep === 1 && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full flex flex-col"
                            >
                                <div className="space-y-2 mb-4 flex-shrink-0 text-center">
                                    <h2 className="text-2xl font-light text-white">Which <span className="font-bold">Attribute</span> governs this?</h2>
                                    <p className="text-white/40 text-sm">Select the domain of influence.</p>
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4">
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 w-full max-w-4xl mx-auto">
                                        {traits.map((trait) => {
                                            const Icon = trait.icon;
                                            const isSelected = selectedTraitId === trait.id;
                                            return (
                                                <button
                                                    key={trait.id}
                                                    type="button"
                                                    onClick={() => setSelectedTraitId(trait.id)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-300 relative overflow-hidden group aspect-square",
                                                        isSelected ? "bg-white/20 ring-2 ring-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100"
                                                    )}
                                                >
                                                    <div 
                                                        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300"
                                                        style={{ backgroundColor: trait.color }}
                                                    />
                                                    {isSelected && (
                                                        <div 
                                                            className="absolute inset-0 opacity-40 animate-pulse"
                                                            style={{ backgroundColor: trait.color }}
                                                        />
                                                    )}
                                                    
                                                    {Icon && <Icon 
                                                        size={22} 
                                                        style={{ color: isSelected ? '#ffffff' : trait.color }} 
                                                        className="transition-colors relative z-10 drop-shadow-md"
                                                    />}
                                                    <span className={cn(
                                                        "text-[9px] font-bold uppercase tracking-wider text-center relative z-10 truncate w-full px-1",
                                                        isSelected ? "text-white" : "text-white/70"
                                                    )}>
                                                        {trait.label}
                                                    </span>
                                                    {isSelected && (
                                                        <motion.div 
                                                            layoutId="check"
                                                            className="absolute top-1.5 right-1.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm z-20"
                                                        >
                                                            <Check size={8} className="text-black" />
                                                        </motion.div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-center gap-4 pt-4 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(0)}
                                        className="px-6 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-all flex items-center gap-2"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!selectedTraitId}
                                        onClick={() => setWizardStep(2)}
                                        className="px-8 py-3 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all flex items-center gap-2 shadow-lg z-50"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: DATE & DECOMPOSITION */}
                        {wizardStep === 2 && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full flex flex-col"
                            >
                                <div className="space-y-2 mb-4 flex-shrink-0 text-center">
                                    <h2 className="text-2xl font-light text-white">When is the <span className="font-bold">Deadline</span>?</h2>
                                    <p className="text-white/40 text-sm">Set the timeframe for success.</p>
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4 space-y-4">
                                    <div className="bg-white/5 p-4 rounded-3xl border border-white/10 w-full flex flex-col items-center gap-4">
                                        {/* Input Type Toggle */}
                                        <div className="flex justify-center">
                                            <div className="bg-black/40 p-1 rounded-full flex gap-1 border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setInputType('date')}
                                                    className={cn(
                                                        "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                                                        inputType === 'date' ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"
                                                    )}
                                                >
                                                    Date
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setInputType('duration')}
                                                    className={cn(
                                                        "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                                                        inputType === 'duration' ? "bg-white text-black shadow-lg" : "text-white/50 hover:text-white"
                                                    )}
                                                >
                                                    Duration
                                                </button>
                                            </div>
                                        </div>

                                        {/* Date Picker OR Duration Picker */}
                                        <div className="w-full flex justify-center">
                                            {inputType === 'date' ? (
                                                <div className="relative group/date-picker w-full max-w-xs">
                                                    <div 
                                                        className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-xl group-hover/date-picker:blur-2xl transition-all opacity-0 group-hover/date-picker:opacity-100" 
                                                    />
                                                    <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:bg-white/5 transition-colors">
                                                        <div className="pl-4 text-white/50">
                                                            <Calendar size={18} />
                                                        </div>
                                                        <input 
                                                            type="date" 
                                                            value={endDate}
                                                            min={startDate}
                                                            onChange={(e) => setEndDate(e.target.value)}
                                                            className="w-full bg-transparent border-none text-white px-4 py-4 focus:ring-0 outline-none text-center font-mono text-sm uppercase"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                                                    {[
                                                        { label: 'Years', val: duration.years, set: (v: number) => setDuration(p => ({ ...p, years: v })) },
                                                        { label: 'Months', val: duration.months, set: (v: number) => setDuration(p => ({ ...p, months: v })) },
                                                        { label: 'Days', val: duration.days, set: (v: number) => setDuration(p => ({ ...p, days: v })) }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex flex-col gap-1">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                placeholder="0"
                                                                value={item.val || ''}
                                                                onChange={(e) => item.set(parseInt(e.target.value) || 0)}
                                                                className="bg-black/40 border border-white/10 rounded-xl px-2 py-3 text-center text-white focus:bg-white/10 outline-none text-lg font-bold"
                                                            />
                                                            <span className="text-[9px] text-center text-white/30 uppercase font-bold">{item.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* FRACTAL PREVIEW */}
                                    {fractalPreview && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 overflow-hidden"
                                        >
                                            <div className="flex items-center gap-2 mb-3 text-white/50 border-b border-white/5 pb-2">
                                                <Sparkles size={14} style={{ color: activeColor }} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Time Decomposition Engine</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                                {fractalPreview.structure.map((block, idx) => (
                                                    <div key={idx} className="flex flex-col items-center justify-center p-2 bg-black/30 rounded-lg border border-white/5 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-6 h-6 bg-white/5 rounded-bl-lg flex items-center justify-center text-[8px] text-white/30 font-mono">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="text-xl font-bold text-white">{block.durationLabel.split(' ')[0]}</span>
                                                        <span className="text-[8px] text-white/50 uppercase tracking-wider">{block.durationLabel.split(' ')[1]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="mt-3 text-center">
                                                <p className="text-[9px] text-white/30 font-mono truncate">
                                                    Path: <span className="text-white/60">{fractalPreview.drillDownPath.join(' → ')}</span>
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="flex justify-center gap-4 pt-4 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(1)}
                                        className="px-6 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-all flex items-center gap-2"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!endDate}
                                        onClick={() => setWizardStep(3)}
                                        className="px-8 py-3 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all flex items-center gap-2 shadow-lg z-50"
                                    >
                                        Review <ChevronRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: CONFIRMATION */}
                        {wizardStep === 3 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full space-y-8"
                            >
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold text-white uppercase tracking-tight">¿Empezamos con esta planeación?</h2>
                                    <p className="text-white/40 text-sm">Review your strategy before initializing.</p>
                                </div>

                                {/* SUMMARY CARD */}
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                                    <div 
                                        className="absolute inset-0 opacity-10"
                                        style={{ background: `linear-gradient(to bottom right, ${activeColor}, transparent)` }}
                                    />
                                    
                                    <div className="relative z-10 flex flex-col gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                                {traits.find(t => t.id === selectedTraitId)?.icon && React.createElement(traits.find(t => t.id === selectedTraitId)!.icon, { size: 32, color: activeColor })}
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-2xl font-bold text-white">{mainGoalInput}</h3>
                                                <p className="text-white/50 text-sm uppercase tracking-wider">{traits.find(t => t.id === selectedTraitId)?.label}</p>
                                            </div>
                                        </div>

                                        <div className="h-px w-full bg-white/10" />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-left">
                                                <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Target Deadline</p>
                                                <p className="text-lg text-white font-mono">{endDate}</p>
                                            </div>
                                            {fractalPreview && (
                                                <div className="text-left">
                                                    <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Structure</p>
                                                    <p className="text-lg text-white font-mono">{fractalPreview.structure.length} x {fractalPreview.structure[0]?.type}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4 w-full max-w-sm mx-auto">
                                    <button
                                        type="button"
                                        onClick={handleStart}
                                        className="w-full py-4 rounded-2xl font-bold text-black text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(34,211,238,0.4)] relative overflow-hidden group"
                                        style={{ background: 'linear-gradient(135deg, #6ee7b7 0%, #22d3ee 100%)' }} // Emerald-300 to Cyan-400
                                    >
                                        <span className="relative z-10">SI, VAMOS</span>
                                        <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(2)}
                                        className="w-full py-4 rounded-2xl font-bold text-white/80 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-white transition-all text-sm uppercase tracking-widest"
                                    >
                                        Volver Atrás
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </form>
                  </motion.div>
                ) : showTutorial ? (
                    <motion.div
                        key="tutorial"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full"
                    >
                        <SmartTaskTutorial onComplete={handleTutorialComplete} />
                    </motion.div>
                ) : !currentNode || currentStep > completionStepIndex ? (
              /* COMPLETION STATE */
              <motion.div
                  key="done"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center h-[60vh]"
              >
                  <div className="relative w-40 h-40 mb-8">
                      {/* Fluid Animation Imitation */}
                      <motion.div 
                          animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, 180, 360],
                              borderRadius: ["50%", "30%", "50%"]
                          }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 opacity-60 blur-2xl"
                          style={{ background: `linear-gradient(to top right, ${activeColor}, #4f46e5)` }}
                      />
                      <motion.div 
                          animate={{ 
                              scale: [1.2, 1, 1.2],
                              rotate: [360, 180, 0],
                              borderRadius: ["30%", "50%", "30%"]
                          }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 opacity-60 blur-2xl mix-blend-overlay"
                          style={{ background: `linear-gradient(to bottom left, ${activeColor}, #ec4899)` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                      </div>
                  </div>

                  <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-purple-200 mb-2 tracking-tight"
                  >
                      APPLE INTELLIGENCE
                  </motion.h2>
                  
                  <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="text-white/50 tracking-widest text-xs uppercase mb-8"
                  >
                      Strategic Optimization Complete
                  </motion.p>

                  <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5 }}
                      onClick={handleFinish}
                      className="px-10 py-4 text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
                      style={{ backgroundColor: 'white' }}
                  >
                      Initialize Map
                  </motion.button>
              </motion.div>
          ) : (
            /* WIZARD STEPS */
            <motion.div
              key={currentNode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
                {/* ROADMAP NAVIGATION */}
                <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
                   {timeframeHierarchy.map((level, idx) => {
                      const state = getRoadmapState(level);
                      const isPast = state === 'past';
                      const isActive = state === 'active';
                      const isFuture = state === 'future';

                      return (
                         <div key={level} className="flex items-center">
                             <button
                                disabled={!isPast}
                                onClick={() => isPast && jumpToLevel(level)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border tracking-wider",
                                    isActive ? "text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105" :
                                    isPast ? "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white line-through decoration-white/30" :
                                    "bg-transparent text-white/20 border-transparent cursor-not-allowed"
                                )}
                                style={isActive ? { backgroundColor: 'white' } : {}}
                             >
                                {isFuture && <Lock size={10} className="opacity-50" />}
                                {level}
                             </button>
                             {idx < timeframeHierarchy.length - 1 && (
                                 <div className={`w-4 h-px mx-1 transition-colors ${isPast ? 'bg-indigo-500/50' : 'bg-white/5'}`} />
                             )}
                         </div>
                      )
                   })}
                </div>

                {/* Header */}
                <div className="mb-8 flex items-end gap-4">
                    {history.length > 1 && (
                        <button onClick={goBack} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors group">
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-1" style={{ color: activeColor }}>
                            <Layers size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">{getStepTitle()}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">{getStepDescription()}</h2>
                    </div>
                </div>

                <form onSubmit={handleMultiSubmit} className="flex flex-col h-full overflow-hidden">
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-2 pb-4"
                    >
                        {multiInputs.map((val, idx) => {
                            // Calculate default dates for placeholder
                            const defaultStart = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
                            const defaultEnd = currentNode.dueDate ? currentNode.dueDate.toDate() : new Date(defaultStart.getTime() + 31536000000);
                            
                            const { start, end } = getContextDates(defaultStart, defaultEnd, currentNode.level, idx, requiredCount);
                            
                            const currentStart = dateOverrides[idx]?.start ? new Date(dateOverrides[idx].start!) : start;
                            const currentEnd = dateOverrides[idx]?.end ? new Date(dateOverrides[idx].end!) : end;
                            
                            return (
                                <motion.div key={idx} variants={itemVariants} className="relative group shrink-0">
                                    <div 
                                        className="absolute -inset-0.5 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition duration-500" 
                                        style={{ background: `linear-gradient(to right, ${activeColor}50, ${activeColor}20)` }}
                                    />
                                    <div className="relative flex flex-col sm:flex-row sm:items-center bg-[#1c1c1e] rounded-xl border border-white/10 overflow-hidden group-focus-within:border-transparent transition-colors">
                                        <div className="w-10 h-10 sm:h-auto flex items-center justify-center bg-white/5 border-r border-white/5 text-white/30 text-[10px] font-mono">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 flex flex-col sm:flex-row">
                                            <input
                                                type="text"
                                                value={val}
                                                onChange={(e) => updateMultiInput(idx, e.target.value)}
                                                placeholder={getPlaceholder(idx)}
                                                className="flex-1 px-3 py-2 sm:py-3 bg-transparent text-white text-sm focus:outline-none placeholder:text-white/20"
                                                autoFocus={idx === 0}
                                            />
                                            
                                            {/* Date Display (Read-Only) */}
                                            <div className="flex items-center border-t sm:border-t-0 sm:border-l border-white/5 bg-black/20 px-2">
                                                <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-white/50 whitespace-nowrap">
                                                    <Calendar size={12} />
                                                    <span>{formatDate(currentStart)} - {formatDate(currentEnd)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={multiInputs.some(v => !v.trim())}
                                className="flex items-center gap-2 px-8 py-4 text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]"
                                style={{ backgroundColor: 'white' }}
                            >
                                <span>Next Phase</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </motion.div>
                </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
