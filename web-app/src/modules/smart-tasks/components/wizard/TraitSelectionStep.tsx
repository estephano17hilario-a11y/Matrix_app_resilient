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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full flex flex-col items-center"
    >
        <div className="space-y-2 mb-8 flex-shrink-0 text-center">
            <h2 className="text-2xl font-medium text-white tracking-tight">
                <Trans i18nKey="smartTask.wizard.trait.title" components={{ span: <span className="font-bold text-white drop-shadow-md" /> }} />
            </h2>
            <p className="text-white/50 text-sm font-medium">{t('smartTask.wizard.trait.subtitle')}</p>
        </div>

        <div className="w-full max-w-xl mb-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 w-full mx-auto">
                {traits.map((trait) => {
                    const Icon = trait.icon;
                    const isSelected = selectedTraitId === trait.id;
                    return (
                        <button
                            key={trait.id}
                            type="button"
                            onClick={() => onSelect(trait.id)}
                            className={cn(
                                "flex flex-col items-center justify-start pt-4 pb-3 px-2 gap-2 rounded-2xl transition-all duration-300 relative overflow-hidden group min-h-[100px]",
                                isSelected ? "bg-[#1a1a1a] ring-1 ring-white/20 scale-[1.02]" : "bg-[#0f0f0f] border border-white/5 hover:bg-[#1a1a1a] opacity-90 hover:opacity-100"
                            )}
                            style={{
                                boxShadow: isSelected ? `0 0 20px -5px ${trait.color}60` : 'none'
                            }}
                        >
                            <div 
                                className={cn("absolute inset-0 opacity-0 transition-opacity duration-300", isSelected ? "opacity-10" : "group-hover:opacity-5")}
                                style={{ backgroundColor: trait.color }}
                            />
                            
                            <div className={cn("p-2 rounded-full bg-black/60 flex-shrink-0 shadow-md", isSelected ? "text-white scale-110" : "text-white/50")}>
                                {Icon && React.createElement(Icon as any, { size: 24, color: isSelected ? trait.color : 'currentColor' })}
                            </div>
                            <span className={cn("text-[11px] font-semibold w-full text-center leading-tight line-clamp-2 text-wrap", isSelected ? "text-white" : "text-white/50")}>
                                {t(trait.label)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
        
         <div className="flex justify-center flex-shrink-0">
            <button
                type="button"
                disabled={!selectedTraitId}
                onClick={onNext}
                className="px-8 py-3.5 rounded-full bg-white text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-base shadow-md shadow-white/10"
            >
                {t('common.next')} <ChevronRight size={18} />
            </button>
        </div>
    </motion.div>
  );
};
