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
    <div className="w-full">
      {/* Grid Layout - Clean & Full Visibility */}
      {/* Increased column density (3 on mobile, 4 on sm, 5 on md) to fit more in "one zone" */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
            // Overriding aspect ratio to be slightly shorter (4:5 instead of 9:16) for better visibility
            className="aspect-[4/5]" 
          />
        ))}
      </div>
      
      {/* Feedback State */}
      {isSaving && (
        <div className="mt-4 text-center">
           <p className="text-cyan-400 text-xs font-mono animate-pulse tracking-widest">
              UPDATING REALITY...
           </p>
        </div>
      )}
    </div>
  );
};
