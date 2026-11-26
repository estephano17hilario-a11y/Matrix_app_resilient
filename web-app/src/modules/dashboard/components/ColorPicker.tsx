import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Expand, Row } from '../../../components/cupertino';

interface ColorPickerProps {
    selectedColor: string | undefined;
    onSelectColor: (color: string | undefined) => void;
    onToggle?: (isOpen: boolean) => void;
}

const COLOR_PALETTE = {
    'Rojos': ['#ef4444', '#f87171', '#dc2626', '#b91c1c', '#991b1b'],
    'Rosas': ['#ec4899', '#f472b6', '#db2777', '#be185d', '#831843'],
    'Naranjas': ['#f97316', '#fb923c', '#ea580c', '#c2410c', '#7c2d12'],
    'Amarillos': ['#eab308', '#facc15', '#ca8a04', '#a16207', '#713f12'],
    'Marrones': ['#78350f', '#92400e', '#b45309', '#d97706', '#5d4037', '#795548', '#8d6e63', '#a1887f', '#4e342e'],
    'Verdes': ['#22c55e', '#4ade80', '#16a34a', '#15803d', '#14532d', '#84cc16', '#65a30d', '#3f6212'],
    'Cianes': ['#06b6d4', '#22d3ee', '#0891b2', '#0e7490', '#155e75', '#38bdf8', '#0ea5e9', '#0284c7'],
    'Azules': ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af', '#6366f1', '#818cf8', '#4f46e5'],
    'Violetas': ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#5b21b6', '#d946ef', '#e879f9', '#c026d3'],
    'Grises': ['#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b']
};

/** Project colour picker. Cupertino styled: render inside a `.cu-root` surface (CupertinoSheet). */
export const ColorPicker = ({ selectedColor, onSelectColor, onToggle }: ColorPickerProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const toggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        onToggle?.(next);
    };

    return (
        <div className="cu-group" style={{ background: 'transparent', border: 0 }}>
            <Row
                icon={selectedColor ? undefined : <Palette size={17} />}
                iconColor={selectedColor || '#8e8e93'}
                label={selectedColor ? t('common.colorSelected', 'Color elegido') : t('common.selectColor', 'Color personalizado')}
                sub={t('habits.customizationOptional', 'Opcional')}
                chevron
                open={isOpen}
                onClick={toggle}
                trailing={selectedColor ? (
                    <span
                        role="button"
                        tabIndex={0}
                        className="cu-link"
                        style={{ color: 'var(--cu-red)', fontSize: 14 }}
                        onClick={(e) => { e.stopPropagation(); onSelectColor(undefined); setIsOpen(false); onToggle?.(false); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onSelectColor(undefined); } }}
                    >
                        {t('common.clear', 'Quitar')}
                    </span>
                ) : undefined}
            />
            <Expand open={isOpen}>
                <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 4px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Object.entries(COLOR_PALETTE).map(([groupName, colors]) => (
                        <div key={groupName}>
                            <div className="cu-section-label" style={{ padding: '0 4px 8px' }}>
                                {t(`habits.categories.${groupName.toLowerCase()}`, groupName)}
                            </div>
                            <div className="cu-swatches" style={{ gap: 10 }}>
                                {colors.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`cu-swatch ${selectedColor === color ? 'cu-on' : ''}`}
                                        style={{ background: color }}
                                        onClick={() => onSelectColor(color)}
                                        aria-label={color}
                                        aria-pressed={selectedColor === color}
                                    >
                                        {selectedColor === color && <Check size={14} strokeWidth={3} style={{ position: 'absolute', inset: 0, margin: 'auto', color: '#fff', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.5))' }} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Expand>
        </div>
    );
};
