import { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeId } from '../../config/themes';
import { Attribute } from '../../types';
import { useAuth } from '../../context/AuthContext';

// Define the shape of the Settings Context
interface SettingsContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  closeSettings: () => void;

  // Theme & Visuals
  currentTheme: ThemeId | string;
  setTheme: (theme: ThemeId) => void;
  vividMode: boolean;
  toggleVividMode: (enabled: boolean) => void;
  dashboardStyle: 'BORDER' | 'LIQUID' | 'GLASS';
  setDashboardStyle: (style: 'BORDER' | 'LIQUID' | 'GLASS') => void;
  avatarShape: 'CIRCLE' | 'SQUARE';
  setAvatarShape: (shape: 'CIRCLE' | 'SQUARE') => void;

  // Profile & Attributes
  showProfile: boolean;
  toggleProfile: (show: boolean) => void;
  attributes: Attribute[];
  updateAttribute: (id: string, updates: Partial<Attribute>) => void;
  addAttribute: (id: string) => void;
  removeAttribute: (id: string) => void;

  // System & Charts
  defaultChartMode: 'RADAR' | 'BAR';
  setDefaultChartMode: (mode: 'RADAR' | 'BAR') => void;
  habitSectionControl: 'VISIBLE' | 'HIDDEN';
  updateHabitSectionControl: (control: 'VISIBLE' | 'HIDDEN') => void;
  allowDockSectionSwitch: boolean;
  updateAllowDockSectionSwitch: (allow: boolean) => void;

  // Account
  isPro: boolean;
  showProModal: () => void;
  logout: () => Promise<void>;
  user: any;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
  onClose: () => void;
  // ... all the props from SettingsView
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
  onShowPro?: () => void;
  isPro?: boolean;
  dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS';
  onDashboardStyleChange?: (style: 'BORDER' | 'LIQUID' | 'GLASS') => void;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onAvatarShapeChange?: (shape: 'CIRCLE' | 'SQUARE') => void;
  vividMode?: boolean;
  onToggleVividMode?: (enabled: boolean) => void;
  habitSectionControl?: 'VISIBLE' | 'HIDDEN';
  onUpdateHabitSectionControl?: (control: 'VISIBLE' | 'HIDDEN') => void;
  allowDockSectionSwitch?: boolean;
  onUpdateAllowDockSectionSwitch?: (allow: boolean) => void;
}

export const SettingsProvider = ({ children, ...props }: SettingsProviderProps) => {
  const [activeTab, setActiveTab] = useState('visuals');
  const { logout, user } = useAuth();

  const value: SettingsContextType = {
    activeTab,
    setActiveTab,
    closeSettings: props.onClose,
    
    currentTheme: props.currentTheme,
    setTheme: props.onThemeToggle,
    vividMode: props.vividMode || false,
    toggleVividMode: props.onToggleVividMode || (() => {}),
    dashboardStyle: props.dashboardStyle || 'BORDER',
    setDashboardStyle: props.onDashboardStyleChange || (() => {}),
    avatarShape: props.avatarShape || 'CIRCLE',
    setAvatarShape: props.onAvatarShapeChange || (() => {}),

    showProfile: props.showProfile,
    toggleProfile: props.onToggleProfile,
    attributes: props.attributes || [],
    updateAttribute: props.onUpdateAttribute || (() => {}),
    addAttribute: props.onAddAttribute || (() => {}),
    removeAttribute: props.onRemoveAttribute || (() => {}),

    defaultChartMode: props.defaultChartMode,
    setDefaultChartMode: props.onSetDefaultChartMode,
    habitSectionControl: props.habitSectionControl || 'VISIBLE',
    updateHabitSectionControl: props.onUpdateHabitSectionControl || (() => {}),
    allowDockSectionSwitch: props.allowDockSectionSwitch || false,
    updateAllowDockSectionSwitch: props.onUpdateAllowDockSectionSwitch || (() => {}),

    isPro: props.isPro || false,
    showProModal: props.onShowPro || (() => {}),
    logout,
    user
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
