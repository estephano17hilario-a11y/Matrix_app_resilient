import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { hashPin } from '../../utils/crypto';

interface SecurityGateProps {
    isOpen: boolean;
    onUnlock: () => void;
    onCancel: () => void;
    pin: string; // This can be either a plain text PIN or a SHA-256 hash
    title?: string;
    description?: string;
    isRecoveryAllowed?: boolean;
    onRecovery?: () => void;
}

export const SecurityGate = memo(({
    isOpen,
    onUnlock,
    onCancel,
    pin,
    title = "Security Check",
    description = "Enter your PIN to access",
    isRecoveryAllowed = false,
    onRecovery
}: SecurityGateProps) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setInput('');
            setError(false);
            setSuccess(false);
        }
    }, [isOpen]);

    const handleInput = useCallback(async (num: string) => {
        if (success || input.length >= 5) return;
        
        const newVal = input + num;
        setInput(newVal);
        
        if (newVal.length === 5) {
            // Check if passed PIN is a hash (64 chars for SHA-256) or plain text
            const isHash = pin.length === 64;
            const isValid = isHash ? (await hashPin(newVal)) === pin : newVal === pin;

            if (isValid) {
                setSuccess(true);
                // Speed up unlock transition for "light speed" feel
                setTimeout(onUnlock, 300);
            } else {
                setError(true);
                toast.error("Incorrect PIN", {
                    duration: 1500,
                    style: {
                        background: '#111',
                        color: '#ff4444', 
                        border: '1px solid rgba(255,68,68,0.2)',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '12px'
                    }
                });
                
                if ('vibrate' in navigator) navigator.vibrate(50);
                
                setTimeout(() => {
                    setInput('');
                    setError(false);
                }, 500);
            }
        }
    }, [input, pin, success, onUnlock]);

    const handleDelete = useCallback(() => {
        if (success) return;
        setInput(prev => prev.slice(0, -1));
        setError(false);
    }, [success]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "linear" }}
                    className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black overflow-hidden"
                    style={{ willChange: 'opacity' }}
                >
                    {/* Ultra-efficient Background - No heavy blurs or complex patterns */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03)_0%,transparent_80%)]" />
                    </div>

                    {/* Top Controls */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={onCancel}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors active:scale-90"
                            style={{ willChange: 'transform, opacity' }}
                        >
                            <X size={20} />
                        </motion.button>
                        
                        <div className="flex gap-1.5 items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Secure</span>
                        </div>
                    </div>

                    <div className="relative z-10 w-full max-w-md px-8 py-10 flex flex-col items-center justify-center min-h-screen">
                        {/* Status Icon - GPU Accelerated */}
                        <motion.div 
                            animate={success ? { 
                                scale: [1, 1.05, 1],
                                transition: { duration: 0.1 }
                            } : error ? {
                                x: [-8, 8, -8, 8, 0],
                                transition: { duration: 0.2 }
                            } : {}}
                            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mb-8 transition-all duration-300 border shadow-md ${
                                success 
                                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.4)]' 
                                    : error
                                        ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
                                        : 'bg-white/5 border-white/10 text-white/80'
                            }`}
                            style={{ willChange: 'transform' }}
                        >
                            {success ? <ShieldCheck size={48} strokeWidth={2.5} /> : error ? <AlertTriangle size={48} /> : <Lock size={48} strokeWidth={1.2} />}
                        </motion.div>

                        {/* Text Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-center mb-8"
                            style={{ willChange: 'transform, opacity' }}
                        >
                            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-2">
                                {success ? "Verified" : title}
                            </h2>
                            <p className="text-[10px] sm:text-[11px] text-white/20 font-black uppercase tracking-[0.5em] max-w-[280px] mx-auto leading-relaxed">
                                {error ? "Invalid Entry" : description}
                            </p>
                        </motion.div>

                        {/* PIN Indicator - Simple and fast */}
                        <div className="flex gap-4 sm:gap-5 mb-12 h-4">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 transition-all duration-200 ${
                                        i < input.length 
                                            ? (success ? 'bg-white border-white' : (error ? 'bg-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]')) 
                                            : 'bg-transparent border-white/10'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Numpad - Grid optimized */}
                        <div className="grid grid-cols-3 gap-x-8 gap-y-6 sm:gap-x-10 sm:gap-y-8 w-full max-w-[320px]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handleInput(num.toString())}
                                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-white/5 bg-white/[0.02] text-2xl sm:text-3xl font-light text-white flex items-center justify-center hover:bg-white/10 hover:border-white/10 transition-all duration-75 active:scale-90 active:bg-white/20 mx-auto"
                                >
                                    {num}
                                </button>
                            ))}
                            <div className="flex items-center justify-center" />
                            <button
                                onClick={() => handleInput('0')}
                                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-white/5 bg-white/[0.02] text-2xl sm:text-3xl font-light text-white flex items-center justify-center hover:bg-white/10 hover:border-white/10 transition-all duration-75 active:scale-90 active:bg-white/20 mx-auto"
                            >
                                0
                            </button>
                            <button
                                onClick={handleDelete}
                                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center text-white/20 hover:text-white transition-all active:scale-90 mx-auto"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Forgot Password Link */}
                        {isRecoveryAllowed && onRecovery && (
                            <motion.button 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                onClick={onRecovery}
                                className="mt-12 px-6 py-3 rounded-full bg-white/5 border border-white/5 text-[10px] font-black text-white/30 hover:text-white/80 hover:bg-white/10 transition-all uppercase tracking-[0.3em] active:scale-95"
                            >
                                Forgot PIN?
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
});
