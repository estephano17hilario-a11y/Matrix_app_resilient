import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Archive, Trash2, Edit2, X, RotateCcw } from 'lucide-react';
import { BadHabit } from '../../../types';
import { useTranslation } from 'react-i18next';

interface BadHabitActionsModalProps {
    habit: BadHabit | null;
    onClose: () => void;
    onEdit: (habit: BadHabit) => void;
    onArchive: (habit: BadHabit) => void;
    onDelete: (habit: BadHabit) => void;
}

export const BadHabitActionsModal: React.FC<BadHabitActionsModalProps> = ({
    habit,
    onClose,
    onEdit,
    onArchive,
    onDelete
}) => {
    const { t } = useTranslation();
    if (!habit) return null;

    if (typeof document === 'undefined') return null;

    const isArchived = habit.archived;

    return createPortal(
        <div className="fixed inset-0 z-[550] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/30"
            />

            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 450 }}
                className="relative z-10 w-full max-w-sm bg-[#18181b] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-md overflow-hidden"
            >
                {/* Drag Handle for Mobile */}
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />

                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white truncate pr-4">
                        {habit.title}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid gap-3">
                    <button
                        onClick={() => {
                            onEdit(habit);
                            onClose();
                        }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group active:scale-98"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <Edit2 size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-semibold">Editar Vicio</div>
                            <div className="text-white/40 text-xs">{t('common.modifyDetails')}</div>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            onArchive(habit);
                            onClose();
                        }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group active:scale-98"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isArchived ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white'}`}>
                            {isArchived ? <RotateCcw size={20} /> : <Archive size={20} />}
                        </div>
                        <div className="text-left">
                            <div className="text-white font-semibold">
                                {isArchived ? 'Restaurar Vicio' : 'Archivar Vicio'}
                            </div>
                            <div className="text-white/40 text-xs">
                                {isArchived ? t('common.unarchive') : t('common.hideWithoutDeleting')}
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            onDelete(habit);
                            onClose(); // Close this modal, but parent will handle opening confirmation
                        }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 transition-all group active:scale-98"
                    >
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                            <Trash2 size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-rose-400 group-hover:text-rose-300 font-semibold">{t('habits.deleteAction', 'Delete Habit')}</div>
                            <div className="text-white/40 text-xs group-hover:text-rose-200/60">{t('common.undoWarning', 'This action cannot be undone')}</div>
                        </div>
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
