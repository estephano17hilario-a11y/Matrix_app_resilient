import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { addDays, format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateFractalTree, getStructureDescription, getTotalDurationLabel, FractalBlock } from '../../../utils/timeFractalEngine';
import { cn } from '../../../utils/cn';

interface TimeScopeSelectorProps {
  onSelectionChange: (endDate: Date, structure: FractalBlock[]) => void;
  initialDate?: Date;
}

export const TimeScopeSelector: React.FC<TimeScopeSelectorProps> = ({ onSelectionChange, initialDate }) => {
  // Constants
  const MIN_DAYS = 7;
  const MAX_DAYS = 3650; // 10 years
  
  // State
  const [daysToAdd, setDaysToAdd] = useState<number>(30); // Default 1 month
  const [structureDescription, setStructureDescription] = useState<string>('');
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Ref for slider width
  const constraintsRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Motion values
  const x = useMotionValue(0);
  
  // Map x position (0 to width) to days (MIN to MAX) non-linearly
  const handleDrag = () => {
    if (!sliderRef.current || !constraintsRef.current) return;
    
    const sliderWidth = sliderRef.current.offsetWidth;
    const thumbWidth = 48; // Width of the drag handle
    const effectiveWidth = sliderWidth - thumbWidth;
    
    const currentX = x.get();
    // Normalize 0 to 1
    let progress = currentX / effectiveWidth;
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    
    // Quadratic scale for better precision at lower values
    // days = min + (max - min) * progress^2
    const calculatedDays = Math.round(MIN_DAYS + (MAX_DAYS - MIN_DAYS) * Math.pow(progress, 2));
    
    setDaysToAdd(calculatedDays);
  };

  useEffect(() => {
    const today = new Date();
    const target = addDays(today, daysToAdd);
    setEndDate(target);
    
    const tree = generateFractalTree(today, target);
    setStructureDescription(getStructureDescription(tree));
    onSelectionChange(target, tree);
  }, [daysToAdd]);

  const totalLabel = getTotalDurationLabel(new Date(), endDate);

  return (
    <div className="w-full flex flex-col items-center space-y-8 py-8">
      {/* Feedback Text */}
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold text-white tracking-tight">
          {totalLabel}
        </h2>
        <p className="text-lg text-cyan-300/80 font-medium">
          {format(endDate, "d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Structure Preview */}
      <div className="bg-black/30 border border-white/10 rounded-xl p-4 w-full max-w-lg backdrop-blur-md">
        <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider text-center">Estructura Fractal Resultante</p>
        <p className="text-center text-emerald-300 font-mono text-sm break-words">
          {structureDescription || "Calculando..."}
        </p>
      </div>

      {/* The Liquid Slider */}
      <div className="w-full max-w-xl px-4 relative">
        <div 
          ref={sliderRef}
          className="h-16 bg-white/5 rounded-full border border-white/10 relative overflow-hidden backdrop-blur-sm"
        >
          {/* Ruler Markings Background */}
          <div className="absolute inset-0 flex items-center justify-between px-6 opacity-20 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-0.5 bg-white rounded-full",
                  i % 5 === 0 ? "h-8" : "h-4"
                )} 
              />
            ))}
          </div>

          {/* Progress Fill */}
          <motion.div 
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20"
            style={{ width: x }}
          />

          {/* Draggable Thumb */}
          <motion.div
            drag="x"
            dragConstraints={sliderRef}
            dragElastic={0}
            dragMomentum={false}
            style={{ x }}
            onDrag={handleDrag}
            className="absolute top-1 bottom-1 w-12 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition-transform z-10"
          >
            <div className="w-1 h-6 bg-black/20 rounded-full mx-0.5" />
            <div className="w-1 h-6 bg-black/20 rounded-full mx-0.5" />
          </motion.div>
        </div>
        
        <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono px-2">
          <span>1 Semana</span>
          <span>1 Año</span>
          <span>5 Años</span>
          <span>10 Años</span>
        </div>
      </div>
      
      <p className="text-xs text-gray-600 italic">
        Arrastra para ajustar tu Horizonte Temporal
      </p>
    </div>
  );
};
