import { ThemeId } from '../../config/themes';
import { Attribute } from '../../types';
import { SettingsProvider } from '../settings/SettingsContext';
import { SettingsModal } from '../settings/components/SettingsModal';

export interface SettingsViewProps {
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
  onClose: () => void;
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
  defaultTaskFilters?: any;
  onUpdateDefaultTaskFilters?: (filters: any) => void;
}

export const SettingsView = (props: SettingsViewProps) => {
  return (
    <SettingsProvider {...props} initialTab={props.initialTab}>
      <SettingsModal />
    </SettingsProvider>
  );
};
