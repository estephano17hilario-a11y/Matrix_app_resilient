import { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeId } from '../../config/themes';
import { Attribute } from '../../types';
import { useAuth } from '@/context/AuthContext';

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
  dashboardStyle: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA';
  setDashboardStyle: (style: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA') => void;
  avatarShape: 'CIRCLE' | 'SQUARE';
  setAvatarShape: (shape: 'CIRCLE' | 'SQUARE') => void;

  // Profile & Attributes
  showProfile: boolean;
  toggleProfile: (show: boolean) => void;
  attributes: Attribute[];
  updateAttribute: (id: string, updates: Partial<Attribute>) => void;
  addAttribute: (id: string) => void;
  addCustomAttribute: (attr: Omit<Attribute, 'id' | 'level' | 'xp' | 'maxXp'>) => void;
  removeAttribute: (id: string) => void;
  addSubTrait: (parentAttrId: string, name: string, iconName: string) => Promise<void>;
  updateSubTrait: (parentAttrId: string, subTraitId: string, updates: any) => Promise<void>;
  deleteSubTrait: (parentAttrId: string, subTraitId: string) => Promise<void>;

  // System & Charts
  defaultChartMode: 'RADAR' | 'BAR';
  setDefaultChartMode: (mode: 'RADAR' | 'BAR') => void;
  habitSectionControl: 'VISIBLE' | 'HIDDEN';
  updateHabitSectionControl: (control: 'VISIBLE' | 'HIDDEN') => void;
  defaultHabitView: 'DEFAULT' | 'CHRONOLOGICAL';
  updateDefaultHabitView: (view: 'DEFAULT' | 'CHRONOLOGICAL') => void;
  allowDockSectionSwitch: boolean;
  updateAllowDockSectionSwitch: (allow: boolean) => void;
  openDockConfig: () => void;
  weekStartDay: 0 | 1;
  updateWeekStartDay: (day: 0 | 1) => void;

  defaultChartViews: {
    tasks?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    habits?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    focus?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    projects?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
    notes?: 'WEEK' | 'MONTH' | '3_MONTHS' | 'YEAR' | 'TOTAL';
  };
  updateDefaultChartViews: (views: any) => void;
  defaultProjectView: 'PROJECT' | 'TRAIT' | 'NONE';
  updateDefaultProjectView: (view: 'PROJECT' | 'TRAIT' | 'NONE') => void;
  notesDefaultTab: 'OVERVIEW' | 'EMOTIONS';
  updateNotesDefaultTab: (tab: 'OVERVIEW' | 'EMOTIONS') => void;

  defaultTaskFilters?: {
    timeframe?: 'ALL' | 'DAY' | 'WEEK' | 'MONTH' | '3_MONTHS';
    traitFilter?: string;
    typeFilter?: 'all' | 'normal' | 'smart';
    difficultyFilter?: 'all' | 'S' | 'A' | 'B' | 'C';
    hideCompleted?: boolean;
  };
  updateDefaultTaskFilters: (filters: any) => void;

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
  initialTab?: string;
  currentTheme: ThemeId | string;
  onThemeToggle: (theme: ThemeId) => void;
  showProfile: boolean;
  onToggleProfile: (show: boolean) => void;
  defaultChartMode: 'RADAR' | 'BAR';
  onSetDefaultChartMode: (mode: 'RADAR' | 'BAR') => void;
  attributes?: Attribute[];
  onUpdateAttribute?: (id: string, updates: Partial<Attribute>) => void;
  onAddAttribute?: (id: string) => void;
  onAddCustomAttribute?: (attr: Omit<Attribute, 'id' | 'level' | 'xp' | 'maxXp'>) => void;
  onRemoveAttribute?: (id: string) => void;
  onAddSubTrait?: (parentAttrId: string, name: string, iconName: string) => Promise<void> | void;
  onUpdateSubTrait?: (parentAttrId: string, subTraitId: string, updates: any) => Promise<void> | void;
  onDeleteSubTrait?: (parentAttrId: string, subTraitId: string) => Promise<void> | void;
  onShowPro?: () => void;
  isPro?: boolean;
  dashboardStyle?: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA';
  onDashboardStyleChange?: (style: 'BORDER' | 'LIQUID' | 'GLASS' | 'AURA') => void;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onAvatarShapeChange?: (shape: 'CIRCLE' | 'SQUARE') => void;
  vividMode?: boolean;
  onToggleVividMode?: (enabled: boolean) => void;
  habitSectionControl?: 'VISIBLE' | 'HIDDEN';
  onUpdateHabitSectionControl?: (control: 'VISIBLE' | 'HIDDEN') => void;
  defaultHabitView?: 'DEFAULT' | 'CHRONOLOGICAL';
  onUpdateDefaultHabitView?: (view: 'DEFAULT' | 'CHRONOLOGICAL') => void;
  allowDockSectionSwitch?: boolean;
  onUpdateAllowDockSectionSwitch?: (allow: boolean) => void;
  onOpenDockConfig?: () => void;
  weekStartDay?: 0 | 1;
  onWeekStartDayChange?: (day: 0 | 1) => void;
  
  defaultChartViews?: any;
  onUpdateDefaultChartViews?: (views: any) => void;
  defaultProjectView?: 'PROJECT' | 'TRAIT' | 'NONE';
  onUpdateDefaultProjectView?: (view: 'PROJECT' | 'TRAIT' | 'NONE') => void;
  notesDefaultTab?: 'OVERVIEW' | 'EMOTIONS';
  onUpdateNotesDefaultTab?: (tab: 'OVERVIEW' | 'EMOTIONS') => void;

  defaultTaskFilters?: any;
  onUpdateDefaultTaskFilters?: (filters: any) => void;

  // Account
}

