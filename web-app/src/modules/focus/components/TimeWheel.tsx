'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface TimeWheelProps {
    value: number;
    onChange: (value: number) => void;
    items: number[];
    height?: number; // Total height of the wheel container
    itemHeight?: number; // Height of each item
    perspective?: number; // 3D perspective depth
    className?: string;
    loop?: boolean;
}

const WheelItem = ({ 
    item, 
    index, 
    scrollY, 
    itemHeight, 
    isSelected 
}: { 
    item: number; 
    index: number; 
    scrollY: MotionValue<number>; 
    itemHeight: number; 
    isSelected: boolean;
}) => {
    // Calculate distance from center based on scroll position
    const y = useTransform(scrollY, value => {
        return (index * itemHeight) - value;
    });

    // 3D transform for "Size Gradient" effect
    // We want to show 2 items clearly before/after
    // Range is extended to +/- 3 * itemHeight to ensure smooth fade out at edges
    const rotateX = useTransform(
        y, 
        [-itemHeight * 3, -itemHeight * 2, -itemHeight, 0, itemHeight, itemHeight * 2, itemHeight * 3], 
        [50, 40, 20, 0, -20, -40, -50]
    );
    
    // Adjusted opacity: Neighbor 2 increased by +20% (0.3 -> 0.5)
    // Neighbor 1 remains 0.7
    const opacity = useTransform(
        y, 
        [-itemHeight * 3, -itemHeight * 2, -itemHeight, 0, itemHeight, itemHeight * 2, itemHeight * 3], 
        [0, 0.5, 0.7, 1, 0.7, 0.5, 0]
    );
    
    // Adjusted scale to be more gradual
    const scale = useTransform(
        y, 
        [-itemHeight * 3, -itemHeight * 2, -itemHeight, 0, itemHeight, itemHeight * 2, itemHeight * 3], 
        [0.6, 0.75, 0.9, 1.25, 0.9, 0.75, 0.6]
    );
    
    const color = useTransform(
        y, 
        [-itemHeight * 2, -itemHeight, 0, itemHeight, itemHeight * 2], 
        ["#48484A", "#8E8E93", "#FFFFFF", "#8E8E93", "#48484A"]
    );
    
    return (
        <motion.div 
            style={{ 
                height: itemHeight,
                rotateX,
                opacity,
                scale,
                color,
                transformPerspective: 1000,
                transformOrigin: "center center"
            }}
            className={cn(
                "flex items-center justify-center w-full cursor-pointer select-none"
            )}
        >
            <span className={cn(
                "font-sans tracking-tight leading-none transition-all duration-150",
                isSelected ? "font-semibold" : "font-medium"
            )} style={{ fontSize: '24px' }}>
                {item}
            </span>
        </motion.div>
    );
};

export const TimeWheel = ({ 
    value, 
    onChange, 
    items, 
    height = 200, 
    itemHeight = 50, 
    className 
}: TimeWheelProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll({ container: containerRef });
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<NodeJS.Timeout>();

    // Initial scroll position
    useEffect(() => {
        if (containerRef.current) {
            const index = items.indexOf(value);
            if (index !== -1) {
                containerRef.current.scrollTop = index * itemHeight;
            }
        }
    }, []); 

    // Sync scroll when value changes externally
    useEffect(() => {
        if (containerRef.current && !isScrolling) {
            const index = items.indexOf(value);
            if (index !== -1) {
                const targetScroll = index * itemHeight;
                if (Math.abs(containerRef.current.scrollTop - targetScroll) > 1) {
                     containerRef.current.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [value, items, isScrolling, itemHeight]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        
        setIsScrolling(true);
        clearTimeout(scrollTimeout.current);

        const scrollTop = containerRef.current.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
        
        // Only update if value changed and we are scrolling (to avoid loops)
        // But we want live updates during scroll for the UI effect
        if (items[clampedIndex] !== value) {
            onChange(items[clampedIndex]);
        }

        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
            if (containerRef.current) {
                containerRef.current.scrollTo({
                    top: clampedIndex * itemHeight,
                    behavior: 'smooth'
                });
            }
        }, 150);
    };

    return (
        <div 
            style={{ height }}
            className={cn("relative overflow-hidden", className)}
        >
            <div 
                ref={containerRef}
                className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar"
                onScroll={handleScroll}
                style={{ 
                    paddingTop: height / 2 - itemHeight / 2,
                    paddingBottom: height / 2 - itemHeight / 2,
                    scrollBehavior: 'smooth'
                }}
            >
                {items.map((item, index) => (
                    <div key={item} className="snap-center">
                        <WheelItem 
                            item={item} 
                            index={index} 
                            scrollY={scrollY} 
                            itemHeight={itemHeight} 
                            isSelected={value === item}
                        />
                    </div>
                ))}
            </div>
            
            {/* Click zones for easy adjustment */}
            <div 
                className="absolute top-0 left-0 right-0 h-1/3 z-10 cursor-pointer"
                onClick={() => {
                    const idx = items.indexOf(value);
                    if (idx > 0) onChange(items[idx - 1]);
                }}
            />
            <div 
                className="absolute bottom-0 left-0 right-0 h-1/3 z-10 cursor-pointer"
                onClick={() => {
                    const idx = items.indexOf(value);
                    if (idx < items.length - 1) onChange(items[idx + 1]);
                }}
            />
        </div>
    );
};
