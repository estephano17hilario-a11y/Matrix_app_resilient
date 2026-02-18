import React from 'react';
import { Particle } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticleLayerProps {
    particles: Particle[];
}

export const ParticleLayer = React.memo(({ particles }: ParticleLayerProps) => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {particles.map(p => {
                    const Icon = p.icon;
                    const tx = p.tx !== undefined ? p.tx - p.x : 0;
                    const ty = p.ty !== undefined ? p.ty - p.y : 0;
                    const isTargeted = p.tx !== undefined;
                    
                    return (
                        <motion.div 
                            key={p.id} 
                            className="absolute flex items-center justify-center will-change-transform" 
                            style={{ left: p.x, top: p.y, color: p.color }}
                            initial={{ 
                                x: 0, 
                                y: 0, 
                                scale: 0.5, 
                                opacity: 1 
                            }}
                            animate={isTargeted ? {
                                x: [0, 0, tx],
                                y: [0, -20, ty],
                                scale: [0.5, 1.5, 0.5],
                                opacity: [1, 1, 0]
                            } : {
                                x: [0, p.vx * 0.5, p.vx * 1.5],
                                y: [0, p.vy, window.innerHeight], // Fall to bottom of screen (approx)
                                scale: [0.5, 1.2, 0.8],
                                opacity: [1, 1, 0]
                            }}
                            transition={{
                                duration: isTargeted ? 0.8 : 2.5,
                                times: isTargeted ? [0, 0.2, 1] : [0, 0.15, 1],
                                ease: isTargeted ? [0.2, 0.8, 0.2, 1] : [0.25, 1, 0.5, 1]
                            }}
                        >
                            <Icon size={p.type === 'fire' ? 24 : 16} fill={p.type === 'fire' ? p.color : "currentColor"} className="drop-shadow-lg" />
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    );
});
