import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ChevronLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SecurityGateProps {
    isOpen: boolean;
    onUnlock: () => void;
    onCancel: () => void;
    pin: string; // The correct PIN to match against
    title?: string;
    description?: string;
    isRecoveryAllowed?: boolean;
    onRecovery?: () => void;
}

export const SecurityGate = ({
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

    const handleInput = (num: string) => {
        if (input.length < 5) {
            const newVal = input + num;
            setInput(newVal);
            
            if (newVal.length === 5) {
                // Verify
                if (newVal === pin) {
                    setSuccess(true);
                    setTimeout(() => {
                        onUnlock();
                    }, 500);
                } else {
                    setError(true);
                    toast.error("Incorrect PIN");
                    setTimeout(() => {
                        setInput('');
                        setError(false);
                    }, 400);
                }
            }
        }
    };

    const handleDelete = () => {
        setInput(prev => prev.slice(0, -1));
        setError(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full max-w-sm mx-4"
                    >
                        {/* Card Container */}
                        <div className="relative overflow-hidden rounded-[32px] bg-[#0a0a0a] border border-white/10 shadow-2xl shadow-emerald-500/5">
                            {/* Ambient Background */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03),transparent_50%)]" />
                            </div>

                            <div className="relative z-10 p-8 flex flex-col items-center">
                                {/* Icon */}
                                <motion.div 
                                    animate={success ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border transition-all duration-500 ${
                                        success 
                                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                                            : error
                                                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                                                : 'bg-white/5 border-white/10 text-white/60'
                                    }`}
                                >
                                    {success ? <ShieldCheck size={40} /> : error ? <AlertTriangle size={40} /> : <Lock size={40} />}
                                </motion.div>

                                {/* Text */}
                                <h2 className="text-2xl font-black text-white tracking-tight mb-2 text-center">{title}</h2>
                                <p className="text-sm text-white/40 font-medium text-center mb-8 uppercase tracking-widest text-[10px]">
                                    {description}
                                </p>

                                {/* PIN Dots */}
                                <div className="flex gap-4 mb-8 h-4">
                                    {[...Array(5)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={false}
                                            animate={{
                                                scale: i < input.length ? 1.2 : 1,
                                                backgroundColor: i < input.length 
                                                    ? (success ? '#10b981' : (error ? '#ef4444' : '#fff')) 
                                                    : 'rgba(255,255,255,0.1)',
                                                borderColor: i < input.length 
                                                    ? (success ? '#10b981' : (error ? '#ef4444' : 'rgba(255,255,255,0.5)')) 
                                                    : 'rgba(255,255,255,0.1)'
                                            }}
                                            className="w-3 h-3 rounded-full border"
                                        />
                                    ))}
                                </div>

                                {/* Numpad */}
                                <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => handleInput(num.toString())}
                                            className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 active:bg-white/20 transition-all text-2xl font-bold text-white border border-white/5 shadow-sm"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button
                                        onClick={onCancel}
                                        className="h-16 rounded-2xl flex items-center justify-center text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleInput('0')}
                                        className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 active:bg-white/20 transition-all text-2xl font-bold text-white border border-white/5 shadow-sm"
                                    >
                                        0
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="h-16 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors active:scale-90"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                </div>

                                {/* Footer / Recovery */}
                                {isRecoveryAllowed && onRecovery && (
                                    <button 
                                        onClick={onRecovery}
                                        className="mt-8 text-[10px] font-bold text-white/20 hover:text-white/60 transition-colors uppercase tracking-[0.2em]"
                                    >
                                        Forgot PIN?
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
