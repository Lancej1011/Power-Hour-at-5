import { createTheme, Theme, useTheme } from '@mui/material/styles';

// Utility function to convert hex to HSL
const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
};

// Utility function to convert HSL to hex
const hslToHex = (h: number, s: number, l: number): string => {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Calculate true complementary color
export const getComplementaryColor = (hex: string): string => {
  const [h, s, l] = hexToHsl(hex);
  const complementaryHue = (h + 180) % 360;
  return hslToHex(complementaryHue, s, l);
};

// Utility function to darken a hex color
export const darkenColor = (hex: string, amount: number = 0.2): string => {
  const [h, s, l] = hexToHsl(hex);
  const newLightness = Math.max(0, l - (amount * 100));
  return hslToHex(h, s, newLightness);
};

// Utility function to lighten a hex color
export const lightenColor = (hex: string, amount: number = 0.2): string => {
  const [h, s, l] = hexToHsl(hex);
  const newLightness = Math.min(100, l + (amount * 100));
  return hslToHex(h, s, newLightness);
};

// Utility hook to get complementary colors from current theme
export const useComplementaryColors = () => {
  const theme = useTheme();
  return {
    primary: theme.palette.complementary?.primary || getComplementaryColor(theme.palette.primary.main),
    secondary: theme.palette.complementary?.secondary || getComplementaryColor(theme.palette.secondary.main),
  };
};

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
    id: 'midnight',
    name: 'Midnight Pro',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    darkBackground: '#0f0f23',
    darkPaper: '#1a1a2e',
    lightBackground: '#f8fafc',
    lightPaper: '#ffffff',
  },
  {
    id: 'ocean',
    name: 'Ocean Depth',
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    darkBackground: '#0c1426',
    darkPaper: '#1e293b',
    lightBackground: '#f0f9ff',
    lightPaper: '#ffffff',
  },
  {
    id: 'forest',
    name: 'Forest Calm',
    primary: '#059669',
    secondary: '#10b981',
    darkBackground: '#0f1419',
    darkPaper: '#1f2937',
    lightBackground: '#f0fdf4',
    lightPaper: '#ffffff',
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    primary: '#ea580c',
    secondary: '#f97316',
    darkBackground: '#2d1b0f',
    darkPaper: '#3d2817',
    lightBackground: '#fff7ed',
    lightPaper: '#ffffff',
  },
  {
    id: 'rose',
    name: 'Rose Garden',
    primary: '#e11d48',
    secondary: '#f43f5e',
    darkBackground: '#1f1012',
    darkPaper: '#2d1b20',
    lightBackground: '#fff1f2',
    lightPaper: '#ffffff',
  },
  {
    id: 'sage',
    name: 'Sage Wisdom',
    primary: '#0d9488',
    secondary: '#14b8a6',
    darkBackground: '#0f1b1a',
    darkPaper: '#1f2937',
    lightBackground: '#f0fdfa',
    lightPaper: '#ffffff',
  },
  {
    id: 'lavender',
    name: 'Lavender Dreams',
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    darkBackground: '#1e1b2e',
    darkPaper: '#2d2438',
    lightBackground: '#faf5ff',
    lightPaper: '#ffffff',
  },
  {
    id: 'custom',
    name: 'Custom',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    darkBackground: '#0f0f23',
    darkPaper: '#1a1a2e',
    lightBackground: '#f8fafc',
    lightPaper: '#ffffff',
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
  const isDark = mode === 'dark';
  const complementaryPrimary = getComplementaryColor(colorTheme.primary);
  const complementarySecondary = getComplementaryColor(colorTheme.secondary);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colorTheme.primary,
        light: isDark ? colorTheme.secondary : colorTheme.primary,
        dark: colorTheme.primary,
      },
      secondary: {
        main: colorTheme.secondary,
      },
      background: {
        default: isDark ? colorTheme.darkBackground : colorTheme.lightBackground,
        paper: isDark ? colorTheme.darkPaper : colorTheme.lightPaper,
      },
      text: {
        primary: isDark ? '#f8fafc' : '#1e293b',
        secondary: isDark ? '#cbd5e1' : '#64748b',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      action: {
        hover: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
        selected: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      },
      // Add custom complementary colors for buttons
      complementary: {
        primary: complementaryPrimary,
        secondary: complementarySecondary,
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.025em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.015em',
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '-0.005em',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        letterSpacing: '0.00938em',
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
        letterSpacing: '0.01071em',
      },
      button: {
        fontWeight: 500,
        letterSpacing: '0.02857em',
        textTransform: 'none',
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.4,
        letterSpacing: '0.03333em',
      },
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
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out',
          },
          contained: {
            background: `linear-gradient(135deg, ${colorTheme.primary} 0%, ${colorTheme.secondary} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colorTheme.primary} 0%, ${colorTheme.secondary} 100%)`,
              filter: 'brightness(1.1)',
            },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDark
              ? '0 4px 20px rgba(0, 0, 0, 0.3)'
              : '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 8px 30px rgba(0, 0, 0, 0.4)'
                : '0 8px 30px rgba(0, 0, 0, 0.12)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: '0.8125rem',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              '& fieldset': {
                borderWidth: '1.5px',
              },
              '&:hover fieldset': {
                borderWidth: '1.5px',
              },
              '&.Mui-focused fieldset': {
                borderWidth: '2px',
              },
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
            padding: '12px 16px',
          },
          head: {
            fontWeight: 600,
            fontSize: '0.875rem',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: isDark ? '#cbd5e1' : '#64748b',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: isDark
              ? '0 8px 30px rgba(0, 0, 0, 0.4)'
              : '0 8px 30px rgba(0, 0, 0, 0.12)',
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
