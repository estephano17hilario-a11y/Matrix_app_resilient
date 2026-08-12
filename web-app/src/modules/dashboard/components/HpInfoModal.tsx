import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShieldAlert, Zap, AlertTriangle, Coins, CheckCircle2, X } from 'lucide-react';

interface HpInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentHp: number;
    maxHp: number;
}

export const HpInfoModal: React.FC<HpInfoModalProps> = ({
    isOpen,
    onClose,
    currentHp,
    maxHp = 100
}) => {
    if (!isOpen) return null;

    const hpPercentage = Math.round((currentHp / maxHp) * 100);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[#141218] border border-rose-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Background Radial Glow */}
                    <div 
                        className="absolute top-0 left-0 right-0 h-40 opacity-20 pointer-events-none" 
                        style={{ background: 'radial-gradient(circle at 50% 0%, #f43f5e 0%, transparent 70%)' }}
                    />

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                                <Heart size={22} className="fill-rose-500/40" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">Puntos de Salud (HP)</h2>
                                <p className="text-[11px] text-white/50">Tu medidor de vitalidad biológica</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-xl">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Status Bar Indicator */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 relative z-10 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-white/70">Estado de Salud Actual</span>
                            <span className="text-rose-400 font-mono text-sm">{currentHp} / {maxHp} HP ({hpPercentage}%)</span>
                        </div>
                        <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${hpPercentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                            />
                        </div>
                    </div>

                    {/* Content Scroll */}
                    <div className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-hide text-xs leading-relaxed text-white/80 relative z-10">
                        
                        {/* Section 1: How HP is Lost */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <ShieldAlert size={16} className="text-rose-400" />
                                ¿Cómo puedes perder HP (Vida)?
                            </h3>
                            <ul className="space-y-2 text-white/70 pt-1">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold">•</span>
                                    <span><strong className="text-white">Recaídas en Vicios / Malos Hábitos:</strong> Si sucumbes a un vicio registrado y no pagas la multa en Oro, perderás entre <strong className="text-rose-300">10 y 25 HP</strong> según su severidad.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold">•</span>
                                    <span><strong className="text-white">Incumplir Hábitos Diarios:</strong> Romper tus rachas o dejar incompletos tus protocolos obligatorios causa desgaste de vida.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold">•</span>
                                    <span><strong className="text-white">Misiones Críticas Vencidas:</strong> Ignorar tareas clave o dejar vencer objetivos con fecha límite penaliza tu vitalidad.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Section 2: Danger at 0 HP */}
                        <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-4 space-y-2 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                            <h3 className="font-black text-red-400 text-sm flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-400 animate-pulse" />
                                🚨 ¡PELIGRO AL LLEGAR A 0 HP! (FALLO DEL SISTEMA)
                            </h3>
                            <p className="text-white/80">
                                Si tu salud llega a 0 HP, el sistema entra en estado de <strong className="text-red-300">COLAPSO CRÍTICO / PURGA</strong>:
                            </p>
                            <div className="bg-black/40 border border-red-500/30 rounded-xl p-3 text-red-300 font-bold text-[11px] leading-normal">
                                💥 Tu Nivel de Cuenta y TODOS los Niveles de tus Rasgos (Vitalidad, Foco, Fuerza, etc.) se reducirán automáticamente a la MITAD (-50%), restaurando tu HP al 100%.
                            </div>
                        </div>

                        {/* Section 3: How to Recover HP */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Zap size={16} className="text-emerald-400" />
                                ¿Cómo recuperar HP?
                            </h3>
                            <ul className="space-y-2 text-white/70 pt-1">
                                <li className="flex items-start gap-2">
                                    <Coins size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                    <span><strong className="text-white">Tienda Lux:</strong> Compra la poción de Restauración de Vida por <strong className="text-amber-300">1,500 Monedas de Oro</strong> para recuperar <strong className="text-emerald-400">+5 HP</strong> al instante.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <span><strong className="text-white">Constancia Diaria:</strong> Mantener tus hábitos limpios sin recaídas ayuda a prevenir pérdidas de salud.</span>
                                </li>
                            </ul>
                        </div>

                    </div>

                    {/* Footer Action */}
                    <div className="pt-4 border-t border-white/10 mt-3 relative z-10">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
                        >
                            Entendido
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
