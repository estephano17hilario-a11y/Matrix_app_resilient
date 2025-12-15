import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Target, Crown } from 'lucide-react';
import { OnboardingLayout } from './components/OnboardingLayout';
import { GlassCard } from './components/GlassCard';
import { SelectionButton } from './components/SelectionButton';
import { TraitSelector } from './components/TraitSelector';

type Step = 'intro' | 'identity' | 'ambition' | 'traits' | 'completion';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ambition, setAmbition] = useState<string | null>(null);
  const [traits, setTraits] = useState<string[]>([]);
  
  // Identity State
  const codename = 'Neo';

  const nextStep = (target: Step) => {
    setStep(target);
  };

  return (
    <OnboardingLayout>
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full relative h-full">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: INTRO */}
          {step === 'intro' && (
            <GlassCard key="intro" className="flex flex-col items-center text-center py-12">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(59,130,246,0.5)] relative"
              >
                <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
                <Zap className="text-white w-10 h-10 drop-shadow-lg" />
              </motion.div>
              
              <h1 className="text-5xl font-bold tracking-tighter mb-4 text-white">
                Matrix
              </h1>
              <p className="text-white/70 text-xl mb-10 leading-relaxed font-medium">
                Most apps are chores.<br/>
                This is a <span className="text-white font-bold">weapon</span>.
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => nextStep('ambition')}
                className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
              >
                Enter the System <ArrowRight className="w-5 h-5" />
              </motion.button>
            </GlassCard>
          )}

          {/* STEP 4: AMBITION */}
          {step === 'ambition' && (
            <GlassCard key="ambition">
              <div className="mb-8">
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-3">The Goal</h2>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-3">What do you want?</h1>
                <p className="text-white/60 text-lg">Define your North Star.</p>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 -mr-1 space-y-4 py-2">
                <SelectionButton 
                  selected={ambition === 'freedom'} 
                  onClick={() => setAmbition('freedom')}
                  icon={<Crown className="w-7 h-7" />}
                  subtitle="I want to escape the system."
                >
                  Financial Freedom
                </SelectionButton>
                
                <SelectionButton 
                  selected={ambition === 'legacy'} 
                  onClick={() => setAmbition('legacy')}
                  icon={<Target className="w-7 h-7" />}
                  subtitle="Build something that lasts."
                >
                  Legacy
                </SelectionButton>
                
                <SelectionButton 
                  selected={ambition === 'mastery'} 
                  onClick={() => setAmbition('mastery')}
                  icon={<Zap className="w-7 h-7" />}
                  subtitle="Be the absolute best at my craft."
                >
                  Mastery
                </SelectionButton>
              </div>

              <div className="mt-8 flex justify-end">
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: ambition ? 1 : 0, x: ambition ? 0 : 20 }}
                  disabled={!ambition}
                  onClick={() => nextStep('traits')}
                  className="bg-white text-black px-8 py-3 rounded-2xl font-bold text-lg flex items-center gap-2 disabled:pointer-events-none shadow-lg shadow-white/10"
                >
                  Next <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </GlassCard>
          )}

          {/* STEP 5: TRAITS */}
          {step === 'traits' && (
            <motion.div
              key="traits"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col justify-center"
            >
              <TraitSelector 
                onNext={(selected) => {
                  setTraits(selected);
                  nextStep('completion');
                }} 
              />
            </motion.div>
          )}

          {/* STEP 6: COMPLETION */}
          {step === 'completion' && (
            <GlassCard key="completion" className="text-center py-12 flex flex-col items-center">
               <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 1 }}
                className="mb-8"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(52,211,153,0.5)]">
                   <Zap className="text-white w-12 h-12 fill-current" />
                </div>
              </motion.div>

              <h1 className="text-4xl font-bold tracking-tight text-white mb-6">
                Welcome, <span className="ai-gradient-text">{codename}</span>.
              </h1>
              
              <div className="space-y-4 mb-10 text-left w-full bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-white/40 text-sm font-medium">PROTOCOL</span>
                  <span className="text-white font-bold tracking-widest text-sm">MATRIX-V1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-sm font-medium">MISSION</span>
                  <span className="text-white font-bold capitalize">{ambition}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap gap-2">
                  {traits.map(trait => (
                     <span key={trait} className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/10 text-white/80 uppercase tracking-wider border border-white/5">
                       {trait}
                     </span>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onComplete}
                className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)] ai-border-glow"
              >
                Initialize Protocol
              </motion.button>
            </GlassCard>
          )}
        </AnimatePresence>
      </div>
    </OnboardingLayout>
  );
}
