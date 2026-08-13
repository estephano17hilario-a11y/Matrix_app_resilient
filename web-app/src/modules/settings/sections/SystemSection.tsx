import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

import { Globe, BarChart3, Hexagon, Bell, BatteryMedium, Smartphone, Settings2, Calendar, Layers, Lock, LineChart, LayoutGrid, Zap, Brain, Swords, CheckCircle2, LayoutTemplate, ShoppingBag, Activity, PenLine, Coins, Quote, ShieldAlert, Volume2 } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import FocusSession from '@/plugins/FocusPlugin';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import toast from 'react-hot-toast';
import { useLux } from '@/context/LuxContext';
import { NotificationTone, TONE_DEFINITIONS } from '../../../services/notificationTonesService';
import { PersistenceService } from '../../../services/persistence';
import { supabase } from '../../../services/supabase';
import { LocalNotifications } from '@capacitor/local-notifications';

export const SystemSection = () => {
 const { t, i18n } = useTranslation();
 const { 
 habitSectionControl, updateHabitSectionControl, 
 defaultHabitView, updateDefaultHabitView, 
 defaultChartMode, setDefaultChartMode, 
 weekStartDay, updateWeekStartDay,
 defaultChartViews, updateDefaultChartViews,
 defaultChartVisibility, updateDefaultChartVisibility,
 defaultProjectView, updateDefaultProjectView,
 defaultTaskFilters, updateDefaultTaskFilters,
 notesDefaultTab, updateNotesDefaultTab,
 dashboardStyle, setDashboardStyle,
 attributes,
 isPro
 } = useSettings();

  const { user, updateLuxLocally } = useLux();
  const [permissions, setPermissions] = useState({ notifications: false, battery: false, overlay: false });
  const [isNative, setIsNative] = useState(false);

  const [currentTone, setCurrentTone] = useState<NotificationTone>(() => {
    try {
      const saved = localStorage.getItem('matrix_notification_tone');
      if (saved) return saved as NotificationTone;
    } catch (e) {}
    return 'NEUTRAL';
  });

  const [antiPhrase, setAntiPhrase] = useState<string>(() => {
    try {
      return localStorage.getItem('matrix_anti_procrastination_phrase') || '';
    } catch (e) { return ''; }
  });

  const [splashPhrase, setSplashPhrase] = useState<string>(() => {
    try {
      return localStorage.getItem('matrix_splash_phrase') || 'Sin Excusas';
    } catch (e) { return 'Sin Excusas'; }
  });

  const [notesLayoutMode, setNotesLayoutMode] = useState<'GRID' | 'LIST'>(() => {
    try {
      return localStorage.getItem('notes_layout_mode') === 'LIST' ? 'LIST' : 'GRID';
    } catch (e) {
      return 'GRID';
    }
  });

  const updateNotesLayoutMode = (mode: 'GRID' | 'LIST') => {
    setNotesLayoutMode(mode);
    localStorage.setItem('notes_layout_mode', mode);
    toast.success('Preferencia de vista de notas actualizada');
  };

  const [pendingTone, setPendingTone] = useState<NotificationTone | null>(null);
  const [pendingPhraseType, setPendingPhraseType] = useState<'ANTI' | 'SPLASH' | null>(null);

  useEffect(() => {
    if (pendingTone || pendingPhraseType) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [pendingTone, pendingPhraseType]);

  const persistGoldAndStats = async (cost: number): Promise<boolean> => {
    const userGold = user?.stats?.gold || 0;
    if (userGold < cost) {
      toast.error(`🚫 Oro insuficiente. Requieres ${cost.toLocaleString()} Oro (Tienes: ${userGold.toLocaleString()})`);
      return false;
    }
    const updatedGold = userGold - cost;
    const updatedStats = { ...user?.stats, gold: updatedGold };

    // 1. Local State Update
    updateLuxLocally({ stats: updatedStats as any });

    // 2. Local Storage & Persistence Service Update
    const userId = user?.id || (user as any)?.uid;
    if (userId) {
      const mergedProfile = { ...user, stats: updatedStats };
      PersistenceService.saveProfile(mergedProfile as any);

      // 3. Supabase Database Update (Permanent cross-reload persistence)
      try {
        const { error } = await supabase
          .from('users')
          .update({ 
            stats: updatedStats, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', userId);

        if (error) console.error('[Settings] Supabase gold update error:', error);
        else console.log('[Settings] Supabase gold updated successfully!');
      } catch (err) {
        console.error('[Settings] Error saving gold to Supabase:', err);
      }
    }
    return true;
  };

  const handleRequestChangeTone = (newTone: NotificationTone) => {
    if (newTone === currentTone) return;
    setPendingTone(newTone);
  };

  const handleConfirmToneChange = async () => {
    if (!pendingTone) return;
    const targetTone = pendingTone;
    setPendingTone(null);
    const success = await persistGoldAndStats(2000);
    if (success) {
      localStorage.setItem('matrix_notification_tone', targetTone);
      setCurrentTone(targetTone);
      toast.success('⚡ Tono de notificación actualizado (-2,000 Oro)');
    }
  };

  const handleRequestSaveAntiPhrase = () => {
    const clean = antiPhrase.trim().slice(0, 50);
    const saved = localStorage.getItem('matrix_anti_procrastination_phrase') || '';
    if (clean === saved) {
      toast('Sin cambios que guardar');
      return;
    }
    setPendingPhraseType('ANTI');
  };

  const handleConfirmAntiPhraseSave = async () => {
    setPendingPhraseType(null);
    const clean = antiPhrase.trim().slice(0, 50);
    const success = await persistGoldAndStats(500);
    if (success) {
      localStorage.setItem('matrix_anti_procrastination_phrase', clean);
      toast.success('💬 Frase anti-procrastinación guardada (-500 Oro)');
    }
  };

  const handleRequestSaveSplashPhrase = () => {
    const clean = (splashPhrase || 'Sin Excusas').trim().slice(0, 20);
    const saved = localStorage.getItem('matrix_splash_phrase') || 'Sin Excusas';
    if (clean === saved) {
      toast('Sin cambios que guardar');
      return;
    }
    setPendingPhraseType('SPLASH');
  };

  const handleConfirmSplashPhraseSave = async () => {
    setPendingPhraseType(null);
    const clean = (splashPhrase || 'Sin Excusas').trim().slice(0, 20);
    const success = await persistGoldAndStats(500);
    if (success) {
      localStorage.setItem('matrix_splash_phrase', clean);
      toast.success('✨ Frase de pantalla de carga guardada (-500 Oro)');
    }
  };

 const [topQuickActions, setTopQuickActions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('matrix_top_quick_actions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['SETTINGS', 'STORE'];
  });

  const updateTopQuickActions = (newActions: string[]) => {
    setTopQuickActions(newActions);
    localStorage.setItem('matrix_top_quick_actions', JSON.stringify(newActions));
    window.dispatchEvent(new CustomEvent('top-quick-actions-changed'));
    toast.success('Acciones rápidas de la cabecera actualizadas');
  };

  const handleOpenDockConfig = () => {
    window.dispatchEvent(new CustomEvent('open-dock-config'));
  };

 useEffect(() => {
 const checkNativeStatus = async () => {
 const platform = Capacitor.getPlatform();
 setIsNative(platform === 'android' || platform === 'ios');

 if (platform === 'android') {
 try {
 const perms = await FocusSession.checkPermissions();
 setPermissions({ ...perms, overlay: false });
 } catch (e) {
 console.error("Failed to check native permissions", e);
 }
 } else {
 setPermissions({
 notifications: Notification.permission === 'granted',
 battery: true,
 overlay: true
 });
 }
 };

 checkNativeStatus();
 window.addEventListener('focus', checkNativeStatus);
 
 let appStateListener: any;
 if (Capacitor.isNativePlatform()) {
 App.addListener('appStateChange', ({ isActive }) => {
 if (isActive) checkNativeStatus();
 }).then(listener => appStateListener = listener);
 }

 return () => {
 window.removeEventListener('focus', checkNativeStatus);
 if (appStateListener) appStateListener.remove();
 };
 }, []);

 const changeLanguage = (lng: string) => {
 i18n.changeLanguage(lng);
 localStorage.setItem('i18nextLng', lng);
 };

 const handleRequestNotifications = async () => {
 if (!isNative) {
 const permission = await Notification.requestPermission();
 setPermissions(prev => ({ ...prev, notifications: permission === 'granted' }));
 if (permission === 'granted') toast.success(t('settings.notificationsEnabled', 'Notifications enabled'));
 return;
 }
 try {
 // First try native prompt (works on Android 13+)
 try {
 const perm = await LocalNotifications.requestPermissions();
 if (perm.display === 'granted') {
 setPermissions(prev => ({ ...prev, notifications: true }));
 toast.success(t('settings.notificationsEnabled', 'Notifications enabled'));
 return;
 }
 } catch (promptError) {
 console.warn("Native permission prompt failed, falling back to settings", promptError);
 }
 
 // Fallback to settings if prompt was dismissed/denied or unsupported
 await FocusSession.openNotificationSettings();
 toast.success("Opening notification settings...");
 } catch (e) {
 console.error(e);
 toast.error("Failed to open notification settings");
 }
 };

 const handleRequestBattery = async () => {
 if (!isNative) {
 toast.error("Battery optimization is Android-only");
 return;
 }
 try {
 await FocusSession.requestBatteryPermission();
 toast.success("Opening battery settings...");
 } catch (e) {
 console.error(e);
 toast.error("Failed to open battery settings");
 }
 };

 return (
 <div className="space-y-8 pb-4">
 <div className="space-y-1">
 <h2 className="text-lg font-semibold text-white">{t('settings.tabs.prefs', 'System')}</h2>
 <p className="text-white/40 text-sm">{t('settings.systemDesc', 'Language, permissions, and navigation.')}</p>
 </div>

 <div className="space-y-4">
 {/* Language */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
 <Globe size={18} className="text-indigo-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.language', 'Language')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.languageDesc', 'Select system language')}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => changeLanguage('en')}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 i18n.language === 'en' 
 ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
 : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 <span className="text-lg">🇺🇸</span>
 <span>{t('settings.english', 'English')}</span>
 </button>
 <button
 onClick={() => changeLanguage('es')}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 i18n.language === 'es' 
 ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
 : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 <span className="text-lg">🇪🇸</span>
 <span>{t('settings.spanish', 'Español')}</span>
 </button>
 </div>
 </div>

 {/* Native Permissions */}
 {isNative && (
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
 <Smartphone size={18} className="text-emerald-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.nativePermissions', 'Native Permissions')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.nativePermissionsDesc', 'System access for background sync')}</div>
 </div>
 </div>

 <div className="space-y-3">
 <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
 <div className="flex items-center gap-3">
 <div className={cn("p-2 rounded-lg", permissions.notifications ? "bg-emerald-500/20" : "bg-white/5")}>
 <Bell size={18} className={permissions.notifications ? "text-emerald-400" : "text-white/40"} />
 </div>
 <span className="text-sm font-bold text-white/90">{t('settings.notifications', 'Notifications')}</span>
 </div>
 <button
 onClick={handleRequestNotifications}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-150 active:scale-95",
 permissions.notifications 
 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
 : "bg-white text-black hover:bg-gray-200"
 )}
 >
 {permissions.notifications ? t('settings.active', 'Active') : t('settings.enable', 'Enable')}
 </button>
 </div>

 <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
 <div className="flex items-center gap-3">
 <div className={cn("p-2 rounded-lg", permissions.battery ? "bg-emerald-500/20" : "bg-white/5")}>
 <BatteryMedium size={18} className={permissions.battery ? "text-emerald-400" : "text-white/40"} />
 </div>
 <span className="text-sm font-bold text-white/90">{t('settings.batteryOptimization', 'Battery Optimization')}</span>
 </div>
 <button
 onClick={handleRequestBattery}
 disabled={permissions.battery}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-150 active:scale-95",
 permissions.battery 
 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default" 
 : "bg-white text-black hover:bg-gray-200"
 )}
 >
 {permissions.battery ? t('settings.unrestricted', 'Unrestricted') : t('settings.disable', 'Disable')}
 </button>
 </div>
 </div>
 </div>
 )}

  {/* NOTIFICATION TONES & CUSTOM PHRASES (GOLD ECONOMY) */}
  <div className="bg-[#111] border border-white/10 rounded-2xl p-5 space-y-5 transition-colors">
    <div className="flex items-center justify-between border-b border-white/10 pb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
          <Bell size={20} />
        </div>
        <div>
          <div className="text-base font-black text-white tracking-tight flex items-center gap-2">
            Tono de Notificaciones & Frases de Poder
          </div>
          <div className="text-xs text-white/50">Personaliza la voz de tu coach y tus alertas</div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-amber-400 font-bold font-mono text-xs bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
        <Coins size={14} /> {(user?.stats?.gold || 0).toLocaleString()} Oro
      </div>
    </div>

    {/* Tone Selector */}
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
          Tono de Notificación Actual
        </span>
        <span className="text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
          Cambiar cuesta 2,000 Oro 🪙
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {(Object.keys(TONE_DEFINITIONS) as NotificationTone[]).map((toneKey) => {
          const tone = TONE_DEFINITIONS[toneKey];
          const isSelected = currentTone === toneKey;

          return (
            <button
              key={toneKey}
              onClick={() => handleRequestChangeTone(toneKey)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 active:scale-95",
                isSelected
                  ? "bg-amber-500/15 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              )}
            >
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                  {tone.badge}
                </span>
                <div className="text-xs font-bold text-white mt-1">{tone.name}</div>
              </div>
              <span className="text-[9px] font-bold text-white/40 uppercase">
                {isSelected ? '✓ Seleccionado' : '2,000 Oro'}
              </span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Phrase Editors */}
    <div className="pt-2 border-t border-white/10 space-y-4">
      {/* Anti-Procrastination Phrase */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-white/90 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-rose-400" />
            Frase Anti-Procrastinación (Máx 50 caracteres)
          </label>
          <span className="text-[10px] font-bold text-amber-400 font-mono">
            500 Oro 🪙
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={50}
            value={antiPhrase}
            onChange={(e) => setAntiPhrase(e.target.value)}
            placeholder="Ej: ¿Vas a dejar que te ganen hoy?"
            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={handleRequestSaveAntiPhrase}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            Guardar (500g)
          </button>
        </div>
      </div>

      {/* Splash Screen Subtitle Phrase */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-white/90 flex items-center gap-1.5">
            <Volume2 size={14} className="text-cyan-400" />
            Frase de Pantalla de Carga LUX (Máx 20 caracteres)
          </label>
          <span className="text-[10px] font-bold text-amber-400 font-mono">
            500 Oro 🪙
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={20}
            value={splashPhrase}
            onChange={(e) => setSplashPhrase(e.target.value)}
            placeholder="Ej: Sin Excusas"
            className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 font-semibold"
          />
          <button
            onClick={handleRequestSaveSplashPhrase}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            Guardar (500g)
          </button>
        </div>
      </div>
    </div>
  </div>

 {/* Chart Style */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 transition-colors">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
 <BarChart3 size={18} className="text-cyan-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.startupChart', 'Chart Style')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.startupChartDesc', 'Default visualization')}</div>
 </div>
 </div>

 <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
 <button
 onClick={() => setDefaultChartMode('RADAR')}
 className={cn(
 "p-2 rounded-lg transition-colors duration-150 flex items-center justify-center active:scale-95",
 defaultChartMode === 'RADAR' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-white/40 hover:text-white/80 hover:bg-white/10 border border-transparent"
 )}
 >
 <Hexagon size={16} />
 </button>
 <button
 onClick={() => setDefaultChartMode('BAR')}
 className={cn(
 "p-2 rounded-lg transition-colors duration-150 flex items-center justify-center active:scale-95",
 defaultChartMode === 'BAR' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-white/40 hover:text-white/80 hover:bg-white/10 border border-transparent"
 )}
 >
 <BarChart3 size={16} />
 </button>
 </div>
 </div>
 </div>

 {/* Section Controls */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 transition-colors">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20">
 <Settings2 size={18} className="text-fuchsia-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.sectionControls', 'Section Controls')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.sectionControlsDesc', 'Show habit section buttons')}</div>
 </div>
 </div>

 <button
 onClick={() => updateHabitSectionControl(habitSectionControl === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE')}
 className={cn(
 "w-12 h-6 rounded-full transition-colors duration-150 relative border",
 habitSectionControl === 'VISIBLE' 
 ? "bg-fuchsia-500/30 border-fuchsia-500/50" 
 : "bg-white/10 border-white/10"
 )}
 >
 <div
 className={cn(
 "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-150",
 habitSectionControl === 'VISIBLE' ? "bg-fuchsia-400 left-[26px]" : "bg-white/60 left-1"
 )}
 />
 </button>
 </div>
 </div>

 {/* Dashboard Layout Style */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
 <LayoutTemplate size={18} className="text-pink-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.dashboardLayout', 'Dashboard Layout')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.selectDockStyle', 'Select dock style')}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => setDashboardStyle('BORDER')}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 dashboardStyle === 'BORDER' || dashboardStyle === 'LIQUID' || dashboardStyle === 'GLASS'
 ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" 
 : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 {t('settings.legacyDock', 'Legacy Dock')}
 </button>
 <button
 onClick={() => setDashboardStyle('AURA')}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 dashboardStyle === 'AURA'
 ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" 
 : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 {t('settings.auraDock', 'Aura Dock')}
 </button>
 </div>
 </div>

 {/* Customization of Drawer (+) and Top Quick Actions */}
  <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
          <LayoutGrid size={18} className="text-purple-400" />
        </div>
        <div>
          <div className="text-base font-bold text-white tracking-tight">Menú Desplegable (+)</div>
          <div className="text-xs text-white/40 font-medium">Personaliza los accesos rápidos y el orden del botón (+)</div>
        </div>
      </div>
      
      <button
        onClick={handleOpenDockConfig}
        className="px-4 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
      >
        <span>Personalizar</span>
      </button>
    </div>
  </div>

  {/* Top HUD Action Icons */}
  <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
        <Zap size={18} className="text-amber-400" />
      </div>
      <div>
        <div className="text-base font-bold text-white tracking-tight">Acciones Rápidas del HUD (Cabecera)</div>
        <div className="text-xs text-white/40 font-medium">Selecciona los 2 íconos rápidos de forma individual junto a tu avatar</div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Slot 1 Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
          Slot 1 (Acción Izquierda)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { id: 'SETTINGS', label: 'Ajustes', icon: Settings2 },
            { id: 'STORE', label: 'Tienda', icon: ShoppingBag },
            { id: 'FEED', label: 'Feed', icon: Activity },
            { id: 'RIVALS', label: 'Duelos', icon: Swords },
            { id: 'NOTES', label: 'Notas', icon: PenLine },
          ].map((opt) => {
            const isSelected = topQuickActions[0] === opt.id;
            return (
              <button
                key={`slot1-${opt.id}`}
                onClick={() => {
                  const updated = [opt.id, topQuickActions[1] || 'STORE'];
                  updateTopQuickActions(updated);
                }}
                className={cn(
                  "py-2 px-3 rounded-xl transition-all text-xs font-bold active:scale-95 border flex items-center gap-2 justify-center",
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                    : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10"
                )}
              >
                <opt.icon size={12} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slot 2 Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
          Slot 2 (Acción Derecha)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { id: 'SETTINGS', label: 'Ajustes', icon: Settings2 },
            { id: 'STORE', label: 'Tienda', icon: ShoppingBag },
            { id: 'FEED', label: 'Feed', icon: Activity },
            { id: 'RIVALS', label: 'Duelos', icon: Swords },
            { id: 'NOTES', label: 'Notas', icon: PenLine },
          ].map((opt) => {
            const isSelected = topQuickActions[1] === opt.id;
            return (
              <button
                key={`slot2-${opt.id}`}
                onClick={() => {
                  const updated = [topQuickActions[0] || 'SETTINGS', opt.id];
                  updateTopQuickActions(updated);
                }}
                className={cn(
                  "py-2 px-3 rounded-xl transition-all text-xs font-bold active:scale-95 border flex items-center gap-2 justify-center",
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                    : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10"
                )}
              >
                <opt.icon size={12} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>

 {/* Default Habit View */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
 <Layers size={18} className="text-orange-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.defaultHabitView', 'Default Habits View')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.defaultHabitViewDesc', 'Default layout for Habits')}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => updateDefaultHabitView('DEFAULT')}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 defaultHabitView === 'DEFAULT' ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 {t('habits.viewPriority', 'Prioridad')}
 </button>
 <button
 onClick={() => updateDefaultHabitView('CHRONOLOGICAL')}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 defaultHabitView === 'CHRONOLOGICAL' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 {t('habits.viewChronological', 'Cronológico')}
 </button>
 </div>
 </div>

  {/* Default Chart Visibility */}
  <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
        <LineChart size={18} className="text-purple-400" />
      </div>
      <div>
        <div className="text-base font-bold text-white tracking-tight">{t('settings.defaultChartVisibility', 'Default Chart States')}</div>
        <div className="text-xs text-white/40 font-medium">{t('settings.defaultChartVisibilityDesc', 'Initial state (maximized or minimized) for analytics')}</div>
      </div>
    </div>

    <div className="space-y-3">
      {[
        { key: 'tasks', label: t('settings.charts.tasks', 'Daily Caps / XP Limits') },
        { key: 'habits', label: t('settings.charts.habits', 'Habits Consistency') },
        { key: 'focus', label: t('settings.charts.focus', 'Focus Sessions') }
      ].map((item) => {
        const isMaximized = (defaultChartVisibility?.[item.key as 'tasks'|'habits'|'focus'] !== false);
        return (
          <div key={item.key} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0 last:pb-0">
            <span className="text-xs font-bold text-white/70">{item.label}</span>
            <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-white/5 scale-95 origin-right">
              <button
                onClick={() => updateDefaultChartVisibility({
                  ...(defaultChartVisibility || { tasks: true, habits: true, focus: true }),
                  [item.key]: true
                })}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all duration-150 active:scale-95",
                  isMaximized 
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t('settings.charts.maximized', 'Maximized')}
              </button>
              <button
                onClick={() => updateDefaultChartVisibility({
                  ...(defaultChartVisibility || { tasks: true, habits: true, focus: true }),
                  [item.key]: false
                })}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all duration-150 active:scale-95",
                  !isMaximized 
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t('settings.charts.minimized', 'Minimized')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>

 {/* Week Starts On */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
 <Calendar size={18} className="text-cyan-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.weekStartsOn', 'Week Starts On')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.weekStartsOnDesc', 'First day of week for calendars')}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => updateWeekStartDay(1)}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 weekStartDay === 1 
 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
 : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 <span className="text-lg">📅</span>
 <span>{t('common.monday', 'Monday')}</span>
 </button>
 <button
 onClick={() => updateWeekStartDay(0)}
 className={cn(
 "flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-150 text-sm font-bold active:scale-95",
 weekStartDay === 0 
 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
 : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
 )}
 >
 <span className="text-lg">🗓️</span>
 <span>{t('common.sunday', 'Sunday')}</span>
 </button>
 </div>
 </div>

 {/* Default Chart Views */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors relative overflow-hidden">
 {/* Glassmorphism Blur Effect */}
 <div className="absolute inset-0 bg-white/[0.05] z-0 pointer-events-none" />
 
 <div className="flex items-center gap-3 relative z-10">
 <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
 <LineChart size={18} className="text-purple-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.defaultChartViews', 'Default Chart Views')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.defaultChartViewsDesc', 'Default timeframes for analytics')}</div>
 </div>
 </div>

 <div className="space-y-4 relative z-10">
 {([
 { key: 'habits', label: 'Habits', color: 'rose' },
 { key: 'focus', label: 'Focus', color: 'amber' },
 { key: 'projects', label: 'Projects', color: 'emerald' },
 { key: 'notes', label: 'Notes', color: 'cyan' }
 ] as const).map(section => {
 const currentVal = defaultChartViews?.[section.key] || 'WEEK';
 
 let options: Array<{ val: any; label: string; pro?: boolean }> = [];
 if (section.key === 'habits') {
 options = [
 { val: 'WEEK', label: '1W' },
 { val: 'MONTH', label: '1M' },
 { val: 'YEAR', label: '1Y', pro: true }
 ];
 } else if (section.key === 'focus' || section.key === 'projects') {
 options = [
 { val: 'WEEK', label: '1W' },
 { val: '8_WEEKS', label: '8W' },
 { val: 'MONTH', label: '1M', pro: true },
 { val: '3_MONTHS', label: '3M', pro: true },
 { val: 'YEAR', label: '1Y', pro: true }
 ];
 } else if (section.key === 'notes') {
 options = [
 { val: 'WEEK', label: '1W' },
 { val: 'MONTH', label: '1M' }
 ];
 }

 return (
 <div key={section.key} className="flex flex-col gap-2">
 <div className="text-xs font-bold text-white/60 uppercase tracking-widest">{t(`settings.chartSection.${section.key}`, section.label)}</div>
 <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 overflow-x-auto no-scrollbar">
 {options.map(opt => {
 const isActive = currentVal === opt.val;
 const isDisabled = 'pro' in opt && opt.pro && !isPro;
 
 return (
 <button
 key={opt.val}
 onClick={() => {
 if (isDisabled) return;
 updateDefaultChartViews({
 ...(defaultChartViews || {}),
 [section.key]: opt.val
 });
 }}
 className={cn(
 "flex-1 min-w-[48px] p-2 rounded-lg transition-all duration-150 flex flex-col items-center justify-center relative",
 isActive ? `bg-${section.color}-500/20 text-${section.color}-400 border border-${section.color}-500/30 shadow-[0_0_10px_rgba(255,255,255,0.05)]` : "text-white/40 hover:text-white/80 hover:bg-white/10 border border-transparent",
 isDisabled ? "opacity-50 cursor-not-allowed grayscale" : "active:scale-95"
 )}
 >
 <span className="text-[10px] font-bold z-10">{opt.label}</span>
 {opt.pro && !isPro && (
 <Lock size={8} className="absolute top-1 right-1 text-white/30" />
 )}
 </button>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Default Projects View */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors relative overflow-hidden">
 <div className="absolute inset-0 bg-white/[0.05] z-0 pointer-events-none" />
 
 <div className="flex items-center gap-3 relative z-10">
 <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
 <LayoutGrid size={18} className="text-emerald-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.defaultProjectView', 'Projects Layout')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.defaultProjectViewDesc', 'Default division for Projects view')}</div>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-2 relative z-10">
 {[
 { val: 'PROJECT', label: t('projects.viewByProject', 'By Project'), pro: true },
 { val: 'TRAIT', label: t('projects.viewByTrait', 'By Trait') },
 { val: 'NONE', label: t('projects.viewNone', 'No Division') }
 ].map(opt => {
 const isActive = defaultProjectView === opt.val;
 const isDisabled = opt.pro && !isPro;
 return (
 <button
 key={opt.val}
 onClick={() => {
     if (isDisabled) return;
     updateDefaultProjectView(opt.val as any);
 }}
 className={cn(
 "p-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 text-xs font-bold relative",
 isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10",
 isDisabled ? "opacity-50 cursor-not-allowed grayscale" : "active:scale-95"
 )}
 >
 {opt.label}
 {opt.pro && !isPro && <Lock size={10} className="text-white/30" />}
 </button>
 );
 })}
 </div>
 </div>

 {/* Notes Default Tab */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors relative overflow-hidden">
 <div className="absolute inset-0 bg-white/[0.05] z-0 pointer-events-none" />
 
 <div className="flex items-center gap-3 relative z-10">
 <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
 <LayoutTemplate size={18} className="text-cyan-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.notesDefaultTab', 'Notes Default Tab')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.notesDefaultTabDesc', 'Default tab when opening Notes Insights')}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 relative z-10">
 {[
 { val: 'OVERVIEW', label: t('notes.tabOverview', 'Overview') },
 { val: 'EMOTIONS', label: t('notes.tabEmotions', 'Emotions'), pro: true }
 ].map(opt => {
 const isActive = (notesDefaultTab || 'OVERVIEW') === opt.val;
 const isDisabled = opt.pro && !isPro;
 return (
 <button
 key={opt.val}
 onClick={() => {
 if (isDisabled) return;
 updateNotesDefaultTab(opt.val as any);
 }}
 className={cn(
 "p-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 text-xs font-bold relative",
 isActive ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10",
 isDisabled ? "opacity-50 cursor-not-allowed grayscale" : "active:scale-95"
 )}
 >
 {opt.label}
 {opt.pro && !isPro && <Lock size={10} className="text-white/30" />}
 </button>
 );
 })}
 </div>
 </div>

  {/* Notes Default Layout */}
  <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors relative overflow-hidden">
  <div className="absolute inset-0 bg-white/[0.05] z-0 pointer-events-none" />
  
  <div className="flex items-center gap-3 relative z-10">
  <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
  <LayoutGrid size={18} className="text-teal-400" />
  </div>
  <div>
  <div className="text-base font-bold text-white tracking-tight">Vista Predeterminada de Notas</div>
  <div className="text-xs text-white/40 font-medium">Elige el tipo de cuadrícula predeterminado para tus notas</div>
  </div>
  </div>

  <div className="grid grid-cols-2 gap-2 relative z-10">
  {[
  { val: 'GRID', label: 'Cuadrado (Tarjetas)' },
  { val: 'LIST', label: 'Rectángulo (Listas)' }
  ].map(opt => {
  const isActive = notesLayoutMode === opt.val;
  return (
  <button
  key={opt.val}
  onClick={() => updateNotesLayoutMode(opt.val as any)}
  className={cn(
  "p-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 text-xs font-bold relative active:scale-95",
  isActive ? "bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.1)]" : "bg-white/5 text-white/60 border border-white/5 hover:bg-white/10"
  )}
  >
  {opt.label}
  </button>
  );
  })}
  </div>
  </div>

  {/* Default Task Filters */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-5 transition-colors relative overflow-hidden">
 <div className="absolute inset-0 bg-white/[0.05] z-0 pointer-events-none" />
 
 <div className="flex items-center gap-3 relative z-10">
 <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
 <CheckCircle2 size={18} className="text-blue-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">{t('settings.defaultTaskFilters', 'Default Task Filters')}</div>
 <div className="text-xs text-white/40 font-medium">{t('settings.defaultTaskFiltersDesc', 'Initial filter states for tasks')}</div>
 </div>
 </div>

 <div className="space-y-4 relative z-10">
 {/* Timeline */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Calendar size={10} />
 {t('tasks.filterDate', 'Timeline')}
 </label>
 <div className="flex flex-wrap gap-1.5">
 {['ALL', 'DAY', 'WEEK', 'MONTH', '3_MONTHS'].map((tf) => (
 <button
 key={tf}
 onClick={() => updateDefaultTaskFilters({ ...(defaultTaskFilters || {}), timeframe: tf })}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
 (defaultTaskFilters?.timeframe || 'ALL') === tf
 ? "bg-white/10 border-white/20 text-white"
 : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
 )}
 >
 {t(`tasks.filterDateTabs.${tf}`, tf.replace('_', ' '))}
 </button>
 ))}
 </div>
 </div>

 {/* Trait Filter */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Zap size={10} />
 {t('tasks.filterTrait', 'Attribute')}
 </label>
 <div className="flex flex-wrap gap-1.5">
 <button
 onClick={() => updateDefaultTaskFilters({ ...(defaultTaskFilters || {}), traitFilter: 'all' })}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
 (defaultTaskFilters?.traitFilter || 'all') === 'all'
 ? "bg-white/10 border-white/20 text-white"
 : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
 )}
 >
 {t('tasks.all', 'All')}
 </button>
 {attributes?.map((attr: any) => (
 <button
 key={attr.id}
 onClick={() => updateDefaultTaskFilters({ ...(defaultTaskFilters || {}), traitFilter: attr.id })}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border",
 (defaultTaskFilters?.traitFilter || 'all') === attr.id
 ? "bg-white/10 border-white/20 text-white shadow-lg"
 : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
 )}
 style={(defaultTaskFilters?.traitFilter || 'all') === attr.id ? { borderColor: attr.color, color: attr.color, boxShadow: `0 0 10px ${attr.color}20` } : {}}
 >
 <span 
 className="w-1.5 h-1.5 rounded-full"
 style={{ backgroundColor: attr.color }} 
 />
 {String(t(attr.label, attr.label.replace('traits.', '')))}
 </button>
 ))}
 </div>
 </div>

 {/* Grid for Type, Difficulty, Status */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Difficulty */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Swords size={10} />
 {t('tasks.difficulty', 'Difficulty')}
 </label>
 <div className="flex flex-wrap gap-1.5">
 {[
 { id: 'all', label: t('tasks.all', 'ALL') },
 { id: 'S', label: 'S', color: 'text-purple-400' },
 { id: 'A', label: 'A', color: 'text-red-400' },
 { id: 'B', label: 'B', color: 'text-orange-400' },
 { id: 'C', label: 'C', color: 'text-blue-400' },
 ].map(opt => (
 <button
 key={opt.id}
 onClick={() => updateDefaultTaskFilters({ ...(defaultTaskFilters || {}), difficultyFilter: opt.id })}
 className={cn(
 "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
 (defaultTaskFilters?.difficultyFilter || 'all') === opt.id
 ? "bg-white/10 border-white/20 text-white"
 : "bg-transparent border-transparent text-white/30 hover:bg-white/5"
 )}
 >
 <span className={opt.color}>{opt.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Type */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <Brain size={10} />
 {t('tasks.filterType', 'Type')}
 </label>
 <div className="flex flex-wrap gap-1.5">
 {[
 { id: 'all', label: t('tasks.all', 'ALL') },
 { id: 'normal', label: t('tasks.normal', 'Normal') },
 { id: 'smart', label: t('tasks.smart', 'Smart') }
 ].map(opt => (
 <button
 key={opt.id}
 onClick={() => updateDefaultTaskFilters({ ...(defaultTaskFilters || {}), typeFilter: opt.id })}
 className={cn(
 "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
 (defaultTaskFilters?.typeFilter || 'all') === opt.id
 ? "bg-white/10 border-white/20 text-white"
 : "bg-transparent border-transparent text-white/40 hover:bg-white/5"
 )}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Status */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
 <CheckCircle2 size={10} />
 {t('tasks.hideCompleted', 'Hide Completed')}
 </label>
 <button
 onClick={() => updateDefaultTaskFilters({ ...(defaultTaskFilters || {}), hideCompleted: !(defaultTaskFilters?.hideCompleted ?? true) })}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-bold transition-all w-full flex items-center justify-center gap-2",
 (defaultTaskFilters?.hideCompleted ?? true)
 ? "bg-white/10 text-white shadow-lg border border-white/20" 
 : "bg-transparent text-white/30 border border-white/5 hover:bg-white/5"
 )}
 >
 <CheckCircle2 size={14} className={(defaultTaskFilters?.hideCompleted ?? true) ? "text-emerald-400" : "text-white/30"} />
 {t('tasks.hideCompleted', 'Hide Completed')}
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Tone Change Confirmation Modal with 10 Preview Messages */}
  <AnimatePresence>
    {pendingTone && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-black text-lg">
              <Bell size={20} />
              ¿Confirmar Cambio de Tono?
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
              Costo: 2,000 Oro 🪙
            </span>
          </div>

          <p className="text-xs text-white/70">
            Estás a punto de cambiar el tono de tus notificaciones a <strong className="text-white">{TONE_DEFINITIONS[pendingTone].name}</strong>. Se descontarán <strong>2,000 Monedas de Oro</strong> de tu cuenta.
          </p>

          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-3 flex-1 overflow-y-auto space-y-2 max-h-[220px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              💬 Muestra de las 10 frases del tono seleccionado:
            </span>
            <div className="space-y-1.5">
              {TONE_DEFINITIONS[pendingTone].sampleMessages.map((sample, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-2 text-xs text-white/80">
                  <span className="text-amber-400 font-mono text-[10px] font-bold mr-1.5">#{idx + 1}</span>
                  {sample}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setPendingTone(null)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmToneChange}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95"
            >
              Confirmar Cambio (2,000 Oro)
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    )}
  </AnimatePresence>

  {/* Phrase Change Confirmation Modal */}
  <AnimatePresence>
    {pendingPhraseType && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-950 border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-black text-lg">
              <Quote size={20} />
              ¿Confirmar Cambio de Frase?
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
              Costo: 500 Oro 🪙
            </span>
          </div>

          <p className="text-xs text-white/70">
            {pendingPhraseType === 'ANTI' 
              ? 'Estás a punto de actualizar tu Frase Anti-Procrastinación.' 
              : 'Estás a punto de actualizar tu Frase de Pantalla de Carga LUX.'
            } Se descontarán <strong>500 Monedas de Oro</strong> de tu cuenta.
          </p>

          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-xs font-semibold text-cyan-300 font-mono text-center">
            "{pendingPhraseType === 'ANTI' ? antiPhrase.trim().slice(0, 50) : (splashPhrase || 'Sin Excusas').trim().slice(0, 20)}"
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setPendingPhraseType(null)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={pendingPhraseType === 'ANTI' ? handleConfirmAntiPhraseSave : handleConfirmSplashPhraseSave}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              Confirmar Cambio (500 Oro)
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    )}
  </AnimatePresence>

 </div>
 </div>
 );
};
