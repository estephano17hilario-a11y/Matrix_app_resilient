import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-[#0a0a10] via-[#050508] to-[#000000] text-white selection:bg-indigo-500/30">
      
      {/* Scrollable Content Wrapper */}
      <div className="relative z-20 w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="min-h-full w-full flex flex-col items-center justify-center px-6 py-12">
          {children}
        </div>
      </div>

    </div>
  );
}
