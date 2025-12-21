import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Attribute } from '../../../../types';
import { cn } from '../../../../utils/cn';

interface TraitSelectionStepProps {
  traits: Attribute[];
  selectedTraitId: string | null;
  onSelect: (traitId: string) => void;
  onNext: () => void;
}

export const TraitSelectionStep: React.FC<TraitSelectionStepProps> = ({ traits, selectedTraitId, onSelect, onNext }) => {
  const { t } = useTranslation();

  return (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full h-full flex flex-col"
    >
        <div className="space-y-2 mb-4 flex-shrink-0 text-center">
            <h2 className="text-2xl font-light text-white">
                <Trans i18nKey="smartTask.wizard.trait.title" components={{ span: <span className="font-bold" /> }} />
            </h2>
            <p className="text-white/40 text-sm">{t('smartTask.wizard.trait.subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 w-full max-w-4xl mx-auto">
                {traits.map((trait) => {
                    const Icon = trait.icon;
                    const isSelected = selectedTraitId === trait.id;
                    return (
                        <button
                            key={trait.id}
                            type="button"
                            onClick={() => onSelect(trait.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-300 relative overflow-hidden group aspect-square",
                                isSelected ? "bg-white/20 ring-2 ring-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100"
                            )}
                        >
                            <div 
                                className={cn("absolute inset-0 opacity-0 transition-opacity duration-300", isSelected ? "opacity-20" : "group-hover:opacity-10")}
                                style={{ backgroundColor: trait.color }}
                            />
                            
                            <div className={cn("p-2 rounded-full bg-white/5", isSelected ? "text-white" : "text-white/50")}>
                                {Icon && React.createElement(Icon as any, { size: 24, color: isSelected ? trait.color : 'currentColor' })}
                            </div>
                            <span className={cn("text-xs font-medium truncate w-full text-center", isSelected ? "text-white" : "text-white/50")}>
                                {t(trait.label)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
        
         <div className="flex justify-center pt-4 flex-shrink-0">
            <button
                type="button"
                disabled={!selectedTraitId}
                onClick={onNext}
                className="px-8 py-3 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all flex items-center gap-2"
            >
                {t('common.next')} <ChevronRight size={16} />
            </button>
        </div>
    </motion.div>
  );
};
