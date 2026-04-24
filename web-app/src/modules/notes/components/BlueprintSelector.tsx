import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, X, Trash2, Plus, Check, ArrowLeft } from 'lucide-react';
import { NoteBlueprint, NoteBlock } from '../../../types';
import { getBlueprints, deleteBlueprint } from '../../../services/blueprintService';
import { useAuth } from '@/context/AuthContext';
import { defaultBlueprints } from '../../../config/defaultBlueprints';
import { BlockEditor } from './BlockEditor';
import { EditorToolbar } from './EditorToolbar';
import { SaveBlueprintModal } from './SaveBlueprintModal';
import { useTranslation } from 'react-i18next';

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
      setIsCreating(true);
  };

  const handleCancelCreating = () => {
      setIsCreating(false);
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
        title="Blueprints"
      >
        <Ruler size={18} />
      </button>

      {createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/95"
                        onClick={() => setIsOpen(false)}
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl max-h-[80vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-md p-6 custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                {isCreating && (
                                    <button onClick={handleCancelCreating} className="text-white/50 hover:text-white transition-colors">
                                        <ArrowLeft size={20} />
                                    </button>
                                )}
                                <h2 className="text-2xl font-light text-white tracking-tight">
                                    {isCreating ? t('notes.create', 'Create') : t('notes.blueprint', 'Blueprint')} <span className="text-indigo-400 font-semibold">{isCreating ? t('notes.preset', 'Preset') : t('notes.deck', 'Deck')}</span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {isCreating && (
                                    <button 
                                        onClick={handleSaveComposition}
                                        className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                                    >
                                        <Check size={18} />
                                        <span>{t('notes.savePreset', 'Save Preset')}</span>
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {!isCreating ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {/* Create Preset Card */}
                                <motion.div
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    onClick={handleStartCreating}
                                    className="group relative aspect-[3/4] rounded-xl border border-white/10 border-dashed bg-white/5 hover:bg-white/10 p-4 cursor-pointer overflow-hidden transition-all duration-200 flex flex-col items-center justify-center text-center"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-indigo-500/20 transition-colors mb-4">
                                        <Plus size={24} />
                                    </div>
                                    <h3 className="font-medium text-white/70 group-hover:text-white text-lg">{t('notes.createPreset', 'Create Preset')}</h3>
                                    <p className="text-sm text-white/40 mt-2">{t('notes.designBlueprint', 'Design your own blueprint')}</p>
                                </motion.div>

                                {blueprints.map((bp) => (
                                    <motion.div
                                        key={bp.id}
                                        whileHover={{ y: -5, scale: 1.02 }}
                                        onClick={() => handleSelect(bp)}
                                        className={`group relative aspect-[3/4] rounded-xl border border-white/10 bg-[#1a1a1a] p-4 cursor-pointer overflow-hidden transition-colors duration-200 hover:shadow-sm hover:border-white/20`}
                                    >
                                        {/* Hover Glow Effect using accentColor */}
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${bp.accentColor}`} />
                                        
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start">
                                                <span className="text-3xl">{bp.icon}</span>
                                                {bp.category === 'USER' && (
                                                    <button 
                                                        onClick={(e) => handleDelete(e, bp.id)}
                                                        className="text-white/20 hover:text-red-400 transition-colors p-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <h3 className="mt-4 font-medium text-white text-lg leading-tight">{bp.name}</h3>
                                            
                                            {/* Ghost Preview */}
                                            <div className="mt-4 flex-1 space-y-2 overflow-hidden opacity-30 select-none mask-image-linear-to-b">
                                                <div className="h-2 w-3/4 bg-white/50 rounded-full" />
                                                <div className="h-2 w-full bg-white/30 rounded-full" />
                                                <div className="h-2 w-5/6 bg-white/30 rounded-full" />
                                                <div className="space-y-1 mt-2">
                                                    <div className="flex gap-2">
                                                        <div className="w-3 h-3 border border-white/30 rounded" />
                                                        <div className="h-2 w-1/2 bg-white/20 rounded-full" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="w-3 h-3 border border-white/30 rounded" />
                                                        <div className="h-2 w-2/3 bg-white/20 rounded-full" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col h-full min-h-[50vh] relative">
                                <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                                    <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] pt-4 border-t border-white/5">
                                    <EditorToolbar onAdd={addBlock} />
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
            fetchBlueprints();
        }} 
        currentBlocks={draftBlocks} 
      />
    </>
  );
};
