import React from 'react';
import { motion } from 'framer-motion';

export const GrassLayer: React.FC = () => {
  // We use multiple layers of grass for depth
  // Colors are derived from the 'Amy' theme palette (Teal/Emerald)
  // UPDATED: More vivid colors and higher z-index to ensure visibility
  
  return (
    <div className="absolute bottom-0 left-0 w-full h-[45vh] pointer-events-none z-[50] overflow-hidden">
      {/* Back Layer - Darker, slower, blurred */}
      <motion.div
        className="absolute bottom-[-20px] left-[-10%] w-[120%] h-full opacity-80"
        animate={{ x: [-20, 20, -20] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 1440 320" className="w-full h-full fill-emerald-900/60" preserveAspectRatio="none">
          <path d="M0,320 L0,180 C150,220 300,150 450,200 C600,250 750,150 900,190 C1050,230 1200,160 1350,210 L1440,200 L1440,320 Z" />
          <path d="M-50,320 L-50,150 C100,200 250,120 400,180 C550,240 700,140 850,200 C1000,260 1150,150 1300,220 L1490,180 L1490,320 Z" />
        </svg>
      </motion.div>

      {/* Middle Layer - Mid tone */}
      <motion.div
        className="absolute bottom-[-10px] left-[-5%] w-[110%] h-full opacity-90"
        animate={{ x: [15, -15, 15] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 1440 320" className="w-full h-full fill-emerald-700/80" preserveAspectRatio="none">
           <path d="M0,320 L0,220 C120,260 240,190 360,230 C480,270 600,200 720,240 C840,280 960,210 1080,250 C1200,290 1320,220 1440,260 L1440,320 Z" />
           {/* Detailed blades */}
           <defs>
             <linearGradient id="grassGradientMid" x1="0" x2="0" y1="0" y2="1">
               <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" /> {/* Brighter Teal */}
               <stop offset="100%" stopColor="#065f46" stopOpacity="0.9" />
             </linearGradient>
           </defs>
           <path fill="url(#grassGradientMid)" d="M0,320 L20,160 L40,320 M60,320 L90,140 L120,320 M140,320 L160,180 L180,320 M200,320 L240,150 L280,320 M300,320 L320,190 L340,320" transform="scale(4 1)" />
        </svg>
      </motion.div>

      {/* Front Layer - Sharp, lighter, faster - INCREASED HEIGHT AND VISIBILITY */}
      <motion.div
        className="absolute bottom-0 left-0 w-full h-full z-10"
        animate={{ 
          x: [-10, 10, -10],
          skewX: [-1, 1, -1] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 1440 360" className="w-full h-full" preserveAspectRatio="none" style={{ filter: 'drop-shadow(0px -5px 10px rgba(0,0,0,0.3))' }}>
          <defs>
            <linearGradient id="grassGradientFront" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" /> {/* Emerald-300 (Very Bright) */}
              <stop offset="100%" stopColor="#047857" /> {/* Emerald-700 */}
            </linearGradient>
          </defs>
          
          {/* Individual Blades - Stylized for performance but realistic shape */}
          <g fill="url(#grassGradientFront)">
             {/* Repeat pattern across the screen - MORE DENSE */}
             {[...Array(25)].map((_, i) => (
                <path 
                  key={i}
                  d={`
                    M${i * 65},360 
                    C${i * 65 + 10},250 ${i * 65 - 15},120 ${i * 65 + 20},60 
                    C${i * 65 + 35},120 ${i * 65 + 30},250 ${i * 65 + 40},360 
                    Z
                  `}
                  transform={`translate(${Math.random() * 20 - 10}, 0) scale(${0.9 + Math.random() * 0.5})`}
                />
             ))}
             {/* Filler grass */}
             {[...Array(40)].map((_, i) => (
                <path 
                  key={`filler-${i}`}
                  d={`
                    M${i * 40 + 20},360 
                    C${i * 40 + 25},280 ${i * 40 + 15},220 ${i * 40 + 30},160 
                    C${i * 40 + 40},220 ${i * 40 + 35},280 ${i * 40 + 50},360 
                    Z
                  `}
                  opacity="0.8"
                />
             ))}
          </g>
        </svg>
      </motion.div>
      
      {/* Fireflies / Particles for atmosphere */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`firefly-${i}`}
          className="absolute w-1 h-1 bg-teal-300 rounded-full blur-[1px]"
          initial={{ 
            x: Math.random() * window.innerWidth, 
            y: Math.random() * 100 + 100,
            opacity: 0 
          }}
          animate={{ 
            x: [null, Math.random() * window.innerWidth],
            y: [null, Math.random() * 100],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5
          }}
        />
      ))}
    </div>
  );
};
