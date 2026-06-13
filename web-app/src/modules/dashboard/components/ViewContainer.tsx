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
    const [render, setRender] = React.useState(isActive);

    React.useEffect(() => {
        if (isActive) {
            setRender(true);
        } else {
            // Delay unmount until after the 100ms fade-out ends
            const timer = setTimeout(() => setRender(false), 120);
            return () => clearTimeout(timer);
        }
    }, [isActive]);

    return (
        <div 
            id={id} 
            className={`${className} w-full`}
            style={{
                display: render ? 'block' : 'none',
                opacity: isActive ? 1 : 0,
                // Faster fade-out than fade-in for snappy feel
                transition: isActive
                    ? 'opacity 150ms ease-out'
                    : 'opacity 100ms ease-in',
                // GPU-accelerated compositing — NO transform (avoids vector distortion)
                willChange: 'opacity',
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
