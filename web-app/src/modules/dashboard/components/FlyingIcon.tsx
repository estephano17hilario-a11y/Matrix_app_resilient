import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion } from 'framer-motion';

interface FlyingIconProps {
  startRect: DOMRect;
  targetId: string;
  icon: React.ReactNode;
  delay?: number;
  onComplete?: () => void;
}

const FlyingIconComponent: React.FC<FlyingIconProps> = ({ startRect, targetId, icon, delay = 0, onComplete }) => {
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
            const rect = el.getBoundingClientRect();
            setTargetPos({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        } else {
             // Fallback: fly up to top center
            setTargetPos({
                x: window.innerWidth / 2,
                y: 50
            });
        }
    }, 10);
    return () => clearTimeout(timer);
  }, [targetId, startRect]);

  if (!targetPos) return null;

  const startLeft = startRect.left + startRect.width / 2 - 12;
  const startTop = startRect.top + startRect.height / 2 - 12;
  const targetLeft = targetPos.x - 12;
  const targetTop = targetPos.y - 12;
  
  // Create a beautiful upward arching path
  const peakTop = Math.min(startTop, targetTop) - 120;

  return (
    <motion.div
      initial={{ 
        position: 'fixed',
        left: startLeft,
        top: startTop,
        opacity: 0,
        scale: 0.4,
        zIndex: 9999,
        pointerEvents: 'none'
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.4, 1.3, 1.0, 0.2],
        left: [startLeft, startLeft + (targetLeft - startLeft) * 0.25, startLeft + (targetLeft - startLeft) * 0.75, targetLeft],
        top: [startTop, peakTop, targetTop - (targetTop - peakTop) * 0.15, targetTop],
      }}
      transition={{ 
        duration: 0.85, 
        ease: "easeOut",
        delay: delay,
        times: [0, 0.2, 0.8, 1]
      }}
      onAnimationComplete={onComplete}
      className="flex items-center justify-center pointer-events-none"
    >
      {icon}
    </motion.div>
  );
};

export const triggerFlyingIcon = (startRect: DOMRect, targetId: string, icon: React.ReactNode, delay = 0) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = () => {
        setTimeout(() => {
            root.unmount();
            container.remove();
        }, 100);
    };

    root.render(
        <FlyingIconComponent 
            startRect={startRect} 
            targetId={targetId} 
            icon={icon} 
            delay={delay} 
            onComplete={cleanup} 
        />
    );
};
