import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface LiquidProgressCircleProps {
    percentage: number;
    color: string;
    size?: number;
    isCompleted: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

export const LiquidProgressCircle: React.FC<LiquidProgressCircleProps> = ({
    percentage,
    color,
    size = 40,
    isCompleted,
    onClick
}) => {
    // Clamp percentage
    const p = Math.min(100, Math.max(0, percentage));
    
    // Determine if we should show the wave (only when partially full)
    const showWave = p > 0 && p < 100;

    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            className="relative rounded-full overflow-hidden flex items-center justify-center border transition-colors duration-300"
            style={{
                width: size,
                height: size,
                borderColor: isCompleted ? color : 'rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                boxShadow: isCompleted ? `0 0 10px ${color}40` : 'none',
            }}
        >
            {/* Liquid Fill Container - Mask */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
                <motion.div
                    className="absolute inset-0 w-full h-full origin-bottom"
                    initial={{ y: "100%" }}
                    animate={{ y: `${100 - p}%` }}
                    transition={{ type: "spring", stiffness: 60, damping: 15, mass: 1 }}
                    style={{ backgroundColor: color, willChange: 'transform' }}
                >
                    {/* Wave Animation - Optimized to Single Layer for Performance */}
                    {showWave && (
                        <motion.div 
                            className="absolute -top-[12px] left-[-50%] w-[200%] h-[24px]"
                            animate={{ x: ["0%", "-50%"] }}
                            transition={{ 
                                repeat: Infinity, 
                                ease: "linear", 
                                duration: 2 
                            }}
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='24' viewBox='0 0 200 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12C40 12 60 0 100 0C140 0 160 12 200 12V24H0V12Z' fill='${encodeURIComponent(color)}' fill-opacity='0.8'/%3E%3C/svg%3E")`,
                                backgroundSize: "50% 100%",
                                backgroundRepeat: "repeat-x",
                                willChange: 'transform'
                            }}
                        />
                    )}
                </motion.div>
            </div>

            {/* Checkmark */}
             <motion.div
                initial={false}
                animate={{
                    opacity: isCompleted ? 1 : 0,
                    scale: isCompleted ? 1 : 0.5,
                    rotate: isCompleted ? 0 : -45
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative z-10"
            >
                <Check size={size * 0.5} className="text-white drop-shadow-md" strokeWidth={3} />
            </motion.div>
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </motion.button>
    );
};