export const SettingsProvider = ({ children, ...props }: SettingsProviderProps) => {
  const [activeTab, setActiveTab] = useState(props.initialTab || 'visuals');
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
    addCustomAttribute: props.onAddCustomAttribute || (() => {}),
    removeAttribute: props.onRemoveAttribute || (() => {}),
    addSubTrait: async (parentAttrId: string, name: string, iconName: string) => {
      console.log("SettingsContext: addSubTrait callback called with:", { parentAttrId, name, iconName, hasPropCallback: !!props.onAddSubTrait });
      if (props.onAddSubTrait) {
        await props.onAddSubTrait(parentAttrId, name, iconName);
      } else {
        console.error("SettingsContext: props.onAddSubTrait is UNDEFINED!");
      }
    },
    updateSubTrait: async (parentAttrId: string, subTraitId: string, updates: any) => {
      console.log("SettingsContext: updateSubTrait callback called with:", { parentAttrId, subTraitId, updates, hasPropCallback: !!props.onUpdateSubTrait });
      if (props.onUpdateSubTrait) {
        await props.onUpdateSubTrait(parentAttrId, subTraitId, updates);
      } else {
        console.error("SettingsContext: props.onUpdateSubTrait is UNDEFINED!");
      }
    },
    deleteSubTrait: async (parentAttrId: string, subTraitId: string) => {
      console.log("SettingsContext: deleteSubTrait callback called with:", { parentAttrId, subTraitId, hasPropCallback: !!props.onDeleteSubTrait });
      if (props.onDeleteSubTrait) {
        await props.onDeleteSubTrait(parentAttrId, subTraitId);
      } else {
        console.error("SettingsContext: props.onDeleteSubTrait is UNDEFINED!");
      }
    },

    defaultChartMode: props.defaultChartMode,
    setDefaultChartMode: props.onSetDefaultChartMode,
    habitSectionControl: props.habitSectionControl || 'VISIBLE',
    updateHabitSectionControl: props.onUpdateHabitSectionControl || (() => {}),
    defaultHabitView: props.defaultHabitView || 'DEFAULT',
    updateDefaultHabitView: props.onUpdateDefaultHabitView || (() => {}),
    allowDockSectionSwitch: props.allowDockSectionSwitch || false,
    updateAllowDockSectionSwitch: props.onUpdateAllowDockSectionSwitch || (() => {}),
    openDockConfig: props.onOpenDockConfig || (() => {}),
    weekStartDay: props.weekStartDay ?? 1,
    updateWeekStartDay: props.onWeekStartDayChange || (() => {}),

    defaultChartViews: props.defaultChartViews || {},
    updateDefaultChartViews: props.onUpdateDefaultChartViews || (() => {}),
    defaultProjectView: props.defaultProjectView || 'PROJECT',
    updateDefaultProjectView: props.onUpdateDefaultProjectView || (() => {}),
    notesDefaultTab: props.notesDefaultTab || 'OVERVIEW',
    updateNotesDefaultTab: props.onUpdateNotesDefaultTab || (() => {}),

    defaultTaskFilters: props.defaultTaskFilters || {},
    updateDefaultTaskFilters: props.onUpdateDefaultTaskFilters || (() => {}),

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
