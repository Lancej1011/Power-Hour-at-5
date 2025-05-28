import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { ColorTheme, colorThemes, createAppTheme, getAllThemes, saveCustomTheme as saveCustomThemeToStorage, deleteCustomTheme as deleteCustomThemeFromStorage } from '../themes';

interface ThemeContextType {
  currentTheme: ColorTheme;
  mode: 'light' | 'dark';
  setTheme: (themeId: string) => void;
  toggleMode: () => void;
  availableThemes: ColorTheme[];
  saveCustomTheme: (theme: ColorTheme) => void;
  deleteCustomTheme: (themeId: string) => void;
  refreshThemes: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider');
  }
  return context;
};

interface ThemeContextProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'powerHour_selectedTheme';
const MODE_STORAGE_KEY = 'powerHour_themeMode';

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
  const [availableThemes, setAvailableThemes] = useState<ColorTheme[]>(() => getAllThemes());

  // Load saved theme and mode from localStorage
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(() => {
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    const allThemes = getAllThemes();
    return savedThemeId ? allThemes.find(t => t.id === savedThemeId) || colorThemes[0] : colorThemes[0]; // Default to purple
  });

  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    return (savedMode as 'light' | 'dark') || 'dark'; // Default to dark
  });

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme.id);
  }, [currentTheme]);

  // Save mode preference to localStorage
  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  const setTheme = (themeId: string) => {
    const theme = availableThemes.find(t => t.id === themeId) || colorThemes[0];
    setCurrentTheme(theme);
  };

  const refreshThemes = () => {
    setAvailableThemes(getAllThemes());
  };

  const saveCustomTheme = (theme: ColorTheme) => {
    saveCustomThemeToStorage(theme);
    refreshThemes();
    setCurrentTheme(theme);
  };

  const deleteCustomTheme = (themeId: string) => {
    deleteCustomThemeFromStorage(themeId);
    refreshThemes();
    // If the deleted theme was current, switch to default
    if (currentTheme.id === themeId) {
      setCurrentTheme(colorThemes[0]);
    }
  };

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'dark' ? 'light' : 'dark');
  };

  const muiTheme = createAppTheme(currentTheme, mode);

  const contextValue: ThemeContextType = {
    currentTheme,
    mode,
    setTheme,
    toggleMode,
    availableThemes,
    saveCustomTheme,
    deleteCustomTheme,
    refreshThemes,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={muiTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
