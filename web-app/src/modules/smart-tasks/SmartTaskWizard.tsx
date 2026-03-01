import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useSmartTaskLogic } from './hooks/useSmartTaskLogic';
import { SmartProject } from '../../types/SmartGoal';
import { TRAITS_LIST } from '../dashboard/constants';
import { Attribute } from '../../types';
import { useTranslation } from 'react-i18next';
import { ObjectiveStep } from './components/wizard/ObjectiveStep';
import { TraitSelectionStep } from './components/wizard/TraitSelectionStep';
import { DateSelectionStep } from './components/wizard/DateSelectionStep';
import { RecursiveFillingStep } from './components/wizard/RecursiveFillingStep';
import { FREE_LIMITS } from '../../config/limits';

interface SmartTaskWizardProps {
  onComplete: (project: SmartProject) => void;
  onCancel: () => void;
  availableTraits?: Attribute[];
  activeSmartTasksCount?: number;
  isPro?: boolean;
}

export const SmartTaskWizard: React.FC<SmartTaskWizardProps> = ({ 
    onComplete, 
    onCancel, 
    availableTraits,
    activeSmartTasksCount = 0,
    isPro = false
}) => {
  const { t } = useTranslation();
  const traits = availableTraits && availableTraits.length > 0
    ? availableTraits
    : TRAITS_LIST.map(t => ({ ...t, level: 1, xp: 0, maxXp: 100 }));
  
  // Check Limit
  const isLimitReached = !isPro && activeSmartTasksCount >= FREE_LIMITS.ACTIVE_TASKS;
  
  const { 
    currentStep, 
    currentNode, 
    startProcess, 
    submitAnswer, 
    generateProject,
    timeframeHierarchy,
    projectMeta
  } = useSmartTaskLogic();

  const [wizardStep, setWizardStep] = useState(0); // 0: Objective, 1: Trait, 2: Date
  const [isStarting, setIsStarting] = useState(true);
  
  // Temporary state for the wizard flow before starting the process
  const [tempObjective, setTempObjective] = useState('');
  const [tempTraitId, setTempTraitId] = useState<string | null>(null);

  // Get active color based on trait
  const activeColor = (tempTraitId ? traits.find(t => t.id === tempTraitId)?.color : undefined) || '#6366f1';
  // If process started, use projectMeta color or fallback
  const effectiveColor = projectMeta.traitColor || activeColor;

  const handleObjectiveNext = (value: string) => {
      setTempObjective(value);
      setWizardStep(1);
  };

  const handleTraitNext = () => {
      if (tempTraitId) {
          setWizardStep(2);
      }
  };

  const handleDateNext = (startDate: Date, endDate: Date) => {
      if (tempObjective && tempTraitId) {
         const traitColor = traits.find(t => t.id === tempTraitId)?.color;
         startProcess(tempObjective, tempTraitId, traitColor, startDate, endDate);
         setIsStarting(false);
      }
  };

  // Limit Reached Screen
  if (isLimitReached) {
      if (typeof document === 'undefined') return null;
      return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
             <button 
                onClick={onCancel}
                className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-50"
            >
                <span className="sr-only">Close</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-indigo-500/30">
                    <Sparkles className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Protocol Limit Reached</h2>
                <p className="text-white/60 mb-8">
                    System capacity reached. Maximum {FREE_LIMITS.ACTIVE_TASKS} active Smart Tasks. Complete existing tasks to continue.
                </p>
                <button 
                    onClick={onCancel}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-all"
                >
                    Understood
                </button>
            </div>
        </div>,
        document.body
      );
  }

  // Check for completion
  useEffect(() => {
      // If we are not starting and we have gone past the hierarchy
      // Or if generateProject returns a valid project and we are at a point where we should finish
      // FIXED: We iterate up to length - 1 because the last level (DAY) is the leaf and doesn't generate children
      if (!isStarting && timeframeHierarchy.length > 0 && currentStep >= timeframeHierarchy.length - 1) {
          const project = generateProject();
          if (project) {
              onComplete(project);
          }
      }
  }, [currentStep, timeframeHierarchy, isStarting, generateProject, onComplete]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#020204]/60 overflow-hidden">
      {/* Dynamic Background based on Trait - MOVED TO PARENT (Behind Glass) */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-in-out opacity-40"
        style={{ 
            background: tempTraitId || projectMeta.traitId
                ? `radial-gradient(circle at 50% 50%, ${effectiveColor}20 0%, transparent 90%)`
                : 'radial-gradient(circle at 50% 50%, #6366f110 0%, transparent 70%)'
        }}
      />
      
      {/* CANCEL BUTTON */}
      <button 
        onClick={onCancel}
        className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-50"
      >
        <span className="sr-only">Close</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      <div className="w-full max-w-4xl px-6 relative z-10 h-[90vh] md:h-auto md:min-h-[600px] flex flex-col pt-4 md:pt-0 md:justify-center bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              <AnimatePresence mode="popLayout">
                {isStarting ? (
                  <motion.div
                    key="start"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.03 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center text-center space-y-6 w-full h-full pt-12 md:pt-0"
                  >
                    {/* APPLE INTELLIGENCE HEADER - Visible only in Objective Step */}
                    <AnimatePresence>
                        {wizardStep === 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98, y: 6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -6 }}
                                className="flex flex-col items-center flex-shrink-0"
                            >
                                <div className="relative mb-4">
                                    <div 
                                        className="absolute inset-0 blur-lg opacity-20 animate-pulse transition-colors duration-500" 
                                        style={{ backgroundColor: activeColor }}
                                    />
                                    <Sparkles 
                                        className="w-12 h-12 relative z-10 transition-colors duration-500" 
                                        style={{ color: activeColor }}
                                    />
                                </div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">{t('smartTask.wizard.title')}</h1>
                                <p className="text-sm text-white/50">{t('smartTask.wizard.subtitle')}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="w-full max-w-2xl flex-1 flex flex-col min-h-0 justify-center">
                        {wizardStep === 0 && (
                            <ObjectiveStep 
                                initialValue={tempObjective}
                                onNext={handleObjectiveNext}
                                activeColor={activeColor}
                            />
                        )}

                        {wizardStep === 1 && (
                            <TraitSelectionStep 
                                traits={traits}
                                selectedTraitId={tempTraitId}
                                onSelect={setTempTraitId}
                                onNext={handleTraitNext}
                            />
                        )}

                        {wizardStep === 2 && (
                             <DateSelectionStep 
                                onStartProcess={handleDateNext}
                                activeColor={activeColor}
                             />
                        )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="recursive"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full flex flex-col items-center"
                  >
                     {/* Recursive Steps */}
                     {currentNode && (
                         <RecursiveFillingStep 
                            currentNode={currentNode}
                            timeframeHierarchy={timeframeHierarchy}
                            onSubmit={submitAnswer}
                            activeColor={effectiveColor}
                         />
                     )}
                  </motion.div>
                )}
              </AnimatePresence>
      </div>
    </div>,
    document.body
  );
};
