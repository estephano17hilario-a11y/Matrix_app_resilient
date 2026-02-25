import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, animate } from 'framer-motion';
import { Zap, Star, Coins } from 'lucide-react';
import { useReward } from '../context/RewardContext';
import { useTranslation } from 'react-i18next';

// --- Constants ---
const STEP_DURATION = 2000; // Slower to allow animation to complete

const Counter = ({ from, to }: { from: number; to: number }) => {
    const ref = useRef<HTMLSpanElement>(null);
    
    useEffect(() => {
        const controls = animate(from, to, {
            duration: 1,
            ease: "circOut",
            delay: 0.5, // Increased delay
            onUpdate: (value) => {
                if (ref.current) {
                    ref.current.textContent = Math.floor(value).toString();
                }
            }
        });
        return () => controls.stop();
    }, [from, to]);

    return <span ref={ref}>{Math.floor(from)}</span>;
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

  useEffect(() => {
    if (queue.length > 0 && !currentReward) {
      const reward = queue[0];
      setCurrentReward(reward);
      setIsAnimating(true);
      setStep('XP');
    }
  }, [queue, currentReward, setIsAnimating]);

  // Sequence Controller
  useEffect(() => {
    if (!currentReward) return;

    let timeout: NodeJS.Timeout;

    const advance = () => {
      if (step === 'XP') {
        if (currentReward.traitId) {
          setStep('TRAIT');
        } else if (currentReward.goldGained > 0) {
          setStep('GOLD');
        } else {
          finish();
        }
      } else if (step === 'TRAIT') {
        if (currentReward.goldGained > 0) {
          setStep('GOLD');
        } else {
          finish();
        }
      } else if (step === 'GOLD') {
        finish();
      }
    };

    const finish = () => {
      setStep('IDLE');
      setTimeout(() => {
        dismissReward(currentReward.id);
        setCurrentReward(null);
        setIsAnimating(false);
      }, 300); // Faster exit
    };

    timeout = setTimeout(advance, STEP_DURATION);

    return () => clearTimeout(timeout);
  }, [step, currentReward, dismissReward, setIsAnimating]);

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
            // Fallback: Fly up and right off screen
            setGoldTarget({ x: 200, y: -500 });
        }
    }
  }, [step]);

  // if (!currentReward && step === 'IDLE') return null;

  // --- Render Helpers ---

  const renderProgressBar = (current: number, max: number, gained: number, label: string, color: string, icon: React.ReactNode, isLevelUp: boolean) => {
    const percent = Math.min(100, Math.max(0, (current / max) * 100));
    const initialPercent = isLevelUp ? 0 : Math.min(100, Math.max(0, ((current - gained) / max) * 100));
    const initialValue = isLevelUp ? 0 : Math.max(0, current - gained);
    
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
                    <Counter from={initialValue} to={current} /> <span className="text-white/40">/ {Math.floor(max)}</span>
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
                transition={{ duration: 1, ease: "circOut", delay: 0.5 }}
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
          initial={{ opacity: 0, scale: 0.8, y: -20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)', transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 500, damping: 30, mass: 1 }}
          className="w-72 pointer-events-auto p-2"
        >
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 group-hover:border-white/20">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50" />
            </div>

            <div className="relative p-3">
                <AnimatePresence mode="wait">
                {step === 'XP' && (
                    <motion.div
                    key="xp"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1.5"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Rewards</span>
                            <span className="text-[10px] font-bold text-indigo-400">+{currentReward.xpGained} XP</span>
                        </div>
                        
                        {renderProgressBar(
                            currentReward.currentXp,
                            currentReward.maxXp,
                            currentReward.xpGained,
                            "Experience",
                            "from-indigo-500 to-purple-500",
                            <Zap size={10} className="text-white" />,
                            currentReward.isLevelUp
                        )}
                    </motion.div>
                )}

                {step === 'TRAIT' && (
                    <motion.div
                    key="trait"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1.5"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Growth</span>
                            <span className="text-[10px] font-bold text-cyan-400">+{currentReward.traitXpGained} XP</span>
                        </div>

                        {renderProgressBar(
                            currentReward.traitCurrentXp,
                            currentReward.traitMaxXp,
                            currentReward.traitXpGained || 0,
                            traitLabel ? t(traitLabel, traitLabel) : t('modals.project.traitDefault', 'Trait'),
                            "from-cyan-400 to-blue-500",
                            <Star size={10} className="text-white" />,
                            currentReward.isTraitLevelUp
                        )}
                    </motion.div>
                )}

                {step === 'GOLD' && (
                    <motion.div
                    key="gold"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="flex items-center justify-center py-1 px-1 relative w-full"
                    >
                        <div className="flex items-center gap-4 relative">
                            <div className="relative flex items-center justify-center p-1.5 bg-gradient-to-br from-amber-400/20 to-yellow-600/20 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                <Coins size={16} className="text-yellow-400" />
                                
                                {goldTarget && (
                                    <div className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none z-[200]">
                                        {[...Array(12)].map((_, i) => (
                                            <motion.div
                                                key={`coin-${i}`}
                                                initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                                                animate={{ 
                                                    x: goldTarget.x + 30,
                                                    y: goldTarget.y,
                                                    opacity: 0,
                                                    scale: 0.3
                                                }}
                                                transition={{ 
                                                    duration: 0.6 + Math.random() * 0.3, 
                                                    ease: "circIn",
                                                    delay: i * 0.03 
                                                }}
                                                className="absolute w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col leading-none items-start">
                                <span className="text-lg font-black text-yellow-400 drop-shadow-sm">+{currentReward.goldGained}</span>
                                <span className="text-[9px] font-bold text-white/40 tracking-widest uppercase mt-0.5">Coins</span>
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
