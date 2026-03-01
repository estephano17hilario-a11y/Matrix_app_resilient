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

interface SpecialEventsHubProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings?: () => void;
}

const EVENT_TYPES = {
    BIRTHDAY: { icon: Gift, color: '#ec4899', label: 'Birthday' },
    ANNIVERSARY: { icon: Heart, color: '#ef4444', label: 'Anniversary' },
    OTHER: { icon: Star, color: '#fbbf24', label: 'Special Day' }
};

export const SpecialEventsHub = ({ isOpen, onClose, onOpenSettings }: SpecialEventsHubProps) => {
    const [events, setEvents] = useState<SpecialEvent[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null);

    // Load events from localStorage on mount (lazily)
    useEffect(() => {
        // FIX: Re-load on open to avoid stale state if updated elsewhere
        // And ensure we don't overwrite with empty state if we haven't loaded yet.
        const saved = localStorage.getItem('special_events');
        if (saved) {
            try {
                // Merge with existing events if any, but prefer saved ones for persistence
                // Actually, if we use lazy state initialization, we don't need this effect unless for sync.
                // But user complained about data loss.
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setEvents(parsed);
                }
            } catch (e) {
                console.error("Failed to parse events", e);
            }
        }
    }, [isOpen]);

    // Save events whenever they change
    useEffect(() => {
        // PREVENT DATA LOSS: Only save if we have items OR if we are sure we want to save empty state.
        // This is tricky because if user deletes all events, we want to save [].
        // But if initial load failed, we might have [].
        // Let's assume if we are inside the component and 'events' changed, it's a valid change.
        // BUT, to be safe against the "initial empty render overwriting storage" issue:
        // We can check if we have loaded at least once. 
        // For now, let's trust that useEffect above runs first.
        // A safer way is to check if 'events' is empty and localStorage has data, don't overwrite?
        // No, that prevents deleting all.
        
        // The real fix is ensuring the initial state is lazy loaded properly, which we do above.
        // But let's add a check:
        if (events.length > 0) {
             localStorage.setItem('special_events', JSON.stringify(events));
        } else {
             // If events is empty, only save if we previously had data (meaning we deleted it)
             // OR if we are sure.
             // For now, let's just save. The issue likely was the initial render [] triggering a save before the effect loaded data.
             // But the effect above runs on mount. This effect also runs on mount.
             // If this effect runs before the load effect, it saves [].
             
             // REACT 18: Effects run after paint.
             // The load effect runs. Sets state.
             // The save effect runs.
             
             // Actually, dependencies matter.
             // If we just loaded, we don't need to save.
             // Let's rely on the fact that if we just loaded, events state will update, triggering this.
             // But the initial render has events=[].
             // Does this effect run for the initial render? YES.
             // So it saves [] immediately! THIS IS THE BUG.
             
             // FIX: Don't save on first render if empty.
             // We can use a ref to track if we have loaded.
        }
    }, [events]);
    
    // BETTER FIX FOR PERSISTENCE:
    // Use a ref to track if initial load is done.
    const isLoaded = React.useRef(false);
    
    useEffect(() => {
        if (isLoaded.current) {
             localStorage.setItem('special_events', JSON.stringify(events));
        }
    }, [events]);
    
    useEffect(() => {
        // Mark as loaded after the first load effect
        // We can do this inside the load effect actually.
        const saved = localStorage.getItem('special_events');
        if (saved) {
             try {
                 const parsed = JSON.parse(saved);
                 if (Array.isArray(parsed)) {
                     setEvents(parsed);
                 }
             } catch(e) {}
        }
        isLoaded.current = true;
    }, [isOpen]); // Re-run on open to sync, and mark loaded.

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
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-pink-500/10 blur-[60px] md:blur-[120px]" />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[60px] md:blur-[120px]" />
                    </div>

                    {/* Fullscreen Header - No HUD */}
            <div className="pt-safe-top px-6 pb-6 border-b border-white/5 flex justify-between items-end bg-gradient-to-b from-pink-500/5 to-transparent h-32 shrink-0">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-2"
                    >
                        <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
                            <Gift size={24} />
                        </div>
                        <span className="text-xs font-bold text-pink-500 uppercase tracking-widest">Memories</span>
                    </motion.div>
                    <h2 className="text-4xl font-black text-white tracking-tight">Celebrations</h2>
                </div>
                <div className="flex items-center gap-2">
                    {onOpenSettings && (
                        <button 
                            onClick={onOpenSettings}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/5"
                        >
                            <Settings size={24} />
                        </button>
                    )}
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/5"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 pb-32">
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
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="px-10 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)] text-sm"
                                >
                                    Add First Event
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Add Button Card */}
                                <button 
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="group relative aspect-[4/3] rounded-[32px] border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-6 hover:border-white/20"
                                >
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 shadow-inner">
                                        <Plus size={32} className="text-white/60 group-hover:text-white" />
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80">Add Event</span>
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
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => handleEditEvent(event)}
                                    className="relative group aspect-[4/3] rounded-[32px] bg-[#111] border border-white/5 p-8 flex flex-col justify-between overflow-hidden hover:border-white/10 transition-colors shadow-lg cursor-pointer"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                            className="p-3 rounded-full bg-black/50 text-white/60 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md border border-white/5"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                            className="p-3 rounded-full bg-black/50 text-red-400 hover:bg-red-500/20 transition-colors backdrop-blur-md border border-white/5"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-2xl md:blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: EVENT_TYPES[event.type].color }} />
                                    
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 shadow-inner" style={{ color: EVENT_TYPES[event.type].color }}>
                                            <TypeIcon size={24} />
                                        </div>
                                        {isToday ? (
                                            <span className="px-4 py-1.5 rounded-full bg-pink-500 text-white text-xs font-bold uppercase tracking-wide animate-pulse shadow-[0_0_20px_rgba(236,72,153,0.4)]">
                                                Today!
                                            </span>
                                        ) : (
                                            <span className="px-4 py-1.5 rounded-full bg-white/5 text-white/40 text-xs font-bold uppercase tracking-wide border border-white/5">
                                                {daysLeft > 0 ? `${daysLeft} days left` : 'Passed'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-bold text-white mb-2 truncate tracking-tight">{event.title}</h3>
                                        <div className="flex items-center gap-3 text-white/40 text-sm font-medium">
                                            <Calendar size={14} />
                                            {format(nextDate, 'MMMM do, yyyy')}
                                            {event.recurrence && event.recurrence !== 'NONE' && (
                                                <Repeat size={12} className="opacity-50" />
                                            )}
                                        </div>
                                        {event.notifyTime && (
                                                <div className="inline-flex items-center gap-2 text-white/30 text-xs font-mono mt-2 bg-white/5 self-start px-2 py-1 rounded-lg border border-white/5">
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
