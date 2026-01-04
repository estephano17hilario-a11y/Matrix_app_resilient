import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, User, Sliders, Palette, Edit3, Check, X, 
  BarChart3, Hexagon, ArrowLeft, Globe, Plus, Trash2, 
  Layout, ShieldCheck, Square, Circle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TRAITS_LIST } from './constants';
import { THEMES, ThemeId } from '../../config/themes';
import { Attribute } from '../../types';
import { useTranslation } from 'react-i18next';

// DESIGN SYSTEM IMPORTS
import { GlassPanel } from '../../components/ui/GlassPanel';
import { GlassInput } from '../../components/ui/GlassInput';
import { cn } from '../../utils/cn';
import { AvatarSelector } from '../customization/AvatarSelector';

interface SettingsViewProps {
  currentTheme: ThemeId | string;
  onThemeToggle: (theme: ThemeId) => void;
  showProfile: boolean;
  onToggleProfile: (show: boolean) => void;
  defaultChartMode: 'RADAR' | 'BAR';
  onSetDefaultChartMode: (mode: 'RADAR' | 'BAR') => void;
  attributes?: Attribute[];
  onUpdateAttribute?: (id: string, updates: Partial<Attribute>) => void;
  onAddAttribute?: (id: string) => void;
  onRemoveAttribute?: (id: string) => void;
  onClose: () => void;
  onShowPro?: () => void;
  isPro?: boolean;
  dashboardStyle?: 'BORDER' | 'LIQUID';
  onDashboardStyleChange?: (style: 'BORDER' | 'LIQUID') => void;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onAvatarShapeChange?: (shape: 'CIRCLE' | 'SQUARE') => void;
  vividMode?: boolean;
  onToggleVividMode?: (enabled: boolean) => void;
}

type TabId = 'DESIGN' | 'CONTROLS' | 'ACCOUNT';

