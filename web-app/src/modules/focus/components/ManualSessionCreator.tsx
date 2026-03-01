'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { Project } from '../../../types';
import { cn } from '../../../utils/cn';
import { TimeWheel } from './TimeWheel';

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
            <div className="pt-6 pb-2 px-6 flex items-center justify-between shrink-0">
                <div className="flex-1" /> {/* Spacer left */}
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                    {isEditing ? 'Editar sesión' : 'Nueva sesión'}
                </h2>
                <div className="flex-1 flex justify-end gap-4">
                    {isEditing && onDelete && (
                        <button 
                            onClick={onDelete}
                            className="w-8 h-8 rounded-full bg-[#1C1C1E] text-red-500 flex items-center justify-center active:bg-[#2C2C2E] transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button 
                        onClick={onCancel}
                        className="w-8 h-8 rounded-full bg-[#1C1C1E] text-[#8E8E93] flex items-center justify-center active:bg-[#2C2C2E] transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col px-4 pt-4 pb-6 gap-4 overflow-y-auto">
                
                {/* 1. DURATION DISPLAY (Large Container) */}
                <div 
                    onClick={() => setActivePicker('DURATION')}
                    className={cn(
                        "w-full rounded-[20px] py-8 flex flex-col items-center justify-center transition-colors cursor-pointer relative overflow-hidden",
                        activePicker === 'DURATION' ? "bg-[#1C1C1E]" : "bg-[#1C1C1E]/40"
                    )}
                >
                    <span className="text-[11px] font-bold text-[#0A84FF] uppercase tracking-widest mb-1">DURACIÓN</span>
                    <span className="text-[42px] font-medium text-[#0A84FF] tracking-tight tabular-nums leading-none">
                        {hours}h {minutes.toString().padStart(2, '0')}m
                    </span>
                </div>

                {/* 2. WHEEL PICKER (The centerpiece) */}
                <div className="relative h-[250px] w-full shrink-0 select-none overflow-hidden">
                    
                    {/* Highlight Bar (The "Selection" Row) */}
                    <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[44px] bg-[#1C1C1E] rounded-[8px] z-0 mx-4" />

                    {/* Gradient Masks (Fade Effect) */}
                    <div className="absolute top-0 left-0 right-0 h-[80px] bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />

                    {/* Wheel Content */}
                    <AnimatePresence mode="wait">
                        {activePicker === 'DURATION' ? (
                            <motion.div 
                                key="duration-wheel"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-[1fr_auto_1fr_auto] h-full relative z-20 px-12"
                            >
                                {/* Hours */}
                                <TimeWheel 
                                    value={hours} 
                                    onChange={setHours} 
                                    items={durationHoursArray} 
                                    height={250}
                                    itemHeight={44}
                                />
                                <div className="flex items-center h-full pt-[2px] pointer-events-none">
                                    <span className="text-[17px] font-medium text-white pl-2 pr-6">horas</span>
                                </div>

                                {/* Minutes */}
                                <TimeWheel 
                                    value={minutes} 
                                    onChange={setMinutes} 
                                    items={minutesArray} 
                                    height={250}
                                    itemHeight={44}
                                />
                                <div className="flex items-center h-full pt-[2px] pointer-events-none">
                                    <span className="text-[17px] font-medium text-white pl-2">min</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="start-wheel"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
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
                                    height={250}
                                    itemHeight={44}
                                />
                                
                                <div className="flex items-center justify-center h-full pointer-events-none pb-1">
                                    <span className="text-[28px] font-medium text-white/20">:</span>
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
                                    height={250}
                                    itemHeight={44}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3. START / END BOXES */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                    {/* Start Time Card */}
                    <button 
                        onClick={() => setActivePicker('START_TIME')}
                        className={cn(
                            "py-6 rounded-[20px] flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all",
                            activePicker === 'START_TIME' ? "bg-[#1C1C1E]" : "bg-[#1C1C1E]/40"
                        )}
                    >
                        <span className="text-[11px] font-bold text-[#0A84FF] uppercase tracking-widest">INICIO</span>
                        <span className="text-[28px] font-medium text-[#0A84FF] tracking-tight tabular-nums leading-none">
                            {format(startDate, 'H:mm')}
                        </span>
                    </button>

                    {/* End Time Card (Static) */}
                    <div className="py-6 rounded-[20px] bg-[#1C1C1E] flex flex-col items-center justify-center gap-1 opacity-60">
                        <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest">FIN</span>
                        <span className="text-[28px] font-medium text-white tracking-tight tabular-nums leading-none">
                            {format(endDate, 'H:mm')}
                        </span>
                    </div>
                </div>

                {/* 4. TASK BOX */}
                <div className="w-full py-5 px-6 rounded-[20px] bg-[#1C1C1E] flex flex-col items-center text-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest">TASK</span>
                    <span className="text-[15px] text-white leading-tight line-clamp-2">
                        {project.title || "Toca para seleccionar una tarea"}
                    </span>
                </div>

                <div className="flex-1" />

                {/* 5. SAVE BUTTON */}
                <button
                    onClick={handleSave}
                    className="w-full py-4 rounded-[16px] bg-[#0A84FF] text-white font-bold text-[17px] hover:bg-[#007AFF] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/10 shrink-0 mb-2"
                >
                    Guardar
                </button>
            </div>
        </motion.div>
    );
};
