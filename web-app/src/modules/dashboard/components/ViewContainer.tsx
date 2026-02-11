import React from 'react';
import { motion } from 'framer-motion';

interface ViewContainerProps {
    isActive: boolean;
    children: React.ReactNode;
    className?: string;
    id?: string;
}

export const ViewContainer = React.memo(({ isActive, children, className = "", id }: ViewContainerProps) => {
    return (
        <div 
            id={id} 
            className={`${className} w-full h-full`}
            style={{ 
                display: isActive ? 'block' : 'none',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    // Only re-render if isActive changes or if it IS active and children props might have changed.
    // Ideally, we rely on React.memo's default shallow compare, but since 'children' is a new object every render,
    // we need to be careful.
    
    // If transitioning from inactive to active, MUST re-render.
    if (prev.isActive !== next.isActive) return false;
    
    // If inactive, NO NEED to re-render even if children changed (it's hidden).
    if (!next.isActive) return true;
    
    // If active, use default shallow compare (return false to re-render)
    return false;
});
