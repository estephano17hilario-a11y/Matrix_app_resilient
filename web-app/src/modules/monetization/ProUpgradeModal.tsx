import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Infinity, 
  Sparkles,
} from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Background Backdrop - Solid for Stability */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95"
          >
             {/* Subtle Ambient Light - Optimized Gradients */}
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79, 70, 229, 0.3) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192, 38, 211, 0.3) 0%, transparent 70%)' }} />
             </div>
          </motion.div>

          {/* The Crystal Monolith */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-[500px] overflow-hidden rounded-[32px] border border-white/10 shadow-2xl"
          >
            {/* Glass Material Layer - Solid for Performance */}
            <div className="absolute inset-0 bg-[#121214]" />
            
            {/* Content Container */}
            <div className="relative p-6 md:p-8 flex flex-col h-full">
              
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-20 group"
              >
                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4"
                >
                  <Sparkles size={12} className="text-red-400" />
                  <span className="text-[10px] font-bold tracking-widest text-red-300 uppercase">
                    System Limit
                  </span>
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                  Capacity Reached
                </h2>
                <p className="text-white/40 text-sm">
                  Complete existing tasks to free up cognitive resources.
                </p>
              </div>

              {/* Benefits Grid - Compact & Elegant */}
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Infinity size={32} className="text-white/20" />
                </div>
                <p className="text-white/60 max-w-xs text-sm">
                    Your neural link is operating at maximum efficiency. 
                </p>
              </div>

              {/* Footer Actions */}
              <div className="mt-auto pt-6 border-t border-white/5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="w-full relative overflow-hidden rounded-2xl group focus:outline-none bg-white text-black"
                  >
                    <div className="relative px-6 py-3.5 flex items-center justify-center gap-2">
                          <span className="font-semibold text-sm tracking-wide">Acknowledge</span>
                    </div>
                  </motion.button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
