import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type VisualizerType = 'bars' | 'circular' | 'waveform' | 'particles';

export interface VisualizerSettings {
  type: VisualizerType;
  showSongInfo: boolean;
  fullScreen: boolean;
  sensitivity: number;
  colorMode: 'theme' | 'rainbow' | 'custom';
  customColor: string;
  barCount: number;
  smoothing: number;
  particleCount: number;
  backgroundOpacity: number;
}

interface VisualizerContextType {
  settings: VisualizerSettings;
  updateSettings: (newSettings: Partial<VisualizerSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: VisualizerSettings = {
  type: 'bars',
  showSongInfo: true,
  fullScreen: false,
  sensitivity: 1.0,
  colorMode: 'theme',
  customColor: '#ff6b6b',
  barCount: 64,
  smoothing: 0.8,
  particleCount: 100,
  backgroundOpacity: 0.1,
};

const VisualizerContext = createContext<VisualizerContextType | undefined>(undefined);

export const useVisualizer = (): VisualizerContextType => {
  const context = useContext(VisualizerContext);
  if (!context) {
    throw new Error('useVisualizer must be used within a VisualizerProvider');
  }
  return context;
};

interface VisualizerProviderProps {
  children: ReactNode;
}

const SETTINGS_STORAGE_KEY = 'powerHour_visualizerSettings';

export const VisualizerProvider: React.FC<VisualizerProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<VisualizerSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error loading visualizer settings:', error);
    }
    return defaultSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving visualizer settings:', error);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<VisualizerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const contextValue: VisualizerContextType = {
    settings,
    updateSettings,
    resetSettings,
  };

  return (
    <VisualizerContext.Provider value={contextValue}>
      {children}
    </VisualizerContext.Provider>
  );
};
