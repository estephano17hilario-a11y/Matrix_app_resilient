import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, BarChart3, Hexagon, Bell, BatteryMedium, Smartphone, Settings2, Calendar } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import FocusSession from '../../../plugins/FocusPlugin';
import { Capacitor } from '@capacitor/core';
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
    return () => window.removeEventListener('focus', checkNativeStatus);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const handleRequestNotifications = async () => {
    if (!isNative) {
      const permission = await Notification.requestPermission();
      setPermissions(prev => ({ ...prev, notifications: permission === 'granted' }));
      if (permission === 'granted') toast.success("Notifications enabled");
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
        <h2 className="text-lg font-semibold text-white">System</h2>
        <p className="text-white/40 text-sm">Language, permissions, and navigation.</p>
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
              <div className="text-base font-bold text-white tracking-tight">Language</div>
              <div className="text-xs text-white/40 font-medium">Select system language</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
            <button
              onClick={() => changeLanguage('en')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-sm font-bold shadow-sm",
                i18n.language === 'en' ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <span className="text-lg drop-shadow-md">🇺🇸</span>
              <span>English</span>
            </button>
            <button
              onClick={() => changeLanguage('es')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-sm font-bold shadow-sm",
                i18n.language === 'es' ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.08] hover:text-white"
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
                <div className="text-base font-bold text-white tracking-tight">Native Permissions</div>
                <div className="text-xs text-white/40 font-medium">System access for background sync</div>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", permissions.notifications ? "bg-emerald-500/20" : "bg-white/[0.05]")}>
                    <Bell size={16} className={permissions.notifications ? "text-emerald-400" : "text-white/40"} />
                  </div>
                  <span className="text-sm font-semibold text-white/80">Notifications</span>
                </div>
                <button
                  onClick={handleRequestNotifications}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm",
                    permissions.notifications ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                  )}
                >
                  {permissions.notifications ? "Active" : "Enable"}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", permissions.battery ? "bg-emerald-500/20" : "bg-white/[0.05]")}>
                    <BatteryMedium size={16} className={permissions.battery ? "text-emerald-400" : "text-white/40"} />
                  </div>
                  <span className="text-sm font-semibold text-white/80">Battery Optimization</span>
                </div>
                <button
                  onClick={handleRequestBattery}
                  disabled={permissions.battery}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm",
                    permissions.battery ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default" : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-50"
                  )}
                >
                  {permissions.battery ? "Unrestricted" : "Disable"}
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
                <div className="text-base font-bold text-white tracking-tight">Chart Style</div>
                <div className="text-xs text-white/40 font-medium">Default visualization</div>
              </div>
            </div>

            <div className="flex bg-black/40 rounded-xl p-1 border border-white/[0.05] shadow-inner">
              <button
                onClick={() => setDefaultChartMode('RADAR')}
                className={cn(
                  "p-2.5 rounded-lg transition-all flex items-center justify-center",
                  defaultChartMode === 'RADAR' ? "bg-white/[0.12] text-cyan-300 shadow-md" : "text-white/30 hover:text-white/70"
                )}
              >
                <Hexagon size={16} />
              </button>
              <button
                onClick={() => setDefaultChartMode('BAR')}
                className={cn(
                  "p-2.5 rounded-lg transition-all flex items-center justify-center",
                  defaultChartMode === 'BAR' ? "bg-white/[0.12] text-cyan-300 shadow-md" : "text-white/30 hover:text-white/70"
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
                <div className="text-base font-bold text-white tracking-tight">Section Controls</div>
                <div className="text-xs text-white/40 font-medium">Show habit section buttons</div>
              </div>
            </div>

            <button
              onClick={() => updateHabitSectionControl(habitSectionControl === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE')}
              className={cn(
                "w-12 h-7 rounded-full transition-all relative shadow-inner border border-white/5",
                habitSectionControl === 'VISIBLE' ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-black/50"
              )}
            >
              <motion.div
                layout
                className={cn(
                  "absolute top-0.5 w-6 h-6 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.3)]",
                  habitSectionControl === 'VISIBLE' ? "bg-white left-[22px]" : "bg-white/40 left-0.5"
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
                "flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-sm font-bold shadow-sm",
                weekStartDay === 1 ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(14,165,233,0.2)]" : "bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.08] hover:text-white"
              )}
            >
              <span className="text-lg drop-shadow-md">📅</span>
              <span>{t('common.monday', 'Monday')}</span>
            </button>
            <button
              onClick={() => updateWeekStartDay(0)}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-sm font-bold shadow-sm",
                weekStartDay === 0 ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(14,165,233,0.2)]" : "bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.08] hover:text-white"
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
