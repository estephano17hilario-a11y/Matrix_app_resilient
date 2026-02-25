import React from 'react';
import { motion, Variants } from 'framer-motion';

interface ViewContainerProps {
    isActive: boolean;
    children: React.ReactNode;
    className?: string;
    id?: string;
    variant?: 'default' | 'minimal';
}

export const ViewContainer = React.memo(({ isActive, children, className = "", id, variant = 'default' }: ViewContainerProps) => {
    
    const variants: Record<string, Variants> = {
        default: {
            active: { 
                display: "block",
                opacity: 1, 
                scale: 1, 
                filter: "blur(0px)",
                y: 0,
                zIndex: 10,
                transition: { 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30, 
                    mass: 0.8
                }
            },
            inactive: { 
                opacity: 0, 
                scale: 0.95, 
                filter: "blur(12px)",
                y: 20,
                zIndex: 0,
                transition: { 
                    duration: 0.3,
                    ease: [0.32, 0.72, 0, 1]
                },
                transitionEnd: {
                    display: "none"
                }
            }
        },
        minimal: {
            active: { 
                display: "block",
                opacity: 1, 
                scale: 1, 
                filter: "blur(0px)",
                y: 0,
                zIndex: 20, // Higher priority
                transition: { 
                    duration: 0.15,
                    ease: "circOut"
                }
            },
            inactive: { 
                opacity: 0, 
                scale: 1, 
                filter: "blur(0px)",
                y: 0,
                zIndex: 0,
                transition: { 
                    duration: 0.1,
                    ease: "circIn"
                },
                transitionEnd: {
                    display: "none"
                }
            }
        }
    };

    return (
        <motion.div 
            id={id} 
            className={`${className} w-full h-full absolute inset-0`}
            initial={false}
            animate={isActive ? "active" : "inactive"}
            variants={variants[variant as keyof typeof variants]}
            style={{
                willChange: "transform, opacity, filter"
            }}
        >
            {children}
        </motion.div>
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
