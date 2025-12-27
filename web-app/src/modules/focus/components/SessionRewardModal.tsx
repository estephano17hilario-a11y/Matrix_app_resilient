import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, ArrowRight, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SessionRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        duration: number; // in seconds
        xpEarned: number;
        goldEarned: number;
        streakBonus: number;
    };
}

export const SessionRewardModal: React.FC<SessionRewardModalProps> = ({ isOpen, onClose, stats }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.8, y: 50, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.8, y: 50, opacity: 0 }}
                    className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header with Glow */}
                    <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-[#1a1a1a]" />
                        
                        <motion.div 
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                            className="relative z-10 w-20 h-20 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.5)]"
                        >
                            <Trophy size={40} className="text-yellow-400 drop-shadow-md" />
                        </motion.div>
                    </div>

                    <div className="p-8 pt-2 flex flex-col items-center text-center gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Session Complete</h2>
                            <p className="text-indigo-300 font-medium">Focus Protocol Executed</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center gap-1">
                                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Time</span>
                                <span className="text-xl font-bold text-white">{Math.floor(stats.duration / 60)}m</span>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center gap-1">
                                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Bonus</span>
                                <span className="text-xl font-bold text-yellow-400">+{stats.streakBonus}%</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 w-full justify-center py-2">
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-300 to-blue-500 drop-shadow-sm">
                                    +{stats.xpEarned}
                                </div>
                                <span className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">XP GAINED</span>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-500 drop-shadow-sm">
                                    +{stats.goldEarned}
                                </div>
                                <span className="text-[10px] font-bold text-yellow-400/60 uppercase tracking-widest">GOLD</span>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 flex items-center justify-center gap-2 group"
                        >
                            <span>Continue</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
