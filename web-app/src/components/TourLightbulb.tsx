import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useTour } from './TourGuide';

interface TourLightbulbProps {
  tourId: string;
  className?: string;
  size?: number;
}

export const TourLightbulb: React.FC<TourLightbulbProps> = ({ 
  tourId, 
  className = '',
  size = 14 
}) => {
  const { startTour, isActive } = useTour();

  if (isActive) return null;

  return (
    <button
      onClick={() => startTour(tourId)}
      className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-yellow-400/60 hover:text-yellow-300 transition-colors ${className}`}
      title="Tips"
    >
      <Lightbulb size={size} />
    </button>
  );
};