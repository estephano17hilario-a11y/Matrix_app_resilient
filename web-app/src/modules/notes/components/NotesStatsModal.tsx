import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PenTool, Brain, Flame, Type, Activity, TrendingUp, Zap, BarChart2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Lock } from 'lucide-react';
import { Note, JournalEntry } from '../../../types';
import { toLocalISOString, calculateStreak, startOfWeek, endOfWeek } from '../../../utils/dateUtils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    XAxis
} from 'recharts';
import { MoodSnakeChart } from './MoodSnakeChart';
import { DateSelectionModal } from '../../dashboard/components/DateSelectionModal';

// Force cast Recharts components to any to bypass strict React 18+ type checks
const TooltipAny = Tooltip as any;
const ResponsiveContainerAny = ResponsiveContainer as any;
const BarChartAny = BarChart as any;
const BarAny = Bar as any;
const CellAny = Cell as any;
const XAxisAny = XAxis as any;

// --- CONSTANTS & CONFIG ---

const MOODS = [
    { id: 'rad', icon: '🚀', color: '#10b981', label: 'Radiant', value: 5 },
    { id: 'good', icon: '😊', color: '#3b82f6', label: 'Good', value: 4 },
    { id: 'meh', icon: '😐', color: '#94a3b8', label: 'Neutral', value: 3 },
    { id: 'bad', icon: '🌧️', color: '#64748b', label: 'Low', value: 2 },
    { id: 'awful', icon: '⛈️', color: '#ef4444', label: 'Drained', value: 1 },
];

const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

// --- COMPONENTS ---

const StatCard = ({ icon: Icon, label, value, subValue, color, delay, isLocked, onUnlock }: any) => (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        onClick={isLocked ? onUnlock : undefined}
        className={`relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-4 group transition-colors ${isLocked ? 'cursor-pointer hover:bg-white/10' : 'hover:bg-white/10'}`}
    >
        <div 
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" 
            style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} 
        />
        
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-white/5 text-white/80">
                    <Icon size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</span>
                {isLocked && <Lock size={10} className="text-yellow-400 ml-auto" />}
            </div>
            <div>
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                {subValue && <div className="text-[10px] font-medium text-white/40 mt-0.5">{subValue}</div>}
            </div>
        </div>
    </motion.div>
);

