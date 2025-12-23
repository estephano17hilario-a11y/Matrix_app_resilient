import { ReactNode } from 'react';

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="relative w-full h-full bg-transparent overflow-hidden flex flex-col items-center justify-center">
      {/* Content Area - Centered and Transparent */}
      <div className="relative z-10 w-full h-full flex flex-col px-6 items-center justify-center">
        {children}
      </div>
    </div>
  );
}
