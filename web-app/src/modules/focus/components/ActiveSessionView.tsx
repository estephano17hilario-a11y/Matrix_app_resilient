import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pause, Play, StopCircle, Volume2, ChevronDown, History, BellOff, Battery, Check, Coins, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Attribute, SubTrait } from '../../../types';
import { useFocusSession } from '../hooks/useFocusSession';
import { SessionHistoryModal } from './SessionHistoryModal';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { cn } from '../../../utils/cn';
import { useTranslation } from 'react-i18next';
import { triggerFlyingIcon } from '../../dashboard/components/FlyingIcon';
// import { LocalNotifications } from '@capacitor/local-notifications';

interface ActiveSessionViewProps {
 project: Project;
 attribute?: Attribute;
 onExit: () => void;
 onCompleteSession: (duration: number, type: 'POMO' | 'STOPWATCH', subTraitId?: string) => void;
 onUpdateProject: (p: Project) => void;
 onDeleteSession?: (projectId: string, sessionId: string) => void;
 onAddManualSession?: (projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string, subTraitId?: string) => void;
 onEditSession?: (projectId: string, sessionId: string, newDurationMinutes: number, newDateStr: string) => void;
 autoStart?: boolean;
 onAutoStartConsumed?: () => void;
 customHeaderTitle?: React.ReactNode;
}

import { useAudioAlarm } from '../hooks/useAudioAlarm';

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import FocusSession from '@/plugins/FocusPlugin';
import toast from 'react-hot-toast';

