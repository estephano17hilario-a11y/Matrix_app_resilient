import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { doc, getDoc, db } from '@/services/supabase';
import { supabase } from '../services/supabase';
import { ThemeId, THEMES } from '../config/themes';
import { boostColorSaturation } from '../utils/colorUtils';
import { AVAILABLE_AVATARS } from '../config/avatars';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  previewTheme: ThemeId | null;
  setPreviewTheme: (theme: ThemeId | null) => void;
  availableThemes: typeof THEMES;
  vicesMode: boolean;
  setVicesMode: (enabled: boolean) => void;
  vividMode: boolean;
  setVividMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We use useContext(AuthContext) directly to avoid throwing if ThemeProvider is outside AuthProvider
  // This prevents crashes during HMR updates or misconfiguration
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const profile = auth?.profile; // Access full profile to get avatarId
  const [vicesMode, setVicesMode] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);
  
  // Initialize from localStorage or default
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('lux-theme') || localStorage.getItem('matrix-theme');
      // Validate that the saved theme actually exists
      if (saved && THEMES[saved as ThemeId]) {
        return saved as ThemeId;
      }
    } catch (e) {
      console.warn("Local storage access denied", e);
    }
    return 'ether';
  });

  const [vividMode, setVividModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lux-vivid-mode') === 'true' || localStorage.getItem('matrix-vivid-mode') === 'true';
    } catch {
      return false;
    }
  });

  const activeTheme = previewTheme || theme;

  // Apply theme to document
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', activeTheme);
    if (vividMode) {
        root.setAttribute('data-vivid', 'true');
    } else {
        root.removeAttribute('data-vivid');
    }

    // Inject CSS variables dynamically from config
    const themeConfig = THEMES[activeTheme];
    if (themeConfig) {
      const bgDepth = themeConfig.colors.bgDepth;
      
      // Determine base Primary Glow
      let basePrimaryGlow = themeConfig.colors.primaryGlow;

      // ⚡ AVATAR ACCENT: Separate from Theme Primary
      let avatarAccent = basePrimaryGlow;
      if (profile?.avatarId) {
        const avatarConfig = AVAILABLE_AVATARS.find(a => a.id === profile.avatarId);
        if (avatarConfig?.themeColorRgb) {
           avatarAccent = avatarConfig.themeColorRgb;
        }
      }

      // Boost saturation if vivid mode is on
      let primaryGlow = vividMode 
        ? boostColorSaturation(basePrimaryGlow, 0.6) 
        : basePrimaryGlow;
        
      let secondaryGlow = vividMode
        ? boostColorSaturation(themeConfig.colors.secondaryGlow, 0.6)
        : themeConfig.colors.secondaryGlow;

      let avatarAccentFinal = vividMode
        ? boostColorSaturation(avatarAccent, 0.6)
        : avatarAccent;

      // 🚨 VICES MODE OVERRIDE (Red Alert)
      if (vicesMode) {
          primaryGlow = "220, 38, 38";   // Red-600
          secondaryGlow = "153, 27, 27"; // Red-800
          avatarAccentFinal = "239, 68, 68"; // Red-500
      }

      root.style.setProperty('--color-bg-depth', bgDepth);
      root.style.setProperty('--color-primary-glow', primaryGlow);
      root.style.setProperty('--color-secondary-glow', secondaryGlow);
      root.style.setProperty('--color-avatar-accent', avatarAccentFinal);
      root.style.setProperty('--color-glass-tint', themeConfig.colors.glassTint);
      root.style.setProperty('--color-text-primary', themeConfig.colors.textPrimary);
    }

    try {
      localStorage.setItem('matrix-theme', theme); // ALWAYS save original theme, not preview
      localStorage.setItem('matrix-vivid-mode', String(vividMode));
    } catch (e) {
      // Ignore
    }
  }, [activeTheme, theme, vividMode, profile?.avatarId, vicesMode]); // Re-run when avatarId or vicesMode changes

  // Sync with Firestore
  // 1. Load from Firestore on login
  const lastThemeSyncUid = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      lastThemeSyncUid.current = null;
      return;
    }

    if (lastThemeSyncUid.current === user.id) return;

    const localPrefs = profile?.uid === user.id ? profile?.preferences : undefined;
    const localTheme = localPrefs?.theme;
    const localVivid = localPrefs?.vividMode;

    if (localTheme && localTheme !== theme && THEMES[localTheme as ThemeId]) {
      setThemeState(localTheme as ThemeId);
    }
    if (localVivid !== undefined && localVivid !== vividMode) {
      setVividModeState(localVivid);
    }

    const hasLocalTheme = !!localTheme;
    const hasLocalVivid = localVivid !== undefined;
    if (hasLocalTheme && hasLocalVivid) {
      lastThemeSyncUid.current = user.id;
      return;
    }

    const loadUserTheme = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const remoteTheme = data.preferences?.theme;
          const remoteVivid = data.preferences?.vividMode;
          
          if (remoteTheme && remoteTheme !== theme && THEMES[remoteTheme as ThemeId]) {
            setThemeState(remoteTheme as ThemeId);
          }
          if (remoteVivid !== undefined && remoteVivid !== vividMode) {
            setVividModeState(remoteVivid);
          }
        }
      } catch (error) {
        console.error("Failed to sync theme from Lux:", error);
      } finally {
        lastThemeSyncUid.current = user.id;
      }
    };

    loadUserTheme();
  }, [user?.id, profile?.uid, profile?.preferences, theme, vividMode]);

  // 2. Save to Firestore on change
  const setTheme = useCallback(async (newTheme: ThemeId) => {
    setThemeState(newTheme);
    
    if (user) {
      try {
        const prefs = { ...profile?.preferences, theme: newTheme };
        auth?.updateProfileLocally({ preferences: prefs });
        await supabase.from('users').update({ preferences: prefs }).eq('id', user.id);
      } catch (error) {
        console.error("Failed to save theme to Lux:", error);
      }
    }
  }, [user, profile?.preferences, auth]);

  const setVividMode = useCallback(async (enabled: boolean) => {
    setVividModeState(enabled);
    if (user) {
        try {
          const prefs = { ...profile?.preferences, vividMode: enabled };
          auth?.updateProfileLocally({ preferences: prefs });
          await supabase.from('users').update({ preferences: prefs }).eq('id', user.id);
        } catch (error) {
          console.error("Failed to save vivid mode to Lux:", error);
        }
      }
  }, [user, profile?.preferences, auth]);

  const value = useMemo(() => ({
    theme: activeTheme, // Provide the active theme (preview or real) to consumers
    setTheme,
    previewTheme,
    setPreviewTheme,
    availableThemes: THEMES,
    vicesMode,
    setVicesMode,
    vividMode,
    setVividMode
  }), [activeTheme, setTheme, previewTheme, setPreviewTheme, vicesMode, vividMode, setVividMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
