import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { NoteBlock, NoteBlueprint } from '../../../types';
import { saveBlueprint } from '../../../services/blueprintService';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface SaveBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBlocks: NoteBlock[];
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

export const SaveBlueprintModal: React.FC<SaveBlueprintModalProps> = ({ isOpen, onClose, currentBlocks }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📝');
  const [accentColor, setAccentColor] = useState(COLORS[3]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    
    try {
        const newBlueprint: NoteBlueprint = {
            id: Date.now().toString(), // Simple ID
            name,
            icon,
            content: JSON.stringify(currentBlocks),
            category: 'USER',
            accentColor
        };
        
        await saveBlueprint(user.id, newBlueprint);
        onClose();
        setName('');
    } catch (e) {
        console.error("Failed to save blueprint", e);
    } finally {
        setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-md p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-medium text-white">{t('modals.blueprint.title')}</h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">{t('modals.blueprint.name')}</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('modals.blueprint.namePlaceholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Icon Selector */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">{t('modals.blueprint.icon')}</label>
                        <div className="flex gap-2 flex-wrap">
                            {EMOJIS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => setIcon(e)}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-all ${icon === e ? 'bg-white/10 border-indigo-500 scale-110' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                >
                                    {e}
                                </button>
                            ))}
                            <input 
                                type="text" 
                                value={icon} 
                                onChange={(e) => setIcon(e.target.value)}
                                className="w-10 h-10 bg-transparent border border-white/10 rounded-lg text-center focus:border-indigo-500 outline-none"
                                maxLength={2}
                            />
                        </div>
                    </div>

                    {/* Color Selector */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">{t('modals.blueprint.theme')}</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setAccentColor(c)}
                                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} relative transition-transform hover:scale-110`}
                                >
                                    {accentColor === c && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                        {loading ? t('modals.blueprint.saving') : <><Save size={18} /> {t('modals.blueprint.saveBtn')}</>}
                    </button>
                </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
