import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PenTool, Brain, Flame, Type } from 'lucide-react';
import { Note, JournalEntry } from '../../../types';
import { BarChart } from '../../../components/charts/BarChart';
import { toLocalISOString, calculateStreak } from '../../../utils/dateUtils';

// Import NOISE_SVG or define it locally if reused
const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

export const NotesStatsModal = ({ isOpen, onClose, notes, journalEntries }: { isOpen: boolean, onClose: () => void, notes: Note[], journalEntries: JournalEntry[] }) => {
    const [range, setRange] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');

    const stats = useMemo(() => {
        const now = new Date();
        let labels: string[] = [];
        let notesData: number[] = [];
        let journalData: number[] = [];
        
        if (range === 'WEEK') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                const dateStr = toLocalISOString(d);
                notesData.push(notes.filter(n => toLocalISOString(new Date(n.updatedAt)) === dateStr).length);
                journalData.push(journalEntries.filter(j => j.date === dateStr).length);
            }
        } else if (range === 'MONTH') {
            for (let i = 3; i >= 0; i--) {
                const start = new Date(now);
                start.setDate(start.getDate() - (i * 7) - 6);
                const end = new Date(now);
                end.setDate(end.getDate() - (i * 7));
                
                labels.push(`W${4-i}`);
                
                let nFill = 0;
                let jFill = 0;
                notes.forEach(n => {
                    const d = new Date(n.updatedAt);
                    if (d >= start && d <= end) nFill++;
                });
                journalEntries.forEach(j => {
                    const d = new Date(j.date);
                    if (d >= start && d <= end) jFill++;
                });
                notesData.push(nFill);
                journalData.push(jFill);
            }
        } else {
             for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(d.toLocaleDateString('en-US', { month: 'narrow' }));
                
                const month = d.getMonth();
                const year = d.getFullYear();
                
                notesData.push(notes.filter(n => {
                    const nd = new Date(n.updatedAt);
                    return nd.getMonth() === month && nd.getFullYear() === year;
                }).length);
                 journalData.push(journalEntries.filter(j => {
                    const jd = new Date(j.date);
                    return jd.getMonth() === month && jd.getFullYear() === year;
                }).length);
             }
        }

        const max = Math.max(...notesData, ...journalData, 1);
        
        let totalWords = 0;
        notes.forEach(n => n.blocks.forEach(b => totalWords += (b.content || '').split(/\s+/).length));
        journalEntries.forEach(j => j.blocks.forEach(b => totalWords += (b.content || '').split(/\s+/).length));

        return {
            labels, notesData, journalData, max,
            totalNotes: notes.length,
            totalJournal: journalEntries.length,
            streak: calculateStreak(journalEntries),
            words: totalWords
        };
    }, [notes, journalEntries, range]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="relative z-10 w-full max-w-[420px] bg-[#1c1c1e]/80 backdrop-blur-lg border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                    >
                        {/* Noise Texture */}
                        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("${NOISE_SVG}")` }} />
                        
                        {/* Header */}
                        <div className="p-6 pb-2 flex justify-between items-center relative z-10">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-white">Insights</h2>
                                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mt-1">Productivity Analytics</p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors active:scale-90 border border-white/5">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Bento Grid Stats */}
                        <div className="grid grid-cols-2 gap-3 px-6 mb-6 relative z-10">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-blue-400"><PenTool size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Notes</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{stats.totalNotes}</div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-purple-400"><Brain size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Entries</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{stats.totalJournal}</div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-orange-400"><Flame size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Streak</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{stats.streak} <span className="text-sm font-medium text-white/30">days</span></div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-green-400"><Type size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Words</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{(stats.words / 1000).toFixed(1)}k</div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="px-6 pb-6 relative z-10">
                             <div className="flex bg-black/20 p-1 rounded-xl mb-6 backdrop-blur-sm border border-white/5">
                                {['WEEK', 'MONTH', 'YEAR'].map(r => (
                                    <button key={r} onClick={() => setRange(r as any)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${range === r ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'text-white/30 hover:text-white/60'}`}>{r}</button>
                                ))}
                            </div>
                            
                            <BarChart 
                                datasets={[
                                    { data: stats.notesData, color: '#60a5fa', label: 'Notes' },
                                    { data: stats.journalData, color: '#c084fc', label: 'Journal' }
                                ]}
                                labels={stats.labels}
                                height={160}
                                max={stats.max}
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
