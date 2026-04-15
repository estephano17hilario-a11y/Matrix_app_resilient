'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { Project } from '../../../types';
import { cn } from '../../../utils/cn';
import { TimeWheel } from './TimeWheel';
import { useTranslation } from 'react-i18next';

interface ManualSessionCreatorProps {
    initialDuration: number; // in minutes
    initialDate: Date;
    project: Project;
    onSave: (duration: number, date: Date) => void;
    onCancel: () => void;
    onDelete?: () => void;
    isEditing?: boolean;
}

export const ManualSessionCreator = ({
    initialDuration,
    initialDate,
    project,
    onSave,
    onCancel,
    onDelete,
    isEditing = false
}: ManualSessionCreatorProps) => {
    const { t } = useTranslation();
    // Duration state
    const [hours, setHours] = useState(Math.floor(initialDuration / 60));
    const [minutes, setMinutes] = useState(initialDuration % 60);

    // Date state (Start time)
    const [startDate, setStartDate] = useState<Date>(initialDate);
    const [activePicker, setActivePicker] = useState<'DURATION' | 'START_TIME'>('DURATION');

    // Derived End Time
    const totalMinutes = hours * 60 + minutes;
    const endDate = addMinutes(startDate, totalMinutes);

    // Arrays for wheels
    const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
    const minutesArray = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
    const durationHoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []); 
    
    const handleSave = () => {
        if (totalMinutes <= 0) return;
        onSave(totalMinutes, startDate);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 bg-[#000000] flex flex-col z-50 font-sans"
        >
            {/* Header */}
            <div className="pt-6 pb-4 px-6 flex items-center justify-between shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-sm transform-gpu sticky top-0 z-[60]">
                <div className="flex-1" /> {/* Spacer left */}
                <div className="flex flex-col items-center">
                    <h2 className="text-[17px] font-black text-white tracking-tight uppercase">
                        {isEditing ? 'Editar sesión' : 'Nueva sesión'}
                    </h2>
                    <div className="w-8 h-1 bg-[#0A84FF] rounded-full mt-1 shadow-[0_0_10px_rgba(10,132,255,0.5)]" />
                </div>
                <div className="flex-1 flex justify-end gap-3">
                    {isEditing && onDelete && (
                        <button 
                            onClick={onDelete}
                            className="w-10 h-10 rounded-2xl bg-[#1C1C1E] text-red-500 flex items-center justify-center active:scale-90 transition-all border border-red-500/10"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button 
                        onClick={onCancel}
                        className="w-10 h-10 rounded-2xl bg-[#1C1C1E] text-[#8E8E93] flex items-center justify-center active:scale-90 transition-all border border-white/5"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col px-4 pt-6 pb-8 gap-6 overflow-y-auto custom-scrollbar">
                
                {/* 1. DURATION DISPLAY (Large Container) */}
                <div 
                    onClick={() => setActivePicker('DURATION')}
                    className={cn(
                        "w-full rounded-[28px] py-10 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden border",
                        activePicker === 'DURATION' 
                            ? "bg-[#1C1C1E] border-[#0A84FF]/30 shadow-[0_0_30px_rgba(10,132,255,0.1)]" 
                            : "bg-[#1C1C1E]/40 border-white/5"
                    )}
                >
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest mb-2 transition-colors",
                        activePicker === 'DURATION' ? "text-[#0A84FF]" : "text-[#8E8E93]"
                    )}>DURACIÓN</span>
                    <span className={cn(
                        "text-[48px] font-black tracking-tighter tabular-nums leading-none transition-colors",
                        activePicker === 'DURATION' ? "text-white" : "text-white/40"
                    )}>
                        {hours}<span className="text-[24px] font-medium text-white/30 mx-1">h</span> {minutes.toString().padStart(2, '0')}<span className="text-[24px] font-medium text-white/30 mx-1">m</span>
                    </span>
                    
                    {activePicker === 'DURATION' && (
                        <motion.div 
                            layoutId="active-indicator"
                            className="absolute bottom-3 w-12 h-1 rounded-full bg-[#0A84FF]"
                        />
                    )}
                </div>

                {/* 2. WHEEL PICKER (The centerpiece) */}
                <div className="relative h-[280px] w-full shrink-0 select-none overflow-hidden bg-[#0A0A0A] rounded-[32px] border border-white/5">
                    
                    {/* Highlight Bar (The "Selection" Row) */}
                    <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[56px] bg-[#1C1C1E] rounded-[16px] z-0 border border-white/5 shadow-inner" />

                    {/* Gradient Masks (Fade Effect) */}
                    <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />

                    {/* Wheel Content */}
                    <AnimatePresence mode="wait">
                        {activePicker === 'DURATION' ? (
                            <motion.div 
                                key="duration-wheel"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="grid grid-cols-[1fr_auto_1fr_auto] h-full relative z-20 px-10"
                            >
                                {/* Hours */}
                                <TimeWheel 
                                    value={hours} 
                                    onChange={setHours} 
                                    items={durationHoursArray} 
                                    height={280}
                                    itemHeight={56}
                                />
                                <div className="flex items-center h-full pt-[2px] pointer-events-none">
                                    <span className="text-[15px] font-bold text-white/40 uppercase tracking-widest pl-2 pr-4">h</span>
                                </div>

                                {/* Minutes */}
                                <TimeWheel 
                                    value={minutes} 
                                    onChange={setMinutes} 
                                    items={minutesArray} 
                                    height={280}
                                    itemHeight={56}
                                />
                                <div className="flex items-center h-full pt-[2px] pointer-events-none">
                                    <span className="text-[15px] font-bold text-white/40 uppercase tracking-widest pl-2">m</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="start-wheel"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="grid grid-cols-[1fr_auto_1fr] h-full relative z-20 px-16"
                            >
                                {/* Hours */}
                                <TimeWheel 
                                    value={startDate.getHours()} 
                                    onChange={(val) => {
                                        const newDate = new Date(startDate);
                                        newDate.setHours(val);
                                        setStartDate(newDate);
                                    }} 
                                    items={hoursArray} 
                                    height={280}
                                    itemHeight={56}
                                />
                                
                                <div className="flex items-center justify-center h-full pointer-events-none pb-1">
                                    <span className="text-[32px] font-black text-[#0A84FF] opacity-50">:</span>
                                </div>

                                {/* Minutes */}
                                <TimeWheel 
                                    value={startDate.getMinutes()} 
                                    onChange={(val) => {
                                        const newDate = new Date(startDate);
                                        newDate.setMinutes(val);
                                        setStartDate(newDate);
                                    }} 
                                    items={minutesArray} 
                                    height={280}
                                    itemHeight={56}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3. START / END BOXES */}
                <div className="grid grid-cols-2 gap-4 shrink-0">
                    {/* Start Time Card */}
                    <button 
                        onClick={() => setActivePicker('START_TIME')}
                        className={cn(
                            "py-6 rounded-[28px] flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-all border",
                            activePicker === 'START_TIME' 
                                ? "bg-[#1C1C1E] border-[#0A84FF]/30 shadow-[0_0_30px_rgba(10,132,255,0.1)]" 
                                : "bg-[#1C1C1E]/40 border-white/5"
                        )}
                    >
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                            activePicker === 'START_TIME' ? "text-[#0A84FF]" : "text-[#8E8E93]"
                        )}>INICIO</span>
                        <span className={cn(
                            "text-[28px] font-black tracking-tight tabular-nums leading-none transition-colors",
                            activePicker === 'START_TIME' ? "text-white" : "text-white/40"
                        )}>
                            {format(startDate, 'H:mm')}
                        </span>
                    </button>

                    {/* End Time Card (Static) */}
                    <div className="py-6 rounded-[28px] bg-[#1C1C1E]/40 border border-white/5 flex flex-col items-center justify-center gap-1 opacity-60">
                        <span className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest">FIN</span>
                        <span className="text-[28px] font-black text-white/40 tracking-tight tabular-nums leading-none">
                            {format(endDate, 'H:mm')}
                        </span>
                    </div>
                </div>

                {/* 4. TASK BOX */}
                <div className="w-full py-5 px-6 rounded-[28px] bg-[#1C1C1E] border border-white/5 flex flex-col items-center text-center gap-1 shrink-0 shadow-inner">
                    <span className="text-[9px] font-black text-[#8E8E93] uppercase tracking-widest">PROYECTO SELECCIONADO</span>
                    <span className="text-[16px] font-bold text-white leading-tight line-clamp-2">
                        {project.title || t('focus.tapToSelectTask', 'Tap to select a task')}
                    </span>
                </div>

                <div className="flex-1" />

                {/* 5. SAVE BUTTON */}
                <button
                    onClick={handleSave}
                    className="w-full py-5 rounded-[24px] bg-[#0A84FF] text-white font-black text-[18px] uppercase tracking-widest hover:bg-[#007AFF] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(10,132,255,0.3)] shrink-0 mb-4"
                >
                    Guardar Sesión
                </button>
            </div>
        </motion.div>
    );
};
