import React from 'react';
import { Particle } from '@/types';

interface ParticleLayerProps {
    particles: Particle[];
}

export const ParticleLayer = React.memo(({ particles }: ParticleLayerProps) => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {particles.map(p => {
                const Icon = p.icon;
                const tx = p.tx !== undefined ? p.tx - p.x : 0;
                const ty = p.ty !== undefined ? p.ty - p.y : 0;
                const isTargeted = p.tx !== undefined;
                
                return (
                    <div key={p.id} className="absolute flex items-center justify-center will-change-transform" style={{ left: p.x, top: p.y, color: p.color, animation: isTargeted ? `flyToProfile 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` : `jumpAndFall 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards` }}>
                        <Icon size={p.type === 'fire' ? 24 : 16} fill={p.type === 'fire' ? p.color : "currentColor"} className="drop-shadow-lg" />
                        <style>{`
                            @keyframes jumpAndFall { 
                                0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 1; } 
                                15% { transform: translate3d(${p.vx * 0.5}px, ${p.vy}px, 0) scale(1.2); opacity: 1; } 
                                100% { transform: translate3d(${p.vx * 1.5}px, 100vh, 0) scale(0.8); opacity: 0; } 
                            }
                            @keyframes flyToProfile {
                                0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 1; }
                                20% { transform: translate3d(0, -20px, 0) scale(1.5); opacity: 1; }
                                100% { transform: translate3d(${tx}px, ${ty}px, 0) scale(0.5); opacity: 0; }
                            }
                        `}</style>
                    </div>
                )
            })}
        </div>
    );
});
