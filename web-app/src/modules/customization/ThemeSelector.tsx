import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../config/themes';
import { cn } from '../../utils/cn';

export const ThemeSelector: React.FC = () => {
  const { theme: currentTheme, setTheme } = useTheme();

  return (
    <div className="w-full space-y-4">
      <h3 className="text-white/80 font-medium text-sm pl-1">
        Atmosphere
      </h3>
      
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide snap-x px-1">
        {Object.values(THEMES).map((themeOption) => {
          const isActive = currentTheme === themeOption.id;
          
          return (
            <motion.button
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              className={cn(
                "relative group flex-shrink-0 w-14 h-14 rounded-full snap-center focus:outline-none transition-all duration-300",
                isActive ? "scale-100" : "opacity-70 hover:opacity-100 scale-95"
              )}
              whileTap={{ scale: 0.90 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Active Ring */}
              {isActive && (
                <motion.div
                  layoutId="active-theme-ring"
                  className="absolute -inset-1.5 rounded-full border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* The Orb */}
              <div 
                className="w-full h-full rounded-full shadow-lg overflow-hidden relative border border-white/10"
                style={{ background: themeOption.gradient }}
              >
                {/* Gloss/Reflection Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent opacity-50" />
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/40 rounded-[100%] blur-[2px]" />
              </div>
              
              {/* Label */}
              <span className={cn(
                "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium tracking-wide whitespace-nowrap transition-all duration-300",
                isActive ? "text-white opacity-100" : "text-white/40 opacity-0 group-hover:opacity-100"
              )}>
                {themeOption.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
