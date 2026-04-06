import { useState, useEffect } from 'react';

import { Globe, BarChart3, Hexagon, Bell, BatteryMedium, Smartphone, Settings2, Calendar } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import FocusSession from '../../../plugins/FocusPlugin';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import toast from 'react-hot-toast';

import { LocalNotifications } from '@capacitor/local-notifications';

export const SystemSection = () => {
  const { t, i18n } = useTranslation();
  const { habitSectionControl, updateHabitSectionControl, defaultChartMode, setDefaultChartMode, weekStartDay, updateWeekStartDay } = useSettings();

  const [permissions, setPermissions] = useState({ notifications: false, battery: false, overlay: false });
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const checkNativeStatus = async () => {
      const platform = Capacitor.getPlatform();
      setIsNative(platform === 'android' || platform === 'ios');

      if (platform === 'android') {
        try {
          const perms = await FocusSession.checkPermissions();
          setPermissions(perms);
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
              <span>English</span>
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
              <span>Español</span>
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
      </div>
    </div>
  );
};
