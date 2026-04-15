import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { notificationService } from '../../services/notificationService';
import { db, doc, getDoc, setDoc } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { LiquidButton } from '../../components/ui/LiquidButton';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import FocusSession from '../../plugins/FocusPlugin';

interface NotificationConfig {
  enabled: boolean;
  dailyReminder: boolean;
  reminderTime: string; // "17:00"
  reminderDays: number[]; // 0-6 (Sun-Sat)
  fcmToken?: string;
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: false,
  dailyReminder: false,
  reminderTime: "17:00",
  reminderDays: [1, 2, 3, 4, 5], // Mon-Fri
};

export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const DAYS = t('common.weekdays.initials', { returnObjects: true }) as string[];

  useEffect(() => {
    if (user) {
      loadSettings();
      checkNativePerms();
    }
  }, [user]);

  const checkNativePerms = async () => {
     // Check permissions based on platform
     if (Capacitor.isNativePlatform()) {
         try {
             const perms = await FocusSession.checkPermissions();
             setPermissionStatus(perms.notifications ? 'granted' : 'default');
         } catch (e) {
             console.error("Failed to check native permissions", e);
         }
     } else if (typeof Notification !== 'undefined' && Notification.permission) {
         setPermissionStatus(Notification.permission);
     }
  };

  const loadSettings = async () => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.id, 'settings', 'notifications');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setConfig(snap.data() as NotificationConfig);
      }
    } catch (error) {
      console.error("Failed to load notification settings", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newConfig: NotificationConfig) => {
    if (!user) return;
    setConfig(newConfig);
    try {
      const ref = doc(db, 'users', user.id, 'settings', 'notifications');
      await setDoc(ref, newConfig, { merge: true });

      // TRIGGER LOCAL SCHEDULING (MOBILE OFFLINE SUPPORT)
      if (newConfig.enabled && newConfig.dailyReminder && newConfig.reminderTime) {
          const [h, m] = newConfig.reminderTime.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
             await notificationService.scheduleDailyReminder(h, m, newConfig.reminderDays);
          }
      }
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error("Failed to save configuration");
    }
  };

  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const executePermissionRequest = async () => {
    setShowPermissionModal(false);
    setLoading(true);
    const result = await notificationService.initialize();
    setLoading(false);
    
    if (result.success && result.token) {
      setPermissionStatus('granted');
      saveSettings({ ...config, enabled: true, fcmToken: result.token });
      toast.success("Neural Link Established", {
        style: { background: '#10B981', color: '#fff' }
      });
      notificationService.testLocalNotification("System Connected", "Lux Uplink Successful.");
    } else {
      // Detailed Error Handling (Apple Intelligence Style)
      switch (result.error) {
        case 'denied':
          toast.error("Permission Denied. Please enable notifications in your browser settings.", {
             duration: 5000,
             icon: '🔒'
          });
          break;
        case 'configuration_error':
          toast.error("System Error: VAPID Configuration Missing.", { icon: '⚠️' });
          break;
        case 'unavailable':
          toast.error("Notifications unavailable on this device.", { icon: '🚫' });
          break;
        default:
          toast.error(`Connection Failed: ${result.error || 'Unknown'}`, { icon: '❌' });
      }
    }
  };

  const handleEnableNotifications = () => {
     if (Capacitor.isNativePlatform()) {
         setShowPermissionModal(true);
     } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
         setShowPermissionModal(true);
     } else {
         executePermissionRequest();
     }
  };

  const toggleDay = (dayIndex: number) => {
    const currentDays = config.reminderDays;
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex].sort();
    
    saveSettings({ ...config, reminderDays: newDays });
  };

  if (loading) return <div className="p-8 text-white/50">Calibrating...</div>;

  return (
    <GlassPanel className="p-6 max-w-2xl mx-auto space-y-8 relative overflow-hidden">
      {/* Permission Soft Prompt Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#111] border border-white/10 p-6 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
               
               <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-3xl">
                    🔔
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Enable Neural Updates?</h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Lux needs permission to send you critical protocol reminders, 
                  </p>
                  
                  <div className="flex gap-2 w-full mt-2">
                    <button 
                      onClick={() => setShowPermissionModal(false)}
                      className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-white/50 text-sm hover:bg-white/10"
                    >
                      Ignore
                    </button>
                    <button 
                      onClick={executePermissionRequest}
                      className="flex-1 py-3 rounded-xl bg-indigo-500/80 text-white text-sm font-medium shadow-lg hover:bg-indigo-500 transition-colors"
                    >
                      Connect
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white text-lg font-medium">System Alerts</h3>
          <p className="text-sm text-white/40">Allow Lux to contact you</p>
        </div>
        {permissionStatus !== 'granted' ? (
           <LiquidButton onClick={handleEnableNotifications} size="sm">
             Initialize
           </LiquidButton>
        ) : (
            <div className="text-emerald-400 text-sm font-mono">ACTIVE</div>
        )}
      </div>

      <AnimatePresence>
        {permissionStatus === 'granted' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* DAILY PROTOCOL REMINDER */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Daily Protocol Sync</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.dailyReminder}
                      onChange={(e) => saveSettings({ ...config, dailyReminder: e.target.checked })}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
               </div>

               {config.dailyReminder && (
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="bg-black/20 rounded-lg p-4 space-y-4 border border-white/5"
                 >
                    <div className="flex items-center justify-between">
                        <span className="text-white/60 text-sm">Sync Time</span>
                        <input 
                          type="time" 
                          value={config.reminderTime}
                          onChange={(e) => saveSettings({ ...config, reminderTime: e.target.value })}
                          className="bg-white/10 border border-white/10 rounded px-3 py-1 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <span className="text-white/60 text-sm block mb-2">Active Days</span>
                        <div className="flex justify-between gap-2">
                            {DAYS.map((day, index) => (
                                <button
                                    key={index}
                                    onClick={() => toggleDay(index)}
                                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                                        config.reminderDays.includes(index)
                                            ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                 </motion.div>
               )}
            </div>

            <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/30 text-center mb-4">
                    Server-Side Synchronization ID: {config.fcmToken ? `${config.fcmToken.substring(0, 10)}...` : 'NULL'}
                </p>
                
                {/* TEST ZONE */}
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Diagnostics</h4>
                    <div className="flex gap-2">
                        <button
                            onClick={() => notificationService.testLocalNotification("Test Protocol", "Visual and Haptic Feedback Operational.")}
                            className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded hover:bg-indigo-500/30 transition-colors"
                        >
                            Test Local Alert
                        </button>
                        <button
                            onClick={() => {
                                const now = new Date();
                                const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                                toast(config.reminderTime === time ? "TIMING MATCH: Notification would fire now." : `TIMING MISMATCH: Now ${time} vs Set ${config.reminderTime}`);
                            }}
                            className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded hover:bg-emerald-500/30 transition-colors"
                        >
                            Verify Timing Logic
                        </button>
                    </div>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
};
