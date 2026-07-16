import { useEffect, useState } from 'react';
import { User, LogOut, Edit2, Check, X, Link2, Unlink, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useLux } from '@/context/LuxContext';
import { getAvatarPath } from '../../../config/avatars';
import { AvatarCarouselQuick } from '../components/AvatarCarouselQuick';
import { supabase } from '../../../services/supabase';
import { getLinkedIdentities, linkGoogleAccount, unlinkGoogleAccount } from '../../../services/supabaseService';
import { useTranslation } from 'react-i18next';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { deductGoldForNameChange } from '../../../services/economyService';

export const AccountSection = () => {
  const { t } = useTranslation();
  const { user, logout } = useSettings();
  const { profile, updateProfileLocally } = useAuth();
  const { updateLuxLocally } = useLux();
  const [avatarError, setAvatarError] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [linkedIdentities, setLinkedIdentities] = useState<any[]>([]);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(true);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [showCreatePasswordModal, setShowCreatePasswordModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const avatarPath = profile?.avatarId ? getAvatarPath(profile.avatarId) : user?.photoURL;

  useEffect(() => {
    setAvatarError(false);
  }, [avatarPath]);

  useEffect(() => {
    const fetchIdentities = async () => {
      try {
        const identities = await getLinkedIdentities();
        setLinkedIdentities(identities);
      } catch (error) {
        console.error('Failed to load identities', error);
      } finally {
        setIsLoadingIdentities(false);
      }
    };
    fetchIdentities();
  }, []);

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      await linkGoogleAccount();
      const identities = await getLinkedIdentities();
      setLinkedIdentities(identities);
    } catch (err: any) {
      if (err instanceof Error && err.message === 'IDENTITY_NOT_VIRGIN') {
        toast.error(
          "Esta cuenta de Google ya está registrada o vinculada a otro correo. Inicie sesión directamente o utilice otra cuenta para evitar pérdida de persistencia de datos.", 
          { duration: 8000, style: { maxWidth: '400px' } }
        );
      } else if (err?.message === 'Sign in window closed' || err?.message === 'User cancelled' || err?.message === 'popup_closed_by_user') {
        // Silently ignore user cancel actions
      } else {
        toast.error(err?.message || 'Error al vincular cuenta de Google.');
      }
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setIsLoadingIdentities(true);
    try {
      // Verificación de Contraseña (CRÍTICO) con consulta fresca a Supabase
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const hasEmailIdentity = linkedIdentities.some(id => id.provider === 'email');
      const hasLocalPassword = freshUser?.user_metadata?.has_password === true;
      if (!hasEmailIdentity && !hasLocalPassword) {
        setShowCreatePasswordModal(true);
        setIsLoadingIdentities(false);
        return;
      }

      await unlinkGoogleAccount();
      const updatedIdentities = await getLinkedIdentities();
      setLinkedIdentities(updatedIdentities);
      toast.success('Cuenta desvinculada correctamente.');
    } catch (error: any) {
      toast.error(error.message || 'Error al desvincular la cuenta.');
    } finally {
      setIsLoadingIdentities(false);
    }
  };

  const googleIdentity = linkedIdentities.find(id => id.provider === 'google');
  const hasPassword = user?.user_metadata?.has_password === true || linkedIdentities.some(id => id.provider === 'email');

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

    const targetId = user?.id || profile?.uid || profile?.id;
    if (!targetId) {
      setIsEditingName(false);
      return;
    }

    // Check name change cost
    const nameChangesCount = profile?.preferences?.nameChangesCount || 0;
    const currentGold = profile?.stats?.gold || 0;
    const price = 2000;

    let confirmMsg = '';
    if (nameChangesCount === 0) {
      confirmMsg = t('settings.confirmNameFirstFree', `Tu primer cambio de nombre es GRATIS. ¿Deseas cambiar tu nombre a "${newName}"?`);
    } else {
      if (currentGold < price) {
        toast.error(t('settings.insufficientGoldName', `Necesitas ${price} de oro para cambiar tu nombre.`));
        return;
      }
      confirmMsg = t('settings.confirmNameCost', `Cambiar tu nombre costará ${price} de oro. ¿Deseas cambiar tu nombre a "${newName}"?`);
    }

    const confirmChange = window.confirm(confirmMsg);
    if (!confirmChange) return;

    setIsSavingName(true);
    try {
      // 1. Deduct gold and increment change count on Supabase
      const res = await deductGoldForNameChange(targetId);
      if (!res.success || res.newGold === undefined || res.cost === undefined || res.nameChangesCount === undefined || !profile) {
        throw new Error(res.error || "Gold deduction failed");
      }

      // 2. Update display_name in Auth metadata
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { error: authError } = await supabase.auth.updateUser({ data: { display_name: newName } });
        if (authError) throw authError;
      }

      // 3. Update display_name in users table
      const { error: dbError } = await supabase.from('users').update({ display_name: newName }).eq('id', targetId);
      if (dbError) throw dbError;

      // 4. Update local state
      updateProfileLocally({ 
        displayName: newName,
        stats: {
          ...profile.stats,
          gold: res.newGold
        },
        preferences: {
          ...(profile.preferences || {}),
          nameChangesCount: res.nameChangesCount
        }
      });
      updateLuxLocally({ displayName: newName });
      
      if (res.cost > 0) {
        toast.success(t('settings.nameUpdatedWithCost', `Nombre actualizado. Se dedujeron ${res.cost} de oro.`));
      } else {
        toast.success(t('settings.nameUpdatedFree', 'Nombre de perfil actualizado con éxito (Gratis).'));
      }

      setIsEditingName(false);
    } catch (error: any) {
      console.error("Failed to update name:", error);
      toast.error(error.message || t('settings.nameUpdateFailed', 'Error al actualizar el nombre'));
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
          <h3 className="text-sm font-bold text-white tracking-wide">Seguridad</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent" />
        </div>

        <div className="bg-black/20 border border-white/5 rounded-[20px] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner text-indigo-400">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="text-white text-sm font-bold tracking-tight">Contraseña de la cuenta</h4>
                <p className="text-white/40 text-xs font-medium mt-0.5">
                  {hasPassword 
                    ? 'Actualiza tu contraseña de acceso' 
                    : 'Establece una contraseña para tu cuenta'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (hasPassword) {
                  setShowChangePasswordModal(true);
                } else {
                  setShowCreatePasswordModal(true);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-bold transition-all active:scale-95 border border-indigo-500/20"
            >
              <span>{hasPassword ? 'Cambiar Contraseña' : 'Crear Contraseña'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wide">{t('settings.linkedAccounts', 'Cuentas Vinculadas')}</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
        </div>

        <div className="bg-black/20 border border-white/5 rounded-[20px] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.56 0 2.96.54 4.06 1.48l3.04-3.04C17.46 2.19 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <h4 className="text-white text-sm font-bold tracking-tight">{t('settings.google', 'Google')}</h4>
                <p className="text-white/40 text-xs font-medium mt-0.5">
                  {isLoadingIdentities 
                    ? 'Comprobando estado...' 
                    : googleIdentity 
                      ? googleIdentity.identity_data?.email || 'Cuenta vinculada'
                      : 'Vincula tu cuenta para iniciar sesión de forma rápida'}
                </p>
              </div>
            </div>
            
            {!isLoadingIdentities && (
              googleIdentity ? (
                <button
                  onClick={handleUnlinkGoogle}
                  disabled={isLinkingGoogle || isLoadingIdentities}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all active:scale-95 border border-red-500/10 disabled:opacity-50"
                >
                  <Unlink size={14} className="shrink-0" />
                  <span>{t('settings.unlink', 'Desvincular')}</span>
                </button>
              ) : (
                <button
                  onClick={handleLinkGoogle}
                  disabled={isLinkingGoogle || isLoadingIdentities}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-bold transition-all active:scale-95 border border-indigo-500/20 disabled:opacity-50"
                >
                  {isLinkingGoogle ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300 shrink-0" />
                  ) : (
                    <Link2 size={14} className="shrink-0" />
                  )}
                  <span>{isLinkingGoogle ? 'Vinculando...' : 'Vincular Google'}</span>
                </button>
              )
            )}
          </div>
          {linkedIdentities.length <= 1 && !user?.user_metadata?.has_password && googleIdentity && (
            <p className="text-[10px] text-white/30 mt-3 pl-16">
              {t('settings.unlinkGoogleWarning', 'Necesitas al menos otro método de inicio de sesión (como Email) para desvincular Google.')}
            </p>
          )}
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
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:text-red-300 transition-colors group-hover:scale-110 duration-200">
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

      <CreatePasswordModal 
        isOpen={showCreatePasswordModal}
        onClose={() => setShowCreatePasswordModal(false)}
        onSuccess={async () => {
          try {
            const identities = await getLinkedIdentities();
            setLinkedIdentities(identities);
          } catch (err) {
            console.error(err);
          }
        }}
      />

      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        userEmail={user?.email || profile?.email}
      />
    </div>
  );
};

// ----------------------------------------------------
// CREATE PASSWORD MODAL (CRITICAL SECURITY INTERCEPTION FLOW)
// ----------------------------------------------------
interface CreatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePasswordModal = ({ isOpen, onClose, onSuccess }: CreatePasswordModalProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          has_password: true
        }
      });

      if (updateError) throw updateError;

      toast.success('Contraseña establecida con éxito. Tu cuenta ahora es segura.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la contraseña. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 450 }}
        className="relative z-10 w-full max-w-[360px] bg-[#0c0c0e] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden"
      >
        <div 
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)` }}
        />

        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-black text-white tracking-tight">Seguridad</h3>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-white/40 text-xs mb-6 leading-relaxed font-medium">
            Tu cuenta fue creada mediante Google. Para desvincular Google de forma segura, primero debes establecer una contraseña para mantener el acceso a tu cuenta.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-white/40">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-white/40">Confirmar Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {error && (
              <div className="text-rose-400 text-xs p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || !password || !confirmPassword}
              className="w-full py-4 mt-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{isSaving ? 'Guardando...' : 'Establecer Contraseña'}</span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

// ----------------------------------------------------
// CHANGE PASSWORD MODAL (CRITICAL SECURITY FLOW)
// ----------------------------------------------------
interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

const ChangePasswordModal = ({ isOpen, onClose, userEmail }: ChangePasswordModalProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente de la actual.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Verify current password by performing a silent background login
      if (userEmail) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword
        });

        if (loginError) {
          throw new Error('La contraseña actual es incorrecta.');
        }
      }

      // 2. Perform password update
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success('Contraseña actualizada con éxito.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar la contraseña. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 450 }}
        className="relative z-10 w-full max-w-[360px] bg-[#0c0c0e] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden"
      >
        <div 
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)` }}
        />

        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-black text-white tracking-tight">Cambiar Contraseña</h3>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-white/40">Contraseña Actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-white/40">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-white/40">Confirmar Nueva Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {error && (
              <div className="text-rose-400 text-xs p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-4 mt-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{isSaving ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
