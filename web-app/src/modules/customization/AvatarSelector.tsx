import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AVAILABLE_AVATARS } from '../../config/avatars';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, db } from '../../services/firebase';
import { CheckCircle } from 'lucide-react';

interface AvatarSelectorProps {
  onClose?: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ onClose }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [selectedId, setSelectedId] = useState<string | undefined>(profile?.avatarId);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = async (avatarId: string) => {
    if (!user) return;
    setSelectedId(avatarId);
    setIsSaving(true);

    try {
      // 1. Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        avatarId: avatarId
      });

      // 2. Refresh Context
      await refreshProfile();
      
      // 3. Optional: Close modal after short delay
      if (onClose) {
        setTimeout(onClose, 500);
      }
    } catch (error) {
      console.error("Failed to update avatar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h3 className="text-white text-lg font-medium mb-4 flex items-center gap-2">
        <span className="text-cyan-400">///</span> SELECT IDENTITY
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {AVAILABLE_AVATARS.map((avatar) => {
          const isSelected = selectedId === avatar.id;

          return (
            <motion.button
              key={avatar.id}
              onClick={() => handleSelect(avatar.id)}
              className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all duration-300 ${
                isSelected 
                  ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                  : 'border-white/10 hover:border-white/30'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Image */}
              <img 
                src={avatar.path} 
                alt={avatar.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />

              {/* Selection Overlay */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center backdrop-blur-[2px]"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rarity Badge (Optional) */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] uppercase tracking-wider text-white/80 font-mono">
                  {avatar.name}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
      
      {/* Helper Text */}
      <div className="mt-4 text-center">
         <p className="text-white/40 text-xs font-mono">
            {isSaving ? "SAVING IDENTITY..." : `${AVAILABLE_AVATARS.length} AVATARS AVAILABLE`}
         </p>
      </div>
    </div>
  );
};
