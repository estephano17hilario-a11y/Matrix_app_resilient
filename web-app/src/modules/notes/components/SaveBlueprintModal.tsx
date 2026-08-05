import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { NoteBlock, NoteBlueprint } from '../../../types';
import { saveBlueprint } from '../../../services/blueprintService';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface SaveBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBlocks: NoteBlock[];
  existingBlueprint?: NoteBlueprint | null;
}

const COLORS = [
  'from-rose-500 to-red-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-fuchsia-500 to-pink-600',
  'from-slate-700 to-slate-900', // Monochrome
];

const EMOJIS = ['📝', '🧠', '🏛️', '🏃', '💡', '✅', '📊', '📅', '🚀', '🧘'];

export const SaveBlueprintModal: React.FC<SaveBlueprintModalProps> = ({ isOpen, onClose, currentBlocks, existingBlueprint }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📝');
  const [accentColor, setAccentColor] = useState(COLORS[3]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (isOpen) {
          if (existingBlueprint) {
              setName(existingBlueprint.name);
              setIcon(existingBlueprint.icon);
              setAccentColor(existingBlueprint.accentColor || COLORS[3]);
          } else {
              setName('');
              setIcon('📝');
              setAccentColor(COLORS[3]);
          }
      }
  }, [isOpen, existingBlueprint]);

  const handleSave = async () => {
    if (!user) {
        toast.error('User not authenticated');
        return;
    }
    if (!name.trim()) {
        toast.error(t('modals.blueprint.errorName', 'Please enter a name for the preset'));
        return;
    }
    setLoading(true);
    
    try {
        const newBlueprint: NoteBlueprint = {
            id: existingBlueprint?.id || Date.now().toString(),
            name,
            icon,
            content: JSON.stringify(currentBlocks),
            category: existingBlueprint?.category || 'USER',
            accentColor
        };
        
        await saveBlueprint(user.id, newBlueprint);
        toast.success(existingBlueprint ? t('modals.blueprint.successUpdate', 'Preset updated successfully!') : t('modals.blueprint.success', 'Preset saved successfully!'));
        onClose();
        if (!existingBlueprint) {
            setName('');
        }
    } catch (e) {
        console.error("Failed to save blueprint", e);
        toast.error(t('modals.blueprint.error', 'Failed to save preset. Please try again.'));
    } finally {
        setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[32px] shadow-2xl p-6 overflow-hidden"
            >
                {/* Fake Glass Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

                <div className="relative z-10 flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
                            <Save size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{existingBlueprint ? t('modals.blueprint.titleEdit', 'Edit Preset') : t('modals.blueprint.title', 'Save Preset')}</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="relative z-10 space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{t('modals.blueprint.name', 'Preset Name')}</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('modals.blueprint.namePlaceholder', 'e.g. Daily Reflection')}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-white/20"
                            autoFocus
                        />
                    </div>

                    {/* Icon Selector */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{t('modals.blueprint.icon', 'Icon')}</label>
                        <div className="flex gap-2 flex-wrap bg-black/20 p-3 rounded-2xl border border-white/5">
                            {EMOJIS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => setIcon(e)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${icon === e ? 'bg-indigo-500/20 border border-indigo-500/50 scale-110 shadow-lg' : 'bg-transparent border border-transparent hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                                >
                                    {e}
                                </button>
                            ))}
                            <input 
                                type="text" 
                                value={icon} 
                                onChange={(e) => setIcon(e.target.value)}
                                className="w-10 h-10 bg-black/40 border border-white/10 rounded-xl text-center focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all ml-auto"
                                maxLength={2}
                            />
                        </div>
                    </div>

                    {/* Color Selector */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{t('modals.blueprint.theme', 'Theme Color')}</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar bg-black/20 p-3 rounded-2xl border border-white/5">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setAccentColor(c)}
                                    className={`w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br ${c} relative transition-all ${accentColor === c ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)] ring-2 ring-white/50' : 'hover:scale-105 opacity-50 hover:opacity-100'}`}
                                >
                                    {accentColor === c && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-3 h-3 bg-white rounded-full shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || loading}
                        className="w-full py-4 mt-2 bg-white hover:bg-indigo-50 text-black disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-sm uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
                    >
                        {loading ? t('modals.blueprint.saving', 'Saving...') : <><Save size={18} /> {existingBlueprint ? t('modals.blueprint.updateBtn', 'Update Preset') : t('modals.blueprint.saveBtn', 'Save Preset')}</>}
                    </button>
                </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