export const NotesStatsModal = ({ isOpen, onClose, notes, journalEntries, initialTab = 'OVERVIEW', isPro, onOpenPro }: { isOpen: boolean, onClose: () => void, notes: Note[], journalEntries: JournalEntry[], initialTab?: 'OVERVIEW' | 'EMOTIONS', isPro?: boolean, onOpenPro?: () => void }) => {
    const { t } = useTranslation();
    const [range, setRange] = useState<'WEEK' | 'MONTH'>('WEEK');
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EMOTIONS'>(initialTab);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // --- DATA PROCESSING ---
    const data = useMemo(() => {
        const start = range === 'WEEK' 
            ? startOfWeek(currentDate)
            : startOfMonth(currentDate);
        const end = range === 'WEEK' 
            ? endOfWeek(currentDate)
            : endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });
        const chartData: any[] = [];
        
        for (const d of days) {
            const dateStr = toLocalISOString(d);
            const displayDate = range === 'WEEK' 
                ? format(d, 'EEE', { locale: es }).toUpperCase()
                : format(d, 'd', { locale: es });

            // Find data for this day
            const dayNotes = notes.filter(n => toLocalISOString(new Date(n.updatedAt)) === dateStr).length;
            const dayEntry = journalEntries.find(j => j.date === dateStr);
            
            let moodVal = null;
            let moodIcon = '';
            let moodColor = '#333'; // Default dark
            
            if (dayEntry && dayEntry.mood) {
                const m = MOODS.find(mood => mood.id === dayEntry.mood);
                if (m) {
                    moodVal = m.value;
                    moodIcon = m.icon;
                    moodColor = m.color;
                }
            }

            chartData.push({
                date: dateStr,
                display: displayDate,
                notes: dayNotes,
                mood: moodVal, 
                moodIcon,
                moodColor,
                fullDate: d
            });
        }
        return chartData;
    }, [notes, journalEntries, range, currentDate]);

    const dateLabel = useMemo(() => {
        if (range === 'WEEK') {
            const start = startOfWeek(currentDate);
            const end = endOfWeek(currentDate);
            return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`;
        }
        return format(currentDate, 'MMMM yyyy', { locale: es });
    }, [range, currentDate]);

    const stats = useMemo(() => {
        let totalWords = 0;
        notes.forEach(n => n.blocks.forEach(b => totalWords += (b.content || '').split(/\s+/).length));
        journalEntries.forEach(j => j.blocks.forEach(b => totalWords += (b.content || '').split(/\s+/).length));

        return {
            totalNotes: notes.length,
            totalJournal: journalEntries.length,
            streak: calculateStreak(journalEntries),
            words: totalWords
        };
    }, [notes, journalEntries]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="absolute inset-0 bg-[#000]/95 transform-gpu" 
                    />

                    {/* Modal Container */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className={`relative z-10 w-full h-full flex flex-col bg-[#121212] overflow-hidden ${activeTab === 'EMOTIONS' ? '' : 'sm:max-w-[600px] sm:h-auto sm:max-h-[90vh] sm:rounded-[32px] sm:border sm:border-white/10'}`}
                    >
                        {/* Noise Texture */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("${NOISE_SVG}")` }} />
                        
                        {/* Close Button - Absolute Positioned */}
                        <button 
                            onClick={onClose} 
                            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white/60 hover:text-white hover:bg-[#2a2a2a] transition-colors active:scale-95 border border-white/5"
                        >
                            <X size={20} />
                        </button>

                        {/* Header & Tabs */}
                        <div className={`relative z-20 shrink-0 flex flex-col gap-4 transition-all px-6 pt-16 pb-2 sm:px-8 sm:pt-16`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full pr-12 sm:pr-0">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                        <Activity size={20} className="text-indigo-400" />
                                        <span>Insights</span>
                                    </h2>
                                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mt-1">Neural Analytics v2.0</p>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Range Switcher */}
                                    <div className="flex bg-[#1a1a1a] p-1 rounded-full border border-white/5 flex-shrink-0">
                                        {['WEEK', 'MONTH'].map(r => {
                                            const isLockedMonth = r === 'MONTH' && !isPro;
                                            return (
                                            <button 
                                                key={r} 
                                                onClick={() => {
                                                    if (isLockedMonth) {
                                                        onOpenPro?.();
                                                    } else {
                                                        setRange(r as any);
                                                    }
                                                }} 
                                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${range === r ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white'} ${isLockedMonth ? 'cursor-pointer' : ''}`}
                                            >
                                                {r === 'WEEK' ? 'SEMANA' : 'MES'}
                                                {isLockedMonth && <Lock size={10} className={range === r ? 'text-black' : 'text-yellow-400'} />}
                                            </button>
                                        )})}
                                    </div>
                                    
                                    {/* Date Navigation */}
                                    <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-full border border-white/5 flex-shrink-0">
                                        <button
                                            onClick={() => setCurrentDate(d => range === 'WEEK' ? addWeeks(d, -1) : addMonths(d, -1))}
                                            className="w-8 h-8 rounded-full bg-transparent hover:bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-95"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => setIsDateModalOpen(true)}
                                            className="px-2 h-8 rounded-full text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
                                        >
                                            <CalendarIcon size={14} />
                                            <span className="uppercase tracking-wider">{dateLabel}</span>
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(d => range === 'WEEK' ? addWeeks(d, 1) : addMonths(d, 1))}
                                            className="w-8 h-8 rounded-full bg-transparent hover:bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors active:scale-95"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Apple-style Segmented Control */}
                        <div className="px-6 pb-4 relative z-20">
                            <div className="bg-black/20 p-1 rounded-xl flex border border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                                {['OVERVIEW', 'EMOTIONS'].map((tab) => {
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`flex-1 relative py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all duration-300 z-10 flex items-center justify-center gap-2 ${isActive ? 'text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
                                        >
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="activeTabBg"
                                                    className="absolute inset-0 bg-white/10 border border-white/10 rounded-lg shadow-inner"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <span className="relative z-10 flex items-center gap-2">
                                                {tab === 'OVERVIEW' ? <BarChart2 size={12} /> : <Zap size={12} />}
                                                {tab}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className={`relative z-10 flex-1 overflow-hidden ${activeTab === 'EMOTIONS' ? 'flex flex-col' : 'overflow-y-auto p-6 pt-2'}`}>
                            
                            <AnimatePresence mode="wait">
                                {activeTab === 'OVERVIEW' ? (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6"
                                    >
                                        {/* Bento Grid Stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <StatCard icon={PenTool} label={t('notes.notes', 'Notes')} value={stats.totalNotes} color="#3b82f6" delay={0.1} />
                                            <StatCard icon={Brain} label={t('notes.entries', 'Entries')} value={isPro ? stats.totalJournal : <span className="bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-x_6s_ease_infinite] bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400">DELUX</span>} color="#a855f7" delay={0.2} isLocked={!isPro} onUnlock={onOpenPro} />
                                            <StatCard icon={Flame} label={t('notes.streak', 'Streak')} value={stats.streak} subValue={t('notes.currentDays', 'Current Days')} color="#f97316" delay={0.3} />
                                            <StatCard icon={Type} label={t('notes.words', 'Words')} value={isPro ? (stats.words / 1000).toFixed(1) + 'k' : <span className="bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-x_6s_ease_infinite] bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400">DELUX</span>} subValue={isPro ? t('notes.totalWritten', 'Total Written') : undefined} color="#10b981" delay={0.4} isLocked={!isPro} onUnlock={onOpenPro} />
                                        </div>

                                        {/* Simple Activity Chart */}
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Activity size={14} className="text-blue-400" />
                                                <span className="text-xs font-bold text-white tracking-wide">ACTIVITY VOLUME</span>
                                            </div>
                                            <div className="h-[120px] w-full">
                                                <ResponsiveContainerAny width="100%" height="100%">
                                                    <BarChartAny data={data}>
                                                        <XAxisAny 
                                                            dataKey="display" 
                                                            axisLine={false} 
                                                            tickLine={false} 
                                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                                            dy={10}
                                                            interval={0}
                                                            tickFormatter={(value: any) => {
                                                                if (range === 'MONTH') {
                                                                    const num = parseInt(value);
                                                                    if ([1, 7, 14, 21, 28].includes(num)) return value;
                                                                    return '';
                                                                }
                                                                return value;
                                                            }}
                                                        />
                                                        <BarAny dataKey="notes" radius={[4, 4, 4, 4]}>
                                                            {data.map((entry: any, index: number) => (
                                                                <CellAny key={`cell-${index}`} fill={entry.notes > 0 ? '#3b82f6' : 'rgba(255,255,255,0.1)'} />
                                                            ))}
                                                        </BarAny>
                                                        <TooltipAny 
                                                            contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                                            labelStyle={{ display: 'none' }}
                                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                        />
                                                    </BarChartAny>
                                                </ResponsiveContainerAny>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="emotions"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="w-full h-full flex flex-col"
                                    >
                                        {/* FULL SCREEN EMOTION CHART CONTAINER - NO PADDING, NO BORDERS */}
                                        <div className="flex-1 w-full relative">
                                            {/* Chart Title Overlay */}
                                            <div className="absolute top-4 left-6 sm:left-8 z-20 pointer-events-none">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <TrendingUp size={24} className="text-pink-400" />
                                                    <span className="text-2xl font-bold text-white tracking-tight">Emotional Flow</span>
                                                </div>
                                                <p className="text-sm text-white/50 font-medium max-w-[300px]">Visualizing your emotional journey through time.</p>
                                            </div>

                                            {/* The Chart Itself */}
                                            <div className="w-full h-full">
                                                <MoodSnakeChart data={data} />
                                            </div>
                                        </div>
                                        
                                        {/* Bottom Legend Bar */}
                                        <div className="h-20 shrink-0 bg-[#121212] border-t border-white/5 flex items-center justify-center gap-6 sm:gap-8 flex-wrap px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Radiant</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Good</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Drained</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </div>
                    </motion.div>
                </div>
            )}
            <DateSelectionModal
                isOpen={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                onSelect={(date) => setCurrentDate(date)}
                mode={range}
                currentDate={currentDate}
            />
        </AnimatePresence>,
        document.body
    );
};
