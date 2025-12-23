import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../config/themes';
import { cn } from '../../utils/cn';

export const ThemeSelector: React.FC = () => {
  const { theme: currentTheme, setTheme } = useTheme();

  return (
    <div className="w-full space-y-6 py-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-white font-medium text-lg tracking-tight">
          Reality Distortion Field
        </h3>
        <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Select Theme</span>
      </div>
      
      <div className="flex gap-6 overflow-x-auto pb-12 pt-4 scrollbar-hide snap-x px-4 -mx-4 mask-image-linear-to-r">
        {Object.values(THEMES).map((themeOption) => {
          const isActive = currentTheme === themeOption.id;
          
          return (
            <motion.button
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              className={cn(
                "relative group flex-shrink-0 w-44 h-72 rounded-[2rem] snap-center focus:outline-none transition-all duration-500",
                isActive ? "scale-105 z-10" : "opacity-70 hover:opacity-100 scale-95 hover:scale-100"
              )}
              whileTap={{ scale: 0.95 }}
              initial={false}
              animate={isActive ? { y: -10 } : { y: 0 }}
            >
              {/* Active Selection Ring (Liquid) */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="active-theme-ring"
                    className="absolute -inset-1 rounded-[2.2rem] opacity-100"
                    style={{
                      background: `linear-gradient(135deg, rgb(${themeOption.colors.primaryGlow}), rgb(${themeOption.colors.secondaryGlow}))`,
                      opacity: 0.5,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              {/* Card Container - Optimized Blur - REMOVED FOR STABILITY */}
              <div 
                className="w-full h-full rounded-[2rem] overflow-hidden relative border border-white/10 flex flex-col shadow-2xl bg-[#111]/90 transition-colors duration-500"
                style={{ 
                  background: `linear-gradient(to bottom, rgba(${themeOption.colors.bgDepth}, 0.95), rgba(${themeOption.colors.bgDepth}, 0.98))`,
                }}
              >
                 {/* Internal Glow (Ambient) - Optimized (No blur, use radial gradient) */}
                 <div 
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 mix-blend-screen transition-colors duration-500"
                    style={{ 
                        background: `radial-gradient(circle, rgb(${themeOption.colors.primaryGlow}) 0%, transparent 70%)` 
                    }}
                 />
                 <div 
                    className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-30 mix-blend-screen transition-colors duration-500"
                    style={{ 
                        background: `radial-gradient(circle, rgb(${themeOption.colors.secondaryGlow}) 0%, transparent 70%)` 
                    }}
                 />

                 {/* Noise Texture Overlay */}
                 <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

                 {/* MINI UI SIMULATION */}
                 <div className="relative z-10 flex flex-col h-full p-4">
                    
                    {/* Header Simulation */}
                    <div className="flex justify-between items-center mb-4">
                        <div 
                          className="h-2 w-12 rounded-full" 
                          style={{ backgroundColor: `rgba(${themeOption.colors.textPrimary}, 0.3)` }}
                        />
                        <div 
                          className="h-5 w-5 rounded-full border border-white/20 shadow-inner"
                          style={{ 
                              background: `linear-gradient(135deg, rgba(${themeOption.colors.primaryGlow}, 0.5), rgba(${themeOption.colors.secondaryGlow}, 0.5))`
                          }}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col gap-3">
                        {/* Hero Card - THEME SHOWCASE */}
                        <div className="w-full aspect-[4/3] rounded-2xl border border-white/10 p-3 flex flex-col justify-between relative overflow-hidden group-hover:border-white/30 transition-all shadow-lg">
                             {/* Full Gradient Background for Hero */}
                             <div 
                                className="absolute inset-0 opacity-80"
                                style={{ background: themeOption.gradient }}
                             />
                             
                             {/* Glass Overlay on Hero */}
                             <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

                             {/* Content inside Hero */}
                             <div className="relative z-10 flex justify-between items-start">
                                <div className="h-1.5 w-8 rounded-full bg-white/60" />
                             </div>
                             
                             <div className="relative z-10">
                                <div className="h-4 w-16 rounded-lg bg-white/20 backdrop-blur-md border border-white/10 mb-1" />
                                <div className="h-1.5 w-10 rounded-full bg-white/40" />
                             </div>
                        </div>

                        {/* List Items */}
                        <div className="space-y-2 mt-1">
                            {[1].map(i => (
                                <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/5">
                                    <div 
                                        className="w-5 h-5 rounded-md flex items-center justify-center shadow-sm"
                                        style={{ backgroundColor: `rgb(${themeOption.colors.primaryGlow})` }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-white/90" />
                                    </div>
                                    <div className="h-1.5 w-12 rounded-full bg-white/10" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer/Button */}
                    <div className="mt-auto pt-3">
                        <div 
                            className="w-full h-8 rounded-full flex items-center justify-center shadow-lg border border-white/20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 opacity-80 transition-opacity group-hover:opacity-100" style={{ background: themeOption.gradient }} />
                            <span className="relative z-10 text-[10px] font-bold tracking-widest uppercase text-white shadow-sm drop-shadow-md">
                                {themeOption.name}
                            </span>
                        </div>
                    </div>
                 </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
