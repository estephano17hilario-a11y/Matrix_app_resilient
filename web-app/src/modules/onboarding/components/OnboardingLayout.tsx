import { ReactNode } from 'react';

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden flex flex-col items-center justify-center bg-black">
      {/* ORBITAL BACKGROUND (Optimized for Mobile/GPU - 0 Delay) */}
      <div className="fixed inset-0 -z-10 bg-[#020204] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b15] via-[#050508] to-[#020204] pointer-events-none" />
        
        {/* Top-Left Orb (Indigo) - Replaced expensive blur with radial-gradient */}
        <div 
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full animate-pulse-slow pointer-events-none opacity-40" 
            style={{ 
                background: 'radial-gradient(circle, rgba(79,70,229,0.4) 0%, rgba(79,70,229,0) 70%)',
                willChange: 'opacity' 
            }}
        />
        
        {/* Bottom-Right Orb (Pink) */}
        <div 
            className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full animate-pulse-slow pointer-events-none opacity-30" 
            style={{ 
                animationDelay: '1s',
                background: 'radial-gradient(circle, rgba(219,39,119,0.4) 0%, rgba(219,39,119,0) 70%)',
                willChange: 'opacity' 
            }} 
        />

        {/* Top-Right Orb (Cyan) */}
        <div 
            className="absolute top-[10%] right-[-15%] w-[520px] h-[520px] rounded-full animate-pulse-slow pointer-events-none opacity-30" 
            style={{ 
                animationDelay: '2s',
                background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0) 70%)',
                willChange: 'opacity' 
            }} 
        />
        
      </div>

      {/* Content Area - Centered and Transparent */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
