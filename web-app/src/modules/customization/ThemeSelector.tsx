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
      
      <div className="flex gap-4 overflow-x-auto pb-8 pt-2 scrollbar-hide snap-x px-1">
        {Object.values(THEMES).map((themeOption) => {
          const isActive = currentTheme === themeOption.id;
          
          return (
            <motion.button
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              className={cn(
                "relative group flex-shrink-0 w-24 h-32 rounded-2xl snap-center focus:outline-none transition-all duration-300",
                isActive ? "scale-100 ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "opacity-70 hover:opacity-100 scale-95 hover:scale-98"
              )}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Card Container (Mini UI) */}
              <div 
                className="w-full h-full rounded-2xl overflow-hidden relative border border-white/10 flex flex-col shadow-xl"
                style={{ 
                  backgroundColor: `rgb(${themeOption.colors.bgDepth})`,
                  color: `rgb(${themeOption.colors.textPrimary})`
                }}
              >
                 {/* Background Glow (Simulating Aurora) */}
                 <div 
                    className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[20px] opacity-40"
                    style={{ backgroundColor: `rgb(${themeOption.colors.primaryGlow})` }}
                 />
                 <div 
                    className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[20px] opacity-30"
                    style={{ backgroundColor: `rgb(${themeOption.colors.secondaryGlow})` }}
                 />

                 {/* Glass Overlay/Noise */}
                 <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />

                 {/* Mini UI Elements */}
                 <div className="relative z-10 p-2 flex flex-col h-full gap-2">
                    {/* Header */}
                    <div className="h-2 w-1/2 rounded-full bg-white/10" />
                    
                    {/* Hero Section */}
                    <div className="flex gap-2 items-center mt-1">
                        <div 
                            className="w-8 h-8 rounded-full shadow-sm flex items-center justify-center text-[8px]"
                            style={{ 
                                background: `linear-gradient(135deg, rgb(${themeOption.colors.primaryGlow}), rgb(${themeOption.colors.secondaryGlow}))`,
                                color: 'white'
                            }}
                        >
                            Aa
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="h-1.5 w-8 rounded-full bg-white/20" />
                            <div className="h-1.5 w-6 rounded-full bg-white/10" />
                        </div>
                    </div>

                    {/* Body Lines */}
                    <div className="mt-auto space-y-1.5 opacity-50">
                        <div className="h-1 w-full rounded-full bg-white/10" />
                        <div className="h-1 w-[80%] rounded-full bg-white/10" />
                    </div>

                    {/* Active Indicator (Bottom) */}
                    <div 
                        className="h-1 w-full rounded-full mt-2"
                        style={{ backgroundColor: `rgb(${themeOption.colors.primaryGlow})` }}
                    />
                 </div>
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
