import React, { useState } from 'react';
import { AVAILABLE_AVATARS } from '../../config/avatars';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc, db } from '../../services/firebase';
import { AvatarSelectorCard } from './components/AvatarSelectorCard';

interface AvatarSelectorProps {
  onClose?: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ onClose }) => {
  const { user, profile, refreshProfile, updateProfileLocally } = useAuth();
  const [selectedId, setSelectedId] = useState<string | undefined>(profile?.avatarId);
  const [isSaving, setIsSaving] = useState(false);

  // ⚡ SYNC WITH REALITY: Ensure local state matches global profile when it loads or updates externally
  React.useEffect(() => {
    // FIX: Only sync if NOT saving to avoid reverting optimistic updates
    if (profile?.avatarId && !isSaving) {
      setSelectedId(profile.avatarId);
    }
  }, [profile?.avatarId, isSaving]);

  const handleSelect = async (avatarId: string) => {
    if (avatarId === selectedId) return; // Prevent unnecessary updates
    
    console.log(`AvatarSelector: Selecting ${avatarId}`);

    // 1. Optimistic UI: Update visual immediately
    setSelectedId(avatarId);
    setIsSaving(true);

    // 2. Update Global Context IMMEDIATELY (Simulated Reality)
    // This ensures the dashboard and other components update instantly
    // and stay updated even if the backend write fails (Permission/Network)
    updateProfileLocally({ avatarId });

    if (!user) {
      setIsSaving(false);
      if (onClose) {
        setTimeout(onClose, 200);
      }
      return;
    }

    try {
      // 3. Update Firestore (Persistence)
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        avatarId: avatarId
      }, { merge: true });

      console.log("AvatarSelector: Firestore updated");

      // 4. Refresh Context to propagate changes to the rest of the app
      await refreshProfile();
      
      // 5. Optional: Close modal after short delay
      if (onClose) {
        setTimeout(onClose, 500);
      }
    } catch (error) {
      console.warn("Avatar persistence failed (Permissions/Network). Keeping local reality.", error);
      // We purposefully DO NOT revert. 
      // The user chose this avatar, so it IS their avatar in this session.
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
