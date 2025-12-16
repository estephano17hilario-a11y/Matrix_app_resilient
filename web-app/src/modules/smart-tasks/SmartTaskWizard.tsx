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

interface SmartTaskWizardProps {
  onComplete: (project: SmartProject) => void;
  onCancel: () => void;
}

export const SmartTaskWizard: React.FC<SmartTaskWizardProps> = ({ onComplete, onCancel }) => {
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
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [multiInputs, setMultiInputs] = useState<string[]>([]);
  const [dateOverrides, setDateOverrides] = useState<Record<number, { start?: string, end?: string }>>({});
  const [isStarting, setIsStarting] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Get active color based on trait
  const activeColor = selectedTraitId ? TRAITS_LIST.find(t => t.id === selectedTraitId)?.color : '#6366f1';
  const activeTrait = TRAITS_LIST.find(t => t.id === selectedTraitId);

  // Determine how many inputs we need based on current node level
  const getRequiredInputs = () => {
      if (!currentNode) return 0;
      switch (currentNode.level) {
          case 'YEAR': return 2; // Needs 2 Semesters
          case 'SEMESTER': return 2; // Needs 2 Quarters
          case 'QUARTER': return 3; // Needs 3 Months
          case 'MONTH': return 4; // Needs 4 Weeks
          case 'WEEK': return 7; // Needs 7 Days
          default: return 0;
      }
  };

  const requiredCount = getRequiredInputs();
  const completionStepIndex = 5; // Index of DAY in hierarchy (0-based)

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
      startProcess(mainGoalInput, selectedTraitId, activeColor, start);
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

  const updateDateOverride = (index: number, type: 'start' | 'end', value: string) => {
      setDateOverrides(prev => ({
          ...prev,
          [index]: {
              ...prev[index],
              [type]: value
          }
      }));
  };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      {/* Dynamic Background based on Trait */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 50% 50%, ${activeColor} 0%, transparent 70%)` }}
      />
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
                    className="flex flex-col items-center text-center space-y-8"
                  >
                    <div className="relative">
                      <div 
                        className="absolute inset-0 blur-[60px] opacity-20 animate-pulse transition-colors duration-500" 
                        style={{ backgroundColor: activeColor }}
                      />
                      <Sparkles 
                        className="w-16 h-16 relative z-10 transition-colors duration-500" 
                        style={{ color: activeColor }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                          Apple Intelligence
                      </h1>
                      <p className="text-lg text-white/50">
                          Neural Engine Protocol v2.0
                      </p>
                    </div>

                    <form onSubmit={handleStart} className="w-full max-w-2xl mt-8 flex flex-col gap-6">
                      
                      {/* Trait Selector */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                          {TRAITS_LIST.map((trait) => {
                              const Icon = trait.icon;
                              const isSelected = selectedTraitId === trait.id;
                              return (
                                  <button
                                      key={trait.id}
                                      type="button"
                                      onClick={() => setSelectedTraitId(trait.id)}
                                      className={cn(
                                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 relative overflow-hidden group",
                                          isSelected ? "bg-white/10 ring-1 ring-white/50 scale-105" : "hover:bg-white/5 opacity-60 hover:opacity-100"
                                      )}
                                  >
                                      <div 
                                          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                                          style={{ backgroundColor: trait.color }}
                                      />
                                      <Icon 
                                          size={20} 
                                          style={{ color: isSelected ? trait.color : 'white' }} 
                                          className="transition-colors"
                                      />
                                      <span className="text-[10px] font-bold uppercase tracking-wider">{trait.label}</span>
                                      {isSelected && (
                                          <motion.div 
                                              layoutId="check"
                                              className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center"
                                          >
                                              <Check size={8} className="text-black" />
                                          </motion.div>
                                      )}
                                  </button>
                              );
                          })}
                      </div>

                      {/* Date Selector */}
                      <div className="flex flex-col items-center gap-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                          <label className="text-white/40 text-xs font-medium uppercase tracking-widest">Start Date</label>
                          <div className="relative group/date-picker w-full max-w-xs">
                              <div 
                                  className="absolute -inset-0.5 rounded-xl opacity-0 group-hover/date-picker:opacity-100 blur transition duration-500"
                                  style={{ backgroundColor: activeColor }}
                              />
                              <div className="relative flex items-center gap-3 bg-black/50 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/5 transition-colors">
                                  <Calendar size={18} className="text-white/70" />
                                  <input 
                                      type="date" 
                                      value={startDate}
                                      onChange={(e) => setStartDate(e.target.value)}
                                      className="bg-transparent text-white font-medium focus:outline-none w-full cursor-pointer [color-scheme:dark]"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="relative group">
                          <div 
                            className="absolute -inset-1 rounded-2xl opacity-50 group-hover:opacity-100 blur transition duration-500" 
                            style={{ 
                                background: `linear-gradient(to right, ${activeColor}, #4f46e5)` 
                            }}
                          />
                          <input
                            autoFocus
                            type="text"
                            value={mainGoalInput}
                            onChange={(e) => setMainGoalInput(e.target.value)}
                            placeholder="What is your Main Objective?"
                            className="relative w-full px-8 py-6 text-2xl text-center text-white bg-black/80 rounded-2xl border border-white/10 focus:border-white/20 focus:outline-none placeholder:text-white/20 transition-all shadow-2xl"
                          />
                      </div>

                      {mainGoalInput.trim() && selectedTraitId && (
                          <motion.button
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              type="submit"
                              className="mx-auto flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                              style={{ backgroundColor: activeColor }}
                          >
                              <span>Initialize System</span>
                              <ChevronRight size={18} />
                          </motion.button>
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

                <form onSubmit={handleMultiSubmit}>
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 gap-3 mb-8"
                    >
                        {multiInputs.map((val, idx) => {
                            // Calculate default dates for placeholder
                            const defaultStart = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
                            const { start, end } = getContextDates(defaultStart, currentNode.level, idx);
                            
                            const currentStart = dateOverrides[idx]?.start ? new Date(dateOverrides[idx].start!) : start;
                            const currentEnd = dateOverrides[idx]?.end ? new Date(dateOverrides[idx].end!) : end;
                            
                            return (
                                <motion.div key={idx} variants={itemVariants} className="relative group">
                                    <div 
                                        className="absolute -inset-0.5 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition duration-500" 
                                        style={{ background: `linear-gradient(to right, ${activeColor}50, ${activeColor}20)` }}
                                    />
                                    <div className="relative flex flex-col sm:flex-row sm:items-center bg-[#1c1c1e] rounded-xl border border-white/10 overflow-hidden group-focus-within:border-transparent transition-colors">
                                        <div className="w-12 h-12 sm:h-auto flex items-center justify-center bg-white/5 border-r border-white/5 text-white/30 text-xs font-mono">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 flex flex-col sm:flex-row">
                                            <input
                                                type="text"
                                                value={val}
                                                onChange={(e) => updateMultiInput(idx, e.target.value)}
                                                placeholder={getPlaceholder(idx)}
                                                className="flex-1 px-4 py-3 sm:py-4 bg-transparent text-white focus:outline-none placeholder:text-white/20"
                                                autoFocus={idx === 0}
                                            />
                                            
                                            {/* Date Picker Trigger */}
                                            <div className="flex items-center border-t sm:border-t-0 sm:border-l border-white/5 bg-black/20 px-2">
                                                <div className="relative group/date">
                                                    <input 
                                                        type="date" 
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => updateDateOverride(idx, 'start', e.target.value)}
                                                    />
                                                    <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-white/50 hover:text-white transition-colors whitespace-nowrap">
                                                        <Calendar size={12} />
                                                        <span>{formatDate(currentStart)}</span>
                                                    </div>
                                                </div>
                                                <span className="text-white/20">-</span>
                                                <div className="relative group/date">
                                                    <input 
                                                        type="date" 
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => updateDateOverride(idx, 'end', e.target.value)}
                                                    />
                                                    <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-white/50 hover:text-white transition-colors whitespace-nowrap">
                                                        <span>{formatDate(currentEnd)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    <div className="flex justify-end">
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
                </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
