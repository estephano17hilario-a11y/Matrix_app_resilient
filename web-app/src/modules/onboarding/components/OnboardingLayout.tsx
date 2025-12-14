import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-purple-900/40 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-blue-900/30 rounded-full blur-[120px]" 
        />
      </div>

      {/* Content Area - Safe Area Respected */}
      <div className="relative z-10 w-full h-full flex flex-col pt-safe pb-safe px-6 items-center justify-center">
        {children}
      </div>
    </div>
  );
}
