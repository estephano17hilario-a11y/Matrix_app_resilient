import { motion } from 'framer-motion';
import { TooltipRenderProps } from 'react-joyride';
import { Sparkles, ArrowRight, X } from 'lucide-react';

export const TutorialTooltip = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) => {
  
  return (
    <div {...tooltipProps} className="max-w-[320px] w-full relative z-[9999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} // Apple-like spring
        className="bg-[#1c1c1e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle Ambient Glow instead of massive blobs */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50" />
        
        {/* Content Container */}
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
             {/* Icon / Badge */}
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles size={14} className="text-white" />
             </div>
             
             {/* Close Button */}
             <button {...closeProps} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
                <X size={14} />
             </button>
          </div>

          {/* Title */}
          {!!step.title && (
            <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">
              {step.title as any}
            </h3>
          )}

          {/* Body */}
          <div className="text-white/80 text-xs leading-relaxed mb-4 font-medium">
            {step.content as any}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-1">
                {/* Dots Indicator */}
                <span className="text-[10px] text-white/30 font-mono font-bold tracking-widest">
                    STEP {index + 1}
                </span>
            </div>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  {...backProps}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-white/50 hover:text-white transition-colors"
                >
                  BACK
                </button>
              )}
              
              <button
                {...primaryProps}
                className="group relative px-4 py-1.5 bg-white text-black rounded-full text-xs font-black uppercase tracking-wider shadow-lg overflow-hidden flex items-center gap-1.5 hover:scale-105 transition-transform"
              >
                 <span className="relative z-10">{isLastStep ? "FINISH" : "NEXT"}</span>
                 {!isLastStep && <ArrowRight size={12} className="relative z-10 group-hover:translate-x-0.5 transition-transform" />}
                 
                 {/* Iridescent shine on button */}
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
