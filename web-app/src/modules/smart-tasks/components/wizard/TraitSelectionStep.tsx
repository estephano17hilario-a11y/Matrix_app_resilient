import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronRight, Check } from 'lucide-react';
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="cu-step"
    >
      <div className="cu-step-body">
        <div className="cu-step-head">
          <h2 className="cu-large-title">
            <Trans i18nKey="smartTask.wizard.trait.title" components={{ span: <b /> }} />
          </h2>
          <p className="cu-lead">{t('smartTask.wizard.trait.subtitle')}</p>
        </div>

        <div className="cu-trait-grid cu-wide">
          {traits.map((trait) => {
            const Icon = trait.icon;
            const isSelected = selectedTraitId === trait.id;
            return (
              <button
                key={trait.id}
                type="button"
                onClick={() => onSelect(trait.id)}
                aria-pressed={isSelected}
                className={cn('cu-trait cu-tile', isSelected && 'cu-on')}
                style={{ ['--cu-trait' as any]: trait.color }}
              >
                <span className="cu-trait-ico">
                  {Icon && React.createElement(Icon as any, { size: 22, style: { color: trait.color } })}
                </span>
                <span className="cu-trait-name">{t(trait.label)}</span>
                {isSelected && <Check size={13} strokeWidth={3} style={{ position: 'absolute', top: 8, right: 8, color: '#fff' }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cu-step-foot">
        <button type="button" className="cu-cta" disabled={!selectedTraitId} onClick={onNext}>
          {t('common.next')} <ChevronRight size={20} strokeWidth={2.6} />
        </button>
      </div>
    </motion.div>
  );
};
