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
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('glass');
  const [glowIntensity, setGlowIntensityState] = useState<number>(0);
  const [fontFamily, setFontFamilyState] = useState<string>("'Cascadia Code', monospace");
  const [fontSize, setFontSizeState] = useState<number>(14);

  useEffect(() => {
    // Load initial settings
    apiInvoke<any>('load_settings').then((settings) => {
      if (settings) {
        if (settings.theme) setThemeState(settings.theme);
        if (settings.glowIntensity !== undefined) setGlowIntensityState(settings.glowIntensity);
        if (settings.fontFamily) setFontFamilyState(settings.fontFamily);
        if (settings.fontSize) setFontSizeState(settings.fontSize);
      }
    }).catch(err => {
      console.error("Failed to load settings:", err);
    });
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    saveSettings(newTheme, glowIntensity, fontFamily, fontSize);
  };

  const setGlowIntensity = (newIntensity: number) => {
    setGlowIntensityState(newIntensity);
    saveSettings(theme, newIntensity, fontFamily, fontSize);
  };

  const setFontFamily = (newFont: string) => {
    setFontFamilyState(newFont);
    saveSettings(theme, glowIntensity, newFont, fontSize);
  };

  const setFontSize = (newSize: number) => {
    setFontSizeState(newSize);
    saveSettings(theme, glowIntensity, fontFamily, newSize);
  };

  const saveSettings = (t: ThemeType, g: number, f: string, s: number) => {
    apiInvoke('save_settings', { settings: { theme: t, glowIntensity: g, fontFamily: f, fontSize: s } }).catch(err => {
      console.error("Failed to save settings:", err);
    });
  };

  useEffect(() => {
    // Apply theme class to body for app-wide styling
    const body = document.body;
    body.classList.remove('theme-glass', 'theme-clay', 'theme-skeuo', 'theme-pure-glass');
    body.classList.add(`theme-${theme}`);

    // Apply variables to root
    const root = document.documentElement;
    root.style.setProperty('--text-glow-intensity', glowIntensity.toString());
    root.style.setProperty('--font-family', fontFamily);
    root.style.setProperty('--font-size', `${fontSize}px`);
  }, [theme, glowIntensity, fontFamily, fontSize]);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme,
      glowIntensity, setGlowIntensity,
      fontFamily, setFontFamily,
      fontSize, setFontSize
    }}>
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
