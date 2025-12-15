
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { generateTimeBlocks, FractalStructure, TimeUnit } from '../../../utils/fractalTimeEngine';
import { addMonths } from '../../../utils/dateUtils';

interface SmartDurationPickerProps {
    startDate: Date;
    onStructureChange: (structure: FractalStructure, endDate: Date) => void;
}

export const SmartDurationPicker: React.FC<SmartDurationPickerProps> = ({ startDate, onStructureChange }) => {
    const [endDateStr, setEndDateStr] = useState('');
    const [structure, setStructure] = useState<FractalStructure | null>(null);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setEndDateStr(val);
        if (val) {
            const end = new Date(val);
            const res = generateTimeBlocks(startDate, end);
            setStructure(res);
            onStructureChange(res, end);
        }
    };

    const applyPreset = (months: number) => {
        const end = addMonths(startDate, months);
        // Format to YYYY-MM-DD for input
        const iso = end.toISOString().split('T')[0];
        setEndDateStr(iso);
        const res = generateTimeBlocks(startDate, end);
        setStructure(res);
        onStructureChange(res, end);
    };

    const getUnitLabel = (type: TimeUnit) => {
        switch (type) {
            case '10_YEARS': return 'Década';
            case '5_YEARS': return 'Lustro';
            case '1_YEAR': return 'Año';
            case 'SEMESTER': return 'Semestre';
            case 'QUARTER': return 'Trimestre';
            case 'MONTH': return 'Mes';
            case 'WEEK': return 'Semana';
            case 'DAY': return 'Día';
            default: return type;
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            {/* Presets */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                    { label: '3 Meses', months: 3 },
                    { label: '6 Meses', months: 6 },
                    { label: '1 Año', months: 12 },
                    { label: '5 Años', months: 60 },
                ].map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => applyPreset(preset.months)}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white whitespace-nowrap transition-colors"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Input Date */}
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-white/40" />
                </div>
                <input
                    type="date"
                    value={endDateStr}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
            </div>

            {/* Feedback Pill */}
            {structure && structure.structure.length > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2 text-indigo-300">
                        <Clock size={14} />
                        <span className="text-xs font-bold uppercase">Estructura Fractal</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {structure.structure.map((block, idx) => (
                            <React.Fragment key={idx}>
                                <div className="bg-indigo-500/20 px-2 py-1 rounded-md text-xs font-medium text-indigo-200 border border-indigo-500/30">
                                    {block.duration}
                                </div>
                                {idx < structure.structure.length - 1 && (
                                    <span className="text-white/20">+</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <p className="mt-2 text-[10px] text-white/40">
                        Tu meta se dividirá inteligentemente en estos bloques.
                    </p>
                </div>
            )}
        </div>
    );
};
