import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Gift, Heart, Star, Type, Bell, Check, Repeat, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SpecialEvent } from './types';
import { format, parseISO } from 'date-fns';
import { TimePicker } from '../../../components/ui/TimePicker';

interface CreateEventModalProps {
 isOpen: boolean;
 onClose: () => void;
 onDelete?: () => void;
 onSave: (event: SpecialEvent) => void;
 initialEvent?: SpecialEvent | null;
}

const EVENT_TYPES = [
 { id: 'BIRTHDAY', icon: Gift, label: 'Birthday', color: '#ec4899' },
 { id: 'ANNIVERSARY', icon: Heart, label: 'Anniversary', color: '#ef4444' },
 { id: 'OTHER', icon: Star, label: 'Special Day', color: '#fbbf24' }
];

const RECURRENCE_OPTIONS = [
 { id: 'NONE', label: 'One Time', description: 'Just once' },
 { id: 'ANNUAL', label: 'Annual', description: 'Every year' },
 { id: 'MONTHLY', label: 'Monthly', description: 'Every month' }
];

export const CreateEventModal = ({ isOpen, onClose, onSave, onDelete, initialEvent }: CreateEventModalProps) => {
 const [title, setTitle] = useState(initialEvent?.title || '');

 const [date, setDate] = useState('');
 const [time, setTime] = useState('09:00');
 const [type, setType] = useState('BIRTHDAY');
 const [notes, setNotes] = useState('');
 const [showInCalendar, setShowInCalendar] = useState(true);
 const [recurrence, setRecurrence] = useState<'NONE' | 'ANNUAL' | 'MONTHLY'>('NONE');

 useEffect(() => {
 if (isOpen) {
 if (initialEvent) {
 setTitle(initialEvent.title);
 setDate(initialEvent.date);
 setTime(initialEvent.notifyTime || '09:00');
 setType(initialEvent.type);
 setNotes(initialEvent.notes || '');
 setShowInCalendar(initialEvent.showInCalendar ?? true);
 setRecurrence(initialEvent.recurrence || 'NONE');
 } else {
 setTitle('');
 setDate('');
 setTime('09:00');
 setType('BIRTHDAY');
 setNotes('');
 setShowInCalendar(true);
 setRecurrence('NONE');
 }
 }
 }, [isOpen, initialEvent]);

 const isFormComplete = title.trim() !== '' && date !== '' && time !== '' && notes.trim() !== '';

 const handleSave = () => {
 if (!isFormComplete) {
 toast.error("Please fill in all required fields (including notes and time)");
 return;
 }

 const newEvent: SpecialEvent = {
 id: initialEvent ? initialEvent.id : Date.now().toString(),
 title,
 date, // YYYY-MM-DD
 type: type as any,
 notifyTime: time,
 notes,
 showInCalendar,
 recurrence
 };

 onSave(newEvent);
 onClose();
 };

 const getRecurrenceLabel = () => {
 if (!date) return '';
 try {
 const dateObj = parseISO(date);
 if (recurrence === 'ANNUAL') return `Every year on ${format(dateObj, 'MMMM do')}`;
 if (recurrence === 'MONTHLY') return `Every month on the ${format(dateObj, 'do')}`;
 } catch (e) { return ''; }
 return 'No recurrence';
 };

 return (
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 onClick={onClose}
 className="absolute inset-0 bg-black/80 backdrop-blur-sm transform-gpu "
 />
 
 <motion.div 
 initial={{ scale: 0.9, y: 20, opacity: 0 }}
 animate={{ scale: 1, y: 0, opacity: 1 }}
 exit={{ scale: 0.9, y: 20, opacity: 0 }}
 className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
 >
 {/* Header Image / Gradient */}
 <div className="h-32 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 relative flex items-end p-6">
 <div className="absolute top-4 right-4">
 <button onClick={onClose} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/60 hover:text-white transition-colors backdrop-blur-sm transform-gpu ">
 <X size={18} />
 </button>
 </div>
 <div>
 <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">{initialEvent ? 'Edit Memory' : 'New Memory'}</h2>
 <p className="text-white/60 text-xs font-medium uppercase tracking-widest">{initialEvent ? 'Update details' : 'Create a timeless reminder'}</p>
 </div>
 </div>

 {/* Form */}
 <div className="p-6 space-y-6 overflow-y-auto">
 
 {/* Title Input */}
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
 <Type size={12} />
 Event Title
 </label>
 <input 
 type="text" 
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="e.g. Mom's Birthday"
 className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-lg font-medium"
 />
 </div>

 {/* Type Selection */}
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
 <Star size={12} />
 Event Type
 </label>
 <div className="grid grid-cols-3 gap-3">
 {EVENT_TYPES.map(t => (
 <button
 key={t.id}
 onClick={() => setType(t.id)}
 className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${type === t.id ? 'bg-white/10 border-white/30 text-white shadow-lg scale-105' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/80'}`}
 >
 <t.icon size={20} style={{ color: type === t.id ? t.color : 'currentColor' }} className="mb-2" />
 <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Date & Time */}
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
 <Calendar size={12} />
 Date
 </label>
 <input 
 type="date" 
 value={date}
 onChange={(e) => setDate(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-white/30 transition-all text-sm font-mono appearance-none"
 />
 </div>
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
 <Clock size={12} />
 Notify At
 </label>
 <TimePicker 
 value={time}
 onChange={setTime}
 className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-white/30 transition-all text-sm font-mono"
 />
 </div>
 </div>

 {/* Recurrence Selection */}
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
 <Repeat size={12} />
 Recurrence
 </label>
 <div className="grid grid-cols-3 gap-3">
 {RECURRENCE_OPTIONS.map(opt => (
 <button
 key={opt.id}
 onClick={() => setRecurrence(opt.id as any)}
 className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${recurrence === opt.id ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
 >
 <span className="text-xs font-bold mb-1">{opt.label}</span>
 <span className="text-[10px] opacity-60">{opt.description}</span>
 </button>
 ))}
 </div>
 {recurrence !== 'NONE' && date && (
 <div className="text-center text-xs text-indigo-300 mt-2 bg-indigo-500/10 py-2 rounded-lg border border-indigo-500/20">
 Will repeat: <strong>{getRecurrenceLabel()}</strong>
 </div>
 )}
 </div>

 {/* Calendar Switch */}
 <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
 <div className="flex items-center gap-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${showInCalendar ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/40'}`}>
 <Calendar size={14} />
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-bold text-white">Show in Calendar</span>
 <span className="text-[10px] text-white/40">Visible in Journaling view</span>
 </div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input 
 type="checkbox" 
 checked={showInCalendar}
 onChange={(e) => setShowInCalendar(e.target.checked)}
 className="sr-only peer" 
 />
 <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
 </label>
 </div>

 {/* Notes */}
 <div className="space-y-2">
 <label className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
 <Type size={12} />
 Personal Note
 </label>
 <textarea 
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Write a special message..."
 rows={3}
 className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-sm resize-none"
 />
 </div>

 {/* Notification Preview */}
 <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-white/5 flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg shrink-0">
 <Bell size={18} />
 </div>
 <div>
 <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide mb-0.5">System Notification</p>
 <p className="text-xs text-white/60 leading-tight">
 You will receive a personalized alert on <span className="text-white font-mono">{date || 'YYYY-MM-DD'}</span> at <span className="text-white font-mono">{time}</span>.
 </p>
 </div>
 </div>

 </div>

 {/* Footer */}
 <div className="p-6 pt-2 border-t border-white/5">
 <button 
 onClick={handleSave}
 disabled={!isFormComplete}
 className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl
 ${isFormComplete 
 ? 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-white/10' 
 : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'}
 `}
 >
 <Check size={18} />
 {isFormComplete ? 'Confirm Event' : 'Fill All Fields'}
 </button>
 {initialEvent && onDelete && (
 <button 
 onClick={onDelete}
 className="w-full mt-3 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
 >
 <Trash2 size={18} />
 Delete Event
 </button>
 )}
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 );
};
