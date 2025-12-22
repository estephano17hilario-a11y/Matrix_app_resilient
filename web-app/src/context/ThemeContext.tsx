import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, db } from '../services/firebase';
import { ThemeId, THEMES } from '../config/themes';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We use useAuth conditionally or handle null if ThemeProvider is outside AuthProvider
  // Ideally ThemeProvider is inside AuthProvider to access user
  const auth = useAuth(); // This might throw if ThemeProvider is outside AuthProvider
  const user = auth?.user;
  
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

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Inject CSS variables dynamically from config
    const themeConfig = THEMES[theme];
    if (themeConfig) {
      root.style.setProperty('--color-bg-depth', themeConfig.colors.bgDepth);
      root.style.setProperty('--color-primary-glow', themeConfig.colors.primaryGlow);
      root.style.setProperty('--color-secondary-glow', themeConfig.colors.secondaryGlow);
      root.style.setProperty('--color-glass-tint', themeConfig.colors.glassTint);
      root.style.setProperty('--color-text-primary', themeConfig.colors.textPrimary);
    }

    try {
      localStorage.setItem('matrix-theme', theme);
    } catch (e) {
      // Ignore
    }
  }, [theme]);

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
          if (remoteTheme && remoteTheme !== theme && THEMES[remoteTheme as ThemeId]) {
            setThemeState(remoteTheme as ThemeId);
          }
        }
      } catch (error) {
        console.error("Failed to sync theme from Matrix:", error);
      }
    };
    
    loadUserTheme();
    // We only run this on user change, not theme change to avoid loop
  }, [user]);

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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: THEMES }}>
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
