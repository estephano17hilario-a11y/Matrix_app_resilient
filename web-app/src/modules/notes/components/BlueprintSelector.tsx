import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, X, Trash2 } from 'lucide-react';
import { NoteBlueprint, NoteBlock } from '../../../types';
import { getBlueprints, deleteBlueprint } from '../../../services/blueprintService';
import { useAuth } from '../../../context/AuthContext';

interface BlueprintSelectorProps {
  onSelect: (blocks: NoteBlock[]) => void;
}

export const BlueprintSelector: React.FC<BlueprintSelectorProps> = ({ onSelect }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [blueprints, setBlueprints] = useState<NoteBlueprint[]>([]);

  const fetchBlueprints = async () => {
    if (!user) return;
    try {
      const data = await getBlueprints(user.uid);
      setBlueprints(data);
    } catch (e) {
      console.error("Failed to load blueprints", e);
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
       await deleteBlueprint(user.uid, id);
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

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Blueprints"
      >
        <Ruler size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-4xl max-h-[80vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-6 custom-scrollbar"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-light text-white tracking-tight">
                            Blueprint <span className="text-indigo-400 font-semibold">Deck</span>
                        </h2>
                        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {blueprints.map((bp) => (
                            <motion.div
                                key={bp.id}
                                whileHover={{ y: -5, scale: 1.02 }}
                                onClick={() => handleSelect(bp)}
                                className={`group relative aspect-[3/4] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-white/20`}
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
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </>
  );
};
