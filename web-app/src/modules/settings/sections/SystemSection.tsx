import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, BarChart3, Hexagon, Bell, BatteryMedium, Smartphone, Settings2, Calendar } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import FocusSession from '../../../plugins/FocusPlugin';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import toast from 'react-hot-toast';

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
      await FocusSession.openNotificationSettings();
    } catch (e) {
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
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 space-y-4 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
          <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
            style={{ 
              background: `radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)`,
              willChange: 'opacity'
            }} 
          />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Globe size={18} className="text-indigo-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight">{t('settings.language', 'Language')}</div>
              <div className="text-xs text-white/40 font-medium">{t('settings.languageDesc', 'Select system language')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
            <button
              onClick={() => changeLanguage('en')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-[16px] transition-all duration-300 text-sm font-black active:scale-95",
                i18n.language === 'en' 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]" 
                  : "bg-black/40 text-white/50 border border-white/[0.03] hover:border-white/[0.08] hover:text-white"
              )}
            >
              <span className="text-lg drop-shadow-md">🇺🇸</span>
              <span>English</span>
            </button>
            <button
              onClick={() => changeLanguage('es')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-[16px] transition-all duration-300 text-sm font-black active:scale-95",
                i18n.language === 'es' 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]" 
                  : "bg-black/40 text-white/50 border border-white/[0.03] hover:border-white/[0.08] hover:text-white"
              )}
            >
              <span className="text-lg drop-shadow-md">🇪🇸</span>
              <span>Español</span>
            </button>
          </div>
        </div>

        {isNative && (
          <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 space-y-4 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
            <div 
              className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
              style={{ 
                background: `radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)`,
                willChange: 'opacity'
              }} 
            />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Smartphone size={18} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">{t('settings.nativePermissions', 'Native Permissions')}</div>
                <div className="text-xs text-white/40 font-medium">{t('settings.nativePermissionsDesc', 'System access for background sync')}</div>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between p-3 rounded-[16px] bg-black/40 border border-white/[0.03] hover:border-white/[0.06] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl transition-all duration-300", permissions.notifications ? "bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/[0.03]")}>
                    <Bell size={18} className={cn("transition-colors", permissions.notifications ? "text-emerald-400" : "text-white/40")} />
                  </div>
                  <span className={cn("text-sm font-bold transition-colors", permissions.notifications ? "text-white" : "text-white/70")}>{t('settings.notifications', 'Notifications')}</span>
                </div>
                <button
                  onClick={handleRequestNotifications}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95",
                    permissions.notifications 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-white text-black hover:scale-105 shadow-[0_5px_20px_rgba(255,255,255,0.2)]"
                  )}
                >
                  {permissions.notifications ? t('settings.active', 'Active') : t('settings.enable', 'Enable')}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-black/40 border border-white/[0.03] hover:border-white/[0.06] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl transition-all duration-300", permissions.battery ? "bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/[0.03]")}>
                    <BatteryMedium size={18} className={cn("transition-colors", permissions.battery ? "text-emerald-400" : "text-white/40")} />
                  </div>
                  <span className={cn("text-sm font-bold transition-colors", permissions.battery ? "text-white" : "text-white/70")}>{t('settings.batteryOptimization', 'Battery Optimization')}</span>
                </div>
                <button
                  onClick={handleRequestBattery}
                  disabled={permissions.battery}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95",
                    permissions.battery 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default" 
                      : "bg-white text-black hover:scale-105 shadow-[0_5px_20px_rgba(255,255,255,0.2)]"
                  )}
                >
                  {permissions.battery ? t('settings.unrestricted', 'Unrestricted') : t('settings.disable', 'Disable')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 space-y-4 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
          <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
            style={{ 
              background: `radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)`,
              willChange: 'opacity'
            }} 
          />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <BarChart3 size={18} className="text-cyan-400" />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">{t('settings.startupChart', 'Chart Style')}</div>
                <div className="text-xs text-white/40 font-medium">{t('settings.startupChartDesc', 'Default visualization')}</div>
              </div>
            </div>

            <div className="flex bg-black/40 rounded-[16px] p-1 border border-white/[0.03] shadow-inner">
              <button
                onClick={() => setDefaultChartMode('RADAR')}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center active:scale-95",
                  defaultChartMode === 'RADAR' ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/20" : "text-white/30 hover:text-white/70 hover:bg-white/[0.02] border border-transparent"
                )}
              >
                <Hexagon size={16} />
              </button>
              <button
                onClick={() => setDefaultChartMode('BAR')}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center active:scale-95",
                  defaultChartMode === 'BAR' ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/20" : "text-white/30 hover:text-white/70 hover:bg-white/[0.02] border border-transparent"
                )}
              >
                <BarChart3 size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 space-y-4 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
          <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
            style={{ 
              background: `radial-gradient(circle, rgba(217,70,239,0.4) 0%, transparent 70%)`,
              willChange: 'opacity'
            }} 
          />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20">
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
                "w-14 h-8 rounded-full transition-all duration-300 relative shadow-inner border",
                habitSectionControl === 'VISIBLE' 
                  ? "bg-fuchsia-500/20 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.2)]" 
                  : "bg-black/50 border-white/[0.05]"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] transition-all duration-300",
                  habitSectionControl === 'VISIBLE' ? "bg-fuchsia-400 left-[30px]" : "bg-white/40 left-1.5"
                )}
              />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.05] rounded-[20px] p-5 space-y-4 hover:border-white/[0.08] transition-colors relative overflow-hidden group">
          <div 
            className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" 
            style={{ 
              background: `radial-gradient(circle, rgba(14,165,233,0.4) 0%, transparent 70%)`,
              willChange: 'opacity'
            }} 
          />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Calendar size={18} className="text-cyan-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight">{t('settings.weekStartsOn', 'Week Starts On')}</div>
              <div className="text-xs text-white/40 font-medium">{t('settings.weekStartsOnDesc', 'First day of week for calendars')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
            <button
              onClick={() => updateWeekStartDay(1)}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-[16px] transition-all duration-300 text-sm font-black active:scale-95",
                weekStartDay === 1 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                  : "bg-black/40 text-white/50 border border-white/[0.03] hover:border-white/[0.08] hover:text-white"
              )}
            >
              <span className="text-lg drop-shadow-md">📅</span>
              <span>{t('common.monday', 'Monday')}</span>
            </button>
            <button
              onClick={() => updateWeekStartDay(0)}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-[16px] transition-all duration-300 text-sm font-black active:scale-95",
                weekStartDay === 0 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                  : "bg-black/40 text-white/50 border border-white/[0.03] hover:border-white/[0.08] hover:text-white"
              )}
            >
              <span className="text-lg drop-shadow-md">🗓️</span>
              <span>{t('common.sunday', 'Sunday')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
