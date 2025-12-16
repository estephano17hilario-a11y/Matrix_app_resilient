import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Crown, Target, Zap, Heart, Cloud, Lock, AlertTriangle, Battery, HelpCircle, MessageSquare, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { OnboardingLayout } from './components/OnboardingLayout';
import { GlassCard } from './components/GlassCard';
import { SelectionButton } from './components/SelectionButton';

type Step = 'intro' | 'success' | 'obstacles' | 'tone' | 'saving';

export function OnboardingFlow() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  
  const [success, setSuccess] = useState<string>('');
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [tone, setTone] = useState<string>('');

  const handleNext = () => {
    if (step === 'intro') setStep('success');
    else if (step === 'success') setStep('obstacles');
    else if (step === 'obstacles') setStep('tone');
    else if (step === 'tone') handleSubmit();
  };

  const toggleObstacle = (id: string) => {
    if (obstacles.includes(id)) {
      setObstacles(obstacles.filter(o => o !== id));
    } else {
      if (obstacles.length < 2) {
        setObstacles([...obstacles, id]);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setStep('saving');
    
    try {
      const userRef = doc(db, "users", user.uid);
      
      await updateDoc(userRef, {
        onboarding: {
          successDefinition: success,
          obstacles: obstacles,
          coachingTone: tone,
          completedAt: Date.now()
        }
      });
      
      // Update local state to redirect to dashboard
      await refreshProfile();
      
    } catch (error) {
      console.error("Error saving onboarding:", error);
      // Handle error UI if needed
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 'success': return "Define Success";
      case 'obstacles': return "Identify Blockers";
      case 'tone': return "Select Protocol";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch(step) {
      case 'success': return "What does the peak look like for you?";
      case 'obstacles': return "What has held you back? (Select up to 2)";
      case 'tone': return "How should the system communicate with you?";
      default: return "";
    }
  };

  return (
    <OnboardingLayout>
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full relative h-full">
        
        {/* Progress Indicator */}
        {step !== 'intro' && step !== 'saving' && (
            <div className="absolute top-0 left-0 right-0 flex justify-between px-2 py-4">
                <div className={`h-1 flex-1 rounded-full mx-1 transition-colors duration-500 ${step === 'success' ? 'bg-white' : 'bg-white/20'}`} />
                <div className={`h-1 flex-1 rounded-full mx-1 transition-colors duration-500 ${step === 'obstacles' ? 'bg-white' : 'bg-white/20'}`} />
                <div className={`h-1 flex-1 rounded-full mx-1 transition-colors duration-500 ${step === 'tone' ? 'bg-white' : 'bg-white/20'}`} />
            </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 0: INTRO */}
          {step === 'intro' && (
            <GlassCard key="intro" className="text-center py-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-8 flex justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                   <Target className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              
              <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">System Initialization</h1>
              <p className="text-white/60 text-lg mb-8 leading-relaxed">
                To construct your optimal path, the Matrix needs to calibrate to your unique psychological profile.
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all"
              >
                Begin Calibration
              </motion.button>
            </GlassCard>
          )}

          {/* STEP 1: SUCCESS */}
          {step === 'success' && (
            <GlassCard key="success">
              <div className="mb-6">
                <h2 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-2">{getStepTitle()}</h2>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{getStepDescription()}</h1>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                <SelectionButton 
                  selected={success === 'freedom'} 
                  onClick={() => setSuccess('freedom')}
                  icon={<Crown className="w-6 h-6" />}
                  subtitle="To wake up every day and do exactly what I want."
                >
                  Freedom
                </SelectionButton>
                
                <SelectionButton 
                  selected={success === 'impact'} 
                  onClick={() => setSuccess('impact')}
                  icon={<Target className="w-6 h-6" />}
                  subtitle="To leave a mark on the world that outlasts me."
                >
                  Impact
                </SelectionButton>
                
                <SelectionButton 
                  selected={success === 'mastery'} 
                  onClick={() => setSuccess('mastery')}
                  icon={<Zap className="w-6 h-6" />}
                  subtitle="To reach the absolute peak of my potential."
                >
                  Mastery
                </SelectionButton>

                <SelectionButton 
                  selected={success === 'connection'} 
                  onClick={() => setSuccess('connection')}
                  icon={<Heart className="w-6 h-6" />}
                  subtitle="To build deep, meaningful relationships."
                >
                  Connection
                </SelectionButton>

                <SelectionButton 
                  selected={success === 'peace'} 
                  onClick={() => setSuccess('peace')}
                  icon={<Cloud className="w-6 h-6" />}
                  subtitle="To find tranquility in a chaotic world."
                >
                  Peace
                </SelectionButton>
              </div>

              <div className="mt-8 flex justify-end">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: success ? 1 : 0.5 }}
                  disabled={!success}
                  onClick={handleNext}
                  className="bg-white text-black px-6 py-3 rounded-2xl font-bold text-lg flex items-center gap-2 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </GlassCard>
          )}

          {/* STEP 2: OBSTACLES */}
          {step === 'obstacles' && (
            <GlassCard key="obstacles">
              <div className="mb-6">
                <h2 className="text-xs font-bold text-red-400 uppercase tracking-[0.2em] mb-2">{getStepTitle()}</h2>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{getStepDescription()}</h1>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                {[
                  { id: 'procrastination', label: 'Procrastination', sub: 'Lack of discipline' },
                  { id: 'fear', label: 'Fear', sub: 'Fear of failure / Perfectionism' },
                  { id: 'clarity', label: 'Confusion', sub: 'Lack of clarity / Direction' },
                  { id: 'distractions', label: 'Distraction', sub: 'Social Media / Dopamine' },
                  { id: 'burnout', label: 'Burnout', sub: 'Low energy / Exhaustion' },
                  { id: 'doubt', label: 'Self-Doubt', sub: 'Imposter Syndrome' }
                ].map((item) => (
                    <SelectionButton 
                        key={item.id}
                        selected={obstacles.includes(item.id)} 
                        onClick={() => toggleObstacle(item.id)}
                        icon={<Lock className="w-6 h-6" />}
                        subtitle={item.sub}
                    >
                        {item.label}
                    </SelectionButton>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: obstacles.length > 0 ? 1 : 0.5 }}
                  disabled={obstacles.length === 0}
                  onClick={handleNext}
                  className="bg-white text-black px-6 py-3 rounded-2xl font-bold text-lg flex items-center gap-2 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </GlassCard>
          )}

          {/* STEP 3: TONE */}
          {step === 'tone' && (
            <GlassCard key="tone">
              <div className="mb-6">
                <h2 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-2">{getStepTitle()}</h2>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">{getStepDescription()}</h1>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                <SelectionButton 
                  selected={tone === 'raw'} 
                  onClick={() => setTone('raw')}
                  icon={<AlertTriangle className="w-6 h-6" />}
                  subtitle="Ruthless accountability. No excuses."
                >
                  Raw / David Goggins
                </SelectionButton>
                
                <SelectionButton 
                  selected={tone === 'empowered'} 
                  onClick={() => setTone('empowered')}
                  icon={<Battery className="w-6 h-6" />}
                  subtitle="Gentle but firm growth. Balanced energy."
                >
                  Empowered / Pilates
                </SelectionButton>
                
                <SelectionButton 
                  selected={tone === 'analytical'} 
                  onClick={() => setTone('analytical')}
                  icon={<HelpCircle className="w-6 h-6" />}
                  subtitle="Data-driven logic and strategy."
                >
                  Analytical / Professor
                </SelectionButton>

                <SelectionButton 
                  selected={tone === 'stoic'} 
                  onClick={() => setTone('stoic')}
                  icon={<Target className="w-6 h-6" />}
                  subtitle="Calm, rational discipline."
                >
                  Stoic / Emperor
                </SelectionButton>

                <SelectionButton 
                  selected={tone === 'friend'} 
                  onClick={() => setTone('friend')}
                  icon={<MessageSquare className="w-6 h-6" />}
                  subtitle="Supportive and encouraging sidekick."
                >
                  Best Friend
                </SelectionButton>
              </div>

              <div className="mt-8 flex justify-end">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: tone ? 1 : 0.5 }}
                  disabled={!tone}
                  onClick={handleNext}
                  className="bg-white text-black px-6 py-3 rounded-2xl font-bold text-lg flex items-center gap-2 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finish <CheckCircle2 className="w-5 h-5" />
                </motion.button>
              </div>
            </GlassCard>
          )}

          {/* LOADING STATE */}
          {step === 'saving' && (
            <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64"
            >
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6" />
                <h2 className="text-xl font-bold text-white">Configuring Reality...</h2>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </OnboardingLayout>
  );
}
