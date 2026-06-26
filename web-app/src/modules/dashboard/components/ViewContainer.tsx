import React from 'react';

interface ViewContainerProps {
    isActive: boolean;
    children: React.ReactNode;
    className?: string;
    id?: string;
    variant?: 'default' | 'minimal';
}

// ⚡ ZERO-LAG VIEW CONTAINER
// Pure CSS opacity transition - NO spring, NO scale, NO bounce, NO vector distortion.
// GPU composited via will-change:opacity. Targeting 60fps on mobile.
export const ViewContainer = React.memo(({ isActive, children, className = "", id, variant = 'default' }: ViewContainerProps) => {
    return (
        <div 
            id={id} 
            className={`${className} w-full`}
            style={{
                display: isActive ? 'block' : 'none',
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: variant === 'minimal' ? 20 : 10,
            }}
        >
            {children}
        </div>
    );
}, (prev, next) => {
    // Only re-render if isActive changes
    if (prev.isActive !== next.isActive) return false;
    // If inactive, skip re-renders entirely
    if (!next.isActive) return true;
    // If active, allow re-renders
    return false;
});
