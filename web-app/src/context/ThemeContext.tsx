import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, db } from '../services/firebase';
import { ThemeId, THEMES } from '../config/themes';
import { boostColorSaturation } from '../utils/colorUtils';
import { AVAILABLE_AVATARS } from '../config/avatars';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: typeof THEMES;
  vicesMode: boolean;
  setVicesMode: (enabled: boolean) => void;
  vividMode: boolean;
  setVividMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We use useAuth conditionally or handle null if ThemeProvider is outside AuthProvider
  // Ideally ThemeProvider is inside AuthProvider to access user
  const auth = useAuth(); // This might throw if ThemeProvider is outside AuthProvider
  const user = auth?.user;
  const profile = auth?.profile; // Access full profile to get avatarId
  const [vicesMode, setVicesMode] = useState(false);
  
  // Initialize from localStorage or default
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('matrix-theme');
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
      return localStorage.getItem('matrix-vivid-mode') === 'true';
    } catch {
      return false;
    }
  });

  // Apply theme to document
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (vividMode) {
        root.setAttribute('data-vivid', 'true');
    } else {
        root.removeAttribute('data-vivid');
    }

    // Inject CSS variables dynamically from config
    const themeConfig = THEMES[theme];
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
      const primaryGlow = vividMode 
        ? boostColorSaturation(basePrimaryGlow, 0.6) 
        : basePrimaryGlow;
        
      const secondaryGlow = vividMode
        ? boostColorSaturation(themeConfig.colors.secondaryGlow, 0.6)
        : themeConfig.colors.secondaryGlow;

      const avatarAccentFinal = vividMode
        ? boostColorSaturation(avatarAccent, 0.6)
        : avatarAccent;

      root.style.setProperty('--color-bg-depth', bgDepth);
      root.style.setProperty('--color-primary-glow', primaryGlow);
      root.style.setProperty('--color-secondary-glow', secondaryGlow);
      root.style.setProperty('--color-avatar-accent', avatarAccentFinal);
      root.style.setProperty('--color-glass-tint', themeConfig.colors.glassTint);
      root.style.setProperty('--color-text-primary', themeConfig.colors.textPrimary);
    }

    try {
      localStorage.setItem('matrix-theme', theme);
      localStorage.setItem('matrix-vivid-mode', String(vividMode));
    } catch (e) {
      // Ignore
    }
  }, [theme, vividMode, profile?.avatarId]); // Re-run when avatarId changes

  // Sync with Firestore
  // 1. Load from Firestore on login
  useEffect(() => {
    if (!user) return;

    const loadUserTheme = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
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
        console.error("Failed to sync theme from Matrix:", error);
      }
    };
    
    loadUserTheme();
    // We only run this on user change (login), not on every user object update to avoid race conditions
  }, [user?.uid]);

  // 2. Save to Firestore on change
  const setTheme = async (newTheme: ThemeId) => {
    setThemeState(newTheme);
    
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        // We use setDoc with merge to ensure preferences object exists or is updated
        await setDoc(userRef, {
          preferences: { theme: newTheme }
        }, { merge: true });
      } catch (error) {
        console.error("Failed to save theme to Matrix:", error);
      }
    }
  };

  const setVividMode = async (enabled: boolean) => {
    setVividModeState(enabled);
    if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            preferences: { vividMode: enabled }
          }, { merge: true });
        } catch (error) {
          console.error("Failed to save vivid mode to Matrix:", error);
        }
      }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: THEMES, vicesMode, setVicesMode, vividMode, setVividMode }}>
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
