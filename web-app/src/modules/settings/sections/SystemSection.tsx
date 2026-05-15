import { useState, useEffect } from 'react';

import { Globe, BarChart3, Hexagon, Bell, BatteryMedium, Smartphone, Settings2, Calendar, Layers, Lock, LineChart, LayoutGrid, Zap, Brain, Swords, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import FocusSession from '@/plugins/FocusPlugin';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import toast from 'react-hot-toast';

import { LocalNotifications } from '@capacitor/local-notifications';

export const SystemSection = () => {
 const { t, i18n } = useTranslation();
 const { 
 habitSectionControl, updateHabitSectionControl, 
 defaultHabitView, updateDefaultHabitView, 
 defaultChartMode, setDefaultChartMode, 
 weekStartDay, updateWeekStartDay,
 defaultChartViews, updateDefaultChartViews,
 defaultProjectView, updateDefaultProjectView,
 defaultTaskFilters, updateDefaultTaskFilters,
 dashboardStyle, setDashboardStyle,
 attributes,
 isPro
 } = useSettings();

 const [permissions, setPermissions] = useState({ notifications: false, battery: false, overlay: false });
 const [isNative, setIsNative] = useState(false);

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

 {/* Dashboard Layout Style */}
 <div className="bg-[#111] border border-white/5 rounded-2xl p-4 space-y-4 transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
 <LayoutTemplate size={18} className="text-pink-400" />
 </div>
 <div>
 <div className="text-base font-bold text-white tracking-tight">Dashboard Layout</div>
 <div className="text-xs text-white/40 font-medium">Select dock style</div>
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
 Legacy Dock
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
 Aura Dock
 </button>
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
 { key: 'tasks', label: 'Tasks', color: 'indigo' },
 { key: 'habits', label: 'Habits', color: 'rose' },
 { key: 'focus', label: 'Focus', color: 'amber' },
 { key: 'projects', label: 'Projects', color: 'emerald' },
 { key: 'notes', label: 'Notes', color: 'cyan' }
 ] as const).map(section => {
 const currentVal = defaultChartViews?.[section.key] || 'WEEK';
 
 const options = [
 { val: 'WEEK', label: '1W' },
 { val: 'MONTH', label: '1M' },
 { val: '3_MONTHS', label: '3M', pro: true },
 { val: 'YEAR', label: '1Y', pro: true },
 { val: 'TOTAL', label: 'ALL', pro: true }
 ] as Array<{ val: any; label: string; pro?: boolean }>;

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

 </div>
 </div>
 );
};
