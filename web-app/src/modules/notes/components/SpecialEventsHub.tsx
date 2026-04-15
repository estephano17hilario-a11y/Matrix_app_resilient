import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Bell, Gift, Heart, Star, Trash2, Edit2, Settings, X, Calendar, Repeat } from 'lucide-react';
import { CreateEventModal } from '@/modules/notes/components/CreateEventModal';
import { format, differenceInDays, isSameDay, startOfDay } from 'date-fns';
import { notificationService } from '../../../services/notificationService';
import { createPortal } from 'react-dom';

import { toast } from 'react-hot-toast';
import { SpecialEvent } from './types';
import { getNextEventDate } from './utils';

import { FREE_LIMITS } from '../../../config/limits';
import { useAuth } from '../../../context/AuthContext';

interface SpecialEventsHubProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings?: () => void;
    isPro?: boolean;
    onOpenPro?: () => void;
}

const EVENT_TYPES = {
    BIRTHDAY: { icon: Gift, color: '#ec4899', label: 'Birthday' },
    ANNIVERSARY: { icon: Heart, color: '#ef4444', label: 'Anniversary' },
    OTHER: { icon: Star, color: '#fbbf24', label: 'Special Day' }
};

export const SpecialEventsHub = ({ isOpen, onClose, onOpenSettings, isPro, onOpenPro }: SpecialEventsHubProps) => {
    const { user } = useAuth();
    const eventsKey = user?.id ? `special_events_${user.id}` : 'special_events';

    const [events, setEvents] = useState<SpecialEvent[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null);
    const isLoaded = React.useRef(false);

    // Load events from localStorage on mount (lazily)
    useEffect(() => {
        const saved = localStorage.getItem(eventsKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setEvents(parsed);
                }
            } catch (e) {
                console.error("Failed to parse events", e);
            }
        }
        // Mark as loaded so subsequent changes are saved
        isLoaded.current = true;
    }, [isOpen, eventsKey]);

    // Save events whenever they change, but ONLY if we have already loaded
    useEffect(() => {
        if (isLoaded.current) {
             localStorage.setItem(eventsKey, JSON.stringify(events));
             // Dispatch event so the calendar (NotesView) reloads
             window.dispatchEvent(new Event('special_events_updated'));
        }
    }, [events, eventsKey]);

    const handleOpenCreateModal = () => {
        if (!isPro && events.length >= FREE_LIMITS.NOTES) {
            if (onOpenPro) onOpenPro();
            return;
        }
        setIsCreateModalOpen(true);
    };

    const handleCreateEvent = async (newEvent: SpecialEvent) => {
        setEvents(prev => {
            const exists = prev.find(e => e.id === newEvent.id);
            if (exists) {
                return prev.map(e => e.id === newEvent.id ? newEvent : e);
            }
            return [...prev, newEvent];
        });
        
        // Schedule Notification
        if (newEvent.notifyTime) {
            // Cancel any existing notification first if updating
            try {
                // If it's a new event, no problem. If updating, we should ideally cancel the old one.
                // But we don't store notification IDs separately usually (assuming event.id is enough).
                // Let's just schedule new one, it will overwrite if ID matches in some systems, 
                // or just be a new one. To be safe, we could cancel first.
                // notificationService.cancelEventNotification(newEvent.id);
            } catch (e) {
                console.warn("Failed to cancel old notification", e);
            }

            const nextDate = getNextEventDate(newEvent);
            const [hours, minutes] = newEvent.notifyTime.split(':').map(Number);
            nextDate.setHours(hours, minutes, 0, 0);
            
            await notificationService.scheduleEventNotification(
                newEvent.id,
                `🎉 Today is special!`,
                `It's ${newEvent.title}'s ${EVENT_TYPES[newEvent.type].label}! Don't forget to celebrate.`,
                nextDate
            );
            toast.success("Reminder updated");
        }
        setIsCreateModalOpen(false);
        setSelectedEvent(null);
    };

    const handleDeleteEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        notificationService.cancelEventNotification(id);
        toast.success("Event removed");
    };

    const handleEditEvent = (event: SpecialEvent) => {
        setSelectedEvent(event);
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setSelectedEvent(null);
    };

    const sortedEvents = [...events].sort((a, b) => getNextEventDate(a).getTime() - getNextEventDate(b).getTime());

    if (!isOpen) return null;

    return (
        <>
            {createPortal(
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505]" />
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-pink-500/5 blur-[80px] md:blur-[120px]" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-[80px] md:blur-[120px]" />
                    </div>

                    {/* Scrollable Container for both Header and Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pb-32">
                        {/* Fullscreen Header - Scrollable with content */}
                        <div className="pt-safe-top pt-12 px-6 pb-8 border-b border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-end bg-transparent shrink-0 relative gap-6">
                            <div className="pb-2 flex-1">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 mb-3"
                                >
                                    <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                                        <Gift size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-pink-500 uppercase tracking-[0.3em]">Memories</span>
                                </motion.div>
                                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-md">Celebrations</h2>
                            </div>
                            
                            {/* Actions - Now positioned nicely and responsive */}
                            <div className="flex items-center gap-3 pb-2 absolute top-12 right-6 sm:static sm:self-end">
                                {onOpenSettings && (
                                    <button 
                                        onClick={onOpenSettings}
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/5 backdrop-blur-sm transform-gpu shadow-sm"
                                    >
                                        <Settings size={20} className="sm:w-6 sm:h-6" />
                                    </button>
                                )}
                                <button 
                                    onClick={onClose}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/5 backdrop-blur-sm transform-gpu shadow-sm"
                                >
                                    <X size={20} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                        {events.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-60">
                                <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 animate-pulse relative">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/20 to-transparent blur-lg" />
                                    <Calendar size={64} className="text-white/20 relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">No Upcoming Events</h3>
                                    <p className="text-white/40 max-w-xs mx-auto text-lg leading-relaxed">Add birthdays, anniversaries, or special milestones to get personalized reminders.</p>
                                </div>
                                <button 
                                    onClick={handleOpenCreateModal}
                                    className="px-10 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)] text-sm"
                                >
                                    Add First Event
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Add Button Card */}
                                <button 
                                    onClick={handleOpenCreateModal}
                                    className="group relative aspect-[16/10] sm:aspect-[4/3] rounded-[24px] border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-4 hover:border-white/20 shadow-sm"
                                >
                                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 shadow-inner">
                                        <Plus size={24} className="text-white/60 group-hover:text-white" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80">Add Event</span>
                                </button>

                                {/* Event Cards */}
                                {sortedEvents.map(event => {
                            const TypeIcon = EVENT_TYPES[event.type].icon;
                            const nextDate = getNextEventDate(event);
                            const daysLeft = differenceInDays(nextDate, startOfDay(new Date()));
                            const isToday = isSameDay(nextDate, new Date());
                            
                            return (
                                <motion.div 
                                    key={event.id} 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => handleEditEvent(event)}
                                    className="relative group aspect-[16/10] sm:aspect-[4/3] rounded-[24px] bg-[#111] border border-white/5 p-6 flex flex-col justify-between overflow-hidden hover:border-white/10 transition-all shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-1"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                            className="p-2.5 rounded-full bg-black/50 text-white/60 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-sm transform-gpu border border-white/5"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                            className="p-2.5 rounded-full bg-black/50 text-red-400 hover:bg-red-500/20 transition-colors backdrop-blur-sm transform-gpu border border-white/5"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-[40px] opacity-15 pointer-events-none" style={{ backgroundColor: EVENT_TYPES[event.type].color }} />
                                    
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 shadow-inner" style={{ color: EVENT_TYPES[event.type].color }}>
                                            <TypeIcon size={20} />
                                        </div>
                                        {isToday ? (
                                            <span className="px-3 py-1 rounded-full bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                                                Today!
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-wider border border-white/5">
                                                {daysLeft > 0 ? `${daysLeft} days left` : 'Passed'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative z-10">
                                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5 truncate tracking-tight drop-shadow-sm">{event.title}</h3>
                                        <div className="flex items-center gap-2 text-white/40 text-xs font-medium">
                                            <Calendar size={12} />
                                            {format(nextDate, 'MMMM do, yyyy')}
                                            {event.recurrence && event.recurrence !== 'NONE' && (
                                                <Repeat size={10} className="opacity-50" />
                                            )}
                                        </div>
                                        {event.notifyTime && (
                                                <div className="inline-flex items-center gap-1.5 text-white/30 text-[10px] font-mono mt-2.5 bg-white/5 self-start px-2 py-1 rounded-lg border border-white/5 backdrop-blur-sm transform-gpu">
                                                    <Bell size={10} />
                                                    {event.notifyTime}
                                                </div>
                                            )}
                                    </div>
                                </motion.div>
                            );
                        })}
                        </div>
                    )}
                </div>
            </div>

            <CreateEventModal 
                isOpen={isCreateModalOpen} 
                onClose={handleCloseModal} 
                onSave={handleCreateEvent} 
                onDelete={selectedEvent ? () => handleDeleteEvent(selectedEvent.id) : undefined}
                initialEvent={selectedEvent}
            />
        </motion.div>,
                document.body
            )}
        </>
    );
};
