import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface Trait {
  id: string;
  label: string;
  description: string;
  color: string;
}

const TRAITS: Trait[] = [
  { id: 'relentless', label: 'Relentless', description: 'I never give up.', color: 'from-red-500 to-orange-500' },
  { id: 'strategic', label: 'Strategic', description: 'I plan 10 steps ahead.', color: 'from-blue-500 to-cyan-500' },
  { id: 'creative', label: 'Creative', description: 'I see what others don\'t.', color: 'from-purple-500 to-pink-500' },
  { id: 'disciplined', label: 'Disciplined', description: 'Routine is my weapon.', color: 'from-emerald-500 to-green-500' },
  { id: 'leader', label: 'Leader', description: 'I build empires.', color: 'from-amber-400 to-yellow-500' },
  { id: 'analyst', label: 'Analyst', description: 'Data is truth.', color: 'from-indigo-500 to-blue-600' },
];

interface TraitSelectorProps {
  onNext: (selectedTraits: string[]) => void;
}

export function TraitSelector({ onNext }: TraitSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleTrait = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(t => t !== id));
    } else {
      if (selected.length >= 16) {
        setSelected([...selected.slice(1), id]);
      } else {
        setSelected([...selected, id]);
      }
    }
  };

  return (
    <GlassCard className="flex flex-col h-full max-h-[80vh]">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Intelligence Profile
        </h2>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Your Edge</h1>
        <p className="text-white/60 text-lg">Select up to 16 dominant traits.</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar -mx-2 px-2 py-2 grid grid-cols-1 gap-3">
        {TRAITS.map((trait) => {
          const isSelected = selected.includes(trait.id);
          return (
            <motion.button
              key={trait.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleTrait(trait.id)}
              className={`relative group p-4 rounded-2xl text-left transition-all duration-200 border ${
                isSelected 
                  ? 'bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <div className={`absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 ${isSelected ? 'opacity-20' : 'group-hover:opacity-10'} bg-gradient-to-r ${trait.color}`} />
              
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className={`font-bold text-lg mb-1 transition-colors ${isSelected ? 'text-white' : 'text-white/80'}`}>
                    {trait.label}
                  </h3>
                  <p className="text-xs text-white/50 font-medium tracking-wide">
                    {trait.description}
                  </p>
                </div>
                
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
                  isSelected 
                    ? 'bg-white border-white text-black scale-100' 
                    : 'border-white/20 text-transparent scale-90'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[4]" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex-shrink-0 flex justify-end">
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: selected.length > 0 ? 1 : 0.5, x: 0 }}
          disabled={selected.length === 0}
          onClick={() => onNext(selected)}
          className="bg-white text-black px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95"
        >
          Finalize <Check className="w-5 h-5" />
        </motion.button>
      </div>
    </GlassCard>
  );
}
