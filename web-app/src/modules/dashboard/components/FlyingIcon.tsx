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
             // Fallback: fly up
            setTargetPos({
                x: startRect.left + startRect.width / 2,
                y: startRect.top - 100
            });
        }
    }, 10);
    return () => clearTimeout(timer);
  }, [targetId, startRect]);

  if (!targetPos) return null;

  return (
    <motion.div
      initial={{ 
        position: 'fixed',
        left: startRect.left + startRect.width / 2 - 12,
        top: startRect.top + startRect.height / 2 - 12,
        opacity: 0,
        scale: 0.5,
        zIndex: 9999,
        pointerEvents: 'none'
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 0.4],
        left: targetPos.x, 
        top: targetPos.y,
      }}
      transition={{ 
        duration: 0.15, 
        ease: "easeInOut",
        delay: delay,
        times: [0, 0.2, 0.8, 1]
      }}
      onAnimationComplete={onComplete}
      className="flex items-center justify-center"
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
        // Delay unmount slightly to ensure animation is fully done visually
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
