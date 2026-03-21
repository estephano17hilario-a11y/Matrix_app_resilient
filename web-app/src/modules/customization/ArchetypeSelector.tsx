import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Cpu, Zap, Brain, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserArchetype } from '../../types/User';
import { doc, setDoc, db } from '../../services/firebase';
import { cn } from '../../utils/cn';

interface ArchetypeOption {
  id: UserArchetype;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  image: string;
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    id: 'NEO',
    name: 'The Neo',
    description: 'Balanced mastery. Adaptable to any reality.',
    icon: Zap,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    image: '/avatars/manhwa/avatar_ceo_ajedrez.webp'
  },
  {
    id: 'SPARTAN',
    name: 'Spartan',
    description: 'Unbreakable discipline. Strength and resilience.',
    icon: Shield,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    image: '/avatars/manhwa/avatar_chico_combatiente.webp'
  },
  {
    id: 'HACKER',
    name: 'Hacker',
    description: 'System architect. Intelligence and problem solving.',
    icon: Cpu,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    image: '/avatars/manhwa/avatar_cafe_programadora.webp'
  },
  {
    id: 'MONK',
    name: 'Monk',
    description: 'Zen focus. Mental clarity and deep work.',
    icon: Brain,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    image: '/avatars/manhwa/avatar_chico_azul_libro.webp'
  }
];

interface ArchetypeSelectorProps {
  onClose?: () => void;
}

export const ArchetypeSelector: React.FC<ArchetypeSelectorProps> = ({ onClose }) => {
  const { user, profile, updateProfileLocally } = useAuth();
  const [selectedId, setSelectedId] = useState<UserArchetype>(profile?.archetype || 'NEO');
  const [isSaving, setIsSaving] = useState(false);

  // Sync with profile if it changes externally
  React.useEffect(() => {
    if (profile?.archetype && !isSaving) {
      setSelectedId(profile.archetype);
    }
  }, [profile?.archetype, isSaving]);

  const handleSelect = async (archetype: UserArchetype) => {
    if (archetype === selectedId) return;
    
    console.log(`ArchetypeSelector: Selecting ${archetype}`);
    setSelectedId(archetype);
    setIsSaving(true);

    // 1. Optimistic UI
    updateProfileLocally({ archetype });

    if (!user) {
      setIsSaving(false);
      return;
    }

    try {
      // 2. Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { archetype }, { merge: true });
      
      console.log("ArchetypeSelector: Firestore updated");

      // 3. Refresh Context
      await refreshProfile();
      
      if (onClose) {
        setTimeout(onClose, 500);
      }
    } catch (error) {
      console.warn("Archetype persistence failed.", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ARCHETYPES.map((arch) => (
          <motion.button
            key={arch.id}
            onClick={() => handleSelect(arch.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "relative flex flex-col items-center overflow-hidden rounded-2xl border transition-all group",
              selectedId === arch.id 
                ? `${arch.borderColor} shadow-lg shadow-${arch.color.replace('text-', '')}/20` 
                : "border-white/5 hover:border-white/10"
            )}
          >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
               <img 
                 src={arch.image} 
                 alt={arch.name} 
                 className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500"
               />
               <div className={cn(
                 "absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent",
                 selectedId === arch.id ? "opacity-90" : "opacity-95"
               )} />
            </div>

            {/* Content */}
            <div className="relative z-10 p-5 w-full flex flex-col items-center text-center space-y-3">
                <div className={cn(
                  "p-3 rounded-full flex items-center justify-center shrink-0 mb-1 transition-colors duration-300",
                  selectedId === arch.id ? `${arch.bgColor} border border-${arch.color.replace('text-', '')}/30` : "bg-white/5 border border-white/5"
                )}>
                  <arch.icon size={28} className={arch.color} />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className={cn("text-lg font-bold tracking-wide", selectedId === arch.id ? "text-white" : "text-white/80")}>
                      {arch.name}
                    </h3>
                    {selectedId === arch.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn("p-0.5 rounded-full bg-white/10", arch.color)}
                      >
                        <Check size={14} strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed max-w-[200px] mx-auto">
                    {arch.description}
                  </p>
                </div>
            </div>

            {/* Selection Border Glow */}
            {selectedId === arch.id && (
                <motion.div 
                    layoutId="archetype-glow"
                    className={cn("absolute inset-0 border-2 rounded-2xl pointer-events-none", arch.borderColor)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
            )}
          </motion.button>
        ))}
      </div>

      {isSaving && (
        <div className="text-center">
           <p className="text-indigo-400 text-xs font-mono animate-pulse tracking-widest">
              REWRITING DNA...
           </p>
        </div>
      )}
    </div>
  );
};
