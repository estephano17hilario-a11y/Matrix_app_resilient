import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, Calendar, ChevronRight, ChevronLeft, ArrowRight, Layers, Lock } from 'lucide-react';

interface SmartTaskTutorialProps {
  onComplete: () => void;
}

export const SmartTaskTutorial: React.FC<SmartTaskTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Strategic Vision",
      content: "We start with the 1-Year Goal. The North Star.",
      detail: "1 YEAR",
      icon: Brain,
      color: "from-indigo-500 to-purple-600"
    },
    {
      title: "Tactical Split",
      content: "The Year divides into 2 Semesters. 6 Months of clear direction.",
      detail: "2 SEMESTERS",
      icon: Layers,
      color: "from-blue-500 to-indigo-600"
    },
    {
      title: "Quarterly Focus",
      content: "Each Semester divides into 2 Quarters. 3 Months of high-impact focus.",
      detail: "4 QUARTERS",
      icon: Target,
      color: "from-emerald-500 to-teal-600"
    },
    {
      title: "Monthly Execution",
      content: "Quarters break down into 3 Months. Actionable milestones.",
      detail: "12 MONTHS",
      icon: Calendar,
      color: "from-orange-500 to-red-600"
    },
    {
      title: "Weekly Sprints",
      content: "Months become Weeks. The rhythm of progress.",
      detail: "52 WEEKS",
      icon: RotateCcw,
      color: "from-pink-500 to-rose-600"
    },
    {
      title: "Daily Impact",
      content: "Weeks become Days. Where the work actually happens.",
      detail: "365 DAYS",
      icon: Sparkles,
      color: "from-violet-500 to-fuchsia-600"
    },
    {
      title: "Example Flow",
      content: "Goal: Launch App\n↓\nS1: MVP Built\n↓\nQ1: Core Features\n↓\nMonth 1: Backend\n↓\nWeek 1: Auth System\n↓\nDay 1: Setup Firebase",
      detail: "FULL STACK",
      icon: Zap,
      color: "from-amber-500 to-yellow-600"
    }
  ];

  const nextStep = () => {
    if (step < slides.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const currentSlide = slides[step];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-white p-8 relative overflow-hidden w-full max-w-4xl mx-auto">
        {/* Ambient Background */}
        <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r ${currentSlide.color} opacity-20 rounded-full blur-[120px] transition-all duration-1000`} />
        </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center max-w-2xl z-10 w-full"
        >
          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${currentSlide.color} flex items-center justify-center mb-8 shadow-2xl shadow-black/20 ring-1 ring-white/10`}>
            <currentSlide.icon className="w-12 h-12 text-white" />
          </div>
          
          <div className="inline-flex items-center space-x-2 mb-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-xs font-bold tracking-widest uppercase text-white/70">{currentSlide.detail}</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">{currentSlide.title}</h2>
          
          <div className="min-h-[120px] flex items-center justify-center">
             <p className="text-xl text-white/70 leading-relaxed whitespace-pre-line">
                {currentSlide.content}
              </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-12 z-20">
          <button 
            onClick={prevStep}
            disabled={step === 0}
            className={`p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 ${step === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 hover:scale-110 active:scale-95'}`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex gap-2">
            {slides.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-white' : 'w-1.5 bg-white/20'}`} />
            ))}
          </div>

          <button 
            onClick={nextStep}
            className="p-4 rounded-full bg-white text-black font-bold transition-all duration-300 hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            {step === slides.length - 1 ? <Sparkles className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
          </button>
      </div>
    </div>
  );
};

// Missing icons import shim
const RotateCcw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /><path d="M3 3v9h9" /></svg>
);

const Zap = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);
