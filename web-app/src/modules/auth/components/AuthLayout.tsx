import { ReactNode, useMemo } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

const generateParticles = (count: number) => {
  let shadows = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    // Reduced opacity by 10% (0.1 to 0.7 range)
    const alpha = Math.random() * 0.6 + 0.1;
    // Original particle
    shadows.push(`${x}vw ${y}vh rgba(255, 255, 255, ${alpha})`);
    // Duplicate offset by -100vh for seamless infinite loop
    shadows.push(`${x}vw ${y - 100}vh rgba(255, 255, 255, ${alpha})`);
  }
  return shadows.join(', ');
};

export function AuthLayout({ children }: AuthLayoutProps) {
  // Memoize to prevent regenerating box-shadows on re-renders
  // Extremely few particles as requested ("MUCHISIMOO MENOSSSSSS")
  const particles1 = useMemo(() => generateParticles(5), []);
  const particles2 = useMemo(() => generateParticles(2), []);
  const particles3 = useMemo(() => generateParticles(1), []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black text-white selection:bg-indigo-500/30">
      
      {/* Exact Cosmic Void Background from themes.ts, now with Breathing Animation */}
      {/* Expanded to -10% inset to prevent black borders during scale down/move */}
      <div 
        className="absolute z-0 pointer-events-none"
        style={{
          top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
          background: 'radial-gradient(circle at 50% 30%, #2e1065 0%, #0f172a 40%, #000000 100%)',
          transformOrigin: 'center',
          animation: 'cosmic-fade 2s ease-out forwards, cosmic-breathe 25s ease-in-out infinite alternate'
        }}
      />

      {/* 
        Zero-Lag Particle System 
        - Uses 3 DOM nodes for particles via box-shadow
        - Uses hardware-accelerated transform: translateY
      */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ animation: 'cosmic-fade 3s ease-out forwards' }}>
         <div className="particle-layer layer-1" style={{ boxShadow: particles1 }} />
         <div className="particle-layer layer-2" style={{ boxShadow: particles2 }} />
         <div className="particle-layer layer-3" style={{ boxShadow: particles3 }} />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cosmic-fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes cosmic-breathe {
          0% { transform: scale(1) translate3d(0, 0, 0); }
          100% { transform: scale(1.15) translate3d(0, 2%, 0); }
        }

        .particle-layer {
          position: absolute;
          top: 0;
          left: 0;
          background: transparent;
          border-radius: 50%;
        }

        .layer-1 {
          width: 2px;
          height: 2px;
          animation: fall 15s linear infinite;
        }
        .layer-2 {
          width: 3px;
          height: 3px;
          animation: fall 25s linear infinite;
        }
        .layer-3 {
          width: 4px;
          height: 4px;
          animation: fall 35s linear infinite;
        }

        @keyframes fall {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
      `}} />

      {/* Scrollable Content Wrapper */}
      <div className="relative z-20 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="min-h-full w-full flex flex-col items-center justify-center px-6 py-12">
          {children}
        </div>
      </div>

    </div>
  );
}
