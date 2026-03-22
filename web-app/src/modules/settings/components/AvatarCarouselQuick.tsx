import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AVAILABLE_AVATARS } from '../../../config/avatars';
import { useAuth } from '../../../context/AuthContext';
import { doc, setDoc, db } from '../../../services/firebase';
import { useTranslation } from 'react-i18next';

interface AvatarCarouselQuickProps {
  onClose?: () => void;
}

export const AvatarCarouselQuick: React.FC<AvatarCarouselQuickProps> = ({ onClose }) => {
  const { user, profile, updateProfileLocally } = useAuth();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.avatarId) {
      const index = AVAILABLE_AVATARS.findIndex(a => a.id === profile.avatarId);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [profile?.avatarId]);

  const currentAvatar = AVAILABLE_AVATARS[currentIndex];
  const accentHex = currentAvatar.themeColor || '#ffffff';

  const handleSelect = useCallback(async (avatarId: string) => {
    if (avatarId === profile?.avatarId) return;

    setIsSaving(true);
    updateProfileLocally({ avatarId });

    if (!user) {
      setIsSaving(false);
      onClose?.();
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { avatarId }, { merge: true });
      onClose?.();
    } catch (error) {
      console.warn("Avatar persistence failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [user, profile?.avatarId, updateProfileLocally, onClose]);

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % AVAILABLE_AVATARS.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + AVAILABLE_AVATARS.length) % AVAILABLE_AVATARS.length);
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95 shrink-0"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        <div className="relative w-40 h-56 md:w-48 md:h-64 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAvatar.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <div
                className="relative w-full h-full rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => handleSelect(currentAvatar.id)}
              >
                <img
                  src={currentAvatar.path}
                  alt={currentAvatar.name}
                  className="w-full h-full object-cover object-[50%_12%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {profile?.avatarId === currentAvatar.id && (
                  <div
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: accentHex }}
                  >
                    <Check size={14} className="text-black" strokeWidth={3} />
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span
                    className="text-[10px] font-mono tracking-[0.2em] uppercase mb-1 block"
                    style={{ color: accentHex }}
                  >
                    {currentAvatar.rarity}
                  </span>
                  <h3 className="text-white font-bold text-lg leading-tight">
                    {t(`avatars.${currentAvatar.id}`, currentAvatar.name)}
                  </h3>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {isSaving && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
              <span className="text-cyan-400 text-xs font-mono animate-pulse tracking-widest">
                UPDATING...
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95 shrink-0"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {AVAILABLE_AVATARS.map((avatar, index) => (
          <button
            key={avatar.id}
            onClick={() => handleDotClick(index)}
            className={`w-8 h-8 rounded-lg overflow-hidden transition-all duration-150 ${
              index === currentIndex
                ? 'scale-110'
                : 'opacity-50 hover:opacity-80'
            }`}
            style={index === currentIndex ? { boxShadow: `0 0 0 2px ${avatar.themeColor || '#fff'}` } : {}}
          >
            <img
              src={avatar.path}
              alt={avatar.name}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {profile?.avatarId !== currentAvatar.id && (
        <button
          onClick={() => handleSelect(currentAvatar.id)}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
          style={{
            backgroundColor: accentHex,
            color: '#000'
          }}
        >
          SELECT THIS AVATAR
        </button>
      )}
    </div>
  );
};

export default AvatarCarouselQuick;