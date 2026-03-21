import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useTour } from './TourGuide';

interface FloatingTourButtonProps {
  currentView?: string;
}

export const FloatingTourButton: React.FC<FloatingTourButtonProps> = ({ currentView = 'TASKS' }) => {
  const { startTour, isActive } = useTour();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isActive) return null;

  const getTourId = () => {
    const view = currentView?.toLowerCase() || 'tasks';
    if (view.includes('habit')) return 'habits';
    if (view.includes('focus')) return 'focus';
    if (view.includes('store')) return 'store';
    if (view.includes('notes')) return 'notes';
    if (view.includes('setting')) return 'onboarding';
    return 'tasks';
  };

  if (!isVisible) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.85 }}
      onClick={() => startTour(getTourId())}
      className="fixed top-4 right-4 z-[8888] w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all active:scale-85"
      title="Guía"
    >
      <Lightbulb size={10} className="text-white/40" />
    </motion.button>
  );
};
