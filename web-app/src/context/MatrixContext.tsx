import React, { createContext, useContext, ReactNode } from 'react';
import { useMatrixData, MatrixDataHook } from '@/hooks/useMatrixData';

const MatrixContext = createContext<MatrixDataHook | undefined>(undefined);

interface MatrixProviderProps {
  children: ReactNode;
  userId: string | null;
}

export const MatrixProvider: React.FC<MatrixProviderProps> = ({ children, userId }) => {
  const data = useMatrixData(userId);

  return (
    <MatrixContext.Provider value={data}>
      {children}
    </MatrixContext.Provider>
  );
};

export const useMatrix = () => {
  const context = useContext(MatrixContext);
  if (context === undefined) {
    throw new Error('useMatrix must be used within a MatrixProvider');
  }
  return context;
};
