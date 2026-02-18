import React, { createContext, useContext, ReactNode } from 'react';
import { useLuxData, LuxDataHook } from '@/hooks/useLuxData';

const LuxContext = createContext<LuxDataHook | undefined>(undefined);

interface LuxProviderProps {
  children: ReactNode;
  userId: string | null;
}

export const LuxProvider: React.FC<LuxProviderProps> = ({ children, userId }) => {
  const data = useLuxData(userId);

  return (
    <LuxContext.Provider value={data}>
      {children}
    </LuxContext.Provider>
  );
};

export const useLux = () => {
  const context = useContext(LuxContext);
  if (context === undefined) {
    throw new Error('useLux must be used within a LuxProvider');
  }
  return context;
};
