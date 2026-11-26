import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

interface ObjectiveStepProps {
  initialValue: string;
  onNext: (value: string) => void;
  activeColor: string;
}

export const ObjectiveStep: React.FC<ObjectiveStepProps> = ({ initialValue, onNext, activeColor: _activeColor }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const ready = !!value.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="cu-step"
    >
      <div className="cu-step-body" style={{ justifyContent: 'center' }}>
        <div className="cu-step-head">
          <h2 className="cu-large-title">
            <Trans i18nKey="smartTask.wizard.objective.title" components={{ span: <b /> }} />
          </h2>
          <p className="cu-lead">{t('smartTask.wizard.objective.subtitle')}</p>
        </div>

        <div className="cu-group cu-field">
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('smartTask.wizard.objective.placeholder')}
            className="cu-input cu-big-input"
            aria-label={t('smartTask.wizard.objective.subtitle')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && ready) {
                e.preventDefault();
                onNext(value);
              }
            }}
          />
        </div>
      </div>

      <div className="cu-step-foot">
        <button type="button" className="cu-cta" disabled={!ready} onClick={() => onNext(value)}>
          {t('common.next')} <ChevronRight size={20} strokeWidth={2.6} />
        </button>
      </div>
    </motion.div>
  );
};
