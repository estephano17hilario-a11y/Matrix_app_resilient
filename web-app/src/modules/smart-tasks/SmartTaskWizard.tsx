import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, Layers, Lock, ChevronRight } from 'lucide-react';
import { useSmartTaskLogic } from './hooks/useSmartTaskLogic';
import { cn } from '../../utils/cn';
import { AuroraBackground } from '../../components/AuroraBackground';
import { SmartProject, TimeFrame } from '../../types/SmartGoal';
import { SmartTaskTutorial } from './components/SmartTaskTutorial';
import { getContextDates, formatDate } from '../../utils/dateUtils';

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
  const [multiInputs, setMultiInputs] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

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
      }
  }, [currentNode, requiredCount]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (mainGoalInput.trim()) {
      startProcess(mainGoalInput);
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
          submitAnswer(multiInputs);
          // Reset will happen via useEffect when node changes
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

  const getPlaceholder = (index: number) => {
      if (!currentNode) return '';
      const startDate = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
      const { label, start, end } = getContextDates(startDate, currentNode.level, index);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <AuroraBackground className="absolute inset-0 opacity-20 pointer-events-none" />
      
      {/* CANCEL BUTTON */}
      <button 
        onClick={onCancel}
        className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-50"
      >
        <span className="sr-only">Close</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      <div className="w-full max-w-3xl px-6 relative z-10">
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
                      <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20 animate-pulse" />
                      <Sparkles className="w-16 h-16 text-indigo-400 relative z-10" />
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                          Apple Intelligence
                      </h1>
                      <p className="text-lg text-white/50">
                          Neural Engine Protocol v2.0
                      </p>
                    </div>
                    <form onSubmit={handleStart} className="w-full max-w-xl mt-8 relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-50 group-hover:opacity-100 blur transition duration-500" />
                      <input
                        autoFocus
                        type="text"
                        value={mainGoalInput}
                        onChange={(e) => setMainGoalInput(e.target.value)}
                        placeholder="What is your Main Objective?"
                        className="relative w-full px-8 py-6 text-2xl text-center text-white bg-black/80 rounded-2xl border border-white/10 focus:border-white/20 focus:outline-none placeholder:text-white/20 transition-all shadow-2xl"
                      />
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
                          className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 opacity-60 blur-2xl"
                      />
                      <motion.div 
                          animate={{ 
                              scale: [1.2, 1, 1.2],
                              rotate: [360, 180, 0],
                              borderRadius: ["30%", "50%", "30%"]
                          }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-bl from-pink-500 via-rose-500 to-orange-500 opacity-60 blur-2xl mix-blend-overlay"
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
                      className="px-10 py-4 bg-white text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
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
                      const isActive = currentNode.level === level;
                      // Logic for past: current node's level index in hierarchy > this level's index
                      // But wait, currentNode.level IS the current level.
                      // Past levels are those BEFORE the current level in hierarchy.
                      // Example: If current is QUARTER (index 2), then YEAR (0) and SEMESTER (1) are past.
                      const currentIndex = timeframeHierarchy.indexOf(currentNode.level);
                      const levelIndex = timeframeHierarchy.indexOf(level);
                      const isPast = levelIndex < currentIndex;
                      const isFuture = levelIndex > currentIndex;

                      return (
                         <div key={level} className="flex items-center">
                             <button
                                disabled={!isPast}
                                onClick={() => isPast && jumpToLevel(level)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border tracking-wider",
                                    isActive ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105" :
                                    isPast ? "bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/30" :
                                    "bg-transparent text-white/20 border-transparent cursor-not-allowed"
                                )}
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
                        <div className="flex items-center gap-2 text-indigo-400 mb-1">
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
                        {multiInputs.map((val, idx) => (
                            <motion.div key={idx} variants={itemVariants} className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition duration-500" />
                                <div className="relative flex items-center bg-[#1c1c1e] rounded-xl border border-white/10 overflow-hidden group-focus-within:border-transparent transition-colors">
                                    <div className="w-12 h-full flex items-center justify-center bg-white/5 border-r border-white/5 text-white/30 text-xs font-mono">
                                        {idx + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={val}
                                        onChange={(e) => updateMultiInput(idx, e.target.value)}
                                        placeholder={getPlaceholder(idx)}
                                        className="w-full px-4 py-4 bg-transparent text-white focus:outline-none placeholder:text-white/20"
                                        autoFocus={idx === 0}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={multiInputs.some(v => !v.trim())}
                            className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]"
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