export const SettingsView = ({ 
  currentTheme, 
  onThemeToggle, 
  showProfile, 
  onToggleProfile,
  defaultChartMode,
  onSetDefaultChartMode,
  attributes = [],
  onUpdateAttribute,
  onAddAttribute,
  onRemoveAttribute,
  onClose,
  onShowPro,
  isPro,
  dashboardStyle,
  onDashboardStyleChange,
  avatarShape,
  onAvatarShapeChange,
  vividMode,
  onToggleVividMode
}: SettingsViewProps) => {
  const { logout, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('DESIGN');
  const [editingTraitId, setEditingTraitId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; color: string }>({ label: '', color: '' });

  const changeLanguage = (lng: string) => {
    console.log("Settings: Changing language to", lng);
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const startEditing = (attr: Attribute) => {
    setEditingTraitId(attr.id);
    setEditForm({ label: attr.label, color: attr.color });
  };

  const saveEditing = () => {
    if (editingTraitId && onUpdateAttribute) {
      onUpdateAttribute(editingTraitId, editForm);
      setEditingTraitId(null);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'DESIGN', label: t('settings.tabs.design'), icon: Palette },
    { id: 'CONTROLS', label: t('settings.tabs.controls'), icon: Sliders },
    { id: 'ACCOUNT', label: t('settings.tabs.account'), icon: User },
  ];

  const availableTraits = TRAITS_LIST.filter(t => !attributes.find(a => a.id === t.id));

  return (
    // TRANSPARENT BACKGROUND as requested
    <div className="w-full h-full flex flex-col bg-transparent">
      {/* HEADER */}
      <div className="flex items-center gap-4 p-6 pb-4">
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors group"
        >
          <ArrowLeft className="text-white/80 group-hover:scale-95 transition-transform" size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('settings.title')}</h1>
          <p className="text-white/40 text-sm font-medium">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* TABS (Segmented Control) */}
      <div className="px-6 pb-6">
        <div className="flex p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  isActive ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                )}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT SCROLL */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'DESIGN' && (
            <motion.div 
              key="design"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* INTERFACE SECTION */}
              <GlassPanel className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Layout className="text-theme-avatar" size={18} />
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Interface</h3>
                </div>

                {/* Dashboard Style Toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Dashboard Style</span>
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                         <button 
                            onClick={() => onDashboardStyleChange && onDashboardStyleChange('BORDER')}
                            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", dashboardStyle === 'BORDER' ? "bg-white/10 text-white" : "text-white/40")}
                         >
                            Classic
                         </button>
                         <button 
                            onClick={() => onDashboardStyleChange && onDashboardStyleChange('LIQUID')}
                            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", dashboardStyle === 'LIQUID' ? "bg-white/10 text-white" : "text-white/40")}
                         >
                            Liquid
                         </button>
                    </div>
                </div>

                {/* Avatar Shape Toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Avatar Shape</span>
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                         <button 
                            onClick={() => onAvatarShapeChange && onAvatarShapeChange('CIRCLE')}
                            className={cn("p-1.5 rounded-md text-white/40 transition-all", (!avatarShape || avatarShape === 'CIRCLE') ? "bg-white/10 text-white shadow-sm" : "hover:text-white/60")}
                            title="Circle"
                         >
                            <Circle size={16} />
                         </button>
                         <button 
                            onClick={() => onAvatarShapeChange && onAvatarShapeChange('SQUARE')}
                            className={cn("p-1.5 rounded-md text-white/40 transition-all", avatarShape === 'SQUARE' ? "bg-white/10 text-white shadow-sm" : "hover:text-white/60")}
                            title="Rounded Square"
                         >
                            <Square size={16} />
                         </button>
                    </div>
                </div>
                
                {/* Profile Toggle */}
                 <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">{t('settings.showProfile')}</span>
                    <button 
                        onClick={() => onToggleProfile(!showProfile)}
                        className={cn(
                            "w-12 h-7 rounded-full transition-colors relative",
                            showProfile ? "bg-theme-avatar" : "bg-white/10"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                            showProfile ? "translate-x-5" : "translate-x-0"
                        )} />
                    </button>
                </div>

                {/* Chart Mode */}
                 <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">{t('settings.chartMode')}</span>
                     <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                         <button 
                            onClick={() => onSetDefaultChartMode('RADAR')}
                            className={cn("p-1.5 rounded-md transition-all", defaultChartMode === 'RADAR' ? "bg-white/10 text-white" : "text-white/40")}
                         >
                            <Hexagon size={14} />
                         </button>
                         <button 
                            onClick={() => onSetDefaultChartMode('BAR')}
                            className={cn("p-1.5 rounded-md transition-all", defaultChartMode === 'BAR' ? "bg-white/10 text-white" : "text-white/40")}
                         >
                            <BarChart3 size={14} />
                         </button>
                    </div>
                </div>
              </GlassPanel>

              {/* AVATAR IDENTITY SECTION */}
              <GlassPanel className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <User className="text-cyan-400" size={18} />
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Identity</h3>
                </div>
                
                {/* Avatar Shape Toggle */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-white/70 text-sm">Avatar Shape</span>
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                         <button 
                            onClick={() => onAvatarShapeChange && onAvatarShapeChange('CIRCLE')}
                            className={cn("p-1.5 rounded-md transition-all", avatarShape === 'CIRCLE' ? "bg-white/10 text-white" : "text-white/40")}
                         >
                            <Circle size={14} />
                         </button>
                         <button 
                            onClick={() => onAvatarShapeChange && onAvatarShapeChange('SQUARE')}
                            className={cn("p-1.5 rounded-md transition-all", avatarShape === 'SQUARE' ? "bg-white/10 text-white" : "text-white/40")}
                         >
                            <Square size={14} />
                         </button>
                    </div>
                </div>

                <AvatarSelector />
              </GlassPanel>

              {/* THEME SECTION */}
              <GlassPanel className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Palette className="text-pink-400" size={18} />
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">{t('settings.themes')}</h3>
                </div>

                {/* Vivid Mode Toggle */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                    <div>
                        <span className="text-white/90 text-sm font-medium block">{t('settings.vividMode')}</span>
                        <span className="text-white/40 text-xs">{t('settings.vividModeDesc')}</span>
                    </div>
                    <button 
                        onClick={() => onToggleVividMode && onToggleVividMode(!vividMode)}
                        className={cn(
                            "w-12 h-7 rounded-full transition-colors relative",
                            vividMode ? "bg-theme-avatar" : "bg-white/10"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                            vividMode ? "translate-x-5" : "translate-x-0"
                        )} />
                    </button>
                </div>
                
                {/* THEME GRID - VISUAL PREVIEWS */}
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(THEMES).map((theme) => {
                     const isActive = currentTheme === theme.id;
                     return (
                        <button
                          key={theme.id}
                          onClick={() => onThemeToggle(theme.id)}
                          className={cn(
                            "relative flex flex-col items-center text-left transition-all duration-300 group",
                            isActive ? "scale-[1.02]" : "hover:scale-[1.02] opacity-80 hover:opacity-100"
                          )}
                        >
                            {/* MINI THEME PREVIEW CARD */}
                            <div className={cn(
                                "w-full aspect-[16/10] rounded-xl overflow-hidden relative border transition-all mb-3 shadow-lg",
                                isActive 
                                    ? "border-white/40 ring-2 ring-white/10 ring-offset-2 ring-offset-black/20" 
                                    : "border-white/10 group-hover:border-white/20"
                            )}>
                                {/* Theme Background Gradient */}
                                <div className="absolute inset-0" style={{ background: theme.gradient }} />
                                
                                {/* Overlay for Depth */}
                                <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />

                                {/* Active Checkmark Overlay */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-100 animate-in zoom-in duration-300">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                    </div>
                                )}

                                {/* MINI UI SIMULATION */}
                                <div className="absolute inset-2 flex flex-col gap-2 z-10 opacity-90">
                                    {/* Mini Header */}
                                    <div className="flex justify-between items-center">
                                        <div className="h-1.5 w-10 rounded-full bg-white/40 backdrop-blur-sm" />
                                        <div className="h-2 w-2 rounded-full border border-white/40" />
                                    </div>
                                    
                                    {/* Mini Content Card */}
                                    <div className="flex-1 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-1.5 flex flex-col gap-1.5">
                                        <div className="h-1.5 w-16 rounded-full bg-white/30" />
                                        <div className="h-1 w-full rounded-full bg-white/10" />
                                        <div className="mt-auto flex gap-1">
                                            <div className="h-3 w-3 rounded bg-white/20" />
                                            <div className="h-3 w-3 rounded bg-white/20" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Theme Name Label */}
                            <div className={cn(
                                "text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all",
                                isActive 
                                    ? "bg-white text-black border-white" 
                                    : "bg-white/5 text-white/60 border-white/5 group-hover:border-white/20 group-hover:text-white"
                            )}>
                                {theme.name}
                            </div>
                        </button>
                      );
                  })}
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {activeTab === 'CONTROLS' && (
            <motion.div 
              key="controls"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <GlassPanel className="p-5 space-y-4">
                 <div className="flex items-center gap-2 mb-4">
                    <Sliders className="text-cyan-400" size={18} />
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">{t('settings.systemAttributes')}</h3>
                </div>

                {attributes.map(attr => (
                  <div key={attr.id} className="group flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    {editingTraitId === attr.id ? (
                        <div className="flex-1 flex items-center gap-2">
                             <GlassInput 
                                autoFocus
                                value={editForm.label}
                                onChange={e => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                                className="h-8 text-sm"
                             />
                             <input 
                                type="color"
                                value={editForm.color}
                                onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                                className="w-8 h-8 rounded bg-transparent cursor-pointer"
                             />
                             <button onClick={saveEditing} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                                <Check size={14} />
                             </button>
                             <button onClick={() => setEditingTraitId(null)} className="p-1.5 bg-white/10 text-white/60 rounded-lg hover:bg-white/20">
                                <X size={14} />
                             </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5" style={{ color: attr.color }}>
                                    {attr.icon ? <attr.icon size={16} /> : <Hexagon size={16} />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">{t(attr.label)}</div>
                                    <div className="text-[10px] text-white/40 font-mono">{attr.id}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => startEditing(attr)}
                                    className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Edit3 size={14} />
                                </button>
                                {onRemoveAttribute && !['DISCIPLINA', 'FISICO', 'MENTAL'].includes(attr.id) && (
                                    <button 
                                        onClick={() => onRemoveAttribute(attr.id)}
                                        className="p-2 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                  </div>
                ))}

                {/* ADD NEW TRAIT */}
                {onAddAttribute && availableTraits.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-white/10">
                       <p className="text-xs text-white/40 mb-3 uppercase tracking-wider font-bold">Available Modules</p>
                       <div className="flex flex-wrap gap-2">
                           {availableTraits.map(trait => (
                               <button
                                  key={trait.id}
                                  onClick={() => onAddAttribute(trait.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all hover:scale-105"
                               >
                                   <Plus size={12} />
                                   {trait.label}
                               </button>
                           ))}
                       </div>
                   </div>
                )}
              </GlassPanel>

              {/* Language Section */}
              <GlassPanel className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="text-blue-400" size={18} />
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">{t('settings.language')}</h3>
                </div>
                <div className="flex gap-2">
                    {['en', 'es'].map(lang => (
                        <button
                            key={lang}
                            onClick={() => changeLanguage(lang)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                                i18n.language.startsWith(lang) 
                                    ? "bg-white/10 border-white/30 text-white shadow-sm" 
                                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                            )}
                        >
                            {lang === 'en' ? 'English' : 'Español'}
                        </button>
                    ))}
                </div>
              </GlassPanel>
            </motion.div>
          )}

          {activeTab === 'ACCOUNT' && (
            <motion.div 
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <GlassPanel className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-xl shadow-indigo-500/20">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                          {user?.photoURL ? (
                              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                              <User size={32} className="text-white/50" />
                          )}
                      </div>
                  </div>
                  <div>
                      <h2 className="text-xl font-bold text-white">{user?.displayName || 'User'}</h2>
                      <p className="text-sm text-white/40 font-mono">{user?.email}</p>
                  </div>
                  
                  {!isPro && (
                      <div className="w-full p-4 rounded-xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                  <ShieldCheck size={20} />
                              </div>
                              <div className="text-left">
                                  <div className="font-bold text-white text-sm">Free Plan</div>
                                  <div className="text-xs text-white/50">Upgrade to unlock full potential</div>
                              </div>
                          </div>
                          <button 
                             onClick={onShowPro}
                             className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:scale-105 transition-transform"
                          >
                              UPGRADE
                          </button>
                      </div>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>{t('auth.signOut')}</span>
                  </button>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
