import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface SmartTaskTutorialProps {
  onComplete: () => void;
}

export const SmartTaskTutorial: React.FC<SmartTaskTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const variants = {
    initial: { opacity: 0, scale: 0.8, filter: 'blur(10px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 1.2, filter: 'blur(10px)' }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-white p-8 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[80px]" />
        </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center max-w-lg z-10"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Neural Decomposition</h2>
            <p className="text-lg text-white/60 leading-relaxed">
              We don't just set goals. We architect them. <br/>
              Breaking down the impossible into the inevitable.
            </p>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center max-w-lg z-10"
          >
            <div className="relative mb-12 w-full h-40 flex items-center justify-center">
                 {/* Diagram Animation */}
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-0 w-16 h-16 rounded-2xl bg-white flex items-center justify-center z-20"
                 >
                    <Target className="text-black" />
                 </motion.div>
                 
                 {/* Branches */}
                 <svg className="absolute top-8 w-64 h-32 visible overflow-visible">
                    <motion.path 
                        d="M 128 0 L 128 40 L 40 40 L 40 80" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.2)" 
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                    />
                     <motion.path 
                        d="M 128 0 L 128 40 L 216 40 L 216 80" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.2)" 
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                    />
                 </svg>

                 <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 }}
                    className="absolute bottom-0 left-10 w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md"
                 >
                    <span className="text-xs font-mono">H1</span>
                 </motion.div>

                 <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4 }}
                    className="absolute bottom-0 right-10 w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md"
                 >
                     <span className="text-xs font-mono">H2</span>
                 </motion.div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Recursive Logic</h2>
            <p className="text-white/60">
              Years become Semesters. Semesters become Months.<br/>
              Complexity dissolves into clarity.
            </p>
          </motion.div>
        )}

        {step === 2 && (
            <motion.div
                key="step2"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center max-w-lg z-10"
            >
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-t border-indigo-500"
                    />
                    <Calendar className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Temporal Precision</h2>
                <p className="text-white/60 mb-8">
                    Every task is anchored in time. <br/>
                    Execution is no longer abstract. It is scheduled.
                </p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onComplete}
                    className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
                >
                    Initialize Protocol <ChevronRight size={18} />
                </motion.button>
            </motion.div>
        )}
        
        {step === 3 && (
             // Fallback to step 2 if timer overshoots, or stay on final state
            <motion.div
                key="step3"
                variants={variants}
                initial="initial"
                animate="animate"
                className="flex flex-col items-center text-center max-w-lg z-10"
            >
               <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-t border-indigo-500"
                    />
                    <Calendar className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Temporal Precision</h2>
                <p className="text-white/60 mb-8">
                    Every task is anchored in time. <br/>
                    Execution is no longer abstract. It is scheduled.
                </p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onComplete}
                    className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg flex items-center gap-2 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
                >
                    Initialize Protocol <ChevronRight size={18} />
                </motion.button>
            </motion.div>
        )}

      </AnimatePresence>
      
      {/* Progress Indicators */}
      <div className="absolute bottom-12 flex gap-2">
        {[0, 1, 2].map((i) => (
            <div 
                key={i}
                className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    step >= i ? "bg-white w-8" : "bg-white/20"
                )}
            />
        ))}
      </div>
    </div>
  );
};
