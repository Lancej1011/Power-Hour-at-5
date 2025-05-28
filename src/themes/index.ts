import { createTheme, Theme } from '@mui/material/styles';

export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  darkBackground: string;
  darkPaper: string;
  lightBackground: string;
  lightPaper: string;
  isCustom?: boolean;
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'purple',
    name: 'Purple',
    primary: '#9c27b0',
    secondary: '#7c4dff',
    darkBackground: '#18122B',
    darkPaper: '#231942',
    lightBackground: '#f3eaff',
    lightPaper: '#fff',
  },
  {
    id: 'blue',
    name: 'Blue',
    primary: '#1976d2',
    secondary: '#42a5f5',
    darkBackground: '#0d1421',
    darkPaper: '#1a2332',
    lightBackground: '#e3f2fd',
    lightPaper: '#fff',
  },
  {
    id: 'green',
    name: 'Green',
    primary: '#388e3c',
    secondary: '#66bb6a',
    darkBackground: '#0f1b0f',
    darkPaper: '#1b2e1b',
    lightBackground: '#e8f5e8',
    lightPaper: '#fff',
  },
  {
    id: 'orange',
    name: 'Orange',
    primary: '#f57c00',
    secondary: '#ffb74d',
    darkBackground: '#1f1611',
    darkPaper: '#2d2318',
    lightBackground: '#fff3e0',
    lightPaper: '#fff',
  },
  {
    id: 'red',
    name: 'Red',
    primary: '#d32f2f',
    secondary: '#f44336',
    darkBackground: '#1a0e0e',
    darkPaper: '#2d1b1b',
    lightBackground: '#ffebee',
    lightPaper: '#fff',
  },
  {
    id: 'teal',
    name: 'Teal',
    primary: '#00796b',
    secondary: '#4db6ac',
    darkBackground: '#0e1a18',
    darkPaper: '#1b2d2a',
    lightBackground: '#e0f2f1',
    lightPaper: '#fff',
  },
  {
    id: 'custom',
    name: 'Custom',
    primary: '#9c27b0', // Default to purple, will be overridden
    secondary: '#7c4dff',
    darkBackground: '#18122B',
    darkPaper: '#231942',
    lightBackground: '#f3eaff',
    lightPaper: '#fff',
  },
];

// Custom theme storage keys
const CUSTOM_THEMES_STORAGE_KEY = 'powerHour_customThemes';

export const saveCustomTheme = (customTheme: ColorTheme) => {
  const existingThemes = loadCustomThemes();
  const updatedThemes = existingThemes.filter(t => t.id !== customTheme.id);
  updatedThemes.push({ ...customTheme, isCustom: true });
  localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updatedThemes));
};

export const loadCustomThemes = (): ColorTheme[] => {
  const saved = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
};

export const deleteCustomTheme = (themeId: string) => {
  const existingThemes = loadCustomThemes();
  const updatedThemes = existingThemes.filter(t => t.id !== themeId);
  localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(updatedThemes));
};

export const getAllThemes = (): ColorTheme[] => {
  return [...colorThemes, ...loadCustomThemes()];
};

export const createAppTheme = (colorTheme: ColorTheme, mode: 'light' | 'dark'): Theme => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: colorTheme.primary,
      },
      secondary: {
        main: colorTheme.secondary,
      },
      background: {
        default: mode === 'dark' ? colorTheme.darkBackground : colorTheme.lightBackground,
        paper: mode === 'dark' ? colorTheme.darkPaper : colorTheme.lightPaper,
      },
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
    },
    components: {
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 0,
            paddingRight: 0,
            marginLeft: 0,
            marginRight: 0,
            maxWidth: '100%',
          },
        },
      },
    },
  });
};

export const getThemeById = (id: string): ColorTheme => {
  const allThemes = getAllThemes();
  return allThemes.find(theme => theme.id === id) || colorThemes[0];
};