// Sub-trait picker modal shown after a session ends
const SubTraitPickerModal = ({ 
  subTraits, 
  attribute, 
  themeColor,
  onConfirm 
}: { 
  subTraits: SubTrait[]; 
  attribute: Attribute;
  themeColor: string;
  onConfirm: (subTraitId?: string) => void; 
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm bg-[#10101a] border border-white/10 rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl border" style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}30` }}>
            ✅
          </div>
          <h3 className="text-white font-black text-lg tracking-tight">{t('focus.session.completed')}</h3>
          <p className="text-white/40 text-xs mt-1 font-medium">{t('focus.session.whereToAssign')}</p>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-6">
          {/* Main trait option */}
          <button
            onClick={() => setSelected(undefined)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all"
            style={!selected ? { backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40` } : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm border" style={{ backgroundColor: `${themeColor}20`, borderColor: `${themeColor}30` }}>
              🎯
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-bold" style={{ color: !selected ? themeColor : 'rgba(255,255,255,0.5)' }}>
                {t('focus.session.onlyMainTrait')}
              </span>
              <p className="text-[10px] text-white/30 font-medium">{attribute.label || attribute.id}</p>
            </div>
            {!selected && (
              <Check size={16} style={{ color: themeColor }} />
            )}
          </button>

          {/* Sub-trait options */}
          {subTraits.map(st => (
            <button
              key={st.id}
              onClick={() => setSelected(st.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all"
              style={selected === st.id ? { backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40` } : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm border" style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}25` }}>
                <span className="text-xs font-bold" style={{ color: themeColor }}>Lv{st.level}</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-sm font-bold" style={{ color: selected === st.id ? themeColor : 'rgba(255,255,255,0.5)' }}>
                  {st.name}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden max-w-[80px]">
                    <div className="h-full rounded-full" style={{ width: `${st.maxXp > 0 ? (st.xp / st.maxXp) * 100 : 0}%`, backgroundColor: themeColor }} />
                  </div>
                  <span className="text-[9px] text-white/20 font-mono">{st.xp}/{st.maxXp}</span>
                </div>
              </div>
              {selected === st.id && (
                <Check size={16} style={{ color: themeColor }} />
              )}
            </button>
          ))}
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(selected)}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.97]"
          style={{ backgroundColor: themeColor, color: 'white', boxShadow: `0 0 25px ${themeColor}40` }}
        >
          {t('focus.session.confirm')}
        </button>
      </motion.div>
    </motion.div>
  );
};

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
 project,
 attribute,
 onExit,
 onCompleteSession,
 onUpdateProject,
 onDeleteSession,
 onAddManualSession,
 onEditSession,
 autoStart,
 onAutoStartConsumed,
 customHeaderTitle
}) => {
 const { t, i18n } = useTranslation();
 const [showHistory, setShowHistory] = useState(false);
 const [isEditingTime, setIsEditingTime] = useState(false);
 const [editTimeValue, setEditTimeValue] = useState('25');
 const [showFocusProtectionModal, setShowFocusProtectionModal] = useState(false);
 const [pendingSessionData, setPendingSessionData] = useState<{ duration: number; mode: 'POMO' | 'STOPWATCH' } | null>(null);
 
 // SMART PERMISSIONS STATE
 const [permissions, setPermissions] = useState({
 notifications: true,
 battery: true
 });
 
 const hasAutoStarted = useRef(false);
 const sessionRecordedRef = useRef(false);
 const inputRef = useRef<HTMLInputElement>(null);

 const { playAlarm } = useAudioAlarm();

 const subTraits = attribute?.subTraits ?? [];
 const hasSubTraits = subTraits.length > 0;

  // Check Advanced Permissions on Mount
  const checkAllPermissions = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.checkPermissions();
        let isIgnoringBattery = true;
        if (Capacitor.getPlatform() === 'android') {
          try {
            const nativePerms = await FocusSession.checkPermissions();
            isIgnoringBattery = nativePerms.battery;
          } catch (err) {
            console.error("Failed to check battery permission", err);
          }
        }
        setPermissions({
          notifications: perm.display === 'granted',
          battery: isIgnoringBattery
        });
      }
    } catch (e) {
      console.warn("Failed to check advanced permissions", e);
    }
  }, []);

 useEffect(() => {
 checkAllPermissions();
 
 // Re-check when app resumes
 const handleResume = () => checkAllPermissions();
 document.addEventListener('resume', handleResume);
 return () => document.removeEventListener('resume', handleResume);
 }, [checkAllPermissions]);

 // Handlers for Smart Buttons
 const handleEnableNotifications = async () => {
 try {
 if (Capacitor.isNativePlatform()) {
 const perm = await LocalNotifications.requestPermissions();
 if (perm.display === 'granted') {
 checkAllPermissions(); // Refresh UI
 }
 }
 } catch (e) {
 console.error("Failed to request notifications permission", e);
 }
 };

  const handleDisableBatteryOpt = async () => {
    if (Capacitor.getPlatform() !== 'android') {
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

  const handleExitAttempt = () => {
  if (isActive) {
  setShowFocusProtectionModal(true);
  } else {
  onExit();
  }
  };

  const runFocusFlyingIcons = useCallback(() => {
    const startRect = {
      left: window.innerWidth / 2 - 24,
      top: window.innerHeight / 2 - 24,
      width: 48,
      height: 48,
      x: window.innerWidth / 2 - 24,
      y: window.innerHeight / 2 - 24,
      bottom: window.innerHeight / 2 + 24,
      right: window.innerWidth / 2 + 24,
      toJSON: () => {}
    } as DOMRect;

    triggerFlyingIcon(startRect, "gold-counter-pill", <Coins size={24} className="text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,1)]" />, 0);
    triggerFlyingIcon(startRect, "xp-bar-container", <Zap size={24} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,1)]" />, 0.15);
    if (attribute && attribute.icon) {
      const TraitIcon = attribute.icon;
      const tColor = project.color || attribute.color || '#3b82f6';
      triggerFlyingIcon(startRect, "xp-bar-container", <TraitIcon size={24} style={{ color: tColor }} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />, 0.3);
    }
  }, [attribute, project.color]);

 const handleSessionEnd = useCallback((duration: number, mode: 'POMO' | 'STOPWATCH', isManualStop: boolean = false) => {
 const safeDuration = Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0;
 if (safeDuration < 5) return;
 if (sessionRecordedRef.current) return;
 sessionRecordedRef.current = true;
 
 // Only play alarm and show external notification if it finished naturally
 if (!isManualStop) {
 playAlarm(); // Call the custom beautiful alarm sound

 // Show a web notification if permitted, so they know if they are in another tab
 if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
 try {
 const notifTitle = i18n.language === 'es' ? '¡Enfoque Completado!' : 'Focus Complete!';
 const notifBody = i18n.language === 'es' 
   ? `Terminaste tu sesión para ${project.title}. ¡Reclama tu victoria!`
   : `You finished your session for ${project.title}. Claim victory!`;
 new Notification(notifTitle, {
 body: notifBody,
 icon: '/favicon.ico',
 tag: 'focus-complete'
 });
 } catch (e) {
 console.error("Failed to show web notification", e);
 }
 }
 }

 // If attribute has sub-traits, show picker first
 if (hasSubTraits) {
   setPendingSessionData({ duration: safeDuration, mode });
 } else {
   runFocusFlyingIcons();
   onCompleteSession(safeDuration, mode, undefined);
 }
 }, [onCompleteSession, playAlarm, project.title, hasSubTraits, runFocusFlyingIcons]);

 // Helper to get emoji for attribute
 const getTraitEmoji = (id: string) => {
 switch(id) {
 case 'DISCIPLINA': return '🎯';
 case 'FISICO': return '🏋️';
 case 'MENTAL': return '🧠';
 case 'SOCIAL': return '👥';
 case 'ESPIRITU': return '👻';
 case 'FINANZAS': return '💰';
 case 'CREATIVIDAD': return '🎨';
 case 'ORDEN': return '⚓';
 case 'LIDERAZGO': return '👑';
 case 'RESILIENCIA': return '🛡️';
 case 'VITALIDAD': return '⚡';
 case 'ESTILO': return '🪶';
 default: return '⚡';
 }
 };

 const themeColor = project.color || attribute?.color || '#3b82f6';

 const {
 mode,
 setMode,
 timeLeft,
 setTimeLeft,
 totalDuration,
 setTotalDuration,
 isActive,
 isPaused,
 toggleTimer,
 stopSession
 } = useFocusSession(project, handleSessionEnd, getTraitEmoji(project.attribute));

 useEffect(() => {
 if (isEditingTime && inputRef.current) {
 inputRef.current.focus();
 inputRef.current.select();
 }
 }, [isEditingTime]);

 const handleAddManualSessionWrapper = useCallback((projectId: string, durationMinutes: number, type: 'POMO' | 'STOPWATCH', sessionId?: string, sessionDate?: string, subTraitId?: string) => {
 console.log("💎 [ActiveSessionView] Adding manual session...", { projectId, durationMinutes, type, subTraitId });
 if (onAddManualSession) {
 onAddManualSession(projectId, durationMinutes, type, sessionId, sessionDate, subTraitId);
 } else {
 console.error("❌ [ActiveSessionView] onAddManualSession prop is MISSING!");
 }
 }, [onAddManualSession, isActive, onExit]);

 const handleTimeSubmit = () => {
 const minutes = parseInt(editTimeValue);
 if (!isNaN(minutes) && minutes > 0) {
 const newSeconds = minutes * 60;
 setTimeLeft(newSeconds);
 setTotalDuration(newSeconds);
 sessionRecordedRef.current = false;
 }
 setIsEditingTime(false);
 };

 const handleTimeKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 handleTimeSubmit();
 } else if (e.key === 'Escape') {
 setIsEditingTime(false);
 setEditTimeValue(Math.floor(timeLeft / 60).toString());
 }
 };

 useEffect(() => {
 if (autoStart && !hasAutoStarted.current && !isActive) {
 hasAutoStarted.current = true;
 toggleTimer();
 onAutoStartConsumed?.();
 }
 }, [autoStart, isActive, toggleTimer, onAutoStartConsumed]);

 useEffect(() => {
 sessionRecordedRef.current = false;
 }, [project.id]);

 useEffect(() => {
 if (!isActive && !isPaused) {
 if (mode === 'POMO') {
 const initial = project.pomoDuration * 60;
 if (timeLeft === initial) sessionRecordedRef.current = false;
 } else {
 if (timeLeft === 0) sessionRecordedRef.current = false;
 }
 }
 }, [isActive, isPaused, mode, timeLeft, project.pomoDuration]);

 // Timer Circle Logic
 const radius = 140; 
 const circumference = 2 * Math.PI * radius;
 const progress = mode === 'POMO' ? (totalDuration > 0 ? (timeLeft / totalDuration) : 1) : 1; 
 const dashOffset = Number.isFinite(progress) ? circumference * (1 - progress) : 0;

 const formatTime = (seconds: number) => {
 const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
 const m = Math.floor(safeSeconds / 60);
 const s = safeSeconds % 60;
 return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
 };

  const getElapsedSeconds = useCallback((currentMode: 'POMO' | 'STOPWATCH') => {
    if (currentMode === 'STOPWATCH') {
      return Math.max(0, timeLeft);
    }
    const elapsed = totalDuration - timeLeft;
    return Math.max(0, Math.min(totalDuration, elapsed));
  }, [timeLeft, totalDuration]);

  const handleConfirmExit = () => {
    setShowFocusProtectionModal(false);
    if (isActive) {
      const elapsed = getElapsedSeconds(mode);
      if (elapsed >= 5) {
        runFocusFlyingIcons();
        onCompleteSession(elapsed, mode, undefined);
      }
      stopSession();
    }
    onExit();
  };

  // Hardware back button listener for native platforms
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const registerBackListener = async () => {
      const backListener = await App.addListener('backButton', () => {
        if (isActive) {
          setShowFocusProtectionModal(true);
        } else {
          onExit();
        }
      });
      return backListener;
    };

    const backListenerPromise = registerBackListener();

    return () => {
      backListenerPromise.then(listener => listener.remove()).catch(console.error);
    };
  }, [isActive, onExit]);

  const handleStop = () => {
    if (!isActive) {
      stopSession();
      return;
    }

    const currentMode = mode;
    const elapsed = getElapsedSeconds(currentMode);

    if (elapsed >= 5) {
      handleSessionEnd(elapsed, currentMode, true);
    }
    
    stopSession();
  };

 return (
 <motion.div
 className="flex flex-col w-full h-full relative overflow-hidden bg-transparent font-sans touch-none select-none overscroll-none" // Added overscroll-none for extra safety
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.15 }}
 >
 {/* Dynamic Background Aura - Ultra Optimized & Visual */}
 <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
 <div 
 className="absolute top-1/2 left-1/2 w-[1000px] h-[1000px] rounded-full"
 style={{ 
 opacity: isActive && !isPaused ? 0.25 : 0.15,
 transform: 'translate(-50%, -50%) translateZ(0)',
 backgroundImage: `radial-gradient(circle at center, ${themeColor} 0%, ${themeColor}10 40%, rgba(0,0,0,0) 70%)`,
 transition: 'opacity 1.5s ease-in-out'
 }}
 />
 </div>

 {/* Top Bar */}
 <div className="w-full px-6 pt-12 pb-6 flex justify-between items-center z-50 shrink-0 relative">
 <button 
 onClick={handleExitAttempt}
 className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors"
 >
 <ChevronDown size={24} />
 </button>

 {customHeaderTitle ? (
 <div className="flex-1 flex justify-center px-4">
 {customHeaderTitle}
 </div>
 ) : (
 <div className="flex flex-col items-center gap-2">
 <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 border border-white/10 shadow-md">
 <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
 <span className="text-xs font-black text-white uppercase tracking-widest">{project.title}</span>
 </div>
 
 {/* SMART NOTIFICATION PROMPT */}
 <AnimatePresence>
 {!permissions.notifications && (
 <motion.button
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 onClick={handleEnableNotifications}
 className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30 transition-colors"
 >
 <BellOff size={12} />
 <span className="text-[10px] font-bold uppercase tracking-wide">{t('focus.session.enableNotifications')}</span>
 </motion.button>
 )}
 
 {/* SMART BATTERY PROMPT (Only shows if Notifs are enabled but Battery is restricted) */}
 {permissions.notifications && !permissions.battery && (
 <motion.button
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 onClick={handleDisableBatteryOpt}
 className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 transition-colors"
 >
 <Battery size={12} />
 <span className="text-[10px] font-bold uppercase tracking-wide">{t('focus.session.unrestrictBattery')}</span>
 </motion.button>
 )}
 </AnimatePresence>
 </div>
 )}

 <button 
 onClick={() => setShowHistory(true)}
 className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors relative"
 >
 <History size={20} />
 {project.sessions && project.sessions.length > 0 && (
 <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-[#1c1c1e]" />
 )}
 </button>
 </div>

 {/* Main Content (Flex Column Centered) */}
 <div className="flex-1 flex flex-col items-center justify-center gap-10 relative z-10 w-full min-h-0">
 
 {/* Mode Toggles (Placed ABOVE timer to avoid overlap) */}
        <div className="h-10 flex items-center justify-center relative z-50">
          <AnimatePresence mode='wait'>
 {!isActive && (
 <motion.div 
 key="mode-toggles"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="flex bg-black/50 border border-white/10 rounded-full p-1 shadow-md pointer-events-auto"
 >
 <button 
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setMode('POMO');
 setTimeLeft(project.pomoDuration * 60);
 setTotalDuration(project.pomoDuration * 60);
 }}
 className={cn(
 "px-6 py-2 rounded-full text-[10px] font-black tracking-[0.2em] transition-all duration-200",
 mode === 'POMO' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/70"
 )}
 >
 FOCUS
 </button>
 <button 
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setMode('STOPWATCH');
 setTimeLeft(0);
 setTotalDuration(0);
 }}
 className={cn(
 "px-6 py-2 rounded-full text-[10px] font-black tracking-[0.2em] transition-all duration-200",
 mode === 'STOPWATCH' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white/70"
 )}
 >
 FLOW
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Timer Ring */}
 <div className="relative w-[320px] h-[320px] flex items-center justify-center shrink-0 pointer-events-none">
 {/* SVG Ring - Using pointer-events-none to prevent blocking */}
               <svg className="absolute w-full h-full rotate-[-90deg] overflow-visible pointer-events-none" viewBox="0 0 320 320">
 <defs>
 <linearGradient id={`gradient-${project.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stopColor={themeColor} stopOpacity="1" />
 <stop offset="100%" stopColor={themeColor} stopOpacity="0.2" />
 </linearGradient>
 </defs>
 
 {/* Background Track */}
 <circle cx="160" cy="160" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
 
 {/* Progress Glow (Secondary layer for better visual without heavy filters) */}
 <motion.circle 
 cx="160" cy="160" r={radius} fill="none" 
 stroke={themeColor}
 strokeWidth="20"
 strokeLinecap="round"
 strokeDasharray={circumference}
 strokeDashoffset={dashOffset}
 initial={false}
 animate={{ 
 opacity: isActive && !isPaused ? 0.15 : 0,
 strokeWidth: isActive && !isPaused ? 24 : 20
 }}
 style={{ transition: 'stroke-dashoffset 1s linear, opacity 0.5s ease' }}
 />

 {/* Main Progress */}
 <circle 
 cx="160" cy="160" r={radius} fill="none" 
 stroke={`url(#gradient-${project.id})`}
 strokeWidth="12"
 strokeLinecap="round"
 strokeDasharray={circumference}
 strokeDashoffset={dashOffset}
 style={{ transition: 'stroke-dashoffset 1s linear' }}
 />


 </svg>

 {/* Time Display */}
 <div className="relative z-10 flex flex-col items-center pointer-events-auto">
 {isEditingTime ? (
 <div className="flex items-center justify-center relative">
 <input
 ref={inputRef}
 type="number"
 value={editTimeValue}
 onChange={(e) => setEditTimeValue(e.target.value)}
 onBlur={handleTimeSubmit}
 onKeyDown={handleTimeKeyDown}
 className="w-48 text-[5rem] font-mono font-bold text-white bg-transparent text-center outline-none border-b-2 border-white/20 leading-none tracking-tighter tabular-nums drop-shadow-md selection:bg-white/20"
 />
 <span className="absolute -right-8 bottom-4 text-sm font-bold text-white/40 uppercase tracking-widest">MIN</span>
 </div>
 ) : (
 <div 
 onClick={() => {
 if (!isActive) {
 setEditTimeValue(Math.floor(timeLeft / 60).toString());
 setIsEditingTime(true);
 }
 }}
 className={cn(
 "text-[5rem] font-mono font-bold text-white leading-none tracking-tighter tabular-nums drop-shadow-md select-none scale-y-110 transition-all relative",
 !isActive && "cursor-pointer hover:scale-110 hover:text-indigo-200"
 )}
 >
 {formatTime(timeLeft)}
 </div>
 )}
 <div className="mt-4 text-xs font-bold text-white/30 uppercase tracking-[0.3em] animate-pulse">
  {isActive 
    ? (isPaused 
      ? (i18n.language === 'es' ? 'Pausado' : 'Paused') 
      : (i18n.language === 'es' ? 'En marcha' : 'Running')) 
    : (isEditingTime 
      ? (i18n.language === 'es' ? 'Ajustar Duración' : 'Set Duration') 
      : (i18n.language === 'es' ? 'Listo' : 'Ready'))}
 </div>
 </div>
 </div>
 </div>

 {/* Controls Bar */}
 <div className="w-full px-8 pt-8 pb-20 flex items-center justify-center gap-10 relative z-20 shrink-0">
 <motion.button 
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 onClick={handleStop} 
 className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 hover:text-red-400 border border-white/10 flex items-center justify-center transition-colors group shadow-md"
 >
 <StopCircle size={24} className="group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)] transition-all" />
 </motion.button>
 
 <motion.button 
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={toggleTimer} 
 className="w-24 h-24 rounded-[3rem] flex items-center justify-center z-20 relative group overflow-hidden border border-white/10"
 style={{ 
 backgroundColor: isActive && !isPaused ? themeColor : 'rgba(255,255,255,0.1)',
 boxShadow: 'none'
 }}
 >
 {/* Inner glow div to replace CSS shadow */}
 {isActive && !isPaused && (
 <div 
 className="absolute inset-0 z-0 opacity-50"
 style={{ backgroundColor: themeColor }}
 />
 )}
 <div className="relative z-10 flex items-center justify-center">
 {isActive && !isPaused ? (
 <Pause size={36} fill="currentColor" className="text-white drop-shadow-md" />
 ) : (
 <Play size={36} fill="currentColor" className="ml-2 text-white drop-shadow-md" />
 )}
 </div>
 </motion.button>
 
 <motion.button 
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors shadow-md"
 >
 <Volume2 size={24} />
 </motion.button>
 </div>

 {/* Sub-Trait Picker Overlay (after session ends) */}
 <AnimatePresence>
   {pendingSessionData && hasSubTraits && attribute && (
     <SubTraitPickerModal
       subTraits={subTraits}
       attribute={attribute}
       themeColor={themeColor}
       onConfirm={(subTraitId) => {
         runFocusFlyingIcons();
         onCompleteSession(pendingSessionData.duration, pendingSessionData.mode, subTraitId);
         setPendingSessionData(null);
       }}
     />
   )}
 </AnimatePresence>

 {/* Session History Modal */}
 <AnimatePresence>
 {showHistory && (
 <SessionHistoryModal 
 isOpen={showHistory} 
 onClose={() => setShowHistory(false)} 
 project={project} 
 attribute={attribute}
 onUpdateProject={onUpdateProject} 
 onDeleteSession={onDeleteSession}
 onAddSession={(durationMinutes, type, sessionId, sessionDate, subTraitId) => {
 handleAddManualSessionWrapper(project.id, durationMinutes, type, sessionId, sessionDate, subTraitId);
 }}
 onEditSession={onEditSession}
 isActive={isActive}
 onShowWarning={() => setShowFocusProtectionModal(true)}
 />
 )}
 </AnimatePresence>

  <ConfirmationModal
  isOpen={showFocusProtectionModal}
  onClose={() => setShowFocusProtectionModal(false)}
  onConfirm={isActive ? handleConfirmExit : () => { setShowFocusProtectionModal(false); onExit(); }}
  title={isActive ? t('focus.session.stopAndExit') : t('focus.session.activeWarningTitle')}
  message={isActive ? t('focus.session.exitWarning') : t('focus.session.activeWarningMessage')}
  confirmText={isActive ? t('focus.session.exitConfirmBtn') : t('focus.session.understood')}
  cancelText={isActive ? t('common.cancel') : null}
  variant="warning"
  />
 </motion.div>
 );
};
