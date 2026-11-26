import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BigStepper, Chip, Segmented } from '../../../components/cupertino';

interface DurationPickerProps {
    value: number; // in minutes
    onChange: (minutes: number) => void;
}

type Mode = 'MINUTES' | 'HOURS';

/** Estimated-duration control (Cupertino grouped card). Must live inside a `.cu-root` surface. */
export const DurationPicker: React.FC<DurationPickerProps> = ({ value, onChange }) => {
    const { t } = useTranslation();
    // Multiples of 60 default to HOURS, everything else to MINUTES
    const [mode, setMode] = useState<Mode>(() => (value > 0 && value % 60 === 0 ? 'HOURS' : 'MINUTES'));
    const [displayValue, setDisplayValue] = useState(mode === 'HOURS' ? value / 60 : value);

    // Keep the display in sync when the value changes externally (e.g. form reset)
    useEffect(() => {
        setDisplayValue(mode === 'HOURS' ? Number((value / 60).toFixed(1)) : value);
    }, [value, mode]);

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setDisplayValue(newMode === 'HOURS' ? Math.round((value / 60) * 2) / 2 : value);
    };

    const step = mode === 'HOURS' ? 0.5 : 5;
    const toMinutes = (v: number) => (mode === 'HOURS' ? v * 60 : v);
    const presets = mode === 'MINUTES' ? [15, 30, 45, 60] : [1, 2, 4, 8];

    return (
        <div className="cu-group">
            <div className="cu-row">
                <span className="cu-row-tile" style={{ background: '#5e5ce6' }}><Clock size={17} /></span>
                <span className="cu-row-main"><span className="cu-row-label">{t('cu.duration', 'Duración')}</span></span>
                <div style={{ width: 118, flex: 'none' }}>
                    <Segmented<Mode>
                        options={[{ value: 'MINUTES', label: 'MIN' }, { value: 'HOURS', label: 'HRS' }]}
                        value={mode}
                        onChange={handleModeChange}
                    />
                </div>
            </div>
            <BigStepper
                value={displayValue}
                unit={mode === 'MINUTES' ? 'min' : 'h'}
                minusDisabled={displayValue <= 0}
                onMinus={() => onChange(toMinutes(Math.max(0, displayValue - step)))}
                onPlus={() => onChange(toMinutes(displayValue + step))}
            />
            <div className="cu-pad-sm">
                <div className="cu-chips" style={{ justifyContent: 'center' }}>
                    {presets.map((p) => (
                        <Chip key={p} on={displayValue === p} onClick={() => onChange(toMinutes(p))}>
                            {p}{mode === 'MINUTES' ? ' min' : ' h'}
                        </Chip>
                    ))}
                </div>
            </div>
        </div>
    );
};
