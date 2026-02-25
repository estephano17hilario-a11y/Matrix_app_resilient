import { ReactNode } from 'react';

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden flex flex-col items-center justify-center bg-black">
      {/* ORBITAL BACKGROUND (VisionOS Style) - Shared with AuthView */}
      <div className="fixed inset-0 -z-10 bg-[#020204] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b15] via-[#050508] to-[#020204] pointer-events-none" />
        {/* Top-Left Orb (Indigo) */}
        <div 
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" 
            style={{ willChange: 'transform, opacity' }}
        />
        
        {/* Bottom-Right Orb (Purple) */}
        <div 
            className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/25 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" 
            style={{ animationDelay: '1s', willChange: 'transform, opacity' }} 
        />

        <div 
            className="absolute top-[10%] right-[-15%] w-[520px] h-[520px] bg-cyan-500/20 rounded-full blur-[110px] animate-pulse-slow pointer-events-none" 
            style={{ animationDelay: '2s', willChange: 'transform, opacity' }} 
        />
        
        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </div>

      {/* Content Area - Centered and Transparent */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
