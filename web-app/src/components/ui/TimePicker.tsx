import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Clock, Keyboard } from 'lucide-react';
import { cn } from '../../utils/cn';
import { createPortal } from 'react-dom';

interface TimePickerProps {
    value: string; // Format: "HH:mm" in 24h format (e.g. "14:30")
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, placeholder = '00:00', className, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Local State for the picker
    const [hour, setHour] = useState(12);
    const [minute, setMinute] = useState(0);
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
    const [activeTab, setActiveTab] = useState<'HOUR' | 'MINUTE'>('HOUR');

    // String states for manual input
    const [hourStr, setHourStr] = useState('12');
    const [minuteStr, setMinuteStr] = useState('00');
    
    // Manual editing mode
    const [manualEditMode, setManualEditMode] = useState<'NONE' | 'HOUR' | 'MINUTE'>('NONE');
    const hourInputRef = useRef<HTMLInputElement>(null);
    const minuteInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (manualEditMode === 'HOUR') {
            setTimeout(() => hourInputRef.current?.focus(), 50);
        } else if (manualEditMode === 'MINUTE') {
            setTimeout(() => minuteInputRef.current?.focus(), 50);
        }
    }, [manualEditMode]);

    useEffect(() => {
        if (isOpen && value) {
            const [hStr, mStr] = value.split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);
            if (!isNaN(h) && !isNaN(m)) {
                setPeriod(h >= 12 ? 'PM' : 'AM');
                setHour(h % 12 || 12);
                setMinute(m);
            }
        } else if (isOpen && !value) {
            // Default to current time or noon
            setHour(12);
            setMinute(0);
            setPeriod('AM');
            setActiveTab('HOUR');
        }
    }, [isOpen, value]);

    // Sync string states with numeric states
    useEffect(() => {
        setHourStr(hour.toString());
    }, [hour]);

    useEffect(() => {
        setMinuteStr(minute.toString().padStart(2, '0'));
    }, [minute]);

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setHourStr('');
            return;
        }
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0 && num <= 12) {
            setHourStr(num.toString());
            if (num >= 1 && num <= 12) setHour(num);
        }
    };

    const handleHourBlur = () => {
        let num = parseInt(hourStr, 10);
        if (isNaN(num) || num < 1) num = 12;
        if (num > 12) num = 12;
        setHour(num);
        setHourStr(num.toString());
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setMinuteStr('');
            return;
        }
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0 && num <= 59) {
            setMinuteStr(val);
            setMinute(num);
        }
    };

    const handleMinuteBlur = () => {
        let num = parseInt(minuteStr, 10);
        if (isNaN(num) || num < 0) num = 0;
        if (num > 59) num = 59;
        setMinute(num);
        setMinuteStr(num.toString().padStart(2, '0'));
    };

    const handleSave = () => {
        let finalHour = hour;
        if (period === 'PM' && finalHour !== 12) finalHour += 12;
        if (period === 'AM' && finalHour === 12) finalHour = 0;
        
        const hStr = finalHour.toString().padStart(2, '0');
        const mStr = minute.toString().padStart(2, '0');
        onChange(`${hStr}:${mStr}`);
        setIsOpen(false);
    };

    const formatDisplay = () => {
        if (!value) return placeholder;
        const [hStr, mStr] = value.split(':');
        const h = parseInt(hStr, 10);
        const p = h >= 12 ? 'PM' : 'AM';
        const formattedH = h % 12 || 12;
        return `${formattedH}:${mStr} ${p}`;
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cn("flex items-center justify-between transition-colors", className)}
            >
                <span className={!value ? "text-white/20" : ""}>{formatDisplay()}</span>
                {!value && <span className="text-[10px] font-bold text-white/20 ml-2">OFF</span>}
            </button>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm transform-gpu "
                            />
                            
                            <motion.div
                                initial={{ y: '100%', opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100%', opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="relative w-full max-w-[380px] bg-[#0a0a0c] sm:rounded-3xl rounded-t-3xl border-t sm:border border-white/10 shadow-md overflow-hidden pb-8 sm:pb-0"
                            >
                                {/* Header */}
                                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <Clock size={18} />
                                        <span className="font-bold tracking-wide uppercase text-xs">{label || 'Set Time'}</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Display Area */}
                                <div className="p-6 pb-8 flex flex-col items-center justify-center gap-6 relative">
                                    <div 
                                        className="flex items-center justify-center gap-3 text-6xl sm:text-7xl font-black text-white tracking-tighter relative w-full"
                                        style={{ perspective: 1000 }}
                                    >
                                        {/* HOUR BLOCK */}
                                        <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                                            <AnimatePresence mode="wait">
                                                {manualEditMode === 'HOUR' ? (
                                                    <motion.input
                                                        key="input-hour"
                                                        ref={hourInputRef}
                                                        initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                                                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                                        exit={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                                                        type="number"
                                                        inputMode="numeric"
                                                        value={hourStr}
                                                        onChange={handleHourChange}
                                                        onBlur={() => { handleHourBlur(); setManualEditMode('NONE'); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { handleHourBlur(); setManualEditMode('NONE'); } }}
                                                        className={cn(
                                                            "absolute inset-0 w-full h-full rounded-3xl flex items-center justify-center text-center bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/50 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] outline-none z-10 transition-shadow",
                                                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        )}
                                                    />
                                                ) : (
                                                    <motion.button
                                                        key="btn-hour"
                                                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                                        exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                                                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                                                        onClick={() => setActiveTab('HOUR')}
                                                        onDoubleClick={() => { setActiveTab('HOUR'); setManualEditMode('HOUR'); }}
                                                        className={cn(
                                                            "absolute inset-0 w-full h-full rounded-3xl flex items-center justify-center text-center transition-all",
                                                            activeTab === 'HOUR' ? "bg-white/10 text-white ring-1 ring-white/20 shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)]" : "bg-white/5 text-white/50 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {hourStr}
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* COLON */}
                                        <motion.span 
                                            animate={{ opacity: activeTab === 'HOUR' ? 0.5 : 1, scale: manualEditMode !== 'NONE' ? 0.9 : 1 }}
                                            className="text-white/20 pb-3 transition-colors duration-700"
                                        >
                                            :
                                        </motion.span>

                                        {/* MINUTE BLOCK */}
                                        <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                                            <AnimatePresence mode="wait">
                                                {manualEditMode === 'MINUTE' ? (
                                                    <motion.input
                                                        key="input-minute"
                                                        ref={minuteInputRef}
                                                        initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                                                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                                        exit={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                                                        type="number"
                                                        inputMode="numeric"
                                                        value={minuteStr}
                                                        onChange={handleMinuteChange}
                                                        onBlur={() => { handleMinuteBlur(); setManualEditMode('NONE'); }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { handleMinuteBlur(); setManualEditMode('NONE'); } }}
                                                        className={cn(
                                                            "absolute inset-0 w-full h-full rounded-3xl flex items-center justify-center text-center bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/50 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] outline-none z-10 transition-shadow",
                                                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        )}
                                                    />
                                                ) : (
                                                    <motion.button
                                                        key="btn-minute"
                                                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                                                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                                        exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                                                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                                                        onClick={() => setActiveTab('MINUTE')}
                                                        onDoubleClick={() => { setActiveTab('MINUTE'); setManualEditMode('MINUTE'); }}
                                                        className={cn(
                                                            "absolute inset-0 w-full h-full rounded-3xl flex items-center justify-center text-center transition-all",
                                                            activeTab === 'MINUTE' ? "bg-white/10 text-white ring-1 ring-white/20 shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)]" : "bg-white/5 text-white/50 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {minuteStr}
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                    
                                    {/* Double Tap Hint */}
                                    <AnimatePresence>
                                        {manualEditMode === 'NONE' && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                className="absolute bottom-0 flex items-center gap-1.5 text-white/30 text-[10px] font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5"
                                            >
                                                <Keyboard size={10} />
                                                <span>Doble toque para escribir</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* AM / PM Toggle */}
                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-48 mt-2">
                                        <button
                                            onClick={() => setPeriod('AM')}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                                period === 'AM' ? "bg-amber-500/20 text-amber-400 shadow-sm" : "text-white/30 hover:text-white/50"
                                            )}
                                        >
                                            <Sun size={14} /> AM
                                        </button>
                                        <button
                                            onClick={() => setPeriod('PM')}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                                period === 'PM' ? "bg-indigo-500/20 text-indigo-400 shadow-sm" : "text-white/30 hover:text-white/50"
                                            )}
                                        >
                                            <Moon size={14} /> PM
                                        </button>
                                    </div>
                                </div>

                                {/* Selection Grid */}
                                <div className="px-6 pb-6">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'HOUR' ? (
                                            <motion.div 
                                                key="hours"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="grid grid-cols-4 gap-2"
                                            >
                                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                                                    <button
                                                        key={h}
                                                        onClick={() => {
                                                            setHour(h);
                                                            setActiveTab('MINUTE');
                                                        }}
                                                        className={cn(
                                                            "h-12 rounded-xl text-lg font-bold transition-all",
                                                            hour === h ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                                        )}
                                                    >
                                                        {h}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="minutes"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="grid grid-cols-4 gap-2"
                                            >
                                                {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                                                    <button
                                                        key={m}
                                                        onClick={() => {
                                                            setMinute(m);
                                                        }}
                                                        className={cn(
                                                            "h-12 rounded-xl text-lg font-bold transition-all",
                                                            minute === m ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                                        )}
                                                    >
                                                        {m.toString().padStart(2, '0')}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Footer Action */}
                                <div className="p-5 pt-0">
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-4 rounded-xl bg-white text-black font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                    >
                                        Save Time
                                    </button>
                                    
                                    {value && (
                                        <button
                                            onClick={() => {
                                                onChange('');
                                                setIsOpen(false);
                                            }}
                                            className="w-full py-3 mt-2 rounded-xl text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                                        >
                                            Remove Alarm
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};
