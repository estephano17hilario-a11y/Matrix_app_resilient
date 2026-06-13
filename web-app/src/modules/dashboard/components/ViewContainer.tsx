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
            // Delay unmount until after the 75ms fade-out ends
            const timer = setTimeout(() => setRender(false), 90);
            return () => clearTimeout(timer);
        }
    }, [isActive]);

    return (
        <div 
            id={id} 
            className={`${className} w-full transition-opacity duration-75 ease-in-out ${
                isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
    // Only re-render if isActive changes
    if (prev.isActive !== next.isActive) return false;
    // If inactive, skip re-renders entirely
    if (!next.isActive) return true;
    // If active, allow re-renders
    return false;
});
