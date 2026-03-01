import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string | null;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    if (typeof document === 'undefined') return null;

    const variantStyles = {
        danger: {
            bg: 'bg-rose-500',
            text: 'text-rose-500',
            border: 'border-rose-500/30',
            hover: 'hover:bg-rose-600',
            shadow: 'shadow-rose-500/20'
        },
        warning: {
            bg: 'bg-orange-500',
            text: 'text-orange-500',
            border: 'border-orange-500/30',
            hover: 'hover:bg-orange-600',
            shadow: 'shadow-orange-500/20'
        },
        info: {
            bg: 'bg-indigo-500',
            text: 'text-indigo-500',
            border: 'border-indigo-500/30',
            hover: 'hover:bg-indigo-600',
            shadow: 'shadow-indigo-500/20'
        }
    }[variant];

    return createPortal(
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative z-10 w-full max-w-sm bg-[#141419] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
            >
                {/* Background Glow */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 ${variantStyles.bg} opacity-20 blur-3xl rounded-full pointer-events-none`} />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-2xl ${variantStyles.bg}/10 border ${variantStyles.border} flex items-center justify-center mb-4`}>
                        <AlertTriangle className={variantStyles.text} size={32} />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-white/60 text-sm mb-6 leading-relaxed">
                        {message}
                    </p>

                    <div className={`grid ${cancelText ? 'grid-cols-2' : 'grid-cols-1'} gap-3 w-full`}>
                        {cancelText && (
                            <button
                                onClick={onClose}
                                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-3 rounded-xl ${variantStyles.bg} text-white font-bold shadow-lg ${variantStyles.shadow} ${variantStyles.hover} transition-all active:scale-95`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
