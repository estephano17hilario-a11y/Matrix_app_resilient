import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Globe, Sliders, StickyNote, Hexagon, BarChart3, ChevronDown, ChevronUp, Zap, Bell, Shield, Smartphone } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import FocusSession from '../../../plugins/FocusPlugin';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export const SystemSection = () => {
  const { i18n, t } = useTranslation();
  const { 
    habitSectionControl, 
    updateHabitSectionControl,
    defaultChartMode,
    setDefaultChartMode
  } = useSettings();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const [openPanels, setOpenPanels] = useState({ localization: false, hud: false, neural: true });
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
        // Web fallback
        setPermissions({
          notifications: Notification.permission === 'granted',
          battery: true, // Not applicable on web
          overlay: true // Not applicable on web
        });
      }
    };
    
    checkNativeStatus();
    // Re-check when coming back to app
    window.addEventListener('focus', checkNativeStatus);
    return () => window.removeEventListener('focus', checkNativeStatus);
  }, []);

  const handleRequestBattery = async () => {
    if (!isNative) {
      toast.error("Battery optimization is an Android-only feature");
      return;
    }
    try {
      await FocusSession.requestBatteryPermission();
      toast.success("Opening battery settings...");
    } catch (e) {
      toast.error("Failed to open battery settings");
    }
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
      toast.success("Opening notification settings...");
    } catch (e) {
      toast.error("Failed to open notification settings");
    }
  };

  const togglePanel = (key: 'localization' | 'hud' | 'neural') => {
    setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-1 md:space-y-2">
        <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Cpu className="text-emerald-400" size={24} />
          System BIOS
        </h2>
        <p className="text-white/40 text-xs md:text-base max-w-2xl">
          Core system configurations, language processing, and input/output handling.
        </p>
      </div>

      <div className="space-y-4">
        {/* NEURAL LINK OPTIMIZATION (NATIVE) */}
        <button
          onClick={() => togglePanel('neural')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone size={16} className="text-indigo-400" />
            Neural Link Optimization
          </div>
          {openPanels.neural ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence initial={false}>
          {openPanels.neural && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 space-y-4"
            >
               <div className="flex items-center justify-between mb-2">
                 <div className="space-y-1">
                    <span className="text-white font-medium flex items-center gap-2">
                      <Zap size={16} className="text-indigo-400" />
                      System Permissions
                    </span>
                    <p className="text-xs text-white/40">Grant deep system access for full immersion.</p>
                 </div>
              </div>

              <div className="space-y-3">
                {/* NOTIFICATIONS */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", permissions.notifications ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">Neural Notifications</h4>
                      <p className="text-xs text-white/40">Receive real-time matrix updates.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestNotifications}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      permissions.notifications 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    )}
                  >
                    {permissions.notifications ? "ACTIVE" : "ACTIVATE"}
                  </button>
                </div>

                {/* BATTERY OPTIMIZATION */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", permissions.battery ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">Unrestricted Energy</h4>
                      <p className="text-xs text-white/40">Disable battery limits for background processing.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestBattery}
                    disabled={permissions.battery || !isNative}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      permissions.battery 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {permissions.battery ? "OPTIMIZED" : "DISABLE LIMITS"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => togglePanel('localization')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe size={16} className="text-emerald-400" />
            Localization
          </div>
          {openPanels.localization ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence initial={false}>
          {openPanels.localization && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                 <div className="space-y-1">
                    <span className="text-white font-medium flex items-center gap-2">
                      <Globe size={16} className="text-emerald-400" />
                      System Language
                    </span>
                    <p className="text-xs text-white/40">Select primary communication protocol</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300",
                      i18n.language === 'en' 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    )}
                  >
                    <span className="text-xl">🇺🇸</span>
                    <span className="font-bold text-sm">English</span>
                  </button>

                  <button
                    onClick={() => changeLanguage('es')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300",
                      i18n.language === 'es' 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    )}
                  >
                    <span className="text-xl">🇪🇸</span>
                    <span className="font-bold text-sm">Español</span>
                  </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => togglePanel('hud')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <StickyNote size={16} className="text-blue-400" />
            HUD & Navigation
          </div>
          {openPanels.hud ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence initial={false}>
          {openPanels.hud && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 space-y-6"
            >
              
              <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <span className="text-white font-medium flex items-center gap-2">
                      <BarChart3 size={16} className="text-purple-400" />
                      Chart Visualization
                    </span>
                    <p className="text-xs text-white/40">Default metric representation</p>
                  </div>

                  <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                       <button 
                          onClick={() => setDefaultChartMode('RADAR')}
                          className={cn(
                              "p-2 rounded-md transition-all", 
                              defaultChartMode === 'RADAR' ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/60"
                          )}
                          title="Radar / Spider Chart"
                       >
                          <Hexagon size={16} />
                       </button>
                       <button 
                          onClick={() => setDefaultChartMode('BAR')}
                          className={cn(
                              "p-2 rounded-md transition-all", 
                              defaultChartMode === 'BAR' ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/60"
                          )}
                          title="Bar Chart"
                       >
                          <BarChart3 size={16} />
                       </button>
                  </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-6">
                  <div className="space-y-1">
                     <span className="text-white font-medium flex items-center gap-2">
                      <Sliders size={16} className="text-orange-400" />
                      Section Buttons
                    </span>
                    <p className="text-xs text-white/40">Show sub-navigation controls</p>
                  </div>
                  
                  <button
                     onClick={() => updateHabitSectionControl(habitSectionControl === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE')}
                     className={cn(
                       "w-12 h-7 rounded-full transition-colors relative border",
                       habitSectionControl === 'VISIBLE' ? "bg-orange-500/20 border-orange-500/50" : "bg-white/5 border-white/10"
                     )}
                  >
                     <motion.div 
                       layout
                       className={cn(
                         "absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-transform",
                         habitSectionControl === 'VISIBLE' ? "bg-orange-400 translate-x-5" : "bg-white/20 translate-x-0"
                       )} 
                     />
                  </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
