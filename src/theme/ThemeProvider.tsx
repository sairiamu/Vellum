import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiInvoke } from '../lib/tauriApi';
import './tokens.css';
import './themes/glass.css';
import './themes/clay.css';
import './themes/skeuo.css';
import './themes/pure-glass.css';

export type ThemeType = 'glass' | 'clay' | 'skeuo' | 'pure-glass';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  glowIntensity: number;
  setGlowIntensity: (intensity: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('glass');
  const [glowIntensity, setGlowIntensityState] = useState<number>(0);

  useEffect(() => {
    // Load initial settings
    apiInvoke<any>('load_settings').then((settings) => {
      if (settings) {
        if (settings.theme) setThemeState(settings.theme);
        if (settings.glowIntensity !== undefined) setGlowIntensityState(settings.glowIntensity);
      }
    }).catch(err => {
      console.error("Failed to load settings:", err);
    });
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    saveSettings(newTheme, glowIntensity);
  };

  const setGlowIntensity = (newIntensity: number) => {
    setGlowIntensityState(newIntensity);
    saveSettings(theme, newIntensity);
  };

  const saveSettings = (t: ThemeType, g: number) => {
    apiInvoke('save_settings', { settings: { theme: t, glowIntensity: g } }).catch(err => {
      console.error("Failed to save settings:", err);
    });
  };

  useEffect(() => {
    // Apply theme class to body for app-wide styling
    const body = document.body;
    body.classList.remove('theme-glass', 'theme-clay', 'theme-skeuo', 'theme-pure-glass');
    body.classList.add(`theme-${theme}`);

    // Apply glow intensity as a CSS variable on root
    document.documentElement.style.setProperty('--text-glow-intensity', glowIntensity.toString());
  }, [theme, glowIntensity]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, glowIntensity, setGlowIntensity }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
