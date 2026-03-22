import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../config/themes';
import { cn } from '../../utils/cn';
import { HeartExplosion } from '../../components/ui/HeartExplosion';

export const ThemeSelector: React.FC = () => {
  const { theme: currentTheme, setTheme } = useTheme();
  const [showHearts, setShowHearts] = useState(false);

  // Trigger hearts when Amy theme is selected
  useEffect(() => {
    if (currentTheme === 'amy') {
      setShowHearts(true);
      const timer = setTimeout(() => setShowHearts(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentTheme]);

  return (
    <div className="w-full space-y-6 py-4">
      <HeartExplosion isActive={showHearts} />
      <div className="flex items-center justify-between px-1">
        <h3 className="text-white font-medium text-lg tracking-tight">
          Reality Distortion Field
        </h3>
        <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Select Theme</span>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 px-4 pb-20">
        {Object.values(THEMES).map((themeOption) => {
          const isActive = currentTheme === themeOption.id;
          
          return (
            <motion.button
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              className={cn(
                "relative group flex flex-col items-center justify-center rounded-xl overflow-hidden focus:outline-none transition-all duration-300 aspect-[3/4]",
                isActive ? "ring-2 ring-white/50 ring-offset-1 ring-offset-black scale-[1.02] z-10" : "opacity-80 hover:opacity-100 hover:scale-[1.02] border border-white/5 hover:border-white/20"
              )}
              whileTap={{ scale: 0.98 }}
              initial={false}
            >
              {/* Background Gradient */}
              <div 
                className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                style={{ 
                  background: themeOption.gradient,
                  opacity: 0.8
                }}
              />
              
              {/* Glass Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-white/5" />
              
              {/* Active Indicator (Glow) */}
              {isActive && (
                <div 
                    className="absolute inset-0 opacity-30"
                    style={{ 
                        background: `radial-gradient(circle at center, rgb(${themeOption.colors.primaryGlow}), transparent 70%)` 
                    }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-end w-full h-full p-3 text-center">
                 {/* Icon / Color Circle */}
                 <div 
                    className={cn(
                        "w-8 h-8 rounded-full mb-auto mt-2 shadow-lg border border-white/20 flex items-center justify-center transition-transform duration-500",
                        isActive ? "scale-110" : "scale-100 group-hover:scale-110"
                    )}
                    style={{ 
                        background: `linear-gradient(135deg, rgb(${themeOption.colors.primaryGlow}), rgb(${themeOption.colors.secondaryGlow}))` 
                    }}
                 >
                    {isActive && <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                 </div>

                 <span className="text-xs font-medium text-white/90 tracking-wide drop-shadow-md flex items-center gap-1">
                     {themeOption.name}
                     {themeOption.id === 'amy' && <span className="text-[10px] text-pink-400 animate-pulse">♥</span>}
                  </span>
                 
                 {/* Active Label (Optional) */}
                 {isActive && (
                    <span className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase mt-1 drop-shadow-sm">
                        Active
                    </span>
                 )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
