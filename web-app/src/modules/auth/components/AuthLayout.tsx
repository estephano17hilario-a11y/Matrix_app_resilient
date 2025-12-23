import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-transparent text-white selection:bg-indigo-500/30">
      
      {/* 1. Cinematic Grain / Noise Texture (Subtle) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
           }}
      />

      {/* 2. Scrollable Content Wrapper */}
      <div className="relative z-20 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="min-h-full w-full flex flex-col items-center justify-center px-6 py-12">
          {children}
        </div>
      </div>

    </div>
  );
}
