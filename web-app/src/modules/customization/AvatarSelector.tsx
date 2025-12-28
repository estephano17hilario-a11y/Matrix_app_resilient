import React, { useState } from 'react';
import { AVAILABLE_AVATARS } from '../../config/avatars';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, db } from '../../services/firebase';
import { AvatarSelectorCard } from './components/AvatarSelectorCard';

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
    <div className="w-full max-w-4xl mx-auto p-4">
      <h3 className="text-white text-lg font-medium mb-6 flex items-center gap-2">
        <span className="text-cyan-400">///</span> SELECT IDENTITY
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-h-[70vh] overflow-y-auto p-2 custom-scrollbar">
        {AVAILABLE_AVATARS.map((avatar) => (
          <AvatarSelectorCard
            key={avatar.id}
            id={avatar.id}
            name={avatar.name}
            rarity={avatar.rarity}
            imageUrl={avatar.path}
            themeColor={avatar.themeColor}
            isSelected={selectedId === avatar.id}
            onClick={handleSelect}
          />
        ))}
      </div>
      
      {/* Helper Text */}
      <div className="mt-6 text-center">
         <p className="text-white/40 text-xs font-mono">
            {isSaving ? "SAVING IDENTITY..." : `${AVAILABLE_AVATARS.length} AVATARS AVAILABLE`}
         </p>
      </div>
    </div>
  );
};
