import React, { useEffect, useState } from 'react';
import ReactJoyride, { CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { useTutorial } from '../../context/TutorialContext';
import { TutorialTooltip } from './TutorialTooltip';
import { tutorialSteps, TutorialStep } from '../../config/tutorialSteps';

interface TutorialManagerProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  activeModal: string | null;
  setActiveModal: (modal: any) => void;
  isDockOpen: boolean;
  setIsDockOpen: (isOpen: boolean) => void;
}

export const TutorialManager: React.FC<TutorialManagerProps> = ({
  currentView,
  setCurrentView,
  activeModal,
  setActiveModal,
  isDockOpen,
  setIsDockOpen
}) => {
  const { isActive, currentStep, setCurrentStep, completeTutorial } = useTutorial();
  const [run, setRun] = useState(false);
  const Joyride = ReactJoyride as any;

  // Sync run state with context (with delay for fade-in)
  useEffect(() => {
    if (isActive) {
        // Wait for the 1.5s fade-in + 0.6s delay = 2.1s
        const timer = setTimeout(() => {
            setRun(true);
        }, 2100);
        return () => clearTimeout(timer);
    } else {
        setRun(false);
    }
  }, [isActive]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;
    
    // Update context step
    if (type === 'step:after' || type === EVENTS.TARGET_NOT_FOUND) {
        // If target not found, we might need to switch view, but for now just proceed
        if (action === 'next') {
            const nextStep = tutorialSteps[index + 1] as TutorialStep;
            if (nextStep?.delay) {
                setTimeout(() => {
                    setCurrentStep(index + 1);
                }, nextStep.delay);
            } else {
                setCurrentStep(index + 1);
            }
        } else if (action === 'prev') {
            setCurrentStep(index - 1);
        }
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      completeTutorial();
    }
  };

  // --- DYNAMIC CONTROL LOGIC ---
  // This effect watches the current step and forces the UI to match the step requirements
  useEffect(() => {
    if (!isActive) return;

    const step = tutorialSteps[currentStep];
    if (!step) return;

    // Logic for Navigation Steps
    if (step.target === '[data-tour="nav-store"]' && currentView !== 'STORE') {
        setCurrentView('STORE');
    }
    if (step.target === '[data-tour="nav-inventory"]' && currentView !== 'INVENTORY') {
        setCurrentView('INVENTORY');
    }
    
    // Logic for FAB menu opening
    if ((step.target as string).includes('new-mission-btn') && !isDockOpen) {
         setIsDockOpen(true);
    }

    // Logic for Habit Modal
    if ((step.target as string).includes('habit-modal-trigger') && activeModal !== 'HABIT') {
        setActiveModal('HABIT');
    }
    
    // Logic for Modal Steps
    if ((step.target as string).includes('modal-title-input') && activeModal !== 'QUEST') {
        setActiveModal('QUEST');
    }

  }, [currentStep, isActive, currentView, activeModal]);


  return (
    <Joyride
      steps={tutorialSteps}
      run={run}
      stepIndex={currentStep}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose={true}
      disableCloseOnEsc={true}
      spotlightClicks={true} // Allow clicking elements
      callback={handleJoyrideCallback}
      tooltipComponent={TutorialTooltip}
      floaterProps={{
        hideArrow: false,
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#6366f1', // Indigo 500
          textColor: '#fff',
          backgroundColor: '#1c1c1e',
          overlayColor: 'rgba(0, 0, 0, 0.6)', // Less aggressive overlay
        },
        spotlight: {
            borderRadius: 20,
        }
      }}
    />
  );
};
