import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

interface ObjectiveStepProps {
  initialValue: string;
  onNext: (value: string) => void;
  activeColor: string;
}

export const ObjectiveStep: React.FC<ObjectiveStepProps> = ({ initialValue, onNext, activeColor }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full flex flex-col items-center"
    >
        <div className="space-y-2 flex-shrink-0 mb-8 text-center">
            <h2 className="text-2xl font-medium text-white tracking-tight">
                <Trans i18nKey="smartTask.wizard.objective.title" components={{ span: <span className="font-bold text-white drop-shadow-md" /> }} />
            </h2>
            <p className="text-white/50 text-sm font-medium">{t('smartTask.wizard.objective.subtitle')}</p>
        </div>
        
        <div className="w-full flex flex-col justify-center mb-8 px-4">
            <div className="relative group w-full max-w-md mx-auto">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={t('smartTask.wizard.objective.placeholder')}
                    className="relative w-full px-5 py-4 text-lg text-center text-white bg-[#0A0A0A] rounded-xl border border-white/5 focus:outline-none placeholder:text-white/20 transition-all duration-300"
                    style={{
                        boxShadow: `0 0 20px -10px ${activeColor}40`
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = activeColor;
                        e.currentTarget.style.boxShadow = `0 0 20px -5px ${activeColor}60`;
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${activeColor} 5%, #0A0A0A 95%)`;
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.boxShadow = `0 0 20px -10px ${activeColor}40`;
                        e.currentTarget.style.backgroundColor = '#0A0A0A';
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && value.trim()) {
                            e.preventDefault();
                            onNext(value);
                        }
                    }}
                />
            </div>
        </div>

        <div className="flex justify-center flex-shrink-0">
            <button
                type="button"
                disabled={!value.trim()}
                onClick={() => onNext(value)}
                className="px-8 py-3.5 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-base shadow-md shadow-white/10"
            >
                {t('common.next')} <ChevronRight size={18} />
            </button>
        </div>
    </motion.div>
  );
};
