import { ReactNode, useMemo } from 'react';

interface OnboardingLayoutProps {
  children: ReactNode;
}

const generateParticles = (count: number) => {
  let shadows = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const alpha = Math.random() * 0.6 + 0.1;
    shadows.push(`${x}vw ${y}vh rgba(255, 255, 255, ${alpha})`);
    shadows.push(`${x}vw ${y - 100}vh rgba(255, 255, 255, ${alpha})`);
  }
  return shadows.join(', ');
};

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  // Extremely few particles matching the AuthLayout
  const particles1 = useMemo(() => generateParticles(5), []);
  const particles2 = useMemo(() => generateParticles(2), []);
  const particles3 = useMemo(() => generateParticles(1), []);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black text-white selection:bg-indigo-500/30">
      
      {/* Exact Cosmic Void Background matching the Register Zone */}
      <div 
        className="absolute z-0 pointer-events-none"
        style={{
          top: '-10%', left: '-10%', right: '-10%', bottom: '-10%',
          background: 'radial-gradient(circle at 50% 30%, #2e1065 0%, #0f172a 40%, #000000 100%)',
          transformOrigin: 'center',
          animation: 'cosmic-fade 2s ease-out forwards, cosmic-breathe 25s ease-in-out infinite alternate'
        }}
      />

      {/* Particle System matching AuthLayout */}
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

      {/* Content Area - Transparent to let background shine */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
