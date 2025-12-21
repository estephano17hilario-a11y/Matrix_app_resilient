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
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full space-y-8"
    >
        <div className="space-y-2">
            <h2 className="text-2xl font-light text-white">
                <Trans i18nKey="smartTask.wizard.objective.title" components={{ span: <span className="font-bold" /> }} />
            </h2>
            <p className="text-white/40 text-sm">{t('smartTask.wizard.objective.subtitle')}</p>
        </div>
        
        <div className="relative group w-full">
            <div 
                className="absolute -inset-1 rounded-2xl opacity-30 group-hover:opacity-60 blur transition duration-500" 
                style={{ background: `linear-gradient(to right, ${activeColor}, #4f46e5)` }}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t('smartTask.wizard.objective.placeholder')}
                className="relative w-full px-6 py-5 text-xl text-center text-white bg-black/80 rounded-2xl border border-white/10 focus:border-white/20 focus:outline-none placeholder:text-white/20 transition-all shadow-2xl"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && value.trim()) {
                        e.preventDefault();
                        onNext(value);
                    }
                }}
            />
        </div>

        <div className="flex justify-center pt-4">
            <button
                type="button"
                disabled={!value.trim()}
                onClick={() => onNext(value)}
                className="px-8 py-3 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all flex items-center gap-2"
            >
                {t('common.next')} <ChevronRight size={16} />
            </button>
        </div>
    </motion.div>
  );
};
