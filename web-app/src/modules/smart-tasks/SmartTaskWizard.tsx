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
import { StrategyTutorial } from './components/StrategyTutorial';

interface SmartTaskWizardProps {
  onComplete: (project: SmartProject) => void;
  onCancel: () => void;
  availableTraits?: Attribute[];
  activeSmartTasksCount?: number;
  isPro?: boolean;
  onOpenPro?: () => void;
}

export const SmartTaskWizard: React.FC<SmartTaskWizardProps> = ({ 
    onComplete, 
    onCancel, 
    availableTraits,
    activeSmartTasksCount = 0,
    isPro = false,
    onOpenPro
}) => {
  const { t } = useTranslation();
  const traits = availableTraits && availableTraits.length > 0
    ? availableTraits
    : TRAITS_LIST.map(t => ({ ...t, level: 1, xp: 0, maxXp: 100 }));
  
  // Check Limit
  const isLimitReached = !isPro && activeSmartTasksCount >= FREE_LIMITS.ACTIVE_STRATEGIES;
  
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
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Temporary state for the wizard flow before starting the process
  const [tempObjective, setTempObjective] = useState('');
  const [tempTraitId, setTempTraitId] = useState<string | null>(null);
  const [presetDates, setPresetDates] = useState<{start: Date, end: Date} | null>(null);

  // Get active color based on trait
  const activeColor = (tempTraitId ? traits.find(t => t.id === tempTraitId)?.color : undefined) || '#6366f1';
  // If process started, use projectMeta color or fallback
  const effectiveColor = projectMeta.traitColor || activeColor;

  const handleObjectiveNext = (value: string) => {
      setTempObjective(value);
      setShowTutorial(true); // Siempre mostrar el tutorial
  };

  const handlePresetDateSelected = (startDate: Date, endDate: Date) => {
      setPresetDates({ start: startDate, end: endDate });
      setWizardStep(1); // Go to Trait selection
  };

  const handleTraitNext = () => {
      if (tempTraitId) {
          if (presetDates) {
              // Si ya teníamos fechas del preset, saltamos el paso de fecha y empezamos directo
              const traitColor = traits.find(t => t.id === tempTraitId)?.color;
              startProcess(tempObjective, tempTraitId, traitColor, presetDates.start, presetDates.end);
              setIsStarting(false);
          } else {
              setWizardStep(2); // Normal flow: go to date selection
          }
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
  useEffect(() => {
    if (isLimitReached) {
      if (onOpenPro) onOpenPro();
      onCancel();
    }
  }, [isLimitReached, onOpenPro, onCancel]);

  if (isLimitReached) {
      return null;
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
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-[#09090b] overflow-hidden"
    >
      {/* Dynamic Background based on Trait - Simplified for performance */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-1000 ease-in-out opacity-20"
        style={{ 
            background: tempTraitId || projectMeta.traitId
                ? `radial-gradient(circle at 50% 40%, ${effectiveColor}30 0%, transparent 60%)`
                : 'radial-gradient(circle at 50% 40%, #6366f115 0%, transparent 50%)'
        }}
      />
      
      {/* CANCEL BUTTON */}
      <button 
        onClick={onCancel}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-50 border border-white/5"
      >
        <span className="sr-only">Close</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      <div className="w-full max-w-xl px-6 relative z-10 flex flex-col items-center justify-center">
              <AnimatePresence mode="sync">
                {isStarting ? (
                  <motion.div
                    key="start"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center text-center space-y-6 w-full"
                  >
                    {/* APPLE INTELLIGENCE HEADER - Visible only in Objective Step */}
                    <AnimatePresence>
                        {wizardStep === 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center flex-shrink-0"
                            >
                                <div className="mb-5 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-2xl bg-transparent border border-white/10 flex items-center justify-center shadow-sm transition-colors duration-300">
                                        <Sparkles 
                                            className="w-8 h-8 transition-colors duration-300" 
                                            style={{ color: activeColor }}
                                        />
                                    </div>
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{t('smartTask.wizard.title')}</h1>
                                <p className="text-sm text-white/50 mt-1 font-medium tracking-wide">{t('smartTask.wizard.subtitle')}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="w-full flex-1 flex flex-col min-h-0 justify-center pt-2">
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

      {/* Tutorial Overlay */}
      <StrategyTutorial 
          isOpen={showTutorial}
          onClose={() => {
              setShowTutorial(false);
              setWizardStep(1);
          }}
          onProceed={(selectedDays?: number) => {
              setShowTutorial(false);
              
              if (selectedDays) {
                  // Si eligió un preset, avanzamos directo al paso de Traits (1)
                  // y guardamos la fecha para que el DateStep la use o se salte
                  const startDate = new Date();
                  const endDate = new Date();
                  endDate.setDate(startDate.getDate() + selectedDays);
                  
                  // Necesitamos una forma de pasar esta fecha. La guardaremos en localStorage temporalmente
                  // o modificaremos el wizard para aceptar estas fechas.
                  // Lo mejor es guardar la fecha seleccionada en un estado
                  handlePresetDateSelected(startDate, endDate);
              } else {
                  // Si eligió custom, va al paso normal
                  setWizardStep(1);
              }
          }}
      />
    </div>,
    document.body
  );
};
