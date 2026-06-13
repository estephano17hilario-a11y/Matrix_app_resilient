import React from 'react';

interface ViewContainerProps {
    isActive: boolean;
    children: React.ReactNode;
    className?: string;
    id?: string;
    variant?: 'default' | 'minimal';
}

export const ViewContainer = React.memo(({ isActive, children, className = "", id, variant = 'default' }: ViewContainerProps) => {
    const [render, setRender] = React.useState(isActive);

    React.useEffect(() => {
        if (isActive) {
            setRender(true);
        } else {
            // Delay setting display: none until opacity transition ends (120ms is perfect for a fast 100ms fade)
            const timer = setTimeout(() => setRender(false), 120);
            return () => clearTimeout(timer);
        }
    }, [isActive]);

    return (
        <div 
            id={id} 
            className={`${className} w-full transition-all duration-100 ease-in-out ${
                isActive ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
            style={{
                display: render ? 'block' : 'none',
                willChange: "opacity",
                zIndex: variant === 'minimal' ? 20 : 10
            }}
        >
            {children}
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    // Only re-render if isActive changes or if it IS active and children props might have changed.
    
    // If transitioning between active/inactive states, MUST re-render.
    if (prev.isActive !== next.isActive) return false;
    
    // If inactive, no need to re-render even if children changed (it's hidden).
    if (!next.isActive) return true;
    
    // If active, use default shallow compare (return false to re-render)
    return false;
});
