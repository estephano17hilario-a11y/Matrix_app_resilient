import { ThemeId } from '../../../../config/themes';
import { cn } from '../../../../utils/cn';

interface VisualsSectionProps {
  currentTheme: ThemeId | string;
  onThemeToggle: (theme: ThemeId) => void;
  dashboardStyle?: 'BORDER' | 'LIQUID';
  onDashboardStyleChange?: (style: 'BORDER' | 'LIQUID') => void;
  avatarShape?: 'CIRCLE' | 'SQUARE';
  onAvatarShapeChange?: (shape: 'CIRCLE' | 'SQUARE') => void;
  vividMode?: boolean;
  onToggleVividMode?: (enabled: boolean) => void;
}

export const VisualsSection = ({
  currentTheme,
  onThemeToggle,
  dashboardStyle,
  onDashboardStyleChange,
  avatarShape,
  onAvatarShapeChange,
  vividMode,
  onToggleVividMode
}: VisualsSectionProps) => {
  const themeOptions: ThemeId[] = ['ether', 'matrix', 'sunset'];

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">Visual Core</h2>
        <p className="text-white/40 text-lg max-w-2xl">
          Ajusta el estilo visual base, el HUD y la densidad de brillo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            Theme Matrix
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {themeOptions.map((theme) => (
                <button
                  key={theme}
                  onClick={() => onThemeToggle(theme)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    currentTheme === theme
                      ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                      : "bg-black/20 border-white/5 text-white/40 hover:border-white/10"
                  )}
                >
                  <div className="text-sm font-bold uppercase">{theme}</div>
                  <div className="text-[10px] opacity-50">Preset</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            HUD & Shape
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
              <div className="space-y-1">
                <span className="text-white font-medium">Dashboard Style</span>
                <p className="text-xs text-white/40">Selector de secciones</p>
              </div>
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-full sm:w-auto">
                <button
                  onClick={() => onDashboardStyleChange?.('BORDER')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 rounded-md text-xs font-bold transition-all",
                    dashboardStyle === 'BORDER' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  BORDER
                </button>
                <button
                  onClick={() => onDashboardStyleChange?.('LIQUID')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 rounded-md text-xs font-bold transition-all",
                    dashboardStyle === 'LIQUID' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  LIQUID
                </button>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
              <div className="space-y-1">
                <span className="text-white font-medium">Avatar Shape</span>
                <p className="text-xs text-white/40">Forma del contenedor</p>
              </div>
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-full sm:w-auto">
                <button
                  onClick={() => onAvatarShapeChange?.('CIRCLE')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 rounded-md text-xs font-bold transition-all",
                    avatarShape === 'CIRCLE' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  CIRCLE
                </button>
                <button
                  onClick={() => onAvatarShapeChange?.('SQUARE')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 rounded-md text-xs font-bold transition-all",
                    avatarShape === 'SQUARE' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                  )}
                >
                  SQUARE
                </button>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-white font-medium">Vivid Mode</span>
                <p className="text-xs text-white/40">Saturación OLED</p>
              </div>
              <button
                onClick={() => onToggleVividMode?.(!vividMode)}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  vividMode ? "bg-cyan-500" : "bg-white/10"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                    vividMode ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
