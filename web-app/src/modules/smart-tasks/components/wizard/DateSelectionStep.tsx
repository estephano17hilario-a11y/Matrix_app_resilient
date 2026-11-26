import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Flag } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { generateTimeBlocks, FractalStructure } from '../../../../utils/fractalTimeEngine';
import { Segmented } from '../../../../components/cupertino';

interface DateSelectionStepProps {
  onStartProcess: (startDate: Date, endDate: Date) => void;
  activeColor: string;
}

export const DateSelectionStep: React.FC<DateSelectionStepProps> = ({ onStartProcess, activeColor: _activeColor }) => {
  const { t } = useTranslation();

  const [startDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [inputType, setInputType] = useState<'date' | 'duration'>('date');
  const [duration, setDuration] = useState<{ years: number, months: number, days: number }>({ years: 0, months: 0, days: 0 });
  const [activeField, setActiveField] = useState<'years' | 'months' | 'days' | null>(null);
  const [fractalPreview, setFractalPreview] = useState<FractalStructure | null>(null);

  // Debounced fractal preview
  useEffect(() => {
    const timer = setTimeout(() => {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        setFractalPreview(end > start ? generateTimeBlocks(start, end) : null);
      } else {
        setFractalPreview(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [startDate, endDate]);

  // Duration → end date
  useEffect(() => {
    if (inputType === 'duration') {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + (duration.years || 0));
      end.setMonth(end.getMonth() + (duration.months || 0));
      end.setDate(end.getDate() + (duration.days || 0));
      setEndDate(end > start ? end.toISOString().split('T')[0] : '');
    }
  }, [duration, inputType, startDate]);

  const handleNext = () => {
    if (endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // inclusive
      onStartProcess(start, end);
    }
  };

  const durationFields: { key: 'years' | 'months' | 'days'; label: string; max?: number }[] = [
    { key: 'years', label: t('common.time.years') },
    { key: 'months', label: t('common.time.months'), max: 11 },
    { key: 'days', label: t('common.time.days') },
  ];

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
            <Trans i18nKey="smartTask.wizard.date.title" components={{ span: <b /> }} />
          </h2>
          <p className="cu-lead">{t('smartTask.wizard.date.subtitle')}</p>
        </div>

        <Segmented<'date' | 'duration'>
          tall
          value={inputType}
          onChange={setInputType}
          options={[
            { value: 'date', label: t('smartTask.wizard.date.mode.calendar') },
            { value: 'duration', label: t('smartTask.wizard.date.mode.duration') },
          ]}
        />

        {inputType === 'date' ? (
          <div className="cu-group cu-field">
            <div className="cu-row" style={{ minHeight: 58 }}>
              <span className="cu-row-tile" style={{ background: '#ff453a' }}><Calendar size={17} /></span>
              <span className="cu-row-main"><span className="cu-row-label">{t('common.endDate')}</span></span>
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="cu-input cu-right"
                style={{ flex: 'none', width: 'auto', colorScheme: 'dark' }}
                aria-label={t('common.endDate')}
              />
            </div>
          </div>
        ) : (
          <div className="cu-group">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {durationFields.map(({ key, label, max }, i) => (
                <label
                  key={key}
                  className="cu-field"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '16px 8px 14px', borderLeft: i ? '0.5px solid var(--cu-sep)' : 0 }}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={max}
                    className="cu-input cu-num"
                    style={{ textAlign: 'center', fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}
                    value={activeField === key && duration[key] === 0 ? '' : duration[key]}
                    onChange={(e) => setDuration({ ...duration, [key]: parseInt(e.target.value) || 0 })}
                    onFocus={() => setActiveField(key)}
                    onBlur={() => setActiveField(null)}
                  />
                  <span className="cu-row-sub" style={{ textTransform: 'capitalize' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {fractalPreview && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="cu-group">
            <div className="cu-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <Flag size={15} style={{ color: 'var(--cu-accent)' }} />
                <span className="cu-row-sub" style={{ flex: 1 }}>{t('strategicMap.fractalStructure')}</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {fractalPreview.drillDownPath.map(unit => t(`strategicMap.levels.${unit}`)).join('  ›  ')}
              </span>
              <div style={{ display: 'flex', gap: 4, height: 6, width: '100%' }}>
                {fractalPreview.structure.map((_, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 99, background: 'var(--cu-accent)', opacity: 0.35 + (i % 2) * 0.55 }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="cu-step-foot">
        <button type="button" className="cu-cta" disabled={!endDate} onClick={handleNext}>
          {t('smartTask.wizard.action.startJourney')}
        </button>
      </div>
    </motion.div>
  );
};
