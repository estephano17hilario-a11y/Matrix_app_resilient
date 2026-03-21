import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, animate } from 'framer-motion';
import { Zap, Star, Coins, ArrowRight } from 'lucide-react';
import { useReward } from '../context/RewardContext';
import { useTranslation } from 'react-i18next';
import { calculateNextLevelXp, calculateXpForLevel } from '../../../utils/leveling';

// --- Constants ---
const STEP_DURATION = 1500; 

const Counter = ({ value }: { value: number }) => {
    return <span>{Math.floor(value)}</span>;
};

export const RewardOverlay: React.FC = () => {
  const { t } = useTranslation();
  const { queue, dismissReward, setIsAnimating } = useReward();
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [step, setStep] = useState<'IDLE' | 'XP' | 'TRAIT' | 'GOLD'>('IDLE');
  const traitLabel: string | null = typeof currentReward?.traitName === 'string' ? currentReward.traitName : null;
  const notificationRoot = typeof document !== 'undefined' ? document.getElementById('notification-stack-root') : null;
  
  // Ref for the card to calculate coin start position
  const cardRef = useRef<HTMLDivElement>(null);
  const [goldTarget, setGoldTarget] = useState<{x: number, y: number} | null>(null);

  // Visual State for animations
  const [visualState, setVisualState] = useState({
      level: 0,
      currentXp: 0,
      maxXp: 100,
      percent: 0,
      isLevelUpAnimating: false,
      label: "Experience"
  });

  useEffect(() => {
    if (queue.length > 0 && !currentReward) {
      const reward = queue[0];
      setCurrentReward(reward);
      setIsAnimating(true);
      setStep('XP');
    }
  }, [queue, currentReward, setIsAnimating]);

  // --- SEQUENCE CONTROLLER ---
  useEffect(() => {
    if (!currentReward) return;

    let isCancelled = false;

    const runSequence = async () => {
        if (step === 'XP') {
            await runXpAnimation();
            if (!isCancelled) advanceFromXp();
        } else if (step === 'TRAIT') {
            // Simple delay for Trait for now, or similar animation if needed
            // For traits we often don't have the full history, so we stick to simple animation
            // unless we want to replicate the logic.
            await wait(STEP_DURATION); 
            if (!isCancelled) advanceFromTrait();
        } else if (step === 'GOLD') {
            await wait(STEP_DURATION);
            if (!isCancelled) finish();
        }
    };

    runSequence();

    return () => { isCancelled = true; };
  }, [step, currentReward]);


  // --- ANIMATION LOGIC ---

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runXpAnimation = async () => {
      const startLevel = currentReward.initialLevel || currentReward.level;
      const endLevel = currentReward.level;
      const isNegative = currentReward.xpGained < 0;

      // If negative, skip the complex bar animation and just show the current state
      if (isNegative) {
          const levelBaseXp = calculateXpForLevel(endLevel);
          const nextLevelTotal = calculateNextLevelXp(endLevel);
          const levelMax = nextLevelTotal - levelBaseXp;
          const currentRelXp = currentReward.currentXp; // Should already be correct in payload
          
          setVisualState({
              level: endLevel,
              currentXp: currentRelXp,
              maxXp: levelMax,
              percent: (currentRelXp / levelMax) * 100,
              isLevelUpAnimating: false,
              label: "XP LOST"
          });
          
          await wait(1500); // Show for a bit
          return;
      }
      
      // Calculate initial XP (fallback if not provided)
      let currentLvl = startLevel;
      
      // Determine starting XP relative to the level
      // If we are at startLevel, we use initialXp. 
      // Fallback: If no initialXp, we assume it was (current - gained), but clamped 0.
      let currentRelXp = currentReward.initialXp !== undefined 
          ? currentReward.initialXp 
          : (startLevel === endLevel ? Math.max(0, currentReward.currentXp - currentReward.xpGained) : 0);

      // Loop through levels
      while (currentLvl <= endLevel) {
          const isLastLevel = currentLvl === endLevel;
          const levelBaseXp = calculateXpForLevel(currentLvl);
          const nextLevelTotal = calculateNextLevelXp(currentLvl);
          const levelMax = nextLevelTotal - levelBaseXp;
          
          // Target for this level
          // If last level, target is actual currentXp.
          // If intermediate level, target is levelMax (full bar).
          const targetRelXp = isLastLevel ? currentReward.currentXp : levelMax;

          // Update Visual State Initial
          setVisualState({
              level: currentLvl,
              currentXp: currentRelXp,
              maxXp: levelMax,
              percent: (currentRelXp / levelMax) * 100,
              isLevelUpAnimating: false,
              label: "Experience"
          });

          await wait(300); // Pause before filling

          // Animate Fill
          await animate(currentRelXp, targetRelXp, {
              duration: 1, // 1 second fill
              ease: "circOut",
              onUpdate: (val) => {
                  setVisualState(prev => ({
                      ...prev,
                      currentXp: val,
                      percent: (val / levelMax) * 100
                  }));
              }
          });

          // Level Up Effect
          if (!isLastLevel) {
              setVisualState(prev => ({ ...prev, isLevelUpAnimating: true }));
              await wait(800); // Celebrate
              
              // Prepare for next loop
              currentLvl++;
              currentRelXp = 0; 
          } else {
              // Finished
              break;
          }
      }
      
      await wait(500); // Pause at end
  };

  const advanceFromXp = () => {
    // If negative XP, we might still want to show gold change if any
    if (currentReward.traitId) {
        setStep('TRAIT');
    } else if (currentReward.goldGained !== 0) { // Changed > 0 to !== 0 to handle gold loss
        setStep('GOLD');
    } else {
        finish();
    }
  };

  const advanceFromTrait = () => {
    if (currentReward.goldGained !== 0) { // Changed > 0 to !== 0
        setStep('GOLD');
    } else {
        finish();
    }
  };

  const finish = () => {
      setStep('IDLE');
      setTimeout(() => {
        dismissReward(currentReward.id);
        setCurrentReward(null);
        setIsAnimating(false);
      }, 300);
  };

  // Calculate Gold Target
  useEffect(() => {
    if (step === 'GOLD' && cardRef.current) {
        const targetEl = document.getElementById('gold-counter-pill');
        if (targetEl && cardRef.current) {
            const targetRect = targetEl.getBoundingClientRect();
            const cardRect = cardRef.current.getBoundingClientRect();
            
            setGoldTarget({
                x: targetRect.left + targetRect.width / 2 - (cardRect.left + cardRect.width / 2),
                y: targetRect.top + targetRect.height / 2 - (cardRect.top + cardRect.height / 2)
            });
        } else {
            setGoldTarget({ x: 200, y: -500 });
        }
    }
  }, [step]);


  // --- RENDER HELPERS ---

  const renderProgressBar = (
      current: number, 
      max: number, 
      label: string, 
      color: string, 
      icon: React.ReactNode, 
      isLevelUp: boolean,
      prevValue?: number
  ) => {
    const percent = Math.min(100, Math.max(0, (current / max) * 100));
    
    // If prevValue provided, we animate from it (Simple Mode for Traits)
    // If not provided, we assume external control (XP Mode) or start from 0
    const initialPercent = prevValue !== undefined 
        ? Math.min(100, Math.max(0, (prevValue / max) * 100))
        : 0;

    // Transition duration: fast if external control (no prevValue), slow if internal animation (prevValue)
    const duration = prevValue !== undefined ? 1.0 : 0.1;

    return (
      <motion.div 
        className="flex flex-col gap-1.5 w-full"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`p-1 rounded bg-gradient-to-br ${color} shadow-sm flex items-center justify-center`}>
                    {icon}
                </div>
                <div className="flex flex-col leading-none">
                    <h3 className="text-[10px] font-bold text-white/90 tracking-wider uppercase">{label}</h3>
                    {isLevelUp && (
                        <motion.span 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-[9px] font-black text-yellow-400 animate-pulse mt-0.5"
                        >
                            LEVEL UP!
                        </motion.span>
                    )}
                </div>
            </div>
            <div className="text-right leading-none">
                <div className="text-[10px] font-mono font-bold text-white">
                    <Counter value={current} /> <span className="text-white/40">/ {Math.floor(max)}</span>
                </div>
            </div>
        </div>

        {/* Bar */}
        <div className="relative w-full h-1 bg-gray-800 rounded-full overflow-hidden border border-white/5">
            <motion.div 
                className={`absolute top-0 left-0 h-full ${color.replace('from-', 'bg-').replace('to-', '')} opacity-20`}
                initial={{ width: 0 }}
                animate={{ width: "100%" }} 
            />
            <motion.div 
                className={`absolute top-0 left-0 h-full bg-gradient-to-r ${color}`}
                initial={{ width: `${initialPercent}%` }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: duration, ease: "circOut" }}
            />
        </div>
      </motion.div>
    );
  };

  return createPortal(
    <AnimatePresence mode="popLayout">
      {currentReward && (
        <motion.div
          layout
          key="reward-toast"
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
          className="w-80 pointer-events-auto"
        >
          <div className="relative group overflow-hidden rounded-[24px] will-change-transform">
            {/* Apple-style Glass Background - Optimized for zero delay/flicker */}
            <div className="absolute inset-0 bg-[#020204]/90 border border-white/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]" />
            
            {/* Subtle light sweep instead of noise for performance */}
            <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full group-hover:animate-[sweep_1.5s_ease-in-out_infinite]" />

            <div className="relative p-5">
                <AnimatePresence mode="wait">
                {step === 'XP' && (
                    <motion.div
                    key="xp"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex flex-col gap-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/40 tracking-[0.15em] uppercase font-mono">
                                {currentReward.xpGained < 0 ? "XP LOST" : "Experience"}
                            </span>
                            <span className={`text-xs font-black font-mono tracking-tight ${currentReward.xpGained < 0 ? 'text-red-400' : 'text-indigo-400'}`}>
                                {currentReward.xpGained > 0 ? '+' : ''}{currentReward.xpGained} XP
                            </span>
                        </div>
                        
                        {/* Custom Visual State Render for XP */}
                        {renderProgressBar(
                            visualState.currentXp,
                            visualState.maxXp,
                            currentReward.xpGained < 0 ? "Regression" : "Experience",
                            currentReward.xpGained < 0 ? "from-red-500 to-orange-500" : "from-indigo-500 to-purple-500",
                            <Zap size={11} className="text-white" />,
                            visualState.isLevelUpAnimating || currentReward.isLevelUp
                        )}
                        
                        {/* Level Indicator - Minimalist Apple Style */}
                        <div className="flex justify-between items-center min-h-[1.5rem] mt-1">
                             {!visualState.isLevelUpAnimating ? (
                                 <div className="flex items-baseline gap-1.5">
                                     <span className="text-[10px] font-black text-white/30 uppercase tracking-widest font-mono">Level</span>
                                     <span className="text-xl font-bold text-white tracking-tight">{visualState.level}</span>
                                 </div>
                             ) : (
                                 <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 w-full"
                                 >
                                     <div className="flex items-center gap-2 text-white/90">
                                         <span className="text-lg font-bold">{visualState.level}</span>
                                         <ArrowRight size={14} className="text-white/40" />
                                         <span className="text-2xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">{visualState.level + 1}</span>
                                     </div>
                                     <span className="ml-auto text-[9px] font-black text-yellow-500/90 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 tracking-[0.2em] font-mono">LEVEL UP</span>
                                 </motion.div>
                             )}
                        </div>

                    </motion.div>
                )}

                {step === 'TRAIT' && (
                    <motion.div
                    key="trait"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/40 tracking-[0.15em] uppercase font-mono">Growth</span>
                            <span className="text-xs font-black text-cyan-400 font-mono tracking-tight">+{currentReward.traitXpGained} XP</span>
                        </div>

                        {renderProgressBar(
                            currentReward.traitCurrentXp,
                            currentReward.traitMaxXp,
                            traitLabel ? t(traitLabel, traitLabel) : t('modals.project.traitDefault', 'Trait'),
                            "from-cyan-400 to-blue-500",
                            <Star size={11} className="text-white" />,
                            currentReward.isTraitLevelUp,
                            currentReward.isTraitLevelUp ? 0 : Math.max(0, currentReward.traitCurrentXp - (currentReward.traitXpGained || 0))
                        )}
                    </motion.div>
                )}

                {step === 'GOLD' && (
                    <motion.div
                    key="gold"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center py-2 relative w-full"
                    >
                        <div className="flex items-center gap-4 relative bg-white/5 rounded-2xl p-3 px-5 border border-white/10">
                            <div className={`relative flex items-center justify-center p-2 rounded-full shadow-lg ${currentReward.goldGained < 0 ? 'bg-gradient-to-br from-gray-500 to-slate-600 shadow-gray-500/10' : 'bg-gradient-to-br from-amber-300 to-yellow-500 shadow-yellow-500/10'}`}>
                                <Coins size={18} className="text-white drop-shadow-sm" />
                            </div>
                            
                            <div className="flex flex-col leading-none items-start gap-0.5">
                                <span className={`text-xl font-black tracking-tight font-mono ${currentReward.goldGained < 0 ? 'text-red-300' : 'text-white'}`}>
                                    {currentReward.goldGained > 0 ? '+' : ''}{currentReward.goldGained}
                                </span>
                                <span className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase font-mono">Coins</span>
                            </div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    notificationRoot || document.body
  );
};
