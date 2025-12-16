import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Sliders, Palette, Edit3, Check, X, BarChart3, Hexagon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { THEMES, ThemeId } from '../../config/themes';
import { Attribute } from '../../types';

interface SettingsViewProps {
  currentTheme: ThemeId | string;
  onThemeToggle: (theme: ThemeId) => void;
  showProfile: boolean;
  onToggleProfile: (show: boolean) => void;
  defaultChartMode: 'RADAR' | 'BAR';
  onSetDefaultChartMode: (mode: 'RADAR' | 'BAR') => void;
  attributes?: Attribute[];
  onUpdateAttribute?: (id: string, updates: Partial<Attribute>) => void;
  onClose: () => void;
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
  onClose 
}: SettingsViewProps) => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('DESIGN');
  const [editingTraitId, setEditingTraitId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ label: string; color: string }>({ label: '', color: '' });

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
    { id: 'DESIGN', label: 'Design', icon: Palette },
    { id: 'CONTROLS', label: 'Controls', icon: Sliders },
    { id: 'ACCOUNT', label: 'Account', icon: User },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6 p-6 pb-0">
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors group"
        >
          <ArrowLeft className="text-white/80 group-hover:scale-110 transition-transform" size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">System Config</h1>
          <p className="text-white/40 text-sm">Matrix Environment Preferences</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 px-6 border-b border-white/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative ${
              activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'DESIGN' && (
            <motion.div 
              key="DESIGN"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* PROFILE TOGGLE */}
              <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Profile HUD</h3>
                      <p className="text-xs text-white/40">Toggle the visibility of your attributes panel</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onToggleProfile(!showProfile)}
                    className={`w-14 h-8 rounded-full transition-all relative border ${
                      showProfile ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className={`absolute top-1 bottom-1 w-6 rounded-full bg-white transition-all shadow-lg ${
                      showProfile ? 'left-7 bg-indigo-400' : 'left-1 opacity-50'
                    }`} />
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'CONTROLS' && (
            <motion.div 
              key="CONTROLS"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* THEMES - Moved to Controls per user request */}
              <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                    <Palette size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Visual Theme</h3>
                    <p className="text-xs text-white/40">Select your preferred reality aesthetic</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button 
                      key={key} 
                      onClick={() => onThemeToggle(t.id)} 
                      className={`relative h-20 rounded-xl border-2 transition-all overflow-hidden group ${
                        currentTheme === t.id ? 'border-white scale-105 shadow-xl' : 'border-transparent hover:border-white/20'
                      }`}
                    >
                      <div className="absolute inset-0" style={{ background: t.gradient }} />
                      
                      <div className="absolute bottom-2 left-2 font-bold text-xs text-white drop-shadow-md flex flex-col items-start">
                        <span>{t.name}</span>
                        <span className="text-[9px] text-white/60 font-normal">{t.description}</span>
                      </div>

                      {currentTheme === t.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                           <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* DEFAULT CHART MODE */}
              <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Startup Chart</h3>
                    <p className="text-xs text-white/40">Default visualization for system metrics</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => onSetDefaultChartMode('RADAR')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                      defaultChartMode === 'RADAR' 
                        ? 'bg-indigo-500/20 border-indigo-500 text-white' 
                        : 'bg-black/20 border-white/10 text-white/40 hover:bg-white/5'
                    }`}
                  >
                    <Hexagon size={32} />
                    <span className="text-sm font-bold">Radar / Spider</span>
                  </button>
                  <button
                    onClick={() => onSetDefaultChartMode('BAR')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                      defaultChartMode === 'BAR' 
                        ? 'bg-indigo-500/20 border-indigo-500 text-white' 
                        : 'bg-black/20 border-white/10 text-white/40 hover:bg-white/5'
                    }`}
                  >
                    <BarChart3 size={32} />
                    <span className="text-sm font-bold">Bar / List</span>
                  </button>
                </div>
              </section>

              {/* TRAIT EDITOR */}
              <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Attribute Editor</h3>
                    <p className="text-xs text-white/40">Customize your system definitions</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {attributes.map(attr => (
                    <div key={attr.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                      {editingTraitId === attr.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input 
                            type="color" 
                            value={editForm.color}
                            onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                          />
                          <input 
                            type="text"
                            value={editForm.label}
                            onChange={e => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white flex-1"
                            autoFocus
                          />
                          <button onClick={saveEditing} className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingTraitId(null)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shadow-[0_0_10px]" style={{ backgroundColor: attr.color, boxShadow: `0 0 10px ${attr.color}` }} />
                            <span className="text-sm font-bold text-white/80">{attr.label}</span>
                          </div>
                          <button 
                            onClick={() => startEditing(attr)}
                            className="p-2 hover:bg-white/10 text-white/20 hover:text-white rounded-lg transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'ACCOUNT' && (
            <motion.div 
              key="ACCOUNT"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <section className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-2xl">
                    {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <h2 className="text-xl font-bold text-white">{user?.displayName || 'User'}</h2>
                  <p className="text-white/40">{user?.email}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                    <span className="text-sm text-white/40">User ID</span>
                    <span className="font-mono text-xs text-white/60 select-all">{user?.uid}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                    <span className="text-sm text-white/40">Account Type</span>
                    <span className="text-sm text-indigo-400 font-bold">Standard</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                    <span className="text-sm text-white/40">Version</span>
                    <span className="text-sm text-white/60">v2.1.0</span>
                  </div>
                </div>
              </section>

              <button 
                onClick={handleLogout}
                className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Terminate Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
