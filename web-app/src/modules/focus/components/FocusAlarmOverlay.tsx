import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Project } from '../../../types';

interface FocusAlarmOverlayProps {
    isOpen: boolean;
    onDismiss: () => void;
    project: Project;
    duration: number; // in seconds
    mode: 'POMO' | 'STOPWATCH';
}

export const FocusAlarmOverlay: React.FC<FocusAlarmOverlayProps> = ({
    isOpen,
    onDismiss,
    project,
    duration,
    mode
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/95"
                    style={{ willChange: 'opacity' }}
                >
                    {/* Background Ambient Glow (Optimized: No heavy blur, static opacity) */}
                    <div 
                        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${project.color || '#4f46e5'} 0%, transparent 60%)`
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.95, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative z-10 w-full max-w-sm bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-md flex flex-col items-center text-center overflow-hidden"
                        style={{ willChange: 'transform, opacity' }}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />

                        {/* App Logo & Project Icon */}
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg relative bg-black"
                            style={{ border: `2px solid ${project.color || '#fff'}` }}
                        >
                            <span className="text-4xl" role="img" aria-label="project icon">
                                🚀
                            </span>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                            {mode === 'POMO' ? 'Focus Complete!' : 'Session Ended'}
                        </h2>
                        <p className="text-white/60 font-medium mb-8 text-lg">
                            Time spent on <strong style={{ color: project.color }}>{project.title}</strong>: {Math.floor(duration / 60)} minutes.
                        </p>

                        <div className="w-full space-y-3">
                            <button
                                onClick={onDismiss}
                                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-xl shadow-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Zap size={24} className="fill-current" />
                                Claim Victory
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
