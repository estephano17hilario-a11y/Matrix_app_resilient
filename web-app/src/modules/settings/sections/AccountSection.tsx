import { useEffect, useState } from 'react';
import { User, LogOut, Edit2, Check, X } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { getAvatarPath } from '../../../config/avatars';
import { AvatarCarouselQuick } from '../components/AvatarCarouselQuick';
import { supabase } from '../../../services/supabase';
import { useTranslation } from 'react-i18next';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';

export const AccountSection = () => {
  const { t } = useTranslation();
  const { user, logout } = useSettings();
  const { profile, updateProfileLocally } = useAuth();
  const [avatarError, setAvatarError] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const avatarPath = profile?.avatarId ? getAvatarPath(profile.avatarId) : user?.photoURL;

  useEffect(() => {
    setAvatarError(false);
  }, [avatarPath]);

  const formattedName = profile?.displayName || ((user?.displayName && !user.displayName.includes('@'))
    ? user.displayName
    : (user?.email ? user.email.split('@')[0] : t('settings.operative', 'Operative')));

  const handleStartEdit = () => {
    setEditName(formattedName);
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditName('');
  };

  const handleSaveName = async () => {
    const newName = editName.trim();
    if (!newName || newName.length < 2 || newName.length > 12 || newName === formattedName) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.auth.updateUser({ data: { display_name: newName } });
      }

      if (user?.uid) {
        await supabase.from('users').update({ display_name: newName }).eq('id', user.uid);
        updateProfileLocally({ displayName: newName });
      }

      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="space-y-8 pb-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">{t('settings.tabs.profile', 'Profile')}</h2>
          <p className="text-white/40 text-sm">{t('settings.profileDesc', 'Your identity and connection status.')}</p>
        </div>

      <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 relative overflow-hidden group">
        <div 
          className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
          style={{ 
            background: `radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)`,
            willChange: 'opacity'
          }} 
        />
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-[20px] bg-black/40 border border-white/[0.1] overflow-hidden shrink-0">
            {avatarPath && !avatarError ? (
              <img
                src={avatarPath}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={24} className="text-white/20" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    if (e.target.value.length <= 12) {
                      setEditName(e.target.value);
                    }
                  }}
                  disabled={isSavingName}
                  className="bg-black/50 border border-white/20 rounded-lg px-3 py-1 text-white text-sm font-normal outline-none focus:border-indigo-500 w-full max-w-[180px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName || editName.trim().length < 2}
                  className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSavingName}
                  className="p-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h3 className={`text-sm truncate ${
                  profile?.plan === 'PRO' || user?.plan === 'PRO' 
                    ? 'font-black text-galactic drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]'
                    : 'font-light text-white'
                }`}>
                  {formattedName}
                </h3>
                <button
                  onClick={handleStartEdit}
                  className="text-white/30 hover:text-white/80 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <p className="text-[11px] text-white/40 font-mono truncate mt-0.5 tracking-wider">{user?.email}</p>
          </div>
        </div>

        <div className="pt-2 relative z-10">
          <AvatarCarouselQuick />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wide">{t('settings.session', 'Session')}</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-red-500/20 to-transparent" />
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-red-500/5 to-red-900/10 hover:from-red-500/10 hover:to-red-900/20 rounded-[20px] border border-red-500/10 hover:border-red-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:text-red-300 transition-colors group-hover:scale-110 duration-300">
            <LogOut size={20} />
          </div>
          <div className="text-left">
            <span className="block text-red-200 font-bold text-base group-hover:text-white transition-colors tracking-tight">
              {t('settings.logoutAccount', 'Sign out of this account')}
            </span>
            <span className="block text-red-500/50 text-xs font-medium mt-0.5">
              {t('settings.safeLogout', 'Safe logout and local data sync')}
            </span>
          </div>
        </button>
      </div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          // Small timeout to allow the modal exit animation to start, making it feel smoother and faster without freezing the UI.
          setTimeout(() => logout(), 50);
        }}
        title={t('settings.logoutConfirmTitle', 'ARE YOU SURE?')}
        message={t('settings.logoutConfirmMessage', 'You are about to sign out. Your data is safely synced.')}
        confirmText={t('settings.logoutConfirmBtn', 'Yes, Sign Out')}
        cancelText={t('settings.cancel', 'Cancel')}
        variant="danger"
      />
    </div>
  );
};
