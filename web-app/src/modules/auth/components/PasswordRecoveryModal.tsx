import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../services/supabase';
import { useAuth } from '@/context/AuthContext';
import { clearPasswordRecovery, usePasswordRecoveryPending } from '../passwordRecovery';

const MIN_LENGTH = 6; // same rule as sign-up

/** Shown after the user opens the "reset password" email link: they are signed in and must choose a new password. */
export const PasswordRecoveryModal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pending = usePasswordRecoveryPending();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pending || !user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) return setError(t('auth.errors.weakPassword', 'La contraseña debe tener al menos 6 caracteres.'));
    if (password !== confirm) return setError(t('auth.errors.passwordMismatch', 'Las contraseñas no coinciden'));
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.success(t('auth.recovery.done', 'Contraseña actualizada.'));
      setPassword('');
      setConfirm('');
      clearPasswordRecovery();
    } catch (err: any) {
      setError(err?.message || t('auth.errors.generic', 'No se pudo actualizar la contraseña.'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-indigo-500/60';

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-6" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-[#0a0a0f] p-6">
        <h2 className="text-lg font-bold text-white">{t('auth.recovery.title', 'Crea tu nueva contraseña')}</h2>
        <p className="text-xs text-white/50">{t('auth.recovery.desc', 'Elige una contraseña nueva para tu cuenta.')}</p>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="password" autoComplete="new-password" className={field} placeholder={t('auth.recovery.new', 'Nueva contraseña')}
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input type="password" autoComplete="new-password" className={field} placeholder={t('auth.fields.confirmPassword', 'Confirmar contraseña')}
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        {error && <div className="text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-xl">{error}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={clearPasswordRecovery} disabled={saving}
            className="h-12 px-4 rounded-xl text-white/60 bg-white/5 text-sm font-semibold">
            {t('settings.cancel', 'Cancelar')}
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.recovery.save', 'Guardar contraseña')}
          </button>
        </div>
      </form>
    </div>
  );
};
