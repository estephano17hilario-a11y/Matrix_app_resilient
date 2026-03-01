import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Camera, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { getAvatarPath } from '../../../config/avatars';
import { AvatarSelector } from '../../customization/AvatarSelector';
import { ArchetypeSelector } from '../../customization/ArchetypeSelector';

export const AccountSection = () => {
  const { user, isPro, logout } = useSettings();
  const { profile } = useAuth();
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [openPanels, setOpenPanels] = useState({ profile: true, archetype: true, subscription: !isPro, danger: true });
  const [avatarError, setAvatarError] = useState(false);

  const avatarPath = profile?.avatarId ? getAvatarPath(profile.avatarId) : user?.photoURL;

  useEffect(() => {
    setAvatarError(false);
  }, [avatarPath]);

  const togglePanel = (key: 'profile' | 'archetype' | 'subscription' | 'danger') => {
    setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 🛡️ NAME LOGIC: If displayName is an email, extract username.
  const formattedName = (user?.displayName && !user.displayName.includes('@')) 
      ? user.displayName 
      : (user?.email ? user.email.split('@')[0] : 'Operative');

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-1 md:space-y-2">
        <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <User className="text-pink-400" size={24} />
          Identity & Access
        </h2>
        <p className="text-white/40 text-xs md:text-base max-w-2xl">
          Manage your digital footprint, avatar manifestation, and subscription tier.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => togglePanel('profile')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User size={16} className="text-pink-400" />
            Avatar & Identity
          </div>
          {openPanels.profile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence initial={false}>
          {openPanels.profile && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none rounded-2xl overflow-hidden" />

              <div className="relative z-10 flex items-center gap-4 md:gap-6">
                  <div className="relative">
                     <button 
                        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-pink-500/50 transition-all group-avatar"
                     >
                        {avatarPath && !avatarError ? (
                          <img 
                            src={avatarPath} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <User size={28} className="text-white/20" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-avatar-hover:opacity-100 transition-opacity">
                            <Camera size={20} className="text-white" />
                        </div>
                     </button>
                     <button 
                       onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                       className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-sm transition-transform active:scale-95 md:hidden"
                     >
                       <Camera size={12} />
                     </button>
                  </div>

                  <div className="space-y-1">
                     <h3 className="text-base md:text-xl font-bold text-white">{formattedName}</h3>
                     <p className="text-xs md:text-sm text-white/40 font-mono">{user?.email}</p>
                     <button 
                        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                        className="text-xs text-pink-400 hover:text-pink-300 font-medium tracking-wide flex items-center gap-1 mt-1"
                     >
                        <Camera size={12} />
                        CHANGE APPEARANCE
                     </button>
                  </div>
              </div>

              <AnimatePresence>
                  {showAvatarSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="border-t border-white/5 pt-4 mt-4"
                    >
                       <AvatarSelector onClose={() => setShowAvatarSelector(false)} />
                    </motion.div>
                  )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => togglePanel('archetype')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap size={16} className="text-indigo-400" />
            Archetype Class
          </div>
          {openPanels.archetype ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence initial={false}>
          {openPanels.archetype && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <ArchetypeSelector />
                
                {/* UX HELP: Direct user to Avatar selector if they are confused */}
                <div className="mt-6 pt-4 border-t border-white/5 text-center">
                    <p className="text-xs text-white/30">
                        Looking for visual skins? 
                        <button 
                            onClick={() => { 
                                setOpenPanels(prev => ({ ...prev, profile: true, archetype: false })); 
                                setShowAvatarSelector(true);
                                // Scroll to top smoothly
                                document.getElementById('settings-content')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="ml-1 text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors"
                        >
                            Change Avatar Appearance
                        </button>
                    </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => togglePanel('danger')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LogOut size={16} className="text-red-400" />
            Session Control
          </div>
          {openPanels.danger ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence initial={false}>
          {openPanels.danger && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-red-500/5 border border-red-500/10 rounded-2xl p-1"
            >
              <button
                onClick={logout}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-500/10 transition-colors group"
              >
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:text-red-300 transition-colors">
                      <LogOut size={20} />
                    </div>
                    <div className="text-left">
                      <span className="block text-red-200 font-medium group-hover:text-white transition-colors">Terminate Session</span>
                      <span className="block text-red-500/40 text-xs">Safe logout and local data sync</span>
                    </div>
                 </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
