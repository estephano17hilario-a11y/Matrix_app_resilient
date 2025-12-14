import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusHUD from './components/StatusHUD';
import { 
  Zap, Brain, Users, Target, CheckCircle2, Trophy, Flame, 
  Plus, X, Dumbbell, Calendar, ListTodo, Star, Sparkles, 
  ChevronUp, ChevronDown, Check, Hash, List, Trash2, Infinity as InfinityIcon, 
  Crosshair, LayoutGrid, Clock, Palette, Lock,
  Play, Pause, StopCircle, Volume2, Briefcase, Hourglass, Bell, 
  ChevronLeft, ChevronRight, BarChart3, Image as ImageIcon, 
  PenTool, ArrowLeft, ArrowUp, Wallet, Shield, Crown, Anchor, Ghost, Feather, Type
} from 'lucide-react';

/**
 * ============================================================================
 * 💎 TYPE DEFINITIONS (STRICT MODE)
 * ============================================================================
 */

type ThemeType = 'gradient' | 'blob';

interface ThemeConfig {
  type: ThemeType;
  bg: string;
  accent: string;
  blobs?: { x: string; y: string; size: string }[];
}

interface Attribute {
  id: string;
  label: string;
  level: number;
  xp: number;
  maxXp: number;
  color: string;
  icon: React.ElementType;
}

interface Quest {
  id: string;
  title: string;
  description?: string;
  difficulty: 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
  xpReward: number;
  attribute: string;
  completed: boolean;
  deadline?: string;
}

interface Habit {
  id: string;
  title: string;
  description?: string;
  streak: number;
  completedToday: boolean;
  attribute: string;
  totalCompletions: number;
  frequency: string;
  type: 'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  reminderTime?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  attribute: string;
  goalTarget: number;
  goalFrequency: string;
  pomoDuration: number;
  breakDuration: number;
  impact: number;
  totalTime: number;
  reminder?: string;
}

interface NoteBlock {
  id: string;
  type: 'text' | 'check' | 'image';
  content: string;
  checked?: boolean;
}

interface Note {
  id: string;
  title: string;
  blocks: NoteBlock[];
  updatedAt: string;
  theme?: string;
  projectId?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  blocks: NoteBlock[];
  mood?: string;
  theme?: string;
  tags: string[];
}

interface NotificationItem {
  id: number;
  type: string;
  label: string;
  fromLevel: string | number;
  toLevel: string | number;
  icon: React.ElementType;
  color: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  icon: React.ElementType;
  color: string;
  type: string;
}

/**
 * ============================================================================
 * 💎 CORE ENGINE & ASSETS
 * ============================================================================
 */

const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

// --- UTILITIES ---
const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const adjustColor = (hex: string, amt: number) => {
    let usePound = false;
    if (hex[0] === "#") { hex = hex.slice(1); usePound = true; }
    const num = parseInt(hex, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
};

const toLocalISOString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatDateRange = (date: Date, range: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') => {
  if (range === 'DAY') return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  if (range === 'MONTH') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if (range === 'YEAR') return date.getFullYear().toString();
  
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric' })}`;
};

const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
};

