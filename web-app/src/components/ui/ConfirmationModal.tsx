import { memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

export const ConfirmationModal = memo(({
 isOpen,
 onClose,
 onConfirm,
 title,
 message,
 confirmText = 'Confirmar',
 cancelText = 'Cancelar',
 variant = 'danger'
}: ConfirmationModalProps) => {
 const variantStyles = {
 danger: {
 bg: 'bg-rose-500',
 text: 'text-rose-500',
 border: 'border-rose-500/20',
 hover: 'hover:bg-rose-600',
 glow: 'rgba(244,63,94,0.15)'
 },
 warning: {
 bg: 'bg-orange-500',
 text: 'text-orange-500',
 border: 'border-orange-500/20',
 hover: 'hover:bg-orange-600',
 glow: 'rgba(249,115,22,0.15)'
 },
 info: {
 bg: 'bg-indigo-500',
 text: 'text-indigo-500',
 border: 'border-indigo-500/20',
 hover: 'hover:bg-indigo-600',
 glow: 'rgba(99,102,241,0.15)'
 }
 }[variant];

 return createPortal(
 <AnimatePresence mode="wait">
 {isOpen && (
 <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 overflow-hidden">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.15 }}
 onClick={onClose}
 className="absolute inset-0 bg-black/80 "
 style={{ willChange: 'opacity' }}
 />
 
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 10 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 10 }}
 transition={{ type: "spring", damping: 25, stiffness: 400 }}
 className="relative z-10 w-full max-w-[340px] bg-[#0c0c0e] border border-white/10 rounded-[2rem] p-8 shadow-md overflow-hidden"
 style={{ willChange: 'transform, opacity' }}
 >
 {/* High Performance Glow - No heavy blurs */}
 <div 
 className="absolute -top-24 -left-24 w-48 h-48 rounded-full pointer-events-none opacity-20"
 style={{ background: `radial-gradient(circle, ${variantStyles.glow} 0%, transparent 70%)` }}
 />

 <div className="relative z-10 flex flex-col items-center text-center">
 <div className={`w-16 h-16 rounded-3xl ${variantStyles.bg}/10 border ${variantStyles.border} flex items-center justify-center mb-5`}>
 <AlertTriangle className={variantStyles.text} size={32} strokeWidth={2} />
 </div>

 <h3 className="text-xl font-black text-white mb-2 tracking-tight">{title}</h3>
 <p className="text-white/40 text-[13px] mb-8 leading-relaxed font-medium">
 {message}
 </p>

 <div className="flex flex-col gap-3 w-full">
 <button
 onClick={() => {
 onConfirm();
 onClose();
 }}
 className={`w-full py-4 rounded-2xl ${variantStyles.bg} text-white font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95`}
 >
 {confirmText}
 </button>
 
 {cancelText && (
 <button
 onClick={onClose}
 className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 font-black text-[10px] uppercase tracking-[0.2em] transition-colors"
 >
 {cancelText}
 </button>
 )}
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 );
});
