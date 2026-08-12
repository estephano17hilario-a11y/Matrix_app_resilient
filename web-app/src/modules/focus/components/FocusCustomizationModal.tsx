import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Lock, ArrowDown, ArrowUp } from 'lucide-react';
import { ParticleConfig } from './ParticleOverlay';
import { cn } from '../../../utils/cn';

interface FocusCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ParticleConfig;
  onChangeConfig: (newConfig: ParticleConfig) => void;
  isPro?: boolean;
  onOpenPro?: () => void;
}

export const FocusCustomizationModal: React.FC<FocusCustomizationModalProps> = React.memo(({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  isPro = false,
  onOpenPro
}) => {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const handleToggleProFeature = (updater: (prev: ParticleConfig) => ParticleConfig) => {
    if (!isPro) {
      if (onOpenPro) onOpenPro();
      return;
    }
    onChangeConfig(updater(config));
  };

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="w-full max-w-md bg-[#0f0f18] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 text-white relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-none flex items-center gap-1.5">
                Personalización LUX
                <span className="text-[9px] font-extrabold bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">PRO</span>
              </h3>
              <p className="text-[10px] text-white/50 mt-0.5">Atmósfera, partículas y temporizador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors border border-white/10"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
          {/* Particle Effects Switch */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-white block">Efecto de Nieve / Partículas</span>
                <span className="text-[10px] text-white/40 font-medium">Partículas relajantes en pantalla</span>
              </div>
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, enabled: !config.enabled })}
                className={cn(
                  "w-9 h-5 rounded-full relative transition-colors border border-white/10",
                  config.enabled ? "bg-cyan-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "block w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform",
                  config.enabled ? "right-0.5" : "left-0.5"
                )} />
              </button>
            </div>

            {config.enabled && (
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <div>
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">Dirección de Caída (LUX 👑)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ ...config, direction: 'FALLING' })}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                        config.direction === 'FALLING' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-white/60 border-white/5"
                      )}
                    >
                      <ArrowDown size={14} />
                      <span>Cayendo ❄️</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleProFeature(prev => ({ ...prev, direction: 'RISING' }))}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative",
                        config.direction === 'RISING' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-white/60 border-white/5"
                      )}
                    >
                      <ArrowUp size={14} />
                      <span>Subiendo ✨</span>
                      {!isPro && <Lock size={10} className="text-amber-400 absolute top-1 right-1" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">Cuándo Activar (LUX 👑)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'BREAK_ONLY', label: 'Solo Descanso' },
                      { id: 'FOCUS_ONLY', label: 'Solo Enfoque' },
                      { id: 'ALWAYS', label: 'Siempre' }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.id !== 'BREAK_ONLY' && !isPro) {
                            if (onOpenPro) onOpenPro();
                            return;
                          }
                          onChangeConfig({ ...config, trigger: item.id as any });
                        }}
                        className={cn(
                          "py-2 px-1.5 rounded-xl border text-[10px] font-extrabold transition-all text-center relative",
                          config.trigger === item.id ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-white/60 border-white/5"
                        )}
                      >
                        <span>{item.label}</span>
                        {item.id !== 'BREAK_ONLY' && !isPro && <Lock size={9} className="text-amber-400 absolute top-0.5 right-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timer Ring Fill Mode (LUX 👑) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  Comportamiento del Anillo
                  {!isPro && <Lock size={11} className="text-amber-400" />}
                </span>
                <span className="text-[10px] text-white/40 font-medium block">Forma en que se mueve la barra circular</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, ringMode: 'DRAIN' })}
                className={cn(
                  "py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                  config.ringMode === 'DRAIN' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-white/60 border-white/5"
                )}
              >
                <span>Vaciarse (100% ➔ 0%)</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleProFeature(prev => ({ ...prev, ringMode: 'FILL' }))}
                className={cn(
                  "py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative",
                  config.ringMode === 'FILL' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-white/5 text-white/60 border-white/5"
                )}
              >
                <span>Llenarse (0% ➔ 100%)</span>
                {!isPro && <Lock size={10} className="text-amber-400 absolute top-1 right-1" />}
              </button>
            </div>
          </div>

          {/* Inner Circle Pulse Aura (LUX 👑) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                Aura Pulsante Interior
                {!isPro && <Lock size={11} className="text-amber-400" />}
              </span>
              <span className="text-[10px] text-white/40 font-medium block">Resplandor fluorescente al iniciar</span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleProFeature(prev => ({ ...prev, auraEnabled: !prev.auraEnabled }))}
              className={cn(
                "w-9 h-5 rounded-full relative transition-colors border border-white/10",
                config.auraEnabled ? "bg-cyan-500" : "bg-white/10"
              )}
            >
              <span className={cn(
                "block w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform",
                config.auraEnabled ? "right-0.5" : "left-0.5"
              )} />
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-black text-xs font-extrabold hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            Guardar y Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
});