const calculateStreak = (entries: JournalEntry[]) => {
    if (!entries.length) return 0;
    const sortedDates = [...new Set(entries.map(e => e.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = toLocalISOString(new Date());
    const yesterday = toLocalISOString(new Date(Date.now() - 86400000));
    
    // Check if streak is alive (has entry today or yesterday)
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    let currentDate = new Date(sortedDates[0]);
    for (let i = 0; i < sortedDates.length; i++) {
        const entryDate = new Date(sortedDates[i]);
        // Normalize times to compare only dates
        const cDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const eDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        
        const diffTime = Math.abs(cDate.getTime() - eDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (i === 0) { streak++; currentDate = entryDate; continue; }
        if (diffDays === 1) { streak++; currentDate = entryDate; } else { break; }
    }
    return streak;
};

// --- DATA ENGINE ---
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateFocusData = (date: Date, range: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR', contextId: string = 'global') => {
  const contextSeed = contextId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + contextSeed;
  
  const data: number[] = [];
  const labels: string[] = [];
  let max = 0;
  let totalHours = 0;

  if (range === 'DAY') {
    for (let i = 0; i <= 22; i += 2) { 
        const seed = baseSeed + date.getDate() * 100 + i;
        const timeBias = (i > 8 && i < 18) ? 1.5 : 0.5;
        const val = Math.floor(pseudoRandom(seed) * 60 * timeBias); 
        data.push(val);
        labels.push(`${i}h`);
        if(val > max) max = val;
        totalHours += val;
    }
  } else if (range === 'WEEK') {
    const start = getStartOfWeek(date);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const daySeed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + contextSeed;
        const val = Math.floor(pseudoRandom(daySeed) * 8 * 60); 
        data.push(val);
        labels.push(days[i]);
        if(val > max) max = val;
        totalHours += val;
    }
  } else if (range === 'MONTH') {
    const month = date.getMonth();
    for (let i = 1; i <= 4; i++) { 
        const weekSeed = baseSeed + month * 100 + i;
        const val = Math.floor(pseudoRandom(weekSeed) * 40 * 60);
        data.push(val);
        labels.push(`W${i}`);
        if(val > max) max = val;
        totalHours += val;
    }
  } else { 
     const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
     for(let i=0; i<12; i++){
         const mSeed = baseSeed + (i + 1) * 50;
         const val = Math.floor(pseudoRandom(mSeed) * 150 * 60); 
         data.push(val);
         labels.push(months[i]);
         if(val > max) max = val;
         totalHours += val;
     }
  }
  return { data, labels, max: max || 1, totalHours: (totalHours / 60).toFixed(1) };
};

// --- STYLES ---
const GlobalStyles = React.memo(() => (
  <style>{`
    :root {
      color-scheme: dark; 
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      user-select: none;
      --spring-easing: cubic-bezier(0.19, 1, 0.22, 1);
      --fluid-easing: cubic-bezier(0.32, 0.72, 0, 1);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: #000;
      color: white;
      overscroll-behavior-y: none;
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .accordion-grid { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.6s var(--spring-easing); will-change: grid-template-rows; contain: content; }
    .accordion-grid.open { grid-template-rows: 1fr; }
    .accordion-inner { overflow: hidden; transform: translateZ(0); }

    .glass-panel {
      background: rgba(22, 22, 24, 0.7); 
      backdrop-filter: blur(50px) saturate(180%);
      -webkit-backdrop-filter: blur(50px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05);
      transform: translateZ(0);
      will-change: transform;
    }

    .apple-btn {
        background: #ffffff;
        color: #000000;
        border: none;
        box-shadow: 0 0 20px rgba(255,255,255,0.1);
        transition: all 0.4s var(--spring-easing);
    }
    .apple-btn:active { transform: scale(0.96); opacity: 0.8; }
    
    .apple-input {
        background: rgba(20,20,20,0.6);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        backdrop-filter: blur(20px);
        transition: all 0.3s ease;
    }
    .apple-input:focus-within {
        background: rgba(30,30,30,0.8);
        border-color: rgba(255,255,255,0.3);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
        transform: scale(1.01);
    }

    .trait-card {
        background: rgba(15,15,15,0.6);
        border: 1px solid rgba(255,255,255,0.05);
        backdrop-filter: blur(20px);
        transition: all 0.4s var(--spring-easing);
    }
    .trait-card.selected {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.4);
        box-shadow: 0 0 30px -5px rgba(255,255,255,0.1);
        transform: scale(1.02);
    }

    .bar-animate {
        transition: clip-path 0.6s var(--spring-easing), background-color 0.3s ease;
        will-change: clip-path;
    }
    .date-slide-enter { animation: slideInDate 0.4s var(--fluid-easing) forwards; }
    @keyframes slideInDate { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    
    input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.6; }

    @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
    @keyframes spin-aura { to { --angle: 360deg; } }
    
    .aura-container {
      position: relative; isolation: isolate; overflow: hidden;
      will-change: transform, width, height, border-radius;
      box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5);
      transform: translateZ(0);
    }
    .aura-container::before {
      content: ''; position: absolute; inset: -50%;
      background: conic-gradient(from var(--angle), #3b82f6, #8b5cf6, #d946ef, #06b6d4, #3b82f6);
      animation: spin-aura 4s linear infinite; z-index: -2; 
      opacity: 0; transition: opacity 0.5s ease-in-out; will-change: opacity;
    }
    .aura-container::after {
      content: ''; position: absolute; inset: 1px; 
      background: rgba(18, 18, 20, 0.4);
      backdrop-filter: blur(60px) saturate(200%); -webkit-backdrop-filter: blur(60px) saturate(200%);
      border-radius: inherit; z-index: -1;
      transition: background 0.5s ease;
      box-shadow: inset 0 0 20px rgba(255,255,255,0.05);
    }
    .aura-active::before { opacity: 1; filter: blur(15px); }
    .aura-active::after { background: rgba(10, 10, 12, 0.5); box-shadow: inset 0 0 30px rgba(255,255,255,0.1); } 
    .aura-active { box-shadow: 0 0 80px -20px rgba(59, 130, 246, 0.5); border: 1px solid rgba(255,255,255,0.15); }

    .btn-orb-glow {
      position: relative; overflow: hidden;
      background: #1a1a1a; z-index: 10;
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 10px 30px -5px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
      transform: translateZ(0);
    }
    .btn-orb-glow::before {
      content: ''; position: absolute; top: 50%; left: 50%;
      width: 200%; height: 200%;
      background: conic-gradient(from 0deg, #06b6d4, transparent 40%, #ec4899, transparent 90%, #06b6d4);
      transform: translate(-50%, -50%);
      animation: orb-spin 10s linear infinite;
      filter: blur(12px); z-index: -1; opacity: 0.6;
      will-change: transform;
    }
    @keyframes orb-spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

    .animate-enter-view { animation: enterView 0.5s var(--spring-easing) forwards; will-change: transform, opacity; }
    @keyframes enterView { 0% { opacity: 0; transform: translateY(10px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
    .animate-modal-enter { animation: modalMagnet 0.5s var(--spring-easing) forwards; will-change: transform, opacity; }
    @keyframes modalMagnet { 0% { opacity: 0; transform: scale(0.92) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
    
    .ring-progress { transition: stroke-dashoffset 1s linear; will-change: stroke-dashoffset; }
    .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
    @keyframes pulseGlow { 0%, 100% { filter: drop-shadow(0 0 10px currentColor); } 50% { filter: drop-shadow(0 0 25px currentColor); } }
    
    .editor-block:focus-within { background: rgba(255,255,255,0.03); }
    .glass-editor {
        background: rgba(10, 10, 12, 0.4);
        backdrop-filter: blur(50px) saturate(150%);
        -webkit-backdrop-filter: blur(50px) saturate(150%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 40px 80px -20px rgba(0,0,0,0.8);
    }
  `}</style>
));

// --- THEME DEFINITIONS ---
const THEMES: Record<string, ThemeConfig> = {
  OLED: { type: 'gradient', bg: 'bg-black', accent: '#ffffff' },
  SPOTLIGHT: { type: 'gradient', bg: 'bg-[#000000]', accent: '#38bdf8' },
  NEBULA: { type: 'blob', bg: 'bg-[#000000]', blobs: [{ x: '10%', y: '20%', size: '700px' }, { x: '80%', y: '10%', size: '600px' }, { x: '50%', y: '80%', size: '900px' }], accent: '#8b5cf6' },
  AURORA: { type: 'blob', bg: 'bg-[#000000]', blobs: [{ x: '20%', y: '-10%', size: '800px' }, { x: '80%', y: '50%', size: '700px' }, { x: '10%', y: '90%', size: '600px' }], accent: '#14b8a6' },
  SUNSET: { type: 'blob', bg: 'bg-[#000000]', blobs: [{ x: '10%', y: '10%', size: '800px' }, { x: '80%', y: '80%', size: '700px' }, { x: '50%', y: '50%', size: '500px' }], accent: '#f59e0b' }
};

const NOTE_THEMES = [
    { id: 'slate', color: '#64748b' },
    { id: 'red', color: '#ef4444' },
    { id: 'orange', color: '#f97316' },
    { id: 'amber', color: '#f59e0b' },
    { id: 'green', color: '#10b981' },
    { id: 'cyan', color: '#06b6d4' },
    { id: 'blue', color: '#3b82f6' },
    { id: 'indigo', color: '#6366f1' },
    { id: 'purple', color: '#8b5cf6' },
    { id: 'pink', color: '#ec4899' },
];

const MOODS = [
    { id: 'rad', icon: '🚀', color: '#10b981', label: 'Radiant' },
    { id: 'good', icon: '😊', color: '#3b82f6', label: 'Good' },
    { id: 'meh', icon: '😐', color: '#94a3b8', label: 'Neutral' },
    { id: 'bad', icon: '🌧️', color: '#64748b', label: 'Low' },
    { id: 'awful', icon: '⛈️', color: '#ef4444', label: 'Drained' },
];

// --- BACKGROUND ENGINE ---
const LuxuryBackground = React.memo(({ theme, overrideColor }: { theme: string, overrideColor?: string }) => {
  const activeTheme = THEMES[theme] || THEMES.SPOTLIGHT;
  const baseColor = overrideColor || activeTheme.accent;
  const palette = useMemo(() => ({
      primary: hexToRgba(baseColor, 0.4),
      secondary: hexToRgba(adjustColor(baseColor, -30), 0.35),
      tertiary: hexToRgba(adjustColor(baseColor, 30), 0.3)
  }), [baseColor]);

    const [floatAnimation, setFloatAnimation] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
        const x1 = Math.random() * 40 - 20;
        const y1 = Math.random() * 40 - 20;
        setFloatAnimation(`@keyframes float { 0% { transform: translate3d(0, 0, 0) scale(1); } 100% { transform: translate3d(${x1}px, ${y1}px, 0) scale(1.05); } }`);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`fixed inset-0 z-0 ${activeTheme.bg} overflow-hidden pointer-events-none transition-colors duration-[2500ms] cubic-bezier(0.4, 0, 0.2, 1) transform-gpu`}>
      {activeTheme.type === 'gradient' && (
          <>
            <div className="absolute inset-0 transition-all duration-[2500ms] cubic-bezier(0.4, 0, 0.2, 1) will-change-[background]" style={{ background: `radial-gradient(circle at 50% -10%, ${palette.primary} 0%, transparent 70%)` }} />
            <div className="absolute inset-0 transition-all duration-[2500ms] cubic-bezier(0.4, 0, 0.2, 1) will-change-[background]" style={{ background: `radial-gradient(circle at 50% 110%, ${palette.secondary} 0%, transparent 60%)` }} />
          </>
      )}
      {activeTheme.type === 'blob' && activeTheme.blobs?.map((blob, i) => {
          const blobColor = i === 0 ? palette.primary : i === 1 ? palette.secondary : palette.tertiary;
          return (
            <div key={i} className="absolute rounded-full blur-[100px] mix-blend-screen animate-pulse-slow transition-colors duration-[2500ms] cubic-bezier(0.4, 0, 0.2, 1) will-change-transform" 
                 style={{ backgroundColor: blobColor, left: blob.x, top: blob.y, width: blob.size, height: blob.size, opacity: 1, transform: 'translate3d(0,0,0)', animation: `float ${20 + i * 5}s infinite ease-in-out alternate` }} />
          )
      })}
      <div className="absolute inset-0 z-[1] opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: `url("${NOISE_SVG}")` }} />
      <style>{floatAnimation}</style>
    </div>
  );
}, (prev, next) => prev.theme === next.theme && prev.overrideColor === next.overrideColor);

// --- COMPONENT DEFINITIONS ---

const BarChart = React.memo(({ 
    datasets, 
    labels, 
    height = 160,
    max,
    showGrid = true,
    className = "",
    barClassName = ""
}: { 
    datasets: { data: number[]; color: string; label?: string }[];
    labels: string[];
    height?: number;
    max?: number;
    showGrid?: boolean;
    className?: string;
    barClassName?: string;
}) => {
    const maxValue = useMemo(() => max || Math.max(...datasets.flatMap(d => d.data), 1), [datasets, max]);
    
    return (
        <div className={`w-full relative select-none ${className}`} style={{ height }}>
             {/* Grid Lines */}
             {showGrid && (
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-10">
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                    <div className="border-t border-dashed border-white/20 w-full" />
                </div>
             )}

            <div className="absolute inset-0 flex items-end gap-2 pt-4">
                {labels.map((label, i) => (
                    <div key={i} className="flex-1 h-full flex flex-col justify-end gap-1 group relative z-10">
                        {/* Tooltip */}
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl flex flex-col items-center gap-1 min-w-[80px] scale-95 group-hover:scale-100 origin-bottom duration-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                            {datasets.map((ds, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs font-black text-white whitespace-nowrap">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ds.color, boxShadow: `0 0 5px ${ds.color}` }} />
                                    {ds.data[i]} <span className="text-[9px] text-white/40 font-bold ml-auto">{ds.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Bars Container */}
                        <div className="w-full flex items-end justify-center gap-1 h-full relative px-0.5">
                            {datasets.map((ds, idx) => {
                                const val = ds.data[i];
                                const h = (val / maxValue);
                                return (
                                    <div key={idx} className="w-full h-full relative rounded-sm overflow-hidden group-hover:brightness-125 bg-white/5 transition-colors">
                                         <div 
                                            className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${barClassName}`}
                                            style={{ 
                                                height: '100%',
                                                backgroundColor: `${ds.color}`, 
                                                opacity: 0.9,
                                                transform: `scaleY(${h})`,
                                                transformOrigin: 'bottom'
                                            }}
                                         >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/50 shadow-[0_0_10px_white]" />
                                         </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Label */}
                        <span className="text-[9px] font-bold text-slate-500 text-center mt-1 group-hover:text-white transition-colors">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

const QuestItem = React.memo(({ quest, attribute, onComplete }: { quest: Quest, attribute?: Attribute, onComplete: (e: React.MouseEvent, q: Quest) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = attribute?.icon;
  return (
    <div className={`relative rounded-[1.25rem] transition-transform duration-300 ease-out mb-3 group active:scale-[0.98] ${expanded ? 'z-10' : ''}`} style={{ padding: '1px', background: `linear-gradient(145deg, ${attribute?.color || '#333'} 0%, rgba(255,255,255,0.05) 40%, transparent 100%)` }}>
        <div className="relative bg-[#121216] rounded-[1.2rem] overflow-hidden">
            <div className="relative z-10 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-4">
                    <button onClick={(e) => onComplete(e, quest)} className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 active:scale-90 active:opacity-80 ${quest.completed ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-95' : 'bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-cyan-400/10'}`}>{quest.completed ? <CheckCircle2 size={20} strokeWidth={3.5} /> : <div className="w-3 h-3 rounded-full bg-white/20" />}</button>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1"><h3 className={`text-[15px] font-bold truncate pr-2 leading-tight tracking-tight ${quest.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{quest.title}</h3><span className={`text-[9px] px-1.5 py-0.5 rounded-[4px] font-black border uppercase tracking-wide text-white/50 border-white/10`}>RANK {quest.difficulty}</span></div>
                        <div className="flex items-center gap-3"><div className="flex items-center gap-1.5 text-slate-400">{attribute && Icon && (<div className="flex items-center gap-1.5"><Icon size={12} style={{ color: attribute.color }} strokeWidth={2.5} /><span className="text-[11px] font-bold tracking-wide" style={{ color: attribute.color }}>{attribute.label}</span></div>)}</div></div>
                    </div>
                </div>
                <div className={`accordion-grid ${expanded ? 'open' : ''}`}><div className="accordion-inner"><div className="pt-4 pb-1"><div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />{quest.description && (<div className="text-[13px] text-slate-400 leading-relaxed px-1 font-medium mb-3">"{quest.description}"</div>)}</div></div></div>
            </div>
        </div>
    </div>
  );
});

const HabitItem = React.memo(({ habit, attribute, onComplete }: { habit: Habit, attribute?: Attribute, onComplete: (e: React.MouseEvent, h: Habit) => void }) => {
    const Icon = attribute?.icon;
    return (
        <div className="group relative glass-panel rounded-[1.5rem] p-1 transition-all duration-300 hover:bg-[#1a1a20]/80 active:scale-[0.99] active:opacity-95">
            <div className="relative flex items-center p-3 gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-transform group-hover:scale-105" style={{ backgroundColor: `${attribute?.color}15` }}>{attribute && Icon && <Icon size={22} style={{ color: attribute.color }} strokeWidth={2} />}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-[15px] mb-1 tracking-tight truncate">{habit.title}</h4>
                    <div className="flex flex-wrap items-center gap-2"><div className={`flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md border ${habit.completedToday ? 'text-orange-400 border-orange-500/20 bg-orange-500/10' : 'text-slate-500 border-white/5 bg-white/5'}`}><Flame size={10} className={habit.completedToday ? 'fill-orange-400' : ''} />{habit.streak}</div></div>
                </div>
                <button onClick={(e) => onComplete(e, habit)} className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 relative overflow-hidden active:scale-90 ${habit.completedToday ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-transparent shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-[#0a0a0c] border-white/10 hover:border-white/30'}`}>{habit.completedToday ? (<Check size={24} className="text-white drop-shadow-md animate-in zoom-in spin-in-12 duration-300" strokeWidth={3.5} />) : (<div className="w-4 h-4 rounded-full border-[2.5px] border-white/20 group-hover:border-white/50 transition-colors" />)}</button>
            </div>
        </div>
    );
});

const BlockEditor = React.memo(({ blocks, onChange, readOnly = false }: { blocks: NoteBlock[], onChange: (blocks: NoteBlock[]) => void, readOnly?: boolean }) => {
    // Removed synchronous useEffect to prevent rendering loops.
    // Initialization of empty blocks should be handled by the parent component.

    const updateBlock = (id: string, updates: Partial<NoteBlock>) => {
        onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const removeBlock = (id: string) => {
        onChange(blocks.filter(b => b.id !== id));
    };

    const adjustHeight = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    if (blocks.length === 0 && !readOnly) {
        return (
             <div className="h-40 flex items-center justify-center text-white/20 italic cursor-text" onClick={() => onChange([{ id: Date.now().toString(), type: 'text', content: '' }])}>
                 Tap to start writing...
             </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 w-full pb-20">
            {blocks.map((block, index) => (
                <div key={block.id} className="group relative flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300 editor-line">
                    {!readOnly && (
                        <div className="absolute -left-8 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => removeBlock(block.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors"><Trash2 size={14} /></button>
                        </div>
                    )}
                    
                    {block.type === 'text' && (
                        <textarea 
                            ref={el => { if(el) adjustHeight(el) }} // Initial adjustment
                            autoFocus={index === blocks.length - 1 && !block.content}
                            value={block.content} 
                            onChange={(e) => { 
                                updateBlock(block.id, { content: e.target.value });
                                adjustHeight(e.target);
                            }} 
                            placeholder="Type something..." 
                            className="w-full bg-transparent text-slate-100 placeholder:text-slate-600 resize-none outline-none leading-relaxed text-[17px] font-normal font-sans" 
                            style={{ minHeight: '1.5em', overflow: 'hidden' }}
                            readOnly={readOnly}
                        />
                    )}

                    {block.type === 'check' && (
                        <div className="flex items-center gap-3 w-full group/check">
                            <button onClick={() => !readOnly && updateBlock(block.id, { checked: !block.checked })} className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all ${block.checked ? 'bg-blue-500 border-blue-500' : 'border-white/30 bg-transparent group-hover/check:border-white/60'}`}>
                                {block.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                            </button>
                            <input 
                                type="text" 
                                value={block.content} 
                                onChange={(e) => updateBlock(block.id, { content: e.target.value })} 
                                className={`w-full bg-transparent outline-none text-[17px] transition-all ${block.checked ? 'text-slate-500 line-through' : 'text-slate-100'}`}
                                placeholder="To-do item"
                                readOnly={readOnly}
                            />
                        </div>
                    )}

                    {block.type === 'image' && (
                        <div className="w-full rounded-2xl overflow-hidden bg-black/20 border border-white/10 relative group/img aspect-video shadow-sm mt-2 mb-2">
                            {block.content ? (
                                <img src={block.content} alt="Attachment" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50">
                                    <ImageIcon size={32} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Image Placeholder</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
});

const DropdownThemePicker = ({ currentTheme, onSelect, projects, activeProject, onSelectProject }: { currentTheme: string, onSelect: (id: string) => void, projects: Project[] | null, activeProject: string | undefined, onSelectProject: (id: string | undefined) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const activeColor = NOTE_THEMES.find(t => t.id === currentTheme)?.color || '#fff';
    
    return (
        <div className="relative z-50">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95">
               <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: activeColor, color: activeColor }} />
               <ChevronDown size={12} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-64 bg-[#1c1c1e] rounded-2xl border border-white/10 shadow-2xl p-4 z-[999] animate-in fade-in zoom-in-95 flex flex-col gap-4">
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color Tag</span>
                        <div className="grid grid-cols-7 gap-2">
                            {NOTE_THEMES.map(t => (
                                <button key={t.id} onClick={() => { onSelect(t.id); }} className={`w-6 h-6 rounded-full transition-all ${currentTheme === t.id ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1e]' : 'hover:scale-110 opacity-70 hover:opacity-100'}`} style={{ backgroundColor: t.color }} />
                            ))}
                        </div>
                    </div>
                    {projects && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Link Project</span>
                             <div className="flex flex-col gap-1 max-h-32 overflow-y-auto no-scrollbar">
                                <button onClick={() => { onSelectProject(undefined); setIsOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${!activeProject ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                                    <div className="w-2 h-2 rounded-full bg-slate-500" /> None
                                </button>
                                {projects.map((p) => (
                                    <button key={p.id} onClick={() => { onSelectProject(p.id); setIsOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${activeProject === p.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                                        <div className="w-2 h-2 rounded-full bg-blue-500" /> {p.title}
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
};

const EditorToolbar = ({ onAdd }: { onAdd: (type: 'text' | 'check' | 'image') => void }) => (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-2xl bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 shadow-2xl z-40 animate-in slide-in-from-bottom-4">
        <button onClick={() => onAdd('check')} className="p-3 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"><ListTodo size={20} strokeWidth={1.5} /></button>
        <div className="w-[1px] h-6 bg-white/10" />
        <button onClick={() => onAdd('image')} className="p-3 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"><ImageIcon size={20} strokeWidth={1.5} /></button>
        <div className="w-[1px] h-6 bg-white/10" />
        <button onClick={() => onAdd('text')} className="p-3 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"><PenTool size={20} strokeWidth={1.5} /></button>
    </div>
);

const NotesStatsModal = ({ isOpen, onClose, notes, journalEntries }: { isOpen: boolean, onClose: () => void, notes: Note[], journalEntries: JournalEntry[] }) => {
    const [range, setRange] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');

    const stats = useMemo(() => {
        const now = new Date();
        let labels: string[] = [];
        let notesData: number[] = [];
        let journalData: number[] = [];
        
        if (range === 'WEEK') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
                const dateStr = toLocalISOString(d);
                notesData.push(notes.filter(n => toLocalISOString(new Date(n.updatedAt)) === dateStr).length);
                journalData.push(journalEntries.filter(j => j.date === dateStr).length);
            }
        } else if (range === 'MONTH') {
            for (let i = 3; i >= 0; i--) {
                const start = new Date(now);
                start.setDate(start.getDate() - (i * 7) - 6);
                const end = new Date(now);
                end.setDate(end.getDate() - (i * 7));
                
                labels.push(`W${4-i}`);
                
                let nFill = 0;
                let jFill = 0;
                notes.forEach(n => {
                    const d = new Date(n.updatedAt);
                    if (d >= start && d <= end) nFill++;
                });
                journalEntries.forEach(j => {
                    const d = new Date(j.date);
                    if (d >= start && d <= end) jFill++;
                });
                notesData.push(nFill);
                journalData.push(jFill);
            }
        } else {
             for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(d.toLocaleDateString('en-US', { month: 'narrow' }));
                
                const month = d.getMonth();
                const year = d.getFullYear();
                
                notesData.push(notes.filter(n => {
                    const nd = new Date(n.updatedAt);
                    return nd.getMonth() === month && nd.getFullYear() === year;
                }).length);
                 journalData.push(journalEntries.filter(j => {
                    const jd = new Date(j.date);
                    return jd.getMonth() === month && jd.getFullYear() === year;
                }).length);
             }
        }

        const max = Math.max(...notesData, ...journalData, 1);
        
        let totalWords = 0;
        notes.forEach(n => n.blocks.forEach(b => totalWords += (b.content || '').split(/\s+/).length));
        journalEntries.forEach(j => j.blocks.forEach(b => totalWords += (b.content || '').split(/\s+/).length));

        return {
            labels, notesData, journalData, max,
            totalNotes: notes.length,
            totalJournal: journalEntries.length,
            streak: calculateStreak(journalEntries),
            words: totalWords
        };
    }, [notes, journalEntries, range]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="absolute inset-0 bg-black/60 backdrop-blur-xl" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="relative z-10 w-full max-w-[420px] bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                    >
                        {/* Noise Texture */}
                        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("${NOISE_SVG}")` }} />
                        
                        {/* Header */}
                        <div className="p-6 pb-2 flex justify-between items-center relative z-10">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-white">Insights</h2>
                                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mt-1">Productivity Analytics</p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors active:scale-90 border border-white/5">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Bento Grid Stats */}
                        <div className="grid grid-cols-2 gap-3 px-6 mb-6 relative z-10">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-blue-400"><PenTool size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Notes</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{stats.totalNotes}</div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-purple-400"><Brain size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Entries</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{stats.totalJournal}</div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-orange-400"><Flame size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Streak</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{stats.streak} <span className="text-sm font-medium text-white/30">days</span></div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-2 mb-2 text-green-400"><Type size={16} className="group-hover:scale-110 transition-transform" /> <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Words</span></div>
                                <div className="text-2xl font-black text-white tracking-tight">{(stats.words / 1000).toFixed(1)}k</div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="px-6 pb-6 relative z-10">
                             <div className="flex bg-black/20 p-1 rounded-xl mb-6 backdrop-blur-sm border border-white/5">
                                {['WEEK', 'MONTH', 'YEAR'].map(r => (
                                    <button key={r} onClick={() => setRange(r as any)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${range === r ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'text-white/30 hover:text-white/60'}`}>{r}</button>
                                ))}
                            </div>
                            
                            <BarChart 
                                datasets={[
                                    { data: stats.notesData, color: '#60a5fa', label: 'Notes' },
                                    { data: stats.journalData, color: '#c084fc', label: 'Journal' }
                                ]}
                                labels={stats.labels}
                                height={160}
                                max={stats.max}
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// --- COMPOSITE VIEWS ---

interface NotesViewProps {
    notes: Note[];
    onUpdateNote: (n: Note) => void;
    onDeleteNote: (id: string) => void;
    journalEntries: JournalEntry[];
    onUpdateJournal: (j: JournalEntry) => void;
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
    projects: Project[];
}

const NotesView = React.memo(({ notes, onUpdateNote, onDeleteNote, journalEntries, onUpdateJournal, onInteractionStart, onInteractionEnd, projects }: NotesViewProps) => {
    const [subView, setSubView] = useState<'NOTES' | 'JOURNAL'>('NOTES');
    const [editorMode, setEditorMode] = useState<'NONE' | 'NOTE' | 'JOURNAL'>('NONE');
    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftBlocks, setDraftBlocks] = useState<NoteBlock[]>([]);
    const [draftTheme, setDraftTheme] = useState('slate');
    const [draftMood, setDraftMood] = useState<string | undefined>(undefined);
    const [draftProjectId, setDraftProjectId] = useState<string | undefined>(undefined);
    const [draftDate, setDraftDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showStats, setShowStats] = useState(false);
    const streak = useMemo(() => calculateStreak(journalEntries), [journalEntries]);

    const openNote = useCallback((note: Note) => { 
        setEditorMode('NOTE'); setDraftId(note.id); setDraftTitle(note.title); setDraftBlocks(note.blocks); setDraftTheme(note.theme || 'slate'); setDraftProjectId(note.projectId); onInteractionStart(); 
    }, [onInteractionStart]);
    
    const createNote = useCallback(() => { 
        const newId = Date.now().toString(); setEditorMode('NOTE'); setDraftId(newId); setDraftTitle(''); setDraftBlocks([{ id: 'init-1', type: 'text', content: '' }]); setDraftTheme('slate'); setDraftProjectId(undefined); onInteractionStart(); 
    }, [onInteractionStart]);
    
    const openJournal = useCallback((date: Date) => { 
        const dateStr = toLocalISOString(date); 
        const entry = journalEntries.find((e: JournalEntry) => e.date === dateStr); 
        setEditorMode('JOURNAL'); setDraftDate(date); setDraftId(entry?.id || Date.now().toString()); setDraftBlocks(entry?.blocks || [{ id: 'init-1', type: 'text', content: '' }]); setDraftMood(entry?.mood); setDraftTheme(entry?.theme || 'slate'); onInteractionStart(); 
    }, [journalEntries, onInteractionStart]);
    
    const handleSave = () => { 
        if (editorMode === 'NOTE' && draftId) { 
            onUpdateNote({ id: draftId, title: draftTitle, blocks: draftBlocks, theme: draftTheme, projectId: draftProjectId, updatedAt: new Date().toISOString() }); 
        } else if (editorMode === 'JOURNAL' && draftId) { 
            onUpdateJournal({ id: draftId, date: toLocalISOString(draftDate), blocks: draftBlocks, mood: draftMood, theme: draftTheme, tags: [] }); 
        } 
        closeEditor(); 
    };
    
    const handleDelete = () => { if (editorMode === 'NOTE' && draftId) { onDeleteNote(draftId); } closeEditor(); };
    const closeEditor = () => { setEditorMode('NONE'); setDraftId(null); onInteractionEnd(); };
    const addBlock = (type: 'text' | 'check' | 'image') => { setDraftBlocks(prev => [...prev, { id: Date.now().toString(), type, content: '', checked: false }]); };
    
    const { days, firstDay } = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);
    const emptyDays = Array(firstDay).fill(null);
    const monthDays = Array.from({ length: days }, (_, i) => i + 1);
    const activeThemeColor = NOTE_THEMES.find(t => t.id === draftTheme)?.color || '#fff';

    return (
        <div className="h-full flex flex-col relative">
            <div className={`transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${editorMode !== 'NONE' ? 'opacity-0 scale-95 pointer-events-none blur-sm' : 'opacity-100 scale-100'}`}>
                <div className="flex items-center justify-between mb-6 mt-4 relative z-10 px-4">
                    <div className="w-8" />
                    <div className="bg-black/30 p-1 rounded-full border border-white/10 flex relative backdrop-blur-xl shadow-2xl">
                        <div className={`absolute inset-y-1 w-[50%] bg-white/10 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-inner ${subView === 'JOURNAL' ? 'left-[49%]' : 'left-[1%]'}`} />
                        <button onClick={() => setSubView('NOTES')} className={`relative px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${subView === 'NOTES' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>Notes</button>
                        <button onClick={() => setSubView('JOURNAL')} className={`relative px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${subView === 'JOURNAL' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>Journal</button>
                    </div>
                    <button onClick={() => setShowStats(true)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><BarChart3 size={16} /></button>
                </div>
                {subView === 'NOTES' && (
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32 animate-in slide-in-from-left-4 fade-in duration-500 px-1">
                        <div className="columns-2 gap-4 space-y-4">
                            <button onClick={createNote} className="w-full aspect-[4/5] rounded-[24px] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all group backdrop-blur-sm"><div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5 shadow-lg"><Plus size={28} className="text-white/80" strokeWidth={1.5} /></div><span className="text-xs font-bold text-white/40 uppercase tracking-widest group-hover:text-white/80 transition-colors">New Note</span></button>
                            {notes.map((note) => {
                                const themeColor = NOTE_THEMES.find(t => t.id === note.theme)?.color || '#64748b';
                                const project = projects.find((p) => p.id === note.projectId);
                                return (
                                    <div key={note.id} onClick={() => openNote(note)} className="w-full break-inside-avoid mb-4 rounded-[24px] p-5 flex flex-col justify-between hover:scale-[1.02] active:scale-98 transition-all cursor-pointer group relative overflow-hidden shadow-lg border border-white/5 bg-black/20 backdrop-blur-xl">
                                        <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none transition-opacity duration-500" style={{ background: `linear-gradient(to bottom, ${themeColor}, transparent)` }} />
                                        <div className="relative z-10">
                                            {project && <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"/><span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">{project.title}</span></div>}
                                            <h3 className={`text-[17px] font-bold leading-tight mb-3 line-clamp-2 ${!note.title ? 'text-white/30 italic' : 'text-white'}`}>{note.title || 'Untitled'}</h3>
                                            <p className="text-[13px] text-white/60 line-clamp-6 leading-relaxed font-medium break-words">{note.blocks.find(b => b.type === 'text')?.content || <span className="italic opacity-50">Empty...</span>}</p>
                                        </div>
                                        <div className="relative z-10 mt-4 flex justify-between items-center border-t border-white/5 pt-3"><span className="text-[10px] font-medium text-white/30">{new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} /></div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
                {subView === 'JOURNAL' && (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-500">
                        <div className="flex justify-between items-end px-6 mb-6">
                            <div>
                                <span className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">{streak > 0 && <span className="text-orange-500 flex items-center gap-1 animate-pulse"><Flame size={12} fill="currentColor"/> {streak} Day Streak</span>}{!streak && "Your Story"}</span>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none">{currentMonth.toLocaleDateString('en-US', { month: 'long' })} <span className="text-white/20">{currentMonth.getFullYear()}</span></h2>
                            </div>
                            <div className="flex gap-2"><button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronLeft size={18} /></button><button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"><ChevronRight size={18} /></button></div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 px-4 text-center mb-2">{['S','M','T','W','T','F','S'].map((d, i) => <span key={i} className="text-[10px] font-bold text-white/30">{d}</span>)}</div>
                        <div className="grid grid-cols-7 gap-3 px-4 pb-32 flex-1 content-start">
                            {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
                            {monthDays.map(day => {
                                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                const dateStr = toLocalISOString(date);
                                const entry = journalEntries.find((e) => e.date === dateStr);
                                const mood = MOODS.find(m => m.id === entry?.mood);
                                const isToday = toLocalISOString(new Date()) === dateStr;
                                return (
                                    <button key={day} onClick={() => openJournal(date)} className={`aspect-[4/5] rounded-[18px] flex flex-col items-center justify-between p-2 relative transition-all active:scale-90 group overflow-hidden border ${isToday ? 'bg-white/10 border-white/20 shadow-lg ring-1 ring-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}`}>
                                        {mood && <div className="absolute inset-0 opacity-20 bg-gradient-to-b from-transparent to-current transition-opacity" style={{ color: mood.color }} />}
                                        <div className="flex-1 flex items-center justify-center z-10 w-full">{mood ? <span className="text-2xl filter drop-shadow-lg group-hover:scale-125 transition-transform duration-300">{mood.icon}</span> : null}</div>
                                        <div className="w-full flex justify-end z-10 absolute bottom-2 right-2"><span className={`text-[12px] font-bold ${isToday ? 'text-white' : 'text-white/30 group-hover:text-white/80'}`}>{day}</span></div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
            <NotesStatsModal isOpen={showStats} onClose={() => setShowStats(false)} notes={notes} journalEntries={journalEntries} />
            <div className={`absolute inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${editorMode !== 'NONE' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-[20px] pointer-events-none'}`}>
                {editorMode !== 'NONE' && (
                    <div className="w-full h-full max-w-2xl mx-auto flex flex-col p-4 sm:p-6">
                        <div className="glass-editor rounded-[36px] flex-1 flex flex-col relative animate-in fade-in zoom-in-95 duration-500 delay-100 shadow-2xl">
                             <div className="absolute inset-0 rounded-[36px] overflow-hidden pointer-events-none">
                                <div className="absolute top-0 left-0 right-0 h-64 opacity-15 pointer-events-none blur-3xl transition-colors duration-1000" style={{ background: `radial-gradient(circle at 50% 0%, ${activeThemeColor}, transparent 70%)` }} />
                             </div>
                            
                            <div className="flex justify-between items-center p-6 border-b border-white/5 relative z-20">
                                <button onClick={closeEditor} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95 border border-white/5"><ArrowLeft size={20} /></button>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2"><DropdownThemePicker currentTheme={draftTheme} onSelect={setDraftTheme} projects={editorMode === 'NOTE' ? projects : null} activeProject={draftProjectId} onSelectProject={setDraftProjectId} /></div>
                                    <div className="w-[1px] h-6 bg-white/10" />
                                    {editorMode === 'NOTE' && <button onClick={handleDelete} className="w-10 h-10 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 size={18} /></button>}
                                    <button onClick={handleSave} className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">Save</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 relative rounded-b-[36px]">
                                {editorMode === 'NOTE' ? (
                                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="relative mb-6">
                                            {draftProjectId && (<div className="inline-flex items-center gap-1 mb-3 px-2 py-0.5 rounded-md bg-white/5 border border-white/5"><Briefcase size={10} className="text-slate-400"/><span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{projects.find((p) => p.id === draftProjectId)?.title}</span></div>)}
                                            <input type="text" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Untitled Note" className="w-full bg-transparent text-4xl font-black text-white placeholder:text-white/10 outline-none leading-tight tracking-tight" />
                                        </div>
                                        <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
                                    </div>
                                ) : (
                                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="text-center mb-8 relative z-10">
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">{draftDate.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                                            <h2 className="text-5xl font-black text-white mt-1 tracking-tighter leading-none mb-4">{draftDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</h2>
                                            <div className="inline-flex justify-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                                                {MOODS.map(m => ( <button key={m.id} onClick={() => setDraftMood(m.id)} className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all ${draftMood === m.id ? 'bg-white/10 scale-110 shadow-lg ring-1 ring-white/20' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}`}>{m.icon}</button> ))}
                                            </div>
                                        </div>
                                        <BlockEditor blocks={draftBlocks} onChange={setDraftBlocks} />
                                    </div>
                                )}
                            </div>
                            <EditorToolbar onAdd={addBlock} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// --- FOCUS STATS COMPONENT ---
const FocusStats = React.memo(({ isExpanded, toggleExpand, projects, attributes }: { isExpanded: boolean, toggleExpand: () => void, projects: Project[], attributes: Attribute[] }) => {
    const [timeRange, setTimeRange] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('DAY');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterMode, setFilterMode] = useState<'GLOBAL' | string>('GLOBAL'); // 'GLOBAL' or project/attribute ID
    
    // animKey removed as it was unused logic causing complexity, key prop on chart is enough.

    const activeFilterColor = useMemo(() => {
        if (filterMode === 'GLOBAL') return '#8b5cf6';
        const attr = attributes.find(a => a.id === filterMode);
        if (attr) return attr.color;
        const proj = projects.find(p => p.id === filterMode);
        if (proj) return attributes.find(a => a.id === proj.attribute)?.color || '#fff';
        return '#fff';
    }, [filterMode, attributes, projects]);

    const stats = useMemo(() => generateFocusData(currentDate, timeRange, filterMode), [currentDate, timeRange, filterMode]);
    
    const navigateDate = (dir: -1 | 1) => {
        const newDate = new Date(currentDate);
        if (timeRange === 'DAY') newDate.setDate(newDate.getDate() + dir);
        else if (timeRange === 'WEEK') newDate.setDate(newDate.getDate() + (dir * 7));
        else if (timeRange === 'MONTH') newDate.setMonth(newDate.getMonth() + dir);
        else newDate.setFullYear(newDate.getFullYear() + dir);
        setCurrentDate(newDate);
    };

    return (
        <div className="relative transition-all duration-700 ease-in-out mb-4 flex-shrink-0">
             <div className="flex justify-between items-center px-1 mb-2"> 
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2"><Sparkles size={12} className="text-purple-400" /> Focus Intelligence</span>
                </div>
                <button onClick={toggleExpand} className="p-2 -mr-2 text-slate-500 active:text-white transition-colors">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
            </div>

            <div className={`accordion-grid ${isExpanded ? 'open' : ''}`}>
                <div className="accordion-inner">
                    <div className="glass-panel rounded-[2rem] p-4 flex flex-col gap-4">
                        {/* VIEW CONTROLS */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
                                {['DAY', 'WEEK', 'MONTH', 'YEAR'].map((range) => (
                                    <button key={range} onClick={() => { setTimeRange(range as 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${timeRange === range ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>{range}</button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => navigateDate(-1)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"><ChevronLeft size={16} /></button>
                                <span className="text-xs font-bold w-24 text-center date-slide-enter" key={currentDate.toString()}>{formatDateRange(currentDate, timeRange)}</span>
                                <button onClick={() => navigateDate(1)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        {/* CONTEXT FILTER SCROLL */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                            <button onClick={() => setFilterMode('GLOBAL')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all ${filterMode === 'GLOBAL' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                <LayoutGrid size={12} /> GLOBAL
                            </button>
                            {attributes.map(attr => {
                                const Icon = attr.icon;
                                return (
                                    <button key={attr.id} onClick={() => setFilterMode(attr.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all ${filterMode === attr.id ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                        <Icon size={12} style={{ color: filterMode === attr.id ? 'black' : attr.color }} /> {attr.label.toUpperCase()}
                                    </button>
                                )
                            })}
                            <div className="w-[1px] h-6 bg-white/10 mx-1" />
                            {projects.map(proj => (
                                <button key={proj.id} onClick={() => setFilterMode(proj.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all ${filterMode === proj.id ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                    <Target size={12} /> {proj.title.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* HEADER STATS */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white tracking-tight">{stats.totalHours}</span>
                            <span className="text-xs font-bold text-slate-500 uppercase">Hours Focus</span>
                            <span className="text-[10px] font-bold text-green-400 ml-auto bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">+12% vs last</span>
                        </div>

                        {/* CHART AREA */}
                        <BarChart 
                            datasets={[{ 
                                data: stats.data, 
                                color: activeFilterColor, 
                                label: 'Minutes' 
                            }]}
                            labels={stats.labels}
                            height={160}
                            max={Math.max(...stats.data, 60)}
                            className="mt-4"
                            barClassName="!rounded-t-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- FOCUS VIEW ---
const FocusView = React.memo(({ projects, attributes, onCompleteSession, onOpenProjectModal, setFocusMode }: { projects: Project[], attributes: Attribute[], onCompleteSession: (id: string | null, duration: number) => void, onOpenProjectModal: () => void, setFocusMode: (attrId: string | null) => void, isFocusActive: boolean }) => {
    const [viewState, setViewState] = useState<'LIST' | 'TIMER'>('LIST');
    const [mode, setMode] = useState<'POMO' | 'STOPWATCH'>('POMO');
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isStatsExpanded, setIsStatsExpanded] = useState(true);
    
    const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);
    const activeAttr = useMemo(() => attributes.find((a) => a.id === selectedProject?.attribute), [selectedProject, attributes]);
    const themeColor = activeAttr?.color || '#3b82f6';
    const ActiveIcon = activeAttr?.icon || Target;

    const [timeLeft, setTimeLeft] = useState(25 * 60); 
    const [totalDuration, setTotalDuration] = useState(25 * 60);

    const startSession = (projectId: string) => {
        const project = projects.find((p) => p.id === projectId);
        setSelectedProjectId(projectId);
        const duration = project ? project.pomoDuration * 60 : 25 * 60;
        setTimeLeft(duration);
        setTotalDuration(duration);
        setFocusMode(project?.attribute || null);
        setViewState('TIMER');
        setTimeout(() => { setIsActive(true); setIsPaused(false); }, 500);
    };

    const stopSession = () => {
        setIsActive(false); setIsPaused(false); setViewState('LIST');
        setFocusMode(null); setSelectedProjectId(null);
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (mode === 'POMO') {
                        if (prev <= 1) {
                            clearInterval(interval); setIsActive(false);
                            onCompleteSession(selectedProjectId, totalDuration);
                            if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
                            return 0;
                        }
                        return prev - 1;
                    } else { return prev + 1; }
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, isPaused, mode, selectedProjectId, totalDuration, onCompleteSession]);

    const toggleTimer = () => {
        if (!isActive) { setIsActive(true); setIsPaused(false); if(navigator.vibrate) navigator.vibrate(20); }
        else { setIsPaused(!isPaused); if(navigator.vibrate) navigator.vibrate(10); }
    };

    const resetTimer = () => {
        setIsActive(false); setIsPaused(false);
        const duration = selectedProject ? selectedProject.pomoDuration * 60 : 25 * 60;
        setTimeLeft(mode === 'POMO' ? duration : 0);
        if (navigator.vibrate) navigator.vibrate(30);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const progress = mode === 'POMO' ? (timeLeft / totalDuration) : 1; 
    const dashOffset = circumference * (1 - progress);

    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            <div className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${viewState === 'LIST' ? 'relative opacity-100 z-10' : 'absolute opacity-0 scale-90 pointer-events-none'}`}>
                <div className="flex justify-between items-center px-4 mb-2 mt-2 flex-shrink-0">
                    <div><h2 className="text-2xl font-black text-white tracking-tight">Focus Studio</h2><p className="text-xs text-slate-400 font-medium">Select a flow to begin deep work</p></div>
                    <button onClick={onOpenProjectModal} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-all active:scale-95 border border-white/5"><Plus size={18} /></button>
                </div>

                <div className="px-2 flex-shrink-0">
                    <FocusStats isExpanded={isStatsExpanded} toggleExpand={() => setIsStatsExpanded(!isStatsExpanded)} projects={projects} attributes={attributes} />
                </div>

                <div className="grid grid-cols-2 gap-4 px-4 pb-24 overflow-y-auto no-scrollbar flex-1 content-start">
                    {projects.map((project) => {
                        const attr = attributes.find((a) => a.id === project.attribute);
                        const progressVal = Math.min(100, (project.totalTime / (project.goalTarget * 60)) * 100);
                        const Icon = attr?.icon || Star;
                        return (
                            <div key={project.id} className="relative group rounded-[2rem] p-5 bg-white/5 border border-white/5 overflow-hidden transition-all duration-300 hover:bg-white/10 flex flex-col justify-between h-48 flex-shrink-0">
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ background: `radial-gradient(circle at top right, ${attr?.color}, transparent 70%)` }} />
                                <div className="z-10 flex justify-between items-start">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${attr?.color}20` }}><Icon size={18} style={{ color: attr?.color }} /></div>
                                    <div className="bg-black/20 px-2 py-1 rounded-lg"><span className="text-[10px] font-mono text-slate-300 font-bold">{project.pomoDuration}m</span></div>
                                </div>
                                <div className="z-10">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-1">{project.title}</h3>
                                    <div className="flex items-center gap-2 mb-4"><div className="h-1.5 flex-1 bg-black/30 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${progressVal}%`, backgroundColor: attr?.color }} /></div><span className="text-[9px] font-bold text-slate-500">{Math.floor(progressVal)}%</span></div>
                                </div>
                                <button onClick={() => startSession(project.id)} className="z-10 w-full py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"><Play size={12} fill="currentColor" /> Start Flow</button>
                            </div>
                        )
                    })}
                    <button onClick={onOpenProjectModal} className="rounded-[2rem] p-5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-white hover:bg-white/5 transition-all h-48 flex-shrink-0"><div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center"><Plus size={20} /></div><span className="text-xs font-bold uppercase tracking-widest">Create New</span></button>
                </div>
            </div>

            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out ${viewState === 'TIMER' ? 'relative opacity-100 z-20 delay-200' : 'absolute opacity-0 scale-110 pointer-events-none'}`}>
                <div className="absolute top-4 w-full flex justify-between px-6 z-30">
                    <button onClick={stopSession} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-white border border-white/5"><ChevronDown size={20} /></button>
                    <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 flex gap-2">
                        <button onClick={() => { setMode('POMO'); resetTimer(); }} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${mode === 'POMO' ? 'bg-white text-black' : 'text-slate-500'}`}>Pomo</button>
                        <button onClick={() => { setMode('STOPWATCH'); setTimeLeft(0); setIsActive(false); }} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${mode === 'STOPWATCH' ? 'bg-white text-black' : 'text-slate-500'}`}>Stopwatch</button>
                    </div>
                    <div className="w-10" />
                </div>
                <div className="relative w-[320px] h-[320px] flex items-center justify-center mb-10">
                    <svg className="absolute w-full h-full rotate-[-90deg] overflow-visible drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <circle cx="160" cy="160" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle cx="160" cy="160" r={radius} fill="none" stroke={themeColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className={`ring-progress ${isActive && !isPaused ? 'pulse-glow' : ''}`} style={{ color: themeColor }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <div className={`flex flex-col items-center transition-all duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}>
                            <span className="text-[64px] font-black text-white tabular-nums tracking-tighter leading-none filter drop-shadow-2xl">{formatTime(timeLeft)}</span>
                            <div className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"><ActiveIcon size={14} style={{ color: themeColor }} /><span className="text-xs font-bold text-white tracking-wide">{selectedProject?.title}</span></div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <button onClick={resetTimer} className="w-16 h-16 rounded-full bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-500 border border-white/10 flex items-center justify-center transition-all active:scale-90"><StopCircle size={24} /></button>
                    <button onClick={toggleTimer} className="w-24 h-24 rounded-[3rem] bg-white text-black flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all">{isActive && !isPaused ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}</button>
                    <button className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all active:scale-90"><Volume2 size={24} /></button>
                </div>
            </div>
        </div>
    );
});

// --- MODALS ---
const QuestModal = React.memo(({ isOpen, onClose, attributes, onConfirm }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], onConfirm: (data: Partial<Quest>) => void }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [impact, setImpact] = useState(1);
    const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    // Removed useEffect for resetting state to avoid cascading renders.
    // Parent component should conditionally render this modal to ensure fresh state on mount.

    const handleSlider = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const clientY = 'touches' in e ? (e as unknown as TouchEvent).touches[0].clientY : (e as unknown as MouseEvent).clientY;
        let percentage = 1 - ((clientY - rect.top) / rect.height);
        percentage = Math.max(0, Math.min(1, percentage));
        if (percentage < 0.25) setImpact(1); else if (percentage < 0.50) setImpact(2); else if (percentage < 0.75) setImpact(3); else setImpact(4);
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) { window.addEventListener('mousemove', handleSlider); window.addEventListener('mouseup', () => setIsDragging(false)); window.addEventListener('touchmove', handleSlider, { passive: false }); window.addEventListener('touchend', () => setIsDragging(false)); }
        return () => { window.removeEventListener('mousemove', handleSlider); window.removeEventListener('mouseup', () => setIsDragging(false)); window.removeEventListener('touchmove', handleSlider); window.removeEventListener('touchend', () => setIsDragging(false)); };
    }, [isDragging, handleSlider]);

    if (!isOpen) return null;

    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#333333';
    const SelectedIcon = selectedAttr?.icon || Star;
    const projectedStats = (() => {
        const base = 20; const imp = impact === 1 ? 1 : impact === 2 ? 1.5 : impact === 3 ? 3 : 5; 
        return { xp: Math.round(base * imp), rank: (impact === 1 ? 'C' : impact === 2 ? 'B' : impact === 3 ? 'A' : 'S') as Quest['difficulty'] };
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px] animate-modal-enter">
                <div className="glass-panel rounded-[2.5rem] p-5 overflow-visible relative transition-all duration-500" style={{ background: activeColor !== '#3b82f6' ? `linear-gradient(135deg, ${activeColor}40, ${activeColor}10 40%, rgba(20,20,25,0.9) 100%)` : 'rgba(20, 20, 25, 0.9)', borderColor: activeColor !== '#3b82f6' ? `${activeColor}50` : 'rgba(255, 255, 255, 0.1)', boxShadow: activeColor !== '#3b82f6' ? `0 25px 50px -12px ${activeColor}30` : '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
                    <div className="flex justify-between items-center mb-6 px-1">
                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : '#333' }}><Crosshair size={18} className="text-white" /></div>New Mission</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:bg-white/20"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-4 flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-colors"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objective Name..." className="w-full bg-transparent px-5 py-4 text-[17px] font-bold text-white placeholder:text-white/20 outline-none" autoFocus /></div>
                             <div onClick={() => setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`} style={attrId ? { backgroundColor: `${activeColor}15`, borderColor: activeColor } : {}}>
                                 {attrId ? (<SelectedIcon size={22} style={{ color: activeColor }} />) : <Plus size={22} className="text-white/30" />}
                                 {isAttrPickerOpen && (<><div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} /><div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>{attributes.map((attr) => {
                                     const Icon = attr.icon;
                                     return (
                                         <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10"><Icon size={16} style={{ color: attr.color }} /><span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span></button>
                                     )
                                 })}</div></>)}
                             </div>
                        </div>
                        <div className="col-span-4 bg-white/5 rounded-[1.5rem] border border-white/5 p-4"><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Briefing (Optional)..." className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" /></div>
                        <div className="col-span-2 rounded-[1.5rem] bg-white/5 border border-white/5 relative overflow-hidden h-24">
                             <div ref={sliderRef} className="absolute inset-0 z-10 cursor-ns-resize" onMouseDown={() => setIsDragging(true)} onTouchStart={() => setIsDragging(true)} />
                             <div className="absolute inset-0 top-auto transition-transform duration-100 ease-linear origin-bottom" style={{ height: '100%', transform: `scaleY(${impact * 0.25})`, backgroundColor: impact === 1 ? '#10b981' : impact === 2 ? '#3b82f6' : impact === 3 ? '#ef4444' : '#eab308' }} />
                             <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-3 text-white mix-blend-difference"><Flame size={16} className={isDragging ? 'scale-125' : ''} fill="currentColor" /><span className="text-[9px] font-black mt-1 uppercase">{projectedStats.rank}</span></div>
                        </div>
                        <div className="col-span-2 rounded-[1.5rem] bg-white/5 border border-white/5 flex flex-col items-center justify-center relative h-24"><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="absolute inset-0 opacity-0 z-10" /><span className="text-[9px] font-black text-white/30 uppercase">Due</span><span className="text-xl font-bold">{new Date(deadline).getDate()}</span><span className="text-[9px] font-bold text-white/50 uppercase">{new Date(deadline).toLocaleDateString('en-US', { month: 'short' })}</span></div>
                        <button onClick={() => onConfirm({ title, description: desc, attribute: attrId, xpReward: projectedStats.xp, difficulty: projectedStats.rank, deadline })} disabled={!title || !attrId} className={`col-span-4 h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'text-white shadow-lg active:scale-95'}`} style={(title && attrId) ? { background: `linear-gradient(to right, ${activeColor}, ${activeColor}dd)`, boxShadow: `0 10px 30px -10px ${activeColor}80` } : {}}>Confirm Mission</button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const HabitModal = React.memo(({ isOpen, onClose, attributes, onConfirm }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], onConfirm: (data: Partial<Habit>) => void }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [freq, setFreq] = useState('DAILY');
    const [weekDays, setWeekDays] = useState<number[]>([]);
    const [monthCount, setMonthCount] = useState(1);
    const [logic, setLogic] = useState<'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN'>('BOOLEAN');
    const [target, setTarget] = useState('');
    const [unit, setUnit] = useState('');
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);

    // Removed useEffect for resetting state. Parent should handle conditional rendering.

    if (!isOpen) return null;
    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#3b82f6';
    const SelectedIcon = selectedAttr?.icon || Star;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px] animate-modal-enter">
                <div className="glass-panel rounded-[2.5rem] p-5 overflow-visible flex flex-col max-h-[85vh] relative shadow-2xl transition-colors duration-500" style={{ background: activeColor !== '#3b82f6' ? `linear-gradient(135deg, ${activeColor}25, ${activeColor}10 40%, rgba(20,20,25,0.9) 100%)` : 'rgba(20, 20, 25, 0.9)', borderColor: activeColor !== '#3b82f6' ? `${activeColor}40` : 'rgba(255, 255, 255, 0.1)', boxShadow: activeColor !== '#3b82f6' ? `0 25px 50px -12px ${activeColor}25` : '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
                    <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : 'linear-gradient(135deg, #06b6d4, #2563eb)' }}><InfinityIcon size={20} className="text-white" /></div><div><h2 className="text-xl font-black text-white tracking-tight leading-none">Smart Protocol</h2><span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">System Architect</span></div></div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                    </div>
                    <div className="overflow-y-auto no-scrollbar pb-4 space-y-3">
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-all"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Protocol Name..." className="w-full h-full bg-transparent px-5 text-[17px] font-bold text-white placeholder:text-white/20 outline-none" autoFocus /></div>
                             <div onClick={() => setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`} style={attrId ? { backgroundColor: `${activeColor}15`, borderColor: activeColor } : {}}>
                                 {attrId ? (<SelectedIcon size={20} style={{ color: activeColor }} />) : <Plus size={20} className="text-white/30" />}
                                 {isAttrPickerOpen && (<><div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} /><div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>{attributes.map((attr) => {
                                     const Icon = attr.icon;
                                     return (
                                         <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10"><Icon size={16} style={{ color: attr.color }} /><span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span></button>
                                     )
                                 })}</div></>)}
                             </div>
                        </div>
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4"><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (Optional)..." className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" /></div>
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-1 overflow-hidden transition-all duration-300">
                             <div className="flex p-1 gap-1">{['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (<button key={f} onClick={() => setFreq(f)} className={`flex-1 py-3 rounded-[1.2rem] text-[10px] font-black tracking-wide transition-all ${freq === f ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>{f}</button>))}</div>
                             {freq === 'WEEKLY' && (<div className="p-3 pt-1 flex justify-between animate-in slide-in-from-top-2 fade-in">{['S','M','T','W','T','F','S'].map((day, i) => (<button key={i} onClick={() => setWeekDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${weekDays.includes(i) ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-slate-500'}`}>{day}</button>))}</div>)}
                             {freq === 'MONTHLY' && (<div className="p-4 flex items-center justify-between animate-in slide-in-from-top-2 fade-in"><span className="text-xs font-bold text-slate-400">Times per month</span><div className="flex items-center gap-4"><button onClick={() => setMonthCount(c => Math.max(1, c - 1))} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronDown size={14} /></button><span className="text-xl font-black text-white">{monthCount}</span><button onClick={() => setMonthCount(c => Math.min(30, c + 1))} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><ChevronUp size={14} /></button></div></div>)}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden group"><div className="flex items-center gap-2 mb-1"><Clock size={16} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Alert</span></div><input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="bg-transparent text-2xl font-black text-white outline-none w-full z-10 relative" />{!reminder && <span className="absolute left-4 bottom-4 text-2xl font-black text-white/10 pointer-events-none">OFF</span>}</div>
                            <button onClick={() => setLogic(t => t === 'BOOLEAN' ? 'QUANTITY' : t === 'QUANTITY' ? 'CHECKLIST' : 'BOOLEAN')} className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col items-start justify-center relative active:scale-95 transition-all"><div className="flex items-center gap-2 mb-1">{logic === 'BOOLEAN' ? <CheckCircle2 size={16} className="text-green-400" /> : logic === 'QUANTITY' ? <Hash size={16} className="text-blue-400" /> : <List size={16} className="text-yellow-400" />}<span className="text-[10px] font-bold text-slate-400 uppercase">Logic</span></div><span className="text-lg font-bold text-white capitalize">{logic.toLowerCase()}</span></button>
                        </div>
                        {logic === 'QUANTITY' && (<div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 animate-in fade-in slide-in-from-top-2"><div className="flex gap-4"><div className="flex-1"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Target</span><input type="number" placeholder="10" value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/10" /></div><div className="w-[1px] bg-white/10" /><div className="flex-1"><span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Unit</span><input type="text" placeholder="pages" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/10" /></div></div></div>)}
                        {logic === 'CHECKLIST' && (<div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 animate-in fade-in slide-in-from-top-2 space-y-3"><div className="flex gap-2"><input type="text" placeholder="Add subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/20" /><button onClick={() => { if(newSubtask) { setSubtasks([...subtasks, newSubtask]); setNewSubtask(''); } }} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Plus size={12} /></button></div><div className="space-y-1">{subtasks.map((task, i) => (<div key={i} className="flex items-center gap-2 text-xs text-slate-400 bg-black/20 p-2 rounded-lg"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> {task}</div>))}{subtasks.length === 0 && <span className="text-[10px] text-slate-600 italic pl-2">No steps defined</span>}</div></div>)}
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex items-center gap-4"><span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">Impact</span><div className="flex-1 h-8 bg-black/30 rounded-full relative p-1 flex gap-1">{[1,2,3,4].map(lvl => (<button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-300 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />))}</div></div>
                    </div>
                    <div className="pt-2">
                        <button onClick={() => onConfirm({ title, description: desc, attribute: attrId, frequency: freq, type: logic, targetValue: parseFloat(target), unit, checklist: subtasks.map((t, i) => ({ id: i.toString(), text: t, completed: false })), reminderTime: reminder })} disabled={!title || !attrId} className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'text-white shadow-xl active:scale-95'}`} style={(title && attrId) ? { background: `linear-gradient(to right, ${activeColor}, ${activeColor}dd)`, boxShadow: `0 10px 40px -10px ${activeColor}80` } : {}}>Initiate Protocol <ArrowUp size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const ProjectModal = React.memo(({ isOpen, onClose, attributes, onConfirm }: { isOpen: boolean, onClose: () => void, attributes: Attribute[], onConfirm: (data: Partial<Project>) => void }) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('');
    const [goalTarget, setGoalTarget] = useState(10);
    const [goalFreq, setGoalFreq] = useState('WEEKLY');
    const [pomoDuration, setPomoDuration] = useState(25);
    // Unused breakDuration removed
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [isAttrPickerOpen, setAttrPickerOpen] = useState(false);

    // Removed useEffect for resetting state. Parent should handle conditional rendering.

    if (!isOpen) return null;
    const selectedAttr = attributes.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#3b82f6';
    const SelectedIcon = selectedAttr?.icon || Star;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[360px] animate-modal-enter">
                <div className="glass-panel rounded-[2.5rem] p-5 overflow-visible flex flex-col max-h-[85vh] relative shadow-2xl transition-colors duration-500" style={{ background: activeColor !== '#3b82f6' ? `linear-gradient(135deg, ${activeColor}25, ${activeColor}10 40%, rgba(20,20,25,0.9) 100%)` : 'rgba(20, 20, 25, 0.9)', borderColor: activeColor !== '#3b82f6' ? `${activeColor}40` : 'rgba(255, 255, 255, 0.1)', boxShadow: activeColor !== '#3b82f6' ? `0 25px 50px -12px ${activeColor}25` : '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
                    <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500" style={{ background: attrId ? activeColor : 'linear-gradient(135deg, #06b6d4, #2563eb)' }}>
                                <Briefcase size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">New Project</h2>
                                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Focus Engine</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors"><X size={16} /></button>
                    </div>
                    <div className="overflow-y-auto no-scrollbar pb-4 space-y-3">
                        <div className="flex gap-2">
                             <div className="flex-1 bg-white/5 rounded-[1.5rem] border border-white/5 p-1 focus-within:border-white/20 transition-all"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project Name..." className="w-full h-full bg-transparent px-5 text-[16px] font-bold text-white placeholder:text-white/20 outline-none" autoFocus /></div>
                             <div onClick={() => setAttrPickerOpen(true)} className={`w-16 rounded-[1.5rem] border flex items-center justify-center shrink-0 active:scale-95 transition-all relative cursor-pointer ${attrId ? 'bg-white/5 border-white/10' : 'bg-white/5 border-dashed border-white/10'}`} style={attrId ? { backgroundColor: `${activeColor}15`, borderColor: activeColor } : {}}>
                                 {attrId ? (<SelectedIcon size={20} style={{ color: activeColor }} />) : <Plus size={20} className="text-white/30" />}
                                 {isAttrPickerOpen && (<><div className="fixed inset-0 z-[998] bg-transparent" onClick={(e) => { e.stopPropagation(); setAttrPickerOpen(false); }} /><div className="absolute top-full right-0 mt-2 p-2 bg-[#1c1c1e] rounded-[1.5rem] grid grid-cols-2 gap-2 z-[999] w-[240px] shadow-2xl border border-white/10 animate-in zoom-in-95 overflow-hidden" onClick={(e) => e.stopPropagation()}>{attributes.map((attr) => {
                                     const Icon = attr.icon;
                                     return (
                                         <button key={attr.id} onClick={(e) => { e.stopPropagation(); setAttrId(attr.id); setAttrPickerOpen(false); }} className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-white/10"><Icon size={16} style={{ color: attr.color }} /><span className="text-[9px] font-bold text-slate-400 mt-1">{attr.label}</span></button>
                                     )
                                 })}</div></>)}
                             </div>
                        </div>
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4"><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is the goal? (Optional)" className="w-full bg-transparent text-sm font-medium text-slate-300 placeholder:text-white/20 outline-none" /></div>
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1"><Target size={16} className="text-cyan-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Goal Target</span></div>
                            <div className="flex justify-between items-center bg-black/20 rounded-xl p-1">
                                {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                                    <button key={f} onClick={() => setGoalFreq(f)} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${goalFreq === f ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>{f}</button>
                                ))}
                            </div>
                            <div className="flex items-center justify-between px-2">
                                <button onClick={() => setGoalTarget(Math.max(1, goalTarget - 1))} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><ChevronDown size={14} /></button>
                                <div className="text-center"><span className="text-2xl font-black text-white">{goalTarget}</span><span className="text-xs font-bold text-slate-500 ml-1">HOURS</span></div>
                                <button onClick={() => setGoalTarget(Math.min(100, goalTarget + 1))} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><ChevronUp size={14} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col relative">
                                <div className="flex items-center gap-2 mb-2"><Hourglass size={16} className="text-yellow-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Pomodoro</span></div>
                                <div className="flex gap-1 mb-2">
                                    {[25, 45, 60].map(t => (
                                        <button key={t} onClick={() => setPomoDuration(t)} className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all ${pomoDuration === t ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-transparent border-white/10 text-slate-500'}`}>{t}</button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">Custom:</span><input type="number" value={pomoDuration} onChange={(e) => setPomoDuration(parseInt(e.target.value) || 25)} className="w-12 bg-transparent border-b border-white/20 text-white font-mono text-sm text-center focus:border-white outline-none" /></div>
                            </div>
                            <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden group">
                                <div className="flex items-center gap-2 mb-1"><Bell size={16} className="text-purple-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Alert</span></div>
                                <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="bg-transparent text-2xl font-black text-white outline-none w-full z-10 relative" />
                                {!reminder && <span className="absolute left-4 bottom-4 text-2xl font-black text-white/10 pointer-events-none">OFF</span>}
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-[1.5rem] border border-white/5 p-4 flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">Impact</span>
                            <div className="flex-1 h-8 bg-black/30 rounded-full relative p-1 flex gap-1">
                                {[1,2,3,4].map(lvl => (
                                    <button key={lvl} onClick={() => setImpact(lvl)} className={`flex-1 rounded-full transition-all duration-300 ${impact >= lvl ? lvl === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : lvl === 2 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : lvl === 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-white/5'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="pt-2">
                        <button onClick={() => onConfirm({ title, description: desc, attribute: attrId, goalTarget, goalFrequency: goalFreq, pomoDuration, breakDuration: 5, reminder, impact })} disabled={!title || !attrId} className={`w-full h-14 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${(!title || !attrId) ? 'bg-white/5 text-white/20' : 'text-white shadow-xl active:scale-95'}`} style={(title && attrId) ? { background: `linear-gradient(to right, ${activeColor}, ${activeColor}dd)`, boxShadow: `0 10px 40px -10px ${activeColor}80` } : {}}>Initialize Project <ArrowUp size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const Header = React.memo(({ level, xp, nextXp, theme, onThemeToggle, isHidden }: { level: number, xp: number, nextXp: number, theme: string, onThemeToggle: (t: string) => void, isHidden: boolean }) => {
  const [isPickerOpen, setPickerOpen] = useState(false);
  return (
    <header className={`flex justify-between items-center mt-2 relative z-50 transition-all duration-700 ${isHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-4">
            <div className="relative group active:scale-95 transition-transform">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 p-[1px] border border-white/10 shadow-2xl">
                    <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Avatar" className="w-full h-full rounded-[10px] object-cover opacity-90" />
                </div>
            </div>
            <div>
                <h1 className="text-[17px] font-bold text-white tracking-tight leading-none mb-1.5">Level {Math.floor(level)}</h1>
                <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden relative backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 transition-transform duration-1000 ease-out origin-left" style={{ transform: `scaleX(${xp / nextXp})` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wide">{xp} / {nextXp} XP</p>
            </div>
        </div>
        <div className="relative">
            <button onClick={() => setPickerOpen(!isPickerOpen)} className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all ${isPickerOpen ? 'bg-white text-black scale-110' : 'bg-white/5 text-slate-400 hover:text-white'}`}><Palette size={18} /></button>
            {isPickerOpen && (
                <div className="absolute right-0 top-12 p-2 bg-[#121216]/90 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] flex gap-2 animate-in zoom-in-95 slide-in-from-top-2 shadow-2xl z-[60]">
                    {Object.entries(THEMES).map(([key, t]) => (
                        <button key={key} onClick={() => { onThemeToggle(key); setPickerOpen(false); }} className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-all shadow-lg relative" style={{ background: t.accent, borderColor: theme === key ? 'white' : 'transparent' }}>
                            {theme === key && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </header>
  );
});

const Dock = React.memo(({ currentView, onChangeView, onOpenModal, isOpen, onToggle, isHidden }: { currentView: string, onChangeView: (v: string) => void, onOpenModal: (m: string) => void, isOpen: boolean, onToggle: (open: boolean) => void, isHidden: boolean }) => {
    const handleView = (v: string) => { onChangeView(v); onToggle(false); };
    const handleModal = (m: string) => { onOpenModal(m); onToggle(false); };

    return (
        <div className={`fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform duration-1000 cubic-bezier(0.32,0.72,0,1) ${isHidden ? 'translate-y-[200%]' : 'translate-y-0'}`}>
           <div className={`pointer-events-auto relative aura-container overflow-hidden box-border w-[88vw] max-w-[330px] shadow-2xl transition-[height,border-radius,background-color,box-shadow] duration-500 cubic-bezier(0.32,0.72,0,1) ${isOpen ? 'h-[260px] rounded-[32px] aura-active' : 'h-[70px] rounded-[34px] bg-black/5 border border-white/10'}`}>
             <div className="relative w-full h-full z-10">
                 <div className={`absolute bottom-[80px] left-0 right-0 px-5 grid grid-cols-2 gap-2 transition-all duration-300 ease-out ${isOpen ? 'opacity-100 translate-y-0 delay-75' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                     <button onClick={() => { handleView('TASKS'); setTimeout(() => handleModal('QUEST'), 150); }} className="col-span-2 h-16 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex items-center justify-between px-5 border border-white/5 group relative overflow-hidden shadow-md">
                        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform"><Crosshair size={18} /></div><div className="text-left"><span className="block text-white font-bold text-[14px] tracking-tight">New Mission</span><span className="block text-white/40 text-[9px] font-bold uppercase tracking-wider">Single Task</span></div></div><Plus size={18} className="text-white/30 group-hover:text-white transition-colors" />
                     </button>
                     <button onClick={() => { handleView('HABITS'); setTimeout(() => handleModal('HABIT'), 150); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-md">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.15)]"><InfinityIcon size={18} /></div><span className="text-white/90 font-bold text-[11px] tracking-tight">Habit</span>
                     </button>
                     <button onClick={() => { handleView('FOCUS'); setTimeout(() => handleModal('PROJECT'), 150); }} className="col-span-1 h-20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-[20px] flex flex-col items-center justify-center gap-2 border border-white/5 group shadow-md">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.15)]"><Target size={18} /></div><span className="text-white/90 font-bold text-[11px] tracking-tight">Focus</span>
                     </button>
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 h-[70px] flex items-center justify-between px-8 z-20">
                     <div className="flex gap-8">
                         <button onClick={() => handleView('TASKS')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'TASKS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><CheckCircle2 size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'TASKS' ? 2.5 : 2} /></button>
                         <button onClick={() => handleView('HABITS')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'HABITS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><Zap size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'HABITS' ? 2.5 : 2} /></button>
                     </div>
                     <div className="flex items-center justify-center h-full -mt-1">
                        <button onClick={() => onToggle(!isOpen)} className={`relative transition-all duration-500 cubic-bezier(0.19, 1, 0.22, 1) flex items-center justify-center gap-2 rounded-full font-bold text-[13px] tracking-wide uppercase shadow-2xl z-20 overflow-hidden btn-orb-glow ${isOpen ? 'w-16 h-12 bg-white/10 !shadow-none !border-white/5 translate-y-[2px]' : 'w-14 h-14 active:scale-90 hover:scale-105'}`}>
                            {isOpen ? (<ChevronDown size={28} className="text-white animate-in zoom-in duration-300" strokeWidth={2.5} />) : (<Plus size={28} strokeWidth={3} className="text-white drop-shadow-md" />)}
                        </button>
                     </div>
                     <div className="flex gap-8">
                         <button onClick={() => handleView('FOCUS')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'FOCUS' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><Target size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'FOCUS' ? 2.5 : 2} /></button>
                         <button onClick={() => handleView('NOTES')} className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${currentView === 'NOTES' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}><Briefcase size={24} className="transition-transform group-active:scale-75 duration-300" strokeWidth={currentView === 'NOTES' ? 2.5 : 2} /></button>
                     </div>
                 </div>
             </div>
           </div>
        </div>
    );
});

// --- AUTH & ONBOARDING ---
const TRAITS_LIST = [
  { id: 'DISCIPLINA', label: 'Disciplina', color: '#3b82f6', icon: Target, desc: 'Voluntad inquebrantable.' },
  { id: 'FISICO', label: 'Físico', color: '#ef4444', icon: Dumbbell, desc: 'Poder y resistencia.' },
  { id: 'MENTAL', label: 'Intelecto', color: '#06b6d4', icon: Brain, desc: 'Agudeza y aprendizaje.' },
  { id: 'SOCIAL', label: 'Carisma', color: '#ec4899', icon: Users, desc: 'Influencia y conexión.' },
  { id: 'ESPIRITU', label: 'Espíritu', color: '#8b5cf6', icon: Ghost, desc: 'Calma y consciencia.' },
  { id: 'FINANZAS', label: 'Riqueza', color: '#10b981', icon: Wallet, desc: 'Libertad de recursos.' },
  { id: 'CREATIVIDAD', label: 'Creatividad', color: '#f59e0b', icon: Palette, desc: 'Visión e innovación.' },
  { id: 'ORDEN', label: 'Sistema', color: '#64748b', icon: Anchor, desc: 'Control y estructura.' },
  { id: 'LIDERAZGO', label: 'Liderazgo', color: '#6366f1', icon: Crown, desc: 'Guiar a otros.' },
  { id: 'RESILIENCIA', label: 'Temple', color: '#f97316', icon: Shield, desc: 'Invencibilidad.' },
  { id: 'VITALIDAD', label: 'Energía', color: '#84cc16', icon: Zap, desc: 'Motor de vida.' },
  { id: 'ESTILO', label: 'Estética', color: '#d946ef', icon: Feather, desc: 'Arte de vivir.' },
];

// --- APP (DEFINED LAST) ---
export default function Dashboard() {
  // Use "neo-01" as default user ID or fetch from context if integrated
  const [user, setUser] = useState<any>({ uid: 'neo-01', name: 'Neo' }); 
  const [currentTheme, setCurrentTheme] = useState('SPOTLIGHT');
  const [currentView, setCurrentView] = useState('TASKS');
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false); 
  const [isNoteTaking, setIsNoteTaking] = useState(false); 
  const [overrideBgColor, setOverrideBgColor] = useState<string | undefined>(undefined);

  const [player, setPlayer] = useState({ level: 1, xp: 0, nextXp: 500 });
  const [health] = useState(100);
    
  // Initialize attributes with ALL traits for now (or a default subset)
  const [attributes, setAttributes] = useState<Attribute[]>(() => 
    TRAITS_LIST.map(t => ({
      id: t.id, label: t.label, level: 1, xp: 0, maxXp: 100, color: t.color, icon: t.icon
    }))
  ); 
    
  const [quests, setQuests] = useState<Quest[]>([]);

  const [habits, setHabits] = useState<Habit[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);

  const [notes, setNotes] = useState<Note[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [validationHabit, setValidationHabit] = useState<Habit | null>(null);
  const [valTempValue, setValTempValue] = useState('');

  const handleFocusModeChange = useCallback((attrId: string | null) => {
      if (attrId) {
          const attr = attributes.find(a => a.id === attrId);
          if (attr) {
              setOverrideBgColor(attr.color);
              setIsFocusMode(true);
          }
      } else {
          setOverrideBgColor(undefined);
          setIsFocusMode(false);
      }
  }, [attributes]);

  const addNotification = useCallback((notif: Omit<NotificationItem, 'id'>) => {
      const id = Date.now() + Math.random();
      setNotifications(prev => [...prev, { ...notif, id }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const addPlayerXp = useCallback((amount: number) => {
      setPlayer(prev => {
          let newXp = prev.xp + amount;
          let newLevel = prev.level;
          let newNextXp = prev.nextXp;
          let leveledUp = false;
          
          if (amount > 0) {
              while (newXp >= newNextXp) {
                  newXp -= newNextXp;
                  newLevel += 1;
                  newNextXp = Math.floor(newNextXp * 1.2);
                  leveledUp = true;
              }
          } else {
               newXp = Math.max(0, newXp);
          }
          
          if (leveledUp) {
               addNotification({ type: 'GLOBAL', label: 'HERO', fromLevel: prev.level, toLevel: newLevel, icon: Trophy, color: '#fbbf24' });
          }

          return { level: newLevel, xp: newXp, nextXp: newNextXp };
      });
  }, [addNotification]);

  /* Removed useEffect for level up logic as it is now handled in addPlayerXp */

  const updateAttributeXp = useCallback((attrId: string, amount: number) => {
      setAttributes(prev => prev.map(attr => {
          if (attr.id === attrId) {
              let newXp = attr.xp + amount;
              let newLevel = attr.level;
              let newMaxXp = attr.maxXp;
              if (amount > 0) {
                  while (newXp >= newMaxXp) {
                      newXp -= newMaxXp;
                      newLevel += 1;
                      newMaxXp = Math.floor(newMaxXp * 1.2);
                      addNotification({ type: 'ATTRIBUTE', label: attr.label, fromLevel: attr.level, toLevel: newLevel, icon: attr.icon, color: attr.color });
                  }
              } else {
                  while (newXp < 0 && newLevel > 1) {
                      newLevel -= 1;
                      newMaxXp = Math.floor(newMaxXp / 1.2); 
                      newXp += newMaxXp;
                  }
                  if (newLevel === 1 && newXp < 0) newXp = 0;
              }
              return { ...attr, xp: newXp, level: newLevel, maxXp: newMaxXp };
          }
          return attr;
      }));
  }, [addNotification]);

  const spawnParticles = useCallback((x: number, y: number, color: string, Icon: React.ElementType, type = 'icon') => {
    const count = type === 'fire' ? 12 : 8; 
    const newParticles = Array.from({ length: count }).map((_, i) => ({ id: Date.now() + i, x, y, vx: (Math.random() - 0.5) * 150, vy: -100 - Math.random() * 150, rotation: Math.random() * 360, icon: Icon, color: type === 'fire' ? (i % 2 === 0 ? '#f97316' : '#ef4444') : color, type }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => { setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))); }, 2000); 
  }, []);

  const handleCompleteSession = useCallback((projectId: string | null, durationSeconds: number) => {
      const baseReward = Math.floor(durationSeconds / 60);
      let attrId = 'MENTAL';
      let multiplier = 1;
      if (projectId) {
          const proj = projects.find(p => p.id === projectId);
          if (proj) {
              attrId = proj.attribute;
              multiplier = proj.impact;
              setProjects(prev => prev.map(p => p.id === projectId ? { ...p, totalTime: p.totalTime + durationSeconds } : p));
          }
      }
      const totalReward = Math.floor(baseReward * multiplier);
      addPlayerXp(totalReward);
      updateAttributeXp(attrId, totalReward);
      const attr = attributes.find(a => a.id === attrId);
      const AttrIcon = attr?.icon || Star;
      spawnParticles(window.innerWidth / 2, window.innerHeight / 2, attr?.color || '#fff', AttrIcon);
      addNotification({ type: 'SESSION', label: 'FOCUS COMPLETE', fromLevel: Math.floor(durationSeconds/60) + 'm', toLevel: '+' + totalReward + ' XP', icon: Clock, color: '#fbbf24' });
  }, [projects, attributes, updateAttributeXp, addNotification, spawnParticles, addPlayerXp]);

  /* Removed useEffect for level up logic as it is now handled in addPlayerXp */



  const completeQuest = useCallback((e: React.MouseEvent, quest: Quest) => { 
    e.stopPropagation();
    if (quest.completed) {
      if(navigator.vibrate) navigator.vibrate(5);
      setQuests(prev => prev.map(q => { if (q.id === quest.id) { 
          addPlayerXp(-q.xpReward); 
          updateAttributeXp(q.attribute, -q.xpReward);
          return { ...q, completed: false }; 
      } return q; }));
    } else {
      const attr = attributes.find(a => a.id === quest.attribute);
      const AttrIcon = attr?.icon || Star;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      spawnParticles(rect.left + rect.width / 2, rect.top, attr?.color || '#fff', AttrIcon);
      if(navigator.vibrate) navigator.vibrate(10); 
      setQuests(prev => prev.map(q => { if (q.id === quest.id) { 
          addPlayerXp(q.xpReward); 
          updateAttributeXp(q.attribute, q.xpReward); 
          return { ...q, completed: true }; 
      } return q; }));
    }
  }, [attributes, spawnParticles, updateAttributeXp, addPlayerXp]);

  const handleHabitClick = useCallback((e: React.MouseEvent, habit: Habit) => {
    e.stopPropagation();
    if (habit.completedToday) {
       if(navigator.vibrate) navigator.vibrate(5);
       setHabits(prev => prev.map(h => { if (h.id === habit.id) { 
           const reward = 20 + ((h.streak - 1) * 2); 
           addPlayerXp(-reward); 
           updateAttributeXp(h.attribute, -reward);
           return { ...h, completedToday: false, streak: Math.max(0, h.streak - 1), totalCompletions: Math.max(0, h.totalCompletions - 1) }; 
        } return h; }));
       return;
    }
    if (habit.type === 'SIMPLE') {
       const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
       spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fff', Flame, 'fire');
       if(navigator.vibrate) navigator.vibrate([5, 20, 5]); 
       setHabits(prev => prev.map(h => { if (h.id === habit.id) { const reward = 20 + (h.streak * 2); addPlayerXp(reward); updateAttributeXp(h.attribute, reward); return { ...h, completedToday: true, streak: h.streak + 1, totalCompletions: h.totalCompletions + 1 }; } return h; }));
    } else {
       setValidationHabit(habit); setValTempValue('');
    }
  }, [spawnParticles, updateAttributeXp, addPlayerXp]);

  const validateHabitProgress = () => {
      if (!validationHabit) return;
      let isComplete = false; let newCurrentValue = validationHabit.currentValue || 0; 
      if (validationHabit.type === 'QUANTITY') {
          const added = parseFloat(valTempValue);
          if (isNaN(added) || added <= 0) return;
          newCurrentValue += added;
          if (newCurrentValue >= (validationHabit.targetValue || 0)) isComplete = true;
      } else if (validationHabit.type === 'CHECKLIST') {
          if (validationHabit.checklist?.every(i => i.completed)) isComplete = true;
      }
      setHabits(prev => prev.map(h => {
          if (h.id === validationHabit.id) {
              if (isComplete) {
                  spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#fff', Trophy, 'fire');
                  const reward = 20 + (h.streak * 2); addPlayerXp(reward); updateAttributeXp(h.attribute, reward);
                  return { ...h, completedToday: true, streak: h.streak + 1, totalCompletions: h.totalCompletions + 1, currentValue: newCurrentValue };
              }
              return { ...h, currentValue: newCurrentValue }; 
          }
          return h;
      }));
      setValidationHabit(null);
  };

  const handleQuestConfirm = useCallback((data: Partial<Quest>) => {
      setQuests(prev => [{ id: Date.now().toString(), completed: false, ...data } as Quest, ...prev]);
      setActiveModal(null);
  }, []);

  const handleHabitConfirm = useCallback((data: Partial<Habit>) => {
      const newHabit: Habit = { id: Date.now().toString(), streak: 0, completedToday: false, totalCompletions: 0, checklist: data.checklist || [], ...data } as Habit; 
      setHabits(prev => [newHabit, ...prev]);
      setActiveModal(null);
  }, []);

  const handleProjectConfirm = useCallback((data: Partial<Project>) => {
      setProjects(prev => [{ id: Date.now().toString(), totalTime: 0, ...data } as Project, ...prev]);
      setActiveModal(null);
  }, []);

  const handleUpdateNote = useCallback((note: Note) => {
      setNotes(prev => {
          const exists = prev.find(n => n.id === note.id);
          if (exists) return prev.map(n => n.id === note.id ? note : n);
          return [note, ...prev];
      });
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      setActiveModal(null);
  }, []);

  const handleUpdateJournal = useCallback((entry: JournalEntry) => {
      setJournalEntries(prev => {
          const exists = prev.find(e => e.id === entry.id);
          if (exists) return prev.map(e => e.id === entry.id ? entry : e);
          return [...prev, entry];
      });
  }, []);

  return (
    <div className="min-h-screen text-slate-200 selection:bg-cyan-500/30 overflow-hidden relative">
      <GlobalStyles />
      <LuxuryBackground theme={currentTheme} overrideColor={overrideBgColor} />

      {/* FX LAYER */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {particles.map(p => {
          const Icon = p.icon;
          return (
          <div key={p.id} className="absolute flex items-center justify-center will-change-transform" style={{ left: p.x, top: p.y, color: p.color, animation: `jumpAndFall 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards` }}>
            <Icon size={p.type === 'fire' ? 24 : 16} fill={p.type === 'fire' ? p.color : "currentColor"} className="drop-shadow-lg" />
            <style>{`@keyframes jumpAndFall { 0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 1; } 15% { transform: translate3d(${p.vx * 0.5}px, ${p.vy}px, 0) scale(1.2); opacity: 1; } 100% { transform: translate3d(${p.vx * 1.5}px, 100vh, 0) scale(0.8); opacity: 0; } }`}</style>
          </div>
        )})}
      </div>

      {/* NOTIFICATIONS */}
      <div className="fixed top-4 left-0 right-0 z-[120] flex flex-col items-center gap-2 pointer-events-none px-4">
        {notifications.map(n => {
          const NotifIcon = n.icon;
          return (
          <div key={n.id} className="animate-in slide-in-from-top-5 fade-in zoom-in-95 duration-500 backdrop-blur-md border border-yellow-500/50 bg-yellow-950/40 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5" style={{ color: n.color }}><NotifIcon size={16} /></div>
            <div className="flex-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{n.label} LEVEL UP</p><div className="flex items-center gap-2 text-sm font-black text-white"><span>{n.fromLevel}</span><ArrowUp size={12} className="text-green-400" /><span style={{ color: n.color }}>{n.toLevel}</span></div></div>
          </div>
        )})}
      </div>

      <main className="relative z-10 max-w-md mx-auto min-h-screen p-6 pb-40 flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-700 fade-in">
          {currentView !== 'FOCUS' && currentView !== 'TASKS' && (
              <Header level={player.level} xp={player.xp} nextXp={player.nextXp} theme={currentTheme} onThemeToggle={setCurrentTheme} isHidden={isFocusMode || isNoteTaking} />
          )}
          {currentView === 'FOCUS' && (
              <Header level={player.level} xp={player.xp} nextXp={player.nextXp} theme={currentTheme} onThemeToggle={setCurrentTheme} isHidden={isFocusMode || isNoteTaking} />
          )}

          <div className="animate-enter-view h-full flex-1 w-full relative">
            {currentView === 'TASKS' && (
                <div className="flex flex-col gap-6">
                    {/* 💎 STATUS HUD - THE MIRROR */}
                    <div className="relative z-20 -mx-2">
                        <StatusHUD 
                            level={player.level} 
                            xp={player.xp} 
                            nextXp={player.nextXp} 
                            health={health}
                            streak={habits.reduce((acc, h) => acc + h.streak, 0)}
                        />
                    </div>

                    {/* ACTIVE MISSIONS */}
                    <div>
                        <div className="flex items-center justify-between px-1 mb-3">
                            <h2 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2">Active Missions</h2>
                            <div className="bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                <Flame size={10} className="text-orange-400 fill-orange-400" />
                                <span className="text-[10px] font-black text-orange-400">{quests.filter(q => !q.completed).length} TARGETS</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col pb-32 gap-3">
                            {quests.map((quest) => (
                                <QuestItem key={quest.id} quest={quest} attribute={attributes.find(a => a.id === quest.attribute)} onComplete={completeQuest} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {currentView === 'HABITS' && (
                <div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[{ icon: Flame, color: 'text-orange-500', val: '12', label: 'Streak' }, { icon: Calendar, color: 'text-cyan-500', val: '85%', label: 'Consistency' }, { icon: CheckCircle2, color: 'text-green-500', val: '42', label: 'Perfect' }].map((stat, i) => (
                        <div key={i} className="glass-panel p-3 rounded-2xl flex flex-col items-center">
                            <stat.icon className={`${stat.color} mb-1`} size={20} />
                            <span className="text-xl font-black text-white tracking-tight">{stat.val}</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{stat.label}</span>
                        </div>
                    ))}
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight px-1 mb-4">Daily Protocols</h2>
                <div className="space-y-3 pb-32">
                    {habits.map(habit => (<HabitItem key={habit.id} habit={habit} attribute={attributes.find(a => a.id === habit.attribute)} onComplete={handleHabitClick} />))}
                </div>
                </div>
            )}

            {currentView === 'FOCUS' && (
                <div className="h-full pt-4 relative flex-1">
                    <FocusView projects={projects} attributes={attributes} onCompleteSession={handleCompleteSession} onOpenProjectModal={() => setActiveModal('PROJECT')} setFocusMode={handleFocusModeChange} isFocusActive={isFocusMode} />
                </div>
            )}

            {/* --- NOTES SECTION --- */}
            {currentView === 'NOTES' && (
                <div className="h-full pt-0 relative flex-1">
                    <NotesView 
                        notes={notes} 
                        onUpdateNote={handleUpdateNote} 
                        onDeleteNote={handleDeleteNote}
                        journalEntries={journalEntries}
                        onUpdateJournal={handleUpdateJournal}
                        onInteractionStart={() => setIsNoteTaking(true)}
                        onInteractionEnd={() => setIsNoteTaking(false)}
                        projects={projects}
                    />
                </div>
            )}
          </div>

        <Dock currentView={currentView} onChangeView={setCurrentView} onOpenModal={setActiveModal} isOpen={isDockOpen} onToggle={setIsDockOpen} isHidden={isFocusMode || isNoteTaking} />
        
        {/* --- GLOBAL BLUR BACKDROP (APPLE INTELLIGENCE MODE) --- */}
        <div className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-2xl saturate-150 transition-opacity duration-500 ${activeModal || validationHabit || isDockOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => { setActiveModal(null); setValidationHabit(null); setIsDockOpen(false); }} />

        {/* MODALS */}
        <QuestModal isOpen={activeModal === 'QUEST'} onClose={() => setActiveModal(null)} attributes={attributes} onConfirm={handleQuestConfirm} />
        <HabitModal isOpen={activeModal === 'HABIT'} onClose={() => setActiveModal(null)} attributes={attributes} onConfirm={handleHabitConfirm} />
        <ProjectModal isOpen={activeModal === 'PROJECT'} onClose={() => setActiveModal(null)} attributes={attributes} onConfirm={handleProjectConfirm} />
        
        {/* Simplified Attribute Modal */}
        {activeModal === 'ATTR' && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in" onClick={() => setActiveModal(null)} />
                 <div className="relative z-10 w-full max-w-sm glass-panel rounded-[2rem] p-6 animate-modal-enter flex flex-col">
                     <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">DNA Sequence</h3><button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20"><X size={16} /></button></div>
                     <div className="space-y-2 mb-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                         {attributes.map(attr => {
                             const Icon = attr.icon;
                             return (
                             <div key={attr.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-left-2 fade-in">
                                 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/30" style={{ color: attr.color }}><Icon size={16} /></div>
                                 <div className="flex-1"><h4 className="text-sm font-bold text-white">{attr.label}</h4><p className="text-[10px] text-slate-500">Level {attr.level}</p></div>
                                 {attributes.length > 3 ? (<button onClick={() => setAttributes(p => p.filter(a => a.id !== attr.id))} className="w-8 h-8 rounded-full hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center text-slate-600 transition-colors"><Trash2 size={14} /></button>) : (<div className="w-8 h-8 flex items-center justify-center text-slate-700 opacity-50"><Lock size={12} /></div>)}
                             </div>
                          )})}
                     </div>
                 </div>
            </div>
        )}

        {/* Validation Modal - Logic Refined */}
        {validationHabit && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in" onClick={() => setValidationHabit(null)} />
                <div className="relative z-10 w-full max-w-sm glass-panel rounded-[2rem] p-6 animate-modal-enter flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-lg" style={{ backgroundColor: (attributes.find(a => a.id === validationHabit.attribute)?.color || '#fff') + '20' }}>
                        {React.createElement(attributes.find(a => a.id === validationHabit.attribute)?.icon || Star, { size: 24, color: attributes.find(a => a.id === validationHabit.attribute)?.color })}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1 text-center">{validationHabit.title}</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-6">Validate Progress</p>
                    {validationHabit.type === 'QUANTITY' && (
                        <div className="w-full space-y-4">
                            <div className="flex justify-between text-sm font-medium text-slate-400 px-2"><span>Current: <strong className="text-white">{validationHabit.currentValue || 0}</strong></span><span>Target: <strong className="text-white">{validationHabit.targetValue}</strong> {validationHabit.unit}</span></div>
                            <div className="flex gap-2"><input type="number" autoFocus placeholder="Amount added..." value={valTempValue} onChange={(e) => setValTempValue(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 transition-all font-mono text-lg" /></div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, ((validationHabit.currentValue || 0) / (validationHabit.targetValue || 1)) * 100)}%` }} /></div>
                        </div>
                    )}
                    {validationHabit.type === 'CHECKLIST' && (
                          <div className="w-full space-y-2 mb-4">{validationHabit.checklist?.map(item => (<button key={item.id} onClick={() => { const updated = validationHabit.checklist?.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i); setValidationHabit(prev => prev ? { ...prev, checklist: updated } : null); }} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${item.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'}`}><div className={`w-5 h-5 rounded-full border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>{item.completed && <Check size={12} className="text-black" strokeWidth={4} />}</div><span className={`text-sm font-medium ${item.completed ? 'text-green-400 line-through' : 'text-white'}`}>{item.text}</span></button>))}</div>
                    )}
                    <button onClick={validateHabitProgress} className="w-full mt-6 py-4 bg-white text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">Update Progress <ArrowUp size={16} /></button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}