import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Sparkles, X, ChevronLeft } from 'lucide-react';
import { useSmartTaskLogic } from './hooks/useSmartTaskLogic';
import { SmartProject } from '../../types/SmartGoal';
import { TRAITS_LIST } from '../dashboard/constants';
import { Attribute } from '../../types';
import { useTranslation } from 'react-i18next';
import { ObjectiveStep } from './components/wizard/ObjectiveStep';
import { calculateAttributeMaxXp } from '../../utils/leveling';
import { TraitSelectionStep } from './components/wizard/TraitSelectionStep';
import { DateSelectionStep } from './components/wizard/DateSelectionStep';
import { RecursiveFillingStep } from './components/wizard/RecursiveFillingStep';
import { FREE_LIMITS, ENABLE_GLOBAL_PRO } from '../../config/limits';
import { StrategyTutorial } from './components/StrategyTutorial';
import '../../components/cupertino/cupertino.css';
import { promptDeluxe } from '@/modules/monetization/deluxe';

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
    : TRAITS_LIST.map(t => ({ ...t, level: 1, xp: 0, maxXp: calculateAttributeMaxXp(1) }));
  
  // Check Limit
  const isLimitReached = !ENABLE_GLOBAL_PRO && !isPro && activeSmartTasksCount >= FREE_LIMITS.ACTIVE_STRATEGIES;
  
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
  const [hasCompleted, setHasCompleted] = useState(false);

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
      promptDeluxe('strategies');
      onCancel();
    }
  }, [isLimitReached, onOpenPro, onCancel, isPro, activeSmartTasksCount]);

  // Check for completion
  useEffect(() => {
      // If we are not starting and we have gone past the hierarchy
      // Or if generateProject returns a valid project and we are at a point where we should finish
      // FIXED: We iterate up to length - 1 because the last level (DAY) is the leaf and doesn't generate children
      if (!isStarting && timeframeHierarchy.length > 0 && currentStep >= timeframeHierarchy.length - 1 && !hasCompleted) {
          setHasCompleted(true);
          const project = generateProject();
          if (project) {
              onComplete(project);
          }
      }
  }, [currentStep, timeframeHierarchy, isStarting, generateProject, onComplete, hasCompleted]);

  if (isLimitReached || typeof document === 'undefined') return null;

  const totalSteps = 3;
  const recursiveTotal = Math.max(1, timeframeHierarchy.length - 1);
  const recursiveProgress = Math.min(1, currentStep / recursiveTotal);

  return createPortal(
    <div
      className="cu-root cu-stage"
      style={{
        zIndex: 500,
        ['--cu-accent' as any]: effectiveColor,
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <motion.div
        className="cu-card"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        style={{ minHeight: 0 }}
      >
        {/* Header: back · progress · close */}
        <div className="cu-wiz-head">
          {isStarting && wizardStep > 0 && (
            <button
              type="button"
              className="cu-icon-btn cu-wiz-back"
              aria-label={t('smartTask.wizard.buttons.back', 'Atrás')}
              onClick={() => { setPresetDates(null); setWizardStep(s => Math.max(0, s - 1)); }}
            >
              <ChevronLeft size={19} strokeWidth={2.4} />
            </button>
          )}
          {isStarting ? (
            <div className="cu-progress" aria-label={`${wizardStep + 1}/${totalSteps}`}>
              {Array.from({ length: totalSteps }).map((_, i) => <i key={i} className={i <= wizardStep ? 'cu-on' : ''} />)}
            </div>
          ) : (
            <div style={{ width: 140, height: 5, borderRadius: 99, background: 'var(--cu-fill-2)', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', borderRadius: 99, background: 'var(--cu-accent)' }}
                animate={{ width: `${Math.max(6, recursiveProgress * 100)}%` }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              />
            </div>
          )}
          <button type="button" className="cu-icon-btn cu-wiz-close" onClick={onCancel} aria-label={t('common.close', 'Cerrar')}>
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <>
          {isStarting ? (
            <div key="start" className="cu-step">
              {wizardStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 24px 0', textAlign: 'center' }}>
                  <div className="cu-glyph"><Sparkles size={30} /></div>
                  <p className="cu-lead" style={{ marginTop: 8, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                    {t('smartTask.wizard.title')}
                  </p>
                </div>
              )}

              {wizardStep === 0 && (
                <ObjectiveStep initialValue={tempObjective} onNext={handleObjectiveNext} activeColor={activeColor} />
              )}
              {wizardStep === 1 && (
                <TraitSelectionStep traits={traits} selectedTraitId={tempTraitId} onSelect={setTempTraitId} onNext={handleTraitNext} />
              )}
              {wizardStep === 2 && (
                <DateSelectionStep onStartProcess={handleDateNext} activeColor={activeColor} />
              )}
            </div>
          ) : (
            <motion.div key="recursive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="cu-step">
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
        </>
      </motion.div>

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
