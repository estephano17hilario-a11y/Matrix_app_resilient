import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, X, Trash2, Plus, Check, ArrowLeft, Pencil } from 'lucide-react';
import { NoteBlueprint, NoteBlock } from '../../../types';
import { getBlueprints, deleteBlueprint } from '../../../services/blueprintService';
import { useAuth } from '@/context/AuthContext';
import { defaultBlueprints } from '../../../config/defaultBlueprints';
import { BlockEditor } from './BlockEditor';
import { EditorToolbar } from './EditorToolbar';
import { SaveBlueprintModal } from './SaveBlueprintModal';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface BlueprintSelectorProps {
  onSelect: (blocks: NoteBlock[]) => void;
}

export const BlueprintSelector: React.FC<BlueprintSelectorProps> = ({ onSelect }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [blueprints, setBlueprints] = useState<NoteBlueprint[]>([]);
  
  // Composition Note State
  const [isCreating, setIsCreating] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<NoteBlock[]>([{ id: 'init-1', type: 'text', content: '' }]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState<NoteBlueprint | null>(null);

  const fetchBlueprints = async () => {
    if (!user) {
        setBlueprints(defaultBlueprints);
        return;
    }
    try {
      const data = await getBlueprints(user.id);
      // Deduplicate blueprints based on ID
      const allBlueprints = [...defaultBlueprints, ...data];
      const uniqueBlueprints = Array.from(new Map(allBlueprints.map(item => [item.id, item])).values());
      setBlueprints(uniqueBlueprints);
    } catch (e) {
      console.error("Failed to load blueprints", e);
      setBlueprints(defaultBlueprints);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlueprints();
    }
  }, [isOpen, user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    if (window.confirm('Delete this blueprint?')) {
       await deleteBlueprint(user.id, id);
       fetchBlueprints();
    }
  };

  const handleSelect = (bp: NoteBlueprint) => {
    try {
        const blocks = JSON.parse(bp.content) as NoteBlock[];
        // Re-generate IDs to avoid conflicts if used multiple times
        const newBlocks = blocks.map(b => ({ 
            ...b, 
            id: Date.now().toString(36) + Math.random().toString(36).substr(2) 
        }));
        setIsOpen(false);
        onSelect(newBlocks);
    } catch (e) {
        console.error("Invalid blueprint content", e);
    }
  };

  const handleStartCreating = () => {
      setDraftBlocks([{ id: 'init-1', type: 'text', content: '' }]);
      setEditingBlueprint(null);
      setIsCreating(true);
  };

  const handleEditBlueprint = (e: React.MouseEvent, bp: NoteBlueprint) => {
      e.stopPropagation();
      try {
          const blocks = JSON.parse(bp.content) as NoteBlock[];
          setDraftBlocks(blocks);
          setEditingBlueprint(bp);
          setIsCreating(true);
      } catch (error) {
          console.error("Failed to parse blueprint blocks", error);
          toast.error(t('notes.errorParsing', 'Failed to load blueprint'));
      }
  };

  const handleCancelCreating = () => {
      setIsCreating(false);
      setEditingBlueprint(null);
  };

  const addBlock = (type: 'text' | 'check' | 'image') => { 
      setDraftBlocks(prev => [...prev, { id: Date.now().toString(), type, content: '', checked: false }]); 
  };

  const handleSaveComposition = () => {
      setShowSaveModal(true);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title={t('notes.blueprints', 'Blueprints')}
      >
        <Ruler size={18} />
      </button>

      {createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80"
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-[#111] border border-white/10 rounded-[32px] shadow-2xl p-6 md:p-8 no-scrollbar flex flex-col"
                        style={{ maskImage: 'linear-gradient(to bottom, black 95%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 95%, transparent 100%)' }}
                    >
                        {/* Fake Glass Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        
                        <div className="relative z-10 flex justify-between items-center mb-8 shrink-0">
                            <div className="flex items-center gap-4">
                                {isCreating ? (
                                    <button onClick={handleCancelCreating} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95">
                                        <ArrowLeft size={20} />
                                    </button>
                                ) : (
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
                                        <Ruler size={24} />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                                        {isCreating ? (editingBlueprint ? t('notes.edit', 'Edit') : t('notes.create', 'Create')) : t('notes.blueprint', 'Blueprint')} <span className="text-indigo-400">{isCreating ? t('notes.preset', 'Preset') : t('notes.deck', 'Deck')}</span>
                                    </h2>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                                        {isCreating ? (editingBlueprint ? t('notes.editYourFormat', 'Edit your format') : t('notes.designYourFormat', 'Design your format')) : t('notes.selectFormat', 'Select a format')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isCreating && (
                                    <button 
                                        onClick={handleSaveComposition}
                                        className="flex items-center gap-2 bg-white hover:bg-indigo-50 text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                                    >
                                        <Check size={16} />
                                        <span>{editingBlueprint ? t('notes.updatePreset', 'Update Preset') : t('notes.savePreset', 'Save Preset')}</span>
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {!isCreating ? (
                            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8 overflow-y-auto flex-1 no-scrollbar">
                                {/* Create Preset Card */}
                                <motion.div
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleStartCreating}
                                    className="group relative min-h-[260px] rounded-[24px] border-2 border-white/10 border-dashed bg-white/5 hover:bg-white/10 p-6 cursor-pointer overflow-hidden transition-all duration-300 flex flex-col items-center justify-center text-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-indigo-500/20 transition-all duration-300 mb-6 group-hover:scale-110 group-hover:rotate-90">
                                        <Plus size={32} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="font-bold text-white/70 group-hover:text-white text-lg tracking-tight">{t('notes.createPreset', 'Create Preset')}</h3>
                                    <p className="text-xs text-white/40 mt-2 font-medium">{t('notes.designBlueprint', 'Design your own blueprint')}</p>
                                </motion.div>

                                {blueprints.map((bp) => (
                                    <motion.div
                                        key={bp.id}
                                        whileHover={{ y: -4, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSelect(bp)}
                                        className={`group relative min-h-[260px] rounded-[24px] border border-white/10 bg-[#161616] p-6 cursor-pointer overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl hover:border-white/20`}
                                    >
                                        {/* Hover Glow Effect using accentColor */}
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-300 bg-gradient-to-br ${bp.accentColor}`} />
                                        
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start">
                                                <span className="text-4xl filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300 origin-top-left">{bp.icon}</span>
                                                {bp.category === 'USER' && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => handleEditBlueprint(e, bp)}
                                                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                                                            title={t('notes.editPreset', 'Edit Preset')}
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDelete(e, bp.id)}
                                                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                                                            title={t('notes.deletePreset', 'Delete Preset')}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <h3 className="mt-6 font-bold text-white text-xl leading-tight tracking-tight">{bp.name}</h3>
                                            
                                            {/* Ghost Preview */}
                                            <div className="mt-6 flex-1 space-y-3 overflow-hidden opacity-20 group-hover:opacity-40 transition-opacity duration-300 select-none pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }}>
                                                <div className="h-2 w-3/4 bg-white rounded-full" />
                                                <div className="h-2 w-full bg-white rounded-full" />
                                                <div className="h-2 w-5/6 bg-white rounded-full" />
                                                <div className="space-y-2 mt-4">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="w-3 h-3 border-2 border-white rounded-[4px]" />
                                                        <div className="h-2 w-1/2 bg-white rounded-full" />
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <div className="w-3 h-3 border-2 border-white rounded-[4px]" />
                                                        <div className="h-2 w-2/3 bg-white rounded-full" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col h-full min-h-[50vh] relative z-10 bg-black/20 rounded-[24px] border border-white/5 overflow-hidden flex-1">
                                <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32">
                                    <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#111] via-[#111]/90 to-transparent pt-12 pb-6 px-6 pointer-events-none">
                                    <div className="pointer-events-auto">
                                        <EditorToolbar onAdd={addBlock} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
      </AnimatePresence>,
      document.body
      )}

      {/* Save Modal */}
      <SaveBlueprintModal 
        isOpen={showSaveModal} 
        onClose={() => {
            setShowSaveModal(false);
            setIsCreating(false);
            setEditingBlueprint(null);
            fetchBlueprints();
        }} 
        currentBlocks={draftBlocks} 
        existingBlueprint={editingBlueprint}
      />
    </>
  );
};
